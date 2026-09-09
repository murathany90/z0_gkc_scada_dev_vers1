import { useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { EChartsType } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { buildOscillationBenchmarkResult, nearestPmuSampleInSorted, sasRawMatchToleranceMs, sortPmuSamplesByTimestamp } from '../benchmark/benchmarkEngine.ts';
import { SasImportError, importSasEventZip } from '../benchmark/sasEventImporter.ts';
import { resamplePmuToTenHz } from '../benchmark/resamplePmu.ts';
import { benchmarkTimeZoneLabel, formatBenchmarkTimestamp } from '../benchmark/benchmarkTime.ts';
import type { BenchmarkMode, BenchmarkTimeZone, OscillationBenchmarkResult, SasImportResult } from '../benchmark/sasTypes.ts';
import type { OscillationAmplitudeThresholds, OscillationAnalysisResult, PmuFider, PmuSample, PmuSignalKey } from '../types/oscillationTypes.ts';
import { runAnalysisInWorker } from '../utils/runAnalysisWorker.ts';
import { OscillationBenchmarkPrintReport, type BenchmarkPrintChartImages } from './OscillationBenchmarkPrintReport.tsx';
import { connectOscillationTimeChart, formatMetricNumber, paletteFor, type OscillationThemeMode } from './chartHelpers.ts';

const BENCHMARK_CHART_GROUP = 'oscillation-benchmark-time-axis';
type BenchmarkChartKey = 'frequency' | 'magnitude' | 'damping' | 'state';
const BENCHMARK_CHART_KEYS: BenchmarkChartKey[] = ['frequency', 'magnitude', 'damping', 'state'];

const BENCHMARK_COLORS = {
  gkc: '#22c55e',
  sas: '#38bdf8',
  sasAlgorithm: '#0ea5e9',
  threshold: '#f97316',
  difference: '#a78bfa',
  negative: '#ef4444',
} as const;

const formatSigned = (value: number | null, digits = 2): string => value === null || !Number.isFinite(value)
  ? '—'
  : `${value >= 0 ? '+' : ''}${Number(value).toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
const mhz = (value: number | null | undefined): number | null => Number.isFinite(value) ? Number(value) * 1000 : null;
const formatHz = (value: number | null | undefined, digits = 3): string => Number.isFinite(value)
  ? `${Number(value).toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits })} Hz`
  : '—';
const formatPercent = (value: number | null | undefined): string => Number.isFinite(value) ? `${formatMetricNumber(value, 2)}%` : '—';
const statusText: Record<OscillationBenchmarkResult['comparisons'][number]['status'], string> = {
  match: 'MATCH',
  'near-miss': 'NEAR-MISS',
  missed: 'MISSED',
  extra: 'EXTRA',
};
const statusColor: Record<OscillationBenchmarkResult['comparisons'][number]['status'], string> = {
  match: 'var(--accent-green)',
  'near-miss': 'var(--accent-orange)',
  missed: 'var(--accent-red)',
  extra: 'var(--accent-cyan)',
};

const stateSpans = (rows: SasImportResult['algoRows']) => rows.reduce<Array<{ state: string; start: number; end: number }>>((spans, row) => {
  const previous = spans[spans.length - 1];
  if (previous && previous.state === row.controlState) previous.end = row.timestampMs;
  else spans.push({ state: row.controlState, start: row.timestampMs, end: row.timestampMs });
  return spans;
}, []);

const robustAxisRange = (values: number[]): { min: number; max: number } => {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!sorted.length) return { min: -10, max: 10 };
  const low = sorted[Math.floor((sorted.length - 1) * 0.02)] ?? sorted[0];
  const high = sorted[Math.ceil((sorted.length - 1) * 0.98)] ?? sorted[sorted.length - 1];
  const padding = Math.max(1, (high - low) * 0.16);
  return { min: low - padding, max: high + padding };
};

const baseTimeOption = (themeMode: OscillationThemeMode, timeZone: BenchmarkTimeZone, unit: string) => {
  const palette = paletteFor(themeMode);
  return {
    animation: false,
    backgroundColor: 'transparent',
    legend: { top: 2, textStyle: { color: palette.muted, fontSize: 10 } },
    grid: { top: 34, left: 76, right: 24, bottom: 42 },
    tooltip: {
      trigger: 'axis', confine: true, backgroundColor: palette.tooltipBg, borderColor: palette.tooltipBorder,
      textStyle: { color: palette.text, fontSize: 11 },
      formatter: (params: unknown) => {
        const points = Array.isArray(params) ? params : [params];
        const first = points[0] as { value?: [number, number | string | null] } | undefined;
        if (!first?.value) return '';
        const rows = [`<strong>${formatBenchmarkTimestamp(Number(first.value[0]), timeZone, true)} (${benchmarkTimeZoneLabel(timeZone)})</strong>`];
        points.forEach(point => {
          const item = point as { marker?: string; seriesName?: string; value?: [number, number | string | null] };
          const value = item.value?.[1];
          rows.push(`<div>${item.marker ?? ''}${item.seriesName ?? ''}: <strong>${typeof value === 'number' ? Number(value).toLocaleString('tr-TR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : value ?? '—'}</strong></div>`);
        });
        return rows.join('');
      },
    },
    axisPointer: { link: [{ xAxisIndex: 'all' }] },
    dataZoom: [
      { type: 'inside', filterMode: 'none' },
      { type: 'slider', filterMode: 'none', bottom: 5, height: 15, borderColor: palette.tooltipBorder, textStyle: { color: palette.muted } },
    ],
    xAxis: {
      type: 'time', axisLine: { lineStyle: { color: palette.axisLine } }, axisTick: { show: false },
      axisLabel: { color: palette.muted, formatter: (value: number) => formatBenchmarkTimestamp(value, timeZone, false) }, splitLine: { show: false },
    },
    yAxis: { name: unit, nameGap: 46, type: 'value', axisLabel: { color: palette.muted, formatter: (value: number) => Number(value).toLocaleString('tr-TR', { maximumFractionDigits: 3 }) }, axisLine: { lineStyle: { color: palette.axisLine } }, splitLine: { lineStyle: { color: palette.splitLine } } },
  };
};

