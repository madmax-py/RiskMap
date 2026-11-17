import { useState, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Download, Gauge, Mail, Moon, Monitor, Scale, Shield, Sun, Trash2 } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Toggle } from '../components/Toggle'
import { Segmented } from '../components/Segmented'
import { Button } from '../components/Button'
import { Dialog } from '../components/Dialog'
import { useApp, type Settings as S } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { fadeUp, stagger } from '../lib/motion'
import { formatPrice, PLAN } from '../data/benefits'

const TITLES: Record<string, string> = {
  notificacoes: 'Notificações',
  'preferencia-rota': 'Preferência de rota',
  unidades: 'Unidades de medida',
  tema: 'Tema',
  privacidade: 'Segurança e privacidade',
  ajuda: 'Ajuda e suporte',
  assinatura: 'Assinatura',
}

export default function Settings() {
  const { section = '' } = useParams()
  if (!TITLES[section]) return <Navigate to="/perfil" replace />
  return (
    <div className="page">
      <PageHeader title={TITLES[section]} backTo="/perfil" />
      <motion.div className="page-body narrow" variants={stagger(0.05, 0.04)} initial="hidden" animate="show">
        {section === 'notificacoes' && <Notifications />}
        {section === 'preferencia-rota' && <RoutePref />}
        {section === 'unidades' && <Units />}
        {section === 'tema' && <Theme />}
        {section === 'privacidade' && <Privacy />}
        {section === 'ajuda' && <Help />}
        {section === 'assinatura' && <Subscription />}
      </motion.div>
    </div>
  )
}

function useSet() {
  const { settings, dispatch } = useApp()
  return [settings, (patch: Partial<S>) => dispatch({ type: 'settings', patch })] as const
}

function Row({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <li className="setting-row">
      <span>
        <strong>{title}</strong>
        {desc && <small>{desc}</small>}
      </span>
      {children}
    </li>
  )
}

function Notifications() {
  const [s, set] = useSet()
  return (
    <>
      <motion.ul variants={fadeUp} className="card menu">
        <Row title="Área de risco próxima" desc="Aviso quando você se aproximar de uma área de alto risco">
          <Toggle label="Área de risco próxima" checked={s.notifyRisk} onChange={(v) => set({ notifyRisk: v })} />
        </Row>
        <Row title="Ocorrências no trajeto" desc="Novas ocorrências nas suas rotas favoritas">
          <Toggle label="Ocorrências no trajeto" checked={s.notifyRoute} onChange={(v) => set({ notifyRoute: v })} />
        </Row>
        <Row title="Atualizações do sistema" desc="Novidades e manutenção">
          <Toggle label="Atualizações do sistema" checked={s.notifySystem} onChange={(v) => set({ notifySystem: v })} />
        </Row>
        <Row title="Som e vibração">
          <Toggle label="Som e vibração" checked={s.sound} onChange={(v) => set({ sound: v })} />
        </Row>
      </motion.ul>
      <motion.section variants={fadeUp} className={!s.notifyRisk ? 'is-disabled' : ''}>
        <p className="section-title">Raio de alerta</p>
        <Segmented
          variant="chips"
          options={[
            { value: '500', label: '500 m' },
            { value: '1000', label: '1 km' },
            { value: '2000', label: '2 km' },
          ]}
          value={String(s.alertRadius) as '500' | '1000' | '2000'}
          onChange={(v) => set({ alertRadius: Number(v) as S['alertRadius'] })}
        />
        <p className="muted small">Você será avisado quando estiver a essa distância de uma área de risco.</p>
      </motion.section>
    </>
  )
}

const PREFS = [
  { value: 'segura', icon: Shield, title: 'Mais segura', desc: 'Desvia de áreas de alto risco, mesmo que a rota fique mais longa.' },
  { value: 'equilibrada', icon: Scale, title: 'Equilibrada', desc: 'Busca um meio-termo entre tempo de viagem e segurança.' },
  { value: 'rapida', icon: Gauge, title: 'Mais rápida', desc: 'Prioriza o menor tempo. Áreas de risco são apenas sinalizadas.' },
] as const

