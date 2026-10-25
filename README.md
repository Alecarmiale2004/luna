# Luna

App personale per iPhone (PWA) per gestire **spesa, cibo e allenamento**, pensata per il turno di notte.
Interfaccia in **inglese** (decisione del 25/10/2026); i prodotti della spesa mostrano anche il nome danese.
Il contesto completo (profilo, ricette, prodotti, programma, stile) è nella cartella superiore `../`.

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm install` | Scarica le dipendenze (solo la prima volta) |
| `npm run dev` | Avvia l'app in locale su http://localhost:5173 (anche dagli altri dispositivi del Wi‑Fi) |
| `npm run build` | Crea la versione da pubblicare nella cartella `dist/` |
| `npm run preview` | Prova la versione pubblicabile (con offline) su http://localhost:4173 |
| `npm run icone` | Rigenera tutte le icone da `public/icona.svg` |
| `npm run esercizi` | Ridisegna le immagini degli esercizi (`scripts/disegna-esercizi.mjs`); anteprima su http://localhost:5173/scripts/anteprima-esercizi.html |

## Immagini degli esercizi
Sono in `public/immagini/esercizi/<id>.svg` (id = quello di `src/data/esercizi.json`).
Per sostituirne una con un'immagine fatta a parte basta mettere un file con **lo stesso nome**:
il codice non va toccato. Attenzione: `npm run esercizi` le riscrive tutte.

## Tecnologia
- **Vite + Preact** (JavaScript), **vite-plugin-pwa** per offline e aggiornamenti, **idb** per IndexedDB, icone **Lucide**.
- Nessun server: tutti i dati restano sul telefono.

## Struttura

```
src/
  config.js          nome dell'app e valori predefiniti delle impostazioni
  App.jsx            avvio, tab bar con le 4 sezioni, avviso di aggiornamento
  navigazione.jsx    tab bar e schermate che entrano da destra (con gesto "indietro")
  aggiornamenti.js   service worker: offline + avviso "Nuova versione disponibile"
  styles/
    tokens.css       TUTTI i colori, testi, spazi e forme (tema chiaro e scuro)
    base.css         regole di base da "app" su iPhone
    components.css   card, liste, tab bar, fogli dal basso, anelli, cerchi di spunta…
  components/        componenti riutilizzabili (Pagina, Card, Lista, Foglio, Anello, Spunta, Avvisi, icone)
  schermate/         Oggi, Spesa (+ Aggiungi, Storico, Prodotti), Cibo (+ Ricetta, Settimana, GestioneRicette,
                     CibiEsclusi, StoricoSettimane), Allenamento (+ Guidato, Progressi, Ritmo,
                     GestioneEsercizi, StoricoAllenamenti), Impostazioni, Backup, Anteprima dello stile
  data/              CONTENUTI modificabili: prodotti.json (con confezioni e proteine), reparti.json,
                     ricette.json, blocchi.json (cosa si può scambiare), pasti.json (schema dal risveglio),
                     spesa-base.json, programma.json (giornate e ciclo), esercizi.json (nomi e istruzioni)
  db/
    database.js      archivi di IndexedDB (VERSIONE_STRUTTURA)
    migrazioni.js    formato dei dati (VERSIONE_DATI) e migrazioni
    dati.js          lettura/scrittura immediata, copie di sicurezza automatiche
    backup.js        esporta / importa il file JSON
    catalogo.js      prodotti di base + i miei prodotti/modifiche
    spesa.js         lista aperta, "Spesa fatta", storico, "Ripeti", dispensa finita
    ricette.js       ricette di base + le mie, scambio dei blocchi, cibi esclusi
    piani.js         settimana di ricette, cucinate, settimane tipo
    allenamento.js   programma (+ mie modifiche), ciclo F-L-F-L-F-L-P, sedute guidate, record, statistiche
  lib/pasti.js       schema dei pasti dal risveglio e dal turno, proteine del giorno
  lib/suoni.js       bip a fine timer, schermo acceso durante l'allenamento
  lib/generaSpesa.js dalla settimana alla lista: somma, colazione ×7, confezioni, dispensa, 2 giri
  lib/               date, piccoli strumenti
public/              icone (e in futuro immagini/esercizi/)
```

## Dati: regole d'oro
1. **Ogni modifica si salva subito** in IndexedDB; l'app chiede la memoria persistente.
2. **Mai perdere dati con un aggiornamento.** Se cambia il formato dei dati:
   aumenta `VERSIONE_DATI` in `src/db/migrazioni.js` e aggiungi la migrazione corrispondente.
   Prima di migrare l'app salva da sola una copia di sicurezza (le ultime 5, in Impostazioni → Copie automatiche).
3. Per aggiungere un archivio nuovo: aggiungilo in `ARCHIVI` (`src/db/database.js`) e aumenta `VERSIONE_STRUTTURA`.
4. I contenuti (ricette, prodotti, esercizi) andranno in `src/data/*.json`; le modifiche fatte dall'app
   vengono salvate a parte, così un aggiornamento dei contenuti non cancella le tue.

## Date
L'app usa sempre la **data del calendario**: dopo mezzanotte è già il giorno dopo
(scelta di Alessandro, al posto della "giornata logica" dal risveglio al sonno).
Un giorno segnato con la luna significa "turno la notte che inizia quel giorno alle 23:00".

## Pubblicazione (GitHub Pages)
Il workflow `.github/workflows/pubblica.yml` pubblica l'app a ogni push su `main`.
Su GitHub: Settings → Pages → Source: **GitHub Actions**.
Attenzione: i dati sono legati all'indirizzo dell'app. Se l'indirizzo cambia, esporta un backup
dalla vecchia app e importalo nella nuova.
