// Pianificazione della settimana (archivio "piani", una settimana per record).
//
// piano = { id: "2026-10-19" (lunedì), inizio, voci: [voce], cucinate: [{ voce, data }], giri, generata }
// voce  = { id, ricetta, volte, scambi: { prodottoOriginale: prodottoNuovo } }
// "Da cucinare oggi" = la prima ricetta della settimana non ancora cucinata tutte le volte previste.
import { useDati, datiCorrenti, modificaStato, scrivi } from './dati.js'
import { nuovoId } from '../lib/id.js'

export function pianoDi(piani, inizio) {
  return piani.find((p) => p.inizio === inizio) || null
}

export function usePiano(inizio) {
  return pianoDi(useDati().piani, inizio)
}

function nuovoPiano(inizio) {
  return { id: inizio, inizio, voci: [], cucinate: [], giri: 1, generata: {}, creato: new Date().toISOString() }
}

function salva(piano) {
  modificaStato((s) => ({ ...s, piani: [...s.piani.filter((p) => p.id !== piano.id), piano] }))
  return scrivi((db) => db.put('piani', piano))
}

function modifica(inizio, fn) {
  const piano = pianoDi(datiCorrenti().piani, inizio) || nuovoPiano(inizio)
  return salva(fn(structuredClone(piano)))
}

/** Quante volte cucinare una ricetta in settimana (0 = toglila). scambi: solo per una ricetta nuova */
export function impostaVolte(inizio, ricetta, volte, scambi = {}) {
  return modifica(inizio, (p) => {
    const voce = p.voci.find((v) => v.ricetta === ricetta)
    if (volte <= 0) {
      p.voci = p.voci.filter((v) => v !== voce)
      if (voce) p.cucinate = p.cucinate.filter((c) => c.voce !== voce.id)
    } else if (voce) voce.volte = volte
    else p.voci.push({ id: nuovoId(), ricetta, volte, scambi: { ...scambi } })
    return p
  })
}

/** Scambia un ingrediente di una ricetta della settimana (a === da toglie lo scambio) */
export function impostaScambio(inizio, idVoce, da, a) {
  return modifica(inizio, (p) => {
    const voce = p.voci.find((v) => v.id === idVoce)
    if (!voce) return p
    if (!a || a === da) delete voce.scambi[da]
    else voce.scambi[da] = a
    return p
  })
}

/** Sostituisce tutte le ricette della settimana (da settimana tipo o dalla settimana scorsa) */
export function sostituisciVoci(inizio, voci) {
  return modifica(inizio, (p) => {
    p.voci = voci.map((v) => ({ id: nuovoId(), ricetta: v.ricetta, volte: v.volte, scambi: { ...v.scambi } }))
    p.cucinate = []
    return p
  })
}

export function segnaCucinata(inizio, idVoce, data) {
  return modifica(inizio, (p) => {
    // Una sola sessione di cucina al giorno
    p.cucinate = [...p.cucinate.filter((c) => c.data !== data), { voce: idVoce, data }]
    return p
  })
}

export function annullaCucinata(inizio, data) {
  return modifica(inizio, (p) => {
    p.cucinate = p.cucinate.filter((c) => c.data !== data)
    return p
  })
}

export function impostaGiri(inizio, giri) {
  return modifica(inizio, (p) => ({ ...p, giri }))
}

export function segnaGenerata(inizio, giro) {
  return modifica(inizio, (p) => ({ ...p, generata: { ...p.generata, [giro]: new Date().toISOString() } }))
}

/** Quante volte è già stata cucinata una voce */
export const cucinateDi = (piano, idVoce) => piano.cucinate.filter((c) => c.voce === idVoce).length

/**
 * La ricetta del giorno: { voce, fatta } — quella già cucinata in questa data,
 * altrimenti la prossima ancora da cucinare. null se la settimana è vuota o finita.
 */
export function ricettaDelGiorno(piano, data) {
  if (!piano) return null
  const oggi = piano.cucinate.find((c) => c.data === data)
  if (oggi) {
    const voce = piano.voci.find((v) => v.id === oggi.voce)
    if (voce) return { voce, fatta: true }
  }
  const voce = piano.voci.find((v) => cucinateDi(piano, v.id) < v.volte)
  return voce ? { voce, fatta: false } : null
}

/** Quante volte ho cucinato ogni ricetta, in tutte le settimane: per suggerire le preferite */
export function frequenzeRicette(piani) {
  const conti = {}
  for (const p of piani) {
    for (const c of p.cucinate) {
      const voce = p.voci.find((v) => v.id === c.voce)
      if (voce) conti[voce.ricetta] = (conti[voce.ricetta] || 0) + 1
    }
  }
  return conti
}

// ---------------------------------------------------------------------------
// Settimane tipo
// ---------------------------------------------------------------------------

export function salvaSettimanaTipo(nome, voci) {
  const record = {
    id: nuovoId(),
    nome: nome.trim() || 'Settimana tipo',
    voci: voci.map(({ ricetta, volte, scambi }) => ({ ricetta, volte, scambi: { ...scambi } })),
    creata: new Date().toISOString(),
  }
  modificaStato((s) => ({ ...s, settimaneTipo: [...s.settimaneTipo, record] }))
  return scrivi((db) => db.put('settimaneTipo', record))
}

export function eliminaSettimanaTipo(id) {
  modificaStato((s) => ({ ...s, settimaneTipo: s.settimaneTipo.filter((t) => t.id !== id) }))
  return scrivi((db) => db.delete('settimaneTipo', id))
}
