import { Navigate, useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../store/AppStore'
import { BottomNav, SideNav } from './Nav'

const TABS = ['/mapa', '/rotas', '/beneficios', '/alertas', '/perfil']

/** Casca do app logado: sidebar no desktop, barra inferior no celular e transição entre páginas. */
export function AppLayout() {
  const { user } = useApp()
  const loc = useLocation()
  const outlet = useOutlet()
  if (!user) return <Navigate to="/login" replace />

  const isTab = TABS.includes(loc.pathname)
  const fullscreen = loc.pathname.startsWith('/navegacao')

  return (
    <div className={`shell ${fullscreen ? 'shell--full' : ''} ${isTab ? 'shell--tab' : ''}`}>
      {!fullscreen && <SideNav />}
      <main className="shell__main">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={loc.pathname}
            className="route-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={isTab ? { opacity: 0, y: -6 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>
      {isTab && <BottomNav />}
    </div>
  )
}

/** Páginas públicas (login/cadastro): se já estiver logado, manda pro mapa. */
export function PublicLayout() {
  const { user } = useApp()
  const loc = useLocation()
  const outlet = useOutlet()
  if (user) return <Navigate to="/mapa" replace />
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={loc.pathname}
        className="route-view"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  )
}
