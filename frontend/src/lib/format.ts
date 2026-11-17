export type Units = 'km' | 'mi'

export function formatDistance(meters: number, units: Units = 'km') {
  if (units === 'mi') {
    const mi = meters / 1609.34
    return mi < 0.1 ? `${Math.round(meters * 3.281)} ft` : `${mi.toFixed(1).replace('.', ',')} mi`
  }
  return meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1).replace('.', ',')} km`
}

export function formatMinutes(min: number) {
  if (min < 60) return `${Math.round(min)} min`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m ? `${h}h ${m}min` : `${h}h`
}

export function formatAgo(minutes: number) {
  if (minutes < 1) return 'Agora'
  if (minutes < 60) return `Há ${Math.round(minutes)} min`
  const h = Math.floor(minutes / 60)
  if (h < 24) return `Há ${h}h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'Ontem' : `Há ${d} dias`
}

export function formatDateTime(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yest = new Date()
  yest.setDate(today.getDate() - 1)
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === today.toDateString()) return `Hoje, ${time}`
  if (d.toDateString() === yest.toDateString()) return `Ontem, ${time}`
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${time}`
}

export function periodOfDay(d = new Date()) {
  const h = d.getHours()
  return h < 6 ? 'madrugada' : h < 12 ? 'manhã' : h < 18 ? 'tarde' : 'noite'
}

export function clockTime(d = new Date()) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`
