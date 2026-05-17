import type { OscillationAnalysisResult, PmuFider, PmuSample } from '../types/oscillationTypes.ts';
import type { OscillationDetailsTab } from '../store/oscillationStore.ts';
import { formatMetricNumber, formatPmuDisplayName, SIGNAL_LABELS } from './chartHelpers.ts';
import { OscillationReportPanel } from './OscillationReportPanel.tsx';
import { humanizeBand, humanizeClassification, signalLabel } from '../utils/reportBuilder.ts';

const tabs: Array<{ id: OscillationDetailsTab; label: string }> = [
  { id: 'summary', label: 'Analiz Özeti' },
  { id: 'signals', label: 'Sinyal Bazlı Analiz' },
  { id: 'modal', label: 'Modal Analiz' },
  { id: 'data', label: 'Veriler / Ayrıntılar' },
  { id: 'report', label: 'Rapor' },
];

export function OscillationDetailsTabs({
  activeTab,
  onTabChange,
  result,
  samples,
  pmuDevices,
  reportMarkdown,
}: {
  activeTab: OscillationDetailsTab;
  onTabChange: (tab: OscillationDetailsTab) => void;
  result: OscillationAnalysisResult | null;
  samples: PmuSample[];
  pmuDevices: PmuFider[];
  reportMarkdown: string;
}) {
  const pmuName = (pmuId: string): string =>
    formatPmuDisplayName(pmuDevices.find(device => device.id === pmuId) ?? pmuId);
  const formatEventTime = (timestampMs: number): string => new Date(timestampMs).toLocaleTimeString('tr-TR');

  return (
    <div className="card">
      <div className="card-header" style={{ gap: 6, flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : ''}`}
            style={{ fontSize: 11 }}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="card-body">
        {activeTab === 'summary' && (
          <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
            <div>{result ? `${result.dataQuality.totalSamples} gerçek PMU örneği analiz edildi.` : 'Analiz sonucu yok.'}</div>
            {result?.events.length ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="oscillation-table">
                  <thead>
                    <tr>
                      <th>PMU</th><th>Sinyal</th><th>Mod</th><th>Zaman</th><th>Süre</th><th>Frekans</th><th>DR</th><th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.events.map(event => (
                      <tr key={event.id} className={event.hasNegativeDamping ? 'oscillation-critical-row' : 'oscillation-detected-row'}>
                        <td>{pmuName(event.pmuId)}</td>
                        <td>{signalLabel(event.signal)}</td>
                        <td>{humanizeBand(event.bandId)}</td>
                        <td>{formatEventTime(event.startMs)} - {formatEventTime(event.endMs)}</td>
                        <td>{formatMetricNumber(event.durationSeconds, 0)} sn</td>
                        <td style={{ textAlign: 'right' }}>{formatMetricNumber(event.dominantFrequencyHz)} Hz</td>
                        <td style={{ textAlign: 'right' }}>{formatMetricNumber(event.minDampingRatioPercent ?? event.averageDampingRatioPercent, 2)}%</td>
                        <td>{event.hasNegativeDamping ? 'Büyüyen salınım riski' : 'Sönümlenen/izlenen salınım'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : result ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Eşik üstü salınım olayı tespit edilmedi.</div>
            ) : null}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
              {result?.dataQuality.pmuQuality.map(quality => (
                <div key={quality.pmuId} style={{ border: '1px solid var(--border-color)', borderRadius: 6, padding: 10 }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{pmuName(quality.pmuId)}</div>
                  <div style={{ fontWeight: 700 }}>{quality.received}/{quality.expected} örnek</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Eksik {formatMetricNumber(quality.missingRatio * 100, 2)}% · {quality.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'signals' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="oscillation-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>PMU</th><th>Sinyal</th><th>Bant</th><th style={{ textAlign: 'right' }}>Hz</th><th style={{ textAlign: 'right' }}>RMS</th><th>Sınıflandırma</th>
                </tr>
              </thead>
              <tbody>
                {result?.metrics.map(metric => (
                  <tr
                    key={`${metric.pmuId}-${metric.signal}-${metric.bandId}`}
                    className={metric.classificationLabel !== 'MOD_YOK' ? 'oscillation-detected-row' : undefined}
                  >
                    <td>{pmuName(metric.pmuId)}</td>
                    <td>{SIGNAL_LABELS[metric.signal]}</td>
                    <td>{humanizeBand(metric.bandId)}</td>
                    <td style={{ textAlign: 'right' }}>{formatMetricNumber(metric.dominantFrequencyHz)}</td>
                    <td style={{ textAlign: 'right' }}>{formatMetricNumber(metric.bandRms)}</td>
                    <td>{humanizeClassification(metric.classificationLabel)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'modal' && (
          <div style={{ display: 'grid', gap: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
            <div>
              {result?.modeShape?.length
                ? `Mode shape ${result.modeShape.length} PMU için hesaplandı.`
                : 'Tek PMU seçildiği veya ortak mod bulunamadığı için mode shape ve koherens sınırlıdır.'}
            </div>
            {result?.commonModes.length ? (
              <table className="oscillation-table">
                <thead><tr><th>Mod</th><th>Frekans</th><th>Bant</th><th>PMU</th><th>Sınıflandırma</th></tr></thead>
                <tbody>
                  {result.commonModes.map(mode => (
                    <tr key={mode.modeId} className={mode.averageDampingRatioPercent !== undefined && mode.averageDampingRatioPercent < 0 ? 'oscillation-critical-row' : undefined}>
                      <td>{mode.modeId}</td>
                      <td style={{ textAlign: 'right' }}>{formatMetricNumber(mode.frequencyHz)} Hz</td>
                      <td>{humanizeBand(mode.bandId)}</td>
                      <td>{mode.participatingPmuIds.length}/{result.query.pmuIds.length}</td>
                      <td>{humanizeClassification(mode.classificationLabel)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
        )}

        {activeTab === 'data' && (
          <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
            <table className="oscillation-table" style={{ minWidth: 760 }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', background: 'var(--table-header-bg)' }}>
                  <th style={{ padding: 6, textAlign: 'left' }}>Timestamp</th><th style={{ padding: 6 }}>PMU</th><th style={{ padding: 6, textAlign: 'right' }}>Frekans</th><th style={{ padding: 6, textAlign: 'right' }}>Gerilim</th><th style={{ padding: 6, textAlign: 'right' }}>MW</th><th style={{ padding: 6, textAlign: 'right' }}>MVAr</th>
                </tr>
              </thead>
              <tbody>
                {samples.slice(0, 500).map(sample => (
                  <tr key={`${sample.pmuId}-${sample.timestampMs}`} style={{ borderTop: '1px solid var(--border-color)' }}>
                    <td style={{ padding: 6 }}>{sample.sourceZaman ?? sample.timestamp}</td>
                    <td style={{ padding: 6 }}>{pmuName(sample.pmuId)}</td>
                    <td style={{ padding: 6, textAlign: 'right' }}>{formatMetricNumber(sample.frequency)}</td>
                    <td style={{ padding: 6, textAlign: 'right' }}>{formatMetricNumber(sample.voltage)}</td>
                    <td style={{ padding: 6, textAlign: 'right' }}>{formatMetricNumber(sample.activePower)}</td>
                    <td style={{ padding: 6, textAlign: 'right' }}>{formatMetricNumber(sample.reactivePower)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {samples.length > 500 && <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 8 }}>İlk 500 satır gösteriliyor. Tam veri için CSV dışa aktarımı kullanın.</div>}
          </div>
        )}

        {activeTab === 'report' && (
          <OscillationReportPanel result={result} reportMarkdown={reportMarkdown} pmuDevices={pmuDevices} />
        )}
      </div>
    </div>
  );
}
