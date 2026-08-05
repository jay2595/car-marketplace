'use strict';
/**
 * Canadian vehicle finance calculator.
 *
 * Encodes the rules that make this "Canadian standards" rather than a generic
 * loan calculator:
 *   - GST / HST / PST / QST / RST by province (verified Aug 2026; NS is 14%
 *     following the 1 Apr 2025 cut from 15%).
 *   - Trade-in allowance reduces the TAXABLE amount on a dealer sale, so a
 *     trade-in is worth more than its cash value.
 *   - Federal Select Luxury Items Tax: on NEW vehicles priced over $100,000,
 *     the lesser of 10% of the full price or 20% of the amount over $100,000.
 *     It is applied BEFORE sales tax, so you pay HST on the luxury tax too.
 *   - Federal air conditioning excise tax of $100 on new vehicles.
 *   - Payment frequencies Canadians are actually quoted: monthly, semi-monthly,
 *     bi-weekly and weekly.
 */

const PROVINCES = require('../data/provinces.json');

const LUXURY_TAX_THRESHOLD = 100000;
const AC_EXCISE_TAX = 100;

const FREQUENCIES = {
  monthly:     { label: 'Monthly',      periodsPerYear: 12 },
  semimonthly: { label: 'Semi-monthly', periodsPerYear: 24 },
  biweekly:    { label: 'Bi-weekly',    periodsPerYear: 26 },
  weekly:      { label: 'Weekly',       periodsPerYear: 52 }
};

// Indicative APRs. Real rates come from the lender; these drive the demo.
const CREDIT_BANDS = {
  excellent: { label: 'Excellent (760+)',  baseApr: 6.29, maxTds: 0.44 },
  good:      { label: 'Good (700-759)',    baseApr: 7.99, maxTds: 0.42 },
  fair:      { label: 'Fair (640-699)',    baseApr: 10.99, maxTds: 0.40 },
  poor:      { label: 'Rebuilding (<640)', baseApr: 15.49, maxTds: 0.36 }
};

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

function getProvince(code) {
  const p = PROVINCES.find((x) => x.code === String(code || '').toUpperCase());
  if (!p) throw new RangeError(`Unknown province code: ${code}`);
  return p;
}

function listProvinces() {
  return PROVINCES.map((p) => ({ ...p }));
}

/**
 * Federal luxury tax. Applies to new (previously unregistered) vehicles only.
 * Lesser of 10% of the full taxable price, or 20% of the excess over $100,000.
 */
function luxuryTax(price, condition = 'Used') {
  if (condition !== 'New') return 0;
  if (!(price > LUXURY_TAX_THRESHOLD)) return 0;
  return round2(Math.min(price * 0.10, (price - LUXURY_TAX_THRESHOLD) * 0.20));
}

/** Sales tax on an already-reduced taxable base. */
function salesTax(taxableAmount, provinceCode) {
  const p = getProvince(provinceCode);
  const base = Math.max(0, taxableAmount);
  const federal = round2(base * (p.gst / 100));
  const provincial = round2(base * (p.pst / 100));
  return {
    province: p.code,
    provinceName: p.name,
    regime: p.type,
    gstRate: p.gst,
    pstRate: p.pst,
    pstName: p.pstName,
    totalRate: p.totalRate,
    federal,
    provincial,
    total: round2(federal + provincial)
  };
}

/** Periodic payment for an ordinary annuity. */
function periodicPayment(principal, annualRatePct, periodsPerYear, totalPeriods) {
  if (totalPeriods <= 0) throw new RangeError('totalPeriods must be > 0');
  if (principal <= 0) return 0;
  const r = annualRatePct / 100 / periodsPerYear;
  if (r === 0) return round2(principal / totalPeriods);
  return round2((principal * r) / (1 - Math.pow(1 + r, -totalPeriods)));
}

/**
 * Full deal breakdown - the number a Canadian buyer actually cares about.
 */
