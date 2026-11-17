import { forwardRef, lazy, Suspense } from 'react'
import { IS_REAL } from '../geo/config'
import { METERS_PER_UNIT, type Pt } from '../lib/city'
import { CityMap, type CityMapHandle, type MapMarker } from './CityMap'
import { useApp } from '../store/AppStore'

/**
 * Componente de mapa usado pelas páginas. Decide sozinho entre:
 *  - RealMap (MapLibre, mapa real de Goiânia) quando há chave do OpenRouteService
 *  - CityMap (SVG da cidade fictícia) no modo demonstração
 * As duas implementações aceitam as mesmas props.
 */
export type { MapMarker }
export type MapViewport = { center: Pt; meters: number } | { bounds: Pt[]; pad?: number }
export type MapHandle = { setView: (v: MapViewport, animated?: boolean) => void }

export type MapViewProps = {
  view: MapViewport
  variant?: 'default' | 'mini'
  interactive?: boolean
  showRegions?: boolean | string[]
  highlightId?: string
  route?: Pt[]
  routeProgress?: number
  markers?: MapMarker[]
  showUser?: boolean
  controls?: boolean
  inset?: { top?: number; right?: number; bottom?: number; left?: number }
  onRegionClick?: (id: string) => void
  onUserMove?: () => void
}

// MapLibre é pesado (~800 kB): só carrega quando o modo real está ativo
const RealMap = lazy(() => import('./RealMap'))

const toSpan = (v: MapViewport) => ('center' in v ? { center: v.center, span: v.meters / METERS_PER_UNIT } : v)

export const MapView = forwardRef<MapHandle, MapViewProps>(function MapView(props, ref) {
  const { resolvedTheme } = useApp()
  if (IS_REAL)
    return (
      <Suspense fallback={<div className="citymap map-loading" />}>
        <RealMap key={resolvedTheme} ref={ref} {...props} />
      </Suspense>
    )
  const demoRef = ref
    ? (h: CityMapHandle | null) => {
        const handle: MapHandle | null = h ? { setView: (v, a) => h.setView(toSpan(v), a) } : null
        if (typeof ref === 'function') ref(handle)
        else ref.current = handle
      }
    : undefined
  return <CityMap ref={demoRef} {...props} view={toSpan(props.view)} />
})
