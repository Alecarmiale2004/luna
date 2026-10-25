// Impostazioni → Prodotti della spesa: aggiungere, rinominare, cambiare reparto, nascondere.
// Niente si cancella davvero: un prodotto nascosto sparisce dai suggerimenti ma lo storico resta valido.
import { useRef, useState } from 'preact/hooks'
import { Pagina, PulsanteIndietro } from '../components/Pagina.jsx'
import { Sezione, Lista, Riga, MenuValore } from '../components/Lista.jsx'
import { Foglio } from '../components/Foglio.jsx'
import { mostraMessaggio } from '../components/Avvisi.jsx'
import { Plus, Search, CircleX } from '../components/icone.js'
import { useNav } from '../navigazione.jsx'
import { useCatalogo, cerca, salvaProdotto, nuovoProdotto, REPARTI } from '../db/catalogo.js'
import './spesa.css'

const OPZIONI_REPARTO = REPARTI.map((r) => ({ valore: r.id, etichetta: r.nome }))

export function Prodotti() {
  const nav = useNav()
  const catalogo = useCatalogo()
  const [testo, setTesto] = useState('')
  const [modifica, setModifica] = useState(null) // id del prodotto aperto, oppure "nuovo"

  const elenco = testo.trim()
    ? cerca(
        catalogo.map((p) => ({ ...p, nascosto: false })),
        testo,
      ).map((p) => catalogo.find((c) => c.id === p.id))
    : catalogo

  return (
    <Pagina
      titolo="Products"
      sinistra={<PulsanteIndietro etichetta="Settings" onClick={nav.indietro} />}
      destra={
        <button class="nav-pulsante" aria-label="New product" onClick={() => setModifica('nuovo')}>
          <Plus size={26} />
        </button>
      }
    >
      <label class="ricerca" style={{ marginBottom: 8 }}>
        <Search size={18} />
        <input type="search" placeholder="Search" value={testo} onInput={(e) => setTesto(e.currentTarget.value)} />
        {testo && (
          <button aria-label="Clear" onClick={() => setTesto('')}>
            <CircleX size={18} fill="currentColor" color="var(--bg)" />
          </button>
        )}
      </label>

      {REPARTI.map((r, i) => {
        const prodotti = elenco.filter((p) => p.reparto === r.id)
        if (!prodotti.length) return null
        return (
          <Sezione
            key={r.id}
            titolo={`${r.nome} · ${r.dk}`}
            piede={i === REPARTI.length - 1 ? 'Hidden products don’t show up in suggestions. Your shopping history stays as it is.' : undefined}
          >
            <Lista>
              {prodotti.map((p) => (
                <Riga
                  key={p.id}
                  classe={p.nascosto ? 'nascosta' : ''}
                  titolo={p.nome}
                  sottotitolo={p.dk || undefined}
                  valore={p.nascosto ? 'Hidden' : p.mio ? 'Mine' : undefined}
                  freccia
                  onClick={() => setModifica(p.id)}
                />
              ))}
            </Lista>
          </Sezione>
        )
      })}

      <FoglioProdotto id={modifica} onChiudi={() => setModifica(null)} />
    </Pagina>
  )
}

/** Modifica (si salva da sola a ogni cambiamento) o creazione di un prodotto. */
function FoglioProdotto({ id, onChiudi }) {
  const catalogo = useCatalogo()
  const ultimo = useRef(id)
  if (id) ultimo.current = id
  const idCorrente = id || ultimo.current
  const nuovo = idCorrente === 'nuovo'
  const [bozza, setBozza] = useState({ nome: '', dk: '', reparto: 'altro' })
  const prodotto = nuovo ? bozza : catalogo.find((p) => p.id === idCorrente)

  const cambia = (modifiche) => {
    if (nuovo) return setBozza({ ...bozza, ...modifiche })
    // Il nome non può restare vuoto
    if ('nome' in modifiche && !modifiche.nome.trim()) return
    salvaProdotto(idCorrente, modifiche)
  }

  const crea = () => {
    nuovoProdotto(bozza)
    mostraMessaggio('Product added')
    setBozza({ nome: '', dk: '', reparto: 'altro' })
    onChiudi()
  }

  return (
    <Foglio aperto={!!id} onChiudi={onChiudi} titolo={nuovo ? 'New product' : prodotto?.nome || ''}>
      {prodotto && (
        <div class="tint-spesa">
          <Sezione>
            <Lista>
              <Riga
                titolo="Name"
                destra={<input class="riga-campo" value={prodotto.nome} placeholder="required" onInput={(e) => cambia({ nome: e.currentTarget.value })} />}
              />
              <Riga
                titolo="Danish"
                destra={<input class="riga-campo" value={prodotto.dk} placeholder="optional" onInput={(e) => cambia({ dk: e.currentTarget.value })} />}
              />
              <Riga
                titolo="Aisle"
                destra={<MenuValore valore={prodotto.reparto} opzioni={OPZIONI_REPARTO} onChange={(r) => cambia({ reparto: r })} />}
              />
            </Lista>
          </Sezione>
          <div class="foglio-azioni">
            {nuovo ? (
              <button class="pulsante pieno" disabled={!bozza.nome.trim()} onClick={crea}>
                Add product
              </button>
            ) : (
              <button
                class="pulsante grigio"
                onClick={() => {
                  cambia({ nascosto: !prodotto.nascosto })
                  mostraMessaggio(prodotto.nascosto ? 'Product visible again' : 'Product hidden')
                }}
              >
                {prodotto.nascosto ? 'Show again' : 'Hide product'}
              </button>
            )}
          </div>
        </div>
      )}
    </Foglio>
  )
}
