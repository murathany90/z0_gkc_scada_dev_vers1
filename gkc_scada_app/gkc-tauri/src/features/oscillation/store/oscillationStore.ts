import { create } from 'zustand';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { DEVICE_LIST, DEVICE_MAP, type GkcDevice } from '../../../data/deviceList.ts';
import { DEFAULT_AMPLITUDE_THRESHOLDS, SAMPLING_RATE_HZ } from '../utils/bands.ts';
import { buildOscillationDemoSamples } from '../utils/demoSamples.ts';
import { validatePmuSelection } from '../utils/oscillationMetrics.ts';
import { rawYtbsRowsToPmuSamples } from '../utils/pmuSamples.ts';
import { buildOscillationCsv, buildMarkdownReport } from '../utils/reportBuilder.ts';
import { fetchSequentialPmuRawData, type RangeRequest } from '../utils/sequentialQuery.ts';
import { runAnalysisInWorker } from '../utils/runAnalysisWorker.ts';
import { normalizeSmoothingWindowSize } from '../utils/visualization.ts';
import type {
  OscillationAnalysisResult,
  OscillationAmplitudeThresholds,
  AnalysisProgress,
  OscillationSmoothingSettings,
  OscillationQueryProgress,
  PmuFider,
  PmuSample,
  PmuSelectionMode,
  RawSignalDisplayMode,
  PmuSignalKey,
  SequentialPmuResult,
} from '../types/oscillationTypes.ts';

export type OscillationDetailsTab = 'summary' | 'signals' | 'modal' | 'data' | 'report';
export type OscillationDataSourceMode = 'none' | 'ytbs' | 'demo';
export const OSCILLATION_SIGNAL_TABS: PmuSignalKey[] = ['frequency', 'voltage', 'activePower', 'reactivePower'];
export type RawSignalDisplayModeSignal = Extract<PmuSignalKey, 'frequency' | 'voltage'>;

export interface OscillationRawDataQuery {
  selectionMode: PmuSelectionMode;
  selectedPmuIds: string[];
  startTime: string;
  endTime: string;
}

export interface OscillationAnalysisQuery extends OscillationRawDataQuery {
  referencePmuId?: string;
  selectedSignals: PmuSignalKey[];
  amplitudeThresholds: OscillationAmplitudeThresholds;
  windowSeconds: number;
  stepSeconds: number;
}

interface OscillationStoreState {
  dataSourceMode: OscillationDataSourceMode;
  activeSignalTab: PmuSignalKey;
  smoothingSettings: OscillationSmoothingSettings;
  rawSignalDisplayModes: Record<RawSignalDisplayModeSignal, RawSignalDisplayMode>;
  selectionMode: PmuSelectionMode;
  selectedPmuIds: string[];
  referencePmuId?: string;
  startTime: string;
  endTime: string;
  selectedSignals: PmuSignalKey[];
  amplitudeThresholds: OscillationAmplitudeThresholds;
  windowSeconds: number;
  stepSeconds: number;
  rawSamples: PmuSample[];
  rawRowsByPmu: Record<string, Array<Record<string, unknown>>>;
  samplesByPmu: Record<string, PmuSample[]>;
  pmuQueryResults: SequentialPmuResult[];
  rawDataQuery: OscillationRawDataQuery | null;
  analysisQuery: OscillationAnalysisQuery | null;
  analysisResult: OscillationAnalysisResult | null;
  reportMarkdown: string;
  queryNotice: string | null;
  queryProgress: OscillationQueryProgress | null;
  analysisProgress: AnalysisProgress | null;
  isRawDataStale: boolean;
  loading: boolean;
  analyzing: boolean;
  error: string | null;
  activeTab: OscillationDetailsTab;
  setSelectionMode: (mode: PmuSelectionMode) => void;
  setSelectedPmuIds: (ids: string[]) => void;
  setReferencePmuId: (id?: string) => void;
  setDateRange: (start: string, end: string) => void;
  setSelectedSignals: (signals: PmuSignalKey[]) => void;
  setAmplitudeThreshold: (key: keyof OscillationAmplitudeThresholds, value: number) => void;
  setWindowSeconds: (seconds: number) => void;
  setStepSeconds: (seconds: number) => void;
  setActiveTab: (tab: OscillationDetailsTab) => void;
  setActiveSignalTab: (signal: PmuSignalKey) => void;
  setSmoothingEnabled: (enabled: boolean) => void;
  setSmoothingWindowSize: (windowSize: number) => void;
  setRawSignalDisplayMode: (signal: RawSignalDisplayModeSignal, mode: RawSignalDisplayMode) => void;
  loadDemoData: () => void;
  fetchPmuData: () => Promise<void>;
  runAnalysis: () => Promise<void>;
  clearAnalysis: () => void;
  clearRawData: () => void;
  exportCsv: () => void;
  generateReport: () => void;
}

