'use strict';
const v = require('../src/validate');

describe('postal codes', () => {
  test.each(['M5V 2T6', 'm5v2t6', 'K1A-0B1', 'V6B 1A1'])('accepts %s', (p) => {
    expect(v.isValidPostalCode(p)).toBe(true);
  });
  test.each(['D1A 1A1', 'F1A 1A1', 'I1A 1A1', 'O1A 1A1', 'Q1A 1A1', 'U1A 1A1', 'W1A 1A1', 'Z1A 1A1'])
    ('rejects %s because that letter cannot start a postal code', (p) => {
      expect(v.isValidPostalCode(p)).toBe(false);
    });
  test('rejects malformed values', () => {
    ['', '12345', 'M5V', 'M5V 2T', 'ABC DEF', null].forEach((x) => expect(v.isValidPostalCode(x)).toBe(false));
  });
  test('normalises to the A1A 1A1 form', () => {
    expect(v.normalizePostalCode('m5v2t6')).toBe('M5V 2T6');
    expect(v.normalizePostalCode('K1A-0B1')).toBe('K1A 0B1');
  });
});

describe('phone numbers', () => {
  test.each(['(416) 555-0123', '4165550123', '416-555-0123', '+1 604 555 0199', '1-902-555-0100'])
    ('accepts %s', (p) => expect(v.isValidPhone(p)).toBe(true));
  test('rejects area codes starting with 0 or 1', () => {
    expect(v.isValidPhone('(016) 555-0123')).toBe(false);
    expect(v.isValidPhone('(116) 555-0123')).toBe(false);
  });
  test('rejects wrong lengths', () => {
    ['555-0123', '41655501234567', '', null].forEach((x) => expect(v.isValidPhone(x)).toBe(false));
  });
  test('normalises to (NNN) NNN-NNNN', () => {
    expect(v.normalizePhone('4165550123')).toBe('(416) 555-0123');
    expect(v.normalizePhone('1-416-555-0123')).toBe('(416) 555-0123');
  });
});

describe('other validators', () => {
  test('email', () => {
    expect(v.isValidEmail('jay@example.ca')).toBe(true);
    expect(v.isValidEmail('jay@example')).toBe(false);
    expect(v.isValidEmail('not an email')).toBe(false);
  });
  test('province codes', () => {
    expect(v.isValidProvince('on')).toBe(true);
    expect(v.isValidProvince('NU')).toBe(true);
    expect(v.isValidProvince('XX')).toBe(false);
    expect(v.PROVINCE_CODES).toHaveLength(13);
  });
  test('VIN is 17 characters with no I, O or Q', () => {
    expect(v.isValidVin('1HGCM82633A004352')).toBe(true);
    expect(v.isValidVin('1HGCM82633A00435')).toBe(false);
    expect(v.isValidVin('1HGCM8263IA004352')).toBe(false);
  });
});

describe('validateCustomer', () => {
  const good = { firstName: 'Jay', lastName: 'Patel', email: 'jay@example.ca',
                 phone: '4165550123', postalCode: 'm5v2t6', province: 'on' };

  test('accepts and normalises a valid customer', () => {
    const r = v.validateCustomer(good);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual({});
    expect(r.value.phone).toBe('(416) 555-0123');
    expect(r.value.postalCode).toBe('M5V 2T6');
    expect(r.value.province).toBe('ON');
  });

  test('reports every bad field with a message', () => {
    const r = v.validateCustomer({ firstName: 'J', lastName: '', email: 'x', phone: '1', postalCode: 'zzz', province: 'XX' });
    expect(r.valid).toBe(false);
    ['firstName', 'lastName', 'email', 'phone', 'postalCode', 'province']
      .forEach((k) => expect(r.errors[k]).toEqual(expect.any(String)));
  });

  test('handles a missing payload without throwing', () => {
    expect(v.validateCustomer(undefined).valid).toBe(false);
    expect(v.validateCustomer(null).valid).toBe(false);
  });
});
