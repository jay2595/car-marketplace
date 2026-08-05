'use strict';
const request = require('supertest');
const app = require('../server');
const cars = require('../data/cars.json');

const customer = { firstName: 'Jay', lastName: 'Patel', email: 'jay@example.ca',
                   phone: '4165550123', postalCode: 'M5V 2T6', province: 'ON' };

describe('health and info', () => {
  test('GET /health/live', async () => {
    const r = await request(app).get('/health/live');
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('alive');
  });
  test('GET /api/info exposes ConfigMap-driven settings', async () => {
    const r = await request(app).get('/api/info');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ app: 'car-marketplace', currency: 'CAD' });
    expect(r.body.inventoryCount).toBe(100);
  });
});

describe('inventory API', () => {
  test('GET /api/cars paginates and attaches an estimated payment', async () => {
    const r = await request(app).get('/api/cars?pageSize=6');
    expect(r.status).toBe(200);
    expect(r.body.items).toHaveLength(6);
    expect(r.body.totalItems).toBe(100);
    expect(r.body.items[0].estimatedPayment.amount).toBeGreaterThan(0);
    expect(r.body.items[0].dealer).toBeTruthy();
    expect(r.body.items[0].media.images.length).toBeGreaterThan(0);
  });
  test('filters narrow the result set', async () => {
    const r = await request(app).get('/api/cars?bodyType=SUV&maxPrice=45000');
    r.body.items.forEach((c) => { expect(c.bodyType).toBe('SUV'); expect(c.price).toBeLessThanOrEqual(45000); });
  });
  test('payment estimate follows the requested province', async () => {
    const ab = await request(app).get('/api/cars?pageSize=1&payProvince=AB');
    const on = await request(app).get('/api/cars?pageSize=1&payProvince=ON');
    expect(ab.body.items[0].estimatedPayment.amount).toBeLessThan(on.body.items[0].estimatedPayment.amount);
  });
  test('GET /api/cars/:id returns detail, similar vehicles and availability', async () => {
    const r = await request(app).get(`/api/cars/${cars[0].id}`);
    expect(r.status).toBe(200);
    expect(r.body.similar.length).toBeGreaterThan(0);
    expect(r.body.availability.status).toBe('available');
    expect(r.body.samplePayment.paymentAmount).toBeGreaterThan(0);
  });
  test('unknown vehicle is a 404', async () => {
    expect((await request(app).get('/api/cars/CM-9999')).status).toBe(404);
  });
  test('GET /api/cars/:id/image.svg renders SVG', async () => {
    // superagent only auto-decodes text/* and JSON, so image/svg+xml arrives as a Buffer
    const r = await request(app).get(`/api/cars/${cars[0].id}/image.svg`).buffer(true);
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toMatch(/svg/);
    const svg = Buffer.isBuffer(r.body) ? r.body.toString('utf8') : (r.text || '');
    expect(svg).toMatch(/^<svg/);
    expect(svg).toContain(cars[0].exteriorColour);
  });
  test('GET /api/facets returns counts', async () => {
    const r = await request(app).get('/api/facets');
    expect(r.body.total).toBe(100);
    expect(r.body.make.length).toBeGreaterThan(5);
  });
  test('GET /api/provinces returns all 13', async () => {
    expect((await request(app).get('/api/provinces')).body).toHaveLength(13);
  });
  test('GET /api/dealers includes inventory counts', async () => {
    const r = await request(app).get('/api/dealers');
    expect(r.body.length).toBeGreaterThan(0);
    expect(r.body.reduce((s, d) => s + d.inventoryCount, 0)).toBe(100);
  });
});

