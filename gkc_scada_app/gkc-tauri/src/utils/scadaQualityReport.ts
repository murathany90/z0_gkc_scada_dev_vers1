import {
  formatScadaVoltageLevelLabel,
  type ScadaMeasurementPoint,
  type ScadaSelectOption,
} from '../data/scadaPointList.ts';
import { formatCsvCellForExcelTr } from './csvExport.ts';
import {
  calculateThresholdSeriesEstimate,
  formatThresholdPercent,
  isThresholdAnalogElement,
  type ThresholdInputSample,
} from './scadaThreshold.ts';

export interface ScadaQualitySample {
  zaman: string;
  deger: number;
}

export interface ScadaQualityStats {
  sampleCount: number;
  samplesPerMinute: number | null;
  min: number | null;
  max: number | null;
  average: number | null;
  averageThresholdPercent: number | null;
  averageThresholdEngineering: number | null;
}

export type ScadaQualityReportRowStatus = 'pending' | 'running' | 'done' | 'error';

export interface ScadaQualityReportRow {
  id: string;
  point: ScadaMeasurementPoint;
  status: ScadaQualityReportRowStatus;
  stats: ScadaQualityStats | null;
  error: string | null;
}

export const SCADA_QUALITY_STATUS_LABELS: Record<ScadaQualityReportRowStatus, string> = {
  pending: 'Bekliyor',
  running: 'Sorgulanıyor',
  done: 'Tamamlandı',
  error: 'Hata',
};

const EMPTY_STATS: ScadaQualityStats = {
  sampleCount: 0,
  samplesPerMinute: null,
  min: null,
  max: null,
  average: null,
  averageThresholdPercent: null,
  averageThresholdEngineering: null,
};

export const filterAnalogScadaPointsByB1 = (
  points: ScadaMeasurementPoint[],
  b1Adi: string,
) => {
  const normalizedB1 = b1Adi.trim();
  if (!normalizedB1) return [];

  return points
    .filter(point =>
      point.measurementKind === 'analog' &&
      point.b1Adi === normalizedB1 &&
      isThresholdAnalogElement(point.elementAdi)
    )
    .slice()
    .sort((a, b) => {
      const b2Compare = a.b2Adi.localeCompare(b.b2Adi, 'tr');
      if (b2Compare !== 0) return b2Compare;
      const b3Compare = a.b3Adi.localeCompare(b.b3Adi, 'tr');
      if (b3Compare !== 0) return b3Compare;
      return a.elementId.localeCompare(b.elementId, 'tr');
    });
};

export const buildScadaQualityRows = (
  points: ScadaMeasurementPoint[],
): ScadaQualityReportRow[] =>
  points.map(point => ({
    id: point.id,
    point,
    status: 'pending',
    stats: null,
    error: null,
  }));

const normalizeOptionText = (value: string | undefined | null) =>
  (value || '').trim().toLocaleUpperCase('tr-TR');

export const resolveScadaQueryId = (
  point: ScadaMeasurementPoint,
  remoteElementOptions: ScadaSelectOption[] | undefined | null,
) => {
  const options = remoteElementOptions || [];
  const exactLocalOption = options.find(option => option.value === point.id);
  if (exactLocalOption) {
    return exactLocalOption.value;
  }

  const elementCode = normalizeOptionText(point.elementAdi);
  const elementLabel = normalizeOptionText(point.elementId);
  const remoteElementOption = options.find(option => {
    const label = normalizeOptionText(option.label);
    return label === elementCode || label === elementLabel || label.includes(`(${elementCode})`);
  });

  return remoteElementOption?.value || point.id;
};

const toThresholdSamples = (samples: ScadaQualitySample[]): ThresholdInputSample[] =>
  samples.map((sample, index) => ({
    timestamp: index,
    value: sample.deger,
  }));

export const calculateDataRatePerMinute = (
  sampleCount: number,
  startTime: string,
  endTime: string,
): number | null => {
  const startTimestamp = new Date(startTime).getTime();
  const endTimestamp = new Date(endTime).getTime();
  if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp)) {
    return null;
  }

  const minutes = (endTimestamp - startTimestamp) / 60000;
  if (minutes <= 0) {
    return null;
  }

  return sampleCount / minutes;
};

export const formatDataRatePerMinute = (value: number | null | undefined): string =>
  Number.isFinite(value)
    ? `${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} veri/dk`
    : '-';

