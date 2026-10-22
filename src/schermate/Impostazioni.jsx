// Impostazioni (dall'icona in alto a destra nella schermata Oggi).
import { useEffect, useState } from 'preact/hooks'
import { Pagina, PulsanteIndietro } from '../components/Pagina.jsx'
import { Sezione, Lista, Riga, MenuValore, Stepper } from '../components/Lista.jsx'
import {
  AlarmClock,
  Moon,
  Beef,
  FileUp,
  FileDown,
  Bell,
  ArchiveRestore,
  HardDrive,
  BookOpen,
  CalendarDays,
  Palette,
  Info,
  Database,
  ShieldCheck,
  ShoppingBasket,
  Archive,
  Ban,
  CookingPot,
  Dumbbell,
} from '../components/icone.js'
import { GestioneEsercizi } from './GestioneEsercizi.jsx'
import { StoricoAllenamenti } from './StoricoAllenamenti.jsx'
import { GestioneRicette } from './GestioneRicette.jsx'
import { CibiEsclusi } from './CibiEsclusi.jsx'
import { StoricoSettimane } from './StoricoSettimane.jsx'
import { Prodotti } from './Prodotti.jsx'
import { StoricoSpese } from './StoricoSpese.jsx'
import { useNav } from '../navigazione.jsx'
import { useDati, aggiornaImpostazioni } from '../db/dati.js'
import { VERSIONE_DATI } from '../db/migrazioni.js'
import { formatoDimensione } from '../db/backup.js'
import { tempoFa } from '../lib/giornata.js'
import { FoglioEsporta, FoglioImporta, FoglioCopie } from './Backup.jsx'
import { AnteprimaStile } from './AnteprimaStile.jsx'

const OGNI_GIORNI = [7, 14, 21, 28].map((g) => ({ valore: g, etichetta: `Every ${g} days` }))

