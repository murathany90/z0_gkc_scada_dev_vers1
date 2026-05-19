import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildSasAggregateChartDescriptors,
  buildSasChartZoomConfig,
  buildSasInterareaSimulation,
  normalizeSasDataZoomEvent,
  resolveSasChartWindow,
  type SasChartWindow,
  type SasInterareaBusSimulation,
  type SasInterareaSimulation,
  type SasInterareaTabId,
} from '../utils/simulationModels.ts';
import { OscillationTrainingChart, type TrainingThemeMode } from './OscillationTrainingChart.tsx';
import { TrainingTerm } from './TrainingTerm.tsx';

interface SasFigure {
  src: string;
  title: string;
  caption: string;
}

interface SasStudyPanelProps {
  themeMode: TrainingThemeMode;
  figures?: SasFigure[];
  onOpenFigure?: (figure: SasFigure) => void;
}

const format = (value: number, digits = 1) => Number(value).toFixed(digits);
const pairSeries = (times: number[], values: number[]): Array<[number, number]> => times.map((timeSeconds, index) => [timeSeconds, values[index]]);
const pulseLabel = (value: number) => value > 0 ? '+1 Kapasitif' : value < 0 ? '-1 Endüktif' : '0 Normal';
const currentIndex = (times: number[], timeSeconds: number) => Math.max(0, Math.min(times.length - 1, Math.round(timeSeconds / 0.5)));

function chartLine(name: string, data: Array<[number, number]>, color: string, extra: Record<string, unknown> = {}) {
  return {
    name,
    type: 'line',
    showSymbol: false,
    data,
    lineStyle: { width: 2, color },
    itemStyle: { color },
    ...extra,
  };
}

function chartBar(name: string, data: Array<[number, number]>, color: string, extra: Record<string, unknown> = {}) {
  return {
    name,
    type: 'bar',
    data,
    barMaxWidth: 8,
    itemStyle: { color },
    ...extra,
  };
}

function markCurrentTime(timeSeconds: number) {
  return {
    symbol: 'none',
    silent: true,
    label: { show: false },
    lineStyle: { color: '#ef4444', width: 1.4, type: 'dashed' },
    data: [{ xAxis: timeSeconds }],
  };
}

function commonChartOption(simulation: SasInterareaSimulation, visibleWindow: SasChartWindow, option: Record<string, unknown>) {
  return {
    dataZoom: buildSasChartZoomConfig(visibleWindow.start, visibleWindow.end),
    xAxis: { name: 'Zaman (s)', min: 0, max: simulation.durationSeconds },
    ...option,
  };
}

