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
  const entro = lavoro ? ` · stanotte lavori: finisci entro le ${FINIRE_ENTRO}` : ''
  if (!colazione) return `Dopo colazione aspetta ${ATTESA_COLAZIONE}–60 minuti${entro}`
  const minuti = ATTESA_COLAZIONE - Math.floor((adesso - Date.parse(colazione)) / 60000)
  if (minuti > 0) return `Puoi allenarti tra ${minuti} min${entro}`
  return `Puoi allenarti ora${entro}`
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
    titolo = `${nomeTipo(inCorso.tipo)} in corso`
    sotto = `${inCorso.indice} di ${inCorso.passi.length} passi fatti`
  } else if (fattaOggi) {
    titolo = fattaOggi.tipo === 'pausa' ? 'Pausa' : `${nomeTipo(fattaOggi.tipo)} fatta`
    sotto = fattaOggi.tipo === 'pausa' ? 'Giornata di riposo segnata' : `${minutiSeduta(fattaOggi)} minuti di allenamento`
  }

  return (
    <div class={`sezione ${tinta}`}>
      <Card onClick={() => nav.vaiATab('allenamento')}>
        <CardTesta icona={Icona} titolo={inCorso || fattaOggi ? 'Allenamento' : 'Allenamento di oggi'} freccia />
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
            Tocca per riprendere da dove eri
          </p>
        )}
      </Card>
    </div>
  )
}
