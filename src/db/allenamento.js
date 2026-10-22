// Allenamento: programma, ciclo delle giornate, sedute guidate, record e statistiche.
//
// seduta (archivio "sedute") = {
//   id, data: "2026-10-22", tipo: "forte" | "leggera" | "mobilita" | "pausa", posCiclo,
//   stato: "in-corso" | "fatta", inizio, fine, secondiAttivi, ultimaAttivita,
//   passi: [passo] (copiati all'inizio: riprendendo, il piano resta lo stesso),
//   indice (passo attuale), registrazioni: [{ passo, esercizio, serie, valore, saltato }],
//   recuperoFine (fine del timer di recupero), timer: { fine } | { restante } (esercizi a tempo)
// }
// Ogni passo fatto viene salvato subito: chiudendo l'app a metà non si perde niente.
import PROGRAMMA from '../data/programma.json'
import ESERCIZI from '../data/esercizi.json'
import { useDati, datiCorrenti, modificaStato, scrivi } from './dati.js'
import { nuovoId } from '../lib/id.js'
import { aggiungiGiorni, giorniTra, lunediDi } from '../lib/giornata.js'

export const CICLO = PROGRAMMA.ciclo
export const TIPI = ['forte', 'leggera', 'mobilita', 'pausa']
export const RECUPERO = PROGRAMMA.recuperoSecondi
export const ATTESA_COLAZIONE = PROGRAMMA.attesaDopoColazioneMinuti
export const FINIRE_ENTRO = PROGRAMMA.finireEntro

const PER_ID = Object.fromEntries(ESERCIZI.map((e) => [e.id, e]))
export const esercizio = (id) => PER_ID[id] || { id, nome: id, istruzioni: [], muscoli: '' }
export const tuttiGliEsercizi = () => ESERCIZI

/** Le immagini sono file separati: si possono sostituire senza toccare il codice */
export const immagineEsercizio = (id) => `${import.meta.env.BASE_URL}immagini/esercizi/${id}.svg`

/** Testo breve di una voce: "3 × 12–15", "3 × 20–40 s", "60 s", "10" */
export function testoVoce(v) {
  if (v.serie) {
    if (v.minSecondi != null) return `${v.serie} × ${v.minSecondi}–${v.maxSecondi} s`
    return `${v.serie} × ${v.min === v.max ? v.min : `${v.min}–${v.max}`}${v.perLato ? ' per gamba' : ''}`
  }
  if (v.secondi) return v.secondi >= 120 ? `${Math.round(v.secondi / 60)} min` : `${v.secondi} s`
  return `${v.ripetizioni}`
}

// ---------------------------------------------------------------------------
// Programma con le mie modifiche (Impostazioni → Esercizi)
// ---------------------------------------------------------------------------

export const chiaveVoce = (tipo, blocco, slot) => `${tipo}.${blocco}.${slot}`

/** La giornata di un tipo, con serie/ripetizioni/sostituzioni cambiate da me */
export function giornata(tipo, eserciziMiei = datiCorrenti().eserciziMiei) {
  const base = PROGRAMMA.giornate[tipo]
  return {
    ...base,
    tipo,
    blocchi: base.blocchi.map((b) => ({
      ...b,
      voci: b.voci.map((v) => {
        const mie = eserciziMiei[chiaveVoce(tipo, b.id, v.esercizio)] || {}
        const { id: _id, sostituto, ...modifiche } = mie
        return { ...v, ...modifiche, slot: v.esercizio, esercizio: sostituto || v.esercizio, modificata: !!mie.id }
      }),
    })),
  }
}

export function salvaVoce(tipo, blocco, slot, modifiche) {
  const id = chiaveVoce(tipo, blocco, slot)
  const record = { ...datiCorrenti().eserciziMiei[id], ...modifiche, id }
  modificaStato((s) => ({ ...s, eserciziMiei: { ...s.eserciziMiei, [id]: record } }))
  return scrivi((db) => db.put('esercizi', record))
}

export function ripristinaVoce(tipo, blocco, slot) {
  const id = chiaveVoce(tipo, blocco, slot)
  modificaStato((s) => {
    const eserciziMiei = { ...s.eserciziMiei }
    delete eserciziMiei[id]
    return { ...s, eserciziMiei }
  })
  return scrivi((db) => db.delete('esercizi', id))
}