const defaultEnd = new Date();
const defaultStart = new Date(defaultEnd.getTime() - 30 * 60 * 1000);
const SMOOTHING_STORAGE_KEY = 'gkc_oscillation_smoothing_settings';
const DEFAULT_SMOOTHING_SETTINGS: OscillationSmoothingSettings = {
  enabled: true,
  windowSize: 7,
};

const canUseLocalStorage = (): boolean => typeof localStorage !== 'undefined';

const readSmoothingSettings = (): OscillationSmoothingSettings => {
  if (!canUseLocalStorage()) return DEFAULT_SMOOTHING_SETTINGS;
  try {
    const raw = localStorage.getItem(SMOOTHING_STORAGE_KEY);
    if (!raw) return DEFAULT_SMOOTHING_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<OscillationSmoothingSettings>;
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SMOOTHING_SETTINGS.enabled,
      windowSize: normalizeSmoothingWindowSize(Number(parsed.windowSize ?? DEFAULT_SMOOTHING_SETTINGS.windowSize)),
    };
  } catch {
    return DEFAULT_SMOOTHING_SETTINGS;
  }
};

const persistSmoothingSettings = (settings: OscillationSmoothingSettings): void => {
  if (!canUseLocalStorage()) return;
  localStorage.setItem(SMOOTHING_STORAGE_KEY, JSON.stringify(settings));
};

const toInputValue = (date: Date): string => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const PMU_FIDERS: PmuFider[] = DEVICE_LIST
  .filter(device => device.olcumModu === 'PMU')
  .map(device => ({
    id: device.id,
    name: `${device.tmAdi}, ${device.fiderAdi}`,
    substationName: device.tmAdi,
    voltageLevel: `${device.gerilim === 380 ? 400 : device.gerilim} kV`,
    bayName: device.fiderAdi,
    isPmu: true,
    source: 'YTBS_GKC',
  }));

const toPmuFider = (device: GkcDevice): PmuFider => ({
  id: device.id,
  name: `${device.tmAdi}, ${device.fiderAdi}`,
  substationName: device.tmAdi,
  voltageLevel: `${device.gerilim === 380 ? 400 : device.gerilim} kV`,
  bayName: device.fiderAdi,
  isPmu: true,
  source: 'YTBS_GKC',
});

const toYtbsGerilimParam = (device: GkcDevice | undefined): string => {
  if (!device) return '';
  if (device.gerilim === 380 || device.gerilim === 400) return 'GERILIM_400KV';
  if (device.gerilim === 154) return 'GERILIM_154KV';
  if (device.gerilim === 33) return 'GERILIM_33KV';
  return '';
};

const unique = (ids: string[]): string[] => [...new Set(ids.filter(Boolean))];

const clearAnalysisFields = () => ({
  analysisResult: null,
  analysisQuery: null,
  reportMarkdown: '',
  analysisProgress: null,
  analyzing: false,
  error: null,
  activeTab: 'summary' as OscillationDetailsTab,
});

