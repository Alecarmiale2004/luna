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
        mostraMessaggio('Backup saved')
        onChiudi()
      }
    } catch (errore) {
      console.error(errore)
      mostraMessaggio('Couldn’t save the backup', { errore: true })
    } finally {
      setOccupato(false)
    }
  }

  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo="Export backup">
      <div class="tint-blue">
        <IconaGrande icona={FileUp} colore="var(--blue)" />
        <p class="foglio-spiegazione">
          All your data in a single file. Tap <strong>Save backup</strong> and choose <strong>Save to Files</strong>
          {' '}(iCloud Drive is best).
        </p>
        <Sezione>
          <Lista>
            <Riga titolo="File" valore={backup ? backup.file.name : '…'} />
            <Riga titolo="Contents" sottotitolo={backup ? backup.riepilogo : 'Preparing the file…'} />
            <Riga titolo="Size" valore={backup ? formatoDimensione(backup.dimensione) : '…'} />
          </Lista>
        </Sezione>
        <div class="foglio-azioni">
          <button class="pulsante pieno" disabled={!backup || occupato} onClick={salva}>
            Save backup
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
      mostraMessaggio('Backup imported')
      onChiudi()
    } catch (err) {
      console.error(err)
      setErrore('Import failed: your data has not been changed.')
    } finally {
      setOccupato(false)
    }
  }

  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo="Import backup">
      <div class="tint-blue">
        <IconaGrande icona={FileDown} colore="var(--green)" />
        <p class="foglio-spiegazione">
          Choose a backup file you saved earlier. You’ll see what’s in it before your data is replaced.
        </p>

        <input ref={campoFile} type="file" accept=".json,application/json" class="sr-only" onChange={scegli} tabIndex={-1} />

        {!backup && (
          <div class="foglio-azioni">
            <button class="pulsante tinta" onClick={() => campoFile.current.click()}>
              Choose backup file
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
              titolo="Backup contents"
              piede="Your current data will be replaced by the backup. A safety copy is saved first, and you can restore it from Settings."
            >
              <Lista>
                <Riga titolo="Created" valore={backup.creatoIl ? formatoMomento(backup.creatoIl) : '—'} />
                <Riga titolo="Contents" sottotitolo={backup.riepilogo} />
              </Lista>
            </Sezione>
            <div class="foglio-azioni">
              <button class="pulsante distruttivo" disabled={occupato} onClick={importa}>
                Replace my data
              </button>
              <button class="pulsante grigio" disabled={occupato} onClick={() => campoFile.current.click()}>
                Choose another file
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
      titolo: 'Restore this copy?',
      testo: `Your current data will be replaced with the copy from ${formatoMomento(copia.id)}. A safety copy is saved first.`,
      conferma: 'Restore',
      distruttiva: true,
    })
    if (!ok) return
    try {
      await ripristinaCopia(copia.id)
      mostraMessaggio('Copy restored')
      onChiudi()
    } catch (err) {
      console.error(err)
      mostraMessaggio('Restore failed', { errore: true })
    }
  }

  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo="Automatic copies" grande>
      <IconaGrande icona={ArchiveRestore} colore="var(--gray)" />
      <p class="foglio-spiegazione">
        Before every data update, import or restore, the app saves a copy by itself. The last 5 are kept,
        on this phone only.
      </p>
      <Sezione>
        <Lista>
          {copie === null && <Riga titolo="Loading…" />}
          {copie?.length === 0 && <Riga titolo="No copies yet" sottotitolo="One will appear here the first time it’s needed." />}
          {copie?.map((c) => (
            <Riga
              key={c.id}
              titolo={formatoMomento(c.id)}
              sottotitolo={`${c.motivo} · ${c.riepilogo}`}
              destra={<span class="riga-valore" style={{ color: 'var(--blue)' }}>Restore</span>}
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
