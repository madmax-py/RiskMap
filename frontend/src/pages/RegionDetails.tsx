import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Car, Lock, MoreHorizontal, Route as RouteIcon, UserRound } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { RiskTag } from '../components/Badges'
import { Button } from '../components/Button'
import { CountUp } from '../components/CountUp'
import { HourlyChart } from '../components/BarChart'
import { MapView } from '../components/MapView'
import { regionById } from '../data/mock'
import { regionShape } from '../geo'
import { fadeUp, stagger } from '../lib/motion'
import { useDesktop } from '../lib/hooks'

const ICONS = { car: Car, lock: Lock, user: UserRound, more: MoreHorizontal }

export default function RegionDetails() {
  const { id } = useParams()
  const region = regionById(id)
  const nav = useNavigate()
  const desktop = useDesktop()
  if (!region) return <Navigate to="/mapa" replace />
  const max = Math.max(...region.breakdown.map((b) => b.count))
  const updated = new Date(region.updatedAt)

  return (
    <div className="page page--with-cta">
      <PageHeader title="Detalhes da região" />
      <motion.div className="page-body region-grid" variants={stagger(0.06, 0.05)} initial="hidden" animate="show">
        <div className="region-grid__main">
          <motion.section variants={fadeUp} className="region-hero">
            <RiskTag level={region.level} />
            <h2>{region.name}</h2>
            <p className="muted">{region.description}</p>
          </motion.section>

          <motion.section variants={fadeUp} className="section-block">
            <h3>Ocorrências registradas</h3>
            <p className="huge">
              <CountUp value={region.occurrences30d} />
            </p>
            <p className="muted small">Últimos 30 dias</p>
          </motion.section>

          <motion.section variants={fadeUp} className="section-block">
            <h3>Principais ocorrências</h3>
            <ul className="card list-card">
              {region.breakdown.map((b) => {
                const Icon = ICONS[b.icon]
                return (
                  <li key={b.label} className="occ-row">
                    <span className={`occ-row__icon ${b.icon === 'more' ? 'is-muted' : ''}`}>
                      <Icon size={18} />
                    </span>
                    <span className="occ-row__label">{b.label}</span>
                    <span className="occ-row__bar">
                      <motion.i initial={{ width: 0 }} animate={{ width: `${(b.count / max) * 100}%` }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} />
                    </span>
                    <strong>{b.count}</strong>
                  </li>
                )
              })}
            </ul>
          </motion.section>
        </div>

        <div className="region-grid__side">
          {desktop && (
            <motion.div variants={fadeUp} className="card mini-map">
              <MapView variant="mini" interactive={false} view={{ bounds: regionShape(region.id), pad: 30 }} highlightId={region.id} showUser={false} />
            </motion.div>
          )}
          <motion.section variants={fadeUp} className="section-block">
            <h3>Horário de maior incidência</h3>
            <p className="peak">{region.peak}</p>
            <HourlyChart data={region.hourly} />
            <p className="muted small right">
              Última atualização: {updated.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}{' '}
              {updated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </motion.section>
        </div>
      </motion.div>

      <div className="cta-bar">
        <Button variant="secondary" icon={<RouteIcon size={18} />} onClick={() => nav(`/rota?de=atual&para=${region.id}`)}>
          Rota até aqui
        </Button>
        <Button onClick={() => nav(`/mapa?place=${region.id}`)}>Ver no mapa</Button>
      </div>
    </div>
  )
}