// ---------------------------------------------------------------------------
// Ciclo: Forte → Leggera → Forte → Leggera → Forte → Leggera → Pausa
// ---------------------------------------------------------------------------

const corrisponde = (tipoCiclo, tipo) => tipoCiclo === tipo || (tipoCiclo === 'leggera' && tipo === 'mobilita')

export function seduteFatte(sedute) {
  return sedute.filter((s) => s.stato === 'fatta').sort((a, b) => (a.fine || a.inizio).localeCompare(b.fine || b.inizio))
}

function posizioneProssima(sedute) {
  const ultima = seduteFatte(sedute).filter((s) => s.posCiclo != null).at(-1)
  return ultima ? (ultima.posCiclo + 1) % CICLO.length : 0
}

/**
 * Cosa propone l'app oggi: il prossimo tipo del ciclo, calcolato da cosa ho fatto l'ultima volta
 * (non dai giorni della settimana). Se ieri ho fatto una Forte, oggi non ne propone un'altra.
 */
export function proposta(sedute, oggi) {
  const inCorso = sedute.find((s) => s.stato === 'in-corso') || null
  const fatte = seduteFatte(sedute)
  const fattaOggi = fatte.filter((s) => s.data === oggi).at(-1) || null
  const pos = posizioneProssima(sedute)
  let tipo = CICLO[pos]
  const forteIeri = fatte.some((s) => s.tipo === 'forte' && s.data === aggiungiGiorni(oggi, -1))
  if (tipo === 'forte' && forteIeri) tipo = 'leggera'
  return { tipo, pos, inCorso, fattaOggi, forteIeri }
}

export function useAllenamento(oggi) {
  const { sedute } = useDati()
  return { sedute, ...proposta(sedute, oggi) }
}

/** Posizione nel ciclo per un tipo scelto (anche diverso da quello proposto) */
function posizionePer(tipo, sedute) {
  const pos = posizioneProssima(sedute)
  for (let i = 0; i < CICLO.length; i++) {
    const j = (pos + i) % CICLO.length
    if (corrisponde(CICLO[j], tipo)) return j
  }
  return pos
}

// ---------------------------------------------------------------------------
// Sedute
// ---------------------------------------------------------------------------

function salva(seduta) {
  modificaStato((s) => ({ ...s, sedute: [...s.sedute.filter((x) => x.id !== seduta.id), seduta] }))
  return scrivi((db) => db.put('sedute', seduta))
}

export const sedutaDaId = (id) => datiCorrenti().sedute.find((s) => s.id === id)

/** Ultimo valore fatto per un esercizio e una serie: per precompilare */
function ultimoValore(esercizioId, serie) {
  for (const s of seduteFatte(datiCorrenti().sedute).reverse()) {
    const r = s.registrazioni.find((x) => x.esercizio === esercizioId && x.serie === serie && !x.saltato && x.valore != null)
    if (r) return r.valore
  }
  return null
}

/** Trasforma la giornata in una sequenza di passi, uno schermo alla volta */
export function creaPassi(tipo) {
  const g = giornata(tipo)
  const passi = []
  for (const b of g.blocchi) {
    b.voci.forEach((v, iv) => {
      const base = { esercizio: v.esercizio, slot: v.slot, blocco: b.nome, nota: v.nota || '', progressione: v.progressione || '' }
      if (v.serie) {
        for (let s = 1; s <= v.serie; s++) {
          const aTempo = v.minSecondi != null
          const precedente = ultimoValore(v.esercizio, s)
          const ultimaDelBlocco = iv === b.voci.length - 1 && s === v.serie
          passi.push({
            ...base,
            tipo: aTempo ? 'serieTempo' : 'serie',
            serie: s,
            totSerie: v.serie,
            min: aTempo ? v.minSecondi : v.min,
            max: aTempo ? v.maxSecondi : v.max,
            perLato: !!v.perLato,
            precedente,
            valore: precedente ?? (aTempo ? v.minSecondi : v.min),
            recupero: ultimaDelBlocco ? 0 : RECUPERO,
          })
        }
      } else if (v.secondi) passi.push({ ...base, tipo: 'tempo', secondi: v.secondi })
      else passi.push({ ...base, tipo: 'ripetizioni', ripetizioni: v.ripetizioni })
    })
  }
  return passi
}

