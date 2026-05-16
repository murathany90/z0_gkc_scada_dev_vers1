import { calculateOscillationAnalysis } from './oscillationMetrics.ts';
import type {
  OscillationAnalysisResult,
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
  selectedBandIds: string[];
  samplingRateHz: number;
  windowSeconds: number;
  stepSeconds: number;
}

export type AnalysisWorkerResponse =
  | { status: 'ok'; result: OscillationAnalysisResult }
  | { status: 'error'; error: string };

const workerContext = self as unknown as OscillationWorkerScope;

workerContext.onmessage = (event: MessageEvent<AnalysisWorkerRequest>) => {
  try {
    const request = event.data;
    const result = calculateOscillationAnalysis({
      ...request,
      samplesByPmu: new Map(request.samplesByPmuEntries),
    });

    workerContext.postMessage({ status: 'ok', result } satisfies AnalysisWorkerResponse);
  } catch (error) {
    workerContext.postMessage({ status: 'error', error: String(error) } satisfies AnalysisWorkerResponse);
  }
};

export {};
