import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, MapPin, Plus, Route as RouteIcon, ShieldCheck, Star, TriangleAlert } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Segmented } from '../components/Segmented'
import { Pill } from '../components/Badges'
import { CountUp } from '../components/CountUp'
import { Button } from '../components/Button'
import { useApp } from '../store/AppStore'
import { placeName } from '../geo/routing'
import { formatDateTime, formatDistance, formatMinutes, plural } from '../lib/format'
import { fadeUp, stagger } from '../lib/motion'

export default function RoutesHistory() {
  const { history, settings } = useApp()
  const [tab, setTab] = useState<'recentes' | 'favoritas'>('recentes')
  const [all, setAll] = useState(false)
  const nav = useNavigate()

  // o resumo de cada rota foi salvo quando ela foi feita (no app real viria da API)
  const enriched = useMemo(() => history.map((h) => ({ h, cls: h.cls })), [history])

  const favs = useMemo(() => {
    const seen = new Set<string>()
    return enriched.filter(({ h }) => {
      const k = h.from + h.to
      if (!h.favorite || seen.has(k)) return false
      seen.add(k)
      return true
    })
  }, [enriched])

  const list = tab === 'recentes' ? enriched : favs
  const shown = all ? list : list.slice(0, 4)
  const stats = {
    total: enriched.length,
    risk: enriched.filter((e) => e.cls !== 'baixo').length,
    safe: enriched.filter((e) => e.cls === 'baixo').length,
  }

  return (
    <div className="page">
      <PageHeader
        title="Histórico de rotas"
        right={
          <button className="icon-btn" onClick={() => nav('/rota?de=atual')} aria-label="Nova rota">
            <Plus size={24} />
          </button>
        }
      />
      <div className="page-body two-col">
        <div className="two-col__main">
          <Segmented
            options={[
              { value: 'recentes', label: 'Recentes' },
              { value: 'favoritas', label: 'Favoritas', count: favs.length },
            ]}
            value={tab}
            onChange={(v) => {
              setTab(v)
              setAll(false)
            }}
          />
          <p className="section-title">{tab === 'recentes' ? 'Rotas recentes' : 'Rotas favoritas'}</p>

          <AnimatePresence mode="wait">
            <motion.ul key={tab} className="route-list" variants={stagger(0.05)} initial="hidden" animate="show" exit={{ opacity: 0, transition: { duration: 0.12 } }}>
              {shown.map(({ h, cls }) => {
                const nAlto = h.nAlto
                const nAt = h.nAtencao
                return (
                  <motion.li key={h.id} variants={fadeUp} layout>
                    <motion.button className="route-item" onClick={() => nav(`/rota?${new URLSearchParams({ de: h.from, para: h.to })}`)}>
                      <span className={`route-item__icon lv-${cls}`}>
                        <MapPin size={22} />
                      </span>
                      <span className="route-item__body">
                        <strong>
                          {placeName(h.from)} <span className="arrow">→</span> {placeName(h.to)}
                          {h.favorite && <Star size={13} className="c-amber" fill="currentColor" />}
                        </strong>
                        <small>{formatDateTime(h.date)}</small>
                        {cls === 'baixo' ? (
                          <Pill level="baixo">Baixo risco</Pill>
                        ) : nAlto ? (
                          <Pill level="alto">{plural(nAlto, 'área de alto risco', 'áreas de alto risco')}</Pill>
                        ) : (
                          <Pill level="atencao">{plural(nAt, 'área de atenção', 'áreas de atenção')}</Pill>
                        )}
                      </span>
                      <span className="route-item__meta">
                        <strong>{formatDistance(h.meters, settings.units)}</strong>
                        <small>{formatMinutes(h.minutes)}</small>
                      </span>
                      <ChevronRight size={20} className="chev" />
                    </motion.button>
                  </motion.li>
                )
              })}
              {!list.length && (
                <motion.li variants={fadeUp} className="empty">
                  <Star size={28} />
                  <strong>Nenhuma rota favorita</strong>
                  <span>Toque na estrela ao analisar uma rota para salvá-la aqui.</span>
                  <Button size="md" variant="secondary" onClick={() => nav('/rota?de=atual')}>
                    Planejar rota
                  </Button>
                </motion.li>
              )}
            </motion.ul>
          </AnimatePresence>

          {list.length > 4 && (
            <button className="link-btn center" onClick={() => setAll((a) => !a)}>
              {all ? 'Mostrar menos' : 'Ver todas as rotas'}
            </button>
          )}
        </div>

        <aside className="two-col__side">
          <div className="card summary-card">
            <p className="muted">Resumo do seu histórico</p>
            <div className="summary-grid">
              <div>
                <RouteIcon size={30} className="c-blue" />
                <strong>
                  <CountUp value={stats.total} />
                </strong>
                <span>Rotas realizadas</span>
              </div>
              <div>
                <TriangleAlert size={30} className="c-red" />
                <strong>
                  <CountUp value={stats.risk} />
                </strong>
                <span>Com áreas de risco</span>
              </div>
              <div>
                <ShieldCheck size={30} className="c-green" />
                <strong>
                  <CountUp value={stats.safe} />
                </strong>
                <span>Rotas seguras</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
