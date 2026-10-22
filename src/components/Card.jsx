// Card in stile app Salute/Fitness.
import { ChevronRight } from './icone.js'

/** Se ha onClick diventa toccabile (con il leggero rimpicciolimento alla pressione). */
export function Card({ onClick, class: classe = '', children, ...resto }) {
  if (onClick) {
    return (
      <button class={`card toccabile ${classe}`} onClick={onClick} {...resto}>
        {children}
      </button>
    )
  }
  return (
    <div class={`card ${classe}`} {...resto}>
      {children}
    </div>
  )
}

/** Intestazione: icona + nome nel colore della sezione, dettaglio a destra. */
export function CardTesta({ icona: Icona, titolo, dettaglio, freccia }) {
  return (
    <div class="card-testa">
      {Icona && <Icona size={17} strokeWidth={2.4} color="var(--tint)" />}
      <span class="card-testa-titolo">{titolo}</span>
      {(dettaglio || freccia) && (
        <span class="card-testa-dettaglio">
          {dettaglio}
          {freccia && <ChevronRight size={18} color="var(--gray-3)" strokeWidth={2.4} />}
        </span>
      )}
    </div>
  )
}
