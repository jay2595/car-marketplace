import { api } from '../api.js';
import { store } from '../store.js';
import { carGrid } from '../components.js';

export async function saved() {
  const { saved: ids, recent, province, frequency, termMonths } = store.get();
  const fetchAll = async (list) => {
    const out = await Promise.all(list.map((id) => api.car(id).catch(() => null)));
    const cars = out.filter(Boolean);
    await Promise.all(cars.map(async (c) => {
      try {
        const d = await api.quote({ carId: c.id, provinceCode: province, frequency, termMonths, aprPercent: 7.99 });
        c.estimatedPayment = { amount: d.financing.paymentAmount, frequencyLabel: d.financing.frequencyLabel,
          termMonths: d.financing.termMonths, aprPercent: d.financing.aprPercent };
      } catch { /* leave unset */ }
    }));
    return cars;
  };

  const [savedCars, recentCars] = await Promise.all([
    fetchAll(ids),
    fetchAll(recent.filter((id) => !ids.includes(id)).slice(0, 4))
  ]);

  return `<div class="wrap section">
    <h1>Saved vehicles</h1>
    ${savedCars.length
      ? carGrid(savedCars)
      : `<div class="empty"><h3>You haven't saved anything yet</h3>
         <p>Tap the ♥ on any vehicle to keep it here. Saved vehicles stay on this device.</p>
         <a class="btn btn-primary" href="#/inventory">Browse inventory</a></div>`}

    ${recentCars.length ? `<section class="section">
      <div class="section-head"><h2>Recently viewed</h2></div>
      ${carGrid(recentCars)}
    </section>` : ''}
  </div>`;
}