const clearRawDataFields = () => ({
  dataSourceMode: 'none' as OscillationDataSourceMode,
  rawSamples: [],
  rawRowsByPmu: {},
  samplesByPmu: {},
  pmuQueryResults: [],
  rawDataQuery: null,
  queryNotice: null,
  queryProgress: null,
  isRawDataStale: false,
});

const downloadTextFile = (content: string, fileName: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const selectedDevices = (ids: string[]): PmuFider[] =>
  ids
    .map(id => DEVICE_MAP.get(id))
    .filter((device): device is GkcDevice => device !== undefined && device.olcumModu === 'PMU')
    .map(toPmuFider);

const ensureDemoPmuIds = (mode: PmuSelectionMode, ids: string[]): string[] => {
  const availableIds = new Set(PMU_FIDERS.map(pmu => pmu.id));
  const selected = unique(ids).filter(id => availableIds.has(id));

  if (mode === 'single') {
    const first = selected.slice(0, 1);
    const fallback = PMU_FIDERS[0]?.id;
    return first.length ? first : fallback ? [fallback] : [];
  }

  const next = selected.slice(0, 6);
  PMU_FIDERS.forEach(pmu => {
    if (next.length < 2 && !next.includes(pmu.id)) {
      next.push(pmu.id);
    }
  });
  return next.slice(0, 6);
};

const buildRawDataQuery = (
  state: Pick<OscillationStoreState, 'selectionMode' | 'startTime' | 'endTime'>,
  selectedPmuIds: string[],
): OscillationRawDataQuery => ({
  selectionMode: state.selectionMode,
  selectedPmuIds: unique(selectedPmuIds).sort(),
  startTime: state.startTime,
  endTime: state.endTime,
});

const buildAnalysisQuery = (
  state: Pick<OscillationStoreState, 'referencePmuId' | 'selectedSignals' | 'amplitudeThresholds' | 'windowSeconds' | 'stepSeconds'>,
  rawDataQuery: OscillationRawDataQuery,
): OscillationAnalysisQuery => ({
  ...rawDataQuery,
  referencePmuId: state.referencePmuId,
  selectedSignals: [...state.selectedSignals].sort(),
  amplitudeThresholds: { ...state.amplitudeThresholds },
  windowSeconds: state.windowSeconds,
  stepSeconds: state.stepSeconds,
});

const stableJson = (value: unknown): string => JSON.stringify(value);

const sameRawDataQuery = (left: OscillationRawDataQuery | null, right: OscillationRawDataQuery | null): boolean =>
  Boolean(left && right && stableJson(left) === stableJson(right));

export const useOscillationStore = create<OscillationStoreState>((set, get) => ({
  dataSourceMode: 'none',
  activeSignalTab: 'frequency',
  smoothingSettings: readSmoothingSettings(),
  rawSignalDisplayModes: {
    frequency: 'value',
    voltage: 'value',
  },
  selectionMode: 'single',
  selectedPmuIds: ['285'],
  referencePmuId: '285',
  startTime: toInputValue(defaultStart),
  endTime: toInputValue(defaultEnd),
  selectedSignals: ['frequency', 'voltage', 'activePower', 'reactivePower'],
  amplitudeThresholds: DEFAULT_AMPLITUDE_THRESHOLDS,
  windowSeconds: 120,
  stepSeconds: 30,
  rawSamples: [],
  rawRowsByPmu: {},
  samplesByPmu: {},
  pmuQueryResults: [],
  rawDataQuery: null,
  analysisQuery: null,
  analysisResult: null,
  reportMarkdown: '',
  queryNotice: null,
  queryProgress: null,
  analysisProgress: null,
  isRawDataStale: false,
  loading: false,
  analyzing: false,
  error: null,
  activeTab: 'summary',

  setSelectionMode: mode => set(state => {
    const selectedPmuIds = mode === 'single'
      ? state.selectedPmuIds.slice(0, 1)
      : state.selectedPmuIds.slice(0, 6);
    return {
      selectionMode: mode,
      selectedPmuIds,
      referencePmuId: selectedPmuIds[0],
      ...clearRawDataFields(),
      ...clearAnalysisFields(),
      error: null,
    };
  }),
  setSelectedPmuIds: ids => set(state => {
    const selectedPmuIds = state.selectionMode === 'single'
      ? unique(ids).slice(0, 1)
      : unique(ids).slice(0, 6);
    return {
      selectedPmuIds,
      referencePmuId: selectedPmuIds.includes(state.referencePmuId ?? '')
        ? state.referencePmuId
        : selectedPmuIds[0],
      ...clearRawDataFields(),
      ...clearAnalysisFields(),
      error: ids.length > 6 ? 'En fazla 6 PMU fideri seçilebilir.' : null,
    };
  }),
  setReferencePmuId: id => set({ referencePmuId: id, ...clearAnalysisFields() }),
  setDateRange: (start, end) => set({
    startTime: start,
    endTime: end,
    ...clearRawDataFields(),
    ...clearAnalysisFields(),
    error: null,
  }),
  setSelectedSignals: signals => set({ selectedSignals: signals.length ? signals : ['frequency'], ...clearAnalysisFields() }),
  setAmplitudeThreshold: (key, value) => set(state => ({
    amplitudeThresholds: {
      ...state.amplitudeThresholds,
      [key]: Number.isFinite(value) ? Math.max(0, value) : state.amplitudeThresholds[key],
    },
    ...clearAnalysisFields(),
  })),
  setWindowSeconds: seconds => set({ windowSeconds: seconds, ...clearAnalysisFields() }),
  setStepSeconds: seconds => set({ stepSeconds: seconds, ...clearAnalysisFields() }),
  setActiveTab: tab => set({ activeTab: tab }),
  setActiveSignalTab: signal => set({
    activeSignalTab: OSCILLATION_SIGNAL_TABS.includes(signal) ? signal : 'frequency',
  }),
  setSmoothingEnabled: enabled => set(state => {
    const smoothingSettings = {
      ...state.smoothingSettings,
      enabled,
    };
    persistSmoothingSettings(smoothingSettings);
    return { smoothingSettings };
  }),
  setSmoothingWindowSize: windowSize => set(state => {
    const smoothingSettings = {
      ...state.smoothingSettings,
      windowSize: normalizeSmoothingWindowSize(windowSize),
    };
    persistSmoothingSettings(smoothingSettings);
    return { smoothingSettings };
  }),
  setRawSignalDisplayMode: (signal, mode) => set(state => ({
    rawSignalDisplayModes: {
      ...state.rawSignalDisplayModes,
      [signal]: mode === 'pu' ? 'pu' : 'value',
    },
  })),

  loadDemoData: () => {
    const state = get();
    const selectedPmuIds = ensureDemoPmuIds(state.selectionMode, state.selectedPmuIds);
    const validation = validatePmuSelection(state.selectionMode, selectedPmuIds);
    if (!validation.valid) {
      set({ error: validation.message, dataSourceMode: 'none' });
      return;
    }

    const pmuDevices = selectedDevices(selectedPmuIds);
    const seconds = 180;
    const startMs = Date.now() - seconds * 1000;
    const endMs = startMs + seconds * 1000;
    const startTime = toInputValue(new Date(startMs));
    const endTime = toInputValue(new Date(endMs));
    const rawDataQuery = buildRawDataQuery({
      selectionMode: state.selectionMode,
      startTime,
      endTime,
    }, selectedPmuIds);
    const samplesByPmu = buildOscillationDemoSamples(pmuDevices, startMs, seconds, SAMPLING_RATE_HZ);
    const allSamples = Object.values(samplesByPmu)
      .flat()
      .sort((left, right) => left.timestampMs - right.timestampMs);

    set({
      dataSourceMode: 'demo',
      selectedPmuIds,
      referencePmuId: selectedPmuIds.includes(state.referencePmuId ?? '')
        ? state.referencePmuId
        : selectedPmuIds[0],
      ...clearAnalysisFields(),
      startTime,
      endTime,
      rawSamples: allSamples,
      rawRowsByPmu: Object.fromEntries(selectedPmuIds.map(pmuId => [pmuId, []])),
      samplesByPmu,
      rawDataQuery,
      isRawDataStale: false,
      pmuQueryResults: selectedPmuIds.map(pmuId => ({
        pmuId,
        status: 'ok',
        rawRows: [],
        completedChunks: 1,
        totalChunks: 1,
      })),
      analysisResult: null,
      reportMarkdown: '',
      queryProgress: null,
      queryNotice: `Demo PMU verisi yüklendi: ${selectedPmuIds.length} PMU, ${allSamples.length} örnek, ${SAMPLING_RATE_HZ} Hz.`,
      loading: false,
      analyzing: false,
      error: null,
    });
  },

  fetchPmuData: async () => {
    const state = get();
    const selectedPmuIds = unique(state.selectedPmuIds);
    const validation = validatePmuSelection(state.selectionMode, selectedPmuIds);
    if (!validation.valid) {
      set({ error: validation.message, loading: false });
      return;
    }

    if (!isTauri()) {
      set({
        loading: false,
        error: null,
        queryProgress: null,
        queryNotice: 'Tarayıcı modunda gerçek YTBS PMU sorgusu için Tauri masaüstü ortamı gerekir. Demo verisi yükleyerek ekranı test edebilirsiniz.',
      });
      return;
    }

    const gerilimByPmuId = new Map(selectedPmuIds.map(pmuId => [pmuId, toYtbsGerilimParam(DEVICE_MAP.get(pmuId))]));
    const rawDataQuery = buildRawDataQuery(state, selectedPmuIds);
    set({
      dataSourceMode: 'none',
      loading: true,
      error: null,
      queryNotice: 'Gerçek YTBS PMU verileri sıralı olarak sorgulanıyor.',
      queryProgress: null,
      rawDataQuery: null,
      isRawDataStale: false,
      rawSamples: [],
      rawRowsByPmu: {},
      samplesByPmu: {},
      analysisResult: null,
      reportMarkdown: '',
    });

    try {
      const { pmuResults } = await fetchSequentialPmuRawData({
        pmuIds: selectedPmuIds,
        startIso: state.startTime,
        endIso: state.endTime,
        gerilimByPmuId,
        fazId: '',
        onProgress: progress => set({ queryProgress: progress }),
        invokeRange: async (request: RangeRequest) => invoke<string>('ytbs_query_range', { ...request }),
      });

      const latest = get();
      const latestRawDataQuery = buildRawDataQuery(latest, unique(latest.selectedPmuIds));
      if (!sameRawDataQuery(rawDataQuery, latestRawDataQuery)) {
        set({
          loading: false,
          queryProgress: null,
          queryNotice: 'Sorgu tamamlandı ancak filtreler değişti. Güncel filtrelerle yeniden sorgulayın.',
          error: null,
        });
        return;
      }

      const rawRowsByPmu: Record<string, Array<Record<string, unknown>>> = {};
      const samplesByPmu: Record<string, PmuSample[]> = {};
      const allSamples: PmuSample[] = [];
      selectedPmuIds.forEach(pmuId => {
        const device = DEVICE_MAP.get(pmuId);
        const pmu = device ? toPmuFider(device) : PMU_FIDERS.find(item => item.id === pmuId);
        const rawRows = pmuResults.find(result => result.pmuId === pmuId)?.rawRows ?? [];
        rawRowsByPmu[pmuId] = rawRows;
        samplesByPmu[pmuId] = pmu ? rawYtbsRowsToPmuSamples(rawRows, pmu) : [];
        allSamples.push(...samplesByPmu[pmuId]);
      });

      const emptyCount = pmuResults.filter(result => result.status === 'empty').length;
      const errorCount = pmuResults.filter(result => result.status === 'error').length;
      const noticeParts = [
        `${allSamples.length} gerçek PMU örneği alındı.`,
        emptyCount ? `${emptyCount} PMU boş veri döndürdü.` : null,
        errorCount ? `${errorCount} PMU parçasında hata oluştu.` : null,
      ].filter((part): part is string => Boolean(part));

      set({
        dataSourceMode: allSamples.length ? 'ytbs' : 'none',
        loading: false,
        queryProgress: null,
        rawDataQuery: allSamples.length ? rawDataQuery : null,
        isRawDataStale: false,
        queryNotice: noticeParts.join(' '),
        rawSamples: allSamples.sort((left, right) => left.timestampMs - right.timestampMs),
        rawRowsByPmu,
        samplesByPmu,
        pmuQueryResults: pmuResults,
        error: allSamples.length ? null : 'Gerçek YTBS sorgusunda analiz edilebilir PMU verisi bulunamadı.',
      });
    } catch (error) {
      set({
        dataSourceMode: 'none',
        loading: false,
        queryProgress: null,
        rawDataQuery: null,
        isRawDataStale: false,
        queryNotice: null,
        error: String(error),
      });
    }
  },

  runAnalysis: async () => {
    const state = get();
    if (!state.rawSamples.length) {
      set({ error: 'Analiz için önce PMU verisi yüklenmelidir.' });
      return;
    }

    const currentRawDataQuery = buildRawDataQuery(state, unique(state.selectedPmuIds));
    if (!sameRawDataQuery(state.rawDataQuery, currentRawDataQuery)) {
      set({
        isRawDataStale: true,
        error: 'Filtreler değiştiği için mevcut PMU verisi güncel değil. Lütfen veriyi yeniden getirin.',
      });
      return;
    }
    if (!state.rawDataQuery) {
      set({ error: 'Analiz için önce güncel PMU verisi yüklenmelidir.' });
      return;
    }

    const pmuDevices = selectedDevices(state.selectedPmuIds);
    const analysisQuery = buildAnalysisQuery(state, state.rawDataQuery);
    set({
      analyzing: true,
      analysisProgress: { stage: 'prepare', percent: 1, label: 'Analiz başlatılıyor' },
      error: null,
    });
    try {
      const result = await runAnalysisInWorker({
        selectionMode: state.selectionMode,
        samplesByPmuEntries: Object.entries(state.samplesByPmu),
        pmuDevices,
        referencePmuId: state.referencePmuId,
        startTime: state.startTime,
        endTime: state.endTime,
        selectedSignals: state.selectedSignals,
        amplitudeThresholds: state.amplitudeThresholds,
        samplingRateHz: SAMPLING_RATE_HZ,
        windowSeconds: state.windowSeconds,
        stepSeconds: state.stepSeconds,
      }, progress => set({ analysisProgress: progress }));

      set({
        analyzing: false,
        analysisProgress: { stage: 'complete', percent: 100, label: 'Analiz tamamlandı' },
        analysisResult: result,
        analysisQuery,
        reportMarkdown: buildMarkdownReport(result, pmuDevices),
        activeTab: 'summary',
      });
    } catch (error) {
      set({ analyzing: false, analysisProgress: null, error: `Analiz hesaplanamadı: ${String(error)}` });
    }
  },

  clearAnalysis: () => set({
    ...clearAnalysisFields(),
  }),

  clearRawData: () => set({
    loading: false,
    ...clearRawDataFields(),
    ...clearAnalysisFields(),
  }),

  exportCsv: () => {
    const samples = get().rawSamples;
    if (!samples.length) {
      set({ error: 'CSV için PMU verisi bulunamadı.' });
      return;
    }
    downloadTextFile(buildOscillationCsv(samples), `SALINIM_PMU_VERI_${Date.now()}.csv`, 'text/csv;charset=utf-8');
  },

  generateReport: () => {
    const state = get();
    const report = buildMarkdownReport(state.analysisResult, selectedDevices(state.selectedPmuIds));
    set({ reportMarkdown: report, activeTab: 'report' });
  },
}));
