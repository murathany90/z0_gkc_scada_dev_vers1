import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  assessDampingRatio,
  buildDampedOscillation,
  buildModeShapeDefData,
  buildPqvfDetectionSpectrum,
  buildSasAggregateChartDescriptors,
  buildSasChartZoomConfig,
  buildSasInterareaSimulation,
  buildSasPulseSimulation,
  buildSlidingWindowSimulation,
  buildTrainingPqvfSimulation,
  decideFbmswaCommand,
  estimateDftSpectrum,
  normalizeSasDataZoomEvent,
  pickSlidingWindowIndices,
  resolveSasChartWindow,
  SAS_INTERAREA_BUS_CONFIGS,
} from '../src/features/oscillationTraining/utils/simulationModels.ts';
import { buildGlossaryLookup, GLOSSARY_SECTIONS } from '../src/features/oscillationTraining/data/glossary.ts';
import { buildCaseSimulation, TRAINING_CASES } from '../src/features/oscillationTraining/data/trainingCases.ts';

const firstRun = buildSlidingWindowSimulation({
  durationSeconds: 40,
  samplingRateHz: 20,
  windowSeconds: 10,
  windowStartSeconds: 8,
  targetFrequencyHz: 0.4,
  noiseLevel: 0.02,
  seed: 42,
});
const secondRun = buildSlidingWindowSimulation({
  durationSeconds: 40,
  samplingRateHz: 20,
  windowSeconds: 10,
  windowStartSeconds: 8,
  targetFrequencyHz: 0.4,
  noiseLevel: 0.02,
  seed: 42,
});
assert.deepEqual(firstRun.rawSeries.slice(0, 12), secondRun.rawSeries.slice(0, 12), 'sliding window simulation should be deterministic for the same seed');
assert.equal(firstRun.window.startIndex, 160);
assert.equal(firstRun.window.endIndex, 360);
assert.equal(firstRun.window.startSeconds, 8);
assert.equal(firstRun.window.endSeconds, 18);
assert.ok(Math.abs(firstRun.dominantFrequencyHz - 0.4) <= 0.05, 'DFT output should peak near the target oscillation frequency');

assert.deepEqual(
  pickSlidingWindowIndices({ sampleCount: 800, samplingRateHz: 20, windowSeconds: 10, windowStartSeconds: 35 }),
  { startIndex: 600, endIndex: 800, startSeconds: 30, endSeconds: 40 },
  'window selector should clamp the active window to the available data range',
);

const cleanSignal = Array.from({ length: 400 }, (_unused, index) => Math.sin(2 * Math.PI * 0.35 * index / 20));
const cleanSpectrum = estimateDftSpectrum(cleanSignal, 20, 0.05, 1.5, 0.05);
const cleanPeak = cleanSpectrum.reduce((peak, point) => point.amplitude > peak.amplitude ? point : peak, cleanSpectrum[0]);
assert.ok(Math.abs(cleanPeak.frequencyHz - 0.35) <= 0.05, 'DFT helper should identify the dominant clean sine frequency');

const pqvf = buildTrainingPqvfSimulation({ scenario: 'interarea', severity: 1.2, durationSeconds: 40, samplingRateHz: 20 });
assert.deepEqual(Object.keys(pqvf.series), ['frequency', 'activePower', 'voltage', 'reactivePower']);
assert.equal(pqvf.series.frequency.length, pqvf.time.length);
assert.equal(pqvf.summary.expectedMode, 'Bölgeler arası');
assert.ok(pqvf.summary.operatorComment.includes('bölgeler arası'), 'P-Q-V-f summary should use operator language');

const damping = buildDampedOscillation({ frequencyHz: 0.5, dampingRatioPercent: -1, durationSeconds: 20, samplingRateHz: 20 });
assert.equal(assessDampingRatio(-1).level, 'critical');
assert.ok(damping.envelope.at(-1)! > damping.envelope[0], 'negative damping should grow the envelope');
assert.equal(assessDampingRatio(5).level, 'safe');

assert.equal(decideFbmswaCommand({ amplitudeMhz: 8, phaseDegrees: 20, triggerThresholdMhz: 20, releaseThresholdMhz: 12 }).status, 'normal');
assert.equal(decideFbmswaCommand({ amplitudeMhz: 15, phaseDegrees: 20, triggerThresholdMhz: 20, releaseThresholdMhz: 12 }).status, 'hold');
assert.equal(decideFbmswaCommand({ amplitudeMhz: 24, phaseDegrees: 45, triggerThresholdMhz: 20, releaseThresholdMhz: 12 }).status, 'capacitive');
assert.equal(decideFbmswaCommand({ amplitudeMhz: 24, phaseDegrees: -45, triggerThresholdMhz: 20, releaseThresholdMhz: 12 }).status, 'inductive');

