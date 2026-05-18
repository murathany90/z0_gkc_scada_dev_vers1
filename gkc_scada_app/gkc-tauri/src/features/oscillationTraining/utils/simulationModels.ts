export type TrainingModeId = 'interarea' | 'local' | 'forced' | 'torsional' | 'ibr';
export type TrainingPqvfScenario = 'interarea' | 'local' | 'forced';
export type TrainingDampingLevel = 'critical' | 'weak' | 'watch' | 'safe';
export type FbmswaDecisionStatus = 'normal' | 'hold' | 'capacitive' | 'inductive';

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
    const noise = noiseLevel * (random() - 0.5);
    const value = target + local + slow + noise;
    rawValues.push(value);
    rawSeries.push({ timeSeconds, value });
  }
  const window = pickSlidingWindowIndices({ sampleCount, samplingRateHz, windowSeconds, windowStartSeconds });
  const segment = rawValues.slice(window.startIndex, window.endIndex);
  const spectrum = estimateDftSpectrum(segment, samplingRateHz, 0.05, 2, 0.025);
  const peak = spectrum.reduce((max, point) => point.amplitude > max.amplitude ? point : max, spectrum[0]);
  const windowedSeries = rawSeries.map((point, index) => ({
    ...point,
    value: index >= window.startIndex && index < window.endIndex ? point.value : Number.NaN,
  }));
  const spectrogram = Array.from({ length: 42 }, (_unused, column) => {
    const timeRatio = column / 41;
    return Array.from({ length: 24 }, (_unusedRow, row) => {
      const frequencyHz = 0.05 + (2 - 0.05) * (1 - row / 23);
      const ridge = Math.exp(-Math.pow((frequencyHz - targetFrequencyHz) / 0.08, 2));
      return Number((ridge * (timeRatio < 0.2 ? 0.35 : 1) + 0.08 * Math.sin(column * 0.7 + row * 0.3)).toFixed(3));
    });
  });
  return {
    rawSeries,
    windowedSeries,
    window,
    spectrum,
    spectrogram,
    dominantFrequencyHz: peak?.frequencyHz ?? null,
    operatorComment: `Aktif pencere ${targetFrequencyHz.toFixed(2)} Hz civarında baskın bir bileşen gösteriyor; bu bant bölgeler arası salınım adayıdır.`,
  };
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
  const defs = {
    interarea: { frequencyHz: 0.35, damping: 0.055, expectedMode: 'Bölgeler arası', comment: 'düşük frekanslı bölgeler arası salınım adayıdır' },
    local: { frequencyHz: 1.25, damping: 0.09, expectedMode: 'Yerel', comment: 'yerel santral modu adayıdır' },
    forced: { frequencyHz: 0.74, damping: 0.005, expectedMode: 'Zorlanmış', comment: 'sürekli kaynaklı zorlanmış salınım adayıdır' },
  } satisfies Record<TrainingPqvfScenario, { frequencyHz: number; damping: number; expectedMode: string; comment: string }>;
  const def = defs[scenario];
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
