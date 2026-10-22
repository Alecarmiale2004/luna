// Ricette: quelle di base (src/data/ricette.json) + le mie (aggiunte, modificate, nascoste),
// salvate a parte nell'archivio "ricette" con lo stesso id. Si nascondono, non si cancellano:
// lo storico delle settimane resta valido.
//
// Ingrediente = { prodotto, quantita, unita: "g" | "pz" | "cucchiai" | (niente = q.b.),
//                 blocco: "base" | "proteina" | "verdura" | "condimento", nota, facoltativo }
// Le quantità sono per UNA sessione di cucina = 2 porzioni (pasto principale + schiscetta).
import ricetteBase from '../data/ricette.json'
import blocchi from '../data/blocchi.json'
import { useDati, datiCorrenti, modificaStato, scrivi } from './dati.js'
import { catalogoDa, normalizza } from './catalogo.js'

export const BLOCCHI = [
  { id: 'base', nome: 'Base' },
  { id: 'proteina', nome: 'Protein' },
  { id: 'verdura', nome: 'Vegetables' },
  { id: 'condimento', nome: 'Seasoning' },
]
export const BLOCCHI_SCAMBIABILI = ['base', 'proteina', 'verdura']

// Prodotti che nelle ricette si contano a pezzi (uova, scatolette) invece che a grammi
const A_PEZZI = new Set(['tonno', 'uova'])

let cache = { mie: null, elenco: [] }

/** Tutte le ricette (anche nascoste), già unite alle mie modifiche */
export function ricetteDa(ricetteMie) {
  if (cache.mie === ricetteMie) return cache.elenco
  const idBase = new Set(ricetteBase.map((r) => r.id))
  const elenco = [
    ...ricetteBase.map((r) => ({ ...r, ...ricetteMie[r.id], mia: false })),
    ...Object.values(ricetteMie)
      .filter((r) => !idBase.has(r.id))
      .map((r) => ({ ...r, mia: true })),
  ]
  cache = { mie: ricetteMie, elenco }
  return elenco
}

export function useRicette() {
  return ricetteDa(useDati().ricetteMie)
}

export function salvaRicetta(id, modifiche) {
  const prima = datiCorrenti().ricetteMie[id] || { id }
  const record = { ...prima, ...modifiche, id, modificata: new Date().toISOString() }
  modificaStato((s) => ({ ...s, ricetteMie: { ...s.ricetteMie, [id]: record } }))
  return scrivi((db) => db.put('ricette', record))
}

/** Nuova ricetta con lo schema standard (base + proteina + verdura + olio), da modificare */
export function nuovaRicetta() {
  const id = `mia-${Date.now().toString(36)}`
  salvaRicetta(id, {
    nome: 'New recipe',
    minuti: 25,
    proteinePorzione: 38,
    procedimento: '',
    ingredienti: [
      { prodotto: 'penne', quantita: 170, unita: 'g', blocco: 'base' },
      { prodotto: 'petto-pollo', quantita: 300, unita: 'g', blocco: 'proteina' },
      { prodotto: 'zucchine', quantita: 300, unita: 'g', blocco: 'verdura' },
      { prodotto: 'olio', quantita: 2, unita: 'cucchiai', blocco: 'condimento' },
    ],
    creata: new Date().toISOString(),
  })
  return id
}

// ---------------------------------------------------------------------------
// Cibi esclusi
// ---------------------------------------------------------------------------

/** Radici delle parole: "Carrots" e "carrot" → ["carrot"] */
function radici(testo) {
  return normalizza(testo)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    // Singolare e plurale inglesi si riducono alla stessa radice: "carrots"/"carrot",
    // "tomatoes"/"tomato", "olives"/"olive". Le parole brevi restano intere.
    .map((p) => (p.length > 3 ? p.replace(/s$/, '').replace(/e$/, '') : p))
}

/** a è contenuta in b come sequenza di parole intere? */
function contiene(b, a) {
  if (!a.length || a.length > b.length) return false
  for (let i = 0; i + a.length <= b.length; i++) if (a.every((p, j) => b[i + j] === p)) return true
  return false
}

/**
 * Il prodotto corrisponde a un cibo escluso? Confronta parole intere:
 * "tomato" esclude "Tomato passata", "bell peppers" esclude "Bell peppers" ma non "Black pepper".
 */
