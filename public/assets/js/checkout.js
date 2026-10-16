import { api, clearCart, esc, getCart, icon, initChrome, money } from './common.js';

initChrome();

const root = document.getElementById('checkout-root');
const COUNTRY_NAMES = { DE: 'Deutschland', AT: 'Österreich', CH: 'Schweiz' };

const FIELDS = [
  { name: 'name', label: 'Vor- und Nachname', autocomplete: 'name', required: true, full: false },
  { name: 'email', label: 'E-Mail', type: 'email', autocomplete: 'email', required: true, full: false },
  { name: 'street', label: 'Straße und Hausnummer', autocomplete: 'street-address', required: true, full: true },
  { name: 'zip', label: 'PLZ', autocomplete: 'postal-code', required: true, full: false, inputmode: 'numeric' },
  { name: 'city', label: 'Ort', autocomplete: 'address-level2', required: true, full: false },
];

function fieldHTML(field, value = '') {
  return `
    <label class="field ${field.full ? 'field-full' : ''}" data-field="${field.name}">
      <span>${esc(field.label)}</span>
      <input name="${field.name}" type="${field.type ?? 'text'}" value="${esc(value)}"
        autocomplete="${field.autocomplete}" ${field.inputmode ? `inputmode="${field.inputmode}"` : ''}
        ${field.required ? 'required' : ''} maxlength="120">
      <small class="field-error" hidden></small>
    </label>`;
}

function showErrors(form, fields = {}) {
  form.querySelectorAll('[data-field]').forEach((wrapper) => {
    const message = fields[wrapper.dataset.field];
    const hint = wrapper.querySelector('.field-error');
    wrapper.classList.toggle('has-error', Boolean(message));
    if (hint) {
      hint.hidden = !message;
      hint.textContent = message ?? '';
    }
  });
}

function summaryItems(quote) {
  return quote.lines
    .map(
      (line) => `
        <li>
          <div class="mini-thumb">${line.image ? `<img src="${esc(line.image)}" alt="" width="52" height="52">` : '<div class="media-fallback"><svg class="icon-star" aria-hidden="true" focusable="false"><use href="#i-star"/></svg></div>'}</div>
          <div><strong>${esc(line.name)}</strong><br><span class="qty-label">${line.qty} × ${money(line.unit_price_cents)}</span></div>
          <span>${money(line.line_total_cents)}</span>
        </li>`
    )
    .join('');
}

function render(quote, shop) {
  const countries = shop.shipping_countries.map((code) => `<option value="${esc(code)}">${esc(COUNTRY_NAMES[code] ?? code)}</option>`).join('');
  const progress = quote.free_shipping_from_cents
    ? quote.free_shipping_remaining_cents === 0
      ? `${icon('check', 'icon icon-sm')} Versand ist für dich kostenlos.`
      : `Noch ${money(quote.free_shipping_remaining_cents)} bis zum kostenlosen Versand.`
    : '';

  root.innerHTML = `
    <ol class="steps-bar" aria-label="Fortschritt">
      <li class="is-done"><span>${icon('check', 'icon icon-sm')}</span> Warenkorb</li>
      <li class="is-current" aria-current="step"><span>2</span> Angaben</li>
      <li><span>3</span> Bestätigung</li>
    </ol>

    <div class="checkout-layout">
      <form class="form form-panel" id="checkout-form" novalidate>
        <h2>Lieferadresse</h2>
        <div class="form-grid">
          ${FIELDS.map((f) => fieldHTML(f)).join('')}
          <label class="field" data-field="country">
            <span>Land</span>
            <select name="country">${countries}</select>
            <small class="field-error" hidden></small>
          </label>
          <label class="field" data-field="phone">
            <span>Telefon <em class="field-hint">(optional, für Rückfragen)</em></span>
            <input name="phone" type="tel" autocomplete="tel" maxlength="30">
            <small class="field-error" hidden></small>
          </label>
          <label class="field field-full" data-field="note">
            <span>Hinweis <em class="field-hint">(optional)</em></span>
            <textarea name="note" rows="3" maxlength="500" placeholder="z. B. Fahrzeugdaten oder Wunsch zur Verpackung"></textarea>
            <small class="field-error" hidden></small>
          </label>
        </div>

        <h2>Zahlung</h2>
        <div class="payment-box">
          ${icon('bank')}
          <div>
            <h3>Vorkasse per Überweisung</h3>
            <p>Nach der Bestellung zeigen wir dir die Bankdaten und den Verwendungszweck. Sobald der Betrag eingegangen ist, geht deine Bestellung in die Bearbeitung.</p>
          </div>
        </div>

        <label class="check check-block" data-field="accept_terms">
          <input type="checkbox" name="accept_terms" required>
          <span>Ich habe die <a href="/agb" target="_blank" rel="noopener">AGB</a> und die <a href="/widerruf" target="_blank" rel="noopener">Widerrufsbelehrung</a> gelesen und akzeptiere sie.</span>
          <small class="field-error" hidden></small>
        </label>

        <div id="checkout-error" hidden></div>

        <div class="checkout-actions">
          <button class="btn btn-primary btn-lg btn-block" type="submit">Verbindlich bestellen · ${money(quote.total_cents)}</button>
          <p class="form-note">Mit deiner Bestellung kommt noch kein Vertrag zustande, bis wir die Bestellung bestätigen. Deine Daten nutzen wir nur für die Abwicklung.</p>
        </div>
      </form>

      <aside class="summary" aria-labelledby="sum-title">
        <h2 id="sum-title">Deine Bestellung</h2>
        <ul class="summary-items">${summaryItems(quote)}</ul>
        <dl>
          <dt>Zwischensumme</dt><dd>${money(quote.subtotal_cents)}</dd>
          <dt>Versand</dt><dd>${quote.shipping_cents === 0 ? 'kostenlos' : money(quote.shipping_cents)}</dd>
        </dl>
        <dl class="total"><dt>Gesamt</dt><dd>${money(quote.total_cents)}</dd></dl>
        <p class="vat">inkl. ${money(quote.vat_cents)} MwSt.</p>
        ${progress ? `<p class="muted">${progress}</p>` : ''}
        <ul class="trust-line">
          <li>${icon('return')} ${quote.return_days} Tage Rückgaberecht</li>
          <li>${icon('truck')} ${esc(quote.delivery_time_text)}</li>
          <li>${icon('shield')} Deine Daten bleiben bei uns</li>
        </ul>
      </aside>
    </div>`;

  wireForm(quote);
}

