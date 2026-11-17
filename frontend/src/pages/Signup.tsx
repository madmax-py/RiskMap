import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Check, ChevronLeft, Lock, Mail, User } from 'lucide-react'
import { AuthShell } from '../components/AuthShell'
import { Field } from '../components/Field'
import { Button } from '../components/Button'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { signupSchema, type SignupForm } from '../lib/validation'
import { fadeUp, stagger } from '../lib/motion'

function strength(p: string) {
  let s = 0
  if (p.length >= 6) s++
  if (p.length >= 10) s++
  if (/\d/.test(p) && /[A-Za-z]/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p) || /[A-Z]/.test(p)) s++
  return s
}

export default function Signup() {
  const { dispatch } = useApp()
  const toast = useToast()
  const nav = useNavigate()
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({ resolver: zodResolver(signupSchema), mode: 'onTouched' })
  const pw = watch('password') ?? ''
  const st = strength(pw)
  const terms = watch('terms')

  const onSubmit = async (d: SignupForm) => {
    await new Promise((r) => setTimeout(r, 1000))
    dispatch({ type: 'login', user: { name: d.name.trim(), email: d.email.trim() } })
    toast('Conta criada com sucesso!')
    nav('/mapa')
  }

  return (
    <AuthShell compactLogo>
      <motion.form onSubmit={handleSubmit(onSubmit)} noValidate variants={stagger(0.05, 0.1)} initial="hidden" animate="show">
        <motion.div variants={fadeUp} className="auth__head">
          <Link to="/login" className="icon-btn" aria-label="Voltar para o login">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="auth__title">Criar conta</h1>
        </motion.div>
        <motion.div variants={fadeUp}>
          <Field icon={<User size={22} />} placeholder="Nome completo" autoComplete="name" error={errors.name?.message} {...register('name')} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <Field icon={<Mail size={22} />} type="email" placeholder="E-mail" autoComplete="email" error={errors.email?.message} {...register('email')} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <Field icon={<Lock size={22} />} type="password" placeholder="Senha" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
          {pw && (
            <div className="strength" data-level={st}>
              {[0, 1, 2, 3].map((i) => (
                <i key={i} className={i < st ? 'on' : ''} />
              ))}
              <span>{['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'][st]}</span>
            </div>
          )}
        </motion.div>
        <motion.div variants={fadeUp}>
          <Field icon={<Lock size={22} />} type="password" placeholder="Confirmar senha" autoComplete="new-password" error={errors.confirm?.message} {...register('confirm')} />
        </motion.div>
        <motion.label variants={fadeUp} className={`check ${errors.terms ? 'has-error' : ''}`}>
          <input type="checkbox" {...register('terms')} />
          <span className="check__box">{terms && <Check size={14} strokeWidth={3} />}</span>
          <span>
            Li e aceito os <a href="#/cadastro">termos de uso</a> e a <a href="#/cadastro">política de privacidade</a>
          </span>
        </motion.label>
        {errors.terms && <p className="field__error">{errors.terms.message}</p>}
        <motion.div variants={fadeUp}>
          <Button type="submit" block loading={isSubmitting}>
            {isSubmitting ? 'Criando conta...' : 'Criar conta'}
          </Button>
        </motion.div>
        <motion.p variants={fadeUp} className="auth__switch">
          Já tem uma conta?
          <Link to="/login">Entrar</Link>
        </motion.p>
      </motion.form>
    </AuthShell>
  )
}
