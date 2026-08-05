import { api, ApiError } from '../api.js';
import { store } from '../store.js';
import { money, money2, carFullName, dateTime, escapeHtml } from '../format.js';
import { carImage, dealBreakdown, provinceOptions } from '../components.js';

let car = null, provinces = [];

export async function reserve(params) {
  car = await api.car(params.id);
  provinces = await api.provinces();
  const prefs = store.get();
  const deal = await api.quote({ carId: car.id, provinceCode: prefs.province, frequency: prefs.frequency, termMonths: prefs.termMonths, aprPercent: 7.99 });
  const taken = car.availability.status !== 'available';

  return `<div class="wrap section">
    <nav class="breadcrumb"><a href="#/">Home</a> › <a href="#/vehicle/${car.id}">${escapeHtml(carFullName(car))}</a> › Reserve</nav>
    <h1>Reserve this vehicle</h1>

    ${taken ? `<div class="notice notice-warn">This vehicle is already ${escapeHtml(car.availability.status)} (reference ${escapeHtml(car.availability.reference)}).
      Holds expire automatically after 48 hours — check back, or <a href="#/inventory?bodyType=${encodeURIComponent(car.bodyType)}">browse similar vehicles</a>.</div>` : ''}

    <div class="detail-split">
      <div class="card card-pad">
        <h3>Your details</h3>
        <p class="small muted">We use this to hold the vehicle and have the dealer contact you. A $500 refundable deposit
        is collected in person or by e-transfer — nothing is charged on this page.</p>
        <form id="reserve-form" novalidate>
          <div class="field-row">
            <div class="field"><label for="r-first">First name</label><input id="r-first" name="firstName" autocomplete="given-name" required></div>
            <div class="field"><label for="r-last">Last name</label><input id="r-last" name="lastName" autocomplete="family-name" required></div>
          </div>
          <div class="field"><label for="r-email">Email</label><input type="email" id="r-email" name="email" autocomplete="email" required></div>
          <div class="field-row">
            <div class="field"><label for="r-phone">Phone</label><input type="tel" id="r-phone" name="phone" placeholder="(416) 555-0123" autocomplete="tel" required>
              <span class="hint">10-digit Canadian number</span></div>
            <div class="field"><label for="r-postal">Postal code</label><input id="r-postal" name="postalCode" placeholder="M5V 2T6" autocomplete="postal-code" required></div>
          </div>
          <div class="field"><label for="r-prov">Province or territory</label>
            <select id="r-prov" name="province">${provinceOptions(provinces, prefs.province)}</select></div>
          <div class="field"><label for="r-notes">Anything the dealer should know? (optional)</label>
            <textarea id="r-notes" name="notes" rows="3" placeholder="Preferred pickup date, financing questions, trade-in details…"></textarea></div>

          <div class="notice small" style="margin-bottom:14px">
            By reserving you agree to a 48-hour hold. The deposit is fully refundable if you decide not to proceed.
            This is a demonstration site — no payment is taken and no data leaves this container.
          </div>
          <button class="btn btn-primary btn-block" type="submit" ${taken ? 'disabled' : ''}>
            Place 48-hour hold${taken ? ' — unavailable' : ''}
          </button>
          <div id="reserve-result" style="margin-top:14px"></div>
        </form>
      </div>

      <aside class="card card-pad">
        <img src="${carImage(car, 640)}" alt="${escapeHtml(carFullName(car))}" style="border-radius:8px;margin-bottom:12px">
        <h3 style="margin-bottom:2px">${escapeHtml(carFullName(car))}</h3>
        <p class="small muted">Stock ${escapeHtml(car.stockNumber)} · ${escapeHtml(car.city)}, ${escapeHtml(car.province)}</p>
        <div class="money-row total"><span class="k">Vehicle price</span><span class="money">${money(car.price)}</span></div>
        <div style="margin-top:14px">${dealBreakdown(deal)}</div>
        <div class="notice notice-ok small" style="margin-top:14px">
          <strong>Refundable deposit: ${money(500)}</strong><br>Applied to your purchase price if you proceed.
        </div>
      </aside>
    </div>
  </div>`;
}

reserve.mount = () => {
  const form = document.getElementById('reserve-form');
  const result = document.getElementById('reserve-result');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    form.querySelectorAll('.field').forEach((f) => { f.classList.remove('error'); f.querySelector('.err')?.remove(); });
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Placing hold…';
    const payload = { carId: car.id, ...Object.fromEntries(new FormData(form).entries()) };

    try {
      const res = await api.reserve(payload);
      result.innerHTML = `<div class="notice notice-ok">
        <h3 style="margin:0 0 6px">Vehicle held — reference ${escapeHtml(res.reference)}</h3>
        <p style="margin:0 0 8px">We've placed a ${res.holdHours}-hour hold on your ${escapeHtml(res.vehicle)}.
        It expires <strong>${dateTime(res.expiresAt)}</strong>. ${escapeHtml(res.customer.firstName)}, the dealer will
        call ${escapeHtml(res.customer.phone)} to arrange your deposit and pickup.</p>
        <div class="btn-row">
          <button class="btn btn-sm btn-primary" data-confirm="${escapeHtml(res.reference)}">Confirm booking with deposit</button>
          <a class="btn btn-sm" href="#/testdrive/${car.id}">Book a test drive first</a>
        </div></div>`;
      form.querySelectorAll('input,select,textarea').forEach((el) => { el.disabled = true; });
      btn.style.display = 'none';
      result.querySelector('[data-confirm]')?.addEventListener('click', async (ev) => {
        const r = await api.confirm(ev.target.dataset.confirm);
        result.innerHTML = `<div class="notice notice-ok"><h3 style="margin:0 0 6px">Booking confirmed</h3>
          <p style="margin:0">Reference ${escapeHtml(r.reference)} is now <strong>${escapeHtml(r.status)}</strong>.
          Bring government-issued photo ID and proof of insurance to complete the sale.</p></div>`;
      });
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Place 48-hour hold';
      if (err instanceof ApiError && err.body.fields) {
        Object.entries(err.body.fields).forEach(([name, msg]) => {
          const input = form.querySelector(`[name="${name}"]`);
          if (input) {
            input.closest('.field').classList.add('error');
            input.closest('.field').insertAdjacentHTML('beforeend', `<span class="err">${escapeHtml(msg)}</span>`);
          }
        });
        result.innerHTML = `<div class="notice notice-err">${escapeHtml(err.message)}</div>`;
      } else {
        result.innerHTML = `<div class="notice notice-err">${escapeHtml(err.message)}</div>`;
      }
    }
  });
};
