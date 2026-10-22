// Anteprima del sistema di stile: testi, colori e componenti in un'unica pagina.
// Serve per controllare l'aspetto (anche nel tema scuro) senza aspettare le prossime fasi.
import { useState } from 'preact/hooks'
import { Pagina, PulsanteIndietro } from '../components/Pagina.jsx'
import { Card, CardTesta } from '../components/Card.jsx'
import { Sezione, Lista, Riga } from '../components/Lista.jsx'
import { Anello } from '../components/Anello.jsx'
import { Spunta } from '../components/Spunta.jsx'
import { Foglio } from '../components/Foglio.jsx'
import { mostraMessaggio } from '../components/Avvisi.jsx'
import { Beef, ShoppingCart, Corsa } from '../components/icone.js'
import { useNav } from '../navigazione.jsx'

const TESTI = [
  ['t-large-title', 'Large Title'],
  ['t-title1', 'Title 1'],
  ['t-title2', 'Title 2'],
  ['t-title3', 'Title 3'],
  ['t-headline', 'Headline'],
  ['t-body', 'Body'],
  ['t-callout', 'Callout'],
  ['t-subheadline', 'Subheadline'],
  ['t-footnote', 'Footnote'],
  ['t-caption1', 'Caption 1'],
  ['t-caption2', 'Caption 2'],
]

const COLORI = [
  ['Today', 'var(--c-oggi)'],
  ['Food', 'var(--c-cibo)'],
  ['Shopping', 'var(--c-spesa)'],
  ['Training', 'var(--c-allenamento)'],
  ['Accent', 'var(--blue)'],
  ['Error', 'var(--red)'],
]

const PRODOTTI = [
  ['Cherry tomatoes', 'Cherrytomater'],
  ['Chicken breast', 'Kyllingebryst'],
  ['Plain yoghurt', 'Yoghurt naturel'],
]

export function AnteprimaStile() {
  const nav = useNav()
  const [spunte, setSpunte] = useState({ 'Cherry tomatoes': true })
  const [foglio, setFoglio] = useState(false)
  const [proteine, setProteine] = useState(72)

  return (
    <Pagina titolo="Style" sinistra={<PulsanteIndietro etichetta="Settings" onClick={nav.indietro} />}>
      <Sezione titolo="Text">
        <Card>
          {TESTI.map(([classe, nome]) => (
            <p key={classe} class={classe} style={{ marginBottom: 4 }}>
              {nome}
            </p>
          ))}
          <p class="t-body c-label-2">Secondary Label</p>
          <p class="t-body c-label-3">Tertiary Label</p>
          <p class="t-title1 num" style={{ marginTop: 8 }}>
            01:30 · 100 g
          </p>
        </Card>
      </Sezione>

      <Sezione titolo="Section colours">
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {COLORI.map(([nome, colore]) => (
              <div key={nome} style={{ textAlign: 'center' }}>
                <div style={{ height: 44, borderRadius: 10, background: colore }} />
                <p class="t-caption1 c-label-2" style={{ marginTop: 4 }}>
                  {nome}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </Sezione>

      <Sezione titolo="Card with ring" piede="Tap the card to move the ring forward.">
        <div class="tint-cibo">
          <Card onClick={() => setProteine((p) => (p >= 100 ? 20 : p + 20))}>
            <CardTesta icona={Beef} titolo="Protein" dettaglio="today" freccia />
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <Anello valore={proteine / 100} dimensione={96} spessore={13} etichetta={`${proteine} grams of 100`} />
              <div>
                <p>
                  <span class="t-title1 num">{proteine}</span>
                  <span class="t-headline c-label-2"> / 100 g</span>
                </p>
                <p class="t-subheadline c-label-2">{Math.max(0, 100 - proteine)} g to reach the goal</p>
              </div>
            </div>
          </Card>
        </div>
      </Sezione>

      <Sezione titolo="Check circles">
        <div class="tint-spesa">
          <Lista>
            {PRODOTTI.map(([it, dk]) => (
              <div class="riga" key={it} style={{ paddingLeft: 4 }} onClick={() => setSpunte((s) => ({ ...s, [it]: !s[it] }))}>
                <Spunta attiva={!!spunte[it]} etichetta={it} onChange={(v) => setSpunte((s) => ({ ...s, [it]: v }))} />
                <span class="riga-contenuto">
                  <span class="riga-testi" style={spunte[it] ? { textDecoration: 'line-through', color: 'var(--label-3)' } : null}>
                    <span class="riga-titolo">{it}</span>
                    <span class="riga-sottotitolo" style={spunte[it] ? { color: 'var(--label-3)' } : null}>
                      {dk}
                    </span>
                  </span>
                </span>
              </div>
            ))}
          </Lista>
        </div>
      </Sezione>

      <Sezione titolo="Buttons">
        <div class="tint-allenamento" style={{ display: 'grid', gap: 12, padding: '0 16px' }}>
          <button class="pulsante pieno" onClick={() => setFoglio(true)}>
            <Corsa size={22} /> Open a bottom sheet
          </button>
          <button class="pulsante tinta" onClick={() => mostraMessaggio('Done!')}>
            Show a message
          </button>
          <button class="pulsante grigio">Grey button</button>
          <button class="pulsante distruttivo">Delete</button>
        </div>
      </Sezione>

      <Sezione titolo="List">
        <Lista>
          <Riga icona={ShoppingCart} coloreIcona="var(--green)" titolo="Row with icon" valore="Value" freccia onClick={() => {}} />
          <Riga titolo="Row with subtitle" sottotitolo="Secondary detail" />
          <Riga titolo="Action" tipo="azione" onClick={() => {}} />
          <Riga titolo="Destructive action" tipo="distruttiva" onClick={() => {}} />
        </Lista>
      </Sezione>

      <Foglio aperto={foglio} onChiudi={() => setFoglio(false)} titolo="Strength day">
        <div class="tint-allenamento">
          <p class="foglio-spiegazione">
            Example bottom sheet. Close it with the X, by tapping outside or by dragging it down.
          </p>
          <Sezione titolo="Exercises">
            <Lista>
              <Riga titolo="Wall handstand push-ups" valore="3 × 5" />
              <Riga titolo="Bodyweight squats" valore="3 × 12–15" />
              <Riga titolo="Plank" valore="3 × 30 s" />
            </Lista>
          </Sezione>
          <div class="foglio-azioni">
            <button class="pulsante pieno" onClick={() => setFoglio(false)}>
              Start
            </button>
          </div>
        </div>
      </Foglio>
    </Pagina>
  )
}