function calculateDeal(opts) {
  const {
    price,
    provinceCode,
    condition = 'Used',
    downPayment = 0,
    tradeInValue = 0,
    tradeInOwing = 0,          // negative equity rolled into the loan
    aprPercent = 7.99,
    termMonths = 60,
    frequency = 'monthly',
    dealerFees = 0,            // admin / documentation fee
    licensingFee = 0,          // provincial plate + registration, not taxable
    includeAcExcise = null     // defaults to true for New
  } = opts || {};

  if (typeof price !== 'number' || price <= 0) throw new TypeError('price must be a positive number');
  if (!FREQUENCIES[frequency]) throw new RangeError(`Unknown frequency: ${frequency}`);
  if (termMonths <= 0 || termMonths > 120) throw new RangeError('termMonths must be 1-120');
  if (aprPercent < 0 || aprPercent > 40) throw new RangeError('aprPercent must be 0-40');
  if (downPayment < 0 || tradeInValue < 0 || tradeInOwing < 0) throw new RangeError('amounts cannot be negative');

  const freq = FREQUENCIES[frequency];
  const acExcise = (includeAcExcise === null ? condition === 'New' : includeAcExcise) ? AC_EXCISE_TAX : 0;

  // 1. Price plus taxable fees
  const subtotal = round2(price + dealerFees + acExcise);

  // 2. Trade-in reduces the taxable base on a dealer sale
  const tradeInCredit = Math.min(tradeInValue, subtotal);
  const afterTradeIn = round2(subtotal - tradeInCredit);

  // 3. Luxury tax, applied before sales tax
  const luxury = luxuryTax(price, condition);

  // 4. Sales tax on (price - trade-in + luxury tax)
  const taxableAmount = round2(afterTradeIn + luxury);
  const tax = salesTax(taxableAmount, provinceCode);

  // 5. Out-the-door total
  const totalBeforeCredits = round2(subtotal + luxury + tax.total + licensingFee);
  const totalDue = round2(totalBeforeCredits - tradeInCredit);

  // 6. Amount financed
  const amountFinanced = round2(Math.max(0, totalDue - downPayment + tradeInOwing));

  const totalPeriods = Math.round((termMonths / 12) * freq.periodsPerYear);
  const payment = periodicPayment(amountFinanced, aprPercent, freq.periodsPerYear, totalPeriods);
  const totalOfPayments = round2(payment * totalPeriods);
  const costOfBorrowing = round2(totalOfPayments - amountFinanced);

  return {
    input: { price, provinceCode: tax.province, condition, downPayment, tradeInValue, tradeInOwing, aprPercent, termMonths, frequency, dealerFees, licensingFee },
    breakdown: {
      vehiclePrice: round2(price),
      dealerFees: round2(dealerFees),
      acExciseTax: acExcise,
      subtotal,
      tradeInCredit: round2(tradeInCredit),
      taxableAmount,
      luxuryTax: luxury,
      gst: tax.federal,
      pst: tax.provincial,
      pstName: tax.pstName,
      taxRegime: tax.regime,
      taxRate: tax.totalRate,
      salesTaxTotal: tax.total,
      licensingFee: round2(licensingFee),
      totalDue,
      downPayment: round2(downPayment),
      tradeInOwing: round2(tradeInOwing),
      amountFinanced
    },
    financing: {
      frequency,
      frequencyLabel: freq.label,
      paymentsPerYear: freq.periodsPerYear,
      numberOfPayments: totalPeriods,
      paymentAmount: payment,
      aprPercent,
      termMonths,
      totalOfPayments,
      costOfBorrowing,
      firstPaymentDue: null
    },
    /** What a listing tile shows: "$412 bi-weekly" */
    summary: `$${payment.toFixed(2)} ${freq.label.toLowerCase()} for ${totalPeriods} payments at ${aprPercent}% APR`
  };
}

/** Reverse calculation: what price can this buyer afford? */
function maxAffordablePrice(opts) {
  const { targetPayment, provinceCode, aprPercent = 7.99, termMonths = 60,
          frequency = 'monthly', downPayment = 0, tradeInValue = 0 } = opts || {};
  if (!(targetPayment > 0)) throw new TypeError('targetPayment must be positive');
  const freq = FREQUENCIES[frequency];
  if (!freq) throw new RangeError(`Unknown frequency: ${frequency}`);

  const n = Math.round((termMonths / 12) * freq.periodsPerYear);
  const r = aprPercent / 100 / freq.periodsPerYear;
  const principal = r === 0 ? targetPayment * n : (targetPayment * (1 - Math.pow(1 + r, -n))) / r;

  const taxRate = getProvince(provinceCode).totalRate / 100;
  // principal = (price - tradeIn) * (1 + taxRate) + tradeIn - tradeIn - down  =>  solve for price
  const price = (principal + downPayment) / (1 + taxRate) + tradeInValue;
  return {
    maxPrice: Math.max(0, Math.floor(price / 100) * 100),
    maxAmountFinanced: round2(principal),
    assumptions: { targetPayment, aprPercent, termMonths, frequency, downPayment, tradeInValue, provinceCode }
  };
}

/** First N periods of the amortization schedule, plus totals. */
function amortizationSchedule(principal, aprPercent, periodsPerYear, totalPeriods, limit = 12) {
  const r = aprPercent / 100 / periodsPerYear;
  const pmt = periodicPayment(principal, aprPercent, periodsPerYear, totalPeriods);
  let balance = principal;
  let totalInterest = 0;
  const rows = [];
  for (let i = 1; i <= totalPeriods; i++) {
    const interest = round2(balance * r);
    const principalPaid = round2(Math.min(pmt - interest, balance));
    balance = round2(Math.max(0, balance - principalPaid));
    totalInterest = round2(totalInterest + interest);
    if (i <= limit) rows.push({ period: i, payment: pmt, interest, principal: principalPaid, balance });
  }
  return { payment: pmt, rows, totalInterest, totalPaid: round2(principal + totalInterest) };
}

/** Indicative APR from credit band, term and vehicle condition. */
function estimateApr(creditBand = 'good', termMonths = 60, condition = 'Used') {
  const band = CREDIT_BANDS[creditBand];
  if (!band) throw new RangeError(`Unknown credit band: ${creditBand}`);
  let apr = band.baseApr;
  if (condition === 'Used') apr += 0.90;
  if (condition === 'Certified Pre-Owned') apr += 0.40;
  if (termMonths > 72) apr += 0.75;
  else if (termMonths > 60) apr += 0.35;
  else if (termMonths <= 36) apr -= 0.40;
  return round2(Math.max(0, apr));
}

module.exports = {
  FREQUENCIES, CREDIT_BANDS, LUXURY_TAX_THRESHOLD, AC_EXCISE_TAX,
  getProvince, listProvinces, luxuryTax, salesTax, periodicPayment,
  calculateDeal, maxAffordablePrice, amortizationSchedule, estimateApr, round2
};
