import { route, start, navigate, parseHash } from './router.js';
import { store } from './store.js';
import { api } from './api.js';
import { escapeHtml } from './format.js';

import { home } from './views/home.js';
import { inventory } from './views/inventory.js';
import { detail } from './views/detail.js';
import { compare } from './views/compare.js';
import { saved } from './views/saved.js';
import { calculator } from './views/calculator.js';
import { reserve } from './views/reserve.js';
import { testdrive } from './views/testdrive.js';
import { preapproval } from './views/preapproval.js';
import { tradein } from './views/tradein.js';
import { dealers, dealerDetail } from './views/dealers.js';
import { admin } from './views/admin.js';

const viewEl = document.getElementById('view');

route('/',                 home);
route('/inventory',        inventory);
route('/vehicle/:id',      detail);
route('/compare',          compare);
route('/saved',            saved);
route('/calculator',       calculator);
route('/reserve/:id',      reserve);
route('/testdrive/:id',    testdrive);
route('/preapproval',      preapproval);
route('/tradein',          tradein);
route('/dealers',          dealers);
route('/dealer/:id',       dealerDetail);
route('/admin',            admin);

const TITLES = {
  '/': 'New & Pre-Owned Vehicles in Canada', '/inventory': 'Inventory', '/compare': 'Compare vehicles',
  '/saved': 'Saved vehicles', '/calculator': 'Payment calculator', '/preapproval': 'Financing pre-approval',
  '/tradein': 'Trade-in estimate', '/dealers': 'Dealers', '/admin': 'Admin'
};

async function render(handler, params, path) {
  if (!handler) {
    viewEl.innerHTML = `<div class="wrap section"><div class="empty">
      <h1>Page not found</h1><p>We couldn't find <code>${escapeHtml(path)}</code>.</p>
      <a class="btn btn-primary" href="#/">Back to home</a></div></div>`;
    return;
  }
  viewEl.innerHTML = '<div class="wrap"><p class="loading">Loading…</p></div>';
  try {
    viewEl.innerHTML = await handler(params);
    if (typeof handler.mount === 'function') handler.mount(params);
  } catch (err) {
    console.error(err);
    viewEl.innerHTML = `<div class="wrap section"><div class="notice notice-err">
      <h3 style="margin:0 0 6px">Something went wrong</h3>
      <p style="margin:0">${escapeHtml(err.message || 'Unexpected error')}</p></div>
      <div class="btn-row" style="margin-top:14px"><a class="btn" href="#/">Back to home</a>
      <button class="btn" onclick="location.reload()">Retry</button></div></div>`;
  }
  document.title = `${TITLES[path] || 'Car Marketplace'} — Car Marketplace`;
  scrollTo({ top: 0 });
  viewEl.focus({ preventScroll: true });
  syncCounts();
}

/** Delegated handlers so every view gets save / compare for free. */
document.addEventListener('click', (e) => {
  const fav = e.target.closest('[data-fav]');
  if (fav) {
    e.preventDefault();
    const on = store.toggleSaved(fav.dataset.fav);
    fav.classList.toggle('on', on);
    fav.setAttribute('aria-pressed', String(on));
    if (fav.classList.contains('btn')) {
      fav.textContent = on ? '♥ Saved' : '♡ Save';
      fav.classList.toggle('btn-danger', on);
    }
    syncCounts();
    return;
  }
  const cmp = e.target.closest('[data-compare]');
  if (cmp) {
    e.preventDefault();
    const res = store.toggleCompare(cmp.dataset.compare);
    if (!res.ok) { alert(res.reason); return; }
    cmp.textContent = res.on ? 'In compare' : 'Compare';
    cmp.classList.toggle('btn-dark', res.on);
    syncCounts();
  }
});

function syncCounts() {
  const s = store.get();
  const saved = document.getElementById('saved-count');
  const compare = document.getElementById('compare-count');
  if (saved) saved.textContent = s.saved.length;
  if (compare) compare.textContent = s.compare.length;
}

document.getElementById('header-search')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = document.getElementById('header-q').value.trim();
  navigate('/inventory', q ? { q } : {});
});

document.getElementById('nav-toggle')?.addEventListener('click', (e) => {
  const nav = document.querySelector('.site-nav');
  const open = nav.classList.toggle('open');
  e.currentTarget.setAttribute('aria-expanded', String(open));
});

// Keep the header search box in sync when arriving via a URL with ?q=
addEventListener('hashchange', () => {
  const { params } = parseHash();
  const box = document.getElementById('header-q');
  if (box) box.value = params.q || '';
  document.querySelector('.site-nav')?.classList.remove('open');
});

api.info()
  .then((i) => {
    const el = document.getElementById('build-info');
    if (el) el.textContent = `${i.app} ${i.release} · ${i.env}${i.pod ? ` · ${i.pod}` : ''} · ${i.inventoryCount} vehicles`;
  })
  .catch(() => {});

store.subscribe(syncCounts);
syncCounts();
start(render);
