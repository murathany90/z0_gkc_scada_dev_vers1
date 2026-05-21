import { useMemo } from 'react';
import {
  GLOSSARY_SECTIONS,
  type TrainingGlossaryTerm,
} from '../data/glossary.ts';
import {
  buildCaseSimulation,
  TRAINING_CASES,
  type TrainingCaseId,
} from '../data/trainingCases.ts';
import {
  assessDampingRatio,
  buildDampedOscillation,
  buildPqvfDetectionSpectrum,
  buildSasInterareaSimulation,
  buildSlidingWindowSimulation,
  buildTrainingPqvfSimulation,
  TRAINING_MODE_DEFS,
  type SasInterareaSimulation,
  type SasInterareaTabId,
  type TrainingModeId,
} from '../utils/simulationModels.ts';
import { buildTrainingPrintDocumentModel } from '../utils/trainingPrintDocument.ts';

import dynamicsInertia from '../assets/dynamics_p02_synchronization_inertia.jpg';
import dynamicsDamping from '../assets/dynamics_p03_anatomy_damping_energy.jpg';
import dynamicsSpectrum from '../assets/dynamics_p04_oscillation_spectrum.jpg';
import fbmswaTools from '../assets/fbmswa_p03_tools.jpg';
import fbmswaArchitecture from '../assets/fbmswa_p05_architecture.jpg';
import fbmswaActionSignal from '../assets/fbmswa_p09_action_signal.jpg';
import bastsBrain from '../assets/grid_pulse_p03_basts_digital_brain.jpg';
import dualWindow from '../assets/grid_pulse_p06_dual_window_fft.jpg';
import pipeline from '../assets/grid_pulse_p07_pipeline.jpg';
import thresholds from '../assets/grid_pulse_p08_thresholds.jpg';
import frequencyBands from '../assets/stability_p03_frequency_bands.jpg';
import comparisonMatrix from '../assets/stability_p04_comparison_matrix.jpg';
import pqvfResponse from '../assets/stability_p09_pqvf_response.jpg';
import powerFrequency from '../assets/stability_p10_power_frequency.jpg';
import resim1 from '../assets/asset2/Resim1.jpg';
import resim2 from '../assets/asset2/Resim2.jpg';
import resim3 from '../assets/asset2/Resim3.jpg';
import resim4 from '../assets/asset2/Resim4.jpg';
import resim5 from '../assets/asset2/Resim5.jpg';
import resim6 from '../assets/asset2/Resim6.jpg';
import resim7 from '../assets/asset2/Resim7.jpg';
import resim8 from '../assets/asset2/Resim8.jpg';
import resim9 from '../assets/asset2/Resim9.jpg';
import resim10 from '../assets/asset2/Resim10.jpg';
import resim11 from '../assets/asset2/Resim11.jpg';

interface PrintFigure {
  src: string;
  title: string;
  caption: string;
}

const figureGroups = {
  context: [
    { src: bastsBrain, title: 'Algı-karar-aksiyon zinciri', caption: 'PMU ölçümü, modal bulgu, karar destek ve operatör aksiyonu aynı okuma akışında değerlendirilir.' },
    { src: dynamicsInertia, title: 'Senkronizasyon ve atalet', caption: 'Jeneratör grupları elektromekanik bağ üzerinden birlikte hareket eder.' },
  ],
  modes: [
    { src: frequencyBands, title: 'Frekans bantları', caption: 'Bölgeler arası, yerel, zorlanmış ve torsiyonel bantlar frekans ekseninde ayrılır.' },
    { src: comparisonMatrix, title: 'Mod karşılaştırması', caption: 'Frekans, coğrafi etki, kök neden ve müdahale stratejisi birlikte okunmalıdır.' },
  ],
  pqvf: [
    { src: pqvfResponse, title: 'P-Q-V-f birlikte okuma', caption: 'Aynı olayda güç, gerilim ve frekans farklı faz/gecikme davranışları gösterebilir.' },
    { src: powerFrequency, title: 'Aktif güç ve frekans', caption: 'Aktif güç dalgalanması ile frekans cevabı birlikte salınım türünü güçlendirir.' },
  ],
  damping: [
    { src: dynamicsDamping, title: 'Sönümleme ve enerji', caption: 'Sönümleme oranı, genlik zarfı ve enerji göstergesi birlikte değerlendirilir.' },
    { src: dynamicsSpectrum, title: 'Spektrum okuma', caption: 'Baskın frekans bandı mod tanısı için ilk güçlü ipucudur.' },
  ],
  detection: [
    { src: fbmswaTools, title: 'Kayan pencere araçları', caption: 'Akan PMU verisi kısa analiz kesitlerine ayrılarak frekans alanında incelenir.' },
    { src: pipeline, title: 'İşleme hattı', caption: 'Örnekleme, filtreleme, pencereleme ve spektrum adımları operatör bulgusuna dönüşür.' },
  ],
  sas: [
    { src: fbmswaActionSignal, title: 'Aksiyon sinyali referansı', caption: 'FBMSWA teşhisi -1, 0 veya +1 aksiyon seviyesi olarak okunur.' },
    { src: dualWindow, title: 'Çift pencere yaklaşımı', caption: 'Kısa pencere genliği hızlı yakalar; uzun pencere faz/yön doğruluğunu güçlendirir.' },
    { src: thresholds, title: 'Eşik ve histerezis', caption: 'Tetikleme ve kapanma eşikleri yalancı kararları azaltmak için ayrı tutulur.' },
    { src: fbmswaArchitecture, title: 'FBMSWA mimarisi', caption: 'Giriş, wash-out, kısa/uzun pencere ve karar sinyali kavramsal akış olarak gösterilir.' },
  ],
  decision: [
    { src: bastsBrain, title: 'Algılama ve karar zinciri', caption: 'PMU ölçümü, modal bulgu, karar destek ve operatör aksiyonu tek uygulama akışında birleşir.' },
    { src: pqvfResponse, title: 'P-Q-V-f analiz kabiliyeti', caption: 'Frekans, aktif güç, reaktif güç ve gerilim aynı olay penceresinde birlikte değerlendirilir.' },
    { src: fbmswaActionSignal, title: 'SAS-C eğitim simülasyonu', caption: 'Lokal bara pulse mantığı eğitim grafikleriyle gösterilir.' },
  ],
} satisfies Record<string, PrintFigure[]>;

