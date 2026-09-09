import { strFromU8, unzipSync } from 'fflate';
import type { PmuSample } from '../types/oscillationTypes.ts';
import type {
  BenchmarkDataFinding,
  BenchmarkSamplingSummary,
  SasAlgoRow,
  SasCentreRow,
  SasExternalEvent,
  SasImportResult,
} from './sasTypes.ts';

const REQUIRED_FILES = {
  algo: 'algo.csv',
  pmu: 'pmu.csv',
  merkezAnalysis: 'merkez_analysis.csv',
  merkezMeasurement: 'merkez_measurement.csv',
} as const;

const MAX_ARCHIVE_BYTES = 64 * 1024 * 1024;
const MAX_ENTRY_BYTES = 64 * 1024 * 1024;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 256 * 1024 * 1024;

export class SasImportError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'SasImportError';
    this.code = code;
  }
}

interface ZipEntryInfo {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
}

type CsvRow = Record<string, string>;

const finiteOrNull = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const median = (values: number[]): number | null => {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const average = (values: Array<number | null>): number | null => {
  const finite = values.filter((value): value is number => Number.isFinite(value));
  return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : null;
};

const max = (values: Array<number | null>): number | null => {
  const finite = values.filter((value): value is number => Number.isFinite(value));
  return finite.length ? Math.max(...finite) : null;
};

const min = (values: Array<number | null>): number | null => {
  const finite = values.filter((value): value is number => Number.isFinite(value));
  return finite.length ? Math.min(...finite) : null;
};

const readU16 = (data: Uint8Array, offset: number): number => data[offset] | (data[offset + 1] << 8);
const readU32 = (data: Uint8Array, offset: number): number =>
  (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)) >>> 0;

const isSafeZipEntryName = (name: string): boolean =>
  Boolean(name)
  && !name.includes('\\')
  && !name.startsWith('/')
  && !/^[A-Za-z]:/.test(name)
  && !name.split('/').some(part => part === '..' || part === '.');

const inspectZipEntries = (archive: Uint8Array): ZipEntryInfo[] => {
  if (archive.byteLength > MAX_ARCHIVE_BYTES) {
    throw new SasImportError('ZIP arşivi izin verilen 64 MB sınırını aşıyor.', 'ARCHIVE_TOO_LARGE');
  }
  const minimumEocdOffset = Math.max(0, archive.length - 65_557);
  let eocd = -1;
  for (let offset = archive.length - 22; offset >= minimumEocdOffset; offset -= 1) {
    if (readU32(archive, offset) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new SasImportError('ZIP merkezi dizini bulunamadı.', 'ZIP_DIRECTORY_MISSING');

  const entryCount = readU16(archive, eocd + 10);
  const centralDirectorySize = readU32(archive, eocd + 12);
  const centralDirectoryOffset = readU32(archive, eocd + 16);
  if (centralDirectoryOffset + centralDirectorySize > archive.length) {
    throw new SasImportError('ZIP merkezi dizin sınırları geçersiz.', 'ZIP_DIRECTORY_BOUNDS');
  }

  const decoder = new TextDecoder();
  const entries: ZipEntryInfo[] = [];
  let offset = centralDirectoryOffset;
  let totalUncompressed = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > archive.length || readU32(archive, offset) !== 0x02014b50) {
      throw new SasImportError('ZIP merkezi dizin kaydı geçersiz.', 'ZIP_ENTRY_INVALID');
    }
    const compressedSize = readU32(archive, offset + 20);
    const uncompressedSize = readU32(archive, offset + 24);
    const nameLength = readU16(archive, offset + 28);
    const extraLength = readU16(archive, offset + 30);
    const commentLength = readU16(archive, offset + 32);
    const nameEnd = offset + 46 + nameLength;
    if (nameEnd > archive.length) throw new SasImportError('ZIP dosya adı sınırı geçersiz.', 'ZIP_NAME_BOUNDS');
    const name = decoder.decode(archive.slice(offset + 46, nameEnd));
    if (!isSafeZipEntryName(name)) {
      throw new SasImportError(`Güvensiz ZIP dosya yolu reddedildi: ${name}`, 'ZIP_SLIP_REJECTED');
    }
    if (uncompressedSize > MAX_ENTRY_BYTES || totalUncompressed + uncompressedSize > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new SasImportError('ZIP açılmış veri boyutu güvenlik sınırını aşıyor.', 'ZIP_BOMB_REJECTED');
    }
    totalUncompressed += uncompressedSize;
    entries.push({ name, compressedSize, uncompressedSize });
    offset = nameEnd + extraLength + commentLength;
  }
  return entries;
};

