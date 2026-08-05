import { api } from '../api.js';
import { money, num, dateTime, escapeHtml } from '../format.js';

export async function admin() {
  const [s, reservations, testDrives] = await Promise.all([
    api.adminSummary(), api.adminReservations(), api.adminTestDrives()
  ]);
  const inv = s.inventory;
  const maxProv = Math.max(...Object.values(inv.byProvince));

  const bar = (label, value, max) => `
    <div style="margin-bottom:9px">
      <div class="spread small"><span>${escapeHtml(label)}</span><span class="muted">${value}</span></div>
      <div class="bar"><i style="width:${Math.round((value / max) * 100)}%"></i></div>
    </div>`;

  const statusBadge = (st) => {
    const cls = { reserved: 'badge-amber', booked: 'badge-green', expired: '', cancelled: 'badge-red', scheduled: 'badge-green' }[st] || '';
    return `<span class="badge ${cls}">${escapeHtml(st)}</span>`;
  };

  return `<div class="wrap section">
    <nav class="breadcrumb"><a href="#/">Home</a> › Admin</nav>
    <div class="spread" style="margin-bottom:8px">
      <h1 style="margin:0">Inventory &amp; activity</h1>
      <span class="chip mono">release ${escapeHtml(s.release)} · env ${escapeHtml(s.env)}</span>
    </div>
    <p class="muted small">Reservation and test-drive data is held in memory in this pod. Restarting the pod clears it —
    intentional for the demo; swapping in a database means replacing one module.</p>

    <div class="grid grid-4" style="margin:20px 0">
      <div class="kpi"><span class="n">${num(inv.count)}</span><span class="l">Vehicles in stock</span></div>
      <div class="kpi"><span class="n">${money(inv.totalValueCad)}</span><span class="l">Total inventory value</span></div>
      <div class="kpi"><span class="n">${money(inv.averagePriceCad)}</span><span class="l">Average price</span></div>
      <div class="kpi"><span class="n">${inv.averageDaysOnLot}</span><span class="l">Avg days on lot</span></div>
      <div class="kpi"><span class="n">${s.activity.reserved}</span><span class="l">Active holds</span></div>
      <div class="kpi"><span class="n">${s.activity.booked}</span><span class="l">Confirmed bookings</span></div>
      <div class="kpi"><span class="n">${s.activity.testDrives}</span><span class="l">Test drives booked</span></div>
      <div class="kpi"><span class="n">${s.dealers}</span><span class="l">Dealers</span></div>
    </div>

    <div class="grid grid-2">
      <div class="card card-pad">
        <h3>Stock by province</h3>
        ${Object.entries(inv.byProvince).sort((a, b) => b[1] - a[1]).map(([p, n]) => bar(p, n, maxProv)).join('')}
      </div>
      <div class="card card-pad">
        <h3>Stock by body type</h3>
        ${Object.entries(inv.byBodyType).sort((a, b) => b[1] - a[1])
          .map(([t, n]) => bar(t, n, Math.max(...Object.values(inv.byBodyType)))).join('')}
      </div>
    </div>

    <div class="grid grid-3" style="margin-top:18px">
      <div class="kpi"><span class="n">${inv.new}</span><span class="l">New</span></div>
      <div class="kpi"><span class="n">${inv.cpo}</span><span class="l">Certified pre-owned</span></div>
      <div class="kpi"><span class="n">${inv.used}</span><span class="l">Used</span></div>
    </div>

    <section class="section">
      <h2>Reservations</h2>
      <div class="card" style="overflow-x:auto">
        ${reservations.length ? `<table>
          <thead><tr><th>Reference</th><th>Vehicle</th><th>Customer</th><th>Status</th><th>Created</th><th>Expires</th><th class="num">Deposit</th></tr></thead>
          <tbody>${reservations.map((r) => `<tr>
            <td class="mono">${escapeHtml(r.reference)}</td>
            <td>${escapeHtml(r.vehicle)}<br><span class="small muted">${escapeHtml(r.stockNumber)}</span></td>
            <td>${escapeHtml(r.customer.firstName)} ${escapeHtml(r.customer.lastName)}<br><span class="small muted">${escapeHtml(r.customer.phone)}</span></td>
            <td>${statusBadge(r.status)}</td>
            <td class="small">${dateTime(r.createdAt)}</td>
            <td class="small">${dateTime(r.expiresAt)}</td>
            <td class="num money">${money(r.depositCad)}</td></tr>`).join('')}</tbody>
        </table>` : `<div class="empty"><p>No reservations yet. Place one from any vehicle page.</p></div>`}
      </div>
    </section>

    <section class="section">
      <h2>Test drives</h2>
      <div class="card" style="overflow-x:auto">
        ${testDrives.length ? `<table>
          <thead><tr><th>Reference</th><th>Vehicle</th><th>Customer</th><th>Scheduled</th><th>Dealer</th><th>Status</th></tr></thead>
          <tbody>${testDrives.map((t) => `<tr>
            <td class="mono">${escapeHtml(t.reference)}</td>
            <td>${escapeHtml(t.vehicle)}</td>
            <td>${escapeHtml(t.customer.firstName)} ${escapeHtml(t.customer.lastName)}</td>
            <td class="small">${dateTime(t.scheduledFor)}</td>
            <td class="small">${escapeHtml(t.dealer ? t.dealer.name : '—')}</td>
            <td>${statusBadge(t.status)}</td></tr>`).join('')}</tbody>
        </table>` : `<div class="empty"><p>No test drives booked yet.</p></div>`}
      </div>
    </section>
  </div>`;
}
