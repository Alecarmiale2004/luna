// Fogli dal basso per il backup: esporta, importa, copie di sicurezza automatiche.
import { useEffect, useRef, useState } from 'preact/hooks'
import { Foglio } from '../components/Foglio.jsx'
import { Sezione, Lista, Riga } from '../components/Lista.jsx'
import { mostraMessaggio, chiediConferma } from '../components/Avvisi.jsx'
import { FileUp, FileDown, ArchiveRestore, CircleAlert } from '../components/icone.js'
import { preparaBackup, salvaBackup, leggiBackup, importaBackup, formatoDimensione } from '../db/backup.js'
import { elencoCopie, ripristinaCopia } from '../db/dati.js'
import { formatoMomento } from '../lib/giornata.js'

// ---------------------------------------------------------------------------
// Esporta
// ---------------------------------------------------------------------------

export function FoglioEsporta({ aperto, onChiudi }) {
  const [backup, setBackup] = useState(null)
  const [occupato, setOccupato] = useState(false)

  // Il file si prepara all'apertura: così il tocco su "Salva" apre subito il pannello Condividi
  useEffect(() => {
    if (!aperto) return
    setBackup(null)
    preparaBackup().then(setBackup)
  }, [aperto])

  const salva = async () => {
    setOccupato(true)
    try {
      if (await salvaBackup(backup)) {
        mostraMessaggio('Backup salvato')
        onChiudi()
      }
    } catch (errore) {
      console.error(errore)
      mostraMessaggio('Non sono riuscito a salvare il backup', { errore: true })
    } finally {
      setOccupato(false)
    }
  }

  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo="Esporta backup">
      <div class="tint-blue">
        <IconaGrande icona={FileUp} colore="var(--blue)" />
        <p class="foglio-spiegazione">
          Tutti i tuoi dati in un unico file. Tocca <strong>Salva backup</strong> e scegli <strong>Salva in File</strong>
          {' '}(meglio su iCloud Drive).
        </p>
        <Sezione>
          <Lista>
            <Riga titolo="File" valore={backup ? backup.file.name : '…'} />
            <Riga titolo="Contenuto" sottotitolo={backup ? backup.riepilogo : 'Preparo il file…'} />
            <Riga titolo="Dimensione" valore={backup ? formatoDimensione(backup.dimensione) : '…'} />
          </Lista>
        </Sezione>
        <div class="foglio-azioni">
          <button class="pulsante pieno" disabled={!backup || occupato} onClick={salva}>
            Salva backup
          </button>
        </div>
      </div>
    </Foglio>
  )
}

// ---------------------------------------------------------------------------
// Importa
// ---------------------------------------------------------------------------

export function FoglioImporta({ aperto, onChiudi }) {
  const [backup, setBackup] = useState(null)
  const [errore, setErrore] = useState(null)
  const [occupato, setOccupato] = useState(false)
  const campoFile = useRef(null)

  useEffect(() => {
    if (aperto) {
      setBackup(null)
      setErrore(null)
    }
  }, [aperto])

  const scegli = async (e) => {
    const file = e.currentTarget.files?.[0]
    e.currentTarget.value = ''
    if (!file) return
    setErrore(null)
    try {
      setBackup(await leggiBackup(file))
    } catch (err) {
      setBackup(null)
      setErrore(err.message)
    }
  }

  const importa = async () => {
    setOccupato(true)
    try {
      await importaBackup(backup)
      mostraMessaggio('Backup importato')
      onChiudi()
    } catch (err) {
      console.error(err)
      setErrore('Importazione non riuscita: i tuoi dati non sono stati modificati.')
    } finally {
      setOccupato(false)
    }
  }

  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo="Importa backup">
      <div class="tint-blue">
        <IconaGrande icona={FileDown} colore="var(--green)" />
        <p class="foglio-spiegazione">
          Scegli un file di backup salvato in precedenza. Prima di sostituire i dati, ne vedrai il contenuto.
        </p>

        <input ref={campoFile} type="file" accept=".json,application/json" class="sr-only" onChange={scegli} tabIndex={-1} />

        {!backup && (
          <div class="foglio-azioni">
            <button class="pulsante tinta" onClick={() => campoFile.current.click()}>
              Scegli file di backup
            </button>
          </div>
        )}

        {errore && (
          <p class="foglio-errore">
            <CircleAlert size={18} strokeWidth={2.4} />
            {errore}
          </p>
        )}

        {backup && (
          <>
            <Sezione
              titolo="Contenuto del backup"
              piede="I dati attuali verranno sostituiti da quelli del backup. Prima ne salvo da solo una copia di sicurezza, che puoi ripristinare dalle Impostazioni."
            >
              <Lista>
                <Riga titolo="Creato il" valore={backup.creatoIl ? formatoMomento(backup.creatoIl) : '—'} />
                <Riga titolo="Contenuto" sottotitolo={backup.riepilogo} />
              </Lista>
            </Sezione>
            <div class="foglio-azioni">
              <button class="pulsante distruttivo" disabled={occupato} onClick={importa}>
                Sostituisci i miei dati
              </button>
              <button class="pulsante grigio" disabled={occupato} onClick={() => campoFile.current.click()}>
                Scegli un altro file
              </button>
            </div>
          </>
        )}
      </div>
    </Foglio>
  )
}

// ---------------------------------------------------------------------------
// Copie di sicurezza automatiche
// ---------------------------------------------------------------------------

export function FoglioCopie({ aperto, onChiudi }) {
  const [copie, setCopie] = useState(null)

  useEffect(() => {
    if (aperto) elencoCopie().then(setCopie)
  }, [aperto])

  const ripristina = async (copia) => {
    const ok = await chiediConferma({
      titolo: 'Ripristinare questa copia?',
      testo: `I dati attuali verranno sostituiti con la copia del ${formatoMomento(copia.id)}. Prima ne salvo una copia di sicurezza.`,
      conferma: 'Ripristina',
      distruttiva: true,
    })
    if (!ok) return
    try {
      await ripristinaCopia(copia.id)
      mostraMessaggio('Copia ripristinata')
      onChiudi()
    } catch (err) {
      console.error(err)
      mostraMessaggio('Ripristino non riuscito', { errore: true })
    }
  }

  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo="Copie automatiche" grande>
      <IconaGrande icona={ArchiveRestore} colore="var(--gray)" />
      <p class="foglio-spiegazione">
        Prima di ogni aggiornamento dei dati, importazione o ripristino, l’app salva da sola una copia. Restano le
        ultime 5, solo su questo telefono.
      </p>
      <Sezione>
        <Lista>
          {copie === null && <Riga titolo="Caricamento…" />}
          {copie?.length === 0 && <Riga titolo="Nessuna copia per ora" sottotitolo="Comparirà qui la prima volta che serve." />}
          {copie?.map((c) => (
            <Riga
              key={c.id}
              titolo={formatoMomento(c.id)}
              sottotitolo={`${c.motivo} · ${c.riepilogo}`}
              destra={<span class="riga-valore" style={{ color: 'var(--blue)' }}>Ripristina</span>}
              onClick={() => ripristina(c)}
            />
          ))}
        </Lista>
      </Sezione>
    </Foglio>
  )
}

function IconaGrande({ icona: Icona, colore }) {
  return (
    <div class="foglio-icona" style={{ background: colore }}>
      <Icona size={30} strokeWidth={2.2} />
    </div>
  )
}
