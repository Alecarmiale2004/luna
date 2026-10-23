// Impostazioni → Esercizi: cambiare serie e ripetizioni, sostituire un esercizio con un altro.
// Le modifiche valgono dal prossimo allenamento e si salvano da sole.
import { useRef, useState } from 'preact/hooks'
import { Pagina, PulsanteIndietro } from '../components/Pagina.jsx'
import { Sezione, Lista, Riga, MenuValore, Stepper } from '../components/Lista.jsx'
import { Foglio } from '../components/Foglio.jsx'
import { mostraMessaggio } from '../components/Avvisi.jsx'
import { useNav } from '../navigazione.jsx'
import { useDati } from '../db/dati.js'
import { giornata, esercizio, tuttiGliEsercizi, testoVoce, salvaVoce, ripristinaVoce, immagineEsercizio, TIPI } from '../db/allenamento.js'
import { INFO_TIPO } from './allenamentoComune.jsx'
import './allenamento.css'

export function GestioneEsercizi() {
  const nav = useNav()
  useDati() // ridisegna quando cambio qualcosa
  const [scelta, setScelta] = useState(null) // { tipo, blocco, slot }

  return (
    <Pagina titolo="Esercizi" sinistra={<PulsanteIndietro etichetta="Impostazioni" onClick={nav.indietro} />}>
      {TIPI.filter((t) => t !== 'pausa').map((t) => {
        const g = giornata(t)
        return g.blocchi.map((b) => (
          <Sezione key={`${t}.${b.id}`} titolo={`${g.nome} · ${b.nome}`}>
            <Lista>
              {b.voci.map((v) => (
                <Riga
                  key={v.slot}
                  titolo={esercizio(v.esercizio).nome}
                  sottotitolo={v.esercizio !== v.slot ? `al posto di: ${esercizio(v.slot).nome}` : v.modificata ? 'modificato' : undefined}
                  valore={testoVoce(v)}
                  freccia
                  onClick={() => setScelta({ tipo: t, blocco: b.id, slot: v.slot })}
                />
              ))}
            </Lista>
          </Sezione>
        ))
      })}
      <p class="sezione-piede" style={{ paddingBottom: 16 }}>
        Le modifiche valgono dal prossimo allenamento. Lo storico resta com’è.
      </p>
      <FoglioVoce scelta={scelta} onChiudi={() => setScelta(null)} />
    </Pagina>
  )
}

const OPZIONI_ESERCIZI = tuttiGliEsercizi().map((e) => ({ valore: e.id, etichetta: e.nome }))

function FoglioVoce({ scelta, onChiudi }) {
  const ultima = useRef(scelta)
  if (scelta) ultima.current = scelta
  const s = scelta || ultima.current
  useDati()
  if (!s) return <Foglio aperto={false} onChiudi={onChiudi} titolo="" />

  const v = giornata(s.tipo)
    .blocchi.find((b) => b.id === s.blocco)
    .voci.find((x) => x.slot === s.slot)
  const cambia = (m) => salvaVoce(s.tipo, s.blocco, s.slot, m)
  const aTempo = v.minSecondi != null

  return (
    <Foglio aperto={!!scelta} onChiudi={onChiudi} titolo={esercizio(v.esercizio).nome}>
      <div class={INFO_TIPO[s.tipo].tinta}>
        <div style={{ margin: '4px 16px 0' }}>
          <img src={immagineEsercizio(v.esercizio)} alt="" style={{ width: '100%', display: 'block', borderRadius: 12 }} />
        </div>
        <Sezione>
          <Lista>
            <Riga
              titolo="Esercizio"
              destra={<MenuValore valore={v.esercizio} opzioni={OPZIONI_ESERCIZI} onChange={(id) => cambia({ sostituto: id === s.slot ? undefined : id })} />}
            />
            {v.serie ? (
              <>
                <Riga
                  titolo="Serie"
                  destra={
                    <>
                      <span class="riga-valore num">{v.serie}</span>
                      <Stepper valore={v.serie} min={1} max={6} onChange={(n) => cambia({ serie: n })} />
                    </>
                  }
                />
                <Riga
                  titolo={aTempo ? 'Secondi minimi' : 'Ripetizioni minime'}
                  destra={
                    <>
                      <span class="riga-valore num">{aTempo ? v.minSecondi : v.min}</span>
                      <Stepper
                        valore={aTempo ? v.minSecondi : v.min}
                        min={1}
                        max={aTempo ? v.maxSecondi : v.max}
                        passo={aTempo ? 5 : 1}
                        onChange={(n) => cambia(aTempo ? { minSecondi: n } : { min: n })}
                      />
                    </>
                  }
                />
                <Riga
                  titolo={aTempo ? 'Secondi massimi' : 'Ripetizioni massime'}
                  destra={
                    <>
                      <span class="riga-valore num">{aTempo ? v.maxSecondi : v.max}</span>
                      <Stepper
                        valore={aTempo ? v.maxSecondi : v.max}
                        min={aTempo ? v.minSecondi : v.min}
                        max={aTempo ? 180 : 50}
                        passo={aTempo ? 5 : 1}
                        onChange={(n) => cambia(aTempo ? { maxSecondi: n } : { max: n })}
                      />
                    </>
                  }
                />
              </>
            ) : v.secondi ? (
              <Riga
                titolo="Durata"
                destra={
                  <>
                    <span class="riga-valore num">{v.secondi} s</span>
                    <Stepper valore={v.secondi} min={10} max={3600} passo={v.secondi >= 300 ? 300 : 10} onChange={(n) => cambia({ secondi: n })} />
                  </>
                }
              />
            ) : (
              <Riga
                titolo="Ripetizioni"
                destra={
                  <>
                    <span class="riga-valore num">{v.ripetizioni}</span>
                    <Stepper valore={v.ripetizioni} min={1} max={50} onChange={(n) => cambia({ ripetizioni: n })} />
                  </>
                }
              />
            )}
          </Lista>
        </Sezione>
        {v.modificata && (
          <div class="foglio-azioni">
            <button
              class="pulsante grigio"
              onClick={() => {
                ripristinaVoce(s.tipo, s.blocco, s.slot)
                mostraMessaggio('Esercizio ripristinato')
              }}
            >
              Ripristina come nel programma
            </button>
          </div>
        )}
      </div>
    </Foglio>
  )
}
