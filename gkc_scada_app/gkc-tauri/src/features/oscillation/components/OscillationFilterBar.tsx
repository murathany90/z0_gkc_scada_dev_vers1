import { OSCILLATION_BANDS } from '../utils/bands.ts';
import { PMU_FIDERS, useOscillationStore } from '../store/oscillationStore.ts';
import type { PmuSignalKey } from '../types/oscillationTypes.ts';
import { PmuSelectionControl } from './PmuSelectionControl.tsx';
import { SIGNAL_LABELS } from './chartHelpers.ts';

const SIGNAL_OPTIONS: PmuSignalKey[] = ['frequency', 'voltage', 'activePower', 'reactivePower'];

const numericOptions = (values: number[]) => values.map(value => <option key={value} value={value}>{value} sn</option>);
const thresholdInputStyle = {
  width: '100%',
  padding: 6,
  borderRadius: 4,
  border: '1px solid var(--border-color)',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: 11,
};

export function OscillationFilterBar() {
  const store = useOscillationStore();
  const selectedPmus = PMU_FIDERS.filter(pmu => store.selectedPmuIds.includes(pmu.id));
  const durationMs = new Date(store.endTime).getTime() - new Date(store.startTime).getTime();
  const durationHours = Number.isFinite(durationMs) ? durationMs / 3_600_000 : 0;
  const invalidDuration = !Number.isFinite(durationMs) || durationMs <= 0 || durationHours > 4;
  const handleFetch = async () => {
    await store.fetchPmuData();
    document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="card oscillation-filter-card">
      <div className="card-header">
        <span className="card-title">Salınım Algılayıcı — PMU Modal Analiz ve Raporlama</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Gerçek YTBS PMU verisi</span>
      </div>
      <div className="card-body" style={{ padding: '8px 12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(280px, 1.4fr) 160px 150px 150px 140px minmax(260px, 1fr) 150px', gap: 8, alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>SEÇİM MODU</label>
            <select id="oscillation-selection-mode" name="oscillation-selection-mode" aria-label="Secim modu" value={store.selectionMode} disabled={store.loading} onChange={event => store.setSelectionMode(event.target.value === 'multi' ? 'multi' : 'single')}
              style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }}>
              <option value="single">Tekli PMU</option>
              <option value="multi">Çoklu PMU</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>PMU GKÇ FİDERLERİ</label>
            <PmuSelectionControl controlId="oscillation-pmu-select" mode={store.selectionMode} selectedPmuIds={store.selectedPmuIds} onChange={store.setSelectedPmuIds} disabled={store.loading} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>REFERANS PMU</label>
            <select id="oscillation-reference-pmu" name="oscillation-reference-pmu" aria-label="Referans PMU" value={store.referencePmuId ?? ''} disabled={store.selectionMode === 'single' || store.loading} onChange={event => store.setReferencePmuId(event.target.value)}
              style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }}>
              {selectedPmus.map(pmu => <option key={pmu.id} value={pmu.id}>{pmu.substationName} ({pmu.id})</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>BAŞLANGIÇ</label>
            <input id="oscillation-start-time" name="oscillation-start-time" aria-label="Baslangic" type="datetime-local" value={store.startTime} disabled={store.loading} onChange={event => store.setDateRange(event.target.value, store.endTime)}
              style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>BİTİŞ</label>
            <input id="oscillation-end-time" name="oscillation-end-time" aria-label="Bitis" type="datetime-local" value={store.endTime} disabled={store.loading} onChange={event => store.setDateRange(store.startTime, event.target.value)}
              style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>PENCERE / ADIM</label>
            <div style={{ display: 'flex', gap: 4 }}>
              <select id="oscillation-window-seconds" name="oscillation-window-seconds" aria-label="Analiz penceresi" value={store.windowSeconds} onChange={event => store.setWindowSeconds(Number(event.target.value))} style={{ width: '50%', padding: 6, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }}>
                {numericOptions([60, 120, 300, 900])}
              </select>
              <select id="oscillation-step-seconds" name="oscillation-step-seconds" aria-label="Analiz adimi" value={store.stepSeconds} onChange={event => store.setStepSeconds(Number(event.target.value))} style={{ width: '50%', padding: 6, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }}>
                {numericOptions([10, 30, 60])}
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>SALINIM GENLİK EŞİKLERİ</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(58px, 1fr))', gap: 4 }}>
              <input
                id="oscillation-threshold-frequency"
                name="oscillation-threshold-frequency"
                aria-label="Frekans genlik esigi mHz"
                title="Frekans eşiği (mHz)"
                type="number"
                min={0}
                max={1000}
                step={1}
                value={store.amplitudeThresholds.frequencyMhz}
                onChange={event => store.setAmplitudeThreshold('frequencyMhz', Number(event.target.value))}
                style={thresholdInputStyle}
              />
              <input
                id="oscillation-threshold-voltage"
                name="oscillation-threshold-voltage"
                aria-label="Gerilim genlik esigi yuzde"
                title="Gerilim eşiği (%)"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={store.amplitudeThresholds.voltagePercent}
                onChange={event => store.setAmplitudeThreshold('voltagePercent', Number(event.target.value))}
                style={thresholdInputStyle}
              />
              <input
                id="oscillation-threshold-active-power"
                name="oscillation-threshold-active-power"
                aria-label="Aktif guc genlik esigi yuzde"
                title="Aktif güç eşiği (%)"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={store.amplitudeThresholds.activePowerPercent}
                onChange={event => store.setAmplitudeThreshold('activePowerPercent', Number(event.target.value))}
                style={thresholdInputStyle}
              />
              <input
                id="oscillation-threshold-reactive-power"
                name="oscillation-threshold-reactive-power"
                aria-label="Reaktif guc genlik esigi yuzde"
                title="Reaktif güç eşiği (%)"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={store.amplitudeThresholds.reactivePowerPercent}
                onChange={event => store.setAmplitudeThreshold('reactivePowerPercent', Number(event.target.value))}
                style={thresholdInputStyle}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(58px, 1fr))', gap: 4, marginTop: 2, fontSize: 9, color: 'var(--text-muted)' }}>
              <span>Frekans mHz</span><span>Gerilim %</span><span>MW %</span><span>MVAr %</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-primary" disabled={store.loading || invalidDuration} onClick={handleFetch} style={{ fontSize: 11, fontWeight: 700 }}>
              {store.loading ? 'Sorgulanıyor...' : 'Veriyi Getir'}
            </button>
            <button className="btn" disabled={store.analyzing || !store.rawSamples.length} onClick={store.runAnalysis} style={{ fontSize: 11 }}>
              {store.analyzing ? 'Analiz...' : 'Analizi Çalıştır'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Sinyaller</span>
          {SIGNAL_OPTIONS.map(signal => (
            <label key={signal} style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <input
                id={`oscillation-signal-${signal}`}
                name={`oscillation-signal-${signal}`}
                type="checkbox"
                checked={store.selectedSignals.includes(signal)}
                onChange={event => {
                  const next = event.target.checked
                    ? [...store.selectedSignals, signal]
                    : store.selectedSignals.filter(item => item !== signal);
                  store.setSelectedSignals(next);
                }}
              />
              {SIGNAL_LABELS[signal]}
            </label>
          ))}
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 10 }}>Bantlar</span>
          {OSCILLATION_BANDS.map(band => (
            <span key={band.id} style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, opacity: band.passive ? 0.65 : 1 }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: band.passive ? 'var(--text-muted)' : 'var(--accent-blue)', display: 'inline-block' }} />
              {band.modeValue}: {band.id} {band.fMin}-{band.fMax} Hz{band.passive ? ' pasif' : ''}
            </span>
          ))}
          <button className="btn" onClick={store.generateReport} disabled={!store.analysisResult} style={{ fontSize: 11, marginLeft: 'auto' }}>Rapor Oluştur</button>
          <button className="btn" onClick={store.exportCsv} disabled={!store.rawSamples.length} style={{ fontSize: 11 }}>CSV Dışa Aktar</button>
        </div>

        {(invalidDuration || store.queryNotice || store.queryProgress) && (
          <div style={{ marginTop: 8, fontSize: 11, color: invalidDuration ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>
            {invalidDuration
              ? 'Maksimum sorgu süresi 4 saattir ve bitiş başlangıçtan sonra olmalıdır.'
              : [
                store.queryNotice,
                store.queryProgress
                  ? `${store.queryProgress.completedPmus}/${store.queryProgress.totalPmus} PMU, ${store.queryProgress.completedChunks}/${store.queryProgress.totalChunks} parça`
                  : null,
              ].filter(Boolean).join(' - ')}
          </div>
        )}
      </div>
    </div>
  );
}
