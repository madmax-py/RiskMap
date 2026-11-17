import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowUpDown, Check, Clock, Info, LocateFixed, MapPin, RefreshCw, ShieldAlert, ShieldCheck, Star } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Segmented } from '../components/Segmented'
import { Button } from '../components/Button'
import { MapView } from '../components/MapView'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { regionById, regions } from '../data/mock'
import { exposure, placeName, routeStats, useRouteOptions, type Route, type RouteOptions } from '../geo/routing'
import { userPos, zoneAtPoint } from '../geo'
import { formatDistance, formatMinutes } from '../lib/format'
import { fadeUp, stagger, uid } from '../lib/motion'
import { norm, useDesktop } from '../lib/hooks'
import type { RoutePreference } from '../lib/city'
import { LEVEL_LABEL } from '../components/Badges'
import { IS_REAL } from '../geo/config'
import type { Pt } from '../lib/city'

const PREFS: { value: RoutePreference; label: string }[] = [
  { value: 'segura', label: 'Mais segura' },
  { value: 'equilibrada', label: 'Equilibrada' },
  { value: 'rapida', label: 'Mais rápida' },
]

const CLASS_INFO = {
  alto: { title: 'Passa por alto risco', text: 'Parte do trajeto cruza área de alto risco', icon: ShieldAlert },
  atencao: { title: 'Passa por atenção', text: 'Parte do trajeto cruza área de atenção', icon: AlertTriangle },
  baixo: { title: 'Baixo risco', text: 'Nenhuma área de alto risco ou de atenção no trajeto', icon: ShieldCheck },
}

