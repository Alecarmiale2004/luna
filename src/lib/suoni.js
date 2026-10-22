// Suono a fine timer e schermo sempre acceso durante l'allenamento.
// Su iPhone l'audio si può attivare solo dopo un tocco: sbloccaAudio() va chiamata
// dentro il tocco su "Inizia".
import { vibra } from './tocco.js'

let contesto = null

export function sbloccaAudio() {
  try {
    contesto ||= new (window.AudioContext || window.webkitAudioContext)()
    if (contesto.state === 'suspended') contesto.resume()
  } catch {
    contesto = null
  }
}

/** Tre bip brevi (l'ultimo più alto) */
export function bip() {
  vibra()
  if (!contesto) return
  const t = contesto.currentTime
  ;[0, 0.18, 0.36].forEach((ritardo, i) => {
    const osc = contesto.createOscillator()
    const vol = contesto.createGain()
    osc.frequency.value = i === 2 ? 1320 : 880
    vol.gain.setValueAtTime(0.0001, t + ritardo)
    vol.gain.exponentialRampToValueAtTime(0.35, t + ritardo + 0.01)
    vol.gain.exponentialRampToValueAtTime(0.0001, t + ritardo + 0.14)
    osc.connect(vol).connect(contesto.destination)
    osc.start(t + ritardo)
    osc.stop(t + ritardo + 0.15)
  })
}

let blocco = null

/** Tiene lo schermo acceso (se il telefono lo permette) */
export async function schermoAcceso(attivo) {
  try {
    if (attivo && !blocco && navigator.wakeLock) {
      blocco = await navigator.wakeLock.request('screen')
      blocco.addEventListener('release', () => (blocco = null))
    } else if (!attivo && blocco) {
      await blocco.release()
      blocco = null
    }
  } catch {
    blocco = null
  }
}

/** 75 → "1:15" */
export function mmss(secondi) {
  const s = Math.max(0, Math.ceil(secondi))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
