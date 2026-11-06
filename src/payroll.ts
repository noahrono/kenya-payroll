import { assertAmount, round2 } from './money.ts';
import { paye, type PayeResult } from './paye.ts';
import { currentPeriod, getRateTable } from './rates.ts';
import { housingLevy, nssf, shif, type HousingLevyResult, type NssfResult } from './statutory.ts';

export interface PayrollInput {
  /** Monthly cash gross pay: basic pay plus cash allowances, bonuses and overtime. */
  grossPay: number;
  /** Payroll month as `YYYY-MM`. Defaults to the current month in East Africa Time. */
  period?: string;
  /** Earnings NSSF is charged on. Defaults to `grossPay`. */
  nssfPensionableEarnings?: number;
  /**
   * Taxable value of non-cash benefits (car, housing and so on). Added to taxable
   * income only; it is not part of the NSSF, SHIF or Housing Levy base. Apply the
   * KES 5,000 a month benefits exemption before passing this in.
   */
  taxableBenefits?: number;
  /** Employee's own monthly contribution to a registered pension or provident fund, on top of NSSF. */
  pensionContribution?: number;
  /** Monthly contribution to a registered post-retirement medical fund. */
  postRetirementMedicalFund?: number;
  /** Monthly qualifying mortgage interest on an owner-occupied home. */
  mortgageInterest?: number;
  /** Monthly qualifying life, health or education insurance premiums. */
  insurancePremiums?: number;
}

export interface PayrollResult {
  period: string;
  /** The `effectiveFrom` month of the rate table used. */
  rateTable: string;
  grossPay: number;
  nssf: NssfResult;
  shif: number;
  housingLevy: HousingLevyResult;
  /** Amounts subtracted from gross pay (plus benefits) to get taxable income, after caps. */
  allowableDeductions: {
    pension: number;
    shif: number;
    housingLevy: number;
    postRetirementMedicalFund: number;
    mortgageInterest: number;
    total: number;
  };
  taxableIncome: number;
  paye: PayeResult;
  /** Total taken from the employee's pay: NSSF, SHIF, Housing Levy and PAYE. */
  totalDeductions: number;
  /**
   * Gross pay minus statutory deductions and PAYE. Voluntary deductions such as
   * `pensionContribution` are not subtracted.
   */
  netPay: number;
  /** Gross pay plus the employer's NSSF and Housing Levy contributions. */
  employerCost: number;
}

/** Computes a full monthly payslip for a resident employee. */
export function calculatePayroll(input: PayrollInput): PayrollResult {
  const period = input.period ?? currentPeriod();
  const table = getRateTable(period);

  const grossPay = input.grossPay;
  const nssfBase = input.nssfPensionableEarnings ?? grossPay;
  const benefits = input.taxableBenefits ?? 0;
  const ownPension = input.pensionContribution ?? 0;
  const medicalFund = input.postRetirementMedicalFund ?? 0;
  const mortgage = input.mortgageInterest ?? 0;
  const premiums = input.insurancePremiums ?? 0;

  assertAmount('grossPay', grossPay);
  assertAmount('nssfPensionableEarnings', nssfBase);
  assertAmount('taxableBenefits', benefits);
  assertAmount('pensionContribution', ownPension);
  assertAmount('postRetirementMedicalFund', medicalFund);
  assertAmount('mortgageInterest', mortgage);
  assertAmount('insurancePremiums', premiums);

  const nssfResult = nssf(nssfBase, table);
  const shifAmount = shif(grossPay, table);
  const levy = housingLevy(grossPay, table);

  const caps = table.deductionCaps;
  const pension = round2(Math.min(nssfResult.employee + ownPension, caps.pension));
  const medical = round2(Math.min(medicalFund, caps.postRetirementMedicalFund));
  const mortgageAllowed = round2(Math.min(mortgage, caps.mortgageInterest));
  const totalAllowable = round2(pension + shifAmount + levy.employee + medical + mortgageAllowed);

  const taxableIncome = round2(Math.max(0, grossPay + benefits - totalAllowable));
  const payeResult = paye(taxableIncome, { insurancePremiums: premiums, table });

  const totalDeductions = round2(nssfResult.employee + shifAmount + levy.employee + payeResult.paye);

  return {
    period,
    rateTable: table.effectiveFrom,
    grossPay: round2(grossPay),
    nssf: nssfResult,
    shif: shifAmount,
    housingLevy: levy,
    allowableDeductions: {
      pension,
      shif: shifAmount,
      housingLevy: levy.employee,
      postRetirementMedicalFund: medical,
      mortgageInterest: mortgageAllowed,
      total: totalAllowable,
    },
    taxableIncome,
    paye: payeResult,
    totalDeductions,
    netPay: round2(grossPay - totalDeductions),
    employerCost: round2(grossPay + nssfResult.employer + levy.employer),
  };
}
