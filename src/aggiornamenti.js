// Service worker: rende l'app disponibile offline e gestisce gli aggiornamenti.
// Quando è pubblicata una nuova versione compare l'avviso "Aggiorna": l'app non
// si ricarica mai da sola mentre la stai usando.
import { registerSW } from 'virtual:pwa-register'
import { creaSegnale } from './lib/segnale.js'

export const aggiornamentoPronto = creaSegnale(false)

const OGNI_ORA = 60 * 60 * 1000

const aggiorna = registerSW({
  onNeedRefresh() {
    aggiornamentoPronto.set(true)
  },
  onRegisteredSW(_url, registrazione) {
    if (!registrazione) return
    // Controlla se c'è una versione nuova ogni ora e quando l'app torna in primo piano
    setInterval(() => registrazione.update(), OGNI_ORA)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registrazione.update()
    })
  },
})

export function aggiornaApp() {
  aggiorna(true)
}
