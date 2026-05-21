import type {
  OscillationAnalysisResult,
  OscillationEvent,
  OscillationWindowMetric,
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
  pageKey: string;
  pmuId: string;
  pmuName: string;
  signal: PmuSignalKey;
  signalLabel: string;
  title: string;
  intervalStartMs: number;
  intervalEndMs: number;
  intervalLabel: string;
  unitLabel: string;
  thresholdLabel: string;
  chartSlots: typeof PRINT_REPORT_CHART_SLOTS;
  metrics: SignalBandMetric[];
  events: OscillationEvent[];
  windowMetrics: OscillationWindowMetric[];
}

const PRINT_INTERVAL_MS = 30 * 60 * 1000;
const FREQUENCY_RISK_AMPLITUDE_HZ = 0.020;
const DAMPING_RISK_LIMIT_PERCENT = 3;
const DR_NEGATIVE_COLOR = '#ef4444';
const DR_NON_NEGATIVE_COLOR = '#22c55e';

const SIGNAL_UNITS: Record<PmuSignalKey, string> = {
  frequency: 'Hz',
  voltage: 'kV',
  activePower: 'MW',
  reactivePower: 'MVAr',
};

const parseTimeMs = (value: string): number => {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const formatPrintTime = (timestampMs: number): string =>
  new Date(timestampMs).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const formatDecimal = (value: number | null | undefined, maximumFractionDigits = 3): string =>
  value === null || value === undefined || !Number.isFinite(value)
    ? '-'
    : value.toLocaleString('tr-TR', { maximumFractionDigits });

const thresholdLabelFor = (result: OscillationAnalysisResult, signal: PmuSignalKey): string => {
  const thresholds = result.query.amplitudeThresholds;
  switch (signal) {
    case 'frequency':
      return `${thresholds.frequencyMhz} mHz`;
    case 'voltage':
      return `%${thresholds.voltagePercent}`;
    case 'activePower':
      return `%${thresholds.activePowerPercent} ve en az 10 MW`;
    case 'reactivePower':
      return `%${thresholds.reactivePowerPercent} ve en az 5 MVAr`;
    default:
      return '-';
  }
};

const pmuNameFrom = (pmuDevices: PmuFider[], pmuId: string): string =>
  formatPmuDisplayName(pmuDevices.find(device => device.id === pmuId) ?? pmuId);

const rangesOverlap = (
  leftStartMs: number,
  leftEndMs: number,
  rightStartMs: number,
  rightEndMs: number,
): boolean =>
  Number.isFinite(leftStartMs)
  && Number.isFinite(leftEndMs)
  && Number.isFinite(rightStartMs)
  && Number.isFinite(rightEndMs)
  && leftStartMs < rightEndMs
  && leftEndMs > rightStartMs;

const buildIntervals = (result: OscillationAnalysisResult): Array<{ startMs: number; endMs: number }> => {
  let startMs = parseTimeMs(result.query.startTime);
  let endMs = parseTimeMs(result.query.endTime);

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    const candidates = [
      ...result.windowMetrics.flatMap(metric => [metric.windowStartMs, metric.windowEndMs]),
      ...result.events.flatMap(event => [event.startMs, event.endMs]),
    ].filter(Number.isFinite);
    startMs = Math.min(...candidates);
    endMs = Math.max(...candidates);
  }

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return [];
  }

  const intervals: Array<{ startMs: number; endMs: number }> = [];
  for (let cursor = startMs; cursor < endMs; cursor += PRINT_INTERVAL_MS) {
    intervals.push({ startMs: cursor, endMs: Math.min(cursor + PRINT_INTERVAL_MS, endMs) });
  }
  return intervals;
};

const selectedReportSignals = (result: OscillationAnalysisResult): PmuSignalKey[] => {
  const selected = result.query.selectedSignals.filter(signal => PRINT_REPORT_SIGNALS.includes(signal));
  return selected.length ? selected : PRINT_REPORT_SIGNALS;
};

const sectionWindowMetrics = (
  result: OscillationAnalysisResult,
  pmuId: string,
  signal: PmuSignalKey,
  intervalStartMs: number,
  intervalEndMs: number,
): OscillationWindowMetric[] =>
  result.windowMetrics.filter(metric =>
    metric.pmuId === pmuId
    && metric.signal === signal
    && rangesOverlap(metric.windowStartMs, metric.windowEndMs, intervalStartMs, intervalEndMs),
  );

export const buildPrintReportSections = (
  result: OscillationAnalysisResult,
  pmuDevices: PmuFider[],
): PrintReportSection[] => {
  const intervals = buildIntervals(result);
  const signals = selectedReportSignals(result);
  const sections: PrintReportSection[] = [];

  intervals.forEach(interval => {
    result.query.pmuIds.forEach(pmuId => {
      signals.forEach(signal => {
        const events = result.events.filter(event =>
          event.pmuId === pmuId
          && event.signal === signal
          && rangesOverlap(event.startMs, event.endMs, interval.startMs, interval.endMs),
        );
        if (!events.length) return;

        const pmuName = pmuNameFrom(pmuDevices, pmuId);
        const readableSignal = signalLabel(signal);
        const intervalLabel = `${formatPrintTime(interval.startMs)} - ${formatPrintTime(interval.endMs)}`;

        sections.push({
          pageKey: `${pmuId}-${signal}-${interval.startMs}`,
          pmuId,
          pmuName,
          signal,
          signalLabel: readableSignal,
          title: `${pmuName} · ${readableSignal} · ${intervalLabel}`,
          intervalStartMs: interval.startMs,
          intervalEndMs: interval.endMs,
          intervalLabel,
          unitLabel: SIGNAL_UNITS[signal],
          thresholdLabel: thresholdLabelFor(result, signal),
          chartSlots: PRINT_REPORT_CHART_SLOTS,
          metrics: result.metrics.filter(metric => metric.pmuId === pmuId && metric.signal === signal),
          events,
          windowMetrics: sectionWindowMetrics(result, pmuId, signal, interval.startMs, interval.endMs),
        });
      });
    });
  });

  return sections;
};

