import ReactECharts from 'echarts-for-react';
import { PMU_FIDERS } from '../store/oscillationStore.ts';
import type { PmuSample, PmuSignalKey } from '../types/oscillationTypes.ts';
import { chartBase, PMU_COLORS, SIGNAL_LABELS, SIGNAL_UNITS, toTimeSeries, type OscillationThemeMode } from './chartHelpers.ts';

export function RawDataCharts({
  samplesByPmu,
  selectedPmuIds,
  selectedSignals,
  themeMode,
}: {
  samplesByPmu: Record<string, PmuSample[]>;
  selectedPmuIds: string[];
  selectedSignals: PmuSignalKey[];
  themeMode: OscillationThemeMode;
}) {
  if (!selectedPmuIds.some(pmuId => (samplesByPmu[pmuId] ?? []).length > 0)) {
    return (
      <div className="card">
        <div className="card-body" style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Gerçek YTBS PMU verisi bekleniyor. Veri yoksa analiz veya demo grafik üretilmez.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
      {selectedSignals.map(signal => {
        const option = {
          ...chartBase(themeMode),
          title: { text: `${SIGNAL_LABELS[signal]} Ham Veri`, textStyle: { color: 'var(--text-primary)', fontSize: 13 } },
          legend: { top: 0, right: 58, textStyle: { color: 'var(--text-muted)', fontSize: 10 } },
          xAxis: { type: 'time', axisLabel: { color: 'var(--text-muted)', fontSize: 10 }, axisLine: { lineStyle: { color: 'var(--border-color)' } } },
          yAxis: {
            type: 'value',
            name: SIGNAL_UNITS[signal],
            scale: true,
            axisLabel: { color: 'var(--text-muted)', fontSize: 10 },
            splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.18)' } },
          },
          series: selectedPmuIds.map((pmuId, index) => {
            const pmu = PMU_FIDERS.find(item => item.id === pmuId);
            return {
              name: pmu?.substationName ? `${pmu.substationName} (${pmuId})` : pmuId,
              type: 'line',
              showSymbol: false,
              sampling: 'lttb',
              progressive: 5000,
              data: toTimeSeries(samplesByPmu[pmuId] ?? [], signal),
              lineStyle: { width: 1.2 },
              itemStyle: { color: PMU_COLORS[index % PMU_COLORS.length] },
              connectNulls: false,
            };
          }),
        };

        return (
          <div className="card" key={signal}>
            <div className="card-body" style={{ padding: 6, height: 280 }}>
              <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge={true} lazyUpdate={true} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