const parseCsv = (text: string, fileName: string): CsvRow[] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(value);
      value = '';
    } else if (char === '\n') {
      row.push(value.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }
  }
  if (quoted) throw new SasImportError(`${fileName}: kapatılmamış CSV tırnağı.`, 'CSV_QUOTE_INVALID');
  if (value.length || row.length) {
    row.push(value.replace(/\r$/, ''));
    rows.push(row);
  }
  const header = rows.shift()?.map(column => column.trim().replace(/^\uFEFF/, '').toLowerCase()) ?? [];
  if (!header.length) throw new SasImportError(`${fileName}: CSV başlığı bulunamadı.`, 'CSV_HEADER_MISSING');
  if (new Set(header).size !== header.length) throw new SasImportError(`${fileName}: yinelenen CSV sütunu var.`, 'CSV_HEADER_DUPLICATE');
  return rows
    .filter(fields => fields.some(field => field.trim()))
    .map((fields, index) => {
      if (fields.length !== header.length) {
        throw new SasImportError(`${fileName}: ${index + 2}. satırda ${header.length} yerine ${fields.length} alan var.`, 'CSV_SCHEMA_INVALID');
      }
      return Object.fromEntries(header.map((column, fieldIndex) => [column, fields[fieldIndex].trim()]));
    });
};

const requireColumns = (rows: CsvRow[], columns: string[], fileName: string): void => {
  const first = rows[0];
  if (!first) throw new SasImportError(`${fileName}: veri satırı yok.`, 'CSV_EMPTY');
  const missing = columns.filter(column => !Object.prototype.hasOwnProperty.call(first, column));
  if (missing.length) {
    throw new SasImportError(`${fileName}: eksik zorunlu sütun(lar): ${missing.join(', ')}.`, 'CSV_SCHEMA_INVALID');
  }
};

const normaliseTimestamp = (raw: string, fileName: string, rowNumber: number): number => {
  const numeric = finiteOrNull(raw);
  const numericMs = numeric === null
    ? null
    : Math.abs(numeric) > 100_000_000_000 ? numeric : numeric * 1000;
  const parsed = numericMs ?? new Date(raw).getTime();
  if (!Number.isFinite(parsed)) {
    throw new SasImportError(`${fileName}: ${rowNumber}. satırdaki zaman damgası geçersiz (${raw}).`, 'TIMESTAMP_INVALID');
  }
  return Math.round(parsed);
};

const asBoolean = (raw: string | undefined): boolean | null => {
  if (raw === undefined || !raw.trim()) return null;
  if (/^(true|1|yes)$/i.test(raw)) return true;
  if (/^(false|0|no)$/i.test(raw)) return false;
  return null;
};

const samplingSummary = (timestamps: number[]): BenchmarkSamplingSummary => {
  const sorted = [...timestamps].sort((left, right) => left - right);
  const intervals = sorted.slice(1).map((value, index) => value - sorted[index]);
  const medianIntervalMs = median(intervals.filter(value => value > 0));
  const gapLimit = (medianIntervalMs ?? Number.POSITIVE_INFINITY) * 1.5;
  return {
    sampleCount: timestamps.length,
    firstTimestampMs: sorted[0] ?? null,
    lastTimestampMs: sorted[sorted.length - 1] ?? null,
    medianIntervalMs,
    sampleRateHz: medianIntervalMs && medianIntervalMs > 0 ? 1000 / medianIntervalMs : null,
    duplicateTimestampCount: intervals.filter(value => value === 0).length,
    backwardsTimestampCount: timestamps.slice(1).filter((value, index) => value < timestamps[index]).length,
    gapCount: intervals.filter(value => value > gapLimit).length,
    maxGapMs: intervals.length ? Math.max(...intervals) : null,
  };
};

