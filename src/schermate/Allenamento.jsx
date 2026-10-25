// Sezione Allenamento: giornata proposta dal ciclo, i 4 tipi di giornata, Progressi e Ritmo.
import { useRef, useState } from 'preact/hooks'
import { Pagina } from '../components/Pagina.jsx'
import { Card } from '../components/Card.jsx'
import { Sezione, Lista, Riga } from '../components/Lista.jsx'
import { Foglio } from '../components/Foglio.jsx'
import { chiediConferma, mostraMessaggio } from '../components/Avvisi.jsx'
import { Clock, Check, ChartLine, CalendarCheck, Play, TriangleAlert } from '../components/icone.js'
import { useNav } from '../navigazione.jsx'
import PROGRAMMA from '../data/programma.json'
import {
  useAllenamento,
  giornata,
  esercizio,
  immagineEsercizio,
  testoVoce,
  terminaSeduta,
  minutiSeduta,
  minutiSettimana,
  seduteFatte,
  CICLO,
  TIPI,
} from '../db/allenamento.js'
import { useDati } from '../db/dati.js'
import { useOggi, lunediDi } from '../lib/giornata.js'
import { INFO_TIPO, nomeTipo, avviaAllenamento, riprendiAllenamento, useSuggerimentoOrario } from './allenamentoComune.jsx'
import { Progressi } from './Progressi.jsx'
import { Ritmo } from './Ritmo.jsx'

export function Allenamento() {
  const nav = useNav()
  const oggi = useOggi()
  const { sedute } = useDati()
  const { tipo, pos, inCorso, fattaOggi, forteIeri } = useAllenamento(oggi)
  const [aperto, setAperto] = useState(null) // tipo del foglio aperto
  const suggerimento = useSuggerimentoOrario()
  const minuti = minutiSettimana(sedute, lunediDi(oggi))
  const totale = seduteFatte(sedute).filter((s) => s.tipo !== 'pausa').length

  const termina = async () => {
    const ok = await chiediConferma({
      titolo: 'End the workout?',
      testo: 'What you’ve done stays saved.',
      conferma: 'End',
    })
    if (ok) {
      terminaSeduta(inCorso.id)
      mostraMessaggio('Workout saved')
    }
  }

  const { icona: Icona, tinta } = INFO_TIPO[inCorso?.tipo || tipo]

  return (
    <Pagina titolo="Training">
      {/* ---------- Oggi ---------- */}
      <div class={`sezione ${tinta}`}>
        <Card>
          {inCorso ? (
            <>
              <div class="allenamento-oggi">
                <span class="tipo-icona">
                  <Icona size={28} />
                </span>
                <div>
                  <p class="t-footnote c-label-2">WORKOUT IN PROGRESS</p>
                  <p class="titolo">{nomeTipo(inCorso.tipo)}</p>
                  <p class="t-subheadline c-label-2">
                    {inCorso.indice} of {inCorso.passi.length} steps done
                  </p>
                </div>
              </div>
              <div class="riga-azioni" style={{ marginTop: 16 }}>
                <button class="pulsante grigio" onClick={termina}>
                  End
                </button>
                <button class="pulsante pieno" onClick={() => riprendiAllenamento(inCorso.id)}>
                  <Play size={18} fill="currentColor" /> Resume
                </button>
              </div>
            </>
          ) : (
            <>
              <div class="allenamento-oggi">
                <span class="tipo-icona">{fattaOggi ? <Check size={28} strokeWidth={3} /> : <Icona size={28} />}</span>
                <div>
                  <p class="t-footnote c-label-2">{fattaOggi ? 'DONE TODAY · NEXT' : 'TODAY'}</p>
                  <p class="titolo">{nomeTipo(tipo)}</p>
                  <p class="t-subheadline c-label-2">
                    {fattaOggi
                      ? fattaOggi.tipo === 'pausa'
                        ? 'You marked a rest day today'
                        : `Today: ${nomeTipo(fattaOggi.tipo)}, ${minutiSeduta(fattaOggi)} min`
                      : `${PROGRAMMA.giornate[tipo].durata}${tipo === 'leggera' ? ' · or Mobility if you’re tired' : ''}`}
                  </p>
                </div>
              </div>
              <Ciclo pos={pos} />
              {!fattaOggi && tipo !== 'pausa' && (
                <p class="suggerimento-orario">
                  <Clock size={18} color="var(--tint)" />
                  {suggerimento}
                </p>
              )}
              {forteIeri && !fattaOggi && (
                <p class="suggerimento-orario">
                  <TriangleAlert size={18} color="var(--orange)" />
                  Yesterday was a Strength day: let your muscles recover today.
                </p>
              )}
              {!fattaOggi && (
                <button class="pulsante pieno" style={{ marginTop: 16 }} onClick={() => setAperto(tipo)}>
                  {tipo === 'pausa' ? 'See the rest day' : `Start: ${nomeTipo(tipo)}`}
                </button>
              )}
            </>
          )}
        </Card>
      </div>

      {/* ---------- I 4 tipi di giornata ---------- */}
      <Sezione titolo="Day types" piede="You can always pick a different type from the suggested one.">
        <div class="tipi">
          {TIPI.map((t) => {
            const { icona: I, tinta: ti } = INFO_TIPO[t]
            return (
              <button key={t} class={`tipo-card ${ti}`} onClick={() => setAperto(t)}>
                <span class="tipo-icona piccola">
                  <I size={22} />
                </span>
                <span>
                  <span class="t-headline" style={{ display: 'block' }}>
                    {nomeTipo(t)}
                  </span>
                  <span class="t-subheadline c-label-2">{PROGRAMMA.giornate[t].durata}</span>
                </span>
              </button>
            )
          })}
        </div>
      </Sezione>

      <Sezione>
        <Lista>
          <Riga
            icona={ChartLine}
            coloreIcona="var(--c-forte)"
            titolo="Progress"
            sottotitolo="Charts and records for every exercise"
            freccia
            onClick={() => nav.apri(Progressi)}
          />
          <Riga
            icona={CalendarCheck}
            coloreIcona="var(--c-leggera)"
            titolo="Rhythm"
            sottotitolo={`${minuti} of 150 minutes this week · ${totale} ${totale === 1 ? 'workout' : 'workouts'} in total`}
            freccia
            onClick={() => nav.apri(Ritmo)}
          />
        </Lista>
      </Sezione>

      <FoglioGiornata tipo={aperto} forteIeri={forteIeri} oggi={oggi} bloccato={!!inCorso} onChiudi={() => setAperto(null)} />
    </Pagina>
  )
}

