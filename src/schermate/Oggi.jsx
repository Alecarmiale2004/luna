// Schermata "Oggi": la giornata tipo da spuntare, blocco per blocco, con quello in corso evidenziato.
// Sopra: lavoro di oggi (di sera) + mini-settimana; sotto: spesa da fare e promemoria backup.
import { useState } from 'preact/hooks'
import { Pagina } from '../components/Pagina.jsx'
import { Card, CardTesta } from '../components/Card.jsx'
import { Spunta } from '../components/Spunta.jsx'
import { Segmenti } from '../components/Grafico.jsx'
import {
  Briefcase,
  Sun,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShoppingCart,
  ListChecks,
  Play,
  Pause,
} from '../components/icone.js'
import { useNav } from '../navigazione.jsx'
import { useDati, scriviMeta } from '../db/dati.js'
import { useSpesa } from '../db/spesa.js'
import {
  orarioLavoro,
  alternaLavoro,
  alternaInizioLavoro,
  INIZI_LAVORO,
  blocchiDelGiorno,
  bloccoAttuale,
  segnaBlocco,
  segnaInglese,
  serieInglese,
  secondiLettura,
  avviaLettura,
  fermaLettura,
} from '../db/giorno.js'
import { proposta } from '../db/allenamento.js'
import PROGRAMMA from '../data/programma.json'
import {
  useOggi,
  settimanaDi,
  aggiungiGiorni,
  INIZIALI_GIORNI,
  etichettaSettimana,
  formatoGiorno,
  daISO,
  dataISO,
  giorniTra,
  tempoFa,
} from '../lib/giornata.js'
import { usePressione } from '../lib/pressione.js'
import { vibra } from '../lib/tocco.js'
import { useAdesso, nomeTipo } from './allenamentoComune.jsx'
import { Impostazioni } from './Impostazioni.jsx'
import { FoglioEsporta } from './Backup.jsx'
import './oggi.css'

export function Oggi() {
  const nav = useNav()
  const oggi = useOggi()

  return (
    <Pagina
      titolo="Today"
      sopratitolo={formatoGiorno(oggi)}
      destra={
        <button class="nav-pulsante" aria-label="Settings" onClick={() => nav.apri(Impostazioni)}>
          <Settings size={24} />
        </button>
      }
    >
      <div class="sezione">
        <CardLavoro oggi={oggi} />
      </div>
      <CardGiornata oggi={oggi} />
      <CardSpesa />
      <PromemoriaBackup />
    </Pagina>
  )
}

// ---------------------------------------------------------------------------
// Lavoro di oggi + mini-settimana
// ---------------------------------------------------------------------------

function CardLavoro({ oggi }) {
  const dati = useDati()
  const [scarto, setScarto] = useState(0) // settimane rispetto a quella in corso
  const lavoro = orarioLavoro(oggi, dati)
  const settimana = settimanaDi(aggiungiGiorni(oggi, scarto * 7))
  const giorniLavoro = settimana.filter((d) => orarioLavoro(d, dati)).length

  const alterna = (data) => {
    vibra()
    alternaLavoro(data)
  }

  return (
    <Card class="card-turni">
      <CardTesta icona={Briefcase} titolo="Work" />

      <button class="turno-oggi" onClick={() => alterna(oggi)} aria-label={`${lavoro ? 'Working today' : 'Day off'}. Tap to change.`}>
        <span class={`turno-icona ${lavoro ? 'lavoro' : 'libero'}`} key={lavoro ? 'l' : 'f'}>
          {lavoro ? <Briefcase size={28} strokeWidth={2.2} /> : <Sun size={30} strokeWidth={2.2} />}
        </span>
        <span class="turno-testi">
          <span class="turno-titolo">{lavoro ? `${lavoro.inizio} – ${lavoro.fine}` : 'Day off'}</span>
          <span class="turno-sottotitolo">{lavoro ? 'Working this evening · tap if you’re off' : 'No work today · tap if you work'}</span>
        </span>
      </button>
      {lavoro && (
        <div class="turno-inizio">
          <span class="t-subheadline c-label-2">Today I start at</span>
          <Segmenti
            opzioni={INIZI_LAVORO.map((ora) => ({ valore: ora, etichetta: ora }))}
            valore={lavoro.inizio}
            onChange={(ora) => {
              if (ora === lavoro.inizio) return
              vibra()
              alternaInizioLavoro(oggi)
            }}
          />
        </div>
      )}

      <div class="divisore" />

      <div class="settimana-testa">
        <button class="settimana-freccia" aria-label="Previous week" onClick={() => setScarto(scarto - 1)}>
          <ChevronLeft size={22} strokeWidth={2.4} />
        </button>
        <div class="settimana-etichetta">
          <span class="settimana-nome">{etichettaSettimana(settimana[0], oggi)}</span>
          <span class="settimana-conto">
            <span class="num">{giorniLavoro}</span> work {giorniLavoro === 1 ? 'day' : 'days'}
          </span>
        </div>
        <button class="settimana-freccia" aria-label="Next week" onClick={() => setScarto(scarto + 1)}>
          <ChevronRight size={22} strokeWidth={2.4} />
        </button>
      </div>

      <div class="settimana">
        {settimana.map((data, i) => (
          <GiornoSettimana
            key={data}
            data={data}
            iniziale={INIZIALI_GIORNI[i]}
            lavoro={!!orarioLavoro(data, dati)}
            cambiato={!!dati.giorni[data]?.lavoro}
            oggi={data === oggi}
            passato={data < oggi}
            onAlterna={alterna}
          />
        ))}
      </div>

      <p class="settimana-aiuto">Tap a day to switch work and day off. Your usual days are in Settings.</p>
    </Card>
  )
}