const toPmuSamples = (rows: CsvRow[], fileName: string): { samples: PmuSample[]; invalidRows: number } => {
  requireColumns(rows, ['timestamp', 'freq_hz', 'v1_mag', 'v1_ang', 'v2_mag', 'v2_ang', 'v3_mag', 'v3_ang', 'i1_mag', 'i1_ang', 'i2_mag', 'i2_ang', 'i3_mag', 'i3_ang'], fileName);
  let invalidRows = 0;
  const samples = rows.map((row, index) => {
    const timestampMs = normaliseTimestamp(row.timestamp, fileName, index + 2);
    const dataValid = asBoolean(row.data_valid);
    if (dataValid === false) invalidRows += 1;
    const voltageMagnitudes = [finiteOrNull(row.v1_mag), finiteOrNull(row.v2_mag), finiteOrNull(row.v3_mag)];
    const voltageAngles = [finiteOrNull(row.v1_ang), finiteOrNull(row.v2_ang), finiteOrNull(row.v3_ang)];
    const currentMagnitudes = [finiteOrNull(row.i1_mag), finiteOrNull(row.i2_mag), finiteOrNull(row.i3_mag)];
    const currentAngles = [finiteOrNull(row.i1_ang), finiteOrNull(row.i2_ang), finiteOrNull(row.i3_ang)];
    const complexPower = voltageMagnitudes.map((voltage, phase) => {
      const current = currentMagnitudes[phase];
      const voltageAngle = voltageAngles[phase];
      const currentAngle = currentAngles[phase];
      if ([voltage, current, voltageAngle, currentAngle].some(value => value === null)) return null;
      const delta = ((voltageAngle as number) - (currentAngle as number)) * Math.PI / 180;
      return { active: (voltage as number) * (current as number) * Math.cos(delta), reactive: (voltage as number) * (current as number) * Math.sin(delta) };
    });
    const activePower = complexPower.every(Boolean)
      ? complexPower.reduce((sum, phase) => sum + (phase?.active ?? 0), 0) / 1_000_000
      : undefined;
    const reactivePower = complexPower.every(Boolean)
      ? complexPower.reduce((sum, phase) => sum + (phase?.reactive ?? 0), 0) / 1_000_000
      : undefined;
    return {
      timestamp: new Date(timestampMs).toISOString(),
      timestampMs,
      sourceZaman: row.timestamp,
      pmuId: 'SAS-PMU',
      frequency: finiteOrNull(row.freq_hz) ?? undefined,
      voltage: (average(voltageMagnitudes) ?? NaN) / 1000 || undefined,
      activePower,
      reactivePower,
      voltageMagnitudeA: voltageMagnitudes[0] ?? undefined,
      voltageMagnitudeB: voltageMagnitudes[1] ?? undefined,
      voltageMagnitudeC: voltageMagnitudes[2] ?? undefined,
      voltageAngleA: voltageAngles[0] ?? undefined,
      voltageAngleB: voltageAngles[1] ?? undefined,
      voltageAngleC: voltageAngles[2] ?? undefined,
      currentMagnitudeA: currentMagnitudes[0] ?? undefined,
      currentMagnitudeB: currentMagnitudes[1] ?? undefined,
      currentMagnitudeC: currentMagnitudes[2] ?? undefined,
      currentAngleA: currentAngles[0] ?? undefined,
      currentAngleB: currentAngles[1] ?? undefined,
      currentAngleC: currentAngles[2] ?? undefined,
      quality: dataValid === false ? 'invalid' : dataValid === true ? 'valid' : undefined,
    } satisfies PmuSample;
  });
  return { samples, invalidRows };
};

