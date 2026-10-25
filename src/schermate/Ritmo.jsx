// Ritmo: la settimana in corso, la costanza e i minuti a settimana (riferimento: 150 minuti).
import { Pagina, PulsanteIndietro } from '../components/Pagina.jsx'
import { Card } from '../components/Card.jsx'
import { Sezione } from '../components/Lista.jsx'
import { GraficoBarre } from '../components/Grafico.jsx'
import { Check } from '../components/icone.js'
import { useNav } from '../navigazione.jsx'
import { useDati } from '../db/dati.js'
import { tipiSettimana, minutiSettimana, serieGiorni, seduteUltimeSettimane, seduteFatte, TIPI } from '../db/allenamento.js'
import { useOggi, lunediDi, settimanaDi, aggiungiGiorni, daISO, INIZIALI_GIORNI } from '../lib/giornata.js'
import { INFO_TIPO, nomeTipo } from './allenamentoComune.jsx'
import './allenamento.css'

const SETTIMANE_GRAFICO = 8
const OBIETTIVO_MINUTI = 150

export function Ritmo() {
  const nav = useNav()
  const { sedute } = useDati()
  const oggi = useOggi()
  const lunedi = lunediDi(oggi)
  const tipi = tipiSettimana(sedute, lunedi)
  const minuti = minutiSettimana(sedute, lunedi)
  const fila = serieGiorni(sedute, oggi)
  const ultime4 = seduteUltimeSettimane(sedute, oggi, 4)
  const totali = seduteFatte(sedute).filter((s) => s.tipo !== 'pausa').length

  const barre = Array.from({ length: SETTIMANE_GRAFICO }, (_, i) => {
    const l = aggiungiGiorni(lunedi, -7 * (SETTIMANE_GRAFICO - 1 - i))
    const v = minutiSettimana(sedute, l)
    const d = daISO(l)
    return {
      etichetta: `${d.getDate()}/${d.getMonth() + 1}`,
      valore: v,
      attuale: l === lunedi,
      dettaglio: `Week of ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}: ${v} minutes`,
    }
  })

  return (
    <Pagina titolo="Rhythm" sinistra={<PulsanteIndietro etichetta="Training" onClick={nav.indietro} />}>
      <Sezione titolo="This week">
        <Card>
          <div class="ritmo-settimana">
            {settimanaDi(oggi).map((data, i) => {
              const tipo = tipi[data]
              const Icona = tipo ? INFO_TIPO[tipo].icona : null
              return (
                <div key={data} class={`ritmo-giorno${data === oggi ? ' oggi' : ''} ${tipo ? INFO_TIPO[tipo].tinta : ''}`}>
                  {INIZIALI_GIORNI[i]}
                  <span class={`ritmo-pallino${tipo ? ' pieno' : ''}`} aria-label={tipo ? nomeTipo(tipo) : 'nothing'}>
                    {Icona && <Icona size={16} strokeWidth={2.4} />}
                  </span>
                </div>
              )
            })}
          </div>
          <div class="legenda">
            {TIPI.map((t) => (
              <span key={t} class={INFO_TIPO[t].tinta}>
                <i />
                {nomeTipo(t)}
              </span>
            ))}
          </div>
        </Card>
      </Sezione>

      <Sezione titolo="Consistency" piede="Days in a row following the cycle: Rest days count too.">
        <div class="tessere">
          <div class="tessera tint-forte">
            <span class="num">{ultime4}</span>
            <span class="t-footnote">{ultime4 === 1 ? 'workout' : 'workouts'} in the last 4 weeks</span>
          </div>
          <div class="tessera tint-leggera">
            <span class="num">{fila}</span>
            <span class="t-footnote">{fila === 1 ? 'day in a row' : 'days in a row'}</span>
          </div>
          <div class="tessera tint-mobilita">
            <span class="num">
              {minuti}
              <span class="t-headline c-label-2"> / {OBIETTIVO_MINUTI}</span>
            </span>
            <span class="t-footnote">
              minutes this week {minuti >= OBIETTIVO_MINUTI && <Check size={14} strokeWidth={3} color="var(--green)" />}
            </span>
          </div>
          <div class="tessera">
            <span class="num">{totali}</span>
            <span class="t-footnote">{totali === 1 ? 'workout' : 'workouts'} all time</span>
          </div>
        </div>
      </Sezione>

      <Sezione titolo="Minutes per week" piede="The recommendation is at least 150 minutes a week of moderate activity.">
        <Card class="tint-leggera">
          <GraficoBarre etichetta="Training minutes over the last 8 weeks" barre={barre} unita="min" riferimento={OBIETTIVO_MINUTI} />
        </Card>
      </Sezione>
    </Pagina>
  )
}
