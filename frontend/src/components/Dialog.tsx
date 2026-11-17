import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'

/** Modal centralizado no desktop e "bottom sheet" no celular. */
export function Dialog({ open, onClose, title, children, labelledBy }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; labelledBy?: string }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-label={labelledBy ? undefined : title}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="dialog__grabber" aria-hidden="true" />
            {title && <h2 className="dialog__title">{title}</h2>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
