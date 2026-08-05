// Browser-side preferences: saved vehicles, comparison list, recently viewed,
// and the buyer's province (which drives every tax calculation on the site).
const KEY = 'cm.state.v1';
const MAX_COMPARE = 4;
const MAX_RECENT = 12;

const defaults = { saved: [], compare: [], recent: [], province: 'ON', frequency: 'biweekly', termMonths: 60 };

function load() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { ...defaults }; }
}
let state = load();

const listeners = new Set();
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
  listeners.forEach((fn) => fn(state));
}

export const store = {
  get: () => ({ ...state }),
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  isSaved: (id) => state.saved.includes(id),
  toggleSaved(id) {
    state.saved = state.saved.includes(id) ? state.saved.filter((x) => x !== id) : [...state.saved, id];
    persist(); return state.saved.includes(id);
  },

  inCompare: (id) => state.compare.includes(id),
  toggleCompare(id) {
    if (state.compare.includes(id)) state.compare = state.compare.filter((x) => x !== id);
    else if (state.compare.length < MAX_COMPARE) state.compare = [...state.compare, id];
    else return { ok: false, reason: `You can compare up to ${MAX_COMPARE} vehicles.` };
    persist(); return { ok: true, on: state.compare.includes(id) };
  },
  clearCompare() { state.compare = []; persist(); },

  addRecent(id) {
    state.recent = [id, ...state.recent.filter((x) => x !== id)].slice(0, MAX_RECENT);
    persist();
  },

  setPrefs(patch) { state = { ...state, ...patch }; persist(); }
};
export { MAX_COMPARE };