function busCharts(simulation: SasInterareaSimulation, bus: SasInterareaBusSimulation, timeSeconds: number, visibleWindow: SasChartWindow) {
  const { times } = simulation;
  const { series } = bus;
  return [
    {
      title: '1. Ham Frekans + Kayan FFT Pencereleri',
      subtitle: '20 s kısa ve 100 s uzun pencere görseli',
      option: commonChartOption(simulation, visibleWindow, {
        tooltip: {
          formatter: (params: Array<{ seriesName: string; value: [number, number] }>) => {
            const rows = params.map(item => `${item.seriesName}: ${format(Number(item.value[1]), 3)}`).join('<br/>');
            return `${rows}<br/><span style="color:#64748b">Kısa pencere genliği, uzun pencere faz/yön doğrulaması için okunur.</span>`;
          },
        },
        yAxis: { name: 'mHz' },
        series: [
          chartLine('Ham frekans sapması', pairSeries(times, series.rawMhz), '#2563eb', { markLine: markCurrentTime(timeSeconds) }),
          chartLine('Süzülmüş interarea bileşen', pairSeries(times, series.filteredMhz), '#7c3aed'),
          chartLine('Tetik eşiği', pairSeries(times, times.map(() => 10)), '#ef4444', { lineStyle: { width: 1.3, color: '#ef4444', type: 'dashed' } }),
        ],
      }),
    },
    {
      title: '2. Tespit Edilen Genlik ve Enerji',
      subtitle: 'Kısa pencere genliği ve salınım enerjisi',
      option: commonChartOption(simulation, visibleWindow, {
        yAxis: [
          { name: 'Genlik (mHz)' },
          { name: 'Enerji', scale: true },
        ],
        series: [
          chartLine('Genlik', pairSeries(times, series.shortAmplitudeMhz), '#f59e0b', { markLine: markCurrentTime(timeSeconds) }),
          chartLine('Enerji', pairSeries(times, series.energy), '#10b981', { yAxisIndex: 1 }),
        ],
      }),
    },
    {
      title: '3. Frekans Eğrisi + FACTS Pulse',
      subtitle: 'Kapasitif +1 / Normal 0 / Endüktif -1',
      option: commonChartOption(simulation, visibleWindow, {
        tooltip: {
          formatter: (params: Array<{ seriesName: string; value: [number, number] }>) => {
            const rows = params.map(item => `${item.seriesName}: ${format(Number(item.value[1]), 2)}`).join('<br/>');
            const pulse = params.find(item => item.seriesName.includes('Pulse'))?.value[1] ?? 0;
            return `${rows}<br/><span style="color:#64748b">${pulseLabel(Number(pulse) / 18)}</span>`;
          },
        },
        yAxis: [
          { name: 'mHz / Pulse' },
          { name: 'MVAr', scale: true },
        ],
        series: [
          chartLine('Frekans sapması', pairSeries(times, series.rawMhz), '#2563eb', { markLine: markCurrentTime(timeSeconds) }),
          chartLine('Pulse x18', pairSeries(times, series.pulseLevel.map(value => value * 18)), '#ef4444', { step: 'end' }),
          chartBar('MVAr komutu', pairSeries(times, series.mvar), '#10b981', { yAxisIndex: 1 }),
        ],
      }),
    },
    {
      title: '4. Mod, Sönümleme ve Güven',
      subtitle: 'Mod frekansı, DR, faz hata ve güven',
      option: commonChartOption(simulation, visibleWindow, {
        yAxis: [
          { name: 'Hz / %' },
          { name: 'Faz / Güven', scale: true },
        ],
        series: [
          chartLine('Mod frekansı (Hz)', pairSeries(times, series.modeFrequencyHz), '#06b6d4', { markLine: markCurrentTime(timeSeconds) }),
          chartLine('DR (%)', pairSeries(times, series.dampingRatioPercent), '#10b981'),
          chartLine('Faz hata (°)', pairSeries(times, series.phaseErrorDegrees), '#f59e0b', { yAxisIndex: 1 }),
          chartLine('Güven (%)', pairSeries(times, series.confidencePercent), '#7c3aed', { yAxisIndex: 1 }),
        ],
      }),
    },
  ];
}

