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

export const VERSIONE_DATI = 2

// Cibi esclusi predefiniti della versione italiana → inglese (migrazione 2)
const ESCLUSI_IN_INGLESE = {
  Spinaci: 'Spinach',
  Ceci: 'Chickpeas',
  Noci: 'Walnuts',
  Mandorle: 'Almonds',
  Mais: 'Corn',
  Carote: 'Carrots',
  Cipollotto: 'Spring onions',
  Spaghetti: 'Spaghetti',
  Skyr: 'Skyr',
  'Yogurt greco': 'Greek yoghurt',
  Salmone: 'Salmon',
}

/** Rinomina il campo `it` in `nome` (se c'è) */
const conNome = ({ it, ...resto }) => (it === undefined ? resto : { nome: it, ...resto })

export const MIGRAZIONI = {
  // 2 — L'app passa all'inglese. Il nome dei prodotti non è più "italiano": il campo `it`
  // diventa `nome` (prodotti miei e voci delle liste della spesa) e i cibi esclusi
  // predefiniti vengono tradotti. I nomi scritti da me restano come li ho scritti.
  2: (dati) => {
    dati.prodotti = (dati.prodotti || []).map(conNome)
    dati.spese = (dati.spese || []).map((l) => ({ ...l, voci: (l.voci || []).map(conNome) }))
    dati.impostazioni = (dati.impostazioni || []).map((i) =>
      Array.isArray(i.cibiEsclusi) ? { ...i, cibiEsclusi: i.cibiEsclusi.map((c) => ESCLUSI_IN_INGLESE[c] || c) } : i,
    )
    return dati
  },
}

export class DatiTroppoNuovi extends Error {
  constructor(versione) {
    super(`Data is in format ${versione}, this version of the app supports up to ${VERSIONE_DATI}.`)
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
