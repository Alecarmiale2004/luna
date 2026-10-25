// Storico delle spese fatte: elenco per mese e dettaglio, con "Repeat this shop".
import { Pagina, PulsanteIndietro } from '../components/Pagina.jsx'
import { Card } from '../components/Card.jsx'
import { Sezione, Lista, Riga } from '../components/Lista.jsx'
import { mostraMessaggio } from '../components/Avvisi.jsx'
import { RotateCcw } from '../components/icone.js'
import { useNav } from '../navigazione.jsx'
import { useSpesa, ripeti } from '../db/spesa.js'
import { REPARTI, reparto as trovaReparto, useCatalogo } from '../db/catalogo.js'
import { daISO, formatoGiorno, formatoMomento } from '../lib/giornata.js'
import './spesa.css'

const meseDi = (iso) => daISO(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
const maiuscola = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export function StoricoSpese({ indietro = 'Back' }) {
  const nav = useNav()
  const { fatte } = useSpesa()

  // Raggruppa per mese, mantenendo l'ordine dalla più recente
  const mesi = []
  for (const s of fatte) {
    const mese = meseDi(s.data)
    if (mesi.at(-1)?.mese !== mese) mesi.push({ mese, spese: [] })
    mesi.at(-1).spese.push(s)
  }

  return (
    <Pagina titolo="Shopping history" sinistra={<PulsanteIndietro etichetta={indietro} onClick={nav.indietro} />}>
      {fatte.length === 0 && (
        <p class="t-body c-label-2" style={{ padding: '24px 32px', textAlign: 'center' }}>
          Lists archived with “Done shopping” will appear here.
        </p>
      )}
      {mesi.map(({ mese, spese }) => (
        <Sezione key={mese} titolo={mese}>
          <Lista>
            {spese.map((s) => {
              const presi = s.voci.filter((v) => v.spuntato).length
              return (
                <Riga
                  key={s.id}
                  titolo={maiuscola(formatoGiorno(s.data))}
                  sottotitolo={`${presi} ${presi === 1 ? 'item' : 'items'}${presi < s.voci.length ? ` · ${s.voci.length - presi} not bought` : ''}`}
                  freccia
                  onClick={() => nav.apri(DettaglioSpesa, { id: s.id })}
                />
              )
            })}
          </Lista>
        </Sezione>
      ))}
    </Pagina>
  )
}

function DettaglioSpesa({ id }) {
  const nav = useNav()
  const { fatte } = useSpesa()
  // Nomi aggiornati dal catalogo (in inglese), altrimenti quelli salvati nella spesa
  const perId = Object.fromEntries(useCatalogo().map((p) => [p.id, p]))
  const spesa = fatte.find((s) => s.id === id)
  if (!spesa) return <Pagina titolo="Shopping" sinistra={<PulsanteIndietro etichetta="History" onClick={nav.indietro} />} />

  const presi = spesa.voci.filter((v) => v.spuntato).length
  const ripetiQuesta = () => {
    const n = ripeti(spesa)
    mostraMessaggio(n ? `${n} items added to the list` : 'They were all on the list already')
  }

  return (
    <Pagina
      titolo={maiuscola(formatoGiorno(spesa.data))}
      titoloBarra="Shopping"
      sopratitolo="Shopping on"
      sinistra={<PulsanteIndietro etichetta="History" onClick={nav.indietro} />}
    >
      <div class="sezione tint-spesa">
        <Card>
          <p class="t-headline">
            {presi} {presi === 1 ? 'item bought' : 'items bought'}
            {presi < spesa.voci.length && <span class="c-label-2"> · {spesa.voci.length - presi} not bought</span>}
          </p>
          <p class="t-subheadline c-label-2">Archived on {formatoMomento(spesa.fatta)}</p>
          <button class="pulsante pieno" style={{ marginTop: 16 }} onClick={ripetiQuesta}>
            <RotateCcw size={20} /> Repeat this shop
          </button>
        </Card>
      </div>

      {REPARTI.map((r) => {
        const voci = spesa.voci
          .filter((v) => trovaReparto(v.reparto).id === r.id)
          .sort((a, b) => Number(b.spuntato) - Number(a.spuntato) || a.nome.localeCompare(b.nome, 'en'))
        if (!voci.length) return null
        return (
          <Sezione key={r.id} titolo={r.nome}>
            <Lista>
              {voci.map((v) => (
                <Riga
                  key={v.id}
                  classe={v.spuntato ? '' : 'nascosta'}
                  titolo={perId[v.prodotto]?.nome || v.nome}
                  sottotitolo={[v.dk, v.quantita].filter(Boolean).join(' · ') || undefined}
                  valore={v.spuntato ? undefined : 'not bought'}
                />
              ))}
            </Lista>
          </Sezione>
        )
      })}
    </Pagina>
  )
}
