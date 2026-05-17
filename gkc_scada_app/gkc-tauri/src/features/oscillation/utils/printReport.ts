import type {
  OscillationAnalysisResult,
  OscillationEvent,
  PmuFider,
  PmuSignalKey,
  SignalBandMetric,
} from '../types/oscillationTypes.ts';
import { humanizeBand, signalLabel } from './reportBuilder.ts';
import { formatPmuDisplayName } from './visualization.ts';

export const PRINT_REPORT_TITLE = 'Salınım Algılayıcı - PMU Modal Analiz ve Raporlama';

export const PRINT_REPORT_SIGNALS: PmuSignalKey[] = ['frequency', 'voltage', 'activePower', 'reactivePower'];

export const PRINT_REPORT_CHART_SLOTS = [
  { id: 'raw', title: 'Grafik 1 - Ham PMU Verisi ve Tespit Katmanı' },
  { id: 'modeDamping', title: 'Grafik 2 - Mod Tespiti ve Damping Ratio' },
  { id: 'energyAmplitude', title: 'Grafik 3 - Enerji ve Genlik İzleme' },
] as const;

export type PrintReportChartSlotId = typeof PRINT_REPORT_CHART_SLOTS[number]['id'];

export interface PrintReportSection {
  signal: PmuSignalKey;
  title: string;
  unitLabel: string;
  thresholdLabel: string;
  chartSlots: typeof PRINT_REPORT_CHART_SLOTS;
  metrics: SignalBandMetric[];
  events: OscillationEvent[];
  pmuNames: string[];
}

const SIGNAL_UNITS: Record<PmuSignalKey, string> = {
  frequency: 'Hz',
  voltage: 'kV',
  activePower: 'MW',
  reactivePower: 'MVAr',
};

const thresholdLabelFor = (result: OscillationAnalysisResult, signal: PmuSignalKey): string => {
  const thresholds = result.query.amplitudeThresholds;
  switch (signal) {
    case 'frequency':
      return `${thresholds.frequencyMhz} mHz`;
    case 'voltage':
      return `%${thresholds.voltagePercent}`;
    case 'activePower':
      return `%${thresholds.activePowerPercent}`;
    case 'reactivePower':
      return `%${thresholds.reactivePowerPercent}`;
    default:
      return '-';
  }
};

const pmuNameFrom = (pmuDevices: PmuFider[], pmuId: string): string =>
  formatPmuDisplayName(pmuDevices.find(device => device.id === pmuId) ?? pmuId);

export const buildPrintReportSections = (
  result: OscillationAnalysisResult,
  pmuDevices: PmuFider[],
): PrintReportSection[] =>
  PRINT_REPORT_SIGNALS.map(signal => {
    const metrics = result.metrics.filter(metric => metric.signal === signal);
    const events = result.events.filter(event => event.signal === signal);
    const pmuNames = [...new Set(
      (metrics.length ? metrics.map(metric => metric.pmuId) : result.query.pmuIds)
        .map(pmuId => pmuNameFrom(pmuDevices, pmuId)),
    )];

    return {
      signal,
      title: `${signalLabel(signal)} Metrikleri`,
      unitLabel: SIGNAL_UNITS[signal],
      thresholdLabel: thresholdLabelFor(result, signal),
      chartSlots: PRINT_REPORT_CHART_SLOTS,
      metrics,
      events,
      pmuNames,
    };
  });

export const summarizePrintSection = (section: PrintReportSection): string => {
  if (!section.events.length) {
    return `${section.title} için eşik üstü salınım olayı tespit edilmedi. ${humanizeBand('INTERAREA')} ve diğer aktif mod bantları izleme kapsamında kalır.`;
  }

  const criticalCount = section.events.filter(event => event.hasNegativeDamping).length;
  const strongest = section.events
    .slice()
    .sort((left, right) => (right.maxEnergyRms ?? 0) - (left.maxEnergyRms ?? 0))[0];
  const band = humanizeBand(strongest.bandId);
  const frequencyText = Number.isFinite(strongest.dominantFrequencyHz)
    ? `${Number(strongest.dominantFrequencyHz).toLocaleString('tr-TR', { maximumFractionDigits: 3 })} Hz`
    : '-';

  return `${section.title} için ${section.events.length} salınım olayı raporlandı. En baskın olay ${band} bandında ${frequencyText} frekansındadır. ${
    criticalCount
      ? `${criticalCount} olay negatif damping nedeniyle kritik izleme gerektirir.`
      : 'Negatif damping gözlenmedi; olaylar sönümlenme eğilimiyle izlenmelidir.'
  }`;
};
