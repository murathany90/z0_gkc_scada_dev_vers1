export type TrainingModeId = 'interarea' | 'local' | 'forced' | 'torsional' | 'ibr';
export type TrainingPqvfScenario = 'interarea' | 'local' | 'forced';
export type TrainingDampingLevel = 'critical' | 'weak' | 'watch' | 'safe';
export type FbmswaDecisionStatus = 'normal' | 'hold' | 'capacitive' | 'inductive';
export type SasPulseDecisionStatus = FbmswaDecisionStatus;
export type SasInterareaBusId = 'toscelik' | 'icdas' | 'mmk' | 'colakoglu' | 'habas' | 'sincan';
export type SasInterareaTabId = SasInterareaBusId | 'aggregate';
export type SasFactsType = 'SVC' | 'STATCOM';

export interface TrainingPoint {
  timeSeconds: number;
  value: number;
}

export interface TrainingSpectrumPoint {
  frequencyHz: number;
  amplitude: number;
}

export interface TrainingWindowRange {
  startIndex: number;
  endIndex: number;
  startSeconds: number;
  endSeconds: number;
}

export interface TrainingSpectrogram {
  columns: number[][];
  frequencyMinHz: number;
  frequencyMaxHz: number;
  frequencyLabels: string[];
}

export interface SasPulseDecision {
  status: SasPulseDecisionStatus;
  command: -1 | 0 | 1;
  label: string;
  comment: string;
}

export interface SasInterareaBusConfig {
  id: SasInterareaBusId;
  tab: string;
  name: string;
  shortLabel: string;
  type: SasFactsType;
  hvLevel: string;
  mvLevel: string;
  factsLabel: string;
  capacitiveMvar: number;
  inductiveMvar: number;
  mwEffect: number;
  ogVoltageLabel: string;
  ygVoltageLabel: string;
  phaseDegrees: number;
  sensitivity: number;
  location: string;
  load: string;
  note: string;
  nominalVoltageKv: number;
}

export interface SasInterareaBusSeries {
  frequencyHz: number[];
  rawMhz: number[];
  filteredMhz: number[];
  shortAmplitudeMhz: number[];
  energy: number[];
  pulseLevel: Array<-1 | 0 | 1>;
  mvar: number[];
  mw: number[];
  modeFrequencyHz: number[];
  dampingRatioPercent: number[];
  phaseErrorDegrees: number[];
  confidencePercent: number[];
  voltageKv: number[];
  voltagePu: number[];
}

export interface SasInterareaBusSimulation {
  config: SasInterareaBusConfig;
  series: SasInterareaBusSeries;
}

export interface SasInterareaAggregateSimulation {
  series: {
    totalMw: number[];
    totalDampingMw: number[];
    totalMvar: number[];
    activeBusCount: number[];
    totalEnergy: number[];
    frequencyChangeMhz: number[];
    voltagePu: number[];
  };
}

export interface SasInterareaSimulation {
  times: number[];
  durationSeconds: number;
  stepSeconds: number;
  releaseThresholdMhz: number;
  tabs: Array<{ id: SasInterareaTabId; label: string; subtitle: string }>;
  buses: SasInterareaBusSimulation[];
  aggregate: SasInterareaAggregateSimulation;
}

export interface SasAggregateChartDescriptor {
  key: 'all-pulses' | 'total-mw-mvar' | 'total-mw-frequency' | 'mvar-voltage-frequency';
  title: string;
  subtitle: string;
  seriesNames: string[];
}

export interface SasChartWindow {
  start: number;
  end: number;
}

export const TRAINING_MODE_DEFS: Record<TrainingModeId, {
  label: string;
  shortLabel: string;
  frequencyHz: number;
  dampingRatioPercent: number;
  bandLabel: string;
  color: string;
  operatorText: string;
}> = {
  interarea: {
    label: 'Bölgeler arası salınım',
    shortLabel: 'Interarea',
    frequencyHz: 0.35,
    dampingRatioPercent: 5.5,
    bandLabel: '0.1-0.8 Hz',
    color: '#3b82f6',
    operatorText: 'Geniş iki alanın zayıf bağ hattı üzerinden karşı fazlı hareket ettiği düşük frekanslı moddur.',
  },
  local: {
    label: 'Yerel salınım',
    shortLabel: 'Local',
    frequencyHz: 1.25,
    dampingRatioPercent: 8.5,
    bandLabel: '0.8-2 Hz',
    color: '#10b981',
    operatorText: 'Bir santral veya üretim bölgesinin sistemin geri kalanına karşı salındığı daha hızlı moddur.',
  },
  forced: {
    label: 'Zorlanmış salınım',
    shortLabel: 'Forced',
    frequencyHz: 0.74,
    dampingRatioPercent: 0,
    bandLabel: 'kaynağa bağlı',
    color: '#f59e0b',
    operatorText: 'Periyodik bir ekipman veya kontrol etkisi sisteme sürekli enerji verdiğinde görülür.',
  },
  torsional: {
    label: 'Torsiyon / SSO',
    shortLabel: 'SSO',
    frequencyHz: 4.7,
    dampingRatioPercent: 2.5,
    bandLabel: 'diagnostik yüksek bant',
    color: '#8b5cf6',
    operatorText: 'Bu ekranda kavramsal gösterilir; gerçek SSO için daha yüksek örnekleme ve özel analiz gerekir.',
  },
  ibr: {
    label: 'IBR kontrol etkileşimi',
    shortLabel: 'IBR',
    frequencyHz: 2.2,
    dampingRatioPercent: 3.5,
    bandLabel: 'kontrol kaynaklı',
    color: '#06b6d4',
    operatorText: 'Evirici kontrol döngüleri, PLL ve şebeke empedansı arasındaki etkileşime odaklanır.',
  },
};

