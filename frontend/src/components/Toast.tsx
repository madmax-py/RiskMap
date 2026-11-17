import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'

type Toast = { id: number; text: string; tone: 'success' | 'info' | 'warning' }
const Ctx = createContext<(text: string, tone?: Toast['tone']) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((text: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t.slice(-2), { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800)
  }, [])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              className={`toast toast--${t.tone}`}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {t.tone === 'success' ? <CheckCircle2 size={18} /> : t.tone === 'warning' ? <AlertTriangle size={18} /> : <Info size={18} />}
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
