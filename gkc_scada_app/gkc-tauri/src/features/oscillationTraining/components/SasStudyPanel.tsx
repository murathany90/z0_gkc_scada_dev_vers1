import { useMemo, useState } from 'react';
import { buildSasPulseSimulation } from '../utils/simulationModels.ts';
import { OscillationTrainingChart, type TrainingThemeMode } from './OscillationTrainingChart.tsx';
import { TrainingTerm } from './TrainingTerm.tsx';

const pointPairs = (points: Array<{ timeSeconds: number; value: number }>) => points.map(point => [point.timeSeconds, point.value]);

export function SasStudyPanel({ themeMode }: { themeMode: TrainingThemeMode }) {
  const [amplitude, setAmplitude] = useState(16);
  const [phase, setPhase] = useState(25);
  const [trigger, setTrigger] = useState(10);
  const [release, setRelease] = useState(8);
  const simulation = useMemo(() => buildSasPulseSimulation({
    amplitudeMhz: amplitude,
    phaseDegrees: phase,
    triggerThresholdMhz: trigger,
    releaseThresholdMhz: release,
  }), [amplitude, phase, release, trigger]);

  const frequencyOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ value: [number, number]; seriesName: string }>) => {
        const rows = params.map(item => `${item.seriesName}: ${Number(item.value[1]).toFixed(item.seriesName.includes('Genlik') ? 1 : 4)}`).join('<br/>');
        return `${rows}<br/><span style="color:#64748b">Kısa pencere genliği tetik eşiğini aşınca lokal SAS pulse kararı hazırlanır.</span>`;
      },
    },
    xAxis: { name: 'Zaman (s)', min: 0 },
    yAxis: { name: 'Frekans / Genlik', scale: true },
    series: [
      { name: 'Bara frekansı (Hz)', type: 'line', showSymbol: false, data: pointPairs(simulation.frequencySeries), lineStyle: { width: 1.8, color: '#2563eb' }, itemStyle: { color: '#2563eb' } },
      { name: 'Genlik (mHz)', type: 'line', showSymbol: false, data: pointPairs(simulation.shortWindowSeries), yAxisIndex: 0, lineStyle: { width: 1.8, color: '#f59e0b' }, itemStyle: { color: '#f59e0b' } },
      { name: 'Tetik eşiği (mHz)', type: 'line', showSymbol: false, data: pointPairs(simulation.thresholdSeries.trigger), lineStyle: { width: 1, type: 'dashed', color: '#ef4444' }, itemStyle: { color: '#ef4444' } },
      { name: 'Kapanma eşiği (mHz)', type: 'line', showSymbol: false, data: pointPairs(simulation.thresholdSeries.release), lineStyle: { width: 1, type: 'dotted', color: '#10b981' }, itemStyle: { color: '#10b981' } },
    ],
  };

  const pulseOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ value: [number, number]; seriesName: string }>) => {
        const command = params.find(item => item.seriesName === 'FACTS pulse')?.value[1] ?? 0;
        const mode = command > 0 ? 'Kapasitif pulse: pozitif MVAr eğitim komutu' : command < 0 ? 'Endüktif pulse: negatif MVAr eğitim komutu' : 'Pulse yok: izleme veya bekleme';
        return `${params.map(item => `${item.seriesName}: ${Number(item.value[1]).toFixed(1)}`).join('<br/>')}<br/><span style="color:#64748b">${mode}</span>`;
      },
    },
    xAxis: { name: 'Zaman (s)', min: 0 },
    yAxis: { name: 'Faz / MVAr', scale: true },
    series: [
      { name: 'Uzun pencere fazı (°)', type: 'line', showSymbol: false, data: pointPairs(simulation.longWindowSeries), lineStyle: { width: 1.8, color: '#7c3aed' }, itemStyle: { color: '#7c3aed' } },
      { name: 'FACTS pulse', type: 'bar', data: pointPairs(simulation.commandSeries), barMaxWidth: 6, itemStyle: { color: simulation.decision.command > 0 ? '#10b981' : simulation.decision.command < 0 ? '#ef4444' : '#94a3b8' } },
    ],
  };

  return (
    <section className="training-panel">
      <div className="training-section-header">
        <h2>SAS Çalışması</h2>
        <p>
          <TrainingTerm term="sas">SAS</TrainingTerm> lokal bara ölçümünden salınım genliği ve fazını çıkarır; eğitim simülasyonu
          <TrainingTerm term="facts"> FACTS</TrainingTerm> cihazına canlı komut göndermez, yalnız kapasitif/endüktif pulse mantığını gösterir.
        </p>
      </div>

      <div className="training-controls">
        <label>Genlik: {amplitude} mHz
          <input name="training-sas-amplitude" aria-label="SAS genlik değeri" type="range" min="0" max="40" step="1" value={amplitude} onChange={event => setAmplitude(Number(event.target.value))} />
        </label>
        <label>Faz: {phase}°
          <input name="training-sas-phase" aria-label="SAS faz değeri" type="range" min="-180" max="180" step="5" value={phase} onChange={event => setPhase(Number(event.target.value))} />
        </label>
        <label>Tetik: {trigger} mHz
          <input name="training-sas-trigger" aria-label="SAS tetik eşiği" type="range" min="8" max="24" step="1" value={trigger} onChange={event => setTrigger(Number(event.target.value))} />
        </label>
        <label>Kapanma: {release} mHz
          <input name="training-sas-release" aria-label="SAS kapanma eşiği" type="range" min="4" max="18" step="1" value={release} onChange={event => setRelease(Number(event.target.value))} />
        </label>
        <button type="button" className="btn btn-outline btn-compact" onClick={() => { setAmplitude(16); setPhase(25); setTrigger(10); setRelease(8); }}>Sıfırla</button>
      </div>

      <div className={`training-alert ${simulation.decision.status === 'normal' ? 'safe' : simulation.decision.status === 'hold' ? 'watch' : 'critical'}`}>
        <strong>{simulation.decision.label}</strong>
        <span>{simulation.decision.comment}</span>
      </div>

      <div className="training-grid two">
        <article className="training-info-card">
          <h3>Lokal bara tabanlı çalışma</h3>
          <p>
            <TrainingTerm term="basts">BASTS</TrainingTerm>, Sincan, Tosçelik, İçdaş, Çolakoğlu ve MMK gibi kritik merkezlerde
            <TrainingTerm term="statcom"> STATCOM</TrainingTerm> ve <TrainingTerm term="svc">SVC</TrainingTerm> ile bütünleşik düşünülen lokal
            salınım algılama mantığını temsil eder. Haberleşme gecikmesi ve veri kaybı riskini azaltmak için karar kendi bara ölçümüne dayanır.
          </p>
          <table className="training-table">
            <tbody>
              <tr><th>Örnekleme</th><td>{simulation.systemFacts.samplingKhz} kHz gerilim örnekleme</td></tr>
              <tr><th>Frekans hesabı</th><td>{simulation.systemFacts.halfCycleMs} ms yarım çevrim sıfır geçiş hesabı</td></tr>
              <tr><th>Kısa pencere</th><td>{simulation.systemFacts.shortWindowSamples} örnek / {simulation.systemFacts.shortWindowSeconds} saniye genlik tespiti</td></tr>
              <tr><th>Uzun pencere</th><td>{simulation.systemFacts.longWindowSamples} örnek / {simulation.systemFacts.longWindowSeconds} saniye faz doğrulama</td></tr>
              <tr><th>Hedef bant</th><td>{simulation.systemFacts.targetBandHz}, eşik {simulation.systemFacts.amplitudeThresholdMhz} mHz</td></tr>
              <tr><th>Faz toleransı</th><td>±{simulation.systemFacts.phaseToleranceDegrees}°</td></tr>
            </tbody>
          </table>
        </article>
        <article className="training-info-card">
          <h3>Kontrol odası yazılımından farkı</h3>
          <p>
            Lokal <TrainingTerm term="sas">SAS</TrainingTerm> tek baradan hızlı fiziksel aksiyon üretmeye odaklanır. Kontrol odası
            <TrainingTerm term="wam"> WAM</TrainingTerm>/<TrainingTerm term="scada">SCADA</TrainingTerm> yazılımları ise çoklu
            <TrainingTerm term="pmu"> PMU</TrainingTerm> verisiyle <TrainingTerm term="mode-shape">mode shape</TrainingTerm>,
            frekans ve <TrainingTerm term="damping-ratio">DR</TrainingTerm> hesaplayarak operatöre karar destek sunar.
          </p>
          <table className="training-table">
            <tbody>
              <tr><th>Lokal SAS</th><td>Tek bara, düşük gecikme, genlik/faz ve pulse yönü.</td></tr>
              <tr><th>WAM/SCADA</th><td>Çoklu PMU, modal analiz, olay raporu ve operatör yorumu.</td></tr>
              <tr><th>Bu eğitim</th><td>Canlı komut üretmez; yalnız müdahale mantığını güvenli şekilde gösterir.</td></tr>
            </tbody>
          </table>
        </article>
      </div>

      <div className="training-grid two">
        <div className="training-chart-card">
          <div className="training-chart-title">Bara frekansı ve eşik<span>kısa pencere genliği</span></div>
          <OscillationTrainingChart option={frequencyOption} themeMode={themeMode} height={320} />
        </div>
        <div className="training-chart-card">
          <div className="training-chart-title">Pulse yönü<span>kapasitif / endüktif</span></div>
          <OscillationTrainingChart option={pulseOption} themeMode={themeMode} height={320} />
        </div>
      </div>
    </section>
  );
}
