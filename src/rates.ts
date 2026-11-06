/**
 * Dated rate tables for Kenyan payroll.
 *
 * Every table applies from its `effectiveFrom` month until the next table
 * starts. Amounts are monthly and in KES. Rates are fractions (0.06 = 6%).
 *
 * When the law changes, add a new table at the end with a new
 * `effectiveFrom`. Never edit an old table: past payslips must still
 * recompute the same way.
 */

export interface PayeBand {
  /** Upper bound of this band in monthly taxable income, or `null` for the top band. */
  upTo: number | null;
  rate: number;
}

export interface RateTable {
  /** First payroll month this table applies to, as `YYYY-MM`. */
  effectiveFrom: string;
  paye: {
    bands: readonly PayeBand[];
    personalRelief: number;
    insuranceReliefRate: number;
    insuranceReliefCap: number;
  };
  nssf: {
    rate: number;
    lowerEarningsLimit: number;
    upperEarningsLimit: number;
  };
  shif: {
    rate: number;
    minimum: number;
  };
  housingLevy: {
    employeeRate: number;
    employerRate: number;
  };
  /** Monthly caps on amounts that reduce taxable income. */
  deductionCaps: {
    /** NSSF plus any other registered pension contributions, combined. */
    pension: number;
    postRetirementMedicalFund: number;
    mortgageInterest: number;
  };
  sources: readonly string[];
}

/** PAYE bands in force since 1 July 2023 (Finance Act 2023), unchanged through 2026. */
const PAYE_BANDS: readonly PayeBand[] = [
  { upTo: 24_000, rate: 0.1 },
  { upTo: 32_333, rate: 0.25 },
  { upTo: 500_000, rate: 0.3 },
  { upTo: 800_000, rate: 0.325 },
  { upTo: null, rate: 0.35 },
];

const PAYE = {
  bands: PAYE_BANDS,
  personalRelief: 2_400,
  insuranceReliefRate: 0.15,
  insuranceReliefCap: 5_000,
} as const;

const SHIF = { rate: 0.0275, minimum: 300 } as const;
const HOUSING_LEVY = { employeeRate: 0.015, employerRate: 0.015 } as const;
const DEDUCTION_CAPS = {
  pension: 30_000,
  postRetirementMedicalFund: 15_000,
  mortgageInterest: 30_000,
} as const;

const KRA_TLAA_2024 =
  'https://www.kra.go.ke/news-center/public-notices/2157-amendments-to-paye-computation-pursuant-to-the-tax-laws-amendment-act%2C-2024';

export const RATE_TABLES: readonly RateTable[] = [
  {
    // Tax Laws (Amendment) Act 2024 in force 27 Dec 2024: SHIF and the
    // Housing Levy become deductible, pension cap rises to 30,000.
    // NSSF is still on Year 2 limits (Feb 2024).
    effectiveFrom: '2024-12',
    paye: PAYE,
    nssf: { rate: 0.06, lowerEarningsLimit: 7_000, upperEarningsLimit: 36_000 },
    shif: SHIF,
    housingLevy: HOUSING_LEVY,
    deductionCaps: DEDUCTION_CAPS,
    sources: [KRA_TLAA_2024],
  },
  {
    // NSSF Act 2013, Year 3 limits from February 2025.
    effectiveFrom: '2025-02',
    paye: PAYE,
    nssf: { rate: 0.06, lowerEarningsLimit: 8_000, upperEarningsLimit: 72_000 },
    shif: SHIF,
    housingLevy: HOUSING_LEVY,
    deductionCaps: DEDUCTION_CAPS,
    sources: [KRA_TLAA_2024],
  },
  {
    // NSSF Act 2013, Year 4 limits from February 2026.
    effectiveFrom: '2026-02',
    paye: PAYE,
    nssf: { rate: 0.06, lowerEarningsLimit: 9_000, upperEarningsLimit: 108_000 },
    shif: SHIF,
    housingLevy: HOUSING_LEVY,
    deductionCaps: DEDUCTION_CAPS,
    sources: [
      KRA_TLAA_2024,
      'https://assets.kpmg.com/content/dam/kpmgsites/ke/pdf/thought_leaderships/tax/2026/Phase-4-of-NSSF-Contribution-Rates-effective-February-2026.pdf.coredownload.inline.pdf',
    ],
  },
];

const PERIOD_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** The current month as `YYYY-MM`, in East Africa Time. */
export function currentPeriod(now: Date = new Date()): string {
  const eat = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return `${eat.getUTCFullYear()}-${String(eat.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Returns the rate table for a payroll month (`YYYY-MM`).
 * Throws for months before the earliest supported table.
 */
export function getRateTable(period: string = currentPeriod()): RateTable {
  if (!PERIOD_PATTERN.test(period)) {
    throw new RangeError(`period must look like "2026-02", got "${period}"`);
  }
  let match: RateTable | undefined;
  for (const table of RATE_TABLES) {
    if (table.effectiveFrom <= period) match = table;
  }
  if (!match) {
    const earliest = RATE_TABLES[0]?.effectiveFrom;
    throw new RangeError(`no rate table for ${period}; earliest supported month is ${earliest}`);
  }
  return match;
}