function aggregateCharts(simulation: SasInterareaSimulation, timeSeconds: number, visibleWindow: SasChartWindow) {
  const descriptors = buildSasAggregateChartDescriptors(simulation);
  const { times } = simulation;
  const aggregate = simulation.aggregate.series;
  return descriptors.map(descriptor => {
    if (descriptor.key === 'all-pulses') {
      return {
        title: descriptor.title,
        subtitle: descriptor.subtitle,
        option: commonChartOption(simulation, visibleWindow, {
          yAxis: { name: 'Pulse offset' },
          series: simulation.buses.map((entry, index) => chartLine(`${entry.config.shortLabel} pulse`, pairSeries(times, entry.series.pulseLevel.map(value => value + index * 2.6)), ['#2563eb', '#f97316', '#10b981', '#7c3aed', '#ef4444', '#0891b2'][index], { step: 'end', markLine: index === 0 ? markCurrentTime(timeSeconds) : undefined })),
        }),
      };
    }
    if (descriptor.key === 'total-mw-mvar') {
      return {
        title: descriptor.title,
        subtitle: descriptor.subtitle,
        option: commonChartOption(simulation, visibleWindow, {
          yAxis: [
            { name: 'MW' },
            { name: 'MVAr', scale: true },
          ],
          series: [
            chartLine('Toplam MW', pairSeries(times, aggregate.totalMw), '#2563eb', { markLine: markCurrentTime(timeSeconds) }),
            chartLine('Toplam MVAr', pairSeries(times, aggregate.totalMvar), '#f97316', { yAxisIndex: 1 }),
          ],
        }),
      };
    }
    if (descriptor.key === 'total-mw-frequency') {
      return {
        title: descriptor.title,
        subtitle: descriptor.subtitle,
        option: commonChartOption(simulation, visibleWindow, {
          yAxis: [
            { name: 'MW' },
            { name: 'mHz', scale: true },
          ],
          series: [
            chartLine('Toplam MW sönümleme etkisi', pairSeries(times, aggregate.totalDampingMw), '#2563eb', { markLine: markCurrentTime(timeSeconds) }),
            chartLine('Frekans değişimi', pairSeries(times, aggregate.frequencyChangeMhz), '#ef4444', { yAxisIndex: 1 }),
          ],
        }),
      };
    }
    return {
      title: descriptor.title,
      subtitle: descriptor.subtitle,
      option: commonChartOption(simulation, visibleWindow, {
        yAxis: [
          { name: 'MVAr / mHz' },
          { name: 'p.u.', min: 0.995, max: 1.005 },
        ],
        series: [
          chartLine('Toplam MVAr', pairSeries(times, aggregate.totalMvar), '#f97316', { markLine: markCurrentTime(timeSeconds) }),
          chartLine('Gerilim p.u.', pairSeries(times, aggregate.voltagePu), '#10b981', { yAxisIndex: 1 }),
          chartLine('Frekans değişimi', pairSeries(times, aggregate.frequencyChangeMhz), '#ef4444'),
        ],
      }),
    };
  });
}

function InfoCard({ title, text, metrics }: { title: string; text: string; metrics: Array<[string, string]> }) {
  return (
    <article className="training-info-card">
      <h3>{title}</h3>
      <p>{text}</p>
      <div className="sas-metric-grid">
        {metrics.map(([label, value]) => (
          <div className="sas-mini-metric" key={label}>
            <span>{label}</span>
            <b>{value}</b>
          </div>
        ))}
      </div>
    </article>
  );
}

function SasChartCard({
  chart,
  themeMode,
  time,
  durationSeconds,
  running,
  zoomActive,
  onToggleRun,
  onTimeChange,
  onResetZoom,
  onDataZoom,
}: {
  chart: { title: string; subtitle: string; option: Record<string, unknown> };
  themeMode: TrainingThemeMode;
  time: number;
  durationSeconds: number;
  running: boolean;
  zoomActive: boolean;
  onToggleRun: () => void;
  onTimeChange: (timeSeconds: number) => void;
  onResetZoom: () => void;
  onDataZoom: (event: unknown) => void;
}) {
  return (
    <div className="training-chart-card sas-chart-card">
      <div className="training-chart-title sas-chart-title">
        <div>{chart.title}<span>{chart.subtitle}</span></div>
        <div className="sas-chart-controls">
          <button type="button" className="btn btn-outline btn-compact" onClick={onToggleRun}>{running ? 'Durdur' : 'Oynat'}</button>
          <label>Zaman {format(time, 1)} s
            <input aria-label={`${chart.title} zaman`} type="range" min="0" max={durationSeconds} step="0.5" value={time} onChange={event => onTimeChange(Number(event.target.value))} />
          </label>
          <button type="button" className="btn btn-outline btn-compact" disabled={!zoomActive} onClick={onResetZoom}>Zoom sıfırla</button>
        </div>
      </div>
      <OscillationTrainingChart option={chart.option} themeMode={themeMode} height={300} onEvents={{ datazoom: onDataZoom }} />
    </div>
  );
}

function FigureStrip({ figures, onOpenFigure }: { figures: SasFigure[]; onOpenFigure?: (figure: SasFigure) => void }) {
  if (!figures.length || !onOpenFigure) return null;
  return (
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
  );
}

