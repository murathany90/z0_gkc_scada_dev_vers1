// GKÇ İstemci - YTBS Yedek Kanal Store (Zustand)
// YTBS oturum yönetimi ve veri kaynağı durumu

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useLogStore } from './logStore';
import {
  buildYtbsQueryChunks,
  mergeYtbsRawSamples,
  mergeYtbsTimestampedSamples,
} from '../utils/ytbsQueryChunks';
import { DEVICE_MAP } from '../data/deviceList';
import {
  buildGkcHealthWindow,
  buildGkcQueryMeta,
  isGkcQueryMetaCurrent,
  type GkcQueryMeta,
} from '../utils/gkcHealth';

export type YtbsStatus = 'disconnected' | 'logging_in' | 'sms_required' | 'connected' | 'expired';
export type DataSourceType = 'primary' | 'ytbs' | 'mock' | 'none';
export type HealthStatusValue = 'ok' | 'fail' | 'scanning' | 'idle';

export interface HealthCheckState {
  status: HealthStatusValue;
  checkedAt?: number;
  validSampleCount?: number;
  reason?: string;
}

interface YtbsStatusInfo {
  status: string;
  data_source: string;
  message: string;
}

interface YtbsHealthCheckResponse {
  status: string;
  checked_at: number;
  valid_sample_count: number;
  reason: string;
}

interface YtbsStore {
  status: YtbsStatus;
  dataSource: DataSourceType;
  error: string | null;
  selectedDeviceId: string;
  isLoading: boolean;
  ytbsData: any[];          // YTBS sorgu sonuçları (RmsData)
  ytbsRawData: any[];          // YTBS'den gelen ham telemetri verileri (Parsed objects)
  ytbsQueryMeta: GkcQueryMeta | null;
  ytbsQueryLoading: boolean;
  ytbsQueryNotice: string | null;
  ytbsQueryProgress: { totalChunks: number; completedChunks: number; currentChunk: number | null } | null;
  healthStatus: Record<string, HealthCheckState>; // Fider sağlık durumu
  healthScanProgress: { current: number; total: number };
  isStopRequested: boolean;
  
  // Filtre State'leri (Merkezi)
  filters: {
    cihaz: string;
    olcumTipi: string;
    startTime: string;
    endTime: string;
    gerilim: string;
    faz: string;
  };
  setFilter: (key: string, value: string) => void;
  clearGkcData: () => void;

  login: (username: string, password: string, kanal: string) => Promise<void>;
  verifySms: (code: string) => Promise<void>;
  disconnect: () => Promise<void>;
  setDevice: (deviceId: string) => Promise<void>;
  checkStatus: () => Promise<void>;
  queryOnce: (deviceId: string) => Promise<string>;
  queryRange: (deviceId: string, measurementType: string, startTime: string, endTime: string, gerilim: string, fazId: string) => Promise<void>;
  scanAllHealth: (devices: any[], fazId?: string, measurementType?: string) => Promise<void>;
  stopHealthScan: () => void;
  startListening: () => void;
  
  // Auth States
  ytbsUsername: string;
  ytbsPassword: string;
  ytbsKanal: string;
  smsCode: string;
  setAuthState: (key: 'ytbsUsername' | 'ytbsPassword' | 'ytbsKanal' | 'smsCode', value: string) => void;
}

const normalizeHealthStatus = (status: unknown): HealthStatusValue => {
  return status === 'ok' || status === 'fail' || status === 'scanning' || status === 'idle'
    ? status
    : 'idle';
};

const toHealthState = (value: unknown): HealthCheckState => {
  if (typeof value === 'string') {
    return { status: normalizeHealthStatus(value) };
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return {
      status: normalizeHealthStatus(record.status),
      checkedAt: typeof record.checkedAt === 'number' ? record.checkedAt : typeof record.checked_at === 'number' ? record.checked_at : undefined,
      validSampleCount: typeof record.validSampleCount === 'number' ? record.validSampleCount : typeof record.valid_sample_count === 'number' ? record.valid_sample_count : undefined,
      reason: typeof record.reason === 'string' ? record.reason : undefined,
    };
  }

  return { status: 'idle' };
};

