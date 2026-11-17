import { useCallback, useEffect, useRef, useState } from 'react'

export function useMedia(query: string) {
  const [match, setMatch] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false))
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatch(m.matches)
    on()
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return match
}

export const useDesktop = () => useMedia('(min-width: 960px)')

/** Mede a altura de um elemento (callback ref: funciona mesmo quando o elemento monta depois). */
export function useHeight<T extends HTMLElement>() {
  const [h, setH] = useState(0)
  const ro = useRef<ResizeObserver | null>(null)
  const ref = useCallback((el: T | null) => {
    ro.current?.disconnect()
    if (!el) return setH(0)
    ro.current = new ResizeObserver(() => setH(el.getBoundingClientRect().height))
    ro.current.observe(el)
  }, [])
  return [ref, h] as const
}

/** remove acentos e caixa pra busca */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
