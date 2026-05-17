import type { OscillationAnalysisResult, PmuFider } from '../types/oscillationTypes.ts';
import {
  buildDecisionSupportSentences,
  buildSummaryText,
  humanizeBand,
  signalLabel,
} from '../utils/reportBuilder.ts';
import { formatPmuDisplayName } from './chartHelpers.ts';

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
    </div>
  );
}