export const SAS_INTERAREA_BUS_CONFIGS: SasInterareaBusConfig[] = [
  {
    id: 'toscelik',
    tab: 'Tosçelik',
    name: 'Tosçelik T.M. SVC',
    shortLabel: 'TOS',
    type: 'SVC',
    hvLevel: '380 kV',
    mvLevel: '34.5 kV',
    factsLabel: '±45 MVAr SVC',
    capacitiveMvar: 45,
    inductiveMvar: -45,
    mwEffect: 7,
    ogVoltageLabel: '±0.8 kV',
    ygVoltageLabel: '±1.2 kV @ 380 kV',
    phaseDegrees: -25,
    sensitivity: 1,
    location: 'Osmaniye / demir-çelik',
    load: 'Ark ocağı + hadde yükü',
    note: 'Yüksek SVC modülasyon kapasitesi ile frekans çevrimine belirgin reaktif tepki verir.',
    nominalVoltageKv: 380,
  },
  {
    id: 'icdas',
    tab: 'İçdaş',
    name: 'İçdaş T.M. SVC',
    shortLabel: 'ICD',
    type: 'SVC',
    hvLevel: '380 kV',
    mvLevel: '34.5 kV',
    factsLabel: '±27-30 MVAr SVC',
    capacitiveMvar: 30,
    inductiveMvar: -30,
    mwEffect: 8.5,
    ogVoltageLabel: '±0.8 kV',
    ygVoltageLabel: '~±1 kV @ 380 kV',
    phaseDegrees: 10,
    sensitivity: 1.08,
    location: 'Çanakkale / ağır sanayi',
    load: 'EAF barası + SVC kontrol',
    note: 'MW etkisi yüksek kabul edilir; pulse eğrileri aktif güç değişiminde net görünür.',
    nominalVoltageKv: 380,
  },
  {
    id: 'mmk',
    tab: 'MMK',
    name: 'MMK Metalurji T.M. SVC',
    shortLabel: 'MMK',
    type: 'SVC',
    hvLevel: '380 kV',
    mvLevel: '34.5 kV',
    factsLabel: '±45 MVAr SVC',
    capacitiveMvar: 45,
    inductiveMvar: -45,
    mwEffect: 9,
    ogVoltageLabel: '±1.1 kV',
    ygVoltageLabel: 'testte ölçüm yok',
    phaseDegrees: 32,
    sensitivity: 1.14,
    location: 'Hatay / metalurji barası',
    load: 'EAF trafo girişleri',
    note: 'Genlik hassasiyeti yüksek; kısa pencere tetikleme örneği için iyi bir eğitim barasıdır.',
    nominalVoltageKv: 380,
  },
  {
    id: 'colakoglu',
    tab: 'Çolakoğlu',
    name: 'Çolakoğlu T.M. SVC',
    shortLabel: 'COL',
    type: 'SVC',
    hvLevel: '380 kV',
    mvLevel: '34.5 kV',
    factsLabel: '±30 MVAr SVC',
    capacitiveMvar: 30,
    inductiveMvar: -30,
    mwEffect: 4.5,
    ogVoltageLabel: '±0.5 kV',
    ygVoltageLabel: 'testte ölçüm yok',
    phaseDegrees: -48,
    sensitivity: 0.82,
    location: 'Kocaeli / demir-çelik',
    load: 'OG barası + SVC filtreleri',
    note: 'Daha düşük MW katkısı ile histerezis ve normal bölge davranışını gösterir.',
    nominalVoltageKv: 380,
  },
  {
    id: 'habas',
    tab: 'Habaş',
    name: 'Habaş T.M. SVC',
    shortLabel: 'HBS',
    type: 'SVC',
    hvLevel: '154/380 kV',
    mvLevel: '34.5 kV',
    factsLabel: '±24.8 MVAr SVC',
    capacitiveMvar: 24.8,
    inductiveMvar: -24.8,
    mwEffect: 2.6,
    ogVoltageLabel: '±0.5 kV',
    ygVoltageLabel: 'saha varsayımı',
    phaseDegrees: 64,
    sensitivity: 0.66,
    location: 'Aliağa / demir-çelik',
    load: 'SVC + tesis yükleri',
    note: 'Beşinci SVC barası olarak daha küçük pulse/MW katkısı ile toplam tepkiye katılır.',
    nominalVoltageKv: 380,
  },
  {
    id: 'sincan',
    tab: 'Sincan',
    name: 'Sincan T.M. STATCOM',
    shortLabel: 'SNC',
    type: 'STATCOM',
    hvLevel: '154 kV',
    mvLevel: '154 kV B bank',
    factsLabel: '+50 / -30 MVAr STATCOM',
    capacitiveMvar: 50,
    inductiveMvar: -30,
    mwEffect: 2.25,
    ogVoltageLabel: 'testte ölçüm yok',
    ygVoltageLabel: '1.15 kV @ 154 kV',
    phaseDegrees: 88,
    sensitivity: 0.6,
    location: 'Ankara Sincan / STATCOM',
    load: 'VSC + DC link',
    note: 'Altıncı bara olarak STATCOM davranışını gösterir; kapasitif ve endüktif sınırlar asimetriktir.',
    nominalVoltageKv: 154,
  },
];

