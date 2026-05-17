import { calculateOscillationAnalysis } from './oscillationMetrics.ts';
import type {
  OscillationAnalysisResult,
  OscillationAmplitudeThresholds,
  AnalysisProgress,
  PmuFider,
  PmuSample,
  PmuSelectionMode,
  PmuSignalKey,
} from '../types/oscillationTypes.ts';

interface OscillationWorkerScope {
  onmessage: ((event: MessageEvent<AnalysisWorkerRequest>) => void) | null;
  postMessage: (message: AnalysisWorkerResponse) => void;
}

export interface AnalysisWorkerRequest {
  selectionMode: PmuSelectionMode;
  samplesByPmuEntries: Array<[string, PmuSample[]]>;
  pmuDevices: PmuFider[];
  referencePmuId?: string;
  startTime: string;
  endTime: string;
  selectedSignals: PmuSignalKey[];
  amplitudeThresholds: OscillationAmplitudeThresholds;
  samplingRateHz: number;
  windowSeconds: number;
  stepSeconds: number;
}

export type AnalysisWorkerResponse =
  | { status: 'progress'; progress: AnalysisProgress }
  | { status: 'ok'; result: OscillationAnalysisResult }
  | { status: 'error'; error: string };

const workerContext = self as unknown as OscillationWorkerScope;

const postProgress = (progress: AnalysisProgress): void => {
  workerContext.postMessage({ status: 'progress', progress } satisfies AnalysisWorkerResponse);
};

workerContext.onmessage = (event: MessageEvent<AnalysisWorkerRequest>) => {
  try {
    const request = event.data;
    postProgress({ stage: 'prepare', percent: 8, label: 'Veri hazırlanıyor' });
    postProgress({ stage: 'quality', percent: 22, label: 'Veri kalitesi hesaplanıyor' });
    postProgress({ stage: 'bands', percent: 42, label: 'Bant metrikleri hesaplanıyor' });
    postProgress({ stage: 'windows', percent: 64, label: 'Kayan pencere analizi yapılıyor' });
    const result = calculateOscillationAnalysis({
      ...request,
      samplesByPmu: new Map(request.samplesByPmuEntries),
    });
    postProgress({ stage: 'modes', percent: 88, label: 'Ortak modlar ve olaylar yorumlanıyor' });
    postProgress({ stage: 'complete', percent: 100, label: 'Analiz tamamlandı' });

    workerContext.postMessage({ status: 'ok', result } satisfies AnalysisWorkerResponse);
  } catch (error) {
    workerContext.postMessage({ status: 'error', error: String(error) } satisfies AnalysisWorkerResponse);
  }
};

export {};
