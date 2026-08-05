'use strict';
const { estimateTradeIn } = require('../src/tradein');
const { preApprove } = require('../src/preapproval');

describe('trade-in estimate', () => {
  const base = { estimatedNewPrice: 40000, year: 2020, odometerKm: 90000, condition: 'good', accidents: 0 };

  test('returns a range bracketing the estimate', () => {
    const r = estimateTradeIn(base);
    expect(r.low).toBeLessThanOrEqual(r.estimate);
    expect(r.high).toBeGreaterThanOrEqual(r.estimate);
    expect(r.currency).toBe('CAD');
  });
  test('older vehicles are worth less', () => {
    expect(estimateTradeIn({ ...base, year: 2016 }).estimate)
      .toBeLessThan(estimateTradeIn({ ...base, year: 2023 }).estimate);
  });
  test('higher kilometres reduce the value', () => {
    expect(estimateTradeIn({ ...base, odometerKm: 220000 }).estimate)
      .toBeLessThan(estimateTradeIn({ ...base, odometerKm: 40000 }).estimate);
  });
  test('accidents reduce the value', () => {
    expect(estimateTradeIn({ ...base, accidents: 3 }).estimate)
      .toBeLessThan(estimateTradeIn({ ...base, accidents: 0 }).estimate);
  });
  test('condition matters', () => {
    expect(estimateTradeIn({ ...base, condition: 'poor' }).estimate)
      .toBeLessThan(estimateTradeIn({ ...base, condition: 'excellent' }).estimate);
  });
  test('never returns a negative or zero value', () => {
    expect(estimateTradeIn({ estimatedNewPrice: 12000, year: 2000, odometerKm: 480000, condition: 'poor', accidents: 3 }).estimate)
      .toBeGreaterThan(0);
  });
  test('explains the tax advantage of trading in', () => {
    expect(estimateTradeIn(base).taxAdvantageNote).toMatch(/tax/i);
  });
  test('rejects bad input', () => {
    expect(() => estimateTradeIn({ ...base, estimatedNewPrice: 0 })).toThrow(TypeError);
    expect(() => estimateTradeIn({ ...base, year: 1899 })).toThrow(RangeError);
    expect(() => estimateTradeIn({ ...base, condition: 'mint' })).toThrow(RangeError);
  });
});

describe('pre-approval', () => {
  const base = { annualIncomeCad: 90000, employmentStatus: 'full-time', monthlyDebtPayments: 500, creditBand: 'good', provinceCode: 'ON', termMonths: 60 };

  test('approves a solid applicant and sizes the budget', () => {
    const r = preApprove(base);
    expect(r.approved).toBe(true);
    expect(r.maxVehiclePrice).toBeGreaterThan(0);
    expect(r.reference).toMatch(/^PA-/);
    expect(r.disclaimer).toMatch(/credit score/i);
  });
  test('declines when existing debt consumes the capacity', () => {
    const r = preApprove({ ...base, annualIncomeCad: 30000, monthlyDebtPayments: 1400 });
    expect(r.approved).toBe(false);
    expect(r.suggestion).toEqual(expect.any(String));
  });
  test('higher income allows a higher price', () => {
    expect(preApprove({ ...base, annualIncomeCad: 150000 }).maxVehiclePrice)
      .toBeGreaterThan(preApprove({ ...base, annualIncomeCad: 60000 }).maxVehiclePrice);
  });
  test('weaker credit means a higher rate and a smaller budget', () => {
    const good = preApprove({ ...base, creditBand: 'excellent' });
    const poor = preApprove({ ...base, creditBand: 'poor' });
    expect(poor.estimatedApr).toBeGreaterThan(good.estimatedApr);
    expect(poor.maxVehiclePrice).toBeLessThan(good.maxVehiclePrice);
  });
  test('employment type scales the capacity', () => {
    expect(preApprove({ ...base, employmentStatus: 'student' }).maxVehiclePrice)
      .toBeLessThan(preApprove({ ...base, employmentStatus: 'full-time' }).maxVehiclePrice);
  });
  test('short tenure reduces the capacity', () => {
    expect(preApprove({ ...base, monthsAtEmployer: 3 }).availableMonthlyPayment)
      .toBeLessThan(preApprove({ ...base, monthsAtEmployer: 60 }).availableMonthlyPayment);
  });
  test('reports field errors instead of throwing', () => {
    const r = preApprove({ annualIncomeCad: 0, creditBand: 'nope' });
    expect(r.approved).toBe(false);
    expect(r.errors.annualIncomeCad).toEqual(expect.any(String));
    expect(r.errors.creditBand).toEqual(expect.any(String));
  });
});
