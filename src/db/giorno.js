// La giornata: lavoro di sera, blocchi da spuntare, inglese, lettura e peso.
//
// giorno (archivio "giorni") = {
//   data: "2026-11-13",
//   lavoro: "lavoro" | "libero" (solo se cambio gli orari della settimana per quel giorno),
//   inizioLavoro: "17:00" (se oggi inizio a un'ora diversa dal solito),
//   fatti: { pranzo: true, … } (blocchi spuntati),
//   inglese: true (ho studiato inglese),
//   lettura: { secondi, inizio } (inizio = timer in corso, timestamp ISO),
//   peso: 59.4 (kg),
//   turnoNotte: "lavoro" | "libero" (segno della vecchia versione, solo storico)
// }
import { useDati, datiCorrenti, aggiornaGiorno } from './dati.js'
import { aggiungiGiorni, daISO, giorniTra } from '../lib/giornata.js'

export const INIZI_LAVORO = ['16:00', '17:00']
const LAVORO_EXTRA = { inizio: '16:00', fine: '20:00' } // un giorno libero che diventa di lavoro
const MAX_LETTURA_SECONDI = 3 * 3600 // timer dimenticato acceso: non conta più di 3 ore

/** Lunedì = 0 … domenica = 6 */
export const giornoSettimana = (data) => (daISO(data).getDay() + 6) % 7

// ---------------------------------------------------------------------------
// Lavoro
// ---------------------------------------------------------------------------

/** Orario di lavoro di un giorno ({ inizio, fine }) oppure null se è libero */
export function orarioLavoro(data, { impostazioni, giorni } = datiCorrenti()) {
  const g = giorni[data] || {}
  const solito = impostazioni.lavoro[giornoSettimana(data)]
  if (g.lavoro === 'libero') return null
  const orario = solito || (g.lavoro === 'lavoro' ? LAVORO_EXTRA : null)
  if (!orario) return null
  return { ...orario, inizio: g.inizioLavoro || orario.inizio }
}

/** Un tocco: giorno di lavoro ↔ libero (rispetto agli orari della settimana) */
export function alternaLavoro(data) {
  const { impostazioni } = datiCorrenti()
  const solito = !!impostazioni.lavoro[giornoSettimana(data)]
  const lavora = !!orarioLavoro(data)
  return aggiornaGiorno(data, (g) => {
    if (!lavora === solito) delete g.lavoro // torna come al solito
    else g.lavoro = lavora ? 'libero' : 'lavoro'
    return g
  })
}

/** 16:00 ↔ 17:00 */
export function alternaInizioLavoro(data) {
  const orario = orarioLavoro(data)
  if (!orario) return
  const i = INIZI_LAVORO.indexOf(orario.inizio)
  const prossimo = INIZI_LAVORO[(i + 1) % INIZI_LAVORO.length]
  const solito = datiCorrenti().impostazioni.lavoro[giornoSettimana(data)]?.inizio || LAVORO_EXTRA.inizio
  return aggiornaGiorno(data, (g) => {
    if (prossimo === solito) delete g.inizioLavoro
    else g.inizioLavoro = prossimo
    return g
  })
}

// ---------------------------------------------------------------------------
// Blocchi della giornata
// ---------------------------------------------------------------------------

/** I blocchi di un giorno in ordine di orario, con il lavoro al suo posto */
export function blocchiDelGiorno(data, dati = datiCorrenti()) {
  const lavoro = orarioLavoro(data, dati)
  const blocchi = dati.impostazioni.blocchi.filter(
    (b) => b.quando === 'sempre' || (b.quando === 'lavoro' ? !!lavoro : !lavoro),
  )
  if (lavoro) blocchi.push({ id: 'lavoro', ora: lavoro.inizio, nome: `Work until ${lavoro.fine}`, lavoro: true, fine: lavoro.fine })
  return blocchi.sort((a, b) => a.ora.localeCompare(b.ora))
}

/** Il blocco in corso adesso: l'ultimo iniziato (null prima del primo) */
export function bloccoAttuale(blocchi, adesso = new Date()) {
  const ora = `${String(adesso.getHours()).padStart(2, '0')}:${String(adesso.getMinutes()).padStart(2, '0')}`
  let attuale = null
  for (const b of blocchi) {
    if (b.lavoro ? b.ora <= ora && ora < b.fine : b.ora <= ora) attuale = b
  }
  return attuale
}

