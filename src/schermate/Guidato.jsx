// Allenamento guidato, a schermo intero: un esercizio alla volta, leggibile con il telefono a terra.
// Ogni passo viene salvato subito: se chiudi l'app, riprendi da dove eri.
//
// Struttura dello schermo: barra in alto, contenuto che SCORRE (immagine, istruzioni, anello…)
// e una barra fissa in basso con i pulsanti principali, sopra la barra Home dell'iPhone.
import { useEffect, useRef, useState } from 'preact/hooks'
import { createPortal } from 'preact/compat'
import { Anello } from '../components/Anello.jsx'
import { Sezione, Lista, Riga } from '../components/Lista.jsx'
import { chiediConferma } from '../components/Avvisi.jsx'
import { X, Minus, Plus, Play, Pause, Trophy, ChartLine } from '../components/icone.js'
import { useSegnale } from '../lib/segnale.js'
import { useDati } from '../db/dati.js'
import {
  esercizio,
  immagineEsercizio,
  completaPasso,
  aggiornaSeduta,
  usaVersioneFacile,
  terminaSeduta,
  recordDellaSeduta,
  suggerimenti,
  minutiSeduta,
} from '../db/allenamento.js'
import { bip, schermoAcceso, mmss, sbloccaAudio } from '../lib/suoni.js'
import { vibra } from '../lib/tocco.js'
import { sedutaAperta, useAdesso, INFO_TIPO, nomeTipo } from './allenamentoComune.jsx'

export function AllenamentoGuidato() {
  const id = useSegnale(sedutaAperta)
  const { sedute } = useDati()
  const seduta = id ? sedute.find((s) => s.id === id) : null
  const visibile = !!seduta

  // Schermo sempre acceso durante l'allenamento (iOS lo rilascia quando l'app va in background)
  useEffect(() => {
    if (!visibile) return
    schermoAcceso(true)
    const riattiva = () => document.visibilityState === 'visible' && schermoAcceso(true)
    document.addEventListener('visibilitychange', riattiva)
    return () => {
      document.removeEventListener('visibilitychange', riattiva)
      schermoAcceso(false)
    }
  }, [visibile])

  if (!seduta) return null
  return createPortal(<Vista seduta={seduta} />, document.body)
}

/** 60 → "1 minute", 1800 → "30 minutes", 30 → "30 seconds" */
const durata = (s) => (s % 60 === 0 ? `${s / 60} ${s === 60 ? 'minute' : 'minutes'}` : `${s} seconds`)

/** Dimensione dell'anello del timer, più piccola sugli schermi bassi */
const dimensioneAnello = (massima) => Math.round(Math.min(massima, window.innerWidth * 0.52, window.innerHeight * 0.26))

function Vista({ seduta }) {
  const adesso = useAdesso(250)
  const finito = seduta.indice >= seduta.passi.length
  const passo = seduta.passi[seduta.indice]
  const inRecupero = !!seduta.recuperoFine && Date.parse(seduta.recuperoFine) > adesso
  const { tinta } = INFO_TIPO[seduta.tipo]

  // A fine programma la seduta si salva da sola
  useEffect(() => {
    if (finito && seduta.stato === 'in-corso') terminaSeduta(seduta.id)
  }, [finito])

  // Bip quando finisce il recupero
  const eraInRecupero = useRef(inRecupero)
  useEffect(() => {
    if (eraInRecupero.current && !inRecupero && seduta.recuperoFine) bip()
    eraInRecupero.current = inRecupero
  }, [inRecupero])

  const chiudi = async () => {
    if (finito || seduta.stato === 'fatta') return sedutaAperta.set(null)
    const ok = await chiediConferma({
      titolo: 'Leave the workout?',
      testo: 'What you’ve done stays saved: you can resume from the Training section.',
      conferma: 'Leave',
    })
    if (ok) sedutaAperta.set(null)
  }

  const trascorso =
    seduta.stato === 'fatta' ? seduta.secondiAttivi : seduta.secondiAttivi + Math.max(0, (adesso - Date.parse(seduta.ultimaAttivita)) / 1000)

  return (
    <div class={`guidato ${tinta}`} role="dialog" aria-modal="true" aria-label="Workout">
      <div class="guidato-barra">
        <button class="pulsante-tondo" aria-label="Close" onClick={chiudi} style={{ marginLeft: 8 }}>
          <X size={16} strokeWidth={2.8} />
        </button>
        <div class="centro">{finito ? 'Done!' : `${nomeTipo(seduta.tipo)} · ${passo.blocco}`}</div>
        <span class="tempo num">{mmss(trascorso)}</span>
      </div>
      <div class="avanzamento" aria-hidden="true">
        <span style={{ width: `${(Math.min(seduta.indice, seduta.passi.length) / Math.max(1, seduta.passi.length)) * 100}%` }} />
      </div>

      {finito ? (
        <Riepilogo seduta={seduta} />
      ) : inRecupero ? (
        <Recupero seduta={seduta} adesso={adesso} />
      ) : (
        // La chiave include l'esercizio: con la "versione facile" lo schermo riparte da zero
        // (altrimenti terrebbe le ripetizioni dell'esercizio di prima come secondi del timer)
        <Passo seduta={seduta} passo={passo} adesso={adesso} key={`${seduta.indice}-${passo.esercizio}`} />
      )}
    </div>
  )
}

