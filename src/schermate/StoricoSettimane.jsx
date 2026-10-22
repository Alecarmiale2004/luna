// Impostazioni → Storico → Settimane di ricette: le settimane passate e le ricette più cucinate.
import { Pagina, PulsanteIndietro } from '../components/Pagina.jsx'
import { Sezione, Lista, Riga } from '../components/Lista.jsx'
import { useNav } from '../navigazione.jsx'
import { useDati } from '../db/dati.js'
import { useRicette } from '../db/ricette.js'
import { frequenzeRicette, cucinateDi } from '../db/piani.js'
import { aggiungiGiorni, daISO } from '../lib/giornata.js'

const intervallo = (inizio) => {
  const a = daISO(inizio)
  const b = daISO(aggiungiGiorni(inizio, 6))
  const fmt = (d, mese) => d.toLocaleDateString('it-IT', mese ? { day: 'numeric', month: 'short' } : { day: 'numeric' })
  return `${fmt(a, a.getMonth() !== b.getMonth())} – ${fmt(b, true)} ${b.getFullYear()}`
}

export function StoricoSettimane() {
  const nav = useNav()
  const { piani } = useDati()
  const ricette = useRicette()
  const perId = Object.fromEntries(ricette.map((r) => [r.id, r]))
  const conti = frequenzeRicette(piani)
  const preferite = Object.entries(conti).sort((a, b) => b[1] - a[1])
  const settimane = piani.filter((p) => p.voci.length).sort((a, b) => b.inizio.localeCompare(a.inizio))

  return (
    <Pagina titolo="Settimane" sinistra={<PulsanteIndietro etichetta="Impostazioni" onClick={nav.indietro} />}>
      {preferite.length > 0 && (
        <Sezione titolo="Le ricette che cucini di più">
          <Lista>
            {preferite.map(([id, n]) => (
              <Riga key={id} titolo={perId[id]?.nome || 'Ricetta eliminata'} valore={`${n} ${n === 1 ? 'volta' : 'volte'}`} />
            ))}
          </Lista>
        </Sezione>
      )}
      {settimane.length === 0 && (
        <p class="t-body c-label-2" style={{ padding: '24px 32px', textAlign: 'center' }}>
          Qui compariranno le settimane di ricette pianificate nella sezione Cibo.
        </p>
      )}
      {settimane.length > 0 && (
        <Sezione titolo="Settimane pianificate">
          <Lista>
            {settimane.map((p) => {
              const sessioni = p.voci.reduce((t, v) => t + v.volte, 0)
              const fatte = p.voci.reduce((t, v) => t + Math.min(cucinateDi(p, v.id), v.volte), 0)
              return (
                <Riga
                  key={p.id}
                  titolo={intervallo(p.inizio)}
                  sottotitolo={p.voci.map((v) => `${perId[v.ricetta]?.nome || 'Ricetta'}${v.volte > 1 ? ` ×${v.volte}` : ''}`).join(', ')}
                  valore={`${fatte}/${sessioni}`}
                />
              )
            })}
          </Lista>
        </Sezione>
      )}
    </Pagina>
  )
}
