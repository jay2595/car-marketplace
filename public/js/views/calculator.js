import { api } from '../api.js';
import { store } from '../store.js';
import { money, money2, num, carFullName, escapeHtml } from '../format.js';
import { dealBreakdown, paymentHero, provinceOptions, FREQUENCIES, TERMS } from '../components.js';

let provinces = [];
let bands = {};

export async function calculator(params) {
  const prefs = store.get();
  let car = null;
  if (params.carId) car = await api.car(params.carId).catch(() => null);
  provinces = await api.provinces();
  const aprInfo = await api.apr({ band: 'good', term: prefs.termMonths, condition: car ? car.condition : 'Used' });
  bands = aprInfo.bands;

  const price = car ? car.price : 35000;

  return `<div class="wrap section">
    <nav class="breadcrumb"><a href="#/">Home</a> › Payment calculator</nav>
    <h1>Canadian vehicle payment calculator</h1>
    <p class="muted" style="max-width:70ch">Applies the correct GST, HST, PST or QST for your province. A trade-in
    reduces the amount you pay tax on, and the federal luxury tax applies to new vehicles priced over $100,000.</p>

    ${car ? `<div class="notice" style="margin-bottom:18px">Calculating for
      <strong><a href="#/vehicle/${car.id}">${escapeHtml(carFullName(car))}</a></strong> — ${money(car.price)} · ${escapeHtml(car.condition)}</div>` : ''}

    <div class="detail-split">
      <div class="card card-pad">
        <h3>Your numbers</h3>
        <form id="calc-form">
          <div class="field-row">
            <div class="field"><label for="c-price">Vehicle price (CAD)</label>
              <input type="number" id="c-price" value="${price}" min="1000" step="500" ${car ? 'readonly' : ''}></div>
            <div class="field"><label for="c-condition">Condition</label>
              <select id="c-condition" ${car ? 'disabled' : ''}>
                ${['Used', 'Certified Pre-Owned', 'New'].map((x) => `<option ${car && car.condition === x ? 'selected' : ''}>${x}</option>`).join('')}
              </select>
              <span class="hint">Luxury tax applies to new vehicles only</span></div>
          </div>

          <div class="field"><label for="c-prov">Province or territory</label>
            <select id="c-prov">${provinceOptions(provinces, prefs.province)}</select></div>

          <div class="field-row">
            <div class="field"><label for="c-down">Down payment</label>
              <input type="number" id="c-down" value="${Math.round(price * 0.1 / 500) * 500}" min="0" step="250"></div>
            <div class="field"><label for="c-trade">Trade-in value</label>
              <input type="number" id="c-trade" value="0" min="0" step="250">
              <span class="hint">Reduces your taxable amount</span></div>
          </div>

          <div class="field"><label for="c-owing">Balance still owing on your trade-in</label>
            <input type="number" id="c-owing" value="0" min="0" step="250">
            <span class="hint">Negative equity gets added to the amount you finance</span></div>

          <fieldset>
            <label class="small" style="font-weight:600;color:var(--ink-2)">Payment frequency</label>
            <div class="seg" id="c-freq" style="margin:6px 0 14px">
              ${FREQUENCIES.map(([v, l]) => `<button type="button" data-freq="${v}" class="${prefs.frequency === v ? 'on' : ''}">${l}</button>`).join('')}
            </div>
          </fieldset>

          <div class="field-row">
            <div class="field"><label for="c-term">Term</label>
              <select id="c-term">${TERMS.map((t) => `<option value="${t}" ${+prefs.termMonths === t ? 'selected' : ''}>${t} months</option>`).join('')}</select></div>
            <div class="field"><label for="c-band">Credit range</label>
              <select id="c-band">${Object.entries(bands).map(([k, b]) => `<option value="${k}" ${k === 'good' ? 'selected' : ''}>${escapeHtml(b.label)}</option>`).join('')}</select></div>
          </div>

          <div class="field"><label for="c-apr">Interest rate (APR %)</label>
            <input type="number" id="c-apr" value="${aprInfo.aprPercent}" min="0" max="35" step="0.01">
            <span class="hint">Pre-filled from your credit range and term — override with a real quote if you have one</span></div>

          <div class="field-row">
            <div class="field"><label for="c-fees">Dealer administration fee</label>
              <input type="number" id="c-fees" value="599" min="0" step="25"></div>
            <div class="field"><label for="c-lic">Licensing &amp; registration</label>
              <input type="number" id="c-lic" value="120" min="0" step="10">
              <span class="hint">Not taxable</span></div>
          </div>
        </form>
      </div>

      <div class="stack">
        <div id="calc-hero"></div>
        <div class="card card-pad">
          <h3>Cost breakdown</h3>
          <div id="calc-breakdown"></div>
        </div>
        <div class="card card-pad">
          <h3>First 12 payments</h3>
          <div style="overflow-x:auto"><table id="calc-schedule"></table></div>
        </div>
        <div class="card card-pad">
          <h3>Affordability check</h3>
          <div class="field"><label for="c-target">If I can afford this much per payment…</label>
            <input type="number" id="c-target" value="450" min="50" step="25"></div>
          <div id="calc-afford" class="notice"></div>
        </div>
        <p class="small muted">Estimates only. Actual rates, fees and taxes are confirmed by the selling dealer and your
        lender. Rates shown are indicative and not an offer of credit.</p>
      </div>
    </div>
  </div>`;
}

