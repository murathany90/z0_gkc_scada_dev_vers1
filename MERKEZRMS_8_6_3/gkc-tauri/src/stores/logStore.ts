// GKÇ İstemci - Log Yönetimi (Zustand)
import { create } from 'zustand';

export interface AppLog {
  id: string;
  timestamp: number;
  type: 'INFO' | 'WARN' | 'ERROR' | 'NETWORK';
  message: string;
  endpoint?: string;
  details?: string;
}

interface LogStore {
  logs: AppLog[];
  addLog: (log: Omit<AppLog, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  downloadCsv: () => void;
}

export const useLogStore = create<LogStore>((set, get) => ({
  logs: [],

  addLog: (log) => {
    const newLog: AppLog = {
      ...log,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };
    
    set((state) => ({
      logs: [newLog, ...state.logs].slice(0, 1000) // Sadece son 1000 logu tut
    }));
  },

  clearLogs: () => {
    set({ logs: [] });
  },

  downloadCsv: () => {
    const { logs } = get();
    if (logs.length === 0) return;

    const headers = ['Tarih/Saat', 'Tip', 'Endpoint', 'Mesaj', 'Detay'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => {
        const date = new Date(log.timestamp).toLocaleString('tr-TR');
        const type = log.type;
        const endpoint = log.endpoint || '-';
        // CSV formatı için mesajlardaki virgülleri ve tırnakları temizle
        const message = `"${log.message.replace(/"/g, '""')}"`;
        const details = log.details ? `"${log.details.replace(/"/g, '""')}"` : '-';
        return `${date},${type},${endpoint},${message},${details}`;
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `gkc_loglar_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}));
