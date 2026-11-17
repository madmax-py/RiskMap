import { forwardRef, type ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'

type Props = Omit<HTMLMotionProps<'button'>, 'children'> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'danger-outline'
  size?: 'md' | 'lg' | 'sm'
  loading?: boolean
  block?: boolean
  icon?: ReactNode
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'lg', loading, block, icon, children, className, disabled, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={disabled || loading ? undefined : { scale: 0.98 }}
      className={`btn btn--${variant} btn--${size} ${block ? 'btn--block' : ''} ${loading ? 'is-loading' : ''} ${className ?? ''}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : icon}
      <span>{children}</span>
    </motion.button>
  )
})
