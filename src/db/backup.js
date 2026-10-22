// Backup: esportazione e importazione di tutti i dati in un file JSON.
//
// Formato del file:
// { app: "Luna", tipo: "backup", versioneDati: 1, creatoIl: "…", dati: { giorni: [...], ... } }
import { APP_NAME } from '../config.js'
import { dataISO } from '../lib/giornata.js'
import { leggiTutto, ARCHIVI_DATI } from './database.js'
import { VERSIONE_DATI, migra, DatiTroppoNuovi } from './migrazioni.js'
import { scriviMeta, sostituisciDati, riepilogoDati } from './dati.js'

/**
 * Prepara il file di backup in anticipo (prima del tocco su "Salva"),
 * perché su iPhone il pannello Condividi va aperto subito dopo il tocco.
 */
export async function preparaBackup() {
  const dati = await leggiTutto()
  const creatoIl = new Date().toISOString()
  const contenuto = JSON.stringify({ app: APP_NAME, tipo: 'backup', versioneDati: VERSIONE_DATI, creatoIl, dati })
  const nome = `${APP_NAME.toLowerCase()}-backup-${dataISO(new Date())}.json`
  const file = new File([contenuto], nome, { type: 'application/json' })
  return { file, riepilogo: riepilogoDati(dati), dimensione: file.size, creatoIl }
}

/**
 * Salva il file: su iPhone apre il pannello Condividi ("Salva in File", AirDrop, Mail…),
 * altrove lo scarica. Restituisce true se il backup è stato salvato.
 */
export async function salvaBackup({ file, creatoIl }) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name })
    } catch (errore) {
      if (errore.name === 'AbortError') return false // chiuso senza salvare
      throw errore
    }
  } else {
    const url = URL.createObjectURL(file)
    const link = Object.assign(document.createElement('a'), { href: url, download: file.name })
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
  await scriviMeta('ultimoBackup', creatoIl)
  return true
}

/** Legge e controlla un file di backup. Non modifica ancora nulla. */
export async function leggiBackup(file) {
  let contenuto
  try {
    contenuto = JSON.parse(await file.text())
  } catch {
    throw new Error('This file is not a valid backup (it can’t be read).')
  }
  if (contenuto?.tipo !== 'backup' || typeof contenuto.versioneDati !== 'number' || !contenuto.dati) {
    throw new Error(`This file doesn’t look like a ${APP_NAME} backup.`)
  }
  let dati
  try {
    dati = migra(contenuto.dati, contenuto.versioneDati)
  } catch (errore) {
    if (errore instanceof DatiTroppoNuovi) {
      throw new Error('This backup comes from a newer version of the app. Update the app and try again.')
    }
    throw errore
  }
  // Tiene solo gli archivi conosciuti, sempre come elenchi
  const puliti = Object.fromEntries(ARCHIVI_DATI.map((a) => [a, Array.isArray(dati[a]) ? dati[a] : []]))
  return { dati: puliti, creatoIl: contenuto.creatoIl, riepilogo: riepilogoDati(puliti) }
}

/** Sostituisce i dati attuali con quelli del backup (dopo una copia di sicurezza). */
export function importaBackup(backup) {
  return sostituisciDati(backup.dati, 'Before importing a backup')
}

export function formatoDimensione(byte) {
  if (byte < 1024) return `${byte} bytes`
  if (byte < 1024 * 1024) return `${(byte / 1024).toFixed(1)} KB`
  return `${(byte / 1024 / 1024).toFixed(1)} MB`
}