const PQVF_SCENARIO_DEFS = {
  interarea: { frequencyHz: 0.35, damping: 0.055, expectedMode: 'Bölgeler arası', comment: 'düşük frekanslı bölgeler arası salınım adayıdır' },
  local: { frequencyHz: 1.25, damping: 0.09, expectedMode: 'Yerel', comment: 'yerel santral modu adayıdır' },
  forced: { frequencyHz: 0.74, damping: 0.005, expectedMode: 'Zorlanmış', comment: 'sürekli kaynaklı zorlanmış salınım adayıdır' },
} satisfies Record<TrainingPqvfScenario, { frequencyHz: number; damping: number; expectedMode: string; comment: string }>;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const seededRandom = (seed: number) => {
  let state = Math.max(1, Math.floor(Math.abs(seed))) % 2147483647;
  return () => {
    state = state * 16807 % 2147483647;
    return (state - 1) / 2147483646;
  };
};

export function pickSlidingWindowIndices({
  sampleCount,
  samplingRateHz,
  windowSeconds,
  windowStartSeconds,
}: {
  sampleCount: number;
  samplingRateHz: number;
  windowSeconds: number;
  windowStartSeconds: number;
}): TrainingWindowRange {
  const safeSampleCount = Math.max(0, Math.floor(sampleCount));
  const windowSize = Math.max(1, Math.round(windowSeconds * samplingRateHz));
  const maxStartIndex = Math.max(0, safeSampleCount - windowSize);
  const startIndex = clamp(Math.round(windowStartSeconds * samplingRateHz), 0, maxStartIndex);
  const endIndex = Math.min(safeSampleCount, startIndex + windowSize);
  return {
    startIndex,
    endIndex,
    startSeconds: startIndex / samplingRateHz,
    endSeconds: endIndex / samplingRateHz,
  };
}

export function estimateDftSpectrum(
  values: number[],
  samplingRateHz: number,
  minFrequencyHz: number,
  maxFrequencyHz: number,
  stepHz: number,
): TrainingSpectrumPoint[] {
  if (!values.length) return [];
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  const centered = values.map(value => value - mean);
  const spectrum: TrainingSpectrumPoint[] = [];
  for (let frequencyHz = minFrequencyHz; frequencyHz <= maxFrequencyHz + stepHz / 2; frequencyHz += stepHz) {
    let real = 0;
    let imaginary = 0;
    for (let index = 0; index < centered.length; index += 1) {
      const angle = 2 * Math.PI * frequencyHz * index / samplingRateHz;
      real += centered[index] * Math.cos(angle);
      imaginary -= centered[index] * Math.sin(angle);
    }
    spectrum.push({
      frequencyHz: Number(frequencyHz.toFixed(4)),
      amplitude: 2 * Math.sqrt(real * real + imaginary * imaginary) / centered.length,
    });
  }
  return spectrum;
}

export function buildDampedOscillation({
  frequencyHz,
  dampingRatioPercent,
  durationSeconds,
  samplingRateHz,
  amplitude = 1,
}: {
  frequencyHz: number;
  dampingRatioPercent: number;
  durationSeconds: number;
  samplingRateHz: number;
  amplitude?: number;
}) {
  const time: number[] = [];
  const signal: number[] = [];
  const envelope: number[] = [];
  const damping = dampingRatioPercent / 100;
  const growthSign = dampingRatioPercent < 0 ? 1 : -1;
  const rate = Math.abs(damping) * frequencyHz * 4;
  const sampleCount = Math.round(durationSeconds * samplingRateHz);
  for (let index = 0; index <= sampleCount; index += 1) {
    const t = index / samplingRateHz;
    const env = amplitude * Math.exp(growthSign * rate * t);
    const cappedEnv = dampingRatioPercent < 0 ? Math.min(env, amplitude * 3.2) : env;
    time.push(t);
    envelope.push(cappedEnv);
    signal.push(cappedEnv * Math.sin(2 * Math.PI * frequencyHz * t));
  }
  return { time, signal, envelope };
}

