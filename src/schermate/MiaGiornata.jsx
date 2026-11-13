// Impostazioni → La mia giornata: orari di lavoro della settimana e blocchi della giornata tipo.
import { useRef, useState } from 'preact/hooks'
import { Pagina, PulsanteIndietro } from '../components/Pagina.jsx'
import { Sezione, Lista, Riga, MenuValore } from '../components/Lista.jsx'
import { Foglio } from '../components/Foglio.jsx'
import { chiediConferma, mostraMessaggio } from '../components/Avvisi.jsx'
import { Plus } from '../components/icone.js'
import { useNav } from '../navigazione.jsx'
import { useDati, aggiornaImpostazioni } from '../db/dati.js'
import { INIZI_LAVORO } from '../db/giorno.js'
import { BLOCCHI_PREDEFINITI } from '../config.js'
import { nuovoId } from '../lib/id.js'

const GIORNI = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const FINE = [
  { valore: '', etichetta: 'Day off' },
  ...['19:00', '20:00', '21:00', '22:00', '23:00'].map((ora) => ({ valore: ora, etichetta: `Until ${ora}` })),
]
const INIZIO = INIZI_LAVORO.map((ora) => ({ valore: ora, etichetta: ora }))
const QUANDO = [
  { valore: 'sempre', etichetta: 'Every day' },
  { valore: 'lavoro', etichetta: 'Work days' },
  { valore: 'libero', etichetta: 'Days off' },
]
const etichettaQuando = (q) => QUANDO.find((x) => x.valore === q)?.etichetta

// ---------------------------------------------------------------------------
// Orari di lavoro
// ---------------------------------------------------------------------------

export function OrariLavoro() {
  const nav = useNav()
  const { impostazioni } = useDati()
  const lavoro = impostazioni.lavoro

  const cambia = (i, orario) => aggiornaImpostazioni({ lavoro: lavoro.map((o, j) => (j === i ? orario : o)) })

  return (
    <Pagina titolo="Work days" sinistra={<PulsanteIndietro etichetta="Settings" onClick={nav.indietro} />}>
      <Sezione
        titolo="Usual week"
        piede="On the Today screen you can still switch a single day between work and day off, and change the start time."
      >
        <Lista>
          {GIORNI.map((nome, i) => {
            const o = lavoro[i]
            return (
              <Riga
                key={nome}
                titolo={nome}
                sottotitolo={o ? `${o.inizio} – ${o.fine}` : 'Day off'}
                destra={
                  <span style={{ display: 'flex', gap: 12 }}>
                    {o && <MenuValore valore={o.inizio} opzioni={INIZIO} onChange={(inizio) => cambia(i, { ...o, inizio })} />}
                    <MenuValore
                      valore={o?.fine || ''}
                      opzioni={FINE}
                      onChange={(fine) => cambia(i, fine ? { inizio: o?.inizio || INIZI_LAVORO[0], fine } : null)}
                    />
                  </span>
                }
              />
            )
          })}
        </Lista>
      </Sezione>
    </Pagina>
  )
}

// ---------------------------------------------------------------------------
// Giornata tipo
// ---------------------------------------------------------------------------

