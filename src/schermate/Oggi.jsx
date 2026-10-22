// Schermata "Oggi": il riepilogo della giornata, dal risveglio.
// Turno di stanotte + mini-settimana, spesa da fare, promemoria backup.
// Le card Colazione, Allenamento, Da cucinare e Proteine arrivano nelle fasi successive.
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
import './oggi.css'

export function Oggi() {
  const nav = useNav()
  const oggi = useOggi()

  return (
    <Pagina
      titolo="Oggi"
      sopratitolo={formatoGiorno(oggi)}
      destra={
        <button class="nav-pulsante" aria-label="Impostazioni" onClick={() => nav.apri(Impostazioni)}>
          <Settings size={24} />
        </button>
      }
    >
      <div class="sezione">
        <CardTurni oggi={oggi} />
      </div>
      <CardSpesa />
      <PromemoriaBackup />
    </Pagina>
  )
}

// ---------------------------------------------------------------------------
// Turno di stanotte + mini-settimana
// ---------------------------------------------------------------------------

const TESTI_TURNO = {
  lavoro: { titolo: 'Lavoro stanotte', icona: Moon },
  libero: { titolo: 'Libero stanotte', icona: Sun },
  vuoto: { titolo: 'Lavori stanotte?', icona: null },
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
  const tipo = giorni[oggi] || 'vuoto'
  const testi = TESTI_TURNO[tipo]
  const sottotitolo =
    tipo === 'lavoro'
      ? `Turno ${impostazioni.inizioTurno} – ${impostazioni.fineTurno}`
      : tipo === 'libero'
        ? 'Niente turno: giornata tutta tua'
        : 'Tocca per segnare il turno'

  const pressione = usePressione({
    onTocco: () => segna(oggi, prossimoTipo(giorni[oggi])),
    onPressioneLunga: () => giorni[oggi] && segna(oggi, null),
  })

  const settimana = settimanaDi(aggiungiGiorni(oggi, scarto * 7))
  const notti = settimana.filter((d) => giorni[d] === 'lavoro').length

  return (
    <Card class="card-turni">
      <CardTesta icona={Moon} titolo="Turno" />

      <button class="turno-oggi" {...pressione} aria-label={`${testi.titolo}. Tocca per cambiare.`}>
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
        <button class="settimana-freccia" aria-label="Settimana precedente" onClick={() => setScarto(scarto - 1)}>
          <ChevronLeft size={22} strokeWidth={2.4} />
        </button>
        <div class="settimana-etichetta">
          <span class="settimana-nome">{etichettaSettimana(settimana[0], oggi)}</span>
          <span class="settimana-conto">
            <span class="num">{notti}</span> di {impostazioni.nottiSettimana} notti di lavoro
          </span>
        </div>
        <button class="settimana-freccia" aria-label="Settimana successiva" onClick={() => setScarto(scarto + 1)}>
          <ChevronRight size={22} strokeWidth={2.4} />
        </button>
      </div>

      <div class="settimana">
        {settimana.map((data, i) => (
          <GiornoSettimana
            key={data}
            data={data}
            iniziale={INIZIALI_GIORNI[i]}
            tipo={giorni[data]}
            oggi={data === oggi}
            passato={data < oggi}
          />
        ))}
      </div>

      <p class="settimana-aiuto">Tocca un giorno per segnarlo: luna = lavoro, sole = libero. Tieni premuto per togliere il segno.</p>
    </Card>
  )
}

function GiornoSettimana({ data, iniziale, tipo, oggi, passato }) {
  const pressione = usePressione({
    onTocco: () => segna(data, prossimoTipo(tipo)),
    onPressioneLunga: () => tipo && segna(data, null),
  })
  const descrizione = tipo === 'lavoro' ? 'lavoro' : tipo === 'libero' ? 'libero' : 'non segnato'
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
        <CardTesta icona={ShoppingCart} titolo="Spesa" freccia />
        <p>
          <span class="t-title1 num">{daPrendere}</span>
          <span class="t-headline c-label-2"> {daPrendere === 1 ? 'prodotto da prendere' : 'prodotti da prendere'}</span>
        </p>
        {presi > 0 && <p class="t-subheadline c-label-2">{presi} già nel carrello</p>}
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
              {meta.ultimoBackup ? `Ultimo backup: ${tempoFa(meta.ultimoBackup)}` : 'Non hai ancora fatto un backup'}
            </p>
            <p class="t-subheadline c-label-2" style={{ marginTop: 2 }}>
              Salvalo in File o su iCloud: se cambi telefono o Safari cancella i dati, non perdi niente.
            </p>
            <div class="riga-pulsanti">
              <button class="pulsante piccolo pieno" onClick={() => setFoglio(true)}>
                Fai il backup
              </button>
              <button class="pulsante piccolo grigio" onClick={() => scriviMeta('backupRimandato', new Date().toISOString())}>
                Più tardi
              </button>
            </div>
          </Card>
        </div>
      )}
      <FoglioEsporta aperto={foglio} onChiudi={() => setFoglio(false)} />
    </>
  )
}
