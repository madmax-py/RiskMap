import { useEffect, useState } from 'react'
import { findRoute, routeClass, snap, type RiskLevel, type RoutePreference } from '../lib/city'
import { regionById, regions, riskZones, USER_POS } from '../data/mock'
import { IS_REAL, ORS_BASE, ORS_KEY } from './config'
import { analyzeLine, regionLabel, regionShape, userPos, type Pt, type Zone } from './index'
import { pointInPolygon } from '../lib/city'

export type Turn = 'esquerda' | 'direita' | 'siga' | 'chegada'
export type Step = { index: number; turn: Turn; text: string; metersFromStart: number }

export type Route = {
  points: Pt[] // coordenadas de exibição
  meters: number
  minutes: number
  byLevel: Record<RiskLevel, number>
  zones: Zone[]
  steps: Step[]
  cls: RiskLevel
  /** aviso quando não deu pra respeitar a preferência (ex.: destino dentro da área de risco) */
  note?: string
}

// ---------- lugares ----------
/**
 * Um lugar é identificado por uma string:
 *  - 'atual'                         → posição do usuário
 *  - '<id-da-região>'                → centro da região
 *  - 'geo:<lng>,<lat>|<nome>'        → endereço vindo da busca (só no modo real)
 */
export function placePoint(id: string): Pt | null {
  if (id === 'atual') return userPos
  if (id.startsWith('geo:')) {
    const [coords] = id.slice(4).split('|')
    const [lng, lat] = coords.split(',').map(Number)
    return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null
  }
  return regionById(id) ? regionLabel(id) : null
}

export function placeName(id: string) {
  if (id === 'atual') return 'Minha localização'
  if (id.startsWith('geo:')) return decodeURIComponent(id.split('|')[1] ?? 'Endereço').split(',')[0]
  return regionById(id)?.name ?? 'Local não encontrado'
}

export const geoPlaceId = (p: Pt, label: string) => `geo:${p[0].toFixed(6)},${p[1].toFixed(6)}|${encodeURIComponent(label)}`

// ---------- cálculo ----------
/**
 * Como as três preferências são escolhidas:
 * 1. Calculamos várias rotas candidatas (sem desvio, desviando do alto risco, desviando de alto risco e atenção,
 *    e as alternativas que o serviço sugerir).
 * 2. Medimos a exposição real de cada uma, trecho a trecho, com analyzeLine (inclusive dentro das áreas de
 *    origem e destino, que não dá pra evitar).
 * 3. Escolhemos dentro do MESMO conjunto:
 *    - Mais rápida:  menor tempo (empate: menor exposição)
 *    - Mais segura:  menor exposição (empate: menor tempo)
 *    - Equilibrada:  menor tempo + EXPOSURE_MIN_PER_KM × exposição
 * Isso garante que a "Mais segura" nunca expõe mais que a "Mais rápida", nem fica mais lenta sem ganho.
 */
export const EXPOSURE_WEIGHT: Record<RiskLevel, number> = { alto: 1, atencao: 0.4, baixo: 0 }
const EXPOSURE_MIN_PER_KM = 4 // quantos minutos a equilibrada aceita gastar pra evitar 1 km de exposição
/** Exposição ponderada, em metros equivalentes de alto risco. */
export const exposure = (r: Pick<Route, 'byLevel'>) => r.byLevel.alto * EXPOSURE_WEIGHT.alto + r.byLevel.atencao * EXPOSURE_WEIGHT.atencao
const TIE_M = 50 // diferenças de exposição menores que isso contam como empate

export type RouteOptions = Record<RoutePreference, Route>

function pickOptions(cands: Route[]): RouteOptions {
  const byTime = [...cands].sort((a, b) => a.minutes - b.minutes || exposure(a) - exposure(b))
  const rapida = byTime[0]
  const minE = Math.min(...cands.map(exposure))
  const segura = byTime.find((r) => exposure(r) <= minE + TIE_M)!
  const cost = (r: Route) => r.minutes + (exposure(r) / 1000) * EXPOSURE_MIN_PER_KM
  const equilibrada = [...byTime].sort((a, b) => cost(a) - cost(b))[0]
  return { segura, equilibrada, rapida }
}

/** Rotas parecidas (mesmo tempo e distância quase igual) contam como a mesma. */
function dedupe(routes: Route[]) {
  const out: Route[] = []
  for (const r of routes) if (!out.some((o) => o.minutes === r.minutes && Math.abs(o.meters - r.meters) < 60)) out.push(r)
  return out
}

const cache = new Map<string, Promise<RouteOptions>>()

