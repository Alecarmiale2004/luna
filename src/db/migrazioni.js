// Versione del formato dei dati e migrazioni.
//
// COME AGGIUNGERE UNA MIGRAZIONE
// 1. Aumenta VERSIONE_DATI di 1 (es. da 1 a 2).
// 2. Aggiungi in MIGRAZIONI la funzione con quel numero: riceve TUTTI i dati
//    ({ giorni: [...], spese: [...], ... }) nel formato vecchio e li restituisce nel nuovo.
// 3. Non modificare mai una migrazione già pubblicata: aggiungine una nuova.
//
// Le stesse migrazioni valgono per i dati sul telefono e per i backup importati,
// quindi un backup vecchio si può sempre reimportare.
// Prima di ogni migrazione l'app salva da sola una copia di sicurezza.

export const VERSIONE_DATI = 1

export const MIGRAZIONI = {
  // Esempio:
  // 2: (dati) => {
  //   dati.giorni = dati.giorni.map((g) => ({ ...g, note: '' }))
  //   return dati
  // },
}

export class DatiTroppoNuovi extends Error {
  constructor(versione) {
    super(`I dati sono in formato ${versione}, questa versione dell'app arriva al ${VERSIONE_DATI}.`)
    this.versione = versione
  }
}

/** Porta i dati dalla versione `da` alla versione attuale. */
export function migra(dati, da) {
  if (da > VERSIONE_DATI) throw new DatiTroppoNuovi(da)
  let risultato = structuredClone(dati)
  for (let v = da + 1; v <= VERSIONE_DATI; v++) {
    const passo = MIGRAZIONI[v]
    if (!passo) throw new Error(`Manca la migrazione verso la versione ${v}`)
    risultato = passo(risultato)
  }
  return risultato
}
