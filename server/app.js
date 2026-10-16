import path from 'node:path';
import express from 'express';
import { config } from './config.js';
import { ApiError } from './errors.js';
import { originGuard, securityHeaders } from './security.js';
import { adminRouter } from './routes-admin.js';
import { publicRouter } from './routes-public.js';

export function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(securityHeaders);
  app.use(originGuard);
  app.use(express.json({ limit: '100kb' }));

  app.use('/api', publicRouter(db));
  app.use('/api/admin', adminRouter(db));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Nicht gefunden.' }));

  // Hochgeladene Produktbilder. Keine Verzeichnisliste, keine Dotfiles.
  app.use(
    '/uploads',
    express.static(config.uploadDir, { index: false, dotfiles: 'deny', maxAge: '7d' })
  );

  // Website und Shop-Seiten. /shop → shop.html, /admin → admin.html usw.
  app.use(express.static(config.publicDir, { extensions: ['html'], dotfiles: 'deny' }));

  const page = (file) => (req, res) => res.sendFile(path.join(config.publicDir, file));
  app.get('/produkt/:slug', page('produkt.html'));
  app.get('/bestellung/:number', page('bestellung.html'));

  app.use((req, res) => {
    res.status(404).sendFile(path.join(config.publicDir, '404.html'));
  });

  app.use((error, req, res, next) => {
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        error: error.message,
        fields: error.fields ?? undefined,
        problems: error.problems ?? undefined,
      });
    }
    if (error?.type === 'entity.parse.failed' || error?.type === 'entity.too.large') {
      return res.status(400).json({ error: 'Die Anfrage ist ungültig oder zu groß.' });
    }
    if (error?.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Eine Datei ist zu groß (maximal 6 MB).' });
    }
    if (error?.code === 'LIMIT_FILE_COUNT' || error?.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Bitte höchstens 8 Bilder auf einmal hochladen.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Da ist etwas schiefgelaufen. Bitte versuche es gleich noch einmal.' });
  });

  return app;
}
