// Impostazioni fisse dell'app, tutte in un solo punto.
// Per cambiare nome all'app basta modificare APP_NAME (e rigenerare l'icona se serve).

export const APP_NAME = 'Luna'
export const APP_DESCRIPTION = 'Spesa, cibo e allenamento, al ritmo del turno di notte.'

// Valori predefiniti delle Impostazioni (usati al primo avvio).
// L'utente li cambia dall'app: i valori salvati hanno sempre la precedenza.
export const IMPOSTAZIONI_PREDEFINITE = {
  risveglio: '15:00', // orario abituale di risveglio
  nottiSettimana: 5, // notti di lavoro attese a settimana
  inizioTurno: '23:00',
  fineTurno: '07:00',
  obiettivoProteine: 100, // grammi al giorno
  promemoriaBackupGiorni: 14,
}
