// Impostazioni fisse dell'app, tutte in un solo punto.
// Per cambiare nome all'app basta modificare APP_NAME (e rigenerare l'icona se serve).
// L'interfaccia è in inglese; i prodotti della spesa hanno anche il nome danese.

export const APP_NAME = 'Daily Life'
export const APP_DESCRIPTION = 'Your day, shopping, training and study in one place.'

// Giorni di lavoro della settimana (lunedì → domenica): null = libero.
// L'inizio cambia (16:00 o 17:00): si sceglie giorno per giorno dalla schermata Oggi.
const SERA = (fine) => ({ inizio: '16:00', fine })

// La giornata tipo (01-profilo/giornata-tipo.md): i blocchi da spuntare nella schermata Oggi.
// quando: "sempre" | "lavoro" (solo nei giorni di lavoro) | "libero" (solo nei giorni liberi)
// azione: collega il blocco a una sezione (lettura, allenamento, inglese); il blocco del lavoro
// non è qui: lo aggiunge l'app dagli orari di lavoro del giorno.
export const BLOCCHI_PREDEFINITI = [
  { id: 'sveglia', ora: '07:00', nome: 'Wake up', quando: 'sempre' },
  { id: 'colazione', ora: '07:30', nome: 'Breakfast', nota: 'Eggs, toast, Actimel and your pills', quando: 'sempre' },
  { id: 'organizza', ora: '08:00', nome: 'Plan the day', quando: 'sempre' },
  { id: 'cerca-lavoro', ora: '08:30', nome: 'Job search', quando: 'sempre' },
  { id: 'lettura', ora: '10:00', nome: 'Read', quando: 'sempre', azione: 'lettura' },
  { id: 'allenamento', ora: '10:30', nome: 'Training', quando: 'sempre', azione: 'allenamento' },
  { id: 'pranzo', ora: '11:30', nome: 'Lunch', nota: 'Chicken, vegetables and rice', quando: 'sempre' },
  { id: 'inglese', ora: '13:00', nome: 'English · IELTS', quando: 'sempre', azione: 'inglese' },
  { id: 'prima-lavoro', ora: '15:00', nome: 'Eat and get ready for work', nota: 'A tuna or ham sandwich and a banana', quando: 'lavoro' },
  { id: 'merenda', ora: '15:00', nome: 'Afternoon snack', nota: 'A banana', quando: 'libero' },
  { id: 'cena-libero', ora: '19:30', nome: 'Dinner', nota: 'Pasta or chicken, with vegetables', quando: 'libero' },
  { id: 'cena', ora: '21:00', nome: 'Dinner', nota: 'Pasta or chicken, with vegetables', quando: 'lavoro' },
  { id: 'doccia', ora: '21:30', nome: 'Shower', quando: 'sempre' },
  { id: 'tempo-libero', ora: '22:00', nome: 'Free time', quando: 'sempre' },
  { id: 'sonno', ora: '23:00', nome: 'Sleep', quando: 'sempre' },
]

// Valori predefiniti delle Impostazioni (usati al primo avvio).
// L'utente li cambia dall'app: i valori salvati hanno sempre la precedenza.
export const IMPOSTAZIONI_PREDEFINITE = {
  // lunedì, martedì liberi; mercoledì, giovedì e domenica fino alle 20; venerdì e sabato fino alle 21
  lavoro: [null, null, SERA('20:00'), SERA('20:00'), SERA('21:00'), SERA('21:00'), SERA('20:00')],
  blocchi: BLOCCHI_PREDEFINITI,
  obiettivoLetturaMinuti: 30,
  dataIelts: '2027-01-14',
  promemoriaBackupGiorni: 14,
}