const gkcFrequencyWindows = (result: OscillationBenchmarkResult) => result.gkcAnalysis.windowMetrics.filter(metric =>
  metric.signal === 'frequency' && (!result.gkcPmuId || metric.pmuId === result.gkcPmuId),
);
const gkcEvents = (result: OscillationBenchmarkResult) => result.gkcAnalysis.events.filter(event =>
  event.signal === 'frequency' && event.bandId === 'INTERAREA' && !event.passiveTorsion && (!result.gkcPmuId || event.pmuId === result.gkcPmuId),
);
const activeAreas = (result: OscillationBenchmarkResult) => stateSpans(result.imported.algoRows)
  .filter(span => span.state === 'ACTIVE')
  .map(span => [{ xAxis: span.start, itemStyle: { color: 'rgba(239,68,68,0.12)' } }, { xAxis: span.end }]);

const frequencyChart = (result: OscillationBenchmarkResult, themeMode: OscillationThemeMode, timeZone: BenchmarkTimeZone) => {
  const sasToleranceMs = sasRawMatchToleranceMs(result.imported.pmuSamples);
  const gkcMinusSas = result.gkcInputSamples.map(sample => {
    const sas = nearestPmuSampleInSorted(result.imported.pmuSamples, sample.timestampMs, sasToleranceMs).sample;
    return Number.isFinite(sample.frequency) && Number.isFinite(sas?.frequency)
      ? [sample.timestampMs, (sample.frequency as number - (sas?.frequency as number)) * 1000] as [number, number]
      : null;
  }).filter((point): point is [number, number] => point !== null);
  const values = [
    ...result.imported.pmuSamples.map(sample => mhz((sample.frequency ?? NaN) - 50)),
    ...result.imported.algoRows.map(row => mhz((row.frequencyHz ?? NaN) - 50)),
    ...result.gkcInputSamples.map(sample => mhz((sample.frequency ?? NaN) - 50)),
    ...gkcMinusSas.map(([, value]) => value),
  ].filter((value): value is number => value !== null);
  const range = robustAxisRange(values);
  const base = baseTimeOption(themeMode, timeZone, 'mHz');
  return {
    ...base,
    yAxis: { ...base.yAxis, min: range.min, max: range.max },
    series: [
      { name: 'SAS PMU 50 Hz (50 Hz farkı)', type: 'line', showSymbol: false, lineStyle: { width: 1, color: BENCHMARK_COLORS.sas }, data: result.imported.pmuSamples.map(sample => [sample.timestampMs, mhz((sample.frequency ?? NaN) - 50)]) },
      { name: 'SAS algoritma frekansı (50 Hz farkı)', type: 'line', showSymbol: false, lineStyle: { width: 1, type: 'dashed', color: BENCHMARK_COLORS.sasAlgorithm }, data: result.imported.algoRows.map(row => [row.timestampMs, mhz((row.frequencyHz ?? NaN) - 50)]) },
      { name: result.mode === 'ytbs' ? 'GKÇ / YTBS PMU (50 Hz farkı)' : 'GKÇ FIR girişi 10 Hz (50 Hz farkı)', type: 'line', showSymbol: false, lineStyle: { width: 1.35, color: BENCHMARK_COLORS.gkc }, data: result.gkcInputSamples.map(sample => [sample.timestampMs, mhz((sample.frequency ?? NaN) - 50)]) },
      { name: 'GKÇ − SAS PMU 50 Hz', type: 'line', showSymbol: false, lineStyle: { width: 1.1, color: BENCHMARK_COLORS.difference }, data: gkcMinusSas },
    ],
  };
};

