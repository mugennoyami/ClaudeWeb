import { api, esc, icon, money, toast } from './common.js';

// Admin-Bereich: Anmeldung, Übersicht, Produkte, Kategorien, Bestellungen, Nachrichten, Einstellungen.
// Alle Inhalte laufen über esc(), weil Bestellungen und Nachrichten von Kunden stammen.

const root = document.getElementById('admin-root');
const STATUS_LABELS = {
  neu: 'Neu',
  in_bearbeitung: 'In Bearbeitung',
  versandt: 'Versandt',
  abgeschlossen: 'Abgeschlossen',
  storniert: 'Storniert',
};
const PAYMENT_LABELS = { offen: 'Zahlung offen', bezahlt: 'Bezahlt' };
const LEGAL_OPTIONS = [
  ['keine', 'Keine Angabe'],
  ['abe', 'ABE vorhanden'],
  ['gutachten', 'Teilegutachten'],
  ['track', 'Nur Rennstrecke'],
];
const BADGE_OPTIONS = ['', 'Neu', 'Limitiert', 'Bestseller', 'Drop'];
const NAV = [
  ['dashboard', 'Übersicht', 'chart', '#/'],
  ['produkte', 'Produkte', 'box', '#/produkte'],
  ['kategorien', 'Kategorien', 'grid', '#/kategorien'],
  ['bestellungen', 'Bestellungen', 'cart', '#/bestellungen'],
  ['nachrichten', 'Nachrichten', 'message', '#/nachrichten'],
  ['einstellungen', 'Einstellungen', 'settings', '#/einstellungen'],
];

let adminEmail = '';
let categories = [];

const fmtDate = (iso) => new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
const euroInput = (cents) => (cents === null || cents === undefined ? '' : (cents / 100).toFixed(2).replace('.', ','));
const fallbackThumb = '<div class="media-fallback"><svg class="icon-star" aria-hidden="true" focusable="false"><use href="#i-star"/></svg></div>';
const statusChip = (value, labels, prefix = '') => `<span class="status status-${esc(prefix + value)}">${esc(labels[value] ?? value)}</span>`;

function layout(active, { title, subtitle = '', actions = '', body = '' }) {
  const links = NAV.map(
    ([key, label, iconName, href]) =>
      `<a href="${href}" ${key === active ? 'aria-current="page"' : ''}>${icon(iconName, 'icon icon-sm')} ${esc(label)}</a>`
  ).join('');
  const mobile = NAV.map(
    ([key, label, , href]) => `<a href="${href}" ${key === active ? 'aria-current="page"' : ''}>${esc(label)}</a>`
  ).join('');
  return `
    <div class="admin-shell">
      <aside class="admin-side">
        <img class="logo-img" src="/assets/img/logo-coldstart.webp" alt="COLDSTART" width="1100" height="550">
        <nav aria-label="Admin-Bereich">${links}</nav>
        <span class="spacer"></span>
        <a href="/shop" target="_blank" rel="noopener">${icon('eye', 'icon icon-sm')} Shop ansehen</a>
        <button type="button" data-action="logout">${icon('logout', 'icon icon-sm')} Abmelden</button>
        <p class="muted admin-email">${esc(adminEmail)}</p>
      </aside>
      <main class="admin-main" id="admin-main">
        <nav class="admin-mobile-nav" aria-label="Admin-Bereich mobil">${mobile}</nav>
        <header class="admin-head">
          <div>
            <h1>${esc(title)}</h1>
            ${subtitle ? `<p>${esc(subtitle)}</p>` : ''}
          </div>
          <div class="admin-head-actions">${actions}</div>
        </header>
        ${body}
      </main>
    </div>`;
}

async function loadCategories() {
  const data = await api('/admin/categories');
  categories = data.categories;
  return categories;
}

function categoryOptions(selectedId) {
  return [
    '<option value="">– keine –</option>',
    ...categories.map((c) => `<option value="${c.id}" ${String(c.id) === String(selectedId) ? 'selected' : ''}>${esc(c.name)}</option>`),
  ].join('');
}

/* ---------- Anmeldung ---------- */

function renderLogin(message = '', email = '') {
  root.innerHTML = `
    <div class="admin-login">
      <div class="admin-login-box">
        <img class="logo-img" src="/assets/img/logo-coldstart.webp" alt="COLDSTART" width="1100" height="550">
        <h1>Admin-Bereich</h1>
        <p>Melde dich an, um Produkte, Bestellungen und Einstellungen zu verwalten.</p>
        <form class="form" id="login-form" novalidate>
          <label class="field"><span>E-Mail</span><input name="email" type="email" required autocomplete="username" value="${esc(email)}"></label>
          <label class="field"><span>Passwort</span><input name="password" type="password" required autocomplete="current-password"></label>
          ${message ? `<p class="form-error" role="alert">${esc(message)}</p>` : ''}
          <button class="btn btn-primary btn-lg btn-block" type="submit">Anmelden</button>
        </form>
      </div>
    </div>`;
}

