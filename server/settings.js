import { ApiError } from './errors.js';
import { clean, parseEuro, toBool } from './validation.js';

const TEXT_KEYS = ['shop_name', 'contact_email', 'delivery_time_text', 'manual_payment_text'];

export function readSettings(db) {
  const raw = Object.fromEntries(db.prepare('SELECT key, value FROM settings').all().map((r) => [r.key, r.value]));
  return {
    shop_open: raw.shop_open === '1',
    shop_name: raw.shop_name,
    contact_email: raw.contact_email,
    shipping_default_cents: Number(raw.shipping_default_cents),
    free_shipping_from_cents: Number(raw.free_shipping_from_cents),
    shipping_countries: raw.shipping_countries.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean),
    delivery_time_text: raw.delivery_time_text,
    return_days: Number(raw.return_days),
    low_stock_threshold: Number(raw.low_stock_threshold),
    payment_provider: raw.payment_provider,
    manual_payment_text: raw.manual_payment_text,
    order_seq: Number(raw.order_seq),
  };
}

// Nur das, was Kunden sehen dürfen.
export function publicSettings(settings) {
  return {
    shop_open: settings.shop_open,
    shop_name: settings.shop_name,
    contact_email: settings.contact_email,
    shipping_default_cents: settings.shipping_default_cents,
    free_shipping_from_cents: settings.free_shipping_from_cents,
    shipping_countries: settings.shipping_countries,
    delivery_time_text: settings.delivery_time_text,
    return_days: settings.return_days,
    low_stock_threshold: settings.low_stock_threshold,
  };
}

// Für das Admin-Formular: Geldbeträge in Euro.
export function settingsForAdmin(db) {
  const s = readSettings(db);
  return {
    shop_open: s.shop_open,
    shop_name: s.shop_name,
    contact_email: s.contact_email,
    shipping_default_eur: s.shipping_default_cents / 100,
    free_shipping_from_eur: s.free_shipping_from_cents / 100,
    shipping_countries: s.shipping_countries.join(','),
    delivery_time_text: s.delivery_time_text,
    return_days: s.return_days,
    low_stock_threshold: s.low_stock_threshold,
    manual_payment_text: s.manual_payment_text,
    payment_provider: s.payment_provider,
  };
}

export function saveSettings(db, body) {
  const errors = {};
  const values = {};

  values.shop_open = toBool(body.shop_open) ? '1' : '0';

  for (const key of TEXT_KEYS) {
    const text = clean(body[key]);
    if (text.length > 1000) errors[key] = 'Bitte kürzer formulieren (max. 1000 Zeichen).';
    values[key] = text;
  }
  if (values.shop_name.length < 2) errors.shop_name = 'Der Shop-Name braucht mindestens 2 Zeichen.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.contact_email)) {
    errors.contact_email = 'Bitte eine gültige E-Mail-Adresse eingeben.';
  }

  const shipping = parseEuro(body.shipping_default_eur);
  if (shipping === null || Number.isNaN(shipping)) errors.shipping_default_eur = 'Bitte einen Betrag eingeben (z. B. 4,90).';
  else values.shipping_default_cents = String(shipping);

  const free = parseEuro(body.free_shipping_from_eur || '0');
  if (free === null || Number.isNaN(free)) errors.free_shipping_from_eur = 'Bitte einen Betrag eingeben oder 0 für „kein Gratis-Versand“.';
  else values.free_shipping_from_cents = String(free);

  const countries = clean(body.shipping_countries).toUpperCase().split(',').map((c) => c.trim()).filter(Boolean);
  if (!countries.length || countries.some((c) => !/^[A-Z]{2}$/.test(c))) {
    errors.shipping_countries = 'Bitte Ländercodes mit Komma trennen, z. B. DE,AT.';
  } else values.shipping_countries = countries.join(',');

  const days = Number(body.return_days);
  if (!Number.isInteger(days) || days < 0 || days > 365) errors.return_days = 'Rückgabefrist zwischen 0 und 365 Tagen.';
  else values.return_days = String(days);

  const threshold = Number(body.low_stock_threshold);
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 1000) errors.low_stock_threshold = 'Bitte eine Zahl zwischen 0 und 1000.';
  else values.low_stock_threshold = String(threshold);

  if (Object.keys(errors).length) throw new ApiError(400, 'Bitte prüfe die markierten Felder.', errors);

  const update = db.prepare('UPDATE settings SET value = ? WHERE key = ?');
  for (const [key, value] of Object.entries(values)) update.run(value, key);
  return settingsForAdmin(db);
}
