import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { DEFAULT_AMPLITUDE_THRESHOLDS, SAMPLING_RATE_HZ } from '../utils/bands.ts';
import { runAnalysisInWorker } from '../utils/runAnalysisWorker.ts';
import { buildOscillationBenchmarkResult } from '../benchmark/benchmarkEngine.ts';
import { SasImportError, importSasEventZip } from '../benchmark/sasEventImporter.ts';
import { resamplePmuToTenHz } from '../benchmark/resamplePmu.ts';
import type { OscillationBenchmarkResult } from '../benchmark/sasTypes.ts';
import type { PmuFider } from '../types/oscillationTypes.ts';
import { formatMetricNumber, formatPmuAxisTime, paletteFor, type OscillationThemeMode } from './chartHelpers.ts';

const formatTime = (value: number | null): string => value === null ? '-' : new Date(value).toLocaleString('tr-TR');
const formatSigned = (value: number | null, digits = 2): string => value === null || !Number.isFinite(value)
  ? '-'
  : `${value >= 0 ? '+' : ''}${formatMetricNumber(value, digits)}`;

const statusText = (status: 'match' | 'missed' | 'extra'): string => ({
  match: 'Eşleşti',
  missed: 'Kaçırıldı',
  extra: 'Ek olay',
})[status];

const compactStateRows = (rows: OscillationBenchmarkResult['imported']['algoRows']) => {
  const spans: Array<{ state: string; start: number; end: number }> = [];
  rows.forEach(row => {
    const previous = spans[spans.length - 1];
    if (previous && previous.state === row.controlState) previous.end = row.timestampMs;
    else spans.push({ state: row.controlState, start: row.timestampMs, end: row.timestampMs });
  });
  return spans;
};

