import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'

export function PageHeader({ title, back = true, backTo, right }: { title?: string; back?: boolean; backTo?: string; right?: ReactNode }) {
  const nav = useNavigate()
  const goBack = () => {
    if (backTo) nav(backTo)
    else if (window.history.state?.idx > 0) nav(-1)
    else nav('/mapa')
  }
  return (
    <header className="page-header">
      {back ? (
        <button className="icon-btn" onClick={goBack} aria-label="Voltar">
          <ChevronLeft size={26} />
        </button>
      ) : (
        <span className="icon-btn-spacer" />
      )}
      {title && <h1>{title}</h1>}
      <div className="page-header__right">{right ?? <span className="icon-btn-spacer" />}</div>
    </header>
  )
}
