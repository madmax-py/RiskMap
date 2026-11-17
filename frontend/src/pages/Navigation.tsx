import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, CornerUpLeft, CornerUpRight, FastForward, Flag, Pause, Play, ShieldAlert, AlertTriangle, X } from 'lucide-react'
import { MapView, type MapHandle } from '../components/MapView'
import { Button } from '../components/Button'
import { Dialog } from '../components/Dialog'
import { placeName, useRoute } from '../geo/routing'
import { along, zoneAtPoint } from '../geo'
import type { RoutePreference } from '../lib/city'
import { clockTime, formatDistance, formatMinutes } from '../lib/format'
import { useApp } from '../store/AppStore'

/** Navegação simulada: o "carro" percorre a rota sozinho pra demonstrar alertas e instruções. */
export default function Navigation() {
  const [params] = useSearchParams()
  // congela os parâmetros na montagem: durante a animação de saída a URL já mudou
  const [{ from, to, pref }] = useState(() => ({
    from: params.get('de') ?? 'atual',
    to: params.get('para') ?? '',
    pref: (params.get('pref') as RoutePreference) || 'equilibrada',
  }))
  const state = useRoute(from, to, pref)
  const route = state.route
  const { settings, engagement, dispatch, subscription } = useApp()
  const nav = useNavigate()
  const mapRef = useRef<MapHandle>(null)
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [fast, setFast] = useState(false)
  const [follow, setFollow] = useState(true)
  const [confirmExit, setConfirmExit] = useState(false)

  // velocidade da simulação: rota inteira em ~45 s (ou ~12 s acelerado)
  useEffect(() => {
    if (!playing || !route || t >= 1) return
    let raf = 0
    let last = performance.now()
    const dur = (fast ? 12 : 45) * 1000
    const tick = (now: number) => {
      const dt = now - last
      last = now
      setT((v) => Math.min(1, v + dt / dur))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, fast, route, t >= 1]) // eslint-disable-line react-hooks/exhaustive-deps

  // RNE-002: concluir a rota mais segura vale 1 ponto (até 5 por dia). Roda uma vez, na chegada.
  const [earned, setEarned] = useState<null | boolean>(null)
  useEffect(() => {
    if (t < 1 || earned !== null || !route) return
    if (pref !== 'segura') return setEarned(false)
    const today = engagement.events.filter((e) => e.kind === 'rota' && new Date(e.date).toDateString() === new Date().toDateString()).length
    dispatch({ type: 'earn', kind: 'rota', label: `Rota mais segura concluída · ${placeName(from)} → ${placeName(to)}` })
    setEarned(today < 5)
  }, [t >= 1]) // eslint-disable-line react-hooks/exhaustive-deps

  const pos = route ? along(route.points, t) : null

  useEffect(() => {
    if (pos && follow) mapRef.current?.setView({ center: pos.p, meters: 2500 }, false)
  }, [pos?.p[0], pos?.p[1], follow]) // eslint-disable-line react-hooks/exhaustive-deps

  if (state.status === 'loading' || state.status === 'idle')
    return (
      <div className="nav-page nav-page--msg">
        <span className="spinner" /> Calculando rota...
      </div>
    )
  if (!route)
    return (
      <div className="nav-page nav-page--msg">
        <p>{state.error ?? 'Rota não encontrada.'}</p>
        <Button onClick={() => nav('/rotas')}>Voltar</Button>
      </div>
    )

  const traveled = t * route.meters
  const next = route.steps.find((s) => s.metersFromStart > traveled + 5) ?? route.steps[route.steps.length - 1]
  const toNext = Math.max(0, next.metersFromStart - traveled)
  const remainingMin = route.minutes * (1 - t)
  const eta = new Date(Date.now() + remainingMin * 60000)
  const zone = pos ? zoneAtPoint(pos.p) : undefined
  const done = t >= 1
  const TurnIcon = next.turn === 'esquerda' ? CornerUpLeft : next.turn === 'direita' ? CornerUpRight : next.turn === 'chegada' ? Flag : ArrowUp

  return (
    <div className="nav-page">
      <MapView
        ref={mapRef}
        view={{ center: route.points[0], meters: 2500 }}
        route={route.points}
        routeProgress={t}
        markers={[
          { id: 'dest', at: route.points[route.points.length - 1], kind: 'pin' },
          { id: 'me', at: pos!.p, kind: 'arrow', angle: pos!.angle },
        ]}
        showUser={false}
        onUserMove={() => setFollow(false)}
      />

      <div className="nav-top">
        <motion.div className="nav-instruction" key={next.index + next.text} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <span className="nav-instruction__icon">
            <TurnIcon size={30} />
          </span>
          <div>
            <strong>{next.turn === 'chegada' ? formatDistance(toNext, settings.units) : `Em ${formatDistance(toNext, settings.units)}`}</strong>
            <span>
              {next.turn === 'chegada' ? `Chegada em ${placeName(to)}` : next.text}
            </span>
          </div>
        </motion.div>

        <AnimatePresence>
          {zone && !done && (
            <motion.div
              key={zone.id}
              className={`nav-zone nav-zone--${zone.level}`}
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              role="status"
            >
              {zone.level === 'alto' ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
              <span>
                <strong>{zone.level === 'alto' ? 'Alto risco' : 'Atenção'} · {zone.name}</strong>
                <small>{zone.level === 'alto' ? 'Evite paradas e fique atento ao redor.' : 'Fique atento ao redor.'}</small>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!follow && (
        <motion.button className="chip-floating nav-recenter" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setFollow(true)}>
          Recentralizar
        </motion.button>
      )}

      <div className="nav-bottom">
        <div className="nav-bottom__progress">
          <motion.i style={{ width: `${t * 100}%` }} />
        </div>
        <div className="nav-bottom__row">
          <button className="icon-btn icon-btn--round" onClick={() => setConfirmExit(true)} aria-label="Encerrar navegação">
            <X size={22} />
          </button>
          <div className="nav-stats">
            <strong>{formatMinutes(Math.max(0, remainingMin))}</strong>
            <span>
              {formatDistance(route.meters - traveled, settings.units)} · chegada {clockTime(eta)}
            </span>
          </div>
          <button className={`icon-btn icon-btn--round ${fast ? 'is-on' : ''}`} onClick={() => setFast((f) => !f)} aria-label="Acelerar simulação" aria-pressed={fast}>
            <FastForward size={20} />
          </button>
          <button className="icon-btn icon-btn--round primary" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pausar' : 'Continuar'}>
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>
        </div>
        <p className="nav-bottom__hint">Navegação simulada para demonstração</p>
      </div>

      <Dialog open={done} onClose={() => nav('/mapa')} title="Você chegou!">
        <p className="muted">
          {placeName(from)} → {placeName(to)} · {formatDistance(route.meters, settings.units)} em {formatMinutes(route.minutes)}
        </p>
        {earned && <p className="earned-note">{subscription.active ? '+2 pontos (em dobro no RiskMap Mais)' : '+1 ponto'} por concluir a rota mais segura</p>}
        <div className="dialog__actions">
          <Button variant="secondary" onClick={() => nav('/rotas')}>
            Ver histórico
          </Button>
          <Button onClick={() => nav('/mapa')}>Voltar ao mapa</Button>
        </div>
      </Dialog>

      <Dialog open={confirmExit && !done} onClose={() => setConfirmExit(false)} title="Encerrar navegação?">
        <p className="muted">A rota continua salva no seu histórico.</p>
        <div className="dialog__actions">
          <Button variant="secondary" onClick={() => setConfirmExit(false)}>
            Continuar
          </Button>
          <Button onClick={() => nav(-1)}>
            Encerrar
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
