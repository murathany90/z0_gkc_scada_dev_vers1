import { useMemo, useState } from 'react';
import { buildCaseSimulation, TRAINING_CASES, type TrainingCase, type TrainingCaseId } from '../data/trainingCases.ts';
import { OscillationTrainingChart, trainingChartPalette, type TrainingThemeMode } from './OscillationTrainingChart.tsx';
import { TrainingTerm } from './TrainingTerm.tsx';

import resim1 from '../assets/asset2/Resim1.png';
import resim2 from '../assets/asset2/Resim2.png';
import resim3 from '../assets/asset2/Resim3.png';
import resim4 from '../assets/asset2/Resim4.png';
import resim5 from '../assets/asset2/Resim5.png';
import resim6 from '../assets/asset2/Resim6.png';
import resim7 from '../assets/asset2/Resim7.png';
import resim8 from '../assets/asset2/Resim8.png';
import resim9 from '../assets/asset2/Resim9.png';
import resim10 from '../assets/asset2/Resim10.png';
import resim11 from '../assets/asset2/Resim11.png';

interface TrainingFigure {
  src: string;
  title: string;
  caption: string;
}

const assetMap: Record<string, string> = {
  'Resim1.png': resim1,
  'Resim2.png': resim2,
  'Resim3.png': resim3,
  'Resim4.png': resim4,
  'Resim5.png': resim5,
  'Resim6.png': resim6,
  'Resim7.png': resim7,
  'Resim8.png': resim8,
  'Resim9.png': resim9,
  'Resim10.png': resim10,
  'Resim11.png': resim11,
};

const pointPairs = (points: Array<{ timeSeconds: number; value: number }>) => points.map(point => [point.timeSeconds, point.value]);

