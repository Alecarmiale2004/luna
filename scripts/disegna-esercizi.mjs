// Disegna le immagini degli esercizi in SVG (04-allenamento/esercizi/stile-immagini.md):
// due riquadri 1 → 2, figura intera in grigio, muscoli lavorati in rosso, freccia del movimento,
// stessa figura e stessa scala per tutti, colori adatti al tema chiaro e scuro.
//
// Uso: node scripts/disegna-esercizi.mjs   → scrive public/immagini/esercizi/<id>.svg
// Per sostituire un'immagine con una fatta a parte basta mettere un file con lo stesso nome.
//
// Ogni posa è descritta con angoli ASSOLUTI in gradi: 0 = verso il basso, 90 = avanti (destra),
// 180 = verso l'alto, -90 = indietro (sinistra). La figura guarda a destra.
// t = busto (dall'anca alla spalla), h = testa, b/a = braccio/avambraccio, c/s/p = coscia/stinco/piede,
// V = lato vicino, L = lato lontano. vista: "fronte" per le pose viste di fronte.
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const CARTELLA = fileURLToPath(new URL('../public/immagini/esercizi/', import.meta.url))

// ---------------------------------------------------------------------------
// Proporzioni (unità SVG) e spessori
// ---------------------------------------------------------------------------
const L = { busto: 50, collo: 8, testa: 11, braccio: 29, avambraccio: 26, coscia: 43, stinco: 41, piede: 13 }
const S = { busto: 21, bustoFronte: 30, braccio: 10, avambraccio: 8, coscia: 14, stinco: 10, collo: 8, piede: 6 }
const PANNELLO = { l: 200, a: 250 }
const TERRA = 232

const IN_PIEDI = { t: 180, bV: 8, aV: 14, bL: -6, aL: 4, cV: 0, sV: 0, pV: 90, cL: 2, sL: 0, pL: 90 }
const IN_PIEDI_FRONTE = { vista: 'fronte', t: 180, bV: 12, aV: 6, bL: -12, aL: -6, cV: 3, sV: 0, pV: 90, cL: -3, sL: 0, pL: -90 }
const QUATTRO_ZAMPE = { t: 95, h: 100, bV: 0, aV: 0, bL: 2, aL: 2, cV: 0, sV: -90, pV: -90, cL: 2, sL: -90, pL: -90 }
const SUPINO = { t: -90, h: -92, bV: 92, aV: 92, bL: 90, aL: 90, cV: 135, sV: 30, pV: 100, cL: 132, sL: 28, pL: 100 }

const posa = (base, modifiche = {}) => ({ ...base, ...modifiche })

