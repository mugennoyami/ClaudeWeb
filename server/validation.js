// Kleine Hilfen für Eingaben. Alles, was von außen kommt, läuft hier durch.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Text trimmen. Länge prüft der Aufrufer, damit er passende Fehlermeldungen geben kann.
export function clean(value) {
  return String(value ?? '').trim();
}

// "12,90", "12.90", 12.9 → Cent. Leer → null. Ungültig → NaN.
export function parseEuro(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  let text = String(value).trim();
  if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.');
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < 0 || amount > 100000) return NaN;
  return Math.round(amount * 100);
}

// Ganze Zahl ohne Vorzeichen. Leer → null. Ungültig → NaN.
export function parseWhole(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) return NaN;
  return Number(text);
}

export function toBool(value) {
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'on';
}

export function pick(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

export function formatEuro(cents) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
