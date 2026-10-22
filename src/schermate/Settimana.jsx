// Fogli della settimana di ricette: scegliere le ricette, generare la spesa, salvare la settimana tipo.
import { useEffect, useMemo, useState } from 'preact/hooks'
import { Foglio } from '../components/Foglio.jsx'
import { Card } from '../components/Card.jsx'
import { Sezione, Lista, Riga, Stepper } from '../components/Lista.jsx'
import { Spunta } from '../components/Spunta.jsx'
import { mostraMessaggio, chiediConferma } from '../components/Avvisi.jsx'
import { Check, CircleX, TriangleAlert } from '../components/icone.js'
import { useNav } from '../navigazione.jsx'
import { useDati } from '../db/dati.js'
import { useCatalogo, REPARTI } from '../db/catalogo.js'
import { useRicette, ingredientiEsclusi } from '../db/ricette.js'
import {
  pianoDi,
  impostaVolte,
  sostituisciVoci,
  frequenzeRicette,
  impostaGiri,
  segnaGenerata,
  salvaSettimanaTipo,
  eliminaSettimanaTipo,
} from '../db/piani.js'
import { aggiungi, segnaDispensa } from '../db/spesa.js'
import { calcolaSpesa } from '../lib/generaSpesa.js'
import { vibra } from '../lib/tocco.js'
import { formatoMomento } from '../lib/giornata.js'

const perIdDi = (elenco) => Object.fromEntries(elenco.map((x) => [x.id, x]))

// ---------------------------------------------------------------------------
// Scegli le ricette
// ---------------------------------------------------------------------------

export function FoglioPianifica({ aperto, inizio, onChiudi }) {
  const { piani, settimaneTipo, impostazioni } = useDati()
  const ricette = useRicette()
  const catalogo = useCatalogo()
  const perId = perIdDi(catalogo)
  const piano = pianoDi(piani, inizio)
  const volteDi = (id) => piano?.voci.find((v) => v.ricetta === id)?.volte || 0
  const sessioni = (piano?.voci || []).reduce((t, v) => t + v.volte, 0)

  // Ordine stabile mentre il foglio è aperto: prima le ricette che cucino più spesso
  const ordine = useMemo(() => {
    const conti = frequenzeRicette(piani)
    return ricette
      .filter((r) => !r.nascosta)
      .sort((a, b) => (conti[b.id] || 0) - (conti[a.id] || 0) || a.nome.localeCompare(b.nome, 'en'))
      .map((r) => ({ ...r, cucinata: conti[r.id] || 0 }))
  }, [aperto, ricette.length])

  const usaTipo = async (t) => {
    if (piano?.voci.length) {
      const ok = await chiediConferma({
        titolo: `Use “${t.nome}”?`,
        testo: 'The recipes chosen for this week will be replaced.',
        conferma: 'Use',
      })
      if (!ok) return
    }
    sostituisciVoci(inizio, t.voci)
    mostraMessaggio(`“${t.nome}” applied`)
  }

  const eliminaTipo = async (t) => {
    const ok = await chiediConferma({ titolo: `Delete “${t.nome}”?`, testo: 'Weeks you’ve already planned don’t change.', conferma: 'Delete', distruttiva: true })
    if (ok) eliminaSettimanaTipo(t.id)
  }

  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo="Recipes for the week" grande>
      <div class="tint-cibo">
        <Card class="riepilogo-settimana">
          <div>
            <span class="num">{sessioni}</span>
            <span class="t-footnote c-label-2">sessions</span>
          </div>
          <div>
            <span class="num">{sessioni * 2}</span>
            <span class="t-footnote c-label-2">portions</span>
          </div>
          <div>
            <span class="num">{piano?.voci.length || 0}</span>
            <span class="t-footnote c-label-2">recipes</span>
          </div>
        </Card>
        <p class="sezione-piede">
          Each session = main meal + lunchbox. With {impostazioni.nottiSettimana} work nights, 3–4 recipes are enough,
          cooked 1–2 times each.
        </p>

        {settimaneTipo.length > 0 && (
          <Sezione titolo="Saved weeks">
            <Lista>
              {settimaneTipo.map((t) => (
                <Riga
                  key={t.id}
                  titolo={t.nome}
                  sottotitolo={`${t.voci.reduce((n, v) => n + v.volte, 0)} sessions · saved on ${formatoMomento(t.creata)}`}
                  destra={
                    <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <button class="pulsante piccolo tinta" onClick={() => usaTipo(t)}>
                        Use
                      </button>
                      <button class="nav-pulsante" aria-label={`Delete ${t.nome}`} onClick={() => eliminaTipo(t)} style={{ color: 'var(--label-3)' }}>
                        <CircleX size={20} />
                      </button>
                    </span>
                  }
                />
              ))}
            </Lista>
          </Sezione>
        )}

        <Sezione titolo="Recipes" piede="The ones you cook most often come first.">
          <Lista>
            {ordine.map((r) => {
              const volte = volteDi(r.id)
              const vietati = ingredientiEsclusi(r.ingredienti, impostazioni.cibiEsclusi, perId)
              return (
                <Riga
                  key={r.id}
                  titolo={r.nome}
                  sottotitolo={
                    vietati.length
                      ? `Contains ${vietati.map((i) => perId[i.prodotto]?.nome.toLowerCase()).join(', ')}`
                      : r.cucinata
                        ? `Cooked ${r.cucinata} ${r.cucinata === 1 ? 'time' : 'times'}`
                        : `~${r.proteinePorzione} g of protein · ${r.minuti} min`
                  }
                  destra={
                    <>
                      {vietati.length > 0 && <TriangleAlert size={16} color="var(--red)" />}
                      <span class="riga-valore num" style={{ minWidth: 14, color: volte ? 'var(--tint)' : undefined }}>
                        {volte}
                      </span>
                      <Stepper
                        valore={volte}
                        min={0}
                        max={4}
                        onChange={(n) => {
                          vibra()
                          impostaVolte(inizio, r.id, n)
                        }}
                      />
                    </>
                  }
                />
              )
            })}
          </Lista>
        </Sezione>
        <div class="foglio-azioni">
          <button class="pulsante pieno" onClick={onChiudi}>
            Done
          </button>
        </div>
      </div>
    </Foglio>
  )
}

