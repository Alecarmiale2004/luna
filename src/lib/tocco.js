// Piccola vibrazione di conferma al tocco.
// Su Android usa navigator.vibrate; su iPhone (iOS 18+) sfrutta il fatto che
// l'interruttore nativo <input switch> produce un "tick" quando cambia stato.

let etichetta = null

export function vibra() {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(8)
      return
    }
    if (!etichetta) {
      const input = document.createElement('input')
      input.type = 'checkbox'
      input.setAttribute('switch', '')
      input.id = 'luna-vibrazione'
      input.style.display = 'none'
      etichetta = document.createElement('label')
      etichetta.htmlFor = input.id
      etichetta.style.display = 'none'
      document.body.append(input, etichetta)
    }
    etichetta.click()
  } catch {
    // nessuna vibrazione disponibile: pazienza
  }
}
