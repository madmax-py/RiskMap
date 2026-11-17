import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import maplibregl, { type GeoJSONSource, type LngLatBoundsLike, type Map as MLMap, type PaddingOptions } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MAP_STYLE_URL, MAP_STYLE_URL_LIGHT } from '../geo/config'
import { useApp } from '../store/AppStore'
import { regionLabel, regionShape, splitLine, userPos, type Pt } from '../geo'
import { regions } from '../data/mock'
import type { MapHandle, MapMarker, MapViewport, MapViewProps } from './MapView'

/** Mapa real (MapLibre GL). Mesmas props do CityMap; coordenadas em [lng, lat]. */
const RealMap = forwardRef<MapHandle, MapViewProps>(function RealMap(
  {
    view,
    variant = 'default',
    interactive = variant === 'default',
    showRegions = true,
    highlightId,
    route,
    routeProgress,
    markers = [],
    showUser = variant === 'default',
    controls = false,
    inset,
    onRegionClick,
    onUserMove,
  },
  ref,
) {
  const el = useRef<HTMLDivElement>(null)
  // o tema é lido na criação; o MapView remonta este componente quando o tema muda
  const light = useApp().resolvedTheme === 'claro'
  const mapRef = useRef<MLMap | null>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const insetRef = useRef(inset)
  insetRef.current = inset
  const cbs = useRef({ onRegionClick, onUserMove })
  cbs.current = { onRegionClick, onUserMove }

  const padding = useCallback((extra = 0): PaddingOptions => {
    const i = insetRef.current ?? {}
    const box = el.current?.getBoundingClientRect()
    const w = box?.width ?? 400
    const h = box?.height ?? 400
    // nunca deixa o padding maior que o mapa (o MapLibre reclama)
    const clampX = (v: number) => Math.max(0, Math.min(v, w / 2 - 20))
    const clampY = (v: number) => Math.max(0, Math.min(v, h / 2 - 20))
    return {
      top: clampY((i.top ?? 0) + extra),
      bottom: clampY((i.bottom ?? 0) + extra),
      left: clampX((i.left ?? 0) + extra),
      right: clampX((i.right ?? 0) + extra),
    }
  }, [])

  const setView = useCallback(
    (v: MapViewport, animated = true) => {
      const map = mapRef.current
      if (!map) return
      const duration = animated ? 500 : 0
      if ('center' in v) {
        const box = el.current!.getBoundingClientRect()
        const p = padding()
        const px = Math.max(80, Math.min(box.width - p.left - p.right, box.height - p.top - p.bottom))
        // metros por pixel no zoom 0 (tiles de 512 px no MapLibre)
        const mpp0 = (78271.517 * Math.cos((v.center[1] * Math.PI) / 180))
        const zoom = Math.log2((mpp0 * px) / v.meters)
        map.easeTo({ center: v.center, zoom, padding: p, duration, essential: true })
      } else if (v.bounds.length) {
        const xs = v.bounds.map((q) => q[0])
        const ys = v.bounds.map((q) => q[1])
        const b: LngLatBoundsLike = [
          [Math.min(...xs), Math.min(...ys)],
          [Math.max(...xs), Math.max(...ys)],
        ]
        map.fitBounds(b, { padding: padding(v.pad ?? 40), duration, maxZoom: 16.5, essential: true })
      }
    },
    [padding],
  )
  useImperativeHandle(ref, () => ({ setView }), [setView])

  const markerObjs = useRef(new Map<string, { m: maplibregl.Marker; kind: string }>())

  // ---------- criação do mapa ----------
  useEffect(() => {
    const map = new maplibregl.Map({
      container: el.current!,
      style: light ? MAP_STYLE_URL_LIGHT : MAP_STYLE_URL,
      center: userPos,
      zoom: 13,
      interactive,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: { compact: true },
      fadeDuration: 150,
      locale: {
        'NavigationControl.ZoomIn': 'Aproximar',
        'NavigationControl.ZoomOut': 'Afastar',
        'Marker.Title': 'Marcador no mapa',
        'AttributionControl.ToggleAttribution': 'Mostrar créditos do mapa',
      },
    })
    mapRef.current = map
    map.touchZoomRotate.disableRotation()
    if (controls) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    setView(view, false)

    map.on('error', (e) => {
      // erro ao baixar o estilo = sem mapa nenhum; erros de tile isolados são ignorados
      if (!map.isStyleLoaded() && String(e.error?.message ?? '').match(/style|fetch|Failed/i)) setFailed(true)
    })
    map.on('dragstart', () => cbs.current.onUserMove?.())
    map.on('load', () => {
      map.addSource('regions', { type: 'geojson', data: emptyFC() })
      // hachura diagonal no alto risco: o nível não depende só da cor
      if (!map.hasImage('hatch-alto')) map.addImage('hatch-alto', hatchImage(), { pixelRatio: 2 })
      map.addSource('route-left', { type: 'geojson', data: emptyFC() })
      map.addSource('route-done', { type: 'geojson', data: emptyFC() })
      map.addLayer({
        id: 'regions-fill',
        type: 'fill',
        source: 'regions',
        paint: {
          'fill-color': ['match', ['get', 'level'], 'alto', '#e5484d', 'atencao', '#f6b500', '#22c55e'],
          'fill-opacity': ['case', ['get', 'hl'], 0.5, ['get', 'dim'], 0.2, ['==', ['get', 'level'], 'baixo'], 0.16, 0.36],
        },
      })
      map.addLayer({
        id: 'regions-hatch',
        type: 'fill',
        source: 'regions',
        filter: ['==', ['get', 'level'], 'alto'],
        paint: { 'fill-pattern': 'hatch-alto', 'fill-opacity': ['case', ['get', 'dim'], 0.4, 1] },
      })
      map.addLayer({
        id: 'regions-line',
        type: 'line',
        source: 'regions',
        paint: {
          'line-color': light ? ['match', ['get', 'level'], 'alto', '#c4281f', 'atencao', '#b78700', '#15803d'] : ['match', ['get', 'level'], 'alto', '#ff6b66', 'atencao', '#ffd04d', '#4ade80'],
          'line-width': ['case', ['get', 'hl'], 2.6, 1.4],
        },
      })
      map.addLayer({ id: 'route-casing', type: 'line', source: 'route-left', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': light ? '#ffffff' : '#060a12', 'line-width': 8, 'line-opacity': light ? 0.95 : 0.8 } })
      map.addLayer({ id: 'route-line', type: 'line', source: 'route-left', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': light ? '#0b52d0' : '#ffffff', 'line-width': 4 } })
      map.addLayer({ id: 'route-done', type: 'line', source: 'route-done', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': light ? '#a3acba' : '#5d6878', 'line-width': 4.5 } })
      map.on('click', 'regions-fill', (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined
        if (id) cbs.current.onRegionClick?.(id)
      })
      map.on('mouseenter', 'regions-fill', () => cbs.current.onRegionClick && (map.getCanvas().style.cursor = 'pointer'))
      map.on('mouseleave', 'regions-fill', () => (map.getCanvas().style.cursor = ''))
      setReady(true)
    })
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(el.current!)
    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = null
      markerObjs.current.clear() // os marcadores morrem junto com o mapa
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------- vista ----------
  const viewKey = JSON.stringify(view)
  const prevView = useRef(viewKey)
  useEffect(() => {
    if (prevView.current === viewKey) return
    prevView.current = viewKey
    setView(view, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey])

  const insetKey = JSON.stringify(inset ?? {})
  const prevInset = useRef(insetKey)
  useEffect(() => {
    if (prevInset.current === insetKey) return
    prevInset.current = insetKey
    setView(view, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insetKey])

  // ---------- regiões ----------
  const regionsKey = JSON.stringify([showRegions, highlightId])
  useEffect(() => {
    if (!ready) return
    const visible = showRegions === false ? [] : regions.filter((r) => showRegions === true || showRegions.includes(r.id))
    const features = visible
      .filter((r) => r.level !== 'baixo' || r.id === highlightId)
      .map((r) => {
        const ring = regionShape(r.id)
        return {
          type: 'Feature' as const,
          properties: { id: r.id, level: r.level, hl: r.id === highlightId, dim: !!highlightId && r.id !== highlightId },
          geometry: { type: 'Polygon' as const, coordinates: [[...ring, ring[0]]] },
        }
      })
    ;(mapRef.current!.getSource('regions') as GeoJSONSource).setData({ type: 'FeatureCollection', features })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, regionsKey])

  // rótulos das regiões como marcadores HTML (não depende das fontes do estilo)
  useEffect(() => {
    const map = mapRef.current
    if (!map || showRegions === false) return
    const list = regions.filter((r) => (showRegions === true || showRegions.includes(r.id)) && (r.level !== 'baixo' || r.id === highlightId || variant === 'default'))
    const ms = list.map((r) => {
      const div = document.createElement('div')
      div.className = `rm-label ${r.level === 'baixo' ? 'is-muted' : ''} ${variant === 'mini' ? 'is-mini' : ''}`
      div.textContent = r.name
      return new maplibregl.Marker({ element: div }).setLngLat(regionLabel(r.id)).addTo(map)
    })
    return () => ms.forEach((m) => m.remove())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionsKey, variant])

  // ---------- rota ----------
  const routeKey = route ? `${route.length}:${route[0]?.join()}:${route[route.length - 1]?.join()}` : ''
  useEffect(() => {
    if (!ready) return
    const map = mapRef.current!
    const [done, left] = route && route.length > 1 ? (routeProgress ? splitLine(route, routeProgress) : [[], route]) : [[], []]
    ;(map.getSource('route-left') as GeoJSONSource).setData(lineFC(left))
    ;(map.getSource('route-done') as GeoJSONSource).setData(lineFC(done))
  }, [ready, routeKey, routeProgress]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- marcadores ----------
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const all: MapMarker[] = [...markers]
    const seen = new Set<string>()
    for (const mk of all) {
      seen.add(mk.id)
      const cur = markerObjs.current.get(mk.id)
      if (cur && cur.kind === mk.kind) {
        cur.m.setLngLat(mk.at)
        if (mk.kind === 'arrow') cur.m.setRotation((mk.angle ?? 0) + 90)
        continue
      }
      cur?.m.remove()
      const m = new maplibregl.Marker({
        element: markerEl(mk.kind),
        anchor: mk.kind === 'pin' ? 'bottom' : 'center',
        rotationAlignment: 'map',
        rotation: mk.kind === 'arrow' ? (mk.angle ?? 0) + 90 : 0,
      })
        .setLngLat(mk.at)
        .addTo(map)
      m.getElement().setAttribute('aria-label', MARKER_LABEL[mk.kind])
      markerObjs.current.set(mk.id, { m, kind: mk.kind })
    }
    for (const [id, { m }] of markerObjs.current) if (!seen.has(id)) (m.remove(), markerObjs.current.delete(id))
  })

  useEffect(() => {
    const map = mapRef.current
    if (!map || !showUser) return
    const div = document.createElement('div')
    div.className = 'rm-user'
    div.innerHTML = '<i></i><b></b>'
    const m = new maplibregl.Marker({ element: div }).setLngLat(userPos).addTo(map)
    return () => {
      m.remove()
    }
  }, [showUser])

  return (
    <div className={`citymap realmap realmap--${variant}`}>
      <div ref={el} className="realmap__canvas" />
      {failed && (
        <div className="map-error">
          <strong>Não foi possível carregar o mapa</strong>
          <span>Verifique a conexão ou o VITE_MAP_STYLE_URL.</span>
        </div>
      )}
    </div>
  )
})

export default RealMap

function emptyFC(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] }
}
function lineFC(pts: Pt[]): GeoJSON.FeatureCollection {
  if (pts.length < 2) return emptyFC()
  return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: pts } }] }
}

const MARKER_LABEL: Record<MapMarker['kind'], string> = {
  pin: 'Local selecionado',
  report: 'Ocorrência registrada perto de você',
  arrow: 'Sua posição',
  origin: 'Origem',
}

/** Listras diagonais claras (16×16 px @2x) usadas por cima do preenchimento de alto risco. */
function hatchImage() {
  const size = 32
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if ((x + y) % 16 < 3) {
        const i = (y * size + x) * 4
        data.set([255, 214, 212, 120], i)
      }
    }
  return { width: size, height: size, data }
}

function markerEl(kind: MapMarker['kind']) {
  const div = document.createElement('div')
  div.className = `rm-marker rm-${kind}`
  if (kind === 'pin')
    div.innerHTML =
      '<svg width="30" height="43" viewBox="-15 -41 30 43"><path d="M0 0 C-3 -9 -13 -15 -13 -26 A13 13 0 1 1 13 -26 C13 -15 3 -9 0 0Z" fill="#f4f7fb" stroke="#0b1422" stroke-width="1.5"/><circle cy="-26" r="5" fill="#0b52d0"/></svg>'
  else if (kind === 'arrow')
    div.innerHTML =
      '<svg width="44" height="44" viewBox="-22 -22 44 44"><circle r="20" fill="rgba(47,128,255,.25)"/><path d="M0 -14 L10 10 L0 5 L-10 10 Z" fill="#fff" stroke="#2f80ff" stroke-width="3" stroke-linejoin="round"/></svg>'
  else if (kind === 'report')
    div.innerHTML = '<svg width="28" height="28" viewBox="-14 -14 28 28"><circle r="12" fill="#c4281f" stroke="#fff" stroke-width="2"/><path d="M0 -6 V2 M0 5.5 V6" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>'
  return div
}
