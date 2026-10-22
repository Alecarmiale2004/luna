// Accesso ai dati per tutta l'app.
//
// Tutti i dati dell'app sono pochi (anche dopo mesi: qualche centinaio di record), quindi
// sono tenuti anche in memoria: l'interfaccia li legge all'istante e ogni modifica viene
// scritta SUBITO su IndexedDB, senza pulsante "Salva".
import { useSegnale, creaSegnale } from '../lib/segnale.js'
import { IMPOSTAZIONI_PREDEFINITE } from '../config.js'
import { apriDatabase, database, leggiTutto, scriviTutto } from './database.js'
import { VERSIONE_DATI, migra } from './migrazioni.js'

const MAX_COPIE = 5

const stato = creaSegnale({
  pronto: false,
  impostazioni: { ...IMPOSTAZIONI_PREDEFINITE },
  meta: {},
  // { "2026-10-22": { data, tipo: "lavoro" | "libero", pasti: { colazione: true, … } } }
  giorni: {},
  spese: [], // liste della spesa: una "aperta" + quelle archiviate (vedi spesa.js)
  prodottiMiei: {}, // prodotti aggiunti o modificati da me, per id (vedi catalogo.js)
  ricetteMie: {}, // ricette aggiunte, modificate o nascoste da me, per id (vedi ricette.js)
  piani: [], // settimane pianificate (vedi piani.js)
  settimaneTipo: [], // settimane salvate da riusare
  sedute: [], // allenamenti (vedi allenamento.js)
  eserciziMiei: {}, // serie/ripetizioni/sostituzioni cambiate da me, per esercizio del programma
  memoriaPersistente: null, // true / false / null (non disponibile)
})

/** Per i moduli di dominio (spesa.js…): modifica lo stato in memoria. */
export function modificaStato(fn) {
  stato.set(fn)
}

/** Errori di salvataggio, mostrati come avviso nell'app */
export const erroreSalvataggio = creaSegnale(null)

export function useDati() {
  return useSegnale(stato)
}

export function datiCorrenti() {
  return stato.get()
}

// ---------------------------------------------------------------------------
// Avvio
// ---------------------------------------------------------------------------

/**
 * Apre il database, prepara il primo avvio o esegue le migrazioni, poi carica i dati.
 * Lancia DatiTroppoNuovi se i dati arrivano da una versione dell'app più recente.
 */
export async function avvia() {
  const db = await apriDatabase()
  const versione = (await db.get('meta', 'versioneDati'))?.valore

  if (versione === undefined) {
    await primoAvvio()
  } else if (versione < VERSIONE_DATI) {
    const dati = await leggiTutto()
    await salvaCopia(dati, versione, 'Before the data update')
    const migrati = migra(dati, versione)
    impostaMeta(migrati, 'versioneDati', VERSIONE_DATI)
    await scriviTutto(migrati)
  } else {
    migra({}, versione) // lancia DatiTroppoNuovi se versione > VERSIONE_DATI
  }

  await ricarica()
  chiediMemoriaPersistente()
}

async function primoAvvio() {
  const tx = database().transaction(['meta', 'impostazioni'], 'readwrite')
  tx.objectStore('meta').put({ chiave: 'versioneDati', valore: VERSIONE_DATI })
  tx.objectStore('meta').put({ chiave: 'primoAvvio', valore: new Date().toISOString() })
  tx.objectStore('impostazioni').put({ id: 'utente', ...IMPOSTAZIONI_PREDEFINITE })
  await tx.done
}

/** Ricarica in memoria i dati dal database (dopo avvio, importazione, ripristino). */
export async function ricarica() {
  const db = database()
  const [meta, impostazioni, giorni, spese, prodotti, ricette, piani, settimaneTipo, sedute, esercizi] = await Promise.all([
    db.getAll('meta'),
    db.get('impostazioni', 'utente'),
    db.getAll('giorni'),
    db.getAll('spese'),
    db.getAll('prodotti'),
    db.getAll('ricette'),
    db.getAll('piani'),
    db.getAll('settimaneTipo'),
    db.getAll('sedute'),
    db.getAll('esercizi'),
  ])
  // I valori predefiniti riempiono le impostazioni aggiunte in versioni nuove dell'app;
  // quelle non più usate vengono ignorate (e spariscono al prossimo salvataggio).
  const salvate = Object.fromEntries(
    Object.entries(impostazioni || {}).filter(([chiave]) => chiave in IMPOSTAZIONI_PREDEFINITE),
  )
  stato.set((s) => ({
    ...s,
    pronto: true,
    impostazioni: { ...IMPOSTAZIONI_PREDEFINITE, ...salvate },
    meta: Object.fromEntries(meta.map((m) => [m.chiave, m.valore])),
    giorni: Object.fromEntries(giorni.map((g) => [g.data, g])),
    spese,
    prodottiMiei: Object.fromEntries(prodotti.map((p) => [p.id, p])),
    ricetteMie: Object.fromEntries(ricette.map((r) => [r.id, r])),
    piani,
    settimaneTipo,
    sedute,
    eserciziMiei: Object.fromEntries(esercizi.map((e) => [e.id, e])),
  }))
}

