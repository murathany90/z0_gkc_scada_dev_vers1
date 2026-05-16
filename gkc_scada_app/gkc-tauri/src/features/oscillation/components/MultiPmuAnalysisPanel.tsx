import type { OscillationAnalysisResult } from '../types/oscillationTypes.ts';
import { BandEnergyHeatmap } from './BandEnergyHeatmap.tsx';
import { CoherenceMatrix } from './CoherenceMatrix.tsx';
import { ModeShapePanel } from './ModeShapePanel.tsx';
import { SpectrumChart } from './SpectrumChart.tsx';
import { formatMetricNumber, type OscillationThemeMode } from './chartHelpers.ts';

export function MultiPmuAnalysisPanel({
  result,
  themeMode,
}: {
  result: OscillationAnalysisResult | null;
  themeMode: OscillationThemeMode;
}) {
  if (!result) {
    return <div className="card"><div className="card-body" style={{ color: 'var(--text-muted)', fontSize: 12 }}>Çoklu analiz henüz çalıştırılmadı.</div></div>;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="card">
        <div className="card-header"><span className="card-title">Ortak Baskın Modlar</span></div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', background: 'var(--table-header-bg)' }}>
                <th style={{ padding: 6, textAlign: 'left' }}>Mod</th><th style={{ padding: 6, textAlign: 'right' }}>Hz</th><th style={{ padding: 6 }}>Bant</th><th style={{ padding: 6 }}>PMU</th><th style={{ padding: 6 }}>Sınıflandırma</th>
              </tr>
            </thead>
            <tbody>
              {result.commonModes.map(mode => (
                <tr key={mode.modeId} style={{ borderTop: '1px solid var(--border-color)' }}>
                  <td style={{ padding: 6 }}>{mode.modeId}</td>
                  <td style={{ padding: 6, textAlign: 'right' }}>{formatMetricNumber(mode.frequencyHz)}</td>
                  <td style={{ padding: 6 }}>{mode.bandId}</td>
                  <td style={{ padding: 6 }}>{mode.participatingPmuIds.length}/{result.query.pmuIds.length}</td>
                  <td style={{ padding: 6 }}>{mode.classificationLabel}</td>
                </tr>
              ))}
              {!result.commonModes.length && <tr><td colSpan={5} style={{ padding: 10, color: 'var(--text-muted)' }}>Ortak mod bulunamadı.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card"><div className="card-body"><BandEnergyHeatmap metrics={result.metrics} themeMode={themeMode} /></div></div>
      <div className="card"><div className="card-body"><ModeShapePanel points={result.modeShape} themeMode={themeMode} /></div></div>
      <div className="card"><div className="card-body"><CoherenceMatrix cells={result.coherenceMatrix} themeMode={themeMode} /></div></div>
      <div className="card"><div className="card-body"><SpectrumChart metrics={result.metrics} themeMode={themeMode} /></div></div>
    </div>
  );
}
