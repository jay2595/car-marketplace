// Minimal hash router: #/path?query
const routes = [];
export function route(pattern, handler) { routes.push({ pattern, handler }); }

export function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, search] = raw.split('?');
  const params = Object.fromEntries(new URLSearchParams(search || ''));
  return { path: path || '/', params };
}

export function navigate(path, params) {
  const qs = params ? new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== '')
  ).toString() : '';
  location.hash = `#${path}${qs ? `?${qs}` : ''}`;
}

/** Replace the query string without adding a history entry per keystroke. */
export function replaceParams(path, params) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== '' && v !== false)
  ).toString();
  history.replaceState(null, '', `#${path}${qs ? `?${qs}` : ''}`);
}

export function start(render) {
  const run = () => {
    const { path, params } = parseHash();
    for (const r of routes) {
      const keys = [];
      const rx = new RegExp('^' + r.pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
      const m = path.match(rx);
      if (m) {
        const args = Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
        return render(r.handler, { ...args, ...params }, path);
      }
    }
    return render(null, {}, path);
  };
  addEventListener('hashchange', run);
  run();
}