export function Impostazioni() {
  const nav = useNav()
  const { impostazioni, meta, memoriaPersistente } = useDati()
  const [foglio, setFoglio] = useState(null) // "esporta" | "importa" | "copie"
  const [spazio, setSpazio] = useState(null)

  useEffect(() => {
    navigator.storage?.estimate?.().then((s) => setSpazio(s.usage)).catch(() => {})
  }, [foglio])

  const chiudi = () => setFoglio(null)

  return (
    <Pagina titolo="Settings" sinistra={<PulsanteIndietro etichetta="Today" onClick={nav.indietro} />}>
      <Sezione titolo="My day">
        <Lista>
          <Riga
            icona={AlarmClock}
            coloreIcona="var(--orange)"
            titolo="Usual wake-up time"
            destra={
              <input
                type="time"
                class="campo-ora"
                value={impostazioni.risveglio}
                onChange={(e) => e.currentTarget.value && aggiornaImpostazioni({ risveglio: e.currentTarget.value })}
              />
            }
          />
          <Riga
            icona={Moon}
            coloreIcona="var(--indigo)"
            titolo="Work nights a week"
            destra={
              <>
                <span class="riga-valore num">{impostazioni.nottiSettimana}</span>
                <Stepper
                  valore={impostazioni.nottiSettimana}
                  min={0}
                  max={7}
                  onChange={(v) => aggiornaImpostazioni({ nottiSettimana: v })}
                />
              </>
            }
          />
        </Lista>
      </Sezione>

      <Sezione titolo="Goals" piede="To tone up: about 95–120 g of protein a day.">
        <Lista>
          <Riga
            icona={Beef}
            coloreIcona="var(--orange)"
            titolo="Protein"
            destra={
              <>
                <span class="riga-valore num">{impostazioni.obiettivoProteine} g</span>
                <Stepper
                  valore={impostazioni.obiettivoProteine}
                  min={60}
                  max={200}
                  passo={5}
                  onChange={(v) => aggiornaImpostazioni({ obiettivoProteine: v })}
                />
              </>
            }
          />
        </Lista>
      </Sezione>

      <Sezione
        titolo="Backup"
        piede="A backup is a file with all your data. Save it to Files (iCloud Drive is best): if you change phone or Safari clears its data, import it back from here."
      >
        <Lista>
          <Riga
            icona={ShieldCheck}
            coloreIcona="var(--blue)"
            titolo="Last backup"
            valore={meta.ultimoBackup ? tempoFa(meta.ultimoBackup) : 'Never'}
          />
          <Riga icona={FileUp} coloreIcona="var(--blue)" titolo="Export backup" tipo="azione" onClick={() => setFoglio('esporta')} />
          <Riga icona={FileDown} coloreIcona="var(--green)" titolo="Import backup" tipo="azione" onClick={() => setFoglio('importa')} />
          <Riga
            icona={Bell}
            coloreIcona="var(--red)"
            titolo="Reminder"
            destra={
              <MenuValore
                valore={impostazioni.promemoriaBackupGiorni}
                opzioni={OGNI_GIORNI}
                onChange={(v) => aggiornaImpostazioni({ promemoriaBackupGiorni: v })}
              />
            }
          />
        </Lista>
      </Sezione>

      <Sezione
        titolo="Data safety"
        piede="Your data stays on this phone only. With persistent storage on, iOS won’t delete it to free up space."
      >
        <Lista>
          <Riga
            icona={ArchiveRestore}
            coloreIcona="var(--gray)"
            titolo="Automatic copies"
            freccia
            onClick={() => setFoglio('copie')}
          />
          <Riga
            icona={HardDrive}
            coloreIcona="var(--gray)"
            titolo="Persistent storage"
            valore={memoriaPersistente === null ? 'Not available' : memoriaPersistente ? 'On' : 'Off'}
          />
        </Lista>
      </Sezione>

      <Sezione titolo="Content">
        <Lista>
          <Riga icona={BookOpen} coloreIcona="var(--orange)" titolo="Recipes" freccia onClick={() => nav.apri(GestioneRicette)} />
          <Riga icona={Dumbbell} coloreIcona="var(--pink)" titolo="Exercises" freccia onClick={() => nav.apri(GestioneEsercizi)} />
          <Riga
            icona={Ban}
            coloreIcona="var(--red)"
            titolo="Excluded foods"
            valore={String(impostazioni.cibiEsclusi.length)}
            freccia
            onClick={() => nav.apri(CibiEsclusi)}
          />
          <Riga
            icona={ShoppingBasket}
            coloreIcona="var(--green)"
            titolo="Shopping products"
            freccia
            onClick={() => nav.apri(Prodotti)}
          />
        </Lista>
      </Sezione>

      <Sezione titolo="History">
        <Lista>
          <Riga
            icona={Archive}
            coloreIcona="var(--green)"
            titolo="Shopping lists"
            freccia
            onClick={() => nav.apri(StoricoSpese, { indietro: 'Settings' })}
          />
          <Riga icona={CookingPot} coloreIcona="var(--orange)" titolo="Recipe weeks" freccia onClick={() => nav.apri(StoricoSettimane)} />
          <Riga icona={CalendarDays} coloreIcona="var(--pink)" titolo="Workouts" freccia onClick={() => nav.apri(StoricoAllenamenti)} />
        </Lista>
      </Sezione>

      <Sezione titolo="Appearance">
        <Lista>
          <Riga
            icona={Palette}
            coloreIcona="var(--indigo)"
            titolo="Style preview"
            freccia
            onClick={() => nav.apri(AnteprimaStile)}
          />
        </Lista>
      </Sezione>

      <Sezione titolo="About">
        <Lista>
          <Riga icona={Info} coloreIcona="var(--gray)" titolo="App version" valore={__APP_VERSION__} />
          <Riga icona={Database} coloreIcona="var(--gray)" titolo="Data version" valore={String(VERSIONE_DATI)} />
          <Riga
            icona={HardDrive}
            coloreIcona="var(--gray)"
            titolo="Storage used"
            valore={spazio === null ? '—' : formatoDimensione(spazio)}
          />
        </Lista>
      </Sezione>

      <FoglioEsporta aperto={foglio === 'esporta'} onChiudi={chiudi} />
      <FoglioImporta aperto={foglio === 'importa'} onChiudi={chiudi} />
      <FoglioCopie aperto={foglio === 'copie'} onChiudi={chiudi} />
    </Pagina>
  )
}
