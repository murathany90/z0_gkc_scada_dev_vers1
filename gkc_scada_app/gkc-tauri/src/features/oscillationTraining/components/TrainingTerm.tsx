import { useId } from 'react';
import type { ReactNode } from 'react';
import { GLOSSARY_LOOKUP } from '../data/glossary.ts';

export function TrainingTerm({
  term,
  children,
}: {
  term: string;
  children: ReactNode;
}) {
  const tooltipId = useId();
  const glossaryTerm = GLOSSARY_LOOKUP.get(term.toLocaleLowerCase('tr-TR'));
  if (!glossaryTerm) {
    return <span>{children}</span>;
  }
  return (
    <span className="training-term" tabIndex={0} aria-describedby={tooltipId}>
      <span className="training-term-label">{children}</span>
      <span className="training-term-tooltip" role="tooltip" id={tooltipId}>
        <strong>{glossaryTerm.label}</strong>
        <span>{glossaryTerm.definition}</span>
      </span>
    </span>
  );
}
