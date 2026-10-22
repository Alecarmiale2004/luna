// Foglio "Aggiungi prodotti": cerca nel catalogo (italiano o danese), tocca per aggiungere.
// Se un prodotto non c'è, lo crei al volo: viene ricordato e suggerito le volte successive.
import { useEffect, useMemo, useState } from 'preact/hooks'
import { Foglio } from '../components/Foglio.jsx'
import { Sezione, Lista, Riga, MenuValore } from '../components/Lista.jsx'
import { Search, CircleX, CirclePlus, CircleCheck } from '../components/icone.js'
import { useDati } from '../db/dati.js'
import { useCatalogo, cerca, normalizza, nuovoProdotto, REPARTI } from '../db/catalogo.js'
import { listaAperta, aggiungi, rimuoviProdotto, frequenze } from '../db/spesa.js'
import { vibra } from '../lib/tocco.js'

const OPZIONI_REPARTO = REPARTI.map((r) => ({ valore: r.id, etichetta: r.nome }))
const MAX_FREQUENTI = 8

export function FoglioAggiungi({ aperto, onChiudi }) {
  const { spese } = useDati()
  const catalogo = useCatalogo()
  const [testo, setTesto] = useState('')
  const [nuovo, setNuovo] = useState(null) // { it, dk, reparto } mentre creo un prodotto

  useEffect(() => {
    if (aperto) {
      setTesto('')
      setNuovo(null)
    }
  }, [aperto])

  const inLista = new Set((listaAperta(spese)?.voci || []).filter((v) => !v.spuntato).map((v) => v.prodotto))
  const visibili = catalogo.filter((p) => !p.nascosto)

  const frequenti = useMemo(() => {
    const conti = frequenze(spese.filter((l) => l.stato === 'fatta'))
    return visibili
      .filter((p) => conti[p.id])
      .sort((a, b) => conti[b.id] - conti[a.id])
      .slice(0, MAX_FREQUENTI)
  }, [spese, catalogo])

  const risultati = cerca(catalogo, testo)
  const esisteGia = visibili.some((p) => normalizza(p.nome) === normalizza(testo))

  const alterna = (prodotto) => {
    vibra()
    if (inLista.has(prodotto.id)) rimuoviProdotto(prodotto.id)
    else aggiungi([{ prodotto }])
  }

  const creaEAggiungi = () => {
    if (!nuovo.nome.trim()) return
    const prodotto = nuovoProdotto(nuovo)
    aggiungi([{ prodotto }])
    vibra()
    setNuovo(null)
    setTesto('')
  }

  const riga = (p) => (
    <Riga
      key={p.id}
      titolo={p.nome}
      sottotitolo={p.dk || undefined}
      destra={
        <span class={`aggiungi-stato${inLista.has(p.id) ? ' aggiunto' : ''}`} key={String(inLista.has(p.id))}>
          {inLista.has(p.id) ? <CircleCheck size={26} fill="var(--tint)" color="var(--bg-card)" /> : <CirclePlus size={26} />}
        </span>
      }
      onClick={() => alterna(p)}
    />
  )

  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo="Add items" grande>
      <div class="tint-spesa">
        <div class="aggiungi-ricerca">
          <label class="ricerca">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search or type a new item"
              value={testo}
              enterKeyHint="done"
              autoComplete="off"
              onInput={(e) => {
                setTesto(e.currentTarget.value)
                setNuovo(null)
              }}
            />
            {testo && (
              <button aria-label="Clear" onClick={() => setTesto('')}>
                <CircleX size={18} fill="currentColor" color="var(--bg)" />
              </button>
            )}
          </label>
        </div>

        {testo.trim() ? (
          <>
            {risultati.length > 0 && (
              <Sezione titolo="In the catalogue">
                <Lista>{risultati.map(riga)}</Lista>
              </Sezione>
            )}
            {!esisteGia && !nuovo && (
              <Sezione piede="It will be remembered and suggested next time.">
                <Lista>
                  <Riga
                    titolo={`Add “${testo.trim()}”`}
                    tipo="azione"
                    onClick={() => setNuovo({ nome: testo.trim(), dk: '', reparto: 'altro' })}
                  />
                </Lista>
              </Sezione>
            )}
            {nuovo && (
              <>
                <Sezione titolo="New item" piede="The Danish name helps you spot it on the shelf.">
                  <Lista>
                    <Riga
                      titolo="Name"
                      destra={
                        <input class="riga-campo" value={nuovo.nome} onInput={(e) => setNuovo({ ...nuovo, nome: e.currentTarget.value })} />
                      }
                    />
                    <Riga
                      titolo="Danish"
                      destra={
                        <input
                          class="riga-campo"
                          placeholder="optional"
                          value={nuovo.dk}
                          onInput={(e) => setNuovo({ ...nuovo, dk: e.currentTarget.value })}
                        />
                      }
                    />
                    <Riga
                      titolo="Aisle"
                      destra={
                        <MenuValore valore={nuovo.reparto} opzioni={OPZIONI_REPARTO} onChange={(r) => setNuovo({ ...nuovo, reparto: r })} />
                      }
                    />
                  </Lista>
                </Sezione>
                <div class="foglio-azioni">
                  <button class="pulsante pieno" disabled={!nuovo.nome.trim()} onClick={creaEAggiungi}>
                    Add to the list
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {frequenti.length > 0 && (
              <Sezione titolo="Used often">
                <Lista>{frequenti.map(riga)}</Lista>
              </Sezione>
            )}
            {REPARTI.map((r) => {
              const prodotti = visibili.filter((p) => p.reparto === r.id)
              if (!prodotti.length) return null
              return (
                <Sezione key={r.id} titolo={r.nome}>
                  <Lista>{prodotti.map(riga)}</Lista>
                </Sezione>
              )
            })}
          </>
        )}
      </div>
    </Foglio>
  )
}
