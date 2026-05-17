import { OSCILLATION_SIGNAL_TABS } from '../store/oscillationStore.ts';
import type { PmuSignalKey } from '../types/oscillationTypes.ts';
import { SIGNAL_LABELS } from './chartHelpers.ts';

export function OscillationSignalTabs({
  activeSignal,
  onChange,
}: {
  activeSignal: PmuSignalKey;
  onChange: (signal: PmuSignalKey) => void;
}) {
  return (
    <div className="oscillation-signal-tabs" role="tablist" aria-label="Salınım sinyal sekmeleri">
      {OSCILLATION_SIGNAL_TABS.map(signal => (
        <button
          key={signal}
          type="button"
          role="tab"
          aria-selected={activeSignal === signal}
          className={`oscillation-signal-tab${activeSignal === signal ? ' active' : ''}`}
          onClick={() => onChange(signal)}
        >
          {SIGNAL_LABELS[signal]}
        </button>
      ))}
    </div>
  );
}