const magnitudeChart = (result: OscillationBenchmarkResult, themeMode: OscillationThemeMode, timeZone: BenchmarkTimeZone) => {
  const windows = gkcFrequencyWindows(result);
  const gkcThreshold = result.analysisConfig.amplitudeThresholds.frequencyMhz;
  return {
    ...baseTimeOption(themeMode, timeZone, 'mHz'),
    series: [
      { name: 'SAS genlik', type: 'line', showSymbol: false, lineStyle: { color: BENCHMARK_COLORS.sas }, data: result.imported.algoRows.map(row => [row.timestampMs, mhz(row.magnitudeHz)]) , markArea: { silent: true, data: activeAreas(result) } },
      { name: 'SAS eşik', type: 'line', showSymbol: false, lineStyle: { type: 'dashed', color: BENCHMARK_COLORS.threshold }, data: result.imported.algoRows.map(row => [row.timestampMs, mhz(row.startThresholdHz)]) },
      { name: 'GKÇ genlik', type: 'line', showSymbol: true, symbolSize: 4, lineStyle: { color: BENCHMARK_COLORS.gkc }, data: windows.map(metric => [metric.timestampMs, mhz(metric.amplitude)]) , markPoint: { symbolSize: 5, data: windows.filter(metric => (mhz(metric.amplitude) ?? 0) >= gkcThreshold).map(metric => ({ coord: [metric.timestampMs, mhz(metric.amplitude)] })) } },
      { name: `GKÇ eşik (${Number(gkcThreshold).toFixed(3)} mHz)`, type: 'line', showSymbol: false, lineStyle: { type: 'dashed', color: BENCHMARK_COLORS.threshold }, data: windows.map(metric => [metric.timestampMs, gkcThreshold]) },
    ],
  };
};

const dampingChart = (result: OscillationBenchmarkResult, themeMode: OscillationThemeMode, timeZone: BenchmarkTimeZone) => {
  const windows = gkcFrequencyWindows(result);
  return {
    ...baseTimeOption(themeMode, timeZone, 'DR (%)'),
    series: [
      { name: 'SAS DR', type: 'line', showSymbol: false, lineStyle: { color: BENCHMARK_COLORS.sas }, data: result.imported.algoRows.map(row => [row.timestampMs, row.dampingRatio === null ? null : row.dampingRatio * 100]), markLine: { silent: true, symbol: 'none', data: [{ yAxis: 0, lineStyle: { color: BENCHMARK_COLORS.negative, type: 'dashed' } }] } },
      { name: 'GKÇ pencere DR', type: 'line', showSymbol: true, symbolSize: 4, lineStyle: { color: BENCHMARK_COLORS.gkc }, data: windows.map(metric => [metric.timestampMs, metric.dampingRatioPercent]) },
    ],
  };
};

const stateChart = (result: OscillationBenchmarkResult, themeMode: OscillationThemeMode, timeZone: BenchmarkTimeZone) => {
  const palette = paletteFor(themeMode);
  const stateNumber: Record<string, number> = { IDLE: 0, INTERMEDIATE: 1, ACTIVE: 2 };
  return {
    ...baseTimeOption(themeMode, timeZone, 'State / ctrl'),
    yAxis: {
      type: 'value', min: -1.2, max: 2.2, interval: 1, name: 'state / ctrl', nameGap: 42,
      axisLabel: { color: palette.muted, formatter: (value: number) => ({ '-1': 'ctrl −1', '0': 'IDLE / ctrl 0', '1': 'INTERMEDIATE / ctrl +1', '2': 'ACTIVE' })[String(value)] ?? '' },
      axisLine: { lineStyle: { color: palette.axisLine } }, splitLine: { lineStyle: { color: palette.splitLine } },
    },
    series: [
      { name: 'SAS durum', type: 'line', step: 'end', showSymbol: false, lineStyle: { color: BENCHMARK_COLORS.sas, width: 2 }, data: result.imported.algoRows.map(row => [row.timestampMs, stateNumber[row.controlState] ?? null]) },
      { name: 'SAS kontrol çıktısı', type: 'line', step: 'end', showSymbol: false, lineStyle: { color: BENCHMARK_COLORS.threshold, width: 1.4 }, data: result.imported.algoRows.map(row => [row.timestampMs, row.controlValue]) },
      { name: 'GKÇ tespit penceresi', type: 'line', showSymbol: false, lineStyle: { opacity: 0 }, data: [], markArea: { silent: true, data: gkcEvents(result).map(event => [{ xAxis: event.startMs, itemStyle: { color: 'rgba(34,197,94,0.20)' } }, { xAxis: event.endMs }]) } },
    ],
  };
};

