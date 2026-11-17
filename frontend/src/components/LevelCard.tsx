import { ChevronRight, Medal } from 'lucide-react'
import { LEVEL_NAME, nextLevel, type Level } from '../data/benefits'

/** Nível atual, pontos e quanto falta para o próximo (RF-006, RNE-002). */
export function LevelCard({ points, level, onClick, compact }: { points: number; level: Level; onClick?: () => void; compact?: boolean }) {
  const next = nextLevel(points)
  const body = (
    <>
      <span className={`level-medal level-medal--${level}`} aria-hidden="true">
        <Medal size={compact ? 22 : 26} />
      </span>
      <span className="level-card__body">
        <span className="level-card__title">
          <strong>Nível {LEVEL_NAME[level]}</strong>
          <span>{points} pontos</span>
        </span>
        <span
          className="level-bar"
          role="progressbar"
          aria-label={next ? `Progresso até o nível ${LEVEL_NAME[next.level]}` : 'Nível máximo'}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((next?.progress ?? 1) * 100)}
        >
          <i style={{ width: `${(next?.progress ?? 1) * 100}%` }} />
        </span>
        <small>{next ? `Faltam ${next.missing} pontos para o nível ${LEVEL_NAME[next.level]}` : 'Você está no nível máximo'}</small>
      </span>
      {onClick && <ChevronRight size={20} className="level-card__chev" />}
    </>
  )
  return onClick ? (
    <button type="button" className={`card level-card ${compact ? 'level-card--compact' : ''}`} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className={`card level-card ${compact ? 'level-card--compact' : ''}`}>{body}</div>
  )
}
