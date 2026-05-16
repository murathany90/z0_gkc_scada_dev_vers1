// GKÇ İstemci - Zustand RMS Store
// Gerçek zamanlı RMS veri yönetimi

import { create } from 'zustand';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

export interface RmsData {
  timestamp: number;
  frekans: number;
  aktif_guc: number;
  reaktif_guc: number;
  gorunen_guc: number;
  guc_faktoru: number;
  frekans_sapma: number;
  df_dt: number;
  gerilim: { faz_a: number; faz_b: number; faz_c: number };
  akim: { faz_a: number; faz_b: number; faz_c: number };
}

interface RmsStore {
  data: RmsData[];
  latestData: RmsData | null;
  isMonitoring: boolean;
  error: string | null;
  maxSamples: number;
  startListening: () => void;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<void>;
  clearData: () => void;
}

import { useLogStore } from './logStore';

export const useRmsStore = create<RmsStore>((set, get) => ({
  data: [],
  latestData: null,
  isMonitoring: false,
  error: null,
  maxSamples: 1200, // 1 saatlik veri (3 sn aralıkla)

  startListening: () => {
    const tauriWindow = window as Window & { __TAURI_INTERNALS__?: unknown };
    if (!tauriWindow.__TAURI_INTERNALS__) {
      return;
    }

    // RMS veri olayını dinle
    void listen<RmsData>('rms-data', (event) => {
      const state = get();
      const newData = [...state.data, event.payload].slice(-state.maxSamples);
      set({
        data: newData,
        latestData: event.payload,
        error: null,
      });
    }).catch((error) => {
      console.warn('RMS veri dinleyicisi baslatilamadi:', error);
    });

    // Bağlantı hatası olayını dinle
    void listen<string>('connection-error', (event) => {
      set({ error: event.payload });
      useLogStore.getState().addLog({
        type: 'ERROR',
        message: `Bağlantı hatası: ${event.payload}`,
        endpoint: 'WebSocket/IPC',
      });
    }).catch((error) => {
      console.warn('Baglanti hata dinleyicisi baslatilamadi:', error);
    });
  },

  startMonitoring: async () => {
    try {
      useLogStore.getState().addLog({
        type: 'INFO',
        message: 'Veri izleme başlatılıyor...',
        endpoint: 'IPC: start_monitoring',
      });
      // Backend otomatik karar verecek: MerkezRMS → YTBS fallback
      await invoke('start_monitoring');
      set({ isMonitoring: true, error: null });
      useLogStore.getState().addLog({
        type: 'NETWORK',
        message: 'İzleme başlatıldı — veri kaynağı otomatik seçilecek.',
        endpoint: 'IPC: start_monitoring',
      });
    } catch (e) {
      set({ error: String(e) });
      useLogStore.getState().addLog({
        type: 'ERROR',
        message: `İzleme başlatılamadı: ${String(e)}`,
        endpoint: 'IPC: start_monitoring',
      });
    }
  },

  stopMonitoring: async () => {
    try {
      useLogStore.getState().addLog({
        type: 'INFO',
        message: 'Veri izleme durduruluyor...',
        endpoint: 'IPC: stop_monitoring',
      });
      await invoke('stop_monitoring');
      set({ isMonitoring: false });
      useLogStore.getState().addLog({
        type: 'INFO',
        message: 'Veri izleme durduruldu.',
      });
    } catch (e) {
      set({ error: String(e) });
      useLogStore.getState().addLog({
        type: 'ERROR',
        message: `İzleme durdurulamadı: ${String(e)}`,
        endpoint: 'IPC: stop_monitoring',
      });
    }
  },

  // Cihaz değiştiğinde veri temizle
  clearData: () => {
    set({ data: [], latestData: null, error: null });
  },
}));
