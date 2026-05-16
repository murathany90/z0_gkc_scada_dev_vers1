import type { OscillationAnalysisResult, PmuFider, PmuSample } from '../types/oscillationTypes.ts';
import type { OscillationDetailsTab } from '../store/oscillationStore.ts';
import { formatMetricNumber, SIGNAL_LABELS } from './chartHelpers.ts';
import { OscillationReportPanel } from './OscillationReportPanel.tsx';

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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
              {result?.dataQuality.pmuQuality.map(quality => (
                <div key={quality.pmuId} style={{ border: '1px solid var(--border-color)', borderRadius: 6, padding: 10 }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{quality.pmuId}</div>
                  <div style={{ fontWeight: 700 }}>{quality.received}/{quality.expected} örnek</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Eksik {formatMetricNumber(quality.missingRatio * 100, 2)}% · {quality.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'signals' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', background: 'var(--table-header-bg)' }}>
                  <th style={{ padding: 6, textAlign: 'left' }}>PMU</th><th style={{ padding: 6 }}>Sinyal</th><th style={{ padding: 6 }}>Bant</th><th style={{ padding: 6, textAlign: 'right' }}>Hz</th><th style={{ padding: 6, textAlign: 'right' }}>RMS</th><th style={{ padding: 6 }}>Sınıflandırma</th>
                </tr>
              </thead>
              <tbody>
                {result?.metrics.map(metric => (
                  <tr key={`${metric.pmuId}-${metric.signal}-${metric.bandId}`} style={{ borderTop: '1px solid var(--border-color)' }}>
                    <td style={{ padding: 6 }}>{metric.pmuId}</td>
                    <td style={{ padding: 6 }}>{SIGNAL_LABELS[metric.signal]}</td>
                    <td style={{ padding: 6 }}>{metric.bandId}</td>
                    <td style={{ padding: 6, textAlign: 'right' }}>{formatMetricNumber(metric.dominantFrequencyHz)}</td>
                    <td style={{ padding: 6, textAlign: 'right' }}>{formatMetricNumber(metric.bandRms)}</td>
                    <td style={{ padding: 6 }}>{metric.classificationLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'modal' && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {result?.modeShape?.length
              ? `Mode shape ${result.modeShape.length} PMU için hesaplandı.`
              : 'Tek PMU seçildiği veya ortak mod bulunamadığı için mode shape ve koherens sınırlıdır.'}
          </div>
        )}

        {activeTab === 'data' && (
          <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 760 }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', background: 'var(--table-header-bg)' }}>
                  <th style={{ padding: 6, textAlign: 'left' }}>Timestamp</th><th style={{ padding: 6 }}>PMU</th><th style={{ padding: 6, textAlign: 'right' }}>Frekans</th><th style={{ padding: 6, textAlign: 'right' }}>Gerilim</th><th style={{ padding: 6, textAlign: 'right' }}>MW</th><th style={{ padding: 6, textAlign: 'right' }}>MVAr</th>
                </tr>
              </thead>
              <tbody>
                {samples.slice(0, 500).map(sample => (
                  <tr key={`${sample.pmuId}-${sample.timestampMs}`} style={{ borderTop: '1px solid var(--border-color)' }}>
                    <td style={{ padding: 6 }}>{sample.sourceZaman ?? sample.timestamp}</td>
                    <td style={{ padding: 6 }}>{sample.pmuId}</td>
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
