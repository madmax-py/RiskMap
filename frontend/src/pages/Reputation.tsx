import { motion } from 'framer-motion'
import { Check, CheckCheck, Clock, Medal, Route as RouteIcon, ShieldCheck, TriangleAlert } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { LevelCard } from '../components/LevelCard'
import { useApp } from '../store/AppStore'
import { canRedeem, DECAY, LEVELS, offers, POINTS, ROUTE_POINTS_PER_DAY, type PointKind } from '../data/benefits'
import { formatDateTime } from '../lib/format'
import { fadeUp, stagger } from '../lib/motion'

const KIND_ICON: Record<PointKind, typeof Check> = { report: ShieldCheck, avaliacao: CheckCheck, rota: RouteIcon }

/** RF-006: nível atual, como ganhar pontos, histórico de contribuições aceitas e regra de decaimento. */
export default function Reputation() {
  const { engagement, level, subscription } = useApp()
  const idleDays = Math.floor((Date.now() - new Date(engagement.lastActivity).getTime()) / 864e5)
  const daysLeft = Math.max(0, DECAY.idleDays - idleDays)

  return (
    <div className="page">
      <PageHeader title="Nível e reputação" backTo="/beneficios" />
      <motion.div className="page-body narrow" variants={stagger()} initial="hidden" animate="show">
        <motion.div variants={fadeUp}>
          <LevelCard points={engagement.points} level={level} />
        </motion.div>

        <motion.section variants={fadeUp}>
          <h3 className="block-title">Níveis</h3>
          <ol className="card level-ladder">
            {LEVELS.map((l) => {
              const unlocked = offers.filter((o) => canRedeem(l.id, o)).length
              const current = l.id === level
              return (
                <li key={l.id} className={current ? 'is-current' : ''} aria-current={current ? 'true' : undefined}>
                  <span className={`level-medal level-medal--${l.id}`} aria-hidden="true">
                    <Medal size={20} />
                  </span>
                  <span>
                    <strong>{l.name}</strong>
                    <small>{l.max === null ? `${l.min} pontos ou mais` : `${l.min} a ${l.max} pontos`}</small>
                  </span>
                  <span className="level-ladder__side">{current ? 'Seu nível' : `${unlocked} de ${offers.length} ofertas`}</span>
                </li>
              )
            })}
          </ol>
        </motion.section>

        <motion.section variants={fadeUp}>
          <h3 className="block-title">
            Como ganhar pontos {subscription.active && <em className="soon soon--on">Em dobro no RiskMap Mais</em>}
          </h3>
          <ul className="card info-list info-list--points">
            <li>
              <ShieldCheck size={18} />
              <span>
                Report validado pela comunidade
                <small>{engagement.counts.report} até agora</small>
              </span>
              <strong>+{POINTS.report}</strong>
            </li>
            <li>
              <CheckCheck size={18} />
              <span>
                Confirmação ou contestação que bate com o resultado final
                <small>{engagement.counts.avaliacao} até agora</small>
              </span>
              <strong>+{POINTS.avaliacao}</strong>
            </li>
            <li>
              <RouteIcon size={18} />
              <span>
                Rota mais segura concluída
                <small>
                  Até {ROUTE_POINTS_PER_DAY} por dia · {engagement.counts.rota} até agora
                </small>
              </span>
              <strong>+{POINTS.rota}</strong>
            </li>
          </ul>
        </motion.section>

        <motion.p variants={fadeUp} className={`card decay-note ${daysLeft <= 7 ? 'is-warn' : ''}`}>
          {daysLeft <= 7 ? <TriangleAlert size={18} /> : <Clock size={18} />}
          <span>
            <strong>Mantenha seus pontos</strong>
            Depois de {DECAY.idleDays} dias sem atividade, a pontuação cai {DECAY.percent}% a cada {DECAY.everyDays} dias.
            {` Última atividade: ${formatDateTime(engagement.lastActivity).toLowerCase()}. `}
            {daysLeft > 0 ? `Faltam ${daysLeft} dias para começar a perder pontos.` : 'Use o app para parar a perda.'}
          </span>
        </motion.p>

        <motion.section variants={fadeUp}>
          <h3 className="block-title">Histórico de pontos</h3>
          <ul className="card point-history">
            {engagement.events.map((e) => {
              const Icon = KIND_ICON[e.kind]
              return (
                <li key={e.id}>
                  <Icon size={18} aria-hidden="true" />
                  <span>
                    {e.label}
                    <small>{formatDateTime(e.date)}</small>
                  </span>
                  <strong>+{e.points}</strong>
                </li>
              )
            })}
          </ul>
        </motion.section>
      </motion.div>
    </div>
  )
}