function SingleLineDiagram({ activeTab, bus }: { activeTab: SasInterareaTabId; bus?: SasInterareaBusSimulation }) {
  const isAggregate = activeTab === 'aggregate';
  const title = isAggregate ? 'Altı SAS-C Barası · Toplam Sönümleme Etkisi' : `${bus!.config.shortLabel} · ${bus!.config.type} Tek Hat Şeması`;
  return (
    <article className="training-info-card sas-sld-card">
      <h3>{title}</h3>
      <svg viewBox="0 0 900 360" role="img" aria-label={title}>
        <line x1="70" y1="76" x2="830" y2="76" stroke="currentColor" strokeWidth="4" />
        <text x="70" y="56" className="sas-svg-label">{isAggregate ? 'Türkiye enterkonnekte iletim omurgası' : bus!.config.hvLevel + ' iletim barası'}</text>
        {isAggregate ? (
          <>
            {['TOS', 'ICD', 'MMK', 'COL', 'HBS', 'SNC'].map((label, index) => {
              const x = 120 + index * 130;
              return (
                <g key={label}>
                  <line x1={x} y1="76" x2={x} y2="126" stroke="currentColor" strokeWidth="3" />
                  <rect x={x - 46} y="126" width="92" height="68" rx="10" className={label === 'SNC' ? 'sas-svg-statcom' : 'sas-svg-svc'} />
                  <text x={x - 24} y="154" className="sas-svg-label">{label}</text>
                  <text x={x - 32} y="176" className="sas-svg-small">{label === 'SNC' ? 'STATCOM' : 'SVC'}</text>
                  <line x1={x} y1="194" x2={x} y2="244" className="sas-svg-signal" />
                  <rect x={x - 42} y="244" width="84" height="46" rx="9" className="sas-svg-controller" />
                  <text x={x - 25} y="272" className="sas-svg-small">SAS-C</text>
                </g>
              );
            })}
            <path d="M130 322 H770" className="sas-svg-blue-line" />
            <text x="260" y="346" className="sas-svg-small">7. sekme toplam MW, MVAr, gerilim p.u. ve frekans değişimini ortak zamanda gösterir.</text>
          </>
        ) : (
          <>
            <line x1="220" y1="76" x2="220" y2="130" stroke="currentColor" strokeWidth="3" />
            <rect x="188" y="130" width="64" height="38" rx="7" className="sas-svg-breaker" />
            <text x="205" y="154" className="sas-svg-small">CB</text>
            <line x1="220" y1="168" x2="220" y2="250" stroke="currentColor" strokeWidth="3" />
            <circle cx="220" cy="214" r="19" fill="none" stroke="currentColor" strokeWidth="3" />
            <circle cx="220" cy="242" r="19" fill="none" stroke="currentColor" strokeWidth="3" />
            <rect x="360" y="116" width="130" height="86" rx="14" className="sas-svg-controller" />
            <text x="394" y="150" className="sas-svg-label">SAS-C</text>
            <text x="382" y="174" className="sas-svg-small">FFT + Faz</text>
            <path d="M360 158 H260" className="sas-svg-signal" />
            <rect x="560" y="116" width="120" height="86" rx="14" className="sas-svg-pmu" />
            <text x="590" y="150" className="sas-svg-label">PMU</text>
            <text x="578" y="174" className="sas-svg-small">C37.118</text>
            <path d="M490 158 H560" className="sas-svg-blue-line" />
            <rect x="405" y="248" width="150" height="70" rx="14" className={bus!.config.type === 'STATCOM' ? 'sas-svg-statcom' : 'sas-svg-svc'} />
            <text x="438" y="278" className="sas-svg-label">{bus!.config.type}</text>
            <text x="424" y="300" className="sas-svg-small">{bus!.config.factsLabel}</text>
            <path d="M425 202 V248" className="sas-svg-signal" />
            <text x="610" y="270" className="sas-svg-small">{bus!.config.location}</text>
            <text x="610" y="292" className="sas-svg-small">{bus!.config.load}</text>
          </>
        )}
      </svg>
    </article>
  );
}

