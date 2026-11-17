import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight, Gift, KeyRound, Lock, ShieldCheck, Sparkles, Ticket, Wrench, type LucideIcon } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import BenefitsPlan from './BenefitsPlan'
import { Segmented } from '../components/Segmented'
import { LevelCard } from '../components/LevelCard'
import { Button } from '../components/Button'
import { useApp } from '../store/AppStore'
import { canRedeem, CATEGORY_LABEL, formatCode, LEVEL_NAME, offerById, offers, partnerById, type Offer, type PartnerCategory, type Redemption } from '../data/benefits'
import { formatDateTime, formatDistance } from '../lib/format'
import { fadeUp, stagger } from '../lib/motion'

export const CATEGORY_ICON: Record<PartnerCategory, LucideIcon> = { oficina: Wrench, seguradora: ShieldCheck, locadora: KeyRound, outro: Sparkles }

type Tab = 'ofertas' | 'resgates'
type Cat = 'todas' | PartnerCategory
type Dist = 'todas' | '2000' | '5000'

/** RF-005: ofertas da rede de parceiros, com filtro por tipo e por proximidade, e os resgates do usuário. */
export default function Benefits() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('aba') as Tab) || 'ofertas'
  const { engagement, level, settings, subscription } = useApp()
  const [cat, setCat] = useState<Cat>('todas')
  const [dist, setDist] = useState<Dist>('todas')

  const list = offers
    .map((o) => ({ o, p: partnerById(o.partnerId)! }))
    .filter(({ p }) => (cat === 'todas' || p.category === cat) && (dist === 'todas' || p.meters <= Number(dist)))
    .sort((a, b) => a.p.meters - b.p.meters)
  const active = engagement.redemptions.filter((r) => r.status === 'gerado').length

  // sem assinatura, a aba mostra primeiro a página do RiskMap Mais
  if (!subscription.active) return <BenefitsPlan />

  return (
    <div className="page">
      <PageHeader title="Benefícios" />
      <motion.div className="page-body narrow" variants={stagger()} initial="hidden" animate="show">
        <motion.div variants={fadeUp}>
          <LevelCard points={engagement.points} level={level} onClick={() => nav('/beneficios/nivel')} />
        </motion.div>

        <motion.div variants={fadeUp}>
          <Segmented<Tab>
            ariaLabel="Seções de benefícios"
            options={[
              { value: 'ofertas', label: 'Ofertas' },
              { value: 'resgates', label: 'Meus resgates', count: active || undefined },
            ]}
            value={tab}
            onChange={(v) => setParams(v === 'ofertas' ? {} : { aba: v }, { replace: true })}
          />
        </motion.div>

        {tab === 'ofertas' ? (
          <>
            <motion.div variants={fadeUp} className="filters">
              <Segmented<Cat>
                variant="chips"
                ariaLabel="Tipo de parceiro"
                options={[
                  { value: 'todas', label: 'Todas' },
                  { value: 'oficina', label: 'Oficinas' },
                  { value: 'seguradora', label: 'Seguros' },
                  { value: 'locadora', label: 'Locadoras' },
                  { value: 'outro', label: 'Outros' },
                ]}
                value={cat}
                onChange={setCat}
              />
              <Segmented<Dist>
                variant="chips"
                ariaLabel="Distância"
                options={[
                  { value: 'todas', label: 'Qualquer' },
                  { value: '2000', label: 'Até 2 km' },
                  { value: '5000', label: 'Até 5 km' },
                ]}
                value={dist}
                onChange={setDist}
              />
            </motion.div>

            <ul className="offer-list" aria-label="Ofertas, da mais próxima para a mais distante">
              {list.map(({ o, p }) => (
                <OfferItem key={o.id} offer={o} locked={!canRedeem(level, o)} meters={p.meters} units={settings.units} onClick={() => nav(`/beneficios/oferta/${o.id}`)} />
              ))}
              {!list.length && (
                <li className="empty">
                  <Gift size={28} />
                  <strong>Nenhuma oferta com esses filtros</strong>
                  <span>Tente outra distância ou outro tipo de parceiro.</span>
                  <Button
                    size="md"
                    variant="secondary"
                    onClick={() => {
                      setCat('todas')
                      setDist('todas')
                    }}
                  >
                    Limpar filtros
                  </Button>
                </li>
              )}
            </ul>
          </>
        ) : (
          <ul className="offer-list">
            {engagement.redemptions.map((r) => (
              <RedemptionItem key={r.id} r={r} onClick={() => nav(`/beneficios/resgate/${r.id}`)} />
            ))}
            {!engagement.redemptions.length && (
              <li className="empty">
                <Ticket size={28} />
                <strong>Nenhum resgate ainda</strong>
                <span>Escolha uma oferta e gere o código para usar no parceiro.</span>
                <Button size="md" variant="secondary" onClick={() => setParams({}, { replace: true })}>
                  Ver ofertas
                </Button>
              </li>
            )}
          </ul>
        )}
      </motion.div>
    </div>
  )
}

function OfferItem({ offer, locked, meters, units, onClick }: { offer: Offer; locked: boolean; meters: number; units: 'km' | 'mi'; onClick: () => void }) {
  const p = partnerById(offer.partnerId)!
  const Icon = CATEGORY_ICON[p.category]
  return (
    <li>
      <button type="button" className={`card offer ${locked ? 'is-locked' : ''}`} onClick={onClick}>
        <span className="offer__icon" aria-hidden="true">
          <Icon size={20} />
        </span>
        <span className="offer__body">
          <small>
            {p.name} · {CATEGORY_LABEL[p.category]}
          </small>
          <strong>{offer.description}</strong>
          <span className="offer__meta">
            {formatDistance(meters, units)} · {p.place}
          </span>
        </span>
        <span className="offer__side">
          <b>{offer.discount}%</b>
          {locked ? (
            <span className="offer__lock">
              <Lock size={12} /> {LEVEL_NAME[offer.minLevel]}
            </span>
          ) : (
            <ChevronRight size={18} aria-hidden="true" />
          )}
        </span>
      </button>
    </li>
  )
}

const STATUS_LABEL = { gerado: 'Pronto para usar', utilizado: 'Utilizado', expirado: 'Expirado' }

function RedemptionItem({ r, onClick }: { r: Redemption; onClick: () => void }) {
  const o = offerById(r.offerId)
  const p = o && partnerById(o.partnerId)
  if (!o || !p) return null
  return (
    <li>
      <button type="button" className="card offer" onClick={onClick}>
        <span className="offer__icon" aria-hidden="true">
          <Ticket size={20} />
        </span>
        <span className="offer__body">
          <small>{p.name}</small>
          <strong>{o.description}</strong>
          <span className="offer__meta">
            {formatCode(r.code)} · {formatDateTime(r.createdAt)}
          </span>
        </span>
        <span className="offer__side">
          <span className={`status-pill status-pill--${r.status}`}>{STATUS_LABEL[r.status]}</span>
        </span>
      </button>
    </li>
  )
}
