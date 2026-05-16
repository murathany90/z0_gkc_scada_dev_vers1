import {
  buildYtbsQueryChunks,
  mergeYtbsRawSamples,
} from '../../../utils/ytbsQueryChunks.ts';
import type { YtbsRawSample } from '../../../utils/ytbsPmu.ts';
import type { OscillationQueryProgress, SequentialPmuResult } from '../types/oscillationTypes.ts';

export interface RangeRequest {
  deviceId: string;
  measurementType: 'PMU';
  startTime: string;
  endTime: string;
  gerilim: string;
  fazId: string;
}

export interface RangeResponse {
  data?: unknown[];
  raw_json?: string;
}

export type InvokeRange = (request: RangeRequest) => Promise<string | RangeResponse>;

const parseRangeResponse = (response: string | RangeResponse): RangeResponse => {
  if (typeof response === 'string') {
    return JSON.parse(response) as RangeResponse;
  }

  return response;
};

const parseRawRows = (rawJson: string | undefined): Array<Record<string, unknown>> => {
  if (!rawJson) return [];
  const parsed = JSON.parse(rawJson) as unknown;
  return Array.isArray(parsed)
    ? parsed.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    : [];
};

export const fetchSequentialPmuRawData = async ({
  pmuIds,
  startIso,
  endIso,
  gerilimByPmuId,
  fazId,
  invokeRange,
  onProgress,
}: {
  pmuIds: string[];
  startIso: string;
  endIso: string;
  gerilimByPmuId: Map<string, string>;
  fazId: string;
  invokeRange: InvokeRange;
  onProgress?: (progress: OscillationQueryProgress) => void;
}): Promise<{ pmuResults: SequentialPmuResult[] }> => {
  const chunkResult = buildYtbsQueryChunks({ measurementType: 'PMU', startIso, endIso });
  if (chunkResult.status !== 'ok') {
    throw new Error(chunkResult.message);
  }

  const totalChunks = pmuIds.length * chunkResult.chunks.length;
  let completedChunks = 0;
  const pmuResults: SequentialPmuResult[] = [];

  for (let pmuIndex = 0; pmuIndex < pmuIds.length; pmuIndex += 1) {
    const pmuId = pmuIds[pmuIndex];
    const rawRows: Array<Record<string, unknown>> = [];
    let status: SequentialPmuResult['status'] = 'ok';
    let error: string | undefined;

    for (const chunk of chunkResult.chunks) {
      onProgress?.({
        totalPmus: pmuIds.length,
        completedPmus: pmuIndex,
        currentPmuId: pmuId,
        totalChunks,
        completedChunks,
        currentChunk: chunk.index,
      });

      try {
        const response = parseRangeResponse(await invokeRange({
          deviceId: pmuId,
          measurementType: 'PMU',
          startTime: chunk.startYtbs,
          endTime: chunk.endYtbs,
          gerilim: gerilimByPmuId.get(pmuId) ?? '',
          fazId,
        }));
        rawRows.push(...parseRawRows(response.raw_json));
      } catch (err) {
        status = 'error';
        error = `${chunk.startYtbs} - ${chunk.endYtbs} parçası sorgulanamadı: ${String(err)}`;
        completedChunks += 1;
        break;
      }

      completedChunks += 1;
      onProgress?.({
        totalPmus: pmuIds.length,
        completedPmus: pmuIndex,
        currentPmuId: pmuId,
        totalChunks,
        completedChunks,
        currentChunk: chunk.index < chunkResult.chunks.length ? chunk.index + 1 : null,
      });
    }

    if (status !== 'error' && rawRows.length === 0) {
      status = 'empty';
    }

    pmuResults.push({
      pmuId,
      status,
      rawRows: mergeYtbsRawSamples(rawRows.filter((row): row is YtbsRawSample => typeof row.zaman === 'string')),
      error,
      completedChunks: status === 'error' ? Math.min(chunkResult.chunks.length, completedChunks) : chunkResult.chunks.length,
      totalChunks: chunkResult.chunks.length,
    });

    onProgress?.({
      totalPmus: pmuIds.length,
      completedPmus: pmuIndex + 1,
      currentPmuId: pmuIndex + 1 < pmuIds.length ? pmuIds[pmuIndex + 1] : null,
      totalChunks,
      completedChunks,
      currentChunk: null,
    });
  }

  return { pmuResults };
};
