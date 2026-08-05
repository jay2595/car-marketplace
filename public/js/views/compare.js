import { api } from '../api.js';
import { store } from '../store.js';
import { money, money2, km, num, economy, carFullName, escapeHtml } from '../format.js';
import { carImage } from '../components.js';

const ROWS = [
  ['Price',        (c) => `<strong class="money">${money(c.price)}</strong>`],
  ['Estimated payment', (c) => c.estimatedPayment ? `<span class="money" style="color:var(--green)">${money2(c.estimatedPayment.amount)} ${c.estimatedPayment.frequencyLabel.toLowerCase()}</span>` : '—'],
  ['Condition',    (c) => escapeHtml(c.condition)],
  ['Year',         (c) => c.year],
  ['Odometer',     (c) => km(c.odometerKm)],
  ['Body type',    (c) => escapeHtml(c.bodyType)],
  ['Engine',       (c) => escapeHtml(c.engine)],
  ['Horsepower',   (c) => `${c.horsepower} hp`],
  ['Drivetrain',   (c) => escapeHtml(c.drivetrain)],
  ['Transmission', (c) => escapeHtml(c.transmission)],
  ['Fuel type',    (c) => escapeHtml(c.fuelType)],
  ['Fuel economy', (c) => escapeHtml(economy(c))],
  ['Seats',        (c) => c.seats],
  ['Exterior',     (c) => escapeHtml(c.exteriorColour)],
  ['Accidents',    (c) => c.history.accidents === 0 ? '<span style="color:var(--green)">None</span>' : `<span style="color:var(--red)">${c.history.accidents}</span>`],
  ['Owners',       (c) => c.history.previousOwners || 'New'],
  ['Winter tires', (c) => c.history.winterTiresIncluded ? 'Included' : '—'],
  ['Location',     (c) => `${escapeHtml(c.city)}, ${escapeHtml(c.province)}`],
  ['Dealer',       (c) => escapeHtml(c.dealer.name)]
];

export async function compare() {
  const { compare: ids, province, frequency, termMonths } = store.get();
  if (!ids.length) {
    return `<div class="wrap section"><h1>Compare vehicles</h1>
      <div class="empty"><h3>Nothing to compare yet</h3>
      <p>Add up to four vehicles from any listing using the <strong>Compare</strong> button.</p>
      <a class="btn btn-primary" href="#/inventory">Browse inventory</a></div></div>`;
  }
  const cars = await Promise.all(ids.map((id) =>
    api.cars({ q: '', pageSize: 1 }).then(() => api.car(id)).catch(() => null)));
  const list = cars.filter(Boolean);

  // attach a payment for each using the shopper's preferences
  await Promise.all(list.map(async (c) => {
    try {
      const d = await api.quote({ carId: c.id, provinceCode: province, frequency, termMonths, aprPercent: 7.99 });
      c.estimatedPayment = { amount: d.financing.paymentAmount, frequencyLabel: d.financing.frequencyLabel };
    } catch { c.estimatedPayment = null; }
  }));

  const best = { price: Math.min(...list.map((c) => c.price)), km: Math.min(...list.map((c) => c.odometerKm)) };

  return `<div class="wrap section">
    <div class="spread" style="margin-bottom:16px">
      <div><h1 style="margin-bottom:2px">Compare ${list.length} vehicle${list.length > 1 ? 's' : ''}</h1>
      <p class="muted small" style="margin:0">Payments estimated for ${escapeHtml(province)} over ${termMonths} months.</p></div>
      <button class="btn btn-sm" data-clear-compare>Clear all</button>
    </div>
    <div class="card" style="overflow-x:auto">
      <table class="compare-table">
        <thead><tr><th style="min-width:150px">Vehicle</th>
          ${list.map((c) => `<th style="min-width:210px">
            <img src="${carImage(c, 320)}" alt="${escapeHtml(carFullName(c))}" width="150" height="75" style="border-radius:6px;margin-bottom:6px">
            <a href="#/vehicle/${c.id}">${escapeHtml(carFullName(c))}</a><br>
            <button class="btn btn-sm btn-ghost" data-remove="${c.id}">Remove</button>
          </th>`).join('')}</tr></thead>
        <tbody>
          ${ROWS.map(([label, fn]) => `<tr><td>${label}</td>${list.map((c) => {
            const isBest = (label === 'Price' && c.price === best.price) || (label === 'Odometer' && c.odometerKm === best.km);
            return `<td${isBest ? ' style="background:#EAF6F1"' : ''}>${fn(c)}</td>`;
          }).join('')}</tr>`).join('')}
          <tr><td>Actions</td>${list.map((c) => `<td>
            <a class="btn btn-sm btn-primary" href="#/reserve/${c.id}">Reserve</a>
            <a class="btn btn-sm" href="#/testdrive/${c.id}">Test drive</a></td>`).join('')}</tr>
        </tbody>
      </table>
    </div>
    <p class="small muted" style="margin-top:12px">Green cells mark the lowest price and lowest kilometres in this comparison.</p>
  </div>`;
}

compare.mount = () => {
  document.querySelector('[data-clear-compare]')?.addEventListener('click', () => {
    store.clearCompare(); location.reload();
  });
  document.querySelectorAll('[data-remove]').forEach((b) =>
    b.addEventListener('click', () => { store.toggleCompare(b.dataset.remove); location.reload(); }));
};
