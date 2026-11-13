// Parti della sezione Allenamento usate anche nella schermata Oggi.
import { useEffect, useState } from 'preact/hooks'
import { BicepsFlexed, Flame, Dumbbell, Footprints, Feather, Bed } from '../components/icone.js'
import { useDati } from '../db/dati.js'
import PROGRAMMA from '../data/programma.json'
import { iniziaSeduta, segnaPausa } from '../db/allenamento.js'
import { creaSegnale } from '../lib/segnale.js'
import { sbloccaAudio } from '../lib/suoni.js'
import { vibra } from '../lib/tocco.js'
import './allenamento.css'

export const INFO_TIPO = {
  spinta: { icona: BicepsFlexed, tinta: 'tint-spinta' },
  gambe: { icona: Flame, tinta: 'tint-gambe' },
  forte: { icona: Dumbbell, tinta: 'tint-forte' },
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

/** Suggerimento sull'orario, dal blocco "Training" della giornata tipo */
export function useSuggerimentoOrario() {
  const { impostazioni } = useDati()
  const ora = impostazioni.blocchi.find((b) => b.azione === 'allenamento')?.ora
  return ora ? `Planned at ${ora} · have a banana 30–60 min before` : 'Have a banana 30–60 min before'
}
