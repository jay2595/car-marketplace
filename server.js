'use strict';
/**
 * Car Marketplace - Express JSON API + static front end.
 *
 * All business logic lives in dependency-free modules under src/, so it can be
 * unit tested without booting a server. This file is routing and I/O only.
 */
const express = require('express');
const path = require('path');

const cars = require('./data/cars.json');
const dealers = require('./data/dealers.json');

const inventory = require('./src/inventory');
const finance = require('./src/finance');
const validate = require('./src/validate');
const tradein = require('./src/tradein');
const preapproval = require('./src/preapproval');
const { carSvg, imagesFor } = require('./src/carimage');
const { ReservationStore } = require('./src/reservations');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const APP_ENV = process.env.APP_ENV || 'local';
const CURRENCY = process.env.CURRENCY || 'CAD';
const DEFAULT_PROVINCE = process.env.DEFAULT_PROVINCE || 'ON';
const DEFAULT_APR = parseFloat(process.env.DEFAULT_APR || '7.99');
const DEFAULT_TERM_MONTHS = parseInt(process.env.DEFAULT_TERM_MONTHS || '60', 10);
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const RELEASE = process.env.APP_VERSION || 'dev';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '128kb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

const store = new ReservationStore();
const byId = new Map(cars.map((c) => [c.id, c]));
const dealerById = new Map(dealers.map((d) => [d.id, d]));

const hydrate = (c) => ({ ...c, dealer: dealerById.get(c.dealerId) || null, media: imagesFor(c) });
const bad = (res, msg, extra) => res.status(400).json({ error: msg, ...extra });
const notFound = (res, what) => res.status(404).json({ error: `${what} not found` });

// ---------------------------------------------------------------- health ---
let ready = false;
// unref() so this timer never holds the process open - otherwise Jest reports
// "a worker process has failed to exit gracefully" after the API suite.
const readyTimer = setTimeout(() => { ready = true; }, 800);
readyTimer.unref();

app.get('/health/live', (_req, res) => res.json({ status: 'alive', release: RELEASE }));
app.get('/health/ready', (_req, res) =>
  ready && cars.length > 0
    ? res.json({ status: 'ready', inventory: cars.length })
    : res.status(503).json({ status: 'warming-up' })
);
app.get('/api/info', (_req, res) => res.json({
  app: 'car-marketplace', release: RELEASE, env: APP_ENV, currency: CURRENCY,
  defaultProvince: DEFAULT_PROVINCE, defaultApr: DEFAULT_APR,
  defaultTermMonths: DEFAULT_TERM_MONTHS, logLevel: LOG_LEVEL,
  inventoryCount: cars.length, dealerCount: dealers.length,
  pod: process.env.POD_NAME || null, node: process.env.NODE_NAME || null
}));

// ------------------------------------------------------------- inventory ---
app.get('/api/cars', (req, res) => {
  const result = inventory.query(cars, req.query);
  // Attach an estimated payment using the shopper's province / term / frequency so
  // the listing tiles and the detail page never disagree.
  const q = req.query;
  const withPayment = (c) => {
    const base = hydrate(c);
    try {
      const deal = finance.calculateDeal({
        price: c.price,
        provinceCode: q.payProvince || c.province,
        condition: c.condition,
        downPayment: Number(q.payDown) || 0,
        aprPercent: Number(q.payApr) || DEFAULT_APR,
        termMonths: Number(q.payTerm) || DEFAULT_TERM_MONTHS,
        frequency: q.payFrequency || 'biweekly'
      });
      base.estimatedPayment = {
        amount: deal.financing.paymentAmount,
        frequency: deal.financing.frequency,
        frequencyLabel: deal.financing.frequencyLabel,
        termMonths: deal.financing.termMonths,
        aprPercent: deal.financing.aprPercent
      };
    } catch { base.estimatedPayment = null; }
    return base;
  };
  res.json({ ...result, items: result.items.map(withPayment) });
});

app.get('/api/facets', (_req, res) => res.json(inventory.buildFacets(cars)));

app.get('/api/cars/:id', (req, res) => {
  const car = byId.get(req.params.id);
  if (!car) return notFound(res, 'Vehicle');
  const reservation = store.activeFor(car.id);
  res.json({
    ...hydrate(car),
    availability: reservation ? { status: reservation.status, reference: reservation.reference } : { status: 'available' },
    similar: inventory.similarTo(cars, car, 4).map(hydrate),
    samplePayment: finance.calculateDeal({
      price: car.price, provinceCode: car.province, condition: car.condition,
      aprPercent: DEFAULT_APR, termMonths: DEFAULT_TERM_MONTHS, frequency: 'biweekly'
    }).financing
  });
});

app.get('/api/cars/:id/image.svg', (req, res) => {
  const car = byId.get(req.params.id);
  if (!car) return notFound(res, 'Vehicle');
  res.type('image/svg+xml').set('Cache-Control', 'public, max-age=86400')
     .send(carSvg(car, { width: parseInt(req.query.w, 10) || 800 }));
});

app.get('/api/cars/:id/similar', (req, res) => {
  const car = byId.get(req.params.id);
  if (!car) return notFound(res, 'Vehicle');
  res.json(inventory.similarTo(cars, car, parseInt(req.query.limit, 10) || 4).map(hydrate));
});

app.get('/api/dealers', (_req, res) => res.json(dealers.map((d) => ({
  ...d, inventoryCount: cars.filter((c) => c.dealerId === d.id).length
}))));

app.get('/api/dealers/:id', (req, res) => {
  const d = dealerById.get(req.params.id);
  if (!d) return notFound(res, 'Dealer');
  res.json({ ...d, inventory: cars.filter((c) => c.dealerId === d.id).map(hydrate) });
});

