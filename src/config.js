// Impostazioni fisse dell'app, tutte in un solo punto.
// Per cambiare nome all'app basta modificare APP_NAME (e rigenerare l'icona se serve).
// L'interfaccia è in inglese; i prodotti della spesa hanno anche il nome danese.

export const APP_NAME = 'Luna'
export const APP_DESCRIPTION = 'Shopping, food and training, in step with the night shift.'

// Valori predefiniti delle Impostazioni (usati al primo avvio).
// L'utente li cambia dall'app: i valori salvati hanno sempre la precedenza.
export const IMPOSTAZIONI_PREDEFINITE = {
  risveglio: '15:00', // orario abituale di risveglio
  nottiSettimana: 5, // notti di lavoro attese a settimana
  inizioTurno: '23:00',
  fineTurno: '07:00',
  obiettivoProteine: 100, // grammi al giorno
  promemoriaBackupGiorni: 14,
  // Cibi da non suggerire mai (02-alimentazione/preferenze.md), modificabili dalle Impostazioni
  cibiEsclusi: [
    'Spinach',
    'Chickpeas',
    'Walnuts',
    'Almonds',
    'Corn',
    'Carrots',
    'Spring onions',
    'Spaghetti',
    'Skyr',
    'Greek yoghurt',
    'Salmon',
  ],
}
