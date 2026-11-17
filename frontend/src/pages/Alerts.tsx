import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BellRing, ChevronRight, Clock, Info, MapPin, ShieldCheck, TriangleAlert } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Segmented } from '../components/Segmented'
import { Pill } from '../components/Badges'
import { MapView } from '../components/MapView'
import { useApp } from '../store/AppStore'
import { regionById, type Alert, type AlertKind } from '../data/mock'
import { regionLabel, regionShape } from '../geo'
import { formatAgo } from '../lib/format'
import { fadeUp, stagger } from '../lib/motion'

type Filter = 'todos' | AlertKind

export default function Alerts() {
  const { alerts, readAlerts, dispatch, settings } = useApp()
  const [filter, setFilter] = useState<Filter>('todos')
  const [all, setAll] = useState(false)
  const nav = useNavigate()
  const [unreadAtOpen] = useState(() => new Set(alerts.filter((a) => !readAlerts.includes(a.id)).map((a) => a.id)))

  // marca como lidos depois que a pessoa vê a tela
  useEffect(() => {
    const t = setTimeout(() => dispatch({ type: 'readAlerts' }), 1200)
    return () => clearTimeout(t)
  }, [dispatch])

  const main = alerts.find((a) => a.highlight)
  const others = useMemo(() => alerts.filter((a) => a !== main && (filter === 'todos' || a.kind === filter)), [alerts, main, filter])
  const shown = all ? others : others.slice(0, 3)
  const nRisk = alerts.filter((a) => a.kind === 'risco').length
  const nAt = alerts.filter((a) => a.kind === 'atencao').length
  const mainRegion = regionById(main?.regionId)

  return (
    <div className="page">
      <PageHeader title="Alertas" />
      <div className="page-body">
        <Segmented
          variant="chips"
          options={[
            { value: 'todos', label: 'Todos' },
            { value: 'risco', label: 'Riscos' },
            { value: 'atencao', label: 'Atenção' },
            { value: 'sistema', label: 'Do app' },
          ]}
          value={filter}
          onChange={(v) => {
            setFilter(v)
            setAll(false)
          }}
          ariaLabel="Filtrar alertas"
        />

        <div className="two-col two-col--alerts">
          <div className="two-col__main">
            <motion.div className="count-cards" variants={stagger(0.06)} initial="hidden" animate="show">
              <motion.button variants={fadeUp} className="count-card count-card--alto" onClick={() => setFilter('risco')}>
                <span className="count-card__icon">
                  <TriangleAlert size={22} />
                </span>
                <strong>{nRisk}</strong>
                <ChevronRight size={20} />
                <span className="count-card__label">Alertas de risco</span>
                <small>Requerem atenção imediata</small>
              </motion.button>
              <motion.button variants={fadeUp} className="count-card count-card--atencao" onClick={() => setFilter('atencao')}>
                <span className="count-card__icon">
                  <TriangleAlert size={22} />
                </span>
                <strong>{nAt}</strong>
                <ChevronRight size={20} />
                <span className="count-card__label">Áreas de atenção</span>
                <small>Acompanhe de perto</small>
              </motion.button>
            </motion.div>

            <AnimatePresence initial={false}>
              {main && mainRegion && (filter === 'todos' || filter === 'risco') && (
                <motion.section key="main" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <p className="section-title">Alerta principal</p>
                  <motion.button className="main-alert" onClick={() => nav(`/regiao/${mainRegion.id}`)}>
                    <div className="main-alert__map">
                      <MapView
                        variant="mini"
                        interactive={false}
                        view={{ bounds: regionShape(mainRegion.id), pad: 12 }}
                        showRegions={[mainRegion.id]}
                        markers={[{ id: 'p', at: regionLabel(mainRegion.id), kind: 'pin' }]}
                        showUser={false}
                      />
                    </div>
                    <div className="main-alert__body">
                      <span className="tag-outline">Alto risco</span>
                      <h3>{main.title}</h3>
                      <p>
                        <MapPin size={15} className="c-red" /> {mainRegion.name}
                      </p>
                      <p>
                        <Clock size={15} /> {formatAgo(main.minutesAgo)}
                      </p>
                      <p className="muted small">{main.body}</p>
                    </div>
                  </motion.button>
                </motion.section>
              )}
            </AnimatePresence>

            <p className="section-title">Outros alertas</p>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.ul key={filter} className="alert-list" variants={stagger(0.05)} initial="hidden" animate="show" exit={{ opacity: 0, transition: { duration: 0.1 } }}>
                {shown.map((a) => (
                  <AlertItem key={a.id} a={a} unread={unreadAtOpen.has(a.id)} onClick={() => (a.regionId ? nav(`/regiao/${a.regionId}`) : undefined)} />
                ))}
                {!shown.length && (
                  <motion.li variants={fadeUp} className="empty">
                    <ShieldCheck size={28} />
                    <strong>Nenhum alerta aqui</strong>
                    <span>Quando surgir algo nessa categoria, aparece nesta lista.</span>
                  </motion.li>
                )}
              </motion.ul>
            </AnimatePresence>
            {others.length > 3 && (
              <button className="link-btn center" onClick={() => setAll((x) => !x)}>
                {all ? 'Mostrar menos' : 'Ver todos os alertas'}
              </button>
            )}
          </div>

          <aside className="two-col__side">
            <button className="card promo" onClick={() => nav('/perfil/notificacoes')}>
              <span className="promo__icon">{settings.notifyRisk ? <BellRing size={26} /> : <ShieldCheck size={26} />}</span>
              <span>
                <strong>{settings.notifyRisk ? 'Notificações ativas' : 'Fique sempre seguro'}</strong>
                <small>
                  {settings.notifyRisk
                    ? `Você recebe alertas num raio de ${settings.alertRadius >= 1000 ? settings.alertRadius / 1000 + ' km' : settings.alertRadius + ' m'}. Toque para ajustar.`
                    : 'Ative as notificações para receber alertas em tempo real sobre sua região e rotas.'}
                </small>
              </span>
              <ChevronRight size={20} />
            </button>
          </aside>
        </div>
      </div>
    </div>
  )
}

function AlertItem({ a, onClick, unread }: { a: Alert; onClick: () => void; unread: boolean }) {
  const region = regionById(a.regionId)
  const lv = a.kind === 'risco' ? 'alto' : a.kind === 'atencao' ? 'atencao' : 'neutral'
  return (
    <motion.li variants={fadeUp} layout>
      <motion.button className={`alert-item alert-item--${lv}`} onClick={onClick} disabled={!a.regionId}>
        <span className="alert-item__icon">{a.kind === 'sistema' ? <Info size={20} /> : <TriangleAlert size={20} />}</span>
        <span className="alert-item__body">
          <strong>
            {a.title}
          </strong>
          <small>{region ? region.name : a.body}</small>
          {lv !== 'neutral' && <Pill level={lv}>{lv === 'alto' ? 'Alto risco' : 'Atenção'}</Pill>}
        </span>
        <span className="alert-item__time">
          {unread && <i className="new-dot" aria-label="Novo" />}
          {formatAgo(a.minutesAgo)}
        </span>
        {a.regionId && <ChevronRight size={20} className="chev" />}
      </motion.button>
    </motion.li>
  )
}
