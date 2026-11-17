import type { Transition, Variants } from 'framer-motion'

/**
 * Movimento do app: curto, suave e sem mola.
 * Uma curva só (ease-out exponencial) e duas durações. Nada quica, pulsa ou conta sozinho.
 */
export const ease = [0.22, 1, 0.36, 1] as const
export const tween: Transition = { duration: 0.2, ease }
export const tweenSlow: Transition = { duration: 0.28, ease }

/** Container: os filhos entram quase juntos (no máximo 30 ms entre eles). */
export const stagger = (delay = 0.02, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: Math.min(delay, 0.03), delayChildren: Math.min(delayChildren, 0.15) } },
})

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: tweenSlow },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: tweenSlow },
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
