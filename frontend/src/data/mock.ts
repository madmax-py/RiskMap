import type { Pt, RiskLevel, RiskZone } from '../lib/city'
import { IS_REAL } from '../geo/config'
import { REAL_REGIONS, REAL_USER_ADDRESS } from '../geo/realRegions'

/** Dados mockados. Tudo que está aqui viria da API no app de verdade. */

export type OccurrenceType = { label: string; count: number; icon: 'car' | 'lock' | 'user' | 'more' }

export type Region = {
  id: string
  name: string
  level: RiskLevel
  /** polígono em coordenadas de grade (0..64) */
  poly: Pt[]
  label: Pt
  description: string
  occurrences30d: number
  breakdown: OccurrenceType[]
  hourly: number[] // 24 valores, 0h..23h
  peak: string
  updatedAt: string
}

const hourly = (shape: 'noite' | 'tarde' | 'plano', seed: number) =>
  Array.from({ length: 24 }, (_, h) => {
    const base =
      shape === 'noite' ? 1 + Math.max(0, h - 15) * 1.6 + (h >= 6 && h <= 8 ? 2.5 : 0) + (h >= 12 && h <= 14 ? 1.5 : 0)
      : shape === 'tarde' ? 1 + Math.exp(-((h - 17) ** 2) / 10) * 7
      : 2 + Math.sin(h / 3) * 0.8
    return Math.round(base + ((h * 7 + seed * 13) % 5) * 0.5)
  })

const baseRegions: Region[] = [
  {
    id: 'setor-central',
    name: 'Setor Central',
    level: 'alto',
    poly: [[24, 22], [30, 19], [37, 21], [41, 26], [42, 33], [39, 39], [33, 42], [26, 40], [22, 34], [21, 27]],
    label: [31, 28],
    description: 'Alta concentração de ocorrências registradas nessa região',
    occurrences30d: 47,
    breakdown: [
      { label: 'Roubo de veículos', count: 18, icon: 'car' },
      { label: 'Furto', count: 15, icon: 'lock' },
      { label: 'Assalto', count: 9, icon: 'user' },
      { label: 'Outros', count: 5, icon: 'more' },
    ],
    hourly: hourly('noite', 1),
    peak: '18h - 24h',
    updatedAt: '2026-11-10T14:32:00',
  },
  {
    id: 'bairro-das-flores',
    name: 'Bairro das Flores',
    level: 'alto',
    poly: [[39, 39], [42, 33], [47, 36], [48, 43], [44, 49], [37, 50], [33, 46], [33, 42]],
    label: [41, 43],
    description: 'Ocorrências frequentes no período noturno',
    occurrences30d: 31,
    breakdown: [
      { label: 'Assalto', count: 12, icon: 'user' },
      { label: 'Furto', count: 10, icon: 'lock' },
      { label: 'Roubo de veículos', count: 6, icon: 'car' },
      { label: 'Outros', count: 3, icon: 'more' },
    ],
    hourly: hourly('noite', 2),
    peak: '19h - 23h',
    updatedAt: '2026-11-10T13:05:00',
  },
  {
    id: 'jardim-america',
    name: 'Jardim América',
    level: 'atencao',
    poly: [[41, 26], [44, 18], [50, 16], [55, 20], [55, 27], [51, 31], [47, 32], [42, 33]],
    label: [49, 23],
    description: 'Ocorrências relevantes nessa região',
    occurrences30d: 19,
    breakdown: [
      { label: 'Furto', count: 9, icon: 'lock' },
      { label: 'Assalto', count: 5, icon: 'user' },
      { label: 'Roubo de veículos', count: 3, icon: 'car' },
      { label: 'Outros', count: 2, icon: 'more' },
    ],
    hourly: hourly('tarde', 3),
    peak: '16h - 20h',
    updatedAt: '2026-11-10T12:40:00',
  },
  {
    id: 'vila-nova',
    name: 'Vila Nova',
    level: 'atencao',
    poly: [[9, 41], [16, 39], [20, 44], [19, 51], [13, 53], [7, 49]],
    label: [13.5, 46],
    description: 'Aumento recente de ocorrências',
    occurrences30d: 14,
    breakdown: [
      { label: 'Furto', count: 6, icon: 'lock' },
      { label: 'Roubo de veículos', count: 4, icon: 'car' },
      { label: 'Assalto', count: 3, icon: 'user' },
      { label: 'Outros', count: 1, icon: 'more' },
    ],
    hourly: hourly('tarde', 4),
    peak: '17h - 21h',
    updatedAt: '2026-11-10T11:12:00',
  },
  {
    id: 'morumbi',
    name: 'Morumbi',
    level: 'atencao',
    poly: [[12, 7], [19, 5], [24, 10], [21, 16], [13, 15]],
    label: [18, 10.5],
    description: 'Ocorrências pontuais, principalmente à noite',
    occurrences30d: 11,
    breakdown: [
      { label: 'Furto', count: 5, icon: 'lock' },
      { label: 'Assalto', count: 3, icon: 'user' },
      { label: 'Roubo de veículos', count: 2, icon: 'car' },
      { label: 'Outros', count: 1, icon: 'more' },
    ],
    hourly: hourly('noite', 5),
    peak: '20h - 24h',
    updatedAt: '2026-11-09T22:30:00',
  },
  {
    id: 'centro',
    name: 'Centro',
    level: 'baixo',
    poly: [[11, 23], [20, 21], [21, 27], [22, 34], [16, 36], [10, 32]],
    label: [15.5, 28.5],
    description: 'Poucas ocorrências registradas',
    occurrences30d: 4,
    breakdown: [
      { label: 'Furto', count: 2, icon: 'lock' },
      { label: 'Outros', count: 2, icon: 'more' },
    ],
    hourly: hourly('plano', 6),
    peak: '12h - 15h',
    updatedAt: '2026-11-10T09:00:00',
  },
  {
    id: 'boa-vista',
    name: 'Boa Vista',
    level: 'baixo',
    poly: [[48, 43], [56, 41], [60, 47], [57, 55], [49, 56], [44, 49]],
    label: [52, 48],
    description: 'Poucas ocorrências registradas',
    occurrences30d: 3,
    breakdown: [
      { label: 'Furto', count: 2, icon: 'lock' },
      { label: 'Outros', count: 1, icon: 'more' },
    ],
    hourly: hourly('plano', 7),
    peak: '10h - 13h',
    updatedAt: '2026-11-10T08:20:00',
  },
  {
    id: 'cidade-jardim',
    name: 'Cidade Jardim',
    level: 'baixo',
    poly: [[24, 48], [33, 46], [37, 50], [34, 58], [26, 59], [21, 54]],
    label: [28.5, 51],
    description: 'Poucas ocorrências registradas',
    occurrences30d: 5,
    breakdown: [
      { label: 'Furto', count: 3, icon: 'lock' },
      { label: 'Outros', count: 2, icon: 'more' },
    ],
    hourly: hourly('plano', 8),
    peak: '14h - 17h',
    updatedAt: '2026-11-10T10:45:00',
  },
]

