import type { RiskLevel } from '../lib/city'

/** Vocabulário único dos níveis. Use sempre estes nomes (nunca "área segura": os dados são da comunidade). */
export const LEVEL_LABEL: Record<RiskLevel, string> = { alto: 'Alto risco', atencao: 'Atenção', baixo: 'Baixo risco' }

export function RiskTag({ level, children }: { level: RiskLevel; children?: string }) {
  return <span className={`risk-tag risk-tag--${level}`}>{children ?? LEVEL_LABEL[level]}</span>
}

export function Pill({ level, children, dot = true }: { level: RiskLevel | 'neutral'; children: React.ReactNode; dot?: boolean }) {
  return (
    <span className={`pill pill--${level}`}>
      {dot && <i />}
      {children}
    </span>
  )
}
