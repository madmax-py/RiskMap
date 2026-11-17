import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode, useState } from 'react'
import type { RoutePreference } from '../lib/city'
import type { Units } from '../lib/format'
import { uid } from '../lib/motion'
import { seedAlerts, seedHistory, USER_ADDRESS, type Alert, type HistoryEntry, type RouteStats } from '../data/mock'
import { levelFor, POINTS, redemptionCode, ROUTE_POINTS_PER_DAY, seedEngagement, type Level, type PointKind, type PointEvent, type Redemption } from '../data/benefits'

/**
 * Estado global do protótipo (sem backend).
 * Fica salvo no localStorage pra sobreviver a um F5 — no app real isso vem da API.
 */

export type User = { name: string; email: string }
export type Report = {
  id: string
  categoryId: string
  regionId: string
  address: string
  createdAt: string
  details?: string
  status: 'pendente' | 'validado'
}

export type Settings = {
  notifyRisk: boolean
  notifyRoute: boolean
  notifySystem: boolean
  sound: boolean
  alertRadius: 500 | 1000 | 2000
  routePreference: RoutePreference
  avoidNight: boolean
  units: Units
  theme: 'escuro' | 'claro' | 'sistema'
  shareLocation: boolean
}

type State = {
  user: User | null
  settings: Settings
  history: HistoryEntry[]
  reports: Report[]
  alerts: Alert[]
  readAlerts: string[]
  recentSearches: string[]
  /** Engajamento e benefícios (RNE-002, RNE-006, RF-005). */
  engagement: Engagement
}

export type Engagement = {
  points: number
  counts: Record<PointKind, number>
  lastActivity: string
  events: PointEvent[]
  redemptions: Redemption[]
}

const defaultSettings: Settings = {
  notifyRisk: true,
  notifyRoute: true,
  notifySystem: false,
  sound: true,
  alertRadius: 1000,
  routePreference: 'segura',
  avoidNight: true,
  units: 'km',
  theme: 'escuro',
  shareLocation: true,
}

const initial: State = {
  user: null,
  settings: defaultSettings,
  history: seedHistory,
  reports: [],
  alerts: seedAlerts,
  readAlerts: [],
  recentSearches: ['jardim-america', 'vila-nova'],
  engagement: seedEngagement,
}

type Action =
  | { type: 'login'; user: User }
  | { type: 'logout' }
  | { type: 'updateUser'; user: User }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'addHistory'; entry: HistoryEntry }
  | { type: 'toggleFavorite'; from: string; to: string; stats: RouteStats }
  | { type: 'addReport'; report: Report }
  | { type: 'readAlerts' }
  | { type: 'search'; id: string }
  | { type: 'reset' }
  | { type: 'earn'; kind: PointKind; label: string }
  | { type: 'redeem'; offerId: string; id: string; code: string }

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'login':
      return { ...s, user: a.user }
    case 'logout':
      return { ...s, user: null }
    case 'updateUser':
      return { ...s, user: a.user }
    case 'settings':
      return { ...s, settings: { ...s.settings, ...a.patch } }
    case 'addHistory': {
      const fav = s.history.some((h) => h.from === a.entry.from && h.to === a.entry.to && h.favorite)
      return { ...s, history: [{ ...a.entry, favorite: fav }, ...s.history] }
    }
    case 'toggleFavorite': {
      const match = (h: HistoryEntry) => h.from === a.from && h.to === a.to
      const isFav = s.history.some((h) => match(h) && h.favorite)
      if (!s.history.some(match)) {
        // rota nunca feita: entra no histórico já como favorita
        const entry: HistoryEntry = { id: uid(), from: a.from, to: a.to, date: new Date().toISOString(), favorite: true, ...a.stats }
        return { ...s, history: [entry, ...s.history] }
      }
      return { ...s, history: s.history.map((h) => (match(h) ? { ...h, favorite: !isFav } : h)) }
    }
    case 'addReport': {
      const alert: Alert = {
        id: 'r-' + a.report.id,
        kind: 'sistema',
        title: 'Sua ocorrência está em validação',
        body: `Aguardando confirmações de outros usuários próximos a ${a.report.address}.`,
        minutesAgo: 0,
      }
      return { ...s, reports: [a.report, ...s.reports], alerts: [alert, ...s.alerts] }
    }
    case 'readAlerts':
      return { ...s, readAlerts: s.alerts.map((x) => x.id) }
    case 'search':
      return { ...s, recentSearches: [a.id, ...s.recentSearches.filter((x) => x !== a.id)].slice(0, 4) }
    case 'reset':
      return initial
    case 'earn': {
      const e = s.engagement
      const now = new Date()
      // RNE-002: no máximo 5 pontos de rota por dia
      if (a.kind === 'rota') {
        const today = e.events.filter((x) => x.kind === 'rota' && new Date(x.date).toDateString() === now.toDateString()).length
        if (today >= ROUTE_POINTS_PER_DAY) return { ...s, engagement: { ...e, lastActivity: now.toISOString() } }
      }
      const ev: PointEvent = { id: uid(), kind: a.kind, points: POINTS[a.kind], label: a.label, date: now.toISOString() }
      return {
        ...s,
        engagement: {
          ...e,
          points: e.points + ev.points,
          counts: { ...e.counts, [a.kind]: e.counts[a.kind] + 1 },
          lastActivity: ev.date,
          events: [ev, ...e.events].slice(0, 50),
        },
      }
    }
    case 'redeem': {
      const r: Redemption = { id: a.id, offerId: a.offerId, code: a.code, createdAt: new Date().toISOString(), status: 'gerado' }
      return { ...s, engagement: { ...s.engagement, redemptions: [r, ...s.engagement.redemptions] } }
    }
  }
}