export function eEscluso(prodotto, esclusi) {
  if (!prodotto) return false
  const nome = radici(prodotto.nome)
  return esclusi.some((e) => {
    const x = radici(e)
    return contiene(nome, x) || contiene(x, nome)
  })
}

/** Ingredienti (non facoltativi) di una ricetta che sono tra i cibi esclusi */
export function ingredientiEsclusi(ingredienti, esclusi, perId) {
  return ingredienti.filter((i) => !i.facoltativo && eEscluso(perId[i.prodotto], esclusi))
}

// ---------------------------------------------------------------------------
// Scambio di un blocco
// ---------------------------------------------------------------------------

/** Prodotti con cui posso sostituire un ingrediente del blocco (senza cibi esclusi) */
export function opzioniScambio(blocco, esclusi, perId) {
  return (blocchi[blocco] || []).map((id) => perId[id]).filter((p) => p && !p.nascosto && !eEscluso(p, esclusi))
}

function grammi(ing, prodotto) {
  if (ing.unita === 'g') return ing.quantita
  if (ing.unita === 'pz') return ing.quantita * (prodotto?.grammiPezzo || 0)
  return 0
}

function proteine(ing, prodotto) {
  return (grammi(ing, prodotto) * (prodotto?.proteine100 || 0)) / 100
}

/**
 * Applica gli scambi { prodottoOriginale: prodottoNuovo } a una ricetta.
 * Le quantità si convertono (300 g di pollo → 2 scatolette di tonno) e le proteine
 * per porzione si ricalcolano in base alla differenza.
 */
export function applicaScambi(ricetta, scambi = {}, perId) {
  let deltaProteine = 0
  const ingredienti = ricetta.ingredienti.map((ing) => {
    const nuovoId = scambi[ing.prodotto]
    if (!nuovoId || nuovoId === ing.prodotto) return ing
    const vecchio = perId[ing.prodotto]
    const nuovo = perId[nuovoId]
    if (!nuovo) return ing
    const g = grammi(ing, vecchio)
    const sostituto = A_PEZZI.has(nuovoId) && nuovo.grammiPezzo
      ? // a metà si arrotonda per difetto: 300 g → 2 scatolette (~240 g), come nella ricetta del tonno
        { ...ing, prodotto: nuovoId, quantita: Math.max(1, Math.round(g / nuovo.grammiPezzo - 0.01)), unita: 'pz', nota: undefined, originale: ing.prodotto }
      : { ...ing, prodotto: nuovoId, quantita: Math.round(g), unita: 'g', nota: undefined, originale: ing.prodotto }
    deltaProteine += proteine(sostituto, nuovo) - proteine(ing, vecchio)
    return sostituto
  })
  return {
    ...ricetta,
    ingredienti,
    proteinePorzione: Math.round(ricetta.proteinePorzione + deltaProteine / 2),
    scambiata: ingredienti.some((i) => i.originale),
  }
}

/** Ingrediente della base (pasta/riso), per calcolare la porzione leggera della schiscetta */
export function baseDi(ricetta) {
  return ricetta.ingredienti.find((i) => i.blocco === 'base')
}

// ---------------------------------------------------------------------------
// Testi
// ---------------------------------------------------------------------------

/** "300 g", "2 cans", "3 eggs", "2 tbsp", "to taste" */
export function testoQuantita(ing, prodotto) {
  if (ing.quantita == null || !ing.unita) return 'to taste'
  if (ing.unita === 'g') return ing.quantita >= 1000 ? `${ing.quantita / 1000} kg` : `${ing.quantita} g`
  if (ing.unita === 'cucchiai') return `${ing.quantita} tbsp`
  const c = prodotto?.confezione
  if (prodotto?.id === 'uova') return `${ing.quantita} ${ing.quantita === 1 ? 'egg' : 'eggs'}`
  if (c?.unita === 'pz' && c.nome) return `${ing.quantita} ${ing.quantita === 1 ? c.nome : c.plurale}`
  return `${ing.quantita} pz`
}

export function catalogoPerId() {
  return Object.fromEntries(catalogoDa(datiCorrenti().prodottiMiei).map((p) => [p.id, p]))
}
