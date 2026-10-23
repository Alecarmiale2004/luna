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

const confronta = (a, b) => a.nome.localeCompare(b.nome, 'it')

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
      titolo: 'Spesa fatta?',
      testo: rimasti
        ? `${presi} prodotti nel carrello. ${rimasti === 1 ? 'Quello non preso resta' : `I ${rimasti} non presi restano`} in lista per la prossima volta.`
        : `${presi} prodotti nel carrello. La lista va nello storico.`,
      conferma: 'Archivia',
    })
    if (!ok) return
    spesaFatta()
    vibra()
    mostraMessaggio('Spesa archiviata')
  }

  const ripetiUltima = () => {
    const n = ripeti(ultima)
    mostraMessaggio(n ? `${n} prodotti aggiunti` : 'Erano già tutti in lista')
  }

  const aggiungiBase = () => {
    const n = aggiungi(BASE_COLAZIONE.map((id) => ({ prodotto: perId[id] })).filter((e) => e.prodotto))
    mostraMessaggio(n ? `${n} prodotti aggiunti` : 'Erano già tutti in lista')
  }

  const svuotaLista = async () => {
    const ok = await chiediConferma({
      titolo: 'Svuotare la lista?',
      testo: 'Tutti i prodotti vengono tolti dalla lista. Lo storico delle spese resta com’è.',
      conferma: 'Svuota',
      distruttiva: true,
    })
    if (ok) svuota()
  }

  return (
    <Pagina
      titolo="Spesa"
      titoloBarra={voci.length ? `${presi} di ${voci.length} nel carrello` : 'Spesa'}
      destra={
        <>
          <button class="nav-pulsante" aria-label="Storico delle spese" onClick={() => nav.apri(StoricoSpese, { indietro: 'Spesa' })}>
            <Archive size={22} />
          </button>
          <button class="nav-pulsante" aria-label="Aggiungi prodotti" onClick={() => setAggiungendo(true)}>
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
          <p class="t-title2">La lista è vuota</p>
          <p class="t-subheadline c-label-2">Aggiungi quello che ti serve, oppure riparti dall’ultima spesa.</p>
          <div class="vuoto-azioni">
            {ultima && (
              <>
                <button class="pulsante pieno" onClick={ripetiUltima}>
                  Ripeti l’ultima spesa
                </button>
                <p class="vuoto-nota">
                  {formatoGiorno(ultima.data)} · {ultima.voci.length} prodotti
                </p>
              </>
            )}
            <button class={`pulsante ${ultima ? 'tinta' : 'pieno'}`} onClick={() => setAggiungendo(true)}>
              Aggiungi prodotti
            </button>
            <button class="pulsante grigio" onClick={aggiungiBase}>
              Aggiungi la base della colazione
            </button>
          </div>
        </div>
      ) : (
        <>
          <div class="sezione">
            <Card class="carrello">
              <Anello valore={presi / voci.length} dimensione={58} spessore={9} etichetta={`${presi} di ${voci.length}`}>
                {presi === voci.length ? (
                  <Check size={22} strokeWidth={3} color="var(--tint)" />
                ) : (
                  <ShoppingCart size={20} color="var(--tint)" />
                )}
              </Anello>
              <div class="carrello-testi">
                <p class="carrello-numeri num">
                  {presi} <span class="di">di {voci.length}</span>
                </p>
                <p class="carrello-etichetta">{presi === voci.length ? 'Tutto nel carrello!' : 'nel carrello'}</p>
              </div>
            </Card>
          </div>

          {gruppi.map((g) => (
            <Reparto key={g.reparto.id} reparto={g.reparto} voci={g.voci} onApri={setIdVoce} />
          ))}

          <div class="spesa-azioni">
            <button class="pulsante pieno" disabled={!presi} onClick={fatta}>
              Spesa fatta
            </button>
            <p class="sezione-piede">
              {presi ? 'Archivia la lista nello storico. Tieni premuto un prodotto per cambiarlo o toglierlo.' : 'Spunta i prodotti mentre li metti nel carrello. Tieni premuto un prodotto per cambiarlo o toglierlo.'}
            </p>
          </div>

          <Sezione>
            <Lista>
              <Riga titolo="Aggiungi prodotti" tipo="azione" onClick={() => setAggiungendo(true)} />
              {ultima && <Riga titolo="Ripeti l’ultima spesa" tipo="azione" onClick={ripetiUltima} />}
              <Riga titolo="Svuota la lista" tipo="distruttiva" onClick={svuotaLista} />
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
          <Sezione piede={v.dk ? `In negozio: ${v.dk}` : undefined}>
            <Lista>
              <Riga
                titolo="Quantità"
                destra={
                  <input
                    class="riga-campo"
                    type="text"
                    placeholder="es. 2 confezioni"
                    value={v.quantita}
                    onInput={(e) => aggiornaVoce(v.id, { quantita: e.currentTarget.value })}
                  />
                }
              />
              <Riga titolo="Reparto" valore={trovaReparto(v.reparto).nome} />
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
              {v.spuntato ? 'Rimetti da prendere' : 'Segna nel carrello'}
            </button>
            <button
              class="pulsante grigio"
              style={{ color: 'var(--red)' }}
              onClick={() => {
                rimuoviVoce(v.id)
                onChiudi()
              }}
            >
              Togli dalla lista
            </button>
          </div>
        </div>
      )}
    </Foglio>
  )
}
