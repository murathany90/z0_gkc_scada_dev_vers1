import { calculateOscillationAnalysis } from './oscillationMetrics.ts';
import type { AnalysisWorkerRequest, AnalysisWorkerResponse } from './analysisWorker.ts';
import type { OscillationAnalysisResult } from '../types/oscillationTypes.ts';

export const runAnalysisInWorker = (request: AnalysisWorkerRequest): Promise<OscillationAnalysisResult> => {
  if (typeof Worker === 'undefined') {
    return Promise.resolve(calculateOscillationAnalysis({
      ...request,
      samplesByPmu: new Map(request.samplesByPmuEntries),
    }));
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./analysisWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<AnalysisWorkerResponse>) => {
      worker.terminate();
      if (event.data.status === 'ok') {
        resolve(event.data.result);
      } else {
        reject(new Error(event.data.error));
      }
    };
    worker.onerror = event => {
      worker.terminate();
      reject(new Error(event.message));
    };
    worker.postMessage(request);
  });
};