const loadHealthCache = (): Record<string, HealthCheckState> => {
  try {
    const parsed = JSON.parse(localStorage.getItem('ytbs_health_cache') || '{}') as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).map(([deviceId, value]) => [deviceId, toHealthState(value)]));
  } catch (_e) {
    return {};
  }
};

const saveHealthCache = (healthStatus: Record<string, HealthCheckState>) => {
  localStorage.setItem('ytbs_health_cache', JSON.stringify(healthStatus));
};

const mapYtbsStatus = (status: unknown): YtbsStatus => {
  const statusMap: Record<string, YtbsStatus> = {
    Connected: 'connected',
    SmsRequired: 'sms_required',
    LoggingIn: 'logging_in',
    SessionExpired: 'expired',
    Disconnected: 'disconnected',
  };
  return statusMap[String(status)] || 'disconnected';
};

const mapDataSource = (source: unknown): DataSourceType => {
  const sourceMap: Record<string, DataSourceType> = {
    Primary: 'primary',
    Ytbs: 'ytbs',
    Mock: 'mock',
    None: 'none',
  };
  return sourceMap[String(source)] || 'none';
};

const toYtbsGerilimParam = (gerilim: string | number): string => {
  const normalized = String(gerilim).trim();
  const map: Record<string, string> = {
    '380': 'GERILIM_400KV',
    '400': 'GERILIM_400KV',
    '154': 'GERILIM_154KV',
    '33': 'GERILIM_33KV',
  };

  return map[normalized] || '';
};

const toYtbsFazParam = (fazId: string): string => {
  if (fazId === '1' || fazId === 'Tek Faz') return '1';
  return '3';
};

const clearGkcDataFields = () => ({
  ytbsData: [],
  ytbsRawData: [],
  ytbsQueryMeta: null,
  ytbsQueryNotice: null,
  ytbsQueryProgress: null,
  error: null,
});

const isQueryAffectingFilter = (key: string): boolean =>
  key === 'cihaz'
  || key === 'olcumTipi'
  || key === 'startTime'
  || key === 'endTime'
  || key === 'gerilim'
  || key === 'faz';