/* ---------- Übersicht ---------- */

const stat = (value, label, alert = false) =>
  `<div class="stat ${alert ? 'is-alert' : ''}"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;

async function viewDashboard() {
  const d = await api('/admin/dashboard');
  const low = d.low_stock.length
    ? `<ul class="item-list">${d.low_stock
        .map((p) => `<li><a href="#/produkte/${p.id}">${esc(p.name)}</a><span class="status status-warn">Noch ${p.stock} Stück</span></li>`)
        .join('')}</ul>`
    : '<p class="notice notice-ok">Alles gut – kein Produkt ist knapp.</p>';
  root.innerHTML = layout('dashboard', {
    title: 'Übersicht',
    subtitle: 'Was heute ansteht.',
    actions: `<a class="btn btn-track btn-sm" href="#/produkte/neu">${icon('plus', 'icon icon-sm')} Neues Produkt</a>`,
    body: `
      <div class="stat-grid">
        ${stat(d.orders_new, 'Neue Bestellungen', d.orders_new > 0)}
        ${stat(d.orders_open, 'Offene Bestellungen')}
        ${stat(money(d.revenue_paid_cents), 'Umsatz bezahlt')}
        ${stat(money(d.revenue_open_cents), 'Zahlung ausstehend', d.revenue_open_cents > 0)}
        ${stat(d.messages_open, 'Offene Nachrichten', d.messages_open > 0)}
        ${stat(d.products_active, 'Aktive Produkte')}
      </div>
      <div class="two-col">
        <section class="panel">
          <h2>Niedriger Bestand</h2>
          ${low}
        </section>
        <section class="panel">
          <h2>Als Nächstes</h2>
          <ul class="stack">
            <li><a href="#/bestellungen?status=neu">Neue Bestellungen prüfen</a></li>
            <li><a href="#/nachrichten">Offene Kontaktanfragen beantworten</a></li>
            <li><a href="#/produkte/neu">Neues Produkt anlegen</a></li>
            <li><a href="#/einstellungen">Versandkosten und Bankdaten prüfen</a></li>
          </ul>
        </section>
      </div>`,
  });
}

/* ---------- Produkte ---------- */

async function viewProducts(params) {
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const query = new URLSearchParams({ q, category }).toString();
  const [{ products }] = await Promise.all([api(`/admin/products?${query}`), loadCategories()]);

  const rows = products
    .map(
      (p) => `
      <tr data-href="#/produkte/${p.id}" tabindex="0">
        <td><div class="thumb-s">${p.images[0] ? `<img src="${esc(p.images[0].url)}" alt="" loading="lazy">` : fallbackThumb}</div></td>
        <td><strong>${esc(p.name)}</strong>${p.sku ? `<br><small class="muted">${esc(p.sku)}</small>` : ''}</td>
        <td>${esc(p.category_name ?? '–')}</td>
        <td class="num">${money(p.price_cents)}${p.compare_at_cents ? `<br><s class="muted">${money(p.compare_at_cents)}</s>` : ''}</td>
        <td class="num">${p.stock === null ? '∞' : esc(p.stock)}</td>
        <td>${p.featured ? '<span class="accent">★</span>' : ''}</td>
        <td><span class="status ${p.active ? 'status-ok' : 'status-off'}">${p.active ? 'Aktiv' : 'Entwurf'}</span></td>
      </tr>`
    )
    .join('');

  root.innerHTML = layout('produkte', {
    title: 'Produkte',
    subtitle: `${products.length} ${products.length === 1 ? 'Produkt' : 'Produkte'}`,
    actions: `<a class="btn btn-track btn-sm" href="#/produkte/neu">${icon('plus', 'icon icon-sm')} Neues Produkt</a>`,
    body: `
      <form class="toolbar-admin" id="product-filter">
        <input name="q" type="search" value="${esc(q)}" placeholder="Name oder Artikelnummer suchen" aria-label="Produkte suchen">
        <select name="category" aria-label="Kategorie filtern">
          <option value="">Alle Kategorien</option>
          ${categories.map((c) => `<option value="${c.id}" ${String(c.id) === category ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
        </select>
        <button class="btn btn-ghost btn-sm" type="submit">Filtern</button>
      </form>
      <div class="table-wrap">
        <table>
          <thead><tr><th></th><th>Produkt</th><th>Kategorie</th><th class="num">Preis</th><th class="num">Bestand</th><th>Top</th><th>Status</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="7" class="muted">Noch keine Produkte. Lege das erste Produkt an.</td></tr>'}</tbody>
        </table>
      </div>`,
  });
}

