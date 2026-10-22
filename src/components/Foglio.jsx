// Foglio che sale dal basso (sheet iOS): linguetta grigia in alto,
// si chiude trascinandolo verso il basso, toccando lo sfondo o la X.
import { useEffect, useRef, useState } from 'preact/hooks'
import { createPortal } from 'preact/compat'
import { X } from './icone.js'

const DURATA_MS = 500

export function Foglio({ aperto, onChiudi, titolo, grande = false, children }) {
  // `montato` tiene il foglio nella pagina durante l'animazione di chiusura
  const [montato, setMontato] = useState(aperto)
  const [visibile, setVisibile] = useState(false)
  const foglio = useRef(null)
  const corpo = useRef(null)
  const chiudi = useRef(onChiudi)
  chiudi.current = onChiudi

  useEffect(() => {
    if (aperto) {
      setMontato(true)
      // due frame: prima si disegna fuori schermo, poi parte l'animazione
      requestAnimationFrame(() => requestAnimationFrame(() => setVisibile(true)))
    } else if (montato) {
      setVisibile(false)
      const timer = setTimeout(() => setMontato(false), DURATA_MS)
      return () => clearTimeout(timer)
    }
  }, [aperto])

  // Trascinamento verso il basso per chiudere
  useEffect(() => {
    const el = foglio.current
    if (!el) return
    let inizioY = null
    let spostamento = 0
    let ultimoY = 0
    let ultimoT = 0
    let velocita = 0

    const inizio = (e) => {
      // Dal corpo si trascina solo se è già scorso tutto in cima
      const dalCorpo = corpo.current?.contains(e.target)
      if (dalCorpo && corpo.current.scrollTop > 0) return
      inizioY = e.touches[0].clientY
      ultimoY = inizioY
      ultimoT = e.timeStamp
      spostamento = 0
      velocita = 0
    }
    const muovi = (e) => {
      if (inizioY === null) return
      const y = e.touches[0].clientY
      spostamento = y - inizioY
      if (spostamento <= 0) {
        el.style.transform = ''
        el.classList.remove('trascinato')
        return
      }
      e.preventDefault()
      velocita = (y - ultimoY) / Math.max(1, e.timeStamp - ultimoT)
      ultimoY = y
      ultimoT = e.timeStamp
      el.classList.add('trascinato')
      el.style.transform = `translateY(${spostamento}px)`
    }
    const fine = () => {
      if (inizioY === null) return
      inizioY = null
      el.classList.remove('trascinato')
      el.style.transform = ''
      if (spostamento > el.offsetHeight * 0.3 || velocita > 0.6) chiudi.current?.()
    }
    el.addEventListener('touchstart', inizio, { passive: true })
    el.addEventListener('touchmove', muovi, { passive: false })
    el.addEventListener('touchend', fine)
    el.addEventListener('touchcancel', fine)
    return () => {
      el.removeEventListener('touchstart', inizio)
      el.removeEventListener('touchmove', muovi)
      el.removeEventListener('touchend', fine)
      el.removeEventListener('touchcancel', fine)
    }
  }, [montato])

  if (!montato) return null

  return createPortal(
    <>
      <div class={`foglio-velo${visibile ? ' aperto' : ''}`} onClick={onChiudi} />
      <div
        class={`foglio${visibile ? ' aperto' : ''}${grande ? ' grande' : ''}`}
        ref={foglio}
        role="dialog"
        aria-modal="true"
        aria-label={titolo}
      >
        <div class="foglio-maniglia" />
        <div class="foglio-testa">
          <h2>{titolo}</h2>
          <button class="pulsante-tondo" aria-label="Chiudi" onClick={onChiudi}>
            <X size={16} strokeWidth={2.8} />
          </button>
        </div>
        <div class="foglio-corpo" ref={corpo}>
          {children}
        </div>
      </div>
    </>,
    document.body,
  )
}
