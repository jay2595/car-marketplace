import { api } from '../api.js';
import { store } from '../store.js';
import { money, num, escapeHtml } from '../format.js';
import { carGrid, pager, provinceOptions, FREQUENCIES, TERMS } from '../components.js';
import { navigate, replaceParams } from '../router.js';

const MULTI = ['make', 'model', 'bodyType', 'fuelType', 'transmission', 'drivetrain', 'condition', 'province', 'colour'];
const LABELS = {
  make: 'Make', model: 'Model', bodyType: 'Body type', fuelType: 'Fuel', transmission: 'Transmission',
  drivetrain: 'Drivetrain', condition: 'Condition', province: 'Province', colour: 'Colour',
  minPrice: 'Min price', maxPrice: 'Max price', minYear: 'From year', maxYear: 'To year',
  maxKm: 'Max km', minSeats: 'Min seats', q: 'Search', accidentFree: 'Accident free',
  oneOwner: 'One owner', electricOnly: 'Electric only'
};
const SORT_OPTIONS = [
  ['relevance', 'Best match'], ['newest', 'Recently listed'], ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'], ['km_asc', 'Kilometres: low to high'],
  ['year_desc', 'Year: newest first'], ['year_asc', 'Year: oldest first'], ['make_asc', 'Make A–Z']
];

let current = {};

const listOf = (v) => (v ? String(v).split(',').filter(Boolean) : []);

function checkGroup(key, facet, selected) {
  const sel = listOf(selected);
  const many = facet.length > 7;
  return `<div class="filter-group">
    <h4>${LABELS[key]}</h4>
    <div class="${many ? 'scroll-list' : ''}">
      ${facet.map((f) => `
        <label class="check">
          <input type="checkbox" data-multi="${key}" value="${escapeHtml(f.value)}" ${sel.includes(String(f.value)) ? 'checked' : ''}>
          <span>${escapeHtml(f.value)}</span><span class="c">${f.count}</span>
        </label>`).join('')}
    </div>
  </div>`;
}