const severityAppearance = (severity: SasImportResult['quality']['findings'][number]['severity']) => severity === 'critical'
  ? { icon: '×', color: 'var(--accent-red)' }
  : severity === 'warning' ? { icon: '!', color: 'var(--accent-orange)' } : { icon: 'i', color: 'var(--accent-cyan)' };

const bandMetric = (result: OscillationBenchmarkResult) => result.gkcAnalysis.metrics
  .filter(metric => metric.pmuId === result.gkcPmuId && metric.signal === 'frequency' && metric.bandId === 'INTERAREA')
  .sort((left, right) => (right.spectralEnergy ?? -Infinity) - (left.spectralEnergy ?? -Infinity))[0];

const decisionText = (result: OscillationBenchmarkResult): string => {
  const band = bandMetric(result);
  const events = gkcEvents(result);
  const episodes = result.episodes.filter(episode => episode.sasEvents.length > 0);
  if (episodes.some(episode => episode.sasEvents.length > 1)) {
    return `SAS iki veya daha fazla kısa ACTIVE burst üretirken GKÇ ${episodes.find(episode => episode.sasEvents.length > 1)?.sasEvents.length} burstü tek GKÇ Tespit Penceresi içinde birleştirmiştir; bu, kayan pencere kapsamasıdır.`;
  }
  if (result.matchedCount > 0 && events.length) return `SAS ve GKÇ aynı zaman aralığında en az bir Interarea olayı için gerçek zaman örtüşmesi göstermiştir.`;
  if (band?.dominantFrequencyHz && !events.length) return `GKÇ ${formatMetricNumber(band.dominantFrequencyHz, 3)} Hz Interarea bileşenini görmüştür; mevcut ${formatMetricNumber(result.analysisConfig.amplitudeThresholds.frequencyMhz, 2)} mHz amplitude eşiği ile olay üretmemiştir.`;
  if (!result.coverage.covered && result.mode === 'ytbs') return 'SAS ve mevcut YTBS/GKÇ analizi ortak bir zaman aralığı paylaşmıyor; olay karşılaştırması fiziksel aynı veriyi kanıtlamaz.';
  return 'Yüklenen SAS kayıtları ve seçilen GKÇ analizi, mevcut eşleştirme kurallarıyla ortak bir Interarea olayı göstermemiştir.';
};

