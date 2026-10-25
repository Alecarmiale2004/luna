// Schema dei pasti della giornata, calcolato dal risveglio e dal turno
// (02-alimentazione/strategia-pasti.md): non orari fissi del calendario.
import { useEffect, useState } from 'preact/hooks'
import PASTI from '../data/pasti.json'
import { dataISO } from './giornata.js'

/** "15:00" + 4.5 → "19:30" (gira oltre la mezzanotte) */
export function sommaOre(ora, ore) {
  const [h, m] = ora.split(':').map(Number)
  const minuti = (((h * 60 + m + Math.round(ore * 60)) % 1440) + 1440) % 1440
  return `${String(Math.floor(minuti / 60)).padStart(2, '0')}:${String(minuti % 60).padStart(2, '0')}`
}

/**
 * La data a cui appartengono i pasti in corso. La data mostrata nell'app è quella del
 * calendario, ma la schiscetta delle 2:30 e lo spuntino delle 7:30 chiudono la giornata
 * iniziata col risveglio del giorno prima: fino a 1,5 ore dopo la fine del turno
 * (es. fino alle 8:30) i pasti si contano ancora su ieri.
 */
export function giornataPasti(adesso, fineTurno) {
  const [h, m] = fineTurno.split(':').map(Number)
  const limite = h * 60 + m + 90
  const d = new Date(adesso)
  if (d.getHours() * 60 + d.getMinutes() < limite) d.setDate(d.getDate() - 1)
  return dataISO(d)
}

/** Hook: la giornata dei pasti, aggiornata ogni minuto e al ritorno in primo piano */
export function useGiornataPasti(fineTurno) {
  const [data, setData] = useState(() => giornataPasti(new Date(), fineTurno))
  useEffect(() => {
    const aggiorna = () => setData(giornataPasti(new Date(), fineTurno))
    aggiorna()
    const timer = setInterval(aggiorna, 60_000)
    document.addEventListener('visibilitychange', aggiorna)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', aggiorna)
    }
  }, [fineTurno])
  return data
}

/** Proteine della porzione più leggera (meno pasta/riso, stessa proteina e verdura) */
function proteineLeggera(ricetta, perId, riduzione) {
  const base = ricetta.ingredienti.find((i) => i.blocco === 'base')
  const p100 = perId[base?.prodotto]?.proteine100 || 0
  return Math.round(ricetta.proteinePorzione - (riduzione * p100) / 100)
}

/**
 * Pasti della giornata, in ordine dal risveglio.
 * ricetta: la ricetta del giorno (già con gli scambi) oppure null.
 */
export function schemaPasti({ impostazioni, lavoro, ricetta, perId }) {
  const { risveglio, inizioTurno, fineTurno } = impostazioni
  const nomeRicetta = ricetta?.nome
  const secondo = lavoro ? PASTI.schiscetta : PASTI.secondoPasto
  return [
    {
      id: 'colazione',
      nome: PASTI.colazione.nome,
      ora: sommaOre(risveglio, PASTI.colazione.dopoRisveglio),
      descrizione: PASTI.colazione.descrizione,
      proteine: PASTI.colazione.proteine,
    },
    {
      id: 'principale',
      nome: PASTI.principale.nome,
      ora: sommaOre(risveglio, PASTI.principale.dopoRisveglio),
      descrizione: nomeRicetta || 'Recipe not chosen yet',
      proteine: ricetta ? ricetta.proteinePorzione : null,
    },
    {
      id: lavoro ? 'schiscetta' : 'secondo',
      nome: secondo.nome,
      ora: lavoro ? sommaOre(inizioTurno, secondo.dopoInizioTurno) : sommaOre(risveglio, secondo.dopoRisveglio),
      descrizione: nomeRicetta ? `${nomeRicetta}, lighter portion` : secondo.descrizione,
      proteine: ricetta ? proteineLeggera(ricetta, perId, secondo.riduzioneBaseGrammi) : null,
    },
    {
      id: 'spuntino',
      nome: PASTI.spuntino.nome,
      ora: sommaOre(fineTurno, PASTI.spuntino.dopoFineTurno),
      descrizione: PASTI.spuntino.descrizione,
      proteine: PASTI.spuntino.proteine,
    },
  ]
}

/** Grammi di proteine dei pasti segnati come fatti */
export function proteineFatte(schema, pastiFatti = {}) {
  return schema.reduce((tot, p) => tot + (pastiFatti[p.id] ? p.proteine || 0 : 0), 0)
}
