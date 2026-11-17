/**
 * Rede de benefícios (RF-005, RF-006, RNE-002, RNE-006).
 * Espelha as tabelas PARCEIRO, OFERTA e RESGATE da especificação (seção 18).
 * Parceiros e ofertas são fictícios: no app real vêm da API.
 */

export type Level = 'bronze' | 'prata' | 'ouro'
export type PartnerCategory = 'oficina' | 'seguradora' | 'locadora' | 'outro'

export type Partner = {
  id: string
  name: string
  category: PartnerCategory
  /** Bairro ou referência, para o motorista saber onde fica. */
  place: string
  /** Distância da posição atual (simulada), em metros. */
  meters: number
  contact: string
}

export type Offer = {
  id: string
  partnerId: string
  description: string
  discount: number // percentual_desconto
  minLevel: Level // nivel_minimo
  validUntil: string // validade (AAAA-MM-DD)
  terms: string
}

export type RedemptionStatus = 'gerado' | 'utilizado' | 'expirado'
export type Redemption = { id: string; offerId: string; code: string; createdAt: string; status: RedemptionStatus }

export type PointKind = 'report' | 'avaliacao' | 'rota'
export type PointEvent = { id: string; kind: PointKind; points: number; label: string; date: string }

/** RNE-002: Bronze 0–99, Prata 100–499, Ouro 500+. */
export const LEVELS: { id: Level; name: string; min: number; max: number | null }[] = [
  { id: 'bronze', name: 'Bronze', min: 0, max: 99 },
  { id: 'prata', name: 'Prata', min: 100, max: 499 },
  { id: 'ouro', name: 'Ouro', min: 500, max: null },
]
export const LEVEL_NAME: Record<Level, string> = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro' }
const RANK: Record<Level, number> = { bronze: 0, prata: 1, ouro: 2 }

export const levelFor = (points: number): Level => (points >= 500 ? 'ouro' : points >= 100 ? 'prata' : 'bronze')
export const canRedeem = (userLevel: Level, offer: Offer) => RANK[userLevel] >= RANK[offer.minLevel]
/** Pontos que faltam para o próximo nível (null quando já é Ouro). */
export function nextLevel(points: number): { level: Level; missing: number; progress: number } | null {
  const cur = LEVELS.find((l) => l.id === levelFor(points))!
  const next = LEVELS[LEVELS.indexOf(cur) + 1]
  if (!next) return null
  return { level: next.id, missing: next.min - points, progress: (points - cur.min) / (next.min - cur.min) }
}

/** RNE-002: pontos por ação. */
export const POINTS = { report: 10, avaliacao: 2, rota: 1 } as const
export const ROUTE_POINTS_PER_DAY = 5
/** RNE-006: decaimento após 30 dias sem atividade, 10% a cada 7 dias. */
export const DECAY = { idleDays: 30, percent: 10, everyDays: 7 } as const

export const CATEGORY_LABEL: Record<PartnerCategory, string> = {
  oficina: 'Oficina',
  seguradora: 'Seguro',
  locadora: 'Locadora',
  outro: 'Outros',
}

export const partners: Partner[] = [
  { id: 'dois-tempos', name: 'Oficina Dois Tempos', category: 'oficina', place: 'Setor Central', meters: 800, contact: '(62) 3000-0101' },
  { id: 'bom-retorno', name: 'Mecânica Bom Retorno', category: 'oficina', place: 'Setor Oeste', meters: 2400, contact: '(62) 3000-0102' },
  { id: 'amparo', name: 'Amparo Seguros', category: 'seguradora', place: 'Setor Bueno', meters: 3100, contact: 'atendimento@amparo.exemplo' },
  { id: 'cobertura-certa', name: 'Cobertura Certa Seguros', category: 'seguradora', place: 'Jardim América', meters: 4600, contact: '(62) 3000-0104' },
  { id: 'aluga-moto', name: 'Aluga Moto Goiás', category: 'locadora', place: 'Setor Leste Universitário', meters: 1900, contact: '(62) 3000-0105' },
  { id: 'cerrado', name: 'Locadora Cerrado Veículos', category: 'locadora', place: 'Campinas', meters: 5200, contact: '(62) 3000-0106' },
  { id: 'borracharia-vn', name: 'Borracharia Vila Nova', category: 'outro', place: 'Vila Nova', meters: 3700, contact: '(62) 3000-0107' },
  { id: 'bom-banho', name: 'Lava Rápido Bom Banho', category: 'outro', place: 'Setor Central', meters: 1200, contact: '(62) 3000-0108' },
]
export const partnerById = (id: string) => partners.find((p) => p.id === id)

