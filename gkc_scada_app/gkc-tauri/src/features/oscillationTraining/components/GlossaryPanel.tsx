import { GLOSSARY_SECTIONS } from '../data/glossary.ts';

export function GlossaryPanel() {
  return (
    <section className="training-panel">
      <div className="training-section-header">
        <h2>Terimler Sözlüğü</h2>
        <p>Salınım eğitimi sekmelerinde geçen kısaltmalar, metrikler, analiz yöntemleri ve kontrol kavramları sayfa bağlamıyla birlikte açıklanır.</p>
      </div>
      <div className="training-glossary-grid">
        {GLOSSARY_SECTIONS.map(section => (
          <article className="training-info-card training-glossary-section" key={section.title}>
            <h3>{section.title}</h3>
            <p>{section.description}</p>
            <div className="training-glossary-list">
              {section.terms.map(term => (
                <div className="training-glossary-item" key={term.key}>
                  <div>
                    <strong>{term.label}</strong>
                    <span>{term.shortDefinition}</span>
                  </div>
                  <p>{term.definition}</p>
                  <small>{term.sections.map(item => sectionLabel(item)).join(' · ')}</small>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function sectionLabel(sectionId: string) {
  const labels: Record<string, string> = {
    glossary: 'Terimler Sözlüğü',
    context: 'Uygulama Bağlamı',
    modes: 'Salınım Modları',
    pqvf: 'P-Q-V-f',
    damping: 'Sönümleme',
    detection: 'PMU Algılama',
    sas: 'SAS Çalışması',
    cases: 'Vaka ve Teşhis',
    decision: 'Karar Destek',
  };
  return labels[sectionId] ?? sectionId;
}