function wireForm(quote) {
  const form = document.getElementById('checkout-form');
  const errorBox = document.getElementById('checkout-error');

  form.addEventListener('input', (event) => {
    const wrapper = event.target.closest('[data-field]');
    if (!wrapper) return;
    wrapper.classList.remove('has-error');
    const hint = wrapper.querySelector('.field-error');
    if (hint) hint.hidden = true;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.hidden = true;
    errorBox.innerHTML = '';
    const data = Object.fromEntries(new FormData(form));
    const customer = {
      name: data.name,
      email: data.email,
      street: data.street,
      zip: data.zip,
      city: data.city,
      country: data.country,
      phone: data.phone,
      note: data.note,
      accept_terms: form.elements.accept_terms.checked,
    };

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Bestellung wird gesendet …';
    try {
      const items = getCart().map(({ id, qty }) => ({ id, qty }));
      const result = await api('/orders', { method: 'POST', body: { items, customer } });
      clearCart();
      window.location.href = result.redirect;
    } catch (error) {
      showErrors(form, error.fields ?? {});
      if (error.problems?.length) {
        errorBox.innerHTML = `
          <div class="form-error" role="alert">
            <p><strong>${esc(error.message)}</strong></p>
            <ul>${error.problems.map((p) => `<li>${esc(p.name ?? 'Artikel')}: ${esc(p.message)}</li>`).join('')}</ul>
            <p><a href="/warenkorb">Zurück zum Warenkorb</a></p>
          </div>`;
      } else {
        errorBox.innerHTML = `<p class="form-error" role="alert">${esc(error.message)}</p>`;
      }
      errorBox.hidden = false;
      button.disabled = false;
      button.textContent = `Verbindlich bestellen · ${money(quote.total_cents)}`;
      if (!error.fields || Object.keys(error.fields).length === 0) errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      else form.querySelector('.has-error input, .has-error select, .has-error textarea')?.focus();
    }
  });
}

async function init() {
  const items = getCart();
  if (!items.length) {
    root.innerHTML = `
      <div class="empty empty-wide">
        <h3>Dein Warenkorb ist leer</h3>
        <p>Füge zuerst ein paar Teile hinzu, dann geht es hier weiter.</p>
        <a class="btn btn-primary" href="/shop">Zum Shop</a>
      </div>`;
    return;
  }
  try {
    const [quote, shop] = await Promise.all([
      api('/cart/quote', { method: 'POST', body: { items } }),
      api('/shop'),
    ]);
    if (quote.problems.length || !quote.shop_open || !quote.lines.length) {
      window.location.replace('/warenkorb');
      return;
    }
    render(quote, shop);
  } catch (error) {
    root.innerHTML = `<p class="form-error" role="alert">${esc(error.message)} <a href="/warenkorb">Zurück zum Warenkorb</a></p>`;
  }
}

init();
