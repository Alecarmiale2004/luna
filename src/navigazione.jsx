// Navigazione in stile iOS:
// - tab bar in basso con 4 sezioni, ognuna con la sua "pila" di schermate;
// - apri(Schermata) fa entrare una schermata da destra, indietro() la toglie
//   (anche trascinando dal bordo sinistro dello schermo);
// - toccare la tab già attiva torna alla schermata principale o risale in cima.
import { createContext } from 'preact'
import { useContext, useEffect, useRef, useState } from 'preact/hooks'

const DURATA_MS = 500
const ContestoNav = createContext(null)

/** Dentro una schermata: { apri, indietro, vaiATab, tab } */
export const useNav = () => useContext(ContestoNav)

let contatore = 0

export function Navigazione({ tabs, iniziale }) {
  const [attiva, setAttiva] = useState(iniziale)
  const [pile, setPile] = useState(() => Object.fromEntries(tabs.map((t) => [t.id, []])))
  const livelliRadice = useRef({})

  const nav = {
    tab: attiva,
    apri(Schermata, props = {}) {
      setPile((p) => ({ ...p, [attiva]: [...p[attiva], { chiave: ++contatore, Schermata, props, uscendo: false }] }))
    },
    indietro() {
      const pila = pile[attiva]
      const cima = pila.findLast((l) => !l.uscendo)
      if (!cima) return
      setPile((p) => ({ ...p, [attiva]: p[attiva].map((l) => (l === cima ? { ...l, uscendo: true } : l)) }))
      setTimeout(() => {
        setPile((p) => ({ ...p, [attiva]: p[attiva].filter((l) => l.chiave !== cima.chiave) }))
      }, DURATA_MS)
    },
    vaiATab(id) {
      setAttiva(id)
    },
  }

  const toccaTab = (id) => {
    if (id !== attiva) return setAttiva(id)
    if (pile[id].length) {
      setPile((p) => ({ ...p, [id]: [] }))
    } else {
      livelliRadice.current[id]?.querySelector('.pagina')?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <ContestoNav.Provider value={nav}>
      {tabs.map((t) => {
        const pila = pile[t.id]
        const visibile = t.id === attiva
        const coperto = (i) => pila.slice(i).some((l) => !l.uscendo)
        return [
          <div
            key={t.id}
            ref={(el) => (livelliRadice.current[t.id] = el)}
            class={`livello ${t.tinta}${visibile ? '' : ' nascosto'}${coperto(0) ? ' coperto' : ''}`}
            aria-hidden={!visibile || coperto(0)}
          >
            <t.Schermata />
          </div>,
          ...pila.map((l, i) => (
            <LivelloSpinto
              key={l.chiave}
              classe={`${t.tinta}${visibile ? '' : ' nascosto'}${coperto(i + 1) ? ' coperto' : ''}`}
              uscendo={l.uscendo}
              onIndietro={nav.indietro}
              zIndex={i + 1}
            >
              <l.Schermata {...l.props} />
            </LivelloSpinto>
          )),
        ]
      })}
      <TabBar tabs={tabs} attiva={attiva} onTocca={toccaTab} />
    </ContestoNav.Provider>
  )
}

function LivelloSpinto({ classe, uscendo, onIndietro, zIndex, children }) {
  const [entrato, setEntrato] = useState(false)
  const el = useRef(null)

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setEntrato(true)))
  }, [])

  // Trascinando dal bordo sinistro si torna indietro, come in iOS
  useEffect(() => {
    const livello = el.current
    let inizioX = null
    let dx = 0
    let ultimoX = 0
    let ultimoT = 0
    let velocita = 0
    const inizio = (e) => {
      const x = e.touches[0].clientX
      if (x > 24) return
      inizioX = x
      ultimoX = x
      ultimoT = e.timeStamp
      dx = 0
      velocita = 0
    }
    const muovi = (e) => {
      if (inizioX === null) return
      const x = e.touches[0].clientX
      dx = Math.max(0, x - inizioX)
      velocita = (x - ultimoX) / Math.max(1, e.timeStamp - ultimoT)
      ultimoX = x
      ultimoT = e.timeStamp
      e.preventDefault()
      livello.style.transition = 'none'
      livello.style.transform = `translateX(${dx}px)`
    }
    const fine = () => {
      if (inizioX === null) return
      inizioX = null
      livello.style.transition = ''
      livello.style.transform = ''
      if (dx > livello.offsetWidth * 0.35 || velocita > 0.5) onIndietro()
    }
    livello.addEventListener('touchstart', inizio, { passive: true })
    livello.addEventListener('touchmove', muovi, { passive: false })
    livello.addEventListener('touchend', fine)
    livello.addEventListener('touchcancel', fine)
    return () => {
      livello.removeEventListener('touchstart', inizio)
      livello.removeEventListener('touchmove', muovi)
      livello.removeEventListener('touchend', fine)
      livello.removeEventListener('touchcancel', fine)
    }
  }, [onIndietro])

  const stato = !entrato ? ' entra' : uscendo ? ' esce' : ''
  return (
    <div ref={el} class={`livello spinto ${classe}${stato}`} style={{ zIndex }}>
      {children}
    </div>
  )
}

function TabBar({ tabs, attiva, onTocca }) {
  return (
    <nav class="tabbar" aria-label="Sezioni">
      {tabs.map((t) => (
        <button
          key={t.id}
          class={`tab ${t.tinta}${t.id === attiva ? ' attivo' : ''}`}
          aria-current={t.id === attiva ? 'page' : undefined}
          onClick={() => onTocca(t.id)}
        >
          <t.Icona size={26} />
          {t.titolo}
        </button>
      ))}
    </nav>
  )
}
