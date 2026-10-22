// Dalla settimana pianificata alla lista della spesa (03-spesa/logica-lista-spesa.md):
// 1. somma gli ingredienti delle ricette (per 2 porzioni × volte che le cucino);
// 2. aggiunge colazione e spuntino per 7 giorni;
// 3. la dispensa (pasta, riso, scatolame, olio, spezie, condimenti "q.b.") entra in lista
//    solo se l'ho segnata come finita;
// 4. arrotonda alle confezioni reali ("2 confezioni (~300 g l'una)", non "340 g");
// 5. se scelgo 2 giri: nel 1° giro colazione, dispensa, surgelati e i freschi della prima
//    metà delle sessioni; nel 2° giro carne e verdura fresche della seconda metà.
import PASTI from '../data/pasti.json'
import { applicaScambi } from '../db/ricette.js'
import { posizioneReparto } from '../db/catalogo.js'

const GRAMMI_CUCCHIAIO = 15
const TOLLERANZA = 0.1 // 1,05 kg di yogurt → 1 confezione da 1 kg, non 2

function vuoto() {
  return { g: 0, pz: 0, cucchiai: 0, qb: false }
}

function somma(mappa, ing, volte) {
  if (ing.facoltativo) return
  const f = mappa.get(ing.prodotto) || vuoto()
  if (ing.unita === 'g') f.g += ing.quantita * volte
  else if (ing.unita === 'pz') f.pz += ing.quantita * volte
  else if (ing.unita === 'cucchiai') f.cucchiai += ing.quantita * volte
  else f.qb = true
  mappa.set(ing.prodotto, f)
}

/** Quante confezioni servono e il testo da mostrare in lista */
export function confezioni(prodotto, f) {
  const c = prodotto.confezione
  if (!c) return null
  const gPezzo = prodotto.grammiPezzo || 0
  const grammi = f.g + f.pz * gPezzo + f.cucchiai * GRAMMI_CUCCHIAIO
  const totale = c.unita === 'g' ? grammi : f.pz + (gPezzo ? (f.g + f.cucchiai * GRAMMI_CUCCHIAIO) / gPezzo : 0)
  if (totale <= 0) return null
  const n = Math.max(1, Math.ceil(totale / c.quantita - TOLLERANZA))
  const nome = n === 1 ? c.nome || 'pack' : c.plurale || 'packs'
  const testo = `${n} ${nome}${c.descrizione ? ` (${c.descrizione})` : ''}`
  // Quanto serve davvero: in grammi se le ricette lo pesano, altrimenti in pezzi
  // (niente "servono 7" accanto a "7 banane")
  const serve = f.g > 0 || c.unita === 'g' ? `you need ~${Math.round(grammi)} g` : c.quantita > 1 ? `you need ${Math.ceil(totale)}` : ''
  return { n, testo, serve }
}

/** Le sessioni di cucina della settimana, in ordine, già con gli scambi */
export function sessioni(piano, ricettePerId, perId) {
  const elenco = []
  for (const voce of piano?.voci || []) {
    const ricetta = ricettePerId[voce.ricetta]
    if (!ricetta) continue
    const applicata = applicaScambi(ricetta, voce.scambi, perId)
    for (let i = 0; i < voce.volte; i++) elenco.push(applicata)
  }
  return elenco
}

/**
 * Calcola la spesa. giro: 1 o 2 (con piano.giri === 2), altrimenti tutta la settimana.
 * Restituisce { voci: [{ prodotto, quantita, serve }], dispensa: [{ prodotto, finita }] }.
 */
export function calcolaSpesa({ piano, ricettePerId, perId, dispensaFinita = {}, giro = 1 }) {
  const tutte = sessioni(piano, ricettePerId, perId)
  const dueGiri = piano?.giri === 2
  const meta = Math.ceil(tutte.length / 2)
  const primaMeta = dueGiri ? tutte.slice(0, meta) : tutte
  const secondaMeta = dueGiri ? tutte.slice(meta) : []

  // Fabbisogno di tutta la settimana (per dispensa e surgelati) e del giro scelto (freschi)
  const settimana = new Map()
  for (const r of tutte) for (const ing of r.ingredienti) somma(settimana, ing, 1)
  const delGiro = new Map()
  for (const r of giro === 2 ? secondaMeta : primaMeta) for (const ing of r.ingredienti) somma(delGiro, ing, 1)
  if (giro === 1) {
    for (const pasto of [PASTI.colazione, PASTI.spuntino]) {
      for (const ing of pasto.ingredienti) {
        somma(delGiro, ing, PASTI.giorniColazione)
        somma(settimana, ing, PASTI.giorniColazione)
      }
    }
  }

  const voci = []
  const dispensa = []
  for (const [id, f] of settimana) {
    const prodotto = perId[id]
    if (!prodotto) continue
    const soloQb = !f.g && !f.pz && !(f.cucchiai && prodotto.tipo !== 'dispensa')
    const daDispensa = prodotto.tipo === 'dispensa' || soloQb

    if (daDispensa) {
      if (giro === 2) continue
      const finita = !!dispensaFinita[id]
      dispensa.push({ prodotto, finita })
      if (finita) voci.push({ prodotto, quantita: confezioni(prodotto, f)?.testo || '', serve: '' })
      continue
    }
    // Surgelati: tutti nel 1° giro (si conservano); freschi: solo quelli del giro
    const fabbisogno = prodotto.tipo === 'surgelato' ? (giro === 2 ? null : f) : delGiro.get(id)
    if (!fabbisogno) continue
    const c = confezioni(prodotto, fabbisogno)
    if (c) voci.push({ prodotto, quantita: c.testo, serve: c.serve })
  }
  dispensa.sort((a, b) => posizioneReparto(a.prodotto.reparto) - posizioneReparto(b.prodotto.reparto) || a.prodotto.nome.localeCompare(b.prodotto.nome, 'en'))
  return { voci, dispensa, sessioni: tutte.length, sessioniGiro: (giro === 2 ? secondaMeta : primaMeta).length }
}
