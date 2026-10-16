import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.resolve(root, process.env.DATA_DIR || 'data');

export const config = {
  root,
  publicDir: path.join(root, 'public'),
  dataDir,
  dbFile: path.join(dataDir, 'coldstart.sqlite'),
  uploadDir: path.join(dataDir, 'uploads'),
  port: Number(process.env.PORT) || 3000,
  // Sessions nur über HTTPS verschicken, sobald die Seite live läuft
  cookieSecure: process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === '1'
    : process.env.NODE_ENV === 'production',
  // Hinter Reverse-Proxy (z. B. Hoster) auf 1 setzen, damit die echte IP erkannt wird
  trustProxy: process.env.TRUST_PROXY === '1' ? 1 : false,
  sessionHours: 8,
};
