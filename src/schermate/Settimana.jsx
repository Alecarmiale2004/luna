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
      .sort((a, b) => (conti[b.id] || 0) - (conti[a.id] || 0) || a.nome.localeCompare(b.nome, 'it'))
      .map((r) => ({ ...r, cucinata: conti[r.id] || 0 }))
  }, [aperto, ricette.length])

  const usaTipo = async (t) => {
    if (piano?.voci.length) {
      const ok = await chiediConferma({
        titolo: `Usare «${t.nome}»?`,
        testo: 'Le ricette scelte per questa settimana vengono sostituite.',
        conferma: 'Usa',
      })
      if (!ok) return
    }
    sostituisciVoci(inizio, t.voci)
    mostraMessaggio(`Settimana «${t.nome}» applicata`)
  }

  const eliminaTipo = async (t) => {
    const ok = await chiediConferma({ titolo: `Eliminare «${t.nome}»?`, testo: 'Le settimane già pianificate non cambiano.', conferma: 'Elimina', distruttiva: true })
    if (ok) eliminaSettimanaTipo(t.id)
  }

  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo="Ricette della settimana" grande>
      <div class="tint-cibo">
        <Card class="riepilogo-settimana">
          <div>
            <span class="num">{sessioni}</span>
            <span class="t-footnote c-label-2">sessioni</span>
          </div>
          <div>
            <span class="num">{sessioni * 2}</span>
            <span class="t-footnote c-label-2">porzioni</span>
          </div>
          <div>
            <span class="num">{piano?.voci.length || 0}</span>
            <span class="t-footnote c-label-2">ricette</span>
          </div>
        </Card>
        <p class="sezione-piede">
          Ogni sessione = pasto principale + schiscetta. Con {impostazioni.nottiSettimana} notti di lavoro bastano 3–4 ricette,
          cucinate 1–2 volte.
        </p>

        {settimaneTipo.length > 0 && (
          <Sezione titolo="Settimane tipo">
            <Lista>
              {settimaneTipo.map((t) => (
                <Riga
                  key={t.id}
                  titolo={t.nome}
                  sottotitolo={`${t.voci.reduce((n, v) => n + v.volte, 0)} sessioni · salvata il ${formatoMomento(t.creata)}`}
                  destra={
                    <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <button class="pulsante piccolo tinta" onClick={() => usaTipo(t)}>
                        Usa
                      </button>
                      <button class="nav-pulsante" aria-label={`Elimina ${t.nome}`} onClick={() => eliminaTipo(t)} style={{ color: 'var(--label-3)' }}>
                        <CircleX size={20} />
                      </button>
                    </span>
                  }
                />
              ))}
            </Lista>
          </Sezione>
        )}

        <Sezione titolo="Ricette" piede="Le prime sono quelle che cucini più spesso.">
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
                      ? `Contiene ${vietati.map((i) => perId[i.prodotto]?.it.toLowerCase()).join(', ')}`
                      : r.cucinata
                        ? `Cucinata ${r.cucinata} ${r.cucinata === 1 ? 'volta' : 'volte'}`
                        : `~${r.proteinePorzione} g di proteine · ${r.minuti} min`
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
            Fatto
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
    (a, b) => (posizione[a.prodotto.reparto] ?? 99) - (posizione[b.prodotto.reparto] ?? 99) || a.prodotto.it.localeCompare(b.prodotto.it, 'it'),
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
    mostraMessaggio(n ? `${n} prodotti aggiunti alla lista` : 'Lista aggiornata')
  }

  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo="Genera la spesa" grande>
      <div class="tint-cibo">
        <p class="foglio-spiegazione">
          Ingredienti di {risultato.sessioni} {risultato.sessioni === 1 ? 'sessione' : 'sessioni'} di cucina, più colazione e spuntino per 7
          giorni, arrotondati alle confezioni.
        </p>

        {risultato.sessioni >= 4 && (
          <Sezione titolo="Giri di spesa" piede="Con due giri carne e verdura fresche non scadono: nel secondo giro compri quelle per la seconda metà della settimana.">
            <Lista>
              <Riga
                titolo="Un giro solo"
                destra={piano.giri !== 2 ? <Check size={20} class="scelta-segno" /> : undefined}
                onClick={() => impostaGiri(inizio, 1)}
              />
              <Riga
                titolo="Due giri"
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
                      titolo={g === 1 ? '1° giro: colazione, dispensa e prima metà' : '2° giro: freschi della seconda metà'}
                      sottotitolo={piano.generata?.[g] ? `Già generato il ${formatoMomento(piano.generata[g])}` : undefined}
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
          <Sezione titolo="Dispensa: cosa è finito?" piede="Tocca ciò che è finito o sta per finire: entra in lista. Dopo «Spesa fatta» torna disponibile da solo.">
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
                      <span class="riga-titolo">{prodotto.it}</span>
                      <span class="riga-sottotitolo">{finita ? 'Finito: da comprare' : 'Ce l’ho'}</span>
                    </span>
                  </span>
                </div>
              ))}
            </Lista>
          </Sezione>
        )}

        <Sezione titolo={`Da comprare · ${voci.length} prodotti`}>
          <Lista>
            {voci.map((v) => (
              <Riga key={v.prodotto.id} titolo={v.prodotto.it} sottotitolo={[v.quantita, v.serve].filter(Boolean).join(' · ') || undefined} />
            ))}
          </Lista>
        </Sezione>

        <div class="foglio-azioni">
          <button class="pulsante pieno" disabled={!voci.length} onClick={genera}>
            Aggiungi {voci.length} prodotti alla lista
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
    if (aperto) setNome(`Settimana tipo ${settimaneTipo.length + 1}`)
  }, [aperto])

  const salva = () => {
    salvaSettimanaTipo(nome, piano.voci)
    mostraMessaggio('Settimana tipo salvata')
    onChiudi()
  }

  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo="Salva settimana tipo">
      <div class="tint-cibo">
        <p class="foglio-spiegazione">Le ricette di questa settimana (con gli scambi) si potranno riusare con un tocco.</p>
        <Sezione>
          <Lista>
            <Riga titolo="Nome" destra={<input class="riga-campo" value={nome} onInput={(e) => setNome(e.currentTarget.value)} />} />
          </Lista>
        </Sezione>
        <div class="foglio-azioni">
          <button class="pulsante pieno" disabled={!piano?.voci.length} onClick={salva}>
            Salva
          </button>
        </div>
      </div>
    </Foglio>
  )
}
