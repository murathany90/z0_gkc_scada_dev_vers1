import { useMemo, useState } from 'react';
import type { OscillationAmplitudeThresholds, OscillationAnalysisResult, PmuFider, PmuSample, PmuSignalKey } from '../types/oscillationTypes.ts';
import type { OscillationDetailsTab } from '../store/oscillationStore.ts';
import { formatMetricNumber, formatPmuDisplayName, SIGNAL_LABELS } from './chartHelpers.ts';
import { OscillationReportPanel } from './OscillationReportPanel.tsx';
import { OscillationBenchmarkPanel } from './OscillationBenchmarkPanel.tsx';
import type { OscillationThemeMode } from './chartHelpers.ts';
import {
  buildOscillationEventDetails,
  humanizeBand,
  humanizeClassification,
  signalLabel,
} from '../utils/reportBuilder.ts';

const tabs: Array<{ id: OscillationDetailsTab; label: string }> = [
  { id: 'summary', label: 'Analiz Özeti' },
  { id: 'signals', label: 'Sinyal Bazlı Analiz' },
  { id: 'modal', label: 'Modal Analiz' },
  { id: 'data', label: 'Veriler / Ayrıntılar' },
  { id: 'report', label: 'Rapor' },
  { id: 'benchmark', label: 'SAS-Cihaz Karşılaştırma' },
];

