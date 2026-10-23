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
    mostraMessaggio('Ricette copiate dalla settimana scorsa')
  }

  return (
    <Pagina titolo="Cibo" sopratitolo={giornata !== oggi ? `Pasti della notte di ${formatoGiorno(giornata)}` : undefined}>
      <CardProteine conPasti />
      <CardDaCucinare onApriRicetta={(voce) => setFoglio({ tipo: 'ricetta', id: voce.ricetta, voce: voce.id, inizio: lunediDi(giornata) })} />

      {/* ---------- Settimana ---------- */}
      <section class="sezione tint-cibo">
        <div class="settimana-cibo-testa">
          <button class="settimana-freccia" aria-label="Settimana precedente" onClick={() => setScarto(scarto - 1)}>
            <ChevronLeft size={22} strokeWidth={2.4} />
          </button>
          <div class="settimana-etichetta">
            <span class="settimana-nome">{etichettaSettimana(inizio, oggi)}</span>
            <span class="settimana-conto">Ricette della settimana</span>
          </div>
          <button class="settimana-freccia" aria-label="Settimana successiva" onClick={() => setScarto(scarto + 1)}>
            <ChevronRight size={22} strokeWidth={2.4} />
          </button>
        </div>

        {voci.length === 0 ? (
          <>
            <Card>
              <p class="t-headline">Nessuna ricetta in programma</p>
              <p class="t-subheadline c-label-2">
                Con {impostazioni.nottiSettimana} notti di lavoro bastano 3–4 ricette, ognuna cucinata 1–2 volte.
              </p>
              <button class="pulsante pieno" style={{ marginTop: 16 }} onClick={() => setFoglio({ tipo: 'pianifica' })}>
                Scegli le ricette
              </button>
            </Card>
            {(pianoPrima?.voci.length > 0 || settimaneTipo.length > 0) && (
              <Sezione titolo="Oppure riparti da">
                <Lista>
                  {pianoPrima?.voci.length > 0 && (
                    <Riga titolo="La settimana scorsa" sottotitolo={riassunto(pianoPrima.voci, ricettePerId)} tipo="azione" onClick={copiaScorsa} />
                  )}
                  {settimaneTipo.map((t) => (
                    <Riga
                      key={t.id}
                      titolo={t.nome}
                      sottotitolo={riassunto(t.voci, ricettePerId)}
                      tipo="azione"
                      onClick={() => {
                        sostituisciVoci(inizio, t.voci)
                        mostraMessaggio(`Settimana «${t.nome}» applicata`)
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
                <span class="t-footnote c-label-2">{sessioni === 1 ? 'sessione' : 'sessioni'}</span>
              </div>
              <div>
                <span class="num">{sessioni * 2}</span>
                <span class="t-footnote c-label-2">porzioni</span>
              </div>
              <div>
                <span class="num">
                  {cucinate}/{sessioni}
                </span>
                <span class="t-footnote c-label-2">cucinate</span>
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
                        ? scambi.map((i) => `${perId[i.prodotto]?.nome} al posto di ${perId[i.originale]?.nome.toLowerCase()}`).join(' · ')
                        : `~${applicata.proteinePorzione} g di proteine · ${r.minuti} min`
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
                Genera lista della spesa
              </button>
            </div>
            <Sezione>
              <Lista>
                <Riga titolo="Modifica le ricette" tipo="azione" onClick={() => setFoglio({ tipo: 'pianifica' })} />
                <Riga titolo="Salva come settimana tipo" tipo="azione" onClick={() => setFoglio({ tipo: 'salva' })} />
              </Lista>
            </Sezione>
          </>
        )}
      </section>

      {/* ---------- Ricettario ---------- */}
      <Sezione titolo="Ricette" piede="Ogni ricetta dà 2 porzioni: il pasto principale e la schiscetta, più leggera.">
        <Lista>
          {visibili.map((r) => {
            const vietati = ingredientiEsclusi(r.ingredienti, esclusi, perId)
            return (
              <Riga
                key={r.id}
                titolo={r.nome}
                sottotitolo={vietati.length ? `Contiene ${vietati.map((i) => perId[i.prodotto]?.nome.toLowerCase()).join(', ')}` : `~${r.proteinePorzione} g di proteine · ${r.minuti} min`}
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
    .map((v) => `${ricettePerId[v.ricetta]?.nome || 'Ricetta'}${v.volte > 1 ? ` ×${v.volte}` : ''}`)
    .join(', ')
}
