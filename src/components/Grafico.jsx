// Grafici semplici in SVG, nello stile dell'app (colore della sezione, griglia discreta).
// Un tocco su un punto o una barra mostra il valore sotto il grafico.
import { useState } from 'preact/hooks'

const L = 340
const A = 170
const M = { sx: 30, dx: 12, su: 22, giu: 24 }

/** Massimo "tondo" per l'asse: 13 → 15, 37 → 40, 160 → 200 */
function massimoTondo(v) {
  if (v <= 5) return 5
  const passo = v <= 20 ? 5 : v <= 60 ? 10 : v <= 200 ? 50 : 100
  return Math.ceil(v / passo) * passo
}

function Griglia({ max, unita }) {
  const h = A - M.su - M.giu
  return [0, 0.5, 1].map((f) => {
    const y = M.su + h * (1 - f)
    return (
      <g key={f}>
        <line class="griglia" x1={M.sx} x2={L - M.dx} y1={y} y2={y} />
        <text class="asse" x={M.sx - 6} y={y + 4} text-anchor="end">
          {Math.round(max * f)}
          {f === 1 && unita ? ` ${unita}` : ''}
        </text>
      </g>
    )
  })
}

/** Linea nel tempo. punti: [{ etichetta, valore, dettaglio }]; record: indice del punto migliore */
export function GraficoLinea({ punti, unita = '', record = null, etichetta }) {
  const [scelto, setScelto] = useState(null)
  if (!punti.length) return null
  const max = massimoTondo(Math.max(...punti.map((p) => p.valore)) * 1.15)
  const h = A - M.su - M.giu
  const w = L - M.sx - M.dx
  const x = (i) => M.sx + (punti.length === 1 ? w / 2 : (w * i) / (punti.length - 1))
  const y = (v) => M.su + h * (1 - v / max)
  const d = punti.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.valore).toFixed(1)}`).join(' ')
  const larghezzaBersaglio = Math.max(18, w / punti.length)
  const mostra = scelto ?? record

  return (
    <>
      <svg class="grafico" viewBox={`0 0 ${L} ${A}`} role="img" aria-label={etichetta}>
        <Griglia max={max} unita={unita} />
        <path class="linea" d={d} />
        {punti.map((p, i) => (
          <circle key={i} class="punto" cx={x(i)} cy={y(p.valore)} r={i === mostra ? 6 : 4} />
        ))}
        {record != null && (
          <text class="etichetta" x={Math.min(Math.max(x(record), M.sx + 30), L - M.dx - 30)} y={y(punti[record].valore) - 12} text-anchor="middle">
            Record {punti[record].valore}
            {unita ? ` ${unita}` : ''}
          </text>
        )}
        <text class="etichetta-tenue" x={x(0)} y={A - 6} text-anchor={punti.length === 1 ? 'middle' : 'start'}>
          {punti[0].etichetta}
        </text>
        {punti.length > 1 && (
          <text class="etichetta-tenue" x={x(punti.length - 1)} y={A - 6} text-anchor="end">
            {punti.at(-1).etichetta}
          </text>
        )}
        {punti.map((_, i) => (
          <rect key={i} class="bersaglio" x={x(i) - larghezzaBersaglio / 2} y={0} width={larghezzaBersaglio} height={A} onClick={() => setScelto(i)} />
        ))}
      </svg>
      <p class="grafico-dettaglio">{scelto != null ? punti[scelto].dettaglio : 'Tocca un punto per vedere il dettaglio'}</p>
    </>
  )
}

/** Barre (es. minuti per settimana) con una linea di riferimento */
export function GraficoBarre({ barre, unita = '', riferimento = null, etichetta }) {
  const [scelta, setScelta] = useState(null)
  const max = massimoTondo(Math.max(riferimento || 0, ...barre.map((b) => b.valore)) * 1.1)
  const h = A - M.su - M.giu
  const w = L - M.sx - M.dx
  const slot = w / barre.length
  const lb = Math.min(28, slot * 0.6)
  const y = (v) => M.su + h * (1 - v / max)
  const base = M.su + h

  // Barra con gli angoli in alto arrotondati, appoggiata alla base
  const barra = (x0, v) => {
    const top = y(v)
    const r = Math.min(4, (base - top) / 2, lb / 2)
    if (v <= 0) return ''
    return `M${x0} ${base} V${top + r} Q${x0} ${top} ${x0 + r} ${top} H${x0 + lb - r} Q${x0 + lb} ${top} ${x0 + lb} ${top + r} V${base} Z`
  }

  return (
    <>
      <svg class="grafico" viewBox={`0 0 ${L} ${A}`} role="img" aria-label={etichetta}>
        <Griglia max={max} unita={unita} />
        {barre.map((b, i) => {
          const x0 = M.sx + slot * i + (slot - lb) / 2
          return (
            <g key={i}>
              <path class={`barra${b.attuale ? '' : ' tenue'}`} d={barra(x0, b.valore)} />
              <text class="etichetta-tenue" x={x0 + lb / 2} y={A - 6} text-anchor="middle">
                {b.etichetta}
              </text>
              {b.attuale && b.valore > 0 && (
                <text class="etichetta" x={x0 + lb / 2} y={y(b.valore) - 6} text-anchor="middle">
                  {b.valore}
                </text>
              )}
              <rect class="bersaglio" x={M.sx + slot * i} y={0} width={slot} height={A} onClick={() => setScelta(i)} />
            </g>
          )
        })}
        {riferimento != null && (
          <>
            <line class="riferimento" x1={M.sx} x2={L - M.dx} y1={y(riferimento)} y2={y(riferimento)} />
            <text class="etichetta-tenue" x={L - M.dx} y={y(riferimento) - 5} text-anchor="end">
              {riferimento} {unita} consigliati
            </text>
          </>
        )}
      </svg>
      <p class="grafico-dettaglio">{scelta != null ? barre[scelta].dettaglio : 'Tocca una barra per vedere il dettaglio'}</p>
    </>
  )
}

/** Controllo a segmenti di iOS */
export function Segmenti({ opzioni, valore, onChange }) {
  return (
    <div class="segmenti" role="tablist">
      {opzioni.map((o) => (
        <button key={o.valore} role="tab" aria-selected={o.valore === valore} class={o.valore === valore ? 'attivo' : ''} onClick={() => onChange(o.valore)}>
          {o.etichetta}
        </button>
      ))}
    </div>
  )
}
