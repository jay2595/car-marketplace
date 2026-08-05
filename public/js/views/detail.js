import { api } from '../api.js';
import { store } from '../store.js';
import { money, money2, km, num, date, economy, carFullName, escapeHtml } from '../format.js';
import { carGrid, carImage, carBadges, specList, dealBreakdown, paymentHero, provinceOptions, FREQUENCIES, TERMS } from '../components.js';

let car = null;

export async function detail(params) {
  const prefs = store.get();
  const [c, provinces] = await Promise.all([api.car(params.id), api.provinces()]);
  car = c;
  store.addRecent(c.id);

  const deal = await api.quote({
    carId: c.id, provinceCode: prefs.province, frequency: prefs.frequency,
    termMonths: prefs.termMonths, aprPercent: 7.99
  });

  const h = c.history;
  const reserved = c.availability.status !== 'available';

  return `<div class="wrap">
    <nav class="breadcrumb">
      <a href="#/">Home</a> › <a href="#/inventory">Inventory</a> ›
      <a href="#/inventory?make=${encodeURIComponent(c.make)}">${escapeHtml(c.make)}</a> › ${escapeHtml(c.model)}
    </nav>

    <div class="detail-split">
      <div class="stack">
        <div class="gallery-main">
          <img src="${carImage(c, 1000)}" alt="${escapeHtml(carFullName(c))} in ${escapeHtml(c.exteriorColour)}" width="1000" height="500">
        </div>
        ${c.media.source === 'generated'
          ? `<p class="small muted">Illustration shown in the vehicle's actual exterior colour (${escapeHtml(c.exteriorColour)}). Dealer photography available on request.</p>`
          : ''}

        <div class="card card-pad">
          <h2 style="margin-bottom:2px">${escapeHtml(carFullName(c))}</h2>
          <p class="muted" style="margin-bottom:12px">Stock ${escapeHtml(c.stockNumber)} · VIN ${escapeHtml(c.vin)} · Listed ${date(c.listedOn)} (${c.daysOnLot} days on lot)</p>
          <div class="row" style="margin-bottom:14px">${carBadges(c, 6)}</div>
          <p>${escapeHtml(c.description)}</p>
        </div>

        <div class="card card-pad">
          <h3>Specifications</h3>
          ${specList([
            ['Body type', escapeHtml(c.bodyType)],
            ['Condition', escapeHtml(c.condition)],
            ['Odometer', km(c.odometerKm)],
            ['Engine', escapeHtml(c.engine)],
            ['Horsepower', `${c.horsepower} hp`],
            ['Transmission', escapeHtml(c.transmission)],
            ['Drivetrain', escapeHtml(c.drivetrain)],
            ['Fuel type', escapeHtml(c.fuelType)],
            ['Fuel economy', escapeHtml(economy(c))],
            [c.fuelType === 'Plug-in Hybrid' ? 'Electric-only range' : null, c.electricRangeKm ? `${num(c.electricRangeKm)} km` : null],
            ['Seats', c.seats], ['Doors', c.doors],
            ['Exterior colour', escapeHtml(c.exteriorColour)],
            ['Interior', escapeHtml(c.interiorColour)],
            ['MSRP when new', money(c.msrpWhenNew)]
          ])}
        </div>

        <div class="card card-pad">
          <h3>Features &amp; equipment</h3>
          <div class="row">${c.features.map((f) => `<span class="chip">${escapeHtml(f)}</span>`).join('')}</div>
        </div>

        <div class="card card-pad">
          <h3>Vehicle history</h3>
          ${specList([
            ['Reported accidents', h.accidents === 0 ? '<span style="color:var(--green)">None reported</span>' : `${h.accidents} (${money(h.accidentDamageCad)} damage)`],
            ['Previous owners', h.previousOwners === 0 ? 'New vehicle' : h.previousOwners],
            ['Service records', h.serviceRecords || '—'],
            ['Lien status', `<span style="color:var(--green)">${escapeHtml(h.lienStatus)}</span>`],
            ['Registered in', h.registeredProvinces.join(', ')],
            ['Safety certified', h.safetyCertified ? 'Yes — Safety Standards Certificate included' : 'New vehicle'],
            ['Winter tires', h.winterTiresIncluded ? 'Included' : 'Not included'],
            ['US import', h.importedFromUs ? 'Yes' : 'No'],
            ['History report', h.carfaxAvailable ? 'Available on request' : 'Not applicable (new)']
          ])}
          ${h.importedFromUs ? `<div class="notice notice-warn" style="margin-top:14px">This vehicle was imported from the United States. Ask the dealer for the Registrar of Imported Vehicles (RIV) documentation.</div>` : ''}
        </div>

        <div class="card card-pad">
          <h3>Selling dealer</h3>
          <p style="margin-bottom:6px"><strong>${escapeHtml(c.dealer.name)}</strong> — ${escapeHtml(c.dealer.address)}, ${escapeHtml(c.dealer.city)}, ${escapeHtml(c.dealer.province)} ${escapeHtml(c.dealer.postal)}</p>
          <p class="small muted">${escapeHtml(c.dealer.phone)} · Rated ${c.dealer.rating}/5 from ${num(c.dealer.reviews)} reviews · Licensed by ${escapeHtml(c.dealer.regulator)}</p>
          <a class="btn btn-sm" href="#/dealer/${c.dealer.id}">See all inventory from this dealer</a>
        </div>
      </div>

      <aside class="stack">
        <div class="card card-pad">
          <div class="spread">
            <div>
              <div class="car-price money">${money(c.price)}</div>
              <div class="small muted">plus tax and licensing</div>
            </div>
            <button class="btn btn-sm${store.isSaved(c.id) ? ' btn-danger' : ''}" data-fav="${c.id}">
              ${store.isSaved(c.id) ? '♥ Saved' : '♡ Save'}
            </button>
          </div>

          ${reserved
            ? `<div class="notice notice-warn" style="margin-top:14px">This vehicle is currently <strong>${escapeHtml(c.availability.status)}</strong> under reference ${escapeHtml(c.availability.reference)}. Holds expire after 48 hours.</div>`
            : ''}

          <div style="margin-top:16px">${paymentHero(deal)}</div>

          <div class="field-row" style="margin-top:14px">
            <div class="field"><label for="d-prov">Province</label>
              <select id="d-prov">${provinceOptions(provinces, prefs.province)}</select></div>
            <div class="field"><label for="d-freq">Frequency</label>
              <select id="d-freq">${FREQUENCIES.map(([v, l]) => `<option value="${v}" ${prefs.frequency === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          </div>
          <div class="field-row">
            <div class="field"><label for="d-term">Term</label>
              <select id="d-term">${TERMS.map((t) => `<option value="${t}" ${+prefs.termMonths === t ? 'selected' : ''}>${t} months</option>`).join('')}</select></div>
            <div class="field"><label for="d-down">Down payment</label>
              <input type="number" id="d-down" value="0" min="0" step="500"></div>
          </div>

          <div id="d-breakdown" style="margin-top:8px">${dealBreakdown(deal)}</div>

          <div class="btn-row" style="margin-top:16px">
            <a class="btn btn-primary btn-block" href="#/reserve/${c.id}" ${reserved ? 'aria-disabled="true"' : ''}>Reserve this vehicle</a>
          </div>
          <div class="btn-row" style="margin-top:8px">
            <a class="btn" href="#/testdrive/${c.id}" style="flex:1">Book a test drive</a>
            <button class="btn" data-compare="${c.id}" style="flex:1">${store.inCompare(c.id) ? 'In compare' : 'Compare'}</button>
          </div>
          <a class="btn btn-ghost btn-block" href="#/calculator?carId=${c.id}" style="margin-top:8px">Open full payment calculator</a>
        </div>

        <div class="card card-pad">
          <h4>What's included</h4>
          <ul class="small" style="padding-left:18px;margin:0">
            <li>Provincial safety inspection ${h.safetyCertified ? 'completed' : '(new vehicle)'}</li>
            <li>Lien search — status ${escapeHtml(h.lienStatus.toLowerCase())}</li>
            <li>48-hour reservation hold with a refundable $500 deposit</li>
            <li>7-day exchange privilege on certified pre-owned</li>
          </ul>
        </div>
      </aside>
    </div>

    <section class="section">
      <div class="section-head"><h2>Similar vehicles</h2><a href="#/inventory?bodyType=${encodeURIComponent(c.bodyType)}">More ${escapeHtml(c.bodyType)}s →</a></div>
      ${carGrid(c.similar)}
    </section>
  </div>`;
}

detail.mount = () => {
  const recalc = async () => {
    const provinceCode = document.getElementById('d-prov').value;
    const frequency = document.getElementById('d-freq').value;
    const termMonths = +document.getElementById('d-term').value;
    const downPayment = +document.getElementById('d-down').value || 0;
    store.setPrefs({ province: provinceCode, frequency, termMonths });
    const deal = await api.quote({ carId: car.id, provinceCode, frequency, termMonths, downPayment, aprPercent: 7.99 });
    document.getElementById('d-breakdown').innerHTML = dealBreakdown(deal);
    document.querySelector('.payment-hero').outerHTML = paymentHero(deal);
  };
  ['d-prov', 'd-freq', 'd-term', 'd-down'].forEach((id) =>
    document.getElementById(id)?.addEventListener('change', recalc));
};
