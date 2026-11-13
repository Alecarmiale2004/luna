// Sezione Studio: conto alla rovescia per l'IELTS, inglese (un tocco al giorno, giorni di fila)
// e lettura (obiettivo di minuti al giorno, timer che continua anche a schermo spento).
import { useEffect, useRef } from 'preact/hooks'
import { Pagina } from '../components/Pagina.jsx'
import { Card, CardTesta } from '../components/Card.jsx'
import { Anello } from '../components/Anello.jsx'
import { mostraMessaggio } from '../components/Avvisi.jsx'
import { GraduationCap, Languages, BookOpen, Check, Play, Pause, Plus, Minus } from '../components/icone.js'
import { useDati } from '../db/dati.js'
import {
  segnaInglese,
  serieInglese,
  giorniA,
  secondiLettura,
  avviaLettura,
  fermaLettura,
  aggiungiMinutiLettura,
} from '../db/giorno.js'
import { useOggi, aggiungiGiorni, daISO, formatoGiorno } from '../lib/giornata.js'
import { sbloccaAudio, bip, mmss } from '../lib/suoni.js'
import { vibra } from '../lib/tocco.js'
import { useAdesso } from './allenamentoComune.jsx'
import './studio.css'

/** Gli ultimi 7 giorni, fino a oggi */
const ultimiSette = (oggi) => Array.from({ length: 7 }, (_, i) => aggiungiGiorni(oggi, i - 6))
const iniziale = (data) => daISO(data).toLocaleDateString('en-GB', { weekday: 'narrow' })

export function Studio() {
  const oggi = useOggi()
  return (
    <Pagina titolo="Study">
      <CardIelts oggi={oggi} />
      <CardInglese oggi={oggi} />
      <CardLettura oggi={oggi} />
    </Pagina>
  )
}

// ---------------------------------------------------------------------------
// IELTS
// ---------------------------------------------------------------------------

function CardIelts({ oggi }) {
  const { impostazioni } = useDati()
  const data = impostazioni.dataIelts
  if (!data) return null
  const giorni = giorniA(data, oggi)
  return (
    <div class="sezione tint-studio">
      <Card class="card-ielts">
        <span class="ielts-numero num">{giorni > 0 ? giorni : <GraduationCap size={40} />}</span>
        <span>
          <span class="t-headline" style={{ display: 'block' }}>
            {giorni > 1 ? 'days to IELTS' : giorni === 1 ? 'day to IELTS: it’s tomorrow' : giorni === 0 ? 'IELTS is today. Good luck!' : 'IELTS done'}
          </span>
          <span class="t-subheadline c-label-2">{formatoGiorno(data)} · change it in Settings</span>
        </span>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inglese
// ---------------------------------------------------------------------------

function CardInglese({ oggi }) {
  const { giorni } = useDati()
  const fatto = !!giorni[oggi]?.inglese
  const serie = serieInglese(giorni, oggi)
  const totale = Object.values(giorni).filter((g) => g.inglese).length

  const tocca = () => {
    vibra()
    segnaInglese(oggi, !fatto)
    if (!fatto) mostraMessaggio(serie + 1 > 1 ? `${serie + 1} days in a row` : 'Day one: keep it going')
  }

  return (
    <div class="sezione tint-studio">
      <Card>
        <CardTesta icona={Languages} titolo="English" dettaglio={`${totale} ${totale === 1 ? 'day' : 'days'} in total`} />
        <p>
          <span class="t-title1 num">{serie}</span>
          <span class="t-headline c-label-2"> {serie === 1 ? 'day' : 'days'} in a row</span>
        </p>
        <div class="sette-giorni">
          {ultimiSette(oggi).map((d) => (
            <span key={d} class={`sette-giorno${giorni[d]?.inglese ? ' fatto' : ''}${d === oggi ? ' oggi' : ''}`}>
              <span class="sette-iniziale">{iniziale(d)}</span>
              <span class="sette-cerchio">{giorni[d]?.inglese && <Check size={15} strokeWidth={3.2} />}</span>
            </span>
          ))}
        </div>
        <button class={`pulsante ${fatto ? 'grigio' : 'pieno'}`} style={{ marginTop: 16 }} onClick={tocca}>
          {fatto ? (
            <>
              <Check size={18} strokeWidth={3} /> Studied today · tap to undo
            </>
          ) : (
            'I studied today'
          )}
        </button>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Lettura
// ---------------------------------------------------------------------------

function CardLettura({ oggi }) {
  const { giorni, impostazioni } = useDati()
  const adesso = useAdesso(1000)
  const giorno = giorni[oggi]
  const obiettivo = impostazioni.obiettivoLetturaMinuti
  const letti = secondiLettura(giorno, adesso)
  const leggendo = !!giorno?.lettura?.inizio
  const raggiunto = letti >= obiettivo * 60
  const settimana = ultimiSette(oggi).filter((d) => secondiLettura(giorni[d], adesso) >= obiettivo * 60).length

  // Un bip quando il timer arriva all'obiettivo (solo se l'app è aperta in quel momento)
  const prima = useRef(letti)
  useEffect(() => {
    if (leggendo && prima.current < obiettivo * 60 && letti >= obiettivo * 60) {
      bip()
      vibra()
      mostraMessaggio(`${obiettivo} minutes: goal reached`)
    }
    prima.current = letti
  }, [letti, leggendo, obiettivo])

  const alterna = () => {
    sbloccaAudio()
    vibra()
    leggendo ? fermaLettura(oggi) : avviaLettura(oggi)
  }

  return (
    <div class="sezione tint-studio">
      <Card>
        <CardTesta icona={BookOpen} titolo="Reading" dettaglio={`Goal ${obiettivo} min a day`} />
        <div class="lettura">
          <Anello valore={letti / (obiettivo * 60)} dimensione={96} spessore={12} etichetta={`${Math.floor(letti / 60)} of ${obiettivo} minutes`}>
            {raggiunto ? <Check size={30} strokeWidth={3} color="var(--tint)" /> : <BookOpen size={26} color="var(--tint)" />}
          </Anello>
          <div>
            <p class="t-title1 num">{leggendo ? mmss(letti) : `${Math.floor(letti / 60)} min`}</p>
            <p class="t-subheadline c-label-2">
              {raggiunto ? 'Goal reached today' : `${obiettivo - Math.floor(letti / 60)} min to go`}
            </p>
            <p class="t-subheadline c-label-2">
              Goal reached {settimana} of the last 7 days
            </p>
          </div>
        </div>
        <div class="riga-azioni" style={{ marginTop: 16 }}>
          <button class="pulsante grigio quadrato" aria-label="Remove 5 minutes" onClick={() => aggiungiMinutiLettura(oggi, -5)}>
            <Minus size={20} />
          </button>
          <button class={`pulsante ${leggendo ? 'tinta' : 'pieno'}`} onClick={alterna}>
            {leggendo ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            {leggendo ? 'Pause' : letti > 0 ? 'Keep reading' : 'Start reading'}
          </button>
          <button class="pulsante grigio quadrato" aria-label="Add 5 minutes" onClick={() => aggiungiMinutiLettura(oggi, 5)}>
            <Plus size={20} />
          </button>
        </div>
        <p class="settimana-aiuto">The timer keeps going with the screen off. Use − and + for reading done without it.</p>
      </Card>
    </div>
  )
}
