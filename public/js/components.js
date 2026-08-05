import { html, raw, money, money2, km, carFullName, economy, escapeHtml } from './format.js';
import { store } from './store.js';

const BADGE_CLASS = {
  'No Accidents': 'badge-green', 'Certified Pre-Owned': 'badge-green', 'Zero Emission': 'badge-green',
  'Low Kilometres': '', 'One Owner': '', 'Fuel Efficient': '',
  'Luxury Tax Applies': 'badge-amber'
};

export function carBadges(car, limit = 3) {
  const list = car.condition === 'New' ? ['New', ...(car.badges || [])] : (car.badges || []);
  return list.slice(0, limit)
    .map((b) => `<span class="badge ${b === 'New' ? 'badge-red' : (BADGE_CLASS[b] || '')}">${escapeHtml(b)}</span>`)
    .join('');
}

export function carImage(car, w = 560) {
  const src = car.media && car.media.images && car.media.images[0]
    ? car.media.images[0] : `/api/cars/${car.id}/image.svg`;
  const sep = src.includes('?') ? '&' : '?';
  return `${src}${src.endsWith('.svg') ? `${sep}w=${w}` : ''}`;
}

export function carCard(car) {
  const saved = store.isSaved(car.id);
  const comparing = store.inCompare(car.id);
  const pay = car.estimatedPayment;
  return `
  <article class="car-card" data-car="${car.id}">
    <div class="car-media">
      <a href="#/vehicle/${car.id}" aria-label="${escapeHtml(carFullName(car))}">
        <img src="${carImage(car)}" alt="${escapeHtml(carFullName(car))} in ${escapeHtml(car.exteriorColour)}" loading="lazy" width="560" height="280">
      </a>
      <div class="car-badges">${carBadges(car)}</div>
      <button class="car-fav${saved ? ' on' : ''}" data-fav="${car.id}"
        aria-pressed="${saved}" aria-label="${saved ? 'Remove from' : 'Add to'} saved vehicles" title="Save">♥</button>
    </div>
    <div class="car-body">
      <h3 class="car-title"><a href="#/vehicle/${car.id}">${escapeHtml(car.year + ' ' + car.make + ' ' + car.model)}</a></h3>
      <p class="car-trim">${escapeHtml(car.trim)} · ${escapeHtml(car.drivetrain)} · ${escapeHtml(car.fuelType)}</p>
      <div class="spread">
        <span class="car-price money">${money(car.price)}</span>
        <span class="small muted">${escapeHtml(car.condition)}</span>
      </div>
      ${pay ? `<span class="car-payment money">${money2(pay.amount)} ${escapeHtml(pay.frequencyLabel.toLowerCase())} · ${pay.termMonths} mo @ ${pay.aprPercent}%</span>` : ''}
      <div class="car-specs">
        <span>${km(car.odometerKm)}</span>
        <span>${escapeHtml(car.bodyType)}</span>
        <span>${escapeHtml(car.transmission)}</span>
        <span>${escapeHtml(car.city)}, ${escapeHtml(car.province)}</span>
      </div>
      <div class="car-foot">
        <a class="btn btn-sm btn-primary" href="#/vehicle/${car.id}">View details</a>
        <button class="btn btn-sm${comparing ? ' btn-dark' : ''}" data-compare="${car.id}">
          ${comparing ? 'In compare' : 'Compare'}
        </button>
      </div>
    </div>
  </article>`;
}

export function carGrid(cars) {
  if (!cars.length) return `<div class="empty"><h3>No vehicles match those filters</h3><p>Try widening your price range or clearing a filter.</p></div>`;
  return `<div class="grid grid-cars">${cars.map(carCard).join('')}</div>`;
}

