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

export const useYtbsStore = create<YtbsStore>((set, _get) => ({
  status: 'disconnected',
  dataSource: 'none',
  error: null,
  selectedDeviceId: localStorage.getItem('ytbs_device_id') || '',
  isLoading: false,
  ytbsData: [],
  ytbsRawData: [],
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
  setFilter: (key, value) => set(state => ({ filters: { ...state.filters, [key]: value } })),

  login: async (username: string, password: string, kanal: string) => {
    set({ isLoading: true, error: null });
    try {
      useLogStore.getState().addLog({
        type: 'INFO',
        message: 'YTBS giriş denemesi başlatılıyor...',
        endpoint: 'ytbs.teias.gov.tr',
      });

      const result = await invoke<string>('ytbs_login', { username, password, kanal });

      if (result.includes('SMS')) {
        set({ status: 'sms_required', isLoading: false });
        useLogStore.getState().addLog({
          type: 'INFO',
          message: 'YTBS giriş başarılı, SMS doğrulaması bekleniyor.',
          endpoint: 'ytbs.teias.gov.tr',
        });
      } else {
        set({ status: 'connected', isLoading: false });
        useLogStore.getState().addLog({
          type: 'NETWORK',
          message: 'YTBS bağlantısı başarılı.',
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
      const statusMap: Record<string, YtbsStatus> = {
        'Connected': 'connected',
        'SmsRequired': 'sms_required',
        'LoggingIn': 'logging_in',
        'SessionExpired': 'expired',
        'Disconnected': 'disconnected',
      };
      const sourceMap: Record<string, DataSourceType> = {
        'Primary': 'primary',
        'Ytbs': 'ytbs',
        'Mock': 'mock',
        'None': 'none',
      };
      set({
        status: statusMap[info.status] || 'disconnected',
        dataSource: sourceMap[info.data_source] || 'none',
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
    const queryChunks = buildYtbsQueryChunks({ measurementType, startIso: startTime, endIso: endTime });
    if (queryChunks.status !== 'ok') {
      set({
        error: queryChunks.message,
        ytbsQueryLoading: false,
        ytbsQueryNotice: null,
        ytbsQueryProgress: null,
        ytbsData: [],
        ytbsRawData: [],
      });
      return;
    }

    set({
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
      
      set({
        ytbsData: data,
        ytbsRawData: rawData,
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
    
    const now = new Date();
    const end = new Date(now.getTime() - 15 * 60 * 1000);
    const start = new Date(now.getTime() - 16 * 60 * 1000);
    
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    
    const startTimeStr = fmt(start);
    const endTimeStr = fmt(end);

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
        filters: { ...state.filters, cihaz: dev.id } // Taranan cihazı filtrede göster
      }));
      
      try {
        const result = await invoke<YtbsHealthCheckResponse>('ytbs_health_check', {
          deviceId: dev.id,
          measurementType: dev.olcumModu || measurementType,
          startTime: startTimeStr,
          endTime: endTimeStr,
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
    // Veri kaynağı değişikliğini dinle
    listen<string>('data-source-changed', (event) => {
      const sourceMap: Record<string, DataSourceType> = {
        'Primary': 'primary',
        'YTBS': 'ytbs',
        'Mock': 'mock',
        'None': 'none',
      };
      set({ dataSource: sourceMap[event.payload] || 'none' });
    });

    // YTBS oturum süresi dolma olayını dinle
    listen<string>('ytbs-session-expired', () => {
      set({ status: 'expired' });
      useLogStore.getState().addLog({
        type: 'WARN',
        message: 'YTBS oturum süresi doldu. Yeniden giriş gerekli.',
        endpoint: 'ytbs.teias.gov.tr',
      });
    });
  },
}));
