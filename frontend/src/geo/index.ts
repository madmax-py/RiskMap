/**
 * Camada de geometria: o resto do app só fala com este arquivo, sem saber se o mapa
 * é real (longitude/latitude) ou a cidade fictícia (coordenadas do SVG).
 *
 * Um "ponto de exibição" (Pt) é:
 *   - modo real: [longitude, latitude]
 *   - modo demo: coordenada do mundo SVG (já deformada)
 */
import { g2w, METERS_PER_UNIT, pointInPolygon, warpPolygon, type Pt, type RiskLevel } from '../lib/city'
import { regionById, regions, USER_POS } from '../data/mock'
import { IS_REAL } from './config'
import { blob, REAL_REGIONS, REAL_USER_POS } from './realRegions'

export type { Pt }

const shapes: Record<string, Pt[]> = Object.fromEntries(
  regions.map((r) => {
    if (IS_REAL) {
      const rr = REAL_REGIONS[r.id]
      return [r.id, blob(rr.center, rr.radius, rr.seed)]
    }
    return [r.id, warpPolygon(r.poly)]
  }),
)

export const regionShape = (id: string): Pt[] => shapes[id] ?? []
export const regionLabel = (id: string): Pt => (IS_REAL ? REAL_REGIONS[id].center : g2w(regionById(id)!.label))
export const userPos: Pt = IS_REAL ? REAL_USER_POS : g2w(USER_POS)

// ---------- projeção plana (metros, com y pra baixo como na tela) ----------
const LAT0 = IS_REAL ? REAL_USER_POS[1] : 0
const M_LNG = 111_320 * Math.cos((LAT0 * Math.PI) / 180)
const M_LAT = 110_540

export function toPlanar(p: Pt): Pt {
  return IS_REAL ? [p[0] * M_LNG, -p[1] * M_LAT] : [p[0] * METERS_PER_UNIT, p[1] * METERS_PER_UNIT]
}

/** Desloca um ponto em metros (dx pra direita, dy pra baixo). */
export function offset(p: Pt, dx: number, dy: number): Pt {
  return IS_REAL ? [p[0] + dx / M_LNG, p[1] - dy / M_LAT] : [p[0] + dx / METERS_PER_UNIT, p[1] + dy / METERS_PER_UNIT]
}

export function distance(a: Pt, b: Pt) {
  const pa = toPlanar(a)
  const pb = toPlanar(b)
  return Math.hypot(pa[0] - pb[0], pa[1] - pb[1])
}

// ---------- risco ----------
export type Zone = { id: string; name: string; level: RiskLevel }

/** Em qual área de risco o ponto está (alto risco ganha de atenção). */
export function zoneAtPoint(p: Pt): Zone | undefined {
  let found: Zone | undefined
  for (const r of regions) {
    if (r.level === 'baixo') continue
    if (pointInPolygon(p, shapes[r.id])) {
      if (r.level === 'alto') return { id: r.id, name: r.name, level: r.level }
      found = { id: r.id, name: r.name, level: r.level }
    }
  }
  return found
}

/** Quantos metros da linha passam em cada nível de risco, e quais áreas ela cruza. */
export function analyzeLine(points: Pt[]) {
  const byLevel: Record<RiskLevel, number> = { alto: 0, atencao: 0, baixo: 0 }
  const zones = new Map<string, Zone>()
  let meters = 0
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1]
    const b = points[k]
    const m = distance(a, b)
    // trechos longos são amostrados em pedaços de ~40 m pra não "pular" uma área
    const n = Math.max(1, Math.ceil(m / 40))
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n
      const z = zoneAtPoint([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
      byLevel[z ? z.level : 'baixo'] += m / n
      if (z) zones.set(z.id, z)
    }
    meters += m
  }
  return { meters, byLevel, zones: [...zones.values()] }
}

/** Ponto e ângulo (graus, convenção de tela) a uma fração t do comprimento da linha. */
export function along(points: Pt[], t: number): { p: Pt; angle: number; index: number } {
  const lens: number[] = []
  let total = 0
  for (let k = 1; k < points.length; k++) {
    const l = distance(points[k - 1], points[k])
    lens.push(l)
    total += l
  }
  let target = Math.min(1, Math.max(0, t)) * total
  for (let k = 0; k < lens.length; k++) {
    if (target <= lens[k] || k === lens.length - 1) {
      const a = points[k]
      const b = points[k + 1]
      const f = lens[k] ? Math.min(1, target / lens[k]) : 0
      const pa = toPlanar(a)
      const pb = toPlanar(b)
      return {
        p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f],
        angle: (Math.atan2(pb[1] - pa[1], pb[0] - pa[0]) * 180) / Math.PI,
        index: k,
      }
    }
    target -= lens[k]
  }
  return { p: points[0], angle: 0, index: 0 }
}

/** Corta a linha na fração t: [parte percorrida, parte restante]. */
export function splitLine(points: Pt[], t: number): [Pt[], Pt[]] {
  if (points.length < 2) return [[], points]
  const { p, index } = along(points, t)
  return [[...points.slice(0, index + 1), p], [p, ...points.slice(index + 1)]]
}