export function iniziaSeduta(tipo, data) {
  const adesso = new Date().toISOString()
  const seduta = {
    id: nuovoId(),
    data,
    tipo,
    posCiclo: posizionePer(tipo, datiCorrenti().sedute),
    stato: 'in-corso',
    inizio: adesso,
    fine: null,
    secondiAttivi: 0,
    ultimaAttivita: adesso,
    passi: creaPassi(tipo),
    indice: 0,
    registrazioni: [],
    recuperoFine: null,
    timer: null,
  }
  salva(seduta)
  return seduta.id
}

/** Giornata di pausa: conta nel ciclo e nella costanza */
export function segnaPausa(data) {
  const adesso = new Date().toISOString()
  return salva({
    id: nuovoId(),
    data,
    tipo: 'pausa',
    posCiclo: posizionePer('pausa', datiCorrenti().sedute),
    stato: 'fatta',
    inizio: adesso,
    fine: adesso,
    secondiAttivi: 0,
    passi: [],
    indice: 0,
    registrazioni: [],
  })
}

/** Tempo attivo: si somma il tempo dall'ultima azione, ma non le lunghe interruzioni */
function conTempo(seduta, passo) {
  const adesso = Date.now()
  const trascorso = (adesso - Date.parse(seduta.ultimaAttivita)) / 1000
  const massimo = (passo?.secondi || passo?.max || 0) + RECUPERO + 180
  return { ...seduta, secondiAttivi: seduta.secondiAttivi + Math.max(0, Math.min(trascorso, massimo)), ultimaAttivita: new Date(adesso).toISOString() }
}

export function aggiornaSeduta(id, modifiche) {
  const s = sedutaDaId(id)
  if (s) return salva({ ...s, ...modifiche })
}

/** Registra il passo attuale (ripetizioni o secondi fatti) e passa al successivo */
export function completaPasso(id, valore = null, { saltato = false } = {}) {
  const s = sedutaDaId(id)
  if (!s || s.indice >= s.passi.length) return
  const passo = s.passi[s.indice]
  const registrazione = { passo: s.indice, esercizio: passo.esercizio, serie: passo.serie || null, valore, saltato, ora: new Date().toISOString() }
  const recupero = !saltato && passo.recupero && s.indice + 1 < s.passi.length ? new Date(Date.now() + passo.recupero * 1000).toISOString() : null
  return salva({
    ...conTempo(s, passo),
    registrazioni: [...s.registrazioni, registrazione],
    indice: s.indice + 1,
    recuperoFine: recupero,
    timer: null,
  })
}

/** Versione facile (es. verticale statica al posto delle flessioni) per le serie rimaste */
export function usaVersioneFacile(id) {
  const s = sedutaDaId(id)
  const passo = s?.passi[s.indice]
  const facile = passo && esercizio(passo.esercizio).versioneFacile
  if (!facile) return
  const aTempo = facile === 'verticale-muro-statica'
  const passi = s.passi.map((p, i) =>
    i >= s.indice && p.slot === passo.slot
      ? { ...p, esercizio: facile, tipo: aTempo ? 'serieTempo' : p.tipo, min: aTempo ? 20 : p.min, max: aTempo ? 30 : p.max, valore: aTempo ? 20 : p.valore, precedente: null }
      : p,
  )
  return salva({ ...s, passi })
}

export function terminaSeduta(id) {
  const s = sedutaDaId(id)
  if (!s) return
  const fine = conTempo(s, s.passi[s.indice])
  // Se non ho fatto niente, la seduta non conta
  if (!s.registrazioni.some((r) => !r.saltato)) {
    modificaStato((st) => ({ ...st, sedute: st.sedute.filter((x) => x.id !== id) }))
    return scrivi((db) => db.delete('sedute', id))
  }
  return salva({ ...fine, stato: 'fatta', fine: new Date().toISOString(), recuperoFine: null, timer: null })
}

// ---------------------------------------------------------------------------
// Record, progressi, statistiche
// ---------------------------------------------------------------------------

export const minutiSeduta = (s) => Math.round((s.secondiAttivi || 0) / 60)

/** Esercizi con serie (forza e plank) presenti nello storico o nel programma */
export function eserciziMisurati() {
  const ids = new Set()
  for (const b of giornata('forte').blocchi) for (const v of b.voci) if (v.serie) ids.add(v.esercizio)
  for (const s of datiCorrenti().sedute) for (const p of s.passi) if (p.tipo === 'serie' || p.tipo === 'serieTempo') ids.add(p.esercizio)
  return [...ids]
}

