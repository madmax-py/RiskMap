/**
 * Cidade fictícia do protótipo.
 *
 * Não tem API de mapa aqui: a cidade é uma grade de ruas "entortada" por uma
 * função de ruído (warp), com algumas quadras removidas pra não ficar artificial.
 * Isso permite calcular rotas de verdade (A*) levando em conta as áreas de risco,
 * sem depender de Google Maps / Mapbox. Quando o backend existir, troca isso por
 * um provedor real (Leaflet/MapLibre + OSRM, por exemplo).
 */

export type Pt = [number, number]
export type RiskLevel = 'alto' | 'atencao' | 'baixo'
export type RoutePreference = 'segura' | 'equilibrada' | 'rapida'

export const N = 64 // nós por lado
export const S = 48 // distância entre nós (unidades do mapa)
export const WORLD = N * S
export const METERS_PER_UNIT = 4 // 1 unidade = 4 m → quadra de ~190 m, cidade de ~12 km
const AVENUE_EVERY = 5

// ---------- utilidades ----------
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Deforma a grade pra parecer uma cidade (entrada e saída em unidades do mapa). */
export function warp(x: number, y: number): Pt {
  const dx = 22 * Math.sin(y / 310 + 1.3) + 14 * Math.sin((x + y) / 190) + 7 * Math.sin(x / 97 + y / 150)
  const dy = 22 * Math.sin(x / 280 + 0.4) + 14 * Math.cos((x - y) / 210) + 7 * Math.sin(y / 83 - x / 170)
  return [x + dx, y + dy]
}

/** Converte coordenada de grade (índice de nó, pode ser fracionado) para ponto deformado. */
export const g2w = (p: Pt): Pt => warp(p[0] * S, p[1] * S)

export function pointInPolygon(p: Pt, poly: Pt[]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])

/** Densifica e deforma um polígono definido em coordenadas de grade. */
export function warpPolygon(poly: Pt[], step = 0.5): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const n = Math.max(1, Math.ceil(dist(a, b) / step))
    for (let k = 0; k < n; k++) out.push(g2w([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]))
  }
  return out
}

export const toPath = (pts: Pt[], close = false) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('') + (close ? 'Z' : '')

// ---------- grafo de ruas ----------
type Graph = {
  h: boolean[][] // h[j][i] = rua entre (i,j) e (i+1,j)
  v: boolean[][] // v[i][j] = rua entre (i,j) e (i,j+1)
  reachable: Uint8Array
}

const isAvenue = (k: number) => k % AVENUE_EVERY === 0

function buildGraph(): Graph {
  const rnd = mulberry32(20261110)
  const h = Array.from({ length: N + 1 }, () => Array(N).fill(true))
  const v = Array.from({ length: N + 1 }, () => Array(N).fill(true))
  const degree = (i: number, j: number) =>
    (i > 0 && h[j][i - 1] ? 1 : 0) + (i < N && h[j][i] ? 1 : 0) + (j > 0 && v[i][j - 1] ? 1 : 0) + (j < N && v[i][j] ? 1 : 0)

  for (let j = 0; j <= N; j++)
    for (let i = 0; i < N; i++) {
      if (isAvenue(j) || rnd() > 0.14) continue
      if (degree(i, j) > 2 && degree(i + 1, j) > 2) h[j][i] = false
    }
  for (let i = 0; i <= N; i++)
    for (let j = 0; j < N; j++) {
      if (isAvenue(i) || rnd() > 0.14) continue
      if (degree(i, j) > 2 && degree(i, j + 1) > 2) v[i][j] = false
    }

  // marca nós alcançáveis a partir do centro (avenidas garantem quase tudo)
  const reachable = new Uint8Array((N + 1) * (N + 1))
  const stack = [idx(30, 30)]
  reachable[stack[0]] = 1
  while (stack.length) {
    const id = stack.pop()!
    for (const nb of neighborsRaw(h, v, id)) if (!reachable[nb]) (reachable[nb] = 1), stack.push(nb)
  }
  return { h, v, reachable }
}

