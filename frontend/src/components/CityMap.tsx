import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import { animate, motion } from 'framer-motion'
import { Locate, Minus, Plus } from 'lucide-react'
import { g2w, N, parks, riverPath, streetNames, streets, toPath, warpPolygon, WORLD, type Pt } from '../lib/city'
import { regions, USER_POS } from '../data/mock'
import { regionShape } from '../geo'

export type MapMarker = {
  id: string
  at: Pt // coordenadas do mundo (já deformadas)
  kind: 'pin' | 'origin' | 'report' | 'arrow'
  angle?: number
}

export type MapView = { center: Pt; span: number } | { bounds: Pt[]; pad?: number }

export type CityMapHandle = {
  setView: (v: MapView, animated?: boolean) => void
}

type Props = {
  view: MapView
  variant?: 'default' | 'mini' | 'backdrop'
  interactive?: boolean
  showRegions?: boolean | string[]
  highlightId?: string
  route?: Pt[]
  routeProgress?: number // 0..1, trecho já percorrido fica apagado
  markers?: MapMarker[]
  showUser?: boolean
  controls?: boolean
  /** espaço ocupado por painéis por cima do mapa (px) — o centro é deslocado */
  inset?: { top?: number; right?: number; bottom?: number; left?: number }
  onRegionClick?: (id: string) => void
  onUserMove?: () => void
  className?: string
}

const K_MIN = 0.1
const K_MAX = 2.4

