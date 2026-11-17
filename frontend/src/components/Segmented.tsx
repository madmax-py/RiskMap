
type Opt<T extends string> = { value: T; label: string; count?: number }

/** Abas/chips. A opção ativa troca de cor no lugar (sem indicador deslizando entre opções distantes). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  variant = 'tabs',
  ariaLabel,
}: {
  options: Opt<T>[]
  value: T
  onChange: (v: T) => void
  variant?: 'tabs' | 'chips'
  ariaLabel?: string
}) {
  return (
    <div className={`segmented segmented--${variant}`} role="tablist" aria-label={ariaLabel}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            className={active ? 'is-active' : ''}
            onClick={() => onChange(o.value)}
            type="button"
          >
            <span className="segmented__label">
              {o.label}
              {o.count !== undefined && <em>{o.count}</em>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