const idx = (i: number, j: number) => j * (N + 1) + i
const unidx = (id: number): Pt => [id % (N + 1), Math.floor(id / (N + 1))]

function neighborsRaw(h: boolean[][], v: boolean[][], id: number) {
  const [i, j] = unidx(id)
  const out: number[] = []
  if (i > 0 && h[j][i - 1]) out.push(idx(i - 1, j))
  if (i < N && h[j][i]) out.push(idx(i + 1, j))
  if (j > 0 && v[i][j - 1]) out.push(idx(i, j - 1))
  if (j < N && v[i][j]) out.push(idx(i, j + 1))
  return out
}

export const graph = buildGraph()

// ---------- desenho das ruas ----------
function streetPaths() {
  const minor: string[] = []
  const major: string[] = []
  const pushRun = (run: Pt[], avenue: boolean) => {
    if (run.length < 2) return
    ;(avenue ? major : minor).push(toPath(run.map(g2w)))
  }
  for (let j = 0; j <= N; j++) {
    let run: Pt[] = []
    for (let i = 0; i < N; i++) {
      if (graph.h[j][i]) {
        if (!run.length) run.push([i, j])
        run.push([i + 0.5, j], [i + 1, j])
      } else pushRun(run, isAvenue(j)), (run = [])
    }
    pushRun(run, isAvenue(j))
  }
  for (let i = 0; i <= N; i++) {
    let run: Pt[] = []
    for (let j = 0; j < N; j++) {
      if (graph.v[i][j]) {
        if (!run.length) run.push([i, j])
        run.push([i, j + 0.5], [i, j + 1])
      } else pushRun(run, isAvenue(i)), (run = [])
    }
    pushRun(run, isAvenue(i))
  }
  // duas diagonais decorativas pra quebrar a grade
  const diag = (a: Pt, b: Pt) => {
    const pts: Pt[] = []
    for (let t = 0; t <= 1.0001; t += 1 / 60) pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    major.push(toPath(pts.map(g2w)))
  }
  diag([0, 52], [30, 30])
  diag([30, 30], [64, 6])
  return { minor: minor.join(''), major: major.join('') }
}

export const streets = streetPaths()

// rio (decorativo) no canto nordeste
export const riverPath = toPath(
  [
    [38, -2], [41, 3], [46, 6], [52, 6.5], [57, 9], [60, 14], [66, 17],
  ].map((p) => g2w(p as Pt)),
)

export const parks: { name: string; poly: Pt[]; label: Pt }[] = [
  { name: 'Praça das Araucárias', poly: [[56, 30], [60, 30], [60, 34], [56, 34]], label: [58, 35] },
  { name: 'Parque do Cerrado', poly: [[3, 14], [9, 13], [10, 19], [4, 20]], label: [6.5, 21] },
  { name: 'Bosque Municipal', poly: [[27, 52], [31, 52], [31, 55], [27, 55]], label: [29, 56] },
]

export const streetNames = {
  h: { 15: 'Av. Brasil', 35: 'Av. Central', 45: 'R. das Flores', 25: 'Av. Goiás' } as Record<number, string>,
  v: { 20: 'Av. das Nações', 45: 'R. dos Ipês', 30: 'Av. Anhanguera', 10: 'R. do Ouro' } as Record<number, string>,
}

export function streetName(dir: 'h' | 'v', k: number) {
  return streetNames[dir][k] ?? (dir === 'h' ? `Rua C-${k}` : `Rua T-${k}`)
}

// ---------- roteamento ----------
export type RiskZone = { id: string; name: string; level: RiskLevel; poly: Pt[] }

export type RouteResult = {
  nodes: Pt[] // coordenadas de grade
  points: Pt[] // coordenadas deformadas (pra desenhar)
  meters: number
  minutes: number
  byLevel: Record<RiskLevel, number> // metros em cada nível
  zones: { id: string; name: string; level: RiskLevel }[] // áreas cruzadas
  steps: RouteStep[]
}