const eventWindowMetrics = (
  section: PrintReportSection,
  event: OscillationEvent,
): OscillationWindowMetric[] =>
  section.windowMetrics.filter(metric => rangesOverlap(metric.windowStartMs, metric.windowEndMs, event.startMs, event.endMs));

const maxEventAmplitude = (section: PrintReportSection, event: OscillationEvent): number | null => {
  const amplitudes = eventWindowMetrics(section, event)
    .map(metric => metric.amplitude)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  if (event.maxAmplitude !== null && Number.isFinite(event.maxAmplitude)) {
    amplitudes.push(event.maxAmplitude);
  }
  return amplitudes.length ? Math.max(...amplitudes) : null;
};

const maxEventThreshold = (section: PrintReportSection, event: OscillationEvent): number | null => {
  const thresholds = eventWindowMetrics(section, event)
    .map(metric => metric.thresholdValue)
    .filter(Number.isFinite);
  return thresholds.length ? Math.max(...thresholds) : null;
};

export const describePrintEventRisk = (
  section: PrintReportSection,
  event: OscillationEvent,
): 'kararsızlık riski bulunmaktadır' | 'küçük ölçekli salınım tespit edildi' => {
  const amplitude = maxEventAmplitude(section, event);
  const threshold = maxEventThreshold(section, event);
  const amplitudeRisk = section.signal === 'frequency'
    ? amplitude !== null && amplitude > FREQUENCY_RISK_AMPLITUDE_HZ
    : amplitude !== null && threshold !== null && amplitude > threshold;
  const dampingRisk = event.minDampingRatioPercent !== null
    && Number.isFinite(event.minDampingRatioPercent)
    && event.minDampingRatioPercent < DAMPING_RISK_LIMIT_PERCENT;

  return amplitudeRisk && dampingRisk
    ? 'kararsızlık riski bulunmaktadır'
    : 'küçük ölçekli salınım tespit edildi';
};

export const describePrintEvent = (section: PrintReportSection, event: OscillationEvent): string => {
  const band = event.bandId ? humanizeBand(event.bandId) : 'bant dışı';
  const frequencyText = Number.isFinite(event.dominantFrequencyHz)
    ? `${formatDecimal(event.dominantFrequencyHz, 3)} Hz`
    : '-';
  const durationText = event.durationSeconds >= 60
    ? `${formatDecimal(event.durationSeconds / 60, 1)} dk`
    : `${formatDecimal(event.durationSeconds, 0)} sn`;

  return `${section.pmuName} fiderinde ${section.signalLabel} ölçümünde ${formatPrintTime(event.startMs)} - ${formatPrintTime(event.endMs)} aralığında, süresi ${durationText} olan, frekansı ${frequencyText} ${band} salınım aday bulgusu rapora alınmıştır; ${describePrintEventRisk(section, event)}.`;
};

export const summarizePrintSection = (section: PrintReportSection): string => {
  if (!section.events.length) {
    return `${section.signalLabel} ölçümü için bu 30 dakikalık aralıkta rapora alınan salınım aday bulgusu yoktur.`;
  }

  const strongest = section.events
    .slice()
    .sort((left, right) => (right.maxEnergyRms ?? 0) - (left.maxEnergyRms ?? 0))[0];
  const band = strongest.bandId ? humanizeBand(strongest.bandId) : 'bant dışı';
  const frequencyText = Number.isFinite(strongest.dominantFrequencyHz)
    ? `${formatDecimal(strongest.dominantFrequencyHz, 3)} Hz`
    : '-';

  return `${section.pmuName} fiderinde ${section.intervalLabel} aralığında ${section.signalLabel} ölçümü için ${section.events.length} salınım aday bulgusu raporlandı. En baskın aday ${band} bandında ${frequencyText} frekansındadır.`;
};

export const buildPrintDampingScatterSeries = (
  metrics: OscillationWindowMetric[],
  signal: PmuSignalKey,
  pmuId: string,
) => ({
  id: `print-damping-${pmuId}-${signal}`,
  name: 'DR (%)',
  type: 'scatter' as const,
  yAxisIndex: 1,
  symbol: 'circle',
  symbolSize: 5,
  data: metrics
    .filter(metric =>
      metric.pmuId === pmuId
      && metric.signal === signal
      && metric.dampingRatioPercent !== null
      && Number.isFinite(metric.dampingRatioPercent),
    )
    .map(metric => {
      const damping = metric.dampingRatioPercent as number;
      return {
        value: [metric.timestampMs, damping],
        itemStyle: { color: damping < 0 ? DR_NEGATIVE_COLOR : DR_NON_NEGATIVE_COLOR },
      };
    }),
});
