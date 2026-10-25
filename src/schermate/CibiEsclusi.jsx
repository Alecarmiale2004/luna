// Impostazioni → Cibi esclusi: mai suggeriti negli scambi; le ricette che li contengono vengono segnalate.
import { useState } from 'preact/hooks'
import { Pagina, PulsanteIndietro } from '../components/Pagina.jsx'
import { Sezione, Lista, Riga } from '../components/Lista.jsx'
import { CircleMinus } from '../components/icone.js'
import { useNav } from '../navigazione.jsx'
import { useDati, aggiornaImpostazioni } from '../db/dati.js'
import { normalizza } from '../db/catalogo.js'
import { vibra } from '../lib/tocco.js'

export function CibiEsclusi() {
  const nav = useNav()
  const { impostazioni } = useDati()
  const esclusi = impostazioni.cibiEsclusi
  const [nuovo, setNuovo] = useState('')

  const aggiungi = () => {
    const testo = nuovo.trim()
    if (!testo || esclusi.some((e) => normalizza(e) === normalizza(testo))) return setNuovo('')
    aggiornaImpostazioni({ cibiEsclusi: [...esclusi, testo.charAt(0).toUpperCase() + testo.slice(1)] })
    setNuovo('')
  }

  return (
    <Pagina titolo="Excluded foods" sinistra={<PulsanteIndietro etichetta="Settings" onClick={nav.indietro} />}>
      <Sezione piede="They’re never suggested as swaps; recipes that contain them are flagged in red.">
        <Lista>
          {esclusi.map((e) => (
            <Riga
              key={e}
              titolo={e}
              destra={
                <button
                  class="nav-pulsante"
                  aria-label={`Remove ${e}`}
                  style={{ color: 'var(--red)', marginRight: -10 }}
                  onClick={() => {
                    vibra()
                    aggiornaImpostazioni({ cibiEsclusi: esclusi.filter((x) => x !== e) })
                  }}
                >
                  <CircleMinus size={22} fill="var(--red)" color="#fff" />
                </button>
              }
            />
          ))}
        </Lista>
      </Sezione>
      <Sezione titolo="Add">
        <Lista>
          <Riga
            titolo={
              <input
                class="riga-campo sinistra"
                placeholder="e.g. Aubergine"
                value={nuovo}
                enterKeyHint="done"
                onInput={(e) => setNuovo(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Enter' && aggiungi()}
              />
            }
            destra={
              <button class="pulsante piccolo tinta tint-blue" disabled={!nuovo.trim()} onClick={aggiungi}>
                Add
              </button>
            }
          />
        </Lista>
      </Sezione>
    </Pagina>
  )
}
