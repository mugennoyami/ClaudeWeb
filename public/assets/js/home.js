import { api, esc, icon, initChrome, money, observeReveal, productCard, wireQuickAdd } from './common.js';

initChrome();

// Shop-Eckdaten aus den Einstellungen: Hero, Vertrauen und Kategorie-Zähler
async function loadShopInfo() {
  try {
    const shop = await api('/shop');
    const shipping = shop.free_shipping_from_cents
      ? `Versand gratis ab ${money(shop.free_shipping_from_cents)}`
      : `Versand ab ${money(shop.shipping_default_cents)}`;
    const trustList = document.getElementById('hero-trust');
    if (trustList) {
      trustList.innerHTML = [
        `<li class="chip">${icon('shield', 'icon icon-sm')} ABE &amp; Teilegutachten</li>`,
        `<li class="chip">${icon('truck', 'icon icon-sm')} ${esc(shipping)}</li>`,
        `<li class="chip">${icon('return', 'icon icon-sm')} ${shop.return_days} Tage Rückgabe</li>`,
      ].join('');
    }
    document.querySelectorAll('[data-bind="delivery"]').forEach((el) => (el.textContent = shop.delivery_time_text));
    document.querySelectorAll('[data-bind="returns"]').forEach((el) => (el.textContent = `${shop.return_days} Tage Rückgaberecht`));
    document.querySelectorAll('[data-bind="email"]').forEach((el) => {
      el.textContent = shop.contact_email;
      el.setAttribute('href', `mailto:${shop.contact_email}`);
    });
    shop.categories.forEach((category) => {
      const tile = document.querySelector(`#cat-tiles [data-cat="${CSS.escape(category.slug)}"]`);
      const count = tile?.querySelector('[data-count]');
      if (count && category.product_count > 0) {
        count.textContent = `${category.product_count} ${category.product_count === 1 ? 'Produkt' : 'Produkte'} →`;
      }
    });
  } catch {
    // Startseite funktioniert auch ohne Shop-Daten: die Standardtexte bleiben stehen
  }
}

async function loadHighlights() {
  const grid = document.getElementById('highlights');
  try {
    const { products } = await api('/products?featured=1');
    if (!products.length) {
      grid.innerHTML = `
        <div class="empty empty-wide">
          <h3>Der Shop füllt sich gerade</h3>
          <p>Neue CNC-Halter, 3D-Blenden und Sticker kommen bald. Schau bald wieder vorbei oder schreib uns, was du suchst.</p>
          <a class="btn btn-ghost" href="/shop">Zum Shop</a>
        </div>`;
      return;
    }
    grid.innerHTML = products.map(productCard).join('');
    observeReveal(grid);
  } catch {
    grid.innerHTML = `<p class="muted">Produkte können gerade nicht geladen werden. <a href="/shop">Zum Shop</a></p>`;
  }
}

function showFieldErrors(form, fields = {}) {
  form.querySelectorAll('[data-field]').forEach((wrapper) => {
    const name = wrapper.dataset.field;
    const message = fields[name];
    const hint = wrapper.querySelector('.field-error');
    wrapper.classList.toggle('has-error', Boolean(message));
    if (hint) {
      hint.hidden = !message;
      hint.textContent = message ?? '';
    }
  });
}

function wireContactForm() {
  const form = document.getElementById('contact-form');
  const errorBox = document.getElementById('contact-error');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.hidden = true;
    const data = Object.fromEntries(new FormData(form));
    const payload = {
      name: data.name,
      email: data.email,
      vehicle: data.vehicle,
      goal: data.goal,
      message: data.message,
      privacy: form.elements.privacy.checked,
    };
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Wird gesendet …';
    try {
      await api('/contact', { method: 'POST', body: payload });
      document.getElementById('contact-panel').innerHTML = `
        <div class="empty empty-solid">
          <h3>Danke, deine Anfrage ist da!</h3>
          <p>Wir melden uns in der Regel innerhalb von 1–2 Werktagen unter <strong>${esc(payload.email)}</strong>.</p>
          <a class="btn btn-ghost" href="/shop">Zwischendurch im Shop stöbern</a>
        </div>`;
    } catch (error) {
      showFieldErrors(form, error.fields ?? {});
      errorBox.textContent = error.message;
      errorBox.hidden = false;
      button.disabled = false;
      button.textContent = 'Anfrage senden';
    }
  });
  form.addEventListener('input', (event) => {
    const wrapper = event.target.closest('[data-field]');
    if (!wrapper) return;
    wrapper.classList.remove('has-error');
    const hint = wrapper.querySelector('.field-error');
    if (hint) hint.hidden = true;
  });
}

wireQuickAdd(document.getElementById('highlights'));
wireContactForm();
loadShopInfo();
loadHighlights();
