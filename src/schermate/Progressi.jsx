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

const breve = (iso) => daISO(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })

export function Progressi() {
  const nav = useNav()
  const { sedute } = useDati()
  const ids = eserciziMisurati()
  const conDati = ids.filter((id) => storicoEsercizio(sedute, id).length)

  return (
    <Pagina titolo="Progressi" sinistra={<PulsanteIndietro etichetta="Allenamento" onClick={nav.indietro} />}>
      <div class="tint-forte">
        {conDati.length === 0 && (
          <p class="t-body c-label-2" style={{ padding: '16px 32px', textAlign: 'center' }}>
            Dopo la prima giornata Forte qui vedrai i grafici e i record di ogni esercizio.
          </p>
        )}
        <Sezione titolo="Record personali" piede="Il record è la serie migliore di sempre. Tocca un esercizio per il grafico.">
          <Lista>
            {ids.map((id) => {
              const r = record(sedute, id)
              return (
                <Riga
                  key={id}
                  titolo={esercizio(id).nome}
                  sottotitolo={r ? `il ${formatoBreve(r.data)}` : 'Ancora nessun dato'}
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
  { valore: 28, etichetta: '4 settimane' },
  { valore: 183, etichetta: '6 mesi' },
  { valore: 0, etichetta: 'Da sempre' },
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
    <Pagina titolo={e.nome} titoloBarra="Progressi" sinistra={<PulsanteIndietro etichetta="Progressi" onClick={nav.indietro} />}>
      <div class="tint-forte">
        <div class="sezione">
          <Segmenti opzioni={PERIODI} valore={periodo} onChange={setPeriodo} />
          <Card>
            {punti.length ? (
              <GraficoLinea
                etichetta={`${e.nome}: serie migliore per seduta`}
                unita={unita}
                record={migliore}
                punti={punti.map((x) => ({
                  etichetta: breve(x.data),
                  valore: x.valore,
                  dettaglio: `${formatoBreve(x.data)} · migliore ${x.valore}${unita ? ' s' : ''} · serie: ${x.serie.join(', ')}`,
                }))}
              />
            ) : (
              <p class="t-body c-label-2" style={{ textAlign: 'center', padding: '24px 0' }}>
                Nessun dato in questo periodo.
              </p>
            )}
          </Card>
          <p class="sezione-piede">Ogni punto è la tua serie migliore in una seduta{unita ? ', in secondi' : ', in ripetizioni'}.</p>
        </div>

        {voce?.progressione && (
          <Sezione titolo="Quando diventa facile">
            <p class="testo-card">{voce.progressione}</p>
          </Sezione>
        )}

        <Sezione titolo="Come si fa">
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
          <Sezione titolo="Tutte le sedute">
            <Lista>
              {[...tutto].reverse().map((x) => (
                <Riga key={x.id} titolo={formatoBreve(x.data)} sottotitolo={`Serie: ${x.serie.join(' · ')}`} valore={`${x.valore}${unita ? ' s' : ''}`} />
              ))}
            </Lista>
          </Sezione>
        )}
      </div>
    </Pagina>
  )
}
