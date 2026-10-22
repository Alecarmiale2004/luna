// Parti della sezione Cibo usate anche nella schermata Oggi:
// "il cibo di oggi" (ricetta del giorno, pasti, proteine) e le card relative.
import { useMemo } from 'preact/hooks'
import { Card, CardTesta } from '../components/Card.jsx'
import { Anello } from '../components/Anello.jsx'
import { Spunta } from '../components/Spunta.jsx'
import { CookingPot, Beef, Egg, Check } from '../components/icone.js'
import { useNav } from '../navigazione.jsx'
import { useDati, segnaPasto } from '../db/dati.js'
import { useCatalogo } from '../db/catalogo.js'
import { useRicette, applicaScambi } from '../db/ricette.js'
import { pianoDi, ricettaDelGiorno, segnaCucinata, annullaCucinata, cucinateDi } from '../db/piani.js'
import { lunediDi } from '../lib/giornata.js'
import { useGiornataPasti, schemaPasti, proteineFatte } from '../lib/pasti.js'
import { vibra } from '../lib/tocco.js'
import './cibo.css'

/** Tutto ciò che serve per "oggi" in cucina, calcolato in un punto solo */
export function useCiboDiOggi() {
  const { impostazioni, giorni, piani } = useDati()
  const catalogo = useCatalogo()
  const ricette = useRicette()
  const giornata = useGiornataPasti(impostazioni.fineTurno)
  const perId = useMemo(() => Object.fromEntries(catalogo.map((p) => [p.id, p])), [catalogo])
  const ricettePerId = useMemo(() => Object.fromEntries(ricette.map((r) => [r.id, r])), [ricette])

  const inizio = lunediDi(giornata)
  const piano = pianoDi(piani, inizio)
  const delGiorno = ricettaDelGiorno(piano, giornata)
  const ricetta = delGiorno && ricettePerId[delGiorno.voce.ricetta]
  const applicata = ricetta ? applicaScambi(ricetta, delGiorno.voce.scambi, perId) : null
  const lavoro = giorni[giornata]?.tipo === 'lavoro'
  const fatti = giorni[giornata]?.pasti || {}
  const schema = schemaPasti({ impostazioni, lavoro, ricetta: applicata, perId })
  const proteine = proteineFatte(schema, fatti)

  return {
    giornata,
    inizio,
    piano,
    delGiorno,
    ricetta: applicata,
    lavoro,
    fatti,
    schema,
    proteine,
    obiettivo: impostazioni.obiettivoProteine,
    perId,
    ricettePerId,
  }
}

/** Segna un pasto (salva l'ora: servirà per l'allenamento dopo la colazione) */
export function alternaPasto(giornata, pasto, fatto) {
  vibra()
  segnaPasto(giornata, pasto, fatto ? new Date().toISOString() : false)
}

// ---------------------------------------------------------------------------

export function CardColazione() {
  const { giornata, schema, fatti } = useCiboDiOggi()
  const colazione = schema.find((p) => p.id === 'colazione')
  const fatta = !!fatti.colazione
  return (
    <div class="sezione tint-cibo">
      <Card class="card-pasto">
        <CardTesta icona={Egg} titolo="Breakfast" dettaglio={fatta ? 'done' : `at ${colazione.ora}`} />
        <div class="pasto-riga" onClick={() => alternaPasto(giornata, 'colazione', !fatta)}>
          <div class="pasto-testi">
            <p class={`t-headline${fatta ? ' c-label-3' : ''}`}>{fatta ? 'Breakfast done' : 'Had breakfast?'}</p>
            <p class="t-subheadline c-label-2">{colazione.descrizione}</p>
          </div>
          <Spunta attiva={fatta} />
        </div>
      </Card>
    </div>
  )
}

