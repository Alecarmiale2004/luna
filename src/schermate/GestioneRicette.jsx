// Impostazioni → Ricette: aggiungere, modificare, nascondere (mai cancellare: lo storico resta valido).
// Ogni modifica si salva da sola.
import { useRef, useState } from 'preact/hooks'
import { Pagina, PulsanteIndietro } from '../components/Pagina.jsx'
import { Sezione, Lista, Riga, MenuValore, Stepper } from '../components/Lista.jsx'
import { Foglio } from '../components/Foglio.jsx'
import { mostraMessaggio, chiediConferma } from '../components/Avvisi.jsx'
import { Plus, TriangleAlert } from '../components/icone.js'
import { useNav } from '../navigazione.jsx'
import { useDati, modificaStato, scrivi } from '../db/dati.js'
import { useCatalogo } from '../db/catalogo.js'
import { useRicette, salvaRicetta, nuovaRicetta, ingredientiEsclusi, testoQuantita, BLOCCHI } from '../db/ricette.js'
import ricetteBase from '../data/ricette.json'
import './cibo.css'

export function GestioneRicette() {
  const nav = useNav()
  const ricette = useRicette()
  const { impostazioni } = useDati()
  const catalogo = useCatalogo()
  const perId = Object.fromEntries(catalogo.map((p) => [p.id, p]))

  const crea = () => {
    const id = nuovaRicetta()
    nav.apri(EditorRicetta, { id })
  }

  return (
    <Pagina
      titolo="Recipes"
      sinistra={<PulsanteIndietro etichetta="Settings" onClick={nav.indietro} />}
      destra={
        <button class="nav-pulsante" aria-label="New recipe" onClick={crea}>
          <Plus size={26} />
        </button>
      }
    >
      <Sezione piede="Hidden recipes don’t appear in the recipe list or in suggestions, but your history stays as it is.">
        <Lista>
          {ricette.map((r) => {
            const vietati = ingredientiEsclusi(r.ingredienti, impostazioni.cibiEsclusi, perId)
            return (
              <Riga
                key={r.id}
                classe={r.nascosta ? 'nascosta' : ''}
                titolo={r.nome}
                sottotitolo={vietati.length ? `Contains ${vietati.map((i) => perId[i.prodotto]?.nome.toLowerCase()).join(', ')}` : `~${r.proteinePorzione} g of protein · ${r.minuti} min`}
                valore={r.nascosta ? 'Hidden' : r.mia ? 'Mine' : undefined}
                destra={vietati.length ? <TriangleAlert size={16} color="var(--red)" /> : undefined}
                freccia
                onClick={() => nav.apri(EditorRicetta, { id: r.id })}
              />
            )
          })}
        </Lista>
      </Sezione>
    </Pagina>
  )
}

// ---------------------------------------------------------------------------

const OPZIONI_UNITA = [
  { valore: 'g', etichetta: 'grams' },
  { valore: 'pz', etichetta: 'pieces' },
  { valore: 'cucchiai', etichetta: 'tablespoons' },
  { valore: '', etichetta: 'to taste' },
]
const OPZIONI_BLOCCO = BLOCCHI.map((b) => ({ valore: b.id, etichetta: b.nome }))