export function SasStudyPanel({ themeMode, figures = [], onOpenFigure }: SasStudyPanelProps) {
  const [activeTab, setActiveTab] = useState<SasInterareaTabId>('toscelik');
  const [amplitude, setAmplitude] = useState(16);
  const [modeFrequency, setModeFrequency] = useState(0.15);
  const [trigger, setTrigger] = useState(10);
  const [damping, setDamping] = useState(4);
  const [viewSeconds, setViewSeconds] = useState(480);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(0.5);
  const [zoomWindow, setZoomWindow] = useState<SasChartWindow | null>(null);

  const simulation = useMemo(() => buildSasInterareaSimulation({
    amplitudeMhz: amplitude,
    modeFrequencyHz: modeFrequency,
    triggerThresholdMhz: trigger,
    dampingPercent: damping,
  }), [amplitude, damping, modeFrequency, trigger]);

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => {
      setTime(previous => {
        const next = Math.min(simulation.durationSeconds, previous + speed * 2.5);
        if (next >= simulation.durationSeconds) setRunning(false);
        return next;
      });
    }, 250);
    return () => window.clearInterval(timer);
  }, [running, simulation.durationSeconds, speed]);

  useEffect(() => {
    setZoomWindow(null);
  }, [activeTab, amplitude, damping, modeFrequency, trigger, viewSeconds]);

  const selectedBus = simulation.buses.find(entry => entry.config.id === activeTab);
  const sampleIndex = currentIndex(simulation.times, time);
  const visibleWindow = resolveSasChartWindow({
    durationSeconds: simulation.durationSeconds,
    timeSeconds: time,
    viewSeconds,
    zoomWindow,
  });
  const handleDataZoom = useCallback((event: unknown) => {
    const nextWindow = normalizeSasDataZoomEvent(event, simulation.durationSeconds);
    if (!nextWindow) return;
    setZoomWindow(previous => {
      if (
        previous
        && Math.abs(previous.start - nextWindow.start) < 0.05
        && Math.abs(previous.end - nextWindow.end) < 0.05
      ) {
        return previous;
      }
      return nextWindow;
    });
  }, [simulation.durationSeconds]);
  const charts = activeTab === 'aggregate'
    ? aggregateCharts(simulation, time, visibleWindow)
    : busCharts(simulation, selectedBus ?? simulation.buses[0], time, visibleWindow);
  const currentPulse = selectedBus ? selectedBus.series.pulseLevel[sampleIndex] : 0;
  const currentMw = selectedBus ? selectedBus.series.mw[sampleIndex] : simulation.aggregate.series.totalMw[sampleIndex];
  const currentMvar = selectedBus ? selectedBus.series.mvar[sampleIndex] : simulation.aggregate.series.totalMvar[sampleIndex];
  const currentFrequency = selectedBus ? selectedBus.series.frequencyHz[sampleIndex] : 50 + simulation.aggregate.series.frequencyChangeMhz[sampleIndex] / 1000;
  const currentVoltagePu = selectedBus ? selectedBus.series.voltagePu[sampleIndex] : simulation.aggregate.series.voltagePu[sampleIndex];
  const visibleFigures = activeTab === 'aggregate' ? figures : figures.slice(0, 3);

  return (
    <section className="training-panel sas-study-panel">
      <div className="training-section-header">
        <h2>SAS Çalışması</h2>
        <p>
          <TrainingTerm term="sas-c">SAS-C</TrainingTerm>, altı lokal baranın <TrainingTerm term="fbmswa">FBMSWA</TrainingTerm>
          tabanlı <TrainingTerm term="short-window">kısa pencere</TrainingTerm> ve <TrainingTerm term="long-window">uzun pencere</TrainingTerm>
          kararını aynı eğitim zaman ekseninde gösterir.
        </p>
      </div>

      <div className="training-segmented sas-tabbar" role="tablist" aria-label="SAS-C bara alt sekmeleri">
        {simulation.tabs.map(tab => (
          <button key={tab.id} type="button" role="tab" className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
            <strong>{tab.label}</strong>
            <span>{tab.subtitle}</span>
          </button>
        ))}
      </div>

      <div className="training-controls sas-controls">
        <button type="button" className="btn btn-outline btn-compact" onClick={() => setRunning(value => !value)}>{running ? 'Durdur' : 'Oynat'}</button>
        <label>Zaman: {format(time, 1)} s
          <input name="training-sas-time" aria-label="SAS zaman" type="range" min="0" max={simulation.durationSeconds} step="0.5" value={time} onChange={event => setTime(Number(event.target.value))} />
        </label>
        <label>Genlik: {amplitude} mHz
          <input name="training-sas-amplitude" aria-label="SAS genlik değeri" type="range" min="4" max="40" step="1" value={amplitude} onChange={event => setAmplitude(Number(event.target.value))} />
        </label>
        <label>Mod: {format(modeFrequency, 3)} Hz
          <input name="training-sas-mode" aria-label="SAS mod frekansı" type="range" min="0.1" max="0.2" step="0.005" value={modeFrequency} onChange={event => setModeFrequency(Number(event.target.value))} />
        </label>
        <label>Tetik: {trigger} mHz
          <input name="training-sas-trigger" aria-label="SAS tetik eşiği" type="range" min="6" max="24" step="1" value={trigger} onChange={event => setTrigger(Number(event.target.value))} />
        </label>
        <label>DR: {format(damping, 1)} %
          <input name="training-sas-damping" aria-label="SAS damping oranı" type="range" min="-2" max="10" step="0.5" value={damping} onChange={event => setDamping(Number(event.target.value))} />
        </label>
        <label>Görünüm: {viewSeconds >= 480 ? 'Tüm zaman' : `${viewSeconds} s`}
          <input name="training-sas-view" aria-label="SAS görünür zaman aralığı" type="range" min="60" max="480" step="30" value={viewSeconds} onChange={event => setViewSeconds(Number(event.target.value))} />
        </label>
        <select name="training-sas-speed" aria-label="SAS oynatma hızı" value={speed} onChange={event => setSpeed(Number(event.target.value))}>
          <option value={1}>x1</option>
          <option value={0.5}>x0.5</option>
          <option value={0.3}>x0.3</option>
          <option value={0.2}>x0.2</option>
          <option value={0.1}>x0.1</option>
        </select>
      </div>

      <div className={`training-alert ${currentPulse === 0 ? 'safe' : 'critical'}`}>
        <strong>{activeTab === 'aggregate' ? 'Toplam sistem tepkisi' : pulseLabel(currentPulse)}</strong>
        <span>
          {activeTab === 'aggregate'
            ? `Anlık toplam MW ${format(currentMw, 1)}, toplam MVAr ${format(currentMvar, 1)}, frekans değişimi ${format(simulation.aggregate.series.frequencyChangeMhz[sampleIndex], 2)} mHz.`
            : `${selectedBus!.config.name}: ${format(currentMw, 1)} MW, ${format(currentMvar, 1)} MVAr, ${format(currentFrequency, 5)} Hz, ${format(currentVoltagePu, 4)} p.u.`}
        </span>
      </div>

      <div className="training-grid two sas-dashboard-grid">
        <SasChartCard chart={charts[0]} themeMode={themeMode} time={time} durationSeconds={simulation.durationSeconds} running={running} zoomActive={zoomWindow !== null} onToggleRun={() => setRunning(value => !value)} onTimeChange={setTime} onResetZoom={() => setZoomWindow(null)} onDataZoom={handleDataZoom} />
        <SasChartCard chart={charts[1]} themeMode={themeMode} time={time} durationSeconds={simulation.durationSeconds} running={running} zoomActive={zoomWindow !== null} onToggleRun={() => setRunning(value => !value)} onTimeChange={setTime} onResetZoom={() => setZoomWindow(null)} onDataZoom={handleDataZoom} />
        <InfoCard
          title={activeTab === 'aggregate' ? 'Sistem Durumu' : 'SAS-C Karar Durumu'}
          text={activeTab === 'aggregate'
            ? `Aktif pulse üreten bara sayısı ${simulation.aggregate.series.activeBusCount[sampleIndex]}. Toplam tepki, altı baranın eş zamanlı katkısından hesaplanır.`
            : `${selectedBus!.config.name} için ${pulseLabel(currentPulse)}. ${selectedBus!.config.note}`}
          metrics={activeTab === 'aggregate'
            ? [['Aktif', `${simulation.aggregate.series.activeBusCount[sampleIndex]} / 6`], ['Toplam MW', `${format(currentMw, 1)} MW`]]
            : [['Karar', pulseLabel(currentPulse)], ['Güven', `${format(selectedBus!.series.confidencePercent[sampleIndex], 0)} %`]]}
        />
        <InfoCard
          title={activeTab === 'aggregate' ? 'Katılım Özeti' : 'FACTS Tepki Özeti'}
          text={activeTab === 'aggregate'
            ? 'Beş SVC ve Sincan STATCOM aynı zaman referansında kapasitif/endüktif pulse üretir.'
            : `${selectedBus!.config.factsLabel} cihazı için anlık reaktif komut ${format(currentMvar, 1)} MVAr olarak simüle edilir.`}
          metrics={activeTab === 'aggregate'
            ? [['SVC', '5'], ['STATCOM', '1']]
            : [['MVAr', format(currentMvar, 1)], ['MW', format(currentMw, 1)]]}
        />
        <SasChartCard chart={charts[2]} themeMode={themeMode} time={time} durationSeconds={simulation.durationSeconds} running={running} zoomActive={zoomWindow !== null} onToggleRun={() => setRunning(value => !value)} onTimeChange={setTime} onResetZoom={() => setZoomWindow(null)} onDataZoom={handleDataZoom} />
        <SasChartCard chart={charts[3]} themeMode={themeMode} time={time} durationSeconds={simulation.durationSeconds} running={running} zoomActive={zoomWindow !== null} onToggleRun={() => setRunning(value => !value)} onTimeChange={setTime} onResetZoom={() => setZoomWindow(null)} onDataZoom={handleDataZoom} />
        <InfoCard
          title={activeTab === 'aggregate' ? 'En Aktif Bara' : 'FFT Pencere Yorumu'}
          text={activeTab === 'aggregate'
            ? `Anlık aktif bara sayısı ${simulation.aggregate.series.activeBusCount[sampleIndex]}; lider katkı toplam MW grafiğinden takip edilir.`
            : 'Turuncu genlik grafiği kısa pencereyi, faz/güven metrikleri uzun pencere doğrulamasını temsil eder.'}
          metrics={activeTab === 'aggregate'
            ? [['Gerilim', `${format(currentVoltagePu, 4)} p.u.`], ['Frekans', `${format(simulation.aggregate.series.frequencyChangeMhz[sampleIndex], 2)} mHz`]]
            : [['Kısa', '20 s'], ['Uzun', '100 s']]}
        />
        <InfoCard
          title={activeTab === 'aggregate' ? 'Operatör Notu' : 'Bara Teknik Özeti'}
          text={activeTab === 'aggregate'
            ? '7. sekme tekil bara yerine birleşik sönümleme etkisini gösterir; bir grafikte yapılan zoom aynı sayfadaki dört grafiğe birlikte uygulanır.'
            : `${selectedBus!.config.location}. ${selectedBus!.config.load}.`}
          metrics={activeTab === 'aggregate'
            ? [['Kontrol', 'Ortak'], ['Hız', `x${speed}`]]
            : [['FACTS', selectedBus!.config.type], ['Ayar', selectedBus!.config.factsLabel]]}
        />
      </div>

      <SingleLineDiagram activeTab={activeTab} bus={selectedBus} />
      <FigureStrip figures={visibleFigures} onOpenFigure={onOpenFigure} />
    </section>
  );
}