/** Per ogni seduta, la serie migliore di un esercizio: [{ data, valore, totale, unita }] */
export function storicoEsercizio(sedute, esercizioId) {
  const out = []
  for (const s of seduteFatte(sedute)) {
    const valori = s.registrazioni.filter((r) => r.esercizio === esercizioId && !r.saltato && r.valore != null && r.serie)
    if (!valori.length) continue
    const passo = s.passi[valori[0].passo]
    out.push({
      id: s.id,
      data: s.data,
      valore: Math.max(...valori.map((r) => r.valore)),
      totale: valori.reduce((t, r) => t + r.valore, 0),
      serie: valori.map((r) => r.valore),
      unita: passo?.tipo === 'serieTempo' ? 's' : '',
    })
  }
  return out
}

export function record(sedute, esercizioId) {
  const storico = storicoEsercizio(sedute, esercizioId)
  if (!storico.length) return null
  return storico.reduce((m, x) => (x.valore > m.valore ? x : m))
}

/** Nuovi record fatti in una seduta, rispetto a tutte quelle prima */
export function recordDellaSeduta(seduta, sedute) {
  const prima = seduteFatte(sedute).filter((s) => s.id !== seduta.id && (s.fine || '') < (seduta.fine || seduta.inizio))
  const out = []
  const visti = new Set()
  for (const r of seduta.registrazioni) {
    if (!r.serie || r.saltato || r.valore == null || visti.has(r.esercizio)) continue
    visti.add(r.esercizio)
    const migliore = Math.max(...seduta.registrazioni.filter((x) => x.esercizio === r.esercizio && !x.saltato && x.valore != null).map((x) => x.valore))
    const precedente = record(prima, r.esercizio)
    if (precedente && migliore > precedente.valore) {
      out.push({ esercizio: r.esercizio, valore: migliore, prima: precedente.valore, unita: precedente.unita })
    }
  }
  return out
}

/** "Hai fatto il massimo in tutte le serie": suggerisce la progressione del programma */
export function suggerimenti(seduta) {
  const out = []
  const perEsercizio = {}
  seduta.passi.forEach((p, i) => {
    if (p.tipo !== 'serie' && p.tipo !== 'serieTempo') return
    const r = seduta.registrazioni.find((x) => x.passo === i)
    ;(perEsercizio[p.esercizio] ||= []).push({ p, r })
  })
  for (const [id, elenco] of Object.entries(perEsercizio)) {
    const tutteAlMassimo = elenco.every(({ p, r }) => r && !r.saltato && r.valore >= p.max)
    if (tutteAlMassimo) out.push({ esercizio: id, testo: elenco[0].p.progressione || 'La prossima volta 1–2 ripetizioni in più.' })
  }
  return out
}

/** Minuti di allenamento nella settimana che inizia di lunedì */
export function minutiSettimana(sedute, lunedi) {
  const domenica = aggiungiGiorni(lunedi, 6)
  return seduteFatte(sedute)
    .filter((s) => s.data >= lunedi && s.data <= domenica)
    .reduce((t, s) => t + minutiSeduta(s), 0)
}

/** Giorni consecutivi rispettando il ciclo (la Pausa conta), fino a oggi o ieri */
export function serieGiorni(sedute, oggi) {
  const giorni = new Set(seduteFatte(sedute).map((s) => s.data))
  let giorno = giorni.has(oggi) ? oggi : aggiungiGiorni(oggi, -1)
  let n = 0
  while (giorni.has(giorno)) {
    n++
    giorno = aggiungiGiorni(giorno, -1)
  }
  return n
}

export function seduteUltimeSettimane(sedute, oggi, settimane = 4) {
  const da = aggiungiGiorni(oggi, -7 * settimane + 1)
  return seduteFatte(sedute).filter((s) => s.data >= da && s.data <= oggi && s.tipo !== 'pausa').length
}

/** Tipo fatto in ogni giorno di una settimana (preferisce l'allenamento alla pausa) */
export function tipiSettimana(sedute, lunedi) {
  const out = {}
  for (const s of seduteFatte(sedute)) {
    const d = giorniTra(lunedi, s.data)
    if (d < 0 || d > 6) continue
    if (!out[s.data] || out[s.data] === 'pausa') out[s.data] = s.tipo
  }
  return out
}

export const settimanaCorrente = (oggi) => lunediDi(oggi)
