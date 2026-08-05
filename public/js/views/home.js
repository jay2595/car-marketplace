import { api } from '../api.js';
import { store } from '../store.js';
import { money, num, escapeHtml } from '../format.js';
import { carGrid, provinceOptions } from '../components.js';
import { navigate } from '../router.js';

const BODY_ICONS = {
  SUV: 'M4 15h20l-2-5H6z', Sedan: 'M3 15h22l-3-5H6z', Pickup: 'M3 15h22V9h-8l-2-3H5z',
  Hatchback: 'M4 15h20l-3-6H7z', Coupe: 'M3 15h22l-4-6H7z', Minivan: 'M3 15h22V8H5z', Wagon: 'M3 15h22V9H5z'
};

export async function home() {
  const prefs = store.get();
  const [facets, featured, evs, info] = await Promise.all([
    api.facets(),
    api.cars({ sort: 'newest', pageSize: 8, payProvince: prefs.province, payFrequency: prefs.frequency, payTerm: prefs.termMonths }),
    api.cars({ electricOnly: 'true', pageSize: 4, sort: 'price_asc', payProvince: prefs.province }),
    api.info()
  ]);
  const provinces = await api.provinces();

  const bodyTiles = facets.bodyType.map((b) => `
    <a class="card card-pad center" href="#/inventory?bodyType=${encodeURIComponent(b.value)}" style="text-decoration:none">
      <svg viewBox="0 0 28 20" width="52" height="38" style="margin:0 auto 6px" aria-hidden="true">
        <path d="${BODY_ICONS[b.value] || BODY_ICONS.Sedan}" fill="#0B2545"/>
        <circle cx="9" cy="16" r="2.4" fill="#0B2545"/><circle cx="19" cy="16" r="2.4" fill="#0B2545"/>
      </svg>
      <strong>${escapeHtml(b.value)}</strong><br><span class="small muted">${b.count} available</span>
    </a>`).join('');

  const makeTiles = facets.make.slice(0, 12).map((m) => `
    <a class="card card-pad center" href="#/inventory?make=${encodeURIComponent(m.value)}" style="text-decoration:none">
      <strong>${escapeHtml(m.value)}</strong><br><span class="small muted">${m.count}</span>
    </a>`).join('');

  return `
  <section class="hero">
    <div class="wrap">
      <h1>Find your next vehicle, anywhere in Canada.</h1>
      <p class="lede">${facets.total} new, used and certified pre-owned vehicles from ${info.dealerCount} licensed dealers.
      Every price shown in Canadian dollars, with provincial tax calculated before you commit.</p>

      <form class="hero-search" id="hero-search">
        <div class="grid grid-4" style="gap:12px">
          <div class="field" style="margin:0">
            <label for="h-make">Make</label>
            <select id="h-make" name="make"><option value="">Any make</option>
              ${facets.make.map((m) => `<option value="${escapeHtml(m.value)}">${escapeHtml(m.value)} (${m.count})</option>`).join('')}
            </select>
          </div>
          <div class="field" style="margin:0">
            <label for="h-body">Body type</label>
            <select id="h-body" name="bodyType"><option value="">Any body type</option>
              ${facets.bodyType.map((b) => `<option value="${escapeHtml(b.value)}">${escapeHtml(b.value)} (${b.count})</option>`).join('')}
            </select>
          </div>
          <div class="field" style="margin:0">
            <label for="h-max">Max price</label>
            <select id="h-max" name="maxPrice"><option value="">Any price</option>
              ${[15000, 25000, 35000, 50000, 75000, 100000].map((p) => `<option value="${p}">Under ${money(p)}</option>`).join('')}
            </select>
          </div>
          <div class="field" style="margin:0">
            <label for="h-prov">Your province <span class="hint">(sets tax)</span></label>
            <select id="h-prov" name="province">${provinceOptions(provinces, prefs.province)}</select>
          </div>
        </div>
        <button class="btn btn-primary" type="submit" style="margin-top:6px">Search ${facets.total} vehicles</button>
      </form>

      <div class="hero-stats">
        <div><span class="n">${facets.total}</span><span class="l">In stock</span></div>
        <div><span class="n">${facets.make.length}</span><span class="l">Makes</span></div>
        <div><span class="n">${facets.province.length}</span><span class="l">Provinces</span></div>
        <div><span class="n">${money(facets.range.price.min)}</span><span class="l">From</span></div>
      </div>
    </div>
  </section>

  <div class="wrap">
    <section class="section">
      <div class="section-head"><h2>Just arrived</h2><a href="#/inventory?sort=newest">View all inventory →</a></div>
      ${carGrid(featured.items)}
    </section>

    <section class="section">
      <div class="section-head"><h2>Shop by body type</h2></div>
      <div class="grid grid-4">${bodyTiles}</div>
    </section>

    <section class="section">
      <div class="section-head"><h2>Electric &amp; plug-in hybrid</h2><a href="#/inventory?electricOnly=true">See all →</a></div>
      ${carGrid(evs.items)}
    </section>

    <section class="section">
      <div class="section-head"><h2>Popular makes</h2></div>
      <div class="grid grid-4">${makeTiles}</div>
    </section>

    <section class="section">
      <div class="grid grid-2">
        <div class="card card-pad">
          <h3>Know your payment before you visit</h3>
          <p class="muted">Our calculator applies the correct GST, HST, PST or QST for your province, accounts for your
          trade-in allowance reducing the taxable amount, and includes the federal luxury tax on new vehicles over $100,000.</p>
          <div class="btn-row"><a class="btn btn-primary" href="#/calculator">Open payment calculator</a>
          <a class="btn" href="#/tradein">Value my trade-in</a></div>
        </div>
        <div class="card card-pad">
          <h3>Get pre-approved in minutes</h3>
          <p class="muted">A soft pre-approval based on your income, employment and credit range. No credit check,
          no impact on your score, and it tells you the price range you should actually be shopping in.</p>
          <div class="btn-row"><a class="btn btn-primary" href="#/preapproval">Start pre-approval</a>
          <a class="btn" href="#/dealers">Find a dealer</a></div>
        </div>
      </div>
    </section>
  </div>`;
}

home.mount = () => {
  const form = document.getElementById('hero-search');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (data.province) store.setPrefs({ province: data.province });
    delete data.province;
    navigate('/inventory', data);
  });
};
