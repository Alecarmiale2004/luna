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

export const VERSIONE_DATI = 4

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

// Parole delle quantità generate dalla versione inglese → italiano (migrazione 3)
const PAROLE_QUANTITA = {
  packs: 'confezioni',
  pack: 'confezione',
  trays: 'vaschette',
  tray: 'vaschetta',
  pieces: 'pezzi',
  piece: 'pezzo',
  heads: 'pezzi',
  head: 'pezzo',
  bags: 'buste',
  bag: 'busta',
  bottles: 'bottiglie',
  bottle: 'bottiglia',
  cans: 'scatolette',
  can: 'scatoletta',
  eggs: 'uova',
  slices: 'fette',
  bananas: 'banane',
  banana: 'banana',
  apples: 'mele',
  apple: 'mela',
  lemons: 'pezzi',
  lemon: 'pezzo',
  each: 'l’uno',
  drained: 'sgocciolato',
}
const quantitaInItaliano = (testo) => testo.replace(/[a-z]+/g, (parola) => PAROLE_QUANTITA[parola] ?? parola)

// Parole delle quantità generate dalla versione italiana → inglese (migrazione 4)
const PAROLE_QUANTITA_IT = {
  confezioni: 'packs',
  confezione: 'pack',
  pacchi: 'packs',
  pacco: 'pack',
  vaschette: 'trays',
  vaschetta: 'tray',
  pezzi: 'pieces',
  pezzo: 'piece',
  buste: 'bags',
  busta: 'bag',
  bottiglie: 'bottles',
  bottiglia: 'bottle',
  scatolette: 'cans',
  scatoletta: 'can',
  uova: 'eggs',
  fette: 'slices',
  banane: 'bananas',
  mele: 'apples',
  mela: 'apple',
  sgocciolato: 'drained',
}
const quantitaInInglese = (testo) =>
  testo
    .replace(/l['’]un[oa]\b/g, 'each') // "~300 g l'una" → "~300 g each"
    .replace(/\(da /g, '(') // "(da 500 g)" → "(500 g)"
    .replace(/[a-z]+/g, (parola) => PAROLE_QUANTITA_IT[parola] ?? parola)

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

  // 3 — L'app torna in italiano (versione 1.2.0). Il campo `nome` resta (vale per qualsiasi
  // lingua); tornano in italiano i testi che l'app inglese poteva aver salvato da sola:
  // i cibi esclusi predefiniti e i nomi automatici delle settimane tipo ("Saved week 2").
  3: (dati) => {
    const inItaliano = Object.fromEntries(Object.entries(ESCLUSI_IN_INGLESE).map(([it, en]) => [en, it]))
    dati.impostazioni = (dati.impostazioni || []).map((i) =>
      Array.isArray(i.cibiEsclusi) ? { ...i, cibiEsclusi: i.cibiEsclusi.map((c) => inItaliano[c] || c) } : i,
    )
    dati.settimaneTipo = (dati.settimaneTipo || []).map((t) => ({
      ...t,
      nome: (t.nome || '').replace(/^Saved week\b/, 'Settimana tipo'),
    }))
    // Quantità scritte da "Genera lista della spesa" in inglese ("2 packs (~300 g each)")
    dati.spese = (dati.spese || []).map((l) => ({
      ...l,
      voci: (l.voci || []).map((v) => (v.quantita ? { ...v, quantita: quantitaInItaliano(v.quantita) } : v)),
    }))
    return dati
  },

  // 4 — L'app torna in inglese (versione 1.3.0, decisione di Alessandro del 25/10/2026).
  // Tornano in inglese i testi che la versione italiana poteva aver salvato da sola:
  // cibi esclusi predefiniti, nomi automatici delle settimane tipo, quantità generate.
  4: (dati) => {
    dati.impostazioni = (dati.impostazioni || []).map((i) =>
      Array.isArray(i.cibiEsclusi) ? { ...i, cibiEsclusi: i.cibiEsclusi.map((c) => ESCLUSI_IN_INGLESE[c] || c) } : i,
    )
    dati.settimaneTipo = (dati.settimaneTipo || []).map((t) => ({
      ...t,
      nome: (t.nome || '').replace(/^Settimana tipo\b/, 'Saved week'),
    }))
    dati.spese = (dati.spese || []).map((l) => ({
      ...l,
      voci: (l.voci || []).map((v) => (v.quantita ? { ...v, quantita: quantitaInInglese(v.quantita) } : v)),
    }))
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