export async function inventory(params) {
  const prefs = store.get();
  current = { ...params };
  const query = {
    ...params,
    pageSize: params.pageSize || 12,
    payProvince: prefs.province, payFrequency: prefs.frequency, payTerm: prefs.termMonths
  };
  const [data, provinces] = await Promise.all([api.cars(query), api.provinces()]);
  const f = data.facets;

  const chips = Object.entries(params)
    .filter(([k, v]) => LABELS[k] && v)
    .map(([k, v]) => `<span class="chip">${LABELS[k]}: ${escapeHtml(String(v).replace(/,/g, ', '))}
      <button data-clear="${k}" aria-label="Remove ${LABELS[k]} filter">×</button></span>`).join('');

  return `<div class="wrap">
    <nav class="breadcrumb"><a href="#/">Home</a> › Inventory</nav>
    <div class="spread" style="margin-bottom:14px">
      <div>
        <h1 style="margin-bottom:2px">${num(data.totalItems)} vehicle${data.totalItems === 1 ? '' : 's'}</h1>
        <p class="muted small" style="margin:0">Prices in CAD before tax. Payments estimated for ${escapeHtml(prefs.province)}.</p>
      </div>
      <div class="row">
        <label class="small muted" for="sort">Sort</label>
        <select id="sort" style="padding:8px 10px;border-radius:8px;border:1px solid var(--line-2)">
          ${SORT_OPTIONS.map(([v, l]) => `<option value="${v}" ${data.appliedSort === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
    </div>
    ${chips ? `<div class="row" style="margin-bottom:16px">${chips}<button class="btn btn-sm btn-ghost" data-clear-all>Clear all</button></div>` : ''}

    <div class="split">
      <aside class="card card-pad filters" aria-label="Filters">
        <div class="filter-group">
          <h4>Keyword</h4>
          <input type="search" id="f-q" value="${escapeHtml(params.q || '')}" placeholder="e.g. RAV4 hybrid AWD"
            style="width:100%;padding:8px 10px;border:1px solid var(--line-2);border-radius:8px">
        </div>

        <div class="filter-group">
          <h4>Payment estimate</h4>
          <div class="field"><label for="p-prov">Province</label>
            <select id="p-prov">${provinceOptions(provinces, prefs.province)}</select></div>
          <div class="field-row">
            <div class="field"><label for="p-freq">Frequency</label>
              <select id="p-freq">${FREQUENCIES.map(([v, l]) => `<option value="${v}" ${prefs.frequency === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
            <div class="field"><label for="p-term">Term</label>
              <select id="p-term">${TERMS.map((t) => `<option value="${t}" ${+prefs.termMonths === t ? 'selected' : ''}>${t} mo</option>`).join('')}</select></div>
          </div>
        </div>

        <div class="filter-group">
          <h4>Price (CAD)</h4>
          <div class="range-row">
            <input type="number" id="f-minPrice" placeholder="${f.range.price.min}" value="${escapeHtml(params.minPrice || '')}" min="0" step="500">
            <span>to</span>
            <input type="number" id="f-maxPrice" placeholder="${f.range.price.max}" value="${escapeHtml(params.maxPrice || '')}" min="0" step="500">
          </div>
        </div>

        <div class="filter-group">
          <h4>Year</h4>
          <div class="range-row">
            <input type="number" id="f-minYear" placeholder="${f.range.year.min}" value="${escapeHtml(params.minYear || '')}">
            <span>to</span>
            <input type="number" id="f-maxYear" placeholder="${f.range.year.max}" value="${escapeHtml(params.maxYear || '')}">
          </div>
        </div>

        <div class="filter-group">
          <h4>Maximum kilometres</h4>
          <input type="number" id="f-maxKm" placeholder="Any" value="${escapeHtml(params.maxKm || '')}" step="5000"
            style="width:100%;padding:8px 10px;border:1px solid var(--line-2);border-radius:8px">
        </div>

        ${checkGroup('condition', f.condition, params.condition)}
        ${checkGroup('bodyType', f.bodyType, params.bodyType)}
        ${checkGroup('make', f.make, params.make)}
        ${checkGroup('fuelType', f.fuelType, params.fuelType)}
        ${checkGroup('drivetrain', f.drivetrain, params.drivetrain)}
        ${checkGroup('transmission', f.transmission, params.transmission)}
        ${checkGroup('province', f.province, params.province)}
        ${checkGroup('colour', f.colour, params.colour)}

        <div class="filter-group">
          <h4>History</h4>
          <label class="check"><input type="checkbox" data-flag="accidentFree" ${params.accidentFree === 'true' ? 'checked' : ''}><span>Accident free</span></label>
          <label class="check"><input type="checkbox" data-flag="oneOwner" ${params.oneOwner === 'true' ? 'checked' : ''}><span>One owner</span></label>
          <label class="check"><input type="checkbox" data-flag="electricOnly" ${params.electricOnly === 'true' ? 'checked' : ''}><span>Electric or plug-in only</span></label>
        </div>
      </aside>

      <div>
        ${carGrid(data.items)}
        ${pager(data.page, data.totalPages)}
        <p class="small muted center" style="margin-top:14px">
          Showing ${data.items.length} of ${num(data.totalItems)} vehicles · page ${data.page} of ${data.totalPages}
        </p>
      </div>
    </div>
  </div>`;
}

inventory.mount = () => {
  const go = (patch) => navigate('/inventory', { ...current, page: 1, ...patch });

  document.getElementById('sort')?.addEventListener('change', (e) => go({ sort: e.target.value }));

  document.querySelectorAll('[data-multi]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const key = cb.dataset.multi;
      const vals = [...document.querySelectorAll(`[data-multi="${key}"]:checked`)].map((x) => x.value);
      go({ [key]: vals.join(',') || undefined });
    });
  });

  document.querySelectorAll('[data-flag]').forEach((cb) => {
    cb.addEventListener('change', () => go({ [cb.dataset.flag]: cb.checked ? 'true' : undefined }));
  });

  ['minPrice', 'maxPrice', 'minYear', 'maxYear', 'maxKm'].forEach((k) => {
    const el = document.getElementById(`f-${k}`);
    el?.addEventListener('change', () => go({ [k]: el.value || undefined }));
  });

  const q = document.getElementById('f-q');
  let t;
  q?.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => go({ q: q.value || undefined }), 400); });

  document.querySelectorAll('[data-clear]').forEach((b) =>
    b.addEventListener('click', () => go({ [b.dataset.clear]: undefined })));
  document.querySelector('[data-clear-all]')?.addEventListener('click', () => navigate('/inventory'));

  document.querySelectorAll('[data-page]').forEach((b) =>
    b.addEventListener('click', () => {
      navigate('/inventory', { ...current, page: b.dataset.page });
      scrollTo({ top: 0, behavior: 'smooth' });
    }));

  const rerun = () => navigate('/inventory', { ...current });
  document.getElementById('p-prov')?.addEventListener('change', (e) => { store.setPrefs({ province: e.target.value }); rerun(); });
  document.getElementById('p-freq')?.addEventListener('change', (e) => { store.setPrefs({ frequency: e.target.value }); rerun(); });
  document.getElementById('p-term')?.addEventListener('change', (e) => { store.setPrefs({ termMonths: +e.target.value }); rerun(); });
};
