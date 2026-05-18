import ReactECharts from 'echarts-for-react';

export type TrainingThemeMode = 'light' | 'dark';

export const trainingChartPalette = (themeMode: TrainingThemeMode) => themeMode === 'light'
  ? {
    title: '#0f172a',
    text: '#0f172a',
    muted: '#475569',
    axis: '#64748b',
    axisLine: '#cbd5e1',
    splitLine: 'rgba(148, 163, 184, 0.34)',
    tooltipBg: 'rgba(255, 255, 255, 0.98)',
    tooltipBorder: '#cbd5e1',
    panel: '#ffffff',
  }
  : {
    title: '#f3f4f6',
    text: '#e2e8f0',
    muted: '#94a3b8',
    axis: '#94a3b8',
    axisLine: '#334155',
    splitLine: 'rgba(148, 163, 184, 0.16)',
    tooltipBg: 'rgba(17, 24, 39, 0.96)',
    tooltipBorder: '#374151',
    panel: '#111827',
  };

export function withTrainingChartDefaults(option: Record<string, unknown>, themeMode: TrainingThemeMode) {
  const palette = trainingChartPalette(themeMode);
  const baseXAxis = {
    type: 'value',
    nameLocation: 'middle',
    nameGap: 24,
    nameTextStyle: { color: palette.axis, fontSize: 10 },
    axisLabel: { color: palette.axis, fontSize: 10 },
    axisLine: { lineStyle: { color: palette.axisLine } },
    splitLine: { lineStyle: { color: palette.splitLine } },
  };
  const baseYAxis = {
    type: 'value',
    nameLocation: 'middle',
    nameGap: 34,
    nameTextStyle: { color: palette.axis, fontSize: 10 },
    axisLabel: { color: palette.axis, fontSize: 10 },
    axisLine: { lineStyle: { color: palette.axisLine } },
    splitLine: { lineStyle: { color: palette.splitLine } },
  };
  const mergeAxis = (base: Record<string, unknown>, axis: unknown) => {
    if (!axis || typeof axis !== 'object') return base;
    const axisRecord = axis as Record<string, unknown>;
    return {
      ...base,
      ...axisRecord,
      axisLabel: { ...(base.axisLabel as Record<string, unknown>), ...((axisRecord.axisLabel as Record<string, unknown> | undefined) ?? {}) },
      axisLine: { ...(base.axisLine as Record<string, unknown>), ...((axisRecord.axisLine as Record<string, unknown> | undefined) ?? {}) },
      splitLine: { ...(base.splitLine as Record<string, unknown>), ...((axisRecord.splitLine as Record<string, unknown> | undefined) ?? {}) },
      nameTextStyle: { ...(base.nameTextStyle as Record<string, unknown>), ...((axisRecord.nameTextStyle as Record<string, unknown> | undefined) ?? {}) },
    };
  };
  const xAxis = Array.isArray(option.xAxis)
    ? option.xAxis.map(axis => mergeAxis(baseXAxis, axis))
    : mergeAxis(baseXAxis, option.xAxis);
  const yAxis = Array.isArray(option.yAxis)
    ? option.yAxis.map(axis => mergeAxis(baseYAxis, axis))
    : mergeAxis(baseYAxis, option.yAxis);
  return {
    animation: false,
    backgroundColor: 'transparent',
    color: ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4'],
    textStyle: { color: palette.text, fontFamily: 'Inter, system-ui, sans-serif' },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: palette.tooltipBg,
      borderColor: palette.tooltipBorder,
      textStyle: { color: palette.text, fontSize: 11 },
      padding: 8,
    },
    legend: {
      top: 0,
      right: 8,
      textStyle: { color: palette.muted, fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10,
    },
    grid: {
      top: 42,
      left: 46,
      right: 22,
      bottom: 34,
      containLabel: true,
    },
    ...option,
    xAxis,
    yAxis,
  };
}

export function OscillationTrainingChart({
  option,
  themeMode,
  height = 280,
}: {
  option: Record<string, unknown>;
  themeMode: TrainingThemeMode;
  height?: number | string;
}) {
  return (
    <ReactECharts
      option={withTrainingChartDefaults(option, themeMode)}
      style={{ height, width: '100%' }}
      notMerge={true}
      lazyUpdate={true}
    />
  );
}
