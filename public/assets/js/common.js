// Gemeinsame Bausteine für alle Seiten: Kopf- und Fußzeile, API, Warenkorb, Benachrichtigungen.

const SPRITE = `
<svg width="0" height="0" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="chrome" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#8e99a8"/><stop offset="1" stop-color="#2a303a"/>
    </linearGradient>
  </defs>
  <symbol id="i-star" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" d="M12 1 14.2 9.8 23 12 14.2 14.2 12 23 9.8 14.2 1 12 9.8 9.8Z"/></symbol>
  <symbol id="i-cart" viewBox="0 0 24 24"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="20.5" r="1.2"/><circle cx="17" cy="20.5" r="1.2"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></symbol>
  <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>
  <symbol id="i-truck" viewBox="0 0 24 24"><path d="M2 6h12v10H2zM14 10h4l3 3v3h-7z"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></symbol>
  <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5L15.5 10"/></symbol>
  <symbol id="i-return" viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></symbol>
  <symbol id="i-bank" viewBox="0 0 24 24"><path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/></symbol>
  <symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5L12 13l8.5-6.5"/></symbol>
  <symbol id="i-trash" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13"/></symbol>
  <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
  <symbol id="i-minus" viewBox="0 0 24 24"><path d="M5 12h14"/></symbol>
  <symbol id="i-edit" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></symbol>
  <symbol id="i-image" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 9"/></symbol>
  <symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>
  <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/></symbol>
  <symbol id="i-spring" viewBox="0 0 24 24"><path d="M12 2v3M6 5l12 3-12 3 12 3-12 3 12 3M12 19v3"/></symbol>
  <symbol id="i-wheel" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3.5v6M12 14.5v6M3.5 12h6M14.5 12h6"/></symbol>
  <symbol id="i-wind" viewBox="0 0 24 24"><path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h7"/></symbol>
  <symbol id="i-brake" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M4.6 8.4a9 9 0 0 1 4-3.6"/></symbol>
  <symbol id="i-light" viewBox="0 0 24 24"><path d="M4 9.5C4 7 5.5 5.5 8 5.5h2v11H8C5.5 16.5 4 15 4 12.5z"/><path d="M14 8.5l6-2.5M14 12h6M14 15.5l6 2.5"/></symbol>
  <symbol id="i-papers" viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 14l2 2 3.5-3.5"/></symbol>
  <symbol id="i-gear" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></symbol>
  <symbol id="i-cube" viewBox="0 0 24 24"><path d="M12 2.8l8 4.6v9.2l-8 4.6-8-4.6V7.4z"/><path d="M4 7.4l8 4.6 8-4.6M12 12v9.2"/></symbol>
  <symbol id="i-drop" viewBox="0 0 24 24"><path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z"/><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5"/></symbol>
  <symbol id="i-warn" viewBox="0 0 24 24"><path d="M12 3L2 20h20z"/><path d="M12 10v4M12 17.5v.5"/></symbol>
  <symbol id="i-grid" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></symbol>
  <symbol id="i-box" viewBox="0 0 24 24"><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/></symbol>
  <symbol id="i-message" viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></symbol>
  <symbol id="i-chart" viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></symbol>
  <symbol id="i-logout" viewBox="0 0 24 24"><path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/></symbol>
  <symbol id="i-eye" viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></symbol>
  <symbol id="i-copy" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></symbol>
  <symbol id="i-settings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></symbol>
</svg>`;

const HEADER = `
<header class="site-header" id="header">
  <div class="container nav">
    <a class="logo" href="/" aria-label="COLDSTART – zur Startseite">
      <img class="logo-img" src="/assets/img/logo-coldstart.webp" alt="COLDSTART" width="1100" height="550">
    </a>
    <nav class="nav-links" id="nav" aria-label="Hauptnavigation">
      <a href="/#strasse">Straße</a>
      <a href="/#track">Track</a>
      <a href="/#modelle">Modelle</a>
      <a href="/katalog">Teileatlas</a>
      <a href="/shop">Shop</a>
      <a href="/#kontakt">Kontakt</a>
    </nav>
    <a class="cart-link" href="/warenkorb" aria-label="Warenkorb">
      <svg class="icon" aria-hidden="true"><use href="#i-cart"/></svg>
      <span class="cart-count" data-cart-count hidden>0</span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav" aria-label="Menü öffnen">
      <span></span><span></span>
    </button>
  </div>
</header>`;