export function OscillationDetailsTabs({
  activeTab,
  onTabChange,
  result,
  samples,
  pmuDevices,
  reportMarkdown,
  themeMode,
  amplitudeThresholds,
  windowSeconds,
  stepSeconds,
  samplingRateHz,
  selectedSignals,
  samplesByPmu,
  selectedPmuIds,
  referencePmuId,
}: {
  activeTab: OscillationDetailsTab;
  onTabChange: (tab: OscillationDetailsTab) => void;
  result: OscillationAnalysisResult | null;
  samples: PmuSample[];
  pmuDevices: PmuFider[];
  reportMarkdown: string;
  themeMode: OscillationThemeMode;
  amplitudeThresholds: OscillationAmplitudeThresholds;
  windowSeconds: number;
  stepSeconds: number;
  samplingRateHz: number;
  selectedSignals: PmuSignalKey[];
  samplesByPmu: Record<string, PmuSample[]>;
  selectedPmuIds: string[];
  referencePmuId?: string;
}) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const pmuName = (pmuId: string): string =>
    formatPmuDisplayName(pmuDevices.find(device => device.id === pmuId) ?? pmuId);
  const formatEventTime = (timestampMs: number): string => new Date(timestampMs).toLocaleTimeString('tr-TR');
  const selectedEvent = useMemo(() =>
    result?.events.find(event => event.id === selectedEventId) ?? result?.events[0] ?? null,
  [result, selectedEventId]);
  const selectedEventDetails = useMemo(() => selectedEvent
    ? buildOscillationEventDetails({
      event: selectedEvent,
      samples,
      windowMetrics: result?.windowMetrics ?? [],
    })
    : null,
  [result?.windowMetrics, samples, selectedEvent]);

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
                      <th>PMU</th><th>Sinyal</th><th>Mod</th><th>Zaman</th><th>Süre</th><th>Frekans</th><th>DR</th><th>Durum</th><th>Aksiyon</th>
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
                        <td>
                          <button
                            type="button"
                            className="btn btn-outline btn-compact"
                            onClick={() => {
                              setSelectedEventId(event.id);
                              onTabChange('data');
                            }}
                          >
                            Veriler / Ayrıntılar
                          </button>
                        </td>
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
          <div style={{ display: 'grid', gap: 12, maxHeight: 520, overflowY: 'auto' }}>
            {selectedEvent && selectedEventDetails ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8, fontSize: 12 }}>
                  <div><strong>Olay</strong><br />{pmuName(selectedEvent.pmuId)}</div>
                  <div><strong>Ölçüm</strong><br />{signalLabel(selectedEvent.signal)}</div>
                  <div><strong>Zaman</strong><br />{formatEventTime(selectedEvent.startMs)} - {formatEventTime(selectedEvent.endMs)}</div>
                  <div><strong>Mod</strong><br />{humanizeBand(selectedEvent.bandId)}</div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="oscillation-table" style={{ minWidth: 860 }}>
                    <thead>
                      <tr>
                        <th>Pencere Başlangıç</th><th>Pencere Bitiş</th><th>Süre</th><th>Mod</th><th>Hz</th><th>Genlik</th><th>Eşik</th><th>RMS/Enerji</th><th>DR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEventDetails.windowRows.map(metric => (
                        <tr key={`${metric.pmuId}-${metric.signal}-${metric.timestampMs}`}>
                          <td>{formatEventTime(metric.windowStartMs)}</td>
                          <td>{formatEventTime(metric.windowEndMs)}</td>
                          <td>{formatMetricNumber(metric.durationSeconds, 0)} sn</td>
                          <td>{humanizeBand(metric.bandId)}</td>
                          <td style={{ textAlign: 'right' }}>{formatMetricNumber(metric.dominantFrequencyHz)} Hz</td>
                          <td style={{ textAlign: 'right' }}>{formatMetricNumber(metric.amplitude)}</td>
                          <td style={{ textAlign: 'right' }}>{formatMetricNumber(metric.thresholdValue)}</td>
                          <td style={{ textAlign: 'right' }}>{formatMetricNumber(metric.energyRms)}</td>
                          <td style={{ textAlign: 'right' }}>{formatMetricNumber(metric.dampingRatioPercent, 2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="oscillation-table" style={{ minWidth: 760 }}>
                    <thead>
                      <tr style={{ color: 'var(--text-muted)', background: 'var(--table-header-bg)' }}>
                        <th style={{ padding: 6, textAlign: 'left' }}>Timestamp</th><th style={{ padding: 6 }}>PMU</th><th style={{ padding: 6 }}>Ölçüm</th><th style={{ padding: 6, textAlign: 'right' }}>Değer</th><th style={{ padding: 6, textAlign: 'right' }}>Frekans</th><th style={{ padding: 6, textAlign: 'right' }}>Gerilim</th><th style={{ padding: 6, textAlign: 'right' }}>MW</th><th style={{ padding: 6, textAlign: 'right' }}>MVAr</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEventDetails.rawRows.slice(0, 500).map(row => (
                        <tr key={`${row.pmuId}-${row.timestampMs}`} style={{ borderTop: '1px solid var(--border-color)' }}>
                          <td style={{ padding: 6 }}>{row.timestamp}</td>
                          <td style={{ padding: 6 }}>{pmuName(row.pmuId)}</td>
                          <td style={{ padding: 6 }}>{signalLabel(row.signal)}</td>
                          <td style={{ padding: 6, textAlign: 'right' }}>{formatMetricNumber(row.value)}</td>
                          <td style={{ padding: 6, textAlign: 'right' }}>{formatMetricNumber(row.sample.frequency)}</td>
                          <td style={{ padding: 6, textAlign: 'right' }}>{formatMetricNumber(row.sample.voltage)}</td>
                          <td style={{ padding: 6, textAlign: 'right' }}>{formatMetricNumber(row.sample.activePower)}</td>
                          <td style={{ padding: 6, textAlign: 'right' }}>{formatMetricNumber(row.sample.reactivePower)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {selectedEventDetails.rawRows.length > 500 && <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 8 }}>Seçili olay için ilk 500 satır gösteriliyor.</div>}
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Ayrıntı görüntülemek için olay satırından Veriler / Ayrıntılar aksiyonunu seçin.</div>
            )}
          </div>
        )}

        {activeTab === 'report' && (
          <OscillationReportPanel result={result} reportMarkdown={reportMarkdown} pmuDevices={pmuDevices} />
        )}
        <div style={{ display: activeTab === 'benchmark' ? 'block' : 'none' }}>
          <OscillationBenchmarkPanel
            themeMode={themeMode}
            amplitudeThresholds={amplitudeThresholds}
            windowSeconds={windowSeconds}
            stepSeconds={stepSeconds}
            samplingRateHz={samplingRateHz}
            selectedSignals={selectedSignals}
            analysisResult={result}
            samplesByPmu={samplesByPmu}
            selectedPmuIds={selectedPmuIds}
            referencePmuId={referencePmuId}
          />
        </div>
      </div>
    </div>
  );
}
