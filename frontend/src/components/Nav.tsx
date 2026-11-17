import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Car, Gift, MapPinned, Plus, User } from 'lucide-react'
import { useApp } from '../store/AppStore'
import { Logo } from './Logo'

const items = [
  { to: '/mapa', label: 'Mapa', icon: MapPinned },
  { to: '/rotas', label: 'Rotas', icon: Car },
  { to: '/beneficios', label: 'Benefícios', icon: Gift },
  { to: '/alertas', label: 'Alertas', icon: Bell },
  { to: '/perfil', label: 'Perfil', icon: User },
]

function isActive(path: string, to: string) {
  if (to === '/rotas') return path.startsWith('/rotas') || path.startsWith('/rota')
  if (to === '/mapa') return path.startsWith('/mapa') || path.startsWith('/regiao') || path.startsWith('/ocorrencia')
  return path.startsWith(to)
}

export function BottomNav() {
  const { pathname } = useLocation()
  const { unreadAlerts, engagement } = useApp()
  const readyCodes = engagement.redemptions.some((r) => r.status === 'gerado')
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {items.map(({ to, label, icon: Icon }) => {
        const active = isActive(pathname, to)
        return (
          <NavLink
            key={to}
            to={to}
            className={`bottom-nav__item ${active ? 'is-active' : ''}`}
            aria-label={to === '/beneficios' && readyCodes ? `${label}, código pronto para usar` : to === '/alertas' && unreadAlerts ? `${label}, ${unreadAlerts} não lidos` : undefined}
          >
            <span className="bottom-nav__pill" aria-hidden="true" />
            <span className="bottom-nav__icon">
              <Icon size={24} strokeWidth={active ? 2.2 : 1.8} />
              {to === '/alertas' && unreadAlerts > 0 && <i className="dot" />}
              {to === '/beneficios' && readyCodes && <i className="dot" />}
            </span>
            <span>{label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

export function SideNav() {
  const { pathname } = useLocation()
  const { unreadAlerts, user } = useApp()
  const nav = useNavigate()
  return (
    <aside className="side-nav" aria-label="Navegação principal">
      <div className="side-nav__logo">
        <Logo size={30} />
      </div>
      <nav>
        {items.map(({ to, label, icon: Icon }) => {
          const active = isActive(pathname, to)
          return (
            <NavLink key={to} to={to} className={`side-nav__item ${active ? 'is-active' : ''}`}>
              <span className="side-nav__pill" aria-hidden="true" />
              <Icon size={22} />
              <span>{label}</span>
              {to === '/alertas' && unreadAlerts > 0 && <em className="count">{unreadAlerts}</em>}
            </NavLink>
          )
        })}
      </nav>
      <button className="side-nav__cta" onClick={() => nav('/ocorrencia/nova')}>
        <Plus size={20} /> Registrar ocorrência
      </button>
      <button className="side-nav__user" onClick={() => nav('/perfil')}>
        <span className="avatar avatar--sm">
          <User size={18} />
        </span>
        <span>
          <strong>{user?.name}</strong>
          <small>{user?.email}</small>
        </span>
      </button>
    </aside>
  )
}
