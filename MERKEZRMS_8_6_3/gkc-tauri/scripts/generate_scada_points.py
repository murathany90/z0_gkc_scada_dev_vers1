from __future__ import annotations

import json
import sys
from pathlib import Path

import openpyxl


PROJECT_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PROJECT_ROOT.parents[1]
DEFAULT_XLSX = REPO_ROOT / "ytbs_scada" / "SCADA_OLCUM_NOKTASI.xlsx"
DEFAULT_OUTPUT = PROJECT_ROOT / "src" / "data" / "scadaPointList.ts"


def as_text(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def as_bool(value: object) -> bool:
    return as_text(value).casefold() in {"true", "1", "evet", "yes", "aktif"}


def ts_literal(value: object) -> str:
    return json.dumps(value, ensure_ascii=False)


def main() -> int:
    xlsx_path = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else DEFAULT_XLSX
    output_path = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else DEFAULT_OUTPUT

    if not xlsx_path.exists():
        raise FileNotFoundError(f"SCADA Excel dosyası bulunamadı: {xlsx_path}")

    workbook = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    sheet = workbook.active
    rows = []

    for row in sheet.iter_rows(min_row=2, values_only=True):
        if not row or not as_text(row[0]):
            continue

        rows.append(
            [
                as_text(row[0]),   # ID (SCADA UUID)
                as_text(row[1]),   # B1 ID
                as_text(row[2]),   # B1 Adı
                as_text(row[3]),   # B2 ID
                as_text(row[4]),   # B2 Adı
                as_text(row[5]),   # B3 ID
                as_text(row[6]),   # B3 Adı
                as_text(row[7]),   # Trafo Merkezi
                as_text(row[8]),   # Anahtar
                as_text(row[9]),   # Element ID
                as_text(row[10]),  # Element Adı
                as_text(row[11]),  # Noel
                as_text(row[12]),  # Nimset
                as_bool(row[17]),  # EŞLİ
                as_bool(row[18]),  # AKTİF
            ]
        )

    analog_count = sum(1 for row in rows if "anahtar" not in row[11].casefold())
    digital_count = len(rows) - analog_count
    active_count = sum(1 for row in rows if row[14])

    row_lines = ",\n".join(f"  {ts_literal(row)}" for row in rows)

    output = f"""export type ScadaMeasurementKind = 'analog' | 'digital';

export interface ScadaMeasurementPoint {{
  id: string;
  b1Id: string;
  b1Adi: string;
  b2Id: string;
  b2Adi: string;
  b3Id: string;
  b3Adi: string;
  trafoMerkezi: string;
  anahtar: string;
  elementId: string;
  elementAdi: string;
  noel: string;
  nimset: string;
  esli: boolean;
  aktif: boolean;
  measurementKind: ScadaMeasurementKind;
  unit: string;
}}

export type ScadaPoint = ScadaMeasurementPoint;

export interface ScadaSelectOption {{
  value: string;
  label: string;
}}

type ScadaPointRow = [
  string, string, string, string, string, string, string, string, string, string, string, string, string, boolean, boolean
];

// Auto-generated from ../../ytbs_scada/SCADA_OLCUM_NOKTASI.xlsx.
// Rows: {len(rows)} | Analog: {analog_count} | Digital: {digital_count} | Active: {active_count}
const SCADA_POINT_ROWS: ScadaPointRow[] = [
{row_lines}
];

const inferMeasurementKind = (noel: string): ScadaMeasurementKind =>
  noel.toLocaleLowerCase('tr-TR').includes('anahtar') ? 'digital' : 'analog';

const inferUnit = (elementId: string): string => {{
  const match = elementId.match(/\\((kV|MW|MVAr|MVA)\\)/);
  return match?.[1] || '';
}};

export const formatScadaElementLabel = (point: ScadaMeasurementPoint): string =>
  point.elementAdi ? `${{point.elementAdi}} - ${{point.elementId}}` : point.elementId;

export const SCADA_POINT_LIST: ScadaMeasurementPoint[] = SCADA_POINT_ROWS.map(([
  id,
  b1Id,
  b1Adi,
  b2Id,
  b2Adi,
  b3Id,
  b3Adi,
  trafoMerkezi,
  anahtar,
  elementId,
  elementAdi,
  noel,
  nimset,
  esli,
  aktif,
]) => ({{
  id,
  b1Id,
  b1Adi,
  b2Id,
  b2Adi,
  b3Id,
  b3Adi,
  trafoMerkezi,
  anahtar,
  elementId,
  elementAdi,
  noel,
  nimset,
  esli,
  aktif,
  measurementKind: inferMeasurementKind(noel),
  unit: inferUnit(elementId),
}}));

export const SCADA_ANALOG_MEASUREMENT_POINTS = SCADA_POINT_LIST.filter(
  point => point.measurementKind === 'analog',
);

export const SCADA_DIGITAL_MEASUREMENT_POINTS = SCADA_POINT_LIST.filter(
  point => point.measurementKind === 'digital',
);

export const SCADA_ACTIVE_MEASUREMENT_POINTS = SCADA_POINT_LIST.filter(point => point.aktif);

export const SCADA_QUERY_MEASUREMENT_POINTS = SCADA_ANALOG_MEASUREMENT_POINTS;
"""

    output_path.write_text(output, encoding="utf-8")
    print(
        f"Generated {output_path} from {xlsx_path.name}: "
        f"{len(rows)} rows, {analog_count} analog, {digital_count} digital, {active_count} active"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