const toAlgoRows = (rows: CsvRow[], fileName: string): { rows: SasAlgoRow[]; invalidRows: number } => {
  requireColumns(rows, ['timestamp', 'freq_hz', 'f_tgt_hz', 'thr_start_hz', 'magnitude_hz', 'ctrl_value', 'ctrl_state', 'damping_ratio', 'damping_type', 'time_health', 'data_valid'], fileName);
  let invalidRows = 0;
  return {
    rows: rows.map((row, index) => {
      const dataValid = asBoolean(row.data_valid);
      if (dataValid === false) invalidRows += 1;
      const controlValue = finiteOrNull(row.ctrl_value);
      return {
        timestamp: new Date(normaliseTimestamp(row.timestamp, fileName, index + 2)).toISOString(),
        timestampMs: normaliseTimestamp(row.timestamp, fileName, index + 2),
        frequencyHz: finiteOrNull(row.freq_hz),
        targetFrequencyHz: finiteOrNull(row.f_tgt_hz),
        startThresholdHz: finiteOrNull(row.thr_start_hz),
        magnitudeHz: finiteOrNull(row.magnitude_hz),
        controlValue: controlValue === -1 || controlValue === 0 || controlValue === 1 ? controlValue : null,
        controlState: row.ctrl_state || 'UNKNOWN',
        dampingRatio: finiteOrNull(row.damping_ratio),
        dampingType: row.damping_type || 'UNKNOWN',
        timeHealth: row.time_health || 'UNKNOWN',
        dataValid,
      };
    }),
    invalidRows,
  };
};

const toCentreRows = (rows: CsvRow[], fileName: string): SasCentreRow[] => {
  requireColumns(rows, ['ts', 'freq', 'p_inst_w', 'q_inst_var', 'device_id', 'role', 'time_quality', 'data_quality'], fileName);
  return rows.map((row, index) => {
    const timestampMs = normaliseTimestamp(row.ts_unix_ms || row.ts, fileName, index + 2);
    return {
      timestamp: new Date(timestampMs).toISOString(),
      timestampMs,
      frequencyHz: finiteOrNull(row.freq),
      activePowerW: finiteOrNull(row.p_inst_w),
      reactivePowerVAr: finiteOrNull(row.q_inst_var),
      deviceId: row.device_id,
      role: row.role,
      timeQuality: row.time_quality,
      dataQuality: row.data_quality,
    };
  });
};

export const buildSasExternalEvents = (algoRows: SasAlgoRow[]): SasExternalEvent[] => {
  const sorted = [...algoRows].sort((left, right) => left.timestampMs - right.timestampMs);
  const summary = samplingSummary(sorted.map(row => row.timestampMs));
  const maxGapMs = Math.max((summary.medianIntervalMs ?? 200) * 3, 1_000);
  const groups: SasAlgoRow[][] = [];
  let current: SasAlgoRow[] = [];
  const finishCurrent = () => {
    if (current.length) groups.push(current);
    current = [];
  };
  sorted.forEach(row => {
    const previous = current[current.length - 1];
    if (row.controlState !== 'ACTIVE') {
      finishCurrent();
    } else if (previous && row.timestampMs - previous.timestampMs > maxGapMs) {
      finishCurrent();
      current.push(row);
    } else {
      current.push(row);
    }
  });
  finishCurrent();
  return groups.map((group, index) => {
    const damping = group.map(row => row.dampingRatio);
    const dampingTypes = [...new Set(group.map(row => row.dampingType))];
    return {
      id: `sas-active-${group[0].timestampMs}-${index + 1}`,
      startMs: group[0].timestampMs,
      endMs: group[group.length - 1]?.timestampMs ?? group[0].timestampMs,
      durationSeconds: Math.max(0, ((group[group.length - 1]?.timestampMs ?? group[0].timestampMs) - group[0].timestampMs) / 1000),
      targetFrequencyHz: average(group.map(row => row.targetFrequencyHz)),
      startThresholdHz: average(group.map(row => row.startThresholdHz)),
      peakMagnitudeHz: max(group.map(row => row.magnitudeHz)),
      minDampingRatioPercent: min(damping) === null ? null : (min(damping) as number) * 100,
      averageDampingRatioPercent: average(damping) === null ? null : (average(damping) as number) * 100,
      dampingTypes,
      hasNegativeDamping: damping.some(value => value !== null && value < 0),
      controlValues: [...new Set(group.map(row => row.controlValue).filter((value): value is -1 | 0 | 1 => value !== null))],
      rowCount: group.length,
    };
  });
};

const finalPathPart = (name: string): string => {
  const parts = name.split('/');
  return parts[parts.length - 1]?.toLowerCase() ?? '';
};

const requiredFileKeyForName = (name: string): keyof typeof REQUIRED_FILES | null => {
  const baseName = finalPathPart(name);
  const match = (Object.entries(REQUIRED_FILES) as Array<[keyof typeof REQUIRED_FILES, string]>)
    .find(([_key, expected]) => baseName === expected || baseName.endsWith(`_${expected}`));
  return match?.[0] ?? null;
};

