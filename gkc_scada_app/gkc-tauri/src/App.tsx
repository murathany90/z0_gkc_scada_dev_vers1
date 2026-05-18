// GKÇ İstemci - Ana Uygulama Bileşeni
// Modern SCADA dashboard arayüzü — YTBS GKÇ Ölçüm Verileri entegrasyonlu

import { useEffect, useState, useMemo } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useRmsStore } from './stores/rmsStore';
import { useLogStore } from './stores/logStore';
import { useYtbsStore } from './stores/ytbsStore';
import { findScadaPointById, parseYtbsScadaTimestamp, useYtbsScadaStore } from './stores/ytbsScadaStore';
import { DEVICE_LIST, DEVICE_MAP } from './data/deviceList';
import { YtbsScadaQualityReport, type OpenScadaPointRequest } from './components/YtbsScadaQualityReport';
import {
  SCADA_ANALOG_MEASUREMENT_POINTS,
  SCADA_DIGITAL_MEASUREMENT_POINTS,
  SCADA_POINT_LIST,
  formatScadaElementLabel,
  formatScadaVoltageLevelLabel,
  type ScadaMeasurementKind,
} from './data/scadaPointList';
import { buildYtbsCsv, buildYtbsScadaCsv } from './utils/csvExport';
import {
  SCADA_POINT_PAGE_SIZE,
  clampPage,
  getPageCount,
  paginateRows,
  resolveInitialTheme,
  toggleTheme,
  type ThemeMode,
} from './uiState';
import {
  THRESHOLD_DIGITAL_MESSAGE,
  THRESHOLD_MISSING_MESSAGE,
  calculateThresholdSeriesEstimate,
  formatThresholdPercent,
  type ThresholdPointEstimate,
  type ThresholdSeriesEstimate,
} from './utils/scadaThreshold';
import { buildScadaDataRateSeries, formatDataRatePerMinute } from './utils/scadaDataRate';
import { buildScadaQueryChunks } from './utils/scadaQueryChunks';
import { buildYtbsChartGroups, type YtbsChartGroup, type YtbsTimeResolution } from './utils/ytbsPmu';
import { buildYtbsQueryChunks } from './utils/ytbsQueryChunks';
import {
  formatGkcHealthLabel,
  getGkcHealthVisual,
  isGkcQueryMetaCurrent,
  toGkcQueryFazId,
} from './utils/gkcHealth';
import { OscillationPage } from './features/oscillation/components/OscillationPage';
import { useOscillationStore } from './features/oscillation/store/oscillationStore';
import ReactECharts from 'echarts-for-react';
import './index.css';

const APP_HEADER_TITLE = 'GKÇ-SCADA Veri Analiz v2.0';
const THEME_STORAGE_KEY = 'gkc_theme_mode';
const SIDEBAR_STORAGE_KEY = 'gkc_sidebar_open';
const PORTABLE_WINDOW_TITLE = import.meta.env.VITE_PORTABLE_WINDOW_TITLE?.trim();
const SCADA_DATA_RATE_PERIOD_OPTIONS = [
  { value: 1, label: '1 dk' },
  { value: 10, label: '10 dk' },
  { value: 15, label: '15 dk' },
  { value: 60, label: '1 saat' },
];

const chartPalette = (themeMode: ThemeMode) => themeMode === 'light'
  ? {
    title: '#0f172a',
    text: '#0f172a',
    muted: '#475569',
    axis: '#64748b',
    axisLine: '#cbd5e1',
    tooltipBg: 'rgba(255, 255, 255, 0.98)',
    tooltipBorder: '#cbd5e1',
    tooltipValue: '#047857',
    splitLine: 'rgba(148, 163, 184, 0.35)',
  }
  : {
    title: '#f3f4f6',
    text: '#f3f4f6',
    muted: '#94a3b8',
    axis: '#94a3b8',
    axisLine: '#334155',
    tooltipBg: 'rgba(17, 24, 39, 0.95)',
    tooltipBorder: '#374151',
    tooltipValue: '#34d399',
    splitLine: 'rgba(148, 163, 184, 0.16)',
  };

type TooltipExtraRow = { label: string; value: string };

interface TimeChartSeries {
  data: any[];
  color: string;
  label: string;
  type?: 'line' | 'scatter' | 'bar';
  yAxisIndex?: number;
  lineStyle?: Record<string, unknown>;
  showSymbol?: boolean;
  symbolSize?: number;
  labelOptions?: Record<string, unknown>;
  valueFormatter?: (value: number) => string;
  defaultVisible?: boolean;
  barWidth?: number | string;
  barMaxWidth?: number;
  connectNulls?: boolean;
  z?: number;
}

interface ProcessedYtbsData {
  groups: YtbsChartGroup[];
  timeResolution: YtbsTimeResolution;
}

const escapeTooltipText = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const getSeriesValues = (items: TimeChartSeries[]) =>
  items
    .flatMap(s => s.data.map(d => Array.isArray(d) ? d[1] : d))
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

const formatNumericWithUnit = (value: number | undefined | null, unit = '', digits = 3) =>
  Number.isFinite(value)
    ? `${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits })}${unit ? ` ${unit}` : ''}`
    : '-';

