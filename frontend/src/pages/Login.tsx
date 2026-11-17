import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Lock, Mail } from 'lucide-react'
import { AuthShell } from '../components/AuthShell'
import { Field } from '../components/Field'
import { Button } from '../components/Button'
import { GoogleIcon } from '../components/Logo'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { loginSchema, nameFromEmail, type LoginForm } from '../lib/validation'
import { fadeUp, stagger } from '../lib/motion'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function Login() {
  const { dispatch } = useApp()
  const toast = useToast()
  const nav = useNavigate()
  const [google, setGoogle] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema), mode: 'onTouched' })

  const onSubmit = async (data: LoginForm) => {
    await wait(900) // simula a chamada à API
    dispatch({ type: 'login', user: { name: nameFromEmail(data.email) || 'Usuário', email: data.email.trim() } })
    nav('/mapa')
  }

  const onGoogle = async () => {
    setGoogle(true)
    await wait(1100)
    dispatch({ type: 'login', user: { name: 'Pedro Silva', email: 'pedro@email.com' } })
    toast('Conectado com Google')
    nav('/mapa')
  }

  return (
    <AuthShell>
      <motion.form onSubmit={handleSubmit(onSubmit)} noValidate variants={stagger(0.06, 0.15)} initial="hidden" animate="show">
        <motion.h1 variants={fadeUp} className="auth__title">
          Entrar
        </motion.h1>
        <motion.div variants={fadeUp}>
          <Field icon={<Mail size={22} />} type="email" placeholder="E-mail" autoComplete="email" error={errors.email?.message} {...register('email')} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <Field icon={<Lock size={22} />} type="password" placeholder="Senha" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
        </motion.div>
        <motion.div variants={fadeUp} className="auth__forgot">
          <Link to="/recuperar-senha">Esqueci minha senha</Link>
        </motion.div>
        <motion.div variants={fadeUp}>
          <Button type="submit" block loading={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </motion.div>
        <motion.div variants={fadeUp} className="divider">
          <span>ou</span>
        </motion.div>
        <motion.div variants={fadeUp}>
          <Button type="button" variant="secondary" block icon={!google && <GoogleIcon />} loading={google} onClick={onGoogle}>
            Entrar com Google
          </Button>
        </motion.div>
        <motion.p variants={fadeUp} className="auth__switch">
          Ainda não tem uma conta?
          <Link to="/cadastro">Criar conta</Link>
        </motion.p>
      </motion.form>
    </AuthShell>
  )
}