const modeShape = buildModeShapeDefData();
assert.equal(modeShape.nodes.length, 6);
assert.ok(modeShape.defBars.some(bar => bar.role === 'source'));
assert.ok(modeShape.defBars.some(bar => bar.role === 'absorber'));

const glossaryLookup = buildGlossaryLookup(GLOSSARY_SECTIONS);
for (const requiredTerm of ['pmu', 'sas', 'basts', 'fbmswa', 'pqvf', 'damping-ratio', 'def', 'statcom', 'svc']) {
  const term = glossaryLookup.get(requiredTerm);
  assert.ok(term, `glossary should include ${requiredTerm}`);
  assert.ok(term!.definition.length > 60, `${requiredTerm} should have an operator-ready explanation`);
  assert.ok(term!.sections.length >= 1, `${requiredTerm} should be mapped to at least one training section`);
}
for (const requiredSasTerm of ['sas-c', 'short-window', 'long-window', 'capacitive', 'inductive', 'mvar', 'mw', 'pu']) {
  const term = glossaryLookup.get(requiredSasTerm);
  assert.ok(term, `SAS glossary should include ${requiredSasTerm}`);
  assert.ok(term!.sections.includes('sas'), `${requiredSasTerm} should be mapped to the SAS training section`);
}
assert.equal(glossaryLookup.get('unknown-term'), undefined, 'unknown glossary keys should fall back safely to plain text in the UI');

const pqvfSpectrum = buildPqvfDetectionSpectrum({ scenario: 'interarea', severity: 1.1 });
assert.deepEqual(
  pqvfSpectrum.modeMarkers.map(marker => marker.mode),
  ['interarea', 'local', 'forced', 'torsional', 'ibr'],
  'P-Q-V-f detection spectrum should expose all training mode markers',
);
assert.ok(pqvfSpectrum.spectrum.some(point => point.frequencyHz >= 4.7 && point.frequencyHz <= 5), 'P-Q-V-f spectrum should cover high-frequency training bands');
assert.ok(pqvfSpectrum.selectedPeak.frequencyHz >= 0.1 && pqvfSpectrum.selectedPeak.frequencyHz <= 0.8, 'interarea scenario should peak in the interarea band');

const cleanWideDetection = buildSlidingWindowSimulation({
  durationSeconds: 40,
  samplingRateHz: 20,
  windowSeconds: 10,
  windowStartSeconds: 8,
  targetFrequencyHz: 4.7,
  noiseLevel: 0,
  seed: 7,
});
const noisyWideDetection = buildSlidingWindowSimulation({
  durationSeconds: 40,
  samplingRateHz: 20,
  windowSeconds: 10,
  windowStartSeconds: 8,
  targetFrequencyHz: 4.7,
  noiseLevel: 0.1,
  seed: 7,
});
assert.ok(Math.abs(cleanWideDetection.dominantFrequencyHz! - 4.7) <= 0.05, 'wide DFT helper should detect targets up to 5 Hz');
assert.notDeepEqual(
  cleanWideDetection.rawSeries.slice(0, 24).map(point => point.value),
  noisyWideDetection.rawSeries.slice(0, 24).map(point => point.value),
  'noiseLevel=0 should remove the seeded random noise contribution',
);
assert.equal(cleanWideDetection.spectrogram.frequencyMinHz, 0.2);
assert.equal(cleanWideDetection.spectrogram.frequencyMaxHz, 5);

