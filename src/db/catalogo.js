// Catalogo dei prodotti della spesa.
//
// = prodotti di base (src/data/prodotti.json, modificabili con Claude Code)
// + le mie modifiche e i miei prodotti (archivio IndexedDB "prodotti", modificabili dall'app).
// Le mie modifiche a un prodotto di base sono salvate a parte con lo stesso id:
// così un aggiornamento del file di base non le cancella mai.
import prodottiBase from '../data/prodotti.json'
import reparti from '../data/reparti.json'
import { useDati, datiCorrenti, modificaStato, scrivi } from './dati.js'

export const REPARTI = reparti
const POSIZIONE_REPARTO = Object.fromEntries(reparti.map((r, i) => [r.id, i]))
export const reparto = (id) => reparti.find((r) => r.id === id) || reparti.find((r) => r.id === 'altro')
export const posizioneReparto = (id) => POSIZIONE_REPARTO[id] ?? POSIZIONE_REPARTO.altro

let cache = { miei: null, elenco: [] }

/** Tutti i prodotti (anche nascosti), già uniti alle mie modifiche. */
export function catalogoDa(prodottiMiei) {
  if (cache.miei === prodottiMiei) return cache.elenco
  const idBase = new Set(prodottiBase.map((p) => p.id))
  const elenco = [
    ...prodottiBase.map((p) => ({ ...p, ...prodottiMiei[p.id], mio: false })),
    ...Object.values(prodottiMiei)
      .filter((p) => !idBase.has(p.id))
      .map((p) => ({ ...p, mio: true })),
  ].sort((a, b) => posizioneReparto(a.reparto) - posizioneReparto(b.reparto) || a.nome.localeCompare(b.nome, 'en'))
  cache = { miei: prodottiMiei, elenco }
  return elenco
}

export function useCatalogo() {
  return catalogoDa(useDati().prodottiMiei)
}

/** Minuscole e senza accenti: "Æbler" e "aebler", "più" e "piu" si trovano a vicenda */
export function normalizza(testo) {
  return testo
    .toLowerCase()
    .replaceAll('æ', 'ae')
    .replaceAll('ø', 'o')
    .replaceAll('å', 'a')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/** Prodotti visibili che contengono il testo nel nome (inglese o danese) */
export function cerca(catalogo, testo) {
  const t = normalizza(testo)
  if (!t) return []
  return catalogo
    .filter((p) => !p.nascosto && (normalizza(p.nome).includes(t) || normalizza(p.dk || '').includes(t)))
    .sort((a, b) => Number(!normalizza(a.nome).startsWith(t)) - Number(!normalizza(b.nome).startsWith(t)))
}

/** Salva le modifiche a un prodotto (di base o mio). */
export function salvaProdotto(id, modifiche) {
  const prima = datiCorrenti().prodottiMiei[id] || { id }
  const record = { ...prima, ...modifiche, id, modificato: new Date().toISOString() }
  modificaStato((s) => ({ ...s, prodottiMiei: { ...s.prodottiMiei, [id]: record } }))
  return scrivi((db) => db.put('prodotti', record))
}

/** Crea un prodotto nuovo, ricordato per le volte successive. */
export function nuovoProdotto({ nome, dk = '', reparto = 'altro' }) {
  const id = `mio-${normalizza(nome).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'prodotto'}-${Date.now().toString(36)}`
  const prodotto = { id, nome: nome.trim(), dk: dk.trim(), reparto, tipo: 'fresco', creato: new Date().toISOString() }
  salvaProdotto(id, prodotto)
  return { ...prodotto, mio: true }
}
