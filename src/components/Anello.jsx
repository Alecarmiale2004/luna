// Anello di avanzamento, ispirato agli anelli di Fitness. Usa il colore della sezione (--tint).

export function Anello({ valore = 0, dimensione = 120, spessore = 14, children, etichetta }) {
  const raggio = (dimensione - spessore) / 2
  const circonferenza = 2 * Math.PI * raggio
  const avanzamento = Math.min(Math.max(valore, 0), 1)
  return (
    <div class="anello" style={{ width: dimensione, height: dimensione }} role="img" aria-label={etichetta}>
      <svg width={dimensione} height={dimensione} viewBox={`0 0 ${dimensione} ${dimensione}`}>
        <circle class="anello-traccia" cx={dimensione / 2} cy={dimensione / 2} r={raggio} fill="none" stroke-width={spessore} />
        <circle
          class="anello-arco"
          cx={dimensione / 2}
          cy={dimensione / 2}
          r={raggio}
          fill="none"
          stroke-width={spessore}
          stroke-linecap="round"
          stroke-dasharray={circonferenza}
          stroke-dashoffset={circonferenza * (1 - avanzamento)}
          style={{ opacity: avanzamento > 0 ? 1 : 0 }}
        />
      </svg>
      {children && <div class="anello-centro">{children}</div>}
    </div>
  )
}
