import { ApiError } from './errors.js';

// Sicherheits-Header für alle Antworten.
// Inline-Styles und Inline-Skripte sind bewusst verboten (CSP), daher alles in Dateien.
const CSP = [
  "default-src 'self'",
  "img-src 'self' data:",
  "style-src 'self'",
  "font-src 'self'",
  "script-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

export function securityHeaders(req, res, next) {
  res.set({
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  next();
}

// Schutz gegen CSRF: Schreibende Anfragen von einer fremden Seite werden blockiert.
export function originGuard(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const origin = req.get('origin');
  if (origin) {
    let originHost = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    if (originHost !== req.get('host')) {
      return next(new ApiError(403, 'Diese Anfrage wurde aus Sicherheitsgründen blockiert.'));
    }
  }
  next();
}

// Einfaches Zeitfenster-Limit im Speicher (reicht für eine kleine Shop-Instanz).
export function createRateLimiter({ windowMs, max }) {
  const hits = new Map();
  return {
    allow(key) {
      const now = Date.now();
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      recent.push(now);
      hits.set(key, recent);
      return recent.length <= max;
    },
    reset(key) {
      hits.delete(key);
    },
  };
}
