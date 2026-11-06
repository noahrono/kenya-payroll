import { assertAmount, round2 } from './money.ts';
import { getRateTable, type RateTable } from './rates.ts';

export interface NssfResult {
  /** 6% of earnings up to the lower earnings limit. */
  tierI: number;
  /** 6% of earnings between the lower and upper earnings limits. */
  tierII: number;
  /** Employee deduction (Tier I + Tier II). */
  employee: number;
  /** Employer contribution, which matches the employee's. */
  employer: number;
}

export interface HousingLevyResult {
  employee: number;
  employer: number;
}

/** NSSF contributions on monthly pensionable earnings. */
export function nssf(pensionableEarnings: number, table: RateTable = getRateTable()): NssfResult {
  assertAmount('pensionableEarnings', pensionableEarnings);
  const { rate, lowerEarningsLimit, upperEarningsLimit } = table.nssf;
  const tierIBase = Math.min(pensionableEarnings, lowerEarningsLimit);
  const tierIIBase = Math.max(0, Math.min(pensionableEarnings, upperEarningsLimit) - lowerEarningsLimit);
  const tierI = round2(tierIBase * rate);
  const tierII = round2(tierIIBase * rate);
  const employee = round2(tierI + tierII);
  return { tierI, tierII, employee, employer: employee };
}

/** SHIF (Social Health Insurance Fund) on monthly gross pay. No upper cap. */
export function shif(grossPay: number, table: RateTable = getRateTable()): number {
  assertAmount('grossPay', grossPay);
  if (grossPay === 0) return 0;
  return round2(Math.max(grossPay * table.shif.rate, table.shif.minimum));
}

/** Affordable Housing Levy on monthly gross pay. No upper cap. */
export function housingLevy(grossPay: number, table: RateTable = getRateTable()): HousingLevyResult {
  assertAmount('grossPay', grossPay);
  return {
    employee: round2(grossPay * table.housingLevy.employeeRate),
    employer: round2(grossPay * table.housingLevy.employerRate),
  };
}
