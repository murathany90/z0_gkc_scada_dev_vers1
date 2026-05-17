interface OscillationEmptyStateProps {
  title: string;
  message: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function OscillationEmptyState({
  title,
  message,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}: OscillationEmptyStateProps) {
  return (
    <div className="oscillation-empty-state">
      <div className="oscillation-empty-icon" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="oscillation-empty-copy">
        <div className="oscillation-empty-title">{title}</div>
        <div className="oscillation-empty-message">{message}</div>
      </div>
      {(primaryActionLabel || secondaryActionLabel) && (
        <div className="oscillation-empty-actions">
          {primaryActionLabel && onPrimaryAction && (
            <button type="button" className="btn btn-primary btn-compact" onClick={onPrimaryAction}>
              {primaryActionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button type="button" className="btn btn-outline btn-compact" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