const FOOTER = `
<footer class="site-footer">
  <div class="container footer-grid">
    <div>
      <a class="logo" href="/" aria-label="COLDSTART – nach oben">
        <img class="logo-img" src="/assets/img/logo-coldstart.webp" alt="COLDSTART" width="1100" height="550">
      </a>
      <p class="footer-claim">Tuning für BMW E36 &amp; E46. Straßenlegal mit Gutachten, kompromisslos auf der Strecke.</p>
    </div>
    <div class="footer-col">
      <h4>Shop</h4>
      <ul>
        <li><a href="/shop">Alle Produkte</a></li>
        <li><a href="/shop?category=tuning">Tuning-Teile</a></li>
        <li><a href="/shop?category=track">Track-Teile</a></li>
        <li><a href="/shop?category=cnc">CNC-Teile</a></li>
        <li><a href="/shop?category=3d-druck">3D-Druck</a></li>
        <li><a href="/shop?category=sticker">Sticker &amp; Merch</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Service</h4>
      <ul>
        <li><a href="/katalog">BMW Teileatlas</a></li>
        <li><a href="/versand">Versand &amp; Zahlung</a></li>
        <li><a href="/widerruf">Widerruf &amp; Rückgabe</a></li>
        <li><a href="/agb">AGB</a></li>
        <li><a href="/#kontakt">Kontakt</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Rechtliches</h4>
      <ul>
        <li><a href="/impressum">Impressum</a></li>
        <li><a href="/datenschutz">Datenschutz</a></li>
      </ul>
    </div>
    <div class="footer-bottom">
      <p>Alle Angaben ohne Gewähr. Track-Teile sind nicht für den öffentlichen Straßenverkehr zugelassen. Änderungen am Fahrzeug müssen vor der Nutzung im Straßenverkehr eingetragen bzw. abgenommen sein.</p>
      <p class="copy">© 2026 COLDSTART</p>
    </div>
  </div>
</footer>`;

const fragment = (html) => {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content;
};

// Escapen für alle Werte, die in HTML-Strings landen. Nutzereingaben nie ungeprüft einsetzen.
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
export const money = (cents) => euro.format((cents ?? 0) / 100);

export const icon = (name, cls = 'icon') => `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const error = new Error(data?.error || 'Da ist etwas schiefgelaufen. Bitte versuche es erneut.');
    error.status = res.status;
    error.fields = data?.fields ?? null;
    error.problems = data?.problems ?? null;
    throw error;
  }
  return data;
}

// Gemeinsame Blöcke einhängen und Navigation/Scroll-Verhalten aktivieren
export function initChrome() {
  document.body.insertAdjacentHTML('afterbegin', SPRITE);
  const skip = document.createElement('a');
  skip.className = 'skip-link';
  skip.href = '#main';
  skip.textContent = 'Zum Inhalt springen';
  document.body.prepend(skip);

  document.getElementById('site-header')?.replaceWith(fragment(HEADER));
  document.getElementById('site-footer')?.replaceWith(fragment(FOOTER));

  const header = document.getElementById('header');
  const nav = document.getElementById('nav');
  const toggle = document.querySelector('.nav-toggle');

  const onScroll = () => header?.classList.toggle('scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const setMenu = (open) => {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
  };
  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenu(false);
  });

  // Aktiven Menüpunkt markieren
  const path = window.location.pathname;
  nav.querySelectorAll('a').forEach((link) => {
    const target = link.getAttribute('href');
    if (target === '/shop' && path.startsWith('/shop')) link.setAttribute('aria-current', 'page');
  });

  updateCartBadge();
  observeReveal(document);
}

// Elemente blenden sich beim Scrollen ein (auch für später eingefügte Karten)
let revealObserver = null;
export function observeReveal(root = document) {
  const items = root.querySelectorAll('.reveal:not(.is-visible)');
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  revealObserver ??= new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  items.forEach((el) => revealObserver.observe(el));
}

/* ---------- Warenkorb (liegt im Browser des Kunden) ---------- */

const CART_KEY = 'coldstart-cart';
const MAX_QTY = 99;

export function getCart() {
  try {
    const items = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    if (!Array.isArray(items)) return [];
    return items
      .filter((item) => Number.isInteger(item?.id) && Number.isInteger(item?.qty) && item.qty > 0)
      .slice(0, 30)
      .map((item) => ({ id: item.id, qty: Math.min(MAX_QTY, item.qty) }));
  } catch {
    return [];
  }
}

function saveCart(items) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    // Privater Modus o. Ä.: Warenkorb bleibt dann nur für die aktuelle Seite erhalten
  }
  updateCartBadge();
  window.dispatchEvent(new CustomEvent('cart:change'));
}

export function addToCart(id, qty = 1) {
  const items = getCart();
  const row = items.find((item) => item.id === id);
  if (row) row.qty = Math.min(MAX_QTY, row.qty + qty);
  else items.push({ id, qty: Math.min(MAX_QTY, qty) });
  saveCart(items);
}

export function setCartQty(id, qty) {
  const items = getCart().map((item) => (item.id === id ? { ...item, qty: Math.min(MAX_QTY, Math.max(1, qty)) } : item));
  saveCart(items);
}

export function removeFromCart(id) {
  saveCart(getCart().filter((item) => item.id !== id));
}

export function clearCart() {
  saveCart([]);
}

export function cartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

export function updateCartBadge() {
  const count = cartCount();
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.textContent = String(count);
    el.hidden = count === 0;
  });
  const link = document.querySelector('.cart-link');
  link?.setAttribute('aria-label', count ? `Warenkorb, ${count} Artikel` : 'Warenkorb, leer');
}

window.addEventListener('storage', (event) => {
  if (event.key === CART_KEY) {
    updateCartBadge();
    window.dispatchEvent(new CustomEvent('cart:change'));
  }
});

/* ---------- Benachrichtigungen ---------- */

export function toast(message, { action = null, error = false } = {}) {
  let container = document.getElementById('toasts');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toasts';
    container.className = 'toasts';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast${error ? ' toast-error' : ''}`;
  el.innerHTML = `<span class="toast-text">${esc(message)}</span>${
    action ? `<a href="${esc(action.href)}">${esc(action.label)}</a>` : ''
  }`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 5200);
}

