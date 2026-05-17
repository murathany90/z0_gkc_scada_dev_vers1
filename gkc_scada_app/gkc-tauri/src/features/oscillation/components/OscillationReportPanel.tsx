import type { OscillationAnalysisResult, PmuFider, PmuSignalKey } from '../types/oscillationTypes.ts';
import {
  buildDecisionSupportSentences,
  buildSummaryText,
  describeOscillationEvent,
  humanizeBand,
  humanizeClassification,
  signalLabel,
} from '../utils/reportBuilder.ts';
import { formatPmuDisplayName } from './chartHelpers.ts';

const REPORT_SIGNALS: PmuSignalKey[] = ['frequency', 'voltage', 'activePower', 'reactivePower'];

const formatNumber = (value: number | null | undefined, digits = 3): string =>
  Number.isFinite(value) ? Number(value).toLocaleString('tr-TR', { maximumFractionDigits: digits }) : '-';

const formatTime = (timestampMs: number): string => new Date(timestampMs).toLocaleTimeString('tr-TR');

const pmuNameFrom = (pmuDevices: PmuFider[], pmuId: string): string =>
  formatPmuDisplayName(pmuDevices.find(device => device.id === pmuId) ?? pmuId);

export function OscillationReportPanel({
  result,
  pmuDevices,
}: {
  result: OscillationAnalysisResult | null;
  reportMarkdown: string;
  pmuDevices: PmuFider[];
}) {
  const decisionSentences = buildDecisionSupportSentences({ result, pmuDevices });

  return (
    <div className="oscillation-report-shell">
      <div className="oscillation-report-actions">
        <button className="btn" disabled={!result} onClick={() => window.print()} style={{ fontSize: 11 }}>Yazdır / PDF</button>
      </div>

      <section className="oscillation-decision-card">
        <h3>Karar Destek Sistemi</h3>
        <p>{buildSummaryText(result, pmuDevices)}</p>
        <div className="oscillation-decision-list">
          {decisionSentences.map(sentence => <div key={sentence}>{sentence}</div>)}
        </div>
      </section>

      {result ? (
        <div className="oscillation-report-grid">
          <section>
            <h4>Bulgular</h4>
            <table className="oscillation-table">
              <thead>
                <tr><th>PMU</th><th>Sinyal</th><th>Mod</th><th>Zaman</th><th>Süre</th><th>Frekans</th><th>DR</th></tr>
              </thead>
              <tbody>
                {result.events.map(event => (
                  <tr key={event.id} className={event.hasNegativeDamping ? 'oscillation-critical-row' : 'oscillation-detected-row'}>
                    <td>{pmuNameFrom(pmuDevices, event.pmuId)}</td>
                    <td>{signalLabel(event.signal)}</td>
                    <td>{humanizeBand(event.bandId)}</td>
                    <td>{formatTime(event.startMs)} - {formatTime(event.endMs)}</td>
                    <td>{formatNumber(event.durationSeconds, 0)} sn</td>
                    <td style={{ textAlign: 'right' }}>{formatNumber(event.dominantFrequencyHz)} Hz</td>
                    <td style={{ textAlign: 'right' }}>{formatNumber(event.minDampingRatioPercent ?? event.averageDampingRatioPercent, 2)}%</td>
                  </tr>
                ))}
                {!result.events.length && <tr><td colSpan={7}>Eşik üstü salınım olayı bulunmadı.</td></tr>}
              </tbody>
            </table>
          </section>

          <section>
            <h4>Veri Kalitesi</h4>
            <table className="oscillation-table">
              <thead><tr><th>PMU</th><th>Alınan</th><th>Beklenen</th><th>Eksik</th><th>Durum</th></tr></thead>
              <tbody>
                {result.dataQuality.pmuQuality.map(quality => (
                  <tr key={quality.pmuId}>
                    <td>{pmuNameFrom(pmuDevices, quality.pmuId)}</td>
                    <td style={{ textAlign: 'right' }}>{quality.received}</td>
                    <td style={{ textAlign: 'right' }}>{quality.expected}</td>
                    <td style={{ textAlign: 'right' }}>%{formatNumber(quality.missingRatio * 100, 2)}</td>
                    <td>{quality.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      ) : null}

      {result ? (
        <div className="oscillation-print-report" aria-hidden="true">
          <section className="oscillation-print-page">
            <h1>Salınım Algılayıcı Raporu</h1>
            <p>{buildSummaryText(result, pmuDevices)}</p>
            <h2>Karar Destek Sistemi</h2>
            {decisionSentences.map(sentence => <p key={sentence}>{sentence}</p>)}
          </section>

          {REPORT_SIGNALS.map(signal => {
            const signalMetrics = result.metrics.filter(metric => metric.signal === signal);
            const signalEvents = result.events.filter(event => event.signal === signal);
            return (
              <section key={signal} className="oscillation-print-page">
                <h1>{signalLabel(signal)} Metrikleri</h1>
                <table className="oscillation-table">
                  <thead><tr><th>PMU</th><th>Bant</th><th>Frekans</th><th>RMS</th><th>Damping</th><th>Sınıflandırma</th></tr></thead>
                  <tbody>
                    {signalMetrics.map(metric => (
                      <tr key={`${metric.pmuId}-${metric.signal}-${metric.bandId}`} className={metric.classificationLabel !== 'MOD_YOK' ? 'oscillation-detected-row' : undefined}>
                        <td>{pmuNameFrom(pmuDevices, metric.pmuId)}</td>
                        <td>{humanizeBand(metric.bandId)}</td>
                        <td style={{ textAlign: 'right' }}>{formatNumber(metric.dominantFrequencyHz)} Hz</td>
                        <td style={{ textAlign: 'right' }}>{formatNumber(metric.bandRms)}</td>
                        <td style={{ textAlign: 'right' }}>{formatNumber(metric.dampingRatioPercent, 2)}%</td>
                        <td>{humanizeClassification(metric.classificationLabel)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <h2>Olay Yorumu</h2>
                {signalEvents.length
                  ? signalEvents.map(event => <p key={event.id}>{describeOscillationEvent(event, pmuDevices)}</p>)
                  : <p>Bu metrik için eşik üstü salınım olayı tespit edilmedi.</p>}
              </section>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
