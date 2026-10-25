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
import { Cibo } from './schermate/Cibo.jsx'
import { Allenamento } from './schermate/Allenamento.jsx'
import { AllenamentoGuidato } from './schermate/Guidato.jsx'
import { Spesa } from './schermate/Spesa.jsx'

// Le 4 sezioni della tab bar, nell'ordine in cui compaiono
const TABS = [
  { id: 'oggi', titolo: 'Today', Icona: SunMoon, tinta: 'tint-oggi', Schermata: Oggi },
  { id: 'cibo', titolo: 'Food', Icona: Utensils, tinta: 'tint-cibo', Schermata: Cibo },
  { id: 'spesa', titolo: 'Shopping', Icona: ShoppingCart, tinta: 'tint-spesa', Schermata: Spesa },
  { id: 'allenamento', titolo: 'Training', Icona: Corsa, tinta: 'tint-allenamento', Schermata: Allenamento },
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
          <p class="t-title2">{stato === 'troppoNuovi' ? 'Update needed' : 'Something went wrong'}</p>
          <p class="t-body c-label-2" style={{ marginTop: 8 }}>
            {stato === 'troppoNuovi'
              ? `Your data was saved by a newer version of ${APP_NAME}. Close and reopen the app to update it: your data is safe.`
              : `${APP_NAME} can’t open your data. Close and reopen the app: your data hasn’t been touched.`}
          </p>
          <button class="pulsante pieno tint-blue" onClick={() => location.reload()}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Navigazione tabs={TABS} iniziale="oggi" />
      <AllenamentoGuidato />
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
        <strong>New version available</strong>Your data stays safe.
      </p>
      <button class="pulsante piccolo pieno" onClick={aggiornaApp}>
        Update
      </button>
    </div>
  )
}
