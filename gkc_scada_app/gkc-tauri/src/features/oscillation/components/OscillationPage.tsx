import { PMU_FIDERS, useOscillationStore } from '../store/oscillationStore.ts';
import { OscillationDetailsTabs } from './OscillationDetailsTabs.tsx';
import { OscillationFilterBar } from './OscillationFilterBar.tsx';
import { OscillationPrintReport } from './OscillationPrintReport.tsx';
import { OscillationSignalTabs } from './OscillationSignalTabs.tsx';
import { RawDataCharts } from './RawDataCharts.tsx';
import { EnergyAmplitudeCharts, ModeDampingChart } from './WindowMetricsCharts.tsx';
import type { OscillationThemeMode } from './chartHelpers.ts';

export function OscillationPage({ themeMode }: { themeMode: OscillationThemeMode }) {
  const store = useOscillationStore();
  const pmuDevices = PMU_FIDERS.filter(pmu => store.selectedPmuIds.includes(pmu.id));
  const handleFetch = () => { void store.fetchPmuData(); };
  const handleRunAnalysis = () => { void store.runAnalysis(); };
  const handlePrintReport = () => {
    if (!store.analysisResult) return;
    window.setTimeout(() => window.print(), 160);
  };

  return (
    <>
      <OscillationFilterBar onPrintReport={handlePrintReport} />
      {store.error && (
        <div className="card" style={{ borderColor: 'var(--accent-red)', marginBottom: 12 }}>
          <div className="card-body" style={{ color: 'var(--accent-red)', fontSize: 12 }}>{store.error}</div>
        </div>
      )}
      <OscillationSignalTabs activeSignal={store.activeSignalTab} signals={store.selectedSignals} onChange={store.setActiveSignalTab} />
      <div className="oscillation-signal-chart-stack">
        <RawDataCharts
          samplesByPmu={store.samplesByPmu}
          selectedPmuIds={store.selectedPmuIds}
          signal={store.activeSignalTab}
          themeMode={themeMode}
          metrics={store.analysisResult?.windowMetrics ?? []}
          smoothingSettings={store.smoothingSettings}
          rawSignalDisplayModes={store.rawSignalDisplayModes}
          onRawSignalDisplayModeChange={store.setRawSignalDisplayMode}
          onLoadDemo={store.loadDemoData}
          onFetchData={handleFetch}
        />
        <ModeDampingChart
          metrics={store.analysisResult?.windowMetrics ?? []}
          signal={store.activeSignalTab}
          themeMode={themeMode}
          hasSamples={store.rawSamples.length > 0}
          onLoadDemo={store.loadDemoData}
          onRunAnalysis={handleRunAnalysis}
          windowSeconds={store.windowSeconds}
          stepSeconds={store.stepSeconds}
        />
        <EnergyAmplitudeCharts
          metrics={store.analysisResult?.windowMetrics ?? []}
          signal={store.activeSignalTab}
          themeMode={themeMode}
          hasSamples={store.rawSamples.length > 0}
          onLoadDemo={store.loadDemoData}
          onRunAnalysis={handleRunAnalysis}
        />
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
      <OscillationPrintReport
        result={store.analysisResult}
        pmuDevices={pmuDevices}
        samplesByPmu={store.samplesByPmu}
        selectedPmuIds={store.selectedPmuIds}
        smoothingSettings={store.smoothingSettings}
        windowSeconds={store.windowSeconds}
        stepSeconds={store.stepSeconds}
      />
    </>
  );
}