// ---------------------------------------------------------------------------
// Gli esercizi: due pose, muscoli, freccia, attrezzi
// ---------------------------------------------------------------------------
const ESERCIZI = {
  'marcia-sul-posto': {
    pose: [posa(IN_PIEDI, { cV: 75, sV: 5, bV: -35, aV: -10, bL: 35, aL: 80 }), posa(IN_PIEDI, { cL: 75, sL: 5, bL: -35, aL: -10, bV: 35, aV: 80 })],
    muscoli: ['cosce'],
    freccia: { giunto: 'ginocchio' },
  },
  'circonduzioni-braccia': {
    pose: [posa(IN_PIEDI, { bV: 20, aV: 25, bL: 15, aL: 20 }), posa(IN_PIEDI, { bV: 168, aV: 172, bL: 162, aL: 166 })],
    muscoli: ['spalle'],
    freccia: { giunto: 'spalla', tipo: 'giro', raggio: 26 },
  },
  'rotazioni-bacino': {
    pose: [posa(IN_PIEDI, { t: 172, h: 178, bV: -30, aV: 50, bL: -30, aL: 50 }), posa(IN_PIEDI, { t: 190, h: 182, bV: -30, aV: 50, bL: -30, aL: 50 })],
    muscoli: ['lombari', 'addominali'],
    freccia: { giunto: 'anca', tipo: 'giro', raggio: 22 },
  },
  'rotazioni-polsi-spalle': {
    pose: [posa(IN_PIEDI, { bV: 90, aV: 90, bL: 88, aL: 88 }), posa(IN_PIEDI, { t: 182, bV: -20, aV: 5, bL: -18, aL: 5 })],
    muscoli: ['spalle'],
    freccia: { giunto: 'mano', tipo: 'giro', raggio: 13 },
  },
  'squat-meta-ampiezza': {
    pose: [posa(IN_PIEDI, { bV: 90, aV: 90, bL: 88, aL: 88 }), posa(IN_PIEDI, { t: 165, cV: 45, sV: -25, cL: 45, sL: -25, bV: 95, aV: 95, bL: 93, aL: 93 })],
    muscoli: ['cosce', 'glutei'],
    freccia: { giunto: 'anca' },
  },
  'passi-laterali': {
    pose: [IN_PIEDI_FRONTE, posa(IN_PIEDI_FRONTE, { cV: 22, sV: 18, cL: -22, sL: -18, bV: 110, aV: 140, bL: -110, aL: -140 })],
    muscoli: ['cosce', 'polpacci'],
    freccia: { giunto: 'caviglia' },
  },
  'flessioni-verticale-muro': {
    pose: [
      { t: 0, h: -12, bV: 14, aV: 4, bL: 10, aL: 2, cV: 172, sV: 172, pV: 180, cL: 174, sL: 172, pL: 180 },
      { t: 0, h: -12, bV: -38, aV: 40, bL: -40, aL: 38, cV: 172, sV: 172, pV: 180, cL: 174, sL: 172, pL: 180 },
    ],
    muscoli: ['spalle', 'braccia'],
    freccia: { giunto: 'testa' },
    muro: true,
    tappetino: true,
  },
  'verticale-muro-statica': {
    pose: [
      { t: 0, h: -12, bV: 14, aV: 4, bL: 10, aL: 2, cV: 120, sV: 160, pV: 180, cL: 105, sL: 140, pL: 180 },
      { t: 0, h: -12, bV: 14, aV: 4, bL: 10, aL: 2, cV: 172, sV: 172, pV: 180, cL: 174, sL: 172, pL: 180 },
    ],
    muscoli: ['spalle', 'braccia', 'addominali'],
    freccia: { giunto: 'caviglia' },
    muro: true,
    tappetino: true,
    etichetta: '20–30 s',
  },
  squat: {
    pose: [posa(IN_PIEDI, { bV: 90, aV: 90, bL: 88, aL: 88 }), posa(IN_PIEDI, { t: 140, cV: 78, sV: -28, cL: 78, sL: -28, bV: 100, aV: 100, bL: 98, aL: 98 })],
    muscoli: ['cosce', 'glutei'],
    freccia: { giunto: 'anca' },
  },
  'squat-pausa': {
    pose: [posa(IN_PIEDI, { bV: 90, aV: 90, bL: 88, aL: 88 }), posa(IN_PIEDI, { t: 140, cV: 78, sV: -28, cL: 78, sL: -28, bV: 100, aV: 100, bL: 98, aL: 98 })],
    muscoli: ['cosce', 'glutei'],
    freccia: { giunto: 'anca' },
    etichetta: 'pausa 2 s',
  },
  'push-up': {
    pose: [
      { t: 100, h: 104, bV: 0, aV: 0, bL: 3, aL: 3, cV: -80, sV: -80, pV: 10, cL: -80, sL: -80, pL: 10 },
      { t: 95, h: 100, bV: -55, aV: 5, bL: -53, aL: 6, cV: -84, sV: -84, pV: 6, cL: -84, sL: -84, pL: 6 },
    ],
    muscoli: ['petto', 'braccia'],
    freccia: { giunto: 'spalla' },
    tappetino: true,
  },
  'push-up-ginocchia': {
    pose: [
      { t: 112, h: 115, bV: 0, aV: 0, bL: 3, aL: 3, cV: -60, sV: -100, pV: -150, cL: -60, sL: -100, pL: -150 },
      { t: 104, h: 108, bV: -55, aV: 5, bL: -53, aL: 6, cV: -68, sV: -98, pV: -150, cL: -68, sL: -98, pL: -150 },
    ],
    muscoli: ['petto', 'braccia'],
    freccia: { giunto: 'spalla' },
    tappetino: true,
  },
  'affondi-indietro': {
    pose: [
      posa(IN_PIEDI, { bV: -30, aV: 50, bL: -30, aL: 50 }),
      posa(IN_PIEDI, { bV: -30, aV: 50, bL: -30, aL: 50, cV: 80, sV: -5, cL: -25, sL: -95, pL: 0 }),
    ],
    muscoli: ['cosce', 'glutei'],
    freccia: { giunto: 'cavigliaL' },
  },
  superman: {
    pose: [
      { t: 90, h: 92, bV: 92, aV: 91, bL: 90, aL: 90, cV: -90, sV: -90, pV: -170, cL: -90, sL: -90, pL: -170 },
      { t: 102, h: 106, bV: 112, aV: 110, bL: 110, aL: 108, cV: -100, sV: -101, pV: -175, cL: -99, sL: -100, pL: -175 },
    ],
    muscoli: ['lombari', 'dorsali', 'glutei'],
    freccia: { giunto: 'mano' },
    tappetino: true,
  },
  'ponte-glutei': {
    pose: [SUPINO, posa(SUPINO, { t: -68, h: -78, cV: 108, sV: 14, cL: 106, sL: 12, bV: 100, aV: 98, bL: 98, aL: 96 })],
    muscoli: ['glutei', 'femorali'],
    freccia: { giunto: 'anca' },
    tappetino: true,
  },
  crunch: {
    pose: [SUPINO, posa(SUPINO, { t: -125, h: -112, bV: 112, aV: 112, bL: 110, aL: 110 })],
    muscoli: ['addominali'],
    freccia: { giunto: 'spalla' },
    tappetino: true,
  },
  plank: {
    pose: [
      { t: 108, h: 112, bV: 0, aV: 90, bL: 2, aL: 88, cV: -62, sV: -100, pV: -150, cL: -62, sL: -100, pL: -150 },
      { t: 95, h: 99, bV: 0, aV: 90, bL: 2, aL: 88, cV: -85, sV: -85, pV: 5, cL: -85, sL: -85, pL: 5 },
    ],
    muscoli: ['addominali', 'spalle'],
    freccia: { giunto: 'ginocchio' },
    tappetino: true,
    etichetta: 'tieni',
  },
  'stretching-quadricipiti': {
    pose: [IN_PIEDI, posa(IN_PIEDI, { cV: -5, sV: -165, pV: -100, bV: -15, aV: -15, bL: 70, aL: 80 })],
    muscoli: ['cosce'],
    freccia: { giunto: 'caviglia' },
  },
  'stretching-femorali': {
    pose: [
      { t: 180, h: 180, bV: 10, aV: 10, bL: 8, aL: 8, cV: 90, sV: 90, pV: 180, cL: 90, sL: 90, pL: 180 },
      { t: 125, h: 120, bV: 95, aV: 95, bL: 93, aL: 93, cV: 90, sV: 90, pV: 180, cL: 90, sL: 90, pL: 180 },
    ],
    muscoli: ['femorali', 'polpacci'],
    freccia: { giunto: 'mano' },
    tappetino: true,
  },
  'stretching-petto-muro': {
    pose: [posa(IN_PIEDI, { bV: 88, aV: 88, bL: -5, aL: 0 }), posa(IN_PIEDI, { t: 194, h: 188, bV: 82, aV: 82, bL: -12, aL: -8, cV: -6, cL: -4 })],
    muscoli: ['petto', 'spalle'],
    freccia: { giunto: 'spalla' },
    muro: true,
  },
  'stretching-dorsali': {
    pose: [posa(IN_PIEDI_FRONTE, { bV: 170, aV: 174, bL: -170, aL: -174 }), posa(IN_PIEDI_FRONTE, { t: 160, h: 150, bV: 128, aV: 118, bL: 165, aL: 135 })],
    muscoli: ['dorsali'],
    freccia: { giunto: 'mano' },
  },
  'stretching-glutei': {
    pose: [SUPINO, posa(SUPINO, { cV: -155, sV: 80, pV: 170, cL: -168, sL: 105, pL: 175, bV: 150, aV: 122, bL: 148, aL: 120 })],
    muscoli: ['glutei'],
    freccia: { giunto: 'ginocchio' },
    tappetino: true,
  },
  'gatto-mucca': {
    pose: [posa(QUATTRO_ZAMPE, { h: 25, arco: 11 }), posa(QUATTRO_ZAMPE, { h: 150, arco: -8 })],
    muscoli: ['dorsali', 'lombari'],
    freccia: { giunto: 'schiena' },
    tappetino: true,
  },
  'rotazioni-anche': {
    pose: [QUATTRO_ZAMPE, posa(QUATTRO_ZAMPE, { cV: 70, sV: -40, pV: -120 })],
    muscoli: ['glutei'],
    freccia: { giunto: 'ginocchio', tipo: 'giro', raggio: 16 },
    tappetino: true,
  },
  'affondo-rotazione': {
    pose: [
      posa(IN_PIEDI, { cV: 75, sV: -5, cL: -30, sL: -80, pL: 0, bV: 5, aV: 5, bL: 3, aL: 3 }),
      posa(IN_PIEDI, { cV: 75, sV: -5, cL: -30, sL: -80, pL: 0, h: 160, bV: 172, aV: 174, bL: 70, aL: 60 }),
    ],
    muscoli: ['addominali', 'glutei'],
    freccia: { giunto: 'mano' },
  },
  'flessori-anca': {
    pose: [
      { t: 180, h: 180, bV: 40, aV: 20, bL: 38, aL: 18, cV: 85, sV: 0, pV: 90, cL: 5, sL: -90, pL: -90 },
      { t: 182, h: 182, bV: 40, aV: 20, bL: 38, aL: 18, cV: 62, sV: -15, pV: 90, cL: -25, sL: -92, pL: -90 },
    ],
    muscoli: ['cosce'],
    freccia: { giunto: 'anca' },
    tappetino: true,
  },
  'apertura-petto': {
    pose: [posa(IN_PIEDI, { bV: 88, aV: 88, bL: 86, aL: 86 }), posa(IN_PIEDI, { t: 184, h: 186, bV: -60, aV: -70, bL: -58, aL: -68 })],
    muscoli: ['petto', 'spalle'],
    freccia: { giunto: 'mano' },
  },
  'posizione-bambino': {
    pose: [QUATTRO_ZAMPE, { t: 62, h: 60, bV: 92, aV: 92, bL: 90, aL: 90, cV: 72, sV: -90, pV: -95, cL: 72, sL: -90, pL: -95 }],
    muscoli: ['dorsali', 'lombari'],
    freccia: { giunto: 'anca' },
    tappetino: true,
  },
  'camminata-veloce': {
    pose: [
      posa(IN_PIEDI, { cV: 25, sV: 5, pV: 95, cL: -20, sL: -35, pL: 60, bV: -25, aV: -10, bL: 30, aL: 70 }),
      posa(IN_PIEDI, { cL: 25, sL: 5, pL: 95, cV: -20, sV: -35, pV: 60, bL: -25, aL: -10, bV: 30, aV: 70 }),
    ],
    muscoli: ['cosce', 'polpacci', 'glutei'],
    freccia: { giunto: 'caviglia' },
  },
}

