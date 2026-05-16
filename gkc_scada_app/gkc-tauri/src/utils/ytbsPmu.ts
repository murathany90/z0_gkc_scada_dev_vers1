export type YtbsTimeResolution = 'second' | 'millisecond';
export type YtbsChartGroupKey = 'guc' | 'gerilim' | 'gerilimFazoru' | 'akim' | 'akimFazoru' | 'frekans';

export interface YtbsRawSample {
  zaman: string;
  [key: string]: string | number | undefined;
}

export interface YtbsChartSeries {
  data: Array<[number, number]>;
  color: string;
  label: string;
}

export interface YtbsChartGroup {
  key: YtbsChartGroupKey;
  railLabel: string;
  title: string;
  valueAxisName?: string;
  timeResolution: YtbsTimeResolution;
  series: YtbsChartSeries[];
}

interface SeriesDefinition {
  field: string;
  label: string;
  color: string;
}

interface GroupDefinition {
  key: YtbsChartGroupKey;
  railLabel: string;
  title: string;
  valueAxisName?: string;
  series: SeriesDefinition[];
}

const PHASE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6'];
const POWER_COLORS = ['#94a3b8', '#ef4444', '#3b82f6'];
const FREQUENCY_COLOR = '#4ade80';

export const isPmuMeasurement = (measurementType: string) =>
  measurementType.trim().toUpperCase() === 'PMU';

export const parseYtbsTimestamp = (zaman: string): number => {
  const parts = zaman.split(/[. :]/).map(part => Number(part));
  if (parts.length >= 5 && parts.slice(0, 5).every(Number.isFinite)) {
    const [day, month, year, hour, minute, second = 0, millisecond = 0] = parts;
    return new Date(year, month - 1, day, hour, minute, second, millisecond).getTime();
  }

  const fallback = new Date(zaman).getTime();
  return Number.isFinite(fallback) ? fallback : NaN;
};

const toSeries = (raw: YtbsRawSample[], definition: SeriesDefinition): YtbsChartSeries => ({
  color: definition.color,
  label: definition.label,
  data: raw
    .map(sample => {
      const timestamp = parseYtbsTimestamp(sample.zaman);
      const value = Number(sample[definition.field]);
      return Number.isFinite(timestamp) && Number.isFinite(value)
        ? [timestamp, value] as [number, number]
        : null;
    })
    .filter((point): point is [number, number] => point !== null),
});

const buildGroups = (
  raw: YtbsRawSample[],
  definitions: GroupDefinition[],
  timeResolution: YtbsTimeResolution,
): YtbsChartGroup[] =>
  definitions.map(definition => ({
    key: definition.key,
    railLabel: definition.railLabel,
    title: definition.title,
    valueAxisName: definition.valueAxisName,
    timeResolution,
    series: definition.series.map(seriesDefinition => toSeries(raw, seriesDefinition)),
  }));

const pqDefinitions: GroupDefinition[] = [
  {
    key: 'guc',
    railLabel: 'Güç',
    title: 'Güç Analizi (MW/MVAr)',
    valueAxisName: 'MW/MVAr',
    series: [
      { field: 'y11', label: 'Aktif Güç (y11)', color: POWER_COLORS[0] },
      { field: 'y12', label: 'Reaktif Güç (y12)', color: POWER_COLORS[1] },
      { field: 'y13', label: 'Görünen Güç (y13)', color: POWER_COLORS[2] },
    ],
  },
  {
    key: 'gerilim',
    railLabel: 'Gerilim',
    title: 'Gerilim Analizi (kV)',
    valueAxisName: 'kV',
    series: [
      { field: 'y3', label: 'Faz A (y3)', color: PHASE_COLORS[0] },
      { field: 'y4', label: 'Faz B (y4)', color: PHASE_COLORS[1] },
      { field: 'y5', label: 'Faz C (y5)', color: PHASE_COLORS[2] },
    ],
  },
  {
    key: 'akim',
    railLabel: 'Akım',
    title: 'Akım Analizi (A)',
    valueAxisName: 'A',
    series: [
      { field: 'y7', label: 'Faz A (y7)', color: PHASE_COLORS[0] },
      { field: 'y8', label: 'Faz B (y8)', color: PHASE_COLORS[1] },
      { field: 'y9', label: 'Faz C (y9)', color: PHASE_COLORS[2] },
    ],
  },
  {
    key: 'frekans',
    railLabel: 'Frekans',
    title: 'Frekans Analizi (Hz)',
    valueAxisName: 'Hz',
    series: [
      { field: 'y1', label: 'Frekans (y1)', color: FREQUENCY_COLOR },
    ],
  },
];

