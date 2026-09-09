import type { BenchmarkTimeZone } from './sasTypes.ts';

const pad = (value: number, size = 2): string => String(value).padStart(size, '0');

export const benchmarkTimeZoneLabel = (timeZone: BenchmarkTimeZone): string =>
  timeZone === 'local' ? 'Yerel Saat (Europe/Istanbul)' : 'UTC';

export const formatBenchmarkTimestamp = (
  timestampMs: number | null | undefined,
  timeZone: BenchmarkTimeZone,
  includeDate = true,
): string => {
  if (!Number.isFinite(timestampMs)) return '—';
  const zone = timeZone === 'local' ? 'Europe/Istanbul' : 'UTC';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(timestampMs as number));
  const value = (type: Intl.DateTimeFormatPartTypes): string => parts.find(part => part.type === type)?.value ?? '00';
  const clock = `${value('hour')}:${value('minute')}:${value('second')}.${pad(new Date(timestampMs as number).getUTCMilliseconds(), 3)}`;
  return includeDate ? `${value('day')}.${value('month')}.${value('year')} ${clock}` : clock;
};
