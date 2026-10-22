// Allenamento guidato, a schermo intero: un esercizio alla volta, leggibile con il telefono a terra.
// Ogni passo viene salvato subito: se chiudi l'app, riprendi da dove eri.
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
import { bip, schermoAcceso, mmss } from '../lib/suoni.js'
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

  const trascorso = seduta.stato === 'fatta' ? seduta.secondiAttivi : seduta.secondiAttivi + Math.max(0, (adesso - Date.parse(seduta.ultimaAttivita)) / 1000)

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
        <Passo seduta={seduta} passo={passo} adesso={adesso} key={seduta.indice} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function Passo({ seduta, passo, adesso }) {
  const e = esercizio(passo.esercizio)
  const [valore, setValore] = useState(passo.valore ?? passo.min ?? 0)
  const salta = () => completaPasso(seduta.id, null, { saltato: true })

  return (
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
              Target {passo.min === passo.max ? passo.min : `${passo.min}–${passo.max}`}
              {passo.perLato ? ' per leg' : ''}
              {passo.nota ? ` · ${passo.nota}` : ''}
              {passo.precedente != null && <span style={{ display: 'block', fontWeight: 400 }}>Last time: {passo.precedente}</span>}
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
            <button class="pulsante pieno" onClick={() => (vibra(), completaPasso(seduta.id, valore))}>
              Done: {valore} {valore === 1 ? 'rep' : 'reps'}
            </button>
          </>
        )}

        {passo.tipo === 'ripetizioni' && (
          <>
            <p class="contatore-valore num">{passo.ripetizioni}</p>
            <p class="guidato-obiettivo">{passo.nota || 'reps'}</p>
            <button class="pulsante pieno" onClick={() => (vibra(), completaPasso(seduta.id, passo.ripetizioni))}>
              Done
            </button>
          </>
        )}

        {(passo.tipo === 'tempo' || passo.tipo === 'serieTempo') && (
          <Timer seduta={seduta} passo={passo} adesso={adesso} obiettivo={passo.tipo === 'tempo' ? passo.secondi : valore} onObiettivo={setValore} />
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          {e.versioneFacile && (
            <button class="collegamento" onClick={() => usaVersioneFacile(seduta.id)}>
              Easy version
            </button>
          )}
          <button class="collegamento" style={{ color: 'var(--label-2)' }} onClick={salta}>
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Timer degli esercizi a tempo. Lo stato è salvato nella seduta (fine prevista o tempo
 * restante in pausa), quindi continua giusto anche chiudendo e riaprendo l'app.
 */
function Timer({ seduta, passo, adesso, obiettivo, onTarget }) {
  const t = seduta.timer
  const inCorso = !!t?.fine
  const restante = inCorso ? (Date.parse(t.fine) - adesso) / 1000 : (t?.restante ?? obiettivo)
  const serie = passo.tipo === 'serieTempo'
  const finito = inCorso && restante <= 0

  useEffect(() => {
    if (finito) {
      bip()
      completaPasso(seduta.id, obiettivo)
    }
  }, [finito])

  const avvia = () => {
    vibra()
    aggiornaSeduta(seduta.id, { timer: { fine: new Date(Date.now() + restante * 1000).toISOString() } })
  }
  const pausa = () => aggiornaSeduta(seduta.id, { timer: { restante: Math.max(0, restante) } })
  const ferma = () => completaPasso(seduta.id, Math.round(obiettivo - Math.max(0, restante)))

  return (
    <>
      {serie && (
        <p class="guidato-obiettivo">
          Target {passo.min}–{passo.max} s{passo.precedente != null ? ` · last time ${passo.precedente} s` : ''}
        </p>
      )}
      <Anello valore={Math.max(0, restante) / obiettivo} dimensione={190} spessore={16} etichetta={`${Math.ceil(restante)} seconds`}>
        <span>
          <span class="timer-testo num" style={{ display: 'block' }}>
            {mmss(restante)}
          </span>
          <span class="timer-sotto">{passo.nota || (serie ? 'hold the position' : '')}</span>
        </span>
      </Anello>
      {serie && !inCorso && t?.restante == null && (
        <div class="contatore" style={{ gap: 16 }}>
          <button aria-label="5 seconds less" onClick={() => onObiettivo(Math.max(5, obiettivo - 5))}>
            <Minus size={24} strokeWidth={2.6} />
          </button>
          <span class="t-headline">{obiettivo} s</span>
          <button aria-label="5 seconds more" onClick={() => onObiettivo(obiettivo + 5)}>
            <Plus size={24} strokeWidth={2.6} />
          </button>
        </div>
      )}
      <div class="riga-azioni">
        {inCorso ? (
          <>
            <button class="pulsante grigio" onClick={pausa}>
              <Pause size={20} fill="currentColor" /> Pause
            </button>
            <button class="pulsante pieno" onClick={ferma}>
              {serie ? 'Stop here' : 'Done'}
            </button>
          </>
        ) : (
          <button class="pulsante pieno" onClick={avvia}>
            <Play size={20} fill="currentColor" /> {t?.restante != null ? 'Resume' : 'Start'}
          </button>
        )}
      </div>
    </>
  )
}

function Recupero({ seduta, adesso }) {
  const restante = (Date.parse(seduta.recuperoFine) - adesso) / 1000
  const totale = seduta.passi[seduta.indice - 1]?.recupero || 75
  const prossimo = seduta.passi[seduta.indice]
  return (
    <div class="guidato-corpo">
      <div class="recupero">
        <p class="t-title2">Rest</p>
        <Anello valore={restante / totale} dimensione={230} spessore={18} etichetta={`${Math.ceil(restante)} seconds of rest`}>
          <span class="timer-testo num" style={{ fontSize: 56, lineHeight: '60px' }}>
            {mmss(restante)}
          </span>
        </Anello>
        {prossimo && (
          <p class="t-body c-label-2">
            Next: <strong class="c-label">{esercizio(prossimo.esercizio).nome}</strong>
            {prossimo.serie ? ` · set ${prossimo.serie} of ${prossimo.totSerie}` : ''}
          </p>
        )}
        <div class="riga-azioni">
          <button
            class="pulsante grigio"
            onClick={() => aggiornaSeduta(seduta.id, { recuperoFine: new Date(Date.parse(seduta.recuperoFine) + 15000).toISOString() })}
          >
            +15 s
          </button>
          <button class="pulsante pieno" onClick={() => aggiornaSeduta(seduta.id, { recuperoFine: null })}>
            Skip rest
          </button>
        </div>
      </div>
    </div>
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
      <div class="guidato-azione">
        <button class="pulsante pieno" onClick={() => sedutaAperta.set(null)}>
          Finish
        </button>
      </div>
    </div>
  )
}