async function viewProductForm(id) {
  await loadCategories();
  const p = id ? await api(`/admin/products/${id}`) : null;
  const legalSelect = LEGAL_OPTIONS.map(([v, l]) => `<option value="${v}" ${(p?.legal ?? 'keine') === v ? 'selected' : ''}>${esc(l)}</option>`).join('');
  const badgeSelect = BADGE_OPTIONS.map((b) => `<option value="${esc(b)}" ${(p?.badge ?? '') === b ? 'selected' : ''}>${b || '– kein Badge –'}</option>`).join('');

  const images = p
    ? p.images
        .map(
          (img, index) => `
          <div class="image-tile">
            <img src="${esc(img.url)}" alt="">
            ${index === 0 ? '<span class="badge main-flag">Hauptbild</span>' : ''}
            <div class="tile-actions">
              ${index === 0 ? '' : `<button type="button" data-main="${img.id}">Hauptbild</button>`}
              <button type="button" data-image-delete="${img.id}">Löschen</button>
            </div>
          </div>`
        )
        .join('')
    : '';

  const imageSection = p
    ? `
      <section class="panel">
        <h2>Bilder</h2>
        <p class="muted admin-hint">Das erste Bild ist das Hauptbild. JPG, PNG oder WebP, je bis 6 MB, bis zu 8 auf einmal.</p>
        <div class="drop">
          <input type="file" id="image-input" accept="image/jpeg,image/png,image/webp" multiple>
          <button class="btn btn-ghost btn-sm" type="button" data-upload>Bilder hochladen</button>
        </div>
        <div class="image-grid">${images || '<p class="muted">Noch keine Bilder. Ohne Bild zeigt der Shop ein Platzhalter-Motiv.</p>'}</div>
      </section>`
    : `<section class="panel"><h2>Bilder</h2><p class="muted">Speichere das Produkt zuerst. Danach kannst du Bilder hochladen.</p></section>`;

  root.innerHTML = layout('produkte', {
    title: p ? p.name : 'Neues Produkt',
    subtitle: p ? `Zuletzt geändert: ${fmtDate(p.updated_at)}` : 'Name, Preis und Bestand reichen für den Start.',
    actions: `
      <a class="btn btn-ghost btn-sm" href="#/produkte">Zurück</a>
      ${p && p.active ? `<a class="btn btn-ghost btn-sm" href="/produkt/${esc(p.slug)}" target="_blank" rel="noopener">Im Shop ansehen</a>` : ''}`,
    body: `
      <form class="product-editor" id="product-form" data-id="${p?.id ?? ''}" novalidate>
        <div class="stack">
          <section class="panel">
            <h2>Grunddaten</h2>
            <div class="form-grid">
              <label class="field field-full" data-field="name"><span>Name</span>
                <input name="name" required maxlength="120" value="${esc(p?.name ?? '')}"><small class="field-error" hidden></small></label>
              <label class="field" data-field="category_id"><span>Kategorie</span>
                <select name="category_id">${categoryOptions(p?.category_id ?? '')}</select><small class="field-error" hidden></small></label>
              <label class="field" data-field="sku"><span>Artikelnummer <em class="field-hint">(optional)</em></span>
                <input name="sku" maxlength="40" value="${esc(p?.sku ?? '')}"><small class="field-error" hidden></small></label>
              <label class="field field-full" data-field="short_desc"><span>Kurzbeschreibung <em class="field-hint">(erscheint in der Karte, max. 200 Zeichen)</em></span>
                <input name="short_desc" maxlength="200" value="${esc(p?.short_desc ?? '')}"><small class="field-error" hidden></small></label>
              <label class="field field-full" data-field="description"><span>Beschreibung <em class="field-hint">(Absätze mit Leerzeile trennen)</em></span>
                <textarea name="description" rows="8" maxlength="5000">${esc(p?.description ?? '')}</textarea><small class="field-error" hidden></small></label>
            </div>
          </section>
          ${imageSection}
        </div>

        <div class="stack">
          <section class="panel">
            <h2>Preis &amp; Versand</h2>
            <div class="form-grid">
              <label class="field" data-field="price"><span>Preis in € (inkl. MwSt.)</span>
                <input name="price" inputmode="decimal" required placeholder="z. B. 12,90" value="${euroInput(p?.price_cents)}"><small class="field-error" hidden></small></label>
              <label class="field" data-field="compare_at"><span>Vorher-Preis in € <em class="field-hint">(optional)</em></span>
                <input name="compare_at" inputmode="decimal" placeholder="z. B. 15,90" value="${euroInput(p?.compare_at_cents)}"><small class="field-error" hidden></small></label>
              <label class="field" data-field="stock"><span>Bestand <em class="field-hint">(leer = unbegrenzt)</em></span>
                <input name="stock" inputmode="numeric" placeholder="∞" value="${p?.stock ?? ''}"><small class="field-error" hidden></small></label>
              <label class="field" data-field="shipping"><span>Versand in € <em class="field-hint">(leer = Standard)</em></span>
                <input name="shipping" inputmode="decimal" placeholder="z. B. 2,90" value="${euroInput(p?.shipping_cents)}"><small class="field-error" hidden></small></label>
            </div>
          </section>

          <section class="panel">
            <h2>Zulassung &amp; Anzeige</h2>
            <div class="form-grid">
              <label class="field field-full" data-field="legal"><span>Zulassung</span>
                <select name="legal">${legalSelect}</select><small class="field-error" hidden></small></label>
              <label class="field" data-field="badge"><span>Badge</span>
                <select name="badge">${badgeSelect}</select><small class="field-error" hidden></small></label>
              <label class="field" data-field="sort"><span>Reihenfolge <em class="field-hint">(kleiner = weiter vorn)</em></span>
                <input name="sort" inputmode="numeric" value="${p?.sort ?? 0}"><small class="field-error" hidden></small></label>
              <label class="check field-full" data-field="active"><input type="checkbox" name="active" ${p ? (p.active ? 'checked' : '') : 'checked'}> <span>Im Shop sichtbar und bestellbar</span></label>
              <label class="check field-full" data-field="featured"><input type="checkbox" name="featured" ${p?.featured ? 'checked' : ''}> <span>Auf der Startseite zeigen</span></label>
            </div>
            <ul class="legal-help legal-help-gap">
              <li><strong>ABE vorhanden:</strong> Teil hat eine Allgemeine Betriebserlaubnis.</li>
              <li><strong>Teilegutachten:</strong> Eintragung mit Gutachten möglich.</li>
              <li><strong>Nur Rennstrecke:</strong> zeigt den Track-Hinweis im Shop an.</li>
            </ul>
          </section>

          <div class="form-actions">
            ${p ? `<button class="btn btn-danger btn-sm" type="button" data-delete-product>Löschen</button>` : '<span></span>'}
            <button class="btn btn-track" type="submit">${p ? 'Speichern' : 'Produkt anlegen'}</button>
          </div>
          <p class="form-error" id="product-error" role="alert" hidden></p>
        </div>
      </form>`,
  });
}

