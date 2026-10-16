import { createApp } from './app.js';
import { config } from './config.js';
import { openDatabase } from './db.js';

const db = openDatabase();
const app = createApp(db);

app.listen(config.port, () => {
  console.log(`COLDSTART läuft auf http://localhost:${config.port}`);
  if (db.prepare('SELECT COUNT(*) AS n FROM admins').get().n === 0) {
    console.log('Noch kein Admin-Zugang vorhanden. Anlegen mit: ADMIN_PASSWORD=… npm run admin:create -- du@example.de');
  }
});
