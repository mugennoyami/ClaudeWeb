// Legt einen Admin-Zugang an oder setzt das Passwort eines bestehenden zurück.
// Aufruf: ADMIN_PASSWORD='mindestens-12-zeichen' npm run admin:create -- du@example.de
import { hashPassword } from '../auth.js';
import { openDatabase } from '../db.js';

const email = (process.argv[2] ?? '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? '';

if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
  console.error('Bitte eine E-Mail-Adresse angeben: npm run admin:create -- du@example.de');
  process.exit(1);
}
if (password.length < 12) {
  console.error('ADMIN_PASSWORD muss mindestens 12 Zeichen lang sein.');
  process.exit(1);
}

const db = openDatabase();
db.prepare(
  `INSERT INTO admins (email, password_hash, created_at) VALUES (?, ?, ?)
   ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash`
).run(email, hashPassword(password), new Date().toISOString());

console.log(`Admin-Zugang für ${email} ist eingerichtet.`);
