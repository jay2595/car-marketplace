import { api, ApiError } from '../api.js';
import { store } from '../store.js';
import { carFullName, dateTime, escapeHtml } from '../format.js';
import { carImage, provinceOptions } from '../components.js';

let car = null;

function slots() {
  const out = [];
  const d = new Date();
  d.setMinutes(0, 0, 0);
  for (let day = 1; day <= 10; day++) {
    for (const hour of [10, 12, 14, 16, 18]) {
      const s = new Date(d);
      s.setDate(d.getDate() + day); s.setHours(hour);
      if (s.getDay() === 0) continue;            // dealers closed Sundays
      out.push(s);
    }
  }
  return out;
}

export async function testdrive(params) {
  car = await api.car(params.id);
  const provinces = await api.provinces();
  const prefs = store.get();

  return `<div class="wrap section">
    <nav class="breadcrumb"><a href="#/">Home</a> › <a href="#/vehicle/${car.id}">${escapeHtml(carFullName(car))}</a> › Test drive</nav>
    <h1>Book a test drive</h1>
    <div class="detail-split">
      <div class="card card-pad">
        <form id="td-form" novalidate>
          <div class="field"><label for="t-when">Preferred date and time</label>
            <select id="t-when" name="scheduledFor">
              ${slots().map((s) => `<option value="${s.toISOString()}">${dateTime(s)}</option>`).join('')}
            </select>
            <span class="hint">${escapeHtml(car.dealer.name)} is closed Sundays</span></div>
          <div class="field-row">
            <div class="field"><label for="t-first">First name</label><input id="t-first" name="firstName" autocomplete="given-name"></div>
            <div class="field"><label for="t-last">Last name</label><input id="t-last" name="lastName" autocomplete="family-name"></div>
          </div>
          <div class="field"><label for="t-email">Email</label><input type="email" id="t-email" name="email" autocomplete="email"></div>
          <div class="field-row">
            <div class="field"><label for="t-phone">Phone</label><input type="tel" id="t-phone" name="phone" placeholder="(604) 555-0123"></div>
            <div class="field"><label for="t-postal">Postal code</label><input id="t-postal" name="postalCode" placeholder="V5T 3G7"></div>
          </div>
          <div class="field"><label for="t-prov">Province</label>
            <select id="t-prov" name="province">${provinceOptions(provinces, prefs.province)}</select></div>
          <div class="notice notice-warn small" style="margin-bottom:14px">
            Bring a valid provincial driver's licence and proof of insurance. Drivers must be 21 or older
            and hold a full (non-graduated) licence for the test drive.
          </div>
          <button class="btn btn-primary btn-block" type="submit">Request this time</button>
          <div id="td-result" style="margin-top:14px"></div>
        </form>
      </div>
      <aside class="card card-pad">
        <img src="${carImage(car, 640)}" alt="${escapeHtml(carFullName(car))}" style="border-radius:8px;margin-bottom:12px">
        <h3 style="margin-bottom:2px">${escapeHtml(carFullName(car))}</h3>
        <p class="small muted" style="margin-bottom:12px">Stock ${escapeHtml(car.stockNumber)}</p>
        <h4>Where you'll drive it</h4>
        <p class="small">${escapeHtml(car.dealer.name)}<br>${escapeHtml(car.dealer.address)}<br>
        ${escapeHtml(car.dealer.city)}, ${escapeHtml(car.dealer.province)} ${escapeHtml(car.dealer.postal)}<br>
        ${escapeHtml(car.dealer.phone)}</p>
        <p class="small muted">Licensed by ${escapeHtml(car.dealer.regulator)} · ${car.dealer.rating}/5 from ${car.dealer.reviews} reviews</p>
      </aside>
    </div>
  </div>`;
}

testdrive.mount = () => {
  const form = document.getElementById('td-form');
  const result = document.getElementById('td-result');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    form.querySelectorAll('.field').forEach((f) => { f.classList.remove('error'); f.querySelector('.err')?.remove(); });
    try {
      const res = await api.testDrive({ carId: car.id, ...Object.fromEntries(new FormData(form).entries()) });
      result.innerHTML = `<div class="notice notice-ok"><h3 style="margin:0 0 6px">Test drive requested — ${escapeHtml(res.reference)}</h3>
        <p style="margin:0">${escapeHtml(res.vehicle)} on <strong>${dateTime(res.scheduledFor)}</strong> at
        ${escapeHtml(res.dealer.name)}, ${escapeHtml(res.dealer.city)}. ${escapeHtml(res.reminder)}</p></div>`;
      form.querySelectorAll('input,select,button').forEach((el) => { el.disabled = true; });
    } catch (err) {
      if (err instanceof ApiError && err.body.fields) {
        Object.entries(err.body.fields).forEach(([name, msg]) => {
          const input = form.querySelector(`[name="${name}"]`);
          input?.closest('.field')?.classList.add('error');
          input?.closest('.field')?.insertAdjacentHTML('beforeend', `<span class="err">${escapeHtml(msg)}</span>`);
        });
      }
      result.innerHTML = `<div class="notice notice-err">${escapeHtml(err.message)}</div>`;
    }
  });
};