/** Le 7 tappe del ciclo, con quella di oggi evidenziata */
function Ciclo({ pos }) {
  return (
    <>
      <div class="ciclo" aria-label={`Day ${pos + 1} of ${CICLO.length} in the cycle`}>
        {CICLO.map((t, i) => (
          <span
            key={i}
            class={`ciclo-passo${i < pos ? ' fatto' : ''}${i === pos ? ' attuale' : ''}`}
            style={{ '--tint-passo': `var(--c-${t})` }}
          />
        ))}
      </div>
      <div class="ciclo-legenda">
        <span>Cycle: day {pos + 1} of {CICLO.length}</span>
        <span>{CICLO.map((t) => nomeTipo(t)[0]).join(' · ')}</span>
      </div>
    </>
  )
}

/** Foglio dal basso con il dettaglio di una giornata e il pulsante "Inizia" */
function FoglioGiornata({ tipo, forteIeri, oggi, bloccato, onChiudi }) {
  const ultimo = useRef(tipo)
  if (tipo) ultimo.current = tipo
  const t = tipo || ultimo.current
  useDati() // si aggiorna quando cambio serie/ripetizioni dalle Impostazioni
  if (!t) return <Foglio aperto={false} onChiudi={onChiudi} titolo="" />
  const g = giornata(t)
  const { icona: Icona, tinta } = INFO_TIPO[t]

  const inizia = () => {
    onChiudi()
    avviaAllenamento(t, oggi)
    if (t === 'pausa') mostraMessaggio('Rest day marked')
  }

  return (
    <Foglio aperto={!!tipo} onChiudi={onChiudi} titolo={g.nome} grande>
      <div class={tinta}>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <span class="tipo-icona">
            <Icona size={28} />
          </span>
        </div>
        <p class="foglio-spiegazione" style={{ marginTop: 12 }}>
          <strong>{g.durata}</strong> · {g.descrizione}
        </p>
        {t === 'forte' && forteIeri && (
          <p class="avviso-esclusi" style={{ color: 'var(--orange)', background: 'color-mix(in srgb, var(--orange) 12%, transparent)' }}>
            <TriangleAlert size={18} /> Yesterday was a Strength day: the same muscles need about 48 hours to recover.
          </p>
        )}
        {g.blocchi.map((b) => (
          <Sezione key={b.id} titolo={b.nome}>
            <Lista>
              {b.voci.map((v, i) => (
                <div class="riga" key={i}>
                  <img class="mini-esercizio" src={immagineEsercizio(v.esercizio)} alt="" loading="lazy" />
                  <span class="riga-contenuto">
                    <span class="riga-testi">
                      <span class="riga-titolo">{esercizio(v.esercizio).nome}</span>
                      {(v.nota || esercizio(v.esercizio).muscoli) && <span class="riga-sottotitolo">{v.nota || esercizio(v.esercizio).muscoli}</span>}
                    </span>
                    <span class="riga-valore num" style={{ fontWeight: 600 }}>
                      {testoVoce(v)}
                    </span>
                  </span>
                </div>
              ))}
            </Lista>
          </Sezione>
        ))}
        <div class="foglio-azioni">
          <button class="pulsante pieno" disabled={bloccato} onClick={inizia}>
            {t === 'pausa' ? 'Mark a rest day' : bloccato ? 'You already have a workout in progress' : 'Start'}
          </button>
        </div>
      </div>
    </Foglio>
  )
}
