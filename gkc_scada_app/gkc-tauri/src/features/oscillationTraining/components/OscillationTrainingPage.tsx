import { useEffect, useMemo, useState } from 'react';
import {
  TRAINING_MODE_DEFS,
  assessDampingRatio,
  buildDampedOscillation,
  buildModeShapeDefData,
  buildSlidingWindowSimulation,
  buildTrainingPqvfSimulation,
  decideFbmswaCommand,
  type TrainingModeId,
  type TrainingPqvfScenario,
} from '../utils/simulationModels.ts';
import {
  OscillationTrainingChart,
  trainingChartPalette,
  type TrainingThemeMode,
} from './OscillationTrainingChart.tsx';

import dynamicsInertia from '../assets/dynamics_p02_synchronization_inertia.jpg';
import dynamicsDamping from '../assets/dynamics_p03_anatomy_damping_energy.jpg';
import dynamicsSpectrum from '../assets/dynamics_p04_oscillation_spectrum.jpg';
import fbmswaTools from '../assets/fbmswa_p03_tools.jpg';
import fbmswaArchitecture from '../assets/fbmswa_p05_architecture.jpg';
import fbmswaPhaseBorder from '../assets/fbmswa_p08_phase_border.jpg';
import fbmswaActionSignal from '../assets/fbmswa_p09_action_signal.jpg';
import visibleThreat from '../assets/grid_pulse_p02_visible_threat.jpg';
import bastsBrain from '../assets/grid_pulse_p03_basts_digital_brain.jpg';
import dualWindow from '../assets/grid_pulse_p06_dual_window_fft.jpg';
import pipeline from '../assets/grid_pulse_p07_pipeline.jpg';
import thresholds from '../assets/grid_pulse_p08_thresholds.jpg';
import syntheticTest from '../assets/grid_pulse_p09_synthetic_test.jpg';
import frequencyBands from '../assets/stability_p03_frequency_bands.jpg';
import comparisonMatrix from '../assets/stability_p04_comparison_matrix.jpg';
import interareaProfile from '../assets/stability_p06_interarea_profile.jpg';
import pqvfResponse from '../assets/stability_p09_pqvf_response.jpg';
import powerFrequency from '../assets/stability_p10_power_frequency.jpg';

type TrainingTabId =
  | 'context'
  | 'modes'
  | 'pqvf'
  | 'damping'
  | 'detection'
  | 'fbmswa'
  | 'cases'
  | 'decision';

interface TrainingFigure {
  src: string;
  title: string;
  caption: string;
}

const TRAINING_TABS: Array<{ id: TrainingTabId; label: string }> = [
  { id: 'context', label: '1. Uygulama Bağlamı' },
  { id: 'modes', label: '2. Salınım Modları' },
  { id: 'pqvf', label: '3. P-Q-V-f Simülasyonu' },
  { id: 'damping', label: '4. Sönümleme ve Enerji' },
  { id: 'detection', label: '5. PMU Algılama' },
  { id: 'fbmswa', label: '6. BASTS / FBMSWA' },
  { id: 'cases', label: '7. Vaka ve Teşhis' },
  { id: 'decision', label: '8. Karar Destek' },
];