export function segnaBlocco(data, id, fatto) {
  return aggiornaGiorno(data, (g) => {
    const fatti = { ...g.fatti }
    if (fatto) fatti[id] = true
    else delete fatti[id]
    return { ...g, fatti }
  })
}

// ---------------------------------------------------------------------------
// Inglese: un tocco al giorno, e i giorni di fila
// ---------------------------------------------------------------------------

export function segnaInglese(data, fatto) {
  return aggiornaGiorno(data, (g) => {
    if (fatto) g.inglese = true
    else delete g.inglese
    return g
  })
}

/** Giorni di fila con l'inglese fatto, fino a oggi (o fino a ieri, se oggi non ancora) */
export function serieInglese(giorni, oggi) {
  let giorno = giorni[oggi]?.inglese ? oggi : aggiungiGiorni(oggi, -1)
  let n = 0
  while (giorni[giorno]?.inglese) {
    n++
    giorno = aggiungiGiorni(giorno, -1)
  }
  return n
}

/** Giorni a una data (es. l'esame IELTS): 0 = oggi, negativo = già passata */
export const giorniA = (data, oggi) => giorniTra(oggi, data)

// ---------------------------------------------------------------------------
// Lettura: timer a timestamp (continua anche a schermo spento) + minuti aggiunti a mano
// ---------------------------------------------------------------------------

/** Secondi letti in un giorno, compreso il timer in corso */
export function secondiLettura(giorno, adesso = Date.now()) {
  const l = giorno?.lettura
  if (!l) return 0
  const inCorso = l.inizio ? Math.min(MAX_LETTURA_SECONDI, Math.max(0, (adesso - Date.parse(l.inizio)) / 1000)) : 0
  return (l.secondi || 0) + inCorso
}

/** Il giorno con il timer della lettura acceso (al massimo uno) */
export const letturaInCorso = (giorni) => Object.values(giorni).find((g) => g.lettura?.inizio)?.data || null

export function avviaLettura(data) {
  const acceso = letturaInCorso(datiCorrenti().giorni)
  if (acceso && acceso !== data) fermaLettura(acceso)
  return aggiornaGiorno(data, (g) => ({ ...g, lettura: { secondi: g.lettura?.secondi || 0, inizio: new Date().toISOString() } }))
}

export function fermaLettura(data) {
  return aggiornaGiorno(data, (g) => ({ ...g, lettura: { secondi: Math.round(secondiLettura(g)), inizio: null } }))
}

/** Minuti letti senza timer (anche negativi per correggere) */
export function aggiungiMinutiLettura(data, minuti) {
  return aggiornaGiorno(data, (g) => {
    const secondi = Math.max(0, Math.round((g.lettura?.secondi || 0) + minuti * 60))
    return { ...g, lettura: { secondi, inizio: g.lettura?.inizio || null } }
  })
}

// ---------------------------------------------------------------------------
// Peso
// ---------------------------------------------------------------------------

export function impostaPeso(data, kg) {
  return aggiornaGiorno(data, (g) => {
    if (kg) g.peso = Math.round(kg * 10) / 10
    else delete g.peso
    return g
  })
}

/** [{ data, peso }] dal più vecchio */
export const storicoPeso = (giorni) =>
  Object.values(giorni)
    .filter((g) => g.peso)
    .map(({ data, peso }) => ({ data, peso }))
    .sort((a, b) => a.data.localeCompare(b.data))

/**
 * Come va il peso: confronta l'ultima pesata con una di almeno 10 giorni prima.
 * Per tonificarsi va bene restare stabili o salire piano; se scende, mangio troppo poco.
 * → { stato: "pochi-dati" | "scende" | "stabile" | "sale-piano" | "sale-veloce", settimanale }
 */
export function tendenzaPeso(storico) {
  const ultima = storico.at(-1)
  if (!ultima) return { stato: 'pochi-dati' }
  const prima = [...storico].reverse().find((p) => giorniTra(p.data, ultima.data) >= 10)
  if (!prima) return { stato: 'pochi-dati' }
  const settimane = giorniTra(prima.data, ultima.data) / 7
  const settimanale = (ultima.peso - prima.peso) / settimane
  const stato =
    settimanale < -0.15 ? 'scende' : settimanale <= 0.1 ? 'stabile' : settimanale <= 0.35 ? 'sale-piano' : 'sale-veloce'
  return { stato, settimanale, da: prima, a: ultima }
}

/** Hook: il record di oggi e i dati che servono alla schermata */
export function useGiorno(data) {
  const dati = useDati()
  return { giorno: dati.giorni[data] || { data }, dati }
}
