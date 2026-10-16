import { ApiError } from './errors.js';
import { insertRow, transaction, updateRow } from './db.js';
import { removeUpload } from './uploads.js';
import { clean, parseEuro, parseWhole, pick, toBool } from './validation.js';

export const LEGAL = ['abe', 'gutachten', 'track', 'keine'];
export const LEGAL_LABELS = { abe: 'ABE vorhanden', gutachten: 'Teilegutachten', track: 'Nur Rennstrecke', keine: '' };
export const BADGES = ['', 'Neu', 'Limitiert', 'Bestseller', 'Drop'];

const PRODUCT_SELECT = `SELECT p.*, c.slug AS category_slug, c.name AS category_name
  FROM products p LEFT JOIN categories c ON c.id = p.category_id`;

const SORTS = {
  preis_asc: 'p.price_cents ASC',
  preis_desc: 'p.price_cents DESC',
  neu: 'p.id DESC',
  name: 'p.name COLLATE NOCASE ASC',
};

export function slugify(text) {
  return (
    String(text)
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'produkt'
  );
}

function uniqueSlug(db, table, base, exceptId) {
  let slug = base;
  let n = 2;
  const check = db.prepare(`SELECT id FROM ${table} WHERE slug = ? AND (? IS NULL OR id != ?)`);
  while (check.get(slug, exceptId, exceptId)) slug = `${base}-${n++}`;
  return slug;
}

export function fetchImagesMap(db, ids) {
  const map = new Map();
  if (!ids.length) return map;
  const rows = db
    .prepare(
      `SELECT id, product_id, file FROM product_images
       WHERE product_id IN (${ids.map(() => '?').join(',')}) ORDER BY position, id`
    )
    .all(...ids);
  for (const row of rows) {
    if (!map.has(row.product_id)) map.set(row.product_id, []);
    map.get(row.product_id).push({ id: row.id, url: `/uploads/${row.file}` });
  }
  return map;
}

// Was Kunden angezeigt wird. Bestandszahl nur, wenn es wirklich knapp wird.
function publicProduct(p, images, settings) {
  const lowStock = p.stock !== null && p.stock > 0 && p.stock <= settings.low_stock_threshold;
  const discount =
    p.compare_at_cents && p.compare_at_cents > p.price_cents
      ? Math.round(100 - (p.price_cents * 100) / p.compare_at_cents)
      : 0;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category_slug ? { slug: p.category_slug, name: p.category_name } : null,
    short_desc: p.short_desc,
    description: p.description,
    sku: p.sku,
    price_cents: p.price_cents,
    compare_at_cents: discount > 0 ? p.compare_at_cents : null,
    discount_percent: discount,
    shipping_cents: p.shipping_cents,
    legal: p.legal,
    legal_label: LEGAL_LABELS[p.legal] ?? '',
    badge: p.badge,
    available: p.stock === null || p.stock > 0,
    low_stock: lowStock,
    stock_left: lowStock ? p.stock : null,
    images: images ?? [],
  };
}

export function listCategories(db) {
  return db
    .prepare(
      `SELECT c.id, c.slug, c.name, c.description, c.sort,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.active = 1) AS product_count
       FROM categories c ORDER BY c.sort, c.name`
    )
    .all();
}

