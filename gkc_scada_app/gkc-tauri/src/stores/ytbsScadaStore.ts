import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { useLogStore } from './logStore';
import { useYtbsStore } from './ytbsStore';
import {
  SCADA_POINT_LIST,
  SCADA_QUERY_MEASUREMENT_POINTS,
  formatScadaElementLabel,
  formatScadaVoltageLevelLabel,
  normalizeScadaVoltageLevelValue,
  type ScadaMeasurementPoint,
  type ScadaSelectOption,
} from '../data/scadaPointList';
import {
  buildScadaQueryChunks,
  mergeScadaQuerySamples,
  type ScadaQueryChunk,
} from '../utils/scadaQueryChunks';

export interface YtbsScadaSample {
  zaman: string;
  deger: number;
}

interface YtbsScadaOptions {
  b1: ScadaSelectOption[];
  b2: ScadaSelectOption[];
  b3: ScadaSelectOption[];
  elements: ScadaSelectOption[];
}

interface YtbsScadaQueryResponse {
  title: string;
  unit: string;
  data: YtbsScadaSample[];
  raw_json: string;
}

type ScadaOptionsSource = 'local' | 'mixed';

interface YtbsScadaQueryProgress {
  totalChunks: number;
  completedChunks: number;
  currentChunk: number | null;
}

interface YtbsScadaStore {
  filters: {
    startTime: string;
    endTime: string;
    b1: string;
    b2: string;
    b3: string;
    scadaId: string;
  };
  options: YtbsScadaOptions;
  data: YtbsScadaSample[];
  rawJson: string;
  title: string;
  unit: string;
  optionsLoading: boolean;
  queryLoading: boolean;
  optionsError: string | null;
  queryError: string | null;
  queryNotice: string | null;
  queryProgress: YtbsScadaQueryProgress | null;
  optionsSource: ScadaOptionsSource;
  setFilter: (key: keyof YtbsScadaStore['filters'], value: string) => void;
  refreshOptions: (useRemote: boolean) => Promise<void>;
  queryRange: (startIso: string, endIso: string) => Promise<void>;
  clearData: () => void;
}

const oneHourAgo = () => new Date(Date.now() - 60 * 60 * 1000).toISOString().slice(0, 16);
const nowIsoMinute = () => new Date().toISOString().slice(0, 16);

const toOption = (value: string, label: string): ScadaSelectOption => ({ value, label });

const uniqueOptions = (
  points: ScadaMeasurementPoint[],
  valueOf: (point: ScadaMeasurementPoint) => string,
  labelOf: (point: ScadaMeasurementPoint) => string,
): ScadaSelectOption[] => {
  const options = new Map<string, ScadaSelectOption>();
  points.forEach(point => {
    const value = valueOf(point);
    if (value && !options.has(value)) {
      options.set(value, toOption(value, labelOf(point)));
    }
  });
  return Array.from(options.values()).sort((a, b) => a.label.localeCompare(b.label, 'tr'));
};

const buildLocalOptions = (filters: YtbsScadaStore['filters']): YtbsScadaOptions => {
  const queryPoints = SCADA_QUERY_MEASUREMENT_POINTS;
  const b2Points = filters.b1 ? queryPoints.filter(point => point.b1Id === filters.b1) : [];
  const b3Points = filters.b2 ? b2Points.filter(point => point.b2Id === filters.b2) : [];
  const elementPoints = filters.b3 ? b3Points.filter(point => point.b3Id === filters.b3) : [];

  return {
    b1: uniqueOptions(queryPoints, point => point.b1Id, point => point.b1Adi || point.b1Id),
    b2: uniqueOptions(b2Points, point => point.b2Id, point => formatScadaVoltageLevelLabel(point.b2Adi || point.b2Id)),
    b3: uniqueOptions(b3Points, point => point.b3Id, point => formatScadaVoltageLevelLabel(point.b3Adi || point.b3Id)),
    elements: uniqueOptions(elementPoints, point => point.id, formatScadaElementLabel),
  };
};

