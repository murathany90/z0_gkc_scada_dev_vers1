import type { OscillationBenchmarkResult } from '../benchmark/sasTypes.ts';
import { benchmarkTimeZoneLabel, formatBenchmarkTimestamp } from '../benchmark/benchmarkTime.ts';
import type { BenchmarkTimeZone } from '../benchmark/sasTypes.ts';
import { formatMetricNumber } from './chartHelpers.ts';

const formatValue = (value: number | null | undefined, suffix = '', digits = 2): string =>
  Number.isFinite(value) ? `${formatMetricNumber(value, digits)}${suffix}` : '—';

export function OscillationBenchmarkPrintReport({
  result,
  timeZone,
}: {
  result: OscillationBenchmarkResult;
  timeZone: BenchmarkTimeZone;
}) {
  return (
    <div className="oscillation-benchmark-print-report" aria-hidden="true">
      <section className="oscillation-benchmark-print-page">
        <h1>Salınım Algılayıcı — Karşılaştırma / Benchmark</h1>
        <p>Kaynak: {result.imported.archiveName} · Zaman standardı: {benchmarkTimeZoneLabel(timeZone)}</p>
        <div className="oscillation-print-summary-grid">
          <div><strong>Analiz ayarı</strong><br />GKÇ: {result.analysisConfig.windowSeconds} sn / {result.analysisConfig.stepSeconds} sn / {formatMetricNumber(result.analysisConfig.amplitudeThresholds.frequencyMhz, 2)} mHz / {formatMetricNumber(result.analysisConfig.samplingRateHz, 1)} Hz</div>
          <div><strong>Eşleştirme</strong><br />Match {result.matchedCount} · Near-Miss {result.nearMissCount} · Missed {result.missedCount} · Extra {result.extraCount}</div>
          <div><strong>SAS ACTIVE</strong><br />{result.imported.externalEvents.length} olay · PMU {formatMetricNumber(result.imported.quality.pmu.sampleRateHz, 2)} Hz</div>
          <div><strong>GKÇ Interarea</strong><br />{result.gkcAnalysis.events.filter(event => event.signal === 'frequency' && event.bandId === 'INTERAREA').length} tespit penceresi</div>
        </div>
        <h2>Olay düzeyi karşılaştırma</h2>
        <table className="oscillation-print-table">
          <thead><tr><th>Durum</th><th>SAS Event</th><th>GKÇ Tespit Penceresi</th><th>Overlap / IoU</th><th>Δf</th><th>SAS DR</th><th>GKÇ Event Min / Avg DR</th></tr></thead>
          <tbody>{result.comparisons.map(item => <tr key={item.id}><td>{item.status.toUpperCase()}</td><td>{formatBenchmarkTimestamp(item.sasEvent?.startMs, timeZone)}<br />{formatBenchmarkTimestamp(item.sasEvent?.endMs, timeZone)}</td><td>{formatBenchmarkTimestamp(item.gkcEvent?.startMs, timeZone)}<br />{formatBenchmarkTimestamp(item.gkcEvent?.endMs, timeZone)}</td><td>{formatValue(item.overlapDurationSeconds, ' sn', 1)} / {formatValue(item.iouPercent, '%', 1)}</td><td>{formatValue(item.frequencyDeltaHz, ' Hz', 3)}</td><td>{formatValue(item.sasDampingPercent, '%')}</td><td>{formatValue(item.gkcMinDampingPercent, '%')} / {formatValue(item.gkcAverageDampingPercent, '%')}</td></tr>)}</tbody>
        </table>
        <p>f_tgt_hz yalnızca Harici Hedef Frekans olarak yorumlanır. SAS magnitude_hz ve GKÇ amplitude yöntem bağımlıdır. Band DR ile Event Min/Avg DR farklı semantik alanlardır.</p>
      </section>
    </div>
  );
}
