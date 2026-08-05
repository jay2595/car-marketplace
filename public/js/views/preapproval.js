import { api, ApiError } from '../api.js';
import { store } from '../store.js';
import { money, money2, pct, escapeHtml } from '../format.js';
import { provinceOptions, TERMS } from '../components.js';

export async function preapproval() {
  const provinces = await api.provinces();
  const { bands } = await api.apr({});
  const prefs = store.get();

  return `<div class="wrap section">
    <nav class="breadcrumb"><a href="#/">Home</a> › Financing pre-approval</nav>
    <h1>Get pre-approved</h1>
    <p class="muted" style="max-width:70ch">A soft pre-approval based on what you tell us. It sizes your budget the way a
    Canadian lender does — using a total debt service ratio against your gross income. <strong>No credit check is performed
    and your credit score is not affected.</strong></p>

    <div class="detail-split">
      <div class="card card-pad">
        <form id="pa-form" novalidate>
          <div class="field"><label for="pa-income">Gross annual income (before tax, CAD)</label>
            <input type="number" id="pa-income" name="annualIncomeCad" value="85000" min="0" step="1000"></div>

          <div class="field-row">
            <div class="field"><label for="pa-emp">Employment status</label>
              <select id="pa-emp" name="employmentStatus">
                <option value="full-time">Full-time employed</option>
                <option value="part-time">Part-time employed</option>
                <option value="self-employed">Self-employed</option>
                <option value="contract">Contract</option>
                <option value="retired">Retired</option>
                <option value="student">Student</option>
              </select></div>
            <div class="field"><label for="pa-tenure">Months at current employer</label>
              <input type="number" id="pa-tenure" name="monthsAtEmployer" value="36" min="0" step="1"></div>
          </div>

          <div class="field"><label for="pa-debt">Existing monthly debt payments</label>
            <input type="number" id="pa-debt" name="monthlyDebtPayments" value="600" min="0" step="50">
            <span class="hint">Rent or mortgage, credit cards, student loans, other vehicles</span></div>

          <div class="field"><label for="pa-band">Credit range</label>
            <select id="pa-band" name="creditBand">
              ${Object.entries(bands).map(([k, b]) => `<option value="${k}" ${k === 'good' ? 'selected' : ''}>${escapeHtml(b.label)}</option>`).join('')}
            </select></div>

          <div class="field-row">
            <div class="field"><label for="pa-prov">Province</label>
              <select id="pa-prov" name="provinceCode">${provinceOptions(provinces, prefs.province)}</select></div>
            <div class="field"><label for="pa-term">Preferred term</label>
              <select id="pa-term" name="termMonths">${TERMS.map((t) => `<option value="${t}" ${t === 60 ? 'selected' : ''}>${t} months</option>`).join('')}</select></div>
          </div>

          <div class="field-row">
            <div class="field"><label for="pa-down">Down payment</label>
              <input type="number" id="pa-down" name="downPayment" value="4000" min="0" step="500"></div>
            <div class="field"><label for="pa-trade">Trade-in value</label>
              <input type="number" id="pa-trade" name="tradeInValue" value="0" min="0" step="500"></div>
          </div>

          <button class="btn btn-primary btn-block" type="submit">Check my pre-approval</button>
        </form>
      </div>

      <div id="pa-result" class="stack">
        <div class="card card-pad">
          <h3>How this is calculated</h3>
          <p class="small muted">Lenders cap your total monthly obligations at a percentage of gross monthly income —
          the total debt service (TDS) ratio, typically 36–44% depending on credit strength. We subtract your existing
          debt payments from that ceiling, and whatever remains is what's available for a vehicle payment. We then work
          backwards through the interest rate, term and your province's sales tax to a maximum vehicle price.</p>
          <p class="small muted" style="margin:0">Fill in the form to see your result.</p>
        </div>
      </div>
    </div>
  </div>`;
}

preapproval.mount = () => {
  const form = document.getElementById('pa-form');
  const out = document.getElementById('pa-result');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(form).entries());
    const body = { ...raw };
    ['annualIncomeCad', 'monthlyDebtPayments', 'termMonths', 'downPayment', 'tradeInValue', 'monthsAtEmployer']
      .forEach((k) => { body[k] = Number(body[k]) || 0; });

    try {
      const r = await api.preApproval(body);
      if (!r.approved) {
        out.innerHTML = `<div class="card card-pad"><div class="notice notice-warn">
          <h3 style="margin:0 0 6px">Not pre-approved at this time</h3>
          <p style="margin:0 0 8px">${escapeHtml(r.reason || 'We could not pre-approve based on the information provided.')}</p>
          <p class="small" style="margin:0">${escapeHtml(r.suggestion || '')}</p></div></div>`;
        return;
      }
      out.innerHTML = `
        <div class="card card-pad">
          <div class="notice notice-ok"><strong>Pre-approved</strong> — reference ${escapeHtml(r.reference)}, valid ${r.validForDays} days.</div>
          <div class="payment-hero" style="margin-top:14px">
            <div class="amt money">${money(r.maxVehiclePrice)}</div>
            <div class="sub">Maximum vehicle price · ${escapeHtml(r.creditBandLabel)} · ${pct(r.estimatedApr)} APR over ${r.termMonths} months</div>
          </div>
          <div style="margin-top:14px">
            <div class="money-row"><span class="k">Gross monthly income</span><span class="money">${money2(r.grossMonthlyIncome)}</span></div>
            <div class="money-row"><span class="k">Lender TDS ceiling</span><span class="money">${(r.maxTdsRatio * 100).toFixed(0)}%</span></div>
            <div class="money-row"><span class="k">Available for a vehicle payment</span><span class="money">${money2(r.availableMonthlyPayment)} / month</span></div>
            <div class="money-row"><span class="k">Estimated rate</span><span class="money">${pct(r.estimatedApr)}</span></div>
            <div class="money-row total"><span class="k">Maximum amount financed</span><span class="money">${money2(r.maxAmountFinanced)}</span></div>
          </div>
          <div class="btn-row" style="margin-top:16px">
            <a class="btn btn-primary" href="#/inventory?maxPrice=${r.maxVehiclePrice}">Shop vehicles under ${money(r.maxVehiclePrice)}</a>
            <a class="btn" href="#/calculator">Fine-tune in the calculator</a>
          </div>
          <p class="small muted" style="margin-top:14px">${escapeHtml(r.disclaimer)}</p>
        </div>`;
    } catch (err) {
      const fields = err instanceof ApiError ? (err.body.errors || {}) : {};
      out.innerHTML = `<div class="card card-pad"><div class="notice notice-err">
        ${escapeHtml(err.message)}
        ${Object.values(fields).length ? `<ul class="small">${Object.values(fields).map((m) => `<li>${escapeHtml(m)}</li>`).join('')}</ul>` : ''}
      </div></div>`;
    }
  });
};