/* ---------- Produktdarstellung ---------- */

export function productMedia(product) {
  const image = product.images?.[0]?.url;
  if (image) return `<img src="${esc(image)}" alt="${esc(product.name)}" loading="lazy" width="600" height="600">`;
  return `<div class="media-fallback"><svg class="icon-star" aria-hidden="true" focusable="false"><use href="#i-star"/></svg></div>`;
}

export function priceHTML(product) {
  const old = product.compare_at_cents ? `<s class="price-old">${money(product.compare_at_cents)}</s>` : '';
  return `<p class="price">${old}<span class="price-now">${money(product.price_cents)}</span></p>`;
}

export function legalChip(product) {
  return product.legal_label ? `<span class="legal legal-${esc(product.legal)}">${esc(product.legal_label)}</span>` : '';
}

export function stockLine(product) {
  if (!product.available) return '<span class="stock stock-out">Ausverkauft</span>';
  if (product.low_stock) return `<span class="stock stock-low">Nur noch ${esc(product.stock_left)} da</span>`;
  return '';
}

export function badgeKey(badge) {
  return String(badge).toLowerCase().replace(/[^a-z]/g, '');
}

export function productCard(product) {
  const badges = [
    product.badge ? `<span class="badge badge-${esc(badgeKey(product.badge))}">${esc(product.badge)}</span>` : '',
    product.discount_percent > 0 ? `<span class="chip chip-sale">−${product.discount_percent} %</span>` : '',
  ].join('');
  const addButton = product.available
    ? `<button class="btn btn-primary btn-sm" type="button" data-add="${product.id}">In den Warenkorb</button>`
    : '<button class="btn btn-ghost btn-sm" type="button" disabled>Ausverkauft</button>';

  return `
    <article class="product-card reveal">
      <a class="product-media" href="/produkt/${esc(product.slug)}" tabindex="-1" aria-hidden="true">
        ${productMedia(product)}${badges}
      </a>
      <div class="product-body">
        <p class="product-cat">${esc(product.category?.name ?? '')}</p>
        <h3 class="product-name"><a href="/produkt/${esc(product.slug)}">${esc(product.name)}</a></h3>
        <p class="product-desc">${esc(product.short_desc)}</p>
        <div class="product-meta">${legalChip(product)}${stockLine(product)}</div>
        <div class="product-foot">
          ${priceHTML(product)}
          ${addButton}
        </div>
      </div>
    </article>`;
}

// Schnell-in-den-Warenkorb für Buttons in Karten (Event-Delegation)
export function wireQuickAdd(root) {
  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-add]');
    if (!button) return;
    const id = Number(button.dataset.add);
    addToCart(id, 1);
    const name = button.closest('.product-card')?.querySelector('.product-name')?.textContent ?? 'Produkt';
    toast(`${name} ist im Warenkorb.`, { action: { href: '/warenkorb', label: 'Zum Warenkorb' } });
  });
}
