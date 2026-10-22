// Pagina in stile iOS: Large Title che, scorrendo, si rimpicciolisce nella barra in alto.
import { useEffect, useRef, useState } from 'preact/hooks'
import { ChevronLeft } from './icone.js'

/** titoloBarra: testo piccolo nella barra quando si scorre (predefinito: il titolo) */
export function Pagina({ titolo, titoloBarra, sopratitolo, sinistra, destra, children }) {
  const pagina = useRef(null)
  const barra = useRef(null)
  const titoloGrande = useRef(null)
  const [scorsa, setScorsa] = useState(false)

  useEffect(() => {
    const el = pagina.current
    const controlla = () => {
      const t = titoloGrande.current
      // La barra diventa "di vetro" quando il titolo grande le passa sotto
      const soglia = t ? t.offsetTop + t.offsetHeight - barra.current.offsetHeight - 6 : 0
      setScorsa(el.scrollTop > soglia)
    }
    el.addEventListener('scroll', controlla, { passive: true })
    controlla()
    return () => el.removeEventListener('scroll', controlla)
  }, [])

  return (
    <div class="pagina" ref={pagina}>
      <header class={`navbar${scorsa ? ' scorsa' : ''}`} ref={barra}>
        <div class="navbar-sinistra">{sinistra}</div>
        <div class="navbar-titolo" aria-hidden={!scorsa}>
          {titoloBarra ?? titolo}
        </div>
        <div class="navbar-destra">{destra}</div>
      </header>
      <div class="titolo-grande" ref={titoloGrande}>
        {sopratitolo && <span class="sopratitolo">{sopratitolo}</span>}
        <h1>{titolo}</h1>
      </div>
      {children}
    </div>
  )
}

/** Pulsante "‹ Indietro" della barra in alto */
export function PulsanteIndietro({ etichetta = 'Indietro', onClick }) {
  return (
    <button class="nav-pulsante indietro" onClick={onClick}>
      <ChevronLeft size={30} strokeWidth={2.2} style={{ marginRight: -4 }} />
      {etichetta}
    </button>
  )
}
