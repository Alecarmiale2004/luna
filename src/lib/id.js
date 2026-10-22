// Identificativo univoco per i record. crypto.randomUUID esiste solo su HTTPS,
// quindi in prova sul Wi‑Fi di casa (http://…) si usa un'alternativa equivalente.
export function nuovoId() {
  if (crypto.randomUUID) return crypto.randomUUID()
  return Date.now().toString(36) + '-' + Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => b.toString(16).padStart(2, '0')).join('')
}
