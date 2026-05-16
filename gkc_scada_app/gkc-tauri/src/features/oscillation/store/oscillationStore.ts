import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { DEVICE_LIST, DEVICE_MAP, type GkcDevice } from '../../../data/deviceList.ts';
import { SAMPLING_RATE_HZ } from '../utils/bands.ts';
import { validatePmuSelection } from '../utils/oscillationMetrics.ts';
import { rawYtbsRowsToPmuSamples } from '../utils/pmuSamples.ts';
import { buildOscillationCsv, buildMarkdownReport } from '../utils/reportBuilder.ts';
import { fetchSequentialPmuRawData, type RangeRequest } from '../utils/sequentialQuery.ts';
import { runAnalysisInWorker } from '../utils/runAnalysisWorker.ts';
import type {
  OscillationAnalysisResult,
  OscillationQueryProgress,
  PmuFider,
  PmuSample,
  PmuSelectionMode,
  PmuSignalKey,
  SequentialPmuResult,
} from '../types/oscillationTypes.ts';

export type OscillationBandProfile = 'TR_INTERAREA' | 'GENERAL' | 'CUSTOM';
export type OscillationDetailsTab = 'summary' | 'signals' | 'modal' | 'data' | 'report';

interface OscillationStoreState {
  selectionMode: PmuSelectionMode;
  selectedPmuIds: string[];
  referencePmuId?: string;
  startTime: string;
  endTime: string;
  selectedSignals: PmuSignalKey[];
  selectedBandProfile: OscillationBandProfile;
  selectedBands: string[];
  windowSeconds: number;
  stepSeconds: number;
  rawSamples: PmuSample[];
  rawRowsByPmu: Record<string, Array<Record<string, unknown>>>;
  samplesByPmu: Record<string, PmuSample[]>;
  pmuQueryResults: SequentialPmuResult[];
  analysisResult: OscillationAnalysisResult | null;
  reportMarkdown: string;
  queryNotice: string | null;
  queryProgress: OscillationQueryProgress | null;
  loading: boolean;
  analyzing: boolean;
  error: string | null;
  activeTab: OscillationDetailsTab;
  setSelectionMode: (mode: PmuSelectionMode) => void;
  setSelectedPmuIds: (ids: string[]) => void;
  setReferencePmuId: (id?: string) => void;
  setDateRange: (start: string, end: string) => void;
  setSelectedSignals: (signals: PmuSignalKey[]) => void;
  setBandProfile: (profile: OscillationBandProfile) => void;
  setSelectedBands: (ids: string[]) => void;
  setWindowSeconds: (seconds: number) => void;
  setStepSeconds: (seconds: number) => void;
  setActiveTab: (tab: OscillationDetailsTab) => void;
  fetchPmuData: () => Promise<void>;
  runAnalysis: () => Promise<void>;
  clearAnalysis: () => void;
  exportCsv: () => void;
  generateReport: () => void;
}

const defaultEnd = new Date();
const defaultStart = new Date(defaultEnd.getTime() - 30 * 60 * 1000);
const toInputValue = (date: Date): string => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const PMU_FIDERS: PmuFider[] = DEVICE_LIST
  .filter(device => device.olcumModu === 'PMU')
  .map(device => ({
    id: device.id,
    name: `${device.tmAdi}, ${device.fiderAdi} (${device.id})`,
    substationName: device.tmAdi,
    voltageLevel: `${device.gerilim === 380 ? 400 : device.gerilim} kV`,
    bayName: device.fiderAdi,
    isPmu: true,
    source: 'YTBS_GKC',
  }));