const caseAssetMap: Record<string, string> = {
  'Resim1.jpg': resim1,
  'Resim2.jpg': resim2,
  'Resim3.jpg': resim3,
  'Resim4.jpg': resim4,
  'Resim5.jpg': resim5,
  'Resim6.jpg': resim6,
  'Resim7.jpg': resim7,
  'Resim8.jpg': resim8,
  'Resim9.jpg': resim9,
  'Resim10.jpg': resim10,
  'Resim11.jpg': resim11,
};

const linePairs = (time: number[], values: number[]): Array<[number, number]> => time.map((timeSeconds, index) => [timeSeconds, values[index]]);
const pointPairs = (points: Array<{ timeSeconds: number; value: number }>): Array<[number, number]> => points.map(point => [point.timeSeconds, point.value]);
const pairSeries = (times: number[], values: number[]): Array<[number, number]> => times.map((timeSeconds, index) => [timeSeconds, values[index]]);
const chartColors = ['#2563eb', '#10b981', '#ef4444', '#f59e0b', '#7c3aed', '#06b6d4', '#f97316'];

function printLine(name: string, data: Array<[number, number]>, color: string, extra: Record<string, unknown> = {}) {
  return {
    name,
    type: 'line',
    showSymbol: false,
    data,
    lineStyle: { width: 1.8, color },
    itemStyle: { color },
    ...extra,
  };
}

function printBar(name: string, data: Array<[number, number]>, color: string, extra: Record<string, unknown> = {}) {
  return {
    name,
    type: 'bar',
    data,
    barMaxWidth: 8,
    itemStyle: { color },
    ...extra,
  };
}

function pageHeader(number: string, title: string, subtitle?: string) {
  return (
    <header className="training-print-page-header">
      <div>
        <span>{number}</span>
        <h2>{title}</h2>
      </div>
      {subtitle && <p>{subtitle}</p>}
    </header>
  );
}

function MetricTable({ rows }: { rows: Array<[string, string]> }) {
  return (
    <table className="training-print-table">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <th>{label}</th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PrintChart({ title, subtitle, option, height = 132 }: { title: string; subtitle?: string; option: Record<string, unknown>; height?: number }) {
  return (
    <div className="training-print-chart">
      <div className="training-print-chart-title">
        <strong>{title}</strong>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <TrainingPrintSvgChart option={option} height={height} />
    </div>
  );
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function seriesArray(option: Record<string, unknown>) {
  return Array.isArray(option.series) ? option.series.map(record) : [];
}

function axisRecord(axis: unknown) {
  return Array.isArray(axis) ? record(axis[0]) : record(axis);
}

function seriesColor(series: Record<string, unknown>, index: number) {
  const itemStyle = record(series.itemStyle);
  const lineStyle = record(series.lineStyle);
  return String(itemStyle.color ?? lineStyle.color ?? chartColors[index % chartColors.length]);
}

function dataPoint(raw: unknown, index: number): [number, number] | null {
  if (Array.isArray(raw)) {
    const x = Number(raw[0]);
    const y = Number(raw[1]);
    return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
  }
  const rawRecord = record(raw);
  if ('value' in rawRecord) {
    const value = rawRecord.value;
    if (Array.isArray(value)) {
      const x = Number(value[0]);
      const y = Number(value[1]);
      return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
    }
    const y = Number(value);
    return Number.isFinite(y) ? [index, y] : null;
  }
  return null;
}

function seriesPoints(series: Record<string, unknown>): Array<[number, number]> {
  const data = Array.isArray(series.data) ? series.data : [];
  return data.map(dataPoint).filter((point): point is [number, number] => Boolean(point));
}

function lineSegments(points: Array<[number, number]>, xScale: (value: number) => number, yScale: (value: number) => number) {
  const segments: string[] = [];
  let current = '';
  for (const [x, y] of points) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      if (current) segments.push(current);
      current = '';
      continue;
    }
    const command = current ? 'L' : 'M';
    current += `${command}${xScale(x).toFixed(1)},${yScale(y).toFixed(1)} `;
  }
  if (current) segments.push(current);
  return segments;
}

function normalizeDomain(values: number[], fallbackMin: number, fallbackMax: number) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return [fallbackMin, fallbackMax] as const;
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (Math.abs(max - min) < 0.000001) return [min - 1, max + 1] as const;
  return [min, max] as const;
}

