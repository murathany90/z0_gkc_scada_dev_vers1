import type { OscillationBenchmarkResult } from '../benchmark/sasTypes.ts';
import { benchmarkTimeZoneLabel, formatBenchmarkTimestamp } from '../benchmark/benchmarkTime.ts';
import type { BenchmarkTimeZone } from '../benchmark/sasTypes.ts';
import { formatMetricNumber } from './chartHelpers.ts';

export type BenchmarkPrintChartImages = Partial<Record<'frequency' | 'magnitude' | 'damping' | 'state', string>>;

const PRINT_CHARTS: Array<{ key: keyof BenchmarkPrintChartImages; title: string }> = [
  { key: 'frequency', title: 'Frekans karşılaştırması — 50 Hz farkı ve GKÇ − SAS' },
  { key: 'magnitude', title: 'Genlik ve eşikler (mHz)' },
  { key: 'damping', title: 'Sönüm oranı (DR, %)' },
  { key: 'state', title: 'SAS durum / kontrol ve GKÇ tespit penceresi' },
];

const formatValue = (value: number | null | undefined, suffix = '', digits = 2): string =>
  Number.isFinite(value) ? `${formatMetricNumber(value, digits)}${suffix}` : '—';

export function OscillationBenchmarkPrintReport({
  result,
  timeZone,
  chartImages,
}: {
  result: OscillationBenchmarkResult;
  timeZone: BenchmarkTimeZone;
  chartImages: BenchmarkPrintChartImages;
}) {
  return (
    <div className="oscillation-benchmark-print-report" aria-hidden="true">
      <section className="oscillation-benchmark-print-page">
        <h1>Salınım Algılayıcı — SAS-Cihaz Karşılaştırma</h1>
        <p>Kaynak: {result.imported.archiveName} · Zaman standardı: {benchmarkTimeZoneLabel(timeZone)}</p>
        <div className="oscillation-print-summary-grid">
          <div><strong>GKÇ analizi</strong><br />{result.analysisConfig.windowSeconds} sn / {result.analysisConfig.stepSeconds} sn / {Number(result.analysisConfig.amplitudeThresholds.frequencyMhz).toFixed(3)} mHz / {formatMetricNumber(result.analysisConfig.samplingRateHz, 1)} Hz</div>
          <div><strong>Eşleştirme</strong><br />Match {result.matchedCount} · Near-Miss {result.nearMissCount} · Missed {result.missedCount} · Extra {result.extraCount}</div>
          <div><strong>SAS ACTIVE</strong><br />{result.imported.externalEvents.length} olay · PMU {formatMetricNumber(result.imported.quality.pmu.sampleRateHz, 2)} Hz</div>
          <div><strong>GKÇ Interarea</strong><br />{result.gkcAnalysis.events.filter(event => event.signal === 'frequency' && event.bandId === 'INTERAREA').length} tespit penceresi</div>
        </div>
        <h2>Olay düzeyi karşılaştırma</h2>
        <table className="oscillation-print-table">
          <thead><tr><th>Durum</th><th>SAS Event</th><th>GKÇ Tespit Penceresi</th><th>Overlap / IoU</th><th>Δf</th><th>SAS DR</th><th>GKÇ Event Min / Avg DR</th></tr></thead>
          <tbody>{result.comparisons.map(item => <tr key={item.id}><td>{item.status.toUpperCase()}</td><td>{formatBenchmarkTimestamp(item.sasEvent?.startMs, timeZone)}<br />{formatBenchmarkTimestamp(item.sasEvent?.endMs, timeZone)}</td><td>{formatBenchmarkTimestamp(item.gkcEvent?.startMs, timeZone)}<br />{formatBenchmarkTimestamp(item.gkcEvent?.endMs, timeZone)}</td><td>{formatValue(item.overlapDurationSeconds, ' sn', 1)} / {formatValue(item.iouPercent, '%', 1)}</td><td>{formatValue(item.frequencyDeltaHz, ' Hz', 3)}</td><td>{formatValue(item.sasDampingPercent, '%')}</td><td>{formatValue(item.gkcMinDampingPercent, '%')} / {formatValue(item.gkcAverageDampingPercent, '%')}</td></tr>)}</tbody>
        </table>
        <p>Harici hedef frekans `f_tgt_hz`dir. SAS ve GKÇ genlikleri yöntem bağımlıdır; Band DR ile Event Min/Ort. DR farklı ölçümlerdir.</p>
      </section>
      <section className="oscillation-benchmark-print-page">
        <h2>Grafikler</h2>
        <div className="benchmark-print-chart-grid">
          {PRINT_CHARTS.map(chart => (
            <figure key={chart.key} className="benchmark-print-chart">
              <figcaption>{chart.title}</figcaption>
              {chartImages[chart.key]
                ? <img src={chartImages[chart.key]} alt={chart.title} />
                : <div className="benchmark-print-chart-missing">Grafik hazırlanamadı.</div>}
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}