function readForm() {
  const val = (id) => Number(document.getElementById(id).value) || 0;
  return {
    price: val('c-price'),
    condition: document.getElementById('c-condition').value,
    provinceCode: document.getElementById('c-prov').value,
    downPayment: val('c-down'),
    tradeInValue: val('c-trade'),
    tradeInOwing: val('c-owing'),
    frequency: document.querySelector('#c-freq .on')?.dataset.freq || 'biweekly',
    termMonths: val('c-term'),
    aprPercent: val('c-apr'),
    dealerFees: val('c-fees'),
    licensingFee: val('c-lic')
  };
}

async function recalc() {
  const input = readForm();
  store.setPrefs({ province: input.provinceCode, frequency: input.frequency, termMonths: input.termMonths });
  const deal = await api.quote(input);
  document.getElementById('calc-hero').innerHTML = paymentHero(deal);
  document.getElementById('calc-breakdown').innerHTML = dealBreakdown(deal);

  const sched = await api.schedule({
    principal: deal.breakdown.amountFinanced, aprPercent: input.aprPercent,
    frequency: input.frequency, termMonths: input.termMonths, limit: 12
  });
  document.getElementById('calc-schedule').innerHTML = `
    <thead><tr><th>#</th><th class="num">Payment</th><th class="num">Interest</th><th class="num">Principal</th><th class="num">Balance</th></tr></thead>
    <tbody>${sched.rows.map((r) => `<tr><td>${r.period}</td><td class="num money">${money2(r.payment)}</td>
      <td class="num money">${money2(r.interest)}</td><td class="num money">${money2(r.principal)}</td>
      <td class="num money">${money2(r.balance)}</td></tr>`).join('')}</tbody>
    <tfoot><tr><th colspan="2">Total interest over full term</th><th class="num money" colspan="3">${money2(sched.totalInterest)}</th></tr></tfoot>`;

  const afford = await api.affordability({
    targetPayment: Number(document.getElementById('c-target').value) || 450,
    provinceCode: input.provinceCode, aprPercent: input.aprPercent,
    termMonths: input.termMonths, frequency: input.frequency,
    downPayment: input.downPayment, tradeInValue: input.tradeInValue
  });
  document.getElementById('calc-afford').innerHTML =
    `At ${money2(afford.assumptions.targetPayment)} ${input.frequency === 'monthly' ? 'per month' : `per ${input.frequency.replace('biweekly', 'two weeks').replace('semimonthly', 'half month')}`}
     you could finance up to <strong>${money(afford.maxAmountFinanced)}</strong>, which is roughly a
     <strong>${money(afford.maxPrice)}</strong> vehicle after tax in ${escapeHtml(input.provinceCode)}.
     <a href="#/inventory?maxPrice=${afford.maxPrice}">Show vehicles under ${money(afford.maxPrice)} →</a>`;
}

calculator.mount = () => {
  document.querySelectorAll('#c-freq button').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('#c-freq button').forEach((x) => x.classList.remove('on'));
    b.classList.add('on'); recalc();
  }));
  document.querySelectorAll('#calc-form input, #calc-form select').forEach((el) =>
    el.addEventListener('change', async () => {
      if (el.id === 'c-band' || el.id === 'c-term' || el.id === 'c-condition') {
        const r = await api.apr({ band: document.getElementById('c-band').value,
          term: document.getElementById('c-term').value, condition: document.getElementById('c-condition').value });
        document.getElementById('c-apr').value = r.aprPercent;
      }
      recalc();
    }));
  document.getElementById('c-target')?.addEventListener('change', recalc);
  recalc();
};
