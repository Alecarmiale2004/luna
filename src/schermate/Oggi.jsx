// Schermata "Oggi": il riepilogo della giornata, dal risveglio.
// Nell'ordine della giornata: turno + mini-settimana, colazione, allenamento (con il conto
// alla rovescia dopo la colazione), da cucinare, proteine, spesa da fare, promemoria backup.
import { useState } from 'preact/hooks'
import { Pagina } from '../components/Pagina.jsx'
import { Card, CardTesta } from '../components/Card.jsx'
import { Moon, Sun, Settings, ChevronLeft, ChevronRight, ShieldCheck, ShoppingCart } from '../components/icone.js'
import { useNav } from '../navigazione.jsx'
import { useDati, segnaGiorno, scriviMeta } from '../db/dati.js'
import { useSpesa } from '../db/spesa.js'
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
import { Impostazioni } from './Impostazioni.jsx'
import { FoglioEsporta } from './Backup.jsx'
import { CardColazione, CardDaCucinare, CardProteine } from './ciboComune.jsx'
import { CardAllenamentoOggi } from './allenamentoComune.jsx'
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
        <CardTurni oggi={oggi} />
      </div>
      <CardColazione />
      <CardAllenamentoOggi />
      <CardDaCucinare />
      <CardProteine />
      <CardSpesa />
      <PromemoriaBackup />
    </Pagina>
  )
}

// ---------------------------------------------------------------------------
// Turno di stanotte + mini-settimana
// ---------------------------------------------------------------------------

const TESTI_TURNO = {
  lavoro: { titolo: 'Working tonight', icona: Moon },
  libero: { titolo: 'Off tonight', icona: Sun },
  vuoto: { titolo: 'Working tonight?', icona: null },
}

/** Un tocco alterna lavoro ↔ libero (un giorno non segnato diventa "lavoro"). */
const prossimoTipo = (tipo) => (tipo === 'lavoro' ? 'libero' : 'lavoro')

function segna(data, tipo) {
  vibra()
  segnaGiorno(data, tipo)
}

function CardTurni({ oggi }) {
  const { giorni, impostazioni } = useDati()
  const [scarto, setScarto] = useState(0) // settimane rispetto a quella in corso
  const tipoDi = (data) => giorni[data]?.tipo
  const tipo = tipoDi(oggi) || 'vuoto'
  const testi = TESTI_TURNO[tipo]
  const sottotitolo =
    tipo === 'lavoro'
      ? `Shift ${impostazioni.inizioTurno} – ${impostazioni.fineTurno}`
      : tipo === 'libero'
        ? 'No shift: the day is all yours'
        : 'Tap to mark your shift'

  const pressione = usePressione({
    onTocco: () => segna(oggi, prossimoTipo(tipoDi(oggi))),
    onPressioneLunga: () => tipoDi(oggi) && segna(oggi, null),
  })

  const settimana = settimanaDi(aggiungiGiorni(oggi, scarto * 7))
  const notti = settimana.filter((d) => tipoDi(d) === 'lavoro').length

  return (
    <Card class="card-turni">
      <CardTesta icona={Moon} titolo="Shift" />

      <button class="turno-oggi" {...pressione} aria-label={`${testi.titolo}. Tap to change.`}>
        <span class={`turno-icona ${tipo}`} key={tipo}>
          {testi.icona && <testi.icona size={30} strokeWidth={2.2} />}
        </span>
        <span class="turno-testi">
          <span class="turno-titolo">{testi.titolo}</span>
          <span class="turno-sottotitolo">{sottotitolo}</span>
        </span>
      </button>

      <div class="divisore" />

      <div class="settimana-testa">
        <button class="settimana-freccia" aria-label="Previous week" onClick={() => setScarto(scarto - 1)}>
          <ChevronLeft size={22} strokeWidth={2.4} />
        </button>
        <div class="settimana-etichetta">
          <span class="settimana-nome">{etichettaSettimana(settimana[0], oggi)}</span>
          <span class="settimana-conto">
            <span class="num">{notti}</span> of {impostazioni.nottiSettimana} work nights
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
            tipo={tipoDi(data)}
            oggi={data === oggi}
            passato={data < oggi}
          />
        ))}
      </div>

      <p class="settimana-aiuto">Tap a day to mark it: moon = work, sun = off. Press and hold to clear it.</p>
    </Card>
  )
}

function GiornoSettimana({ data, iniziale, tipo, oggi, passato }) {
  const pressione = usePressione({
    onTocco: () => segna(data, prossimoTipo(tipo)),
    onPressioneLunga: () => tipo && segna(data, null),
  })
  const descrizione = tipo === 'lavoro' ? 'work' : tipo === 'libero' ? 'off' : 'not marked'
  return (
    <button
      class={`giorno${oggi ? ' oggi' : ''}${passato ? ' passato' : ''}`}
      {...pressione}
      aria-label={`${formatoGiorno(data)}: ${descrizione}`}
    >
      <span class="giorno-iniziale">{iniziale}</span>
      <span class={`giorno-icona ${tipo || 'vuoto'}`} key={tipo || 'vuoto'}>
        {tipo === 'lavoro' && <Moon size={18} strokeWidth={2.4} />}
        {tipo === 'libero' && <Sun size={18} strokeWidth={2.4} />}
      </span>
      <span class="giorno-numero num">{daISO(data).getDate()}</span>
    </button>
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