export const offers: Offer[] = [
  { id: 'revisao-moto', partnerId: 'dois-tempos', description: 'Revisão completa de moto', discount: 15, minLevel: 'bronze', validUntil: '2026-12-31', terms: 'Válido para motos até 300 cc. Um uso por conta.' },
  { id: 'troca-oleo', partnerId: 'bom-retorno', description: 'Troca de óleo e filtro', discount: 10, minLevel: 'bronze', validUntil: '2026-12-20', terms: 'Peças cobradas à parte. Um uso por mês.' },
  { id: 'pneu', partnerId: 'borracharia-vn', description: 'Conserto de pneu e calibragem', discount: 25, minLevel: 'bronze', validUntil: '2026-12-15', terms: 'Motos e carros de passeio.' },
  { id: 'moto-reserva', partnerId: 'aluga-moto', description: 'Diária de moto reserva enquanto a sua está na oficina', discount: 20, minLevel: 'prata', validUntil: '2027-01-31', terms: 'Até 5 diárias por resgate. Caução não incluída.' },
  { id: 'seguro-entregador', partnerId: 'amparo', description: 'Seguro para moto de entregador', discount: 12, minLevel: 'prata', validUntil: '2027-02-28', terms: 'Desconto na primeira anuidade. Sujeito à análise da seguradora.' },
  { id: 'lavagem', partnerId: 'bom-banho', description: 'Lavagem completa', discount: 30, minLevel: 'prata', validUntil: '2026-12-10', terms: 'De segunda a sexta, das 8h às 17h.' },
  { id: 'carro-app', partnerId: 'cerrado', description: 'Aluguel semanal de carro para aplicativo', discount: 18, minLevel: 'ouro', validUntil: '2027-01-15', terms: 'Plano semanal com quilometragem livre.' },
  { id: 'seguro-carga', partnerId: 'cobertura-certa', description: 'Seguro de carga leve', discount: 15, minLevel: 'ouro', validUntil: '2027-03-31', terms: 'Para veículos de até 3,5 t. Sujeito à análise da seguradora.' },
]
export const offerById = (id: string) => offers.find((o) => o.id === id)

/** codigo_unico: 12 caracteres, sem letras/números que se confundem (0/O, 1/I). */
export function redemptionCode() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, (b) => abc[b % abc.length]).join('')
}
export const formatCode = (c: string) => c.replace(/(.{4})(?=.)/g, '$1 ')

const daysAgo = (d: number, h = 0) => new Date(Date.now() - d * 864e5 - h * 36e5).toISOString()

/** Engajamento inicial do usuário de demonstração: 8 reports (80) + 15 avaliações (30) + 30 rotas (30) = 140, nível Prata. */
export const seedEngagement = {
  points: 140,
  counts: { report: 8, avaliacao: 15, rota: 30 } as Record<PointKind, number>,
  lastActivity: daysAgo(0, 3),
  events: [
    { id: 'e1', kind: 'rota', points: 1, label: 'Rota mais segura concluída · Setor Oeste → Jardim América', date: daysAgo(0, 3) },
    { id: 'e2', kind: 'report', points: 10, label: 'Report validado · Roubo de veículo, Setor Central', date: daysAgo(1, 5) },
    { id: 'e3', kind: 'avaliacao', points: 2, label: 'Confirmação coerente · Assalto a pessoa, Campinas', date: daysAgo(2, 1) },
    { id: 'e4', kind: 'rota', points: 1, label: 'Rota mais segura concluída · Vila Nova → Setor Oeste', date: daysAgo(2, 6) },
    { id: 'e5', kind: 'report', points: 10, label: 'Report validado · Furto de carga ou pertences, Setor Leste Universitário', date: daysAgo(4, 2) },
    { id: 'e6', kind: 'avaliacao', points: 2, label: 'Contestação coerente · Atitude suspeita, Setor Bueno', date: daysAgo(6, 4) },
    { id: 'e7', kind: 'report', points: 10, label: 'Report validado · Roubo de carga, Campinas', date: daysAgo(9, 3) },
  ] as PointEvent[],
  redemptions: [{ id: 'rd1', offerId: 'pneu', code: 'RM7KQ2PX9HDA', createdAt: daysAgo(10, 2), status: 'utilizado' }] as Redemption[],
}
