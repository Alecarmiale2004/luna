// Impostazioni → Storico → Allenamenti: tutte le sedute, per mese.
import { Pagina, PulsanteIndietro } from '../components/Pagina.jsx'
import { Sezione, Lista, Riga } from '../components/Lista.jsx'
import { useNav } from '../navigazione.jsx'
import { useDati } from '../db/dati.js'
import { seduteFatte, minutiSeduta } from '../db/allenamento.js'
import { daISO, formatoGiorno } from '../lib/giornata.js'
import { INFO_TIPO, nomeTipo } from './allenamentoComune.jsx'

const meseDi = (iso) => daISO(iso).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })

export function StoricoAllenamenti() {
  const nav = useNav()
  const { sedute } = useDati()
  const elenco = seduteFatte(sedute).reverse()
  const mesi = []
  for (const s of elenco) {
    const m = meseDi(s.data)
    if (mesi.at(-1)?.mese !== m) mesi.push({ mese: m, sedute: [] })
    mesi.at(-1).sedute.push(s)
  }

  return (
    <Pagina titolo="Allenamenti" sinistra={<PulsanteIndietro etichetta="Impostazioni" onClick={nav.indietro} />}>
      {elenco.length === 0 && (
        <p class="t-body c-label-2" style={{ padding: '24px 32px', textAlign: 'center' }}>
          Qui compariranno gli allenamenti fatti.
        </p>
      )}
      {mesi.map(({ mese, sedute: lista }) => (
        <Sezione key={mese} titolo={mese}>
          <Lista>
            {lista.map((s) => {
              const fatte = s.registrazioni.filter((r) => !r.saltato)
              return (
                <Riga
                  key={s.id}
                  icona={INFO_TIPO[s.tipo].icona}
                  coloreIcona={`var(--c-${s.tipo})`}
                  titolo={formatoGiorno(s.data)}
                  sottotitolo={s.tipo === 'pausa' ? 'Pausa' : `${nomeTipo(s.tipo)} · ${new Set(fatte.map((r) => r.esercizio)).size} esercizi`}
                  valore={s.tipo === 'pausa' ? undefined : `${minutiSeduta(s)} min`}
                />
              )
            })}
          </Lista>
        </Sezione>
      ))}
    </Pagina>
  )
}
