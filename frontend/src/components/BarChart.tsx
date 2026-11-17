import { motion } from 'framer-motion'
import { useState } from 'react'

/** Gráfico de barras por hora (0h..23h), com tooltip ao tocar/passar o mouse. */
export function HourlyChart({ data }: { data: number[] }) {
  const max = Math.max(...data)
  const [hover, setHover] = useState<number | null>(null)
  return (
    <div className="hchart">
      <div className="hchart__bars" role="img" aria-label="Ocorrências por hora do dia">
        {data.map((v, h) => (
          <button
            type="button"
            key={h}
            className={`hchart__col ${hover === h ? 'is-hover' : ''}`}
            onMouseEnter={() => setHover(h)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(h)}
            onBlur={() => setHover(null)}
            onClick={() => setHover(h)}
            aria-label={`${h}h: ${v} ocorrências`}
          >
            <motion.span
              className="hchart__bar"
              style={{ opacity: 0.35 + 0.65 * (v / max) }}
              initial={{ height: 0 }}
              whileInView={{ height: `${(v / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            />
            {hover === h && (
              <motion.span className="hchart__tip" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                {h}h · {v}
              </motion.span>
            )}
          </button>
        ))}
      </div>
      <div className="hchart__axis">
        {['0h', '6h', '12h', '18h', '24h'].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  )
}
