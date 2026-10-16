import { ApiError } from './errors.js';

// Zahlungsanbieter. Jeder Anbieter bekommt eine Bestellung und liefert eine URL,
// zu der der Kunde weitergeleitet wird.
//
// Später Stripe, PayPal oder ähnliches anbinden:
// 1. Eintrag hier ergänzen, z. B. stripe: { label, async start(order) { ... return { redirect: checkoutUrl } } }
// 2. In den Einstellungen payment_provider auf den neuen Namen setzen.
// 3. Zahlungsbestätigung per Webhook empfangen und payment_status auf 'bezahlt' setzen.
export const PROVIDERS = {
  manual: {
    label: 'Vorkasse per Überweisung',
    async start(order) {
      return { redirect: `/bestellung/${order.number}?t=${order.token}` };
    },
  },
};

export function getProvider(name) {
  const provider = PROVIDERS[name];
  if (!provider) throw new ApiError(500, 'Der Zahlungsanbieter ist nicht eingerichtet.');
  return provider;
}