export function getRouteOptions(from: string, to: string): Promise<RouteOptions> {
  const key = `${from}|${to}`
  if (!cache.has(key)) {
    const p = (IS_REAL ? orsCandidates(from, to) : demoCandidates(from, to))
      .then((c) => pickOptions(dedupe(c)))
      .catch((e) => {
        cache.delete(key) // não guarda erro em cache: permite tentar de novo
        throw e
      })
    cache.set(key, p)
  }
  return cache.get(key)!
}

export const getRoute = (from: string, to: string, pref: RoutePreference) => getRouteOptions(from, to).then((o) => o[pref])

export type RouteOptionsState = { status: 'idle' | 'loading' | 'ok' | 'error'; options: RouteOptions | null; error?: string }

/** Hook: calcula as três opções de rota de uma vez (trocar de preferência não faz nova chamada). */
export function useRouteOptions(from: string | null, to: string | null, retryKey = 0): RouteOptionsState {
  const [state, setState] = useState<RouteOptionsState>({ status: 'idle', options: null })
  useEffect(() => {
    if (!from || !to || from === to) return setState({ status: 'idle', options: null })
    let alive = true
    setState((s) => ({ status: 'loading', options: s.options }))
    getRouteOptions(from, to)
      .then((options) => alive && setState({ status: 'ok', options }))
      .catch((e: Error) => alive && setState({ status: 'error', options: null, error: e.message }))
    return () => {
      alive = false
    }
  }, [from, to, retryKey])
  return state
}

export type RouteState = { status: 'idle' | 'loading' | 'ok' | 'error'; route: Route | null; error?: string }

/** Hook: a rota de uma preferência (usado na navegação). */
export function useRoute(from: string | null, to: string | null, pref: RoutePreference, retryKey = 0): RouteState {
  const s = useRouteOptions(from, to, retryKey)
  return { status: s.status, route: s.options?.[pref] ?? null, error: s.error }
}

export function routeStats(r: Route) {
  return {
    meters: Math.round(r.meters),
    minutes: r.minutes,
    cls: r.cls,
    nAlto: r.zones.filter((z) => z.level === 'alto').length,
    nAtencao: r.zones.filter((z) => z.level === 'atencao').length,
  }
}

function finish(points: Pt[], minutes: number, steps: Step[], note?: string): Route {
  const a = analyzeLine(points)
  return { points, meters: a.meters, minutes, byLevel: a.byLevel, zones: a.zones, steps, cls: routeClass(a), note }
}

// ---------- modo demo: cidade fictícia + A* ----------
async function demoCandidates(from: string, to: string): Promise<Route[]> {
  const grid = (id: string) => (id === 'atual' ? snap(USER_POS) : regionById(id) ? snap(regionById(id)!.label) : null)
  const a = grid(from)
  const b = grid(to)
  if (!a || !b) throw new Error('No modo demonstração só dá pra traçar rota entre regiões.')
  const out = (['rapida', 'equilibrada', 'segura'] as const).map((p) => findRoute(a, b, riskZones, p)).filter(Boolean).map((r) => demoToRoute(r!))
  if (!out.length) throw new Error('Não encontrei um caminho entre esses pontos.')
  return out
}

function demoToRoute(r: NonNullable<ReturnType<typeof findRoute>>): Route {
  const steps: Step[] = r.steps.map((s) => ({
    index: s.atIndex,
    turn: s.turn,
    metersFromStart: s.metersFromStart,
    text: s.turn === 'chegada' ? 'Chegada ao destino' : s.turn === 'siga' ? `Siga pela ${s.street}` : `Vire à ${s.turn} na ${s.street}`,
  }))
  return finish(r.points, r.minutes, steps)
}

// ---------- modo real: OpenRouteService ----------
type OrsStep = { distance: number; type: number; instruction: string; way_points: [number, number] }
type OrsResponse = {
  features: { geometry: { coordinates: Pt[] }; properties: { summary: { distance?: number; duration?: number }; segments: { steps: OrsStep[] }[] } }[]
}

const TURN: Record<number, Turn> = { 0: 'esquerda', 1: 'direita', 2: 'esquerda', 3: 'direita', 4: 'esquerda', 5: 'direita', 6: 'siga', 7: 'siga', 8: 'siga', 9: 'esquerda', 10: 'chegada', 11: 'siga', 12: 'esquerda', 13: 'direita' }

/**
 * Preferência → quais áreas evitar:
 *  - segura:      evita alto risco e atenção
 *  - equilibrada: evita só alto risco
 *  - rapida:      não evita nada
 * Áreas que contêm a origem ou o destino não podem ser evitadas (senão não existe rota).
 */
