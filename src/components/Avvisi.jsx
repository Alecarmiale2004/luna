// Avvisi globali:
// - mostraMessaggio("Backup salvato"): messaggio breve in basso che sparisce da solo
// - await chiediConferma({...}): finestra al centro in stile iOS, restituisce true/false
import { createPortal } from 'preact/compat'
import { creaSegnale, useSegnale } from '../lib/segnale.js'
import { Check, CircleAlert } from './icone.js'

const messaggio = creaSegnale(null)
const conferma = creaSegnale(null)
let timerMessaggio

export function mostraMessaggio(testo, { errore = false } = {}) {
  clearTimeout(timerMessaggio)
  messaggio.set({ testo, errore, id: Date.now() })
  timerMessaggio = setTimeout(() => messaggio.set(null), 2600)
}

export function chiediConferma({ titolo, testo, conferma: etichetta = 'OK', annulla = 'Annulla', distruttiva = false }) {
  return new Promise((risolvi) => {
    conferma.set({ titolo, testo, etichetta, annulla, distruttiva, risolvi })
  })
}

/** Da mettere una volta sola nell'app: disegna gli avvisi attivi. */
export function Avvisi() {
  const m = useSegnale(messaggio)
  const c = useSegnale(conferma)

  const rispondi = (valore) => {
    c.risolvi(valore)
    conferma.set(null)
  }

  return createPortal(
    <>
      {m && (
        <div class="messaggio" key={m.id} role="status">
          {m.errore ? (
            <CircleAlert size={20} color="var(--red)" strokeWidth={2.4} />
          ) : (
            <Check size={20} color="var(--green)" strokeWidth={2.8} />
          )}
          {m.testo}
        </div>
      )}
      {c && (
        <div class="avviso-velo">
          <div class="avviso" role="alertdialog" aria-modal="true" aria-label={c.titolo}>
            <div class="avviso-testo">
              <h2>{c.titolo}</h2>
              {c.testo && <p>{c.testo}</p>}
            </div>
            <div class="avviso-pulsanti">
              <button onClick={() => rispondi(false)}>{c.annulla}</button>
              <button class={c.distruttiva ? 'distruttivo' : ''} onClick={() => rispondi(true)}>
                {c.etichetta}
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  )
}