/** No modo real os ids continuam os mesmos, só o nome muda pro bairro real de Goiânia. */
export const regions: Region[] = IS_REAL ? baseRegions.map((r) => ({ ...r, name: REAL_REGIONS[r.id]?.name ?? r.name })) : baseRegions

export const regionById = (id?: string | null) => regions.find((r) => r.id === id)

/** Zonas já em coordenadas de grade, prontas pro roteador. */
export const riskZones: RiskZone[] = regions.map((r) => ({ id: r.id, name: r.name, level: r.level, poly: r.poly }))

/** Posição simulada do usuário (GPS mockado), dentro do Setor Central. */
export const USER_POS: Pt = [31, 31]
export const USER_ADDRESS = IS_REAL ? REAL_USER_ADDRESS : 'Setor Central, 1.280'

// ---------- ocorrências ----------
export type Category = { id: string; label: string; severity: 1 | 2 | 3 | 4 | 5; keywords: string[] }

export const categories: Category[] = [
  { id: 'roubo-veiculo', label: 'Roubo de veículo', severity: 5, keywords: ['roubo de carro', 'roubaram meu carro', 'roubo de veículo', 'levaram o carro', 'roubaram a moto'] },
  { id: 'roubo-carga', label: 'Roubo de carga', severity: 4, keywords: ['carga', 'caminhão'] },
  { id: 'assalto-pessoa', label: 'Assalto a pessoa', severity: 4, keywords: ['assalto', 'assaltaram', 'arma', 'me roubaram'] },
  { id: 'furto-veiculo', label: 'Furto de veículo', severity: 3, keywords: ['furto de carro', 'furtaram o carro', 'furto de veículo', 'furtaram a moto'] },
  { id: 'furto-pertences', label: 'Furto de carga ou pertences', severity: 2, keywords: ['furto', 'furtaram', 'celular', 'bolsa', 'carteira'] },
  { id: 'atitude-suspeita', label: 'Atitude suspeita', severity: 1, keywords: ['suspeito', 'suspeita', 'estranho', 'rondando'] },
]