const benchmarkChartOption = (result: OscillationBenchmarkResult, themeMode: OscillationThemeMode) => {
  const palette = paletteFor(themeMode);
  const stateRows = compactStateRows(result.imported.algoRows);
  const gkcWindows = result.gkcAnalysis.windowMetrics.filter(metric => metric.signal === 'frequency');
  const gkcEvents = result.gkcAnalysis.events.filter(event => event.signal === 'frequency' && event.bandId === 'INTERAREA');
  const titles = ['Frekans', 'SAS magnitude / threshold', 'GKÇ amplitude / threshold', 'Damping karşılaştırması', 'SAS state + GKÇ event şeridi', 'SAS ctrl_value diagnostik'];
  const grids = Array.from({ length: 6 }, (_unused, index) => ({
    top: 42 + index * 122,
    left: 60,
    right: 24,
    height: 72,
  }));
  const xAxes = Array.from({ length: 6 }, (_unused, index) => ({
    type: 'time' as const,
    gridIndex: index,
    axisLabel: { color: palette.muted, formatter: (value: number) => formatPmuAxisTime(value), show: index === 5 },
    axisLine: { lineStyle: { color: palette.axisLine } },
    axisTick: { show: false },
    splitLine: { show: false },
  }));
  const yAxes = [
    { name: 'Hz', type: 'value' as const },
    { name: 'Hz', type: 'value' as const },
    { name: 'Hz', type: 'value' as const },
    { name: '%', type: 'value' as const },
    { name: 'state', type: 'category' as const, data: ['IDLE', 'INTERMEDIATE', 'ACTIVE'] },
    { name: 'ctrl', type: 'value' as const, min: -1.1, max: 1.1, interval: 1 },
  ].map((axis, index) => ({
    ...axis,
    gridIndex: index,
    nameTextStyle: { color: palette.muted, fontSize: 10 },
    axisLabel: { color: palette.muted, fontSize: 10 },
    axisLine: { lineStyle: { color: palette.axisLine } },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: palette.splitLine } },
  }));
  return {
    animation: false,
    backgroundColor: 'transparent',
    title: titles.map((text, index) => ({ text, left: 60, top: 17 + index * 122, textStyle: { color: palette.text, fontSize: 11, fontWeight: 600 } })),
    grid: grids,
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: palette.tooltipBg,
      borderColor: palette.tooltipBorder,
      textStyle: { color: palette.text, fontSize: 11 },
    },
    axisPointer: { link: [{ xAxisIndex: 'all' }] },
    dataZoom: [
      { type: 'inside', xAxisIndex: [0, 1, 2, 3, 4, 5], filterMode: 'none' },
      { type: 'slider', xAxisIndex: [0, 1, 2, 3, 4, 5], filterMode: 'none', bottom: 6, height: 18, borderColor: palette.tooltipBorder, textStyle: { color: palette.muted } },
    ],
    xAxis: xAxes,
    yAxis: yAxes,
    series: [
      {
        name: 'PMU frekans', type: 'line', xAxisIndex: 0, yAxisIndex: 0, showSymbol: false,
        lineStyle: { width: 1.2, color: '#22c55e' },
        data: result.resample.samples.map(sample => [sample.timestampMs, sample.frequency]),
      },
      {
        name: 'SAS magnitude', type: 'line', xAxisIndex: 1, yAxisIndex: 1, showSymbol: false,
        lineStyle: { width: 1.2, color: '#38bdf8' },
        data: result.imported.algoRows.map(row => [row.timestampMs, row.magnitudeHz]),
      },
      {
        name: 'SAS threshold', type: 'line', xAxisIndex: 1, yAxisIndex: 1, showSymbol: false,
        lineStyle: { width: 1, type: 'dashed', color: '#f97316' },
        data: result.imported.algoRows.map(row => [row.timestampMs, row.startThresholdHz]),
      },
      {
        name: 'GKÇ amplitude', type: 'line', xAxisIndex: 2, yAxisIndex: 2, showSymbol: true, symbolSize: 3,
        lineStyle: { width: 1.2, color: '#a78bfa' },
        data: gkcWindows.map(metric => [metric.timestampMs, metric.amplitude]),
      },
      {
        name: 'GKÇ threshold', type: 'line', xAxisIndex: 2, yAxisIndex: 2, showSymbol: false,
        lineStyle: { width: 1, type: 'dashed', color: '#f97316' },
        data: gkcWindows.map(metric => [metric.timestampMs, metric.thresholdValue]),
      },
      {
        name: 'SAS damping', type: 'line', xAxisIndex: 3, yAxisIndex: 3, showSymbol: false,
        lineStyle: { width: 1.2, color: '#38bdf8' },
        data: result.imported.algoRows.map(row => [row.timestampMs, row.dampingRatio === null ? null : row.dampingRatio * 100]),
      },
      {
        name: 'GKÇ damping', type: 'line', xAxisIndex: 3, yAxisIndex: 3, showSymbol: true, symbolSize: 3,
        lineStyle: { width: 1.2, color: '#a78bfa' },
        data: gkcWindows.map(metric => [metric.timestampMs, metric.dampingRatioPercent]),
      },
      {
        name: 'SAS kontrol durumu', type: 'line', xAxisIndex: 4, yAxisIndex: 4, showSymbol: false,
        lineStyle: { opacity: 0 },
        data: result.imported.algoRows.map(row => [row.timestampMs, row.controlState]),
        markArea: {
          silent: true,
          data: stateRows.map(span => [{
            xAxis: span.start,
            itemStyle: { color: span.state === 'ACTIVE' ? 'rgba(239,68,68,0.28)' : span.state === 'INTERMEDIATE' ? 'rgba(249,115,22,0.22)' : 'rgba(34,197,94,0.12)' },
          }, { xAxis: span.end }]),
        },
      },
      {
        name: 'GKÇ Interarea olay', type: 'line', xAxisIndex: 4, yAxisIndex: 4, showSymbol: false,
        lineStyle: { opacity: 0 },
        data: [],
        markArea: {
          silent: true,
          data: gkcEvents.map(event => [{ xAxis: event.startMs, itemStyle: { color: 'rgba(167,139,250,0.34)' } }, { xAxis: event.endMs }]),
        },
      },
      {
        name: 'SAS ctrl_value', type: 'step', step: 'end', xAxisIndex: 5, yAxisIndex: 5, showSymbol: false,
        lineStyle: { width: 1.2, color: '#f97316' },
        data: result.imported.algoRows.map(row => [row.timestampMs, row.controlValue]),
      },
    ],
  };
};