export const calculateScadaQualityStats = (
  point: ScadaMeasurementPoint,
  samples: ScadaQualitySample[],
  startTime?: string,
  endTime?: string,
): ScadaQualityStats => {
  const values = samples
    .map(sample => sample.deger)
    .filter((value): value is number => Number.isFinite(value));

  if (values.length === 0) {
    return {
      ...EMPTY_STATS,
      samplesPerMinute: startTime && endTime
        ? calculateDataRatePerMinute(0, startTime, endTime)
        : null,
    };
  }

  let min = values[0];
  let max = values[0];
  let total = 0;

  values.forEach(value => {
    min = Math.min(min, value);
    max = Math.max(max, value);
    total += value;
  });

  const thresholdEstimate = calculateThresholdSeriesEstimate({
    elementAdi: point.elementAdi,
    samples: toThresholdSamples(samples),
    aciklama2: point.aciklama2,
    aciklama3: point.aciklama3,
  });

  return {
    sampleCount: values.length,
    samplesPerMinute: startTime && endTime
      ? calculateDataRatePerMinute(values.length, startTime, endTime)
      : null,
    min,
    max,
    average: total / values.length,
    averageThresholdPercent: thresholdEstimate.status === 'ok'
      ? thresholdEstimate.averageThresholdPercent
      : null,
    averageThresholdEngineering: thresholdEstimate.status === 'ok'
      ? thresholdEstimate.averageThresholdEngineering
      : null,
  };
};

const formatNumber = (value: number | null | undefined, unit = '', digits = 3) =>
  Number.isFinite(value)
    ? `${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits })}${unit ? ` ${unit}` : ''}`
    : '-';

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export interface ScadaQualityReportExportContext {
  startTime: string;
  endTime: string;
  b1Name: string;
}

const scadaQualityReportHeaders = [
  'B1 Adı',
  'B2',
  'B3',
  'Element',
  'Element Kodu',
  'SCADA Adresi',
  'Analog Aralık',
  'Veri Sayısı',
  'Veri/dk',
  'Minimum',
  'Ortalama',
  'Maksimum',
  'Ort. Threshold %',
  'Ort. Threshold Δ',
  'Durum',
  'Hata',
];

const buildScadaQualityReportCells = (row: ScadaQualityReportRow) => [
  row.point.b1Adi,
  formatScadaVoltageLevelLabel(row.point.b2Adi),
  formatScadaVoltageLevelLabel(row.point.b3Adi),
  row.point.elementId,
  row.point.elementAdi,
  `${row.point.noel} / ${row.point.nimset}`,
  row.point.aciklama2 || '-',
  row.stats?.sampleCount ?? 0,
  formatDataRatePerMinute(row.stats?.samplesPerMinute),
  formatNumber(row.stats?.min, row.point.unit),
  formatNumber(row.stats?.average, row.point.unit),
  formatNumber(row.stats?.max, row.point.unit),
  row.stats?.averageThresholdPercent === null || row.stats?.averageThresholdPercent === undefined
    ? '-'
    : formatThresholdPercent(row.stats.averageThresholdPercent),
  formatNumber(row.stats?.averageThresholdEngineering, row.point.unit),
  SCADA_QUALITY_STATUS_LABELS[row.status],
  row.error || '',
];

export const buildScadaQualityReportCsv = (
  rows: ScadaQualityReportRow[],
  context: ScadaQualityReportExportContext,
): string => {
  const metadataRows = [
    ['Rapor', 'YTBS SCADA Veri Kalitesi Raporu'],
    ['Başlangıç Zamanı', context.startTime],
    ['Bitiş Zamanı', context.endTime],
    ['B1 Adı', context.b1Name],
    [],
  ].map(row => row.map(formatCsvCellForExcelTr).join(';'));
  const headerRow = scadaQualityReportHeaders.map(formatCsvCellForExcelTr).join(';');
  const dataRows = rows.map(row => buildScadaQualityReportCells(row).map(formatCsvCellForExcelTr).join(';'));

  return `\uFEFFsep=;\r\n${[...metadataRows, headerRow, ...dataRows].join('\r\n')}`;
};

export const buildScadaQualityReportPrintHtml = (
  rows: ScadaQualityReportRow[],
  context: ScadaQualityReportExportContext,
): string => {
  const bodyRows = rows.map(row => {
    const cells = buildScadaQualityReportCells(row)
      .map(cell => `<td>${escapeHtml(cell)}</td>`)
      .join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>YTBS SCADA Veri Kalitesi Raporu</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
    h1 { font-size: 18px; margin: 0 0 12px; }
    .meta { font-size: 12px; margin-bottom: 16px; display: grid; grid-template-columns: repeat(3, max-content); gap: 12px 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th, td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: left; vertical-align: top; }
    th { background: #e2e8f0; font-weight: 700; }
    @media print {
      body { margin: 12mm; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
    }
  </style>
</head>
<body>
  <h1>YTBS SCADA Veri Kalitesi Raporu</h1>
  <div class="meta">
    <div><strong>Başlangıç:</strong> ${escapeHtml(context.startTime)}</div>
    <div><strong>Bitiş:</strong> ${escapeHtml(context.endTime)}</div>
    <div><strong>B1 Adı:</strong> ${escapeHtml(context.b1Name)}</div>
  </div>
  <table>
    <thead>
      <tr>${scadaQualityReportHeaders.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
    </thead>
    <tbody>${bodyRows || `<tr><td colspan="${scadaQualityReportHeaders.length}">Kayıt bulunamadı.</td></tr>`}</tbody>
  </table>
</body>
</html>`;
};