// ---------------------------------------------------------------------------
// Geometria
// ---------------------------------------------------------------------------
const rad = (g) => (g * Math.PI) / 180
const dir = (g) => [Math.sin(rad(g)), Math.cos(rad(g))]
const somma = (a, b) => [a[0] + b[0], a[1] + b[1]]
const per = (v, k) => [v[0] * k, v[1] * k]
const lungo = (p, g, l) => somma(p, per(dir(g), l))
const r1 = (n) => Math.round(n * 10) / 10

/** Calcola i punti del corpo (cinematica diretta) */
function scheletro(p) {
  const fronte = p.vista === 'fronte'
  const u = dir(p.t)
  const n = [-u[1] * (p.f || 1), u[0] * (p.f || 1)] // normale verso il davanti del corpo
  const anca = [0, 0]
  const spalla = lungo(anca, p.t, L.busto)
  const testa = lungo(spalla, p.h ?? p.t, L.collo + L.testa)
  // Di fronte braccia e gambe partono dai lati; di lato coincidono
  const latoSpalla = fronte ? per(n, 16) : [0, 0]
  const latoAnca = fronte ? per(n, 8) : [0, 0]
  const lunghezzaPiede = fronte ? 8 : L.piede
  const arto = (attacco, segno, b, a) => {
    const base = somma(attacco, per(latoSpalla, segno))
    const gomito = lungo(base, b, L.braccio)
    return { spalla: base, gomito, mano: lungo(gomito, a, L.avambraccio) }
  }
  const gamba = (segno, c, s, pi) => {
    const base = somma(anca, per(latoAnca, segno))
    const ginocchio = lungo(base, c, L.coscia)
    const caviglia = lungo(ginocchio, s, L.stinco)
    return { anca: base, ginocchio, caviglia, punta: lungo(caviglia, pi, lunghezzaPiede) }
  }
  const arco = p.arco || 0
  const meta = per(somma(anca, spalla), 0.5)
  const schiena = somma(meta, per(n, -arco * 0.9 - S.busto / 2))
  return {
    p,
    fronte,
    n,
    anca,
    spalla,
    testa,
    arco,
    schiena,
    bV: arto(spalla, 1, p.bV, p.aV),
    bL: arto(spalla, -1, p.bL, p.aL),
    gV: gamba(1, p.cV, p.sV, p.pV),
    gL: gamba(-1, p.cL, p.sL, p.pL),
  }
}

