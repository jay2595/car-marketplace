import { api } from '../api.js';
import { store } from '../store.js';
import { num, escapeHtml } from '../format.js';
import { carGrid } from '../components.js';

export async function dealers() {
  const list = await api.dealers();
  const byProvince = list.reduce((m, d) => { (m[d.province] = m[d.province] || []).push(d); return m; }, {});

  return `<div class="wrap section">
    <nav class="breadcrumb"><a href="#/">Home</a> › Dealers</nav>
    <h1>Our dealer network</h1>
    <p class="muted">${list.length} licensed dealers across ${Object.keys(byProvince).length} provinces. Every dealer is
    registered with its provincial regulator, which is your recourse if something goes wrong with a purchase.</p>

    ${Object.entries(byProvince).sort().map(([prov, ds]) => `
      <section class="section" style="padding-top:14px">
        <h2 style="font-size:1.1rem">${escapeHtml(prov)}</h2>
        <div class="grid grid-3">
          ${ds.map((d) => `
            <a class="card card-pad" href="#/dealer/${d.id}" style="text-decoration:none;color:inherit">
              <h3 style="margin-bottom:4px">${escapeHtml(d.name)}</h3>
              <p class="small muted" style="margin-bottom:8px">${escapeHtml(d.address)}<br>
                ${escapeHtml(d.city)}, ${escapeHtml(d.province)} ${escapeHtml(d.postal)}<br>${escapeHtml(d.phone)}</p>
              <div class="row small">
                <span class="chip">${d.inventoryCount} in stock</span>
                <span class="chip">★ ${d.rating}</span>
                <span class="chip">${escapeHtml(d.regulator)}</span>
              </div>
            </a>`).join('')}
        </div>
      </section>`).join('')}
  </div>`;
}

export async function dealerDetail(params) {
  const prefs = store.get();
  const d = await api.dealer(params.id);
  await Promise.all(d.inventory.map(async (c) => {
    try {
      const q = await api.quote({ carId: c.id, provinceCode: prefs.province, frequency: prefs.frequency, termMonths: prefs.termMonths, aprPercent: 7.99 });
      c.estimatedPayment = { amount: q.financing.paymentAmount, frequencyLabel: q.financing.frequencyLabel,
        termMonths: q.financing.termMonths, aprPercent: q.financing.aprPercent };
    } catch { /* ignore */ }
  }));

  return `<div class="wrap section">
    <nav class="breadcrumb"><a href="#/">Home</a> › <a href="#/dealers">Dealers</a> › ${escapeHtml(d.name)}</nav>
    <div class="card card-pad" style="margin-bottom:22px">
      <h1 style="margin-bottom:4px">${escapeHtml(d.name)}</h1>
      <p class="muted" style="margin-bottom:10px">${escapeHtml(d.address)}, ${escapeHtml(d.city)}, ${escapeHtml(d.province)} ${escapeHtml(d.postal)} · ${escapeHtml(d.phone)}</p>
      <div class="row">
        <span class="chip">★ ${d.rating} from ${num(d.reviews)} reviews</span>
        <span class="chip">${d.inventory.length} vehicles in stock</span>
        <span class="chip">Licensed by ${escapeHtml(d.regulator)}</span>
      </div>
    </div>
    <h2>Inventory</h2>
    ${carGrid(d.inventory)}
  </div>`;
}
