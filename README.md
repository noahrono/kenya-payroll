# kenya-payroll

[![CI](https://github.com/noahrono/kenya-payroll/actions/workflows/ci.yml/badge.svg)](https://github.com/noahrono/kenya-payroll/actions/workflows/ci.yml)

Kenyan payroll in one function call: **PAYE, NSSF, SHIF and the Affordable Housing Levy**, with dated rate tables so past months recompute exactly. Zero dependencies, fully typed.

```bash
npm install kenya-payroll
```

Needs Node 20 or later. The package is ESM only, so use `import`; on Node 20.19+ and 22.12+ `require()` works too. The types need TypeScript 5.0 or later.

```ts
import { calculatePayroll } from 'kenya-payroll';

const slip = calculatePayroll({ grossPay: 100_000, period: '2026-02' });

slip.nssf.employee   // 6,000
slip.shif            // 2,750
slip.housingLevy     // { employee: 1,500, employer: 1,500 }
slip.taxableIncome   // 89,750
slip.paye.paye       // 19,308.35
slip.netPay          // 70,441.65
slip.employerCost    // 107,500
```

## How the numbers are worked out

For a gross pay of **KES 100,000** in February 2026:

| Step | Amount |
|---|---:|
| Gross pay | 100,000.00 |
| NSSF Tier I: 6% of 9,000 | −540.00 |
| NSSF Tier II: 6% of (100,000 − 9,000) | −5,460.00 |
| SHIF: 2.75% of gross | −2,750.00 |
| Housing Levy: 1.5% of gross | −1,500.00 |
| **Taxable income** | **89,750.00** |
| PAYE: 24,000 × 10% + 8,333 × 25% + 57,417 × 30% | 21,708.35 |
| Less personal relief | −2,400.00 |
| **PAYE due** | **19,308.35** |
| **Net pay** (gross − NSSF − SHIF − levy − PAYE) | **70,441.65** |

## Rates covered

All amounts are monthly, in KES.

**PAYE** (resident, since July 2023)

| Taxable income | Rate |
|---|---:|
| 0 – 24,000 | 10% |
| 24,001 – 32,333 | 25% |
| 32,334 – 500,000 | 30% |
| 500,001 – 800,000 | 32.5% |
| Above 800,000 | 35% |

Personal relief is 2,400. Insurance relief is 15% of premiums, capped at 5,000.

**NSSF** (6% employee + 6% employer)

| From | Lower limit (Tier I) | Upper limit (Tier II) | Max employee |
|---|---:|---:|---:|
| Dec 2024 | 7,000 | 36,000 | 2,160 |
| Feb 2025 | 8,000 | 72,000 | 4,320 |
| Feb 2026 | 9,000 | 108,000 | 6,480 |

**SHIF:** 2.75% of gross with a minimum of 300 and no cap.

**Affordable Housing Levy:** 1.5% employee plus 1.5% employer, no cap.

**Deductions before PAYE** (Tax Laws (Amendment) Act 2024, from 27 Dec 2024):

| Deduction | Monthly cap |
|---|---:|
| SHIF | none |
| Housing Levy | none |
| NSSF plus registered pension | 30,000 combined |
| Post-retirement medical fund | 15,000 |
| Mortgage interest (owner-occupied) | 30,000 |

Months before **December 2024** are not supported and throw a `RangeError`.

## API

### `calculatePayroll(input)`

| Input | Meaning |
|---|---|
| `grossPay` | Monthly cash gross: basic, cash allowances, bonuses and overtime. Required. |
| `period` | `YYYY-MM`. Defaults to the current month in East Africa Time. |
| `nssfPensionableEarnings` | Earnings NSSF is charged on. Defaults to `grossPay`. |
| `taxableBenefits` | Taxable value of non-cash benefits. Added to taxable income only. Apply the 5,000/month benefits exemption first. |
| `pensionContribution` | Employee's own registered pension contribution on top of NSSF. |
| `postRetirementMedicalFund` | Contribution to a registered post-retirement medical fund. |
| `mortgageInterest` | Qualifying mortgage interest. |
| `insurancePremiums` | Qualifying life, health or education premiums. |

The result breaks every figure down: NSSF tiers, SHIF, the levy, allowable deductions after caps, taxable income, PAYE by band, total deductions, net pay and employer cost.

`netPay` subtracts only statutory deductions and PAYE. Voluntary deductions such as `pensionContribution`, loans or SACCO savings are not subtracted, so take those off yourself.

### Building blocks

```ts
import { nssf, shif, housingLevy, paye, taxFromBands, getRateTable } from 'kenya-payroll';

const table = getRateTable('2026-02');
nssf(50_000, table);                    // { tierI: 540, tierII: 2460, employee: 3000, employer: 3000 }
shif(50_000, table);                    // 1375
paye(40_000, { table }).paye;           // after relief
taxFromBands(40_000, table).bands;      // tax per band
```

## Not covered yet

- Non-resident employees, who get no personal relief
- Persons with disability exemption (first 150,000/month)
- Secondary employment, casuals and withholding tax for consultants
- NITA levy, which is paid by the employer
- Annual P9 reconciliation

Pull requests are welcome.

## Keeping rates current

Rates live in [`src/rates.ts`](src/rates.ts) as dated tables. When the law changes, add a new table with a new `effectiveFrom` and a source link. Never edit an old table, so past payslips still recompute the same way.

**This is not tax advice.** Check results against KRA's and NSSF's current notices before filing.

## Development

```bash
npm install
npm test        # runs the TypeScript tests directly on Node 22.18+
npm run build   # compiles to dist/
```

## License

MIT