export function buildSlidingWindowSimulation({
  durationSeconds,
  samplingRateHz,
  windowSeconds,
  windowStartSeconds,
  targetFrequencyHz,
  noiseLevel,
  seed,
}: {
  durationSeconds: number;
  samplingRateHz: number;
  windowSeconds: number;
  windowStartSeconds: number;
  targetFrequencyHz: number;
  noiseLevel: number;
  seed: number;
}) {
  const sampleCount = Math.round(durationSeconds * samplingRateHz);
  const random = seededRandom(seed);
  const rawValues: number[] = [];
  const rawSeries: TrainingPoint[] = [];
  for (let index = 0; index < sampleCount; index += 1) {
    const timeSeconds = index / samplingRateHz;
    const eventEnvelope = timeSeconds < 5 ? 0.25 : timeSeconds < durationSeconds - 6 ? 1 : 0.45;
    const target = 0.65 * eventEnvelope * Math.sin(2 * Math.PI * targetFrequencyHz * timeSeconds);
    const local = 0.22 * Math.sin(2 * Math.PI * 1.2 * timeSeconds + 0.35);
    const slow = 0.04 * Math.sin(2 * Math.PI * 0.035 * timeSeconds);
    const noise = noiseLevel === 0 ? 0 : noiseLevel * (random() - 0.5);
    const value = target + local + slow + noise;
    rawValues.push(value);
    rawSeries.push({ timeSeconds, value });
  }
  const window = pickSlidingWindowIndices({ sampleCount, samplingRateHz, windowSeconds, windowStartSeconds });
  const segment = rawValues.slice(window.startIndex, window.endIndex);
  const spectrum = estimateDftSpectrum(segment, samplingRateHz, 0.2, 5, 0.025);
  const peak = spectrum.reduce((max, point) => point.amplitude > max.amplitude ? point : max, spectrum[0]);
  const windowedSeries = rawSeries.map((point, index) => ({
    ...point,
    value: index >= window.startIndex && index < window.endIndex ? point.value : Number.NaN,
  }));
  const frequencyMinHz = 0.2;
  const frequencyMaxHz = 5;
  const frequencyRows = 36;
  const spectrogramColumns = Array.from({ length: 42 }, (_unused, column) => {
    const timeRatio = column / 41;
    return Array.from({ length: frequencyRows }, (_unusedRow, row) => {
      const frequencyHz = frequencyMinHz + (frequencyMaxHz - frequencyMinHz) * (1 - row / (frequencyRows - 1));
      const ridge = Math.exp(-Math.pow((frequencyHz - targetFrequencyHz) / Math.max(0.08, targetFrequencyHz * 0.04), 2));
      return Number((ridge * (timeRatio < 0.2 ? 0.35 : 1) + 0.08 * Math.sin(column * 0.7 + row * 0.3)).toFixed(3));
    });
  });
  const spectrogram: TrainingSpectrogram = {
    columns: spectrogramColumns,
    frequencyMinHz,
    frequencyMaxHz,
    frequencyLabels: Array.from({ length: frequencyRows }, (_unused, index) => `${(frequencyMinHz + (frequencyMaxHz - frequencyMinHz) * (1 - index / (frequencyRows - 1))).toFixed(2)} Hz`),
  };
  return {
    rawSeries,
    windowedSeries,
    window,
    spectrum,
    spectrogram,
    dominantFrequencyHz: peak?.frequencyHz ?? null,
    operatorComment: `Aktif pencere ${targetFrequencyHz.toFixed(2)} Hz civarında baskın bir bileşen gösteriyor; bu bant ${classifyTrainingFrequency(targetFrequencyHz)} olarak yorumlanmalıdır.`,
  };
}

function classifyTrainingFrequency(frequencyHz: number) {
  if (frequencyHz < 0.8) return 'bölgeler arası salınım adayı';
  if (frequencyHz < 2) return 'yerel salınım adayı';
  if (frequencyHz < 3) return 'IBR kontrol etkileşimi adayı';
  return 'torsiyonel/SSO veya yüksek frekanslı diagnostik eğitim bandı';
}

export function buildTrainingPqvfSimulation({
  scenario,
  severity,
  durationSeconds,
  samplingRateHz,
}: {
  scenario: TrainingPqvfScenario;
  severity: number;
  durationSeconds: number;
  samplingRateHz: number;
}) {
  const def = PQVF_SCENARIO_DEFS[scenario];
  const time: number[] = [];
  const series = {
    frequency: [] as number[],
    activePower: [] as number[],
    voltage: [] as number[],
    reactivePower: [] as number[],
  };
  const sampleCount = Math.round(durationSeconds * samplingRateHz);
  for (let index = 0; index <= sampleCount; index += 1) {
    const t = index / samplingRateHz;
    const tau = Math.max(0, t - 5);
    const active = t >= 5 ? 1 : 0;
    const envelope = Math.exp(-def.damping * def.frequencyHz * 4 * tau);
    const baseAngle = 2 * Math.PI * def.frequencyHz * tau;
    time.push(t);
    series.frequency.push(50 + active * severity * 0.035 * envelope * Math.sin(baseAngle));
    series.activePower.push(400 + active * severity * 120 * envelope * Math.sin(baseAngle + Math.PI / 7));
    series.voltage.push(1 + active * severity * 0.035 * envelope * Math.sin(baseAngle + Math.PI));
    series.reactivePower.push(80 + active * severity * 45 * envelope * Math.sin(baseAngle + Math.PI / 4));
  }
  return {
    time,
    eventStartSeconds: 5,
    series,
    summary: {
      dominantFrequencyHz: def.frequencyHz,
      expectedMode: def.expectedMode,
      severityLabel: `${severity.toFixed(2)}x`,
      operatorComment: `${def.frequencyHz.toFixed(2)} Hz bileşeni ${def.comment}; P-Q-V-f metrikleri aynı zaman ekseninde birlikte okunmalıdır.`,
    },
  };
}

