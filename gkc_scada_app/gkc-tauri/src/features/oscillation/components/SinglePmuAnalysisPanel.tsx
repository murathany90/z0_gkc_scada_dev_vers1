import type { OscillationAnalysisResult } from '../types/oscillationTypes.ts';
import { BandEnergyHeatmap } from './BandEnergyHeatmap.tsx';
import { DampingChart } from './DampingChart.tsx';
import { SpectrumChart } from './SpectrumChart.tsx';
import { SpectrogramChart } from './SpectrogramChart.tsx';
import { dominantMetric, formatMetricNumber, SIGNAL_LABELS, type OscillationThemeMode } from './chartHelpers.ts';

export function SinglePmuAnalysisPanel({
  result,
  themeMode,
}: {
  result: OscillationAnalysisResult | null;
  themeMode: OscillationThemeMode;
}) {
  if (!result) {
    return <div className="card"><div className="card-body" style={{ color: 'var(--text-muted)', fontSize: 12 }}>Analiz henüz çalıştırılmadı.</div></div>;
  }

  const dominant = dominantMetric(result.metrics);
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="grid-3">
        <div className="stat-card"><div className="stat-label">Baskın Mod</div><div className="stat-value">{formatMetricNumber(dominant?.dominantFrequencyHz)}<span className="stat-unit">Hz</span></div></div>
        <div className="stat-card"><div className="stat-label">Sinyal</div><div className="stat-value" style={{ fontSize: 18 }}>{dominant ? SIGNAL_LABELS[dominant.signal] : '-'}</div></div>
        <div className="stat-card"><div className="stat-label">Sınıflandırma</div><div className="stat-value" style={{ fontSize: 15 }}>{dominant?.classificationLabel ?? '-'}</div></div>
      </div>
      <div className="card"><div className="card-body"><BandEnergyHeatmap metrics={result.metrics} themeMode={themeMode} /></div></div>
      <div className="card"><div className="card-body"><SpectrumChart metrics={result.metrics} themeMode={themeMode} /></div></div>
      <div className="card"><div className="card-body"><DampingChart metrics={result.metrics} themeMode={themeMode} /></div></div>
      <div className="card"><div className="card-body"><SpectrogramChart metrics={result.metrics} /></div></div>
    </div>
  );
}