/** onApriRicetta: nella sezione Cibo apre la scheda; in Oggi la card porta alla sezione Cibo */
export function CardDaCucinare({ onApriRicetta }) {
  const dalCibo = !!onApriRicetta
  const nav = useNav()
  const { giornata, inizio, piano, delGiorno, ricetta, lavoro } = useCiboDiOggi()

  if (!delGiorno) {
    if (dalCibo) return null
    return (
      <div class="sezione tint-cibo">
        <Card onClick={() => nav.vaiATab('cibo')}>
          <CardTesta icona={CookingPot} titolo="To cook" freccia />
          <p class="t-headline">{piano?.voci.length ? 'Week completed' : 'No recipes planned'}</p>
          <p class="t-subheadline c-label-2">
            {piano?.voci.length ? 'You’ve cooked all of this week’s recipes.' : 'Choose this week’s recipes in the Food section.'}
          </p>
        </Card>
      </div>
    )
  }

  const { voce, fatta } = delGiorno
  const quante = cucinateDi(piano, voce.id)
  return (
    <div class="sezione tint-cibo">
      <Card class="card-cucina">
        <CardTesta
          icona={CookingPot}
          titolo={fatta ? 'Cooked today' : 'To cook today'}
          dettaglio={voce.volte > 1 ? `${Math.min(quante + (fatta ? 0 : 1), voce.volte)} of ${voce.volte}` : undefined}
        />
        <button class="cucina-ricetta" onClick={() => (dalCibo ? onApriRicetta(voce) : nav.vaiATab('cibo'))}>
          <p class={`t-title3${fatta ? ' c-label-2' : ''}`}>{ricetta.nome}</p>
          <p class="t-subheadline c-label-2">
            {lavoro ? 'Main meal + lunchbox for your shift' : 'Main meal + second meal at home'} · {ricetta.minuti} min · ~
            {ricetta.proteinePorzione} g of protein
          </p>
        </button>
        <button
          class={`pulsante ${fatta ? 'grigio' : 'pieno'}`}
          style={{ marginTop: 14 }}
          onClick={() => {
            vibra()
            fatta ? annullaCucinata(inizio, giornata) : segnaCucinata(inizio, voce.id, giornata)
          }}
        >
          {fatta ? (
            <>
              <Check size={20} strokeWidth={2.6} /> Cooked
            </>
          ) : (
            'Mark as cooked'
          )}
        </button>
      </Card>
    </div>
  )
}

export function CardProteine({ conPasti = false }) {
  const nav = useNav()
  const { proteine, obiettivo, schema, fatti, giornata } = useCiboDiOggi()
  const mancano = Math.max(0, obiettivo - proteine)
  const contenuto = (
    <>
      <CardTesta icona={Beef} titolo="Protein" freccia={!conPasti} />
      <div class="proteine">
        <Anello valore={proteine / obiettivo} dimensione={96} spessore={14} etichetta={`${proteine} grams of ${obiettivo}`}>
          <span class="proteine-percento num">{Math.round((proteine / obiettivo) * 100)}%</span>
        </Anello>
        <div>
          <p>
            <span class="t-title1 num">{proteine}</span>
            <span class="t-headline c-label-2"> / {obiettivo} g</span>
          </p>
          <p class="t-subheadline c-label-2">{mancano ? `~${mancano} g to go` : 'Goal reached!'}</p>
        </div>
      </div>
    </>
  )
  return (
    <div class="sezione tint-cibo">
      {conPasti ? (
        <Card>
          {contenuto}
          <div class="pasti">
            {schema.map((p) => (
              <div class="pasto" key={p.id} onClick={() => alternaPasto(giornata, p.id, !fatti[p.id])}>
                <Spunta attiva={!!fatti[p.id]} />
                <div class="pasto-testi">
                  <p class={`t-body${fatti[p.id] ? ' c-label-3' : ''}`}>
                    <span class="pasto-ora num">{p.ora}</span> {p.nome}
                  </p>
                  <p class="t-footnote c-label-2">{p.descrizione}</p>
                </div>
                <span class="pasto-proteine num">{p.proteine != null ? `${p.proteine} g` : '—'}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card onClick={() => nav.vaiATab('cibo')}>{contenuto}</Card>
      )}
    </div>
  )
}
