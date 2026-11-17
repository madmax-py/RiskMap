import { Navigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Copy } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Button'
import { QrCode } from '../components/QrCode'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { formatCode, offerById, partnerById } from '../data/benefits'
import { formatDateTime } from '../lib/format'
import { fadeUp, stagger } from '../lib/motion'

const STATUS = {
  gerado: { label: 'Pronto para usar', hint: 'Mostre o QR code ou diga o código no balcão. O parceiro valida e aplica o desconto.' },
  utilizado: { label: 'Utilizado', hint: 'Este código já foi validado pelo parceiro.' },
  expirado: { label: 'Expirado', hint: 'A oferta venceu antes de o código ser usado.' },
}

/** Código único e QR code do resgate, vinculados à conta (RF-005, tabela RESGATE). */
export default function Redemption() {
  const { id = '' } = useParams()
  const { engagement, user } = useApp()
  const toast = useToast()
  const r = engagement.redemptions.find((x) => x.id === id)
  const offer = r && offerById(r.offerId)
  const partner = offer && partnerById(offer.partnerId)
  if (!r || !offer || !partner) return <Navigate to="/beneficios?aba=resgates" replace />

  const st = STATUS[r.status]
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(r.code)
      toast('Código copiado')
    } catch {
      toast('Não foi possível copiar. Anote o código.', 'warning')
    }
  }

  return (
    <div className="page">
      <PageHeader title="Código de resgate" backTo="/beneficios?aba=resgates" />
      <motion.div className="page-body narrow redemption" variants={stagger()} initial="hidden" animate="show">
        <motion.div variants={fadeUp} className="redemption__head">
          <span className={`status-pill status-pill--${r.status}`}>{st.label}</span>
          <h2>{offer.description}</h2>
          <p className="muted">
            {partner.name} · {offer.discount}% de desconto
          </p>
        </motion.div>

        <motion.div variants={fadeUp} className={`card redemption__code ${r.status !== 'gerado' ? 'is-done' : ''}`}>
          <QrCode value={`RISKMAP-RESGATE:${r.code}`} size={208} label={`QR code do resgate ${formatCode(r.code)}`} />
          <strong className="code" aria-label={`Código ${r.code.split('').join(' ')}`}>
            {formatCode(r.code)}
          </strong>
          <Button variant="secondary" size="sm" icon={<Copy size={16} />} onClick={copy}>
            Copiar código
          </Button>
        </motion.div>

        <motion.p variants={fadeUp} className="muted center">
          {st.hint}
        </motion.p>
        <motion.p variants={fadeUp} className="muted small center">
          Gerado {formatDateTime(r.createdAt).toLowerCase()} · vinculado à conta de {user?.name}
        </motion.p>
      </motion.div>
    </div>
  )
}
