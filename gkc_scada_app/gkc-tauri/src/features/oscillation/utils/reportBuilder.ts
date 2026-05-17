import { formatCsvCellForExcelTr } from '../../../utils/csvExport.ts';
import type {
  OscillationAnalysisResult,
  OscillationBandId,
  OscillationClassification,
  OscillationEvent,
  PmuFider,
  PmuSample,
  PmuSignalKey,
} from '../types/oscillationTypes.ts';
import { formatPmuDisplayName } from './visualization.ts';

const SIGNAL_LABELS: Record<PmuSignalKey, string> = {
  frequency: 'Frekans',
  voltage: 'Gerilim',
  activePower: 'Aktif Güç',
  reactivePower: 'Reaktif Güç',
};

const BAND_LABELS: Record<OscillationBandId, string> = {
  INTERAREA: 'Bölgeler Arası',
  LOCAL: 'Yerel',
  FORCED: 'Zorlanmış',
  TORSION_PASSIVE: 'Pasif Torsiyon',
};

const CLASSIFICATION_LABELS: Record<OscillationClassification, string> = {
  MOD_YOK: 'Salınım yok',
  TEK_PMU_LOKAL_BULGU: 'Tek PMU yerel salınım bulgusu',
  GENIS_ALAN_ADAY_MOD: 'Geniş alan salınım adayı',
  TR_INTERAREA_ADAY_MOD: 'Bölgeler arası salınım adayı',
  TR_INTERAREA_GUCLU_MOD: 'Güçlü bölgeler arası salınım',
  LOKAL_ELEKTROMEKANIK_ADAY: 'Yerel elektromekanik salınım adayı',
  FORCED_ADAY: 'Zorlanmış salınım adayı',
  RINGDOWN_ADAY: 'Sönümlenen ringdown adayı',
  VERI_KALITESI_YETERSIZ: 'Veri kalitesi yetersiz',
};

const formatNumber = (value: number | null | undefined, digits = 3): string =>
  Number.isFinite(value) ? Number(value).toLocaleString('tr-TR', { maximumFractionDigits: digits }) : '-';

const formatTime = (timestampMs: number): string => {
  const date = new Date(timestampMs);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '-';
  const totalSeconds = Math.round(seconds);
  if (totalSeconds < 60) return `${totalSeconds} sn`;
  const minutes = Math.floor(totalSeconds / 60);
  const rest = totalSeconds % 60;
  return rest ? `${minutes} dk ${rest} sn` : `${minutes} dk`;
};

const pmuNameFrom = (pmuDevices: PmuFider[], pmuId: string): string =>
  formatPmuDisplayName(pmuDevices.find(device => device.id === pmuId) ?? pmuId);

export const humanizeClassification = (classification: OscillationClassification): string =>
  CLASSIFICATION_LABELS[classification] ?? classification;

export const humanizeBand = (bandId: OscillationBandId | null | undefined): string =>
  bandId ? BAND_LABELS[bandId] : 'Salınım yok';

export const signalLabel = (signal: PmuSignalKey): string => SIGNAL_LABELS[signal];

export const buildDecisionSupportSentences = ({
  result,
  pmuDevices,
}: {
  result: OscillationAnalysisResult | null;
  pmuDevices: PmuFider[];
}): string[] => {
  if (!result) return ['Analiz sonucu bulunmuyor. Önce PMU verisini alın ve analizi çalıştırın.'];
  if (!result.events.length) {
    return ['Seçilen zaman aralığında eşik üstü salınım olayı tespit edilmedi. İzleme sonuçları normal takip kapsamında değerlendirilebilir.'];
  }

  return result.events
    .slice()
    .sort((left, right) =>
      Number(right.hasNegativeDamping) - Number(left.hasNegativeDamping)
      || (right.maxEnergyRms ?? 0) - (left.maxEnergyRms ?? 0)
    )
    .slice(0, 8)
    .map(event => describeOscillationEvent(event, pmuDevices));
};

export const describeOscillationEvent = (event: OscillationEvent, pmuDevices: PmuFider[]): string => {
  const pmuName = pmuNameFrom(pmuDevices, event.pmuId);
  const band = humanizeBand(event.bandId);
  const frequency = formatNumber(event.dominantFrequencyHz, 3);
  const damping = formatNumber(event.minDampingRatioPercent ?? event.averageDampingRatioPercent, 2);
  const trend = event.hasNegativeDamping
    ? `Salınımın sönümleme oranı (% ${damping}) negatif olduğu için sistemde büyüme eğilimi gösteren kararsızlık riski bulunmaktadır.`
    : `Salınımın sönümleme oranı (% ${damping}) negatif değildir; olay sönümlenme eğilimiyle izlenmelidir.`;

  return `${pmuName} fiderinde ${formatTime(event.startMs)} - ${formatTime(event.endMs)} zaman aralığında, süresi ${formatDuration(event.durationSeconds)} olan, frekansı ${frequency} Hz ${band} salınım tespit edilmiştir. ${trend}`;
};

