import { useMemo, useState } from 'react';
import type { EChartsType } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { buildOscillationBenchmarkResult, nearestPmuSampleInSorted, sasRawMatchToleranceMs, sortPmuSamplesByTimestamp } from '../benchmark/benchmarkEngine.ts';
import { SasImportError, importSasEventZip } from '../benchmark/sasEventImporter.ts';
import { resamplePmuToTenHz } from '../benchmark/resamplePmu.ts';
import { benchmarkTimeZoneLabel, formatBenchmarkTimestamp } from '../benchmark/benchmarkTime.ts';
import type { BenchmarkMode, BenchmarkTimeZone, OscillationBenchmarkResult, SasImportResult } from '../benchmark/sasTypes.ts';
import type { OscillationAmplitudeThresholds, OscillationAnalysisResult, PmuFider, PmuSample, PmuSignalKey } from '../types/oscillationTypes.ts';
import { runAnalysisInWorker } from '../utils/runAnalysisWorker.ts';
import { OscillationBenchmarkPrintReport } from './OscillationBenchmarkPrintReport.tsx';
import { connectOscillationTimeChart, formatMetricNumber, paletteFor, type OscillationThemeMode } from './chartHelpers.ts';

const BENCHMARK_CHART_GROUP = 'oscillation-benchmark-time-axis';

const formatSigned = (value: number | null, digits = 2): string => value === null || !Number.isFinite(value)
  ? '—'
  : `${value >= 0 ? '+' : ''}${formatMetricNumber(value, digits)}`;
const mhz = (value: number | null | undefined): number | null => Number.isFinite(value) ? Number(value) * 1000 : null;
const formatHz = (value: number | null | undefined, digits = 3): string => Number.isFinite(value) ? `${formatMetricNumber(value, digits)} Hz` : '—';
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
          rows.push(`<div>${item.marker ?? ''}${item.seriesName ?? ''}: <strong>${typeof value === 'number' ? formatMetricNumber(value, 4) : value ?? '—'}</strong></div>`);
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
    yAxis: { name: unit, nameGap: 42, type: 'value', axisLabel: { color: palette.muted }, axisLine: { lineStyle: { color: palette.axisLine } }, splitLine: { lineStyle: { color: palette.splitLine } } },
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
  const values = [
    ...result.imported.pmuSamples.map(sample => mhz((sample.frequency ?? NaN) - 50)),
    ...result.imported.algoRows.map(row => mhz((row.frequencyHz ?? NaN) - 50)),
    ...result.gkcInputSamples.map(sample => mhz((sample.frequency ?? NaN) - 50)),
  ].filter((value): value is number => value !== null);
  const min = values.length ? Math.min(...values) : -100;
  const max = values.length ? Math.max(...values) : 100;
  const padding = Math.max(2, (max - min) * 0.12);
  return {
    ...baseTimeOption(themeMode, timeZone, 'Δf (mHz)'),
    yAxis: { ...(baseTimeOption(themeMode, timeZone, 'Δf (mHz)').yAxis), min: min - padding, max: max + padding },
    series: [
      { name: 'SAS raw PMU', type: 'line', showSymbol: false, lineStyle: { width: 1, color: '#38bdf8' }, data: result.imported.pmuSamples.map(sample => [sample.timestampMs, mhz((sample.frequency ?? NaN) - 50)]) },
      { name: 'SAS algo', type: 'line', showSymbol: false, lineStyle: { width: 1, color: '#f97316' }, data: result.imported.algoRows.map(row => [row.timestampMs, mhz((row.frequencyHz ?? NaN) - 50)]) },
      { name: result.mode === 'ytbs' ? 'YTBS / GKÇ PMU' : 'GKÇ input (FIR → 10 Hz)', type: 'line', showSymbol: false, lineStyle: { width: 1.2, color: '#a78bfa' }, data: result.gkcInputSamples.map(sample => [sample.timestampMs, mhz((sample.frequency ?? NaN) - 50)]) },
    ],
  };
};

