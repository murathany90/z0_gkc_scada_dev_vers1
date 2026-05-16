import { isPmuMeasurement, parseYtbsTimestamp, type YtbsRawSample } from './ytbsPmu.ts';

export const PMU_QUERY_CHUNK_MINUTES = 30;
export const PMU_QUERY_MAX_HOURS = 4;
export const PMU_QUERY_MAX_CHUNKS = 8;

const MINUTE_MS = 60 * 1000;
const PMU_CHUNK_MS = PMU_QUERY_CHUNK_MINUTES * MINUTE_MS;
const PMU_MAX_MS = PMU_QUERY_MAX_HOURS * 60 * MINUTE_MS;

export interface YtbsQueryChunk {
  index: number;
  startIso: string;
  endIso: string;
  startYtbs: string;
  endYtbs: string;
  startTimestamp: number;
  endTimestamp: number;
}

export type YtbsQueryChunksResult =
  | {
    status: 'ok';
    chunks: YtbsQueryChunk[];
    isChunked: boolean;
    totalMinutes: number;
    message: string | null;
  }
  | {
    status: 'invalid' | 'too_long';
    chunks: [];
    isChunked: false;
    totalMinutes: null;
    message: string;
  };

const toTimestamp = (value: string): number => {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : NaN;
};

const toIsoLocal = (timestamp: number): string => {
  const date = new Date(timestamp);
  const pad = (value: number, size = 2) => String(value).padStart(size, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const formatYtbsQueryDateTime = (value: string | number): string => {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toChunk = (index: number, startTimestamp: number, endTimestamp: number): YtbsQueryChunk => ({
  index,
  startTimestamp,
  endTimestamp,
  startIso: toIsoLocal(startTimestamp),
  endIso: toIsoLocal(endTimestamp),
  startYtbs: formatYtbsQueryDateTime(startTimestamp),
  endYtbs: formatYtbsQueryDateTime(endTimestamp),
});

export const buildYtbsQueryChunks = ({
  measurementType,
  startIso,
  endIso,
}: {
  measurementType: string;
  startIso: string;
  endIso: string;
}): YtbsQueryChunksResult => {
  const startTimestamp = toTimestamp(startIso);
  const endTimestamp = toTimestamp(endIso);

  if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp) || endTimestamp <= startTimestamp) {
    return {
      status: 'invalid',
      chunks: [],
      isChunked: false,
      totalMinutes: null,
      message: 'Geçerli bir başlangıç ve bitiş zamanı seçin.',
    };
  }

  const durationMs = endTimestamp - startTimestamp;
  const totalMinutes = durationMs / MINUTE_MS;

  if (!isPmuMeasurement(measurementType)) {
    return {
      status: 'ok',
      chunks: [toChunk(1, startTimestamp, endTimestamp)],
      isChunked: false,
      totalMinutes,
      message: null,
    };
  }

  if (durationMs > PMU_MAX_MS) {
    return {
      status: 'too_long',
      chunks: [],
      isChunked: false,
      totalMinutes: null,
      message: 'PMU verileri için 4 saatten fazla sorgu yapılamaz.',
    };
  }

  const chunks: YtbsQueryChunk[] = [];
  let cursor = startTimestamp;
  while (cursor < endTimestamp && chunks.length < PMU_QUERY_MAX_CHUNKS) {
    const chunkEnd = Math.min(cursor + PMU_CHUNK_MS, endTimestamp);
    chunks.push(toChunk(chunks.length + 1, cursor, chunkEnd));
    cursor = chunkEnd;
  }

  if (cursor < endTimestamp) {
    return {
      status: 'too_long',
      chunks: [],
      isChunked: false,
      totalMinutes: null,
      message: 'PMU verileri için 4 saatten fazla sorgu yapılamaz.',
    };
  }

  return {
    status: 'ok',
    chunks,
    isChunked: chunks.length > 1,
    totalMinutes,
    message: chunks.length > 1
      ? `Seçilen PMU aralığı ${chunks.length} adet 30 dakikalık parça halinde sorgulanacak.`
      : null,
  };
};

export const mergeYtbsRawSamples = <T extends YtbsRawSample>(samples: T[]): T[] => {
  const byTimestamp = new Map<number, T>();

  samples.forEach(sample => {
    const timestamp = parseYtbsTimestamp(sample.zaman);
    if (Number.isFinite(timestamp) && !byTimestamp.has(timestamp)) {
      byTimestamp.set(timestamp, sample);
    }
  });

  return [...byTimestamp.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, sample]) => sample);
};

export const mergeYtbsTimestampedSamples = <T extends { timestamp: number }>(samples: T[]): T[] => {
  const byTimestamp = new Map<number, T>();

  samples.forEach(sample => {
    if (Number.isFinite(sample.timestamp) && !byTimestamp.has(sample.timestamp)) {
      byTimestamp.set(sample.timestamp, sample);
    }
  });

  return [...byTimestamp.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, sample]) => sample);
};
