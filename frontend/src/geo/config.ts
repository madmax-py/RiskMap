/**
 * Escolhe entre o mapa real (MapLibre + OpenRouteService) e o modo demonstração (cidade fictícia).
 *
 * - Com VITE_ORS_API_KEY no .env → modo real.
 * - VITE_MAP_MODE=demo força a cidade fictícia mesmo com chave (útil sem internet).
 */
export const ORS_KEY = (import.meta.env.VITE_ORS_API_KEY as string | undefined)?.trim() || ''
const forced = import.meta.env.VITE_MAP_MODE as string | undefined

export const MODE: 'real' | 'demo' = forced === 'demo' || !ORS_KEY ? 'demo' : 'real'
export const IS_REAL = MODE === 'real'

/** Estilo do mapa (vetorial). O padrão é o Dark Matter da CARTO, que não precisa de chave. */
export const MAP_STYLE_URL =
  (import.meta.env.VITE_MAP_STYLE_URL as string | undefined) || 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

/** Estilo do tema claro (Positron da CARTO, também sem chave). */
export const MAP_STYLE_URL_LIGHT =
  (import.meta.env.VITE_MAP_STYLE_URL_LIGHT as string | undefined) || 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

export const ORS_BASE = 'https://api.openrouteservice.org'
