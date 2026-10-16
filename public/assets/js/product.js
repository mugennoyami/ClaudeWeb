import {
  addToCart,
  api,
  esc,
  icon,
  initChrome,
  money,
  observeReveal,
  productCard,
  productMedia,
  legalChip,
  priceHTML,
  stockLine,
  toast,
  wireQuickAdd,
} from './common.js';

initChrome();

const root = document.getElementById('product');
const slug = decodeURIComponent(location.pathname.split('/').filter(Boolean)[1] ?? '');

let product = null;
let shop = null;
let qty = 1;

function paragraphs(text) {
  return String(text ?? '')
    .split(/\n{2,}|\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${esc(line)}</p>`)
    .join('');
}

function shippingText() {
  const threshold = shop.free_shipping_from_cents;
  const own = product.shipping_cents;
  const base = own ?? shop.shipping_default_cents;
  const lines = [];
  lines.push(base === 0 ? 'Versand kostenlos' : `Versand ${money(base)}`);
  if (threshold && base > 0) lines.push(`gratis ab ${money(threshold)} Warenkorb`);
  return lines.join(' · ');
}

function renderNotFound() {
  root.innerHTML = `
    <div class="empty empty-wide">
      <h3>Dieses Produkt gibt es leider nicht (mehr)</h3>
      <p>Vielleicht ist es ausverkauft oder wurde verschoben. Im Shop findest du alles Aktuelle.</p>
      <a class="btn btn-primary" href="/shop">Zum Shop</a>
    </div>`;
}

function render() {
  const p = product;
  const maxQty = p.available ? (p.low_stock ? p.stock_left : 99) : 0;
  qty = Math.min(Math.max(1, qty), Math.max(1, maxQty));
  const categoryCrumb = p.category
    ? `<li><a href="/shop?category=${esc(p.category.slug)}">${esc(p.category.name)}</a></li>`
    : '';
  const images = p.images.length ? p.images : [];
  const mainImage = images.length
    ? `<img id="main-image" src="${esc(images[0].url)}" alt="${esc(p.name)}" width="800" height="800">`
    : `<div id="main-image-wrap" class="media-fallback"><svg class="icon-star" aria-hidden="true" focusable="false"><use href="#i-star"/></svg></div>`;
  const thumbs = images.length > 1
    ? `<ul class="gallery-thumbs" aria-label="Weitere Bilder">${images
        .map(
          (img, index) => `<li><button type="button" data-thumb="${index}" aria-pressed="${index === 0}" aria-label="Bild ${index + 1} anzeigen"><img src="${esc(img.url)}" alt="" loading="lazy"></button></li>`
        )
        .join('')}</ul>`
    : '';

  const stockMessage = !p.available
    ? `<p class="notice notice-warn">Gerade ausverkauft. <a href="/#kontakt">Schreib uns</a>, wenn du informiert werden möchtest.</p>`
    : p.low_stock
      ? `<p class="notice notice-warn"><strong>Nur noch ${p.stock_left} auf Lager.</strong> Sichere dir jetzt deins.</p>`
      : `<p class="stock stock-ok">${icon('check', 'icon icon-sm')} Auf Lager · ${esc(shop.delivery_time_text)}</p>`;

  const trackNote = p.legal === 'track'
    ? `<div class="track-note">${icon('warn', 'icon icon-sm')}<p>Dieses Teil ist für die Rennstrecke gedacht. Es ist nicht ABE-geprüft und nicht für den öffentlichen Straßenverkehr bestimmt.</p></div>`
    : '';

  const legalText = {
    abe: 'ABE vorhanden. Eintragung je nach Fahrzeug bei der Prüforganisation.',
    gutachten: 'Mit Teilegutachten. Eintragung je nach Fahrzeug bei der Prüforganisation.',
    track: 'Nur für die Rennstrecke.',
    keine: '',
  }[p.legal] ?? '';

  const specs = [
    p.sku ? `<dt>Artikelnummer</dt><dd>${esc(p.sku)}</dd>` : '',
    p.category ? `<dt>Kategorie</dt><dd>${esc(p.category.name)}</dd>` : '',
    `<dt>Versand</dt><dd>${esc(shippingText())}</dd>`,
    p.legal_label ? `<dt>Zulassung</dt><dd>${esc(p.legal_label)}</dd>` : '',
  ].join('');

  root.innerHTML = `
    <ol class="crumbs">
      <li><a href="/">Start</a></li>
      <li><a href="/shop">Shop</a></li>
      ${categoryCrumb}
      <li aria-current="page">${esc(p.name)}</li>
    </ol>

    <div class="product-layout">
      <section class="gallery" aria-label="Produktbilder">
        <div class="gallery-main">${mainImage}</div>
        ${thumbs}
      </section>

      <section class="buy-box" aria-labelledby="product-title">
        <div class="buy-meta">
          ${p.badge ? `<span class="badge badge-${esc(p.badge.toLowerCase().replace(/[^a-z]/g, ''))}">${esc(p.badge)}</span>` : ''}
          ${legalChip(p)}
        </div>
        <h1 id="product-title">${esc(p.name)}</h1>

        <p class="buy-price">
          ${p.compare_at_cents ? `<s class="price-old">${money(p.compare_at_cents)}</s>` : ''}
          <span class="price-now">${money(p.price_cents)}</span>
          ${p.discount_percent > 0 ? `<span class="chip chip-sale">Du sparst ${p.discount_percent} %</span>` : ''}
        </p>
        <p class="price-note">inkl. MwSt. · ${esc(shippingText())}</p>

        ${stockMessage}

        <div class="buy-actions">
          <div class="qty-row">
            <div class="qty" role="group" aria-label="Menge">
              <button type="button" data-qty="-1" aria-label="Weniger" ${!p.available || qty <= 1 ? 'disabled' : ''}>−</button>
              <output id="qty" aria-live="polite">${qty}</output>
              <button type="button" data-qty="1" aria-label="Mehr" ${!p.available || qty >= maxQty ? 'disabled' : ''}>+</button>
            </div>
            <button class="btn btn-primary btn-lg" type="button" id="add-btn" data-add-product ${p.available ? '' : 'disabled'}>
              ${p.available ? 'In den Warenkorb' : 'Ausverkauft'}
            </button>
          </div>
          <div id="added-note" class="added-note" role="status" hidden></div>
        </div>

        <ul class="assurance">
          <li>${icon('truck')}<span><strong>Versand:</strong> ${esc(shop.delivery_time_text)}.</span></li>
          <li>${icon('return')}<span><strong>Rückgabe:</strong> ${shop.return_days} Tage Rückgaberecht.</span></li>
          <li>${icon('bank')}<span><strong>Zahlung:</strong> Vorkasse per Überweisung. Bankdaten nach der Bestellung.</span></li>
          ${legalText ? `<li>${icon('shield')}<span>${esc(legalText)}</span></li>` : ''}
        </ul>

        ${trackNote}

        ${p.short_desc ? `<p class="prose"><strong>${esc(p.short_desc)}</strong></p>` : ''}
        <div class="prose">${paragraphs(p.description)}</div>

        <div class="prose-block">
          <dl class="specs">${specs}</dl>
        </div>
      </section>
    </div>

    <section class="related" id="related" aria-labelledby="related-title" ${p.related.length ? '' : 'hidden'}>
      <header class="section-head reveal">
        <p class="eyebrow">Passt dazu</p>
        <h2 id="related-title">Mehr aus dieser Kategorie</h2>
      </header>
      <div class="product-grid">${p.related.map(productCard).join('')}</div>
    </section>

    <div class="sticky-buy" id="sticky-buy">
      <div>
        <p class="price"><span class="price-now">${money(p.price_cents)}</span></p>
        <span class="stock ${p.low_stock ? 'stock-low' : 'stock-ok'}">${p.available ? (p.low_stock ? `Nur noch ${p.stock_left}` : 'Auf Lager') : 'Ausverkauft'}</span>
      </div>
      <button class="btn btn-primary" type="button" data-add-product ${p.available ? '' : 'disabled'}>${p.available ? 'In den Warenkorb' : 'Ausverkauft'}</button>
    </div>`;

  document.title = `${p.name} – COLDSTART`;
  observeReveal(root);
  wireQuickAdd(document.getElementById('related'));
}

// Ereignisse über die ganze Produktseite (Mengen, Bilder, Warenkorb)
root.addEventListener('click', (event) => {
  const qtyButton = event.target.closest('[data-qty]');
  if (qtyButton) {
    const maxQty = product.low_stock ? product.stock_left : 99;
    qty = Math.min(maxQty, Math.max(1, qty + Number(qtyButton.dataset.qty)));
    document.getElementById('qty').textContent = String(qty);
    root.querySelectorAll('[data-qty]').forEach((btn) => {
      btn.disabled = btn.dataset.qty === '-1' ? qty <= 1 : qty >= maxQty;
    });
    return;
  }

  const thumb = event.target.closest('[data-thumb]');
  if (thumb) {
    const index = Number(thumb.dataset.thumb);
    const image = product.images[index];
    const main = document.getElementById('main-image');
    if (main && image) main.src = image.url;
    root.querySelectorAll('[data-thumb]').forEach((btn) => btn.setAttribute('aria-pressed', String(btn === thumb)));
    return;
  }

  if (event.target.closest('[data-add-product]')) {
    addToCart(product.id, qty);
    toast(`${product.name} ist im Warenkorb.`, { action: { href: '/warenkorb', label: 'Zum Warenkorb' } });
    const note = document.getElementById('added-note');
    note.hidden = false;
    note.innerHTML = `${icon('check', 'icon icon-sm')} <span>${qty} × im Warenkorb.</span> <a href="/warenkorb">Zum Warenkorb</a> <a href="/shop">Weiter stöbern</a>`;
  }
});

async function init() {
  if (!slug) return renderNotFound();
  try {
    const [loadedProduct, loadedShop] = await Promise.all([
      api(`/products/${encodeURIComponent(slug)}`),
      api('/shop'),
    ]);
    product = loadedProduct;
    shop = loadedShop;
    render();
  } catch (error) {
    if (error.status === 404) renderNotFound();
    else root.innerHTML = '<p class="muted">Das Produkt kann gerade nicht geladen werden. Bitte lade die Seite neu.</p>';
  }
}

init();
