import { test } from 'node:test';
import assert from 'node:assert/strict';
import { currentPeriod, getRateTable, shif, taxFromBands } from '../src/index.ts';

test('every PAYE band, KES 1,000,000 taxable', () => {
  const { tax, bands } = taxFromBands(1_000_000, getRateTable('2026-02'));
  // 2,400 + 2,083.25 + 140,300.10 + 97,500 + 70,000
  assert.equal(tax, 312_283.35);
  assert.deepEqual(
    bands.map((b) => b.tax),
    [2_400, 2_083.25, 140_300.1, 97_500, 70_000],
  );
});

test('PAYE band edges', () => {
  const t = getRateTable('2026-02');
  assert.equal(taxFromBands(24_000, t).tax, 2_400);
  assert.equal(taxFromBands(32_333, t).tax, 4_483.25);
  assert.equal(taxFromBands(0, t).tax, 0);
});

test('SHIF rounds to the cent', () => {
  assert.equal(shif(33_333, getRateTable('2026-02')), 916.66);
});

test('rate table lookup by month', () => {
  assert.equal(getRateTable('2024-12').effectiveFrom, '2024-12');
  assert.equal(getRateTable('2025-01').effectiveFrom, '2024-12');
  assert.equal(getRateTable('2025-02').effectiveFrom, '2025-02');
  assert.equal(getRateTable('2026-01').effectiveFrom, '2025-02');
  assert.equal(getRateTable('2026-11').effectiveFrom, '2026-02');
});

test('rate table lookup rejects bad or unsupported months', () => {
  assert.throws(() => getRateTable('2024-11'), /earliest supported month is 2024-12/);
  assert.throws(() => getRateTable('2026-1'), RangeError);
  assert.throws(() => getRateTable('2026-13'), RangeError);
});

test('current period uses East Africa Time', () => {
  // 22:30 UTC on 31 Jan is already 1 Feb in Nairobi.
  assert.equal(currentPeriod(new Date('2026-01-31T22:30:00Z')), '2026-02');
  assert.equal(currentPeriod(new Date('2026-01-31T20:00:00Z')), '2026-01');
});
