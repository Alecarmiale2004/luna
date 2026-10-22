// Liste "inset grouped" come in Impostazioni di iOS.
import { ChevronRight, ChevronsUpDown, Minus, Plus } from './icone.js'

/** Gruppo con intestazione (Footnote maiuscolo grigio) e nota in fondo. */
export function Sezione({ titolo, piede, children }) {
  return (
    <section class="sezione">
      {titolo && <h2 class="sezione-intestazione">{titolo}</h2>}
      {children}
      {piede && <p class="sezione-piede">{piede}</p>}
    </section>
  )
}

export function Lista({ children }) {
  return <div class="lista">{children}</div>
}

/**
 * Una riga. Con onClick è un pulsante.
 * - icona + coloreIcona: quadratino colorato a sinistra
 * - valore: testo grigio a destra; destra: elemento qualsiasi a destra
 * - tipo: "azione" (testo blu) o "distruttiva" (testo rosso)
 */
export function Riga({
  icona: Icona,
  coloreIcona,
  titolo,
  sottotitolo,
  valore,
  destra,
  freccia,
  tipo,
  disattivata,
  classe: extra,
  onClick,
}) {
  const classe = ['riga', tipo, disattivata && 'disattivata', extra].filter(Boolean).join(' ')
  const contenuto = (
    <>
      {Icona && (
        <span class="riga-icona" style={coloreIcona && { background: coloreIcona }}>
          <Icona size={18} strokeWidth={2.2} />
        </span>
      )}
      <span class="riga-contenuto">
        <span class="riga-testi">
          <span class="riga-titolo">{titolo}</span>
          {sottotitolo && <span class="riga-sottotitolo">{sottotitolo}</span>}
        </span>
        {valore !== undefined && <span class="riga-valore">{valore}</span>}
        {destra}
        {freccia && <ChevronRight class="riga-freccia" size={20} strokeWidth={2.4} />}
      </span>
    </>
  )
  return onClick ? (
    <button class={classe} onClick={onClick} disabled={disattivata}>
      {contenuto}
    </button>
  ) : (
    <div class={classe}>{contenuto}</div>
  )
}

/**
 * Valore scelto da un menu nativo dell'iPhone (select invisibile sopra il testo).
 * soloIcona: mostra solo le freccette (il valore è già scritto altrove nella riga).
 */
export function MenuValore({ valore, opzioni, onChange, soloIcona = false }) {
  const scelta = opzioni.find((o) => o.valore === valore)
  return (
    <span class="riga-menu">
      {!soloIcona && scelta?.etichetta}
      <ChevronsUpDown size={16} strokeWidth={2.2} />
      <select value={String(valore)} onChange={(e) => onChange(opzioni[e.currentTarget.selectedIndex].valore)}>
        {opzioni.map((o) => (
          <option key={o.valore} value={String(o.valore)}>
            {o.etichetta}
          </option>
        ))}
      </select>
    </span>
  )
}

/** Stepper − / + di iOS */
export function Stepper({ valore, min = -Infinity, max = Infinity, passo = 1, onChange }) {
  return (
    <span class="stepper">
      <button aria-label="Diminuisci" disabled={valore <= min} onClick={() => onChange(Math.max(min, valore - passo))}>
        <Minus size={18} strokeWidth={2.4} />
      </button>
      <span class="stepper-separatore" />
      <button aria-label="Aumenta" disabled={valore >= max} onClick={() => onChange(Math.min(max, valore + passo))}>
        <Plus size={18} strokeWidth={2.4} />
      </button>
    </span>
  )
}
