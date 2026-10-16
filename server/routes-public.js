import express from 'express';
import { ApiError } from './errors.js';
import { getPublicProduct, listCategories, listPublicProducts } from './catalog.js';
import { publicSettings, readSettings } from './settings.js';
import { createMessage, getPublicOrder, placeOrder, quoteCart } from './shop.js';

// Öffentliche Schnittstelle für Website und Shop.
export function publicRouter(db) {
  const router = express.Router();

  router.get('/shop', (req, res) => {
    const settings = readSettings(db);
    res.json({ ...publicSettings(settings), categories: listCategories(db) });
  });

  router.get('/products', (req, res) => {
    const products = listPublicProducts(
      db,
      {
        category: req.query.category,
        q: req.query.q,
        sort: req.query.sort,
        featured: req.query.featured === '1',
      },
      readSettings(db)
    );
    res.json({ products });
  });

  router.get('/products/:slug', (req, res) => {
    const product = getPublicProduct(db, req.params.slug, readSettings(db));
    if (!product) throw new ApiError(404, 'Dieses Produkt gibt es leider nicht (mehr).');
    res.json(product);
  });

  // Warenkorb prüfen: liefert aktuelle Preise, Versand und Probleme (z. B. Lager)
  router.post('/cart/quote', (req, res) => {
    res.json(quoteCart(db, req.body?.items));
  });

  router.post('/orders', async (req, res) => {
    const result = await placeOrder(db, req.body ?? {});
    res.status(201).json(result);
  });

  router.get('/orders/:number', (req, res) => {
    res.json(getPublicOrder(db, req.params.number, req.query.t));
  });

  router.post('/contact', (req, res) => {
    createMessage(db, req.body ?? {});
    res.status(201).json({ ok: true });
  });

  return router;
}