export default function RouteAnalysis() {
  const [params, setParams] = useSearchParams()
  const { settings, isFavorite, dispatch, subscription } = useApp()
  const toast = useToast()
  const nav = useNavigate()
  const desktop = useDesktop()

  const from = params.get('de') ?? 'atual'
  const to = params.get('para') ?? ''
  const pref = (params.get('pref') as RoutePreference) || settings.routePreference
  const set = (patch: Record<string, string>) => setParams({ de: from, para: to, pref, ...patch }, { replace: true })

  const error = !to ? 'Escolha um destino' : from === to ? 'Origem e destino precisam ser diferentes' : null
  const [retry, setRetry] = useState(0)
  // as três opções vêm de uma vez, medidas pelo mesmo critério (ver getRouteOptions)
  const state = useRouteOptions(error ? null : from, error ? null : to, retry)
  const options = state.options
  const route = options?.[pref] ?? null
  const loading = state.status === 'loading'

  const cls = route?.cls ?? 'baixo'
  // quando não há alternativa melhor, explica o porquê em vez de só repetir "alto risco"
  const noSaferOption = !!route && cls === 'alto' && route === options?.segura
  const endZone = route ? [zoneAtPoint(route.points[0]), zoneAtPoint(route.points[route.points.length - 1])].find((z) => z?.level === 'alto') : undefined
  const info = CLASS_INFO[cls]
  const fav = isFavorite(from, to)
  const units = settings.units

  const tips = useMemo(() => {
    if (!route) return []
    const out: { icon: 'clock' | 'warn' | 'ok'; text: string }[] = []
    const worst = route.zones.find((z) => z.level === 'alto') ?? route.zones.find((z) => z.level === 'atencao')
    if (worst) {
      out.push({ icon: 'clock', text: `Evite circular entre ${regionById(worst.id)?.peak ?? '18h e 24h'} nesta rota.` })
      out.push({ icon: 'warn', text: `Atenção redobrada ao passar pelo ${worst.name}.` })
    } else out.push({ icon: 'ok', text: 'Trajeto sem áreas de risco conhecidas no momento.' })
    out.push({ icon: 'ok', text: 'Prefira vias movimentadas sempre que possível.' })
    return out
  }, [route])

  const start = () => {
    if (!route) return
    dispatch({ type: 'addHistory', entry: { id: uid(), from, to, date: new Date().toISOString(), favorite: false, ...routeStats(route) } })
    nav(`/navegacao?${new URLSearchParams({ de: from, para: to, pref })}`)
  }

  const markers = route
    ? [
        { id: 'o', at: route.points[0], kind: 'origin' as const },
        { id: 'd', at: route.points[route.points.length - 1], kind: 'pin' as const },
      ]
    : []

  return (
    <div className="page page--with-cta">
      <PageHeader
        title="Análise de rota"
        right={
          route && (
            <motion.button
              className={`icon-btn star ${fav ? 'is-on' : ''}`}
              onClick={() => {
                dispatch({ type: 'toggleFavorite', from, to, stats: routeStats(route) })
                toast(fav ? 'Removida das favoritas' : 'Rota salva nas favoritas', fav ? 'info' : 'success')
              }}
              aria-label={fav ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
              aria-pressed={fav}
            >
              <Star size={22} fill={fav ? 'currentColor' : 'none'} />
            </motion.button>
          )
        }
      />

      <motion.div className="page-body route-grid" variants={stagger(0.06, 0.05)} initial="hidden" animate="show">
        <div className="route-grid__main">
          <motion.div variants={fadeUp} className={`card od-card ${error && to ? 'has-error' : ''}`}>
            <div className="od-fields">
              <PlacePicker label="Origem" value={from} onChange={(v) => set({ de: v })} allowCurrent dot="origin" />
              <hr />
              <PlacePicker label="Destino" value={to} onChange={(v) => set({ para: v })} dot="dest" />
            </div>
            <div className="od-actions">
              <button type="button" className={`icon-btn ${from === 'atual' ? 'c-blue' : ''}`} onClick={() => set({ de: 'atual' })} aria-label="Usar minha localização como origem">
                <LocateFixed size={20} />
              </button>
              <motion.button
                className="icon-btn"
                aria-label="Inverter origem e destino"
                onClick={() => to && set({ de: to, para: from })}
                disabled={!to || from === 'atual'}
                title={from === 'atual' ? 'Escolha uma região de origem para poder inverter' : undefined}
              >
                <ArrowUpDown size={20} />
              </motion.button>
            </div>
          </motion.div>
          <AnimatePresence>
            {error && (
              <motion.p className="field__error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} role="alert">
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.div variants={fadeUp}>
            {options ? (
              <RouteOptionsPicker options={options} value={pref} units={units} onChange={(v) => set({ pref: v })} />
            ) : (
              <Segmented options={PREFS} value={pref} onChange={(v) => set({ pref: v })} variant="chips" ariaLabel="Preferência de rota" />
            )}
          </motion.div>

          {state.status === 'error' && (
            <motion.div className="card route-error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} role="alert">
              <AlertTriangle size={22} className="c-red" />
              <span>
                <strong>Não foi possível calcular a rota</strong>
                <small>{state.error}</small>
              </span>
              {!state.error?.startsWith('Não encontramos') && (
                <Button variant="secondary" size="sm" icon={<RefreshCw size={16} />} onClick={() => setRetry((r) => r + 1)}>
                  Tentar de novo
                </Button>
              )}
            </motion.div>
          )}

          {loading && !route && (
            <div className="route-skeleton" aria-busy="true" aria-label="Calculando rota">
              <i />
              <i />
              <i />
            </div>
          )}

          {route && (
            <div className={`route-results ${loading ? 'is-stale' : ''}`}>
              {route.note && (
                <p className="route-note">
                  <Info size={16} /> {route.note}
                </p>
              )}
              {noSaferOption && !route.note && (
                <p className="route-note route-note--info">
                  <Info size={16} />
                  {endZone
                    ? `Esta já é a rota com menos exposição. O trecho em alto risco fica na região ${endZone.name}, onde a rota ${zoneAtPoint(route.points[0])?.id === endZone.id ? 'começa' : 'termina'}.`
                    : 'Esta já é a rota com menos exposição a áreas de alto risco.'}
                </p>
              )}
              <motion.section variants={fadeUp} className="route-summary">
                <h3>Resumo da rota</h3>
                <div className="route-summary__row">
                  <div className={`route-class route-class--${cls}`}>
                    <strong>
                      <info.icon size={18} /> {info.title}
                    </strong>
                    <span>{info.text}</span>
                  </div>
                  <div className="kv">
                    <strong>{formatDistance(route.meters, units)}</strong>
                    <span>Distância</span>
                  </div>
                  <div className="kv">
                    <strong>{formatMinutes(route.minutes)}</strong>
                    <span>Tempo estimado</span>
                  </div>
                </div>
              </motion.section>

              {!desktop && (
                <motion.div variants={fadeUp} className="route-map">
                  <MapView variant="mini" view={{ bounds: route.points, pad: 26 }} route={route.points} markers={markers} showUser={false} />
                </motion.div>
              )}


              <motion.section variants={fadeUp} className="card levels-card">
                <h4>Níveis de risco no trajeto</h4>
                <div className="levels">
                  {(['alto', 'atencao', 'baixo'] as const).map((l) => (
                    <div key={l} className="level">
                      <i className={`lv-${l}`} />
                      <div>
                        <strong>{formatDistance(route.byLevel[l], units)}</strong>
                        <span>{LEVEL_LABEL[l]}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="levels-bar" aria-hidden="true">
                  {(['alto', 'atencao', 'baixo'] as const).filter((l) => route.byLevel[l] > 0).map((l) => (
                    <motion.i key={l} className={`lv-${l}`} initial={{ flexGrow: 0 }} animate={{ flexGrow: route.byLevel[l] }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} />
                  ))}
                </div>
              </motion.section>

              {subscription.active && IS_REAL && (
                <motion.section variants={fadeUp} className="card external-nav">
                  <h4>Seguir em outro app</h4>
                  <p className="muted small">O Google Maps recebe a rota com os desvios. O Waze recebe só o destino e pode escolher outro caminho.</p>
                  <div className="external-nav__btns">
                    <a className="btn btn--secondary btn--md" href={googleMapsUrl(route.points)} target="_blank" rel="noopener noreferrer">
                      Google Maps
                    </a>
                    <a className="btn btn--secondary btn--md" href={wazeUrl(route.points)} target="_blank" rel="noopener noreferrer">
                      Waze
                    </a>
                  </div>
                </motion.section>
              )}

              <motion.section variants={fadeUp} className="card tips-card">
                <h4>Dicas de segurança</h4>
                <ul>
                  {tips.map((t) => (
                    <li key={t.text}>
                      {t.icon === 'clock' ? <Clock size={16} className="c-amber" /> : t.icon === 'warn' ? <AlertTriangle size={16} className="c-amber" /> : <ShieldCheck size={16} className="c-green" />}
                      {t.text}
                    </li>
                  ))}
                </ul>
              </motion.section>
            </div>
          )}
        </div>

        {desktop && (
          <div className="route-grid__map">
            <div className="route-map route-map--tall">
              {route ? (
                <MapView view={{ bounds: route.points, pad: 60 }} route={route.points} markers={markers} showUser={false} controls />
              ) : (
                <MapView view={{ center: userPos, meters: 10000 }} showUser />
              )}
            </div>
          </div>
        )}
      </motion.div>

      <div className="cta-bar">
        <Button block disabled={!route} onClick={start}>
          Iniciar navegação
        </Button>
      </div>
    </div>
  )
}

/** As três opções lado a lado, com tempo e exposição, e o ganho explícito de cada uma (RF-002). */
function RouteOptionsPicker({ options, value, units, onChange }: { options: RouteOptions; value: RoutePreference; units: 'km' | 'mi'; onChange: (v: RoutePreference) => void }) {
  const fast = options.rapida
  const same = (a: Route, b: Route) => a === b
  return (
    <div className="route-options" role="radiogroup" aria-label="Preferência de rota">
      {PREFS.map(({ value: v, label }) => {
        const r = options[v]
        const on = v === value
        const extra = r.minutes - fast.minutes
        const eFast = exposure(fast)
        const less = eFast > 0 ? Math.round((1 - exposure(r) / eFast) * 100) : 0
        const twin = v !== 'rapida' && same(r, options.rapida) ? 'Igual à mais rápida' : v === 'equilibrada' && same(r, options.segura) ? 'Igual à mais segura' : null
        return (
          <button key={v} type="button" role="radio" aria-checked={on} className={`route-option ${on ? 'is-on' : ''}`} onClick={() => onChange(v)}>
            <span className="route-option__name">{label}</span>
            <strong>{formatMinutes(r.minutes)}</strong>
            <span className={`route-option__risk ${r.byLevel.alto > 0 ? 'is-alto' : ''}`}>
              {r.byLevel.alto > 0 ? `${formatDistance(r.byLevel.alto, units)} em alto risco` : 'Sem alto risco'}
            </span>
            <small>{twin ?? (v === 'rapida' ? 'Menor tempo' : less > 0 ? `${extra > 0 ? `+${extra} min · ` : ''}${less}% menos exposição` : 'Mesma exposição')}</small>
          </button>
        )
      })}
    </div>
  )
}

/** Deep links (RF-002). Pontos do modo real são [lng, lat]. */
const ll = (p: Pt) => `${p[1].toFixed(6)},${p[0].toFixed(6)}`
function googleMapsUrl(points: Pt[]) {
  // até 8 pontos intermediários pra manter os desvios da rota escolhida
  const n = Math.min(8, Math.max(0, points.length - 2))
  const mids = Array.from({ length: n }, (_, i) => points[Math.round(((i + 1) * (points.length - 1)) / (n + 1))])
  const q = new URLSearchParams({ api: '1', origin: ll(points[0]), destination: ll(points[points.length - 1]), travelmode: 'driving' })
  if (mids.length) q.set('waypoints', mids.map(ll).join('|'))
  return `https://www.google.com/maps/dir/?${q}`
}
const wazeUrl = (points: Pt[]) => `https://waze.com/ul?ll=${ll(points[points.length - 1])}&navigate=yes`

/** Seletor de local com busca (combobox simples). */
function PlacePicker({ label, value, onChange, allowCurrent, dot }: { label: string; value: string; onChange: (v: string) => void; allowCurrent?: boolean; dot: 'origin' | 'dest' }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const list = regions.filter((r) => norm(r.name).includes(norm(q)))
  const pick = (v: string) => {
    onChange(v)
    setOpen(false)
    setQ('')
  }

  return (
    <div className="picker" ref={ref}>
      <span className={`picker__dot picker__dot--${dot}`}>{dot === 'dest' ? <MapPin size={18} /> : <i />}</span>
      <button type="button" className="picker__btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="listbox">
        <small>{label}</small>
        <span className={value ? '' : 'placeholder'}>{value ? placeName(value) : 'Escolha um local'}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="picker__menu" initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.16 }}>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar região..." aria-label={`Buscar ${label.toLowerCase()}`} />
            <ul role="listbox">
              {allowCurrent && !q && (
                <li>
                  <button type="button" onClick={() => pick('atual')} role="option" aria-selected={value === 'atual'}>
                    <LocateFixed size={16} /> Minha localização {value === 'atual' && <Check size={16} />}
                  </button>
                </li>
              )}
              {list.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => pick(r.id)} role="option" aria-selected={value === r.id}>
                    <i className={`lv-${r.level}`} /> {r.name} {value === r.id && <Check size={16} />}
                  </button>
                </li>
              ))}
              {!list.length && <li className="muted small pad">Nada encontrado</li>}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
