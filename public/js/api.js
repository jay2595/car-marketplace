// Thin fetch wrapper. Every call returns parsed JSON or throws an ApiError.
export class ApiError extends Error {
  constructor(message, status, body) { super(message); this.status = status; this.body = body || {}; }
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { error: text }; }
  if (!res.ok) throw new ApiError((body && body.error) || `Request failed (${res.status})`, res.status, body);
  return body;
}

const qs = (params) => {
  const p = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) return;
    p.set(k, Array.isArray(v) ? v.join(',') : v);
  });
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const api = {
  info:        ()          => request('/api/info'),
  cars:        (params)    => request(`/api/cars${qs(params)}`),
  car:         (id)        => request(`/api/cars/${encodeURIComponent(id)}`),
  facets:      ()          => request('/api/facets'),
  dealers:     ()          => request('/api/dealers'),
  dealer:      (id)        => request(`/api/dealers/${encodeURIComponent(id)}`),
  provinces:   ()          => request('/api/provinces'),
  quote:       (body)      => request('/api/finance/quote',        { method: 'POST', body: JSON.stringify(body) }),
  affordability:(body)     => request('/api/finance/affordability',{ method: 'POST', body: JSON.stringify(body) }),
  schedule:    (body)      => request('/api/finance/schedule',     { method: 'POST', body: JSON.stringify(body) }),
  apr:         (params)    => request(`/api/finance/apr${qs(params)}`),
  tradeIn:     (body)      => request('/api/tradein/estimate',     { method: 'POST', body: JSON.stringify(body) }),
  preApproval: (body)      => request('/api/preapproval',          { method: 'POST', body: JSON.stringify(body) }),
  reserve:     (body)      => request('/api/reservations',         { method: 'POST', body: JSON.stringify(body) }),
  reservation: (ref)       => request(`/api/reservations/${encodeURIComponent(ref)}`),
  confirm:     (ref)       => request(`/api/reservations/${encodeURIComponent(ref)}/confirm`, { method: 'POST' }),
  testDrive:   (body)      => request('/api/testdrives',           { method: 'POST', body: JSON.stringify(body) }),
  adminSummary:()          => request('/api/admin/summary'),
  adminReservations:()     => request('/api/admin/reservations'),
  adminTestDrives:()       => request('/api/admin/testdrives')
};