/** Tutti i punti con il loro "raggio", per appoggiare la figura a terra e centrarla */
function puntiDi(k) {
  return [
    [k.testa, L.testa],
    [k.spalla, S.busto / 2],
    [k.anca, S.busto / 2],
    ...[k.bV, k.bL].flatMap((b) => [[b.gomito, 5], [b.mano, 4.5]]),
    ...[k.gV, k.gL].flatMap((g) => [[g.ginocchio, S.coscia / 2], [g.caviglia, S.stinco / 2], [g.punta, S.piede / 2]]),
  ]
}

function trasla(k, dx, dy) {
  const t = (q) => [q[0] + dx, q[1] + dy]
  const tb = (b) => ({ spalla: t(b.spalla), gomito: t(b.gomito), mano: t(b.mano) })
  const tg = (g) => ({ anca: t(g.anca), ginocchio: t(g.ginocchio), caviglia: t(g.caviglia), punta: t(g.punta) })
  return { ...k, anca: t(k.anca), spalla: t(k.spalla), testa: t(k.testa), schiena: t(k.schiena), bV: tb(k.bV), bL: tb(k.bL), gV: tg(k.gV), gL: tg(k.gL) }
}

/** Appoggia la figura a terra (o sull'asciugamano) e la centra nel riquadro */
function posiziona(k, es, centroX) {
  const punti = puntiDi(k)
  const basso = Math.max(...punti.map(([q, r]) => q[1] + r))
  const sinistra = Math.min(...punti.map(([q, r]) => q[0] - r))
  const destra = Math.max(...punti.map(([q, r]) => q[0] + r))
  const terra = TERRA - (es.tappetino ? 3 : 0)
  return trasla(k, centroX - (sinistra + destra) / 2, terra - basso)
}

