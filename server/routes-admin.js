import express from 'express';
import { ApiError } from './errors.js';
import {
  addProductImages,
  deleteCategory,
  deleteProduct,
  deleteProductImage,
  getAdminProduct,
  listAdminProducts,
  listCategories,
  saveCategory,
  saveProduct,
  setMainImage,
} from './catalog.js';
import { createRateLimiter } from './security.js';
import {
  clearSessionCookie,
  COOKIE_NAME,
  createSession,
  destroySession,
  readCookie,
  requireAdmin,
  sessionCookie,
  verifyPassword,
} from './auth.js';
import { clean } from './validation.js';
import { dashboard, getOrderAdmin, listMessages, listOrders, setMessageHandled, updateOrder } from './shop.js';
import { readSettings, saveSettings, settingsForAdmin } from './settings.js';
import { removeUpload, upload, verifyImage } from './uploads.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new ApiError(404, 'Nicht gefunden.');
  return id;
}

// Verwaltungsbereich: Login, Produkte, Bilder, Kategorien, Bestellungen, Nachrichten, Einstellungen.
export function adminRouter(db) {
  const router = express.Router();
  const perEmail = createRateLimiter({ windowMs: FIFTEEN_MINUTES, max: 8 });
  const perIp = createRateLimiter({ windowMs: FIFTEEN_MINUTES, max: 40 });

  router.post('/login', (req, res) => {
    const email = clean(req.body?.email).toLowerCase();
    const password = String(req.body?.password ?? '');
    if (!perIp.allow(req.ip) || !perEmail.allow(email)) {
      throw new ApiError(429, 'Zu viele Anmeldeversuche. Bitte warte 15 Minuten.');
    }
    const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email);
    if (!admin || !verifyPassword(password, admin.password_hash)) {
      throw new ApiError(401, 'E-Mail oder Passwort stimmt nicht.');
    }
    perEmail.reset(email);
    res.set('Set-Cookie', sessionCookie(createSession(db, admin.id)));
    res.json({ email: admin.email });
  });

  router.post('/logout', (req, res) => {
    destroySession(db, readCookie(req, COOKIE_NAME));
    res.set('Set-Cookie', clearSessionCookie());
    res.json({ ok: true });
  });

  router.use(requireAdmin(db));

  router.get('/me', (req, res) => {
    res.json(req.admin);
  });

  router.get('/dashboard', (req, res) => {
    res.json(dashboard(db, readSettings(db)));
  });

  // Produkte
  router.get('/products', (req, res) => {
    res.json({ products: listAdminProducts(db, req.query) });
  });

  router.post('/products', (req, res) => {
    const id = saveProduct(db, null, req.body ?? {});
    res.status(201).json(getAdminProduct(db, id));
  });

  router.get('/products/:id', (req, res) => {
    res.json(getAdminProduct(db, parseId(req.params.id)));
  });

  router.put('/products/:id', (req, res) => {
    const id = parseId(req.params.id);
    saveProduct(db, id, req.body ?? {});
    res.json(getAdminProduct(db, id));
  });

  router.delete('/products/:id', (req, res) => {
    res.json(deleteProduct(db, parseId(req.params.id)));
  });

  // Bilder: hochladen, löschen, als Hauptbild setzen
  router.post('/products/:id/images', upload.array('images', 8), (req, res) => {
    const files = req.files ?? [];
    const cleanup = () => files.forEach((file) => removeUpload(file.filename));
    try {
      const id = parseId(req.params.id);
      if (!files.length) throw new ApiError(400, 'Bitte wähle mindestens ein Bild aus.');
      if (!files.every((file) => verifyImage(file.path, file.mimetype))) {
        throw new ApiError(400, 'Mindestens eine Datei ist kein gültiges Bild (JPG, PNG oder WebP).');
      }
      addProductImages(db, id, files.map((file) => file.filename));
      res.status(201).json(getAdminProduct(db, id));
    } catch (error) {
      cleanup();
      throw error;
    }
  });

  router.delete('/images/:id', (req, res) => {
    deleteProductImage(db, parseId(req.params.id));
    res.json({ ok: true });
  });

  router.post('/images/:id/main', (req, res) => {
    setMainImage(db, parseId(req.params.id));
    res.json({ ok: true });
  });

  // Kategorien
  router.get('/categories', (req, res) => {
    res.json({ categories: listCategories(db) });
  });

  router.post('/categories', (req, res) => {
    const id = saveCategory(db, null, req.body ?? {});
    res.status(201).json({ id });
  });

  router.put('/categories/:id', (req, res) => {
    const id = parseId(req.params.id);
    saveCategory(db, id, req.body ?? {});
    res.json({ id });
  });

  router.delete('/categories/:id', (req, res) => {
    deleteCategory(db, parseId(req.params.id));
    res.json({ ok: true });
  });

  // Bestellungen
  router.get('/orders', (req, res) => {
    res.json({ orders: listOrders(db, req.query.status) });
  });

  router.get('/orders/:id', (req, res) => {
    res.json(getOrderAdmin(db, parseId(req.params.id)));
  });

  router.put('/orders/:id', (req, res) => {
    const id = parseId(req.params.id);
    updateOrder(db, id, { status: req.body?.status, payment_status: req.body?.payment_status });
    res.json(getOrderAdmin(db, id));
  });

  // Kontaktanfragen
  router.get('/messages', (req, res) => {
    res.json({ messages: listMessages(db) });
  });

  router.put('/messages/:id', (req, res) => {
    setMessageHandled(db, parseId(req.params.id), req.body?.handled === true);
    res.json({ ok: true });
  });

  // Einstellungen
  router.get('/settings', (req, res) => {
    res.json(settingsForAdmin(db));
  });

  router.put('/settings', (req, res) => {
    res.json(saveSettings(db, req.body ?? {}));
  });

  return router;
}
