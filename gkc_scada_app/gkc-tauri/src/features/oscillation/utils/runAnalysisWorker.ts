import { calculateOscillationAnalysis } from './oscillationMetrics.ts';
import type { AnalysisWorkerRequest, AnalysisWorkerResponse } from './analysisWorker.ts';
import type { AnalysisProgress, OscillationAnalysisResult } from '../types/oscillationTypes.ts';

export const runAnalysisInWorker = (
  request: AnalysisWorkerRequest,
  onProgress?: (progress: AnalysisProgress) => void,
): Promise<OscillationAnalysisResult> => {
  if (typeof Worker === 'undefined') {
    onProgress?.({ stage: 'prepare', percent: 8, label: 'Veri hazırlanıyor' });
    onProgress?.({ stage: 'quality', percent: 22, label: 'Veri kalitesi hesaplanıyor' });
    onProgress?.({ stage: 'bands', percent: 42, label: 'Bant metrikleri hesaplanıyor' });
    onProgress?.({ stage: 'windows', percent: 64, label: 'Kayan pencere analizi yapılıyor' });
    const result = calculateOscillationAnalysis({
      ...request,
      samplesByPmu: new Map(request.samplesByPmuEntries),
    });
    onProgress?.({ stage: 'modes', percent: 88, label: 'Ortak modlar ve olaylar yorumlanıyor' });
    onProgress?.({ stage: 'complete', percent: 100, label: 'Analiz tamamlandı' });
    return Promise.resolve(result);
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./analysisWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<AnalysisWorkerResponse>) => {
      if (event.data.status === 'progress') {
        onProgress?.(event.data.progress);
        return;
      }
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