// ---------------------------------------------------------------------------
// Disegno
// ---------------------------------------------------------------------------
const linea = (a, b, w, classe) =>
  `<line x1="${r1(a[0])}" y1="${r1(a[1])}" x2="${r1(b[0])}" y2="${r1(b[1])}" stroke-width="${w}" class="${classe}"/>`
const cerchio = (c, r, classe) => `<circle cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r}" class="${classe}"/>`
const tratto = (a, b, da, a2) => [somma(a, per(somma(b, per(a, -1)), da)), somma(a, per(somma(b, per(a, -1)), a2))]

function busto(k, w) {
  if (!k.arco) return linea(k.anca, k.spalla, w, 'corpo')
  const meta = per(somma(k.anca, k.spalla), 0.5)
  const c = somma(meta, per(k.n, -k.arco * 2))
  return `<path d="M${r1(k.anca[0])} ${r1(k.anca[1])} Q${r1(c[0])} ${r1(c[1])} ${r1(k.spalla[0])} ${r1(k.spalla[1])}" stroke-width="${w}" class="corpo" fill="none"/>`
}

function arto(b, classe) {
  return linea(b.spalla, b.gomito, S.braccio, classe) + linea(b.gomito, b.mano, S.avambraccio, classe) + cerchio(b.mano, 4.5, classe + ' pieno')
}

