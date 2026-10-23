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
  ['Oggi', 'var(--c-oggi)'],
  ['Cibo', 'var(--c-cibo)'],
  ['Spesa', 'var(--c-spesa)'],
  ['Allenamento', 'var(--c-allenamento)'],
  ['Accento', 'var(--blue)'],
  ['Errore', 'var(--red)'],
]

const PRODOTTI = [
  ['Pomodorini', 'Cherrytomater'],
  ['Petto di pollo', 'Kyllingebryst'],
  ['Yogurt bianco', 'Yoghurt naturel'],
]

export function AnteprimaStile() {
  const nav = useNav()
  const [spunte, setSpunte] = useState({ Pomodorini: true })
  const [foglio, setFoglio] = useState(false)
  const [proteine, setProteine] = useState(72)

  return (
    <Pagina titolo="Stile" sinistra={<PulsanteIndietro etichetta="Impostazioni" onClick={nav.indietro} />}>
      <Sezione titolo="Testi">
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

      <Sezione titolo="Colori delle sezioni">
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

      <Sezione titolo="Card con anello" piede="Tocca la card per far avanzare l’anello.">
        <div class="tint-cibo">
          <Card onClick={() => setProteine((p) => (p >= 100 ? 20 : p + 20))}>
            <CardTesta icona={Beef} titolo="Proteine" dettaglio="oggi" freccia />
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <Anello valore={proteine / 100} dimensione={96} spessore={13} etichetta={`${proteine} grammi di 100`} />
              <div>
                <p>
                  <span class="t-title1 num">{proteine}</span>
                  <span class="t-headline c-label-2"> / 100 g</span>
                </p>
                <p class="t-subheadline c-label-2">Ancora {Math.max(0, 100 - proteine)} g per l’obiettivo</p>
              </div>
            </div>
          </Card>
        </div>
      </Sezione>

      <Sezione titolo="Cerchi di spunta">
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

      <Sezione titolo="Pulsanti">
        <div class="tint-allenamento" style={{ display: 'grid', gap: 12, padding: '0 16px' }}>
          <button class="pulsante pieno" onClick={() => setFoglio(true)}>
            <Corsa size={22} /> Apri un foglio dal basso
          </button>
          <button class="pulsante tinta" onClick={() => mostraMessaggio('Fatto!')}>
            Mostra un messaggio
          </button>
          <button class="pulsante grigio">Pulsante grigio</button>
          <button class="pulsante distruttivo">Elimina</button>
        </div>
      </Sezione>

      <Sezione titolo="Lista">
        <Lista>
          <Riga icona={ShoppingCart} coloreIcona="var(--green)" titolo="Riga con icona" valore="Valore" freccia onClick={() => {}} />
          <Riga titolo="Riga con sottotitolo" sottotitolo="Dettaglio secondario" />
          <Riga titolo="Azione" tipo="azione" onClick={() => {}} />
          <Riga titolo="Azione distruttiva" tipo="distruttiva" onClick={() => {}} />
        </Lista>
      </Sezione>

      <Foglio aperto={foglio} onChiudi={() => setFoglio(false)} titolo="Giornata Forte">
        <div class="tint-allenamento">
          <p class="foglio-spiegazione">
            Esempio di foglio dal basso. Si chiude con la X, toccando fuori o trascinandolo verso il basso.
          </p>
          <Sezione titolo="Esercizi">
            <Lista>
              <Riga titolo="Flessioni in verticale al muro" valore="3 × 5" />
              <Riga titolo="Squat a corpo libero" valore="3 × 12–15" />
              <Riga titolo="Plank" valore="3 × 30 s" />
            </Lista>
          </Sezione>
          <div class="foglio-azioni">
            <button class="pulsante pieno" onClick={() => setFoglio(false)}>
              Inizia
            </button>
          </div>
        </div>
      </Foglio>
    </Pagina>
  )
}
