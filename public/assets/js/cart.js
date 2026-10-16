import {
  api,
  esc,
  getCart,
  icon,
  initChrome,
  money,
  observeReveal,
  productCard,
  removeFromCart,
  setCartQty,
  wireQuickAdd,
} from './common.js';

initChrome();

const root = document.getElementById('cart-root');
let suggestions = null;

function thumb(line) {
  return line.image
    ? `<img src="${esc(line.image)}" alt="" loading="lazy" width="96" height="96">`
    : '<div class="media-fallback"><svg class="icon-star" aria-hidden="true" focusable="false"><use href="#i-star"/></svg></div>';
}

function progressHTML(quote) {
  if (!quote.free_shipping_from_cents) return '';
  const reached = quote.free_shipping_remaining_cents === 0;
  const text = reached
    ? `${icon('check', 'icon icon-sm')} Dein Versand ist kostenlos.`
    : `Noch <strong>${money(quote.free_shipping_remaining_cents)}</strong> bis zum kostenlosen Versand.`;
  return `
    <div class="progress ${reached ? 'is-done' : ''}">
      <p>${text}</p>
      <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(Math.min(100, (quote.subtotal_cents / quote.free_shipping_from_cents) * 100))}">
        <span data-progress></span>
      </div>
    </div>`;
}

function lineHTML(line, problem) {
  return `
    <li class="cart-item ${problem ? 'is-problem' : ''}" data-line="${line.id}">
      <div class="cart-thumb">${thumb(line)}</div>
      <div class="cart-info">
        <h3><a href="/produkt/${esc(line.slug)}">${esc(line.name)}</a></h3>
        ${line.legal_label ? `<span class="legal">${esc(line.legal_label)}</span>` : ''}
        <p class="unit">${money(line.unit_price_cents)} pro Stück</p>
        ${problem ? `<p class="problem">${esc(problem.message)}</p>` : ''}
        <div class="line-actions">
          <div class="qty" role="group" aria-label="Menge für ${esc(line.name)}">
            <button type="button" data-step="-1" data-id="${line.id}" aria-label="Weniger" ${line.qty <= 1 ? 'disabled' : ''}>−</button>
            <output>${line.qty}</output>
            <button type="button" data-step="1" data-id="${line.id}" aria-label="Mehr" ${line.qty >= 99 ? 'disabled' : ''}>+</button>
          </div>
          <button class="link-button" type="button" data-remove="${line.id}">Entfernen</button>
        </div>
      </div>
      <p class="line-total">${money(line.line_total_cents)}</p>
    </li>`;
}

function problemOnlyHTML(problem) {
  return `
    <li class="cart-item is-problem" data-line="${problem.id}">
      <div class="cart-thumb"><div class="media-fallback"><svg class="icon-star" aria-hidden="true" focusable="false"><use href="#i-star"/></svg></div></div>
      <div class="cart-info">
        <h3>${esc(problem.name ?? 'Artikel')}</h3>
        <p class="problem">${esc(problem.message)}</p>
        <div class="line-actions">
          <button class="link-button" type="button" data-remove="${problem.id}">Aus dem Warenkorb entfernen</button>
        </div>
      </div>
    </li>`;
}

function emptyHTML() {
  return `
    <div class="empty empty-wide">
      <h3>Dein Warenkorb ist noch leer</h3>
      <p>Stöbere im Shop – von Sticker bis CNC-Halter ist für jeden BMW etwas dabei.</p>
      <a class="btn btn-primary" href="/shop">Zum Shop</a>
    </div>
    <section class="related" aria-labelledby="sugg-title">
      <header class="section-head">
        <p class="eyebrow">Empfehlungen</p>
        <h2 id="sugg-title">Beliebt bei COLDSTART</h2>
      </header>
      <div class="product-grid" id="suggestions"></div>
    </section>`;
}

async function loadSuggestions(excludeIds) {
  try {
    if (!suggestions) ({ products: suggestions } = await api('/products?featured=1'));
    const list = suggestions.filter((p) => !excludeIds.includes(p.id)).slice(0, 4);
    const target = document.getElementById('suggestions');
    if (target && list.length) {
      target.innerHTML = list.map(productCard).join('');
      observeReveal(target);
      wireQuickAdd(target);
    } else if (target) {
      target.closest('section')?.setAttribute('hidden', '');
    }
  } catch {
    // Empfehlungen sind Zugabe: ohne sie bleibt der Warenkorb vollständig
  }
}

