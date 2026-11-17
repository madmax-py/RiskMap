import { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Check, Gift, Navigation2, ShieldCheck, SlidersHorizontal, Sparkles, type LucideIcon } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Button'
import { Dialog } from '../components/Dialog'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { canRedeem, formatPrice, LEVEL_NAME, offers, partnerById, PLAN } from '../data/benefits'
import { fadeUp, stagger } from '../lib/motion'

type Feature = { icon: LucideIcon; title: string; desc: string; soon?: boolean }

const FEATURES: Feature[] = [
  { icon: Gift, title: 'Rede de benefícios', desc: `${offers.length} ofertas em oficinas, seguros e locadoras. Seu nível define quais você resgata.` },
  { icon: Sparkles, title: 'Pontos em dobro', desc: 'Cada report validado, avaliação e rota segura vale o dobro. Você sobe de nível mais rápido.' },
  { icon: Navigation2, title: 'Rota no Waze ou Google Maps', desc: 'Abra a rota escolhida no app de navegação que você já usa.' },
  { icon: SlidersHorizontal, title: 'Filtros do mapa', desc: 'Veja o risco por horário e por tipo de ocorrência antes de aceitar uma corrida.', soon: true },
  { icon: BarChart3, title: 'Resumo semanal', desc: 'Suas rotas, sua exposição ao risco e quanto você economizou com descontos.', soon: true },
]

/** Página de assinatura que aparece antes dos benefícios para quem ainda não assina o RiskMap Mais. */
export default function BenefitsPlan() {
  const { engagement, level, dispatch } = useApp()
  const toast = useToast()
  const [confirm, setConfirm] = useState(false)
  const price = formatPrice(PLAN.price)
  const unlocked = offers.filter((o) => canRedeem(level, o)).length
  const examples = [...offers]
    .filter((o) => canRedeem(level, o))
    .sort((a, b) => b.discount - a.discount)
    .slice(0, 3)

  const subscribe = () => {
    dispatch({ type: 'subscribe' })
    setConfirm(false)
    toast(`${PLAN.name} ativado`)
  }

  return (
    <div className="page page--with-cta">
      <PageHeader title="Benefícios" />
      <motion.div className="page-body narrow plan" variants={stagger()} initial="hidden" animate="show">
        <motion.section variants={fadeUp} className="card plan__hero">
          <h2>{PLAN.name}</h2>
          <p className="muted">Descontos na rede de parceiros e recursos extras no app, por uma mensalidade baixa.</p>
          <p className="plan__price">
            <strong>{price}</strong>
            <span>por mês · cancele quando quiser</span>
          </p>
        </motion.section>

        <motion.p variants={fadeUp} className="card plan__yours">
          <span className={`level-medal level-medal--${level}`} aria-hidden="true">
            <Gift size={20} />
          </span>
          <span>
            Com seus <strong>{engagement.points} pontos</strong> (nível {LEVEL_NAME[level]}), você já resgata <strong>{unlocked} de {offers.length} ofertas</strong> assim que assinar.
          </span>
        </motion.p>

        <motion.section variants={fadeUp}>
          <h3 className="block-title">Ofertas que você já pode usar</h3>
          <ul className="card info-list plan__examples">
            {examples.map((o) => (
              <li key={o.id}>
                <span>
                  {o.description}
                  <small>{partnerById(o.partnerId)?.name}</small>
                </span>
                <strong>{o.discount}%</strong>
              </li>
            ))}
          </ul>
        </motion.section>

        <motion.section variants={fadeUp}>
          <h3 className="block-title">O que está incluído</h3>
          <ul className="card plan__features">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <f.icon size={20} aria-hidden="true" />
                <span>
                  <strong>
                    {f.title} {f.soon && <em className="soon">Em breve</em>}
                  </strong>
                  <small>{f.desc}</small>
                </span>
              </li>
            ))}
          </ul>
        </motion.section>

        <motion.p variants={fadeUp} className="card plan__free">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>
            <strong>Sua segurança continua grátis.</strong> Mapa de risco, alertas, análise de rota e registro de ocorrências funcionam para todos, com ou sem
            assinatura.
          </span>
        </motion.p>
      </motion.div>

      <div className="cta-bar">
        <Button block onClick={() => setConfirm(true)}>
          Assinar por {price}/mês
        </Button>
      </div>

      <Dialog open={confirm} onClose={() => setConfirm(false)} title={`Assinar o ${PLAN.name}?`}>
        <ul className="plan__confirm">
          <li>
            <Check size={16} /> {price} por mês, com renovação automática
          </li>
          <li>
            <Check size={16} /> Cancele quando quiser em Perfil › Assinatura
          </li>
        </ul>
        <p className="muted small">Protótipo: a assinatura é simulada e nada é cobrado.</p>
        <div className="dialog__actions">
          <Button variant="secondary" onClick={() => setConfirm(false)}>
            Agora não
          </Button>
          <Button onClick={subscribe}>Confirmar assinatura</Button>
        </div>
      </Dialog>
    </div>
  )
}
