import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, Mail, MailCheck } from 'lucide-react'
import { AuthShell } from '../components/AuthShell'
import { Field } from '../components/Field'
import { Button } from '../components/Button'
import { forgotSchema, type ForgotForm } from '../lib/validation'

export default function ForgotPassword() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({ resolver: zodResolver(forgotSchema), mode: 'onTouched' })

  const onSubmit = async (d: ForgotForm) => {
    await new Promise((r) => setTimeout(r, 900))
    setSentTo(d.email)
  }

  return (
    <AuthShell compactLogo>
      <AnimatePresence mode="wait">
        {!sentTo ? (
          <motion.form key="form" onSubmit={handleSubmit(onSubmit)} noValidate initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="auth__head">
              <Link to="/login" className="icon-btn" aria-label="Voltar para o login">
                <ChevronLeft size={24} />
              </Link>
              <h1 className="auth__title">Recuperar senha</h1>
            </div>
            <p className="muted">Informe o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.</p>
            <Field icon={<Mail size={22} />} type="email" placeholder="E-mail" autoComplete="email" error={errors.email?.message} {...register('email')} />
            <Button type="submit" block loading={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Enviar link'}
            </Button>
          </motion.form>
        ) : (
          <motion.div key="sent" className="sent" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
            <motion.span className="sent__icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
              <MailCheck size={34} />
            </motion.span>
            <h1 className="auth__title">Verifique seu e-mail</h1>
            <p className="muted">
              Se existir uma conta com <strong>{sentTo}</strong>, você vai receber o link em alguns minutos.
            </p>
            <Link to="/login" className="btn btn--primary btn--lg btn--block">
              <span>Voltar ao login</span>
            </Link>
            <button className="link-btn" onClick={() => setSentTo(null)}>
              Usar outro e-mail
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  )
}
