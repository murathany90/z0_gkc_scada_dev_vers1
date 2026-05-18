import assert from 'node:assert/strict';
import {
  assessDampingRatio,
  buildDampedOscillation,
  buildModeShapeDefData,
  buildPqvfDetectionSpectrum,
  buildSasPulseSimulation,
  buildSlidingWindowSimulation,
  buildTrainingPqvfSimulation,
  decideFbmswaCommand,
  estimateDftSpectrum,
  pickSlidingWindowIndices,
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
assert.equal(sasPulse.systemFacts.shortWindowSeconds, 20);
assert.equal(sasPulse.systemFacts.longWindowSeconds, 100);

assert.equal(TRAINING_CASES.length, 4, 'case training should include four operator cases');
for (const trainingCase of TRAINING_CASES) {
  assert.ok(trainingCase.metrics.length >= 4, `${trainingCase.title} should include a detailed metrics table`);
  assert.ok(trainingCase.assetNames.length >= 1, `${trainingCase.title} should reference at least one asset2 visual`);
  const simulation = buildCaseSimulation(trainingCase.id);
  assert.equal(simulation.frequencySeries.length, simulation.dampingSeries.length, `${trainingCase.id} should produce aligned case series`);
  assert.ok(simulation.modeShape.nodes.length >= 6, `${trainingCase.id} should include a visual mode-shape simulation`);
  assert.ok(simulation.operatorSummary.includes(trainingCase.shortLabel), `${trainingCase.id} should generate an operator summary`);
}
