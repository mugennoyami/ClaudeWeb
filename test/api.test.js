import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

// Eigene Daten für den Testlauf. Muss vor dem Import der Konfiguration gesetzt sein.
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coldstart-test-'));
process.env.DATA_DIR = dataDir;

const { createApp } = await import('../server/app.js');
const { openDatabase } = await import('../server/db.js');
const { hashPassword } = await import('../server/auth.js');
const { computeShipping } = await import('../server/shop.js');

const ADMIN_EMAIL = 'admin@example.de';
const ADMIN_PASSWORD = 'testpasswort-lang-123';

let db;
let server;
let base;
let cookie = '';

const api = async (method, url, { body, headers = {}, withCookie = true } = {}) => {
  const res = await fetch(base + url, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(withCookie && cookie ? { cookie } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;
  return { status: res.status, data, res };
};

const productBody = (overrides = {}) => ({
  name: 'Testprodukt',
  category_id: 1,
  short_desc: 'Kurz',
  description: 'Lang',
  price: '12,90',
  compare_at: '',
  stock: '',
  shipping: '',
  sku: '',
  legal: 'keine',
  badge: '',
  featured: false,
  active: true,
  sort: '0',
  ...overrides,
});

const validCustomer = (overrides = {}) => ({
  name: 'Max Muster',
  email: 'max@example.org',
  street: 'Musterstraße 1',
  zip: '12345',
  city: 'Berlin',
  country: 'DE',
  phone: '',
  note: '',
  accept_terms: true,
  ...overrides,
});

before(async () => {
  db = openDatabase(path.join(dataDir, 'test.sqlite'));
  db.prepare('INSERT INTO admins (email, password_hash, created_at) VALUES (?, ?, ?)').run(
    ADMIN_EMAIL,
    hashPassword(ADMIN_PASSWORD),
    new Date().toISOString()
  );
  server = createApp(db).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server?.close();
  db?.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test('Shop-Einstellungen und Kategorien sind öffentlich abrufbar', async () => {
  const { status, data } = await api('GET', '/api/shop', { withCookie: false });
  assert.equal(status, 200);
  assert.equal(data.shop_name, 'COLDSTART');
  assert.equal(data.free_shipping_from_cents, 6000);
  assert.ok(data.categories.some((c) => c.slug === 'cnc'));
  assert.equal(data.payment_provider, undefined, 'interne Einstellungen dürfen nicht öffentlich sein');
});

test('Admin-Bereich verlangt eine Anmeldung', async () => {
  const { status } = await api('GET', '/api/admin/products', { withCookie: false });
  assert.equal(status, 401);
});

test('Falsches Passwort wird abgelehnt, richtiges öffnet eine Session', async () => {
  const wrong = await api('POST', '/api/admin/login', {
    body: { email: ADMIN_EMAIL, password: 'falsch-falsch-falsch' },
    withCookie: false,
  });
  assert.equal(wrong.status, 401);

  const ok = await api('POST', '/api/admin/login', {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    withCookie: false,
  });
  assert.equal(ok.status, 200);
  const setCookie = ok.res.headers.get('set-cookie');
  assert.match(setCookie, /cs_admin=.+HttpOnly/);
  assert.match(setCookie, /SameSite=Strict/);
  cookie = setCookie.split(';')[0];

  const me = await api('GET', '/api/admin/me');
  assert.equal(me.data.email, ADMIN_EMAIL);
});

test('Produkt anlegen: Preis mit Komma wird in Cent gespeichert, Slug ist eindeutig', async () => {
  const first = await api('POST', '/api/admin/products', { body: productBody({ name: 'Sportluftfilter' }) });
  assert.equal(first.status, 201);
  assert.equal(first.data.price_cents, 1290);
  assert.equal(first.data.slug, 'sportluftfilter');

  const second = await api('POST', '/api/admin/products', { body: productBody({ name: 'Sportluftfilter' }) });
  assert.equal(second.data.slug, 'sportluftfilter-2');

  const { data } = await api('GET', '/api/products', { withCookie: false });
  assert.ok(data.products.some((p) => p.slug === 'sportluftfilter'));
});

test('Ungültige Produktdaten liefern Feldfehler', async () => {
  const { status, data } = await api('POST', '/api/admin/products', {
    body: productBody({ name: 'X', price: 'abc', compare_at: '5' }),
  });
  assert.equal(status, 400);
  assert.ok(data.fields.name);
  assert.ok(data.fields.price);
});

test('Warenkorb: Summen kommen vom Server, Preise aus dem Browser werden ignoriert', async () => {
  const id = db.prepare("SELECT id FROM products WHERE slug = 'sportluftfilter'").get().id;
  const { data } = await api('POST', '/api/cart/quote', {
    body: { items: [{ id, qty: 2, price_cents: 1 }] },
    withCookie: false,
  });
  assert.equal(data.subtotal_cents, 2580);
  assert.equal(data.shipping_cents, 490, 'unter dem Gratis-Limit gilt der Standardversand');
  assert.equal(data.total_cents, 3070);
  assert.equal(data.problems.length, 0);
});

test('Ab dem Gratis-Limit entfällt der Versand', async () => {
  const id = db.prepare("SELECT id FROM products WHERE slug = 'sportluftfilter'").get().id;
  const { data } = await api('POST', '/api/cart/quote', { body: { items: [{ id, qty: 5 }] }, withCookie: false });
  assert.equal(data.subtotal_cents, 6450);
  assert.equal(data.shipping_cents, 0);
  assert.equal(data.free_shipping_remaining_cents, 0);
});

test('Produkt mit eigenem Versandpreis (Sticker) nutzt diesen Betrag', async () => {
  const created = await api('POST', '/api/admin/products', {
    body: productBody({ name: 'Sticker', price: '4,50', shipping: '2,90' }),
  });
  const { data } = await api('POST', '/api/cart/quote', {
    body: { items: [{ id: created.data.id, qty: 1 }] },
    withCookie: false,
  });
  assert.equal(data.shipping_cents, 290);
  assert.equal(data.total_cents, 740);
});

test('Versand-Berechnung: höchste Versandklasse, Gratis ab Schwelle', () => {
  const settings = { shipping_default_cents: 490, free_shipping_from_cents: 6000 };
  assert.equal(computeShipping([], 0, settings), 0);
  assert.equal(computeShipping([{ shipping_cents: null }], 5999, settings), 490);
  assert.equal(computeShipping([{ shipping_cents: 290 }, { shipping_cents: null }], 1000, settings), 490);
  assert.equal(computeShipping([{ shipping_cents: 290 }], 1000, settings), 290);
  assert.equal(computeShipping([{ shipping_cents: null }], 6000, settings), 0);
  assert.equal(computeShipping([{ shipping_cents: null }], 100, { ...settings, free_shipping_from_cents: 0 }), 490);
});

test('Lager: Mengen über dem Bestand werden im Warenkorb gemeldet', async () => {
  const created = await api('POST', '/api/admin/products', {
    body: productBody({ name: 'Limitiert', stock: '2', price: '20' }),
  });
  const { data } = await api('POST', '/api/cart/quote', {
    body: { items: [{ id: created.data.id, qty: 3 }] },
    withCookie: false,
  });
  assert.equal(data.lines.length, 0);
  assert.equal(data.problems[0].message, 'Nur noch 2 Stück auf Lager.');
});

test('Bestellung: Validierung, Bestand, Bestätigungslink und Stornierung', async () => {
  const created = await api('POST', '/api/admin/products', {
    body: productBody({ name: 'Bestandsprodukt', stock: '5', price: '10' }),
  });
  const productId = created.data.id;

  const invalid = await api('POST', '/api/orders', {
    body: { items: [{ id: productId, qty: 1 }], customer: validCustomer({ zip: '12', accept_terms: false }) },
    withCookie: false,
  });
  assert.equal(invalid.status, 400);
  assert.ok(invalid.data.fields.zip);
  assert.ok(invalid.data.fields.accept_terms);

  const order = await api('POST', '/api/orders', {
    body: { items: [{ id: productId, qty: 2 }], customer: validCustomer() },
    withCookie: false,
  });
  assert.equal(order.status, 201);
  assert.match(order.data.number, /^CS-\d{4}-\d{5}$/);
  assert.match(order.data.redirect, /^\/bestellung\/CS-\d{4}-\d{5}\?t=[a-f0-9]{32}$/);

  const stock = db.prepare('SELECT stock FROM products WHERE id = ?').get(productId).stock;
  assert.equal(stock, 3, 'Bestand wird beim Bestellen abgezogen');

  const token = new URL(base + order.data.redirect).searchParams.get('t');
  const pub = await api('GET', `/api/orders/${order.data.number}?t=${token}`, { withCookie: false });
  assert.equal(pub.status, 200);
  assert.equal(pub.data.total_cents, 2000 + 490);
  assert.match(pub.data.payment_instructions, /überweis/i);

  const noToken = await api('GET', `/api/orders/${order.data.number}`, { withCookie: false });
  assert.equal(noToken.status, 404);
  const wrongToken = await api('GET', `/api/orders/${order.data.number}?t=${'0'.repeat(32)}`, { withCookie: false });
  assert.equal(wrongToken.status, 404);

  const tooMany = await api('POST', '/api/orders', {
    body: { items: [{ id: productId, qty: 9 }], customer: validCustomer() },
    withCookie: false,
  });
  assert.equal(tooMany.status, 409);
  assert.ok(tooMany.data.problems.length === 1);

  const cancel = await api('PUT', `/api/admin/orders/${orderIdFor(order.data.number)}`, {
    body: { status: 'storniert' },
  });
  assert.equal(cancel.status, 200);
  assert.equal(db.prepare('SELECT stock FROM products WHERE id = ?').get(productId).stock, 5, 'Stornierung bucht den Bestand zurück');

  const reopen = await api('PUT', `/api/admin/orders/${orderIdFor(order.data.number)}`, { body: { status: 'neu' } });
  assert.equal(reopen.status, 409);
});

function orderIdFor(number) {
  return db.prepare('SELECT id FROM orders WHERE number = ?').get(number).id;
}

test('Geschlossener Shop nimmt keine Bestellungen an', async () => {
  const id = db.prepare("SELECT id FROM products WHERE slug = 'sportluftfilter'").get().id;
  await api('PUT', '/api/admin/settings', {
    body: { shop_open: false, shop_name: 'COLDSTART', contact_email: 'kontakt@example.com', shipping_default_eur: '4,90', free_shipping_from_eur: '60', shipping_countries: 'DE,AT', delivery_time_text: 'x', return_days: '14', low_stock_threshold: '5', manual_payment_text: 'x' },
  });
  const closed = await api('POST', '/api/orders', { body: { items: [{ id, qty: 1 }], customer: validCustomer() }, withCookie: false });
  assert.equal(closed.status, 503);
  await api('PUT', '/api/admin/settings', {
    body: { shop_open: true, shop_name: 'COLDSTART', contact_email: 'kontakt@example.com', shipping_default_eur: '4,90', free_shipping_from_eur: '60', shipping_countries: 'DE,AT', delivery_time_text: 'x', return_days: '14', low_stock_threshold: '5', manual_payment_text: 'x' },
  });
});

test('Fremde Herkunft wird bei schreibenden Anfragen blockiert', async () => {
  const { status } = await api('POST', '/api/admin/products', {
    body: productBody({ name: 'CSRF' }),
    headers: { origin: 'https://evil.example' },
  });
  assert.equal(status, 403);
});

test('Bild-Upload: keine echten Bilder werden abgelehnt, echte gespeichert und ausgeliefert', async () => {
  const product = await api('POST', '/api/admin/products', { body: productBody({ name: 'Mit Bild' }) });
  const url = `${base}/api/admin/products/${product.data.id}/images`;

  const fake = new FormData();
  fake.append('images', new Blob(['das ist kein bild'], { type: 'image/png' }), 'fake.png');
  const rejected = await fetch(url, { method: 'POST', headers: { cookie }, body: fake });
  assert.equal(rejected.status, 400);

  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
  const real = new FormData();
  real.append('images', new Blob([png], { type: 'image/png' }), 'bild.png');
  const accepted = await fetch(url, { method: 'POST', headers: { cookie }, body: real });
  assert.equal(accepted.status, 201);
  const body = await accepted.json();
  const imageUrl = body.images[0].url;
  assert.match(imageUrl, /^\/uploads\/[a-f0-9]{32}\.png$/);

  const served = await fetch(base + imageUrl);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get('content-type'), 'image/png');
});

test('Kontaktformular speichert gültige Anfragen und lehnt leere ab', async () => {
  const bad = await api('POST', '/api/contact', { body: { name: 'A', email: 'nope', message: '', privacy: false }, withCookie: false });
  assert.equal(bad.status, 400);

  const good = await api('POST', '/api/contact', {
    body: { name: 'Lena Test', email: 'lena@example.org', vehicle: 'E46 Touring', goal: 'Track', message: 'Habt ihr Sturzplatten für den E46?', privacy: true },
    withCookie: false,
  });
  assert.equal(good.status, 201);

  const list = await api('GET', '/api/admin/messages');
  assert.ok(list.data.messages.some((m) => m.name === 'Lena Test' && m.goal === 'Track'));
});

test('Zu viele Fehlversuche beim Login werden gebremst', async () => {
  let last = null;
  for (let i = 0; i < 10; i += 1) {
    last = await api('POST', '/api/admin/login', { body: { email: 'bremse@example.de', password: 'x' }, withCookie: false });
  }
  assert.equal(last.status, 429);
});