export function CasesPanel({
  themeMode,
  onOpenFigure,
}: {
  themeMode: TrainingThemeMode;
  onOpenFigure: (figure: TrainingFigure) => void;
}) {
  const [selectedCaseId, setSelectedCaseId] = useState<TrainingCaseId>('turkiye-entsoe-2011');
  const selectedCase = TRAINING_CASES.find(item => item.id === selectedCaseId) ?? TRAINING_CASES[0];
  const simulation = useMemo(() => buildCaseSimulation(selectedCaseId), [selectedCaseId]);
  const palette = trainingChartPalette(themeMode);

  const frequencyOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ value: [number, number]; seriesName: string }>) => `${params.map(item => `${item.seriesName}: ${Number(item.value[1]).toFixed(4)}`).join('<br/>')}<br/><span style="color:#64748b">${selectedCase.shortLabel}: baskın mod frekansı ${selectedCase.frequencyHz.toFixed(3)} Hz.</span>`,
    },
    xAxis: { name: 'Zaman (s)', min: 0 },
    yAxis: { name: 'Frekans (Hz)', scale: true },
    series: [
      { name: 'Frekans', type: 'line', showSymbol: false, data: pointPairs(simulation.frequencySeries), lineStyle: { width: 1.8, color: selectedCase.color }, itemStyle: { color: selectedCase.color } },
    ],
  };

  const dampingOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ value: [number, number]; seriesName: string }>) => `${params.map(item => `${item.seriesName}: %${Number(item.value[1]).toFixed(2)}`).join('<br/>')}<br/><span style="color:#64748b">DR düşüşü salınımın izleme seviyesinden kritik seviyeye geçişini gösterir.</span>`,
    },
    xAxis: { name: 'Zaman (s)', min: 0 },
    yAxis: { name: 'DR (%)', scale: true },
    series: [
      { name: 'Damping Ratio', type: 'line', showSymbol: false, data: pointPairs(simulation.dampingSeries), lineStyle: { width: 1.8, color: '#ef4444' }, itemStyle: { color: '#ef4444' } },
      { name: '%3 sınırı', type: 'line', showSymbol: false, data: simulation.dampingSeries.map(point => [point.timeSeconds, 3]), lineStyle: { width: 1, type: 'dashed', color: '#f59e0b' }, itemStyle: { color: '#f59e0b' } },
    ],
  };

  const pqvfOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { name: 'Zaman (s)', min: 0 },
    yAxis: { name: 'Normalize etki', scale: true },
    series: [
      { name: 'P (MW)', type: 'line', showSymbol: false, data: pointPairs(simulation.activePowerSeries.map(point => ({ timeSeconds: point.timeSeconds, value: (point.value - 400) / 70 }))), lineStyle: { width: 1.5, color: '#2563eb' }, itemStyle: { color: '#2563eb' } },
      { name: 'Q (MVAr)', type: 'line', showSymbol: false, data: pointPairs(simulation.reactivePowerSeries.map(point => ({ timeSeconds: point.timeSeconds, value: (point.value - 30) / 35 }))), lineStyle: { width: 1.5, color: '#06b6d4' }, itemStyle: { color: '#06b6d4' } },
      { name: 'V (p.u.)', type: 'line', showSymbol: false, data: pointPairs(simulation.voltageSeries.map(point => ({ timeSeconds: point.timeSeconds, value: (point.value - 1) / 0.018 }))), lineStyle: { width: 1.5, color: '#10b981' }, itemStyle: { color: '#10b981' } },
    ],
  };

  const modeShapeOption = {
    tooltip: {
      trigger: 'item',
      formatter: (item: { data?: { name?: string; value?: number[] } }) => {
        const value = item.data?.value ?? [];
        return `${item.data?.name ?? 'PMU'}<br/>Genlik: ${Number(value[2] ?? 0).toFixed(2)}<br/>Faz: ${Number(value[3] ?? 0).toFixed(0)}°`;
      },
    },
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
        label: { show: true, formatter: node.pmu, color: palette.text, fontSize: 11 },
      })),
      links: simulation.modeShape.nodes.slice(0, -1).map((node, index) => ({ source: node.pmu, target: simulation.modeShape.nodes[index + 1].pmu })),
      lineStyle: { color: palette.axisLine, width: 1.5 },
    }],
  };

  const defOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: simulation.modeShape.defBars.map(bar => bar.pmu), name: 'PMU' },
    yAxis: { name: 'DEF değeri' },
    series: [{
      name: 'Kaynak / soğurucu',
      type: 'bar',
      data: simulation.modeShape.defBars.map(bar => ({ value: bar.value, itemStyle: { color: bar.role === 'source' ? '#ef4444' : '#10b981' } })),
      barMaxWidth: 34,
    }],
  };

  const figures = selectedCase.assetNames
    .map((assetName, index) => ({
      src: assetMap[assetName],
      title: `${selectedCase.shortLabel} görsel ${index + 1}`,
      caption: `${selectedCase.title} eğitim görseli: ${assetName}`,
    }))
    .filter(figure => Boolean(figure.src));

  return (
    <section className="training-panel">
      <div className="training-section-header">
        <h2>Vaka ve Teşhis</h2>
        <p>
          Gerçek olay örnekleri <TrainingTerm term="mode-shape">mode shape</TrainingTerm>,
          <TrainingTerm term="damping-ratio"> DR</TrainingTerm>, <TrainingTerm term="def">DEF</TrainingTerm> ve
          <TrainingTerm term="pqvf"> P-Q-V-f</TrainingTerm> bulgularının birlikte nasıl okunacağını gösterir.
        </p>
      </div>

      <div className="training-case-selector" role="tablist" aria-label="Salınım vaka seçimi">
        {TRAINING_CASES.map(trainingCase => (
          <button
            key={trainingCase.id}
            type="button"
            role="tab"
            aria-selected={selectedCaseId === trainingCase.id}
            className={selectedCaseId === trainingCase.id ? 'active' : ''}
            onClick={() => setSelectedCaseId(trainingCase.id)}
          >
            <strong>{trainingCase.shortLabel}</strong>
            <span>{trainingCase.frequencyHz.toFixed(3)} Hz</span>
          </button>
        ))}
      </div>

      <div className="training-grid two">
        <article className="training-info-card">
          <h3>{selectedCase.title}</h3>
          <p><strong>Olayın tanımı:</strong> {selectedCase.description}</p>
          <p><strong>Teşhis ve metrikler:</strong> {selectedCase.diagnosis}</p>
          <p><strong>Müdahale ve simülasyon çıktısı:</strong> {selectedCase.intervention}</p>
          <div className="training-alert watch"><strong>Operatör dersi</strong><span>{selectedCase.operatorLesson}</span></div>
        </article>
        <article className="training-info-card">
          <h3>Metrik özeti</h3>
          <CaseMetricTable trainingCase={selectedCase} />
        </article>
      </div>

      <div className="training-grid two">
        <div className="training-chart-card"><div className="training-chart-title">Frekans-zaman<span>{selectedCase.frequencyHz.toFixed(3)} Hz mod</span></div><OscillationTrainingChart option={frequencyOption} themeMode={themeMode} height={300} /></div>
        <div className="training-chart-card"><div className="training-chart-title">Damping trendi<span>DR kritik sınırı</span></div><OscillationTrainingChart option={dampingOption} themeMode={themeMode} height={300} /></div>
        <div className="training-chart-card"><div className="training-chart-title">P-Q-V etkisi<span>normalize karşılaştırma</span></div><OscillationTrainingChart option={pqvfOption} themeMode={themeMode} height={300} /></div>
        <div className="training-chart-card"><div className="training-chart-title">Mode shape<span>PMU faz/genlik deseni</span></div><OscillationTrainingChart option={modeShapeOption} themeMode={themeMode} height={300} /></div>
      </div>

      <div className="training-chart-card">
        <div className="training-chart-title">DEF kaynak lokalizasyonu<span>kaynak / soğurucu ayrımı</span></div>
        <OscillationTrainingChart option={defOption} themeMode={themeMode} height={250} />
      </div>
      <div className="training-alert safe"><strong>Vaka yorumu</strong><span>{simulation.operatorSummary}</span></div>

      <div className="training-figure-grid">
        {figures.map(figure => (
          <figure className="training-figure" key={figure.src}>
            <button type="button" className="training-figure-open" aria-label={`${figure.title} görselini büyüt`} onClick={() => onOpenFigure(figure)}>⛶</button>
            <button type="button" className="training-figure-image-button" onClick={() => onOpenFigure(figure)}>
              <img src={figure.src} alt={figure.title} />
            </button>
            <figcaption>
              <strong>{figure.title}</strong>
              <span>{figure.caption}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function CaseMetricTable({ trainingCase }: { trainingCase: TrainingCase }) {
  return (
    <table className="training-table">
      <tbody>
        {trainingCase.metrics.map(metric => (
          <tr key={metric.label} className={`training-case-metric ${metric.severity}`}>
            <th>{metric.label}</th>
            <td>{metric.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