export function listPublicProducts(db, { category, q, sort, featured }, settings) {
  const where = ['p.active = 1'];
  const params = [];
  if (category) {
    where.push('c.slug = ?');
    params.push(String(category).slice(0, 60));
  }
  const search = clean(q).slice(0, 80);
  if (search) {
    where.push('(p.name LIKE ? OR p.short_desc LIKE ? OR p.sku LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (featured) where.push('p.featured = 1');

  const order = SORTS[sort] ?? 'p.sort ASC, p.id DESC';
  const limit = featured ? 4 : 200;
  let rows = db.prepare(`${PRODUCT_SELECT} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ${limit}`).all(...params);

  // Startseite: keine Empfehlungen markiert? Dann die neuesten Produkte zeigen.
  if (featured && rows.length === 0) {
    rows = db.prepare(`${PRODUCT_SELECT} WHERE p.active = 1 ORDER BY p.id DESC LIMIT 4`).all();
  }

  const images = fetchImagesMap(db, rows.map((r) => r.id));
  return rows.map((r) => publicProduct(r, images.get(r.id), settings));
}

export function getPublicProduct(db, slug, settings) {
  const row = db.prepare(`${PRODUCT_SELECT} WHERE p.slug = ? AND p.active = 1`).get(String(slug));
  if (!row) return null;
  const images = fetchImagesMap(db, [row.id]).get(row.id);
  const related = db
    .prepare(
      `${PRODUCT_SELECT} WHERE p.active = 1 AND p.id != ? AND p.category_id IS ?
       ORDER BY p.sort ASC, p.id DESC LIMIT 4`
    )
    .all(row.id, row.category_id);
  const relatedImages = fetchImagesMap(db, related.map((r) => r.id));
  return {
    ...publicProduct(row, images, settings),
    related: related.map((r) => publicProduct(r, relatedImages.get(r.id), settings)),
  };
}

// Admin-Sicht: alles, auch Entwürfe und Bestand.
function adminProduct(p, images) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category_id: p.category_id,
    category_name: p.category_name ?? null,
    short_desc: p.short_desc,
    description: p.description,
    sku: p.sku,
    price_cents: p.price_cents,
    compare_at_cents: p.compare_at_cents,
    stock: p.stock,
    shipping_cents: p.shipping_cents,
    legal: p.legal,
    badge: p.badge,
    featured: Boolean(p.featured),
    active: Boolean(p.active),
    sort: p.sort,
    images: images ?? [],
    updated_at: p.updated_at,
  };
}

export function listAdminProducts(db, { q, category }) {
  const where = [];
  const params = [];
  const search = clean(q).slice(0, 80);
  if (search) {
    where.push('(p.name LIKE ? OR p.sku LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    where.push('p.category_id = ?');
    params.push(Number(category));
  }
  const sql = `${PRODUCT_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY p.active DESC, p.sort ASC, p.id DESC`;
  const rows = db.prepare(sql).all(...params);
  const images = fetchImagesMap(db, rows.map((r) => r.id));
  return rows.map((r) => adminProduct(r, images.get(r.id)));
}

export function getAdminProduct(db, id) {
  const row = db.prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).get(id);
  if (!row) throw new ApiError(404, 'Produkt nicht gefunden.');
  return adminProduct(row, fetchImagesMap(db, [id]).get(id));
}

function categoryExists(db, id) {
  return Boolean(db.prepare('SELECT id FROM categories WHERE id = ?').get(id));
}

// Legt ein Produkt an (id = null) oder speichert es (id = Zahl). Gibt die Produkt-ID zurück.
export function saveProduct(db, id, body) {
  const errors = {};

  const name = clean(body.name);
  if (name.length < 2 || name.length > 120) errors.name = 'Name: 2 bis 120 Zeichen.';

  const shortDesc = clean(body.short_desc);
  if (shortDesc.length > 200) errors.short_desc = 'Kurzbeschreibung: höchstens 200 Zeichen.';

  const description = clean(body.description);
  if (description.length > 5000) errors.description = 'Beschreibung: höchstens 5000 Zeichen.';

  const price = parseEuro(body.price);
  if (!(price > 0)) errors.price = 'Bitte einen Preis eingeben, z. B. 12,90.';

  const compareAt = parseEuro(body.compare_at);
  if (Number.isNaN(compareAt)) errors.compare_at = 'Bitte einen Betrag eingeben oder leer lassen.';
  else if (compareAt !== null && price > 0 && compareAt <= price) {
    errors.compare_at = 'Der Vergleichspreis muss höher sein als der Preis.';
  }

  const stock = parseWhole(body.stock);
  if (Number.isNaN(stock) || (stock !== null && stock > 100000)) {
    errors.stock = 'Lagerbestand als ganze Zahl eingeben, oder leer lassen für „unbegrenzt“.';
  }

  const shipping = parseEuro(body.shipping);
  if (Number.isNaN(shipping)) errors.shipping = 'Versandkosten als Betrag eingeben (z. B. 2,90) oder leer lassen.';

  const sku = clean(body.sku);
  if (sku.length > 40) errors.sku = 'Artikelnummer: höchstens 40 Zeichen.';

  const sort = parseWhole(body.sort);
  if (Number.isNaN(sort) || (sort !== null && sort > 9999)) errors.sort = 'Reihenfolge: ganze Zahl zwischen 0 und 9999.';

  let categoryId = null;
  if (body.category_id !== null && body.category_id !== undefined && body.category_id !== '') {
    categoryId = Number(body.category_id);
    if (!Number.isInteger(categoryId) || !categoryExists(db, categoryId)) {
      errors.category_id = 'Bitte eine vorhandene Kategorie wählen.';
    }
  }

  if (Object.keys(errors).length) throw new ApiError(400, 'Bitte prüfe die markierten Felder.', errors);

  const now = new Date().toISOString();
  const row = {
    slug: uniqueSlug(db, 'products', slugify(clean(body.slug) || name), id),
    name,
    category_id: categoryId,
    short_desc: shortDesc,
    description,
    price_cents: price,
    compare_at_cents: compareAt,
    stock,
    sku,
    shipping_cents: shipping,
    legal: pick(body.legal, LEGAL, 'keine'),
    badge: pick(body.badge ?? '', BADGES, ''),
    featured: toBool(body.featured) ? 1 : 0,
    active: toBool(body.active) ? 1 : 0,
    sort: sort ?? 0,
  };

  if (id === null) {
    return Number(insertRow(db, 'products', { ...row, created_at: now, updated_at: now }).lastInsertRowid);
  }
  const result = updateRow(db, 'products', id, { ...row, updated_at: now });
  if (result.changes === 0) throw new ApiError(404, 'Produkt nicht gefunden.');
  return id;
}