function TimeChart({
  series,
  height = 100,
  cssHeight = '100%',
  title,
  themeMode,
  valueAxisName,
  secondaryAxisName,
  extraTooltipRows,
  xAxisRange,
  gridRight,
  timeResolution = 'second',
}: {
  series: TimeChartSeries[];
  height?: number;
  cssHeight?: string | number;
  title?: string;
  themeMode: ThemeMode;
  valueAxisName?: string;
  secondaryAxisName?: string;
  extraTooltipRows?: (timestamp: number) => TooltipExtraRow[];
  xAxisRange?: [number, number] | null;
  gridRight?: number;
  timeResolution?: YtbsTimeResolution;
}) {
  const allVals = getSeriesValues(series);
  if (allVals.length === 0) return <div style={{ height: cssHeight, minHeight: height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>Veri bekleniyor...</div>;

  // Eksen ölçeklendirme için 0 olmayan değerleri bul
  const primaryValues = getSeriesValues(series.filter(s => (s.yAxisIndex ?? 0) === 0));
  const secondaryValues = getSeriesValues(series.filter(s => (s.yAxisIndex ?? 0) === 1));
  const filteredVals = (primaryValues.length ? primaryValues : allVals).filter(v => v !== 0);
  const filteredSecondaryVals = secondaryValues.filter(v => v !== 0);
  const dataMin = filteredVals.length > 0 ? Math.min(...filteredVals) : 0;
  const dataMax = filteredVals.length > 0 ? Math.max(...filteredVals) : 100;
  const secondaryMax = filteredSecondaryVals.length > 0 ? Math.max(...filteredSecondaryVals) : 1;
  const padding = (dataMax - dataMin) * 0.1 || 0.1;
  const secondaryPadding = secondaryMax * 0.15 || 0.1;
  const palette = chartPalette(themeMode);
  const hasSecondaryAxis = series.some(s => (s.yAxisIndex ?? 0) === 1);
  const findSeries = (name: string) => series.find(item => item.label === name);
  const formatChartTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const pad = (value: number, size = 2) => String(value).padStart(size, '0');
    const base = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    return timeResolution === 'millisecond'
      ? `${base}.${pad(date.getMilliseconds(), 3)}`
      : base;
  };

  const valueAxis = {
    type: 'value',
    name: valueAxisName,
    nameTextStyle: { color: palette.axis, fontSize: 10, padding: [0, 0, 4, 0] },
    scale: true,
    min: (val: any) => val.min === 0 ? 0 : dataMin - padding,
    max: (val: any) => val.max === 0 ? 100 : dataMax + padding,
    splitLine: { show: true, lineStyle: { color: palette.splitLine } },
    axisLabel: {
      color: palette.axis,
      fontSize: 10,
      formatter: (val: number) => val.toLocaleString('en-US', { minimumFractionDigits: 1 })
    },
    axisLine: { show: true, lineStyle: { color: palette.axisLine } }
  };

  const option = {
    title: {
      text: title,
      left: 'left',
      top: 'top',
      textStyle: { color: palette.title, fontSize: 13, fontWeight: 600 }
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: palette.tooltipBg,
      borderColor: palette.tooltipBorder,
      textStyle: { fontSize: 11, color: palette.text },
      padding: 8,
      formatter: function (params: any) {
        const items = Array.isArray(params) ? params : [params];
        if (!items.length) return '';
        // Tooltip'e zaman bilgisini düzgün formatta ekle
        const timestamp = items[0].value[0];
        const dateStr = formatChartTime(timestamp);
        let html = `<div style="margin-bottom:6px;font-weight:700;border-bottom:1px solid ${palette.tooltipBorder};padding-bottom:4px;color:${palette.muted};font-size:10px;">${escapeTooltipText(dateStr)}</div>`;
        items.forEach((p: any) => {
          const seriesMeta = findSeries(p.seriesName);
          const numericValue = Number(p.value[1]);
          const val = p.value[1] !== undefined && p.value[1] !== null
            ? seriesMeta?.valueFormatter?.(numericValue) ?? numericValue.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
            : '--';
          html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:2px;">
            <div style="display:flex;align-items:center;">
              <span style="display:inline-block;margin-right:6px;border-radius:10px;width:8px;height:8px;background-color:${p.color};"></span>
              <span style="font-size:11px;">${escapeTooltipText(p.seriesName)}</span>
            </div>
            <span style="font-weight:600;font-family:'JetBrains Mono',monospace;color:${palette.tooltipValue};">${escapeTooltipText(val)}</span>
          </div>`;
        });
        const extraRows = extraTooltipRows?.(timestamp) ?? [];
        if (extraRows.length) {
          html += `<div style="margin-top:6px;border-top:1px solid ${palette.tooltipBorder};padding-top:6px;">`;
          extraRows.forEach(row => {
            html += `<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:2px;">
              <span style="font-size:10px;color:${palette.muted};">${escapeTooltipText(row.label)}</span>
              <span style="font-size:10px;font-weight:600;color:${palette.text};max-width:260px;text-align:right;white-space:normal;">${escapeTooltipText(row.value)}</span>
            </div>`;
          });
          html += `</div>`;
        }
        return html;
      }
    },
    legend: {
      show: true,
      right: 5,
      top: 'middle',
      orient: 'vertical',
      textStyle: { color: palette.muted, fontSize: 10 },
      itemWidth: 10,
      itemHeight: 10,
      pageIconColor: palette.muted,
      pageTextStyle: { color: palette.muted },
      selected: series.reduce<Record<string, boolean>>((selected, item) => {
        if (item.defaultVisible === false) {
          selected[item.label] = false;
        }
        return selected;
      }, {})
    },
    grid: { top: 45, right: gridRight ?? (hasSecondaryAxis ? 210 : 140), bottom: 30, left: 15, containLabel: true },
    xAxis: {
      type: 'time',
      min: xAxisRange?.[0],
      max: xAxisRange?.[1],
      axisLabel: {
        show: true,
        fontSize: 9,
        color: palette.axis,
        formatter: (value: number) => formatChartTime(value)
      },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: palette.axisLine } },
      splitLine: { show: false }
    },
    yAxis: hasSecondaryAxis ? [
      valueAxis,
      {
        type: 'value',
        name: secondaryAxisName,
        nameTextStyle: { color: palette.axis, fontSize: 10, padding: [0, 0, 4, 0] },
        min: 0,
        max: secondaryMax + secondaryPadding,
        position: 'right',
        splitLine: { show: false },
        axisLabel: {
          color: palette.axis,
          fontSize: 10,
          formatter: (val: number) => `%${Number(val).toFixed(2)}`
        },
        axisLine: { show: true, lineStyle: { color: palette.axisLine } }
      }
    ] : valueAxis,
    series: series.map(s => ({
      name: s.label,
      type: s.type ?? 'line',
      data: s.data,
      yAxisIndex: s.yAxisIndex ?? 0,
      itemStyle: { color: s.color },
      lineStyle: { width: 1.5, ...(s.lineStyle || {}) },
      showSymbol: s.showSymbol ?? false,
      symbolSize: s.symbolSize ?? 4,
      label: s.labelOptions,
      barWidth: s.barWidth,
      barMaxWidth: s.barMaxWidth,
      z: s.z,
      animation: false,
      sampling: 'lttb',
      connectNulls: s.connectNulls ?? true
    }))
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, width: '100%' }}>
      <ReactECharts option={option} style={{ height: cssHeight, minHeight: height, width: '100%' }} notMerge={true} lazyUpdate={true} />
    </div>
  );
}

function App() {
  const { data, latestData, isMonitoring, error, startListening, startMonitoring, stopMonitoring, clearData } = useRmsStore();
  const logs = useLogStore(state => state.logs);
  const ytbs = useYtbsStore();
  const scada = useYtbsScadaStore();
  const [activeTab, setActiveTab] = useState('merkezrms');
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem(SIDEBAR_STORAGE_KEY) !== '0');
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => resolveInitialTheme(localStorage.getItem(THEME_STORAGE_KEY)));
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [scadaPointPage, setScadaPointPage] = useState(1);
  const [showScadaPointDetails, setShowScadaPointDetails] = useState(false);
  const [scadaDataRatePeriodMinutes, setScadaDataRatePeriodMinutes] = useState(1);
  const oscillationSmoothingSettings = useOscillationStore(state => state.smoothingSettings);
  const setOscillationSmoothingEnabled = useOscillationStore(state => state.setSmoothingEnabled);
  const setOscillationSmoothingWindowSize = useOscillationStore(state => state.setSmoothingWindowSize);
  const [scadaPointFilters, setScadaPointFilters] = useState<{
    kind: ScadaMeasurementKind | 'all';
    b1Adi: string;
    b2Adi: string;
    b3Adi: string;
    trafoMerkezi: string;
    elementId: string;
  }>({
    kind: 'all',
    b1Adi: '',
    b2Adi: '',
    b3Adi: '',
    trafoMerkezi: '',
    elementId: '',
  });

  // YTBS Veri İşleme Optimizasyonu (En Üst Seviyede)
  const processedYtbsData = useMemo<ProcessedYtbsData | null>(() => {
    if (ytbs.ytbsRawData.length === 0) return null;
    if (!ytbs.ytbsQueryMeta || !isGkcQueryMetaCurrent(ytbs.ytbsQueryMeta, ytbs.filters)) return null;
    const t0 = performance.now();
    const groups = buildYtbsChartGroups(ytbs.ytbsRawData, ytbs.ytbsQueryMeta.measurementType);
    const t1 = performance.now();
    console.log(`>>> [PERFORMANS] YTBS JS İşleme: ${ytbs.ytbsRawData.length} nokta, Süre: ${(t1 - t0).toFixed(2)}ms`);
    return {
      groups,
      timeResolution: groups[0]?.timeResolution ?? 'second',
    };
  }, [ytbs.filters, ytbs.ytbsQueryMeta, ytbs.ytbsRawData]);

  // YTBS Filtreleri store'a taşındı
  const [isHealthScanning, setIsHealthScanning] = useState(false);

  // Cihaz filtre state'leri
  const [filterGerilim, setFilterGerilim] = useState('Hepsi');
  const [filterOlcum, setFilterOlcum] = useState('PQ');
  const [filterSearch, setFilterSearch] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState(localStorage.getItem('selected_device_id') || '362');

  const ytbsQueryWindow = useMemo(
    () => buildYtbsQueryChunks({
      measurementType: ytbs.filters.olcumTipi,
      startIso: ytbs.filters.startTime,
      endIso: ytbs.filters.endTime,
    }),
    [ytbs.filters.endTime, ytbs.filters.olcumTipi, ytbs.filters.startTime],
  );
  const ytbsTimeRangeWarning = ytbsQueryWindow.status === 'ok' ? null : ytbsQueryWindow.message;
  const ytbsTimeRangeNotice = ytbsQueryWindow.status === 'ok' ? ytbsQueryWindow.message : null;
  const ytbsQueryProgressText = ytbs.ytbsQueryProgress && ytbs.ytbsQueryProgress.totalChunks > 1
    ? `${ytbs.ytbsQueryProgress.completedChunks}/${ytbs.ytbsQueryProgress.totalChunks} parça`
    : null;
  const hasYtbsGkcData = ytbs.ytbsData.length > 0 || ytbs.ytbsRawData.length > 0 || Boolean(ytbs.ytbsQueryMeta);
  const ytbsChartRailIcon = (key: YtbsChartGroup['key']): string => {
    const icons: Record<YtbsChartGroup['key'], string> = {
      guc: '⚡',
      gerilim: '🔌',
      gerilimFazoru: '∠',
      akim: '📊',
      akimFazoru: '∠',
      frekans: '📈',
    };
    return icons[key];
  };

  // Filtrelenmiş cihaz listesi
  const filteredDevices = useMemo(() => {
    return DEVICE_LIST.filter(d => {
      if (filterGerilim !== 'Hepsi' && d.gerilim !== Number(filterGerilim)) return false;
      if (filterOlcum !== 'Hepsi' && d.olcumModu !== filterOlcum) return false;
      if (filterSearch) {
        const q = filterSearch.toUpperCase();
        return d.tmAdi.toUpperCase().includes(q) || d.fiderAdi.toUpperCase().includes(q) || d.id.includes(q);
      }
      return true;
    });
  }, [filterGerilim, filterOlcum, filterSearch]);

  const selectedDevice = DEVICE_MAP.get(selectedDeviceId) || null;
  const selectedScadaPoint = findScadaPointById(scada.filters.scadaId);
  const selectedScadaB1Label = scada.options.b1.find(option => option.value === scada.filters.b1)?.label || scada.filters.b1;
  const selectedScadaB2Label = scada.options.b2.find(option => option.value === scada.filters.b2)?.label || scada.filters.b2;
  const selectedScadaB3Label = scada.options.b3.find(option => option.value === scada.filters.b3)?.label || scada.filters.b3;
  const selectedScadaElementOptionLabel = scada.options.elements.find(option => option.value === scada.filters.scadaId)?.label;
  const selectedScadaElementLabel = selectedScadaElementOptionLabel || (selectedScadaPoint
    ? formatScadaElementLabel(selectedScadaPoint)
    : scada.filters.scadaId);
  const scadaQueryIsSessionError = Boolean(scada.queryError?.includes('YTBS oturumu aktif değil'));
  const scadaQueryWindow = useMemo(
    () => buildScadaQueryChunks(scada.filters.startTime, scada.filters.endTime),
    [scada.filters.endTime, scada.filters.startTime],
  );
  const scadaTimeRangeWarning = scadaQueryWindow.status === 'ok' ? null : scadaQueryWindow.message;
  const scadaTimeRangeNotice = scadaQueryWindow.status === 'ok' ? scadaQueryWindow.message : null;
  const scadaQueryProgressText = scada.queryProgress && scada.queryProgress.totalChunks > 1
    ? `${scada.queryProgress.completedChunks}/${scada.queryProgress.totalChunks} parca`
    : null;
  const latestScadaSample = scada.data.length > 0 ? scada.data[scada.data.length - 1] : null;
  const previousScadaSample = scada.data.length > 1 ? scada.data[scada.data.length - 2] : null;
  const scadaDisplayUnit = scada.unit || selectedScadaPoint?.unit || '';
  const scadaTimestampedSamples = useMemo(() => scada.data.map(item => ({
    timestamp: parseYtbsScadaTimestamp(item.zaman),
    value: item.deger,
  })), [scada.data]);
  const scadaAxisRange = useMemo<[number, number] | null>(() => {
    const filterStart = new Date(scada.filters.startTime).getTime();
    const filterEnd = new Date(scada.filters.endTime).getTime();
    if (Number.isFinite(filterStart) && Number.isFinite(filterEnd) && filterEnd > filterStart) {
      return [filterStart, filterEnd];
    }

    const timestamps = scadaTimestampedSamples
      .map(sample => sample.timestamp)
      .filter((timestamp): timestamp is number => Number.isFinite(timestamp));
    if (timestamps.length === 0) {
      return null;
    }

    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);
    return maxTimestamp > minTimestamp
      ? [minTimestamp, maxTimestamp]
      : [minTimestamp - 60000, maxTimestamp + 60000];
  }, [scada.filters.endTime, scada.filters.startTime, scadaTimestampedSamples]);
  const scadaThresholdSeriesEstimate = useMemo<ThresholdSeriesEstimate>(() => calculateThresholdSeriesEstimate({
    elementAdi: selectedScadaPoint?.elementAdi,
    samples: scadaTimestampedSamples,
    aciklama2: selectedScadaPoint?.aciklama2,
    aciklama3: selectedScadaPoint?.aciklama3,
  }), [
    scadaTimestampedSamples,
    selectedScadaPoint?.aciklama2,
    selectedScadaPoint?.aciklama3,
    selectedScadaPoint?.elementAdi,
  ]);
  const thresholdStatusText = scadaThresholdSeriesEstimate.status === 'ok'
    ? `Min ${formatThresholdPercent(scadaThresholdSeriesEstimate.minThresholdPercent)} · Max ${formatThresholdPercent(scadaThresholdSeriesEstimate.maxThresholdPercent)} · Ort ${formatThresholdPercent(scadaThresholdSeriesEstimate.averageThresholdPercent)} · Ort Δ ${formatNumericWithUnit(scadaThresholdSeriesEstimate.averageThresholdEngineering, scadaDisplayUnit)}`
    : scadaThresholdSeriesEstimate.status === 'digital'
      ? THRESHOLD_DIGITAL_MESSAGE
      : THRESHOLD_MISSING_MESSAGE;
  const scadaDataRate = useMemo(() => scadaAxisRange
    ? buildScadaDataRateSeries({
      samples: scadaTimestampedSamples,
      startTimestamp: scadaAxisRange[0],
      endTimestamp: scadaAxisRange[1],
      periodMinutes: scadaDataRatePeriodMinutes,
    })
    : buildScadaDataRateSeries({
      samples: [],
      startTimestamp: 0,
      endTimestamp: 0,
      periodMinutes: scadaDataRatePeriodMinutes,
    }), [scadaAxisRange, scadaDataRatePeriodMinutes, scadaTimestampedSamples]);
  const scadaThresholdPointByTimestamp = useMemo(() => {
    const byTimestamp = new Map<number, ThresholdPointEstimate>();
    if (scadaThresholdSeriesEstimate.status === 'ok') {
      scadaThresholdSeriesEstimate.points.forEach(point => {
        byTimestamp.set(point.timestamp, point);
      });
    }
    return byTimestamp;
  }, [scadaThresholdSeriesEstimate]);
  const scadaSampleContextByTimestamp = useMemo(() => {
    const byTimestamp = new Map<number, {
      previousValue: number | null;
      currentValue: number | null;
      deltaValue: number | null;
    }>();
    scadaTimestampedSamples.forEach((sample, index) => {
      const previousValue = index > 0 && Number.isFinite(scadaTimestampedSamples[index - 1]?.value)
        ? Number(scadaTimestampedSamples[index - 1].value)
        : null;
      const currentValue = Number.isFinite(sample.value) ? Number(sample.value) : null;
      byTimestamp.set(sample.timestamp, {
        previousValue,
        currentValue,
        deltaValue: previousValue !== null && currentValue !== null
          ? Math.abs(currentValue - previousValue)
          : null,
      });
    });
    return byTimestamp;
  }, [scadaTimestampedSamples]);
  const processedScadaData = useMemo(() => {
    if (scada.data.length === 0) return [];

    const thresholdColors = themeMode === 'dark'
      ? {
        point: '#fbbf24',
        min: '#fcd34d',
        max: '#d97706',
        average: '#f59e0b',
      }
      : {
        point: '#b45309',
        min: '#fed7aa',
        max: '#92400e',
        average: '#c2410c',
      };
    const baseSeries: TimeChartSeries[] = [{
      data: scadaTimestampedSamples.map(item => [item.timestamp, item.value]),
      color: themeMode === 'dark' ? '#38bdf8' : '#0f766e',
      label: scadaDisplayUnit ? `Ölçüm (${scadaDisplayUnit})` : 'Ölçüm',
    }];

    if (scadaThresholdSeriesEstimate.status === 'ok') {
      baseSeries.push({
        data: scadaThresholdSeriesEstimate.points.map(point => [point.timestamp, point.estimatedThresholdPercent]),
        color: thresholdColors.point,
        label: 'Tahmini Threshold %',
        type: 'scatter',
        yAxisIndex: 1,
        showSymbol: true,
        symbolSize: 6,
        valueFormatter: formatThresholdPercent,
        z: 6,
      });

      const thresholdLineRange = scadaAxisRange ?? [
        scadaThresholdSeriesEstimate.points[0]?.timestamp,
        scadaThresholdSeriesEstimate.points[scadaThresholdSeriesEstimate.points.length - 1]?.timestamp,
      ];
      const buildThresholdLineData = (value: number) => [
        [thresholdLineRange[0], value],
        [thresholdLineRange[1], value],
      ];
      if (
        Number.isFinite(thresholdLineRange[0]) &&
        Number.isFinite(thresholdLineRange[1]) &&
        thresholdLineRange[1] > thresholdLineRange[0]
      ) {
        baseSeries.push(
          {
            data: buildThresholdLineData(scadaThresholdSeriesEstimate.minThresholdPercent),
            color: thresholdColors.min,
            label: 'Min Threshold %',
            yAxisIndex: 1,
            lineStyle: { width: 1.1, type: 'dotted', opacity: 0.45 },
            showSymbol: false,
            valueFormatter: formatThresholdPercent,
            defaultVisible: false,
            connectNulls: false,
            z: 2,
          },
          {
            data: buildThresholdLineData(scadaThresholdSeriesEstimate.maxThresholdPercent),
            color: thresholdColors.max,
            label: 'Max Threshold %',
            yAxisIndex: 1,
            lineStyle: { width: 1.1, type: 'dashed', opacity: 0.45 },
            showSymbol: false,
            valueFormatter: formatThresholdPercent,
            defaultVisible: false,
            connectNulls: false,
            z: 2,
          },
          {
            data: buildThresholdLineData(scadaThresholdSeriesEstimate.averageThresholdPercent),
            color: thresholdColors.average,
            label: 'Ort Threshold %',
            yAxisIndex: 1,
            lineStyle: { width: 2.4, type: 'dashed', opacity: 0.82 },
            showSymbol: false,
            valueFormatter: formatThresholdPercent,
            connectNulls: false,
            z: 3,
          },
        );
      }
    }

    return baseSeries;
  }, [scada.data.length, scadaAxisRange, scadaDisplayUnit, scadaThresholdSeriesEstimate, scadaTimestampedSamples, themeMode]);
  const processedScadaDataRate = useMemo<TimeChartSeries[]>(() => {
    if (scadaDataRate.chartData.length === 0) return [];

    const periodLabel = SCADA_DATA_RATE_PERIOD_OPTIONS.find(option => option.value === scadaDataRatePeriodMinutes)?.label || `${scadaDataRatePeriodMinutes} dk`;
    return [{
      data: scadaDataRate.chartData,
      color: themeMode === 'dark' ? '#60a5fa' : '#2563eb',
      label: `Veri/dk (${periodLabel})`,
      type: 'bar',
      barMaxWidth: 18,
      valueFormatter: formatDataRatePerMinute,
    }];
  }, [scadaDataRate.chartData, scadaDataRatePeriodMinutes, themeMode]);
  const scadaTooltipRows = useMemo(() => {
    return (timestamp: number): TooltipExtraRow[] => {
      const thresholdPoint = scadaThresholdPointByTimestamp.get(timestamp);
      const sampleContext = scadaSampleContextByTimestamp.get(timestamp);
      const currentValue = thresholdPoint?.currentValue ?? sampleContext?.currentValue;
      const previousValue = thresholdPoint?.previousValue ?? sampleContext?.previousValue;
      const deltaValue = thresholdPoint?.deltaValue ?? sampleContext?.deltaValue;
      const thresholdText = thresholdPoint
        ? `${formatThresholdPercent(thresholdPoint.estimatedThresholdPercent)} · Δ ${formatNumericWithUnit(thresholdPoint.estimatedThresholdEngineering, scadaDisplayUnit)}`
        : scadaThresholdSeriesEstimate.status === 'ok'
          ? '-'
          : thresholdStatusText;
      return [
        { label: 'Zaman', value: new Date(timestamp).toLocaleString('tr-TR') },
        { label: 'Son analog değer', value: formatNumericWithUnit(currentValue, scadaDisplayUnit) },
        { label: 'Önceki analog değer', value: formatNumericWithUnit(previousValue, scadaDisplayUnit) },
        { label: 'Delta değer', value: formatNumericWithUnit(deltaValue, scadaDisplayUnit) },
        { label: 'Tahmini threshold %', value: thresholdText },
      ];
    };
  }, [scadaDisplayUnit, scadaSampleContextByTimestamp, scadaThresholdPointByTimestamp, scadaThresholdSeriesEstimate.status, thresholdStatusText]);
  const scadaInfoCards = useMemo(() => [
    { label: 'Son Analog Değer', value: formatNumericWithUnit(latestScadaSample?.deger, scadaDisplayUnit) },
    { label: 'Önceki Analog Değer', value: formatNumericWithUnit(previousScadaSample?.deger, scadaDisplayUnit) },
    { label: 'SCADA Adresi', value: `${selectedScadaPoint?.noel || '-'} / ${selectedScadaPoint?.nimset || '-'}` },
    { label: 'Ölçüm Noktası', value: selectedScadaElementLabel || '-' },
    { label: 'Veri/dk', value: formatDataRatePerMinute(scadaDataRate.averagePerMinute) },
    { label: 'AÇIKLAMA 2 / Analog Aralık', value: selectedScadaPoint?.aciklama2 || '-' },
    { label: 'AÇIKLAMA 3 / Ham Aralık', value: selectedScadaPoint?.aciklama3 || '-' },
    { label: 'Tahmini Threshold %', value: thresholdStatusText },
  ], [
    latestScadaSample?.deger,
    previousScadaSample?.deger,
    scadaDataRate.averagePerMinute,
    scadaDisplayUnit,
    selectedScadaElementLabel,
    selectedScadaPoint?.aciklama2,
    selectedScadaPoint?.aciklama3,
    selectedScadaPoint?.nimset,
    selectedScadaPoint?.noel,
    thresholdStatusText,
  ]);

  const scadaCatalogTotals = useMemo(() => ({
    total: SCADA_POINT_LIST.length,
    analog: SCADA_ANALOG_MEASUREMENT_POINTS.length,
    digital: SCADA_DIGITAL_MEASUREMENT_POINTS.length,
    active: SCADA_POINT_LIST.filter(point => point.aktif).length,
  }), []);

  const scadaPointFilterOptions = useMemo(() => {
    const unique = (values: string[]) =>
      Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'tr'));

    return {
      b1Adi: unique(SCADA_POINT_LIST.map(point => point.b1Adi)),
      b2Adi: unique(SCADA_POINT_LIST.map(point => point.b2Adi)),
      b3Adi: unique(SCADA_POINT_LIST.map(point => point.b3Adi)),
      trafoMerkezi: unique(SCADA_POINT_LIST.map(point => point.trafoMerkezi)),
      elementId: unique(SCADA_POINT_LIST.map(point => point.elementId)),
    };
  }, []);

  const filteredScadaPoints = useMemo(() => {
    return SCADA_POINT_LIST.filter(point => {
      if (scadaPointFilters.kind !== 'all' && point.measurementKind !== scadaPointFilters.kind) return false;
      if (scadaPointFilters.b1Adi && point.b1Adi !== scadaPointFilters.b1Adi) return false;
      if (scadaPointFilters.b2Adi && point.b2Adi !== scadaPointFilters.b2Adi) return false;
      if (scadaPointFilters.b3Adi && point.b3Adi !== scadaPointFilters.b3Adi) return false;
      if (scadaPointFilters.trafoMerkezi && point.trafoMerkezi !== scadaPointFilters.trafoMerkezi) return false;
      if (scadaPointFilters.elementId && point.elementId !== scadaPointFilters.elementId) return false;
      return true;
    });
  }, [scadaPointFilters]);

  const scadaPointPageCount = getPageCount(filteredScadaPoints.length);
  const safeScadaPointPage = clampPage(scadaPointPage, filteredScadaPoints.length);
  const paginatedScadaPoints = useMemo(
    () => paginateRows(filteredScadaPoints, scadaPointPage),
    [filteredScadaPoints, scadaPointPage],
  );

  const setScadaPointFilter = (key: keyof typeof scadaPointFilters, value: string) => {
    setScadaPointPage(1);
    setScadaPointFilters(filters => ({ ...filters, [key]: value }));
  };

  // Cihaz seçildiğinde backend'e bildir
  const handleDeviceSelect = (devId: string) => {
    setSelectedDeviceId(devId);
    localStorage.setItem('selected_device_id', devId);
    ytbs.setDevice(devId);
    clearData();
  };

  const handleScadaFilterChange = (key: keyof typeof scada.filters, value: string) => {
    scada.setFilter(key, value);
    if (ytbs.status === 'connected' && key !== 'scadaId') {
      useYtbsScadaStore.getState().refreshOptions(true);
    }
  };

  const showExportMessage = (message: string) => {
    setExportMessage(message);
    window.setTimeout(() => setExportMessage(null), 5000);
  };

  const downloadCsv = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenScadaPointFromQualityReport = async ({
    startTime,
    endTime,
    point,
    scadaId,
  }: OpenScadaPointRequest) => {
    const scadaStore = useYtbsScadaStore.getState();
    scadaStore.setFilter('startTime', startTime);
    scadaStore.setFilter('endTime', endTime);
    scadaStore.setFilter('b1', point.b1Id);
    scadaStore.setFilter('b2', point.b2Id);
    scadaStore.setFilter('b3', point.b3Id);
    scadaStore.setFilter('scadaId', scadaId);
    setActiveTab('ytbs_scada');

    if (ytbs.status === 'connected') {
      await useYtbsScadaStore.getState().refreshOptions(true);
      await useYtbsScadaStore.getState().queryRange(startTime, endTime);
    }
  };

  useEffect(() => {
    startListening();
    ytbs.startListening();
    ytbs.checkStatus();
    scada.refreshOptions(false);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarOpen ? '1' : '0');
  }, [sidebarOpen]);

  useEffect(() => {
    const title = PORTABLE_WINDOW_TITLE || APP_HEADER_TITLE;
    document.title = title;
    if (PORTABLE_WINDOW_TITLE) {
      getCurrentWindow().setTitle(PORTABLE_WINDOW_TITLE).catch(error => {
        console.warn('Pencere başlığı güncellenemedi:', error);
      });
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'ytbs_scada') {
      scada.refreshOptions(ytbs.status === 'connected');
    }
  }, [activeTab, ytbs.status]);

  useEffect(() => {
    setScadaPointPage(page => clampPage(page, filteredScadaPoints.length));
  }, [filteredScadaPoints.length]);

  // Grafik verileri
  const recentData = data.slice(-100);
  const frekansData = recentData.map(d => d.frekans);
  const gucData = recentData.map(d => d.aktif_guc);
  const rGucData = recentData.map(d => d.reaktif_guc);
  const gGucData = recentData.map(d => d.gorunen_guc);
  const gerilimAData = recentData.map(d => d.gerilim.faz_a / 1000);
  const gerilimBData = recentData.map(d => d.gerilim.faz_b / 1000);
  const gerilimCData = recentData.map(d => d.gerilim.faz_c / 1000);
  const akimAData = recentData.map(d => d.akim.faz_a);
  const akimBData = recentData.map(d => d.akim.faz_b);
  const akimCData = recentData.map(d => d.akim.faz_c);
  const highContrastTraceColor = themeMode === 'dark' ? '#f8fafc' : '#111827';
  const scadaPointPageStart = filteredScadaPoints.length === 0
    ? 0
    : ((safeScadaPointPage - 1) * SCADA_POINT_PAGE_SIZE) + 1;
  const scadaPointPageEnd = Math.min(safeScadaPointPage * SCADA_POINT_PAGE_SIZE, filteredScadaPoints.length);

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="header-title">
          <button
            className="btn btn-icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Sol menüyü daralt' : 'Sol menüyü genişlet'}
            title={sidebarOpen ? 'Sol menüyü daralt' : 'Sol menüyü genişlet'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <span className="app-title">{APP_HEADER_TITLE}</span>
        </div>
        <div className="header-status">
          {activeTab === 'merkezrms' && (
            <div className="monitoring-controls" aria-label="MerkezRMS veri kontrolü">
              <div className="source-pill">
                <span className={`source-dot source-${ytbs.dataSource}`} />
                <span>
                  {ytbs.dataSource === 'primary' && 'Birincil'}
                  {ytbs.dataSource === 'ytbs' && 'YTBS Yedek'}
                  {ytbs.dataSource === 'mock' && 'Mock'}
                  {ytbs.dataSource === 'none' && 'Kaynak Yok'}
                </span>
              </div>
              <div className="status-indicator">
                <span className={`status-dot ${isMonitoring ? 'connected' : 'disconnected'}`} />
                <span style={{ color: isMonitoring ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                  {isMonitoring ? 'İzleme Aktif' : 'Bağlı Değil'}
                </span>
              </div>
              {isMonitoring ? (
                <button className="btn btn-danger" onClick={stopMonitoring}>Durdur</button>
              ) : (
                <button className="btn btn-primary" onClick={startMonitoring}>Başlat</button>
              )}
            </div>
          )}
          <button
            className="btn btn-icon theme-toggle"
            onClick={() => setThemeMode(current => toggleTheme(current))}
            aria-label={themeMode === 'dark' ? 'Light moda geç' : 'Dark moda geç'}
            title={themeMode === 'dark' ? 'Light moda geç' : 'Dark moda geç'}
          >
            {themeMode === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {exportMessage && (
        <div
          style={{
            position: 'fixed',
            top: 58,
            right: 16,
            zIndex: 50,
            maxWidth: 360,
            padding: '9px 12px',
            border: '1px solid var(--border-color)',
            borderRadius: 6,
            background: 'var(--bg-secondary)',
            color: exportMessage.includes('hatası') || exportMessage.includes('bulunamadı') ? 'var(--accent-red)' : 'var(--accent-green)',
            fontSize: 12,
            boxShadow: '0 8px 20px rgba(15, 23, 42, 0.18)',
          }}
        >
          {exportMessage}
        </div>
      )}

      {/* Layout */}
      <div className="app-layout">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
          <nav className="sidebar-nav">
            <div className="nav-section-title">GKÇ İzleme</div>
            <button className={`nav-item ${activeTab === 'merkezrms' ? 'active' : ''}`} onClick={() => setActiveTab('merkezrms')} title="MerkezRMS Veri" aria-label="MerkezRMS Veri">
              ⚡ <span className="nav-text">MerkezRMS Veri</span>
            </button>
            <button className={`nav-item ${activeTab === 'ytbs_gkc' ? 'active' : ''}`} onClick={() => setActiveTab('ytbs_gkc')} title="YTBS GKÇ Veri" aria-label="YTBS GKÇ Veri">
              📡 <span className="nav-text">YTBS GKÇ Veri</span>
            </button>
            <button className={`nav-item ${activeTab === 'oscillation' ? 'active' : ''}`} onClick={() => setActiveTab('oscillation')} title="Salınım Algılayıcı" aria-label="Salınım Algılayıcı">
              <svg className="nav-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 12h3l2.5-6 5 12 2.5-6h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="nav-text">Salınım Algılayıcı</span>
            </button>
            <button className={`nav-item ${activeTab === 'rms' ? 'active' : ''}`} onClick={() => setActiveTab('rms')} title="RMS Verileri" aria-label="RMS Verileri">
              📊 <span className="nav-text">RMS Verileri</span>
            </button>
            <button className={`nav-item ${activeTab === 'pmu' ? 'active' : ''}`} onClick={() => setActiveTab('pmu')} title="PMU Verileri" aria-label="PMU Verileri">
              📈 <span className="nav-text">PMU Verileri</span>
            </button>
            <button className={`nav-item ${activeTab === 'pmux' ? 'active' : ''}`} onClick={() => setActiveTab('pmux')} title="PMUX Verileri" aria-label="PMUX Verileri">
              📉 <span className="nav-text">PMUX Verileri</span>
            </button>
            <div className="nav-section-title">SCADA İzleme</div>
            <button className={`nav-item ${activeTab === 'ytbs_scada' ? 'active' : ''}`} onClick={() => setActiveTab('ytbs_scada')} title="YTBS SCADA Veri" aria-label="YTBS SCADA Veri">
              📡 <span className="nav-text">YTBS SCADA Veri</span>
            </button>
            <button className={`nav-item ${activeTab === 'ytbs_scada_quality_report' ? 'active' : ''}`} onClick={() => setActiveTab('ytbs_scada_quality_report')} title="YTBS SCADA Veri Kalitesi Raporu" aria-label="YTBS SCADA Veri Kalitesi Raporu">
              📊 <span className="nav-text">YTBS SCADA Veri Kalitesi Raporu</span>
            </button>
            <button className={`nav-item ${activeTab === 'ytbs_scada_points' ? 'active' : ''}`} onClick={() => setActiveTab('ytbs_scada_points')} title="YTBS SCADA Ölçüm Noktaları" aria-label="YTBS SCADA Ölçüm Noktaları">
              📍 <span className="nav-text">YTBS SCADA Ölçüm Noktaları</span>
            </button>
            <div className="nav-section-title">Sistem</div>
            <button className={`nav-item ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')} title="Ayarlar" aria-label="Ayarlar">
              ⚙️ <span className="nav-text">Ayarlar</span>
            </button>
          </nav>
        </aside>

        {/* Ana İçerik */}
        <main className="main-content">
          {error && (
            <div className="card" style={{ borderColor: 'var(--accent-red)' }}>
              <div className="card-body" style={{ color: 'var(--accent-red)', fontSize: '13px' }}>
                ⚠️ {error}
              </div>
            </div>
          )}

          {/* MerkezRMS Veri — Anlık Polling */}
          {activeTab === 'merkezrms' && (
            <>
              {/* Filtre Barı — YTBS benzeri */}
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-header"><span className="card-title">📡 MİLLİ GÜÇ KALİTESİ SİSTEMİ, GKÇ Ölçüm Verileri</span></div>
                <div className="card-body" style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 100 }}>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: 2 }}>GERİLİM SEVİYESİ</label>
                      <select value={filterGerilim} onChange={e => setFilterGerilim(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }}>
                        <option value="Hepsi">Hepsi</option>
                        <option value="380">380 kV</option><option value="154">154 kV</option><option value="33">33 kV</option><option value="15">15 kV</option>
                      </select>
                    </div>
                    <div style={{ minWidth: 80 }}>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: 2 }}>ÖLÇÜM TİPİ</label>
                      <select value={filterOlcum} onChange={e => setFilterOlcum(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }}>
                        <option value="PQ">PQ</option><option value="PMU">PMU</option><option value="Hepsi">Hepsi</option>
                      </select>
                    </div>
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: 2 }}>CİHAZ</label>
                      <select value={selectedDeviceId} onChange={e => handleDeviceSelect(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }}>
                        <option value="">— Cihaz Seçin ({filteredDevices.length} cihaz) —</option>
                        {filteredDevices.map(d => <option key={d.id} value={d.id}>{d.tmAdi}, {d.fiderAdi} ({d.id})</option>)}
                      </select>
                    </div>
                    <input type="text" value={filterSearch} onChange={e => setFilterSearch(e.target.value)} placeholder="🔍 Ara..." style={{ width: 120, padding: '6px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }} />
                  </div>
                  {selectedDevice && (
                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                      📍 <strong style={{ color: 'var(--text-primary)' }}>{selectedDevice.tmAdi}</strong> — {selectedDevice.fiderAdi} | {selectedDevice.gerilim} kV | {selectedDevice.olcumModu} | {selectedDevice.il} | ID: {selectedDevice.id}
                    </div>
                  )}
                </div>
              </div>

              {/* Anlık Değerler */}
              <div className="grid-3">
                <div className="stat-card">
                  <div className="stat-label">Frekans</div>
                  <div className="stat-value" style={{ color: 'var(--color-frekans)' }}>{latestData ? latestData.frekans.toFixed(3) : '--'}<span className="stat-unit">Hz</span></div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Aktif Güç</div>
                  <div className="stat-value" style={{ color: 'var(--color-aktif-guc)' }}>{latestData ? latestData.aktif_guc.toFixed(1) : '--'}<span className="stat-unit">MW</span></div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Reaktif Güç</div>
                  <div className="stat-value" style={{ color: 'var(--color-reaktif-guc)' }}>{latestData ? latestData.reaktif_guc.toFixed(1) : '--'}<span className="stat-unit">MVAr</span></div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Gerilim (Faz A)</div>
                  <div className="stat-value" style={{ color: 'var(--color-gerilim-a)' }}>{latestData ? (latestData.gerilim.faz_a / 1000).toFixed(1) : '--'}<span className="stat-unit">kV</span></div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Güç Faktörü</div>
                  <div className="stat-value" style={{ color: 'var(--accent-purple)' }}>{latestData ? latestData.guc_faktoru.toFixed(3) : '--'}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">df/dt</div>
                  <div className="stat-value" style={{ color: 'var(--color-dfdt)' }}>{latestData ? latestData.df_dt.toFixed(4) : '--'}<span className="stat-unit">Hz/s</span></div>
                </div>
              </div>

              {/* 4 Grafik Paneli — YTBS düzeni */}
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-header"><span className="card-title">⚡ Güç</span><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{recentData.length} örnek</span></div>
                <div className="card-body">
                  <TimeChart height={140} themeMode={themeMode} series={[
                    { data: gucData, color: highContrastTraceColor, label: 'Aktif Güç' },
                    { data: rGucData, color: '#ef4444', label: 'Reaktif Güç' },
                    { data: gGucData, color: '#3b82f6', label: 'Görünen Güç' },
                  ]} />
                </div>
              </div>

              <div className="grid-2">
                <div className="card">
                  <div className="card-header"><span className="card-title">🔌 Gerilim</span></div>
                  <div className="card-body">
                    <TimeChart height={120} themeMode={themeMode} series={[
                      { data: gerilimAData, color: '#ef4444', label: 'Faz A' },
                      { data: gerilimBData, color: '#eab308', label: 'Faz B' },
                      { data: gerilimCData, color: '#3b82f6', label: 'Faz C' },
                    ]} />
                  </div>
                </div>
                <div className="card">
                  <div className="card-header"><span className="card-title">📊 Akım</span></div>
                  <div className="card-body">
                    <TimeChart height={120} themeMode={themeMode} series={[
                      { data: akimAData, color: '#ef4444', label: 'Faz A' },
                      { data: akimBData, color: '#eab308', label: 'Faz B' },
                      { data: akimCData, color: '#3b82f6', label: 'Faz C' },
                    ]} />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><span className="card-title">📈 Frekans</span></div>
                <div className="card-body">
                  <TimeChart height={100} themeMode={themeMode} series={[{ data: frekansData, color: highContrastTraceColor, label: 'Frekans' }]} />
                </div>
              </div>

              {/* Durum bilgisi */}
              <div className="card">
                <div className="card-header"><span className="card-title">ℹ️ Sistem Bilgisi</span></div>
                <div className="card-body" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    <div><div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Aktif Cihaz</div><div>{selectedDevice ? `${selectedDevice.tmAdi} (${selectedDevice.id})` : 'Seçilmedi'}</div></div>
                    <div><div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Polling Aralığı</div><div>10 saniye</div></div>
                    <div><div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Toplam Örnek</div><div>{data.length}</div></div>
                    <div><div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Versiyon</div><div>2.0.0-alpha (Tauri)</div></div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* YTBS GKÇ Veri — Tarih Aralığı Sorgusu */}
          {activeTab === 'ytbs_gkc' && (
            <>
              {/* YTBS Filtre Barı — YTBS sitesindeki gibi */}
              <div className="card" style={{ marginBottom: 12, flexShrink: 0 }}>
                <div className="card-header"><span className="card-title">📡 MİLLİ GÜÇ KALİTESİ SİSTEMİ, GKÇ Ölçüm Verileri</span></div>
                <div className="card-body" style={{ padding: '8px 12px' }}>
                  {ytbs.status !== 'connected' && (
                    <div style={{ padding: '12px', background: 'rgba(245,158,11,0.1)', borderRadius: 6, color: 'var(--accent-yellow)', fontSize: 12, marginBottom: 10 }}>
                      ⚠️ YTBS oturumu aktif değil — Ayarlar sekmesinden YTBS'ye bağlanın.
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 150 }}>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: 2 }}>BAŞLANGIÇ ZAMANI</label>
                      <input type="datetime-local" value={ytbs.filters.startTime} onChange={e => ytbs.setFilter('startTime', e.target.value)} disabled={isHealthScanning}
                        style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11, opacity: isHealthScanning ? 0.6 : 1 }} />
                    </div>
                    <div style={{ minWidth: 150 }}>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: 2 }}>BİTİŞ ZAMANI</label>
                      <input type="datetime-local" value={ytbs.filters.endTime} onChange={e => ytbs.setFilter('endTime', e.target.value)} disabled={isHealthScanning}
                        style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11, opacity: isHealthScanning ? 0.6 : 1 }} />
                    </div>
                    <div style={{ minWidth: 100 }}>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: 2 }}>GERİLİM SEVİYESİ</label>
                      <select value={ytbs.filters.gerilim} onChange={e => ytbs.setFilter('gerilim', e.target.value)} disabled={isHealthScanning}
                        style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11, opacity: isHealthScanning ? 0.6 : 1 }}>
                        <option value="">Hepsi</option>
                        <option value="380">400 kV</option>
                        <option value="154">154 kV</option>
                        <option value="33">33-31.5 kV</option>
                        <option value="15">15 kV</option>
                      </select>
                    </div>
                    <div style={{ minWidth: 80 }}>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: 2 }}>FAZ</label>
                      <select value={ytbs.filters.faz} onChange={e => ytbs.setFilter('faz', e.target.value)} disabled={isHealthScanning}
                        style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11, opacity: isHealthScanning ? 0.6 : 1 }}>
                        <option value="Üç Faz">Üç Faz</option>
                        <option value="Tek Faz">Tek Faz</option>
                      </select>
                    </div>
                    <div style={{ minWidth: 80 }}>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: 2 }}>ÖLÇÜM TİPİ</label>
                      <select value={ytbs.filters.olcumTipi} onChange={e => ytbs.setFilter('olcumTipi', e.target.value as 'PQ' | 'PMU')} disabled={isHealthScanning}
                        style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11, opacity: isHealthScanning ? 0.6 : 1 }}>
                        <option value="PQ">PQ</option>
                        <option value="PMU">PMU</option>
                      </select>
                    </div>
                    <div style={{ flex: 1, minWidth: 300 }}>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: 2 }}>CİHAZ</label>
                      <select value={ytbs.filters.cihaz} onChange={e => ytbs.setFilter('cihaz', e.target.value)} disabled={isHealthScanning}
                        style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11, opacity: isHealthScanning ? 0.6 : 1 }}>
                        <option value="">Cihaz seçin...</option>
                        {DEVICE_LIST.filter(d =>
                          (!ytbs.filters.gerilim || String(d.gerilim) === ytbs.filters.gerilim) &&
                          (d.olcumModu === ytbs.filters.olcumTipi)
                        ).map(dev => {
                          const healthInfo = ytbs.healthStatus[dev.id];
                          return (
                            <option key={dev.id} value={dev.id}>
                              {formatGkcHealthLabel(`${dev.tmAdi}, ${dev.fiderAdi} (${dev.id})`, healthInfo?.status)}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <button className="btn btn-primary"
                      disabled={ytbs.ytbsQueryLoading || ytbs.status !== 'connected' || !ytbs.filters.cihaz || isHealthScanning || ytbsQueryWindow.status !== 'ok'}
                      onClick={() => {
                        const fazVal = toGkcQueryFazId(ytbs.filters.faz);
                        ytbs.queryRange(ytbs.filters.cihaz, ytbs.filters.olcumTipi, ytbs.filters.startTime, ytbs.filters.endTime, ytbs.filters.gerilim, fazVal);
                      }}
                      style={{ fontWeight: 600, fontSize: 12 }}>
                      {ytbs.ytbsQueryLoading ? '⏳ Sorgulanıyor...' : '📊 GÖSTER'}
                    </button>
                    <button className="btn btn-danger"
                      disabled={ytbs.ytbsQueryLoading || isHealthScanning || !hasYtbsGkcData}
                      onClick={ytbs.clearGkcData}
                      style={{ fontWeight: 600, fontSize: 12 }}>
                      🧹 Verileri Temizle
                    </button>
                    <button className="btn"
                      disabled={ytbs.status !== 'connected'}
                      onClick={async () => {
                        if (isHealthScanning) {
                          ytbs.stopHealthScan();
                        } else {
                          setIsHealthScanning(true);
                          try {
                            const targetDevices = DEVICE_LIST.filter(d =>
                              (!ytbs.filters.gerilim || String(d.gerilim) === ytbs.filters.gerilim) &&
                              (d.olcumModu === ytbs.filters.olcumTipi)
                            );
                            await ytbs.scanAllHealth(targetDevices, ytbs.filters.faz, ytbs.filters.olcumTipi);
                          } finally {
                            setIsHealthScanning(false);
                          }
                        }
                      }}
                      style={{
                        fontWeight: 600,
                        fontSize: 12,
                        backgroundColor: isHealthScanning ? '#ef4444' : '#10b981',
                        color: 'white',
                        minWidth: 140
                      }}>
                      {isHealthScanning
                        ? `🛑 DURDUR (${ytbs.healthScanProgress.current}/${ytbs.healthScanProgress.total})`
                        : '🏥 GKÇ SAĞLIK'}
                    </button>
                  </div>
                  {(ytbsTimeRangeWarning || ytbs.ytbsQueryNotice || ytbsTimeRangeNotice || ytbsQueryProgressText) && (
                    <div style={{ marginTop: 8, color: ytbsTimeRangeWarning ? 'var(--accent-red)' : 'var(--accent-yellow)', fontSize: 11 }}>
                      {[
                        ytbsTimeRangeWarning || ytbs.ytbsQueryNotice || ytbsTimeRangeNotice,
                        ytbs.ytbsQueryLoading && ytbsQueryProgressText ? ytbsQueryProgressText : null,
                      ].filter(Boolean).join(' - ')}
                    </div>
                  )}
                  {ytbs.filters.cihaz && DEVICE_MAP.get(ytbs.filters.cihaz) && (
                    <div style={{ marginTop: 8, padding: '4px 8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#3b82f6', fontSize: 16 }}>📍</span>
                      <span
                        title={getGkcHealthVisual(ytbs.healthStatus[ytbs.filters.cihaz]?.status).title}
                        style={{ color: getGkcHealthVisual(ytbs.healthStatus[ytbs.filters.cihaz]?.status).color, fontSize: 13, lineHeight: 1 }}
                      >
                        {getGkcHealthVisual(ytbs.healthStatus[ytbs.filters.cihaz]?.status).bullet}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: '#3b82f6', letterSpacing: '0.02em' }}>
                        {DEVICE_MAP.get(ytbs.filters.cihaz)?.tmAdi}, {DEVICE_MAP.get(ytbs.filters.cihaz)?.fiderAdi} — {DEVICE_MAP.get(ytbs.filters.cihaz)?.gerilim} kV | {ytbs.filters.olcumTipi}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* YTBS Grafik Panelleri (Ekrana Tam Sığacak Şekilde Dikey Dizilim) */}
              {ytbs.ytbsData.length > 0 && processedYtbsData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '20px' }}>
                  {processedYtbsData.groups.map(group => (
                    <div
                      key={`${ytbs.ytbsQueryMeta?.measurementType ?? ytbs.filters.olcumTipi}-${group.key}-${ytbs.ytbsQueryMeta?.deviceId ?? ytbs.filters.cihaz}`}
                      className="card"
                      style={{ flex: '1', display: 'flex', flexDirection: 'row' }}
                    >
                      <div style={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRight: '1px solid var(--border-color)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', padding: '10px 0', fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '1px' }}>
                        {ytbsChartRailIcon(group.key)} {group.railLabel}
                      </div>
                      <div className="card-body" style={{ padding: '4px', flex: 1, position: 'relative' }}>
                        <TimeChart
                          height={300}
                          title={group.title}
                          valueAxisName={group.valueAxisName}
                          cssHeight="100%"
                          themeMode={themeMode}
                          series={group.series}
                          timeResolution={group.timeResolution}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card">
                  <div className="card-body" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    {ytbs.ytbsQueryLoading ? (
                      <div>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                        <div style={{ fontSize: 14 }}>YTBS'den veri sorgulanıyor...</div>
                        <div style={{ fontSize: 11, marginTop: 6 }}>Bu işlem birkaç saniye sürebilir.</div>
                      </div>
                    ) : ytbs.error ? (
                      <div>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>❌</div>
                        <div style={{ fontSize: 14, color: 'var(--accent-red)' }}>Sorgu Hatası</div>
                        <div style={{ fontSize: 11, marginTop: 6, color: 'var(--accent-red)', maxWidth: 500, margin: '6px auto', wordBreak: 'break-word' }}>{ytbs.error}</div>
                        <div style={{ fontSize: 11, marginTop: 10, color: 'var(--text-muted)' }}>
                          💡 Ayarlar sekmesinden YTBS bağlantısını kontrol edin veya farklı parametre deneyin.
                        </div>
                      </div>
                    ) : ytbs.status === 'connected' ? (
                      <div>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
                        <div style={{ fontSize: 14 }}>YTBS bağlantısı aktif</div>
                        <div style={{ fontSize: 11, marginTop: 6 }}>Cihaz seçip tarih aralığı girerek <strong>GÖSTER</strong> butonuna basın.</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
                        <div style={{ fontSize: 14 }}>YTBS oturumu aktif değil</div>
                        <div style={{ fontSize: 11, marginTop: 6 }}>Önce <strong>Ayarlar</strong> sekmesinden YTBS'ye bağlanın.</div>
                        <button className="btn btn-primary" style={{ marginTop: 12, fontSize: 11 }} onClick={() => setActiveTab('config')}>
                          ⚙️ Ayarlar'a Git
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sorgu Durum Bilgisi */}
              {ytbs.ytbsData.length > 0 && (
                <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: 'var(--text-muted)', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span>✅ {ytbs.ytbsData.length} veri noktası yüklendi</span>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: 11, fontWeight: 600 }}
                      onClick={() => {
                        try {
                          const rawData = ytbs.ytbsRawData;
                          if (!rawData.length) {
                            showExportMessage('İndirilecek veri bulunamadı.');
                            return;
                          }
                          showExportMessage('YTBS GKÇ CSV dosyası hazırlanıyor...');
                          const csvContent = buildYtbsCsv(rawData);
                          downloadCsv(csvContent, `YTBS_GKC_VERI_EKSPOR_${new Date().getTime()}.csv`);
                          showExportMessage('YTBS GKÇ CSV indirildi. Türkçe karakterler Excel uyumu için ASCII olarak yazıldı.');
                        } catch (err) {
                          showExportMessage('CSV oluşturma hatası: ' + err);
                        }
                      }}
                    >
                      📥 TÜM VERİLERİ CSV İNDİR (Yan Yana)
                    </button>
                  </div>
                  <span>🔗 Kaynak: YTBS (ytbs.teias.gov.tr)</span>
                </div>
              )}
            </>
          )}

          {activeTab === 'oscillation' && (
            <OscillationPage themeMode={themeMode} />
          )}

          {/* YTBS SCADA Veri — Tarih Aralığı Sorgusu */}
          {activeTab === 'ytbs_scada' && (
            <>
              <div className="card" style={{ marginBottom: 12, flexShrink: 0 }}>
                <div className="card-header">
                  <span className="card-title">📡 SCADA Ölçüm Verileri</span>
                  <span style={{ fontSize: 11, color: scada.optionsLoading ? 'var(--accent-yellow)' : 'var(--text-muted)' }}>
                    {scada.optionsLoading ? 'Seçenekler güncelleniyor...' : scada.optionsSource === 'mixed' ? 'Kaynak: Yerel katalog + YTBS' : 'Kaynak: Yerel katalog'}
                  </span>
                </div>
                <div className="card-body" style={{ padding: '8px 12px' }}>
                  {ytbs.status !== 'connected' && (
                    <div style={{ padding: '12px', background: 'rgba(245,158,11,0.1)', borderRadius: 6, color: 'var(--accent-yellow)', fontSize: 12, marginBottom: 10 }}>
                      ⚠️ YTBS oturumu aktif değil — Ayarlar sekmesinden YTBS'ye bağlanın. Filtreler yerel katalogdan gösterilir.
                    </div>
                  )}
                  {scada.optionsError && ytbs.status === 'connected' && (
                    <div style={{ padding: '10px 12px', background: 'rgba(245,158,11,0.1)', borderRadius: 6, color: 'var(--accent-yellow)', fontSize: 12, marginBottom: 10 }}>
                      YTBS seçenekleri alınamadı; filtreler yerel SCADA ölçüm noktaları kataloğundan gösteriliyor.
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 150 }}>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: 2 }}>BAŞLANGIÇ ZAMANI</label>
                      <input type="datetime-local" value={scada.filters.startTime} onChange={e => scada.setFilter('startTime', e.target.value)}
                        style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }} />
                    </div>
                    <div style={{ minWidth: 150 }}>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: 2 }}>BİTİŞ ZAMANI</label>
                      <input type="datetime-local" value={scada.filters.endTime} onChange={e => scada.setFilter('endTime', e.target.value)}
                        style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }} />
                    </div>
                    <div style={{ minWidth: 150 }}>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: 2 }}>B1</label>
                      <select value={scada.filters.b1} onChange={e => handleScadaFilterChange('b1', e.target.value)}
                        style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }}>
                        <option value="">B1 seçin...</option>
                        {scada.options.b1.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                    <div style={{ minWidth: 110 }}>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: 2 }}>B2</label>
                      <select value={scada.filters.b2} onChange={e => handleScadaFilterChange('b2', e.target.value)} disabled={!scada.filters.b1}
                        style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11, opacity: scada.filters.b1 ? 1 : 0.6 }}>
                        <option value="">B2 seçin...</option>
                        {scada.options.b2.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                    <div style={{ minWidth: 140 }}>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: 2 }}>B3</label>
                      <select value={scada.filters.b3} onChange={e => handleScadaFilterChange('b3', e.target.value)} disabled={!scada.filters.b2}
                        style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11, opacity: scada.filters.b2 ? 1 : 0.6 }}>
                        <option value="">B3 seçin...</option>
                        {scada.options.b3.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: 2 }}>ELEMENT</label>
                      <select value={scada.filters.scadaId} onChange={e => handleScadaFilterChange('scadaId', e.target.value)} disabled={!scada.filters.b3}
                        style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11, opacity: scada.filters.b3 ? 1 : 0.6 }}>
                        <option value="">Element seçin...</option>
                        {scada.options.elements.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                    <div style={{ minWidth: 110 }}>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: 2 }}>VERİ PERİYODU</label>
                      <select value={scadaDataRatePeriodMinutes} onChange={e => setScadaDataRatePeriodMinutes(Number(e.target.value))}
                        style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }}>
                        {SCADA_DATA_RATE_PERIOD_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                    <button className="btn btn-primary"
                      disabled={scada.queryLoading || ytbs.status !== 'connected' || !scada.filters.b1 || !scada.filters.b2 || !scada.filters.b3 || !scada.filters.scadaId || scadaQueryWindow.status !== 'ok'}
                      onClick={() => scada.queryRange(scada.filters.startTime, scada.filters.endTime)}
                      style={{ fontWeight: 600, fontSize: 12 }}>
                      {scada.queryLoading ? '⏳ Sorgulanıyor...' : '📊 GÖSTER'}
                    </button>
                  </div>
                  {(scadaTimeRangeWarning || scada.queryNotice || scadaTimeRangeNotice || scadaQueryProgressText) && (
                    <div style={{ marginTop: 8, color: scadaTimeRangeWarning ? 'var(--accent-red)' : 'var(--accent-yellow)', fontSize: 11 }}>
                      {scadaTimeRangeWarning || [
                        scada.queryNotice || scadaTimeRangeNotice,
                        scada.queryLoading && scadaQueryProgressText ? scadaQueryProgressText : null,
                      ].filter(Boolean).join(' - ')}
                    </div>
                  )}
                  {scada.filters.b1 && (
                    <div style={{ marginTop: 8, padding: '4px 8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#3b82f6', fontSize: 16 }}>📍</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: '#3b82f6', letterSpacing: '0.02em' }}>
                        {[selectedScadaB1Label, selectedScadaB2Label, selectedScadaB3Label, selectedScadaElementLabel].filter(Boolean).join(' / ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {scada.data.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '20px' }}>
                  <div className="card" style={{ flex: '1', display: 'flex', flexDirection: 'row' }}>
                    <div style={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRight: '1px solid var(--border-color)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', padding: '10px 0', fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '1px' }}>
                      SCADA
                    </div>
                    <div className="card-body" style={{ padding: '4px', flex: 1, position: 'relative', minHeight: 420 }}>
                      <TimeChart
                        height={420}
                        title={scada.title || (scadaDisplayUnit ? `Ölçüm (${scadaDisplayUnit})` : 'Ölçüm')}
                        cssHeight="100%"
                        themeMode={themeMode}
                        series={processedScadaData}
                        valueAxisName={scadaDisplayUnit || 'Analog değer'}
                        secondaryAxisName="Threshold %"
                        extraTooltipRows={scadaTooltipRows}
                        xAxisRange={scadaAxisRange}
                        gridRight={210}
                      />
                    </div>
                  </div>
                  <div className="card" style={{ flex: '1', display: 'flex', flexDirection: 'row' }}>
                    <div style={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRight: '1px solid var(--border-color)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', padding: '10px 0', fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '1px' }}>
                      VERİ/DK
                    </div>
                    <div className="card-body" style={{ padding: '4px', flex: 1, position: 'relative', minHeight: 170 }}>
                      <TimeChart
                        height={170}
                        title="Veri Sayısı / Dakika"
                        cssHeight="100%"
                        themeMode={themeMode}
                        series={processedScadaDataRate}
                        valueAxisName="Veri/dk"
                        xAxisRange={scadaAxisRange}
                        gridRight={210}
                      />
                    </div>
                  </div>
                  <div className="scada-info-grid">
                    {scadaInfoCards.map(card => (
                      <div className="scada-info-card" key={card.label}>
                        <div className="scada-info-label">{card.label}</div>
                        <div className="scada-info-value" title={card.value}>{card.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="threshold-note">
                    Threshold yüzdesi, ilk nokta hariç ardışık analog değerler arasındaki farkın AÇIKLAMA 2’de tanımlı analog aralığına oranı ile tahmini olarak hesaplanır. Ardışık analog değerler eşitse son hesaplanmış threshold değeri taşınır. Bu değer gerçek RTU threshold ayarı değil, SCADA verisinden hesaplanan tahmini değişim yüzdesidir.
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: 'var(--text-muted)', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span>✅ {scada.data.length} veri noktası yüklendi</span>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '6px 14px', fontSize: 11, fontWeight: 600 }}
                        onClick={() => {
                          try {
                            if (!scada.data.length) {
                              showExportMessage('İndirilecek veri bulunamadı.');
                              return;
                            }
                            showExportMessage('YTBS SCADA CSV dosyası hazırlanıyor...');
                            const csvContent = buildYtbsScadaCsv(scada.data as unknown as Record<string, unknown>[], {
                              unit: scada.unit || selectedScadaPoint?.unit || '',
                              b1: selectedScadaB1Label,
                              b2: selectedScadaB2Label,
                              b3: selectedScadaB3Label,
                              element: selectedScadaElementLabel,
                            });
                            downloadCsv(csvContent, `YTBS_SCADA_VERI_EKSPOR_${new Date().getTime()}.csv`);
                            showExportMessage('YTBS SCADA CSV indirildi. Türkçe karakterler Excel uyumu için ASCII olarak yazıldı.');
                          } catch (err) {
                            showExportMessage('CSV oluşturma hatası: ' + err);
                          }
                        }}
                      >
                        📥 SCADA CSV İNDİR
                      </button>
                    </div>
                    <span>🔗 Kaynak: YTBS (ytbs.teias.gov.tr)</span>
                  </div>
                </div>
              ) : (
                <div className="card">
                  <div className="card-body" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    {scada.queryLoading ? (
                      <div>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                        <div style={{ fontSize: 14 }}>YTBS'den SCADA verisi sorgulanıyor...</div>
                        <div style={{ fontSize: 11, marginTop: 6 }}>Bu işlem birkaç saniye sürebilir.</div>
                      </div>
                    ) : scada.queryError ? (
                      <div>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>{scadaQueryIsSessionError ? '🔐' : '❌'}</div>
                        <div style={{ fontSize: 14, color: scadaQueryIsSessionError ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>
                          {scadaQueryIsSessionError ? 'YTBS Oturum Uyarısı' : 'Sorgu Hatası'}
                        </div>
                        <div style={{ fontSize: 11, marginTop: 6, color: scadaQueryIsSessionError ? 'var(--accent-yellow)' : 'var(--accent-red)', maxWidth: 500, margin: '6px auto', wordBreak: 'break-word' }}>{scada.queryError}</div>
                      </div>
                    ) : ytbs.status === 'connected' ? (
                      <div>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
                        <div style={{ fontSize: 14 }}>YTBS bağlantısı aktif</div>
                        <div style={{ fontSize: 11, marginTop: 6 }}>B1, B2, B3 ve Element seçip <strong>GÖSTER</strong> butonuna basın.</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
                        <div style={{ fontSize: 14 }}>YTBS oturumu aktif değil</div>
                        <div style={{ fontSize: 11, marginTop: 6 }}>Önce <strong>Ayarlar</strong> sekmesinden YTBS'ye bağlanın.</div>
                        <button className="btn btn-primary" style={{ marginTop: 12, fontSize: 11 }} onClick={() => setActiveTab('config')}>
                          ⚙️ Ayarlar'a Git
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div
            style={{ display: activeTab === 'ytbs_scada_quality_report' ? 'block' : 'none' }}
          >
            <YtbsScadaQualityReport
              ytbsStatus={ytbs.status}
              onOpenScadaPoint={handleOpenScadaPointFromQualityReport}
            />
          </div>

          {activeTab === 'ytbs_scada_points' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 20 }}>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">📍 YTBS SCADA Ölçüm Noktaları</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Kaynak: ytbs_scada/SCADA_OLCUM_NOKTASI.xlsx
                  </span>
                </div>
                <div className="card-body" style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))', gap: 8, marginBottom: 12 }}>
                    <div style={{ padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--table-header-bg)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>TOPLAM</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{scadaCatalogTotals.total}</div>
                    </div>
                    <div style={{ padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'rgba(59,130,246,0.08)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>ANALOG ÖLÇÜM</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#60a5fa' }}>{scadaCatalogTotals.analog}</div>
                    </div>
                    <div style={{ padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'rgba(245,158,11,0.08)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>DİJİTAL ÖLÇÜM</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-yellow)' }}>{scadaCatalogTotals.digital}</div>
                    </div>
                    <div style={{ padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'rgba(16,185,129,0.08)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>AKTİF</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-green)' }}>{scadaCatalogTotals.active}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(120px, 1fr)) auto', gap: 8, alignItems: 'end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>ÖLÇÜM TİPİ</label>
                      <select value={scadaPointFilters.kind} onChange={e => setScadaPointFilter('kind', e.target.value)}
                        style={{ width: '100%', padding: 7, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }}>
                        <option value="all">Tümü</option>
                        <option value="analog">Analog Ölçüm</option>
                        <option value="digital">Dijital Ölçüm</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>B1 ADI</label>
                      <select value={scadaPointFilters.b1Adi} onChange={e => setScadaPointFilter('b1Adi', e.target.value)}
                        style={{ width: '100%', padding: 7, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }}>
                        <option value="">Tümü</option>
                        {scadaPointFilterOptions.b1Adi.map(value => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>B2 ADI</label>
                      <select value={scadaPointFilters.b2Adi} onChange={e => setScadaPointFilter('b2Adi', e.target.value)}
                        style={{ width: '100%', padding: 7, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }}>
                        <option value="">Tümü</option>
                        {scadaPointFilterOptions.b2Adi.map(value => <option key={value} value={value}>{formatScadaVoltageLevelLabel(value)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>B3 ADI</label>
                      <select value={scadaPointFilters.b3Adi} onChange={e => setScadaPointFilter('b3Adi', e.target.value)}
                        style={{ width: '100%', padding: 7, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }}>
                        <option value="">Tümü</option>
                        {scadaPointFilterOptions.b3Adi.map(value => <option key={value} value={value}>{formatScadaVoltageLevelLabel(value)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>TRAFO MERKEZİ</label>
                      <select value={scadaPointFilters.trafoMerkezi} onChange={e => setScadaPointFilter('trafoMerkezi', e.target.value)}
                        style={{ width: '100%', padding: 7, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }}>
                        <option value="">Tümü</option>
                        {scadaPointFilterOptions.trafoMerkezi.map(value => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>ELEMENT ID</label>
                      <select value={scadaPointFilters.elementId} onChange={e => setScadaPointFilter('elementId', e.target.value)}
                        style={{ width: '100%', padding: 7, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }}>
                        <option value="">Tümü</option>
                        {scadaPointFilterOptions.elementId.map(value => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </div>
                    <div className="filter-actions">
                      <button className="btn btn-primary" style={{ fontSize: 11, padding: '7px 12px' }} onClick={() => {
                        setScadaPointPage(1);
                        setScadaPointFilters({ kind: 'all', b1Adi: '', b2Adi: '', b3Adi: '', trafoMerkezi: '', elementId: '' });
                      }}>
                        Temizle
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ fontSize: 11, padding: '7px 12px', whiteSpace: 'nowrap' }}
                        onClick={() => setShowScadaPointDetails(show => !show)}
                        aria-pressed={showScadaPointDetails}
                      >
                        {showScadaPointDetails ? 'Ayrıntıyı Gizle' : 'Ayrıntıyı Göster'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="card-title">{filteredScadaPoints.length} ölçüm noktası</span>
                  <div className="pagination-controls">
                    <span className="pagination-summary">
                      {scadaPointPageStart}-{scadaPointPageEnd} gösteriliyor · Sayfa {safeScadaPointPage}/{scadaPointPageCount}
                    </span>
                    <button
                      className="btn btn-outline btn-compact"
                      disabled={safeScadaPointPage <= 1}
                      onClick={() => setScadaPointPage(page => clampPage(page - 1, filteredScadaPoints.length))}
                    >
                      Önceki
                    </button>
                    <button
                      className="btn btn-outline btn-compact"
                      disabled={safeScadaPointPage >= scadaPointPageCount}
                      onClick={() => setScadaPointPage(page => clampPage(page + 1, filteredScadaPoints.length))}
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
                <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: showScadaPointDetails ? 1720 : 1120 }}>
                    <thead>
                      <tr style={{ color: 'var(--text-muted)', background: 'var(--table-header-bg)' }}>
                        {[
                          'Tip',
                          'B1 Adı',
                          'B2 Adı',
                          'B3 Adı',
                          'Trafo Merkezi',
                          'Element ID',
                          'Element Adı',
                          'Noel',
                          'Nimset',
                          'Aktif',
                          ...(showScadaPointDetails ? ['AÇIKLAMA 1', 'AÇIKLAMA 2', 'AÇIKLAMA 3', 'EŞLEŞME DURUMU'] : []),
                        ].map(header => (
                          <th key={header} style={{ textAlign: 'left', padding: '9px 10px', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedScadaPoints.map(point => (
                        <tr key={point.id} style={{ borderBottom: '1px solid var(--row-border)' }}>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ color: point.measurementKind === 'digital' ? 'var(--accent-yellow)' : '#60a5fa', fontWeight: 700 }}>
                              {point.measurementKind === 'digital' ? 'Dijital' : 'Analog'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', color: 'var(--text-primary)' }}>{point.b1Adi}</td>
                          <td style={{ padding: '8px 10px' }}>{formatScadaVoltageLevelLabel(point.b2Adi)}</td>
                          <td style={{ padding: '8px 10px' }}>{formatScadaVoltageLevelLabel(point.b3Adi)}</td>
                          <td style={{ padding: '8px 10px' }}>{point.trafoMerkezi || '-'}</td>
                          <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace' }}>{point.elementId}</td>
                          <td style={{ padding: '8px 10px' }}>{point.elementAdi}</td>
                          <td style={{ padding: '8px 10px' }}>{point.noel}</td>
                          <td style={{ padding: '8px 10px' }}>{point.nimset}</td>
                          <td style={{ padding: '8px 10px', color: point.aktif ? 'var(--accent-green)' : 'var(--text-muted)' }}>{point.aktif ? 'Aktif' : 'Pasif'}</td>
                          {showScadaPointDetails && (
                            <>
                              <td style={{ padding: '8px 10px' }}>{point.aciklama1}</td>
                              <td style={{ padding: '8px 10px' }}>{point.aciklama2}</td>
                              <td style={{ padding: '8px 10px' }}>{point.aciklama3}</td>
                              <td style={{ padding: '8px 10px' }}>{point.eslesmeDurumu}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Ayarlar ve Loglar */}
          {activeTab === 'config' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Salınım Algılayıcı Grafik Yumuşatma Ayarları</span>
                  <span className={`oscillation-source-pill ${oscillationSmoothingSettings.enabled ? 'source-ytbs' : 'source-none'}`}>
                    {oscillationSmoothingSettings.enabled ? 'Aktif' : 'Kapalı'}
                  </span>
                </div>
                <div className="card-body">
                  <div className="oscillation-settings-grid">
                    <label className="oscillation-toggle-row" htmlFor="oscillation-smoothing-enabled">
                      <input
                        id="oscillation-smoothing-enabled"
                        type="checkbox"
                        checked={oscillationSmoothingSettings.enabled}
                        onChange={event => setOscillationSmoothingEnabled(event.target.checked)}
                      />
                      <span>Filtrelenmiş F/Q/P/V serileri</span>
                    </label>
                    <div className="oscillation-setting-range">
                      <div className="oscillation-setting-header">
                        <span>Pencere Boyutu</span>
                        <strong>
                          {oscillationSmoothingSettings.windowSize} örnek · {(oscillationSmoothingSettings.windowSize / 10).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} sn
                        </strong>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={61}
                        step={2}
                        value={oscillationSmoothingSettings.windowSize}
                        disabled={!oscillationSmoothingSettings.enabled}
                        onChange={event => setOscillationSmoothingWindowSize(Number(event.target.value))}
                      />
                    </div>
                    <label className="oscillation-field" htmlFor="oscillation-smoothing-window-size">
                      <span className="oscillation-field-label">Window Size</span>
                      <input
                        id="oscillation-smoothing-window-size"
                        type="number"
                        min={1}
                        max={101}
                        step={2}
                        className="oscillation-control"
                        value={oscillationSmoothingSettings.windowSize}
                        disabled={!oscillationSmoothingSettings.enabled}
                        onChange={event => setOscillationSmoothingWindowSize(Number(event.target.value))}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="card-title">🔐 MerkezRMS Giriş Bilgileri (Faz 1 Test)</span>
                </div>
                <div className="card-body">
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Kullanıcı Adı</label>
                      <input
                        type="text"
                        id="rms-username"
                        defaultValue={localStorage.getItem('rms_username') || ''}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        placeholder="Kullanıcı adını girin..."
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Şifre</label>
                      <input
                        type="password"
                        id="rms-password"
                        defaultValue=""
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        placeholder="Şifreyi girin..."
                      />
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        const uname = (document.getElementById('rms-username') as HTMLInputElement).value;
                        localStorage.setItem('rms_username', uname);
                        localStorage.removeItem('rms_password');
                        useLogStore.getState().addLog({ type: 'INFO', message: 'Kullanıcı adı kaydedildi; şifre güvenlik nedeniyle kalıcı saklanmadı.', endpoint: 'Local Storage' });
                        alert('Kullanıcı adı kaydedildi. Şifre güvenlik nedeniyle kalıcı saklanmadı.');
                      }}
                    >
                      💾 Kaydet
                    </button>
                  </div>
                </div>
              </div>

              {/* YTBS Yedek Kanal Bağlantısı */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">🌐 YTBS Yedek Veri Kanalı</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
                    background: ytbs.status === 'connected' ? 'rgba(16,185,129,0.2)' : ytbs.status === 'sms_required' ? 'rgba(245,158,11,0.2)' : 'rgba(107,114,128,0.2)',
                    color: ytbs.status === 'connected' ? 'var(--accent-green)' : ytbs.status === 'sms_required' ? 'var(--accent-yellow)' : 'var(--text-muted)'
                  }}>
                    {ytbs.status === 'connected' ? '● Bağlı' : ytbs.status === 'sms_required' ? '◐ SMS Bekleniyor' : ytbs.status === 'expired' ? '● Süresi Dolmuş' : '○ Bağlı Değil'}
                  </span>
                </div>
                <div className="card-body">
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Birincil sunucuya erişilemediğinde YTBS (ytbs.teias.gov.tr) üzerinden GKÇ ve SCADA verileri çekilir. İlk girişte SMS doğrulaması gerekir (24 saat geçerli).
                  </div>
                  {ytbs.error && <div style={{ color: 'var(--accent-red)', fontSize: '12px', marginBottom: '8px' }}>⚠️ {ytbs.error}</div>}

                  {ytbs.status !== 'connected' && ytbs.status !== 'sms_required' && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '140px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>YTBS Kullanıcı Adı</label>
                        <input type="text" value={ytbs.ytbsUsername} onChange={e => ytbs.setAuthState('ytbsUsername', e.target.value)}
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                          placeholder="YTBS kullanıcı adı" />
                      </div>
                      <div style={{ flex: 1, minWidth: '140px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>YTBS Şifre</label>
                        <input type="password" value={ytbs.ytbsPassword} onChange={e => ytbs.setAuthState('ytbsPassword', e.target.value)}
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                          placeholder="Şifre" />
                      </div>
                      <div style={{ flex: 1, minWidth: '160px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>📲 Doğrulama Kodu Gönderme Tercihi</label>
                        <select value={ytbs.ytbsKanal} onChange={e => ytbs.setAuthState('ytbsKanal', e.target.value)}
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                          <option value="VODAFONE_FAST">Vodafone FAST</option>
                          <option value="AVEA">Avea</option>
                          <option value="VODAFONE">Vodafone</option>
                          <option value="EPOSTA">Eposta</option>
                        </select>
                      </div>
                      <button className="btn btn-primary" disabled={ytbs.isLoading} onClick={() => ytbs.login(ytbs.ytbsUsername, ytbs.ytbsPassword, ytbs.ytbsKanal)}>
                        {ytbs.isLoading ? '⏳ Bağlanıyor...' : '🔗 YTBS\'ye Bağlan'}
                      </button>
                    </div>
                  )}

                  {ytbs.status === 'sms_required' && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--accent-yellow)', marginBottom: '4px' }}>📱 SMS Doğrulama Kodu</label>
                        <input type="text" value={ytbs.smsCode} onChange={e => ytbs.setAuthState('smsCode', e.target.value)}
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--accent-yellow)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                          placeholder="SMS kodunu girin" maxLength={6} />
                      </div>
                      <button className="btn btn-primary" disabled={ytbs.isLoading || ytbs.smsCode.length < 4} onClick={() => ytbs.verifySms(ytbs.smsCode)}>
                        {ytbs.isLoading ? '⏳ Doğrulanıyor...' : '✅ Doğrula'}
                      </button>
                    </div>
                  )}

                  {ytbs.status === 'connected' && (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 12, color: 'var(--accent-green)' }}>✅ YTBS bağlantısı aktif. "YTBS GKÇ Veri" ve "YTBS SCADA Veri" sekmelerinden sorgulama yapabilirsiniz.</div>
                      <button className="btn btn-danger" onClick={() => ytbs.disconnect()} style={{ fontSize: '11px' }}>⛔ Bağlantıyı Kes</button>
                    </div>
                  )}
                </div>
              </div>




              <div className="card">
                <div className="card-header">
                  <span className="card-title">📋 Sistem ve Ağ Logları</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-outline" onClick={() => useLogStore.getState().clearLogs()} style={{ padding: '4px 8px', fontSize: '11px' }}>🗑 Temizle</button>
                    <button className="btn btn-primary" onClick={() => useLogStore.getState().downloadCsv()} style={{ padding: '4px 8px', fontSize: '11px' }}>📥 CSV İndir</button>
                  </div>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
                        <tr>
                          <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Zaman</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Tip</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Endpoint</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Mesaj</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleTimeString('tr-TR')}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{
                                padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
                                background: log.type === 'ERROR' ? 'rgba(239, 68, 68, 0.2)' : log.type === 'WARN' ? 'rgba(245, 158, 11, 0.2)' : log.type === 'NETWORK' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                color: log.type === 'ERROR' ? 'var(--accent-red)' : log.type === 'WARN' ? 'var(--accent-yellow)' : log.type === 'NETWORK' ? 'var(--accent-blue)' : 'var(--accent-green)'
                              }}>
                                {log.type}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-cyan)' }}>{log.endpoint || '-'}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{log.message}</td>
                          </tr>
                        ))}
                        {logs.length === 0 && (
                          <tr>
                            <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Henüz log kaydı bulunmuyor.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Diğer sekmeler için placeholder */}
          {['rms', 'pmu', 'pmux'].includes(activeTab) && (
            <div className="card">
              <div className="card-body" style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>🚧</div>
                <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                  {activeTab === 'rms' && 'RMS Detaylı Grafikler'}
                  {activeTab === 'pmu' && 'PMU Fazör Analizi'}
                  {activeTab === 'pmux' && 'PMUX Faz Bazlı Güç'}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  Bu bölüm Faz 3'te geliştirilecektir.
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export default App;
