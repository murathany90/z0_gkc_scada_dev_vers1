export const SCADA_QUERY_CHUNK_HOURS = 6;
export const SCADA_QUERY_MAX_HOURS = 24;
export const SCADA_QUERY_MAX_CHUNKS = 4;

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const SCADA_QUERY_CHUNK_MS = SCADA_QUERY_CHUNK_HOURS * MS_PER_HOUR;
const SCADA_QUERY_MAX_MS = SCADA_QUERY_MAX_HOURS * MS_PER_HOUR;

export interface ScadaQueryChunk {
  index: number;
  startIso: string;
  endIso: string;
  startYtbs: string;
  endYtbs: string;
  startTimestamp: number;
  endTimestamp: number;
}

export type ScadaQueryChunksResult =
  | {
    status: 'ok';
    chunks: ScadaQueryChunk[];
    totalMinutes: number;
    isChunked: boolean;
    message: string | null;
  }
  | {
    status: 'invalid' | 'too_long';
    chunks: [];
    totalMinutes: null;
    isChunked: false;
    message: string;
  };

export interface ScadaQuerySampleLike {
  zaman: string;
}

const pad2 = (value: number) => String(value).padStart(2, '0');

const toTimestamp = (iso: string): number | null => {
  const timestamp = new Date(iso).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const toInputIsoMinute = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

export const formatScadaQueryDateTime = (isoOrTimestamp: string | number): string => {
  const date = new Date(isoOrTimestamp);
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

export const parseScadaQuerySampleTimestamp = (zaman: string): number => {
  const parts = zaman.split(/[. :]/).map(part => Number(part));
  if (parts.length < 5 || parts.some(part => Number.isNaN(part))) {
    return new Date(zaman).getTime();
  }

  const [day, month, year, hour, minute, second = 0, millisecond = 0] = parts;
  return new Date(year, month - 1, day, hour, minute, second, millisecond).getTime();
};

export const buildScadaQueryChunks = (startIso: string, endIso: string): ScadaQueryChunksResult => {
  const startTimestamp = toTimestamp(startIso);
  const endTimestamp = toTimestamp(endIso);
  if (startTimestamp === null || endTimestamp === null) {
    return {
      status: 'invalid',
      chunks: [],
      totalMinutes: null,
      isChunked: false,
      message: 'Başlangıç ve bitiş zamanı geçerli olmalıdır.',
    };
  }

  const durationMs = endTimestamp - startTimestamp;
  if (durationMs <= 0) {
    return {
      status: 'invalid',
      chunks: [],
      totalMinutes: null,
      isChunked: false,
      message: 'Bitiş zamanı başlangıç zamanından sonra olmalıdır.',
    };
  }

  if (durationMs > SCADA_QUERY_MAX_MS) {
    return {
      status: 'too_long',
      chunks: [],
      totalMinutes: null,
      isChunked: false,
      message: 'SCADA ölçüm verileri için 24 saatten fazla sorgu yapılamaz.',
    };
  }

  const chunks: ScadaQueryChunk[] = [];
  let cursor = startTimestamp;
  while (cursor < endTimestamp && chunks.length < SCADA_QUERY_MAX_CHUNKS) {
    const chunkEnd = Math.min(cursor + SCADA_QUERY_CHUNK_MS, endTimestamp);
    chunks.push({
      index: chunks.length + 1,
      startIso: toInputIsoMinute(cursor),
      endIso: toInputIsoMinute(chunkEnd),
      startYtbs: formatScadaQueryDateTime(cursor),
      endYtbs: formatScadaQueryDateTime(chunkEnd),
      startTimestamp: cursor,
      endTimestamp: chunkEnd,
    });
    cursor = chunkEnd;
  }

  if (cursor < endTimestamp) {
    return {
      status: 'too_long',
      chunks: [],
      totalMinutes: null,
      isChunked: false,
      message: 'SCADA ölçüm verileri için 24 saatten fazla sorgu yapılamaz.',
    };
  }

  return {
    status: 'ok',
    chunks,
    totalMinutes: durationMs / MS_PER_MINUTE,
    isChunked: chunks.length > 1,
    message: chunks.length > 1
      ? `Seçilen aralık ${chunks.length} adet 6 saatlik parça halinde sorgulanacak.`
      : null,
  };
};

export const mergeScadaQuerySamples = <T extends ScadaQuerySampleLike>(samples: T[]): T[] => {
  const byTimestamp = new Map<number, T>();
  const untimedSamples: T[] = [];

  samples.forEach(sample => {
    const timestamp = parseScadaQuerySampleTimestamp(sample.zaman);
    if (!Number.isFinite(timestamp)) {
      untimedSamples.push(sample);
      return;
    }
    if (!byTimestamp.has(timestamp)) {
      byTimestamp.set(timestamp, sample);
    }
  });

  return [
    ...Array.from(byTimestamp.entries())
      .sort(([left], [right]) => left - right)
      .map(([, sample]) => sample),
    ...untimedSamples,
  ];
};
