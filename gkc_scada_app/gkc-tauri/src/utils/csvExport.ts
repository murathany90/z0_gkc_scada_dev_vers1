const YTBS_CSV_HEADERS = [
  'Zaman',
  'y1 (Frekans)',
  'y2',
  'y3 (Gerilim A)',
  'y4 (Gerilim B)',
  'y5 (Gerilim C)',
  'y6',
  'y7 (Akim A)',
  'y8 (Akim B)',
  'y9 (Akim C)',
  'y10',
  'y11 (Aktif Guc)',
  'y12 (Reaktif Guc)',
  'y13 (Gorunen Guc)',
  'y14',
  'y15',
];

const YTBS_CSV_KEYS = [
  'zaman',
  'y1',
  'y2',
  'y3',
  'y4',
  'y5',
  'y6',
  'y7',
  'y8',
  'y9',
  'y10',
  'y11',
  'y12',
  'y13',
  'y14',
  'y15',
];

const YTBS_SCADA_CSV_HEADERS = [
  'Zaman',
  'Deger',
  'Birim',
  'B1',
  'B2',
  'B3',
  'Element',
];

const numericTextPattern = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

const turkishAsciiMap: Record<string, string> = {
  Ç: 'C',
  ç: 'c',
  Ğ: 'G',
  ğ: 'g',
  İ: 'I',
  ı: 'i',
  Ö: 'O',
  ö: 'o',
  Ş: 'S',
  ş: 's',
  Ü: 'U',
  ü: 'u',
};

const repairUtf8Mojibake = (value: string): string => {
  if (!/[ÃÄÅ]/.test(value)) {
    return value;
  }

  try {
    const bytes = Uint8Array.from(Array.from(value, char => char.charCodeAt(0) & 0xff));
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return value;
  }
};

export const toCsvSafeText = (value: string): string =>
  repairUtf8Mojibake(value)
    .replace(/[ÇçĞğİıÖöŞşÜü]/g, char => turkishAsciiMap[char] || char)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\r\n\t]/g, '');

export function formatCsvCellForExcelTr(value: unknown): string {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  let text: string;
  if (typeof value === 'number' && Number.isFinite(value)) {
    text = value.toString().replace('.', ',');
  } else if (typeof value === 'string' && numericTextPattern.test(value.trim())) {
    text = value.trim().replace('.', ',');
  } else {
    text = String(value);
  }

  text = toCsvSafeText(text);

  if (/[;"\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function buildYtbsCsv(rawData: Record<string, unknown>[]): string {
  const headerRow = YTBS_CSV_HEADERS.map(formatCsvCellForExcelTr).join(';');
  const dataRows = rawData.map(item =>
    YTBS_CSV_KEYS.map(key => formatCsvCellForExcelTr(item[key])).join(';')
  );

  return `\uFEFFsep=;\r\n${headerRow}\r\n${dataRows.join('\r\n')}`;
}

export function buildYtbsScadaCsv(
  rawData: Record<string, unknown>[],
  context: { unit: string; b1: string; b2: string; b3: string; element: string },
): string {
  const headerRow = YTBS_SCADA_CSV_HEADERS.map(formatCsvCellForExcelTr).join(';');
  const dataRows = rawData.map(item =>
    [
      item.zaman,
      item.deger,
      context.unit,
      context.b1,
      context.b2,
      context.b3,
      context.element,
    ].map(formatCsvCellForExcelTr).join(';')
  );

  return `\uFEFFsep=;\r\n${headerRow}\r\n${dataRows.join('\r\n')}`;
}
