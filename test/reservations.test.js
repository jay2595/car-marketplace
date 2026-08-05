'use strict';
const { ReservationStore, HOLD_HOURS } = require('../src/reservations');
const cars = require('../data/cars.json');

const customer = { firstName: 'Jay', lastName: 'Patel', email: 'jay@example.ca', phone: '(416) 555-0123', postalCode: 'M5V 2T6', province: 'ON' };

describe('ReservationStore', () => {
  let now, store;
  beforeEach(() => { now = Date.parse('2026-08-04T12:00:00Z'); store = new ReservationStore(() => now); });

  test('reserving returns a reference and a 48-hour expiry', () => {
    const r = store.reserve(cars[0], customer);
    expect(r.reference).toMatch(/^RES-\d{6}$/);
    expect(r.status).toBe('reserved');
    expect(r.holdHours).toBe(HOLD_HOURS);
    expect(r.expiresAt - r.createdAt).toBe(HOLD_HOURS * 3600 * 1000);
  });

  test('a second hold on the same vehicle is rejected', () => {
    store.reserve(cars[0], customer);
    expect(() => store.reserve(cars[0], customer)).toThrow(/already reserved/i);
    try { store.reserve(cars[0], customer); } catch (e) { expect(e.code).toBe('ALREADY_RESERVED'); }
  });

  test('a different vehicle can still be reserved', () => {
    store.reserve(cars[0], customer);
    expect(store.reserve(cars[1], customer).status).toBe('reserved');
  });

  test('holds expire and free the vehicle again', () => {
    const r = store.reserve(cars[0], customer);
    now += 49 * 3600 * 1000;
    expect(store.get(r.reference).status).toBe('expired');
    expect(store.activeFor(cars[0].id)).toBeNull();
    expect(store.reserve(cars[0], customer).status).toBe('reserved');
  });

  test('confirming moves a hold to booked', () => {
    const r = store.reserve(cars[0], customer);
    expect(store.confirm(r.reference).status).toBe('booked');
  });

  test('an expired hold cannot be confirmed', () => {
    const r = store.reserve(cars[0], customer);
    now += 49 * 3600 * 1000;
    expect(() => store.confirm(r.reference)).toThrow(/expired/i);
  });

  test('a cancelled hold cannot be confirmed and frees the vehicle', () => {
    const r = store.reserve(cars[0], customer);
    store.cancel(r.reference);
    expect(() => store.confirm(r.reference)).toThrow(/cancelled/i);
    expect(store.activeFor(cars[0].id)).toBeNull();
  });

  test('unknown references throw', () => {
    expect(() => store.confirm('RES-999999')).toThrow(RangeError);
    expect(() => store.cancel('nope')).toThrow(RangeError);
    expect(store.get('nope')).toBeNull();
  });

  test('reserving a missing vehicle throws', () => {
    expect(() => store.reserve(null, customer)).toThrow(RangeError);
  });
});

describe('test drives', () => {
  let now, store;
  beforeEach(() => { now = Date.parse('2026-08-04T12:00:00Z'); store = new ReservationStore(() => now); });

  test('books a future slot', () => {
    const b = store.bookTestDrive(cars[0], customer, '2026-08-06T14:00:00Z', { name: 'Maple Leaf Auto' });
    expect(b.reference).toMatch(/^TD-\d{6}$/);
    expect(b.status).toBe('scheduled');
    expect(b.reminder).toMatch(/licence/i);
  });
  test('rejects a slot in the past', () => {
    expect(() => store.bookTestDrive(cars[0], customer, '2020-01-01T10:00:00Z')).toThrow(/future/i);
  });
  test('rejects an unparseable date', () => {
    expect(() => store.bookTestDrive(cars[0], customer, 'next tuesday-ish')).toThrow(TypeError);
  });
  test('a reserved vehicle can still be test driven', () => {
    store.reserve(cars[0], customer);
    expect(store.bookTestDrive(cars[0], customer, '2026-08-07T10:00:00Z').status).toBe('scheduled');
  });
});

describe('stats', () => {
  test('counts each status', () => {
    let now = Date.parse('2026-08-04T12:00:00Z');
    const store = new ReservationStore(() => now);
    const a = store.reserve(cars[0], customer);
    store.reserve(cars[1], customer);
    const c = store.reserve(cars[2], customer);
    store.confirm(a.reference);
    store.cancel(c.reference);
    store.bookTestDrive(cars[3], customer, '2026-08-09T10:00:00Z');
    const s = store.stats();
    expect(s).toMatchObject({ reservations: 3, booked: 1, reserved: 1, cancelled: 1, testDrives: 1 });
  });
});