function TrainingPrintSvgChart({ option, height }: { option: Record<string, unknown>; height: number }) {
  const width = 640;
  const viewHeight = Math.max(116, height);
  const padding = { left: 42, right: 12, top: 12, bottom: 28 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = viewHeight - padding.top - padding.bottom;
  const xAxis = axisRecord(option.xAxis);
  const yAxis = axisRecord(option.yAxis);
  const allSeries = seriesArray(option);
  const heatmap = allSeries.find(series => series.type === 'heatmap');
  const graph = allSeries.find(series => series.type === 'graph');
  const lineLike = allSeries.filter(series => series.type !== 'heatmap' && series.type !== 'graph');
  const allPoints = lineLike.flatMap(seriesPoints);
  const [xMinAuto, xMaxAuto] = normalizeDomain(allPoints.map(point => point[0]), 0, 1);
  const xMin = Number.isFinite(Number(xAxis.min)) ? Number(xAxis.min) : xMinAuto;
  const xMax = Number.isFinite(Number(xAxis.max)) ? Number(xAxis.max) : xMaxAuto;
  const globalValues = allPoints.map(point => point[1]);
  const [globalYMin, globalYMax] = normalizeDomain(globalValues, -1, 1);
  const yMin = Number.isFinite(Number(yAxis.min)) ? Number(yAxis.min) : globalYMin;
  const yMax = Number.isFinite(Number(yAxis.max)) ? Number(yAxis.max) : globalYMax;
  const xScale = (value: number) => padding.left + (value - xMin) / Math.max(0.000001, xMax - xMin) * plotWidth;
  const yScaleGlobal = (value: number) => padding.top + (1 - (value - yMin) / Math.max(0.000001, yMax - yMin)) * plotHeight;

  if (heatmap) {
    const data = Array.isArray(heatmap.data) ? heatmap.data : [];
    const cells = data.filter(Array.isArray) as Array<[number, number, number]>;
    const maxX = Math.max(1, ...cells.map(cell => Number(cell[0]) + 1));
    const maxY = Math.max(1, ...cells.map(cell => Number(cell[1]) + 1));
    return (
      <svg className="training-print-svg-chart" viewBox={`0 0 ${width} ${viewHeight}`} role="img" aria-label="Zaman-frekans yoğunluğu">
        <rect x="0" y="0" width={width} height={viewHeight} fill="#ffffff" />
        {cells.map((cell, index) => {
          const value = Math.max(0, Math.min(1, Number(cell[2])));
          const hue = 220 - value * 170;
          return <rect key={index} x={padding.left + Number(cell[0]) / maxX * plotWidth} y={padding.top + Number(cell[1]) / maxY * plotHeight} width={plotWidth / maxX + 0.6} height={plotHeight / maxY + 0.6} fill={`hsl(${hue}, 76%, ${32 + value * 28}%)`} />;
        })}
        <text x={padding.left} y={viewHeight - 7}>Pencere</text>
        <text x="4" y={padding.top + 12}>Frekans</text>
      </svg>
    );
  }

  if (graph) {
    const nodes = (Array.isArray(graph.data) ? graph.data : []).map((item, index) => {
      const itemRecord = record(item);
      const value = Array.isArray(itemRecord.value) ? itemRecord.value.map(Number) : [index * 12 + 10, 50];
      return {
        name: String(itemRecord.name ?? `PMU-${index + 1}`),
        x: Number(value[0]),
        y: Number(value[1]),
        size: Number(itemRecord.symbolSize ?? 20),
        color: seriesColor(record(item), index),
      };
    });
    const [nodeXMin, nodeXMax] = normalizeDomain(nodes.map(node => node.x), 0, 100);
    const [nodeYMin, nodeYMax] = normalizeDomain(nodes.map(node => node.y), 0, 100);
    const nodeX = (value: number) => padding.left + (value - nodeXMin) / Math.max(1, nodeXMax - nodeXMin) * plotWidth;
    const nodeY = (value: number) => padding.top + (1 - (value - nodeYMin) / Math.max(1, nodeYMax - nodeYMin)) * plotHeight;
    return (
      <svg className="training-print-svg-chart" viewBox={`0 0 ${width} ${viewHeight}`} role="img" aria-label="Mode shape">
        <rect x="0" y="0" width={width} height={viewHeight} fill="#ffffff" />
        {nodes.slice(0, -1).map((node, index) => <line key={`${node.name}-${index}`} x1={nodeX(node.x)} y1={nodeY(node.y)} x2={nodeX(nodes[index + 1].x)} y2={nodeY(nodes[index + 1].y)} stroke="#cbd5e1" strokeWidth="1.2" />)}
        {nodes.map(node => (
          <g key={node.name}>
            <circle cx={nodeX(node.x)} cy={nodeY(node.y)} r={Math.max(5, node.size / 3.5)} fill={node.color} opacity="0.9" />
            <text x={nodeX(node.x) + 7} y={nodeY(node.y) + 3}>{node.name}</text>
          </g>
        ))}
      </svg>
    );
  }

  return (
    <svg className="training-print-svg-chart" viewBox={`0 0 ${width} ${viewHeight}`} role="img" aria-label="Eğitim grafiği">
      <rect x="0" y="0" width={width} height={viewHeight} fill="#ffffff" />
      <line x1={padding.left} y1={padding.top + plotHeight} x2={padding.left + plotWidth} y2={padding.top + plotHeight} stroke="#cbd5e1" />
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="#cbd5e1" />
      {[0, 0.25, 0.5, 0.75, 1].map(tick => (
        <line key={tick} x1={padding.left} y1={padding.top + plotHeight * tick} x2={padding.left + plotWidth} y2={padding.top + plotHeight * tick} stroke="#e5e7eb" strokeWidth="0.8" />
      ))}
      {lineLike.map((series, seriesIndex) => {
        const points = seriesPoints(series);
        const color = seriesColor(series, seriesIndex);
        const type = String(series.type ?? 'line');
        const values = points.map(point => point[1]);
        const [seriesYMin, seriesYMax] = normalizeDomain(values, yMin, yMax);
        const yScale = lineLike.length > 1
          ? (value: number) => padding.top + (1 - (value - seriesYMin) / Math.max(0.000001, seriesYMax - seriesYMin)) * plotHeight
          : yScaleGlobal;
        if (type === 'bar') {
          const barWidth = Math.max(2, plotWidth / Math.max(1, points.length) * 0.7);
          return (
            <g key={String(series.name ?? seriesIndex)}>
              {points.map(([x, y], index) => {
                const xPos = xScale(x) - barWidth / 2;
                const yPos = yScale(Math.max(0, y));
                const base = yScale(0);
                return <rect key={index} x={xPos} y={Math.min(yPos, base)} width={barWidth} height={Math.max(1, Math.abs(base - yPos))} fill={color} opacity="0.72" />;
              })}
            </g>
          );
        }
        return (
          <g key={String(series.name ?? seriesIndex)}>
            {lineSegments(points, xScale, yScale).map((path, index) => <path key={index} d={path} fill="none" stroke={color} strokeWidth="1.8" opacity="0.95" />)}
          </g>
        );
      })}
      <text x={padding.left} y={viewHeight - 7}>{String(xAxis.name ?? 'Zaman')}</text>
      <text x="4" y={padding.top + 12}>{String(yAxis.name ?? '')}</text>
      <g transform={`translate(${padding.left + 4}, ${padding.top + 4})`}>
        {lineLike.slice(0, 6).map((series, index) => (
          <g key={String(series.name ?? index)} transform={`translate(${index * 96}, 0)`}>
            <rect width="8" height="8" fill={seriesColor(series, index)} />
            <text x="11" y="8">{String(series.name ?? `Seri ${index + 1}`).slice(0, 18)}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function FigureRow({ figures }: { figures: PrintFigure[] }) {
  if (!figures.length) return null;
  return (
    <div className="training-print-figure-row">
      {figures.map(figure => (
        <figure key={figure.src}>
          <img src={figure.src} alt={figure.title} />
          <figcaption>
            <strong>{figure.title}</strong>
            <span>{figure.caption}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function glossaryTerms() {
  return GLOSSARY_SECTIONS.flatMap(section => section.terms.map(term => ({ section: section.title, term })));
}

function modeChartOption(modeId: TrainingModeId) {
  const mode = TRAINING_MODE_DEFS[modeId];
  const oscillation = buildDampedOscillation({
    frequencyHz: mode.frequencyHz,
    dampingRatioPercent: modeId === 'forced' ? 0 : mode.dampingRatioPercent,
    durationSeconds: modeId === 'torsional' ? 8 : 60,
    samplingRateHz: modeId === 'torsional' ? 80 : 20,
  });
  return {
    tooltip: { trigger: 'axis' },
    xAxis: { name: 'Zaman (s)', min: 0 },
    yAxis: { name: 'Sapma (p.u.)', min: -1.25, max: 1.25 },
    series: [
      printLine(mode.label, linePairs(oscillation.time, oscillation.signal), mode.color),
      printLine('Üst zarf', linePairs(oscillation.time, oscillation.envelope), '#64748b', { lineStyle: { width: 1, type: 'dashed', color: '#64748b' } }),
      printLine('Alt zarf', linePairs(oscillation.time, oscillation.envelope.map(value => -value)), '#64748b', { lineStyle: { width: 1, type: 'dashed', color: '#64748b' } }),
    ],
  };
}

function modeBandOption() {
  return {
    tooltip: { trigger: 'item' },
    grid: { top: 30, left: 52, right: 20, bottom: 40 },
    xAxis: { name: 'Frekans (Hz)', min: 0, max: 5 },
    yAxis: { type: 'category', data: ['Interarea', 'Local', 'Forced', 'SSO/IBR'] },
    series: [{
      name: 'Mod frekansı',
      type: 'scatter',
      symbolSize: 13,
      data: Object.values(TRAINING_MODE_DEFS).map(mode => [
        Math.min(mode.frequencyHz, 5),
        mode.shortLabel === 'Interarea' ? 'Interarea' : mode.shortLabel === 'Local' ? 'Local' : mode.shortLabel === 'Forced' ? 'Forced' : 'SSO/IBR',
        mode.label,
      ]),
      markArea: {
        silent: true,
        itemStyle: { color: 'rgba(59, 130, 246, 0.08)' },
        data: [[{ xAxis: 0.1, name: 'Interarea' }, { xAxis: 0.8 }], [{ xAxis: 0.8, name: 'Local' }, { xAxis: 2 }]],
      },
    }],
  };
}

function pqvfChartOption(name: string, time: number[], values: number[], unit: string, color: string, eventStartSeconds: number) {
  return {
    tooltip: { trigger: 'axis' },
    xAxis: { name: 'Zaman (s)', min: 0 },
    yAxis: { name: unit, scale: true },
    series: [{
      name,
      type: 'line',
      showSymbol: false,
      data: linePairs(time, values),
      lineStyle: { width: 1.8, color },
      itemStyle: { color },
      markLine: { symbol: 'none', data: [{ xAxis: eventStartSeconds, name: 'Olay başlangıcı' }], lineStyle: { color: '#ef4444', type: 'dashed' } },
    }],
  };
}

function pqvfSpectrumOption() {
  const spectrum = buildPqvfDetectionSpectrum({ scenario: 'interarea', severity: 1.1 });
  return {
    tooltip: { trigger: 'axis' },
    xAxis: { name: 'Tespit frekansı (Hz)', min: 0, max: 5 },
    yAxis: { name: 'Normalize genlik', min: 0 },
    series: [{
      name: 'Spektrum',
      type: 'line',
      showSymbol: false,
      data: spectrum.spectrum.map(point => [point.frequencyHz, point.amplitude]),
      areaStyle: { opacity: 0.12 },
      lineStyle: { width: 2, color: '#2563eb' },
      itemStyle: { color: '#2563eb' },
      markPoint: {
        symbolSize: 44,
        data: spectrum.modeMarkers.map(marker => ({
          name: marker.label,
          coord: [marker.frequencyHz, marker.mode === 'interarea' ? spectrum.selectedPeak.amplitude : 0.08],
          value: marker.label,
          itemStyle: { color: marker.color },
          label: { color: '#ffffff', fontSize: 9 },
        })),
      },
      markArea: {
        silent: true,
        itemStyle: { color: 'rgba(59, 130, 246, 0.08)' },
        data: [
          [{ xAxis: 0.1, name: 'Interarea' }, { xAxis: 0.8 }],
          [{ xAxis: 0.8, name: 'Local' }, { xAxis: 2 }],
          [{ xAxis: 2, name: 'IBR/SSO' }, { xAxis: 5 }],
        ],
      },
    }],
  };
}

function dampingChartOptions() {
  const damping = buildDampedOscillation({ frequencyHz: 0.5, dampingRatioPercent: 4, durationSeconds: 80, samplingRateHz: 20 });
  return {
    signal: {
      tooltip: { trigger: 'axis' },
      xAxis: { name: 'Zaman (s)', min: 0 },
      yAxis: { name: 'Genlik (p.u.)', scale: true },
      series: [
        printLine('Salınım', linePairs(damping.time, damping.signal), '#3b82f6'),
        printLine('Üst zarf', linePairs(damping.time, damping.envelope), '#64748b', { lineStyle: { width: 1, type: 'dashed', color: '#64748b' } }),
        printLine('Alt zarf', linePairs(damping.time, damping.envelope.map(value => -value)), '#64748b', { lineStyle: { width: 1, type: 'dashed', color: '#64748b' } }),
      ],
    },
    energy: {
      tooltip: { trigger: 'axis' },
      xAxis: { name: 'Zaman (s)', min: 0 },
      yAxis: { name: 'Enerji göstergesi', min: 0 },
      series: [printLine('Enerji', linePairs(damping.time, damping.envelope.map(value => value * value)), '#10b981', { areaStyle: { opacity: 0.15 } })],
    },
  };
}

function detectionChartOptions() {
  const detection = buildSlidingWindowSimulation({
    durationSeconds: 40,
    samplingRateHz: 20,
    windowSeconds: 10,
    windowStartSeconds: 8,
    targetFrequencyHz: 0.35,
    noiseLevel: 0.03,
    seed: 2026,
  });
  return {
    detection,
    time: {
      tooltip: { trigger: 'axis' },
      xAxis: { name: 'Zaman (s)', min: 0, max: 40 },
      yAxis: { name: 'Sapma (p.u.)', scale: true },
      series: [
        printLine('Ham PMU sinyali', pointPairs(detection.rawSeries), '#64748b'),
        printLine('Aktif pencere', pointPairs(detection.windowedSeries), '#2563eb', {
          markArea: { silent: true, itemStyle: { color: 'rgba(59, 130, 246, 0.15)' }, data: [[{ xAxis: detection.window.startSeconds }, { xAxis: detection.window.endSeconds }]] },
        }),
      ],
    },
    spectrum: {
      tooltip: { trigger: 'axis' },
      xAxis: { name: 'Frekans (Hz)', min: 0.2, max: 5 },
      yAxis: { name: 'Genlik', min: 0 },
      series: [printLine('DFT genliği', detection.spectrum.map((point): [number, number] => [point.frequencyHz, point.amplitude]), '#2563eb', {
        areaStyle: { opacity: 0.12 },
        markLine: { symbol: 'none', data: [{ xAxis: 0.35, name: 'Hedef mod' }], lineStyle: { color: '#ef4444', type: 'dashed' } },
      })],
    },
    heatmap: {
      tooltip: { trigger: 'item' },
      grid: { top: 18, left: 48, right: 18, bottom: 34 },
      xAxis: { type: 'category', name: 'Pencere', data: detection.spectrogram.columns.map((_column, index) => String(index + 1)) },
      yAxis: { type: 'category', name: 'Frekans', data: detection.spectrogram.frequencyLabels },
      visualMap: { show: false, min: 0, max: 1, inRange: { color: ['#0f172a', '#2563eb', '#22c55e', '#f59e0b'] } },
      series: [{
        name: 'Zaman-frekans yoğunluğu',
        type: 'heatmap',
        data: detection.spectrogram.columns.flatMap((column, columnIndex) => column.map((value, rowIndex) => [columnIndex, rowIndex, value])),
      }],
    },
  };
}

function sasCharts(simulation: SasInterareaSimulation, tabId: SasInterareaTabId) {
  const times = simulation.times;
  const selectedBus = simulation.buses.find(entry => entry.config.id === tabId);
  if (!selectedBus) {
    const aggregate = simulation.aggregate.series;
    return [
      {
        title: 'Tüm Bara Pulse Tepkileri',
        subtitle: 'Altı baranın -1 / 0 / +1 pulse durumu',
        option: {
          xAxis: { name: 'Zaman (s)', min: 0, max: simulation.durationSeconds },
          yAxis: { name: 'Pulse offset' },
          series: simulation.buses.map((entry, index) => printLine(`${entry.config.shortLabel} pulse`, pairSeries(times, entry.series.pulseLevel.map(value => value + index * 2.6)), ['#2563eb', '#f97316', '#10b981', '#7c3aed', '#ef4444', '#0891b2'][index], { step: 'end' })),
        },
      },
      {
        title: 'Toplam Aktif Güç / Reaktif Komut',
        subtitle: 'Toplam MW etkisi ve toplam MVAr komutu',
        option: {
          xAxis: { name: 'Zaman (s)', min: 0, max: simulation.durationSeconds },
          yAxis: [{ name: 'MW' }, { name: 'MVAr', scale: true }],
          series: [
            printLine('Toplam MW', pairSeries(times, aggregate.totalMw), '#2563eb'),
            printLine('Toplam MVAr', pairSeries(times, aggregate.totalMvar), '#f97316', { yAxisIndex: 1 }),
          ],
        },
      },
      {
        title: 'Toplam MW ve Frekans Değişimi',
        subtitle: 'Frekansa ters polaritede MW sönümleme etkisi',
        option: {
          xAxis: { name: 'Zaman (s)', min: 0, max: simulation.durationSeconds },
          yAxis: [{ name: 'MW' }, { name: 'mHz', scale: true }],
          series: [
            printLine('Toplam MW sönümleme etkisi', pairSeries(times, aggregate.totalDampingMw), '#2563eb'),
            printLine('Frekans değişimi', pairSeries(times, aggregate.frequencyChangeMhz), '#ef4444', { yAxisIndex: 1 }),
          ],
        },
      },
      {
        title: 'Toplam MVAr / Gerilim p.u. / Frekans',
        subtitle: 'Reaktif komut, ortalama gerilim ve frekans değişimi',
        option: {
          xAxis: { name: 'Zaman (s)', min: 0, max: simulation.durationSeconds },
          yAxis: [{ name: 'MVAr / mHz' }, { name: 'p.u.', min: 0.995, max: 1.005 }],
          series: [
            printLine('Toplam MVAr', pairSeries(times, aggregate.totalMvar), '#f97316'),
            printLine('Gerilim p.u.', pairSeries(times, aggregate.voltagePu), '#10b981', { yAxisIndex: 1 }),
            printLine('Frekans değişimi', pairSeries(times, aggregate.frequencyChangeMhz), '#ef4444'),
          ],
        },
      },
    ];
  }
  const series = selectedBus.series;
  return [
    {
      title: 'Ham Frekans + Kayan FFT Pencereleri',
      subtitle: '20 s kısa ve 100 s uzun pencere görseli',
      option: {
        xAxis: { name: 'Zaman (s)', min: 0, max: simulation.durationSeconds },
        yAxis: { name: 'mHz' },
        series: [
          printLine('Ham frekans sapması', pairSeries(times, series.rawMhz), '#2563eb'),
          printLine('Süzülmüş interarea bileşen', pairSeries(times, series.filteredMhz), '#7c3aed'),
          printLine('Tetik eşiği', pairSeries(times, times.map(() => 10)), '#ef4444', { lineStyle: { width: 1.2, type: 'dashed', color: '#ef4444' } }),
        ],
      },
    },
    {
      title: 'Tespit Edilen Genlik ve Enerji',
      subtitle: 'Kısa pencere genliği ve salınım enerjisi',
      option: {
        xAxis: { name: 'Zaman (s)', min: 0, max: simulation.durationSeconds },
        yAxis: [{ name: 'Genlik (mHz)' }, { name: 'Enerji', scale: true }],
        series: [
          printLine('Genlik', pairSeries(times, series.shortAmplitudeMhz), '#f59e0b'),
          printLine('Enerji', pairSeries(times, series.energy), '#10b981', { yAxisIndex: 1 }),
        ],
      },
    },
    {
      title: 'Frekans Eğrisi + FACTS Pulse',
      subtitle: 'Kapasitif +1 / Normal 0 / Endüktif -1',
      option: {
        xAxis: { name: 'Zaman (s)', min: 0, max: simulation.durationSeconds },
        yAxis: [{ name: 'mHz / Pulse' }, { name: 'MVAr', scale: true }],
        series: [
          printLine('Frekans sapması', pairSeries(times, series.rawMhz), '#2563eb'),
          printLine('Pulse x18', pairSeries(times, series.pulseLevel.map(value => value * 18)), '#ef4444', { step: 'end' }),
          printBar('MVAr komutu', pairSeries(times, series.mvar), '#10b981', { yAxisIndex: 1 }),
        ],
      },
    },
    {
      title: 'Mod, Sönümleme ve Güven',
      subtitle: 'Mod frekansı, DR, faz hata ve güven',
      option: {
        xAxis: { name: 'Zaman (s)', min: 0, max: simulation.durationSeconds },
        yAxis: [{ name: 'Hz / %' }, { name: 'Faz / Güven', scale: true }],
        series: [
          printLine('Mod frekansı (Hz)', pairSeries(times, series.modeFrequencyHz), '#06b6d4'),
          printLine('DR (%)', pairSeries(times, series.dampingRatioPercent), '#10b981'),
          printLine('Faz hata (°)', pairSeries(times, series.phaseErrorDegrees), '#f59e0b', { yAxisIndex: 1 }),
          printLine('Güven (%)', pairSeries(times, series.confidencePercent), '#7c3aed', { yAxisIndex: 1 }),
        ],
      },
    },
  ];
}

function caseFigures(assetNames: string[], shortLabel: string): PrintFigure[] {
  return assetNames
    .map((assetName, index) => ({
      src: caseAssetMap[assetName],
      title: `${shortLabel} görsel ${index + 1}`,
      caption: assetName,
    }))
    .filter(figure => Boolean(figure.src));
}

function caseChartOptions(caseId: TrainingCaseId) {
  const simulation = buildCaseSimulation(caseId);
  return {
    simulation,
    frequency: {
      tooltip: { trigger: 'axis' },
      xAxis: { name: 'Zaman (s)', min: 0 },
      yAxis: { name: 'Frekans (Hz)', scale: true },
      series: [printLine('Frekans', pointPairs(simulation.frequencySeries), '#2563eb')],
    },
    damping: {
      tooltip: { trigger: 'axis' },
      xAxis: { name: 'Zaman (s)', min: 0 },
      yAxis: { name: 'DR (%)', scale: true },
      series: [
        printLine('Damping Ratio', pointPairs(simulation.dampingSeries), '#ef4444'),
        printLine('%3 sınırı', simulation.dampingSeries.map((point): [number, number] => [point.timeSeconds, 3]), '#f59e0b', { lineStyle: { width: 1, type: 'dashed', color: '#f59e0b' } }),
      ],
    },
    pqvf: {
      tooltip: { trigger: 'axis' },
      xAxis: { name: 'Zaman (s)', min: 0 },
      yAxis: { name: 'Normalize etki', scale: true },
      series: [
        printLine('P (MW)', pointPairs(simulation.activePowerSeries.map(point => ({ timeSeconds: point.timeSeconds, value: (point.value - 400) / 70 }))), '#2563eb'),
        printLine('Q (MVAr)', pointPairs(simulation.reactivePowerSeries.map(point => ({ timeSeconds: point.timeSeconds, value: (point.value - 30) / 35 }))), '#06b6d4'),
        printLine('V (p.u.)', pointPairs(simulation.voltageSeries.map(point => ({ timeSeconds: point.timeSeconds, value: (point.value - 1) / 0.018 }))), '#10b981'),
      ],
    },
    modeShape: {
      tooltip: { trigger: 'item' },
      xAxis: { show: false, min: 0, max: 100 },
      yAxis: { show: false, min: 0, max: 100 },
      series: [{
        name: 'Mode shape',
        type: 'graph',
        layout: 'none',
        coordinateSystem: 'cartesian2d',
        data: simulation.modeShape.nodes.map(node => ({
          name: node.pmu,
          value: [node.x * 100, (1 - node.y) * 100, node.amplitude, node.phaseDegrees],
          symbolSize: 18 + node.amplitude * 24,
          itemStyle: { color: node.phaseDegrees < 120 ? '#2563eb' : '#f59e0b' },
          label: { show: true, formatter: node.pmu, color: '#111827', fontSize: 10 },
        })),
        links: simulation.modeShape.nodes.slice(0, -1).map((node, index) => ({ source: node.pmu, target: simulation.modeShape.nodes[index + 1].pmu })),
        lineStyle: { color: '#cbd5e1', width: 1.3 },
      }],
    },
    def: {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: simulation.modeShape.defBars.map(bar => bar.pmu), name: 'PMU' },
      yAxis: { name: 'DEF değeri' },
      series: [{
        name: 'Kaynak / soğurucu',
        type: 'bar',
        data: simulation.modeShape.defBars.map(bar => ({ value: bar.value, itemStyle: { color: bar.role === 'source' ? '#ef4444' : '#10b981' } })),
        barMaxWidth: 34,
      }],
    },
  };
}

export function OscillationTrainingPrintDocument() {
  const model = useMemo(() => buildTrainingPrintDocumentModel(), []);
  const pqvf = useMemo(() => buildTrainingPqvfSimulation({ scenario: 'interarea', severity: 1.1, durationSeconds: 40, samplingRateHz: 20 }), []);
  const dampingOptions = useMemo(() => dampingChartOptions(), []);
  const detectionOptions = useMemo(() => detectionChartOptions(), []);
  const sasSimulation = useMemo(() => buildSasInterareaSimulation({ amplitudeMhz: 16, modeFrequencyHz: 0.15, triggerThresholdMhz: 10, dampingPercent: 4 }), []);
  const generatedAt = new Date().toLocaleString('tr-TR');
  const terms = glossaryTerms();

  return (
    <div className="training-print-document" aria-hidden="true">
      <section className="training-print-page training-print-cover">
        <div>
          <p className="training-print-kicker">GKÇ-SCADA / PMU Modal Analiz Eğitim Çıktısı</p>
          <h1>{model.title}</h1>
          <p>{model.subtitle}</p>
          <p className="training-print-date">Oluşturma zamanı: {generatedAt}</p>
        </div>
        <div className="training-print-summary">
          {model.summaryBullets.map(item => <p key={item}>{item}</p>)}
        </div>
        <div className="training-print-toc">
          <h2>İçindekiler</h2>
          {model.toc.map(entry => (
            <div className="training-print-toc-entry" key={entry.id}>
              <span>{entry.headingNumber}</span>
              <strong>{entry.title}</strong>
              {entry.children.length > 0 && (
                <div>
                  {entry.children.map(child => (
                    <p key={child.id}><span>{child.headingNumber}</span>{child.title}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="training-print-page">
        {pageHeader('1', 'Terimler Sözlüğü', 'Eğitim dokümanında geçen teknik terim ve kısaltmalar.')}
        <div className="training-print-glossary">
          {terms.map(({ section, term }: { section: string; term: TrainingGlossaryTerm }) => (
            <article key={term.key}>
              <span>{section}</span>
              <strong>{term.label}</strong>
              <p>{term.shortDefinition}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="training-print-page">
        {pageHeader('2', 'Uygulama Bağlamı', 'Canlı veri üretmeyen eğitim dokümanı; gerçek Salınım Algılayıcı çıktılarının nasıl okunacağını açıklar.')}
        <div className="training-print-two-column">
          <MetricTable rows={[
            ['Veri türü', 'Sentetik eğitim verisi'],
            ['Kullanım', 'Operatör yorum pratiği'],
            ['Çıktı', 'Grafik, tablo ve karar destek dili'],
            ['Ana akış', 'PMU verisi -> P-Q-V-f -> kayan pencere -> damping -> karar destek'],
          ]} />
          <div className="training-print-text-card">
            <h3>Operatör okuma sırası</h3>
            <p>PMU verisi ortak zaman ekseninde izlenir, P-Q-V-f metrikleri aynı olay penceresinde karşılaştırılır, baskın frekans ve genlik kayan pencereyle çıkarılır, damping oranı olayın risk seviyesini belirler.</p>
          </div>
        </div>
        <FigureRow figures={figureGroups.context} />
      </section>

      <section className="training-print-page">
        {pageHeader('3', 'Salınım Modları', 'Mod frekansı, coğrafi etki ve sönümleme birlikte okunur.')}
        <div className="training-print-two-column">
          <PrintChart title="3.1 Bölgeler arası örnek sinyal" subtitle="0.35 Hz interarea" option={modeChartOption('interarea')} />
          <PrintChart title="3.2 Frekans bandı görselleştirmesi" subtitle="Tüm eğitim modları" option={modeBandOption()} />
        </div>
        <table className="training-print-table compact">
          <thead><tr><th>Mod</th><th>Bant</th><th>Operatör yorumu</th></tr></thead>
          <tbody>
            {(Object.keys(TRAINING_MODE_DEFS) as TrainingModeId[]).map(modeId => (
              <tr key={modeId}>
                <th>{TRAINING_MODE_DEFS[modeId].label}</th>
                <td>{TRAINING_MODE_DEFS[modeId].bandLabel}</td>
                <td>{TRAINING_MODE_DEFS[modeId].operatorText}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <FigureRow figures={figureGroups.modes} />
      </section>

      <section className="training-print-page">
        {pageHeader('4', 'P-Q-V-f Simülasyonu', 'Frekans, aktif güç, gerilim ve reaktif güç aynı olay penceresinde birlikte incelenir.')}
        <div className="training-print-chart-grid four">
          <PrintChart title="4.1 Frekans f" subtitle="Hz" option={pqvfChartOption('Frekans', pqvf.time, pqvf.series.frequency, 'Hz', '#10b981', pqvf.eventStartSeconds)} height={104} />
          <PrintChart title="4.2 Aktif Güç P" subtitle="MW" option={pqvfChartOption('Aktif Güç', pqvf.time, pqvf.series.activePower, 'MW', '#3b82f6', pqvf.eventStartSeconds)} height={104} />
          <PrintChart title="4.3 Gerilim V" subtitle="p.u." option={pqvfChartOption('Gerilim', pqvf.time, pqvf.series.voltage, 'p.u.', '#ef4444', pqvf.eventStartSeconds)} height={104} />
          <PrintChart title="4.4 Reaktif Güç Q" subtitle="MVAr" option={pqvfChartOption('Reaktif Güç', pqvf.time, pqvf.series.reactivePower, 'MVAr', '#06b6d4', pqvf.eventStartSeconds)} height={104} />
        </div>
        <div className="training-print-two-column">
          <PrintChart title="4.5 Tespit frekansı / mod bandı" subtitle={pqvf.summary.operatorComment} option={pqvfSpectrumOption()} height={118} />
          <MetricTable rows={[
            ['Baskın frekans', `${pqvf.summary.dominantFrequencyHz.toFixed(2)} Hz`],
            ['Beklenen mod', pqvf.summary.expectedMode],
            ['Genlik etkisi', pqvf.summary.severityLabel],
            ['Operatör yorumu', pqvf.summary.operatorComment],
          ]} />
        </div>
        <FigureRow figures={figureGroups.pqvf} />
      </section>

      <section className="training-print-page">
        {pageHeader('5', 'Sönümleme ve Enerji', 'Damping oranı genlik zarfının azalıp azalmadığını gösterir.')}
        <div className="training-print-two-column">
          <PrintChart title="5.1 Salınım zarfı" subtitle="Üst/alt zarf" option={dampingOptions.signal} />
          <PrintChart title="5.2 Enerji göstergesi" subtitle="Zarf karesi" option={dampingOptions.energy} />
        </div>
        <MetricTable rows={[
          ['Güvenli DR', assessDampingRatio(5).comment],
          ['Zayıf DR', assessDampingRatio(2).comment],
          ['Negatif DR', assessDampingRatio(-1).comment],
        ]} />
        <FigureRow figures={figureGroups.damping} />
      </section>

      <section className="training-print-page">
        {pageHeader('6', 'PMU Algılama', 'Akan PMU sinyali pencerelere bölünür; aktif pencere frekans alanında baskın bileşeni ortaya çıkarır.')}
        <div className="training-print-two-column">
          <PrintChart title="6.1 Ham sinyal ve aktif pencere" subtitle={`${detectionOptions.detection.window.startSeconds.toFixed(0)}-${detectionOptions.detection.window.endSeconds.toFixed(0)} sn`} option={detectionOptions.time} height={120} />
          <PrintChart title="6.2 DFT / Spektrum" subtitle={`Tepe ${detectionOptions.detection.dominantFrequencyHz?.toFixed(2)} Hz`} option={detectionOptions.spectrum} height={120} />
        </div>
        <PrintChart title="6.3 Zaman-frekans yoğunluğu" subtitle={detectionOptions.detection.operatorComment} option={detectionOptions.heatmap} height={104} />
        <FigureRow figures={figureGroups.detection} />
      </section>

      {sasSimulation.tabs.map((tab, tabIndex) => {
        const charts = sasCharts(sasSimulation, tab.id);
        const bus = sasSimulation.buses.find(entry => entry.config.id === tab.id);
        return (
          <section className="training-print-page" key={tab.id}>
            {pageHeader(`7.${tabIndex + 1}`, tab.label.replace(/^\d+\.\s*/, ''), tab.subtitle)}
            <div className="training-print-chart-grid four">
              {charts.map((chart, chartIndex) => (
                <PrintChart key={chart.title} title={`7.${tabIndex + 1}.${chartIndex + 1} ${chart.title}`} subtitle={chart.subtitle} option={chart.option} height={104} />
              ))}
            </div>
            <div className="training-print-two-column">
              <MetricTable rows={bus ? [
                ['Bara', bus.config.name],
                ['FACTS', `${bus.config.type} / ${bus.config.factsLabel}`],
                ['Konum', bus.config.location],
                ['Not', bus.config.note],
              ] : [
                ['Kapsam', 'Altı lokal SAS-C barasının toplam tepkisi'],
                ['Toplam MW', 'Bara bazlı MW katkılarının toplamı'],
                ['Sönümleme MW', 'Frekans değişimine ters polaritede çizilen kontrol etkisi'],
                ['Gerilim / Frekans', 'Ortalama p.u. gerilim ve mHz frekans değişimi'],
              ]} />
              <FigureRow figures={[figureGroups.sas[tabIndex % figureGroups.sas.length]]} />
            </div>
          </section>
        );
      })}

      {TRAINING_CASES.map((trainingCase, caseIndex) => {
        const options = caseChartOptions(trainingCase.id);
        return (
          <section className="training-print-page training-print-case-page" key={trainingCase.id}>
            {pageHeader(`8.${caseIndex + 1}`, trainingCase.title, `${trainingCase.eventDate} / ${trainingCase.frequencyHz.toFixed(3)} Hz / ${trainingCase.mode}`)}
            <div className="training-print-two-column">
              <div className="training-print-text-card">
                <h3>Olay, teşhis ve müdahale</h3>
                <p><strong>Olay:</strong> {trainingCase.description}</p>
                <p><strong>Teşhis:</strong> {trainingCase.diagnosis}</p>
                <p><strong>Müdahale:</strong> {trainingCase.intervention}</p>
                <p><strong>Operatör dersi:</strong> {trainingCase.operatorLesson}</p>
              </div>
              <MetricTable rows={trainingCase.metrics.map(metric => [metric.label, metric.value])} />
            </div>
            <div className="training-print-chart-grid four">
              <PrintChart title="Frekans-zaman" subtitle={`${trainingCase.frequencyHz.toFixed(3)} Hz mod`} option={options.frequency} height={98} />
              <PrintChart title="Damping trendi" subtitle="DR kritik sınırı" option={options.damping} height={98} />
              <PrintChart title="P-Q-V etkisi" subtitle="Normalize karşılaştırma" option={options.pqvf} height={98} />
              <PrintChart title="Mode shape" subtitle="PMU faz/genlik deseni" option={options.modeShape} height={98} />
            </div>
            <div className="training-print-two-column">
              <PrintChart title="DEF kaynak lokalizasyonu" subtitle="Kaynak / soğurucu ayrımı" option={options.def} height={94} />
              <FigureRow figures={caseFigures(trainingCase.assetNames, trainingCase.shortLabel)} />
            </div>
          </section>
        );
      })}

      <section className="training-print-page">
        {pageHeader('9', 'Salınım Algılama Uygulaması', 'PMU tabanlı modal analiz, SAS-C eğitim simülasyonu, rapor ve operatör karar dili aynı WAMPAC arayüzünde birleştirilir.')}
        <div className="training-print-two-column">
          <table className="training-print-table">
            <thead><tr><th>Modül</th><th>Operasyonel değer</th></tr></thead>
            <tbody>
              <tr><td>PMU modal analiz</td><td>Frekans, genlik, mod ve DR değerlerini ortak zaman ekseninde çıkarır.</td></tr>
              <tr><td>P-Q-V-f birlikte okuma</td><td>Aktif güç, reaktif güç, gerilim ve frekans etkisini aynı olay penceresinde gösterir.</td></tr>
              <tr><td>SAS-C eğitimi</td><td>SVC/STATCOM pulse mantığını güvenli eğitim simülasyonu olarak öğretir.</td></tr>
              <tr><td>PDF rapor</td><td>Özet, grafik ve metrikleri operatör raporu formatında üretir.</td></tr>
              <tr><td>Karar cümlesi</td><td>Ham log yerine işletme yorumu ve risk seviyesini açıklar.</td></tr>
            </tbody>
          </table>
          <div className="training-print-text-card">
            <h3>WAMPAC konumu</h3>
            <p>Uygulama; izleme, koruma ve kontrol bilgisini aynı operatör okuma akışına toplar. Eğitim çıktısı, gerçek analiz ekranındaki grafik ve karar cümlelerinin nasıl yorumlanacağını basılı doküman formatına taşır.</p>
          </div>
        </div>
        <FigureRow figures={figureGroups.decision} />
      </section>
    </div>
  );
}
