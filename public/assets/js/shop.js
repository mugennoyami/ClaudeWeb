import {
  api,
  esc,
  getCart,
  icon,
  initChrome,
  money,
  observeReveal,
  productCard,
  cartCount,
  wireQuickAdd,
} from './common.js';

initChrome();

const state = {
  category: new URLSearchParams(location.search).get('category') ?? '',
  q: new URLSearchParams(location.search).get('q') ?? '',
  sort: new URLSearchParams(location.search).get('sort') ?? '',
};
let categories = [];
let searchTimer = null;
let requestId = 0;

const grid = document.getElementById('grid');
const count = document.getElementById('count');
const chips = document.getElementById('cat-chips');
const search = document.getElementById('q');
const sort = document.getElementById('sort');

// Filter in der Adresszeile merken, damit Links und Neuladen den gleichen Stand zeigen
function syncUrl() {
  const params = new URLSearchParams();
  if (state.category) params.set('category', state.category);
  if (state.q) params.set('q', state.q);
  if (state.sort) params.set('sort', state.sort);
  const query = params.toString();
  history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}`);
}

function renderChips() {
  const total = categories.reduce((sum, c) => sum + c.product_count, 0);
  const items = [
    { slug: '', name: 'Alle', count: total },
    ...categories.map((c) => ({ slug: c.slug, name: c.name, count: c.product_count })),
  ];
  chips.innerHTML = items
    .map(
      (item) => `
        <li>
          <button class="chip chip-filter" type="button" data-category="${esc(item.slug)}" aria-pressed="${state.category === item.slug}">
            ${esc(item.name)} <span class="count">${item.count}</span>
          </button>
        </li>`
    )
    .join('');
}

function renderTrustbar(shop) {
  const shipping = shop.free_shipping_from_cents
    ? `Versandkostenfrei ab ${money(shop.free_shipping_from_cents)}`
    : `Versand ab ${money(shop.shipping_default_cents)}`;
  document.getElementById('trustbar').innerHTML = [
    `<li>${icon('truck')} ${esc(shipping)}</li>`,
    `<li>${icon('return')} ${shop.return_days} Tage Rückgabe</li>`,
    `<li>${icon('check')} Preise inkl. MwSt.</li>`,
    `<li>${icon('shield')} Ehrliche Zulassungs-Hinweise</li>`,
  ].join('');
}

function renderReminder() {
  const reminder = document.getElementById('reminder');
  const items = cartCount();
  reminder.hidden = items === 0;
  document.getElementById('reminder-text').textContent =
    items === 1 ? 'Du hast 1 Artikel im Warenkorb.' : `Du hast ${items} Artikel im Warenkorb.`;
}

async function loadProducts() {
  const id = ++requestId;
  grid.setAttribute('aria-busy', 'true');
  const params = new URLSearchParams();
  if (state.category) params.set('category', state.category);
  if (state.q) params.set('q', state.q);
  if (state.sort) params.set('sort', state.sort);

  try {
    const { products } = await api(`/products?${params.toString()}`);
    if (id !== requestId) return; // veraltete Antwort ignorieren

    count.textContent = products.length === 1 ? '1 Produkt' : `${products.length} Produkte`;
    if (!products.length) {
      const filtered = Boolean(state.category || state.q);
      grid.innerHTML = `
        <div class="empty empty-wide">
          <h3>${filtered ? 'Dazu gibt es gerade nichts' : 'Der Shop füllt sich gerade'}</h3>
          <p>${
            filtered
              ? 'Probier eine andere Suche oder Kategorie. Oder schreib uns, was du suchst – manches bauen wir auf Anfrage.'
              : 'Neue Teile kommen bald. Schreib uns in der Zwischenzeit, was du für deinen BMW suchst.'
          }</p>
          ${filtered ? '<button class="btn btn-ghost" type="button" data-reset>Filter zurücksetzen</button>' : '<a class="btn btn-ghost" href="/#kontakt">Anfrage senden</a>'}
        </div>`;
      return;
    }
    grid.innerHTML = products.map(productCard).join('');
    observeReveal(grid);
  } catch {
    if (id !== requestId) return;
    count.textContent = '';
    grid.innerHTML = '<p class="muted">Produkte können gerade nicht geladen werden. Bitte lade die Seite neu.</p>';
  } finally {
    if (id === requestId) grid.removeAttribute('aria-busy');
  }
}

function setCategory(slug) {
  state.category = slug;
  renderChips();
  syncUrl();
  loadProducts();
}

chips.addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (button) setCategory(button.dataset.category);
});

search.value = state.q;
search.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.q = search.value.trim();
    syncUrl();
    loadProducts();
  }, 280);
});

sort.value = state.sort;
sort.addEventListener('change', () => {
  state.sort = sort.value;
  syncUrl();
  loadProducts();
});

grid.addEventListener('click', (event) => {
  if (event.target.closest('[data-reset]')) {
    state.q = '';
    state.sort = '';
    search.value = '';
    sort.value = '';
    setCategory('');
  }
});

wireQuickAdd(grid);
window.addEventListener('cart:change', renderReminder);

async function init() {
  try {
    const shop = await api('/shop');
    categories = shop.categories;
    renderTrustbar(shop);
    renderChips();
    if (!shop.shop_open) {
      // Stöbern bleibt möglich, Bestellen nicht
      document.getElementById('trustbar').insertAdjacentHTML(
        'afterend',
        '<p class="notice notice-warn">Der Shop nimmt gerade keine Bestellungen an. Du kannst dich trotzdem umsehen und uns schreiben.</p>'
      );
    }
  } catch {
    renderChips();
  }
  renderReminder();
  if (getCart().length === 0) document.getElementById('reminder').hidden = true;
  loadProducts();
}

init();