function polygonsToAvoid(pref: RoutePreference, a: Pt, b: Pt) {
  const levels: RiskLevel[] = pref === 'segura' ? ['alto', 'atencao'] : pref === 'equilibrada' ? ['alto'] : []
  return regions
    .filter((r) => levels.includes(r.level))
    .map((r) => regionShape(r.id))
    .filter((poly) => !pointInPolygon(a, poly) && !pointInPolygon(b, poly))
}

async function orsRequest(a: Pt, b: Pt, avoid: Pt[][], alternatives = false): Promise<OrsResponse> {
  const body: Record<string, unknown> = { coordinates: [a, b], language: 'pt', instructions: true, units: 'm' }
  // o próprio ORS sugere até 2 caminhos alternativos (mais opções pra comparar a exposição)
  if (alternatives) body.alternative_routes = { target_count: 3, weight_factor: 1.6, share_factor: 0.6 }
  if (avoid.length) {
    body.options = {
      avoid_polygons: { type: 'MultiPolygon', coordinates: avoid.map((ring) => [[...ring, ring[0]]]) },
    }
  }
  let res: Response
  try {
    res = await fetch(`${ORS_BASE}/v2/directions/driving-car/geojson`, {
      method: 'POST',
      headers: { Authorization: ORS_KEY, 'Content-Type': 'application/json', Accept: 'application/geo+json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('Sem conexão com o serviço de rotas. Verifique sua internet.')
  }
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('Chave do OpenRouteService inválida. Confira o VITE_ORS_API_KEY no .env.')
    if (res.status === 429) throw new Error('Limite de requisições do OpenRouteService atingido. Espere um minuto e tente de novo.')
    let msg = ''
    try {
      msg = ((await res.json()) as { error?: { message?: string } }).error?.message ?? ''
    } catch {
      /* corpo sem JSON */
    }
    const err = new Error(msg || `O serviço de rotas respondeu com erro ${res.status}.`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return res.json()
}

async function orsCandidates(from: string, to: string): Promise<Route[]> {
  const a = placePoint(from)
  const b = placePoint(to)
  if (!a || !b) throw new Error('Não encontramos esse local. Escolha a origem e o destino de novo.')
  // a rota direta é obrigatória: é ela que define a "mais rápida" de verdade
  const base = await orsRequest(a, b, [])
  const out = (base.features ?? []).map(orsToRoute)
  if (!out.length) throw new Error('Nenhuma rota encontrada.')
  // candidatas extras: desviando do alto risco, desviando de tudo e as alternativas do próprio ORS.
  // Se alguma falhar (sem caminho que desvie, limite de chamadas), seguimos com as outras.
  const extras: [Pt[][], boolean][] = [
    [polygonsToAvoid('equilibrada', a, b), false],
    [polygonsToAvoid('segura', a, b), false],
    [[], true],
  ]
  for (const [avoid, alt] of extras) {
    if (!alt && !avoid.length) continue
    try {
      out.push(...((await orsRequest(a, b, avoid, alt)).features ?? []).map(orsToRoute))
    } catch {
      /* candidata opcional */
    }
  }
  return out
}

function orsToRoute(f: OrsResponse['features'][number]): Route {
  const points = f.geometry.coordinates.map((c) => [c[0], c[1]] as Pt)
  const steps: Step[] = []
  let acc = 0
  for (const seg of f.properties.segments ?? [])
    for (const s of seg.steps ?? []) {
      steps.push({ index: s.way_points[0], turn: TURN[s.type] ?? 'siga', text: s.instruction, metersFromStart: acc })
      acc += s.distance
    }
  const minutes = Math.max(1, Math.round((f.properties.summary.duration ?? 0) / 60))
  return finish(points, minutes, steps)
}

// ---------- busca de endereços (só modo real) ----------
export type AddressHit = { id: string; label: string; detail: string; point: Pt }

export async function searchAddress(q: string, signal?: AbortSignal): Promise<AddressHit[]> {
  if (!IS_REAL || q.trim().length < 3) return []
  const params = new URLSearchParams({
    api_key: ORS_KEY,
    text: q,
    'focus.point.lon': String(userPos[0]),
    'focus.point.lat': String(userPos[1]),
    'boundary.country': 'BR',
    size: '6',
  })
  const res = await fetch(`${ORS_BASE}/geocode/autocomplete?${params}`, { signal })
  if (!res.ok) throw new Error('Falha na busca de endereços.')
  const data = (await res.json()) as { features: { geometry: { coordinates: Pt }; properties: { label: string; name?: string } }[] }
  return data.features.map((f) => {
    const [name, ...rest] = f.properties.label.split(', ')
    const point: Pt = [f.geometry.coordinates[0], f.geometry.coordinates[1]]
    return { id: geoPlaceId(point, f.properties.label), label: f.properties.name ?? name, detail: rest.join(', '), point }
  })
}
