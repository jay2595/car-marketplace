'use strict';
const inv = require('../src/inventory');
const cars = require('../data/cars.json');

describe('dataset integrity', () => {
  test('exactly 100 vehicles with unique ids, stock numbers and VINs', () => {
    expect(cars).toHaveLength(100);
    expect(new Set(cars.map((c) => c.id)).size).toBe(100);
    expect(new Set(cars.map((c) => c.stockNumber)).size).toBe(100);
    expect(new Set(cars.map((c) => c.vin)).size).toBe(100);
  });
  test('every vehicle has the fields the UI depends on', () => {
    for (const c of cars) {
      expect(typeof c.make).toBe('string');
      expect(c.price).toBeGreaterThan(0);
      expect(c.year).toBeGreaterThanOrEqual(2015);
      expect(c.odometerKm).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(c.features)).toBe(true);
      expect(c.history).toBeDefined();
      expect(c.exteriorColourHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
  test('new vehicles have no previous owners and no accidents', () => {
    cars.filter((c) => c.condition === 'New').forEach((c) => {
      expect(c.history.previousOwners).toBe(0);
      expect(c.history.accidents).toBe(0);
    });
  });
});

describe('search', () => {
  test('empty query returns everything', () => {
    expect(inv.search(cars, '').length).toBe(cars.length);
    expect(inv.search(cars, null).length).toBe(cars.length);
  });
  test('matches on make and is case insensitive', () => {
    const r = inv.search(cars, 'TOYOTA');
    expect(r.length).toBeGreaterThan(0);
    r.forEach((x) => expect(x.car.make).toBe('Toyota'));
  });
  test('multiple terms are ANDed', () => {
    const both = inv.search(cars, 'toyota suv');
    both.forEach((x) => { expect(x.car.make).toBe('Toyota'); expect(x.car.bodyType).toBe('SUV'); });
  });
  test('an exact make match scores above an incidental one', () => {
    const r = inv.search(cars, 'honda').sort((a, b) => b.score - a.score);
    expect(r[0].score).toBeGreaterThanOrEqual(10);
  });
  test('nonsense returns nothing', () => {
    expect(inv.search(cars, 'zzzzqqq')).toHaveLength(0);
  });
});

describe('filters', () => {
  test('price range is inclusive at both ends', () => {
    const r = inv.applyFilters(cars, { minPrice: 20000, maxPrice: 30000 });
    r.forEach((c) => { expect(c.price).toBeGreaterThanOrEqual(20000); expect(c.price).toBeLessThanOrEqual(30000); });
  });
  test('comma-separated multi-select works', () => {
    const r = inv.applyFilters(cars, { bodyType: 'SUV,Pickup' });
    r.forEach((c) => expect(['SUV', 'Pickup']).toContain(c.bodyType));
  });
  test('accidentFree excludes anything with a reported accident', () => {
    inv.applyFilters(cars, { accidentFree: 'true' }).forEach((c) => expect(c.history.accidents).toBe(0));
  });
  test('electricOnly keeps electric and plug-in hybrid', () => {
    inv.applyFilters(cars, { electricOnly: true })
      .forEach((c) => expect(['Electric', 'Plug-in Hybrid']).toContain(c.fuelType));
  });
  test('feature filter matches partial names', () => {
    const r = inv.applyFilters(cars, { features: 'heated' });
    r.forEach((c) => expect(c.features.some((f) => f.toLowerCase().includes('heated'))).toBe(true));
  });
  test('no filters returns everything', () => {
    expect(inv.applyFilters(cars, {})).toHaveLength(100);
  });
  test('impossible combination returns empty rather than throwing', () => {
    expect(inv.applyFilters(cars, { minPrice: 900000 })).toHaveLength(0);
  });
});

describe('sorting', () => {
  test('price ascending', () => {
    const r = inv.sortCars(cars, 'price_asc');
    for (let i = 1; i < r.length; i++) expect(r[i].price).toBeGreaterThanOrEqual(r[i - 1].price);
  });
  test('year descending', () => {
    const r = inv.sortCars(cars, 'year_desc');
    for (let i = 1; i < r.length; i++) expect(r[i].year).toBeLessThanOrEqual(r[i - 1].year);
  });
  test('unknown sort falls back without throwing', () => {
    expect(inv.sortCars(cars, 'nonsense')).toHaveLength(100);
  });
  test('sorting does not mutate the source array', () => {
    const first = cars[0].id;
    inv.sortCars(cars, 'price_desc');
    expect(cars[0].id).toBe(first);
  });
});

describe('facets', () => {
  const f = inv.buildFacets(cars);
  test('counts add up to the total', () => {
    expect(f.make.reduce((s, m) => s + m.count, 0)).toBe(100);
    expect(f.bodyType.reduce((s, b) => s + b.count, 0)).toBe(100);
  });
  test('sorted by count descending', () => {
    for (let i = 1; i < f.make.length; i++) expect(f.make[i].count).toBeLessThanOrEqual(f.make[i - 1].count);
  });
  test('exposes usable ranges', () => {
    expect(f.range.price.min).toBeLessThan(f.range.price.max);
    expect(f.range.year.min).toBeLessThanOrEqual(f.range.year.max);
  });
  test('models are grouped under their make', () => {
    expect(Object.keys(f.modelsByMake).length).toBe(f.make.length);
  });
});

describe('pagination', () => {
  test('splits into pages of the requested size', () => {
    const p = inv.paginate(cars, 1, 12);
    expect(p.items).toHaveLength(12);
    expect(p.totalPages).toBe(9);
    expect(p.hasPrev).toBe(false);
    expect(p.hasNext).toBe(true);
  });
  test('clamps a page beyond the end', () => {
    expect(inv.paginate(cars, 999, 12).page).toBe(9);
  });
  test('handles an empty result set', () => {
    const p = inv.paginate([], 1, 12);
    expect(p.items).toHaveLength(0);
    expect(p.totalPages).toBe(1);
  });
  test('caps page size to protect the API', () => {
    expect(inv.paginate(cars, 1, 5000).pageSize).toBe(60);
  });
});

describe('query', () => {
  test('combines search, filter, sort and pagination', () => {
    const r = inv.query(cars, { bodyType: 'SUV', sort: 'price_asc', pageSize: 5 });
    expect(r.items.length).toBeLessThanOrEqual(5);
    r.items.forEach((c) => expect(c.bodyType).toBe('SUV'));
    expect(r.facets.total).toBe(r.totalItems);
  });
  test('defaults to relevance when a query is supplied', () => {
    expect(inv.query(cars, { q: 'honda' }).appliedSort).toBe('relevance');
  });
  test('facets reflect the filtered set, not the whole catalogue', () => {
    const r = inv.query(cars, { make: 'Toyota' });
    expect(r.facets.make).toHaveLength(1);
  });
});

describe('similarTo', () => {
  test('never returns the vehicle itself and respects the limit', () => {
    const target = cars[0];
    const s = inv.similarTo(cars, target, 4);
    expect(s).toHaveLength(4);
    s.forEach((c) => expect(c.id).not.toBe(target.id));
  });
  test('prefers the same body type', () => {
    const target = cars.find((c) => c.bodyType === 'SUV');
    expect(inv.similarTo(cars, target, 4).filter((c) => c.bodyType === 'SUV').length).toBeGreaterThan(0);
  });
});