function RoutePref() {
  const [s, set] = useSet()
  return (
    <>
      <motion.div variants={fadeUp} className="radio-cards" role="radiogroup" aria-label="Preferência de rota">
        {PREFS.map((p) => {
          const on = s.routePreference === p.value
          return (
            <motion.button key={p.value} role="radio" aria-checked={on} className={`radio-card ${on ? 'is-on' : ''}`} onClick={() => set({ routePreference: p.value })}>
              <p.icon size={24} />
              <span>
                <strong>{p.title}</strong>
                <small>{p.desc}</small>
              </span>
              <span className="radio-card__check">{on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}><Check size={14} strokeWidth={3} /></motion.span>}</span>
            </motion.button>
          )
        })}
      </motion.div>
      <motion.ul variants={fadeUp} className="card menu">
        <Row title="Evitar áreas de risco à noite" desc="Entre 18h e 6h, sempre usa a rota mais segura">
          <Toggle label="Evitar áreas de risco à noite" checked={s.avoidNight} onChange={(v) => set({ avoidNight: v })} />
        </Row>
      </motion.ul>
    </>
  )
}

function Units() {
  const [s, set] = useSet()
  const opts = [
    { value: 'km', title: 'Quilômetros (km)', desc: 'Ex.: 12,4 km' },
    { value: 'mi', title: 'Milhas (mi)', desc: 'Ex.: 7,7 mi' },
  ] as const
  return (
    <motion.div variants={fadeUp} className="radio-cards" role="radiogroup" aria-label="Unidade de medida">
      {opts.map((o) => {
        const on = s.units === o.value
        return (
          <motion.button key={o.value} role="radio" aria-checked={on} className={`radio-card ${on ? 'is-on' : ''}`} onClick={() => set({ units: o.value })}>
            <span>
              <strong>{o.title}</strong>
              <small>{o.desc}</small>
            </span>
            <span className="radio-card__check">{on && <Check size={14} strokeWidth={3} />}</span>
          </motion.button>
        )
      })}
    </motion.div>
  )
}

function Theme() {
  const [s, set] = useSet()
  const opts = [
    { value: 'escuro', icon: Moon, title: 'Escuro', desc: 'Melhor para uso à noite e no trânsito' },
    { value: 'claro', icon: Sun, title: 'Claro', desc: 'Mais legível sob luz do sol' },
    { value: 'sistema', icon: Monitor, title: 'Igual ao sistema', desc: 'Segue o tema do seu aparelho' },
  ] as const
  return (
    <>
      <motion.div variants={fadeUp} className="radio-cards" role="radiogroup" aria-label="Tema">
        {opts.map((o) => {
          const on = s.theme === o.value
          return (
            <motion.button key={o.value} role="radio" aria-checked={on} className={`radio-card ${on ? 'is-on' : ''}`} onClick={() => set({ theme: o.value })}>
              <o.icon size={24} />
              <span>
                <strong>{o.title}</strong>
                <small>{o.desc}</small>
              </span>
              <span className="radio-card__check">{on && <Check size={14} strokeWidth={3} />}</span>
            </motion.button>
          )
        })}
      </motion.div>
    </>
  )
}