const toPmuFider = (device: GkcDevice): PmuFider => ({
  id: device.id,
  name: `${device.tmAdi}, ${device.fiderAdi} (${device.id})`,
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

export const useOscillationStore = create<OscillationStoreState>((set, get) => ({
  selectionMode: 'single',
  selectedPmuIds: ['285'],
  referencePmuId: '285',
  startTime: toInputValue(defaultStart),
  endTime: toInputValue(defaultEnd),
  selectedSignals: ['frequency', 'voltage', 'activePower', 'reactivePower'],
  selectedBandProfile: 'TR_INTERAREA',
  selectedBands: ['B2'],
  windowSeconds: 120,
  stepSeconds: 30,
  rawSamples: [],
  rawRowsByPmu: {},
  samplesByPmu: {},
  pmuQueryResults: [],
  analysisResult: null,
  reportMarkdown: '',
  queryNotice: null,
  queryProgress: null,
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
      error: ids.length > 6 ? 'En fazla 6 PMU fideri seçilebilir.' : null,
    };
  }),
  setReferencePmuId: id => set({ referencePmuId: id }),
  setDateRange: (start, end) => set({ startTime: start, endTime: end, error: null }),
  setSelectedSignals: signals => set({ selectedSignals: signals.length ? signals : ['frequency'] }),
  setBandProfile: profile => set({
    selectedBandProfile: profile,
    selectedBands: profile === 'TR_INTERAREA'
      ? ['B2']
      : profile === 'GENERAL'
        ? ['B1', 'B2', 'B3', 'B4', 'B5']
        : get().selectedBands,
  }),
  setSelectedBands: ids => set({ selectedBands: ids }),
  setWindowSeconds: seconds => set({ windowSeconds: seconds }),
  setStepSeconds: seconds => set({ stepSeconds: seconds }),
  setActiveTab: tab => set({ activeTab: tab }),

  fetchPmuData: async () => {
    const state = get();
    const selectedPmuIds = unique(state.selectedPmuIds);
    const validation = validatePmuSelection(state.selectionMode, selectedPmuIds);
    if (!validation.valid) {
      set({ error: validation.message, loading: false });
      return;
    }

    const gerilimByPmuId = new Map(selectedPmuIds.map(pmuId => [pmuId, toYtbsGerilimParam(DEVICE_MAP.get(pmuId))]));
    set({
      loading: true,
      error: null,
      queryNotice: 'Gerçek YTBS PMU verileri sıralı olarak sorgulanıyor.',
      queryProgress: null,
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
        loading: false,
        queryProgress: null,
        queryNotice: noticeParts.join(' '),
        rawSamples: allSamples.sort((left, right) => left.timestampMs - right.timestampMs),
        rawRowsByPmu,
        samplesByPmu,
        pmuQueryResults: pmuResults,
        error: allSamples.length ? null : 'Gerçek YTBS sorgusunda analiz edilebilir PMU verisi bulunamadı.',
      });
    } catch (error) {
      set({
        loading: false,
        queryProgress: null,
        queryNotice: null,
        error: String(error),
      });
    }
  },

  runAnalysis: async () => {
    const state = get();
    if (!state.rawSamples.length) {
      set({ error: 'Analiz için önce gerçek YTBS PMU verisi çekilmelidir.' });
      return;
    }

    const pmuDevices = selectedDevices(state.selectedPmuIds);
    set({ analyzing: true, error: null });
    try {
      const result = await runAnalysisInWorker({
        selectionMode: state.selectionMode,
        samplesByPmuEntries: Object.entries(state.samplesByPmu),
        pmuDevices,
        referencePmuId: state.referencePmuId,
        startTime: state.startTime,
        endTime: state.endTime,
        selectedSignals: state.selectedSignals,
        selectedBandIds: state.selectedBands,
        samplingRateHz: SAMPLING_RATE_HZ,
        windowSeconds: state.windowSeconds,
        stepSeconds: state.stepSeconds,
      });

      set({
        analyzing: false,
        analysisResult: result,
        reportMarkdown: buildMarkdownReport(result, pmuDevices),
        activeTab: 'summary',
      });
    } catch (error) {
      set({ analyzing: false, error: `Analiz hesaplanamadı: ${String(error)}` });
    }
  },

  clearAnalysis: () => set({
    rawSamples: [],
    rawRowsByPmu: {},
    samplesByPmu: {},
    pmuQueryResults: [],
    analysisResult: null,
    reportMarkdown: '',
    queryNotice: null,
    queryProgress: null,
    error: null,
  }),

  exportCsv: () => {
    const samples = get().rawSamples;
    if (!samples.length) {
      set({ error: 'CSV için gerçek PMU verisi bulunamadı.' });
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
