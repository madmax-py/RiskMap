import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Bell, ChevronRight, CircleHelp, LogOut, Sparkles, Mail, Moon, Pencil, Route, Ruler, ShieldAlert, User } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Dialog } from '../components/Dialog'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { useApp } from '../store/AppStore'
import { LevelCard } from '../components/LevelCard'
import { useToast } from '../components/Toast'
import { profileSchema, type ProfileForm } from '../lib/validation'
import { fadeUp, stagger } from '../lib/motion'

export const PREF_LABEL = { segura: 'Mais segura', equilibrada: 'Equilibrada', rapida: 'Mais rápida' }

export default function Profile() {
  const { user, settings, history, reports, dispatch, engagement, level, subscription } = useApp()
  const nav = useNavigate()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const groups = [
    {
      title: 'Assinatura',
      items: [{ to: 'assinatura', icon: Sparkles, label: 'RiskMap Mais', value: subscription.active ? 'Ativa' : 'Conhecer' }],
    },
    {
      title: 'Preferências',
      items: [
        { to: 'notificacoes', icon: Bell, label: 'Notificações', value: settings.notifyRisk ? 'Ativadas' : 'Desativadas' },
        { to: 'preferencia-rota', icon: Route, label: 'Preferência de rota', value: PREF_LABEL[settings.routePreference] },
        { to: 'unidades', icon: Ruler, label: 'Unidades de medida', value: settings.units === 'km' ? 'Quilômetros' : 'Milhas' },
      ],
    },
    {
      title: 'Aplicativo',
      items: [
        { to: 'tema', icon: Moon, label: 'Tema', value: settings.theme === 'escuro' ? 'Escuro' : settings.theme === 'claro' ? 'Claro' : 'Sistema' },
        { to: 'privacidade', icon: ShieldAlert, label: 'Segurança e privacidade' },
        { to: 'ajuda', icon: CircleHelp, label: 'Ajuda e suporte' },
      ],
    },
  ]

  return (
    <div className="page">
      <PageHeader title="Perfil" />
      <motion.div className="page-body narrow" variants={stagger(0.06, 0.04)} initial="hidden" animate="show">
        <motion.div variants={fadeUp} className="card profile-card">
          <span className="avatar">
            <User size={40} />
          </span>
          <div>
            <h2>{user?.name}</h2>
            <p>{user?.email}</p>
            <button className="btn-outline-sm" onClick={() => setEditing(true)}>
              <Pencil size={14} /> Editar perfil
            </button>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="stat-strip">
          <div>
            <strong>{history.length}</strong>
            <span>Rotas</span>
          </div>
          <div>
            <strong>{reports.length}</strong>
            <span>Ocorrências enviadas</span>
          </div>
          <div>
            <strong>{engagement.points}</strong>
            <span>Pontos</span>
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <LevelCard points={engagement.points} level={level} onClick={() => nav('/beneficios/nivel')} compact />
        </motion.div>

        {groups.map((g) => (
          <motion.section variants={fadeUp} key={g.title}>
            <p className="section-title">{g.title}</p>
            <ul className="card menu">
              {g.items.map(({ to, icon: Icon, label, value }) => (
                <li key={to}>
                  <motion.button onClick={() => nav(to.startsWith('/') ? to : `/perfil/${to}`)}>
                    <Icon size={26} className="menu__icon" />
                    <span className="menu__label">{label}</span>
                    {value && <span className="menu__value">{value}</span>}
                    <ChevronRight size={20} />
                  </motion.button>
                </li>
              ))}
            </ul>
          </motion.section>
        ))}

        <motion.button variants={fadeUp} className="card logout" onClick={() => setLeaving(true)}>
          <LogOut size={26} /> Sair da conta
        </motion.button>
        <motion.p variants={fadeUp} className="muted small center">
          RiskMap · protótipo v0.1
        </motion.p>
      </motion.div>

      <EditProfile open={editing} onClose={() => setEditing(false)} onSaved={() => toast('Perfil atualizado')} />

      <Dialog open={leaving} onClose={() => setLeaving(false)} title="Sair da conta?">
        <p className="muted">Você vai precisar entrar de novo para ver seus alertas e rotas.</p>
        <div className="dialog__actions">
          <Button variant="secondary" onClick={() => setLeaving(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              dispatch({ type: 'logout' })
              nav('/login')
            }}
          >
            Sair
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

function EditProfile({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { user, dispatch } = useApp()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileForm>({ resolver: zodResolver(profileSchema), values: { name: user?.name ?? '', email: user?.email ?? '' }, mode: 'onTouched' })

  const close = () => {
    reset()
    onClose()
  }
  const submit = async (d: ProfileForm) => {
    await new Promise((r) => setTimeout(r, 700))
    dispatch({ type: 'updateUser', user: { name: d.name.trim(), email: d.email.trim() } })
    onSaved()
    onClose()
  }
  return (
    <Dialog open={open} onClose={close} title="Editar perfil">
      <form onSubmit={handleSubmit(submit)} noValidate className="stack">
        <Field label="Nome" icon={<User size={20} />} error={errors.name?.message} {...register('name')} />
        <Field label="E-mail" icon={<Mail size={20} />} type="email" error={errors.email?.message} {...register('email')} />
        <div className="dialog__actions">
          <Button type="button" variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            Salvar
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
