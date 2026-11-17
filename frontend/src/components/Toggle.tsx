import { motion } from 'framer-motion'

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`toggle ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <motion.span className="toggle__knob" layout transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }} />
    </button>
  )
}