export function buildPqvfDetectionSpectrum({
  scenario,
  severity,
}: {
  scenario: TrainingPqvfScenario;
  severity: number;
}) {
  const selected = PQVF_SCENARIO_DEFS[scenario];
  const modeMarkers = (Object.keys(TRAINING_MODE_DEFS) as TrainingModeId[]).map(mode => ({
    mode,
    label: TRAINING_MODE_DEFS[mode].shortLabel,
    frequencyHz: TRAINING_MODE_DEFS[mode].frequencyHz,
    bandLabel: TRAINING_MODE_DEFS[mode].bandLabel,
    color: TRAINING_MODE_DEFS[mode].color,
  }));
  const spectrum: TrainingSpectrumPoint[] = [];
  for (let frequencyHz = 0.1; frequencyHz <= 5.0001; frequencyHz += 0.025) {
    const selectedRidge = Math.exp(-Math.pow((frequencyHz - selected.frequencyHz) / 0.055, 2)) * severity;
    const localRidge = Math.exp(-Math.pow((frequencyHz - TRAINING_MODE_DEFS.local.frequencyHz) / 0.09, 2)) * 0.22;
    const forcedRidge = Math.exp(-Math.pow((frequencyHz - TRAINING_MODE_DEFS.forced.frequencyHz) / 0.05, 2)) * (scenario === 'forced' ? 0.65 : 0.18);
    const torsionalRidge = Math.exp(-Math.pow((frequencyHz - TRAINING_MODE_DEFS.torsional.frequencyHz) / 0.16, 2)) * 0.16;
    const ibrRidge = Math.exp(-Math.pow((frequencyHz - TRAINING_MODE_DEFS.ibr.frequencyHz) / 0.12, 2)) * 0.14;
    spectrum.push({
      frequencyHz: Number(frequencyHz.toFixed(3)),
      amplitude: Number((0.01 + selectedRidge + localRidge + forcedRidge + torsionalRidge + ibrRidge).toFixed(5)),
    });
  }
  const selectedPeak = spectrum.reduce((peak, point) => point.amplitude > peak.amplitude ? point : peak, spectrum[0]);
  return {
    spectrum,
    modeMarkers,
    selectedPeak,
    operatorComment: `${selected.frequencyHz.toFixed(2)} Hz tepe noktası ${selected.expectedMode.toLocaleLowerCase('tr-TR')} mod frekansı ile uyumludur; P-Q-V-f sinyalleri aynı frekans bileşeni etrafında karşılaştırılmalıdır.`,
  };
}

export function buildSasPulseSimulation({
  amplitudeMhz,
  phaseDegrees,
  triggerThresholdMhz,
  releaseThresholdMhz,
}: {
  amplitudeMhz: number;
  phaseDegrees: number;
  triggerThresholdMhz: number;
  releaseThresholdMhz: number;
}) {
  const decision = decideFbmswaCommand({
    amplitudeMhz,
    phaseDegrees,
    triggerThresholdMhz,
    releaseThresholdMhz,
  }) satisfies SasPulseDecision;
  const timeSeconds: number[] = [];
  const frequencySeries: TrainingPoint[] = [];
  const normalizedOscillationSeries: TrainingPoint[] = [];
  const shortWindowSeries: TrainingPoint[] = [];
  const longWindowSeries: TrainingPoint[] = [];
  const actionLevelSeries: TrainingPoint[] = [];
  const commandSeries: TrainingPoint[] = [];
  for (let index = 0; index <= 600; index += 1) {
    const t = index / 2;
    const eventEnvelope = t < 50 ? 0.35 : t < 235 ? 1 : 0.42;
    const angle = 2 * Math.PI * 0.15 * t + phaseDegrees * Math.PI / 180;
    const normalizedOscillation = eventEnvelope * Math.sin(angle);
    const frequencyDeviationHz = amplitudeMhz / 1000 * eventEnvelope * Math.sin(angle);
    const shortWindowAmplitude = amplitudeMhz * eventEnvelope * (t < 70 ? 0.6 : 1);
    const longWindowPhase = phaseDegrees * (t < 120 ? 0.45 : 1);
    const isEventWindow = t >= 75 && t <= 245;
    const isPulseWindow = decision.command === 1
      ? isEventWindow && normalizedOscillation > 0.62
      : decision.command === -1
        ? isEventWindow && normalizedOscillation < -0.62
        : false;
    const actionLevel = isPulseWindow ? decision.command : 0;
    const factsPulseMvar = isPulseWindow
      ? decision.command === 1 ? 50 : -30
      : 0;
    timeSeconds.push(t);
    frequencySeries.push({ timeSeconds: t, value: 50 + frequencyDeviationHz });
    normalizedOscillationSeries.push({ timeSeconds: t, value: normalizedOscillation });
    shortWindowSeries.push({ timeSeconds: t, value: shortWindowAmplitude });
    longWindowSeries.push({ timeSeconds: t, value: longWindowPhase });
    actionLevelSeries.push({ timeSeconds: t, value: actionLevel });
    commandSeries.push({ timeSeconds: t, value: factsPulseMvar });
  }
  return {
    decision,
    timeSeconds,
    frequencySeries,
    normalizedOscillationSeries,
    shortWindowSeries,
    longWindowSeries,
    actionLevelSeries,
    commandSeries,
    thresholdSeries: {
      trigger: timeSeconds.map(timeSeconds => ({ timeSeconds, value: triggerThresholdMhz })),
      release: timeSeconds.map(timeSeconds => ({ timeSeconds, value: releaseThresholdMhz })),
    },
    systemFacts: {
      samplingKhz: 25.6,
      halfCycleMs: 10,
      shortWindowSamples: 2000,
      shortWindowSeconds: 20,
      longWindowSamples: 10000,
      longWindowSeconds: 100,
      targetBandHz: '0.12-0.16 Hz',
      amplitudeThresholdMhz: 10,
      phaseToleranceDegrees: 30,
    },
  };
}

