import crypto from 'node:crypto';
import { ApiError } from './errors.js';
import { insertRow, transaction } from './db.js';
import { fetchImagesMap, LEGAL_LABELS } from './catalog.js';
import { getProvider } from './payments.js';
import { readSettings } from './settings.js';
import { clean, EMAIL_RE } from './validation.js';

export const ORDER_STATUSES = ['neu', 'in_bearbeitung', 'versandt', 'abgeschlossen', 'storniert'];
export const ORDER_STATUS_LABELS = {
  neu: 'Neu',
  in_bearbeitung: 'In Bearbeitung',
  versandt: 'Versandt',
  abgeschlossen: 'Abgeschlossen',
  storniert: 'Storniert',
};
export const PAYMENT_STATUSES = ['offen', 'bezahlt'];
export const PAYMENT_LABELS = { offen: 'Zahlung offen', bezahlt: 'Bezahlt' };
export const CONTACT_GOALS = ['Straße', 'Track', 'Beides', 'Custom Parts', 'Shop-Frage', 'Sonstiges'];

const MAX_LINES = 30;
const MAX_QTY = 99;
const ZIP_RULES = { DE: /^\d{5}$/, AT: /^\d{4}$/, CH: /^\d{4}$/ };

// Eingehende Warenkorb-Daten: nur IDs und Mengen. Preise kommen immer vom Server.
export function normalizeItems(raw) {
  if (!Array.isArray(raw) || raw.length === 0) throw new ApiError(400, 'Dein Warenkorb ist leer.');
  if (raw.length > MAX_LINES) throw new ApiError(400, 'So viele verschiedene Artikel auf einmal sind nicht möglich.');
  const merged = new Map();
  for (const item of raw) {
    const id = Number(item?.id);
    const qty = item?.qty === undefined ? 1 : Number(item.qty);
    if (!Number.isInteger(id) || id < 1 || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      throw new ApiError(400, 'Die Warenkorb-Daten sind ungültig. Bitte lade die Seite neu.');
    }
    merged.set(id, Math.min(MAX_QTY, (merged.get(id) ?? 0) + qty));
  }
  return [...merged].map(([id, qty]) => ({ id, qty }));
}

// Versand = höchste Versandklasse im Warenkorb. Ab dem Gratis-Limit entfällt er.
export function computeShipping(lines, subtotal, settings) {
  if (!lines.length) return 0;
  if (settings.free_shipping_from_cents > 0 && subtotal >= settings.free_shipping_from_cents) return 0;
  return Math.max(...lines.map((line) => line.shipping_cents ?? settings.shipping_default_cents));
}

