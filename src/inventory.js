'use strict';
/** Search, filter, sort, facet and paginate the vehicle inventory. Dependency free. */

const SORTS = {
  relevance:    null,
  price_asc:    (a, b) => a.price - b.price,
  price_desc:   (a, b) => b.price - a.price,
  km_asc:       (a, b) => a.odometerKm - b.odometerKm,
  km_desc:      (a, b) => b.odometerKm - a.odometerKm,
  year_desc:    (a, b) => b.year - a.year || a.price - b.price,
  year_asc:     (a, b) => a.year - b.year || a.price - b.price,
  newest:       (a, b) => a.daysOnLot - b.daysOnLot,
  make_asc:     (a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model)
};

const norm = (s) => String(s == null ? '' : s).toLowerCase().trim();
const asArray = (v) => (v == null || v === '' ? [] : Array.isArray(v) ? v : String(v).split(',')).map((x) => String(x).trim()).filter(Boolean);
const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));

/** Free-text search across the fields a shopper would actually type. */
function search(cars, q) {
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return cars.map((c) => ({ car: c, score: 0 }));
  return cars
    .map((c) => {
      const haystack = norm([
        c.make, c.model, c.trim, c.year, c.bodyType, c.fuelType, c.drivetrain,
        c.exteriorColour, c.city, c.province, c.condition, c.engine, c.stockNumber,
        (c.features || []).join(' '), (c.badges || []).join(' ')
      ].join(' '));
      let score = 0;
      for (const t of terms) {
        if (!haystack.includes(t)) return null;      // AND semantics
        if (norm(c.make) === t || norm(c.model) === t) score += 10;
        else if (norm(c.make).startsWith(t) || norm(c.model).startsWith(t)) score += 6;
        else if (String(c.year) === t) score += 5;
        else score += 1;
      }
      return { car: c, score };
    })
    .filter(Boolean);
}

/** Apply structured filters. Every key is optional. */
function applyFilters(cars, f = {}) {
  const makes = asArray(f.make).map(norm);
  const models = asArray(f.model).map(norm);
  const bodyTypes = asArray(f.bodyType).map(norm);
  const fuelTypes = asArray(f.fuelType).map(norm);
  const transmissions = asArray(f.transmission).map(norm);
  const drivetrains = asArray(f.drivetrain).map(norm);
  const conditions = asArray(f.condition).map(norm);
  const provinces = asArray(f.province).map(norm);
  const colours = asArray(f.colour).map(norm);
  const features = asArray(f.features).map(norm);
  const dealers = asArray(f.dealerId).map(norm);

  const minPrice = num(f.minPrice), maxPrice = num(f.maxPrice);
  const minYear = num(f.minYear), maxYear = num(f.maxYear);
  const maxKm = num(f.maxKm), minKm = num(f.minKm);
  const minSeats = num(f.minSeats);

  return cars.filter((c) => {
    if (makes.length && !makes.includes(norm(c.make))) return false;
    if (models.length && !models.includes(norm(c.model))) return false;
    if (bodyTypes.length && !bodyTypes.includes(norm(c.bodyType))) return false;
    if (fuelTypes.length && !fuelTypes.includes(norm(c.fuelType))) return false;
    if (transmissions.length && !transmissions.includes(norm(c.transmission))) return false;
    if (drivetrains.length && !drivetrains.includes(norm(c.drivetrain))) return false;
    if (conditions.length && !conditions.includes(norm(c.condition))) return false;
    if (provinces.length && !provinces.includes(norm(c.province))) return false;
    if (colours.length && !colours.includes(norm(c.exteriorColour))) return false;
    if (dealers.length && !dealers.includes(norm(c.dealerId))) return false;

    if (minPrice !== null && c.price < minPrice) return false;
    if (maxPrice !== null && c.price > maxPrice) return false;
    if (minYear !== null && c.year < minYear) return false;
    if (maxYear !== null && c.year > maxYear) return false;
    if (maxKm !== null && c.odometerKm > maxKm) return false;
    if (minKm !== null && c.odometerKm < minKm) return false;
    if (minSeats !== null && c.seats < minSeats) return false;

    if (f.accidentFree === true || f.accidentFree === 'true') {
      if (!c.history || c.history.accidents !== 0) return false;
    }
    if (f.oneOwner === true || f.oneOwner === 'true') {
      if (!c.history || c.history.previousOwners > 1) return false;
    }
    if (f.electricOnly === true || f.electricOnly === 'true') {
      if (!['Electric', 'Plug-in Hybrid'].includes(c.fuelType)) return false;
    }
    if (features.length) {
      const owned = (c.features || []).map(norm);
      if (!features.every((want) => owned.some((o) => o.includes(want)))) return false;
    }
    return true;
  });
}

