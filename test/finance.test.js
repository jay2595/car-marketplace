'use strict';
const f = require('../src/finance');

describe('Canadian sales tax', () => {
  test('Ontario is 13% HST', () => {
    const t = f.salesTax(10000, 'ON');
    expect(t.regime).toBe('HST');
    expect(t.total).toBe(1300);
    expect(t.federal).toBe(500);
  });
  test('Alberta is GST only at 5%', () => {
    const t = f.salesTax(10000, 'AB');
    expect(t.total).toBe(500);
    expect(t.provincial).toBe(0);
    expect(t.pstName).toBeNull();
  });
  test('Nova Scotia is 14% following the April 2025 cut', () => {
    expect(f.salesTax(10000, 'NS').total).toBe(1400);
  });
  test('Quebec QST is 9.975% on top of 5% GST', () => {
    const t = f.salesTax(10000, 'QC');
    expect(t.pstName).toBe('QST');
    expect(t.total).toBeCloseTo(1497.5, 2);
  });
  test('British Columbia is 5% GST + 7% PST', () => {
    expect(f.salesTax(10000, 'BC').total).toBe(1200);
  });
  test('unknown province throws', () => {
    expect(() => f.salesTax(100, 'ZZ')).toThrow(RangeError);
  });
  test('all 13 provinces and territories are present', () => {
    expect(f.listProvinces()).toHaveLength(13);
  });
});

describe('federal luxury tax', () => {
  test('does not apply to used vehicles', () => {
    expect(f.luxuryTax(150000, 'Used')).toBe(0);
    expect(f.luxuryTax(150000, 'Certified Pre-Owned')).toBe(0);
  });
  test('does not apply at or below $100,000', () => {
    expect(f.luxuryTax(100000, 'New')).toBe(0);
    expect(f.luxuryTax(99999, 'New')).toBe(0);
  });
  test('takes 20% of the excess when that is the lesser amount', () => {
    // $120,000: 10% of full = 12,000; 20% over = 4,000 -> 4,000
    expect(f.luxuryTax(120000, 'New')).toBe(4000);
  });
  test('takes 10% of full price when that is the lesser amount', () => {
    // $250,000: 10% of full = 25,000; 20% over = 30,000 -> 25,000
    expect(f.luxuryTax(250000, 'New')).toBe(25000);
  });
});

describe('periodic payment', () => {
  test('zero interest divides evenly', () => {
    expect(f.periodicPayment(12000, 0, 12, 12)).toBe(1000);
  });
  test('matches a standard amortization', () => {
    // $20,000 at 6% over 60 monthly payments -> $386.66
    expect(f.periodicPayment(20000, 6, 12, 60)).toBeCloseTo(386.66, 1);
  });
  test('zero principal costs nothing', () => {
    expect(f.periodicPayment(0, 8, 12, 60)).toBe(0);
  });
  test('rejects a zero-length term', () => {
    expect(() => f.periodicPayment(1000, 5, 12, 0)).toThrow(RangeError);
  });
});