const magnitudeChart = (result: OscillationBenchmarkResult, themeMode: OscillationThemeMode, timeZone: BenchmarkTimeZone) => {
  const windows = gkcFrequencyWindows(result);
  const gkcThreshold = result.analysisConfig.amplitudeThresholds.frequencyMhz;
  return {
    ...baseTimeOption(themeMode, timeZone, 'mHz'),
    series: [
      { name: 'SAS magnitude', type: 'line', showSymbol: false, lineStyle: { color: '#38bdf8' }, data: result.imported.algoRows.map(row => [row.timestampMs, mhz(row.magnitudeHz)]) , markArea: { silent: true, data: activeAreas(result) } },
      { name: 'SAS threshold', type: 'line', showSymbol: false, lineStyle: { type: 'dashed', color: '#f97316' }, data: result.imported.algoRows.map(row => [row.timestampMs, mhz(row.startThresholdHz)]) },
      { name: 'GKÇ amplitude', type: 'line', showSymbol: true, symbolSize: 4, lineStyle: { color: '#a78bfa' }, data: windows.map(metric => [metric.timestampMs, mhz(metric.amplitude)]) , markPoint: { symbolSize: 5, data: windows.filter(metric => (mhz(metric.amplitude) ?? 0) >= gkcThreshold).map(metric => ({ coord: [metric.timestampMs, mhz(metric.amplitude)] })) } },
      { name: `GKÇ threshold (${formatMetricNumber(gkcThreshold, 2)} mHz)`, type: 'line', showSymbol: false, lineStyle: { type: 'dashed', color: '#ec4899' }, data: windows.map(metric => [metric.timestampMs, gkcThreshold]) },
    ],
  };
};

