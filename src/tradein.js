'use strict';
/** Trade-in valuation. Deliberately simple and transparent - a real one would call a book value API. */
const CONDITION_FACTOR = { excellent: 1.00, good: 0.92, fair: 0.80, poor: 0.62 };
const CURRENT_YEAR = 2026;
const round50 = (n) => Math.round(n / 50) * 50;

function estimateTradeIn(input) {
  const { estimatedNewPrice, year, odometerKm, condition = 'good', accidents = 0, provinceCode = 'ON' } = input || {};
  if (!(estimatedNewPrice > 0)) throw new TypeError('estimatedNewPrice must be positive');
  if (!(year >= 1990 && year <= CURRENT_YEAR + 1)) throw new RangeError('year out of range');
  if (!(odometerKm >= 0)) throw new TypeError('odometerKm must be >= 0');
  const factor = CONDITION_FACTOR[condition];
  if (!factor) throw new RangeError(`Unknown condition: ${condition}`);

  const age = Math.max(0, CURRENT_YEAR - year);
  let value = estimatedNewPrice * Math.pow(0.86, age);       // depreciation curve

  const expectedKm = age * 16000;                             // Canadian average
  const kmDelta = odometerKm - expectedKm;
  value *= 1 - Math.max(-0.12, Math.min(0.30, kmDelta / 220000));

  value *= factor;
  value *= Math.max(0.70, 1 - accidents * 0.09);              // accident history hit
  value *= 0.86;                                              // wholesale vs retail spread

  const estimate = round50(Math.max(300, value));
  const low = round50(estimate * 0.90);
  const high = round50(estimate * 1.12);

  return {
    estimate, low, high, currency: 'CAD',
    inputs: { estimatedNewPrice, year, odometerKm, condition, accidents, provinceCode },
    taxAdvantageNote: 'On a dealer trade-in your sales tax is calculated on the price after the trade-in allowance, so the trade is worth more than its cash value.',
    disclaimer: 'Estimate only. Final value is subject to physical appraisal and a lien check.'
  };
}

module.exports = { estimateTradeIn, CONDITION_FACTOR };