function Privacy() {
  const [s, set] = useSet()
  const { dispatch } = useApp()
  const toast = useToast()
  const nav = useNavigate()
  const [del, setDel] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  return (
    <>
      <motion.ul variants={fadeUp} className="card menu">
        <Row title="Compartilhar localização" desc="Necessário para alertas de proximidade">
          <Toggle label="Compartilhar localização" checked={s.shareLocation} onChange={(v) => set({ shareLocation: v })} />
        </Row>
        <Row title="Ocorrências anônimas" desc="Sua identidade nunca é exibida a outros usuários">
          <Toggle label="Ocorrências anônimas" checked disabled onChange={() => {}} />
        </Row>
      </motion.ul>
      <motion.div variants={fadeUp} className="stack">
        <Button variant="secondary" icon={<Download size={18} />} onClick={() => toast('Você vai receber seus dados por e-mail', 'info')}>
          Baixar meus dados
        </Button>
        <Button variant="danger-outline" icon={<Trash2 size={18} />} onClick={() => setDel(true)}>
          Excluir conta
        </Button>
      </motion.div>
      <Dialog open={del} onClose={() => setDel(false)} title="Excluir conta?">
        <p className="muted">Isso apaga seu histórico de rotas e preferências. Digite <strong>EXCLUIR</strong> para confirmar.</p>
        <input className="plain-input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="EXCLUIR" aria-label="Digite EXCLUIR para confirmar" />
        <div className="dialog__actions">
          <Button variant="secondary" onClick={() => setDel(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            disabled={confirmText.trim().toUpperCase() !== 'EXCLUIR'}
            onClick={() => {
              dispatch({ type: 'reset' })
              nav('/login')
            }}
          >
            Excluir
          </Button>
        </div>
      </Dialog>
    </>
  )
}

const FAQ = [
  { q: 'Como o índice de risco é calculado?', a: 'Cada região recebe um índice com base nas ocorrências validadas dos últimos 30 dias, ponderadas pela gravidade (1 a 5) e pelo horário.' },
  { q: 'Quando minha ocorrência é validada?', a: 'Quando pelo menos 3 usuários a até 500 m confirmam o mesmo evento em até 60 minutos. Só então ela entra no índice de risco da região.' },
  { q: 'Alguém consegue ver que fui eu que registrei?', a: 'Não. As ocorrências são anônimas para os outros usuários. Só usamos sua reputação internamente para evitar relatos falsos.' },
  { q: 'O app substitui chamar a polícia?', a: 'Não. Em emergência, ligue 190. O RiskMap serve para informar a comunidade e planejar rotas.' },
]

function Help() {
  const [open, setOpen] = useState<number | null>(0)
  const toast = useToast()
  return (
    <>
      <motion.ul variants={fadeUp} className="card faq">
        {FAQ.map((f, i) => (
          <li key={f.q}>
            <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
              <strong>{f.q}</strong>
              <motion.span animate={{ rotate: open === i ? 180 : 0 }}>
                <ChevronDown size={20} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                  {f.a}
                </motion.p>
              )}
            </AnimatePresence>
          </li>
        ))}
      </motion.ul>
      <motion.div variants={fadeUp}>
        <Button variant="secondary" block icon={<Mail size={18} />} onClick={() => toast('Mensagem enviada ao suporte', 'success')}>
          Falar com o suporte
        </Button>
      </motion.div>
    </>
  )
}

/** Status e cancelamento do RiskMap Mais. */
function Subscription() {
  const { subscription, dispatch } = useApp()
  const toast = useToast()
  const nav = useNavigate()
  const [cancel, setCancel] = useState(false)
  const price = formatPrice(PLAN.price)
  if (!subscription.active)
    return (
      <motion.div variants={fadeUp} className="card sub-card">
        <span className="status-pill status-pill--expirado">Sem assinatura</span>
        <h2>{PLAN.name}</h2>
        <p className="muted">Descontos na rede de parceiros, pontos em dobro e rota no Waze ou Google Maps por {price} por mês.</p>
        <Button onClick={() => nav('/beneficios')}>Conhecer o {PLAN.name}</Button>
      </motion.div>
    )
  return (
    <>
      <motion.div variants={fadeUp} className="card sub-card">
        <span className="status-pill status-pill--utilizado">Ativa</span>
        <h2>{PLAN.name}</h2>
        <p className="muted">
          {price} por mês · assinante desde {new Date(subscription.since ?? Date.now()).toLocaleDateString('pt-BR')}
        </p>
        <p className="muted small">Protótipo: nenhuma cobrança é feita.</p>
      </motion.div>
      <motion.div variants={fadeUp}>
        <Button variant="danger-outline" block onClick={() => setCancel(true)}>
          Cancelar assinatura
        </Button>
      </motion.div>
      <Dialog open={cancel} onClose={() => setCancel(false)} title="Cancelar o RiskMap Mais?">
        <p className="muted">Você perde o acesso aos descontos e aos pontos em dobro. Seus pontos e seu nível continuam guardados.</p>
        <div className="dialog__actions">
          <Button variant="secondary" onClick={() => setCancel(false)}>
            Manter assinatura
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              dispatch({ type: 'unsubscribe' })
              setCancel(false)
              toast('Assinatura cancelada')
            }}
          >
            Cancelar assinatura
          </Button>
        </div>
      </Dialog>
    </>
  )
}
