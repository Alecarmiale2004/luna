// Date. L'app usa sempre la data del calendario: dopo mezzanotte è già il giorno dopo.
// Le date sono stringhe locali "AAAA-MM-GG" (mai toISOString, che usa l'ora UTC).
import { useEffect, useState } from 'preact/hooks'

const locale = 'it-IT'

/** Date → "2026-10-22" (ora locale) */
export function dataISO(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const g = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${g}`
}

/** "2026-10-22" → Date a mezzogiorno (evita sorprese col cambio dell'ora legale) */
export function daISO(iso) {
  const [a, m, g] = iso.split('-').map(Number)
  return new Date(a, m - 1, g, 12)
}

export function aggiungiGiorni(iso, n) {
  const d = daISO(iso)
  d.setDate(d.getDate() + n)
  return dataISO(d)
}

export function lunediDi(iso) {
  const giorno = (daISO(iso).getDay() + 6) % 7 // lunedì = 0
  return aggiungiGiorni(iso, -giorno)
}

/** I 7 giorni (lunedì → domenica) della settimana che contiene `iso` */
export function settimanaDi(iso) {
  const lun = lunediDi(iso)
  return Array.from({ length: 7 }, (_, i) => aggiungiGiorni(lun, i))
}

export const INIZIALI_GIORNI = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

/** Giorni di calendario tra due date ISO (b − a) */
export function giorniTra(a, b) {
  return Math.round((daISO(b) - daISO(a)) / 86400000)
}

/** "mercoledì 22 ottobre" */
export function formatoGiorno(iso) {
  return daISO(iso).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
}

/** "22 ott 2026" */
export function formatoBreve(iso) {
  return daISO(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Data e ora di un momento salvato (timestamp ISO completo) */
export function formatoMomento(timestamp) {
  return new Date(timestamp).toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** "Questa settimana", "Prossima settimana", oppure "3 – 9 nov" */
export function etichettaSettimana(lunedi, oggi) {
  const diff = giorniTra(lunediDi(oggi), lunedi) / 7
  if (diff === 0) return 'Questa settimana'
  if (diff === 1) return 'Prossima settimana'
  if (diff === -1) return 'Settimana scorsa'
  const dom = aggiungiGiorni(lunedi, 6)
  const a = daISO(lunedi)
  const b = daISO(dom)
  const meseA = a.toLocaleDateString(locale, { month: 'short' })
  const meseB = b.toLocaleDateString(locale, { month: 'short' })
  return meseA === meseB
    ? `${a.getDate()} – ${b.getDate()} ${meseB}`
    : `${a.getDate()} ${meseA} – ${b.getDate()} ${meseB}`
}

/** "oggi", "ieri", "23 giorni fa" a partire da un timestamp */
export function tempoFa(timestamp, adesso = new Date()) {
  const giorni = giorniTra(dataISO(new Date(timestamp)), dataISO(adesso))
  if (giorni <= 0) return 'oggi'
  if (giorni === 1) return 'ieri'
  return `${giorni} giorni fa`
}

/**
 * Hook: la data di oggi, sempre aggiornata
 * (ricontrolla ogni minuto e quando l'app torna in primo piano, così cambia a mezzanotte).
 */
export function useOggi() {
  const [oggi, setOggi] = useState(() => dataISO(new Date()))
  useEffect(() => {
    const aggiorna = () => setOggi(dataISO(new Date()))
    const timer = setInterval(aggiorna, 60_000)
    document.addEventListener('visibilitychange', aggiorna)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', aggiorna)
    }
  }, [])
  return oggi
}
