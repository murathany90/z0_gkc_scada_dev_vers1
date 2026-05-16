export type PmuSelectionMode = 'single' | 'multi';

export type PmuSignalKey =
  | 'frequency'
  | 'voltage'
  | 'activePower'
  | 'reactivePower';

export interface PmuFider {
  id: string;
  name: string;
  substationName?: string;
  voltageLevel?: string;
  bayName?: string;
  isPmu: boolean;
  source?: 'YTBS_GKC';
}

export interface PmuSample {
  timestamp: string;
  timestampMs: number;
  sourceZaman?: string;
  pmuId: string;
  frequency?: number;
  voltage?: number;
  activePower?: number;
  reactivePower?: number;
  apparentPower?: number;
  voltageMagnitudeA?: number;
  voltageMagnitudeB?: number;
  voltageMagnitudeC?: number;
  voltageAngleA?: number;
  voltageAngleB?: number;
  voltageAngleC?: number;
  currentMagnitudeA?: number;
  currentMagnitudeB?: number;
  currentMagnitudeC?: number;
  currentAngleA?: number;
  currentAngleB?: number;
  currentAngleC?: number;
  quality?: string;
}

export interface OscillationBand {
  id: string;
  name: string;
  fMin: number;
  fMax: number;
  enabled: boolean;
  primary?: boolean;
  confidence: 'low' | 'medium' | 'high' | 'limited' | 'not-supported';
  description?: string;
}

export type OscillationClassification =
  | 'MOD_YOK'
  | 'TEK_PMU_LOKAL_BULGU'
  | 'GENIS_ALAN_ADAY_MOD'
  | 'TR_INTERAREA_ADAY_MOD'
  | 'TR_INTERAREA_GUCLU_MOD'
  | 'LOKAL_ELEKTROMEKANIK_ADAY'
  | 'FORCED_ADAY'
  | 'RINGDOWN_ADAY'
  | 'VERI_KALITESI_YETERSIZ';

export interface SpectrumPoint {
  frequencyHz: number;
  power: number;
}

export interface SignalBandMetric {
  pmuId: string;
  signal: PmuSignalKey;
  bandId: string;
  dominantFrequencyHz: number | null;
  bandRms: number | null;
  peakAmplitude: number | null;
  peakToPeakAmplitude: number | null;
  spectralEnergy: number | null;
  dampingRatioPercent: number | null;
  dampingSigma: number | null;
  modePhaseDegree?: number | null;
  classificationLabel: OscillationClassification;
  dataQualityScore: number;
  spectrum?: SpectrumPoint[];
}

export interface ModeShapePoint {
  pmuId: string;
  pmuName: string;
  magnitude: number;
  phaseDegree: number;
  relativePhaseDegree: number;
  coherenceAverage?: number;
}

export interface CoherenceCell {
  sourcePmuId: string;
  targetPmuId: string;
  value: number;
}

export interface PmuQualitySummary {
  pmuId: string;
  expected: number;
  received: number;
  missingRatio: number;
  maxGapMs?: number;
  gapCount: number;
  averageIntervalMs?: number;
  status: 'ok' | 'empty' | 'partial' | 'error';
  message?: string;
}

export interface OscillationAnalysisResult {
  query: {
    selectionMode: PmuSelectionMode;
    pmuIds: string[];
    referencePmuId?: string;
    startTime: string;
    endTime: string;
    samplingRateHz: number;
    windowSeconds: number;
    stepSeconds: number;
    selectedSignals: PmuSignalKey[];
    selectedBands: string[];
  };
  dataQuality: {
    expectedSamplesPerSignal: number;
    totalSamples: number;
    missingSampleRatio: number;
    pmuQuality: PmuQualitySummary[];
  };
  metrics: SignalBandMetric[];
  commonModes: Array<{
    modeId: string;
    frequencyHz: number;
    bandId: string;
    participatingPmuIds: string[];
    averageCoherence?: number;
    averageDampingRatioPercent?: number;
    dominantSignal: PmuSignalKey;
    classificationLabel: OscillationClassification;
  }>;
  modeShape?: ModeShapePoint[];
  coherenceMatrix?: CoherenceCell[];
}

export interface SequentialPmuResult {
  pmuId: string;
  status: 'ok' | 'empty' | 'error';
  rawRows: Array<Record<string, unknown>>;
  error?: string;
  completedChunks: number;
  totalChunks: number;
}

export interface OscillationQueryProgress {
  totalPmus: number;
  completedPmus: number;
  currentPmuId: string | null;
  totalChunks: number;
  completedChunks: number;
  currentChunk: number | null;
}