// ---------------------------------------------------------------------------
// Genera lista della spesa
// ---------------------------------------------------------------------------

export function FoglioGeneraSpesa({ aperto, inizio, onChiudi }) {
  const nav = useNav()
  const { piani, meta } = useDati()
  const ricette = useRicette()
  const catalogo = useCatalogo()
  const piano = pianoDi(piani, inizio)
  const [giro, setGiro] = useState(1)

  useEffect(() => {
    if (aperto && piano) setGiro(piano.giri === 2 && piano.generata?.[1] && !piano.generata?.[2] ? 2 : 1)
  }, [aperto])

  if (!piano) return <Foglio aperto={false} onChiudi={onChiudi} titolo="" />

  const dispensaFinita = meta.dispensaFinita || {}
  const risultato = calcolaSpesa({
    piano,
    ricettePerId: perIdDi(ricette),
    perId: perIdDi(catalogo),
    dispensaFinita,
    giro: piano.giri === 2 ? giro : 1,
  })
  const posizione = Object.fromEntries(REPARTI.map((r, i) => [r.id, i]))
  const voci = [...risultato.voci].sort(
    (a, b) => (posizione[a.prodotto.reparto] ?? 99) - (posizione[b.prodotto.reparto] ?? 99) || a.prodotto.nome.localeCompare(b.prodotto.nome, 'en'),
  )

  const genera = () => {
    const n = aggiungi(
      voci.map((v) => ({ prodotto: v.prodotto, quantita: v.quantita })),
      { aggiornaQuantita: true },
    )
    segnaGenerata(inizio, piano.giri === 2 ? giro : 1)
    vibra()
    onChiudi()
    nav.vaiATab('spesa')
    mostraMessaggio(n ? `${n} items added to the list` : 'List updated')
  }

  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo="Make the shopping list" grande>
      <div class="tint-cibo">
        <p class="foglio-spiegazione">
          Ingredients for {risultato.sessioni} cooking {risultato.sessioni === 1 ? 'session' : 'sessions'}, plus breakfast and snack for 7
          days, rounded up to real packs.
        </p>

        {risultato.sessioni >= 4 && (
          <Sezione titolo="Shopping trips" piede="With two trips, fresh meat and vegetables don’t go off: on the second trip you buy those for the second half of the week.">
            <Lista>
              <Riga
                titolo="One trip"
                destra={piano.giri !== 2 ? <Check size={20} class="scelta-segno" /> : undefined}
                onClick={() => impostaGiri(inizio, 1)}
              />
              <Riga
                titolo="Two trips"
                destra={piano.giri === 2 ? <Check size={20} class="scelta-segno" /> : undefined}
                onClick={() => impostaGiri(inizio, 2)}
              />
            </Lista>
            {piano.giri === 2 && (
              <div style={{ marginTop: 12 }}>
                <Lista>
                  {[1, 2].map((g) => (
                    <Riga
                      key={g}
                      titolo={g === 1 ? '1st trip: breakfast, pantry and first half' : '2nd trip: fresh food for the second half'}
                      sottotitolo={piano.generata?.[g] ? `Already made on ${formatoMomento(piano.generata[g])}` : undefined}
                      destra={giro === g ? <Check size={20} class="scelta-segno" /> : undefined}
                      onClick={() => setGiro(g)}
                    />
                  ))}
                </Lista>
              </div>
            )}
          </Sezione>
        )}

        {risultato.dispensa.length > 0 && (
          <Sezione titolo="Pantry: what has run out?" piede="Tap what has run out or is running low: it goes on the list. After “Done shopping” it resets by itself.">
            <Lista>
              {risultato.dispensa.map(({ prodotto, finita }) => (
                <div
                  class="riga voce"
                  key={prodotto.id}
                  role="checkbox"
                  aria-checked={finita}
                  onClick={() => {
                    vibra()
                    segnaDispensa(prodotto.id, !finita)
                  }}
                >
                  <Spunta attiva={finita} />
                  <span class="riga-contenuto">
                    <span class="riga-testi">
                      <span class="riga-titolo">{prodotto.nome}</span>
                      <span class="riga-sottotitolo">{finita ? 'Run out: to buy' : 'Got it'}</span>
                    </span>
                  </span>
                </div>
              ))}
            </Lista>
          </Sezione>
        )}

        <Sezione titolo={`To buy · ${voci.length} items`}>
          <Lista>
            {voci.map((v) => (
              <Riga key={v.prodotto.id} titolo={v.prodotto.nome} sottotitolo={[v.quantita, v.serve].filter(Boolean).join(' · ') || undefined} />
            ))}
          </Lista>
        </Sezione>

        <div class="foglio-azioni">
          <button class="pulsante pieno" disabled={!voci.length} onClick={genera}>
            Add {voci.length} items to the list
          </button>
        </div>
      </div>
    </Foglio>
  )
}

// ---------------------------------------------------------------------------
// Salva come settimana tipo
// ---------------------------------------------------------------------------

export function FoglioSalvaTipo({ aperto, inizio, onChiudi }) {
  const { piani, settimaneTipo } = useDati()
  const piano = pianoDi(piani, inizio)
  const [nome, setNome] = useState('')

  useEffect(() => {
    if (aperto) setNome(`Saved week ${settimaneTipo.length + 1}`)
  }, [aperto])

  const salva = () => {
    salvaSettimanaTipo(nome, piano.voci)
    mostraMessaggio('Week saved')
    onChiudi()
  }

  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo="Save this week">
      <div class="tint-cibo">
        <p class="foglio-spiegazione">This week’s recipes (with your swaps) can be reused with one tap.</p>
        <Sezione>
          <Lista>
            <Riga titolo="Name" destra={<input class="riga-campo" value={nome} onInput={(e) => setNome(e.currentTarget.value)} />} />
          </Lista>
        </Sezione>
        <div class="foglio-azioni">
          <button class="pulsante pieno" disabled={!piano?.voci.length} onClick={salva}>
            Save
          </button>
        </div>
      </div>
    </Foglio>
  )
}