assert.equal(buildSasPulseSimulation({ amplitudeMhz: 6, phaseDegrees: 0, triggerThresholdMhz: 10, releaseThresholdMhz: 8 }).decision.status, 'normal');
assert.equal(buildSasPulseSimulation({ amplitudeMhz: 9, phaseDegrees: 0, triggerThresholdMhz: 10, releaseThresholdMhz: 8 }).decision.status, 'hold');
assert.equal(buildSasPulseSimulation({ amplitudeMhz: 16, phaseDegrees: 25, triggerThresholdMhz: 10, releaseThresholdMhz: 8 }).decision.status, 'capacitive');
assert.equal(buildSasPulseSimulation({ amplitudeMhz: 16, phaseDegrees: -25, triggerThresholdMhz: 10, releaseThresholdMhz: 8 }).decision.status, 'inductive');
const sasPulse = buildSasPulseSimulation({ amplitudeMhz: 16, phaseDegrees: 25, triggerThresholdMhz: 10, releaseThresholdMhz: 8 });
assert.ok(sasPulse.commandSeries.some(point => point.value > 0), 'capacitive SAS pulse simulation should include a positive command pulse');
assert.ok(sasPulse.normalizedOscillationSeries.some(point => point.value > 0.5), 'SAS pulse simulation should expose a normalized blue oscillation signal');
assert.ok(sasPulse.actionLevelSeries.some(point => point.value === 1), 'capacitive SAS pulse simulation should expose a +1 action level');
assert.ok(sasPulse.commandSeries.some(point => point.value === 50), 'capacitive SAS pulse simulation should use +50 MVAr pulse');
const sasInductivePulse = buildSasPulseSimulation({ amplitudeMhz: 16, phaseDegrees: -25, triggerThresholdMhz: 10, releaseThresholdMhz: 8 });
assert.ok(sasInductivePulse.actionLevelSeries.some(point => point.value === -1), 'inductive SAS pulse simulation should expose a -1 action level');
assert.ok(sasInductivePulse.commandSeries.some(point => point.value === -30), 'inductive SAS pulse simulation should use -30 MVAr pulse');
const sasNormalPulse = buildSasPulseSimulation({ amplitudeMhz: 6, phaseDegrees: 25, triggerThresholdMhz: 10, releaseThresholdMhz: 8 });
assert.ok(sasNormalPulse.actionLevelSeries.every(point => point.value === 0), 'normal SAS pulse simulation should keep action level at 0');
assert.ok(sasNormalPulse.commandSeries.every(point => point.value === 0), 'normal SAS pulse simulation should not emit FACTS pulse');
const sasHoldPulse = buildSasPulseSimulation({ amplitudeMhz: 9, phaseDegrees: 25, triggerThresholdMhz: 10, releaseThresholdMhz: 8 });
assert.ok(sasHoldPulse.actionLevelSeries.every(point => point.value === 0), 'hysteresis SAS pulse simulation should keep action level at 0');
assert.ok(sasHoldPulse.commandSeries.every(point => point.value === 0), 'hysteresis SAS pulse simulation should not emit FACTS pulse');
assert.equal(sasPulse.systemFacts.shortWindowSeconds, 20);
assert.equal(sasPulse.systemFacts.longWindowSeconds, 100);
assert.equal(sasPulse.systemFacts.targetBandHz, '0.12-0.16 Hz');

const asset2Dir = join(process.cwd(), 'src', 'features', 'oscillationTraining', 'assets', 'asset2');
const optimizedCaseAssets = readdirSync(asset2Dir).filter(fileName => /^Resim\d+\.jpg$/i.test(fileName));
assert.equal(optimizedCaseAssets.length, 11, 'asset2 case visuals should be optimized JPEG files');
assert.equal(readdirSync(asset2Dir).filter(fileName => /^Resim\d+\.png$/i.test(fileName)).length, 0, 'asset2 PNG case visuals should not remain in the app bundle');
const optimizedCaseAssetBytes = optimizedCaseAssets.reduce((total, fileName) => total + statSync(join(asset2Dir, fileName)).size, 0);
assert.ok(optimizedCaseAssetBytes <= 4.5 * 1024 * 1024, 'optimized asset2 case visuals should stay under 4.5 MB');