export const CityMap = memo(
  forwardRef<CityMapHandle, Props>(function CityMap(
    {
      view,
      variant = 'default',
      interactive = variant === 'default',
      showRegions = variant !== 'backdrop',
      highlightId,
      route,
      routeProgress,
      markers = [],
      showUser = variant === 'default',
      controls = false,
      inset,
      onRegionClick,
      onUserMove,
      className,
    },
    ref,
  ) {
    const wrapRef = useRef<HTMLDivElement>(null)
    const svgRef = useRef<SVGSVGElement>(null)
    const worldRef = useRef<SVGGElement>(null)
    const cam = useRef({ cx: WORLD / 2, cy: WORLD / 2, k: 0.3 })
    const size = useRef({ w: 0, h: 0 })
    const anim = useRef<{ stop: () => void } | null>(null)
    const insetRef = useRef(inset)
    insetRef.current = inset
    const dragged = useRef(false)

    // ---------- câmera ----------
    const apply = useCallback(() => {
      const { w, h } = size.current
      const i = insetRef.current ?? {}
      const sx = ((i.left ?? 0) + w - (i.right ?? 0)) / 2
      const sy = ((i.top ?? 0) + h - (i.bottom ?? 0)) / 2
      const { cx, cy, k } = cam.current
      worldRef.current?.setAttribute('transform', `translate(${sx - cx * k} ${sy - cy * k}) scale(${k})`)
      const svg = svgRef.current
      if (svg) {
        svg.style.setProperty('--k', String(k))
        svg.dataset.zoom = k < 0.22 ? 'far' : k < 0.45 ? 'mid' : 'near'
      }
    }, [])

    const resolve = useCallback((v: MapView) => {
      const { w, h } = size.current
      const i = insetRef.current ?? {}
      const vw = Math.max(80, w - (i.left ?? 0) - (i.right ?? 0))
      const vh = Math.max(80, h - (i.top ?? 0) - (i.bottom ?? 0))
      if ('center' in v) return { cx: v.center[0], cy: v.center[1], k: clampK(Math.min(vw, vh) / v.span) }
      const xs = v.bounds.map((p) => p[0])
      const ys = v.bounds.map((p) => p[1])
      const pad = v.pad ?? 40
      const bw = Math.max(...xs) - Math.min(...xs) || 1
      const bh = Math.max(...ys) - Math.min(...ys) || 1
      const k = clampK(Math.min((vw - pad * 2) / bw, (vh - pad * 2) / bh))
      return { cx: (Math.max(...xs) + Math.min(...xs)) / 2, cy: (Math.max(...ys) + Math.min(...ys)) / 2, k }
    }, [])

    const setView = useCallback(
      (v: MapView, animated = true) => {
        anim.current?.stop()
        const to = resolve(v)
        if (!animated || !size.current.w) {
          cam.current = to
          apply()
          return
        }
        const from = { ...cam.current }
        anim.current = animate(0, 1, {
          duration: 0.5,
          ease: [0.22, 1, 0.36, 1],
          onUpdate: (t) => {
            const lk = Math.log(from.k) + (Math.log(to.k) - Math.log(from.k)) * t
            cam.current = { cx: from.cx + (to.cx - from.cx) * t, cy: from.cy + (to.cy - from.cy) * t, k: Math.exp(lk) }
            apply()
          },
        })
      },
      [apply, resolve],
    )

    useImperativeHandle(ref, () => ({ setView }), [setView])

    // tamanho do container
    const firstView = useRef(true)
    useLayoutEffect(() => {
      const el = wrapRef.current!
      const measure = () => {
        const r = el.getBoundingClientRect()
        size.current = { w: r.width, h: r.height }
        if (firstView.current && r.width) {
          firstView.current = false
          cam.current = resolve(view)
        }
        apply()
      }
      measure()
      const ro = new ResizeObserver(measure)
      ro.observe(el)
      return () => ro.disconnect()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // muda a vista quando a prop muda (comparação por valor)
    const viewKey = JSON.stringify(view)
    const prevKey = useRef(viewKey)
    useEffect(() => {
      if (prevKey.current === viewKey) return
      prevKey.current = viewKey
      setView(view, true)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewKey])

    const insetKey = JSON.stringify(inset ?? {})
    useEffect(() => apply(), [insetKey, apply])

    // ---------- gestos (arrastar, pinça, scroll) ----------
    useEffect(() => {
      if (!interactive) return
      const svg = svgRef.current!
      const pts = new Map<number, { x: number; y: number }>()
      let startDist = 0
      let startK = 0
      let moved = 0
      let last: { x: number; y: number } | null = null

      const zoomAt = (sx: number, sy: number, nk: number) => {
        const r = svg.getBoundingClientRect()
        const { w, h } = size.current
        const i = insetRef.current ?? {}
        const ox = ((i.left ?? 0) + w - (i.right ?? 0)) / 2
        const oy = ((i.top ?? 0) + h - (i.bottom ?? 0)) / 2
        const { cx, cy, k } = cam.current
        nk = clampK(nk)
        const px = sx - r.left - ox
        const py = sy - r.top - oy
        // mantém o ponto sob o cursor parado
        const wx = cx + px / k
        const wy = cy + py / k
        cam.current = { cx: wx - px / nk, cy: wy - py / nk, k: nk }
      }
      const clampCenter = () => {
        const c = cam.current
        c.cx = Math.min(WORLD + 200, Math.max(-200, c.cx))
        c.cy = Math.min(WORLD + 200, Math.max(-200, c.cy))
      }

      const down = (e: PointerEvent) => {
        anim.current?.stop()
        svg.setPointerCapture(e.pointerId)
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
        moved = 0
        dragged.current = false
        if (pts.size === 2) {
          const [a, b] = [...pts.values()]
          startDist = Math.hypot(a.x - b.x, a.y - b.y)
          startK = cam.current.k
          last = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        } else last = { x: e.clientX, y: e.clientY }
      }
      const move = (e: PointerEvent) => {
        if (!pts.has(e.pointerId)) return
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (pts.size === 1 && last) {
          const dx = e.clientX - last.x
          const dy = e.clientY - last.y
          moved += Math.abs(dx) + Math.abs(dy)
          cam.current.cx -= dx / cam.current.k
          cam.current.cy -= dy / cam.current.k
          last = { x: e.clientX, y: e.clientY }
        } else if (pts.size === 2 && last) {
          const [a, b] = [...pts.values()]
          const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          cam.current.cx -= (mid.x - last.x) / cam.current.k
          cam.current.cy -= (mid.y - last.y) / cam.current.k
          zoomAt(mid.x, mid.y, startK * (d / startDist))
          last = mid
          moved += 10
        }
        if (moved > 6 && !dragged.current) {
          dragged.current = true
          onUserMove?.()
        }
        clampCenter()
        apply()
      }
      const up = (e: PointerEvent) => {
        pts.delete(e.pointerId)
        if (pts.size === 1) {
          const [a] = [...pts.values()]
          last = { x: a.x, y: a.y }
        } else last = null
      }
      const wheel = (e: WheelEvent) => {
        e.preventDefault()
        anim.current?.stop()
        zoomAt(e.clientX, e.clientY, cam.current.k * Math.exp(-e.deltaY * 0.0016))
        clampCenter()
        apply()
      }
      svg.addEventListener('pointerdown', down)
      svg.addEventListener('pointermove', move)
      svg.addEventListener('pointerup', up)
      svg.addEventListener('pointercancel', up)
      svg.addEventListener('wheel', wheel, { passive: false })
      return () => {
        svg.removeEventListener('pointerdown', down)
        svg.removeEventListener('pointermove', move)
        svg.removeEventListener('pointerup', up)
        svg.removeEventListener('pointercancel', up)
        svg.removeEventListener('wheel', wheel)
      }
    }, [interactive, apply, onUserMove])

    const zoomBy = (f: number) => setView({ center: [cam.current.cx, cam.current.cy], span: Math.min(size.current.w, size.current.h) / (cam.current.k * f) })

    const visibleRegions = showRegions === false ? [] : regions.filter((r) => showRegions === true || showRegions.includes(r.id))
    const routePath = route && route.length > 1 ? toPath(route) : null
    const user = g2w(USER_POS)

    return (
      <div ref={wrapRef} className={`citymap citymap--${variant} ${className ?? ''}`}>
        <svg ref={svgRef} className="citymap__svg" role="img" aria-label="Mapa da cidade com áreas de risco">
          <defs>
            <pattern id="hatch-alto" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="3" height="14" fill="rgba(255, 214, 212, 0.45)" />
            </pattern>
          </defs>
          <g ref={worldRef}>
            <Base variant={variant} />

            {visibleRegions.map((r) => {
              const hl = r.id === highlightId
              if (r.level === 'baixo' && !hl) return null
              const d = toPath(regionShape(r.id), true)
              return (
                <g key={r.id}>
                <motion.path
                  d={d}
                  className={`region region--${r.level} ${hl ? 'is-hl' : ''} ${highlightId && !hl ? 'is-dim' : ''}`}
                  vectorEffect="non-scaling-stroke"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => !dragged.current && onRegionClick?.(r.id)}
                  style={{ cursor: onRegionClick ? 'pointer' : undefined }}
                />
                {r.level === 'alto' && <path d={d} className={`region-hatch ${highlightId && !hl ? 'is-dim' : ''}`} fill="url(#hatch-alto)" />}
                </g>
              )
            })}

            {routePath && (
              <g className="route">
                <path d={routePath} className="route__casing" vectorEffect="non-scaling-stroke" />
                <motion.path
                  d={routePath}
                  className="route__line"
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                />
                {routeProgress !== undefined && routeProgress > 0 && (
                  <path
                    d={routePath}
                    className="route__done"
                    vectorEffect="non-scaling-stroke"
                    pathLength={1}
                    strokeDasharray={`${routeProgress} 1`}
                  />
                )}
              </g>
            )}

            {variant !== 'backdrop' && (
              <g className="labels">
                {visibleRegions.map((r) => {
                  const p = g2w(r.label)
                  if (r.level === 'baixo' && r.id !== highlightId && variant === 'mini') return null
                  return (
                    <g key={r.id} transform={`translate(${p[0]} ${p[1]})`}>
                      <g className="nz">
                        <text className={`region-label ${r.level === 'baixo' ? 'is-muted' : ''}`}>{r.name}</text>
                      </g>
                    </g>
                  )
                })}
              </g>
            )}

            {markers.map((m) => (
              <g key={m.id} transform={`translate(${m.at[0]} ${m.at[1]})`}>
                <g className="nz">
                  <Marker kind={m.kind} angle={m.angle} />
                </g>
              </g>
            ))}

            {showUser && (
              <g transform={`translate(${user[0]} ${user[1]})`}>
                <g className="nz">
                  <circle r={22} className="user-pulse" />
                  <circle r={9} className="user-dot" />
                </g>
              </g>
            )}
          </g>
        </svg>

        {controls && (
          <div className="map-controls">
            <button type="button" aria-label="Aproximar" onClick={() => zoomBy(1.5)}>
              <Plus size={18} />
            </button>
            <button type="button" aria-label="Afastar" onClick={() => zoomBy(1 / 1.5)}>
              <Minus size={18} />
            </button>
            <button type="button" aria-label="Centralizar em mim" onClick={() => setView({ center: user, span: 900 })}>
              <Locate size={18} />
            </button>
          </div>
        )}
      </div>
    )
  }),
)

const clampK = (k: number) => Math.min(K_MAX, Math.max(K_MIN, k))

// Camada base (ruas, parques, rio) — não muda nunca, então é memoizada
const Base = memo(function Base({ variant }: { variant: string }) {
  const showLabels = variant === 'default'
  return (
    <>
      <rect x={-2000} y={-2000} width={WORLD + 4000} height={WORLD + 4000} className="map-bg" />
      {variant !== 'backdrop' &&
        parks.map((p) => <path key={p.name} d={toPath(warpPolygon(p.poly), true)} className="park" />)}
      <path d={riverPath} className="river" />
      <path d={streets.minor} className="street street--minor" />
      <path d={streets.major} className="street street--major" />
      {showLabels && (
        <g className="street-labels">
          {Object.entries(streetNames.h).flatMap(([j, name]) =>
            [12, 38, 56].map((i) => <StreetLabel key={name + i} a={[i - 0.5, +j]} b={[i + 0.5, +j]} name={name} />),
          )}
          {Object.entries(streetNames.v).flatMap(([i, name]) =>
            [8, 30, 52].map((j) => <StreetLabel key={name + j} a={[+i, j - 0.5]} b={[+i, j + 0.5]} name={name} />),
          )}
          {parks.map((p) => {
            const c = g2w(p.label)
            return (
              <g key={p.name} transform={`translate(${c[0]} ${c[1]})`}>
                <g className="nz">
                  <text className="park-label">{p.name}</text>
                </g>
              </g>
            )
          })}
          <g transform={`translate(${g2w([8, 58])[0]} ${g2w([8, 58])[1]})`}>
            <g className="nz">
              <text className="district-label">Zona Sul</text>
            </g>
          </g>
          <g transform={`translate(${g2w([N - 6, 60])[0]} ${g2w([N - 6, 60])[1]})`}>
            <g className="nz">
              <text className="district-label">Distrito Industrial</text>
            </g>
          </g>
        </g>
      )}
    </>
  )
})

function StreetLabel({ a, b, name }: { a: Pt; b: Pt; name: string }) {
  const pa = g2w(a)
  const pb = g2w(b)
  let ang = (Math.atan2(pb[1] - pa[1], pb[0] - pa[0]) * 180) / Math.PI
  if (ang > 90) ang -= 180
  if (ang < -90) ang += 180
  return (
    <g transform={`translate(${(pa[0] + pb[0]) / 2} ${(pa[1] + pb[1]) / 2}) rotate(${ang})`}>
      <g className="nz">
        <text className="street-label" dy={-6}>
          {name}
        </text>
      </g>
    </g>
  )
}

function Marker({ kind, angle = 0 }: { kind: MapMarker['kind']; angle?: number }) {
  if (kind === 'origin')
    return (
      <>
        <circle r={10} fill="#fff" />
        <circle r={7} fill="var(--primary-bright)" />
      </>
    )
  if (kind === 'report')
    return (
      <g className="marker-pop">
        <circle r={13} fill="var(--red-solid)" stroke="#fff" strokeWidth={2} />
        <path d="M0 -6 V2 M0 5.5 V6" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" />
      </g>
    )
  if (kind === 'arrow')
    return (
      <g transform={`rotate(${angle + 90})`}>
        <circle r={20} fill="rgba(47,128,255,.25)" />
        <path d="M0 -14 L10 10 L0 5 L-10 10 Z" fill="#fff" stroke="var(--primary-bright)" strokeWidth={3} strokeLinejoin="round" />
      </g>
    )
  return (
    <g className="marker-drop">
      <path
        d="M0 0 C-3 -9 -13 -15 -13 -26 A13 13 0 1 1 13 -26 C13 -15 3 -9 0 0Z"
        fill="#f4f7fb"
        stroke="#0b1422"
        strokeWidth={1.5}
      />
      <circle cy={-26} r={5} fill="var(--primary)" />
    </g>
  )
}
