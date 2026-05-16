import assert from 'node:assert/strict';
import {
  SCADA_POINT_PAGE_SIZE,
  clampPage,
  getPageCount,
  paginateRows,
  resolveInitialTheme,
  toggleTheme,
} from '../src/uiState.ts';

const rows = Array.from({ length: 250 }, (_, index) => index + 1);

assert.equal(SCADA_POINT_PAGE_SIZE, 100);
assert.equal(getPageCount(0), 1);
assert.equal(getPageCount(1), 1);
assert.equal(getPageCount(100), 1);
assert.equal(getPageCount(101), 2);
assert.equal(getPageCount(250), 3);

assert.deepEqual(paginateRows(rows, 1), rows.slice(0, 100));
assert.deepEqual(paginateRows(rows, 2), rows.slice(100, 200));
assert.deepEqual(paginateRows(rows, 3), rows.slice(200, 250));
assert.deepEqual(paginateRows(rows, 99), rows.slice(200, 250));

assert.equal(clampPage(0, 250), 1);
assert.equal(clampPage(2, 250), 2);
assert.equal(clampPage(9, 101), 2);

assert.equal(resolveInitialTheme(null), 'dark');
assert.equal(resolveInitialTheme('dark'), 'dark');
assert.equal(resolveInitialTheme('light'), 'light');
assert.equal(resolveInitialTheme('unexpected'), 'dark');
assert.equal(toggleTheme('dark'), 'light');
assert.equal(toggleTheme('light'), 'dark');