function productPayload(form) {
  const data = Object.fromEntries(new FormData(form));
  return {
    name: data.name,
    category_id: data.category_id,
    sku: data.sku,
    short_desc: data.short_desc,
    description: data.description,
    price: data.price,
    compare_at: data.compare_at,
    stock: data.stock,
    shipping: data.shipping,
    legal: data.legal,
    badge: data.badge,
    sort: data.sort,
    active: form.elements.active.checked,
    featured: form.elements.featured.checked,
  };
}

function showFormErrors(form, fields = {}) {
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

/* ---------- Kategorien ---------- */

async function viewCategories(selectedId) {
  const { categories: list } = await api('/admin/categories');
  categories = list;
  const selected = list.find((c) => String(c.id) === selectedId) ?? null;
  const rows = list
    .map(
      (c) => `
      <tr data-category="${c.id}" tabindex="0" class="${selected?.id === c.id ? 'is-selected' : ''}">
        <td><strong>${esc(c.name)}</strong><br><small class="muted">${esc(c.slug)}</small></td>
        <td class="num">${c.product_count}</td>
        <td class="num">${c.sort}</td>
      </tr>`
    )
    .join('');

  root.innerHTML = layout('kategorien', {
    title: 'Kategorien',
    subtitle: 'Die Kategorien erscheinen als Filter im Shop und auf der Startseite.',
    actions: `<a class="btn btn-track btn-sm" href="#/kategorien">${icon('plus', 'icon icon-sm')} Neue Kategorie</a>`,
    body: `
      <div class="two-col">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th class="num">Aktive Produkte</th><th class="num">Reihenfolge</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <section class="panel">
          <h2>${selected ? 'Kategorie bearbeiten' : 'Neue Kategorie'}</h2>
          <form class="form" id="category-form" data-id="${selected?.id ?? ''}" novalidate>
            <label class="field" data-field="name"><span>Name</span>
              <input name="name" required maxlength="60" value="${esc(selected?.name ?? '')}"><small class="field-error" hidden></small></label>
            <label class="field" data-field="description"><span>Beschreibung <em class="field-hint">(max. 300 Zeichen)</em></span>
              <textarea name="description" rows="3" maxlength="300">${esc(selected?.description ?? '')}</textarea><small class="field-error" hidden></small></label>
            <label class="field" data-field="sort"><span>Reihenfolge</span>
              <input name="sort" inputmode="numeric" value="${selected?.sort ?? list.length}"><small class="field-error" hidden></small></label>
            <div class="form-actions">
              ${selected ? '<button class="btn btn-danger btn-sm" type="button" data-delete-category>Löschen</button>' : '<span></span>'}
              <button class="btn btn-track" type="submit">${selected ? 'Speichern' : 'Anlegen'}</button>
            </div>
          </form>
        </section>
      </div>`,
  });
}

/* ---------- Bestellungen ---------- */

async function viewOrders(params) {
  const status = params.get('status') ?? '';
  const { orders } = await api(`/admin/orders${status ? `?status=${encodeURIComponent(status)}` : ''}`);
  const filters = [['', 'Alle'], ...Object.entries(STATUS_LABELS)]
    .map(
      ([value, label]) =>
        `<a class="chip chip-filter" href="#/bestellungen${value ? `?status=${value}` : ''}" aria-pressed="${status === value}">${esc(label)}</a>`
    )
    .join('');
  const rows = orders
    .map(
      (o) => `
      <tr data-order="${o.id}" tabindex="0">
        <td><strong>${esc(o.number)}</strong></td>
        <td>${esc(fmtDate(o.created_at))}</td>
        <td>${esc(o.customer_name)}<br><small class="muted">${esc(o.email)}</small></td>
        <td class="num">${o.item_count}</td>
        <td class="num">${money(o.total_cents)}</td>
        <td>${statusChip(o.payment_status, PAYMENT_LABELS)}</td>
        <td>${statusChip(o.status, STATUS_LABELS)}</td>
      </tr>`
    )
    .join('');

  root.innerHTML = layout('bestellungen', {
    title: 'Bestellungen',
    subtitle: `${orders.length} ${orders.length === 1 ? 'Bestellung' : 'Bestellungen'}`,
    body: `
      <div class="chips chips-gap">${filters}</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nummer</th><th>Datum</th><th>Kunde</th><th class="num">Artikel</th><th class="num">Summe</th><th>Zahlung</th><th>Status</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="7" class="muted">Keine Bestellungen in dieser Ansicht.</td></tr>'}</tbody>
        </table>
      </div>`,
  });
}

function orderDrawer(order) {
  // Statuswerte kommen aus dem Code, Kundentexte werden unten über esc() ausgegeben
  const options = (map, current) => Object.entries(map).map(([v, l]) => `<option value="${v}" ${current === v ? 'selected' : ''}>${esc(l)}</option>`).join('');
  return `
    <div class="drawer-backdrop" data-close></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="Bestellung ${esc(order.number)}">
      <div class="drawer-head">
        <div>
          <h2>${esc(order.number)}</h2>
          <p class="muted">${esc(fmtDate(order.created_at))}</p>
        </div>
        <button class="close-btn" type="button" data-close aria-label="Schließen">${icon('close')}</button>
      </div>

      <dl class="kv">
        <dt>Kunde</dt><dd>${esc(order.customer_name)}</dd>
        <dt>E-Mail</dt><dd><a href="mailto:${esc(order.email)}?subject=${encodeURIComponent(`Deine Bestellung ${order.number}`)}">${esc(order.email)}</a></dd>
        <dt>Telefon</dt><dd>${esc(order.phone || '–')}</dd>
        <dt>Adresse</dt><dd>${esc(order.street)}<br>${esc(order.zip)} ${esc(order.city)}<br>${esc(order.country)}</dd>
        <dt>Hinweis</dt><dd>${esc(order.note || '–')}</dd>
      </dl>

      <ul class="item-list">
        ${order.items
          .map((i) => `<li><span>${esc(i.name)}<small>${i.qty} × ${money(i.unit_price_cents)}${i.sku ? ` · ${esc(i.sku)}` : ''}</small></span><span>${money(i.line_total_cents)}</span></li>`)
          .join('')}
      </ul>
      <dl class="totals">
        <dt>Zwischensumme</dt><dd>${money(order.subtotal_cents)}</dd>
        <dt>Versand</dt><dd>${money(order.shipping_cents)}</dd>
        <dt class="grand">Gesamt</dt><dd class="grand">${money(order.total_cents)}</dd>
      </dl>

      <form class="form order-form" id="order-form" data-id="${order.id}">
        <label class="field"><span>Bestellstatus</span>
          <select name="status">${options(STATUS_LABELS, order.status)}</select></label>
        <label class="field"><span>Zahlung</span>
          <select name="payment_status">${options(PAYMENT_LABELS, order.payment_status)}</select></label>
        <div class="form-actions">
          <button class="btn btn-danger btn-sm" type="button" data-cancel-order ${order.status === 'storniert' ? 'disabled' : ''}>Stornieren</button>
          <button class="btn btn-track" type="submit">Speichern</button>
        </div>
        <p class="form-note">Beim Stornieren wird der Bestand der Artikel wieder gutgeschrieben.</p>
        <p class="form-error" id="order-error" role="alert" hidden></p>
      </form>
    </aside>`;
}

async function openOrder(id) {
  const order = await api(`/admin/orders/${id}`);
  closeDrawer();
  document.body.insertAdjacentHTML('beforeend', orderDrawer(order));
  document.querySelector('.drawer select')?.focus();
}

function closeDrawer() {
  document.querySelectorAll('.drawer-backdrop, .drawer').forEach((el) => el.remove());
}

/* ---------- Nachrichten ---------- */

async function viewMessages() {
  const { messages } = await api('/admin/messages');
  const open = messages.filter((m) => !m.handled).length;
  const cards = messages
    .map(
      (m) => `
      <article class="message-card ${m.handled ? 'is-handled' : ''}">
        <header>
          <strong>${esc(m.name)}</strong>
          <span class="status ${m.handled ? 'status-off' : 'status-neu'}">${esc(m.goal || 'Sonstiges')}</span>
        </header>
        <p>${esc(m.message)}</p>
        <p class="meta">
          <a href="mailto:${esc(m.email)}?subject=${encodeURIComponent('Deine Anfrage bei COLDSTART')}">${esc(m.email)}</a>
          ${m.vehicle ? ` · ${esc(m.vehicle)}` : ''} · ${esc(fmtDate(m.created_at))}
        </p>
        <button class="btn btn-ghost btn-sm" type="button" data-message="${m.id}" data-handled="${m.handled ? '0' : '1'}">
          ${m.handled ? 'Wieder öffnen' : 'Als erledigt markieren'}
        </button>
      </article>`
    )
    .join('');
  root.innerHTML = layout('nachrichten', {
    title: 'Nachrichten',
    subtitle: `${open} offen · ${messages.length} insgesamt`,
    body: `<div class="stack">${cards || '<p class="muted">Noch keine Kontaktanfragen.</p>'}</div>`,
  });
}

/* ---------- Einstellungen ---------- */

async function viewSettings() {
  const s = await api('/admin/settings');
  root.innerHTML = layout('einstellungen', {
    title: 'Einstellungen',
    subtitle: 'Versand, Rückgabe, Bankdaten und Shop-Status.',
    body: `
      <form class="panel form" id="settings-form" novalidate>
        <label class="check" data-field="shop_open"><input type="checkbox" name="shop_open" ${s.shop_open ? 'checked' : ''}>
          <span><strong>Shop nimmt Bestellungen an</strong><br><small class="muted">Ausschalten, z. B. im Urlaub. Stöbern bleibt möglich.</small></span></label>

        <div class="form-grid">
          <label class="field" data-field="shop_name"><span>Shop-Name</span><input name="shop_name" value="${esc(s.shop_name)}" maxlength="60"><small class="field-error" hidden></small></label>
          <label class="field" data-field="contact_email"><span>Kontakt-E-Mail</span><input name="contact_email" type="email" value="${esc(s.contact_email)}"><small class="field-error" hidden></small></label>
          <label class="field" data-field="shipping_default_eur"><span>Standard-Versand in €</span><input name="shipping_default_eur" inputmode="decimal" value="${esc(String(s.shipping_default_eur).replace('.', ','))}"><small class="field-error" hidden></small></label>
          <label class="field" data-field="free_shipping_from_eur"><span>Gratis-Versand ab € <em class="field-hint">(0 = aus)</em></span><input name="free_shipping_from_eur" inputmode="decimal" value="${esc(String(s.free_shipping_from_eur).replace('.', ','))}"><small class="field-error" hidden></small></label>
          <label class="field" data-field="shipping_countries"><span>Liefer-Länder <em class="field-hint">(Codes mit Komma, z. B. DE,AT)</em></span><input name="shipping_countries" value="${esc(s.shipping_countries)}"><small class="field-error" hidden></small></label>
          <label class="field" data-field="return_days"><span>Rückgabe in Tagen</span><input name="return_days" inputmode="numeric" value="${esc(s.return_days)}"><small class="field-error" hidden></small></label>
          <label class="field" data-field="low_stock_threshold"><span>Warnung bei Bestand ≤</span><input name="low_stock_threshold" inputmode="numeric" value="${esc(s.low_stock_threshold)}"><small class="field-error" hidden></small></label>
          <label class="field field-full" data-field="delivery_time_text"><span>Versandzeit (Text für Kunden)</span><input name="delivery_time_text" value="${esc(s.delivery_time_text)}" maxlength="1000"><small class="field-error" hidden></small></label>
          <label class="field field-full" data-field="manual_payment_text"><span>Zahlungsanweisung (Bankdaten)</span>
            <textarea name="manual_payment_text" rows="4" maxlength="1000">${esc(s.manual_payment_text)}</textarea><small class="field-error" hidden></small></label>
        </div>

        <p class="notice">Zahlungsanbieter: <strong>Vorkasse per Überweisung</strong>. Weitere Anbieter wie Stripe lassen sich in <code>server/payments.js</code> anbinden.</p>

        <div class="form-actions">
          <span></span>
          <button class="btn btn-track" type="submit">Einstellungen speichern</button>
        </div>
        <p class="form-error" id="settings-error" role="alert" hidden></p>
      </form>`,
  });
}

/* ---------- Routing & Ereignisse ---------- */

function currentRoute() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = hash.split('?');
  return { parts: path.split('/').filter(Boolean), params: new URLSearchParams(query) };
}

