import type { OscillationAnalysisResult, OscillationEvent, PmuSample } from '../types/oscillationTypes.ts';

export type SasControlState = 'IDLE' | 'INTERMEDIATE' | 'ACTIVE' | string;
export type SasDampingType = 'NEGATIVE' | 'CRITICAL' | 'POOR' | string;
export type BenchmarkFindingSeverity = 'info' | 'warning' | 'error';

export interface SasAlgoRow {
  timestamp: string;
  timestampMs: number;
  frequencyHz: number | null;
  targetFrequencyHz: number | null;
  startThresholdHz: number | null;
  magnitudeHz: number | null;
  controlValue: -1 | 0 | 1 | null;
  controlState: SasControlState;
  dampingRatio: number | null;
  dampingType: SasDampingType;
  timeHealth: string;
  dataValid: boolean | null;
}

export interface SasCentreRow {
  timestamp: string;
  timestampMs: number;
  frequencyHz: number | null;
  activePowerW: number | null;
  reactivePowerVAr: number | null;
  deviceId: string;
  role: string;
  timeQuality: string;
  dataQuality: string;
}

export interface SasExternalEvent {
  id: string;
  startMs: number;
  endMs: number;
  durationSeconds: number;
  targetFrequencyHz: number | null;
  startThresholdHz: number | null;
  peakMagnitudeHz: number | null;
  minDampingRatioPercent: number | null;
  averageDampingRatioPercent: number | null;
  dampingTypes: SasDampingType[];
  hasNegativeDamping: boolean;
  controlValues: Array<-1 | 0 | 1>;
  rowCount: number;
}

export interface BenchmarkDataFinding {
  severity: BenchmarkFindingSeverity;
  code: string;
  title: string;
  detail: string;
}

export interface BenchmarkSamplingSummary {
  sampleCount: number;
  firstTimestampMs: number | null;
  lastTimestampMs: number | null;
  medianIntervalMs: number | null;
  sampleRateHz: number | null;
  duplicateTimestampCount: number;
  backwardsTimestampCount: number;
  gapCount: number;
  maxGapMs: number | null;
}

export interface SasImportQualityReport {
  pmu: BenchmarkSamplingSummary;
  algo: BenchmarkSamplingSummary;
  centreAnalysis: BenchmarkSamplingSummary;
  centreMeasurement: BenchmarkSamplingSummary;
  invalidPmuRows: number;
  invalidAlgoRows: number;
  findings: BenchmarkDataFinding[];
}

export interface SasImportResult {
  archiveName: string;
  recognisedFiles: Record<'algo' | 'pmu' | 'merkezAnalysis' | 'merkezMeasurement', string>;
  pmuSamples: PmuSample[];
  algoRows: SasAlgoRow[];
  centreAnalysisRows: SasCentreRow[];
  centreMeasurementRows: SasCentreRow[];
  externalEvents: SasExternalEvent[];
  quality: SasImportQualityReport;
}

export interface PmuResampleResult {
  samples: PmuSample[];
  sourceRateHz: number;
  targetRateHz: number;
  decimationFactor: number;
  antiAliasCutoffHz: number;
  firTapCount: number;
}

export type BenchmarkMatchStatus = 'match' | 'missed' | 'extra';

export interface BenchmarkEventComparison {
  id: string;
  status: BenchmarkMatchStatus;
  sasEvent: SasExternalEvent | null;
  gkcEvent: OscillationEvent | null;
  startDeltaSeconds: number | null;
  endDeltaSeconds: number | null;
  durationDeltaSeconds: number | null;
  overlapPercent: number | null;
  targetFrequencyHz: number | null;
  gkcDominantFrequencyHz: number | null;
  frequencyDeltaHz: number | null;
  sasPeakMagnitudeHz: number | null;
  gkcPeakAmplitude: number | null;
  sasDampingPercent: number | null;
  gkcMinDampingPercent: number | null;
  gkcAverageDampingPercent: number | null;
  negativeDampingDirectionMatches: boolean | null;
}

export interface OscillationBenchmarkResult {
  imported: SasImportResult;
  resample: PmuResampleResult;
  gkcAnalysis: OscillationAnalysisResult;
  comparisons: BenchmarkEventComparison[];
  matchedCount: number;
  missedCount: number;
  extraCount: number;
}
