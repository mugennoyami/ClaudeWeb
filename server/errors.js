// Fehler, die dem Nutzer sinnvoll erklärt werden können.
// fields: { feldname: 'Hinweis' } für Formularfehler
// problems: Liste von Warenkorb-Problemen (z. B. Lagerbestand)
export class ApiError extends Error {
  constructor(status, message, fields = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
    this.problems = null;
  }
}
