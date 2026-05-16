import type { OscillationBand } from '../types/oscillationTypes.ts';

export const MAX_RELIABLE_ANALYSIS_HZ = 4.5;
export const SAMPLING_RATE_HZ = 10;

export const OSCILLATION_BANDS: OscillationBand[] = [
  {
    id: 'B0',
    name: 'Çok Yavaş Trend / Salınım',
    fMin: 0.02,
    fMax: 0.05,
    enabled: true,
    confidence: 'low',
    description: 'Çok uzun periyotlu davranış ve trend ayrımı için kullanılır.',
  },
  {
    id: 'B1',
    name: 'Düşük Frekans Geniş Alan',
    fMin: 0.05,
    fMax: 0.1,
    enabled: true,
    confidence: 'medium',
    description: 'TR inter-area bandı altındaki yavaş geniş alan davranışları.',
  },
  {
    id: 'B2',
    name: 'TR Inter-area / SAS Gözlem Bandı',
    fMin: 0.1,
    fMax: 0.2,
    enabled: true,
    primary: true,
    confidence: 'high',
    description: 'Türkiye için SAS bağlamında kritik bölgeler arası salınım gözlem bandı; yalnızca modal raporlama için kullanılır.',
  },
  {
    id: 'B3',
    name: 'Genel Inter-area Elektromekanik',
    fMin: 0.2,
    fMax: 0.7,
    enabled: true,
    confidence: 'high',
    description: 'Dünya uygulamalarında inter-area elektromekanik modların geniş alt bandı.',
  },
  {
    id: 'B4',
    name: 'Lokal Elektromekanik',
    fMin: 0.7,
    fMax: 2,
    enabled: true,
    confidence: 'medium',
    description: 'Lokal jeneratör, santral veya bölgesel elektromekanik modlar.',
  },
  {
    id: 'B5',
    name: 'Kontrol / Forced Aday Bandı',
    fMin: 2,
    fMax: 4.5,
    enabled: true,
    confidence: 'limited',
    description: 'Kontrol kaynaklı veya forced aday yüksek frekanslı bileşenler; 10 Hz veri nedeniyle sınırlı güvenle yorumlanır.',
  },
  {
    id: 'B6',
    name: 'Nyquist Tampon Bölgesi',
    fMin: 4.5,
    fMax: 5,
    enabled: false,
    confidence: 'not-supported',
    description: '10 Hz veri için Nyquist sınırına yakın güvenilmez bölge. Analiz dışı.',
  },
  {
    id: 'B7',
    name: 'Torsiyonel Dinamik',
    fMin: 5,
    fMax: 14,
    enabled: false,
    confidence: 'not-supported',
    description: '10 örnek/saniye veriyle desteklenmez.',
  },
];

export const getEnabledBands = (selectedBandIds: string[] = []): OscillationBand[] => {
  const selected = selectedBandIds.length
    ? OSCILLATION_BANDS.filter(band => selectedBandIds.includes(band.id))
    : OSCILLATION_BANDS.filter(band => band.enabled);

  return selected.filter(band => band.enabled && band.fMax <= MAX_RELIABLE_ANALYSIS_HZ);
};

export const validateCustomBand = (fMin: number, fMax: number): { valid: boolean; message: string | null } => {
  if (!Number.isFinite(fMin) || !Number.isFinite(fMax) || fMin <= 0 || fMax <= fMin) {
    return { valid: false, message: 'Geçerli bir özel bant aralığı girin.' };
  }

  if (fMax > MAX_RELIABLE_ANALYSIS_HZ) {
    return { valid: false, message: '10 örnek/s veri ile 4.5 Hz üzeri güvenilir analiz desteklenmez.' };
  }

  return { valid: true, message: null };
};