export const importSasEventZip = (archive: Uint8Array, archiveName = 'SAS benchmark ZIP'): SasImportResult => {
  const entries = inspectZipEntries(archive);
  const entryByRequiredKey = new Map<keyof typeof REQUIRED_FILES, ZipEntryInfo>();
  entries.forEach(entry => {
    const key = requiredFileKeyForName(entry.name);
    if (key) {
      if (entryByRequiredKey.has(key)) throw new SasImportError(`ZIP içinde yinelenen ${REQUIRED_FILES[key]} bulundu.`, 'ZIP_DUPLICATE_REQUIRED_FILE');
      entryByRequiredKey.set(key, entry);
    }
  });
  const missing = (Object.keys(REQUIRED_FILES) as Array<keyof typeof REQUIRED_FILES>)
    .filter(key => !entryByRequiredKey.has(key))
    .map(key => REQUIRED_FILES[key]);
  if (missing.length) throw new SasImportError(`Beklenen SAS CSV dosyası eksik: ${missing.join(', ')}.`, 'REQUIRED_FILE_MISSING');

  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = unzipSync(archive, {
      filter: file => requiredFileKeyForName(file.name) !== null,
    });
  } catch (error) {
    throw new SasImportError(`ZIP açılamadı: ${error instanceof Error ? error.message : String(error)}`, 'ZIP_DECOMPRESS_FAILED');
  }
  const textFor = (key: keyof typeof REQUIRED_FILES): { fileName: string; text: string } => {
    const entry = entryByRequiredKey.get(key);
    const bytes = entry && unzipped[entry.name];
    if (!entry || !bytes) throw new SasImportError(`${REQUIRED_FILES[key]} ZIP'ten okunamadı.`, 'ZIP_READ_FAILED');
    return { fileName: entry.name, text: strFromU8(bytes) };
  };

  const algoText = textFor('algo');
  const pmuText = textFor('pmu');
  const centreAnalysisText = textFor('merkezAnalysis');
  const centreMeasurementText = textFor('merkezMeasurement');
  const algo = toAlgoRows(parseCsv(algoText.text, algoText.fileName), algoText.fileName);
  const pmu = toPmuSamples(parseCsv(pmuText.text, pmuText.fileName), pmuText.fileName);
  const centreAnalysisRows = toCentreRows(parseCsv(centreAnalysisText.text, centreAnalysisText.fileName), centreAnalysisText.fileName);
  const centreMeasurementRows = toCentreRows(parseCsv(centreMeasurementText.text, centreMeasurementText.fileName), centreMeasurementText.fileName);
  const externalEvents = buildSasExternalEvents(algo.rows);

  const pmuSummary = samplingSummary(pmu.samples.map(sample => sample.timestampMs));
  const algoSummary = samplingSummary(algo.rows.map(row => row.timestampMs));
  const centreAnalysisSummary = samplingSummary(centreAnalysisRows.map(row => row.timestampMs));
  const centreMeasurementSummary = samplingSummary(centreMeasurementRows.map(row => row.timestampMs));
  const findings: BenchmarkDataFinding[] = [];
  if (pmuSummary.sampleRateHz && Math.abs(pmuSummary.sampleRateHz - 50) <= 1) {
    findings.push({ severity: 'info', code: 'PMU_50HZ', title: '50 Hz PMU örneklemesi', detail: `pmu.csv medyan aralığı ${pmuSummary.medianIntervalMs?.toFixed(1)} ms (${pmuSummary.sampleRateHz.toFixed(2)} Hz).` });
  } else {
    findings.push({ severity: 'warning', code: 'PMU_RATE_UNEXPECTED', title: 'Beklenmeyen PMU örnekleme hızı', detail: `pmu.csv için ${pmuSummary.sampleRateHz?.toFixed(2) ?? '-'} Hz hesaplandı.` });
  }
  [
    ['PMU', pmuSummary],
    ['SAS algoritma', algoSummary],
    ['Merkez analiz', centreAnalysisSummary],
    ['Merkez ölçüm', centreMeasurementSummary],
  ].forEach(([label, summary]) => {
    const item = summary as BenchmarkSamplingSummary;
    if (item.duplicateTimestampCount || item.backwardsTimestampCount || item.gapCount) {
      findings.push({
        severity: 'warning',
        code: 'TIMESTAMP_ANOMALY',
        title: `${label} zaman dizisi anomalisi`,
        detail: `Tekrarlı: ${item.duplicateTimestampCount}, geriye giden: ${item.backwardsTimestampCount}, boşluk: ${item.gapCount}; en büyük aralık ${item.maxGapMs?.toFixed(1) ?? '-'} ms.`,
      });
    }
  });
  const pmuMedianFrequency = median(pmu.samples.map(sample => sample.frequency ?? NaN));
  [
    ['Merkez analiz', centreAnalysisRows],
    ['Merkez ölçüm', centreMeasurementRows],
  ].forEach(([label, rows]) => {
    const centreMedian = median((rows as SasCentreRow[]).map(row => row.frequencyHz ?? NaN));
    const offset = centreMedian !== null && pmuMedianFrequency !== null ? centreMedian - pmuMedianFrequency : null;
    if (offset !== null && Math.abs(Math.abs(offset) - 50) <= 2) {
      findings.push({ severity: 'warning', code: 'CENTER_FREQUENCY_OFFSET_50HZ', title: `${label} frekansında yaklaşık +50 Hz offset`, detail: `${label} medyanı ${centreMedian?.toFixed(3)} Hz; pmu.csv medyanından ${offset >= 0 ? '+' : ''}${offset.toFixed(3)} Hz farklı. Değer otomatik düzeltilmedi.` });
    }
  });
  if (pmu.invalidRows || algo.invalidRows) {
    findings.push({ severity: 'warning', code: 'DATA_VALID_FALSE', title: 'Geçersiz işaretlenen kayıtlar', detail: `PMU: ${pmu.invalidRows}, SAS algoritma: ${algo.invalidRows} satır.` });
  }
  const timeHealthCounts = new Map<string, number>();
  algo.rows.forEach(row => timeHealthCounts.set(row.timeHealth, (timeHealthCounts.get(row.timeHealth) ?? 0) + 1));
  findings.push({
    severity: 'info',
    code: 'ALGO_TIME_HEALTH',
    title: 'SAS zaman sağlığı',
    detail: [...timeHealthCounts.entries()].map(([health, count]) => `${health}: ${count}`).join(', ') || 'Bilinmiyor.',
  });
  findings.push({
    severity: algo.invalidRows ? 'warning' : 'info',
    code: 'ALGO_DATA_VALIDITY',
    title: 'SAS veri geçerliliği',
    detail: `${algo.rows.length - algo.invalidRows}/${algo.rows.length} algo.csv satırında data_valid=True; bu alan zaman sağlığından bağımsızdır.`,
  });
  const centreSyncLost = [...centreAnalysisRows, ...centreMeasurementRows]
    .filter(row => /SYNC_LOST/i.test(row.dataQuality)).length;
  if (centreSyncLost) {
    findings.push({ severity: 'warning', code: 'CENTER_SYNC_LOST', title: 'Merkez veri kalitesi: SYNC_LOST', detail: `${centreSyncLost} merkez satırında data_quality SYNC_LOST. Zaman sağlığı ve veri kalitesi ayrı değerlendirilir.` });
  }

  return {
    archiveName,
    recognisedFiles: {
      algo: algoText.fileName,
      pmu: pmuText.fileName,
      merkezAnalysis: centreAnalysisText.fileName,
      merkezMeasurement: centreMeasurementText.fileName,
    },
    pmuSamples: pmu.samples.sort((left, right) => left.timestampMs - right.timestampMs),
    algoRows: algo.rows.sort((left, right) => left.timestampMs - right.timestampMs),
    centreAnalysisRows: centreAnalysisRows.sort((left, right) => left.timestampMs - right.timestampMs),
    centreMeasurementRows: centreMeasurementRows.sort((left, right) => left.timestampMs - right.timestampMs),
    externalEvents,
    quality: {
      pmu: pmuSummary,
      algo: algoSummary,
      centreAnalysis: centreAnalysisSummary,
      centreMeasurement: centreMeasurementSummary,
      invalidPmuRows: pmu.invalidRows,
      invalidAlgoRows: algo.invalidRows,
      findings,
    },
  };
};