export function GiornataTipo() {
  const nav = useNav()
  const { impostazioni } = useDati()
  const [aperto, setAperto] = useState(null) // id del blocco, "nuovo" o null
  const blocchi = [...impostazioni.blocchi].sort((a, b) => a.ora.localeCompare(b.ora))

  const ripristina = async () => {
    const ok = await chiediConferma({
      titolo: 'Restore the default day?',
      testo: 'Your blocks go back to the original plan. What you’ve ticked off stays saved.',
      conferma: 'Restore',
      distruttiva: true,
    })
    if (ok) {
      aggiornaImpostazioni({ blocchi: BLOCCHI_PREDEFINITI })
      mostraMessaggio('Day plan restored')
    }
  }

  return (
    <Pagina titolo="My day" sinistra={<PulsanteIndietro etichetta="Settings" onClick={nav.indietro} />}>
      <Sezione titolo="Blocks" piede="Work is added by itself from your work days. Tap a block to change it.">
        <Lista>
          {blocchi.map((b) => (
            <Riga
              key={b.id}
              titolo={b.nome}
              sottotitolo={[b.quando !== 'sempre' && etichettaQuando(b.quando), b.nota].filter(Boolean).join(' · ')}
              valore={b.ora}
              freccia
              onClick={() => setAperto(b.id)}
            />
          ))}
          <Riga icona={Plus} coloreIcona="var(--blue)" titolo="Add a block" tipo="azione" onClick={() => setAperto('nuovo')} />
        </Lista>
      </Sezione>
      <Sezione>
        <Lista>
          <Riga titolo="Restore the default day" tipo="distruttiva" onClick={ripristina} />
        </Lista>
      </Sezione>
      <FoglioBlocco id={aperto} onChiudi={() => setAperto(null)} />
    </Pagina>
  )
}

const NUOVO = { nome: '', ora: '12:00', nota: '', quando: 'sempre' }

function FoglioBlocco({ id, onChiudi }) {
  const { impostazioni } = useDati()
  const ultimo = useRef(id)
  if (id) ultimo.current = id
  const mostrato = id || ultimo.current
  const nuovo = mostrato === 'nuovo'
  const esistente = impostazioni.blocchi.find((b) => b.id === mostrato)
  const [bozza, setBozza] = useState(NUOVO)
  const blocco = nuovo ? bozza : esistente

  const cambia = (modifiche) => {
    if (nuovo) return setBozza({ ...bozza, ...modifiche })
    aggiornaImpostazioni({ blocchi: impostazioni.blocchi.map((b) => (b.id === mostrato ? { ...b, ...modifiche } : b)) })
  }

  const aggiungi = () => {
    aggiornaImpostazioni({ blocchi: [...impostazioni.blocchi, { ...bozza, nome: bozza.nome.trim(), id: nuovoId() }] })
    setBozza(NUOVO)
    mostraMessaggio('Block added')
    onChiudi()
  }

  const togli = async () => {
    const ok = await chiediConferma({
      titolo: `Delete “${blocco.nome}”?`,
      testo: blocco.azione ? 'It’s linked to a section of the app: you can bring it back with “Restore the default day”.' : '',
      conferma: 'Delete',
      distruttiva: true,
    })
    if (!ok) return
    onChiudi()
    aggiornaImpostazioni({ blocchi: impostazioni.blocchi.filter((b) => b.id !== mostrato) })
  }

  return (
    <Foglio aperto={!!id} onChiudi={onChiudi} titolo={nuovo ? 'New block' : blocco?.nome || ''}>
      {blocco && (
        <div class="tint-oggi">
          <Sezione>
            <Lista>
              <Riga
                titolo="Name"
                destra={<input class="riga-campo" value={blocco.nome} placeholder="required" onInput={(e) => cambia({ nome: e.currentTarget.value })} />}
              />
              <Riga
                titolo="Time"
                destra={
                  <input
                    type="time"
                    class="campo-ora"
                    value={blocco.ora}
                    onChange={(e) => e.currentTarget.value && cambia({ ora: e.currentTarget.value })}
                  />
                }
              />
              <Riga
                titolo="Note"
                destra={<input class="riga-campo" value={blocco.nota || ''} placeholder="optional" onInput={(e) => cambia({ nota: e.currentTarget.value })} />}
              />
              <Riga titolo="Days" destra={<MenuValore valore={blocco.quando} opzioni={QUANDO} onChange={(quando) => cambia({ quando })} />} />
            </Lista>
          </Sezione>
          <div class="foglio-azioni">
            {nuovo ? (
              <button class="pulsante pieno" disabled={!bozza.nome.trim()} onClick={aggiungi}>
                Add block
              </button>
            ) : (
              <button class="pulsante grigio" style={{ color: 'var(--red)' }} onClick={togli}>
                Delete block
              </button>
            )}
          </div>
        </div>
      )}
    </Foglio>
  )
}