const sasInterarea = buildSasInterareaSimulation({
  amplitudeMhz: 16,
  modeFrequencyHz: 0.15,
  triggerThresholdMhz: 10,
  dampingPercent: 4,
});
assert.equal(SAS_INTERAREA_BUS_CONFIGS.length, 6, 'SAS-C training should include six physical bus configurations');
assert.deepEqual(
  sasInterarea.tabs.map(tab => tab.id),
  ['toscelik', 'icdas', 'mmk', 'colakoglu', 'habas', 'sincan', 'aggregate'],
  'SAS-C training should expose six bus tabs and one aggregate tab',
);
assert.equal(sasInterarea.times.length, sasInterarea.buses[0].series.frequencyHz.length, 'SAS bus series should align with the shared time axis');
assert.equal(sasInterarea.aggregate.series.totalMw.length, sasInterarea.times.length, 'aggregate MW series should align with the shared time axis');
assert.equal(sasInterarea.aggregate.series.totalDampingMw.length, sasInterarea.times.length, 'aggregate damping MW series should align with the shared time axis');
assert.equal(sasInterarea.aggregate.series.totalMvar.length, sasInterarea.times.length, 'aggregate MVAr series should align with the shared time axis');
assert.equal(sasInterarea.aggregate.series.frequencyChangeMhz.length, sasInterarea.times.length, 'aggregate frequency-change series should align with the shared time axis');
assert.equal(sasInterarea.aggregate.series.voltagePu.length, sasInterarea.times.length, 'aggregate voltage p.u. series should align with the shared time axis');
const sincan = sasInterarea.buses.find(entry => entry.config.id === 'sincan');
assert.ok(sincan, 'Sincan STATCOM bus should be included');
assert.equal(sincan!.config.type, 'STATCOM');
assert.equal(sincan!.config.capacitiveMvar, 50);
assert.equal(sincan!.config.inductiveMvar, -30);
assert.ok(sincan!.series.mvar.some(value => value === 50), 'Sincan STATCOM should emit +50 MVAr capacitive pulses');
assert.ok(sincan!.series.mvar.some(value => value === -30), 'Sincan STATCOM should emit -30 MVAr inductive pulses');
const aggregateSampleIndex = sasInterarea.aggregate.series.activeBusCount.findIndex(count => count > 0);
assert.ok(aggregateSampleIndex >= 0, 'aggregate simulation should include at least one active bus sample');
const expectedTotalMw = sasInterarea.buses.reduce((total, entry) => total + entry.series.mw[aggregateSampleIndex], 0);
const expectedTotalMvar = sasInterarea.buses.reduce((total, entry) => total + entry.series.mvar[aggregateSampleIndex], 0);
assert.ok(Math.abs(sasInterarea.aggregate.series.totalMw[aggregateSampleIndex] - expectedTotalMw) < 0.0001, 'aggregate total MW should equal the sum of bus MW contributions');
assert.equal(
  sasInterarea.aggregate.series.totalDampingMw[aggregateSampleIndex],
  Number((-sasInterarea.aggregate.series.totalMw[aggregateSampleIndex]).toFixed(4)),
  'aggregate damping MW should be plotted with opposite polarity to the MW load contribution',
);
assert.ok(Math.abs(sasInterarea.aggregate.series.totalMvar[aggregateSampleIndex] - expectedTotalMvar) < 0.0001, 'aggregate total MVAr should equal the sum of bus MVAr commands');
assert.ok(sasInterarea.aggregate.series.voltagePu.every(value => value > 0.95 && value < 1.05), 'aggregate voltage should be represented as p.u. around nominal value');
const aggregateChartDescriptors = buildSasAggregateChartDescriptors(sasInterarea);
assert.deepEqual(
  aggregateChartDescriptors.map(descriptor => descriptor.key),
  ['all-pulses', 'total-mw-mvar', 'total-mw-frequency', 'mvar-voltage-frequency'],
  'aggregate tab should expose the requested four chart groups',
);
assert.deepEqual(
  aggregateChartDescriptors.find(descriptor => descriptor.key === 'total-mw-frequency')!.seriesNames,
  ['Toplam MW sönümleme etkisi', 'Frekans değişimi'],
  'aggregate chart 3 should use damping MW and frequency-change series with explicit polarity',
);
assert.deepEqual(
  aggregateChartDescriptors.find(descriptor => descriptor.key === 'mvar-voltage-frequency')!.seriesNames,
  ['Toplam MVAr', 'Gerilim p.u.', 'Frekans değişimi'],
  'aggregate chart 4 should use total MVAr, voltage p.u. and frequency-change series',
);
const sasZoomConfig = buildSasChartZoomConfig();
assert.ok(sasZoomConfig.some(config => config.type === 'inside'), 'SAS chart zoom should support mouse/trackpad inside zoom');
assert.ok(sasZoomConfig.some(config => config.type === 'slider'), 'SAS chart zoom should include a visible slider');
const controlledZoomConfig = buildSasChartZoomConfig(120, 240);
assert.ok(controlledZoomConfig.every(config => config.startValue === 120 && config.endValue === 240), 'SAS chart zoom should be controllable with a shared time window');
assert.deepEqual(
  resolveSasChartWindow({ durationSeconds: 480, timeSeconds: 180, viewSeconds: 120, zoomWindow: null }),
  { start: 120, end: 240 },
  'SAS chart window should follow time when no manual zoom exists',
);
assert.deepEqual(
  resolveSasChartWindow({ durationSeconds: 480, timeSeconds: 260, viewSeconds: 120, zoomWindow: { start: 80, end: 150 } }),
  { start: 80, end: 150 },
  'manual SAS zoom window should persist while playback time advances',
);
assert.deepEqual(
  normalizeSasDataZoomEvent({ batch: [{ startValue: 44.2, endValue: 188.8 }] }, 480),
  { start: 44.2, end: 188.8 },
  'SAS dataZoom event should normalize ECharts batch payloads for synchronized chart zoom',
);

assert.equal(TRAINING_CASES.length, 4, 'case training should include four operator cases');
for (const trainingCase of TRAINING_CASES) {
  assert.ok(trainingCase.metrics.length >= 4, `${trainingCase.title} should include a detailed metrics table`);
  assert.ok(trainingCase.assetNames.length >= 1, `${trainingCase.title} should reference at least one asset2 visual`);
  const simulation = buildCaseSimulation(trainingCase.id);
  assert.equal(simulation.frequencySeries.length, simulation.dampingSeries.length, `${trainingCase.id} should produce aligned case series`);
  assert.ok(simulation.modeShape.nodes.length >= 6, `${trainingCase.id} should include a visual mode-shape simulation`);
  assert.ok(simulation.operatorSummary.includes(trainingCase.shortLabel), `${trainingCase.id} should generate an operator summary`);
}