function gamba(g, classe) {
  return linea(g.anca, g.ginocchio, S.coscia, classe) + linea(g.ginocchio, g.caviglia, S.stinco, classe) + linea(g.caviglia, g.punta, S.piede, classe)
}

function muscoli(k, elenco) {
  const out = []
  const sposta = (q, d) => somma(q, per(k.n, d))
  const parteBusto = (da, a, lato, w) => {
    const [x, y] = tratto(k.anca, k.spalla, da, a)
    const d = k.fronte ? 0 : lato * (S.busto / 2 - w / 2)
    return linea(sposta(x, d), sposta(y, d), k.fronte ? w * 1.6 : w, 'muscolo')
  }
  for (const m of elenco) {
    if (m === 'cosce' || m === 'femorali') for (const g of [k.gL, k.gV]) out.push(linea(...tratto(g.anca, g.ginocchio, 0.15, 0.85), 8, 'muscolo'))
    if (m === 'polpacci') for (const g of [k.gL, k.gV]) out.push(linea(...tratto(g.ginocchio, g.caviglia, 0.12, 0.6), 6, 'muscolo'))
    if (m === 'braccia') for (const b of [k.bL, k.bV]) out.push(linea(...tratto(b.spalla, b.gomito, 0.2, 0.85), 6, 'muscolo'))
    if (m === 'spalle') {
      if (k.fronte) for (const b of [k.bL, k.bV]) out.push(cerchio(b.spalla, 6.5, 'muscolo pieno'))
      else out.push(cerchio(k.spalla, 7, 'muscolo pieno'))
    }
    if (m === 'glutei') {
      if (k.fronte) for (const g of [k.gL, k.gV]) out.push(cerchio(g.anca, 6, 'muscolo pieno'))
      else out.push(cerchio(sposta(k.anca, -5), 7.5, 'muscolo pieno'))
    }
    if (m === 'petto') out.push(parteBusto(0.6, 0.9, 1, 9))
    if (m === 'addominali') out.push(parteBusto(0.15, 0.55, 1, 9))
    if (m === 'lombari') out.push(parteBusto(0.12, 0.45, -1, 8))
    if (m === 'dorsali') out.push(parteBusto(0.48, 0.88, -1, 9))
  }
  return out.join('')
}

function giunto(k, nome) {
  return {
    testa: k.testa,
    spalla: k.spalla,
    anca: k.anca,
    schiena: k.schiena,
    mano: k.bV.mano,
    gomito: k.bV.gomito,
    ginocchio: k.gV.ginocchio,
    caviglia: k.gV.caviglia,
    cavigliaL: k.gL.caviglia,
  }[nome]
}