export function OscillationBenchmarkPanel({
  themeMode,
  amplitudeThresholds,
  windowSeconds,
  stepSeconds,
  samplingRateHz,
  selectedSignals,
  analysisResult,
  samplesByPmu,
  selectedPmuIds,
  referencePmuId,
}: {
  themeMode: OscillationThemeMode;
  amplitudeThresholds: OscillationAmplitudeThresholds;
  windowSeconds: number;
  stepSeconds: number;
  samplingRateHz: number;
  selectedSignals: PmuSignalKey[];
  analysisResult: OscillationAnalysisResult | null;
  samplesByPmu: Record<string, PmuSample[]>;
  selectedPmuIds: string[];
  referencePmuId?: string;
}) {
  const [imported, setImported] = useState<SasImportResult | null>(null);
  const [result, setResult] = useState<OscillationBenchmarkResult | null>(null);
  const [mode, setMode] = useState<BenchmarkMode>(() => analysisResult ? 'ytbs' : 'same-raw');
  const [timeZone, setTimeZone] = useState<BenchmarkTimeZone>('local');
  const [selectedPmuId, setSelectedPmuId] = useState<string | null>(referencePmuId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [expandedComparisonId, setExpandedComparisonId] = useState<string | null>(null);
  const [printChartImages, setPrintChartImages] = useState<BenchmarkPrintChartImages>({});
  const chartRefs = useRef<Partial<Record<BenchmarkChartKey, ReactECharts | null>>>({});
  const availablePmuIds = analysisResult?.query.pmuIds.filter(id => Boolean(samplesByPmu[id]?.length)) ?? selectedPmuIds.filter(id => Boolean(samplesByPmu[id]?.length));
  const effectivePmuId = selectedPmuId && availablePmuIds.includes(selectedPmuId) ? selectedPmuId : availablePmuIds[0] ?? referencePmuId;
  const analysisConfig = {
    samplingRateHz,
    windowSeconds,
    stepSeconds,
    amplitudeThresholds,
    selectedSignals,
    pmuId: effectivePmuId,
  };

  const chartOptions = useMemo(() => result ? {
    frequency: frequencyChart(result, themeMode, timeZone),
    magnitude: magnitudeChart(result, themeMode, timeZone),
    damping: dampingChart(result, themeMode, timeZone),
    state: stateChart(result, themeMode, timeZone),
  } : null, [result, themeMode, timeZone]);
  const sortedSasPmu = useMemo(() => result ? sortPmuSamplesByTimestamp(result.imported.pmuSamples) : [], [result]);
  const sortedGkcPmu = useMemo(() => result ? sortPmuSamplesByTimestamp(result.gkcInputSamples) : [], [result]);
  const gkcToleranceMs = result ? Math.max(1, 500 / Math.max(result.analysisConfig.samplingRateHz, 1)) : 50;

  const runBenchmark = async (source: SasImportResult, requestedMode: BenchmarkMode, requestedPmuId?: string | null): Promise<void> => {
    setLoading(true);
    setError(null);
    setExpandedComparisonId(null);
    try {
      const pmuId = requestedPmuId && availablePmuIds.includes(requestedPmuId) ? requestedPmuId : effectivePmuId;
      const config = { ...analysisConfig, pmuId };
      if (requestedMode === 'ytbs') {
        if (!analysisResult || !pmuId) throw new Error('Mevcut YTBS / GKÇ Analizi modu için önce Salınım Algılayıcıda gerçek PMU verisini çekip analizi çalıştırın.');
        const samples = samplesByPmu[pmuId] ?? [];
        if (!samples.length) throw new Error(`Seçili ${pmuId} PMU’su için canlı analiz örneği bulunamadı.`);
        setProgress('Mevcut YTBS/GKÇ analiz sonucu SAS olaylarıyla zaman üzerinden eşleştiriliyor…');
        setResult(buildOscillationBenchmarkResult({ imported: source, resample: null, gkcAnalysis: analysisResult, gkcInputSamples: samples, mode: requestedMode, analysisConfig: config }));
      } else {
        setProgress(`SAS 50 Hz PMU verisi anti-alias FIR ile ${formatMetricNumber(samplingRateHz, 1)} Hz’e indirgeniyor…`);
        const resample = resamplePmuToTenHz(source.pmuSamples, samplingRateHz);
        const samples = resample.samples;
        const pmu: PmuFider = { id: 'SAS-PMU', name: 'SAS Benchmark PMU', substationName: 'Harici SAS arşivi', isPmu: true };
        setProgress('Aynı GKÇ analiz worker’ı gerçek store ayarlarıyla çalışıyor…');
        const gkcAnalysis = await runAnalysisInWorker({
          selectionMode: 'single', samplesByPmuEntries: [[pmu.id, samples]], pmuDevices: [pmu], referencePmuId: pmu.id,
          startTime: new Date(samples[0].timestampMs).toISOString(), endTime: new Date(samples[samples.length - 1]?.timestampMs ?? samples[0].timestampMs).toISOString(),
          selectedSignals, amplitudeThresholds, samplingRateHz, windowSeconds, stepSeconds,
        }, workerProgress => setProgress(workerProgress.label));
        setResult(buildOscillationBenchmarkResult({ imported: source, resample, gkcAnalysis, gkcInputSamples: samples, mode: requestedMode, analysisConfig: { ...config, pmuId: pmu.id } }));
      }
      setMode(requestedMode);
      setProgress(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setProgress('SAS arşivi güvenlik sınırları, ZIP-slip ve CSV şeması için doğrulanıyor…');
    try {
      const parsed = importSasEventZip(new Uint8Array(await file.arrayBuffer()), file.name);
      setImported(parsed);
      setLoading(false);
      await runBenchmark(parsed, mode);
    } catch (caught) {
      const message = caught instanceof SasImportError ? `${caught.code}: ${caught.message}` : caught instanceof Error ? caught.message : String(caught);
      setError(message);
      setLoading(false);
      setProgress(null);
    }
  };

  const chartReady = (chart: EChartsType): void => connectOscillationTimeChart(chart, BENCHMARK_CHART_GROUP);
  const bindChartRef = (key: BenchmarkChartKey) => (chart: ReactECharts | null): void => {
    chartRefs.current[key] = chart;
  };
  const handleBenchmarkPrint = (): void => {
    const images = BENCHMARK_CHART_KEYS.reduce<BenchmarkPrintChartImages>((captured, key) => {
      try {
        const chart = chartRefs.current[key]?.getEchartsInstance();
        const image = chart?.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' });
        if (image) captured[key] = image;
      } catch {
        // A complete set of snapshots is required before opening the print dialog.
      }
      return captured;
    }, {});
    if (Object.keys(images).length !== BENCHMARK_CHART_KEYS.length) {
      setError('Grafikler henüz PDF için hazır değil. Birkaç saniye sonra tekrar deneyin.');
      return;
    }
    setError(null);
    flushSync(() => setPrintChartImages(images));
    document.body.classList.add('printing-oscillation-benchmark');
    const cleanup = () => document.body.classList.remove('printing-oscillation-benchmark');
    window.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(() => window.print(), 180);
  };
  const primaryEvent = result
    ? result.comparisons.find(comparison => comparison.status === 'match')?.gkcEvent ?? gkcEvents(result)[0]
    : null;
  const primarySas = result?.imported.externalEvents[0] ?? null;
  const currentBandMetric = result ? bandMetric(result) : undefined;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="benchmark-toolbar">
        <label className="btn btn-primary" style={{ cursor: loading ? 'wait' : 'pointer' }}>
          {loading ? 'Benchmark işleniyor…' : 'SAS Event ZIP yükle'}
          <input type="file" accept=".zip,application/zip" style={{ display: 'none' }} disabled={loading} onChange={event => { void handleArchive(event.target.files?.[0]); event.currentTarget.value = ''; }} />
        </label>
        <div className="benchmark-mode-toggle" aria-label="Benchmark karşılaştırma modu">
          <button title="SAS 50 Hz PMU verisini FIR ile 10 Hz'e indirip GKÇ worker'ında yeniden analiz eder." className={`btn ${mode === 'same-raw' ? 'btn-primary' : 'btn-outline'}`} disabled={!imported || loading} onClick={() => imported && void runBenchmark(imported, 'same-raw')}>Aynı Ham Veri</button>
          <button title="Yüklü gerçek YTBS/GKÇ analizini yeniden çalıştırmadan SAS olaylarıyla eşleştirir." className={`btn ${mode === 'ytbs' ? 'btn-primary' : 'btn-outline'}`} disabled={!imported || loading} onClick={() => imported && void runBenchmark(imported, 'ytbs')}>Mevcut YTBS / GKÇ Analizi</button>
        </div>
        <div className="benchmark-mode-toggle" aria-label="Zaman standardı">
          <button className={`btn ${timeZone === 'local' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTimeZone('local')}>Yerel</button>
          <button className={`btn ${timeZone === 'utc' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTimeZone('utc')}>UTC</button>
        </div>
        {mode === 'ytbs' && availablePmuIds.length > 0 && <select className="form-control" value={effectivePmuId ?? ''} onChange={event => { setSelectedPmuId(event.target.value); if (imported) void runBenchmark(imported, 'ytbs', event.target.value); }}><option value="" disabled>PMU seçin</option>{availablePmuIds.map(id => <option key={id} value={id}>{id}</option>)}</select>}
        {result && <button className="btn btn-outline" onClick={handleBenchmarkPrint}>Benchmark PDF raporu</button>}
      </div>
      <div className="benchmark-context-line">Zaman: <strong>{benchmarkTimeZoneLabel(timeZone)}</strong> · ZIP yalnızca yerelde işlenir.</div>
      {progress && <div style={{ fontSize: 12, color: 'var(--accent-cyan)' }}>{progress}</div>}
      {error && <div style={{ border: '1px solid var(--accent-red)', borderRadius: 6, padding: 10, color: 'var(--accent-red)', fontSize: 12 }}>{error}</div>}
      {!result && !loading && !error && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>algo.csv, pmu.csv, merkez_analysis.csv ve merkez_measurement.csv içeren SAS olay ZIP’ini yükleyin.</div>}
      {result && (
        <>
          <div className="benchmark-decision-card"><strong>Kısa sonuç</strong><span>{decisionText(result)}</span></div>
          {result.mode === 'ytbs' && !result.coverage.covered && <div className="benchmark-coverage-warning">Uyarı: SAS zamanı ile mevcut YTBS/GKÇ sorgusu örtüşmüyor; doğrudan fiziksel veri kıyası yapılamaz.</div>}
          <div className="benchmark-kpi-grid">
            <section className="card benchmark-kpi-card"><div className="card-body"><div className="benchmark-card-label">Kaynak</div><strong className="benchmark-file-name" title={result.imported.archiveName}>{result.imported.archiveName}</strong><small>{result.mode === 'same-raw' ? 'SAS 50 Hz → FIR → GKÇ 10 Hz' : `YTBS / GKÇ PMU: ${result.gkcPmuId ?? '—'}`}</small></div></section>
            <section className="card benchmark-kpi-card"><div className="card-body"><div className="benchmark-card-label">GKÇ Analizi</div><strong>{result.analysisConfig.windowSeconds} sn / {result.analysisConfig.stepSeconds} sn / {Number(result.analysisConfig.amplitudeThresholds.frequencyMhz).toFixed(3)} mHz</strong><small>{Number(result.analysisConfig.samplingRateHz).toFixed(1)} Hz · {result.analysisConfig.selectedSignals.join(', ') || 'sinyal yok'}</small></div></section>
            <section className="card benchmark-kpi-card"><div className="card-body"><div className="benchmark-card-label">Sonuç</div><strong>{result.matchedCount} MATCH · {result.missedCount} MISSED · {result.extraCount} EXTRA</strong><small>SAS hedef {formatHz(primarySas?.targetFrequencyHz)} · GKÇ {formatHz(primaryEvent?.dominantFrequencyHz)} · Δf {formatSigned(primaryEvent && primarySas?.targetFrequencyHz != null ? (primaryEvent.dominantFrequencyHz ?? 0) - primarySas.targetFrequencyHz : null, 3)} Hz</small></div></section>
          </div>
          {result.similarity && <div className="benchmark-similarity-card"><strong>Kaynak veri benzerliği ({benchmarkTimeZoneLabel(timeZone)})</strong><span>{result.similarity.matchedSampleCount} eşleşmiş örnek · offset {formatSigned(result.similarity.medianTimeOffsetMs, 3)} ms · bias {formatSigned(result.similarity.meanFrequencyBiasHz, 3)} Hz · RMSE {formatHz(result.similarity.rmseHz, 3)} · korelasyon {formatMetricNumber(result.similarity.correlation, 3)}</span></div>}
          <div className="benchmark-quality-grid">{result.imported.quality.findings.map(finding => { const appearance = severityAppearance(finding.severity); return <div key={`${finding.code}-${finding.title}`} className="benchmark-quality-card" style={{ borderColor: appearance.color }}><b style={{ color: appearance.color }} aria-hidden="true">{appearance.icon}</b><div><strong>{finding.title}</strong><small>{finding.detail}</small></div></div>; })}</div>
          <div className="benchmark-table-wrap"><table className="oscillation-table benchmark-comparison-table"><thead><tr><th>Durum</th><th>SAS ACTIVE ({benchmarkTimeZoneLabel(timeZone)})</th><th>GKÇ Tespit Penceresi</th><th>Örtüşme</th><th>Δf</th><th>SAS DR</th><th>GKÇ Event DR</th><th>Ayrıntı</th></tr></thead><tbody>{result.comparisons.map(comparison => <>
            <tr key={comparison.id} className={`benchmark-status-${comparison.status}`}><td><b style={{ color: statusColor[comparison.status] }}>{statusText[comparison.status]}</b></td><td>{formatBenchmarkTimestamp(comparison.sasEvent?.startMs, timeZone)}<br />{formatBenchmarkTimestamp(comparison.sasEvent?.endMs, timeZone)}</td><td>{formatBenchmarkTimestamp(comparison.gkcEvent?.startMs, timeZone)}<br />{formatBenchmarkTimestamp(comparison.gkcEvent?.endMs, timeZone)}</td><td>{formatMetricNumber(comparison.overlapDurationSeconds, 1)} sn · IoU {formatMetricNumber(comparison.iouPercent, 1)}%</td><td>{formatSigned(comparison.frequencyDeltaHz, 3)} Hz</td><td>{formatPercent(comparison.sasDampingPercent)}</td><td>Min {formatPercent(comparison.gkcMinDampingPercent)}<br />Ort. {formatPercent(comparison.gkcAverageDampingPercent)}</td><td><button className="btn btn-outline btn-compact" onClick={() => setExpandedComparisonId(expandedComparisonId === comparison.id ? null : comparison.id)}>{expandedComparisonId === comparison.id ? 'Kapat' : 'Ayrıntı'}</button></td></tr>
            {expandedComparisonId === comparison.id && <tr key={`${comparison.id}-detail`} className="benchmark-detail-row"><td colSpan={8}><div className="benchmark-detail-grid"><span>Başlangıç Δt: {formatSigned(comparison.startDeltaSeconds, 3)} sn</span><span>Bitiş Δt: {formatSigned(comparison.endDeltaSeconds, 3)} sn</span><span>Süre Δ: {formatSigned(comparison.durationDeltaSeconds, 3)} sn</span><span>SAS kapsama: {formatPercent(comparison.sasCoveragePercent)}</span><span>GKÇ kapsama: {formatPercent(comparison.gkcCoveragePercent)}</span><span>SAS tepe: {formatHz(comparison.sasPeakMagnitudeHz, 3)} (yöntem bağımlı)</span><span>GKÇ tepe: {formatMetricNumber(comparison.gkcPeakAmplitude, 3)}</span><span>Band DR: {formatPercent(currentBandMetric?.dampingRatioPercent)}</span><span>Negatif damping: {comparison.negativeDampingDirectionMatches === null ? '—' : comparison.negativeDampingDirectionMatches ? 'yön uyumlu' : 'farklı'}</span></div></td></tr>}
          </>)}</tbody></table></div>
          {result.episodes.length > 0 && <div className="benchmark-table-wrap"><table className="oscillation-table benchmark-comparison-table"><thead><tr><th>Episode eşleştirme</th><th>SAS ACTIVE burst</th><th>GKÇ Tespit Penceresi</th><th>Örtüşme</th><th>Kapsama</th><th>Δf</th><th>Negatif damping</th></tr></thead><tbody>{result.episodes.map(episode => <tr key={episode.id}><td>{episode.sasEvents.length} SAS burst ↔ 1 GKÇ episode</td><td>{episode.sasEvents.map(event => `${formatBenchmarkTimestamp(event.startMs, timeZone, false)}–${formatBenchmarkTimestamp(event.endMs, timeZone, false)}`).join(', ') || '—'}</td><td>{formatBenchmarkTimestamp(episode.gkcEpisode.startMs, timeZone)}<br />{formatBenchmarkTimestamp(episode.gkcEpisode.endMs, timeZone)}</td><td>{formatMetricNumber(episode.overlapDurationSeconds, 1)} sn</td><td>SAS {formatPercent(episode.sasCoveragePercent)} · GKÇ {formatPercent(episode.gkcCoveragePercent)}</td><td>{formatSigned(episode.dominantFrequencyDeltaHz, 3)} Hz</td><td>{episode.hasNegativeDamping ? 'Var' : 'Yok'}</td></tr>)}</tbody></table></div>}
          <div className="benchmark-method-note"><strong>Not:</strong> Harici hedef frekans `f_tgt_hz`dir. SAS genliği ile GKÇ genliği yöntem bağımlıdır; Band DR ile Event Min/Ort. DR farklı ölçümlerdir.</div>
          {chartOptions && <div className="benchmark-chart-grid"><section className="benchmark-chart-card"><h4>Frekans karşılaştırması — 50 Hz farkı ve GKÇ − SAS</h4><ReactECharts ref={bindChartRef('frequency')} option={chartOptions.frequency} onChartReady={chartReady} style={{ height: 280, width: '100%' }} notMerge lazyUpdate /></section><section className="benchmark-chart-card"><h4>Genlik ve eşikler (mHz)</h4><ReactECharts ref={bindChartRef('magnitude')} option={chartOptions.magnitude} onChartReady={chartReady} style={{ height: 280, width: '100%' }} notMerge lazyUpdate /></section><section className="benchmark-chart-card"><h4>Sönüm oranı (DR, %)</h4><ReactECharts ref={bindChartRef('damping')} option={chartOptions.damping} onChartReady={chartReady} style={{ height: 280, width: '100%' }} notMerge lazyUpdate /></section><section className="benchmark-chart-card"><h4>SAS durum / kontrol ve GKÇ tespit penceresi</h4><ReactECharts ref={bindChartRef('state')} option={chartOptions.state} onChartReady={chartReady} style={{ height: 280, width: '100%' }} notMerge lazyUpdate /></section></div>}
          <div className="benchmark-raw-heading">Ham zaman hizalaması · ilk 500 SAS algoritma satırı</div>
          <div className="benchmark-table-wrap benchmark-raw-table"><table className="oscillation-table"><thead><tr><th>Zaman ({benchmarkTimeZoneLabel(timeZone)})</th><th>SAS algoritma F</th><th>SAS PMU 50 Hz F</th><th>{result.mode === 'ytbs' ? 'GKÇ / YTBS F' : 'GKÇ 10 Hz F'}</th><th>GKÇ − SAS</th><th>SAS durum</th><th>SAS DR</th></tr></thead><tbody>{result.imported.algoRows.slice(0, 500).map((row, index) => { const raw = nearestPmuSampleInSorted(sortedSasPmu, row.timestampMs, sasRawMatchToleranceMs(sortedSasPmu)).sample; const gkc = nearestPmuSampleInSorted(sortedGkcPmu, row.timestampMs, gkcToleranceMs).sample; const delta = Number.isFinite(gkc?.frequency) && Number.isFinite(raw?.frequency) ? (gkc?.frequency as number) - (raw?.frequency as number) : null; return <tr key={`${row.timestampMs}-${index}`}><td>{formatBenchmarkTimestamp(row.timestampMs, timeZone)}</td><td>{formatHz(row.frequencyHz, 3)}</td><td>{formatHz(raw?.frequency, 3)}</td><td>{formatHz(gkc?.frequency, 3)}</td><td>{formatSigned(delta, 3)} Hz</td><td>{row.controlState}</td><td>{formatPercent(row.dampingRatio === null ? null : row.dampingRatio * 100)}</td></tr>; })}</tbody></table></div>
          <OscillationBenchmarkPrintReport result={result} timeZone={timeZone} chartImages={printChartImages} />
        </>
      )}
    </div>
  );
}
