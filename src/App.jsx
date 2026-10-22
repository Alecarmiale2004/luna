// Radice dell'app: avvia i dati, poi mostra le 4 sezioni con la tab bar.
import { useEffect, useState } from 'preact/hooks'
import { APP_NAME } from './config.js'
import { Navigazione } from './navigazione.jsx'
import { Avvisi, mostraMessaggio } from './components/Avvisi.jsx'
import { SunMoon, Utensils, ShoppingCart, Corsa, RefreshCw } from './components/icone.js'
import { avvia, erroreSalvataggio } from './db/dati.js'
import { DatiTroppoNuovi } from './db/migrazioni.js'
import { useSegnale } from './lib/segnale.js'
import { aggiornamentoPronto, aggiornaApp } from './aggiornamenti.js'
import { Oggi } from './schermate/Oggi.jsx'
import { Allenamento } from './schermate/Segnaposto.jsx'
import { Cibo } from './schermate/Cibo.jsx'
import { Spesa } from './schermate/Spesa.jsx'

// Le 4 sezioni della tab bar, nell'ordine in cui compaiono
const TABS = [
  { id: 'oggi', titolo: 'Oggi', Icona: SunMoon, tinta: 'tint-oggi', Schermata: Oggi },
  { id: 'cibo', titolo: 'Cibo', Icona: Utensils, tinta: 'tint-cibo', Schermata: Cibo },
  { id: 'spesa', titolo: 'Spesa', Icona: ShoppingCart, tinta: 'tint-spesa', Schermata: Spesa },
  { id: 'allenamento', titolo: 'Allenamento', Icona: Corsa, tinta: 'tint-allenamento', Schermata: Allenamento },
]

export function App() {
  const [stato, setStato] = useState('caricamento') // "caricamento" | "pronto" | errore
  const errore = useSegnale(erroreSalvataggio)

  useEffect(() => {
    avvia()
      .then(() => setStato('pronto'))
      .catch((e) => {
        console.error(e)
        setStato(e instanceof DatiTroppoNuovi ? 'troppoNuovi' : 'errore')
      })
  }, [])

  useEffect(() => {
    if (errore) {
      mostraMessaggio(errore, { errore: true })
      erroreSalvataggio.set(null)
    }
  }, [errore])

  if (stato === 'caricamento') return <div class="schermata-centrale" />

  if (stato !== 'pronto') {
    return (
      <div class="schermata-centrale">
        <div>
          <p class="t-title2">{stato === 'troppoNuovi' ? 'Serve un aggiornamento' : 'Qualcosa non va'}</p>
          <p class="t-body c-label-2" style={{ marginTop: 8 }}>
            {stato === 'troppoNuovi'
              ? `I tuoi dati sono stati salvati da una versione più nuova di ${APP_NAME}. Chiudi e riapri l’app per aggiornarla: i dati sono al sicuro.`
              : `${APP_NAME} non riesce ad aprire i dati. Chiudi e riapri l’app: i dati non sono stati toccati.`}
          </p>
          <button class="pulsante pieno tint-blue" onClick={() => location.reload()}>
            Riprova
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Navigazione tabs={TABS} iniziale="oggi" />
      <BannerAggiornamento />
      <Avvisi />
    </>
  )
}

/** Compare quando è pronta una nuova versione dell'app. */
function BannerAggiornamento() {
  const pronto = useSegnale(aggiornamentoPronto)
  if (!pronto) return null
  return (
    <div class="banner tint-blue" role="status">
      <RefreshCw size={22} color="var(--blue)" strokeWidth={2.2} />
      <p class="banner-testo">
        <strong>Nuova versione disponibile</strong>I tuoi dati restano al sicuro.
      </p>
      <button class="pulsante piccolo pieno" onClick={aggiornaApp}>
        Aggiorna
      </button>
    </div>
  )
}
