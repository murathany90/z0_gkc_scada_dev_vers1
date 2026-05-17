import ReactECharts from 'echarts-for-react';
import type { CoherenceCell } from '../types/oscillationTypes.ts';
import { formatPmuDisplayName, paletteFor, type OscillationThemeMode } from './chartHelpers.ts';

export function CoherenceMatrix({
  cells,
  themeMode,
}: {
  cells: CoherenceCell[] | undefined;
  themeMode: OscillationThemeMode;
}) {
  if (!cells?.length) {
    return <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Koherens matrisi için en az 2 PMU ve analiz sonucu gerekir.</div>;
  }

  const pmus = [...new Set(cells.flatMap(cell => [cell.sourcePmuId, cell.targetPmuId]))];
  const pmuLabels = pmus.map(pmuId => formatPmuDisplayName(pmuId));
  const palette = paletteFor(themeMode);
  const option = {
    animation: false,
    backgroundColor: 'transparent',
    title: { text: 'Koherens Matrisi', textStyle: { color: palette.text, fontSize: 13 } },
    tooltip: {
      formatter: (params: { value: [number, number, number] }) => {
        const [x, y, value] = params.value;
        return `${pmuLabels[y]} - ${pmuLabels[x]}<br/>Koherens: ${Number(value).toFixed(2)}`;
      },
    },
    grid: { top: 42, left: 64, right: 28, bottom: 36 },
    xAxis: { type: 'category', data: pmuLabels, axisLabel: { color: palette.muted }, axisLine: { lineStyle: { color: palette.axisLine } } },
    yAxis: { type: 'category', data: pmuLabels, axisLabel: { color: palette.muted }, axisLine: { lineStyle: { color: palette.axisLine } } },
    visualMap: {
      min: 0,
      max: 1,
      calculable: true,
      orient: 'horizontal',
      bottom: 0,
      left: 'center',
      textStyle: { color: palette.muted },
      inRange: { color: ['#1e293b', '#2563eb', '#14b8a6', '#22c55e'] },
    },
    series: [{
      type: 'heatmap',
      data: cells.map(cell => [pmus.indexOf(cell.targetPmuId), pmus.indexOf(cell.sourcePmuId), cell.value]),
      label: { show: true, formatter: (params: { value: [number, number, number] }) => Number(params.value[2]).toFixed(2), color: '#fff', fontSize: 10 },
    }],
  };

  return <ReactECharts option={option} style={{ height: 280, width: '100%' }} notMerge={true} lazyUpdate={true} />;
}
