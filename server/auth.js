import crypto from 'node:crypto';
import { config } from './config.js';

export const COOKIE_NAME = 'cs_admin';
const SCRYPT = { N: 16384, r: 8, p: 1 };

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, SCRYPT);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored ?? '').split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, SCRYPT);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// Im Datenbank wird nur der Hash des Session-Tokens gespeichert, nie das Token selbst.
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export function createSession(db, adminId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + config.sessionHours * 3600 * 1000;
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  db.prepare('INSERT INTO sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)').run(
    sha256(token),
    adminId,
    expiresAt
  );
  return token;
}

export function findSessionAdmin(db, token) {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT a.id, a.email, s.expires_at
       FROM sessions s JOIN admins a ON a.id = s.admin_id
       WHERE s.token_hash = ?`
    )
    .get(sha256(token));
  if (!row || row.expires_at < Date.now()) return null;
  return { id: row.id, email: row.email };
}

export function destroySession(db, token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}

export function readCookie(req, name) {
  const header = req.get('cookie') || '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function sessionCookie(token) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${config.sessionHours * 3600}`,
  ];
  if (config.cookieSecure) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookie() {
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
  if (config.cookieSecure) parts.push('Secure');
  return parts.join('; ');
}

export function requireAdmin(db) {
  return (req, res, next) => {
    const admin = findSessionAdmin(db, readCookie(req, COOKIE_NAME));
    if (!admin) return res.status(401).json({ error: 'Bitte melde dich im Admin-Bereich an.' });
    req.admin = admin;
    next();
  };
}
