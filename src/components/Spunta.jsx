// Cerchio di spunta grande, come nell'app Promemoria:
// vuoto con bordo grigio, pieno nel colore della sezione con il segno bianco.
import { Check } from './icone.js'
import { vibra } from '../lib/tocco.js'

export function Spunta({ attiva, onChange, etichetta }) {
  return (
    <button
      class={`spunta${attiva ? ' attiva' : ''}`}
      role="checkbox"
      aria-checked={attiva}
      aria-label={etichetta}
      onClick={(e) => {
        e.stopPropagation()
        vibra()
        onChange?.(!attiva)
      }}
    >
      <span class="spunta-cerchio">
        <Check size={16} strokeWidth={3.2} />
      </span>
    </button>
  )
}