function GiornoSettimana({ data, iniziale, lavoro, cambiato, oggi, passato, onAlterna }) {
  const pressione = usePressione({ onTocco: () => onAlterna(data) })
  return (
    <button
      class={`giorno${oggi ? ' oggi' : ''}${passato ? ' passato' : ''}`}
      {...pressione}
      aria-label={`${formatoGiorno(data)}: ${lavoro ? 'work' : 'day off'}${cambiato ? ', changed this week' : ''}`}
    >
      <span class="giorno-iniziale">{iniziale}</span>
      <span class={`giorno-icona ${lavoro ? 'lavoro' : 'libero'}${cambiato ? ' cambiato' : ''}`} key={lavoro ? 'l' : 'f'}>
        {lavoro ? <Briefcase size={17} strokeWidth={2.4} /> : <Sun size={18} strokeWidth={2.4} />}
      </span>
      <span class="giorno-numero num">{daISO(data).getDate()}</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// La giornata: blocchi da spuntare
// ---------------------------------------------------------------------------

const mmss = (secondi) => `${Math.floor(secondi / 60)}:${String(Math.floor(secondi % 60)).padStart(2, '0')}`

function CardGiornata({ oggi }) {
  const nav = useNav()
  const dati = useDati()
  const adesso = useAdesso(1000)
  const giorno = dati.giorni[oggi] || {}
  const blocchi = blocchiDelGiorno(oggi, dati)
  // Il blocco in corso solo per la data di oggi (dopo mezzanotte la pagina passa al giorno nuovo)
  const attuale = oggi === dataISO(new Date(adesso)) ? bloccoAttuale(blocchi, new Date(adesso)) : null
  const allenamento = proposta(dati.sedute, oggi)
  const obiettivo = dati.impostazioni.obiettivoLetturaMinuti
  const letti = secondiLettura(giorno, adesso)
  const leggendo = !!giorno.lettura?.inizio

  /** Fatto o no, per ogni blocco (quelli collegati guardano anche la loro sezione) */
  const fatto = (b) => {
    if (b.azione === 'inglese') return !!giorno.inglese
    if (b.azione === 'lettura') return !!giorno.fatti?.lettura || letti >= obiettivo * 60
    if (b.azione === 'allenamento') return !!giorno.fatti?.allenamento || !!allenamento.fattaOggi
    return !!giorno.fatti?.[b.id]
  }
  const segna = (b, valore) => (b.azione === 'inglese' ? segnaInglese(oggi, valore) : segnaBlocco(oggi, b.id, valore))

  const sottotitolo = (b) => {
    if (b.azione === 'lettura') return leggendo ? `Reading… ${mmss(letti)}` : `${Math.floor(letti / 60)} of ${obiettivo} min`
    if (b.azione === 'inglese') {
      const n = serieInglese(dati.giorni, oggi)
      return n ? `${n} ${n === 1 ? 'day' : 'days'} in a row` : 'Start your streak today'
    }
    if (b.azione === 'allenamento') {
      const { inCorso, fattaOggi, tipo } = allenamento
      if (inCorso) return `${nomeTipo(inCorso.tipo)} in progress`
      if (fattaOggi) return fattaOggi.tipo === 'pausa' ? 'Rest day' : `${nomeTipo(fattaOggi.tipo)} done`
      return tipo === 'pausa' ? 'Rest day' : `${nomeTipo(tipo)} · ${PROGRAMMA.giornate[tipo].durata}`
    }
    return b.nota || ''
  }

  const daFare = blocchi.filter((b) => !b.lavoro)
  const fatti = daFare.filter(fatto).length

  return (
    <div class="sezione tint-oggi">
      <Card class="card-giornata">
        <CardTesta icona={ListChecks} titolo="My day" dettaglio={`${fatti} of ${daFare.length}`} />
        <div class="blocchi">
          {blocchi.map((b) => {
            const vai =
              b.azione === 'allenamento' ? () => nav.vaiATab('allenamento') : b.azione ? () => nav.vaiATab('studio') : null
            return (
              <div key={b.id} class={`blocco${b.id === attuale?.id ? ' attuale' : ''}${fatto(b) ? ' fatto' : ''}${b.lavoro ? ' lavoro' : ''}`}>
                <span class="blocco-ora num">{b.ora}</span>
                {b.lavoro ? (
                  <span class="blocco-icona-lavoro" aria-hidden="true">
                    <Briefcase size={16} strokeWidth={2.4} />
                  </span>
                ) : (
                  <Spunta attiva={fatto(b)} onChange={(v) => segna(b, v)} etichetta={b.nome} />
                )}
                <button class="blocco-testi" onClick={vai || (b.lavoro ? undefined : () => (vibra(), segna(b, !fatto(b))))} disabled={b.lavoro}>
                  <span class="blocco-nome">
                    {b.nome}
                    {b.azione === 'lettura' ? ` · ${obiettivo} min` : ''}
                  </span>
                  {sottotitolo(b) && <span class="blocco-nota">{sottotitolo(b)}</span>}
                  {b.id === attuale?.id && !b.lavoro && <span class="blocco-adesso">Now</span>}
                </button>
                {b.azione === 'lettura' && !fatto(b) ? (
                  <button
                    class="blocco-azione"
                    aria-label={leggendo ? 'Pause reading' : 'Start reading'}
                    onClick={() => {
                      vibra()
                      leggendo ? fermaLettura(oggi) : avviaLettura(oggi)
                    }}
                  >
                    {leggendo ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                  </button>
                ) : vai ? (
                  <ChevronRight class="blocco-freccia" size={18} strokeWidth={2.4} />
                ) : null}
              </div>
            )
          })}
        </div>
        <p class="settimana-aiuto">Change the times and the blocks in Settings → My day.</p>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Spesa: collegamento rapido se ci sono prodotti da prendere
// ---------------------------------------------------------------------------

function CardSpesa() {
  const nav = useNav()
  const { lista } = useSpesa()
  const voci = lista?.voci || []
  const daPrendere = voci.filter((v) => !v.spuntato).length
  if (!daPrendere) return null
  const presi = voci.length - daPrendere

  return (
    <div class="sezione tint-spesa">
      <Card onClick={() => nav.vaiATab('spesa')}>
        <CardTesta icona={ShoppingCart} titolo="Shopping" freccia />
        <p>
          <span class="t-title1 num">{daPrendere}</span>
          <span class="t-headline c-label-2"> {daPrendere === 1 ? 'item to buy' : 'items to buy'}</span>
        </p>
        {presi > 0 && <p class="t-subheadline c-label-2">{presi} already in the cart</p>}
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Promemoria gentile per il backup
// ---------------------------------------------------------------------------

const RIMANDA_GIORNI = 3

function PromemoriaBackup() {
  const { meta, impostazioni } = useDati()
  const [foglio, setFoglio] = useState(false)
  const adesso = dataISO(new Date())
  const riferimento = meta.ultimoBackup || meta.primoAvvio
  if (!riferimento) return null

  const giorni = giorniTra(dataISO(new Date(riferimento)), adesso)
  const rimandato = meta.backupRimandato && giorniTra(dataISO(new Date(meta.backupRimandato)), adesso) < RIMANDA_GIORNI
  const mostra = giorni >= impostazioni.promemoriaBackupGiorni && !rimandato

  return (
    <>
      {mostra && (
        <div class="sezione tint-blue">
          <Card>
            <CardTesta icona={ShieldCheck} titolo="Backup" />
            <p class="t-headline">
              {meta.ultimoBackup ? `Last backup: ${tempoFa(meta.ultimoBackup)}` : 'You haven’t made a backup yet'}
            </p>
            <p class="t-subheadline c-label-2" style={{ marginTop: 2 }}>
              Save it to Files or iCloud: if you change phone or Safari clears its data, you lose nothing.
            </p>
            <div class="riga-pulsanti">
              <button class="pulsante piccolo pieno" onClick={() => setFoglio(true)}>
                Back up now
              </button>
              <button class="pulsante piccolo grigio" onClick={() => scriviMeta('backupRimandato', new Date().toISOString())}>
                Later
              </button>
            </div>
          </Card>
        </div>
      )}
      <FoglioEsporta aperto={foglio} onChiudi={() => setFoglio(false)} />
    </>
  )
}