/** Freccia del movimento: dal punto nella posa 1 verso dove arriva nella posa 2 */
function freccia(k1, k2, f) {
  const p = giunto(k1, f.giunto)
  if (f.tipo === 'giro') {
    const r = f.raggio || 16
    const a0 = rad(-60)
    const a1 = rad(220)
    const da = [p[0] + r * Math.cos(a0), p[1] + r * Math.sin(a0)]
    const a = [p[0] + r * Math.cos(a1), p[1] + r * Math.sin(a1)]
    const punta = punteFreccia(a, [-Math.sin(a1), Math.cos(a1)])
    return `<path d="M${r1(da[0])} ${r1(da[1])} A${r} ${r} 0 1 1 ${r1(a[0])} ${r1(a[1])}" class="freccia"/>${punta}`
  }
  const q = giunto(k2, f.giunto)
  let d = [q[0] - p[0], q[1] - p[1]]
  const lung = Math.hypot(...d) || 1
  d = per(d, 1 / lung)
  const l = Math.min(Math.max(lung, 24), 44)
  // Spostata di lato, dalla parte opposta al corpo
  let normale = [-d[1], d[0]]
  const centro = per(somma(k1.anca, k1.spalla), 0.5)
  if ((p[0] - centro[0]) * normale[0] + (p[1] - centro[1]) * normale[1] < 0) normale = per(normale, -1)
  let inizio = somma(p, per(normale, 17))
  let fine = somma(inizio, per(d, l))
  // Sempre dentro il riquadro
  const xs = [inizio[0], fine[0]]
  const ys = [inizio[1], fine[1]]
  const dx = Math.max(0, 14 - Math.min(...xs)) - Math.max(0, Math.max(...xs) - (PANNELLO.l - 14))
  const dy = Math.max(0, 40 - Math.min(...ys)) - Math.max(0, Math.max(...ys) - (TERRA - 6))
  inizio = somma(inizio, [dx, dy])
  fine = somma(fine, [dx, dy])
  const ctrl = somma(per(somma(inizio, fine), 0.5), per(normale, 5))
  return `<path d="M${r1(inizio[0])} ${r1(inizio[1])} Q${r1(ctrl[0])} ${r1(ctrl[1])} ${r1(fine[0])} ${r1(fine[1])}" class="freccia"/>${punteFreccia(fine, d)}`
}

function punteFreccia(p, d) {
  const n = [-d[1], d[0]]
  const a = somma(p, somma(per(d, -8), per(n, 5)))
  const b = somma(p, somma(per(d, -8), per(n, -5)))
  return `<path d="M${r1(a[0])} ${r1(a[1])} L${r1(p[0])} ${r1(p[1])} L${r1(b[0])} ${r1(b[1])}" class="freccia"/>`
}

function figura(k, es) {
  const lontani = k.fronte ? 'corpo' : 'lontano'
  return [
    arto(k.bL, lontani),
    gamba(k.gL, lontani),
    busto(k, k.fronte ? S.bustoFronte : S.busto),
    linea(k.spalla, lungo(k.spalla, k.p.h ?? k.p.t, L.collo), S.collo, 'corpo'),
    cerchio(k.testa, L.testa, 'corpo pieno'),
    gamba(k.gV, 'corpo'),
    arto(k.bV, 'corpo'),
    muscoli(k, es.muscoli || []),
  ].join('')
}

function attrezzi(k, es, x0) {
  const out = []
  if (es.tappetino) {
    const vicini = puntiDi(k).filter(([q]) => q[1] > TERRA - 30)
    const xs = vicini.map(([q]) => q[0])
    const da = Math.max(x0 + 8, Math.min(...xs) - 10)
    const a = Math.min(x0 + PANNELLO.l - 8, Math.max(...xs) + 10)
    out.push(`<rect x="${r1(da)}" y="${TERRA - 3}" width="${r1(a - da)}" height="5" rx="2.5" class="tappetino"/>`)
  }
  if (es.muro) {
    const destra = Math.max(...puntiDi(k).map(([q, r]) => q[0] + r))
    out.push(`<rect x="${r1(destra)}" y="16" width="9" height="${TERRA - 16}" rx="2" class="muro"/>`)
  }
  return out.join('')
}