export function quoteCart(db, rawItems) {
  const items = normalizeItems(rawItems);
  const settings = readSettings(db);
  const ids = items.map((item) => item.id);
  const rows = db
    .prepare(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id IN (${ids.map(() => '?').join(',')})`
    )
    .all(...ids);
  const products = new Map(rows.map((row) => [row.id, row]));
  const images = fetchImagesMap(db, ids);

  const lines = [];
  const problems = [];
  for (const { id, qty } of items) {
    const product = products.get(id);
    if (!product || !product.active) {
      problems.push({ id, name: product?.name ?? 'Artikel', message: 'Dieses Produkt ist leider nicht mehr verfügbar.' });
      continue;
    }
    if (product.stock !== null && product.stock < qty) {
      problems.push({
        id,
        name: product.name,
        message: product.stock > 0 ? `Nur noch ${product.stock} Stück auf Lager.` : 'Leider ausverkauft.',
        available: product.stock,
      });
      continue;
    }
    lines.push({
      id: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      qty,
      unit_price_cents: product.price_cents,
      line_total_cents: product.price_cents * qty,
      shipping_cents: product.shipping_cents,
      image: images.get(product.id)?.[0]?.url ?? null,
      legal_label: LEGAL_LABELS[product.legal] ?? '',
      managed: product.stock !== null,
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + line.line_total_cents, 0);
  const shipping = computeShipping(lines, subtotal, settings);
  const total = subtotal + shipping;
  const threshold = settings.free_shipping_from_cents;

  return {
    lines,
    problems,
    subtotal_cents: subtotal,
    shipping_cents: shipping,
    total_cents: total,
    vat_cents: Math.round(total - total / 1.19),
    free_shipping_from_cents: threshold > 0 ? threshold : null,
    free_shipping_remaining_cents: threshold > 0 && subtotal < threshold ? threshold - subtotal : 0,
    shop_open: settings.shop_open,
    shipping_countries: settings.shipping_countries,
    return_days: settings.return_days,
    delivery_time_text: settings.delivery_time_text,
  };
}

export function validateCustomer(input, settings) {
  const errors = {};

  const name = clean(input.name);
  if (name.length < 2 || name.length > 100) errors.name = 'Bitte gib deinen Namen an.';

  const email = clean(input.email).toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 120) errors.email = 'Bitte gib eine gültige E-Mail-Adresse an.';

  const street = clean(input.street);
  if (street.length < 3 || street.length > 120) errors.street = 'Bitte gib Straße und Hausnummer an.';

  const country = (clean(input.country) || 'DE').toUpperCase();
  if (!settings.shipping_countries.includes(country)) {
    errors.country = `Wir liefern aktuell nur nach ${settings.shipping_countries.join(', ')}.`;
  }

  const zip = clean(input.zip);
  const zipRule = ZIP_RULES[country] ?? /^[0-9A-Za-z -]{3,10}$/;
  if (!zipRule.test(zip)) errors.zip = country === 'AT' || country === 'CH' ? 'Bitte eine PLZ mit 4 Ziffern eingeben.' : 'Bitte eine PLZ mit 5 Ziffern eingeben.';

  const city = clean(input.city);
  if (city.length < 2 || city.length > 80) errors.city = 'Bitte gib deinen Ort an.';

  const phone = clean(input.phone);
  if (phone.length > 30) errors.phone = 'Telefonnummer: höchstens 30 Zeichen.';

  const note = clean(input.note);
  if (note.length > 500) errors.note = 'Hinweis: höchstens 500 Zeichen.';

  if (input.accept_terms !== true) {
    errors.accept_terms = 'Bitte bestätige, dass du die AGB und die Widerrufsbelehrung gelesen hast.';
  }

  if (Object.keys(errors).length) throw new ApiError(400, 'Bitte prüfe deine Angaben.', errors);
  return { name, email, street, zip, city, country, phone, note };
}

// Bestellt den Warenkorb. Gibt Nummer und Weiterleitung zurück (je nach Zahlungsanbieter).
export async function placeOrder(db, body) {
  const settings = readSettings(db);
  if (!settings.shop_open) {
    throw new ApiError(503, 'Der Shop nimmt gerade keine Bestellungen an. Schreib uns gern, wir melden uns.');
  }
  const customer = validateCustomer(body.customer ?? {}, settings);
  const items = normalizeItems(body.items);

  const order = transaction(db, () => {
    const quote = quoteCart(db, items);
    if (quote.problems.length) {
      const error = new ApiError(409, 'Einige Artikel sind in dieser Menge nicht mehr verfügbar. Bitte passe deinen Warenkorb an.');
      error.problems = quote.problems;
      throw error;
    }

    const seq = Number(db.prepare("SELECT value FROM settings WHERE key = 'order_seq'").get().value) + 1;
    db.prepare("UPDATE settings SET value = ? WHERE key = 'order_seq'").run(String(seq));
    const number = `CS-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`;
    const token = crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();

    const orderId = Number(
      insertRow(db, 'orders', {
        number,
        public_token: token,
        status: 'neu',
        payment_provider: settings.payment_provider,
        payment_status: 'offen',
        customer_name: customer.name,
        email: customer.email,
        phone: customer.phone,
        street: customer.street,
        zip: customer.zip,
        city: customer.city,
        country: customer.country,
        note: customer.note,
        subtotal_cents: quote.subtotal_cents,
        shipping_cents: quote.shipping_cents,
        total_cents: quote.total_cents,
        created_at: now,
        updated_at: now,
      }).lastInsertRowid
    );

    for (const line of quote.lines) {
      insertRow(db, 'order_items', {
        order_id: orderId,
        product_id: line.id,
        name: line.name,
        sku: line.sku,
        unit_price_cents: line.unit_price_cents,
        qty: line.qty,
        line_total_cents: line.line_total_cents,
      });
      if (line.managed) {
        // Lagerabzug nur, wenn die Menge wirklich noch da ist (sonst Rollback)
        const result = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?').run(line.qty, line.id, line.qty);
        if (result.changes !== 1) {
          throw new ApiError(409, 'Ein Artikel ist gerade ausverkauft. Bitte passe deinen Warenkorb an.');
        }
      }
    }

    return { number, token, total_cents: quote.total_cents };
  });

  const provider = getProvider(settings.payment_provider);
  const payment = await provider.start(order);
  return { number: order.number, redirect: payment.redirect };
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

// Kundenansicht. Nur mit dem Token aus der Bestätigung zugänglich.
export function getPublicOrder(db, number, token) {
  const order = db.prepare('SELECT * FROM orders WHERE number = ?').get(String(number));
  if (!order || !safeEqual(order.public_token, String(token ?? ''))) {
    throw new ApiError(404, 'Bestellung nicht gefunden. Bitte prüfe den Link aus deiner Bestätigung.');
  }
  const settings = readSettings(db);
  const items = db
    .prepare('SELECT name, sku, unit_price_cents, qty, line_total_cents FROM order_items WHERE order_id = ? ORDER BY id')
    .all(order.id);
  return {
    number: order.number,
    status: order.status,
    status_label: ORDER_STATUS_LABELS[order.status],
    payment_status: order.payment_status,
    payment_label: PAYMENT_LABELS[order.payment_status],
    payment_provider: order.payment_provider,
    created_at: order.created_at,
    customer: {
      name: order.customer_name,
      email: order.email,
      street: order.street,
      zip: order.zip,
      city: order.city,
      country: order.country,
    },
    items,
    subtotal_cents: order.subtotal_cents,
    shipping_cents: order.shipping_cents,
    total_cents: order.total_cents,
    payment_instructions: order.payment_status === 'offen' ? settings.manual_payment_text : null,
    contact_email: settings.contact_email,
    return_days: settings.return_days,
  };
}

export function listOrders(db, status) {
  const filter = ORDER_STATUSES.includes(status) ? 'WHERE o.status = ?' : '';
  return db
    .prepare(
      `SELECT o.id, o.number, o.status, o.payment_status, o.customer_name, o.email, o.total_cents, o.created_at,
        (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS item_count
       FROM orders o ${filter} ORDER BY o.id DESC LIMIT 300`
    )
    .all(...(filter ? [status] : []));
}

export function getOrderAdmin(db, id) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) throw new ApiError(404, 'Bestellung nicht gefunden.');
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(id);
  return { ...order, items };
}

// Bestand zurückbuchen, wenn eine Bestellung storniert wird.
function restock(db, orderId) {
  const items = db
    .prepare('SELECT product_id, qty FROM order_items WHERE order_id = ? AND product_id IS NOT NULL')
    .all(orderId);
  for (const item of items) {
    db.prepare('UPDATE products SET stock = stock + ? WHERE id = ? AND stock IS NOT NULL').run(item.qty, item.product_id);
  }
}

export function updateOrder(db, id, patch) {
  transaction(db, () => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) throw new ApiError(404, 'Bestellung nicht gefunden.');

    const status = patch.status ?? order.status;
    const paymentStatus = patch.payment_status ?? order.payment_status;
    if (!ORDER_STATUSES.includes(status) || !PAYMENT_STATUSES.includes(paymentStatus)) {
      throw new ApiError(400, 'Ungültiger Status.');
    }
    if (order.status === 'storniert' && status !== 'storniert') {
      throw new ApiError(409, 'Stornierte Bestellungen können nicht wieder geöffnet werden.');
    }
    if (status === 'storniert' && order.status !== 'storniert') restock(db, id);

    db.prepare('UPDATE orders SET status = ?, payment_status = ?, updated_at = ? WHERE id = ?').run(
      status,
      paymentStatus,
      new Date().toISOString(),
      id
    );
  });
}

export function dashboard(db, settings) {
  const count = (sql, ...params) => db.prepare(sql).get(...params).n;
  const sum = (sql) => db.prepare(sql).get().s;
  return {
    orders_new: count("SELECT COUNT(*) AS n FROM orders WHERE status = 'neu'"),
    orders_open: count("SELECT COUNT(*) AS n FROM orders WHERE status IN ('neu', 'in_bearbeitung', 'versandt')"),
    revenue_paid_cents: sum("SELECT COALESCE(SUM(total_cents), 0) AS s FROM orders WHERE payment_status = 'bezahlt' AND status != 'storniert'"),
    revenue_open_cents: sum("SELECT COALESCE(SUM(total_cents), 0) AS s FROM orders WHERE payment_status = 'offen' AND status != 'storniert'"),
    messages_open: count('SELECT COUNT(*) AS n FROM messages WHERE handled = 0'),
    products_active: count('SELECT COUNT(*) AS n FROM products WHERE active = 1'),
    low_stock: db
      .prepare(
        `SELECT id, name, stock FROM products
         WHERE active = 1 AND stock IS NOT NULL AND stock <= ? ORDER BY stock ASC, name LIMIT 10`
      )
      .all(settings.low_stock_threshold),
  };
}

export function createMessage(db, input) {
  const errors = {};
  const name = clean(input.name);
  if (name.length < 2 || name.length > 100) errors.name = 'Bitte gib deinen Namen an.';
  const email = clean(input.email).toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 120) errors.email = 'Bitte gib eine gültige E-Mail-Adresse an.';
  const vehicle = clean(input.vehicle);
  if (vehicle.length > 80) errors.vehicle = 'Fahrzeug: höchstens 80 Zeichen.';
  const message = clean(input.message);
  if (message.length < 5 || message.length > 2000) errors.message = 'Deine Nachricht: 5 bis 2000 Zeichen.';
  if (input.privacy !== true) errors.privacy = 'Bitte bestätige die Datenschutzerklärung.';
  if (Object.keys(errors).length) throw new ApiError(400, 'Bitte prüfe deine Angaben.', errors);

  insertRow(db, 'messages', {
    name,
    email,
    vehicle,
    goal: CONTACT_GOALS.includes(input.goal) ? input.goal : 'Sonstiges',
    message,
    handled: 0,
    created_at: new Date().toISOString(),
  });
}

export function listMessages(db) {
  return db.prepare('SELECT * FROM messages ORDER BY handled ASC, id DESC LIMIT 300').all();
}

export function setMessageHandled(db, id, handled) {
  const result = db.prepare('UPDATE messages SET handled = ? WHERE id = ?').run(handled ? 1 : 0, id);
  if (result.changes === 0) throw new ApiError(404, 'Nachricht nicht gefunden.');
}
