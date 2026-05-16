export type ThemeMode = 'dark' | 'light';

export const SCADA_POINT_PAGE_SIZE = 100;

export const resolveInitialTheme = (storedTheme: string | null | undefined): ThemeMode =>
  storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'dark';

export const toggleTheme = (theme: ThemeMode): ThemeMode => theme === 'dark' ? 'light' : 'dark';

export const getPageCount = (totalItems: number, pageSize = SCADA_POINT_PAGE_SIZE) =>
  Math.max(1, Math.ceil(totalItems / pageSize));

export const clampPage = (page: number, totalItems: number, pageSize = SCADA_POINT_PAGE_SIZE) =>
  Math.min(Math.max(1, page), getPageCount(totalItems, pageSize));

export const paginateRows = <T>(rows: T[], page: number, pageSize = SCADA_POINT_PAGE_SIZE) => {
  const safePage = clampPage(page, rows.length, pageSize);
  const start = (safePage - 1) * pageSize;
  return rows.slice(start, start + pageSize);
};