const mergeOptions = (
  localOptions: ScadaSelectOption[],
  remoteOptions: ScadaSelectOption[] | undefined,
  preferLocalLabel = false,
  labelFormatter: (label: string) => string = label => label,
  valueFormatter: (value: string) => string = value => value,
): ScadaSelectOption[] => {
  const merged = new Map<string, ScadaSelectOption>();
  localOptions.forEach(option => {
    const value = valueFormatter(option.value);
    merged.set(value, { value, label: labelFormatter(option.label) });
  });
  remoteOptions?.forEach(option => {
    if (!option.value) {
      return;
    }

    const value = valueFormatter(option.value);
    const local = merged.get(value);
    merged.set(value, {
      value,
      label: labelFormatter(preferLocalLabel && local ? local.label : option.label || local?.label || option.value),
    });
  });
  return Array.from(merged.values()).sort((a, b) => a.label.localeCompare(b.label, 'tr'));
};

const mergeOptionSets = (
  localOptions: YtbsScadaOptions,
  remoteOptions: Partial<YtbsScadaOptions>,
): YtbsScadaOptions => ({
  b1: mergeOptions(localOptions.b1, remoteOptions.b1),
  b2: mergeOptions(localOptions.b2, remoteOptions.b2, false, formatScadaVoltageLevelLabel, normalizeScadaVoltageLevelValue),
  b3: mergeOptions(localOptions.b3, remoteOptions.b3, false, formatScadaVoltageLevelLabel, normalizeScadaVoltageLevelValue),
  elements: mergeOptions(localOptions.elements, remoteOptions.elements),
});

const hasRemoteOptions = (options: Partial<YtbsScadaOptions>) =>
  Boolean(options.b1?.length || options.b2?.length || options.b3?.length || options.elements?.length);

const resetDependentFilters = (
  filters: YtbsScadaStore['filters'],
  key: keyof YtbsScadaStore['filters'],
  value: string,
) => {
  const next = { ...filters, [key]: value };
  if (key === 'b1') {
    next.b2 = '';
    next.b3 = '';
    next.scadaId = '';
  }
  if (key === 'b2') {
    next.b3 = '';
    next.scadaId = '';
  }
  if (key === 'b3') {
    next.scadaId = '';
  }
  return next;
};

const initialFilters: YtbsScadaStore['filters'] = {
  startTime: oneHourAgo(),
  endTime: nowIsoMinute(),
  b1: '',
  b2: '',
  b3: '',
  scadaId: '',
};

export const findScadaPointById = (id: string) =>
  SCADA_POINT_LIST.find(point => point.id === id) || null;

export const parseYtbsScadaTimestamp = (zaman: string): number => {
  const parts = zaman.split(/[. :]/).map(part => Number(part));
  if (parts.length < 5 || parts.some(part => Number.isNaN(part))) {
    return new Date(zaman).getTime();
  }

  const [day, month, year, hour, minute, second = 0, millisecond = 0] = parts;
  return new Date(year, month - 1, day, hour, minute, second, millisecond).getTime();
};

const syncYtbsStatusAfterScadaError = async (error: unknown): Promise<string> => {
  const message = String(error);
  try {
    await useYtbsStore.getState().checkStatus();
  } catch (_statusError) {
    // SCADA hatasının üstünü status kontrolüyle örtmeyelim.
  }

  const status = useYtbsStore.getState().status;
  if (
    status !== 'connected' &&
    (message.includes("YTBS'ye bağlı değil") ||
      message.includes('Oturum') ||
      message.includes('oturumu başlatılmamış'))
  ) {
    return 'YTBS oturumu aktif değil veya süresi dolmuş. Ayarlar sekmesinden yeniden bağlanın.';
  }

  return message;
};