export function OscillationBenchmarkPanel({
  themeMode,
  windowSeconds,
  stepSeconds,
}: {
  themeMode: OscillationThemeMode;
  windowSeconds: number;
  stepSeconds: number;
}) {
  const [result, setResult] = useState<OscillationBenchmarkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const chartOption = useMemo(() => result ? benchmarkChartOption(result, themeMode) : null, [result, themeMode]);
  const handleArchive = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setProgress('SAS arşivi doğrulanıyor ve CSV şemaları okunuyor…');
    try {
      const imported = importSasEventZip(new Uint8Array(await file.arrayBuffer()), file.name);
      setProgress('50 Hz PMU verisi anti-alias FIR ile 10 Hz’e indirgeniyor…');
      const resample = resamplePmuToTenHz(imported.pmuSamples);
      const samples = resample.samples;
      const pmu: PmuFider = {
        id: 'SAS-PMU', name: 'SAS Benchmark PMU', substationName: 'Harici SAS arşivi', isPmu: true,
      };
      setProgress('Aynı GKÇ analiz worker’ı çalışıyor…');
      const gkcAnalysis = await runAnalysisInWorker({
        selectionMode: 'single',
        samplesByPmuEntries: [[pmu.id, samples]],
        pmuDevices: [pmu],
        referencePmuId: pmu.id,
        startTime: new Date(samples[0].timestampMs).toISOString(),
        endTime: new Date(samples[samples.length - 1]?.timestampMs ?? samples[0].timestampMs).toISOString(),
        selectedSignals: ['frequency'],
        amplitudeThresholds: DEFAULT_AMPLITUDE_THRESHOLDS,
        samplingRateHz: SAMPLING_RATE_HZ,
        windowSeconds,
        stepSeconds,
      }, workerProgress => setProgress(workerProgress.label));
      setResult(buildOscillationBenchmarkResult({ imported, resample, gkcAnalysis }));
      setProgress(null);
    } catch (caught) {
      const message = caught instanceof SasImportError
        ? `${caught.code}: ${caught.message}`
        : caught instanceof Error ? caught.message : String(caught);
      setError(message);
      setProgress(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <label className="btn btn-primary" style={{ cursor: loading ? 'wait' : 'pointer' }}>
          {loading ? 'Benchmark işleniyor…' : 'SAS Event ZIP yükle'}
          <input
            type="file"
            accept=".zip,application/zip"
            style={{ display: 'none' }}
            disabled={loading}
            onChange={event => { void handleArchive(event.target.files?.[0]); event.currentTarget.value = ''; }}
          />
        </label>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>ZIP istemci içinde güvenlik sınırları ve ZIP-slip kontrolüyle okunur; YTBS canlı sorgu hattına dokunulmaz.</span>
      </div>
      {progress && <div style={{ fontSize: 12, color: 'var(--accent-cyan)' }}>{progress}</div>}
      {error && <div style={{ border: '1px solid var(--accent-red)', borderRadius: 6, padding: 10, color: 'var(--accent-red)', fontSize: 12 }}>{error}</div>}
      {!result && !loading && !error && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>algo.csv, pmu.csv, merkez_analysis.csv ve merkez_measurement.csv içeren SAS olay ZIP’ini yükleyin.</div>}
      {result && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: 8 }}>
            <div className="card"><div className="card-body"><strong>{result.imported.archiveName}</strong><br /><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>4 CSV otomatik tanındı · SAS ACTIVE {result.imported.externalEvents.length} olay<br />{formatTime(result.imported.quality.pmu.firstTimestampMs)} — {formatTime(result.imported.quality.pmu.lastTimestampMs)}</span></div></div>
            <div className="card"><div className="card-body"><strong>{formatMetricNumber(result.imported.quality.pmu.sampleRateHz, 2)} Hz → {formatMetricNumber(result.resample.targetRateHz, 1)} Hz</strong><br /><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{result.resample.firTapCount} tap FIR · {result.resample.antiAliasCutoffHz.toFixed(1)} Hz low-pass</span></div></div>
            <div className="card"><div className="card-body"><strong>{result.matchedCount} eşleşti · {result.missedCount} kaçırıldı · {result.extraCount} ek</strong><br /><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>GKÇ Interarea frekans olaylarıyla bir-e-bir eşleştirme</span></div></div>
            <div className="card"><div className="card-body"><strong>{result.gkcAnalysis.events.filter(event => event.signal === 'frequency' && event.bandId === 'INTERAREA').length} GKÇ Interarea olay</strong><br /><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Worker: {windowSeconds} sn pencere / {stepSeconds} sn adım<br />GKÇ eşiği: {DEFAULT_AMPLITUDE_THRESHOLDS.frequencyMhz} mHz</span></div></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 8 }}>
            {result.imported.quality.findings.map(finding => (
              <div key={`${finding.code}-${finding.title}`} style={{ border: `1px solid ${finding.severity === 'error' ? 'var(--accent-red)' : finding.severity === 'warning' ? 'var(--accent-orange)' : 'var(--border-color)'}`, borderRadius: 6, padding: 10, fontSize: 12 }}>
                <strong>{finding.title}</strong><br /><span style={{ color: 'var(--text-muted)' }}>{finding.detail}</span>
              </div>
            ))}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="oscillation-table" style={{ minWidth: 1160 }}>
              <thead><tr><th>Durum</th><th>SAS başlangıç / bitiş</th><th>GKÇ başlangıç / bitiş</th><th>Başlangıç Δt</th><th>Bitiş Δt</th><th>Süre Δ</th><th>Örtüşme</th><th>Harici Hedef Frekans</th><th>GKÇ dominant</th><th>Frekans Δ</th><th>SAS peak</th><th>GKÇ peak</th><th>SAS / GKÇ DR</th><th>Negatif yön</th></tr></thead>
              <tbody>{result.comparisons.map(comparison => (
                <tr key={comparison.id} className={comparison.status === 'missed' ? 'oscillation-critical-row' : comparison.status === 'extra' ? 'oscillation-detected-row' : undefined}>
                  <td>{statusText(comparison.status)}</td>
                  <td>{formatTime(comparison.sasEvent?.startMs ?? null)}<br />{formatTime(comparison.sasEvent?.endMs ?? null)}</td>
                  <td>{formatTime(comparison.gkcEvent?.startMs ?? null)}<br />{formatTime(comparison.gkcEvent?.endMs ?? null)}</td>
                  <td>{formatSigned(comparison.startDeltaSeconds)} sn</td><td>{formatSigned(comparison.endDeltaSeconds)} sn</td><td>{formatSigned(comparison.durationDeltaSeconds)} sn</td>
                  <td>{formatMetricNumber(comparison.overlapPercent, 1)}%</td><td>{formatMetricNumber(comparison.targetFrequencyHz)} Hz</td><td>{formatMetricNumber(comparison.gkcDominantFrequencyHz)} Hz</td><td>{formatSigned(comparison.frequencyDeltaHz, 3)} Hz</td>
                  <td>{formatMetricNumber(comparison.sasPeakMagnitudeHz)} Hz</td><td>{formatMetricNumber(comparison.gkcPeakAmplitude)} Hz</td>
                  <td>{formatMetricNumber(comparison.sasDampingPercent, 2)}% / {formatMetricNumber(comparison.gkcMinDampingPercent ?? comparison.gkcAverageDampingPercent, 2)}%</td><td>{comparison.negativeDampingDirectionMatches === null ? '-' : comparison.negativeDampingDirectionMatches ? 'Uyumlu' : 'Farklı'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>SAS `magnitude_hz` ile GKÇ amplitude farklı yöntemlerle hesaplanır; peak değerleri yöntem bağımlı karşılaştırmadır. `f_tgt_hz` burada yalnızca <strong>Harici Hedef Frekans</strong> olarak gösterilir.</div>

          {chartOption && <ReactECharts option={chartOption} style={{ height: 790, width: '100%' }} notMerge lazyUpdate />}

          <div style={{ maxHeight: 360, overflow: 'auto' }}>
            <table className="oscillation-table" style={{ minWidth: 1080 }}>
              <thead><tr><th>Zaman</th><th>PMU F</th><th>SAS F</th><th>Harici Hedef Frekans</th><th>SAS magnitude</th><th>SAS threshold</th><th>State</th><th>ctrl_value</th><th>SAS damping</th><th>time/data</th></tr></thead>
              <tbody>{result.imported.algoRows.slice(0, 500).map((row, index) => {
                const pmu = result.resample.samples[Math.min(result.resample.samples.length - 1, index * Math.max(1, Math.round(result.resample.targetRateHz / 5)))];
                return <tr key={`${row.timestampMs}-${index}`}><td>{row.timestamp}</td><td>{formatMetricNumber(pmu?.frequency)} Hz</td><td>{formatMetricNumber(row.frequencyHz)} Hz</td><td>{formatMetricNumber(row.targetFrequencyHz)} Hz</td><td>{formatMetricNumber(row.magnitudeHz)} Hz</td><td>{formatMetricNumber(row.startThresholdHz)} Hz</td><td>{row.controlState}</td><td>{row.controlValue ?? '-'}</td><td>{formatMetricNumber(row.dampingRatio === null ? null : row.dampingRatio * 100, 2)}%</td><td>{row.timeHealth} / {String(row.dataValid)}</td></tr>;
              })}</tbody>
            </table>
            {result.imported.algoRows.length > 500 && <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>Ham veri/algoritma ayrıntılarında ilk 500 SAS satırı gösterilir.</div>}
          </div>
        </>
      )}
    </div>
  );
}