const FIGURES: Record<TrainingTabId, TrainingFigure[]> = {
  context: [
    { src: bastsBrain, title: 'Algı-karar-aksiyon zinciri', caption: 'PMU ölçümü, modal bulgu, karar destek ve operatör aksiyonu aynı okuma akışında değerlendirilir.' },
    { src: dynamicsInertia, title: 'Senkronizasyon ve atalet', caption: 'Jeneratör grupları elektromekanik bağ üzerinden birlikte hareket eder; zayıf bağlar düşük frekanslı moda zemin hazırlar.' },
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
  fbmswa: [
    { src: dualWindow, title: 'Çift pencere yaklaşımı', caption: 'Kısa pencere genliği hızlı yakalar; uzun pencere faz/yön doğruluğunu güçlendirir.' },
    { src: thresholds, title: 'Eşik ve histerezis', caption: 'Tetikleme ve kapanma eşikleri yalancı kararları azaltmak için ayrı tutulur.' },
    { src: fbmswaArchitecture, title: 'FBMSWA mimarisi', caption: 'Giriş, wash-out, kısa/uzun pencere ve karar sinyali kavramsal akış olarak gösterilir.' },
    { src: fbmswaActionSignal, title: 'Karar sinyali', caption: 'Eğitim kararı normal, bekleme, kapasitif veya endüktif kip olarak yorumlanır.' },
  ],
  cases: [
    { src: visibleThreat, title: 'Düşük frekanslı tehdit', caption: 'Yavaş salınımlar geniş coğrafyada görünür hale gelmeden önce PMU ile yakalanabilir.' },
    { src: interareaProfile, title: 'Bölgeler arası profil', caption: 'İki geniş alanın karşı fazlı hareketi mode shape üzerinde belirginleşir.' },
    { src: fbmswaPhaseBorder, title: 'Faz sınırı', caption: 'Uzun pencere faz bilgisini kararlı hale getirerek yön kararını destekler.' },
  ],
  decision: [
    { src: syntheticTest, title: 'Sentetik test okuması', caption: 'Eğitim verisi, canlı alarm üretmeden rapor dilini ve yorum adımlarını öğretir.' },
  ],
};

const linePairs = (time: number[], values: number[]) => time.map((timeSeconds, index) => [timeSeconds, values[index]]);
const pointPairs = (points: Array<{ timeSeconds: number; value: number }>) => points.map(point => [point.timeSeconds, point.value]);

function FigureGrid({ figures, onOpen }: { figures: TrainingFigure[]; onOpen: (figure: TrainingFigure) => void }) {
  return (
    <div className="training-figure-grid">
      {figures.map(figure => (
        <figure className="training-figure" key={figure.src}>
          <button type="button" className="training-figure-open" aria-label={`${figure.title} görselini büyüt`} onClick={() => onOpen(figure)}>
            ⛶
          </button>
          <button type="button" className="training-figure-image-button" onClick={() => onOpen(figure)}>
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

function InfoTable({ rows }: { rows: Array<[string, string]> }) {
  return (
    <table className="training-table">
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

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="training-section-header">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

export function OscillationTrainingPage({ themeMode }: { themeMode: TrainingThemeMode }) {
  const [activeTab, setActiveTab] = useState<TrainingTabId>('context');
  const [selectedMode, setSelectedMode] = useState<TrainingModeId>('interarea');
  const [pqvfScenario, setPqvfScenario] = useState<TrainingPqvfScenario>('interarea');
  const [pqvfSeverity, setPqvfSeverity] = useState(1.1);
  const [dampingRatio, setDampingRatio] = useState(4);
  const [dampingFrequency, setDampingFrequency] = useState(0.5);
  const [detectionWindow, setDetectionWindow] = useState(10);
  const [detectionStart, setDetectionStart] = useState(8);
  const [detectionNoise, setDetectionNoise] = useState(0.03);
  const [detectionFrequency, setDetectionFrequency] = useState(0.35);
  const [fbAmplitude, setFbAmplitude] = useState(18);
  const [fbPhase, setFbPhase] = useState(25);
  const [fbTrigger, setFbTrigger] = useState(20);
  const [fbRelease, setFbRelease] = useState(12);
  const [openFigure, setOpenFigure] = useState<TrainingFigure | null>(null);
  const palette = trainingChartPalette(themeMode);

  useEffect(() => {
    if (!openFigure) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenFigure(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openFigure]);

  const modeData = useMemo(() => {
    const mode = TRAINING_MODE_DEFS[selectedMode];
    return {
      mode,
      oscillation: buildDampedOscillation({
        frequencyHz: mode.frequencyHz,
        dampingRatioPercent: selectedMode === 'forced' ? 0 : mode.dampingRatioPercent,
        durationSeconds: selectedMode === 'torsional' ? 8 : 60,
        samplingRateHz: selectedMode === 'torsional' ? 80 : 20,
      }),
    };
  }, [selectedMode]);

  const pqvf = useMemo(() => buildTrainingPqvfSimulation({
    scenario: pqvfScenario,
    severity: pqvfSeverity,
    durationSeconds: 40,
    samplingRateHz: 20,
  }), [pqvfScenario, pqvfSeverity]);

  const damping = useMemo(() => buildDampedOscillation({
    frequencyHz: dampingFrequency,
    dampingRatioPercent: dampingRatio,
    durationSeconds: 80,
    samplingRateHz: 20,
  }), [dampingFrequency, dampingRatio]);
  const dampingStatus = assessDampingRatio(dampingRatio);

  const detection = useMemo(() => buildSlidingWindowSimulation({
    durationSeconds: 40,
    samplingRateHz: 20,
    windowSeconds: detectionWindow,
    windowStartSeconds: detectionStart,
    targetFrequencyHz: detectionFrequency,
    noiseLevel: detectionNoise,
    seed: 2026,
  }), [detectionFrequency, detectionNoise, detectionStart, detectionWindow]);

  const fbDecision = decideFbmswaCommand({
    amplitudeMhz: fbAmplitude,
    phaseDegrees: fbPhase,
    triggerThresholdMhz: fbTrigger,
    releaseThresholdMhz: fbRelease,
  });

  const fbSignal = useMemo(() => {
    const time: number[] = [];
    const frequency: number[] = [];
    const command: number[] = [];
    for (let index = 0; index <= 900; index += 1) {
      const t = index / 3;
      const envelope = t < 80 ? 0.25 : t < 230 ? 1 : 0.42;
      time.push(t);
      frequency.push(50 + fbAmplitude / 1000 * envelope * Math.sin(2 * Math.PI * 0.15 * t));
      command.push(fbAmplitude >= fbTrigger && t > 95 && t < 230 ? 50 + fbDecision.command * 0.03 : 50);
    }
    return { time, frequency, command };
  }, [fbAmplitude, fbDecision.command, fbTrigger]);

  const modeShape = useMemo(() => buildModeShapeDefData(), []);

  const modeLineOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { name: 'Zaman (s)', min: 0 },
    yAxis: { name: 'Sapma (p.u.)', min: -1.25, max: 1.25 },
    series: [
      { name: modeData.mode.label, type: 'line', showSymbol: false, data: linePairs(modeData.oscillation.time, modeData.oscillation.signal), lineStyle: { width: 2, color: modeData.mode.color }, itemStyle: { color: modeData.mode.color } },
      { name: 'Üst zarf', type: 'line', showSymbol: false, data: linePairs(modeData.oscillation.time, modeData.oscillation.envelope), lineStyle: { width: 1, type: 'dashed', color: palette.muted }, itemStyle: { color: palette.muted } },
      { name: 'Alt zarf', type: 'line', showSymbol: false, data: linePairs(modeData.oscillation.time, modeData.oscillation.envelope.map(value => -value)), lineStyle: { width: 1, type: 'dashed', color: palette.muted }, itemStyle: { color: palette.muted } },
    ],
  };

  const bandOption = {
    tooltip: { trigger: 'item' },
    grid: { top: 30, left: 46, right: 24, bottom: 42 },
    xAxis: { name: 'Frekans (Hz)', min: 0, max: 5 },
    yAxis: { type: 'category', data: ['Interarea', 'Local', 'Forced', 'SSO/IBR'] },
    series: [
      {
        name: 'Mod frekansı',
        type: 'scatter',
        symbolSize: 14,
        data: Object.values(TRAINING_MODE_DEFS).map(mode => [Math.min(mode.frequencyHz, 5), mode.shortLabel === 'Interarea' ? 'Interarea' : mode.shortLabel === 'Local' ? 'Local' : mode.shortLabel === 'Forced' ? 'Forced' : 'SSO/IBR', mode.label]),
        itemStyle: { color: modeData.mode.color },
        markArea: {
          silent: true,
          itemStyle: { color: 'rgba(59, 130, 246, 0.08)' },
          data: [[{ xAxis: 0.1, name: 'Bölgeler arası' }, { xAxis: 0.8 }], [{ xAxis: 0.8, name: 'Yerel' }, { xAxis: 2 }]],
        },
      },
    ],
  };

  const pqvfChart = (name: string, values: number[], unit: string, color: string) => ({
    tooltip: { trigger: 'axis' },
    xAxis: { name: 'Zaman (s)', min: 0 },
    yAxis: { name: unit, scale: true },
    series: [{
      name,
      type: 'line',
      showSymbol: false,
      data: linePairs(pqvf.time, values),
      lineStyle: { width: 1.8, color },
      itemStyle: { color },
      markLine: { symbol: 'none', data: [{ xAxis: pqvf.eventStartSeconds, name: 'Olay başlangıcı' }], lineStyle: { color: '#ef4444', type: 'dashed' } },
    }],
  });

  const dampingOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { name: 'Zaman (s)', min: 0 },
    yAxis: { name: 'Genlik (p.u.)', scale: true },
    series: [
      { name: 'Salınım', type: 'line', showSymbol: false, data: linePairs(damping.time, damping.signal), lineStyle: { width: 2, color: dampingRatio < 0 ? '#ef4444' : '#3b82f6' }, itemStyle: { color: dampingRatio < 0 ? '#ef4444' : '#3b82f6' } },
      { name: 'Üst zarf', type: 'line', showSymbol: false, data: linePairs(damping.time, damping.envelope), lineStyle: { width: 1, type: 'dashed', color: palette.muted }, itemStyle: { color: palette.muted } },
      { name: 'Alt zarf', type: 'line', showSymbol: false, data: linePairs(damping.time, damping.envelope.map(value => -value)), lineStyle: { width: 1, type: 'dashed', color: palette.muted }, itemStyle: { color: palette.muted } },
    ],
  };

  const energyOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { name: 'Zaman (s)', min: 0 },
    yAxis: { name: 'Enerji göstergesi', min: 0 },
    series: [{
      name: 'Enerji',
      type: 'line',
      showSymbol: false,
      data: linePairs(damping.time, damping.envelope.map(value => value * value)),
      areaStyle: { opacity: 0.15 },
      lineStyle: { width: 2, color: dampingRatio < 0 ? '#ef4444' : '#10b981' },
      itemStyle: { color: dampingRatio < 0 ? '#ef4444' : '#10b981' },
    }],
  };

  const detectionTimeOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { name: 'Zaman (s)', min: 0, max: 40 },
    yAxis: { name: 'Sapma (p.u.)', scale: true },
    series: [
      { name: 'Ham PMU sinyali', type: 'line', showSymbol: false, data: pointPairs(detection.rawSeries), lineStyle: { width: 1.4, color: palette.muted }, itemStyle: { color: palette.muted } },
      { name: 'Aktif pencere', type: 'line', showSymbol: false, data: pointPairs(detection.windowedSeries), lineStyle: { width: 2, color: '#3b82f6' }, itemStyle: { color: '#3b82f6' },
        markArea: { silent: true, itemStyle: { color: 'rgba(59, 130, 246, 0.15)' }, data: [[{ xAxis: detection.window.startSeconds }, { xAxis: detection.window.endSeconds }]] } },
    ],
  };

  const spectrumOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { name: 'Frekans (Hz)', min: 0, max: 2 },
    yAxis: { name: 'Genlik', min: 0 },
    series: [{
      name: 'DFT genliği',
      type: 'line',
      showSymbol: false,
      data: detection.spectrum.map(point => [point.frequencyHz, point.amplitude]),
      areaStyle: { opacity: 0.12 },
      lineStyle: { width: 2, color: '#3b82f6' },
      itemStyle: { color: '#3b82f6' },
      markLine: { symbol: 'none', data: [{ xAxis: detectionFrequency, name: 'Hedef mod' }], lineStyle: { color: '#ef4444', type: 'dashed' } },
    }],
  };

  const spectrogramOption = {
    tooltip: { trigger: 'item' },
    grid: { top: 18, left: 48, right: 18, bottom: 34 },
    xAxis: { type: 'category', name: 'Pencere', data: detection.spectrogram.map((_column, index) => String(index + 1)) },
    yAxis: { type: 'category', name: 'Frekans', data: Array.from({ length: 24 }, (_unused, index) => `${(0.05 + (2 - 0.05) * (1 - index / 23)).toFixed(2)} Hz`) },
    visualMap: { show: false, min: 0, max: 1, inRange: { color: ['#0f172a', '#2563eb', '#22c55e', '#f59e0b'] } },
    series: [{
      name: 'Zaman-frekans yoğunluğu',
      type: 'heatmap',
      data: detection.spectrogram.flatMap((column, columnIndex) => column.map((value, rowIndex) => [columnIndex, rowIndex, value])),
    }],
  };

  const fbOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { name: 'Zaman (s)', min: 0 },
    yAxis: { name: 'Hz / karar', scale: true },
    series: [
      { name: 'Frekans', type: 'line', showSymbol: false, data: linePairs(fbSignal.time, fbSignal.frequency), lineStyle: { width: 1.8, color: '#3b82f6' }, itemStyle: { color: '#3b82f6' } },
      { name: 'Karar sinyali', type: 'line', showSymbol: false, data: linePairs(fbSignal.time, fbSignal.command), lineStyle: { width: 2, color: '#ef4444' }, itemStyle: { color: '#ef4444' } },
    ],
  };

  const modeShapeOption = {
    tooltip: { trigger: 'item' },
    xAxis: { show: false, min: 0, max: 100 },
    yAxis: { show: false, min: 0, max: 100 },
    series: [{
      name: 'Mode shape',
      type: 'graph',
      layout: 'none',
      coordinateSystem: 'cartesian2d',
      data: modeShape.nodes.map(node => ({
        name: node.pmu,
        value: [node.x * 100, (1 - node.y) * 100, node.amplitude, node.phaseDegrees],
        symbolSize: 18 + node.amplitude * 24,
        itemStyle: { color: node.phaseDegrees < 100 ? '#3b82f6' : '#f59e0b' },
        label: { show: true, formatter: node.pmu, color: palette.text, fontSize: 11 },
      })),
      links: modeShape.nodes.slice(0, -1).map((node, index) => ({ source: node.pmu, target: modeShape.nodes[index + 1].pmu })),
      lineStyle: { color: palette.axisLine, width: 1.5 },
    }],
  };

  const defOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: modeShape.defBars.map(bar => bar.pmu), name: 'PMU' },
    yAxis: { name: 'DEF benzeri değer' },
    series: [{
      name: 'Kaynak / soğurucu',
      type: 'bar',
      data: modeShape.defBars.map(bar => ({ value: bar.value, itemStyle: { color: bar.role === 'source' ? '#ef4444' : '#10b981' } })),
      barMaxWidth: 34,
    }],
  };

  return (
    <div className="training-page">
      <div className="card training-shell">
        <div className="training-header">
          <div>
            <h1>Salınım Eğitimi ve Simülasyon</h1>
            <p>Bu eğitim sayfası, PMU tabanlı salınım algılama ekranında görülen mod, frekans, genlik, sönümleme ve karar destek çıktılarının nasıl okunacağını öğretir.</p>
          </div>
        </div>

        <div className="training-tabs" role="tablist" aria-label="Salınım eğitimi sekmeleri">
          {TRAINING_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`training-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="training-body">
          {activeTab === 'context' && (
            <section className="training-panel">
              <SectionHeader title="Operatör okuma rehberi" description="Bu sayfa canlı veri üretmez; gerçek Salınım Algılayıcı ekranındaki grafikleri, olay tablolarını ve karar cümlelerini yorumlamayı öğretir." />
              <div className="training-grid two">
                <div className="training-info-card">
                  <h3>Analiz akışı</h3>
                  <ol className="training-flow-list">
                    <li>PMU verisi ortak zaman ekseninde izlenir.</li>
                    <li>P-Q-V-f metrikleri aynı olay penceresinde karşılaştırılır.</li>
                    <li>Kayan pencere baskın frekans ve genliği çıkarır.</li>
                    <li>Sönümleme oranı olayın izleme mi kritik mi olduğunu belirler.</li>
                    <li>Karar destek dili operatöre sahadaki anlamı açıklar.</li>
                  </ol>
                </div>
                <div className="training-info-card">
                  <h3>Bu ekranın sınırı</h3>
                  <p>Eğitim simülasyonları canlı alarm veya kontrol komutu üretmez. Amaç, gerçek raporda görülen frekans, genlik, mod ve damping bilgilerinin işletme açısından nasıl okunacağını güvenli şekilde göstermek.</p>
                  <InfoTable rows={[
                    ['Veri türü', 'Sentetik eğitim verisi'],
                    ['Kullanım', 'Operatör yorum pratiği'],
                    ['Çıktı', 'Grafik, tablo ve karar destek dili'],
                  ]} />
                </div>
              </div>
              <FigureGrid figures={FIGURES.context} onOpen={setOpenFigure} />
            </section>
          )}

          {activeTab === 'modes' && (
            <section className="training-panel">
              <SectionHeader title="Salınım modlarını ayırt etme" description="Mod frekansı, coğrafi etki ve sönümleme birlikte okunur; tek başına frekans yeterli karar verdirmez." />
              <div className="training-segmented">
                {(Object.keys(TRAINING_MODE_DEFS) as TrainingModeId[]).map(modeId => (
                  <button key={modeId} type="button" className={selectedMode === modeId ? 'active' : ''} onClick={() => setSelectedMode(modeId)}>
                    {TRAINING_MODE_DEFS[modeId].shortLabel}
                  </button>
                ))}
              </div>
              <div className="training-grid two">
                <div className="training-chart-card">
                  <div className="training-chart-title">{modeData.mode.label}<span>{modeData.mode.frequencyHz.toFixed(2)} Hz · DR %{modeData.mode.dampingRatioPercent.toFixed(1)}</span></div>
                  <OscillationTrainingChart option={modeLineOption} themeMode={themeMode} height={340} />
                </div>
                <div className="training-info-card">
                  <h3>{modeData.mode.shortLabel} okuması</h3>
                  <p>{modeData.mode.operatorText}</p>
                  <InfoTable rows={[
                    ['Bant', modeData.mode.bandLabel],
                    ['Örnek frekans', `${modeData.mode.frequencyHz.toFixed(2)} Hz`],
                    ['Tipik yorum', selectedMode === 'forced' ? 'Kaynak aranır; doğal modla karıştırılmamalıdır.' : 'Faz, genlik ve damping bilgisiyle teyit edilir.'],
                  ]} />
                </div>
              </div>
              <div className="training-chart-card">
                <div className="training-chart-title">Frekans bandı görselleştirmesi<span>seçili mod işaretlenir</span></div>
                <OscillationTrainingChart option={bandOption} themeMode={themeMode} height={240} />
              </div>
              <FigureGrid figures={FIGURES.modes} onOpen={setOpenFigure} />
            </section>
          )}

          {activeTab === 'pqvf' && (
            <section className="training-panel">
              <SectionHeader title="P-Q-V-f ortak zaman ekseni" description="Frekans, aktif güç, gerilim ve reaktif güç aynı olay penceresinde birlikte incelenir." />
              <div className="training-controls">
                <label>Senaryo
                  <select value={pqvfScenario} onChange={event => setPqvfScenario(event.target.value as TrainingPqvfScenario)}>
                    <option value="interarea">Bölgeler arası</option>
                    <option value="local">Yerel</option>
                    <option value="forced">Zorlanmış</option>
                  </select>
                </label>
                <label>Şiddet: {pqvfSeverity.toFixed(2)}x
                  <input type="range" min="0.4" max="1.8" step="0.05" value={pqvfSeverity} onChange={event => setPqvfSeverity(Number(event.target.value))} />
                </label>
                <button type="button" className="btn btn-outline btn-compact" onClick={() => { setPqvfScenario('interarea'); setPqvfSeverity(1.1); }}>Sıfırla</button>
              </div>
              <div className="training-grid four">
                <div className="training-chart-card"><div className="training-chart-title">Frekans f<span>Hz</span></div><OscillationTrainingChart option={pqvfChart('Frekans', pqvf.series.frequency, 'Hz', '#10b981')} themeMode={themeMode} height={230} /></div>
                <div className="training-chart-card"><div className="training-chart-title">Aktif Güç P<span>MW</span></div><OscillationTrainingChart option={pqvfChart('Aktif Güç', pqvf.series.activePower, 'MW', '#3b82f6')} themeMode={themeMode} height={230} /></div>
                <div className="training-chart-card"><div className="training-chart-title">Gerilim V<span>p.u.</span></div><OscillationTrainingChart option={pqvfChart('Gerilim', pqvf.series.voltage, 'p.u.', '#ef4444')} themeMode={themeMode} height={230} /></div>
                <div className="training-chart-card"><div className="training-chart-title">Reaktif Güç Q<span>MVAr</span></div><OscillationTrainingChart option={pqvfChart('Reaktif Güç', pqvf.series.reactivePower, 'MVAr', '#06b6d4')} themeMode={themeMode} height={230} /></div>
              </div>
              <InfoTable rows={[
                ['Baskın frekans', `${pqvf.summary.dominantFrequencyHz.toFixed(2)} Hz`],
                ['Beklenen mod', pqvf.summary.expectedMode],
                ['Genlik etkisi', pqvf.summary.severityLabel],
                ['Operatör yorumu', pqvf.summary.operatorComment],
              ]} />
              <FigureGrid figures={FIGURES.pqvf} onOpen={setOpenFigure} />
            </section>
          )}

          {activeTab === 'damping' && (
            <section className="training-panel">
              <SectionHeader title="Sönümleme ve enerji" description="Damping oranı genlik zarfının azalacağını mı, korunacağını mı, büyüyeceğini mi gösterir." />
              <div className="training-controls">
                <label>DR: %{dampingRatio.toFixed(1)}
                  <input type="range" min="-2" max="8" step="0.25" value={dampingRatio} onChange={event => setDampingRatio(Number(event.target.value))} />
                </label>
                <label>Frekans: {dampingFrequency.toFixed(2)} Hz
                  <input type="range" min="0.1" max="2" step="0.05" value={dampingFrequency} onChange={event => setDampingFrequency(Number(event.target.value))} />
                </label>
                <button type="button" className="btn btn-outline btn-compact" onClick={() => { setDampingRatio(4); setDampingFrequency(0.5); }}>Sıfırla</button>
              </div>
              <div className={`training-alert ${dampingStatus.level}`}>
                <strong>{dampingStatus.label}</strong>
                <span>{dampingStatus.comment}</span>
              </div>
              <div className="training-grid two">
                <div className="training-chart-card"><div className="training-chart-title">Salınım zarfı<span>üst/alt zarf</span></div><OscillationTrainingChart option={dampingOption} themeMode={themeMode} height={320} /></div>
                <div className="training-chart-card"><div className="training-chart-title">Enerji göstergesi<span>zarf karesi</span></div><OscillationTrainingChart option={energyOption} themeMode={themeMode} height={320} /></div>
              </div>
              <FigureGrid figures={FIGURES.damping} onOpen={setOpenFigure} />
            </section>
          )}

          {activeTab === 'detection' && (
            <section className="training-panel">
              <SectionHeader title="PMU algılama ve kayan pencere" description="Akan PMU sinyali pencerelere bölünür; aktif pencere frekans alanında baskın bileşeni ortaya çıkarır." />
              <div className="training-controls">
                <label>Pencere: {detectionWindow} sn
                  <input type="range" min="6" max="18" step="1" value={detectionWindow} onChange={event => setDetectionWindow(Number(event.target.value))} />
                </label>
                <label>Konum: {detectionStart} sn
                  <input type="range" min="0" max="34" step="1" value={detectionStart} onChange={event => setDetectionStart(Number(event.target.value))} />
                </label>
                <label>Gürültü: {detectionNoise.toFixed(2)}
                  <input type="range" min="0" max="0.12" step="0.01" value={detectionNoise} onChange={event => setDetectionNoise(Number(event.target.value))} />
                </label>
                <label>Hedef: {detectionFrequency.toFixed(2)} Hz
                  <input type="range" min="0.15" max="1.4" step="0.05" value={detectionFrequency} onChange={event => setDetectionFrequency(Number(event.target.value))} />
                </label>
                <button type="button" className="btn btn-outline btn-compact" onClick={() => { setDetectionWindow(10); setDetectionStart(8); setDetectionNoise(0.03); setDetectionFrequency(0.35); }}>Sıfırla</button>
              </div>
              <div className="training-grid two">
                <div className="training-chart-card"><div className="training-chart-title">Ham sinyal ve aktif pencere<span>{detection.window.startSeconds.toFixed(0)}-{detection.window.endSeconds.toFixed(0)} sn</span></div><OscillationTrainingChart option={detectionTimeOption} themeMode={themeMode} height={300} /></div>
                <div className="training-chart-card"><div className="training-chart-title">DFT / Spektrum<span>tepe {detection.dominantFrequencyHz?.toFixed(2)} Hz</span></div><OscillationTrainingChart option={spectrumOption} themeMode={themeMode} height={300} /></div>
              </div>
              <div className="training-chart-card"><div className="training-chart-title">Zaman-frekans yoğunluğu<span>eğitim spektrogramı</span></div><OscillationTrainingChart option={spectrogramOption} themeMode={themeMode} height={240} /></div>
              <div className="training-alert watch"><strong>Operatör yorumu</strong><span>{detection.operatorComment}</span></div>
              <FigureGrid figures={FIGURES.detection} onOpen={setOpenFigure} />
            </section>
          )}

          {activeTab === 'fbmswa' && (
            <section className="training-panel">
              <SectionHeader title="BASTS / FBMSWA karar mantığı" description="Çift pencere yaklaşımı hızlı genlik tespiti ile faz/yön doğrulamasını ayrı değerlendirir." />
              <div className="training-controls">
                <label>Genlik: {fbAmplitude} mHz
                  <input type="range" min="0" max="40" step="1" value={fbAmplitude} onChange={event => setFbAmplitude(Number(event.target.value))} />
                </label>
                <label>Faz: {fbPhase}°
                  <input type="range" min="-180" max="180" step="5" value={fbPhase} onChange={event => setFbPhase(Number(event.target.value))} />
                </label>
                <label>Tetik: {fbTrigger} mHz
                  <input type="range" min="12" max="32" step="1" value={fbTrigger} onChange={event => setFbTrigger(Number(event.target.value))} />
                </label>
                <label>Kapanma: {fbRelease} mHz
                  <input type="range" min="6" max="20" step="1" value={fbRelease} onChange={event => setFbRelease(Number(event.target.value))} />
                </label>
                <button type="button" className="btn btn-outline btn-compact" onClick={() => { setFbAmplitude(18); setFbPhase(25); setFbTrigger(20); setFbRelease(12); }}>Sıfırla</button>
              </div>
              <div className={`training-alert ${fbDecision.status === 'normal' ? 'safe' : fbDecision.status === 'hold' ? 'watch' : 'critical'}`}>
                <strong>{fbDecision.label}</strong>
                <span>{fbDecision.comment}</span>
              </div>
              <div className="training-grid two">
                <div className="training-info-card">
                  <h3>Çift pencere okuması</h3>
                  <InfoTable rows={[
                    ['Kısa pencere', 'Genlik eşiğini hızlı yakalar.'],
                    ['Uzun pencere', 'Faz/yön kararını kararlı hale getirir.'],
                    ['Karar', `${fbDecision.label} (${fbDecision.command})`],
                  ]} />
                </div>
                <div className="training-chart-card"><div className="training-chart-title">Sentetik karar sinyali<span>eğitim çıktısı</span></div><OscillationTrainingChart option={fbOption} themeMode={themeMode} height={300} /></div>
              </div>
              <FigureGrid figures={FIGURES.fbmswa} onOpen={setOpenFigure} />
            </section>
          )}

          {activeTab === 'cases' && (
            <section className="training-panel">
              <SectionHeader title="Vaka ve teşhis" description="Çoklu PMU faz/genlik deseni ve DEF benzeri enerji yönü, kaynağın hangi bölgede aranacağını gösterir." />
              <div className="training-grid two">
                <div className="training-chart-card"><div className="training-chart-title">Mode shape<span>6 PMU faz/genlik deseni</span></div><OscillationTrainingChart option={modeShapeOption} themeMode={themeMode} height={330} /></div>
                <div className="training-chart-card"><div className="training-chart-title">Kaynak lokalizasyonu<span>kaynak / soğurucu</span></div><OscillationTrainingChart option={defOption} themeMode={themeMode} height={330} /></div>
              </div>
              <div className="training-alert watch"><strong>Örnek olay yorumu</strong><span>{modeShape.operatorComment}</span></div>
              <FigureGrid figures={FIGURES.cases} onOpen={setOpenFigure} />
            </section>
          )}

          {activeTab === 'decision' && (
            <section className="training-panel">
              <SectionHeader title="Karar destek dili" description="Eğitim çıktısı ham log yerine tablo ve işletme yorumu olarak okunur." />
              <div className="training-grid two">
                <div className="training-info-card">
                  <h3>Örnek bulgu tablosu</h3>
                  <table className="training-table">
                    <thead>
                      <tr><th>Alan</th><th>Değer</th></tr>
                    </thead>
                    <tbody>
                      <tr><td>PMU</td><td>KARAMAN 154 kV örnek fider</td></tr>
                      <tr><td>Zaman</td><td>17:52:00 - 17:54:00</td></tr>
                      <tr><td>Frekans</td><td>0.35 Hz</td></tr>
                      <tr><td>Mod</td><td>Bölgeler arası aday</td></tr>
                      <tr><td>DR</td><td>%2.8, zayıf sönüm</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="training-info-card">
                  <h3>Simülasyon sonuçlarının yorumu</h3>
                  <div className="training-decision-list">
                    <p>0.35 Hz bandındaki bileşen bölgeler arası mod adayıdır.</p>
                    <p>Damping oranı düşükse olay izleme seviyesinde tutulmalıdır.</p>
                    <p>Negatif damping görülürse büyüyen salınım riski vurgulanmalıdır.</p>
                    <p>P-Q-V-f metrikleri aynı zaman aralığında birlikte değişiyorsa bulgu güveni artar.</p>
                  </div>
                </div>
              </div>
              <div className="training-alert safe"><strong>Karar cümlesi örneği</strong><span>KARAMAN 154 kV fiderinde 17:52:00 - 17:54:00 zaman aralığında yaklaşık 0.35 Hz frekanslı bölgeler arası salınım adayı görülmüştür; sönümleme düşük olduğu için olay izleme seviyesinde takip edilmelidir.</span></div>
              <FigureGrid figures={FIGURES.decision} onOpen={setOpenFigure} />
            </section>
          )}
        </div>
      </div>

      {openFigure && (
        <div className="training-lightbox" role="dialog" aria-modal="true" aria-label={`${openFigure.title} büyük görsel`}>
          <button type="button" className="training-lightbox-backdrop" aria-label="Görseli kapat" onClick={() => setOpenFigure(null)} />
          <div className="training-lightbox-panel">
            <div className="training-lightbox-header">
              <div>
                <strong>{openFigure.title}</strong>
                <span>{openFigure.caption}</span>
              </div>
              <button type="button" className="btn btn-outline btn-compact" onClick={() => setOpenFigure(null)}>Kapat</button>
            </div>
            <img src={openFigure.src} alt={openFigure.title} />
          </div>
        </div>
      )}
    </div>
  );
}