const STILE = `
.sfondo{fill:#F2F2F7}.terra{stroke:#C7C7CC}.corpo{stroke:#8E8E93;fill:#8E8E93}.lontano{stroke:#C7C7CC;fill:#C7C7CC}
.muscolo{stroke:#FF3B30;fill:#FF3B30}line,path{stroke-linecap:round;stroke-linejoin:round}line.corpo,line.lontano,line.muscolo,path.corpo{fill:none}
.pieno{stroke:none}.freccia{fill:none;stroke:#007AFF;stroke-width:3.5}.tappetino{fill:#B9CBE4}.muro{fill:#D1D1D6}
.num{fill:#FFFFFF;font:700 15px -apple-system,system-ui,sans-serif}.bollo{fill:#1C1C1E}.tra{fill:none;stroke:#AEAEB2;stroke-width:4}
.etichetta{fill:#636366;font:600 13px -apple-system,system-ui,sans-serif}
@media (prefers-color-scheme:dark){.sfondo{fill:#2C2C2E}.terra{stroke:#48484A}.corpo{stroke:#AEAEB2;fill:#AEAEB2}.lontano{stroke:#636366;fill:#636366}
.muscolo{stroke:#FF453A;fill:#FF453A}.freccia{stroke:#0A84FF}.tappetino{fill:#3A4A63}.muro{fill:#48484A}.bollo{fill:#F2F2F7}.num{fill:#1C1C1E}
.tra{stroke:#636366}.etichetta{fill:#AEAEB2}}`

function pannello(k, es, x0, numero, extra = '') {
  return `<g>
<rect x="${x0}" y="0" width="${PANNELLO.l}" height="${PANNELLO.a}" rx="18" class="sfondo"/>
<line x1="${x0 + 10}" y1="${TERRA + 2}" x2="${x0 + PANNELLO.l - 10}" y2="${TERRA + 2}" stroke-width="2" class="terra"/>
${attrezzi(k, es, x0)}${figura(k, es)}${extra}
<circle cx="${x0 + 22}" cy="22" r="13" class="bollo"/><text x="${x0 + 22}" y="27.5" text-anchor="middle" class="num">${numero}</text>
</g>`
}

function disegna(id, es) {
  const larghezza = PANNELLO.l * 2 + 40
  const c1 = es.muro ? PANNELLO.l / 2 - 10 : PANNELLO.l / 2
  const k1 = posiziona(scheletro(es.pose[0]), es, c1)
  const x2 = PANNELLO.l + 40
  const k2 = posiziona(scheletro(es.pose[1]), es, x2 + c1)
  // Per la freccia confronto le due pose nello stesso riquadro
  const k2qui = trasla(k2, -x2, 0)
  const etichetta = es.etichetta
    ? `<text x="${x2 + PANNELLO.l - 14}" y="30" text-anchor="end" class="etichetta">${es.etichetta}</text>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${larghezza} ${PANNELLO.a}" role="img" aria-label="${id}">
<style>${STILE}</style>
${pannello(k1, es, 0, 1, es.freccia ? freccia(k1, k2qui, es.freccia) : '')}
<path d="M${PANNELLO.l + 12} ${PANNELLO.a / 2 - 12} L${PANNELLO.l + 26} ${PANNELLO.a / 2} L${PANNELLO.l + 12} ${PANNELLO.a / 2 + 12}" class="tra"/>
${pannello(k2, es, x2, 2, etichetta)}
</svg>
`
}

mkdirSync(CARTELLA, { recursive: true })
for (const [id, es] of Object.entries(ESERCIZI)) writeFileSync(`${CARTELLA}${id}.svg`, disegna(id, es))
console.log(`Disegnati ${Object.keys(ESERCIZI).length} esercizi in public/immagini/esercizi/`)
