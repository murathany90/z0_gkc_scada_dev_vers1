import type { OscillationAmplitudeThresholds, OscillationBand, OscillationBandId } from '../types/oscillationTypes.ts';

export const MAX_RELIABLE_ANALYSIS_HZ = 4.5;
export const NYQUIST_HZ = 5;
export const SAMPLING_RATE_HZ = 10;

export const DEFAULT_AMPLITUDE_THRESHOLDS: OscillationAmplitudeThresholds = {
  frequencyMhz: 10,
  voltagePercent: 2,
  activePowerPercent: 2,
  reactivePowerPercent: 2,
};

export const OSCILLATION_BANDS: OscillationBand[] = [
  {
    id: 'INTERAREA',
    name: 'Interarea - Bölgeler Arası',
    fMin: 0.1,
    fMax: 0.4,
    enabled: true,
    primary: true,
    modeValue: 2,
    confidence: 'high',
    description: 'Bölgeler arası düşük frekanslı güç sistemi salınım bandı.',
  },
  {
    id: 'LOCAL',
    name: 'Local - Yerel',
    fMin: 0.4,
    fMax: 2,
    enabled: true,
    modeValue: 1,
    confidence: 'high',
    description: 'Yerel jeneratör, santral veya bölgesel elektromekanik salınım bandı.',
  },
  {
    id: 'FORCED',
    name: 'Forced - Zorlanmış',
    fMin: 2,
    fMax: 4.5,
    enabled: true,
    modeValue: 3,
    confidence: 'limited',
    description: 'Kontrol kaynaklı veya zorlanmış salınım aday bandı.',
  },
  {
    id: 'TORSION_PASSIVE',
    name: 'Torsiyon - Pasif',
    fMin: 4.5,
    fMax: NYQUIST_HZ,
    enabled: true,
    modeValue: 4,
    passive: true,
    confidence: 'not-supported',
    description: '10 Hz PMU verisinde Nyquist sınırına yakın pasif diagnostik bölge.',
  },
];

export const ACTIVE_OSCILLATION_BANDS = OSCILLATION_BANDS.filter(band => !band.passive);
export const TORSION_PASSIVE_BAND = OSCILLATION_BANDS.find(band => band.id === 'TORSION_PASSIVE');

export const getEnabledBands = (selectedBandIds: string[] = []): OscillationBand[] => {
  const selectedIds = new Set<OscillationBandId>(
    selectedBandIds.filter((id): id is OscillationBandId =>
      OSCILLATION_BANDS.some(band => band.id === id)
    )
  );
  const candidates = selectedIds.size
    ? OSCILLATION_BANDS.filter(band => selectedIds.has(band.id))
    : ACTIVE_OSCILLATION_BANDS;

  return candidates.filter(band => band.enabled && !band.passive && band.fMax <= MAX_RELIABLE_ANALYSIS_HZ);
};

export const allBandIds = (): OscillationBandId[] => OSCILLATION_BANDS.map(band => band.id);
