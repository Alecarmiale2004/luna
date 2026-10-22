// Un "segnale" è un valore condiviso: quando cambia, i componenti che lo usano si aggiornano.
// Sostituisce una libreria di gestione dello stato, in poche righe.
import { useEffect, useReducer } from 'preact/hooks'

export function creaSegnale(iniziale) {
  let valore = iniziale
  const ascoltatori = new Set()
  return {
    get: () => valore,
    set(nuovo) {
      valore = typeof nuovo === 'function' ? nuovo(valore) : nuovo
      ascoltatori.forEach((fn) => fn(valore))
    },
    ascolta(fn) {
      ascoltatori.add(fn)
      return () => ascoltatori.delete(fn)
    },
  }
}

/** Legge un segnale dentro un componente e lo ridisegna a ogni cambiamento. */
export function useSegnale(segnale) {
  const [, ridisegna] = useReducer((n) => n + 1, 0)
  useEffect(() => segnale.ascolta(ridisegna), [segnale])
  return segnale.get()
}
