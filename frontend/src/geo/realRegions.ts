import type { Pt } from '../lib/city'

/**
 * Geometria das regiões no mapa real (Goiânia), em [longitude, latitude].
 *
 * ATENÇÃO: são polígonos APROXIMADOS, gerados ao redor do centro de cada bairro só pra
 * demonstração. Antes de apresentar como dado real, redesenhem os limites no geojson.io
 * (ou peguem os limites oficiais da prefeitura) e colem as coordenadas aqui.
 */

type RealRegion = { name: string; center: Pt; radius: number; seed: number }

export const REAL_REGIONS: Record<string, RealRegion> = {
  'setor-central': { name: 'Setor Central', center: [-49.2552, -16.6795], radius: 900, seed: 1 },
  'bairro-das-flores': { name: 'Setor Leste Universitário', center: [-49.2405, -16.6845], radius: 750, seed: 2 },
  'jardim-america': { name: 'Jardim América', center: [-49.2835, -16.7135], radius: 950, seed: 3 },
  'vila-nova': { name: 'Vila Nova', center: [-49.2440, -16.6650], radius: 650, seed: 4 },
  morumbi: { name: 'Campinas', center: [-49.2885, -16.6690], radius: 800, seed: 5 },
  centro: { name: 'Setor Oeste', center: [-49.2705, -16.6805], radius: 700, seed: 6 },
  'boa-vista': { name: 'Setor Bueno', center: [-49.2690, -16.7045], radius: 800, seed: 7 },
  'cidade-jardim': { name: 'Cidade Jardim', center: [-49.3110, -16.6935], radius: 800, seed: 8 },
}

/** Posição simulada do usuário: Praça Cívica, dentro do Setor Central. */
export const REAL_USER_POS: Pt = [-49.2551, -16.6799]
export const REAL_USER_ADDRESS = 'Praça Cívica, Setor Central'

const M_PER_DEG_LAT = 110_540

/** Polígono irregular (determinístico) ao redor de um centro, raio em metros. */
export function blob(center: Pt, radius: number, seed: number, n = 20): Pt[] {
  const mPerDegLng = 111_320 * Math.cos((center[1] * Math.PI) / 180)
  const pts: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const r = radius * (0.88 + 0.1 * Math.sin(a * 2 + seed) + 0.05 * Math.cos(a * 3 + seed * 2))
    pts.push([center[0] + (Math.cos(a) * r) / mPerDegLng, center[1] + (Math.sin(a) * r) / M_PER_DEG_LAT])
  }
  return pts
}