export const useYtbsStore = create<YtbsStore>((set, _get) => ({
  status: 'disconnected',
  dataSource: 'none',
  error: null,
  selectedDeviceId: localStorage.getItem('ytbs_device_id') || '',
  isLoading: false,
  ytbsData: [],
  ytbsRawData: [],
  ytbsQueryMeta: null,
  ytbsQueryLoading: false,
  ytbsQueryNotice: null,
  ytbsQueryProgress: null,
  
  // Auth States
  ytbsUsername: localStorage.getItem('ytbs_username') || '',
  ytbsPassword: '',
  ytbsKanal: localStorage.getItem('ytbs_kanal') || 'VODAFONE_FAST',
  smsCode: '',

  setAuthState: (key, value) => {
    set(state => ({ ...state, [key]: value }));
    if (key === 'ytbsKanal') localStorage.setItem('ytbs_kanal', value);
    if (key === 'ytbsUsername') localStorage.setItem('ytbs_username', value);
  },
  healthStatus: loadHealthCache(),
  healthScanProgress: { current: 0, total: 0 },
  isStopRequested: false,
  filters: {
    cihaz: '',
    olcumTipi: 'PQ',
    startTime: new Date(new Date().getTime() - 60 * 60 * 1000).toISOString().slice(0, 16),
    endTime: new Date().toISOString().slice(0, 16),
    gerilim: '',
    faz: 'Üç Faz',
  },
  setFilter: (key, value) => set(state => {
    const currentValue = state.filters[key as keyof typeof state.filters];
    if (currentValue === value) return state;

    const filters = { ...state.filters, [key]: value };
    if (key === 'olcumTipi') {
      filters.olcumTipi = value;
      filters.cihaz = '';
    }
    if (key === 'gerilim') {
      const selectedDevice = DEVICE_MAP.get(filters.cihaz);
      if (selectedDevice && value && String(selectedDevice.gerilim) !== value) {
        filters.cihaz = '';
      }
    }

    return {
      filters,
      ...(isQueryAffectingFilter(key) ? clearGkcDataFields() : {}),
    };
  }),

  clearGkcData: () => set({
    ytbsQueryLoading: false,
    ...clearGkcDataFields(),
  }),

  login: async (username: string, password: string, kanal: string) => {
    set({ isLoading: true, error: null });
    try {
      useLogStore.getState().addLog({
        type: 'INFO',
        message: 'YTBS giriş denemesi başlatılıyor...',
        endpoint: 'ytbs.teias.gov.tr',
      });

      const result = await invoke<YtbsStatusInfo>('ytbs_login', { username, password, kanal });
      const nextStatus = mapYtbsStatus(result.status);

      if (nextStatus === 'sms_required') {
        set({ status: 'sms_required', dataSource: mapDataSource(result.data_source), isLoading: false });
        useLogStore.getState().addLog({
          type: 'INFO',
          message: 'YTBS giriş başarılı, SMS doğrulaması bekleniyor.',
          endpoint: 'ytbs.teias.gov.tr',
        });
      } else if (nextStatus === 'connected') {
        set({ status: 'connected', dataSource: mapDataSource(result.data_source), isLoading: false });
        useLogStore.getState().addLog({
          type: 'NETWORK',
          message: 'YTBS bağlantısı başarılı.',
          endpoint: 'ytbs.teias.gov.tr',
          details: result.message,
        });
      } else {
        set({ status: nextStatus, dataSource: mapDataSource(result.data_source), isLoading: false, error: result.message });
        useLogStore.getState().addLog({
          type: 'ERROR',
          message: `YTBS giriş beklenmeyen durum: ${result.message}`,
          endpoint: 'ytbs.teias.gov.tr',
        });
      }

      // Giriş bilgilerini kaydet
      localStorage.setItem('ytbs_username', username);
    } catch (e) {
      set({ error: String(e), isLoading: false, status: 'disconnected' });
      useLogStore.getState().addLog({
        type: 'ERROR',
        message: `YTBS giriş hatası: ${String(e)}`,
        endpoint: 'ytbs.teias.gov.tr',
      });
    }
  },

  verifySms: async (code: string) => {
    set({ isLoading: true, error: null });
    try {
      useLogStore.getState().addLog({
        type: 'INFO',
        message: 'SMS doğrulama kodu gönderiliyor...',
        endpoint: 'ytbs.teias.gov.tr',
      });

      await invoke<string>('ytbs_verify_sms', { code });

      set({ status: 'connected', isLoading: false });
      useLogStore.getState().addLog({
        type: 'NETWORK',
        message: 'SMS doğrulaması başarılı, YTBS bağlantısı aktif.',
        endpoint: 'ytbs.teias.gov.tr',
      });
    } catch (e) {
      set({ error: String(e), isLoading: false });
      useLogStore.getState().addLog({
        type: 'ERROR',
        message: `SMS doğrulama hatası: ${String(e)}`,
        endpoint: 'ytbs.teias.gov.tr',
      });
    }
  },

  disconnect: async () => {
    try {
      await invoke('ytbs_disconnect');
      set({ status: 'disconnected', dataSource: 'none', error: null });
      useLogStore.getState().addLog({
        type: 'INFO',
        message: 'YTBS bağlantısı kesildi.',
        endpoint: 'ytbs.teias.gov.tr',
      });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  setDevice: async (deviceId: string) => {
    try {
      await invoke('ytbs_set_device', { deviceId });
      set({ selectedDeviceId: deviceId });
      localStorage.setItem('ytbs_device_id', deviceId);
      useLogStore.getState().addLog({
        type: 'INFO',
        message: `Aktif cihaz değiştirildi: ${deviceId}`,
        endpoint: 'YTBS Cihaz',
      });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  checkStatus: async () => {
    try {
      const info = await invoke<YtbsStatusInfo>('ytbs_status');
      set({
        status: mapYtbsStatus(info.status),
        dataSource: mapDataSource(info.data_source),
      });
    } catch (_e) {
      // Sessiz hata
    }
  },

  queryOnce: async (deviceId: string) => {
    try {
      const result = await invoke<string>('ytbs_query_once', { deviceId });
      useLogStore.getState().addLog({
        type: 'NETWORK',
        message: `YTBS tek seferlik sorgu başarılı (Cihaz: ${deviceId})`,
        endpoint: 'ytbs.teias.gov.tr/YTBSAnaSayfa.jsf',
        details: result.substring(0, 200),
      });
      return result;
    } catch (e) {
      useLogStore.getState().addLog({
        type: 'ERROR',
        message: `YTBS sorgu hatası: ${String(e)}`,
        endpoint: 'ytbs.teias.gov.tr',
      });
      throw e;
    }
  },

  queryRange: async (deviceId: string, measurementType: string, startTime: string, endTime: string, gerilim: string, fazId: string) => {
    const queryMeta = buildGkcQueryMeta({ deviceId, measurementType, startTime, endTime, gerilim, fazId });
    const queryChunks = buildYtbsQueryChunks({ measurementType, startIso: startTime, endIso: endTime });
    if (queryChunks.status !== 'ok') {
      set({
        error: queryChunks.message,
        ytbsQueryLoading: false,
        ytbsQueryNotice: null,
        ytbsQueryProgress: null,
        ytbsQueryMeta: null,
        ytbsData: [],
        ytbsRawData: [],
      });
      return;
    }

    set({
      ...clearGkcDataFields(),
      ytbsQueryLoading: true,
      error: null,
      ytbsQueryNotice: queryChunks.message,
      ytbsQueryProgress: queryChunks.isChunked
        ? { totalChunks: queryChunks.chunks.length, completedChunks: 0, currentChunk: 1 }
        : null,
    });
    try {
      const allData: any[] = [];
      const allRawData: any[] = [];

      for (const chunk of queryChunks.chunks) {
        set(state => ({
          ytbsQueryProgress: queryChunks.isChunked
            ? {
              totalChunks: queryChunks.chunks.length,
              completedChunks: Math.max(0, chunk.index - 1),
              currentChunk: chunk.index,
            }
            : state.ytbsQueryProgress,
        }));

        let result: string;
        try {
          result = await invoke<string>('ytbs_query_range', {
            deviceId,
            measurementType,
            startTime: chunk.startYtbs,
            endTime: chunk.endYtbs,
            gerilim: toYtbsGerilimParam(gerilim),
            fazId: toYtbsFazParam(fazId),
          });
        } catch (error) {
          throw new Error(`${chunk.startYtbs} - ${chunk.endYtbs} parçası sorgulanamadı: ${String(error)}`);
        }

        const parsed = JSON.parse(result);
        allData.push(...(parsed.data || []));
        allRawData.push(...JSON.parse(parsed.raw_json || '[]'));

        set(state => ({
          ytbsQueryProgress: queryChunks.isChunked
            ? {
              totalChunks: queryChunks.chunks.length,
              completedChunks: chunk.index,
              currentChunk: chunk.index < queryChunks.chunks.length ? chunk.index + 1 : null,
            }
            : state.ytbsQueryProgress,
        }));
      }

      const data = mergeYtbsTimestampedSamples(allData);
      const rawData = mergeYtbsRawSamples(allRawData);

      if (!isGkcQueryMetaCurrent(queryMeta, _get().filters)) {
        set({
          ytbsData: [],
          ytbsRawData: [],
          ytbsQueryMeta: null,
          ytbsQueryLoading: false,
          ytbsQueryNotice: 'Sorgu tamamlandı ancak filtreler değişti. Güncel filtrelerle yeniden sorgulayın.',
          ytbsQueryProgress: null,
          error: null,
        });
        return;
      }
      
      set({
        ytbsData: data,
        ytbsRawData: rawData,
        ytbsQueryMeta: queryMeta,
        ytbsQueryLoading: false,
        ytbsQueryNotice: queryChunks.message,
        ytbsQueryProgress: null,
      });
      useLogStore.getState().addLog({
        type: 'NETWORK',
        message: `YTBS sorgu başarılı: ${data.length} veri noktası (Cihaz: ${deviceId}, ${startTime} - ${endTime})`,
        endpoint: 'ytbs.teias.gov.tr',
      });
    } catch (e) {
      set({
        error: String(e),
        ytbsQueryLoading: false,
        ytbsQueryNotice: null,
        ytbsQueryProgress: null,
        ytbsQueryMeta: null,
        ytbsData: [],
        ytbsRawData: [],
      });
      useLogStore.getState().addLog({
        type: 'ERROR',
        message: `YTBS sorgu hatası: ${String(e)}`,
        endpoint: 'ytbs.teias.gov.tr',
      });
    }
  },

  scanAllHealth: async (devices: any[], fazId: string = '', measurementType: string = 'PQ') => {
    set(state => {
      const nextHealthStatus = { ...state.healthStatus };
      devices.forEach(dev => {
        delete nextHealthStatus[dev.id];
      });

      return {
        isStopRequested: false,
        healthScanProgress: { current: 0, total: devices.length },
        healthStatus: nextHealthStatus,
      };
    });
    
    const healthWindow = buildGkcHealthWindow();

    for (let i = 0; i < devices.length; i++) {
      const dev = devices[i];
      if (_get().isStopRequested) {
        useLogStore.getState().addLog({ type: 'WARN', message: 'GKÇ Sağlık taraması kullanıcı tarafından durduruldu.', endpoint: 'ytbs' });
        break;
      }

      set(state => ({ 
        healthStatus: {
          ...state.healthStatus,
          [dev.id]: {
            status: 'scanning',
            checkedAt: Date.now(),
            reason: 'Sorgulanıyor',
          },
        },
        healthScanProgress: { ...state.healthScanProgress, current: i + 1 },
      }));
      
      try {
        const result = await invoke<YtbsHealthCheckResponse>('ytbs_health_check', {
          deviceId: dev.id,
          measurementType: dev.olcumModu || measurementType,
          startTime: healthWindow.startYtbs,
          endTime: healthWindow.endYtbs,
          gerilim: toYtbsGerilimParam(dev.gerilim),
          fazId: toYtbsFazParam(fazId),
        });
        
        const currentStatus = result.status === 'ok' ? 'ok' : 'fail';
        const healthState: HealthCheckState = {
          status: currentStatus,
          checkedAt: result.checked_at,
          validSampleCount: result.valid_sample_count,
          reason: result.reason,
        };
        set(state => ({ healthStatus: { ...state.healthStatus, [dev.id]: healthState } }));
        
        if (currentStatus === 'fail') {
          useLogStore.getState().addLog({
            type: 'WARN',
            message: `GKÇ Sağlık: ${dev.id} kırmızı — ${result.reason}`,
            endpoint: 'ytbs-health',
          });
        }
        
        // Ara ara kaydet (İlerleme kaybolmasın)
        if ((i + 1) % 5 === 0) {
          saveHealthCache(_get().healthStatus);
        }
      } catch (e) {
        set(state => ({
          healthStatus: {
            ...state.healthStatus,
            [dev.id]: {
              status: 'fail',
              checkedAt: Date.now(),
              validSampleCount: 0,
              reason: String(e),
            },
          },
        }));
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    saveHealthCache(_get().healthStatus);
    set({ healthScanProgress: { current: 0, total: 0 } });
  },

  stopHealthScan: () => {
    set({ isStopRequested: true });
  },

  startListening: () => {
    const tauriWindow = window as Window & { __TAURI_INTERNALS__?: unknown };
    if (!tauriWindow.__TAURI_INTERNALS__) {
      return;
    }

    // Veri kaynağı değişikliğini dinle
    void listen<string>('data-source-changed', (event) => {
      const sourceMap: Record<string, DataSourceType> = {
        'Primary': 'primary',
        'YTBS': 'ytbs',
        'Mock': 'mock',
        'None': 'none',
      };
      set({ dataSource: sourceMap[event.payload] || 'none' });
    }).catch((error) => {
      console.warn('YTBS veri kaynagi dinleyicisi baslatilamadi:', error);
    });

    // YTBS oturum süresi dolma olayını dinle
    void listen<string>('ytbs-session-expired', () => {
      set({ status: 'expired' });
      useLogStore.getState().addLog({
        type: 'WARN',
        message: 'YTBS oturum süresi doldu. Yeniden giriş gerekli.',
        endpoint: 'ytbs.teias.gov.tr',
      });
    }).catch((error) => {
      console.warn('YTBS oturum dinleyicisi baslatilamadi:', error);
    });
  },
}));