/** Barra fissa in basso: pulsanti principali sempre visibili, sopra la barra Home */
function Piede({ children }) {
  return <div class="guidato-piede">{children}</div>
}

// ---------------------------------------------------------------------------

function Passo({ seduta, passo, adesso }) {
  const e = esercizio(passo.esercizio)
  const [valore, setValore] = useState(passo.valore ?? passo.min ?? 0)
  const salta = () => completaPasso(seduta.id, null, { saltato: true })
  const aTempo = passo.tipo === 'tempo' || passo.tipo === 'serieTempo'
  const timer = useTimer({ seduta, passo, adesso, obiettivo: passo.tipo === 'tempo' ? passo.secondi : valore })
  // La nota appartiene all'esercizio del programma: con la versione facile non vale
  const nota = passo.esercizio === passo.slot ? passo.nota : ''

  const collegamenti = (
    <div class="guidato-collegamenti">
      {e.versioneFacile && (
        <button class="collegamento" onClick={() => usaVersioneFacile(seduta.id)}>
          Easy version
        </button>
      )}
      <button class="collegamento" style={{ color: 'var(--label-2)' }} onClick={salta}>
        Skip exercise
      </button>
    </div>
  )

  return (
    <>
      <div class="guidato-corpo">
        <span class="guidato-blocco">{passo.serie ? `Set ${passo.serie} of ${passo.totSerie}` : passo.blocco}</span>
        <h1 class="guidato-nome">{e.nome}</h1>
        <div class="guidato-immagine">
          <img src={immagineEsercizio(passo.esercizio)} alt={`${e.nome}: positions 1 and 2`} />
        </div>
        <ul class="guidato-istruzioni">
          {e.istruzioni.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>

        <div class="guidato-azione">
          {passo.tipo === 'serie' && (
            <>
              <p class="guidato-obiettivo">
                Target {passo.min === passo.max ? passo.min : `${passo.min}–${passo.max}`} reps
                {passo.perLato ? ' per leg' : ''}
                {nota && <span class="guidato-nota">{nota}</span>}
                {passo.precedente != null && <span class="guidato-nota">Last time: {passo.precedente}</span>}
              </p>
              <div class="contatore">
                <button aria-label="One less" onClick={() => (vibra(), setValore(Math.max(0, valore - 1)))}>
                  <Minus size={28} strokeWidth={2.6} />
                </button>
                <span class="contatore-valore num" aria-live="polite">
                  {valore}
                </span>
                <button aria-label="One more" onClick={() => (vibra(), setValore(valore + 1))}>
                  <Plus size={28} strokeWidth={2.6} />
                </button>
              </div>
            </>
          )}

          {passo.tipo === 'ripetizioni' && (
            <>
              <p class="contatore-valore num">{passo.ripetizioni}</p>
              <p class="guidato-obiettivo">{nota || 'reps'}</p>
            </>
          )}

          {aTempo && (
            <>
              <p class="guidato-obiettivo">
                {passo.tipo === 'serieTempo' ? `Target ${passo.min}–${passo.max} seconds` : durata(passo.secondi)}
                {nota && <span class="guidato-nota">{nota}</span>}
                {passo.precedente != null && <span class="guidato-nota">Last time: {passo.precedente} s</span>}
              </p>
              <button
                class="anello-tocco"
                onClick={timer.inCorso ? timer.pausa : timer.avvia}
                aria-label={timer.inCorso ? 'Pause the timer' : 'Start the timer'}
              >
                <Anello valore={Math.max(0, timer.restante) / timer.totale} dimensione={dimensioneAnello(190)} spessore={16} etichetta={`${Math.ceil(timer.restante)} seconds`}>
                  <span class="anello-testi">
                    <span class="timer-testo num">{mmss(timer.restante)}</span>
                    <span class="timer-sotto">{timer.inCorso ? (passo.tipo === 'serieTempo' ? 'hold the position' : 'running') : timer.inPausa ? 'paused' : 'ready'}</span>
                  </span>
                </Anello>
              </button>
              {passo.tipo === 'serieTempo' && !timer.iniziato && (
                <div class="contatore" style={{ gap: 16 }}>
                  <button aria-label="5 seconds less" onClick={() => setValore(Math.max(5, valore - 5))}>
                    <Minus size={24} strokeWidth={2.6} />
                  </button>
                  <span class="t-headline num">{valore} s</span>
                  <button aria-label="5 seconds more" onClick={() => setValore(valore + 5)}>
                    <Plus size={24} strokeWidth={2.6} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Piede>
        {passo.tipo === 'serie' && (
          <button class="pulsante pieno grande" onClick={() => (vibra(), completaPasso(seduta.id, valore))}>
            Done: {valore} {valore === 1 ? 'rep' : 'reps'}
          </button>
        )}
        {passo.tipo === 'ripetizioni' && (
          <button class="pulsante pieno grande" onClick={() => (vibra(), completaPasso(seduta.id, passo.ripetizioni))}>
            Done
          </button>
        )}
        {aTempo && (
          <div class="riga-azioni">
            {timer.inCorso ? (
              <>
                <button class="pulsante grigio grande" onClick={timer.pausa}>
                  <Pause size={22} fill="currentColor" /> Pause
                </button>
                <button class="pulsante tinta grande" onClick={timer.ferma}>
                  {passo.tipo === 'serieTempo' ? 'Stop here' : 'Done'}
                </button>
              </>
            ) : (
              <button class="pulsante pieno grande" onClick={timer.avvia}>
                <Play size={22} fill="currentColor" /> {timer.inPausa ? 'Resume' : 'Start'}
              </button>
            )}
          </div>
        )}
        {collegamenti}
      </Piede>
    </>
  )
}

/**
 * Timer degli esercizi a tempo, basato sull'orario reale: si salva l'istante in cui finisce
 * (o, in pausa, quanti secondi mancano). Così il conto alla rovescia resta giusto anche se lo
 * schermo si spegne, l'app va in background o viene chiusa e riaperta.
 * Alla fine: suono, la serie viene segnata come fatta e parte il recupero.
 */
function useTimer({ seduta, passo, adesso, obiettivo }) {
  const aTempo = passo.tipo === 'tempo' || passo.tipo === 'serieTempo'
  const t = seduta.timer
  const inCorso = !!t?.fine
  const inPausa = !inCorso && t?.restante != null
  const totale = t?.totale ?? obiettivo
  const restante = inCorso ? (Date.parse(t.fine) - adesso) / 1000 : inPausa ? t.restante : obiettivo
  const scaduto = aTempo && inCorso && restante <= 0

  useEffect(() => {
    if (!scaduto) return
    bip()
    completaPasso(seduta.id, totale)
  }, [scaduto])

  return {
    inCorso,
    inPausa,
    iniziato: inCorso || inPausa,
    restante,
    totale,
    avvia() {
      sbloccaAudio() // dentro il tocco: così il bip finale potrà suonare
      vibra()
      aggiornaSeduta(seduta.id, { timer: { fine: new Date(Date.now() + Math.max(0, restante) * 1000).toISOString(), totale } })
    },
    pausa() {
      vibra()
      aggiornaSeduta(seduta.id, { timer: { restante: Math.max(0, restante), totale } })
    },
    ferma() {
      vibra()
      completaPasso(seduta.id, Math.max(0, Math.round(totale - Math.max(0, restante))))
    },
  }
}

function Recupero({ seduta, adesso }) {
  const restante = (Date.parse(seduta.recuperoFine) - adesso) / 1000
  const totale = seduta.passi[seduta.indice - 1]?.recupero || 75
  const prossimo = seduta.passi[seduta.indice]
  return (
    <>
      <div class="guidato-corpo">
        <div class="recupero">
          <p class="t-title2">Rest</p>
          <Anello valore={restante / totale} dimensione={dimensioneAnello(230)} spessore={18} etichetta={`${Math.ceil(restante)} seconds of rest`}>
            <span class="anello-testi">
              <span class="timer-testo num">{mmss(restante)}</span>
              <span class="timer-sotto">rest</span>
            </span>
          </Anello>
          {prossimo && (
            <p class="t-body c-label-2">
              Next: <strong class="c-label">{esercizio(prossimo.esercizio).nome}</strong>
              {prossimo.serie ? ` · set ${prossimo.serie} of ${prossimo.totSerie}` : ''}
            </p>
          )}
        </div>
      </div>
      <Piede>
        <div class="riga-azioni">
          <button
            class="pulsante grigio grande"
            onClick={() => aggiornaSeduta(seduta.id, { recuperoFine: new Date(Date.parse(seduta.recuperoFine) + 15000).toISOString() })}
          >
            +15 s
          </button>
          <button class="pulsante pieno grande" onClick={() => aggiornaSeduta(seduta.id, { recuperoFine: null })}>
            Skip rest
          </button>
        </div>
      </Piede>
    </>
  )
}

function Riepilogo({ seduta }) {
  const { sedute } = useDati()
  const fatte = seduta.registrazioni.filter((r) => !r.saltato)
  const esercizi = new Set(fatte.map((r) => r.esercizio)).size
  const serie = fatte.filter((r) => r.serie).length
  const record = recordDellaSeduta(seduta, sedute)
  const consigli = suggerimenti(seduta)

  return (
    <>
      <div class="guidato-corpo">
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <span class="tipo-icona" style={{ margin: '0 auto 12px' }}>
            <Trophy size={28} />
          </span>
          <p class="t-title1">Workout complete!</p>
          <p class="t-subheadline c-label-2">{nomeTipo(seduta.tipo)} · great job</p>
        </div>
        <div class="riepilogo-numeri">
          <div>
            <span class="num">{minutiSeduta(seduta)}</span>
            <span>minutes</span>
          </div>
          <div>
            <span class="num">{esercizi}</span>
            <span>exercises</span>
          </div>
          <div>
            <span class="num">{serie}</span>
            <span>sets</span>
          </div>
        </div>
        {record.length > 0 && (
          <Sezione titolo="New records">
            <Lista>
              {record.map((r) => (
                <Riga
                  key={r.esercizio}
                  icona={Trophy}
                  coloreIcona="var(--orange)"
                  titolo={esercizio(r.esercizio).nome}
                  sottotitolo={`Before: ${r.prima}${r.unita ? ' s' : ''}`}
                  valore={`${r.valore}${r.unita ? ' s' : ''}`}
                />
              ))}
            </Lista>
          </Sezione>
        )}
        {consigli.length > 0 && (
          <Sezione titolo="Ready for the next step" piede="You hit the top of the range in every set: next time, try this.">
            <Lista>
              {consigli.map((c) => (
                <Riga key={c.esercizio} icona={ChartLine} coloreIcona="var(--tint)" titolo={esercizio(c.esercizio).nome} sottotitolo={c.testo} />
              ))}
            </Lista>
          </Sezione>
        )}
      </div>
      <Piede>
        <button class="pulsante pieno grande" onClick={() => sedutaAperta.set(null)}>
          Finish
        </button>
      </Piede>
    </>
  )
}
