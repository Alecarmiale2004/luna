// Parti della sezione Allenamento usate anche nella schermata Oggi.
import { useEffect, useState } from 'preact/hooks'
import { Card, CardTesta } from '../components/Card.jsx'
import { Flame, Footprints, Feather, Bed, Clock, Check, Play } from '../components/icone.js'
import { useNav } from '../navigazione.jsx'
import { useDati } from '../db/dati.js'
import PROGRAMMA from '../data/programma.json'
import { useAllenamento, iniziaSeduta, segnaPausa, minutiSeduta, ATTESA_COLAZIONE, FINIRE_ENTRO } from '../db/allenamento.js'
import { useOggi } from '../lib/giornata.js'
import { useGiornataPasti } from '../lib/pasti.js'
import { creaSegnale } from '../lib/segnale.js'
import { sbloccaAudio } from '../lib/suoni.js'
import { vibra } from '../lib/tocco.js'
import './allenamento.css'

export const INFO_TIPO = {
  forte: { icona: Flame, tinta: 'tint-forte' },
  leggera: { icona: Footprints, tinta: 'tint-leggera' },
  mobilita: { icona: Feather, tinta: 'tint-mobilita' },
  pausa: { icona: Bed, tinta: 'tint-pausa' },
}
export const nomeTipo = (tipo) => PROGRAMMA.giornate[tipo]?.nome || tipo

/** La seduta mostrata a schermo intero (allenamento guidato) */
export const sedutaAperta = creaSegnale(null)

/** Inizia un allenamento (dentro il tocco: sblocca anche l'audio per i bip) */
export function avviaAllenamento(tipo, data) {
  sbloccaAudio()
  vibra()
  if (tipo === 'pausa') return segnaPausa(data)
  sedutaAperta.set(iniziaSeduta(tipo, data))
}

export function riprendiAllenamento(id) {
  sbloccaAudio()
  sedutaAperta.set(id)
}

/** Ora attuale, aggiornata ogni `ms` millisecondi */
export function useAdesso(ms = 1000) {
  const [adesso, setAdesso] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setAdesso(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return adesso
}

/**
 * Suggerimento sull'orario: allenarsi ~45–60 minuti dopo la colazione e,
 * nei giorni di lavoro, finire entro le 18:30.
 */
export function useSuggerimentoOrario() {
  const { giorni, impostazioni } = useDati()
  const oggi = useOggi()
  const giornata = useGiornataPasti(impostazioni.fineTurno)
  const adesso = useAdesso(30_000)
  const colazione = giorni[giornata]?.pasti?.colazione
  const lavoro = giorni[oggi]?.tipo === 'lavoro'
  const entro = lavoro ? ` · working tonight: finish by ${FINIRE_ENTRO}` : ''
  if (!colazione) return `After breakfast, wait ${ATTESA_COLAZIONE}–60 minutes${entro}`
  const minuti = ATTESA_COLAZIONE - Math.floor((adesso - Date.parse(colazione)) / 60000)
  if (minuti > 0) return `You can train in ${minuti} min${entro}`
  return `You can train now${entro}`
}

/** Card Allenamento nella schermata Oggi */
export function CardAllenamentoOggi() {
  const nav = useNav()
  const oggi = useOggi()
  const { tipo, inCorso, fattaOggi } = useAllenamento(oggi)
  const suggerimento = useSuggerimentoOrario()
  const mostrato = inCorso?.tipo || fattaOggi?.tipo || tipo
  const { icona: Icona, tinta } = INFO_TIPO[mostrato]

  let titolo = nomeTipo(tipo)
  let sotto = PROGRAMMA.giornate[tipo].durata
  if (inCorso) {
    titolo = `${nomeTipo(inCorso.tipo)} in progress`
    sotto = `${inCorso.indice} of ${inCorso.passi.length} steps done`
  } else if (fattaOggi) {
    titolo = fattaOggi.tipo === 'pausa' ? 'Rest' : `${nomeTipo(fattaOggi.tipo)} done`
    sotto = fattaOggi.tipo === 'pausa' ? 'Rest day marked' : `${minutiSeduta(fattaOggi)} minutes of training`
  }

  return (
    <div class={`sezione ${tinta}`}>
      <Card onClick={() => nav.vaiATab('allenamento')}>
        <CardTesta icona={Icona} titolo={inCorso || fattaOggi ? 'Training' : 'Today’s training'} freccia />
        <div class="allenamento-oggi">
          <span class="tipo-icona piccola">{fattaOggi ? <Check size={22} strokeWidth={3} /> : <Icona size={22} />}</span>
          <div>
            <p class="t-title3">{titolo}</p>
            <p class="t-subheadline c-label-2">{sotto}</p>
          </div>
        </div>
        {!inCorso && !fattaOggi && tipo !== 'pausa' && (
          <p class="suggerimento-orario">
            <Clock size={18} color="var(--tint)" />
            {suggerimento}
          </p>
        )}
        {inCorso && (
          <p class="suggerimento-orario">
            <Play size={18} color="var(--tint)" />
            Tap to pick up where you left off
          </p>
        )}
      </Card>
    </div>
  )
}