export const buildSummaryText = (result: OscillationAnalysisResult | null, pmuDevices: PmuFider[]): string => {
  if (!result) {
    return 'Analiz sonucu bulunmuyor. Gerçek YTBS PMU verisi çekildikten sonra rapor oluşturulur.';
  }

  const pmuNames = pmuDevices.map(device => formatPmuDisplayName(device)).join(', ');
  const strongestMode = result.commonModes[0];
  const interareaMetricCount = result.metrics.filter(metric => metric.bandId === 'INTERAREA' && metric.classificationLabel !== 'MOD_YOK').length;

  return [
    `Seçilen zaman aralığında ${result.query.pmuIds.length} adet PMU GKÇ fiderinden veri alınmıştır.`,
    `Değerlendirilen PMU fiderleri: ${pmuNames || result.query.pmuIds.map(pmuId => pmuNameFrom(pmuDevices, pmuId)).join(', ')}.`,
    'Ana odak bandı interarea salınım aralığı olan 0.10-0.40 Hz aralığıdır.',
    strongestMode
      ? `En baskın mod ${formatNumber(strongestMode.frequencyHz)} Hz bandında ${humanizeClassification(strongestMode.classificationLabel)} bulgusu üretmiştir.`
      : 'Ortak baskın mod bulunmamıştır.',
    `Interarea bandında ${interareaMetricCount} sinyal/PMU bulgusu raporlanmıştır.`,
    result.events.length
      ? `${result.events.length} adet zamanlanmış salınım olayı rapora eklenmiştir.`
      : 'Zamanlanmış eşik üstü salınım olayı bulunmamıştır.',
  ].join(' ');
};

export const buildMarkdownReport = (result: OscillationAnalysisResult | null, pmuDevices: PmuFider[]): string => {
  if (!result) return buildSummaryText(result, pmuDevices);

  const lines = [
    '# Salınım Algılayıcı Raporu',
    '',
    buildSummaryText(result, pmuDevices),
    '',
    '## Veri Kalitesi',
    ...result.dataQuality.pmuQuality.map(quality =>
      `- ${pmuNameFrom(pmuDevices, quality.pmuId)}: ${quality.received}/${quality.expected} örnek, eksik oran ${formatNumber(quality.missingRatio * 100, 2)}%, durum ${quality.status}`
    ),
    '',
    '## Karar Destek Sistemi',
    ...buildDecisionSupportSentences({ result, pmuDevices }).map(sentence => `- ${sentence}`),
    '',
    '## Baskın Modlar',
    ...(result.commonModes.length
      ? result.commonModes.map(mode =>
        `- ${mode.modeId}: ${formatNumber(mode.frequencyHz)} Hz, ${humanizeBand(mode.bandId)}, PMU ${mode.participatingPmuIds.length}/${result.query.pmuIds.length}, ${humanizeClassification(mode.classificationLabel)}`
      )
      : ['- Ortak baskın mod bulunmadı.']),
    '',
    '## Metrikler',
    ...result.metrics.slice(0, 40).map(metric =>
      `- ${pmuNameFrom(pmuDevices, metric.pmuId)} ${signalLabel(metric.signal)} ${humanizeBand(metric.bandId)}: f=${formatNumber(metric.dominantFrequencyHz)} Hz, RMS=${formatNumber(metric.bandRms)}, damping=${formatNumber(metric.dampingRatioPercent)}%, ${humanizeClassification(metric.classificationLabel)}`
    ),
  ];

  return lines.join('\n');
};

export const buildOscillationCsv = (samples: PmuSample[]): string => {
  const headers = ['Timestamp', 'PMU', 'Frekans', 'Gerilim', 'Aktif Guc', 'Reaktif Guc'];
  const rows = samples.map(sample => [
    sample.sourceZaman ?? sample.timestamp,
    formatPmuDisplayName(sample.pmuId),
    sample.frequency,
    sample.voltage,
    sample.activePower,
    sample.reactivePower,
  ]);

  return `\uFEFFsep=;\r\n${headers.map(formatCsvCellForExcelTr).join(';')}\r\n${rows.map(row => row.map(formatCsvCellForExcelTr).join(';')).join('\r\n')}`;
};
