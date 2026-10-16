import { api, esc, icon, initChrome, money, toast } from './common.js';

initChrome();

const root = document.getElementById('order-root');
const number = decodeURIComponent(location.pathname.split('/').filter(Boolean)[1] ?? '');
const token = new URLSearchParams(location.search).get('t') ?? '';

function formatDate(iso) {
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}

function copyButton(value, label) {
  return `<button class="btn btn-ghost btn-sm" type="button" data-copy="${esc(value)}">${icon('copy', 'icon icon-sm')} ${esc(label)}</button>`;
}

function render(order) {
  const first = order.customer.name.split(' ')[0];
  const paid = order.payment_status === 'bezahlt';
  const payment = paid
    ? `<div class="notice notice-ok">${icon('check', 'icon icon-sm')} Zahlung eingegangen. Wir bereiten deine Bestellung für den Versand vor.</div>`
    : `
      <div class="payment-box">
        ${icon('bank')}
        <div>
          <h3>So bezahlst du</h3>
          <p>${esc(order.payment_instructions ?? '')}</p>
          <p class="stack"><strong>Betrag:</strong> ${money(order.total_cents)}<br><strong>Verwendungszweck:</strong> ${esc(order.number)}</p>
          <p>${copyButton(order.number, 'Verwendungszweck kopieren')}</p>
        </div>
      </div>`;

  root.innerHTML = `
    <section class="order-hero">
      <div class="mark">${icon('check')}</div>
      <h1>Danke, ${esc(first)}!</h1>
      <p>Deine Bestellung ist bei uns eingegangen. Die Seite hier ist deine Bestätigung – speichere sie oder die Bestellnummer.</p>
      <div class="number-box">
        <span>Bestellnummer</span>
        <strong>${esc(order.number)}</strong>
        ${copyButton(order.number, 'Kopieren')}
      </div>
      <p class="form-note order-meta">Bestellt am ${esc(formatDate(order.created_at))} · Status: ${esc(order.status_label)}</p>
    </section>

    <div class="order-grid">
      <div class="stack">
        ${payment}

        <section class="order-panel">
          <h2>Was passiert jetzt?</h2>
          <ol class="next-steps">
            <li><strong>Überweisung</strong><br>${paid ? 'Erledigt – danke!' : 'Überweise den Betrag mit dem Verwendungszweck oben.'}</li>
            <li><strong>Zahlungseingang</strong><br>Wir prüfen den Eingang und setzen die Bestellung in Bearbeitung.</li>
            <li><strong>Versand</strong><br>Wir melden uns unter deiner E-Mail-Adresse, sobald wir versenden.</li>
          </ol>
        </section>

        <section class="order-panel">
          <h2>Lieferadresse</h2>
          <address>
            ${esc(order.customer.name)}<br>
            ${esc(order.customer.street)}<br>
            ${esc(order.customer.zip)} ${esc(order.customer.city)}<br>
            ${esc(order.customer.country)}
          </address>
        </section>
      </div>

      <aside class="order-panel">
        <h2>Deine Artikel</h2>
        <ul class="item-list">
          ${order.items
            .map(
              (item) => `<li><span>${esc(item.name)}<small>${item.qty} × ${money(item.unit_price_cents)}</small></span><span>${money(item.line_total_cents)}</span></li>`
            )
            .join('')}
        </ul>
        <dl class="totals">
          <dt>Zwischensumme</dt><dd>${money(order.subtotal_cents)}</dd>
          <dt>Versand</dt><dd>${order.shipping_cents === 0 ? 'kostenlos' : money(order.shipping_cents)}</dd>
          <dt class="grand">Gesamt</dt><dd class="grand">${money(order.total_cents)}</dd>
        </dl>
        <p class="form-note order-meta">Fragen zur Bestellung? <a href="mailto:${esc(order.contact_email)}?subject=${encodeURIComponent(`Bestellung ${order.number}`)}">${esc(order.contact_email)}</a></p>
        <p class="order-actions"><button class="btn btn-ghost btn-sm" type="button" data-print>Bestätigung drucken</button> <a class="btn btn-ghost btn-sm" href="/shop">Weiter einkaufen</a></p>
      </aside>
    </div>`;
}

function renderError(message) {
  root.innerHTML = `
    <div class="empty empty-wide order-empty">
      <h3>Bestellung nicht gefunden</h3>
      <p>${esc(message)}</p>
      <a class="btn btn-primary" href="/shop">Zum Shop</a>
    </div>`;
}

root.addEventListener('click', async (event) => {
  const copy = event.target.closest('[data-copy]');
  if (copy) {
    try {
      await navigator.clipboard.writeText(copy.dataset.copy);
      toast('Kopiert.');
    } catch {
      toast('Kopieren hat nicht geklappt. Bitte markiere den Text manuell.', { error: true });
    }
  }
  if (event.target.closest('[data-print]')) window.print();
});

async function init() {
  if (!number || !token) return renderError('Dieser Link ist unvollständig. Bitte nutze den Link aus deiner Bestätigung.');
  try {
    const order = await api(`/orders/${encodeURIComponent(number)}?t=${encodeURIComponent(token)}`);
    document.title = `Bestellung ${order.number} – COLDSTART`;
    render(order);
  } catch (error) {
    renderError(error.message);
  }
}

init();
