// Canadian formatting helpers.
const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
const CAD2 = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NUM = new Intl.NumberFormat('en-CA');
const DATE = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
const DATETIME = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' });

export const money = (n) => CAD.format(Number(n) || 0);
export const money2 = (n) => CAD2.format(Number(n) || 0);
export const num = (n) => NUM.format(Number(n) || 0);
export const km = (n) => `${NUM.format(Math.round(Number(n) || 0))} km`;
export const date = (d) => (d ? DATE.format(new Date(d)) : '—');
export const dateTime = (d) => (d ? DATETIME.format(new Date(d)) : '—');
export const pct = (n) => `${Number(n).toFixed(2)}%`;

/** Canadians quote fuel economy as litres per 100 km, and EVs in range. */
export function economy(car) {
  if (car.fuelType === 'Electric') return car.electricRangeKm ? `${num(car.electricRangeKm)} km range` : 'Electric';
  if (!car.fuelEconomy) return '—';
  const { cityL100, highwayL100 } = car.fuelEconomy;
  return `${cityL100} city / ${highwayL100} hwy L/100 km`;
}

export const carName = (c) => `${c.year} ${c.make} ${c.model}`;
export const carFullName = (c) => `${c.year} ${c.make} ${c.model} ${c.trim}`;

export function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (m) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

/** Tiny tagged template that escapes interpolations by default. */
export function html(strings, ...values) {
  return strings.reduce((out, s, i) => {
    const v = values[i - 1];
    const safe = Array.isArray(v) ? v.join('') : (v && v.__raw ? v.value : escapeHtml(v));
    return out + (i ? safe : '') + s;
  });
}
export const raw = (value) => ({ __raw: true, value });
