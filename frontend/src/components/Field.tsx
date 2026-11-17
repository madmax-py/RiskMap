import { forwardRef, useEffect, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  icon?: ReactNode
  error?: string
  label?: string
  trailing?: ReactNode
}

/** Input com ícone, mensagem de erro animada e botão de mostrar senha. */
export const Field = forwardRef<HTMLInputElement, Props>(function Field(
  { icon, error, label, trailing, type, className, ...rest },
  ref,
) {
  const id = useId()
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  const controls = useAnimationControls()
  useEffect(() => {
    if (error) controls.start({ x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.35 } })
  }, [error, controls])
  return (
    <div className={`field ${error ? 'has-error' : ''} ${className ?? ''}`}>
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
      )}
      <motion.div
        className="field__box"
        animate={controls}
      >
        {icon && <span className="field__icon">{icon}</span>}
        <input
          id={id}
          ref={ref}
          type={isPassword && show ? 'text' : type}
          aria-invalid={!!error}
          aria-describedby={error ? id + '-err' : undefined}
          {...rest}
        />
        {isPassword && (
          <button type="button" className="field__action" onClick={() => setShow((s) => !s)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
            {show ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
        {trailing}
      </motion.div>
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            id={id + '-err'}
            className="field__error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            role="alert"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
})
