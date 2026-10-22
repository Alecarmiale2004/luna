// Sezione Spesa: la lista per reparti da spuntare in negozio, con un tocco.
import { useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import { Pagina } from '../components/Pagina.jsx'
import { Card } from '../components/Card.jsx'
import { Sezione, Lista, Riga } from '../components/Lista.jsx'
import { Spunta } from '../components/Spunta.jsx'
import { Anello } from '../components/Anello.jsx'
import { Foglio } from '../components/Foglio.jsx'
import { mostraMessaggio, chiediConferma } from '../components/Avvisi.jsx'
import { Plus, Archive, ShoppingCart, Check } from '../components/icone.js'
import { useNav } from '../navigazione.jsx'
import { useCatalogo, REPARTI, reparto as trovaReparto } from '../db/catalogo.js'
import { useSpesa, aggiornaVoce, rimuoviVoce, spesaFatta, ripeti, aggiungi, svuota } from '../db/spesa.js'
import { usePressione } from '../lib/pressione.js'
import { vibra } from '../lib/tocco.js'
import { formatoGiorno } from '../lib/giornata.js'
import BASE_COLAZIONE from '../data/spesa-base.json'
import { FoglioAggiungi } from './AggiungiProdotti.jsx'
import { StoricoSpese } from './StoricoSpese.jsx'
import './spesa.css'

const confronta = (a, b) => a.nome.localeCompare(b.nome, 'en')

export function Spesa() {
  const nav = useNav()
  const { lista, fatte } = useSpesa()
  const catalogo = useCatalogo()
  const [aggiungendo, setAggiungendo] = useState(false)
  const [idVoce, setIdVoce] = useState(null)

  const perId = useMemo(() => Object.fromEntries(catalogo.map((p) => [p.id, p])), [catalogo])
  // Nomi e reparti aggiornati dal catalogo (se ho modificato un prodotto), altrimenti quelli salvati
  const voci = (lista?.voci || []).map((v) => {
    const p = perId[v.prodotto]
    return p ? { ...v, nome: p.nome, dk: p.dk, reparto: p.reparto } : v
  })
  const presi = voci.filter((v) => v.spuntato).length
  const ultima = fatte[0]
  const gruppi = REPARTI.map((r) => ({
    reparto: r,
    voci: [
      ...voci.filter((v) => trovaReparto(v.reparto).id === r.id && !v.spuntato).sort(confronta),
      ...voci.filter((v) => trovaReparto(v.reparto).id === r.id && v.spuntato).sort(confronta),
    ],
  })).filter((g) => g.voci.length)

  const fatta = async () => {
    const rimasti = voci.length - presi
    const ok = await chiediConferma({
      titolo: 'Done shopping?',
      testo: rimasti
        ? `${presi} items in the cart. ${rimasti === 1 ? 'The one you didn’t get stays' : `The ${rimasti} you didn’t get stay`} on the list for next time.`
        : `${presi} items in the cart. The list goes into your history.`,
      conferma: 'Archive',
    })
    if (!ok) return
    spesaFatta()
    vibra()
    mostraMessaggio('Shopping archived')
  }

  const ripetiUltima = () => {
    const n = ripeti(ultima)
    mostraMessaggio(n ? `${n} items added` : 'They were all on the list already')
  }

  const aggiungiBase = () => {
    const n = aggiungi(BASE_COLAZIONE.map((id) => ({ prodotto: perId[id] })).filter((e) => e.prodotto))
    mostraMessaggio(n ? `${n} items added` : 'They were all on the list already')
  }

  const svuotaLista = async () => {
    const ok = await chiediConferma({
      titolo: 'Clear the list?',
      testo: 'All items are removed from the list. Your shopping history stays as it is.',
      conferma: 'Clear',
      distruttiva: true,
    })
    if (ok) svuota()
  }

  return (
    <Pagina
      titolo="Shopping"
      titoloBarra={voci.length ? `${presi} of ${voci.length} in the cart` : 'Shopping'}
      destra={
        <>
          <button class="nav-pulsante" aria-label="Shopping history" onClick={() => nav.apri(StoricoSpese, { indietro: 'Shopping' })}>
            <Archive size={22} />
          </button>
          <button class="nav-pulsante" aria-label="Add items" onClick={() => setAggiungendo(true)}>
            <Plus size={26} />
          </button>
        </>
      }
    >
      {voci.length === 0 ? (
        <div class="vuoto">
          <div class="vuoto-icona">
            <ShoppingCart size={36} />
          </div>
          <p class="t-title2">Your list is empty</p>
          <p class="t-subheadline c-label-2">Add what you need, or start again from your last shop.</p>
          <div class="vuoto-azioni">
            {ultima && (
              <>
                <button class="pulsante pieno" onClick={ripetiUltima}>
                  Repeat last shop
                </button>
                <p class="vuoto-nota">
                  {formatoGiorno(ultima.data)} · {ultima.voci.length} items
                </p>
              </>
            )}
            <button class={`pulsante ${ultima ? 'tinta' : 'pieno'}`} onClick={() => setAggiungendo(true)}>
              Add items
            </button>
            <button class="pulsante grigio" onClick={aggiungiBase}>
              Add the breakfast basics
            </button>
          </div>
        </div>
      ) : (
        <>
          <div class="sezione">
            <Card class="carrello">
              <Anello valore={presi / voci.length} dimensione={58} spessore={9} etichetta={`${presi} of ${voci.length}`}>
                {presi === voci.length ? (
                  <Check size={22} strokeWidth={3} color="var(--tint)" />
                ) : (
                  <ShoppingCart size={20} color="var(--tint)" />
                )}
              </Anello>
              <div class="carrello-testi">
                <p class="carrello-numeri num">
                  {presi} <span class="di">of {voci.length}</span>
                </p>
                <p class="carrello-etichetta">{presi === voci.length ? 'All in the cart!' : 'in the cart'}</p>
              </div>
            </Card>
          </div>

          {gruppi.map((g) => (
            <Reparto key={g.reparto.id} reparto={g.reparto} voci={g.voci} onApri={setIdVoce} />
          ))}

          <div class="spesa-azioni">
            <button class="pulsante pieno" disabled={!presi} onClick={fatta}>
              Done shopping
            </button>
            <p class="sezione-piede">
              {presi ? 'Archives the list into your history. Press and hold an item to change or remove it.' : 'Tick items off as you put them in the cart. Press and hold an item to change or remove it.'}
            </p>
          </div>

          <Sezione>
            <Lista>
              <Riga titolo="Add items" tipo="azione" onClick={() => setAggiungendo(true)} />
              {ultima && <Riga titolo="Repeat last shop" tipo="azione" onClick={ripetiUltima} />}
              <Riga titolo="Clear the list" tipo="distruttiva" onClick={svuotaLista} />
            </Lista>
          </Sezione>
        </>
      )}

      <FoglioAggiungi aperto={aggiungendo} onChiudi={() => setAggiungendo(false)} />
      <FoglioVoce voce={voci.find((v) => v.id === idVoce)} onChiudi={() => setIdVoce(null)} />
    </Pagina>
  )
}

/**
 * Un reparto della lista. Quando spunti un prodotto, scivola in fondo al reparto
 * con un'animazione (tecnica FLIP: si misura la posizione prima e dopo e si anima la differenza).
 */
function Reparto({ reparto, voci, onApri }) {
  const righe = useRef(new Map())
  const posizioni = useRef(new Map())

  useLayoutEffect(() => {
    const nuove = new Map()
    righe.current.forEach((el, id) => {
      const y = el.offsetTop
      nuove.set(id, y)
      const prima = posizioni.current.get(id)
      if (prima !== undefined && prima !== y) {
        el.animate([{ transform: `translateY(${prima - y}px)` }, { transform: 'none' }], {
          duration: 420,
          easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
        })
      }
    })
    posizioni.current = nuove
  })

  const presi = voci.filter((v) => v.spuntato).length
  return (
    <section class="sezione">
      <h2 class="sezione-intestazione reparto-testa">
        <span>
          {reparto.nome}
          <span class="reparto-dk"> · {reparto.dk}</span>
        </span>
        <span class="num" style={{ fontWeight: 500 }}>
          {presi}/{voci.length}
        </span>
      </h2>
      <div class="lista">
        {voci.map((v) => (
          <RigaVoce
            key={v.id}
            voce={v}
            onApri={() => onApri(v.id)}
            rif={(el) => (el ? righe.current.set(v.id, el) : righe.current.delete(v.id))}
          />
        ))}
      </div>
    </section>
  )
}

/** Un tocco ovunque sulla riga = nel carrello (o di nuovo in lista). Pressione lunga = dettagli. */
function RigaVoce({ voce, onApri, rif }) {
  const pressione = usePressione({
    onTocco: () => {
      vibra()
      aggiornaVoce(voce.id, { spuntato: !voce.spuntato })
    },
    onPressioneLunga: () => {
      vibra()
      onApri()
    },
  })
  return (
    <div
      ref={rif}
      class={`riga voce${voce.spuntato ? ' spuntata' : ''}`}
      role="checkbox"
      aria-checked={voce.spuntato}
      tabIndex={0}
      {...pressione}
    >
      <Spunta attiva={voce.spuntato} />
      <span class="riga-contenuto">
        <span class="riga-testi">
          <span class="riga-titolo">{voce.nome}</span>
          {voce.dk && <span class="riga-sottotitolo">{voce.dk}</span>}
        </span>
        {voce.quantita && <span class="voce-quantita">{voce.quantita}</span>}
      </span>
    </div>
  )
}

/** Dettagli di un prodotto in lista: quantità e rimozione. Le modifiche si salvano subito. */
function FoglioVoce({ voce, onChiudi }) {
  // Tiene l'ultima voce mostrata durante l'animazione di chiusura
  const ultima = useRef(voce)
  if (voce) ultima.current = voce
  const v = voce || ultima.current

  return (
    <Foglio aperto={!!voce} onChiudi={onChiudi} titolo={v?.nome || ''}>
      {v && (
        <div class="tint-spesa">
          <Sezione piede={v.dk ? `In the store: ${v.dk}` : undefined}>
            <Lista>
              <Riga
                titolo="Quantity"
                destra={
                  <input
                    class="riga-campo"
                    type="text"
                    placeholder="e.g. 2 packs"
                    value={v.quantita}
                    onInput={(e) => aggiornaVoce(v.id, { quantita: e.currentTarget.value })}
                  />
                }
              />
              <Riga titolo="Aisle" valore={trovaReparto(v.reparto).nome} />
            </Lista>
          </Sezione>
          <div class="foglio-azioni">
            <button
              class="pulsante grigio"
              onClick={() => {
                aggiornaVoce(v.id, { spuntato: !v.spuntato })
                onChiudi()
              }}
            >
              {v.spuntato ? 'Put back on the list' : 'Mark as in the cart'}
            </button>
            <button
              class="pulsante grigio"
              style={{ color: 'var(--red)' }}
              onClick={() => {
                rimuoviVoce(v.id)
                onChiudi()
              }}
            >
              Remove from the list
            </button>
          </div>
        </div>
      )}
    </Foglio>
  )
}
