import { PMU_FIDERS, useOscillationStore } from '../store/oscillationStore.ts';
import { MultiPmuAnalysisPanel } from './MultiPmuAnalysisPanel.tsx';
import { OscillationDetailsTabs } from './OscillationDetailsTabs.tsx';
import { OscillationFilterBar } from './OscillationFilterBar.tsx';
import { RawDataCharts } from './RawDataCharts.tsx';
import { SinglePmuAnalysisPanel } from './SinglePmuAnalysisPanel.tsx';
import type { OscillationThemeMode } from './chartHelpers.ts';

export function OscillationPage({ themeMode }: { themeMode: OscillationThemeMode }) {
  const store = useOscillationStore();
  const pmuDevices = PMU_FIDERS.filter(pmu => store.selectedPmuIds.includes(pmu.id));

  return (
    <>
      <OscillationFilterBar />
      {store.error && (
        <div className="card" style={{ borderColor: 'var(--accent-red)', marginBottom: 12 }}>
          <div className="card-body" style={{ color: 'var(--accent-red)', fontSize: 12 }}>{store.error}</div>
        </div>
      )}
      <div className="grid-3" style={{ marginBottom: 12 }}>
        <div className="stat-card"><div className="stat-label">Seçilen PMU</div><div className="stat-value">{store.selectedPmuIds.length}<span className="stat-unit">/6</span></div></div>
        <div className="stat-card"><div className="stat-label">Gerçek Örnek</div><div className="stat-value">{store.rawSamples.length}</div></div>
        <div className="stat-card"><div className="stat-label">Analiz Durumu</div><div className="stat-value" style={{ fontSize: 16 }}>{store.analysisResult ? 'Bulgu hazır' : store.rawSamples.length ? 'Veri hazır' : 'Veri bekleniyor'}</div></div>
      </div>
      <RawDataCharts samplesByPmu={store.samplesByPmu} selectedPmuIds={store.selectedPmuIds} selectedSignals={store.selectedSignals} themeMode={themeMode} />
      <div style={{ marginTop: 12 }}>
        {store.selectionMode === 'multi'
          ? <MultiPmuAnalysisPanel result={store.analysisResult} themeMode={themeMode} />
          : <SinglePmuAnalysisPanel result={store.analysisResult} themeMode={themeMode} />}
      </div>
      <div style={{ marginTop: 12 }}>
        <OscillationDetailsTabs
          activeTab={store.activeTab}
          onTabChange={store.setActiveTab}
          result={store.analysisResult}
          samples={store.rawSamples}
          pmuDevices={pmuDevices}
          reportMarkdown={store.reportMarkdown}
        />
      </div>
    </>
  );
}