export type RouteStep = { atIndex: number; turn: 'esquerda' | 'direita' | 'siga' | 'chegada'; street: string; metersFromStart: number }

const RISK_WEIGHT: Record<RoutePreference, Record<RiskLevel, number>> = {
  segura: { alto: 7, atencao: 1.8, baixo: 0 },
  equilibrada: { alto: 1.2, atencao: 0.35, baixo: 0 },
  rapida: { alto: 0, atencao: 0, baixo: 0 },
}

export function zoneAt(p: Pt, zones: RiskZone[]): RiskZone | undefined {
  // alto risco tem prioridade sobre atenção
  let found: RiskZone | undefined
  for (const z of zones) {
    if (z.level === 'baixo') continue
    if (pointInPolygon(p, z.poly)) {
      if (z.level === 'alto') return z
      found = z
    }
  }
  return found
}

/** Nó alcançável mais próximo de uma coordenada de grade. */
export function snap(p: Pt): Pt {
  let best: Pt = [Math.round(p[0]), Math.round(p[1])]
  let bestD = Infinity
  for (let dj = -3; dj <= 3; dj++)
    for (let di = -3; di <= 3; di++) {
      const i = Math.round(p[0]) + di
      const j = Math.round(p[1]) + dj
      if (i < 0 || j < 0 || i > N || j > N || !graph.reachable[idx(i, j)]) continue
      const d = Math.hypot(i - p[0], j - p[1]) - (isAvenue(i) && isAvenue(j) ? 0.6 : 0)
      if (d < bestD) (bestD = d), (best = [i, j])
    }
  return best
}

export function findRoute(from: Pt, to: Pt, zones: RiskZone[], pref: RoutePreference): RouteResult | null {
  const start = idx(...snap(from))
  const goal = idx(...snap(to))
  const total = (N + 1) * (N + 1)
  const gScore = new Float64Array(total).fill(Infinity)
  const came = new Int32Array(total).fill(-1)
  const closed = new Uint8Array(total)
  const weights = RISK_WEIGHT[pref]
  const [gx, gy] = unidx(goal)
  const heur = (id: number) => {
    const [x, y] = unidx(id)
    return Math.hypot(x - gx, y - gy) * S * 0.55
  }
  // fila de prioridade simples (heap binário)
  const heap: [number, number][] = []
  const push = (f: number, id: number) => {
    heap.push([f, id])
    let c = heap.length - 1
    while (c > 0) {
      const p = (c - 1) >> 1
      if (heap[p][0] <= heap[c][0]) break
      ;[heap[p], heap[c]] = [heap[c], heap[p]]
      c = p
    }
  }
  const pop = () => {
    const top = heap[0]
    const last = heap.pop()!
    if (heap.length) {
      heap[0] = last
      let c = 0
      for (;;) {
        const l = 2 * c + 1
        const r = l + 1
        let m = c
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r
        if (m === c) break
        ;[heap[m], heap[c]] = [heap[c], heap[m]]
        c = m
      }
    }
    return top
  }

  gScore[start] = 0
  push(heur(start), start)
  while (heap.length) {
    const [, cur] = pop()
    if (cur === goal) break
    if (closed[cur]) continue
    closed[cur] = 1
    const a = unidx(cur)
    for (const nb of neighborsRaw(graph.h, graph.v, cur)) {
      const b = unidx(nb)
      const len = dist(g2w(a), g2w(b))
      const avenue = a[1] === b[1] ? isAvenue(a[1]) : isAvenue(a[0])
      const z = zoneAt([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], zones)
      const risk = z ? weights[z.level] : 0
      const base = pref === 'rapida' ? len / (avenue ? 1.6 : 1) : len * (avenue ? 0.85 : 1)
      const cost = base * (1 + risk)
      const ng = gScore[cur] + cost
      if (ng < gScore[nb]) {
        gScore[nb] = ng
        came[nb] = cur
        push(ng + heur(nb), nb)
      }
    }
  }
  if (came[goal] === -1 && start !== goal) return null

  const ids: number[] = [goal]
  while (ids[ids.length - 1] !== start) ids.push(came[ids[ids.length - 1]])
  ids.reverse()
  const nodes = ids.map(unidx)
  return describeRoute(nodes, zones)
}

