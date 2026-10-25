// Struttura del database IndexedDB.
//
// Ci sono DUE numeri di versione, con ruoli diversi:
// - VERSIONE_STRUTTURA (qui): quali "archivi" (tabelle) esistono. Per aggiungere un archivio
//   o un indice basta aggiungerlo in ARCHIVI e aumentare questo numero: viene creato
//   senza toccare i dati esistenti.
// - VERSIONE_DATI (migrazioni.js): il formato dei record. Quando cambia il formato
//   si scrive una migrazione.
import { openDB } from 'idb'

export const NOME_DB = 'luna'
const VERSIONE_STRUTTURA = 1

// Tutti gli archivi dell'app, anche quelli usati nelle fasi successive.
// Ogni record ha la sua chiave al proprio interno (campo `chiave`).
export const ARCHIVI = {
  meta: { chiave: 'chiave' }, // { chiave, valore }: versione dati, primo avvio, ultimo backup…
  impostazioni: { chiave: 'id' }, // un solo record, id "utente"
  giorni: { chiave: 'data' }, // { data: "2026-10-22", tipo: "lavoro" | "libero" }
  spese: { chiave: 'id', indici: ['data'] }, // liste della spesa (aperta + archiviate)
  prodotti: { chiave: 'id' }, // prodotti aggiunti o modificati da me
  ricette: { chiave: 'id' }, // ricette aggiunte, modificate o nascoste da me
  piani: { chiave: 'id', indici: ['inizio'] }, // settimane di ricette pianificate
  settimaneTipo: { chiave: 'id' }, // settimane salvate da riusare
  sedute: { chiave: 'id', indici: ['data'] }, // allenamenti fatti
  esercizi: { chiave: 'id' }, // esercizi modificati da me
  copie: { chiave: 'id' }, // copie di sicurezza automatiche (non finiscono nei backup)
}

/** Archivi che contengono i dati dell'utente (tutto tranne le copie automatiche) */
export const ARCHIVI_DATI = Object.keys(ARCHIVI).filter((a) => a !== 'copie')

let db = null

export async function apriDatabase() {
  if (db) return db
  db = await openDB(NOME_DB, VERSIONE_STRUTTURA, {
    // Crea solo ciò che manca: non cancella né svuota mai un archivio esistente.
    upgrade(database, _vecchia, _nuova, transazione) {
      for (const [nome, def] of Object.entries(ARCHIVI)) {
        const archivio = database.objectStoreNames.contains(nome)
          ? transazione.objectStore(nome)
          : database.createObjectStore(nome, { keyPath: def.chiave })
        for (const indice of def.indici || []) {
          if (!archivio.indexNames.contains(indice)) archivio.createIndex(indice, indice)
        }
      }
    },
    blocking() {
      // Un'altra scheda con una versione più nuova vuole aggiornare il database
      db?.close()
      location.reload()
    },
  })
  return db
}

export function database() {
  if (!db) throw new Error('Database not open yet')
  return db
}

/** Tutti i dati dell'utente come oggetto { archivio: [record, …] } */
export async function leggiTutto() {
  const tx = database().transaction(ARCHIVI_DATI, 'readonly')
  const dati = {}
  for (const nome of ARCHIVI_DATI) dati[nome] = await tx.objectStore(nome).getAll()
  await tx.done
  return dati
}

/**
 * Sostituisce tutti i dati in UNA sola transazione:
 * o va tutto a buon fine, o non cambia niente.
 */
export async function scriviTutto(dati) {
  const tx = database().transaction(ARCHIVI_DATI, 'readwrite')
  for (const nome of ARCHIVI_DATI) {
    const archivio = tx.objectStore(nome)
    archivio.clear()
    for (const record of dati[nome] || []) archivio.put(record)
  }
  await tx.done
}
