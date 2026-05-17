import { OSCILLATION_BANDS } from '../utils/bands.ts';
import { PMU_FIDERS, useOscillationStore, type OscillationDataSourceMode } from '../store/oscillationStore.ts';
import type { OscillationAmplitudeThresholds } from '../types/oscillationTypes.ts';
import { PmuSelectionControl } from './PmuSelectionControl.tsx';

const SOURCE_LABELS: Record<OscillationDataSourceMode, string> = {
  none: 'YTBS PMU / Demo PMU',
  ytbs: 'YTBS PMU verisi',
  demo: 'Demo PMU verisi',
};

const THRESHOLD_FIELDS: Array<{
  key: keyof OscillationAmplitudeThresholds;
  shortLabel: string;
  inputLabel: string;
  max: number;
  step: number;
}> = [
  { key: 'frequencyMhz', shortLabel: 'Frk', inputLabel: 'Frekans genlik eşiği mHz', max: 1000, step: 1 },
  { key: 'voltagePercent', shortLabel: 'Ger', inputLabel: 'Gerilim genlik eşiği yüzde', max: 100, step: 0.1 },
  { key: 'activePowerPercent', shortLabel: 'MW', inputLabel: 'Aktif güç genlik eşiği yüzde', max: 100, step: 0.1 },
  { key: 'reactivePowerPercent', shortLabel: 'MVAr', inputLabel: 'Reaktif güç genlik eşiği yüzde', max: 100, step: 0.1 },
];

const numericOptions = (values: number[]) => values.map(value => <option key={value} value={value}>{value} sn</option>);

