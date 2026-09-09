import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { importSasEventZip } from '../src/features/oscillation/benchmark/sasEventImporter.ts';
import { buildOscillationBenchmarkResult } from '../src/features/oscillation/benchmark/benchmarkEngine.ts';
import { resamplePmuToTenHz } from '../src/features/oscillation/benchmark/resamplePmu.ts';
import { calculateOscillationAnalysis } from '../src/features/oscillation/utils/oscillationMetrics.ts';
import type { PmuFider } from '../src/features/oscillation/types/oscillationTypes.ts';

const archivePath = process.env.BENCHMARK_REFERENCE_ZIP;
if (!archivePath) {
  console.info('SKIP: BENCHMARK_REFERENCE_ZIP is not set; offline fixture test remains the required clean-clone test.');
  process.exit(0);
}
const resolved = resolve(archivePath);
assert.ok(existsSync(resolved), `reference SAS archive was not found: ${resolved}`);
const imported = importSasEventZip(new Uint8Array(readFileSync(resolved)), 'reference SAS archive');
const resampled = resamplePmuToTenHz(imported.pmuSamples, 10);
const pmu: PmuFider = { id: 'SAS-PMU', name: 'SAS Benchmark PMU', isPmu: true };
const analysis = calculateOscillationAnalysis({
  selectionMode: 'single', samplesByPmu: new Map([[pmu.id, resampled.samples]]), pmuDevices: [pmu], referencePmuId: pmu.id,
  startTime: resampled.samples[0].timestamp, endTime: resampled.samples[resampled.samples.length - 1].timestamp,
  selectedSignals: ['frequency'], amplitudeThresholds: { frequencyMhz: 6, voltagePercent: 1, activePowerPercent: 1, reactivePowerPercent: 1 }, samplingRateHz: 10, windowSeconds: 60, stepSeconds: 10,
});
const interarea = analysis.metrics.find(metric => metric.signal === 'frequency' && metric.bandId === 'INTERAREA');
const benchmark = buildOscillationBenchmarkResult({
  imported, resample: resampled, gkcAnalysis: analysis, gkcInputSamples: resampled.samples, mode: 'same-raw',
  analysisConfig: { samplingRateHz: 10, windowSeconds: 60, stepSeconds: 10, amplitudeThresholds: { frequencyMhz: 6, voltagePercent: 1, activePowerPercent: 1, reactivePowerPercent: 1 }, selectedSignals: ['frequency'], pmuId: pmu.id },
});
assert.equal(imported.externalEvents.length, 2);
assert.equal(imported.quality.pmu.sampleRateHz, 50);
assert.equal(resampled.samples[1].timestampMs - resampled.samples[0].timestampMs, 100);
assert.ok(imported.quality.findings.some(finding => finding.code === 'CENTER_FREQUENCY_OFFSET_50HZ'));
assert.ok(interarea?.dominantFrequencyHz !== null && interarea?.dominantFrequencyHz !== undefined && Math.abs(interarea.dominantFrequencyHz - 0.14) < 0.03, '0.14 Hz SAS target must remain in GKÇ Interarea band');
console.log(JSON.stringify({
  sasEvents: imported.externalEvents.length,
  pmuRateHz: imported.quality.pmu.sampleRateHz,
  resampleRateHz: resampled.targetRateHz,
  gkcDominantInterareaHz: interarea?.dominantFrequencyHz ?? null,
  gkcBandDampingPercent: interarea?.dampingRatioPercent ?? null,
  gkcEvents: analysis.events.filter(event => event.signal === 'frequency' && event.bandId === 'INTERAREA').length,
  eventStatuses: benchmark.comparisons.map(item => item.status),
  episodeBursts: benchmark.episodes.map(item => item.sasEvents.length),
  gkcDetectionWindows: analysis.events.filter(event => event.signal === 'frequency' && event.bandId === 'INTERAREA').map(event => ({ start: event.startMs, end: event.endMs, frequencyHz: event.dominantFrequencyHz, minDr: event.minDampingRatioPercent, averageDr: event.averageDampingRatioPercent })),
}, null, 2));