const pmuDefinitions: GroupDefinition[] = [
  {
    key: 'guc',
    railLabel: 'Güç',
    title: 'PMU Güç Analizi (MW/MVAr/MVA)',
    valueAxisName: 'MW/MVAr/MVA',
    series: [
      { field: 'y14', label: 'Aktif Güç (y14)', color: POWER_COLORS[0] },
      { field: 'y15', label: 'Reaktif Güç (y15)', color: POWER_COLORS[1] },
      { field: 'y16', label: 'Görünen Güç (y16)', color: POWER_COLORS[2] },
    ],
  },
  {
    key: 'gerilim',
    railLabel: 'Gerilim',
    title: 'PMU Gerilim Büyüklüğü (kV)',
    valueAxisName: 'kV',
    series: [
      { field: 'y2', label: 'Faz A (y2)', color: PHASE_COLORS[0] },
      { field: 'y3', label: 'Faz B (y3)', color: PHASE_COLORS[1] },
      { field: 'y4', label: 'Faz C (y4)', color: PHASE_COLORS[2] },
    ],
  },
  {
    key: 'gerilimFazoru',
    railLabel: 'Gerilim Fazörü',
    title: 'PMU Gerilim Fazörü (°)',
    valueAxisName: '°',
    series: [
      { field: 'y5', label: 'Faz A (y5)', color: PHASE_COLORS[0] },
      { field: 'y6', label: 'Faz B (y6)', color: PHASE_COLORS[1] },
      { field: 'y7', label: 'Faz C (y7)', color: PHASE_COLORS[2] },
    ],
  },
  {
    key: 'akim',
    railLabel: 'Akım',
    title: 'PMU Akım Büyüklüğü (A)',
    valueAxisName: 'A',
    series: [
      { field: 'y8', label: 'Faz A (y8)', color: PHASE_COLORS[0] },
      { field: 'y9', label: 'Faz B (y9)', color: PHASE_COLORS[1] },
      { field: 'y10', label: 'Faz C (y10)', color: PHASE_COLORS[2] },
    ],
  },
  {
    key: 'akimFazoru',
    railLabel: 'Akım Fazörü',
    title: 'PMU Akım Fazörü (°)',
    valueAxisName: '°',
    series: [
      { field: 'y11', label: 'Faz A (y11)', color: PHASE_COLORS[0] },
      { field: 'y12', label: 'Faz B (y12)', color: PHASE_COLORS[1] },
      { field: 'y13', label: 'Faz C (y13)', color: PHASE_COLORS[2] },
    ],
  },
  {
    key: 'frekans',
    railLabel: 'Frekans',
    title: 'PMU Frekans Analizi (Hz)',
    valueAxisName: 'Hz',
    series: [
      { field: 'y1', label: 'Frekans (y1)', color: FREQUENCY_COLOR },
    ],
  },
];

export const buildYtbsChartGroups = (
  raw: YtbsRawSample[],
  measurementType: string,
): YtbsChartGroup[] =>
  isPmuMeasurement(measurementType)
    ? buildGroups(raw, pmuDefinitions, 'millisecond')
    : buildGroups(raw, pqDefinitions, 'second');
