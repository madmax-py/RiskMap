import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Button } from '../components/Button'
import { useApp } from '../store/AppStore'
import { categories } from '../data/mock'
import { clockTime } from '../lib/format'
import { fadeUp, stagger } from '../lib/motion'

export default function ReportSuccess() {
  const { id } = useParams()
  const { reports } = useApp()
  const nav = useNavigate()
  const report = reports.find((r) => r.id === id)
  const [left, setLeft] = useState(60 * 60)

  useEffect(() => {
    if (!report) return
    const end = new Date(report.createdAt).getTime() + 60 * 60 * 1000
    const tick = () => setLeft(Math.max(0, Math.round((end - Date.now()) / 1000)))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [report])

  if (!report) return <Navigate to="/mapa" replace />
  const cat = categories.find((c) => c.id === report.categoryId)
  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')

  return (
    <div className="page page--with-cta page--center">
      <motion.div className="page-body narrow success" variants={stagger(0.08, 0.5)} initial="hidden" animate="show">
        <motion.div className="success__check" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
          <svg viewBox="0 0 52 52" width="64" height="64" aria-hidden="true">
            <motion.path d="M14 27 L23 36 L39 17" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }} />
          </svg>
        </motion.div>
        <motion.h1 variants={fadeUp}>Ocorrência enviada</motion.h1>
        <motion.p variants={fadeUp} className="muted">
          {cat?.label} - {report.address}
          <br />
          hoje, {clockTime(new Date(report.createdAt))}
        </motion.p>
        <motion.span variants={fadeUp} className="status-badge">
          <i /> Pendente
        </motion.span>

        <motion.ol variants={fadeUp} className="card steps">
          <li className="is-done">
            <span>
              <Check size={14} strokeWidth={3} />
            </span>
            Reputação e GPS verificados
          </li>
          <li className="is-current">
            <span>2</span>
            <div>
              <strong>Aguardando 3 confirmações a até 500 m</strong>
              <div className="confirm-bar">
                <i />
              </div>
              <small>
                0 de 3 confirmações · prazo {mm}:{ss}
              </small>
            </div>
          </li>
          <li>
            <span>3</span>
            Validado: entra no índice de risco da região
          </li>
        </motion.ol>
        <motion.p variants={fadeUp} className="muted small center">
          Quando for validada, a ocorrência soma 10 pontos ao seu nível de benefícios.
        </motion.p>
      </motion.div>
      <div className="cta-bar">
        <Button block onClick={() => nav('/mapa', { replace: true })}>
          Voltar ao mapa
        </Button>
      </div>
    </div>
  )
}
