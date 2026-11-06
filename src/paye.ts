import { assertAmount, round2 } from './money.ts';
import { getRateTable, type RateTable } from './rates.ts';

export interface PayeBandBreakdown {
  from: number;
  upTo: number | null;
  rate: number;
  taxedAmount: number;
  tax: number;
}

export interface PayeResult {
  taxableIncome: number;
  /** Tax from the bands, before any relief. */
  taxBeforeRelief: number;
  personalRelief: number;
  insuranceRelief: number;
  /** PAYE to deduct. Never below zero. */
  paye: number;
  bands: PayeBandBreakdown[];
}

export interface PayeOptions {
  /** Monthly qualifying life, health or education insurance premiums. */
  insurancePremiums?: number;
  table?: RateTable;
}

/** Tax on monthly taxable income from the PAYE bands, before reliefs. */
export function taxFromBands(taxableIncome: number, table: RateTable = getRateTable()): {
  tax: number;
  bands: PayeBandBreakdown[];
} {
  assertAmount('taxableIncome', taxableIncome);
  const bands: PayeBandBreakdown[] = [];
  let from = 0;
  let tax = 0;
  for (const band of table.paye.bands) {
    if (taxableIncome <= from) break;
    const top = band.upTo === null ? taxableIncome : Math.min(taxableIncome, band.upTo);
    const taxedAmount = top - from;
    const bandTax = taxedAmount * band.rate;
    tax += bandTax;
    bands.push({ from, upTo: band.upTo, rate: band.rate, taxedAmount: round2(taxedAmount), tax: round2(bandTax) });
    if (band.upTo === null) break;
    from = band.upTo;
  }
  return { tax: round2(tax), bands };
}

/** Monthly PAYE for a resident employee, after personal and insurance relief. */
export function paye(taxableIncome: number, options: PayeOptions = {}): PayeResult {
  const table = options.table ?? getRateTable();
  const premiums = options.insurancePremiums ?? 0;
  assertAmount('insurancePremiums', premiums);

  const { tax, bands } = taxFromBands(taxableIncome, table);
  const { personalRelief, insuranceReliefRate, insuranceReliefCap } = table.paye;
  const insuranceRelief = round2(Math.min(premiums * insuranceReliefRate, insuranceReliefCap));
  const due = round2(Math.max(0, tax - personalRelief - insuranceRelief));

  return {
    taxableIncome: round2(taxableIncome),
    taxBeforeRelief: tax,
    personalRelief,
    insuranceRelief,
    paye: due,
    bands,
  };
}
