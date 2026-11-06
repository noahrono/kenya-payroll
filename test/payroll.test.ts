// Expected figures below are worked out by hand from the published rules,
// so a regression in the code cannot quietly change both sides.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePayroll } from '../src/index.ts';

test('KES 100,000 in February 2026', () => {
  const r = calculatePayroll({ grossPay: 100_000, period: '2026-02' });
  assert.deepEqual(r.nssf, { tierI: 540, tierII: 5_460, employee: 6_000, employer: 6_000 });
  assert.equal(r.shif, 2_750);
  assert.deepEqual(r.housingLevy, { employee: 1_500, employer: 1_500 });
  assert.equal(r.taxableIncome, 89_750);
  // 24,000 x 10% + 8,333 x 25% + 57,417 x 30% = 21,708.35, less 2,400 relief
  assert.equal(r.paye.taxBeforeRelief, 21_708.35);
  assert.equal(r.paye.paye, 19_308.35);
  assert.equal(r.totalDeductions, 29_558.35);
  assert.equal(r.netPay, 70_441.65);
  assert.equal(r.employerCost, 107_500);
  assert.equal(r.rateTable, '2026-02');
});

test('KES 100,000 in June 2025 uses Year 3 NSSF limits', () => {
  const r = calculatePayroll({ grossPay: 100_000, period: '2025-06' });
  assert.deepEqual(r.nssf, { tierI: 480, tierII: 3_840, employee: 4_320, employer: 4_320 });
  assert.equal(r.taxableIncome, 91_430);
  assert.equal(r.paye.paye, 19_812.35);
  assert.equal(r.rateTable, '2025-02');
});

test('KES 50,000 in December 2024 uses Year 2 NSSF limits', () => {
  const r = calculatePayroll({ grossPay: 50_000, period: '2024-12' });
  assert.equal(r.nssf.employee, 2_160);
  assert.equal(r.shif, 1_375);
  assert.equal(r.housingLevy.employee, 750);
  assert.equal(r.taxableIncome, 45_715);
  assert.equal(r.paye.paye, 6_097.85);
});

test('low earner pays no PAYE once personal relief applies', () => {
  const r = calculatePayroll({ grossPay: 15_000, period: '2026-03' });
  assert.equal(r.nssf.employee, 900);
  assert.equal(r.shif, 412.5);
  assert.equal(r.housingLevy.employee, 225);
  assert.equal(r.taxableIncome, 13_462.5);
  assert.equal(r.paye.paye, 0);
  assert.equal(r.netPay, 13_462.5);
});

test('below the NSSF lower limit: Tier I only, SHIF minimum applies', () => {
  const r = calculatePayroll({ grossPay: 8_000, period: '2026-02' });
  assert.deepEqual(r.nssf, { tierI: 480, tierII: 0, employee: 480, employer: 480 });
  assert.equal(r.shif, 300);
  assert.equal(r.netPay, 7_100);
});

test('NSSF plus own pension is capped at KES 30,000 for tax', () => {
  const r = calculatePayroll({ grossPay: 300_000, period: '2026-02', pensionContribution: 30_000 });
  assert.equal(r.nssf.employee, 6_480);
  assert.equal(r.allowableDeductions.pension, 30_000);
  assert.equal(r.taxableIncome, 257_250);
  assert.equal(r.paye.paye, 69_558.35);
  // Own pension is voluntary, so it is not taken off net pay here.
  // 300,000 - 6,480 NSSF - 8,250 SHIF - 4,500 levy - 69,558.35 PAYE
  assert.equal(r.netPay, 211_211.65);
});

test('mortgage interest and post-retirement medical fund are capped', () => {
  const r = calculatePayroll({
    grossPay: 200_000,
    period: '2026-02',
    mortgageInterest: 40_000,
    postRetirementMedicalFund: 20_000,
  });
  assert.equal(r.allowableDeductions.mortgageInterest, 30_000);
  assert.equal(r.allowableDeductions.postRetirementMedicalFund, 15_000);
});

test('non-cash benefits raise taxable income but not SHIF or the levy', () => {
  const r = calculatePayroll({ grossPay: 100_000, period: '2026-02', taxableBenefits: 10_000 });
  assert.equal(r.shif, 2_750);
  assert.equal(r.housingLevy.employee, 1_500);
  assert.equal(r.taxableIncome, 99_750);
});

test('insurance relief is 15% of premiums, capped at KES 5,000', () => {
  const small = calculatePayroll({ grossPay: 100_000, period: '2026-02', insurancePremiums: 10_000 });
  assert.equal(small.paye.insuranceRelief, 1_500);
  assert.equal(small.paye.paye, 17_808.35);
  const large = calculatePayroll({ grossPay: 100_000, period: '2026-02', insurancePremiums: 50_000 });
  assert.equal(large.paye.insuranceRelief, 5_000);
});

test('zero pay gives zero everything', () => {
  const r = calculatePayroll({ grossPay: 0, period: '2026-02' });
  assert.equal(r.nssf.employee, 0);
  assert.equal(r.shif, 0);
  assert.equal(r.paye.paye, 0);
  assert.equal(r.netPay, 0);
});

test('rejects negative or non-numeric amounts', () => {
  assert.throws(() => calculatePayroll({ grossPay: -1, period: '2026-02' }), RangeError);
  assert.throws(() => calculatePayroll({ grossPay: Number.NaN, period: '2026-02' }), RangeError);
  assert.throws(
    () => calculatePayroll({ grossPay: 1_000, period: '2026-02', mortgageInterest: -5 }),
    RangeError,
  );
});