async function route() {
  let me;
  try {
    me = await api('/admin/me');
  } catch {
    return renderLogin();
  }
  adminEmail = me.email;
  const { parts, params } = currentRoute();
  const [section, sub] = parts;
  try {
    if (!section) return await viewDashboard();
    if (section === 'produkte' && sub === 'neu') return await viewProductForm(null);
    if (section === 'produkte' && sub) return await viewProductForm(Number(sub));
    if (section === 'produkte') return await viewProducts(params);
    if (section === 'kategorien') return await viewCategories(sub);
    if (section === 'bestellungen') return await viewOrders(params);
    if (section === 'nachrichten') return await viewMessages();
    if (section === 'einstellungen') return await viewSettings();
    return await viewDashboard();
  } catch (error) {
    root.innerHTML = layout('dashboard', { title: 'Hoppla', body: `<p class="form-error" role="alert">${esc(error.message)}</p>` });
  }
}

async function uploadImages(productId, files) {
  const body = new FormData();
  for (const file of files) body.append('images', file);
  const res = await fetch(`/api/admin/products/${productId}/images`, { method: 'POST', body, credentials: 'same-origin' });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? 'Upload fehlgeschlagen.');
  return data;
}

document.addEventListener('click', async (event) => {
  const target = event.target;

  if (target.closest('[data-close]')) return closeDrawer();

  const logout = target.closest('[data-action="logout"]');
  if (logout) {
    await api('/admin/logout', { method: 'POST' }).catch(() => {});
    return route();
  }

  // Tabellenzeilen sind klickbar; Links und Buttons darin behalten ihr eigenes Verhalten
  if (!target.closest('a, button')) {
    const row = target.closest('tr[data-href]');
    if (row) {
      location.hash = row.dataset.href.replace(/^#/, '');
      return;
    }
    const orderRow = target.closest('tr[data-order]');
    if (orderRow) return openOrder(orderRow.dataset.order);
    const categoryRow = target.closest('tr[data-category]');
    if (categoryRow) {
      location.hash = `#/kategorien/${categoryRow.dataset.category}`;
      return;
    }
  }

  const cancel = target.closest('[data-cancel-order]');
  if (cancel) {
    const form = document.getElementById('order-form');
    if (!window.confirm('Bestellung wirklich stornieren? Der Bestand wird wieder gutgeschrieben.')) return;
    try {
      await api(`/admin/orders/${form.dataset.id}`, { method: 'PUT', body: { status: 'storniert' } });
      toast('Bestellung storniert, Bestand zurückgebucht.');
      closeDrawer();
      route();
    } catch (error) {
      toast(error.message, { error: true });
    }
    return;
  }

  const main = target.closest('[data-main]');
  if (main) {
    try {
      await api(`/admin/images/${main.dataset.main}/main`, { method: 'POST' });
      route();
    } catch (error) {
      toast(error.message, { error: true });
    }
    return;
  }

  const imageDelete = target.closest('[data-image-delete]');
  if (imageDelete) {
    if (!window.confirm('Bild wirklich löschen?')) return;
    try {
      await api(`/admin/images/${imageDelete.dataset.imageDelete}`, { method: 'DELETE' });
      toast('Bild gelöscht.');
      route();
    } catch (error) {
      toast(error.message, { error: true });
    }
    return;
  }

  if (target.closest('[data-upload]')) {
    const input = document.getElementById('image-input');
    const form = document.getElementById('product-form');
    const files = [...(input?.files ?? [])];
    if (!files.length) return toast('Bitte wähle zuerst Bilder aus.', { error: true });
    if (files.some((f) => f.size > 6 * 1024 * 1024)) return toast('Mindestens ein Bild ist größer als 6 MB.', { error: true });
    try {
      toast(`${files.length} ${files.length === 1 ? 'Bild wird' : 'Bilder werden'} hochgeladen …`);
      await uploadImages(form.dataset.id, files);
      toast('Bilder sind hochgeladen.');
      route();
    } catch (error) {
      toast(error.message, { error: true });
    }
    return;
  }

  const deleteProductButton = target.closest('[data-delete-product]');
  if (deleteProductButton) {
    const form = document.getElementById('product-form');
    if (!window.confirm('Produkt wirklich löschen? Wenn es schon Bestellungen gibt, wird es nur deaktiviert.')) return;
    try {
      const result = await api(`/admin/products/${form.dataset.id}`, { method: 'DELETE' });
      toast(result.archived ? 'Produkt ist in Bestellungen enthalten und wurde deaktiviert.' : 'Produkt gelöscht.');
      location.hash = '#/produkte';
    } catch (error) {
      toast(error.message, { error: true });
    }
    return;
  }

  const deleteCategoryButton = target.closest('[data-delete-category]');
  if (deleteCategoryButton) {
    const form = document.getElementById('category-form');
    if (!window.confirm('Kategorie wirklich löschen?')) return;
    try {
      await api(`/admin/categories/${form.dataset.id}`, { method: 'DELETE' });
      toast('Kategorie gelöscht.');
      location.hash = '#/kategorien';
    } catch (error) {
      toast(error.message, { error: true });
    }
    return;
  }

  const messageToggle = target.closest('[data-message]');
  if (messageToggle) {
    try {
      await api(`/admin/messages/${messageToggle.dataset.message}`, {
        method: 'PUT',
        body: { handled: messageToggle.dataset.handled === '1' },
      });
      route();
    } catch (error) {
      toast(error.message, { error: true });
    }
  }
});

document.addEventListener('submit', async (event) => {
  const form = event.target;
  event.preventDefault();

  if (form.id === 'login-form') {
    const data = Object.fromEntries(new FormData(form));
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      await api('/admin/login', { method: 'POST', body: { email: data.email, password: data.password } });
      location.hash = '#/';
      route();
    } catch (error) {
      // E-Mail bleibt stehen, nur das Passwort wird neu abgefragt
      renderLogin(error.message, data.email);
    }
    return;
  }

  if (form.id === 'product-form') {
    const errorBox = document.getElementById('product-error');
    const id = form.dataset.id;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    errorBox.hidden = true;
    try {
      const payload = productPayload(form);
      if (id) {
        await api(`/admin/products/${id}`, { method: 'PUT', body: payload });
        toast('Produkt gespeichert.');
        route();
      } else {
        const created = await api('/admin/products', { method: 'POST', body: payload });
        toast('Produkt angelegt. Jetzt Bilder hochladen.');
        location.hash = `#/produkte/${created.id}`;
      }
    } catch (error) {
      showFormErrors(form, error.fields ?? {});
      errorBox.textContent = error.message;
      errorBox.hidden = false;
      button.disabled = false;
    }
    return;
  }

  if (form.id === 'category-form') {
    const data = Object.fromEntries(new FormData(form));
    const id = form.dataset.id;
    try {
      const body = { name: data.name, description: data.description, sort: data.sort };
      if (id) await api(`/admin/categories/${id}`, { method: 'PUT', body });
      else await api('/admin/categories', { method: 'POST', body });
      toast('Kategorie gespeichert.');
      location.hash = '#/kategorien';
      route();
    } catch (error) {
      showFormErrors(form, error.fields ?? {});
      toast(error.message, { error: true });
    }
    return;
  }

  if (form.id === 'order-form') {
    const data = Object.fromEntries(new FormData(form));
    const errorBox = document.getElementById('order-error');
    try {
      await api(`/admin/orders/${form.dataset.id}`, {
        method: 'PUT',
        body: { status: data.status, payment_status: data.payment_status },
      });
      toast('Bestellung gespeichert.');
      closeDrawer();
      route();
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.hidden = false;
    }
    return;
  }

  if (form.id === 'product-filter') {
    const data = Object.fromEntries(new FormData(form));
    const query = new URLSearchParams({ q: data.q, category: data.category }).toString();
    location.hash = `#/produkte?${query}`;
    return;
  }

  if (form.id === 'settings-form') {
    const errorBox = document.getElementById('settings-error');
    const data = Object.fromEntries(new FormData(form));
    try {
      await api('/admin/settings', { method: 'PUT', body: { ...data, shop_open: form.elements.shop_open.checked } });
      toast('Einstellungen gespeichert.');
      errorBox.hidden = true;
    } catch (error) {
      showFormErrors(form, error.fields ?? {});
      errorBox.textContent = error.message;
      errorBox.hidden = false;
    }
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeDrawer();
});

window.addEventListener('hashchange', () => {
  closeDrawer();
  route();
});

route();
