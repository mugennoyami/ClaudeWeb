import { api, initChrome, money } from './common.js';

// Für alle Rechtsseiten: Kopf- und Fußzeile einhängen und Shop-Werte aus den Einstellungen einsetzen.
initChrome();

const bind = (key, value) => {
  document.querySelectorAll(`[data-bind="${key}"]`).forEach((el) => {
    el.textContent = value;
  });
};

api('/shop')
  .then((shop) => {
    bind('shipping-default', money(shop.shipping_default_cents));
    bind('free-from', shop.free_shipping_from_cents ? money(shop.free_shipping_from_cents) : 'derzeit nicht aktiv');
    bind('countries', shop.shipping_countries.join(', '));
    bind('delivery', shop.delivery_time_text);
    bind('return-days', String(shop.return_days));
    bind('contact-email', shop.contact_email);
    document.querySelectorAll('[data-bind-href="contact-email"]').forEach((el) => {
      el.setAttribute('href', `mailto:${shop.contact_email}`);
    });
  })
  .catch(() => {
    // Ohne Shop-Daten bleiben die Platzhalter-Texte stehen
  });