function describeRoute(nodes: Pt[], zones: RiskZone[]): RouteResult {
  const points = nodes.map(g2w)
  const byLevel: Record<RiskLevel, number> = { alto: 0, atencao: 0, baixo: 0 }
  const zoneMap = new Map<string, RiskZone>()
  let meters = 0
  let minutes = 0
  for (let k = 1; k < nodes.length; k++) {
    const a = nodes[k - 1]
    const b = nodes[k]
    const m = dist(points[k - 1], points[k]) * METERS_PER_UNIT
    const avenue = a[1] === b[1] ? isAvenue(a[1]) : isAvenue(a[0])
    const z = zoneAt([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], zones)
    byLevel[z ? z.level : 'baixo'] += m
    if (z) zoneMap.set(z.id, z)
    meters += m
    minutes += m / 1000 / (avenue ? 38 : 24) * 60 // km/h médios
  }
  minutes += nodes.length * 0.04 // semáforos/curvas

  // instruções de navegação: cada mudança de direção vira um passo
  const steps: RouteStep[] = []
  let acc = 0
  const dirOf = (k: number): Pt => [nodes[k + 1][0] - nodes[k][0], nodes[k + 1][1] - nodes[k][1]]
  const streetOf = (k: number) => {
    const d = dirOf(k)
    return d[1] === 0 ? streetName('h', nodes[k][1]) : streetName('v', nodes[k][0])
  }
  if (nodes.length > 1) steps.push({ atIndex: 0, turn: 'siga', street: streetOf(0), metersFromStart: 0 })
  for (let k = 1; k < nodes.length - 1; k++) {
    acc += dist(points[k - 1], points[k]) * METERS_PER_UNIT
    const d1 = dirOf(k - 1)
    const d2 = dirOf(k)
    const cross = d1[0] * d2[1] - d1[1] * d2[0]
    if (cross !== 0) steps.push({ atIndex: k, turn: cross > 0 ? 'direita' : 'esquerda', street: streetOf(k), metersFromStart: acc })
  }
  steps.push({ atIndex: nodes.length - 1, turn: 'chegada', street: '', metersFromStart: meters })

  return {
    nodes,
    points,
    meters,
    minutes: Math.max(1, Math.round(minutes)),
    byLevel,
    zones: [...zoneMap.values()].map(({ id, name, level }) => ({ id, name, level })),
    steps,
  }
}

export function routeClass(r: Pick<RouteResult, 'byLevel'>): RiskLevel {
  if (r.byLevel.alto > 200) return 'alto'
  if (r.byLevel.alto > 0 || r.byLevel.atencao > 150) return 'atencao'
  return 'baixo'
}

/** Ponto e ângulo a uma fração `t` (0..1) do comprimento de uma polilinha. */
export function along(points: Pt[], t: number): { p: Pt; angle: number; index: number } {
  const lens: number[] = []
  let total = 0
  for (let k = 1; k < points.length; k++) {
    const l = dist(points[k - 1], points[k])
    lens.push(l)
    total += l
  }
  let target = Math.min(1, Math.max(0, t)) * total
  for (let k = 0; k < lens.length; k++) {
    if (target <= lens[k] || k === lens.length - 1) {
      const a = points[k]
      const b = points[k + 1]
      const f = lens[k] ? Math.min(1, target / lens[k]) : 0
      return {
        p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f],
        angle: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI,
        index: k,
      }
    }
    target -= lens[k]
  }
  return { p: points[0], angle: 0, index: 0 }
}

export function centroid(poly: Pt[]): Pt {
  const n = poly.length
  return [poly.reduce((s, p) => s + p[0], 0) / n, poly.reduce((s, p) => s + p[1], 0) / n]
}