/** Counts per filter value, so the UI can show "Toyota (14)" and grey out empties. */
function buildFacets(cars) {
  const tally = (key, fn) => {
    const m = new Map();
    for (const c of cars) {
      const v = fn ? fn(c) : c[key];
      if (v == null || v === '') continue;
      m.set(v, (m.get(v) || 0) + 1);
    }
    return [...m.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value)));
  };

  const prices = cars.map((c) => c.price);
  const years = cars.map((c) => c.year);
  const kms = cars.map((c) => c.odometerKm);
  const modelsByMake = {};
  for (const c of cars) {
    (modelsByMake[c.make] = modelsByMake[c.make] || new Set()).add(c.model);
  }

  return {
    total: cars.length,
    make: tally('make'),
    model: tally('model'),
    modelsByMake: Object.fromEntries(Object.entries(modelsByMake).map(([k, v]) => [k, [...v].sort()])),
    bodyType: tally('bodyType'),
    fuelType: tally('fuelType'),
    transmission: tally('transmission'),
    drivetrain: tally('drivetrain'),
    condition: tally('condition'),
    province: tally('province'),
    colour: tally(null, (c) => c.exteriorColour),
    seats: tally('seats'),
    range: {
      price: { min: Math.min(...prices), max: Math.max(...prices) },
      year: { min: Math.min(...years), max: Math.max(...years) },
      odometerKm: { min: Math.min(...kms), max: Math.max(...kms) }
    }
  };
}

function sortCars(cars, sortKey = 'relevance', scores = null) {
  const list = [...cars];
  if (sortKey === 'relevance' && scores) {
    return list.sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0) || a.price - b.price);
  }
  const cmp = SORTS[sortKey];
  return cmp ? list.sort(cmp) : list.sort(SORTS.newest);
}

function paginate(items, page = 1, pageSize = 12) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const size = Math.min(60, Math.max(1, parseInt(pageSize, 10) || 12));
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(p, totalPages);
  return {
    items: items.slice((current - 1) * size, current * size),
    page: current, pageSize: size, totalItems: items.length, totalPages,
    hasPrev: current > 1, hasNext: current < totalPages
  };
}

/** One call the API can use: search + filter + sort + paginate + facets. */
function query(cars, params = {}) {
  const scored = search(cars, params.q);
  const scores = new Map(scored.map((s) => [s.car.id, s.score]));
  const matched = applyFilters(scored.map((s) => s.car), params);
  const sorted = sortCars(matched, params.sort || (params.q ? 'relevance' : 'newest'), scores);
  const paged = paginate(sorted, params.page, params.pageSize);
  return { ...paged, facets: buildFacets(matched), appliedSort: params.sort || (params.q ? 'relevance' : 'newest') };
}

/** Similar vehicles for the detail page: same body type, near price, not itself. */
function similarTo(cars, car, limit = 4) {
  return cars
    .filter((c) => c.id !== car.id && c.status === 'available')
    .map((c) => {
      let score = 0;
      if (c.bodyType === car.bodyType) score += 4;
      if (c.make === car.make) score += 3;
      if (c.fuelType === car.fuelType) score += 2;
      if (c.province === car.province) score += 1;
      score -= Math.abs(c.price - car.price) / 12000;
      return { c, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.c);
}

module.exports = { SORTS, search, applyFilters, buildFacets, sortCars, paginate, query, similarTo };
