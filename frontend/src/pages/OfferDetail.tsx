import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarClock, Lock, MapPin, Medal, Phone, Ticket } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Button'
import { useApp } from '../store/AppStore'
import { canRedeem, CATEGORY_LABEL, LEVEL_NAME, LEVELS, offerById, partnerById } from '../data/benefits'
import { formatDistance } from '../lib/format'
import { fadeUp, stagger } from '../lib/motion'
import { CATEGORY_ICON } from './Benefits'

const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

/** Detalhe de uma oferta e geração do código de resgate (RF-005). */
export default function OfferDetail() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { engagement, level, redeem, settings } = useApp()
  const offer = offerById(id)
  const partner = offer && partnerById(offer.partnerId)
  if (!offer || !partner) return <Navigate to="/beneficios" replace />

  const allowed = canRedeem(level, offer)
  const missing = LEVELS.find((l) => l.id === offer.minLevel)!.min - engagement.points
  const open = engagement.redemptions.find((r) => r.offerId === offer.id && r.status === 'gerado')
  const Icon = CATEGORY_ICON[partner.category]

  return (
    <div className="page page--with-cta">
      <PageHeader title="Oferta" backTo="/beneficios" />
      <motion.div className="page-body narrow offer-detail" variants={stagger()} initial="hidden" animate="show">
        <motion.div variants={fadeUp} className="offer-detail__head">
          <span className="offer__icon offer__icon--lg" aria-hidden="true">
            <Icon size={26} />
          </span>
          <div>
            <p className="muted small">
              {partner.name} · {CATEGORY_LABEL[partner.category]}
            </p>
            <h2>{offer.description}</h2>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="card offer-detail__discount">
          <strong>{offer.discount}%</strong>
          <span>de desconto para quem usa o RiskMap</span>
        </motion.div>

        <motion.ul variants={fadeUp} className="card info-list">
          <li>
            <Medal size={18} />
            <span>Nível mínimo</span>
            <strong>{LEVEL_NAME[offer.minLevel]}</strong>
          </li>
          <li>
            <CalendarClock size={18} />
            <span>Válida até</span>
            <strong>{fmtDate(offer.validUntil)}</strong>
          </li>
          <li>
            <MapPin size={18} />
            <span>Onde</span>
            <strong>
              {partner.place} · {formatDistance(partner.meters, settings.units)}
            </strong>
          </li>
          <li>
            <Phone size={18} />
            <span>Contato</span>
            <strong>{partner.contact}</strong>
          </li>
        </motion.ul>

        <motion.div variants={fadeUp}>
          <h3 className="block-title">Condições</h3>
          <p className="muted">{offer.terms}</p>
        </motion.div>

        {!allowed && (
          <motion.p variants={fadeUp} className="card locked-note">
            <Lock size={18} />
            <span>
              Esta oferta é do nível <strong>{LEVEL_NAME[offer.minLevel]}</strong>. Faltam {missing} pontos.{' '}
              <button type="button" className="link-btn" onClick={() => nav('/beneficios/nivel')}>
                Como ganhar pontos
              </button>
            </span>
          </motion.p>
        )}
      </motion.div>

      <div className="cta-bar">
        {open ? (
          <Button block icon={<Ticket size={18} />} onClick={() => nav(`/beneficios/resgate/${open.id}`)}>
            Ver meu código
          </Button>
        ) : (
          <Button
            block
            disabled={!allowed}
            icon={allowed ? <Ticket size={18} /> : <Lock size={18} />}
            onClick={() => nav(`/beneficios/resgate/${redeem(offer.id)}`, { replace: true })}
          >
            {allowed ? 'Gerar código de resgate' : `Disponível no nível ${LEVEL_NAME[offer.minLevel]}`}
          </Button>
        )}
      </div>
    </div>
  )
}