const sasEnvelopeAt = (timeSeconds: number, amplitudeMhz: number) => {
  const rise = 1 / (1 + Math.exp(-(timeSeconds - 90) / 18));
  const fall = 1 / (1 + Math.exp((timeSeconds - 344) / 25));
  const pulse = 0.18 * Math.exp(-Math.pow((timeSeconds - 226) / 120, 2));
  return amplitudeMhz * (0.1 + 0.95 * rise * fall + pulse);
};

const sasSeededNoise = (index: number, busIndex: number) => {
  const value = Math.sin((index + 1) * (busIndex + 3) * 12.9898) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
};

export function buildSasInterareaSimulation({
  amplitudeMhz,
  modeFrequencyHz,
  triggerThresholdMhz,
  dampingPercent,
  durationSeconds = 480,
  stepSeconds = 0.5,
}: {
  amplitudeMhz: number;
  modeFrequencyHz: number;
  triggerThresholdMhz: number;
  dampingPercent: number;
  durationSeconds?: number;
  stepSeconds?: number;
}): SasInterareaSimulation {
  const releaseThresholdMhz = Math.max(3, triggerThresholdMhz - 2);
  const times = Array.from({ length: Math.round(durationSeconds / stepSeconds) + 1 }, (_unused, index) => Number((index * stepSeconds).toFixed(2)));
  const inSasBand = modeFrequencyHz >= 0.1 && modeFrequencyHz <= 0.2;
  const buses = SAS_INTERAREA_BUS_CONFIGS.map((config, busIndex) => {
    let latch = false;
    let lastPulse: -1 | 0 | 1 = 0;
    const series: SasInterareaBusSeries = {
      frequencyHz: [],
      rawMhz: [],
      filteredMhz: [],
      shortAmplitudeMhz: [],
      energy: [],
      pulseLevel: [],
      mvar: [],
      mw: [],
      modeFrequencyHz: [],
      dampingRatioPercent: [],
      phaseErrorDegrees: [],
      confidencePercent: [],
      voltageKv: [],
      voltagePu: [],
    };
    const phaseRadians = config.phaseDegrees * Math.PI / 180;
    times.forEach((timeSeconds, index) => {
      const envelope = sasEnvelopeAt(timeSeconds, amplitudeMhz) * config.sensitivity;
      const phaseAngle = 2 * Math.PI * modeFrequencyHz * timeSeconds + phaseRadians;
      const filteredMhz = envelope * Math.sin(phaseAngle);
      const slowMhz = 2.8 * Math.sin(2 * Math.PI * 0.018 * timeSeconds + busIndex * 0.7);
      const noiseMhz = sasSeededNoise(index, busIndex) * 0.9 + Math.sin(index * 0.49 + busIndex) * 0.4;
      const rawMhz = filteredMhz + slowMhz + noiseMhz;
      const shortAmplitudeMhz = Math.abs(envelope) * (0.86 + 0.08 * Math.sin(timeSeconds / 27 + busIndex)) + Math.abs(noiseMhz) * 0.45;
      if (inSasBand && shortAmplitudeMhz >= triggerThresholdMhz) latch = true;
      if (!inSasBand || shortAmplitudeMhz <= releaseThresholdMhz) latch = false;
      let pulseLevel: -1 | 0 | 1 = 0;
      if (latch) {
        pulseLevel = Math.sin(phaseAngle) >= 0 ? 1 : -1;
        if (Math.abs(Math.sin(phaseAngle)) < 0.08) pulseLevel = lastPulse;
      }
      lastPulse = pulseLevel;
      const mvar = pulseLevel > 0 ? config.capacitiveMvar : pulseLevel < 0 ? config.inductiveMvar : 0;
      const mw = pulseLevel * config.mwEffect * (0.82 + 0.18 * Math.min(1, shortAmplitudeMhz / Math.max(1, triggerThresholdMhz * 2)));
      const voltageSwingKv = pulseLevel * (config.type === 'STATCOM' ? 0.55 : 0.32) * config.sensitivity + 0.04 * Math.sin(timeSeconds / 19 + busIndex);
      const voltageKv = config.nominalVoltageKv + voltageSwingKv;
      const confidencePercent = clamp((shortAmplitudeMhz - releaseThresholdMhz) / (triggerThresholdMhz * 1.4) * 100 + (latch ? 22 : 0), 0, 100);
      series.frequencyHz.push(Number((50 + rawMhz / 1000).toFixed(6)));
      series.rawMhz.push(Number(rawMhz.toFixed(4)));
      series.filteredMhz.push(Number(filteredMhz.toFixed(4)));
      series.shortAmplitudeMhz.push(Number(shortAmplitudeMhz.toFixed(4)));
      series.energy.push(Number((Math.pow(shortAmplitudeMhz, 2) * (0.018 + 0.002 * busIndex)).toFixed(4)));
      series.pulseLevel.push(pulseLevel);
      series.mvar.push(Number(mvar.toFixed(3)));
      series.mw.push(Number(mw.toFixed(4)));
      series.modeFrequencyHz.push(Number((modeFrequencyHz + 0.004 * Math.sin(timeSeconds / 80 + busIndex) + sasSeededNoise(index + 4, busIndex) * 0.0012).toFixed(5)));
      series.dampingRatioPercent.push(Number((dampingPercent + (latch ? 1.8 : -0.8) + 1.5 * Math.sin(timeSeconds / 170 + busIndex * 0.3)).toFixed(3)));
      series.phaseErrorDegrees.push(Number((24 * Math.sin(timeSeconds / 55 + busIndex * 0.6) + sasSeededNoise(index + 8, busIndex) * 2.5).toFixed(3)));
      series.confidencePercent.push(Number(confidencePercent.toFixed(2)));
      series.voltageKv.push(Number(voltageKv.toFixed(4)));
      series.voltagePu.push(Number((voltageKv / config.nominalVoltageKv).toFixed(6)));
    });
    return { config, series };
  });
  const totalMw = times.map((_time, index) => Number(buses.reduce((total, entry) => total + entry.series.mw[index], 0).toFixed(4)));
  const aggregateSeries = {
    totalMw,
    totalDampingMw: totalMw.map(value => Number((-value).toFixed(4))),
    totalMvar: times.map((_time, index) => Number(buses.reduce((total, entry) => total + entry.series.mvar[index], 0).toFixed(4))),
    activeBusCount: times.map((_time, index) => buses.reduce((total, entry) => total + (entry.series.pulseLevel[index] !== 0 ? 1 : 0), 0)),
    totalEnergy: times.map((_time, index) => Number(buses.reduce((total, entry) => total + entry.series.energy[index], 0).toFixed(4))),
    frequencyChangeMhz: times.map((_time, index) => Number((buses.reduce((total, entry) => total + entry.series.rawMhz[index], 0) / buses.length).toFixed(4))),
    voltagePu: times.map((_time, index) => Number((buses.reduce((total, entry) => total + entry.series.voltagePu[index], 0) / buses.length).toFixed(6))),
  };
  return {
    times,
    durationSeconds,
    stepSeconds,
    releaseThresholdMhz,
    tabs: [
      ...buses.map((entry, index) => ({
        id: entry.config.id,
        label: `${index + 1}. ${entry.config.tab}`,
        subtitle: `${entry.config.type} · ${entry.config.factsLabel}`,
      })),
      { id: 'aggregate', label: '7. Toplam', subtitle: '6 bara ortak tepki' },
    ],
    buses,
    aggregate: { series: aggregateSeries },
  };
}

