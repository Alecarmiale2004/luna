// Scheda ricetta (foglio dal basso): dati, ingredienti per 2 porzioni con lo scambio
// di un blocco (es. pollo → tacchino), porzioni, procedimento, aggiunta alla settimana.
import { useEffect, useRef, useState } from 'preact/hooks'
import { Foglio } from '../components/Foglio.jsx'
import { Sezione, Lista, Riga, MenuValore, Stepper } from '../components/Lista.jsx'
import { mostraMessaggio } from '../components/Avvisi.jsx'
import { TriangleAlert } from '../components/icone.js'
import { useDati } from '../db/dati.js'
import { useCatalogo } from '../db/catalogo.js'
import {
  useRicette,
  applicaScambi,
  opzioniScambio,
  ingredientiEsclusi,
  testoQuantita,
  BLOCCHI,
  BLOCCHI_SCAMBIABILI,
} from '../db/ricette.js'
import { pianoDi, impostaVolte, impostaScambio } from '../db/piani.js'
import { etichettaSettimana, useOggi } from '../lib/giornata.js'
import PASTI from '../data/pasti.json'

/** stato: { id, voce, inizio } oppure null (chiuso) */
export function FoglioRicetta({ stato, onChiudi, inizioSettimana }) {
  // Mantiene il contenuto durante l'animazione di chiusura
  const ultimo = useRef(stato)
  if (stato) ultimo.current = stato
  const s = stato || ultimo.current

  const { piani, impostazioni } = useDati()
  const ricette = useRicette()
  const catalogo = useCatalogo()
  const oggi = useOggi()
  const perId = Object.fromEntries(catalogo.map((p) => [p.id, p]))
  const [scambiProva, setScambiProva] = useState({}) // scambi provati prima di aggiungere alla settimana

  useEffect(() => {
    if (stato) setScambiProva({})
  }, [stato?.id, stato?.voce])

  const ricetta = s && ricette.find((r) => r.id === s.id)
  if (!ricetta) return <Foglio aperto={false} onChiudi={onChiudi} titolo="" />

  const inizio = s.inizio || inizioSettimana
  const piano = pianoDi(piani, inizio)
  const voce = piano?.voci.find((v) => (s.voce ? v.id === s.voce : v.ricetta === ricetta.id)) || null
  const scambi = voce ? voce.scambi : scambiProva
  const applicata = applicaScambi(ricetta, scambi, perId)
  const vietati = ingredientiEsclusi(applicata.ingredienti, impostazioni.cibiEsclusi, perId)

  const scambia = (da, a) => {
    if (voce) impostaScambio(inizio, voce.id, da, a)
    else setScambiProva((x) => ({ ...x, [da]: a }))
  }

  const base = applicata.ingredienti.find((i) => i.blocco === 'base')
  const settimana = etichettaSettimana(inizio, oggi).toLowerCase()

  return (
    <Foglio aperto={!!stato} onChiudi={onChiudi} titolo={ricetta.nome} grande>
      <div class="tint-cibo">
        <div class="ricetta-dati">
          <div class="ricetta-dato">
            <span class="num">~{applicata.proteinePorzione} g</span>
            <span>proteine a porzione</span>
          </div>
          <div class="ricetta-dato">
            <span class="num">{ricetta.minuti}′</span>
            <span>minuti</span>
          </div>
          <div class="ricetta-dato">
            <span class="num">2</span>
            <span>porzioni</span>
          </div>
        </div>

        {vietati.length > 0 && (
          <p class="avviso-esclusi">
            <TriangleAlert size={18} strokeWidth={2.4} style={{ marginTop: 1 }} />
            Contiene cibi che hai escluso: {vietati.map((i) => perId[i.prodotto]?.it).join(', ')}. Puoi scambiarli qui sotto.
          </p>
        )}

        {BLOCCHI.map((b) => {
          const ingredienti = applicata.ingredienti.filter((i) => i.blocco === b.id)
          if (!ingredienti.length) return null
          const scambiabile = BLOCCHI_SCAMBIABILI.includes(b.id)
          return (
            <Sezione
              key={b.id}
              titolo={b.id === 'base' ? `${b.nome} · per 2 porzioni` : b.nome}
              piede={b.id === 'proteina' && !voce ? 'Tocca un ingrediente per scambiarlo: le quantità si adattano da sole.' : undefined}
            >
              <Lista>
                {ingredienti.map((ing) => {
                  const prodotto = perId[ing.prodotto]
                  const originale = ing.originale || ing.prodotto
                  const opzioni = scambiabile ? opzioniScambio(b.id, impostazioni.cibiEsclusi, perId) : []
                  if (scambiabile && !opzioni.some((o) => o.id === originale) && perId[originale]) opzioni.unshift(perId[originale])
                  const nota = [ing.originale && `al posto di ${perId[ing.originale]?.it.toLowerCase()}`, ing.nota, ing.facoltativo && 'facoltativo']
                    .filter(Boolean)
                    .join(' · ')
                  return (
                    <Riga
                      key={originale}
                      titolo={prodotto?.it || ing.prodotto}
                      sottotitolo={nota || undefined}
                      destra={
                        scambiabile && opzioni.length > 1 ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span class="riga-valore">{testoQuantita(ing, prodotto)}</span>
                            <MenuValore
                              soloIcona
                              valore={ing.prodotto}
                              opzioni={opzioni.map((o) => ({ valore: o.id, etichetta: o.it }))}
                              onChange={(a) => scambia(originale, a)}
                            />
                          </span>
                        ) : (
                          <span class="riga-valore">{testoQuantita(ing, prodotto)}</span>
                        )
                      }
                    />
                  )
                })}
              </Lista>
            </Sezione>
          )
        })}

        <Sezione titolo="Porzioni">
          <Lista>
            <Riga
              titolo="Pasto principale"
              sottotitolo={base ? `${base.unita === 'g' ? Math.round(base.quantita / 1.7) : '—'} g di ${perId[base.prodotto]?.it.toLowerCase()}, metà di proteina e verdura` : 'Metà della ricetta'}
              valore={`~${applicata.proteinePorzione} g`}
            />
            <Riga
              titolo="Schiscetta"
              sottotitolo={`${PASTI.schiscetta.riduzioneBaseGrammi} g di base in meno: più leggera da digerire di notte`}
              valore={`~${Math.round(applicata.proteinePorzione - (PASTI.schiscetta.riduzioneBaseGrammi * (perId[base?.prodotto]?.proteine100 || 0)) / 100)} g`}
            />
          </Lista>
        </Sezione>

        {ricetta.procedimento && (
          <Sezione titolo="Procedimento">
            <p class="testo-card">{ricetta.procedimento}</p>
          </Sezione>
        )}

        <Sezione titolo={`Nel piano · ${settimana}`}>
          <Lista>
            <Riga
              titolo={voce ? 'Volte in settimana' : 'Non ancora in programma'}
              destra={
                voce ? (
                  <>
                    <span class="riga-valore num">{voce.volte}</span>
                    <Stepper valore={voce.volte} min={0} max={4} onChange={(n) => impostaVolte(inizio, ricetta.id, n)} />
                  </>
                ) : undefined
              }
            />
          </Lista>
        </Sezione>
        {!voce && (
          <div class="foglio-azioni">
            <button
              class="pulsante pieno"
              onClick={() => {
                impostaVolte(inizio, ricetta.id, 1, scambiProva)
                mostraMessaggio(`Aggiunta a ${settimana}`)
              }}
            >
              Aggiungi alla settimana
            </button>
          </div>
        )}
      </div>
    </Foglio>
  )
}
