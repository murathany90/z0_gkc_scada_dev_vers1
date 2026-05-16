import ReactECharts from 'echarts-for-react';
import type { ModeShapePoint } from '../types/oscillationTypes.ts';
import { chartBase, formatMetricNumber, type OscillationThemeMode } from './chartHelpers.ts';

export function ModeShapePanel({
  points,
  themeMode,
}: {
  points: ModeShapePoint[] | undefined;
  themeMode: OscillationThemeMode;
}) {
  if (!points?.length) {
    return <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Tek PMU veya ortak mod bulunamadığı için mode shape hesaplanamaz.</div>;
  }

  const barOption = {
    ...chartBase(themeMode),
    dataZoom: [],
    title: { text: 'PMU Katılım Genliği', textStyle: { color: 'var(--text-primary)', fontSize: 13 } },
    xAxis: { type: 'category', data: points.map(point => point.pmuId), axisLabel: { color: 'var(--text-muted)' } },
    yAxis: { type: 'value', axisLabel: { color: 'var(--text-muted)' }, splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.18)' } } },
    series: [{ type: 'bar', data: points.map(point => point.magnitude), itemStyle: { color: '#38bdf8' } }],
  };

  const polarOption = {
    animation: false,
    title: { text: 'Referansa Göre Faz', textStyle: { color: 'var(--text-primary)', fontSize: 13 } },
    angleAxis: { type: 'value', min: -180, max: 180, axisLabel: { color: 'var(--text-muted)' } },
    radiusAxis: { axisLabel: { color: 'var(--text-muted)' } },
    polar: {},
    tooltip: {
      formatter: (params: { data: [number, number, string] }) =>
        `${params.data[2]}<br/>Faz: ${formatMetricNumber(params.data[0], 1)}°<br/>Genlik: ${formatMetricNumber(params.data[1])}`,
    },
    series: [{
      type: 'scatter',
      coordinateSystem: 'polar',
      data: points.map(point => [point.relativePhaseDegree, point.magnitude, point.pmuId]),
      symbolSize: 10,
      itemStyle: { color: '#22c55e' },
    }],
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <ReactECharts option={barOption} style={{ height: 280, width: '100%' }} notMerge={true} lazyUpdate={true} />
      <ReactECharts option={polarOption} style={{ height: 280, width: '100%' }} notMerge={true} lazyUpdate={true} />
      <div style={{ gridColumn: '1 / -1', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', background: 'var(--table-header-bg)' }}>
              <th style={{ textAlign: 'left', padding: 6 }}>PMU</th>
              <th style={{ textAlign: 'right', padding: 6 }}>Genlik</th>
              <th style={{ textAlign: 'right', padding: 6 }}>Faz</th>
              <th style={{ textAlign: 'right', padding: 6 }}>Referansa Göre Faz</th>
              <th style={{ textAlign: 'right', padding: 6 }}>Ortalama Koherens</th>
            </tr>
          </thead>
          <tbody>
            {points.map(point => (
              <tr key={point.pmuId} style={{ borderTop: '1px solid var(--border-color)' }}>
                <td style={{ padding: 6 }}>{point.pmuName}</td>
                <td style={{ padding: 6, textAlign: 'right' }}>{formatMetricNumber(point.magnitude)}</td>
                <td style={{ padding: 6, textAlign: 'right' }}>{formatMetricNumber(point.phaseDegree, 1)}°</td>
                <td style={{ padding: 6, textAlign: 'right' }}>{formatMetricNumber(point.relativePhaseDegree, 1)}°</td>
                <td style={{ padding: 6, textAlign: 'right' }}>{formatMetricNumber(point.coherenceAverage, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
