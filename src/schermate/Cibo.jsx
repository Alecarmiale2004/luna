// Sezione Cibo: pasti e proteine di oggi, la settimana di ricette, il ricettario.
import { useState } from 'preact/hooks'
import { Pagina } from '../components/Pagina.jsx'
import { Card } from '../components/Card.jsx'
import { Sezione, Lista, Riga } from '../components/Lista.jsx'
import { ChevronLeft, ChevronRight, TriangleAlert } from '../components/icone.js'
import { useDati } from '../db/dati.js'
import { useRicette, ingredientiEsclusi, applicaScambi } from '../db/ricette.js'
import { pianoDi, cucinateDi, sostituisciVoci } from '../db/piani.js'
import { useOggi, lunediDi, aggiungiGiorni, etichettaSettimana, formatoGiorno } from '../lib/giornata.js'
import { useCiboDiOggi, CardDaCucinare, CardProteine } from './ciboComune.jsx'
import { FoglioRicetta } from './Ricetta.jsx'
import { FoglioPianifica, FoglioGeneraSpesa, FoglioSalvaTipo } from './Settimana.jsx'
import { mostraMessaggio } from '../components/Avvisi.jsx'
import './oggi.css'

export function Cibo() {
  const { piani, settimaneTipo, impostazioni } = useDati()
  const ricette = useRicette()
  const oggi = useOggi()
  const { giornata, perId, ricettePerId } = useCiboDiOggi()
  const [scarto, setScarto] = useState(0)
  const [foglio, setFoglio] = useState(null) // { tipo: "ricetta" | "pianifica" | "genera" | "salva", … }

  const inizio = aggiungiGiorni(lunediDi(oggi), scarto * 7)
  const piano = pianoDi(piani, inizio)
  const pianoPrima = pianoDi(piani, aggiungiGiorni(inizio, -7))
  const voci = piano?.voci || []
  const sessioni = voci.reduce((t, v) => t + v.volte, 0)
  const cucinate = voci.reduce((t, v) => t + Math.min(cucinateDi(piano, v.id), v.volte), 0)
  const esclusi = impostazioni.cibiEsclusi
  const visibili = ricette.filter((r) => !r.nascosta)
  const chiudi = () => setFoglio(null)
  const apriRicetta = (id, voce = null) => setFoglio({ tipo: 'ricetta', id, voce: voce?.id || null, inizio })

  const copiaScorsa = () => {
    sostituisciVoci(inizio, pianoPrima.voci)
    mostraMessaggio('Recipes copied from last week')
  }

  return (
    <Pagina titolo="Food" sopratitolo={giornata !== oggi ? `Meals from the night of ${formatoGiorno(giornata)}` : undefined}>
      <CardProteine conPasti />
      <CardDaCucinare onApriRicetta={(voce) => setFoglio({ tipo: 'ricetta', id: voce.ricetta, voce: voce.id, inizio: lunediDi(giornata) })} />

      {/* ---------- Settimana ---------- */}
      <section class="sezione tint-cibo">
        <div class="settimana-cibo-testa">
          <button class="settimana-freccia" aria-label="Previous week" onClick={() => setScarto(scarto - 1)}>
            <ChevronLeft size={22} strokeWidth={2.4} />
          </button>
          <div class="settimana-etichetta">
            <span class="settimana-nome">{etichettaSettimana(inizio, oggi)}</span>
            <span class="settimana-conto">Recipes for the week</span>
          </div>
          <button class="settimana-freccia" aria-label="Next week" onClick={() => setScarto(scarto + 1)}>
            <ChevronRight size={22} strokeWidth={2.4} />
          </button>
        </div>

        {voci.length === 0 ? (
          <>
            <Card>
              <p class="t-headline">No recipes planned</p>
              <p class="t-subheadline c-label-2">
                With {impostazioni.nottiSettimana} work nights, 3–4 recipes are enough, each cooked 1–2 times.
              </p>
              <button class="pulsante pieno" style={{ marginTop: 16 }} onClick={() => setFoglio({ tipo: 'pianifica' })}>
                Choose recipes
              </button>
            </Card>
            {(pianoPrima?.voci.length > 0 || settimaneTipo.length > 0) && (
              <Sezione titolo="Or start again from">
                <Lista>
                  {pianoPrima?.voci.length > 0 && (
                    <Riga titolo="Last week" sottotitolo={riassunto(pianoPrima.voci, ricettePerId)} tipo="azione" onClick={copiaScorsa} />
                  )}
                  {settimaneTipo.map((t) => (
                    <Riga
                      key={t.id}
                      titolo={t.nome}
                      sottotitolo={riassunto(t.voci, ricettePerId)}
                      tipo="azione"
                      onClick={() => {
                        sostituisciVoci(inizio, t.voci)
                        mostraMessaggio(`“${t.nome}” applied`)
                      }}
                    />
                  ))}
                </Lista>
              </Sezione>
            )}
          </>
        ) : (
          <>
            <Card class="riepilogo-settimana">
              <div>
                <span class="num">{sessioni}</span>
                <span class="t-footnote c-label-2">{sessioni === 1 ? 'session' : 'sessions'}</span>
              </div>
              <div>
                <span class="num">{sessioni * 2}</span>
                <span class="t-footnote c-label-2">portions</span>
              </div>
              <div>
                <span class="num">
                  {cucinate}/{sessioni}
                </span>
                <span class="t-footnote c-label-2">cooked</span>
              </div>
            </Card>
            <div style={{ height: 12 }} />
            <Lista>
              {voci.map((v) => {
                const r = ricettePerId[v.ricetta]
                if (!r) return null
                const applicata = applicaScambi(r, v.scambi, perId)
                const scambi = applicata.ingredienti.filter((i) => i.originale)
                return (
                  <Riga
                    key={v.id}
                    titolo={r.nome}
                    sottotitolo={
                      scambi.length
                        ? scambi.map((i) => `${perId[i.prodotto]?.nome} instead of ${perId[i.originale]?.nome.toLowerCase()}`).join(' · ')
                        : `~${applicata.proteinePorzione} g of protein · ${r.minuti} min`
                    }
                    destra={
                      <span class="volte num">
                        {cucinateDi(piano, v.id)}/{v.volte}
                      </span>
                    }
                    freccia
                    onClick={() => apriRicetta(v.ricetta, v)}
                  />
                )
              })}
            </Lista>
            <div class="foglio-azioni" style={{ paddingTop: 16 }}>
              <button class="pulsante pieno" onClick={() => setFoglio({ tipo: 'genera' })}>
                Make the shopping list
              </button>
            </div>
            <Sezione>
              <Lista>
                <Riga titolo="Edit recipes" tipo="azione" onClick={() => setFoglio({ tipo: 'pianifica' })} />
                <Riga titolo="Save this week for later" tipo="azione" onClick={() => setFoglio({ tipo: 'salva' })} />
              </Lista>
            </Sezione>
          </>
        )}
      </section>

      {/* ---------- Ricettario ---------- */}
      <Sezione titolo="Recipes" piede="Each recipe makes 2 portions: the main meal and a lighter lunchbox.">
        <Lista>
          {visibili.map((r) => {
            const vietati = ingredientiEsclusi(r.ingredienti, esclusi, perId)
            return (
              <Riga
                key={r.id}
                titolo={r.nome}
                sottotitolo={vietati.length ? `Contains ${vietati.map((i) => perId[i.prodotto]?.nome.toLowerCase()).join(', ')}` : `~${r.proteinePorzione} g of protein · ${r.minuti} min`}
                destra={vietati.length ? <TriangleAlert size={18} color="var(--red)" /> : undefined}
                freccia
                onClick={() => apriRicetta(r.id)}
              />
            )
          })}
        </Lista>
      </Sezione>

      <FoglioRicetta stato={foglio?.tipo === 'ricetta' ? foglio : null} onChiudi={chiudi} inizioSettimana={inizio} />
      <FoglioPianifica aperto={foglio?.tipo === 'pianifica'} inizio={inizio} onChiudi={chiudi} />
      <FoglioGeneraSpesa aperto={foglio?.tipo === 'genera'} inizio={inizio} onChiudi={chiudi} />
      <FoglioSalvaTipo aperto={foglio?.tipo === 'salva'} inizio={inizio} onChiudi={chiudi} />
    </Pagina>
  )
}

/** "Pasta pollo… ×2, Riso… ×1" in breve */
function riassunto(voci, ricettePerId) {
  return voci
    .map((v) => `${ricettePerId[v.ricetta]?.nome || 'Recipe'}${v.volte > 1 ? ` ×${v.volte}` : ''}`)
    .join(', ')
}
