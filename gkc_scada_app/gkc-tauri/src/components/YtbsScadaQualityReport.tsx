import { useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  SCADA_POINT_LIST,
  formatScadaVoltageLevelLabel,
  type ScadaMeasurementPoint,
  type ScadaSelectOption,
} from '../data/scadaPointList';
import type { YtbsStatus } from '../stores/ytbsStore';
import {
  SCADA_QUALITY_STATUS_LABELS,
  buildScadaQualityReportCsv,
  buildScadaQualityReportPrintHtml,
  buildScadaQualityRows,
  calculateScadaQualityStats,
  filterAnalogScadaPointsByB1,
  formatDataRatePerMinute,
  resolveScadaQueryId,
  type ScadaQualityReportRow,
  type ScadaQualitySample,
} from '../utils/scadaQualityReport';
import { formatThresholdPercent } from '../utils/scadaThreshold';

interface YtbsScadaQueryResponse {
  title: string;
  unit: string;
  data: ScadaQualitySample[];
  raw_json: string;
}

interface YtbsScadaOptionsResponse {
  elements?: ScadaSelectOption[];
}

interface QueryProgress {
  total: number;
  done: number;
  remaining: number;
}

export interface OpenScadaPointRequest {
  startTime: string;
  endTime: string;
  point: ScadaMeasurementPoint;
  scadaId: string;
}

const formatInputDateTime = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const oneHourAgo = () => formatInputDateTime(new Date(Date.now() - 60 * 60 * 1000));
const nowInput = () => formatInputDateTime(new Date());

