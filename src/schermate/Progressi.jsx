// Progressi: record personali e grafico di ogni esercizio (settimane, mesi, da sempre).
import { useState } from 'preact/hooks'
import { Pagina, PulsanteIndietro } from '../components/Pagina.jsx'
import { Card } from '../components/Card.jsx'
import { Sezione, Lista, Riga } from '../components/Lista.jsx'
import { GraficoLinea, Segmenti } from '../components/Grafico.jsx'
import { useNav } from '../navigazione.jsx'
import { useDati } from '../db/dati.js'
import { eserciziMisurati, esercizio, storicoEsercizio, record, giornata, immagineEsercizio } from '../db/allenamento.js'
import { useOggi, aggiungiGiorni, daISO, formatoBreve } from '../lib/giornata.js'
import './allenamento.css'

const breve = (iso) => daISO(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export function Progressi() {
  const nav = useNav()
  const { sedute } = useDati()
  const ids = eserciziMisurati()
  const conDati = ids.filter((id) => storicoEsercizio(sedute, id).length)

  return (
    <Pagina titolo="Progress" sinistra={<PulsanteIndietro etichetta="Training" onClick={nav.indietro} />}>
      <div class="tint-forte">
        {conDati.length === 0 && (
          <p class="t-body c-label-2" style={{ padding: '16px 32px', textAlign: 'center' }}>
            After your first Strength day you’ll see charts and records for every exercise here.
          </p>
        )}
        <Sezione titolo="Personal records" piede="A record is your best set ever. Tap an exercise to see its chart.">
          <Lista>
            {ids.map((id) => {
              const r = record(sedute, id)
              return (
                <Riga
                  key={id}
                  titolo={esercizio(id).nome}
                  sottotitolo={r ? `on ${formatoBreve(r.data)}` : 'No data yet'}
                  valore={r ? `${r.valore}${r.unita ? ' s' : ''}` : '—'}
                  freccia
                  onClick={() => nav.apri(DettaglioEsercizio, { id })}
                />
              )
            })}
          </Lista>
        </Sezione>
      </div>
    </Pagina>
  )
}

const PERIODI = [
  { valore: 28, etichetta: '4 weeks' },
  { valore: 183, etichetta: '6 months' },
  { valore: 0, etichetta: 'All time' },
]

function DettaglioEsercizio({ id }) {
  const nav = useNav()
  const { sedute } = useDati()
  const oggi = useOggi()
  const [periodo, setPeriodo] = useState(183)
  const e = esercizio(id)
  const tutto = storicoEsercizio(sedute, id)
  const da = periodo ? aggiungiGiorni(oggi, -periodo) : ''
  const punti = tutto.filter((x) => x.data >= da)
  const unita = punti[0]?.unita || tutto[0]?.unita || ''
  const migliore = punti.length ? punti.reduce((m, x, i) => (x.valore > punti[m].valore ? i : m), 0) : null
  const voce = giornata('forte').blocchi.flatMap((b) => b.voci).find((v) => v.esercizio === id)

  return (
    <Pagina titolo={e.nome} titoloBarra="Progress" sinistra={<PulsanteIndietro etichetta="Progress" onClick={nav.indietro} />}>
      <div class="tint-forte">
        <div class="sezione">
          <Segmenti opzioni={PERIODI} valore={periodo} onChange={setPeriodo} />
          <Card>
            {punti.length ? (
              <GraficoLinea
                etichetta={`${e.nome}: best set per workout`}
                unita={unita}
                record={migliore}
                punti={punti.map((x) => ({
                  etichetta: breve(x.data),
                  valore: x.valore,
                  dettaglio: `${formatoBreve(x.data)} · best ${x.valore}${unita ? ' s' : ''} · sets: ${x.serie.join(', ')}`,
                }))}
              />
            ) : (
              <p class="t-body c-label-2" style={{ textAlign: 'center', padding: '24px 0' }}>
                No data in this period.
              </p>
            )}
          </Card>
          <p class="sezione-piede">Each point is your best set in a workout{unita ? ', in seconds' : ', in reps'}.</p>
        </div>

        {voce?.progressione && (
          <Sezione titolo="When it gets easy">
            <p class="testo-card">{voce.progressione}</p>
          </Sezione>
        )}

        <Sezione titolo="How to do it">
          <Card>
            <img src={immagineEsercizio(id)} alt="" style={{ width: '100%', display: 'block' }} />
            <ul class="guidato-istruzioni" style={{ marginTop: 10 }}>
              {e.istruzioni.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </Card>
        </Sezione>

        {tutto.length > 0 && (
          <Sezione titolo="All workouts">
            <Lista>
              {[...tutto].reverse().map((x) => (
                <Riga key={x.id} titolo={formatoBreve(x.data)} sottotitolo={`Sets: ${x.serie.join(' · ')}`} valore={`${x.valore}${unita ? ' s' : ''}`} />
              ))}
            </Lista>
          </Sezione>
        )}
      </div>
    </Pagina>
  )
}