const dampingChart = (result: OscillationBenchmarkResult, themeMode: OscillationThemeMode, timeZone: BenchmarkTimeZone) => {
  const windows = gkcFrequencyWindows(result);
  return {
    ...baseTimeOption(themeMode, timeZone, 'DR (%)'),
    series: [
      { name: 'SAS damping', type: 'line', showSymbol: false, lineStyle: { color: '#38bdf8' }, data: result.imported.algoRows.map(row => [row.timestampMs, row.dampingRatio === null ? null : row.dampingRatio * 100]), markLine: { silent: true, symbol: 'none', data: [{ yAxis: 0, lineStyle: { color: '#ef4444', type: 'dashed' } }] } },
      { name: 'GKÇ damping', type: 'line', showSymbol: true, symbolSize: 4, lineStyle: { color: '#a78bfa' }, data: windows.map(metric => [metric.timestampMs, metric.dampingRatioPercent]) },
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
      { name: 'SAS state', type: 'line', step: 'end', showSymbol: false, lineStyle: { color: '#22c55e', width: 2 }, data: result.imported.algoRows.map(row => [row.timestampMs, stateNumber[row.controlState] ?? null]) },
      { name: 'SAS ctrl_value', type: 'line', step: 'end', showSymbol: false, lineStyle: { color: '#f97316', width: 1.4 }, data: result.imported.algoRows.map(row => [row.timestampMs, row.controlValue]) },
      { name: 'GKÇ Tespit Penceresi', type: 'line', showSymbol: false, lineStyle: { opacity: 0 }, data: [], markArea: { silent: true, data: gkcEvents(result).map(event => [{ xAxis: event.startMs, itemStyle: { color: 'rgba(167,139,250,0.26)' } }, { xAxis: event.endMs }]) } },
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
  const handleBenchmarkPrint = (): void => {
    document.body.classList.add('printing-oscillation-benchmark');
    const cleanup = () => document.body.classList.remove('printing-oscillation-benchmark');
    window.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(() => window.print(), 80);
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
          <button className={`btn ${mode === 'same-raw' ? 'btn-primary' : 'btn-outline'}`} disabled={!imported || loading} onClick={() => imported && void runBenchmark(imported, 'same-raw')}>Aynı Ham Veri</button>
          <button className={`btn ${mode === 'ytbs' ? 'btn-primary' : 'btn-outline'}`} disabled={!imported || loading} onClick={() => imported && void runBenchmark(imported, 'ytbs')}>Mevcut YTBS / GKÇ Analizi</button>
        </div>
        <div className="benchmark-mode-toggle" aria-label="Zaman standardı">
          <button className={`btn ${timeZone === 'local' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTimeZone('local')}>Yerel</button>
          <button className={`btn ${timeZone === 'utc' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTimeZone('utc')}>UTC</button>
        </div>
        {mode === 'ytbs' && availablePmuIds.length > 0 && <select className="form-control" value={effectivePmuId ?? ''} onChange={event => { setSelectedPmuId(event.target.value); if (imported) void runBenchmark(imported, 'ytbs', event.target.value); }}><option value="" disabled>PMU seçin</option>{availablePmuIds.map(id => <option key={id} value={id}>{id}</option>)}</select>}
        {result && <button className="btn btn-outline" onClick={handleBenchmarkPrint}>Benchmark PDF raporu</button>}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Varsayılan zaman standardı: <strong>{benchmarkTimeZoneLabel(timeZone)}</strong>. ZIP istemci içinde güvenli okunur; YTBS canlı sorgu hattına dokunulmaz.</div>
      {progress && <div style={{ fontSize: 12, color: 'var(--accent-cyan)' }}>{progress}</div>}
      {error && <div style={{ border: '1px solid var(--accent-red)', borderRadius: 6, padding: 10, color: 'var(--accent-red)', fontSize: 12 }}>{error}</div>}
      {!result && !loading && !error && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>algo.csv, pmu.csv, merkez_analysis.csv ve merkez_measurement.csv içeren SAS olay ZIP’ini yükleyin.</div>}
      {result && (
        <>
          <div className="benchmark-decision-card"><strong>Karar özeti</strong><span>{decisionText(result)}</span></div>
          {result.mode === 'ytbs' && !result.coverage.covered && <div className="benchmark-coverage-warning">Uyarı: SAS zamanı ile mevcut YTBS/GKÇ sorgusu örtüşmüyor; doğrudan fiziksel veri kıyası yapılamaz.</div>}
          <div className="benchmark-kpi-grid">
            <section className="card benchmark-kpi-card"><div className="card-body"><div className="benchmark-card-label">Kaynak</div><strong className="benchmark-file-name" title={result.imported.archiveName}>{result.imported.archiveName}</strong><small>{result.mode === 'same-raw' ? 'SAS pmu.csv → FIR → GKÇ worker' : `YTBS/GKÇ PMU: ${result.gkcPmuId ?? '—'}`}</small></div></section>
            <section className="card benchmark-kpi-card"><div className="card-body"><div className="benchmark-card-label">Analiz Ayarı</div><strong>GKÇ analizi: {result.analysisConfig.windowSeconds} sn / {result.analysisConfig.stepSeconds} sn / {formatMetricNumber(result.analysisConfig.amplitudeThresholds.frequencyMhz, 2)} mHz</strong><small>{formatMetricNumber(result.analysisConfig.samplingRateHz, 1)} Hz · {result.analysisConfig.selectedSignals.join(', ') || 'sinyal seçilmedi'}</small></div></section>
            <section className="card benchmark-kpi-card"><div className="card-body"><div className="benchmark-card-label">Olay Eşleşmesi</div><strong>{result.matchedCount} Match · {result.nearMissCount} Near</strong><small>{result.missedCount} Missed · {result.extraCount} Extra · {result.episodes.length} episode</small></div></section>
            <section className="card benchmark-kpi-card"><div className="card-body"><div className="benchmark-card-label">Frekans Uyumu</div><strong>SAS hedef {formatHz(primarySas?.targetFrequencyHz)} · GKÇ event {formatHz(primaryEvent?.dominantFrequencyHz)}</strong><small>GKÇ band {formatHz(currentBandMetric?.dominantFrequencyHz)} · Δf {formatSigned(primaryEvent && primarySas?.targetFrequencyHz != null ? (primaryEvent.dominantFrequencyHz ?? 0) - primarySas.targetFrequencyHz : null, 3)} Hz</small></div></section>
            <section className="card benchmark-kpi-card"><div className="card-body"><div className="benchmark-card-label">Veri Kalitesi</div><strong>SAS {formatMetricNumber(result.imported.quality.pmu.sampleRateHz, 2)} Hz / {formatMetricNumber(result.imported.quality.pmu.medianIntervalMs, 1)} ms</strong><small>{result.imported.quality.findings.filter(item => item.severity !== 'info').length} uyarı/anomali · {result.coverage.covered ? `${formatMetricNumber(result.coverage.overlapSeconds, 1)} sn ortak zaman` : 'ortak zaman yok'}</small></div></section>
          </div>
          {result.similarity && <div className="benchmark-similarity-card"><strong>Kaynak veri benzerliği ({benchmarkTimeZoneLabel(timeZone)})</strong><span>{result.similarity.matchedSampleCount} eşleşmiş örnek · offset {formatSigned(result.similarity.medianTimeOffsetMs, 1)} ms · bias {formatSigned(result.similarity.meanFrequencyBiasHz, 5)} Hz · RMSE {formatHz(result.similarity.rmseHz, 5)} · korelasyon {formatMetricNumber(result.similarity.correlation, 4)}</span></div>}
          <div className="benchmark-quality-grid">{result.imported.quality.findings.map(finding => { const appearance = severityAppearance(finding.severity); return <div key={`${finding.code}-${finding.title}`} className="benchmark-quality-card" style={{ borderColor: appearance.color }}><b style={{ color: appearance.color }} aria-hidden="true">{appearance.icon}</b><div><strong>{finding.title}</strong><small>{finding.detail}</small></div></div>; })}</div>
          <div className="benchmark-table-wrap"><table className="oscillation-table benchmark-comparison-table"><thead><tr><th>Durum</th><th>SAS Event ({benchmarkTimeZoneLabel(timeZone)})</th><th>GKÇ Tespit Penceresi ({benchmarkTimeZoneLabel(timeZone)})</th><th>Overlap</th><th>Freq Δ</th><th>SAS DR</th><th>GKÇ DR</th><th>Ayrıntılar</th></tr></thead><tbody>{result.comparisons.map(comparison => <>
            <tr key={comparison.id} className={`benchmark-status-${comparison.status}`}><td><b style={{ color: statusColor[comparison.status] }}>{statusText[comparison.status]}</b></td><td>{formatBenchmarkTimestamp(comparison.sasEvent?.startMs, timeZone)}<br />{formatBenchmarkTimestamp(comparison.sasEvent?.endMs, timeZone)}</td><td>{formatBenchmarkTimestamp(comparison.gkcEvent?.startMs, timeZone)}<br />{formatBenchmarkTimestamp(comparison.gkcEvent?.endMs, timeZone)}</td><td>{formatMetricNumber(comparison.overlapDurationSeconds, 1)} sn · IoU {formatMetricNumber(comparison.iouPercent, 1)}%</td><td>{formatSigned(comparison.frequencyDeltaHz, 3)} Hz</td><td>{formatPercent(comparison.sasDampingPercent)}</td><td>Min {formatPercent(comparison.gkcMinDampingPercent)}<br />Avg {formatPercent(comparison.gkcAverageDampingPercent)}</td><td><button className="btn btn-outline btn-compact" onClick={() => setExpandedComparisonId(expandedComparisonId === comparison.id ? null : comparison.id)}>{expandedComparisonId === comparison.id ? 'Kapat' : 'Ayrıntılar'}</button></td></tr>
            {expandedComparisonId === comparison.id && <tr key={`${comparison.id}-detail`} className="benchmark-detail-row"><td colSpan={8}><div className="benchmark-detail-grid"><span>Başlangıç Δt: {formatSigned(comparison.startDeltaSeconds)} sn</span><span>Bitiş Δt: {formatSigned(comparison.endDeltaSeconds)} sn</span><span>Süre Δ: {formatSigned(comparison.durationDeltaSeconds)} sn</span><span>SAS kapsama: {formatPercent(comparison.sasCoveragePercent)}</span><span>GKÇ kapsama: {formatPercent(comparison.gkcCoveragePercent)}</span><span>SAS peak: {formatHz(comparison.sasPeakMagnitudeHz, 5)} (yöntem bağımlı)</span><span>GKÇ peak: {formatMetricNumber(comparison.gkcPeakAmplitude, 5)}</span><span>Negative damping: {comparison.negativeDampingDirectionMatches === null ? '—' : comparison.negativeDampingDirectionMatches ? 'yön uyumlu' : 'farklı'}</span></div></td></tr>}
          </>)}</tbody></table></div>
          {result.episodes.length > 0 && <div className="benchmark-table-wrap"><table className="oscillation-table benchmark-comparison-table"><thead><tr><th>Episode seviyesi</th><th>SAS ACTIVE burst ({benchmarkTimeZoneLabel(timeZone)})</th><th>GKÇ Tespit Penceresi ({benchmarkTimeZoneLabel(timeZone)})</th><th>Overlap</th><th>Kapsama</th><th>Δf</th><th>Negative damping</th></tr></thead><tbody>{result.episodes.map(episode => <tr key={episode.id}><td>{episode.sasEvents.length} SAS burst ↔ 1 GKÇ detection episode</td><td>{episode.sasEvents.map(event => `${formatBenchmarkTimestamp(event.startMs, timeZone, false)}–${formatBenchmarkTimestamp(event.endMs, timeZone, false)}`).join(', ') || '—'}</td><td>{formatBenchmarkTimestamp(episode.gkcEpisode.startMs, timeZone)}<br />{formatBenchmarkTimestamp(episode.gkcEpisode.endMs, timeZone)}</td><td>{formatMetricNumber(episode.overlapDurationSeconds, 1)} sn</td><td>SAS {formatPercent(episode.sasCoveragePercent)} · GKÇ {formatPercent(episode.gkcCoveragePercent)}</td><td>{formatSigned(episode.dominantFrequencyDeltaHz, 3)} Hz</td><td>{episode.hasNegativeDamping ? 'Var' : 'Yok'}</td></tr>)}</tbody></table></div>}
          <div className="benchmark-method-note">`f_tgt_hz` yalnızca <strong>Harici Hedef Frekans</strong>tır. SAS `magnitude_hz` ve GKÇ amplitude aynı yöntemle hesaplanmaz; peak kıyası yöntem bağımlıdır. Band DR, Event Min DR ve Event Avg DR ayrı semantiklerle gösterilir.</div>
          {chartOptions && <div className="benchmark-chart-grid"><section className="benchmark-chart-card"><h4>Frekans — Δf (mHz) · {benchmarkTimeZoneLabel(timeZone)}</h4><ReactECharts option={chartOptions.frequency} onChartReady={chartReady} style={{ height: 270, width: '100%' }} notMerge lazyUpdate /></section><section className="benchmark-chart-card"><h4>SAS magnitude / GKÇ amplitude — doğru eşik · {benchmarkTimeZoneLabel(timeZone)}</h4><ReactECharts option={chartOptions.magnitude} onChartReady={chartReady} style={{ height: 270, width: '100%' }} notMerge lazyUpdate /></section><section className="benchmark-chart-card"><h4>Damping — 0% referansı · {benchmarkTimeZoneLabel(timeZone)}</h4><ReactECharts option={chartOptions.damping} onChartReady={chartReady} style={{ height: 270, width: '100%' }} notMerge lazyUpdate /></section><section className="benchmark-chart-card"><h4>SAS State / ctrl_value ve GKÇ Tespit Penceresi · {benchmarkTimeZoneLabel(timeZone)}</h4><ReactECharts option={chartOptions.state} onChartReady={chartReady} style={{ height: 270, width: '100%' }} notMerge lazyUpdate /></section></div>}
          <div className="benchmark-table-wrap benchmark-raw-table"><table className="oscillation-table"><thead><tr><th>Zaman ({benchmarkTimeZoneLabel(timeZone)})</th><th>SAS algo F</th><th>SAS raw PMU 50 Hz F</th><th>{result.mode === 'ytbs' ? 'YTBS / GKÇ F' : 'GKÇ input F'}</th><th>Harici Hedef Frekans</th><th>SAS magnitude</th><th>SAS threshold</th><th>State</th><th>ctrl_value</th><th>SAS damping</th><th>time/data</th></tr></thead><tbody>{result.imported.algoRows.slice(0, 500).map((row, index) => { const raw = nearestPmuSampleInSorted(sortedSasPmu, row.timestampMs, sasRawMatchToleranceMs(sortedSasPmu)).sample; const gkc = nearestPmuSampleInSorted(sortedGkcPmu, row.timestampMs, gkcToleranceMs).sample; return <tr key={`${row.timestampMs}-${index}`}><td>{formatBenchmarkTimestamp(row.timestampMs, timeZone)}</td><td>{formatHz(row.frequencyHz, 5)}</td><td>{formatHz(raw?.frequency, 5)}</td><td>{formatHz(gkc?.frequency, 5)}</td><td>{formatHz(row.targetFrequencyHz, 4)}</td><td>{formatHz(row.magnitudeHz, 5)}</td><td>{formatHz(row.startThresholdHz, 5)}</td><td>{row.controlState}</td><td>{row.controlValue ?? '—'}</td><td>{formatPercent(row.dampingRatio === null ? null : row.dampingRatio * 100)}</td><td>{row.timeHealth} / {String(row.dataValid)}</td></tr>; })}</tbody></table>{result.imported.algoRows.length > 500 && <div className="benchmark-table-note">İlk 500 SAS algo satırı gösterilir; PMU eşleştirmesi satır indeksiyle değil timestamp / nearest-neighbour ile yapılır.</div>}</div>
          <OscillationBenchmarkPrintReport result={result} timeZone={timeZone} />
        </>
      )}
    </div>
  );
}