const formatYtbsDateTime = (iso: string) => {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const formatNumber = (value: number | null | undefined, unit = '', digits = 3) =>
  Number.isFinite(value)
    ? `${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits })}${unit ? ` ${unit}` : ''}`
    : '-';

const statusColor: Record<ScadaQualityReportRow['status'], string> = {
  pending: 'var(--text-muted)',
  running: 'var(--accent-yellow)',
  done: 'var(--accent-green)',
  error: 'var(--accent-red)',
};

const statusText = SCADA_QUALITY_STATUS_LABELS;

export function YtbsScadaQualityReport({
  ytbsStatus,
  onOpenScadaPoint,
}: {
  ytbsStatus: YtbsStatus;
  onOpenScadaPoint?: (request: OpenScadaPointRequest) => void;
}) {
  const [startTime, setStartTime] = useState(oneHourAgo);
  const [endTime, setEndTime] = useState(nowInput);
  const [b1Name, setB1Name] = useState('');
  const [rows, setRows] = useState<ScadaQualityReportRow[]>([]);
  const [filterMessage, setFilterMessage] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [progress, setProgress] = useState<QueryProgress>({ total: 0, done: 0, remaining: 0 });
  const remoteElementCacheRef = useRef(new Map<string, ScadaSelectOption[]>());

  const b1Options = useMemo(
    () => Array.from(new Set(SCADA_POINT_LIST.map(point => point.b1Adi).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'tr')),
    [],
  );

  const getRemoteElementOptions = async (row: ScadaQualityReportRow) => {
    const cacheKey = `${row.point.b1Id}|${row.point.b2Id}|${row.point.b3Id}`;
    const cached = remoteElementCacheRef.current.get(cacheKey);
    if (cached) {
      return cached;
    }

    const options = await invoke<YtbsScadaOptionsResponse>('ytbs_scada_options', {
      b1: row.point.b1Id || null,
      b2: row.point.b2Id || null,
      b3: row.point.b3Id || null,
    });
    const elements = options.elements || [];
    remoteElementCacheRef.current.set(cacheKey, elements);
    return elements;
  };

  const resolveRowScadaId = async (row: ScadaQualityReportRow) => {
    if (ytbsStatus !== 'connected') {
      return row.point.id;
    }

    try {
      const remoteElements = await getRemoteElementOptions(row);
      return resolveScadaQueryId(row.point, remoteElements);
    } catch {
      return row.point.id;
    }
  };

  const buildExportContext = () => ({
    startTime: formatYtbsDateTime(startTime),
    endTime: formatYtbsDateTime(endTime),
    b1Name: b1Name.trim() || '-',
  });

  const showExportMessage = (message: string) => {
    setExportMessage(message);
    window.setTimeout(() => setExportMessage(null), 5000);
  };

  const handleExportCsv = () => {
    try {
      showExportMessage('CSV raporu hazırlanıyor...');
      const csvContent = buildScadaQualityReportCsv(rows, buildExportContext());
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `YTBS_SCADA_VERI_KALITESI_RAPORU_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showExportMessage('CSV raporu indirildi. Türkçe karakterler Excel uyumu için ASCII olarak yazıldı.');
    } catch (error) {
      showExportMessage(`CSV raporu oluşturulamadı: ${String(error)}`);
    }
  };

  const handleExportPdf = () => {
    try {
      showExportMessage('PDF raporu hazırlanıyor...');
      const frame = document.createElement('iframe');
      frame.style.position = 'fixed';
      frame.style.right = '0';
      frame.style.bottom = '0';
      frame.style.width = '0';
      frame.style.height = '0';
      frame.style.border = '0';
      frame.title = 'YTBS SCADA Veri Kalitesi Raporu PDF';
      frame.onload = () => {
        const frameWindow = frame.contentWindow;
        if (!frameWindow) {
          frame.remove();
          showExportMessage('PDF raporu açılamadı.');
          return;
        }

        frameWindow.focus();
        frameWindow.print();
        showExportMessage('PDF yazdırma penceresi açıldı. Hedef olarak PDF kaydet seçin.');
        window.setTimeout(() => frame.remove(), 60000);
      };
      frame.srcdoc = buildScadaQualityReportPrintHtml(rows, buildExportContext());
      document.body.appendChild(frame);
    } catch (error) {
      showExportMessage(`PDF raporu oluşturulamadı: ${String(error)}`);
    }
  };

  const handleOpenScadaPoint = async (row: ScadaQualityReportRow) => {
    const scadaId = await resolveRowScadaId(row);
    onOpenScadaPoint?.({
      startTime,
      endTime,
      point: row.point,
      scadaId,
    });
  };

  const handleFilter = () => {
    const filteredPoints = filterAnalogScadaPointsByB1(SCADA_POINT_LIST, b1Name);
    const nextRows = buildScadaQualityRows(filteredPoints);
    setRows(nextRows);
    setProgress({ total: nextRows.length, done: 0, remaining: nextRows.length });

    if (!b1Name.trim()) {
      setFilterMessage('B1 Adı girin.');
    } else if (nextRows.length === 0) {
      setFilterMessage('Bu B1 Adı için analog SCADA adresi bulunamadı.');
    } else {
      setFilterMessage(`${nextRows.length} analog SCADA adresi listelendi.`);
    }
  };

  const handleRemoveRow = (rowId: string) => {
    const nextRows = rows.filter(row => row.id !== rowId);
    setRows(nextRows);
    setProgress({ total: nextRows.length, done: 0, remaining: nextRows.length });
    setFilterMessage(nextRows.length ? `${nextRows.length} analog SCADA adresi listelendi.` : 'Tabloda sorgulanacak adres kalmadı.');
  };

  const handleQueryRows = async () => {
    if (isQuerying || rows.length === 0 || ytbsStatus !== 'connected') return;

    const rowsToQuery = rows.map(row => ({
      ...row,
      status: 'pending' as const,
      stats: null,
      error: null,
    }));
    setRows(rowsToQuery);
    setIsQuerying(true);
    setProgress({ total: rowsToQuery.length, done: 0, remaining: rowsToQuery.length });

    const startTimeParam = formatYtbsDateTime(startTime);
    const endTimeParam = formatYtbsDateTime(endTime);
    let done = 0;

    try {
      for (let index = 0; index < rowsToQuery.length; index += 1) {
        const row = rowsToQuery[index];
        setRows(current => current.map(item => item.id === row.id ? { ...item, status: 'running', error: null } : item));

        try {
          const scadaId = await resolveRowScadaId(row);
          const result = await invoke<YtbsScadaQueryResponse>('ytbs_scada_query', {
            startTime: startTimeParam,
            endTime: endTimeParam,
            b1: row.point.b1Id,
            b2: row.point.b2Id,
            b3: row.point.b3Id,
            scadaId,
          });
          const stats = calculateScadaQualityStats(row.point, result.data || [], startTime, endTime);
          setRows(current => current.map(item => item.id === row.id ? { ...item, status: 'done', stats, error: null } : item));
        } catch (error) {
          setRows(current => current.map(item => item.id === row.id ? { ...item, status: 'error', stats: null, error: String(error) } : item));
        }

        done += 1;
        setProgress({
          total: rowsToQuery.length,
          done,
          remaining: Math.max(rowsToQuery.length - done, 0),
        });

        if (index < rowsToQuery.length - 1) {
          await sleep(1000);
        }
      }
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 20 }}>
      <div className="card">
        <div className="card-header">
          <span className="card-title">YTBS SCADA Veri Kalitesi Raporu</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Kaynak: Yerel katalog + YTBS SCADA analog sorgu</span>
        </div>
        <div className="card-body" style={{ padding: '10px 12px' }}>
          {ytbsStatus !== 'connected' && (
            <div style={{ padding: '10px 12px', background: 'rgba(245,158,11,0.1)', borderRadius: 6, color: 'var(--accent-yellow)', fontSize: 12, marginBottom: 10 }}>
              YTBS oturumu aktif değil. Tablo filtrelenebilir; sorgu için Ayarlar sekmesinden YTBS bağlantısı gerekir.
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 150 }}>
              <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>BAŞLANGIÇ ZAMANI</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={event => setStartTime(event.target.value)}
                disabled={isQuerying}
                style={{ width: '100%', padding: 7, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }}
              />
            </div>
            <div style={{ minWidth: 150 }}>
              <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>BİTİŞ ZAMANI</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={event => setEndTime(event.target.value)}
                disabled={isQuerying}
                style={{ width: '100%', padding: 7, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }}
              />
            </div>
            <div style={{ minWidth: 220, flex: 1 }}>
              <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>B1 ADI</label>
              <input
                list="scada-quality-b1-list"
                value={b1Name}
                onChange={event => setB1Name(event.target.value)}
                disabled={isQuerying}
                placeholder="Örn. BAGLUM"
                style={{ width: '100%', padding: 7, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }}
              />
              <datalist id="scada-quality-b1-list">
                {b1Options.map(option => <option key={option} value={option} />)}
              </datalist>
            </div>
            <button className="btn btn-outline" disabled={isQuerying} onClick={handleFilter} style={{ fontSize: 11, padding: '7px 12px', fontWeight: 600 }}>
              Filtrele
            </button>
            <button
              className="btn btn-primary"
              disabled={isQuerying || rows.length === 0 || ytbsStatus !== 'connected'}
              onClick={handleQueryRows}
              style={{ fontSize: 11, padding: '7px 12px', fontWeight: 700 }}
            >
              {isQuerying ? 'SORGULANIYOR...' : 'SORGULA'}
            </button>
            <button
              className="btn btn-outline"
              disabled={rows.length === 0}
              onClick={handleExportCsv}
              style={{ fontSize: 11, padding: '7px 10px', fontWeight: 600 }}
            >
              CSV
            </button>
            <button
              className="btn btn-outline"
              disabled={rows.length === 0}
              onClick={handleExportPdf}
              style={{ fontSize: 11, padding: '7px 10px', fontWeight: 600 }}
            >
              PDF
            </button>
            <span style={{ fontSize: 11, color: isQuerying ? 'var(--accent-yellow)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Toplam {progress.total || rows.length} · Yapıldı {progress.done} · Kalan {progress.remaining || (progress.total ? progress.total - progress.done : rows.length)}
            </span>
          </div>
          {filterMessage && (
            <div style={{ marginTop: 8, color: rows.length ? 'var(--accent-green)' : 'var(--accent-yellow)', fontSize: 11 }}>
              {filterMessage}
            </div>
          )}
          {exportMessage && (
            <div style={{ marginTop: 8, color: exportMessage.includes('oluşturulamadı') || exportMessage.includes('açılamadı') ? 'var(--accent-red)' : 'var(--accent-green)', fontSize: 11 }}>
              {exportMessage}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">{rows.length} analog SCADA adresi{b1Name.trim() ? ` · ${b1Name.trim()}` : ''}</span>
        </div>
        <div className="card-body" style={{ padding: 0, overflowX: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '3%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '4.5%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '4.5%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '8.5%' }} />
              <col style={{ width: '12.5%' }} />
            </colgroup>
            <thead>
              <tr style={{ color: 'var(--text-muted)', background: 'var(--table-header-bg)' }}>
                {[
                  '',
                  'B1',
                  'B2',
                  'B3',
                  'Element',
                  'SCADA / Aralık',
                  'Veri',
                  'Veri/dk',
                  'Min / Ort / Max',
                  'Ort. Threshold',
                  'Durum',
                ].map(header => (
                  <th key={header || 'remove'} style={{ textAlign: 'left', padding: '8px 8px', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                    B1 Adı ve tarih aralığı girip Filtrele butonuna basın.
                  </td>
                </tr>
              ) : rows.map(row => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--row-border)' }}>
                  <td style={{ padding: '7px 8px' }}>
                    <button
                      className="btn btn-outline btn-compact"
                      disabled={isQuerying}
                      onClick={() => handleRemoveRow(row.id)}
                      aria-label={`${row.point.elementId} satırını kaldır`}
                      title="Tablodan kaldır"
                      style={{ minWidth: 26, padding: '3px 7px', color: 'var(--accent-red)' }}
                    >
                      X
                    </button>
                  </td>
                  <td style={{ padding: '7px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.point.b1Adi}>
                    {row.point.b1Adi}
                  </td>
                  <td style={{ padding: '7px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={formatScadaVoltageLevelLabel(row.point.b2Adi)}>
                    {formatScadaVoltageLevelLabel(row.point.b2Adi)}
                  </td>
                  <td style={{ padding: '7px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={formatScadaVoltageLevelLabel(row.point.b3Adi)}>
                    {formatScadaVoltageLevelLabel(row.point.b3Adi)}
                  </td>
                  <td style={{ padding: '7px 8px', lineHeight: 1.35 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.point.elementId}>{row.point.elementId}</div>
                    <div style={{ color: 'var(--text-muted)' }}>{row.point.elementAdi}</div>
                  </td>
                  <td style={{ padding: '7px 8px', lineHeight: 1.35 }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${row.point.noel} / ${row.point.nimset}`}>
                      {row.point.noel} / {row.point.nimset}
                    </div>
                    <div style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.point.aciklama2 || '-'}>
                      {row.point.aciklama2 || '-'}
                    </div>
                  </td>
                  <td style={{ padding: '7px 8px', fontWeight: 700 }}>{row.stats?.sampleCount ?? '-'}</td>
                  <td style={{ padding: '7px 8px', whiteSpace: 'nowrap' }}>{formatDataRatePerMinute(row.stats?.samplesPerMinute)}</td>
                  <td style={{ padding: '7px 8px', lineHeight: 1.35 }}>
                    <div>Min {formatNumber(row.stats?.min, row.point.unit)}</div>
                    <div>Ort {formatNumber(row.stats?.average, row.point.unit)}</div>
                    <div>Maks {formatNumber(row.stats?.max, row.point.unit)}</div>
                  </td>
                  <td style={{ padding: '7px 8px', lineHeight: 1.35 }}>
                    <div>{row.stats ? formatThresholdPercent(row.stats.averageThresholdPercent) : '-'}</div>
                    <div style={{ color: 'var(--text-muted)' }}>{formatNumber(row.stats?.averageThresholdEngineering, row.point.unit)}</div>
                  </td>
                  <td style={{ padding: '7px 8px' }} title={row.error || statusText[row.status]}>
                    <button
                      type="button"
                      onClick={() => handleOpenScadaPoint(row)}
                      style={{
                        border: 0,
                        background: 'transparent',
                        padding: 0,
                        margin: 0,
                        color: statusColor[row.status],
                        font: 'inherit',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'left',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                      }}
                    >
                      {statusText[row.status]}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
