// Legt Beispielprodukte an, damit der Shop vorzeigbar aussieht. Nur wenn noch keine Produkte existieren.
// Aufruf: npm run demo:seed   (Beispiele danach im Admin-Bereich löschen oder überschreiben)
import { saveProduct } from '../catalog.js';
import { openDatabase } from '../db.js';

const db = openDatabase();
if (db.prepare('SELECT COUNT(*) AS n FROM products').get().n > 0) {
  console.log('Es gibt schon Produkte – nichts angelegt.');
  process.exit(0);
}

const category = (slug) => db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug)?.id ?? null;
const demo = [
  { name: 'Motorraum-Halter Set (CNC)', category: 'cnc', short_desc: 'Gefräst aus Aluminium, passgenau für E36 und E46.', price: '49,00', stock: '8', legal: 'keine', badge: 'Neu', featured: true, sku: 'DEMO-CNC-01' },
  { name: 'Innenraum-Blende Mittelkonsole (3D-Druck)', category: '3d-druck', short_desc: 'Technischer Kunststoff, mit Clip-Befestigung.', price: '24,90', stock: '3', legal: 'keine', badge: 'Limitiert', featured: true, sku: 'DEMO-3D-01' },
  { name: 'Track-Sturzplatten Set', category: 'track', short_desc: 'Für die Rennstrecke. Nicht für den Straßenverkehr.', price: '129,00', compare_at: '149,00', stock: '4', legal: 'track', badge: 'Bestseller', featured: true, sku: 'DEMO-TRK-01' },
  { name: 'COLDSTART Sticker (Vinyl)', category: 'sticker', short_desc: 'Wetterfest, für Lack, Laptop und Werkstatt.', price: '4,50', shipping: '2,90', legal: 'keine', featured: true, sku: 'DEMO-STK-01' },
  { name: 'Sportluftfilter-Einsatz E46', category: 'tuning', short_desc: 'Mit ABE. Mehr Ansaugluft, unauffällige Optik.', price: '79,90', stock: '20', legal: 'abe', sku: 'DEMO-TUN-01' },
  { name: 'Kabelhalter-Set Motorraum (3D-Druck)', category: '3d-druck', short_desc: 'Sechs Halter, schnell montiert.', price: '12,90', stock: '30', legal: 'keine', sku: 'DEMO-3D-02' },
];

for (const item of demo) {
  saveProduct(db, null, {
    name: item.name,
    category_id: category(item.category),
    short_desc: item.short_desc,
    description: `${item.short_desc}\n\nBeispielprodukt – bitte im Admin-Bereich anpassen oder löschen.`,
    price: item.price,
    compare_at: item.compare_at ?? '',
    stock: item.stock ?? '',
    shipping: item.shipping ?? '',
    sku: item.sku,
    legal: item.legal,
    badge: item.badge ?? '',
    featured: item.featured ? '1' : '0',
    active: '1',
    sort: '0',
  });
}
console.log(`${demo.length} Beispielprodukte angelegt.`);