export function buildSasAggregateChartDescriptors(_simulation: SasInterareaSimulation): SasAggregateChartDescriptor[] {
  return [
    {
      key: 'all-pulses',
      title: '1. Tüm Bara Pulse Tepkileri',
      subtitle: 'Her bara için offsetli -1 / 0 / +1 pulse çizimi',
      seriesNames: SAS_INTERAREA_BUS_CONFIGS.map(config => `${config.shortLabel} pulse`),
    },
    {
      key: 'total-mw-mvar',
      title: '2. Toplam Aktif Güç / Reaktif Komut',
      subtitle: 'Toplam MW etkisi ve toplam MVAr komutu',
      seriesNames: ['Toplam MW', 'Toplam MVAr'],
    },
    {
      key: 'total-mw-frequency',
      title: '3. Toplam MW ve Frekans Değişimi',
      subtitle: 'Frekans sapmasına ters polaritede MW sönümleme etkisi',
      seriesNames: ['Toplam MW sönümleme etkisi', 'Frekans değişimi'],
    },
    {
      key: 'mvar-voltage-frequency',
      title: '4. Toplam MVAr / Gerilim p.u. / Frekans',
      subtitle: 'Reaktif komut, ortalama gerilim ve frekans değişimi',
      seriesNames: ['Toplam MVAr', 'Gerilim p.u.', 'Frekans değişimi'],
    },
  ];
}

const normalizeSasWindow = (start: number, end: number, durationSeconds: number): SasChartWindow => {
  const safeDuration = Math.max(1, durationSeconds);
  const orderedStart = Math.min(start, end);
  const orderedEnd = Math.max(start, end);
  const span = Math.max(1, orderedEnd - orderedStart);
  const clampedStart = clamp(orderedStart, 0, Math.max(0, safeDuration - span));
  return {
    start: Number(clampedStart.toFixed(3)),
    end: Number(Math.min(safeDuration, clampedStart + span).toFixed(3)),
  };
};

export function resolveSasChartWindow({
  durationSeconds,
  timeSeconds,
  viewSeconds,
  zoomWindow,
}: {
  durationSeconds: number;
  timeSeconds: number;
  viewSeconds: number;
  zoomWindow: SasChartWindow | null;
}): SasChartWindow {
  if (zoomWindow) return normalizeSasWindow(zoomWindow.start, zoomWindow.end, durationSeconds);
  if (viewSeconds >= durationSeconds) return { start: 0, end: durationSeconds };
  const span = Math.max(30, viewSeconds);
  const start = clamp(timeSeconds - span / 2, 0, durationSeconds - span);
  return { start: Number(start.toFixed(3)), end: Number((start + span).toFixed(3)) };
}

