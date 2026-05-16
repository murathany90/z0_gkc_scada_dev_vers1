import type { SignalBandMetric } from '../types/oscillationTypes.ts';
import { formatMetricNumber } from './chartHelpers.ts';

export function SpectrogramChart({ metrics }: { metrics: SignalBandMetric[] }) {
  const strongest = [...metrics]
    .filter(metric => metric.dominantFrequencyHz !== null)
    .sort((left, right) => (right.spectralEnergy ?? 0) - (left.spectralEnergy ?? 0))
    .slice(0, 6);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
      {strongest.length ? strongest.map(metric => (
        <div key={`${metric.pmuId}-${metric.signal}-${metric.bandId}`} style={{ border: '1px solid var(--border-color)', borderRadius: 6, padding: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{metric.pmuId} / {metric.signal} / {metric.bandId}</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{formatMetricNumber(metric.dominantFrequencyHz)} Hz</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Enerji {formatMetricNumber(metric.spectralEnergy)}</div>
        </div>
      )) : (
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Spektrogram özeti için baskın mod bulunamadı.</div>
      )}
    </div>
  );
}
