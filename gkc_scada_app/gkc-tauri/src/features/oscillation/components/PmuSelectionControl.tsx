import { PMU_FIDERS } from '../store/oscillationStore.ts';
import type { PmuSelectionMode } from '../types/oscillationTypes.ts';
import { useYtbsStore } from '../../../stores/ytbsStore.ts';
import { formatGkcHealthLabel, getGkcHealthVisual } from '../../../utils/gkcHealth.ts';

export function PmuSelectionControl({
  mode,
  selectedPmuIds,
  onChange,
  disabled,
  controlId = 'oscillation-pmu-select',
}: {
  mode: PmuSelectionMode;
  selectedPmuIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  controlId?: string;
}) {
  const healthStatus = useYtbsStore(state => state.healthStatus);

  if (mode === 'single') {
    return (
      <select
        id={controlId}
        name={controlId}
        value={selectedPmuIds[0] ?? ''}
        onChange={event => onChange(event.target.value ? [event.target.value] : [])}
        disabled={disabled}
        style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }}
      >
        <option value="">PMU seçin...</option>
        {PMU_FIDERS.map(pmu => (
          <option key={pmu.id} value={pmu.id}>{formatGkcHealthLabel(pmu.name, healthStatus[pmu.id]?.status)}</option>
        ))}
      </select>
    );
  }

  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: 6, padding: 6, background: 'var(--bg-primary)', maxHeight: 138, overflow: 'auto' }}>
      {PMU_FIDERS.map(pmu => {
        const checked = selectedPmuIds.includes(pmu.id);
        const limitReached = selectedPmuIds.length >= 6 && !checked;
        const checkboxId = `${controlId}-${pmu.id}`;
        const healthVisual = getGkcHealthVisual(healthStatus[pmu.id]?.status);
        return (
          <label key={pmu.id} htmlFor={checkboxId} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, padding: '3px 0', color: limitReached ? 'var(--text-muted)' : 'var(--text-primary)' }}>
            <input
              id={checkboxId}
              name={checkboxId}
              type="checkbox"
              checked={checked}
              disabled={disabled || limitReached}
              onChange={event => {
                if (event.target.checked) {
                  onChange([...selectedPmuIds, pmu.id]);
                } else {
                  onChange(selectedPmuIds.filter(id => id !== pmu.id));
                }
              }}
            />
            <span title={healthVisual.title} style={{ color: healthVisual.color, fontSize: 13, lineHeight: 1 }}>{healthVisual.bullet}</span>
            <span>{pmu.name}</span>
          </label>
        );
      })}
    </div>
  );
}
