import { formatCsvCellForExcelTr } from '../../../utils/csvExport.ts';
import type { OscillationAnalysisResult, PmuFider, PmuSample } from '../types/oscillationTypes.ts';

const formatNumber = (value: number | null | undefined, digits = 3): string =>
  Number.isFinite(value) ? Number(value).toLocaleString('tr-TR', { maximumFractionDigits: digits }) : '-';

export const buildSummaryText = (result: OscillationAnalysisResult | null, pmuDevices: PmuFider[]): string => {
  if (!result) {
    return 'Analiz sonucu bulunmuyor. Gerçek YTBS PMU verisi çekildikten sonra rapor oluşturulur.';
  }

  const pmuNames = pmuDevices.map(device => device.name).join(', ');
  const strongestMode = result.commonModes[0];
  const interareaMetricCount = result.metrics.filter(metric => metric.bandId === 'INTERAREA' && metric.classificationLabel !== 'MOD_YOK').length;

  return [
    `Seçilen zaman aralığında ${result.query.pmuIds.length} adet PMU GKÇ fiderinden gerçek YTBS verisi alınmıştır.`,
    `Değerlendirilen PMU fiderleri: ${pmuNames || result.query.pmuIds.join(', ')}.`,
    'Ana odak bandı interarea salınım aralığı olan 0.10-0.40 Hz aralığıdır.',
    strongestMode
      ? `En baskın mod ${formatNumber(strongestMode.frequencyHz)} Hz bandında ${strongestMode.classificationLabel} bulgusu üretmiştir.`
      : 'Ortak baskın mod bulunmamıştır.',
    `Interarea bandında ${interareaMetricCount} sinyal/PMU bulgusu raporlanmıştır.`,
    'Bu sayfa kontrol çıkışı veya sesli/görsel ikaz üretmez; sonuçlar mühendislik analizi amacıyla raporlanır.',
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
      `- ${quality.pmuId}: ${quality.received}/${quality.expected} örnek, eksik oran ${formatNumber(quality.missingRatio * 100, 2)}%, durum ${quality.status}`
    ),
    '',
    '## Baskın Modlar',
    ...(result.commonModes.length
      ? result.commonModes.map(mode =>
        `- ${mode.modeId}: ${formatNumber(mode.frequencyHz)} Hz, ${mode.bandId}, PMU ${mode.participatingPmuIds.length}/${result.query.pmuIds.length}, ${mode.classificationLabel}`
      )
      : ['- Ortak baskın mod bulunmadı.']),
    '',
    '## Metrikler',
    ...result.metrics.slice(0, 40).map(metric =>
      `- ${metric.pmuId} ${metric.signal} ${metric.bandId}: f=${formatNumber(metric.dominantFrequencyHz)} Hz, RMS=${formatNumber(metric.bandRms)}, damping=${formatNumber(metric.dampingRatioPercent)}%, ${metric.classificationLabel}`
    ),
  ];

  return lines.join('\n');
};

export const buildOscillationCsv = (samples: PmuSample[]): string => {
  const headers = ['Timestamp', 'PMU ID', 'Frekans', 'Gerilim', 'Aktif Guc', 'Reaktif Guc'];
  const rows = samples.map(sample => [
    sample.sourceZaman ?? sample.timestamp,
    sample.pmuId,
    sample.frequency,
    sample.voltage,
    sample.activePower,
    sample.reactivePower,
  ]);

  return `\uFEFFsep=;\r\n${headers.map(formatCsvCellForExcelTr).join(';')}\r\n${rows.map(row => row.map(formatCsvCellForExcelTr).join(';')).join('\r\n')}`;
};