async function render() {
  const items = getCart();
  if (!items.length) {
    root.innerHTML = emptyHTML();
    loadSuggestions([]);
    return;
  }

  let quote;
  try {
    quote = await api('/cart/quote', { method: 'POST', body: { items } });
  } catch (error) {
    root.innerHTML = `<p class="form-error" role="alert">${esc(error.message)}</p>`;
    return;
  }

  const problems = new Map((quote.problems ?? []).map((p) => [p.id, p]));
  const lineIds = quote.lines.map((line) => line.id);
  const blocked = problems.size > 0 || !quote.shop_open;
  const count = quote.lines.reduce((sum, line) => sum + line.qty, 0);

  const lines = quote.lines.map((line) => lineHTML(line, problems.get(line.id))).join('');
  const problemLines = [...problems.values()].filter((p) => !lineIds.includes(p.id)).map(problemOnlyHTML).join('');

  root.innerHTML = `
    ${progressHTML(quote)}
    <div class="cart-layout">
      <div>
        <ul class="cart-items" aria-label="Artikel im Warenkorb">${lines}${problemLines}</ul>
        <p class="result-count">${count === 1 ? '1 Artikel' : `${count} Artikel`}</p>
        <p class="muted"><a href="/shop">← Weiter einkaufen</a></p>
      </div>

      <aside class="summary" aria-labelledby="summary-title">
        <h2 id="summary-title">Zusammenfassung</h2>
        <dl>
          <dt>Zwischensumme</dt><dd>${money(quote.subtotal_cents)}</dd>
          <dt>Versand</dt><dd>${quote.shipping_cents === 0 ? 'kostenlos' : money(quote.shipping_cents)}</dd>
        </dl>
        <dl class="total">
          <dt>Gesamt</dt><dd>${money(quote.total_cents)}</dd>
        </dl>
        <p class="vat">inkl. ${money(quote.vat_cents)} MwSt.</p>

        ${problems.size ? '<p class="notice notice-warn">Bitte entferne oder ändere die markierten Artikel, bevor du zur Kasse gehst.</p>' : ''}
        ${!quote.shop_open ? '<p class="notice notice-warn">Der Shop nimmt gerade keine Bestellungen an.</p>' : ''}

        <a class="btn btn-primary btn-lg btn-block" href="/kasse" ${blocked ? 'aria-disabled="true" tabindex="-1" data-blocked' : ''}>Zur Kasse</a>

        <ul class="trust-line">
          <li>${icon('return')} ${quote.return_days} Tage Rückgaberecht</li>
          <li>${icon('truck')} ${esc(quote.delivery_time_text)}</li>
          <li>${icon('bank')} Vorkasse per Überweisung</li>
        </ul>
      </aside>
    </div>

    <section class="related" aria-labelledby="sugg-title">
      <header class="section-head">
        <p class="eyebrow">Passt dazu</p>
        <h2 id="sugg-title">Vielleicht auch interessant</h2>
      </header>
      <div class="product-grid" id="suggestions"></div>
    </section>`;

  const bar = root.querySelector('[data-progress]');
  if (bar && quote.free_shipping_from_cents) {
    bar.style.width = `${Math.min(100, Math.round((quote.subtotal_cents / quote.free_shipping_from_cents) * 100))}%`;
  }
  loadSuggestions(lineIds);
}

root.addEventListener('click', (event) => {
  const step = event.target.closest('[data-step]');
  if (step) {
    const id = Number(step.dataset.id);
    const current = getCart().find((item) => item.id === id);
    if (current) setCartQty(id, current.qty + Number(step.dataset.step));
    return;
  }
  const remove = event.target.closest('[data-remove]');
  if (remove) removeFromCart(Number(remove.dataset.remove));
});

root.addEventListener('click', (event) => {
  const blocked = event.target.closest('[data-blocked]');
  if (blocked) event.preventDefault();
});

// Jede Änderung im Warenkorb (auch aus anderen Tabs) neu berechnen
window.addEventListener('cart:change', render);
render();
