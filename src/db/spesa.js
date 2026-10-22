// Lista della spesa: una lista "aperta" alla volta, più l'archivio delle spese fatte.
//
// Formato (archivio IndexedDB "spese"):
// lista = { id, stato: "aperta" | "fatta", data: "2026-10-22", creata, fatta, voci: [voce] }
// voce  = { id, prodotto, it, dk, reparto, quantita, spuntato, aggiunto }
// Ogni voce conserva nome e reparto del prodotto: lo storico resta leggibile
// anche se in futuro il prodotto viene rinominato o nascosto.
import { useDati, datiCorrenti, modificaStato, scrivi, scriviMeta } from './dati.js'
import { dataISO } from '../lib/giornata.js'
import { nuovoId } from '../lib/id.js'

const adesso = () => new Date().toISOString()

export function listaAperta(spese) {
  return spese.find((l) => l.stato === 'aperta') || null
}

/** Spese archiviate, dalla più recente */
export function speseFatte(spese) {
  return spese.filter((l) => l.stato === 'fatta').sort((a, b) => b.fatta.localeCompare(a.fatta))
}

export function useSpesa() {
  const { spese } = useDati()
  return { lista: listaAperta(spese), fatte: speseFatte(spese) }
}

/** Quante volte ho comprato ogni prodotto: serve a suggerire prima quelli che uso di più */
export function frequenze(spese) {
  const conteggi = {}
  for (const lista of spese) for (const v of lista.voci) conteggi[v.prodotto] = (conteggi[v.prodotto] || 0) + 1
  return conteggi
}

// ---------------------------------------------------------------------------

function salvaLista(lista) {
  modificaStato((s) => ({ ...s, spese: [...s.spese.filter((l) => l.id !== lista.id), lista] }))
  return scrivi((db) => db.put('spese', lista))
}

function nuovaLista(voci = []) {
  return { id: nuovoId(), stato: 'aperta', data: dataISO(new Date()), creata: adesso(), fatta: null, voci }
}

function apertaOppureNuova() {
  return listaAperta(datiCorrenti().spese) || nuovaLista()
}

function creaVoce(prodotto, quantita = '') {
  return {
    id: nuovoId(),
    prodotto: prodotto.id,
    it: prodotto.it,
    dk: prodotto.dk || '',
    reparto: prodotto.reparto,
    quantita,
    spuntato: false,
    aggiunto: adesso(),
  }
}

/**
 * Aggiunge prodotti alla lista aperta. Un prodotto già presente non viene duplicato
 * (se era già spuntato torna "da prendere"). Con aggiornaQuantita (lista generata dalle
 * ricette) la quantità calcolata sostituisce quella già scritta.
 * Restituisce quanti prodotti sono stati aggiunti.
 */
export function aggiungi(elementi, { aggiornaQuantita = false } = {}) {
  const lista = apertaOppureNuova()
  const voci = [...lista.voci]
  let aggiunti = 0
  for (const { prodotto, quantita = '' } of elementi) {
    const i = voci.findIndex((v) => v.prodotto === prodotto.id)
    if (i === -1) {
      voci.push(creaVoce(prodotto, quantita))
      aggiunti++
    } else {
      const aggiornata = { ...voci[i] }
      if (aggiornata.spuntato) {
        aggiornata.spuntato = false
        aggiunti++
      }
      if (aggiornaQuantita && quantita) aggiornata.quantita = quantita
      voci[i] = aggiornata
    }
  }
  salvaLista({ ...lista, voci })
  return aggiunti
}

export function aggiornaVoce(idVoce, modifiche) {
  const lista = listaAperta(datiCorrenti().spese)
  if (!lista) return
  salvaLista({ ...lista, voci: lista.voci.map((v) => (v.id === idVoce ? { ...v, ...modifiche } : v)) })
}

export function rimuoviVoce(idVoce) {
  const lista = listaAperta(datiCorrenti().spese)
  if (!lista) return
  salvaLista({ ...lista, voci: lista.voci.filter((v) => v.id !== idVoce) })
}

export function rimuoviProdotto(idProdotto) {
  const lista = listaAperta(datiCorrenti().spese)
  if (!lista) return
  salvaLista({ ...lista, voci: lista.voci.filter((v) => v.prodotto !== idProdotto) })
}

/**
 * "Spesa fatta": archivia la lista con la data di oggi.
 * I prodotti non spuntati passano a una nuova lista, per la prossima volta.
 */
export function spesaFatta() {
  const lista = listaAperta(datiCorrenti().spese)
  if (!lista) return null
  const rimasti = lista.voci.filter((v) => !v.spuntato)
  const archiviata = { ...lista, stato: 'fatta', fatta: adesso(), data: dataISO(new Date()) }
  const prossima = nuovaLista(rimasti.map((v) => ({ ...v, id: nuovoId(), aggiunto: adesso() })))

  modificaStato((s) => ({
    ...s,
    spese: [...s.spese.filter((l) => l.id !== lista.id), archiviata, ...(rimasti.length ? [prossima] : [])],
  }))
  scrivi(async (db) => {
    const tx = db.transaction('spese', 'readwrite')
    tx.store.put(archiviata)
    if (rimasti.length) tx.store.put(prossima)
    await tx.done
  })

  // La dispensa appena ricomprata non è più "finita"
  const finita = { ...datiCorrenti().meta.dispensaFinita }
  const comprati = lista.voci.filter((v) => v.spuntato && finita[v.prodotto])
  if (comprati.length) {
    for (const v of comprati) delete finita[v.prodotto]
    scriviMeta('dispensaFinita', finita)
  }
  return { presi: lista.voci.length - rimasti.length, rimasti: rimasti.length }
}

/** Segna un prodotto di dispensa come finito (entra nella prossima lista generata) o no */
export function segnaDispensa(idProdotto, finito) {
  const finita = { ...datiCorrenti().meta.dispensaFinita }
  if (finito) finita[idProdotto] = true
  else delete finita[idProdotto]
  return scriviMeta('dispensaFinita', finita)
}

/** Rimette in lista tutti i prodotti di una spesa passata (con le stesse quantità). */
export function ripeti(spesaPassata) {
  return aggiungi(
    spesaPassata.voci.map((v) => ({
      prodotto: { id: v.prodotto, it: v.it, dk: v.dk, reparto: v.reparto },
      quantita: v.quantita,
    })),
  )
}

/** Toglie tutte le voci dalla lista aperta. */
export function svuota() {
  const lista = listaAperta(datiCorrenti().spese)
  if (lista) salvaLista({ ...lista, voci: [] })
}