function EditorRicetta({ id }) {
  const nav = useNav()
  const ricette = useRicette()
  const catalogo = useCatalogo()
  const [indice, setIndice] = useState(null) // ingrediente aperto
  const ricetta = ricette.find((r) => r.id === id)
  if (!ricetta) return <Pagina titolo="Recipe" sinistra={<PulsanteIndietro etichetta="Recipes" onClick={nav.indietro} />} />

  const perId = Object.fromEntries(catalogo.map((p) => [p.id, p]))
  const cambia = (modifiche) => salvaRicetta(id, modifiche)
  const cambiaIngrediente = (i, modifiche) =>
    cambia({ ingredienti: ricetta.ingredienti.map((ing, j) => (j === i ? { ...ing, ...modifiche } : ing)) })
  const base = ricetteBase.find((r) => r.id === id)

  const ripristina = async () => {
    const ok = await chiediConferma({
      titolo: 'Restore the original recipe?',
      testo: 'Your changes to this recipe will be removed.',
      conferma: 'Restore',
      distruttiva: true,
    })
    if (!ok) return
    modificaStato((s) => {
      const ricetteMie = { ...s.ricetteMie }
      delete ricetteMie[id]
      return { ...s, ricetteMie }
    })
    scrivi((db) => db.delete('ricette', id))
    mostraMessaggio('Original recipe restored')
  }

  return (
    <Pagina titolo={ricetta.nome || 'Recipe'} titoloBarra="Recipe" sinistra={<PulsanteIndietro etichetta="Recipes" onClick={nav.indietro} />}>
      <div class="tint-cibo">
        <Sezione>
          <Lista>
            <Riga
              titolo="Name"
              destra={
                <input
                  class="riga-campo"
                  value={ricetta.nome}
                  onInput={(e) => e.currentTarget.value.trim() && cambia({ nome: e.currentTarget.value })}
                />
              }
            />
            <Riga
              titolo="Time"
              destra={
                <>
                  <span class="riga-valore num">{ricetta.minuti}′</span>
                  <Stepper valore={ricetta.minuti} min={5} max={120} passo={5} onChange={(v) => cambia({ minuti: v })} />
                </>
              }
            />
            <Riga
              titolo="Protein per portion"
              destra={
                <>
                  <span class="riga-valore num">{ricetta.proteinePorzione} g</span>
                  <Stepper valore={ricetta.proteinePorzione} min={0} max={80} onChange={(v) => cambia({ proteinePorzione: v })} />
                </>
              }
            />
          </Lista>
        </Sezione>

        <Sezione titolo="Ingredients · for 2 portions" piede="Tap an ingredient to change it. Base, protein and vegetables can then be swapped from the recipe card.">
          <Lista>
            {ricetta.ingredienti.map((ing, i) => (
              <Riga
                key={i}
                titolo={perId[ing.prodotto]?.nome || ing.prodotto}
                sottotitolo={[BLOCCHI.find((b) => b.id === ing.blocco)?.nome, ing.facoltativo && 'optional', ing.nota].filter(Boolean).join(' · ')}
                valore={testoQuantita(ing, perId[ing.prodotto])}
                freccia
                onClick={() => setIndice(i)}
              />
            ))}
            <Riga
              titolo="Add ingredient"
              tipo="azione"
              onClick={() => {
                cambia({ ingredienti: [...ricetta.ingredienti, { prodotto: 'sale', blocco: 'condimento' }] })
                setIndice(ricetta.ingredienti.length)
              }}
            />
          </Lista>
        </Sezione>

        <Sezione titolo="Method">
          <textarea
            class="campo-lungo"
            value={ricetta.procedimento || ''}
            placeholder="Write the steps briefly"
            onInput={(e) => cambia({ procedimento: e.currentTarget.value })}
          />
        </Sezione>

        <Sezione>
          <Lista>
            <Riga
              titolo={ricetta.nascosta ? 'Show the recipe again' : 'Hide the recipe'}
              tipo={ricetta.nascosta ? 'azione' : 'distruttiva'}
              onClick={() => {
                cambia({ nascosta: !ricetta.nascosta })
                mostraMessaggio(ricetta.nascosta ? 'Recipe visible again' : 'Recipe hidden')
              }}
            />
            {base && !ricetta.mia && <Riga titolo="Restore the original recipe" tipo="azione" onClick={ripristina} />}
          </Lista>
        </Sezione>
      </div>

      <FoglioIngrediente
        ingrediente={indice !== null ? ricetta.ingredienti[indice] : null}
        catalogo={catalogo}
        onCambia={(m) => cambiaIngrediente(indice, m)}
        onTogli={() => {
          cambia({ ingredienti: ricetta.ingredienti.filter((_, j) => j !== indice) })
          setIndice(null)
        }}
        onChiudi={() => setIndice(null)}
      />
    </Pagina>
  )
}

function FoglioIngrediente({ ingrediente, catalogo, onCambia, onTogli, onChiudi }) {
  const ultimo = useRef(ingrediente)
  if (ingrediente) ultimo.current = ingrediente
  const ing = ingrediente || ultimo.current
  const visibili = catalogo.filter((p) => !p.nascosto || p.id === ing?.prodotto)

  return (
    <Foglio aperto={!!ingrediente} onChiudi={onChiudi} titolo="Ingredient">
      {ing && (
        <div class="tint-cibo">
          <Sezione>
            <Lista>
              <Riga
                titolo="Product"
                destra={<MenuValore valore={ing.prodotto} opzioni={visibili.map((p) => ({ valore: p.id, etichetta: p.nome }))} onChange={(v) => onCambia({ prodotto: v })} />}
              />
              <Riga
                titolo="Quantity"
                destra={
                  <input
                    class="riga-campo"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder="—"
                    disabled={!ing.unita}
                    value={ing.quantita ?? ''}
                    onInput={(e) => {
                      const n = parseFloat(e.currentTarget.value.replace(',', '.'))
                      onCambia({ quantita: Number.isFinite(n) ? n : undefined })
                    }}
                  />
                }
              />
              <Riga
                titolo="Unit"
                destra={
                  <MenuValore
                    valore={ing.unita || ''}
                    opzioni={OPZIONI_UNITA}
                    onChange={(v) => onCambia(v ? { unita: v, quantita: ing.quantita ?? 1 } : { unita: undefined, quantita: undefined })}
                  />
                }
              />
              <Riga titolo="Part" destra={<MenuValore valore={ing.blocco} opzioni={OPZIONI_BLOCCO} onChange={(v) => onCambia({ blocco: v })} />} />
              <Riga
                titolo="Optional"
                destra={
                  <MenuValore
                    valore={ing.facoltativo ? 'si' : 'no'}
                    opzioni={[
                      { valore: 'no', etichetta: 'No' },
                      { valore: 'si', etichetta: 'Yes' },
                    ]}
                    onChange={(v) => onCambia({ facoltativo: v === 'si' })}
                  />
                }
              />
              <Riga
                titolo="Note"
                destra={<input class="riga-campo" placeholder="e.g. diced" value={ing.nota || ''} onInput={(e) => onCambia({ nota: e.currentTarget.value })} />}
              />
            </Lista>
          </Sezione>
          <div class="foglio-azioni">
            <button class="pulsante grigio" style={{ color: 'var(--red)' }} onClick={onTogli}>
              Remove ingredient
            </button>
          </div>
        </div>
      )}
    </Foglio>
  )
}
