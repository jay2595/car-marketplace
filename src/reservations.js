'use strict';
/**
 * Reservation / booking state machine.
 *
 * available -> reserved (48h hold)      -> booked (deposit taken) -> sold
 *           \-> expired back to available if the hold lapses
 *
 * In-memory by design: this demo is about the delivery pipeline, not persistence.
 * Swapping in Postgres means replacing this module and nothing else.
 */
const HOLD_HOURS = 48;
const DEPOSIT_CAD = 500;

function ref(prefix, n) { return `${prefix}-${String(n).padStart(6, '0')}`; }

class ReservationStore {
  constructor(clock = () => Date.now()) {
    this.clock = clock;
    this.reservations = new Map();
    this.testDrives = new Map();
    this.seq = 0;
    this.tdSeq = 0;
  }

  _expireStale() {
    const now = this.clock();
    for (const r of this.reservations.values()) {
      if (r.status === 'reserved' && now > r.expiresAt) r.status = 'expired';
    }
  }

  activeFor(carId) {
    this._expireStale();
    return [...this.reservations.values()].find(
      (r) => r.carId === carId && ['reserved', 'booked'].includes(r.status)
    ) || null;
  }

  /** Place a 48-hour hold. Throws if the vehicle is already spoken for. */
  reserve(car, customer, notes = '') {
    if (!car) throw new RangeError('Vehicle not found');
    const existing = this.activeFor(car.id);
    if (existing) {
      const err = new Error('Vehicle is already reserved');
      err.code = 'ALREADY_RESERVED';
      err.reference = existing.reference;
      throw err;
    }
    const now = this.clock();
    const reservation = {
      reference: ref('RES', ++this.seq),
      carId: car.id,
      vehicle: `${car.year} ${car.make} ${car.model} ${car.trim}`,
      stockNumber: car.stockNumber,
      price: car.price,
      depositCad: DEPOSIT_CAD,
      customer,
      notes: String(notes || '').slice(0, 500),
      status: 'reserved',
      createdAt: now,
      expiresAt: now + HOLD_HOURS * 3600 * 1000,
      holdHours: HOLD_HOURS
    };
    this.reservations.set(reservation.reference, reservation);
    return reservation;
  }

  /** Convert a hold into a confirmed booking once the deposit is taken. */
  confirm(reference) {
    this._expireStale();
    const r = this.reservations.get(reference);
    if (!r) throw new RangeError('Reservation not found');
    if (r.status === 'expired') { const e = new Error('Reservation has expired'); e.code = 'EXPIRED'; throw e; }
    if (r.status === 'cancelled') { const e = new Error('Reservation was cancelled'); e.code = 'CANCELLED'; throw e; }
    r.status = 'booked';
    r.confirmedAt = this.clock();
    return r;
  }

  cancel(reference) {
    const r = this.reservations.get(reference);
    if (!r) throw new RangeError('Reservation not found');
    r.status = 'cancelled';
    r.cancelledAt = this.clock();
    return r;
  }

  get(reference) {
    this._expireStale();
    return this.reservations.get(reference) || null;
  }

  list() { this._expireStale(); return [...this.reservations.values()]; }

  /** Book a test drive. Independent of reservations - you can drive an unreserved car. */
  bookTestDrive(car, customer, when, dealer) {
    if (!car) throw new RangeError('Vehicle not found');
    const ts = Date.parse(when);
    if (Number.isNaN(ts)) throw new TypeError('Invalid date/time');
    if (ts < this.clock()) { const e = new Error('Test drive must be in the future'); e.code = 'PAST_DATE'; throw e; }
    const booking = {
      reference: ref('TD', ++this.tdSeq),
      carId: car.id,
      vehicle: `${car.year} ${car.make} ${car.model} ${car.trim}`,
      stockNumber: car.stockNumber,
      customer,
      dealer: dealer || null,
      scheduledFor: new Date(ts).toISOString(),
      status: 'scheduled',
      createdAt: this.clock(),
      reminder: 'Bring a valid provincial driver’s licence and proof of insurance.'
    };
    this.testDrives.set(booking.reference, booking);
    return booking;
  }

  getTestDrive(reference) { return this.testDrives.get(reference) || null; }
  listTestDrives() { return [...this.testDrives.values()]; }

  stats() {
    this._expireStale();
    const all = this.list();
    const count = (s) => all.filter((r) => r.status === s).length;
    return {
      reservations: all.length,
      reserved: count('reserved'),
      booked: count('booked'),
      expired: count('expired'),
      cancelled: count('cancelled'),
      testDrives: this.testDrives.size
    };
  }
}

module.exports = { ReservationStore, HOLD_HOURS, DEPOSIT_CAD };