describe('finance API', () => {
  test('POST /api/finance/quote by carId', async () => {
    const r = await request(app).post('/api/finance/quote')
      .send({ carId: cars[0].id, provinceCode: 'ON', termMonths: 60, frequency: 'biweekly' });
    expect(r.status).toBe(200);
    expect(r.body.breakdown.salesTaxTotal).toBeGreaterThan(0);
    expect(r.body.financing.numberOfPayments).toBe(130);
  });
  test('POST /api/finance/quote rejects bad input with 400', async () => {
    const r = await request(app).post('/api/finance/quote').send({ price: -5, provinceCode: 'ON' });
    expect(r.status).toBe(400);
  });
  test('POST /api/finance/affordability returns a max price', async () => {
    const r = await request(app).post('/api/finance/affordability')
      .send({ targetPayment: 500, provinceCode: 'ON', termMonths: 60 });
    expect(r.body.maxPrice).toBeGreaterThan(0);
  });
  test('POST /api/finance/schedule returns amortization rows', async () => {
    const r = await request(app).post('/api/finance/schedule')
      .send({ principal: 25000, aprPercent: 7, termMonths: 60, frequency: 'monthly', limit: 6 });
    expect(r.body.rows).toHaveLength(6);
    expect(r.body.rows[0].balance).toBeLessThan(25000);
  });
  test('GET /api/finance/apr reflects the credit band', async () => {
    const good = await request(app).get('/api/finance/apr?band=excellent');
    const poor = await request(app).get('/api/finance/apr?band=poor');
    expect(poor.body.aprPercent).toBeGreaterThan(good.body.aprPercent);
  });
  test('POST /api/tradein/estimate', async () => {
    const r = await request(app).post('/api/tradein/estimate')
      .send({ estimatedNewPrice: 40000, year: 2019, odometerKm: 120000, condition: 'good' });
    expect(r.body.estimate).toBeGreaterThan(0);
  });
  test('POST /api/preapproval approves and declines appropriately', async () => {
    const ok = await request(app).post('/api/preapproval')
      .send({ annualIncomeCad: 95000, monthlyDebtPayments: 400, creditBand: 'good', provinceCode: 'ON' });
    expect(ok.status).toBe(200);
    expect(ok.body.approved).toBe(true);
    const bad = await request(app).post('/api/preapproval').send({ annualIncomeCad: 0 });
    expect(bad.status).toBe(400);
  });
});

describe('reservation and test drive API', () => {
  test('rejects an invalid customer with field-level errors', async () => {
    const r = await request(app).post('/api/reservations')
      .send({ carId: cars[5].id, firstName: 'J', email: 'nope', phone: '1', postalCode: 'x', province: 'XX' });
    expect(r.status).toBe(400);
    expect(r.body.fields.email).toEqual(expect.any(String));
    expect(r.body.fields.postalCode).toEqual(expect.any(String));
  });
  test('reserves, blocks a double booking, then confirms', async () => {
    const carId = cars[10].id;
    const first = await request(app).post('/api/reservations').send({ carId, ...customer });
    expect(first.status).toBe(201);
    expect(first.body.reference).toMatch(/^RES-/);

    const second = await request(app).post('/api/reservations').send({ carId, ...customer });
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('ALREADY_RESERVED');

    const confirmed = await request(app).post(`/api/reservations/${first.body.reference}/confirm`);
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.status).toBe('booked');

    const fetched = await request(app).get(`/api/reservations/${first.body.reference}`);
    expect(fetched.body.status).toBe('booked');
  });
  test('detail page reports the vehicle as unavailable once held', async () => {
    const carId = cars[11].id;
    await request(app).post('/api/reservations').send({ carId, ...customer });
    const r = await request(app).get(`/api/cars/${carId}`);
    expect(r.body.availability.status).toBe('reserved');
  });
  test('books a future test drive and rejects a past one', async () => {
    const carId = cars[12].id;
    const future = new Date(Date.now() + 3 * 86400000).toISOString();
    const ok = await request(app).post('/api/testdrives').send({ carId, scheduledFor: future, ...customer });
    expect(ok.status).toBe(201);
    expect(ok.body.dealer).toBeTruthy();

    const past = await request(app).post('/api/testdrives')
      .send({ carId, scheduledFor: '2020-01-01T10:00:00Z', ...customer });
    expect(past.status).toBe(400);
  });
});

describe('admin API', () => {
  test('summary aggregates inventory and activity', async () => {
    const r = await request(app).get('/api/admin/summary');
    expect(r.body.inventory.count).toBe(100);
    expect(r.body.inventory.new + r.body.inventory.cpo + r.body.inventory.used).toBe(100);
    expect(r.body.activity).toBeDefined();
  });
  test('lists reservations and test drives', async () => {
    expect(Array.isArray((await request(app).get('/api/admin/reservations')).body)).toBe(true);
    expect(Array.isArray((await request(app).get('/api/admin/testdrives')).body)).toBe(true);
  });
});

describe('SPA fallback', () => {
  test('unknown non-API path serves the app shell', async () => {
    const r = await request(app).get('/inventory');
    expect(r.status).toBe(200);
    expect(r.text).toMatch(/<title>Car Marketplace/);
  });
});