export function OscillationFilterBar() {
  const store = useOscillationStore();
  const selectedPmus = PMU_FIDERS.filter(pmu => store.selectedPmuIds.includes(pmu.id));
  const durationMs = new Date(store.endTime).getTime() - new Date(store.startTime).getTime();
  const durationHours = Number.isFinite(durationMs) ? durationMs / 3_600_000 : 0;
  const invalidDuration = !Number.isFinite(durationMs) || durationMs <= 0 || durationHours > 4;
  const statusText = store.analysisResult
    ? 'Bulgu hazır'
    : store.rawSamples.length
      ? store.dataSourceMode === 'demo' ? 'Demo veri hazır' : 'Veri hazır'
      : 'Veri bekleniyor';
  const noteText = invalidDuration
    ? 'Maksimum sorgu süresi 4 saattir ve bitiş başlangıçtan sonra olmalıdır.'
    : [
      store.queryNotice,
      store.queryProgress
        ? `${store.queryProgress.completedPmus}/${store.queryProgress.totalPmus} PMU, ${store.queryProgress.completedChunks}/${store.queryProgress.totalChunks} parça`
        : null,
    ].filter(Boolean).join(' - ');

  const handleFetch = async () => {
    await store.fetchPmuData();
  };

  return (
    <div className="card oscillation-filter-card">
      <div className="card-header oscillation-filter-header">
        <span className="card-title">Salınım Algılayıcı - PMU Modal Analiz ve Raporlama</span>
        <span className={`oscillation-source-pill source-${store.dataSourceMode}`}>{SOURCE_LABELS[store.dataSourceMode]}</span>
      </div>

      <div className="card-body oscillation-filter-body">
        <div className="oscillation-filter-summary-row">
          {OSCILLATION_BANDS.map(band => (
            <div key={band.id} className={`oscillation-mode-card${band.passive ? ' passive' : ''}`}>
              <strong>Mod {band.modeValue}</strong>
              <span>{band.name}</span>
              <small>{band.fMin}-{band.fMax} Hz</small>
              <em>{band.passive ? 'Pasif diagnostik' : 'Aktif'}</em>
            </div>
          ))}
          <div className="oscillation-mini-stat">
            <span>Seçilen PMU</span>
            <strong>{store.selectedPmuIds.length}<small>/6</small></strong>
          </div>
          <div className="oscillation-mini-stat">
            <span>PMU Örneği</span>
            <strong>{store.rawSamples.length}</strong>
          </div>
          <div className="oscillation-mini-stat status">
            <span>Status</span>
            <strong>{statusText}</strong>
          </div>
          <div className={`oscillation-mini-notice${invalidDuration ? ' error' : ''}`}>
            <span>{noteText || SOURCE_LABELS[store.dataSourceMode]}</span>
          </div>
        </div>

        <div className="oscillation-filter-controls-grid">
          <label className="oscillation-field" htmlFor="oscillation-selection-mode">
            <span className="oscillation-field-label">Seçim Modu</span>
            <select
              id="oscillation-selection-mode"
              name="oscillation-selection-mode"
              aria-label="Seçim modu"
              className="oscillation-control"
              value={store.selectionMode}
              disabled={store.loading}
              onChange={event => store.setSelectionMode(event.target.value === 'multi' ? 'multi' : 'single')}
            >
              <option value="single">Tekli PMU</option>
              <option value="multi">Çoklu PMU</option>
            </select>
          </label>

          <div className="oscillation-field oscillation-pmu-field">
            <label className="oscillation-field-label" htmlFor="oscillation-pmu-select">PMU GKÇ Fiderleri</label>
            <PmuSelectionControl
              controlId="oscillation-pmu-select"
              mode={store.selectionMode}
              selectedPmuIds={store.selectedPmuIds}
              onChange={store.setSelectedPmuIds}
              disabled={store.loading}
            />
          </div>

          <label className="oscillation-field" htmlFor="oscillation-reference-pmu">
            <span className="oscillation-field-label">Referans PMU</span>
            <select
              id="oscillation-reference-pmu"
              name="oscillation-reference-pmu"
              aria-label="Referans PMU"
              className="oscillation-control"
              value={store.referencePmuId ?? ''}
              disabled={store.selectionMode === 'single' || store.loading}
              onChange={event => store.setReferencePmuId(event.target.value)}
            >
              {selectedPmus.map(pmu => <option key={pmu.id} value={pmu.id}>{pmu.substationName} ({pmu.id})</option>)}
            </select>
          </label>

          <label className="oscillation-field" htmlFor="oscillation-start-time">
            <span className="oscillation-field-label">Başlangıç</span>
            <input
              id="oscillation-start-time"
              name="oscillation-start-time"
              aria-label="Başlangıç"
              type="datetime-local"
              className="oscillation-control"
              value={store.startTime}
              disabled={store.loading}
              onChange={event => store.setDateRange(event.target.value, store.endTime)}
            />
          </label>

          <label className="oscillation-field" htmlFor="oscillation-end-time">
            <span className="oscillation-field-label">Bitiş</span>
            <input
              id="oscillation-end-time"
              name="oscillation-end-time"
              aria-label="Bitiş"
              type="datetime-local"
              className="oscillation-control"
              value={store.endTime}
              disabled={store.loading}
              onChange={event => store.setDateRange(store.startTime, event.target.value)}
            />
          </label>
        </div>

        <div className="oscillation-filter-bottom-grid">
          <div className="oscillation-field">
            <span className="oscillation-field-label">Pencere / Adım</span>
            <div className="oscillation-window-controls">
              <select
                id="oscillation-window-seconds"
                name="oscillation-window-seconds"
                aria-label="Analiz penceresi"
                className="oscillation-control"
                value={store.windowSeconds}
                onChange={event => store.setWindowSeconds(Number(event.target.value))}
              >
                {numericOptions([60, 120, 300, 900])}
              </select>
              <select
                id="oscillation-step-seconds"
                name="oscillation-step-seconds"
                aria-label="Analiz adımı"
                className="oscillation-control"
                value={store.stepSeconds}
                onChange={event => store.setStepSeconds(Number(event.target.value))}
              >
                {numericOptions([10, 30, 60])}
              </select>
            </div>
          </div>

          <div className="oscillation-field oscillation-threshold-group">
            <span className="oscillation-field-label">Eşikler</span>
            <div className="oscillation-threshold-grid">
              {THRESHOLD_FIELDS.map(field => (
                <label key={field.key} className="oscillation-threshold-item" htmlFor={`oscillation-threshold-${field.key}`}>
                  <span>{field.shortLabel}: {store.amplitudeThresholds[field.key]}</span>
                  <input
                    id={`oscillation-threshold-${field.key}`}
                    name={`oscillation-threshold-${field.key}`}
                    aria-label={field.inputLabel}
                    type="number"
                    min={0}
                    max={field.max}
                    step={field.step}
                    className="oscillation-control"
                    value={store.amplitudeThresholds[field.key]}
                    onChange={event => store.setAmplitudeThreshold(field.key, Number(event.target.value))}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="oscillation-actions" aria-label="Salınım aksiyonları">
            <button type="button" className="btn btn-primary btn-compact" disabled={store.loading || invalidDuration} onClick={handleFetch}>
              {store.loading ? 'Sorgulanıyor...' : 'Veriyi Getir'}
            </button>
            <button type="button" className="btn btn-outline btn-compact" disabled={store.loading || store.analyzing} onClick={store.loadDemoData}>
              Demo Verisi
            </button>
            <button type="button" className="btn btn-primary btn-compact oscillation-run-button" disabled={store.analyzing || !store.rawSamples.length} onClick={store.runAnalysis}>
              {store.analyzing ? 'Analiz...' : 'Analizi Çalıştır'}
            </button>
            <button type="button" className="btn btn-outline btn-compact" onClick={store.generateReport} disabled={!store.analysisResult}>Rapor Oluştur</button>
            <button type="button" className="btn btn-outline btn-compact" onClick={store.exportCsv} disabled={!store.rawSamples.length}>CSV Dışa Aktar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