app.get('/api/provinces', (_req, res) => res.json(finance.listProvinces()));

// ----------------------------------------------------------------- money ---
app.post('/api/finance/quote', (req, res) => {
  try {
    const body = req.body || {};
    let price = Number(body.price);
    let condition = body.condition;
    if (body.carId) {
      const car = byId.get(body.carId);
      if (!car) return notFound(res, 'Vehicle');
      price = car.price; condition = car.condition;
    }
    res.json(finance.calculateDeal({ ...body, price, condition }));
  } catch (err) { bad(res, err.message); }
});

app.post('/api/finance/affordability', (req, res) => {
  try { res.json(finance.maxAffordablePrice(req.body || {})); }
  catch (err) { bad(res, err.message); }
});

app.post('/api/finance/schedule', (req, res) => {
  try {
    const { principal, aprPercent = DEFAULT_APR, frequency = 'monthly', termMonths = DEFAULT_TERM_MONTHS, limit = 12 } = req.body || {};
    const freq = finance.FREQUENCIES[frequency];
    if (!freq) return bad(res, `Unknown frequency: ${frequency}`);
    if (!(principal > 0)) return bad(res, 'principal must be positive');
    const n = Math.round((termMonths / 12) * freq.periodsPerYear);
    res.json(finance.amortizationSchedule(principal, aprPercent, freq.periodsPerYear, n, limit));
  } catch (err) { bad(res, err.message); }
});

app.get('/api/finance/apr', (req, res) => {
  try {
    res.json({
      aprPercent: finance.estimateApr(req.query.band || 'good',
        parseInt(req.query.term, 10) || DEFAULT_TERM_MONTHS, req.query.condition || 'Used'),
      bands: finance.CREDIT_BANDS
    });
  } catch (err) { bad(res, err.message); }
});

app.post('/api/tradein/estimate', (req, res) => {
  try { res.json(tradein.estimateTradeIn(req.body || {})); }
  catch (err) { bad(res, err.message); }
});

app.post('/api/preapproval', (req, res) => {
  const result = preapproval.preApprove(req.body || {});
  res.status(result.errors ? 400 : 200).json(result);
});

// --------------------------------------------------- reserve / test drive ---
app.post('/api/reservations', (req, res) => {
  const { carId, notes } = req.body || {};
  const car = byId.get(carId);
  if (!car) return notFound(res, 'Vehicle');
  const check = validate.validateCustomer(req.body || {});
  if (!check.valid) return bad(res, 'Please correct the highlighted fields', { fields: check.errors });
  try {
    res.status(201).json(store.reserve(car, check.value, notes));
  } catch (err) {
    res.status(err.code === 'ALREADY_RESERVED' ? 409 : 400)
       .json({ error: err.message, code: err.code, reference: err.reference });
  }
});

app.get('/api/reservations/:ref', (req, res) => {
  const r = store.get(req.params.ref);
  return r ? res.json(r) : notFound(res, 'Reservation');
});

app.post('/api/reservations/:ref/confirm', (req, res) => {
  try { res.json(store.confirm(req.params.ref)); }
  catch (err) { res.status(err.code ? 409 : 404).json({ error: err.message, code: err.code }); }
});

app.post('/api/reservations/:ref/cancel', (req, res) => {
  try { res.json(store.cancel(req.params.ref)); }
  catch (err) { notFound(res, 'Reservation'); }
});

app.post('/api/testdrives', (req, res) => {
  const { carId, scheduledFor } = req.body || {};
  const car = byId.get(carId);
  if (!car) return notFound(res, 'Vehicle');
  const check = validate.validateCustomer(req.body || {});
  if (!check.valid) return bad(res, 'Please correct the highlighted fields', { fields: check.errors });
  try {
    res.status(201).json(store.bookTestDrive(car, check.value, scheduledFor, dealerById.get(car.dealerId)));
  } catch (err) { bad(res, err.message, { code: err.code }); }
});

app.get('/api/testdrives/:ref', (req, res) => {
  const t = store.getTestDrive(req.params.ref);
  return t ? res.json(t) : notFound(res, 'Test drive booking');
});

// ----------------------------------------------------------------- admin ---
app.get('/api/admin/summary', (_req, res) => {
  const total = cars.reduce((s, c) => s + c.price, 0);
  const byProvince = {};
  const byBody = {};
  for (const c of cars) {
    byProvince[c.province] = (byProvince[c.province] || 0) + 1;
    byBody[c.bodyType] = (byBody[c.bodyType] || 0) + 1;
  }
  res.json({
    inventory: {
      count: cars.length,
      totalValueCad: total,
      averagePriceCad: Math.round(total / cars.length),
      averageDaysOnLot: Math.round(cars.reduce((s, c) => s + c.daysOnLot, 0) / cars.length),
      byProvince, byBodyType: byBody,
      new: cars.filter((c) => c.condition === 'New').length,
      cpo: cars.filter((c) => c.condition === 'Certified Pre-Owned').length,
      used: cars.filter((c) => c.condition === 'Used').length
    },
    activity: store.stats(),
    dealers: dealers.length,
    release: RELEASE, env: APP_ENV
  });
});
app.get('/api/admin/reservations', (_req, res) => res.json(store.list()));
app.get('/api/admin/testdrives', (_req, res) => res.json(store.listTestDrives()));

// SPA fallback for hash-free deep links
app.get(/^\/(?!api\/|health\/|images\/|css\/|js\/).*/, (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use((err, _req, res, _next) => {
  if (LOG_LEVEL !== 'silent') console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  const server = app.listen(PORT, () =>
    console.log(`car-marketplace listening on :${PORT} (env=${APP_ENV}, release=${RELEASE}, inventory=${cars.length})`));
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

module.exports = app;