/** Chiede a Safari di non cancellare mai i dati dell'app per liberare spazio. */
async function chiediMemoriaPersistente() {
  if (!navigator.storage?.persist) return
  try {
    let persistente = await navigator.storage.persisted()
    if (!persistente) persistente = await navigator.storage.persist()
    stato.set((s) => ({ ...s, memoriaPersistente: persistente }))
  } catch {
    // non disponibile
  }
}

// ---------------------------------------------------------------------------
// Scrittura (immediata)
// ---------------------------------------------------------------------------

export async function scrivi(operazione) {
  try {
    await operazione(database())
  } catch (errore) {
    console.error(errore)
    erroreSalvataggio.set('Couldn’t save the last change. Please try again.')
  }
}

export function aggiornaImpostazioni(modifiche) {
  const impostazioni = { ...stato.get().impostazioni, ...modifiche }
  stato.set((s) => ({ ...s, impostazioni }))
  return scrivi((db) => db.put('impostazioni', { id: 'utente', ...impostazioni }))
}

export function scriviMeta(chiave, valore) {
  stato.set((s) => ({ ...s, meta: { ...s.meta, [chiave]: valore } }))
  return scrivi((db) => db.put('meta', { chiave, valore }))
}

/** Aggiorna il record di un giorno (tipo, pasti…); se resta vuoto lo elimina. */
function aggiornaGiorno(data, modifica) {
  const prima = stato.get().giorni[data] || { data }
  const record = modifica({ ...prima })
  record.aggiornato = new Date().toISOString()
  const vuoto = !record.tipo && !Object.values(record.pasti || {}).some(Boolean)
  stato.set((s) => {
    const giorni = { ...s.giorni }
    if (vuoto) delete giorni[data]
    else giorni[data] = record
    return { ...s, giorni }
  })
  return scrivi((db) => (vuoto ? db.delete('giorni', data) : db.put('giorni', record)))
}

/** tipo: "lavoro", "libero" oppure null per togliere il segno */
export function segnaGiorno(data, tipo) {
  return aggiornaGiorno(data, (g) => {
    if (tipo) g.tipo = tipo
    else delete g.tipo
    return g
  })
}

/** Segna un pasto come fatto (o no). pasto: "colazione" | "principale" | "schiscetta" | … */
export function segnaPasto(data, pasto, fatto) {
  return aggiornaGiorno(data, (g) => ({ ...g, pasti: { ...g.pasti, [pasto]: fatto } }))
}

function impostaMeta(dati, chiave, valore) {
  dati.meta = (dati.meta || []).filter((m) => m.chiave !== chiave)
  dati.meta.push({ chiave, valore })
}

// ---------------------------------------------------------------------------
// Copie di sicurezza automatiche (prima di migrazioni, importazioni e ripristini)
// ---------------------------------------------------------------------------

export async function salvaCopia(dati, versioneDati, motivo) {
  const db = database()
  await db.put('copie', { id: new Date().toISOString(), motivo, versioneDati, dati })
  // Tiene solo le copie più recenti
  const chiavi = await db.getAllKeys('copie')
  const daTogliere = chiavi.sort().slice(0, Math.max(0, chiavi.length - MAX_COPIE))
  for (const chiave of daTogliere) await db.delete('copie', chiave)
}

/** Elenco delle copie, dalla più recente, senza caricare i dati */
export async function elencoCopie() {
  const copie = await database().getAll('copie')
  return copie
    .map(({ id, motivo, versioneDati, dati }) => ({ id, motivo, versioneDati, riepilogo: riepilogoDati(dati) }))
    .sort((a, b) => b.id.localeCompare(a.id))
}

export async function ripristinaCopia(id) {
  const copia = await database().get('copie', id)
  if (!copia) throw new Error('Copy not found')
  await sostituisciDati(migra(copia.dati, copia.versioneDati), 'Before restoring a copy')
}

/**
 * Sostituisce tutti i dati (importazione o ripristino),
 * salvando prima una copia di quelli attuali.
 */
export async function sostituisciDati(nuovi, motivo) {
  const attuali = await leggiTutto()
  await salvaCopia(attuali, VERSIONE_DATI, motivo)
  const dati = structuredClone(nuovi)
  impostaMeta(dati, 'versioneDati', VERSIONE_DATI)
  await scriviTutto(dati)
  await ricarica()
}

// ---------------------------------------------------------------------------
// Riepilogo leggibile di un insieme di dati
// ---------------------------------------------------------------------------

const ETICHETTE = {
  giorni: ['day', 'days'],
  spese: ['shopping list', 'shopping lists'],
  piani: ['planned week', 'planned weeks'],
  sedute: ['workout', 'workouts'],
  ricette: ['custom recipe', 'custom recipes'],
  prodotti: ['custom product', 'custom products'],
  esercizi: ['custom exercise', 'custom exercises'],
  settimaneTipo: ['saved week', 'saved weeks'],
}

/** es. "12 giorni segnati · 3 spese" (solo gli archivi non vuoti) */
export function riepilogoDati(dati) {
  const parti = Object.entries(ETICHETTE)
    .map(([nome, [uno, tanti]]) => {
      const n = dati?.[nome]?.length || 0
      return n ? `${n} ${n === 1 ? uno : tanti}` : null
    })
    .filter(Boolean)
  return parti.length ? parti.join(' · ') : 'No data yet'
}