const KEY = 'riskmap:v2' // mudou o formato do histórico
function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return initial
    const parsed = JSON.parse(raw) as Partial<State>
    return { ...initial, ...parsed, settings: { ...defaultSettings, ...parsed.settings } }
  } catch {
    return initial
  }
}

type Ctx = State & {
  dispatch: React.Dispatch<Action>
  unreadAlerts: number
  isFavorite: (from: string, to: string) => boolean
  currentAddress: string
  level: Level
  /** Gera o código de resgate e devolve o id do resgate (RF-005). */
  redeem: (offerId: string) => string
  /** Tema efetivo depois de resolver "sistema". */
  resolvedTheme: 'escuro' | 'claro'
}

const AppCtx = createContext<Ctx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* modo anônimo / storage bloqueado: segue só em memória */
    }
  }, [state])

  const systemLight = useSystemLight()
  const resolvedTheme = state.settings.theme === 'sistema' ? (systemLight ? 'claro' : 'escuro') : state.settings.theme
  useEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  const isFavorite = useCallback(
    (from: string, to: string) => state.history.some((h) => h.from === from && h.to === to && h.favorite),
    [state.history],
  )

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      dispatch,
      isFavorite,
      unreadAlerts: state.alerts.filter((a) => !state.readAlerts.includes(a.id)).length,
      currentAddress: USER_ADDRESS,
      resolvedTheme,
      level: levelFor(state.engagement.points),
      redeem: (offerId: string) => {
        const id = uid()
        dispatch({ type: 'redeem', offerId, id, code: redemptionCode() })
        return id
      },
    }),
    [state, isFavorite, resolvedTheme],
  )
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

const lightQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null

function useSystemLight() {
  const q = lightQuery
  const [light, setLight] = useState(() => !!q?.matches)
  useEffect(() => {
    if (!q) return
    const on = (e: MediaQueryListEvent) => setLight(e.matches)
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [q])
  return light
}

/** Aplica o tema no <html> (os tokens de cor trocam via [data-theme]) e na cor da barra do navegador. */
function applyTheme(theme: 'escuro' | 'claro') {
  const root = document.documentElement
  root.dataset.theme = theme === 'claro' ? 'light' : 'dark'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'claro' ? '#f3f5f9' : '#040a13')
}

export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp precisa estar dentro de <AppProvider>')
  return ctx
}