export function pager(page, totalPages, onPageAttr = 'data-page') {
  if (totalPages <= 1) return '';
  const nums = [];
  const push = (n) => nums.push(`<button class="btn btn-sm${n === page ? ' on' : ''}" ${onPageAttr}="${n}">${n}</button>`);
  const window_ = 2;
  push(1);
  if (page - window_ > 2) nums.push('<span class="muted">…</span>');
  for (let n = Math.max(2, page - window_); n <= Math.min(totalPages - 1, page + window_); n++) push(n);
  if (page + window_ < totalPages - 1) nums.push('<span class="muted">…</span>');
  if (totalPages > 1) push(totalPages);
  return `<nav class="pager" aria-label="Pagination">
    <button class="btn btn-sm" ${onPageAttr}="${page - 1}" ${page === 1 ? 'disabled' : ''}>← Prev</button>
    ${nums.join('')}
    <button class="btn btn-sm" ${onPageAttr}="${page + 1}" ${page === totalPages ? 'disabled' : ''}>Next →</button>
  </nav>`;
}

export function provinceOptions(provinces, selected) {
  return provinces.map((p) =>
    `<option value="${p.code}" ${p.code === selected ? 'selected' : ''}>${escapeHtml(p.name)} (${p.totalRate}%)</option>`
  ).join('');
}

export const FREQUENCIES = [
  ['monthly', 'Monthly'], ['semimonthly', 'Semi-monthly'], ['biweekly', 'Bi-weekly'], ['weekly', 'Weekly']
];
export const TERMS = [24, 36, 48, 60, 72, 84, 96];

/** Shared money breakdown block used by the calculator, detail page and reserve flow. */
export function dealBreakdown(deal) {
  const b = deal.breakdown;
  const row = (k, v, cls = '') => `<div class="money-row ${cls}"><span class="k">${k}</span><span class="money">${v}</span></div>`;
  return `
    ${row('Vehicle price', money2(b.vehiclePrice))}
    ${b.dealerFees ? row('Dealer administration fee', money2(b.dealerFees)) : ''}
    ${b.acExciseTax ? row('Federal air conditioning excise tax', money2(b.acExciseTax)) : ''}
    ${b.tradeInCredit ? row('Less trade-in allowance', '− ' + money2(b.tradeInCredit)) : ''}
    ${row('Taxable amount', money2(b.taxableAmount), 'sub')}
    ${b.luxuryTax ? row('Federal luxury tax', money2(b.luxuryTax)) : ''}
    ${row(`GST (5%)`, money2(b.gst))}
    ${b.pst ? row(`${b.pstName} (${(b.taxRate - 5).toFixed(b.taxRate % 1 ? 3 : 0)}%)`, money2(b.pst)) : ''}
    ${b.licensingFee ? row('Licensing &amp; registration', money2(b.licensingFee)) : ''}
    ${row('Total due', money2(b.totalDue), 'total')}
    ${b.downPayment ? row('Less down payment', '− ' + money2(b.downPayment)) : ''}
    ${b.tradeInOwing ? row('Plus balance owing on trade', '+ ' + money2(b.tradeInOwing)) : ''}
    ${row('Amount financed', money2(b.amountFinanced), 'sub')}`;
}

export function paymentHero(deal) {
  const f = deal.financing;
  return `<div class="payment-hero">
    <div class="amt money">${money2(f.paymentAmount)}</div>
    <div class="sub">${escapeHtml(f.frequencyLabel)} · ${f.numberOfPayments} payments · ${f.aprPercent}% APR · ${f.termMonths} months</div>
    <div class="sub" style="margin-top:8px">Cost of borrowing ${money2(f.costOfBorrowing)} · Total ${money2(f.totalOfPayments)}</div>
  </div>`;
}

export function fieldError(errors, name) {
  return errors && errors[name] ? `<span class="err">${escapeHtml(errors[name])}</span>` : '';
}
export const errClass = (errors, name) => (errors && errors[name] ? ' error' : '');

export function specList(pairs) {
  return `<div class="spec-list">${pairs
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `<div><span class="k">${k}</span><span class="v">${v}</span></div>`).join('')}</div>`;
}
