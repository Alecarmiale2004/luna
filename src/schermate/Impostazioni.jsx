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
} from '../components/icone.js'
import { useNav } from '../navigazione.jsx'
import { useDati, aggiornaImpostazioni } from '../db/dati.js'
import { VERSIONE_DATI } from '../db/migrazioni.js'
import { formatoDimensione } from '../db/backup.js'
import { tempoFa } from '../lib/giornata.js'
import { FoglioEsporta, FoglioImporta, FoglioCopie } from './Backup.jsx'
import { AnteprimaStile } from './AnteprimaStile.jsx'

const OGNI_GIORNI = [7, 14, 21, 28].map((g) => ({ valore: g, etichetta: `Ogni ${g} giorni` }))

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
    <Pagina titolo="Impostazioni" sinistra={<PulsanteIndietro etichetta="Oggi" onClick={nav.indietro} />}>
      <Sezione titolo="La mia giornata">
        <Lista>
          <Riga
            icona={AlarmClock}
            coloreIcona="var(--orange)"
            titolo="Risveglio abituale"
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
            titolo="Notti a settimana"
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

      <Sezione titolo="Obiettivi" piede="Per tonificarti: circa 95–120 g di proteine al giorno.">
        <Lista>
          <Riga
            icona={Beef}
            coloreIcona="var(--orange)"
            titolo="Proteine al giorno"
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
        piede="Il backup è un file con tutti i tuoi dati. Salvalo in File (meglio su iCloud Drive): se cambi telefono o Safari cancella i dati, lo reimporti da qui."
      >
        <Lista>
          <Riga
            icona={ShieldCheck}
            coloreIcona="var(--blue)"
            titolo="Ultimo backup"
            valore={meta.ultimoBackup ? tempoFa(meta.ultimoBackup) : 'Mai'}
          />
          <Riga icona={FileUp} coloreIcona="var(--blue)" titolo="Esporta backup" tipo="azione" onClick={() => setFoglio('esporta')} />
          <Riga icona={FileDown} coloreIcona="var(--green)" titolo="Importa backup" tipo="azione" onClick={() => setFoglio('importa')} />
          <Riga
            icona={Bell}
            coloreIcona="var(--red)"
            titolo="Promemoria"
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
        titolo="Sicurezza dei dati"
        piede="I dati restano solo su questo telefono. Con la memoria persistente attiva, iOS non li cancella per fare spazio."
      >
        <Lista>
          <Riga
            icona={ArchiveRestore}
            coloreIcona="var(--gray)"
            titolo="Copie automatiche"
            freccia
            onClick={() => setFoglio('copie')}
          />
          <Riga
            icona={HardDrive}
            coloreIcona="var(--gray)"
            titolo="Memoria persistente"
            valore={memoriaPersistente === null ? 'Non disponibile' : memoriaPersistente ? 'Attiva' : 'Non attiva'}
          />
        </Lista>
      </Sezione>

      <Sezione titolo="Contenuti" piede="Ricette, prodotti, esercizi e storico arriveranno con le prossime fasi.">
        <Lista>
          <Riga icona={BookOpen} coloreIcona="var(--orange)" titolo="Gestisci contenuti" valore="Presto" disattivata />
          <Riga icona={CalendarDays} coloreIcona="var(--pink)" titolo="Storico" valore="Presto" disattivata />
        </Lista>
      </Sezione>

      <Sezione titolo="Aspetto">
        <Lista>
          <Riga
            icona={Palette}
            coloreIcona="var(--indigo)"
            titolo="Anteprima dello stile"
            freccia
            onClick={() => nav.apri(AnteprimaStile)}
          />
        </Lista>
      </Sezione>

      <Sezione titolo="Informazioni">
        <Lista>
          <Riga icona={Info} coloreIcona="var(--gray)" titolo="Versione dell’app" valore={__APP_VERSION__} />
          <Riga icona={Database} coloreIcona="var(--gray)" titolo="Versione dei dati" valore={String(VERSIONE_DATI)} />
          <Riga
            icona={HardDrive}
            coloreIcona="var(--gray)"
            titolo="Spazio usato"
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