export const severityColor: Record<number, string> = {
  5: 'var(--red)',
  4: 'var(--orange)',
  3: 'var(--orange)',
  2: 'var(--amber)',
  1: 'var(--gray-400)',
}

// ---------- alertas ----------
export type AlertKind = 'risco' | 'atencao' | 'sistema'
export type Alert = {
  id: string
  kind: AlertKind
  title: string
  regionId?: string
  body?: string
  minutesAgo: number
  highlight?: boolean
}

export const seedAlerts: Alert[] = [
  {
    id: 'a1',
    kind: 'risco',
    title: 'Você está próximo de uma área de risco',
    regionId: 'setor-central',
    body: 'Ocorrências recentes registradas nesta região. Evite o trajeto sempre que possível.',
    minutesAgo: 5,
    highlight: true,
  },
  { id: 'a2', kind: 'risco', title: 'Nova ocorrência registrada', regionId: 'bairro-das-flores', minutesAgo: 18 },
  { id: 'a3', kind: 'atencao', title: 'Atenção no seu trajeto', regionId: 'jardim-america', minutesAgo: 35 },
  { id: 'a4', kind: 'atencao', title: 'Movimentação suspeita relatada', regionId: 'vila-nova', minutesAgo: 52 },
  { id: 'a5', kind: 'atencao', title: 'Aumento de furtos à noite', regionId: 'morumbi', minutesAgo: 140 },
  { id: 'a6', kind: 'sistema', title: 'Índice de risco atualizado', body: 'Os dados das regiões foram recalculados com as ocorrências das últimas 24h.', minutesAgo: 190 },
  { id: 'a7', kind: 'sistema', title: 'Bem-vindo ao RiskMap', body: 'Ative as notificações para ser avisado quando entrar em uma área de risco.', minutesAgo: 60 * 26 },
]

// ---------- histórico de rotas ----------
/** Resumo da rota guardado no histórico (no app real viria da API, não é recalculado). */
export type RouteStats = { meters: number; minutes: number; cls: RiskLevel; nAlto: number; nAtencao: number }
export type HistoryEntry = { id: string; from: string; to: string; date: string; favorite: boolean } & RouteStats

const daysAgo = (d: number, h: number, m: number) => {
  const dt = new Date()
  dt.setDate(dt.getDate() - d)
  dt.setHours(h, m, 0, 0)
  return dt.toISOString()
}

export const seedHistory: HistoryEntry[] = [
  { id: 'h1', from: 'centro', to: 'jardim-america', date: daysAgo(0, 14, 32), favorite: true, meters: 12400, minutes: 24, cls: 'alto', nAlto: 1, nAtencao: 1 },
  { id: 'h2', from: 'vila-nova', to: 'centro', date: daysAgo(0, 13, 57), favorite: false, meters: 14800, minutes: 27, cls: 'atencao', nAlto: 0, nAtencao: 2 },
  { id: 'h3', from: 'boa-vista', to: 'cidade-jardim', date: daysAgo(1, 13, 28), favorite: true, meters: 10700, minutes: 21, cls: 'baixo', nAlto: 0, nAtencao: 0 },
  { id: 'h4', from: 'morumbi', to: 'boa-vista', date: daysAgo(1, 13, 4), favorite: false, meters: 15600, minutes: 29, cls: 'atencao', nAlto: 0, nAtencao: 1 },
  { id: 'h5', from: 'centro', to: 'morumbi', date: daysAgo(2, 18, 40), favorite: false, meters: 6200, minutes: 14, cls: 'atencao', nAlto: 0, nAtencao: 1 },
  { id: 'h6', from: 'cidade-jardim', to: 'centro', date: daysAgo(3, 8, 15), favorite: true, meters: 5400, minutes: 12, cls: 'baixo', nAlto: 0, nAtencao: 0 },
  { id: 'h7', from: 'jardim-america', to: 'boa-vista', date: daysAgo(4, 19, 2), favorite: false, meters: 4100, minutes: 10, cls: 'atencao', nAlto: 0, nAtencao: 1 },
  { id: 'h8', from: 'vila-nova', to: 'cidade-jardim', date: daysAgo(6, 7, 48), favorite: false, meters: 9800, minutes: 22, cls: 'alto', nAlto: 1, nAtencao: 1 },
]
