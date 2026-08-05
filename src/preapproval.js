'use strict';
/**
 * Financing pre-approval. Uses a Total Debt Service style ratio, which is how
 * Canadian lenders actually size an auto loan.
 */
const { CREDIT_BANDS, estimateApr, maxAffordablePrice, round2 } = require('./finance');

const EMPLOYMENT = {
  'full-time':     1.00,
  'part-time':     0.80,
  'self-employed': 0.85,
  'contract':      0.85,
  'retired':       0.75,
  'student':       0.55
};

function preApprove(input) {
  const {
    annualIncomeCad, employmentStatus = 'full-time', monthlyDebtPayments = 0,
    creditBand = 'good', provinceCode = 'ON', termMonths = 60,
    downPayment = 0, tradeInValue = 0, monthsAtEmployer = 24
  } = input || {};

  const errors = {};
  if (!(annualIncomeCad > 0)) errors.annualIncomeCad = 'Enter your gross annual income';
  if (!EMPLOYMENT[employmentStatus]) errors.employmentStatus = 'Select an employment status';
  if (!CREDIT_BANDS[creditBand]) errors.creditBand = 'Select a credit range';
  if (monthlyDebtPayments < 0) errors.monthlyDebtPayments = 'Cannot be negative';
  if (Object.keys(errors).length) return { approved: false, errors };

  const band = CREDIT_BANDS[creditBand];
  const grossMonthly = annualIncomeCad / 12;
  const employmentFactor = EMPLOYMENT[employmentStatus];
  const tenureFactor = monthsAtEmployer >= 12 ? 1 : 0.85;

  const capacity = grossMonthly * band.maxTds * employmentFactor * tenureFactor;
  const availableForCar = round2(capacity - monthlyDebtPayments);

  if (availableForCar < 150) {
    return {
      approved: false,
      reason: 'Existing monthly obligations leave too little room for a vehicle payment.',
      grossMonthlyIncome: round2(grossMonthly),
      maxTdsRatio: band.maxTds,
      availableMonthlyPayment: Math.max(0, availableForCar),
      suggestion: 'Reducing existing monthly debt or increasing your down payment would improve this.'
    };
  }

  const apr = estimateApr(creditBand, termMonths, 'Used');
  const afford = maxAffordablePrice({
    targetPayment: availableForCar, provinceCode, aprPercent: apr,
    termMonths, frequency: 'monthly', downPayment, tradeInValue
  });

  return {
    approved: true,
    reference: `PA-${Date.now().toString(36).toUpperCase()}`,
    grossMonthlyIncome: round2(grossMonthly),
    maxTdsRatio: band.maxTds,
    availableMonthlyPayment: availableForCar,
    estimatedApr: apr,
    creditBandLabel: band.label,
    termMonths,
    maxVehiclePrice: afford.maxPrice,
    maxAmountFinanced: afford.maxAmountFinanced,
    validForDays: 30,
    disclaimer: 'Pre-approval is an estimate based on the information provided. It is not a credit offer and does not affect your credit score. Final approval requires a full application and a credit check.'
  };
}

module.exports = { preApprove, EMPLOYMENT };
