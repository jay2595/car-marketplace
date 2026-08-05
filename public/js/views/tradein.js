import { api } from '../api.js';
import { store } from '../store.js';
import { money, escapeHtml } from '../format.js';
import { provinceOptions } from '../components.js';

export async function tradein() {
  const provinces = await api.provinces();
  const prefs = store.get();
  const years = Array.from({ length: 22 }, (_, i) => 2026 - i);

  return `<div class="wrap section">
    <nav class="breadcrumb"><a href="#/">Home</a> › Trade-in estimate</nav>
    <h1>What's my trade worth?</h1>
    <p class="muted" style="max-width:70ch">An indicative wholesale range based on age, kilometres, condition and accident
    history. On a dealer trade-in your sales tax is calculated on the price <em>after</em> the trade-in allowance — so
    trading in is usually worth more than selling privately for the same number.</p>

    <div class="detail-split">
      <div class="card card-pad">
        <form id="ti-form">
          <div class="field-row">
            <div class="field"><label for="ti-year">Model year</label>
              <select id="ti-year">${years.map((y) => `<option ${y === 2019 ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
            <div class="field"><label for="ti-msrp">Approximate price when new (CAD)</label>
              <input type="number" id="ti-msrp" value="38000" min="1000" step="500"></div>
          </div>
          <div class="field"><label for="ti-km">Current odometer (km)</label>
            <input type="number" id="ti-km" value="118000" min="0" step="1000"></div>
          <div class="field"><label for="ti-cond">Condition</label>
            <select id="ti-cond">
              <option value="excellent">Excellent — no marks, full service history</option>
              <option value="good" selected>Good — minor wear, well maintained</option>
              <option value="fair">Fair — visible wear, some work needed</option>
              <option value="poor">Poor — mechanical or body issues</option>
            </select></div>
          <div class="field-row">
            <div class="field"><label for="ti-acc">Reported accidents</label>
              <select id="ti-acc">${[0, 1, 2, 3].map((n) => `<option value="${n}">${n === 0 ? 'None' : n}</option>`).join('')}</select></div>
            <div class="field"><label for="ti-prov">Province</label>
              <select id="ti-prov">${provinceOptions(provinces, prefs.province)}</select></div>
          </div>
          <button class="btn btn-primary btn-block" type="submit">Estimate my trade-in</button>
        </form>
      </div>
      <div id="ti-result" class="stack">
        <div class="card card-pad"><h3>Your estimate appears here</h3>
        <p class="small muted" style="margin:0">Final value is confirmed by physical appraisal and a lien search. If money
        is still owing on the vehicle, that balance can be rolled into your new financing.</p></div>
      </div>
    </div>
  </div>`;
}

tradein.mount = () => {
  const form = document.getElementById('ti-form');
  const out = document.getElementById('ti-result');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = (id) => document.getElementById(id).value;
    try {
      const r = await api.tradeIn({
        estimatedNewPrice: Number(v('ti-msrp')), year: Number(v('ti-year')),
        odometerKm: Number(v('ti-km')), condition: v('ti-cond'),
        accidents: Number(v('ti-acc')), provinceCode: v('ti-prov')
      });
      out.innerHTML = `<div class="card card-pad">
        <div class="payment-hero"><div class="amt money">${money(r.estimate)}</div>
          <div class="sub">Estimated trade-in value · range ${money(r.low)} – ${money(r.high)} CAD</div></div>
        <div class="notice" style="margin-top:14px">${escapeHtml(r.taxAdvantageNote)}</div>
        <div class="btn-row" style="margin-top:14px">
          <a class="btn btn-primary" href="#/calculator">Apply this to a payment calculation</a>
          <a class="btn" href="#/inventory">Browse inventory</a>
        </div>
        <p class="small muted" style="margin-top:12px">${escapeHtml(r.disclaimer)}</p>
      </div>`;
    } catch (err) {
      out.innerHTML = `<div class="card card-pad"><div class="notice notice-err">${escapeHtml(err.message)}</div></div>`;
    }
  });
};
