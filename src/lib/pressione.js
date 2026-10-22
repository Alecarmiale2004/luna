// Distingue un tocco da una pressione lunga sullo stesso elemento.
// Uso: <button {...usePressione({ onTocco, onPressioneLunga })}>
import { useRef } from 'preact/hooks'

export function usePressione({ onTocco, onPressioneLunga, durata = 550 }) {
  const timer = useRef(null)
  const lunga = useRef(false)
  const inizio = useRef(null)

  const annulla = () => {
    clearTimeout(timer.current)
    timer.current = null
  }

  return {
    onPointerDown(e) {
      lunga.current = false
      inizio.current = [e.clientX, e.clientY]
      annulla()
      if (onPressioneLunga) {
        timer.current = setTimeout(() => {
          lunga.current = true
          onPressioneLunga()
        }, durata)
      }
    },
    onPointerMove(e) {
      // Se il dito si sposta (sta scorrendo) non è una pressione lunga
      if (!inizio.current) return
      const [x, y] = inizio.current
      if (Math.hypot(e.clientX - x, e.clientY - y) > 10) annulla()
    },
    onPointerUp: annulla,
    onPointerCancel: annulla,
    onPointerLeave: annulla,
    onClick(e) {
      if (lunga.current) {
        lunga.current = false
        e.preventDefault()
        return
      }
      onTocco?.(e)
    },
    onContextMenu: (e) => e.preventDefault(),
  }
}