describe('calculateDeal', () => {
  test('a trade-in reduces the taxable amount, not just the balance', () => {
    const withTrade = f.calculateDeal({ price: 40000, provinceCode: 'ON', tradeInValue: 10000 });
    const without   = f.calculateDeal({ price: 40000, provinceCode: 'ON' });
    expect(withTrade.breakdown.taxableAmount).toBe(30000);
    expect(withTrade.breakdown.salesTaxTotal).toBeLessThan(without.breakdown.salesTaxTotal);
    // tax saved is 13% of the trade-in allowance
    expect(without.breakdown.salesTaxTotal - withTrade.breakdown.salesTaxTotal).toBeCloseTo(1300, 2);
  });

  test('sales tax is charged on top of the luxury tax', () => {
    const d = f.calculateDeal({ price: 150000, provinceCode: 'ON', condition: 'New', includeAcExcise: false });
    expect(d.breakdown.luxuryTax).toBe(10000);            // 20% of 50,000
    expect(d.breakdown.salesTaxTotal).toBeCloseTo(20800, 2); // 13% of 160,000
  });

  test('negative equity increases the amount financed', () => {
    const clean = f.calculateDeal({ price: 30000, provinceCode: 'AB', tradeInValue: 5000 });
    const owing = f.calculateDeal({ price: 30000, provinceCode: 'AB', tradeInValue: 5000, tradeInOwing: 3000 });
    expect(owing.breakdown.amountFinanced - clean.breakdown.amountFinanced).toBe(3000);
  });

  test('air conditioning excise tax defaults on for new vehicles only', () => {
    expect(f.calculateDeal({ price: 30000, provinceCode: 'ON', condition: 'New' }).breakdown.acExciseTax).toBe(100);
    expect(f.calculateDeal({ price: 30000, provinceCode: 'ON', condition: 'Used' }).breakdown.acExciseTax).toBe(0);
  });

  test('bi-weekly produces 26 payments a year', () => {
    const d = f.calculateDeal({ price: 30000, provinceCode: 'ON', termMonths: 60, frequency: 'biweekly' });
    expect(d.financing.numberOfPayments).toBe(130);
    expect(d.financing.paymentsPerYear).toBe(26);
  });

  test('a longer term lowers the payment but costs more to borrow', () => {
    const short = f.calculateDeal({ price: 40000, provinceCode: 'ON', termMonths: 36 });
    const long  = f.calculateDeal({ price: 40000, provinceCode: 'ON', termMonths: 84 });
    expect(long.financing.paymentAmount).toBeLessThan(short.financing.paymentAmount);
    expect(long.financing.costOfBorrowing).toBeGreaterThan(short.financing.costOfBorrowing);
  });

  test('a down payment never drives the amount financed below zero', () => {
    const d = f.calculateDeal({ price: 20000, provinceCode: 'AB', downPayment: 100000 });
    expect(d.breakdown.amountFinanced).toBe(0);
    expect(d.financing.paymentAmount).toBe(0);
  });

  test('rejects invalid input', () => {
    expect(() => f.calculateDeal({ price: -1, provinceCode: 'ON' })).toThrow(TypeError);
    expect(() => f.calculateDeal({ price: 100, provinceCode: 'ON', frequency: 'daily' })).toThrow(RangeError);
    expect(() => f.calculateDeal({ price: 100, provinceCode: 'ON', termMonths: 999 })).toThrow(RangeError);
    expect(() => f.calculateDeal({ price: 100, provinceCode: 'ON', aprPercent: 99 })).toThrow(RangeError);
    expect(() => f.calculateDeal({ price: 100, provinceCode: 'ON', downPayment: -5 })).toThrow(RangeError);
  });
});

describe('affordability and schedule', () => {
  test('max affordable price round-trips back to roughly the target payment', () => {
    const a = f.maxAffordablePrice({ targetPayment: 500, provinceCode: 'ON', aprPercent: 7, termMonths: 60 });
    const d = f.calculateDeal({ price: a.maxPrice, provinceCode: 'ON', aprPercent: 7, termMonths: 60 });
    expect(Math.abs(d.financing.paymentAmount - 500)).toBeLessThan(12);
  });
  test('rejects a non-positive target', () => {
    expect(() => f.maxAffordablePrice({ targetPayment: 0, provinceCode: 'ON' })).toThrow(TypeError);
  });
  test('amortization pays the balance down to zero', () => {
    const s = f.amortizationSchedule(20000, 6, 12, 60, 5);
    expect(s.rows).toHaveLength(5);
    expect(s.rows[0].interest).toBeCloseTo(100, 1);
    expect(s.totalPaid).toBeCloseTo(20000 + s.totalInterest, 2);
  });
});

describe('estimateApr', () => {
  test('better credit means a lower rate', () => {
    expect(f.estimateApr('excellent')).toBeLessThan(f.estimateApr('poor'));
  });
  test('longer terms and used vehicles cost more', () => {
    expect(f.estimateApr('good', 84, 'Used')).toBeGreaterThan(f.estimateApr('good', 36, 'New'));
  });
  test('rejects an unknown band', () => {
    expect(() => f.estimateApr('platinum')).toThrow(RangeError);
  });
});
