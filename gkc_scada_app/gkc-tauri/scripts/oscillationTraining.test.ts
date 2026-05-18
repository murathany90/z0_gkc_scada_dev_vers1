import assert from 'node:assert/strict';
import {
  assessDampingRatio,
  buildDampedOscillation,
  buildModeShapeDefData,
  buildSlidingWindowSimulation,
  buildTrainingPqvfSimulation,
  decideFbmswaCommand,
  estimateDftSpectrum,
  pickSlidingWindowIndices,
} from '../src/features/oscillationTraining/utils/simulationModels.ts';

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