export function normalizeSasDataZoomEvent(event: unknown, durationSeconds: number): SasChartWindow | null {
  if (!event || typeof event !== 'object') return null;
  const eventRecord = event as Record<string, unknown>;
  const batch = Array.isArray(eventRecord.batch) ? eventRecord.batch[0] : undefined;
  const payload = (batch && typeof batch === 'object' ? batch : eventRecord) as Record<string, unknown>;
  const startValue = Number(payload.startValue);
  const endValue = Number(payload.endValue);
  if (Number.isFinite(startValue) && Number.isFinite(endValue)) {
    return normalizeSasWindow(startValue, endValue, durationSeconds);
  }
  const startPercent = Number(payload.start);
  const endPercent = Number(payload.end);
  if (Number.isFinite(startPercent) && Number.isFinite(endPercent)) {
    return normalizeSasWindow(durationSeconds * startPercent / 100, durationSeconds * endPercent / 100, durationSeconds);
  }
  return null;
}

export function buildSasChartZoomConfig(startValue?: number, endValue?: number) {
  const controlled = Number.isFinite(startValue) && Number.isFinite(endValue)
    ? { startValue, endValue }
    : {};
  return [
    { type: 'inside', xAxisIndex: 0, filterMode: 'none', zoomOnMouseWheel: true, moveOnMouseMove: true, moveOnMouseWheel: false, ...controlled },
    { type: 'slider', xAxisIndex: 0, filterMode: 'none', height: 18, bottom: 8, ...controlled },
  ];
}

export function assessDampingRatio(dampingRatioPercent: number): {
  level: TrainingDampingLevel;
  label: string;
  comment: string;
} {
  if (dampingRatioPercent < 0) {
    return {
      level: 'critical',
      label: 'Kritik',
      comment: 'Negatif damping, büyüyen salınım eğilimi anlamına gelir.',
    };
  }
  if (dampingRatioPercent < 3) {
    return {
      level: 'weak',
      label: 'Zayıf sönüm',
      comment: 'Salınım uzun süre korunabilir; transfer ve kontrol ayarları izlenmelidir.',
    };
  }
  if (dampingRatioPercent < 5) {
    return {
      level: 'watch',
      label: 'İzleme',
      comment: 'Sönümleme sınırdadır; aynı mod diğer sinyallerde de kontrol edilmelidir.',
    };
  }
  return {
    level: 'safe',
    label: 'Güvenli',
    comment: 'Salınım zarfı azalıyor; operatör için izleme yeterlidir.',
  };
}

export function decideFbmswaCommand({
  amplitudeMhz,
  phaseDegrees,
  triggerThresholdMhz,
  releaseThresholdMhz,
}: {
  amplitudeMhz: number;
  phaseDegrees: number;
  triggerThresholdMhz: number;
  releaseThresholdMhz: number;
}): {
  status: FbmswaDecisionStatus;
  command: -1 | 0 | 1;
  label: string;
  comment: string;
} {
  if (amplitudeMhz < releaseThresholdMhz) {
    return {
      status: 'normal',
      command: 0,
      label: 'Normal kip',
      comment: 'Genlik kapanma eşiğinin altında; sistem müdahalesiz izlenir.',
    };
  }
  if (amplitudeMhz < triggerThresholdMhz) {
    return {
      status: 'hold',
      command: 0,
      label: 'Bekleme',
      comment: 'Histerezis bölgesinde; yalancı tetiklemeyi önlemek için yeni pencere beklenir.',
    };
  }
  if (phaseDegrees >= 0) {
    return {
      status: 'capacitive',
      command: 1,
      label: 'Kapasitif kip',
      comment: 'Kısa pencere genliği tehlike eşiğini aştı; uzun pencere fazı pozitif yön gösteriyor.',
    };
  }
  return {
    status: 'inductive',
    command: -1,
    label: 'Endüktif kip',
    comment: 'Kısa pencere genliği tehlike eşiğini aştı; uzun pencere fazı negatif yön gösteriyor.',
  };
}

export function buildModeShapeDefData() {
  const nodes = [
    { pmu: 'TM-1', amplitude: 0.9, phaseDegrees: 10, x: 0.16, y: 0.28 },
    { pmu: 'TM-2', amplitude: 0.75, phaseDegrees: 25, x: 0.33, y: 0.22 },
    { pmu: 'TM-3', amplitude: 0.42, phaseDegrees: 70, x: 0.5, y: 0.34 },
    { pmu: 'TM-4', amplitude: 0.38, phaseDegrees: 210, x: 0.62, y: 0.64 },
    { pmu: 'TM-5', amplitude: 0.84, phaseDegrees: 198, x: 0.78, y: 0.7 },
    { pmu: 'TM-6', amplitude: 0.95, phaseDegrees: 180, x: 0.88, y: 0.56 },
  ];
  const defBars = [
    { pmu: 'TM-1', value: -0.4, role: 'absorber' as const },
    { pmu: 'TM-2', value: -0.2, role: 'absorber' as const },
    { pmu: 'TM-3', value: 0.1, role: 'source' as const },
    { pmu: 'TM-4', value: 0.35, role: 'source' as const },
    { pmu: 'TM-5', value: 0.8, role: 'source' as const },
    { pmu: 'TM-6', value: 0.55, role: 'source' as const },
  ];
  return {
    nodes,
    defBars,
    operatorComment: 'Karşı fazlı iki PMU grubu ve düşük frekans bandı, bölgeler arası salınım karakterine işaret eder.',
  };
}