export const useYtbsScadaStore = create<YtbsScadaStore>((set, get) => ({
  filters: initialFilters,
  options: buildLocalOptions(initialFilters),
  data: [],
  rawJson: '[]',
  title: 'Ölçüm',
  unit: '',
  optionsLoading: false,
  queryLoading: false,
  optionsError: null,
  queryError: null,
  queryNotice: null,
  queryProgress: null,
  optionsSource: 'local',

  setFilter: (key, value) => {
    set(state => {
      const normalizedValue = key === 'b2' || key === 'b3'
        ? normalizeScadaVoltageLevelValue(value)
        : value;
      const filters = resetDependentFilters(state.filters, key, normalizedValue);
      return {
        filters,
        options: buildLocalOptions(filters),
        data: key === 'startTime' || key === 'endTime' ? state.data : [],
        rawJson: key === 'startTime' || key === 'endTime' ? state.rawJson : '[]',
        queryError: null,
        queryNotice: null,
        queryProgress: null,
      };
    });
  },

  refreshOptions: async (useRemote) => {
    const { filters } = get();
    const localOptions = buildLocalOptions(filters);
    set({ options: localOptions, optionsSource: 'local' });

    if (!useRemote) {
      return;
    }

    set({ optionsLoading: true, optionsError: null });
    try {
      const remoteOptions = await invoke<YtbsScadaOptions>('ytbs_scada_options', {
        b1: filters.b1 || null,
        b2: filters.b2 || null,
        b3: filters.b3 || null,
      });
      set({
        options: mergeOptionSets(localOptions, remoteOptions),
        optionsLoading: false,
        optionsError: null,
        optionsSource: hasRemoteOptions(remoteOptions) ? 'mixed' : 'local',
      });
    } catch (error) {
      const message = await syncYtbsStatusAfterScadaError(error);
      set({
        options: localOptions,
        optionsLoading: false,
        optionsError: message,
        optionsSource: 'local',
      });
    }
  },

  queryRange: async (startTime, endTime) => {
    const { filters } = get();
    if (!filters.b1 || !filters.b2 || !filters.b3 || !filters.scadaId) {
      set({ queryError: 'B1, B2, B3 ve Element seçimleri zorunludur.' });
      return;
    }

    const queryChunks = buildScadaQueryChunks(startTime, endTime);
    if (queryChunks.status !== 'ok') {
      set({
        queryLoading: false,
        queryError: queryChunks.message,
        queryNotice: null,
        queryProgress: null,
      });
      return;
    }

    set({
      queryLoading: true,
      queryError: null,
      queryNotice: queryChunks.message,
      queryProgress: {
        totalChunks: queryChunks.chunks.length,
        completedChunks: 0,
        currentChunk: queryChunks.isChunked ? 1 : null,
      },
    });
    let activeChunk: ScadaQueryChunk | null = null;
    try {
      useLogStore.getState().addLog({
        type: 'INFO',
        message: 'YTBS SCADA sorgusu başlatılıyor...',
        endpoint: 'ytbs.teias.gov.tr',
      });

      const results: YtbsScadaQueryResponse[] = [];
      for (const chunk of queryChunks.chunks) {
        activeChunk = chunk;
        set({
          queryProgress: {
            totalChunks: queryChunks.chunks.length,
            completedChunks: chunk.index - 1,
            currentChunk: queryChunks.isChunked ? chunk.index : null,
          },
        });

        const chunkResult = await invoke<YtbsScadaQueryResponse>('ytbs_scada_query', {
          startTime: chunk.startYtbs,
          endTime: chunk.endYtbs,
          b1: filters.b1,
          b2: filters.b2,
          b3: filters.b3,
          scadaId: filters.scadaId,
        });
        results.push(chunkResult);
        set({
          queryProgress: {
            totalChunks: queryChunks.chunks.length,
            completedChunks: chunk.index,
            currentChunk: queryChunks.isChunked ? chunk.index : null,
          },
        });
      }

      const mergedData = mergeScadaQuerySamples(results.flatMap(result => result.data || []));
      const resultMeta = results.find(result => result.title || result.unit) || results[0];
      const result: YtbsScadaQueryResponse = {
        data: mergedData,
        raw_json: queryChunks.chunks.length === 1
          ? results[0]?.raw_json || JSON.stringify(mergedData)
          : JSON.stringify(mergedData),
        title: resultMeta?.title || '',
        unit: resultMeta?.unit || '',
      };

      set({
        data: result.data,
        rawJson: result.raw_json,
        title: result.title || 'Ölçüm',
        unit: result.unit || '',
        queryLoading: false,
        queryProgress: null,
      });
      useLogStore.getState().addLog({
        type: 'NETWORK',
        message: `YTBS SCADA sorgusu tamamlandı: ${result.data.length} veri noktası`,
        endpoint: 'ytbs.teias.gov.tr',
      });
    } catch (error) {
      const baseMessage = await syncYtbsStatusAfterScadaError(error);
      const message = activeChunk && queryChunks.isChunked
        ? `${activeChunk.index}/${queryChunks.chunks.length}. parca (${activeChunk.startYtbs} - ${activeChunk.endYtbs}) hatasi: ${baseMessage}`
        : baseMessage;
      set({
        queryError: message,
        queryLoading: false,
        queryProgress: null,
      });
      useLogStore.getState().addLog({
        type: 'ERROR',
        message: `YTBS SCADA sorgu hatası: ${message}`,
        endpoint: 'ytbs.teias.gov.tr',
      });
    }
  },

  clearData: () => set({ data: [], rawJson: '[]', queryError: null, queryNotice: null, queryProgress: null }),
}));
