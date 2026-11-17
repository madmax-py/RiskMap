import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { ChevronRight, Clock, LocateFixed, MapPin, Plus, Route as RouteIcon, Search, X } from 'lucide-react'
import { MapView, type MapMarker, type MapViewport } from '../components/MapView'
import { Logo } from '../components/Logo'
import { LEVEL_LABEL, RiskTag } from '../components/Badges'
import { Button } from '../components/Button'
import { useApp } from '../store/AppStore'
import { regionById, regions, type Region } from '../data/mock'
import { offset, regionLabel, regionShape, userPos, zoneAtPoint } from '../geo'
import { placeName, placePoint, searchAddress, type AddressHit } from '../geo/routing'
import { IS_REAL } from '../geo/config'
import { norm, useDesktop, useHeight } from '../lib/hooks'
import { fadeUp, stagger } from '../lib/motion'

const LEVEL_TEXT = { alto: 'Muitas ocorrências registradas aqui nos últimos 30 dias', atencao: 'Algumas ocorrências registradas aqui nos últimos 30 dias', baixo: 'Poucas ocorrências registradas aqui nos últimos 30 dias' }

export default function MapHome() {
  const [params, setParams] = useSearchParams()
  const placeId = params.get('place')
  const place = regionById(placeId)
  const addrId = params.get('addr')
  const addrPoint = addrId ? placePoint(addrId) : null
  const { reports, dispatch } = useApp()
  const nav = useNavigate()
  const desktop = useDesktop()
  const [searching, setSearching] = useState(false)
  const [showCurrent, setShowCurrent] = useState(true)
  const [sheetRef, sheetH] = useHeight<HTMLDivElement>()
  const current = regionById('setor-central')!

  const view: MapViewport = useMemo(() => {
    if (place) return { bounds: regionShape(place.id), pad: desktop ? 110 : 28 }
    if (addrPoint) return { center: addrPoint, meters: 1600 }
    return { center: userPos, meters: desktop ? 9200 : 6000 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place, desktop, addrId])

  const select = (id: string) => {
    dispatch({ type: 'search', id })
    setParams({ place: id })
    setSearching(false)
  }
  const selectAddress = (hit: AddressHit) => {
    setParams({ addr: hit.id })
    setSearching(false)
  }
  const clear = () => setParams({})

  const markers: MapMarker[] = useMemo(() => {
    const m: MapMarker[] = reports.slice(0, 5).map((r, i) => {
      return { id: r.id, at: offset(userPos, 320 + i * 140, -260 - i * 110), kind: 'report' }
    })
    if (place) m.push({ id: 'place', at: regionLabel(place.id), kind: 'pin' })
    if (addrPoint) m.push({ id: 'addr', at: addrPoint, kind: 'pin' })
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, place, addrId])

  // no celular, com um painel aberto, o botão vira só ícone pra não empilhar três camadas de alvos
  const compactFab = !desktop && !!(place || addrId || showCurrent)

  const inset = desktop
    ? { left: placeId || addrId || showCurrent ? 440 : 0, top: 80 }
    : { top: 130, bottom: (sheetH || 0) + 76 }

  return (
    <div className="map-page">
      <MapView
        view={view}
        highlightId={place?.id}
        markers={markers}
        controls={desktop}
        inset={inset}
        onRegionClick={select}
      />

      <div className="map-top">
        <div className="map-top__bar">
          <Logo size={30} />
        </div>
        <button className="searchbar" onClick={() => setSearching(true)}>
          <Search size={22} />
          <span className={place || addrId ? 'has-value' : ''}>{place ? place.name : addrId ? placeName(addrId) : 'Buscar endereço ou região'}</span>
          {(place || addrId) && (
            <span
              role="button"
              tabIndex={0}
              className="searchbar__clear"
              aria-label="Limpar busca"
              onClick={(e) => {
                e.stopPropagation()
                clear()
              }}
            >
              <X size={20} />
            </span>
          )}
        </button>
        <Legend />
      </div>

      <motion.button
        className={`fab ${compactFab ? 'fab--compact' : ''}`}
        aria-label={compactFab ? 'Registrar ocorrência' : undefined}
        onClick={() => nav('/ocorrencia/nova')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, bottom: desktop ? 28 : (sheetH ? sheetH + 96 : 96) }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <Plus size={22} strokeWidth={2.6} />
        {!compactFab && 'Registrar ocorrência'}
      </motion.button>

      <div className="map-sheet-wrap">
        <AnimatePresence mode="wait">
          {place ? (
            <Sheet key={place.id} innerRef={sheetRef} onClose={clear} desktop={desktop}>
              <PlaceSheet region={place} onClose={clear} />
            </Sheet>
          ) : addrId && addrPoint ? (
            <Sheet key={addrId} innerRef={sheetRef} onClose={clear} desktop={desktop}>
              <AddressSheet id={addrId} point={addrPoint} onClose={clear} />
            </Sheet>
          ) : showCurrent ? (
            <Sheet key="current" innerRef={sheetRef} onClose={() => setShowCurrent(false)} desktop={desktop}>
              <div className="sheet-current">
                <button className="icon-btn sheet__close" aria-label="Fechar" onClick={() => setShowCurrent(false)}>
                  <X size={22} />
                </button>
                <h2>{current.name}</h2>
                <RiskTag level={current.level} />
                <p className="muted">Sua região atual. {LEVEL_TEXT[current.level]}.</p>
                <button className="link-row" onClick={() => nav(`/regiao/${current.id}`)}>
                  Ver detalhes <ChevronRight size={20} />
                </button>
              </div>
            </Sheet>
          ) : (
            <motion.button
              key="reopen"
              className="chip-floating"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCurrent(true)}
            >
              <LocateFixed size={18} /> Minha região
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>{searching && <SearchOverlay onClose={() => setSearching(false)} onSelect={select} onSelectAddress={selectAddress} />}</AnimatePresence>
    </div>
  )
}

function Legend() {
  return (
    <div className="legend" aria-label="Legenda do mapa">
      <span><i className="lv-alto legend__hatch" /> Alto risco</span>
      <span><i className="lv-atencao" /> Atenção</span>
      <span><i className="lv-baixo" /> Baixo</span>
    </div>
  )
}

function Sheet({ children, onClose, innerRef, desktop }: { children: React.ReactNode; onClose: () => void; innerRef: (el: HTMLDivElement | null) => void; desktop: boolean }) {
  const onDragEnd = (_: unknown, info: PanInfo) => {
    // limite alto pra um arrasto acidental não esconder a informação de risco
    if (info.offset.y > 150 || info.velocity.y > 900) onClose()
  }
  return (
    <motion.div
      ref={innerRef}
      className="map-sheet"
      initial={desktop ? { opacity: 0, x: -8 } : { y: 24, opacity: 0 }}
      animate={desktop ? { opacity: 1, x: 0 } : { y: 0, opacity: 1 }}
      exit={desktop ? { opacity: 0, x: -8 } : { y: 24, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      drag={desktop ? false : 'y'}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.05, bottom: 0.6 }}
      onDragEnd={onDragEnd}
    >
      {!desktop && <span className="sheet__grabber" aria-hidden="true" />}
      {children}
    </motion.div>
  )
}

function PlaceSheet({ region, onClose }: { region: Region; onClose: () => void }) {
  const nav = useNavigate()
  const main = [...region.breakdown].sort((a, b) => b.count - a.count)[0]
  return (
    <motion.div className="sheet-place" variants={stagger(0.05, 0.1)} initial="hidden" animate="show">
      <button className="icon-btn sheet__close" aria-label="Fechar" onClick={onClose}>
        <X size={22} />
      </button>
      <motion.h2 variants={fadeUp}>{region.name}</motion.h2>
      <motion.div variants={fadeUp}>
        <RiskTag level={region.level} />
      </motion.div>
      <motion.p variants={fadeUp} className="muted">
        {region.description}
      </motion.p>
      <motion.div variants={fadeUp} className="sheet-stats">
        <div>
          <span>Ocorrências registradas</span>
          <strong className="big">{region.occurrences30d}</strong>
          <small>Últimos 30 dias</small>
        </div>
        <div>
          <span>Principal ocorrência</span>
          <strong>{main.label}</strong>
          <small>
            <Clock size={13} /> Pico: {region.peak}
          </small>
        </div>
      </motion.div>
      <motion.div variants={fadeUp} className="sheet-actions">
        <Button variant="secondary" size="md" onClick={() => nav(`/regiao/${region.id}`)}>
          Ver detalhes
        </Button>
        <Button size="md" icon={<RouteIcon size={18} />} onClick={() => nav(`/rota?de=atual&para=${region.id}`)}>
          Analisar rota
        </Button>
      </motion.div>
    </motion.div>
  )
}

function AddressSheet({ id, point, onClose }: { id: string; point: [number, number]; onClose: () => void }) {
  const nav = useNavigate()
  const zone = zoneAtPoint(point)
  const full = decodeURIComponent(id.split('|')[1] ?? '')
  return (
    <motion.div className="sheet-place" variants={stagger(0.05, 0.1)} initial="hidden" animate="show">
      <button className="icon-btn sheet__close" aria-label="Fechar" onClick={onClose}>
        <X size={22} />
      </button>
      <motion.h2 variants={fadeUp}>{placeName(id)}</motion.h2>
      <motion.p variants={fadeUp} className="muted small">
        {full.split(', ').slice(1).join(', ')}
      </motion.p>
      <motion.div variants={fadeUp}>
        <RiskTag level={zone?.level ?? 'baixo'}>{zone ? `${LEVEL_LABEL[zone.level]} · ${zone.name}` : 'Fora das áreas mapeadas'}</RiskTag>
      </motion.div>
      <motion.div variants={fadeUp} className="sheet-actions">
        {zone ? (
          <Button variant="secondary" size="md" onClick={() => nav(`/regiao/${zone.id}`)}>
            Ver região
          </Button>
        ) : (
          <span />
        )}
        <Button size="md" icon={<RouteIcon size={18} />} onClick={() => nav(`/rota?de=atual&para=${encodeURIComponent(id)}`)}>
          Analisar rota
        </Button>
      </motion.div>
    </motion.div>
  )
}

function SearchOverlay({ onClose, onSelect, onSelectAddress }: { onClose: () => void; onSelect: (id: string) => void; onSelectAddress: (h: AddressHit) => void }) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<AddressHit[]>([])
  const [loadingAddr, setLoadingAddr] = useState(false)

  // busca de endereços no OpenRouteService (só no modo real), com debounce de 350 ms
  useEffect(() => {
    if (!IS_REAL || q.trim().length < 3) return setHits([])
    const ctrl = new AbortController()
    setLoadingAddr(true)
    const t = setTimeout(() => {
      searchAddress(q, ctrl.signal)
        .then(setHits)
        .catch(() => setHits([]))
        .finally(() => setLoadingAddr(false))
    }, 350)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [q])
  const { recentSearches } = useApp()
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const results = q.trim() ? regions.filter((r) => norm(r.name).includes(norm(q.trim()))) : []
  const recents = recentSearches.map((id) => regionById(id)).filter(Boolean) as Region[]

  return (
    <motion.div className="search-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
      <motion.div className="search-panel" initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
        <form
          className="searchbar searchbar--input"
          onSubmit={(e) => {
            e.preventDefault()
            if (results[0]) onSelect(results[0].id)
          }}
        >
          <Search size={22} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar endereço ou região" aria-label="Buscar endereço ou região" />
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar busca">
            <X size={22} />
          </button>
        </form>

        <div className="search-results">
          {q.trim() ? (
            <>
              {results.length > 0 && <p className="eyebrow">Regiões</p>}
              <motion.ul variants={stagger(0.03)} initial="hidden" animate="show">
                {results.map((r) => (
                  <ResultItem key={r.id} r={r} onSelect={onSelect} q={q} />
                ))}
              </motion.ul>
              {IS_REAL && (hits.length > 0 || loadingAddr) && <p className="eyebrow">Endereços {loadingAddr && <span className="spinner spinner--xs" />}</p>}
              <ul>
                {hits.map((h) => (
                  <li key={h.id}>
                    <button className="result" onClick={() => onSelectAddress(h)}>
                      <span className="result__icon lv-neutral">
                        <MapPin size={18} />
                      </span>
                      <span className="result__text">
                        <strong>{h.label}</strong>
                        <small>{h.detail}</small>
                      </span>
                      <ChevronRight size={18} />
                    </button>
                  </li>
                ))}
              </ul>
              {!results.length && !hits.length && !loadingAddr && (
                <p className="search-empty">
                  Nada encontrado para “{q}”.{!IS_REAL && ' No modo demonstração a busca é só por região.'}
                </p>
              )}
            </>
          ) : (
            <>
              {recents.length > 0 && <p className="eyebrow">Buscas recentes</p>}
              <motion.ul variants={stagger(0.03)} initial="hidden" animate="show">
                {recents.map((r) => (
                  <ResultItem key={r.id} r={r} onSelect={onSelect} recent />
                ))}
              </motion.ul>
              <p className="eyebrow">Todas as regiões</p>
              <motion.ul variants={stagger(0.02)} initial="hidden" animate="show">
                {regions.map((r) => (
                  <ResultItem key={r.id} r={r} onSelect={onSelect} />
                ))}
              </motion.ul>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function ResultItem({ r, onSelect, recent, q }: { r: Region; onSelect: (id: string) => void; recent?: boolean; q?: string }) {
  let name: React.ReactNode = r.name
  if (q) {
    const i = norm(r.name).indexOf(norm(q.trim()))
    if (i >= 0) name = <>{r.name.slice(0, i)}<mark>{r.name.slice(i, i + q.trim().length)}</mark>{r.name.slice(i + q.trim().length)}</>
  }
  return (
    <motion.li variants={fadeUp}>
      <button className="result" onClick={() => onSelect(r.id)}>
        <span className={`result__icon lv-${r.level}`}>{recent ? <Clock size={18} /> : <MapPin size={18} />}</span>
        <span className="result__text">
          <strong>{name}</strong>
          <small>{LEVEL_LABEL[r.level]} · {r.occurrences30d} ocorrências em 30 dias</small>
        </span>
        <ChevronRight size={18} />
      </button>
    </motion.li>
  )
}