// Produkte mit Bestellungen werden nur deaktiviert, damit alte Bestellungen vollständig bleiben.
export function deleteProduct(db, id) {
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
  if (!product) throw new ApiError(404, 'Produkt nicht gefunden.');

  const used = db.prepare('SELECT COUNT(*) AS n FROM order_items WHERE product_id = ?').get(id).n;
  if (used > 0) {
    updateRow(db, 'products', id, { active: 0, updated_at: new Date().toISOString() });
    return { archived: true };
  }

  const files = db.prepare('SELECT file FROM product_images WHERE product_id = ?').all(id).map((r) => r.file);
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  files.forEach((file) => removeUpload(file));
  return { deleted: true };
}

export function addProductImages(db, productId, fileNames) {
  if (!db.prepare('SELECT id FROM products WHERE id = ?').get(productId)) {
    throw new ApiError(404, 'Produkt nicht gefunden.');
  }
  const max = db.prepare('SELECT COALESCE(MAX(position), -1) AS m FROM product_images WHERE product_id = ?').get(productId).m;
  fileNames.forEach((file, index) => {
    insertRow(db, 'product_images', { product_id: productId, file, position: max + 1 + index });
  });
}

export function deleteProductImage(db, imageId) {
  const image = db.prepare('SELECT * FROM product_images WHERE id = ?').get(imageId);
  if (!image) throw new ApiError(404, 'Bild nicht gefunden.');
  db.prepare('DELETE FROM product_images WHERE id = ?').run(imageId);
  removeUpload(image.file);
}

export function setMainImage(db, imageId) {
  const image = db.prepare('SELECT * FROM product_images WHERE id = ?').get(imageId);
  if (!image) throw new ApiError(404, 'Bild nicht gefunden.');
  transaction(db, () => {
    db.prepare('UPDATE product_images SET position = position + 1 WHERE product_id = ?').run(image.product_id);
    db.prepare('UPDATE product_images SET position = 0 WHERE id = ?').run(imageId);
  });
}

export function saveCategory(db, id, body) {
  const errors = {};
  const name = clean(body.name);
  if (name.length < 2 || name.length > 60) errors.name = 'Name: 2 bis 60 Zeichen.';
  const description = clean(body.description);
  if (description.length > 300) errors.description = 'Beschreibung: höchstens 300 Zeichen.';
  const sort = parseWhole(body.sort);
  if (Number.isNaN(sort)) errors.sort = 'Reihenfolge: ganze Zahl eingeben.';
  if (Object.keys(errors).length) throw new ApiError(400, 'Bitte prüfe die markierten Felder.', errors);

  const row = {
    slug: uniqueSlug(db, 'categories', slugify(name), id),
    name,
    description,
    sort: sort ?? 0,
  };
  if (id === null) return Number(insertRow(db, 'categories', row).lastInsertRowid);
  updateRow(db, 'categories', id, row);
  return id;
}

export function deleteCategory(db, id) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM products WHERE category_id = ?').get(id).n;
  if (count > 0) {
    throw new ApiError(409, `Diese Kategorie enthält noch ${count} Produkt(e). Verschiebe sie zuerst in eine andere Kategorie.`);
  }
  const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  if (result.changes === 0) throw new ApiError(404, 'Kategorie nicht gefunden.');
}
