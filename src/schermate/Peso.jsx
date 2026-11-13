// Peso: una pesata a settimana e la tendenza, per capire se mangio abbastanza per allenarmi.
import { useState } from 'preact/hooks'
import { Pagina, PulsanteIndietro } from '../components/Pagina.jsx'
import { Card } from '../components/Card.jsx'
import { Sezione, Lista, Riga } from '../components/Lista.jsx'
import { chiediConferma, mostraMessaggio } from '../components/Avvisi.jsx'
import { useNav } from '../navigazione.jsx'
import { useDati } from '../db/dati.js'
import { impostaPeso, storicoPeso, tendenzaPeso } from '../db/giorno.js'
import { useOggi, formatoBreve, giorniTra } from '../lib/giornata.js'
import { vibra } from '../lib/tocco.js'

const kg = (n) => `${n.toFixed(1)} kg`
const conSegno = (n, decimali = 2) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(decimali)} kg`

const MESSAGGI = {
  'pochi-dati': 'Weigh yourself once a week. After two weigh-ins at least 10 days apart you’ll see the trend here.',
  scende: (t) =>
    `You’re losing about ${Math.abs(t.settimanale).toFixed(2)} kg a week. To build muscle you need a bit more food: rice at every lunch and the snack before work.`,
  stabile: () => 'Your weight is stable. Fine for toning; if your muscles aren’t growing, add a little more food.',
  'sale-piano': (t) => `Going up slowly (${conSegno(t.settimanale)} a week): the right pace to build muscle.`,
  'sale-veloce': (t) => `Going up fast (${conSegno(t.settimanale)} a week): keep your meals, but skip extra snacks.`,
}

const BREVE = { 'pochi-dati': '', scende: 'going down', stabile: 'stable', 'sale-piano': 'slowly up', 'sale-veloce': 'going up fast' }

/** Sottotitolo nella sezione Allenamento */
export function testoPeso(storico) {
  const ultima = storico.at(-1)
  if (!ultima) return 'Weigh yourself once a week'
  const { stato } = tendenzaPeso(storico)
  return [kg(ultima.peso), BREVE[stato]].filter(Boolean).join(' · ')
}

export function Peso() {
  const nav = useNav()
  const oggi = useOggi()
  const { giorni } = useDati()
  const storico = storicoPeso(giorni)
  const ultima = storico.at(-1)
  const tendenza = tendenzaPeso(storico)
  const messaggio = MESSAGGI[tendenza.stato]
  const [valore, setValore] = useState(giorni[oggi]?.peso ? String(giorni[oggi].peso) : '')
  const giorniDallUltima = ultima ? giorniTra(ultima.data, oggi) : null

  const salva = () => {
    const n = parseFloat(valore.replace(',', '.'))
    if (!(n >= 30 && n <= 200)) {
      mostraMessaggio('Enter your weight in kg, like 59.4', { errore: true })
      return
    }
    vibra()
    impostaPeso(oggi, n)
    mostraMessaggio('Weight saved')
  }

  const togli = async (data) => {
    const ok = await chiediConferma({ titolo: 'Delete this weigh-in?', testo: formatoBreve(data), conferma: 'Delete', distruttiva: true })
    if (ok) impostaPeso(data, null)
  }

  return (
    <Pagina titolo="Weight" sinistra={<PulsanteIndietro etichetta="Training" onClick={nav.indietro} />}>
      <div class="tint-blue">
        <div class="sezione">
          <Card>
            <p class="t-footnote c-label-2">TODAY</p>
            <div class="peso-riga">
              <input
                class="peso-campo num"
                type="text"
                inputmode="decimal"
                placeholder={ultima ? String(ultima.peso) : '59.4'}
                value={valore}
                onInput={(e) => setValore(e.currentTarget.value)}
                aria-label="Weight in kg"
              />
              <span class="t-title3 c-label-2">kg</span>
              <button class="pulsante piccolo pieno" onClick={salva}>
                Save
              </button>
            </div>
            <p class="t-subheadline c-label-2" style={{ marginTop: 8 }}>
              {giorniDallUltima === null
                ? 'Same routine every time: in the morning, after the toilet, before breakfast.'
                : giorniDallUltima >= 7
                  ? `Last weigh-in ${giorniDallUltima} days ago: time for a new one.`
                  : `Last weigh-in ${giorniDallUltima === 0 ? 'today' : `${giorniDallUltima} days ago`}. Next one in ${7 - giorniDallUltima} days.`}
            </p>
          </Card>
        </div>

        <Sezione titolo="Trend">
          <Card>
            <p class="t-body">{typeof messaggio === 'function' ? messaggio(tendenza) : messaggio}</p>
          </Card>
        </Sezione>

        {storico.length > 0 && (
          <Sezione titolo="Weigh-ins" piede="Tap a weigh-in to delete it.">
            <Lista>
              {[...storico].reverse().map((p, i, tutte) => {
                const prima = tutte[i + 1]
                return (
                  <Riga
                    key={p.data}
                    titolo={kg(p.peso)}
                    sottotitolo={formatoBreve(p.data)}
                    valore={prima ? conSegno(p.peso - prima.peso, 1) : ''}
                    onClick={() => togli(p.data)}
                  />
                )
              })}
            </Lista>
          </Sezione>
        )}
      </div>
    </Pagina>
  )
}
