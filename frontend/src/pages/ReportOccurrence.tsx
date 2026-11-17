import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Clock, MapPin, Mic, Square } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Button'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { categories, severityColor } from '../data/mock'
import { clockTime, periodOfDay } from '../lib/format'
import { fadeUp, stagger, uid } from '../lib/motion'
import { norm } from '../lib/hooks'

// Web Speech API (Chrome/Edge/Safari). Não existe no Firefox.
type SR = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; onerror: () => void }
const SpeechRec: (new () => SR) | undefined = (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition

const MAX = 280

export default function ReportOccurrence() {
  const { dispatch, currentAddress } = useApp()
  const nav = useNavigate()
  const toast = useToast()
  const [cat, setCat] = useState<string | null>(null)
  const [details, setDetails] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recRef = useRef<SR | null>(null)
  const now = useRef(new Date()).current

  useEffect(() => () => recRef.current?.stop(), [])

  const pick = (id: string) => {
    setCat(id)
    setError(null)
  }

  const startVoice = () => {
    if (listening) {
      recRef.current?.stop()
      return
    }
    if (!SpeechRec) {
      toast('Seu navegador não suporta reconhecimento de voz. Selecione a categoria.', 'warning')
      return
    }
    const rec = new SpeechRec()
    rec.lang = 'pt-BR'
    rec.interimResults = true
    rec.continuous = false
    rec.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join(' ')
      setTranscript(text)
      const t = norm(text)
      const match = categories.find((c) => c.keywords.some((k) => t.includes(norm(k))))
      if (match) pick(match.id)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => {
      setListening(false)
      toast('Não consegui ouvir. Verifique a permissão do microfone.', 'warning')
    }
    recRef.current = rec
    setTranscript('')
    setListening(true)
    rec.start()
  }

  const submit = async () => {
    if (!cat) {
      setError('Selecione o que aconteceu')
      // em vez de chacoalhar a grade, leva o foco até ela
      document.querySelector<HTMLButtonElement>('.cat-grid button')?.focus()
      return
    }
    setSending(true)
    await new Promise((r) => setTimeout(r, 1200))
    const id = uid()
    dispatch({
      type: 'addReport',
      report: { id, categoryId: cat, regionId: 'setor-central', address: currentAddress, createdAt: now.toISOString(), details: details.trim() || undefined, status: 'pendente' },
    })
    nav(`/ocorrencia/${id}/enviada`, { replace: true })
  }

  return (
    <div className="page page--with-cta">
      <PageHeader title="Registrar ocorrência" />
      <motion.div className="page-body narrow" variants={stagger(0.05, 0.04)} initial="hidden" animate="show">
        <motion.div variants={fadeUp} className="card auto-info">
          <p>
            <MapPin size={18} className="c-red" /> <strong>Local:</strong> {currentAddress} · GPS 8 m
          </p>
          <p>
            <Clock size={18} className="c-blue" /> <strong>Horário:</strong> hoje, {clockTime(now)} ({periodOfDay(now)})
          </p>
          <small>Capturados automaticamente</small>
        </motion.div>

        <motion.h3 variants={fadeUp} className="block-title">
          O que aconteceu?
        </motion.h3>
        <motion.p variants={fadeUp} className="muted small cat-hint">
          Roubo envolve ameaça ou violência. Furto acontece sem contato, quando você não está por perto.
        </motion.p>
        <motion.div className="cat-grid" role="radiogroup" aria-label="Tipo de ocorrência">
          {categories.map((c) => {
            const on = cat === c.id
            return (
              <motion.button
                key={c.id}
                variants={fadeUp}
                role="radio"
                aria-checked={on}
                className={`cat-card ${on ? 'is-on' : ''} ${error ? 'has-error' : ''}`}
                onClick={() => pick(c.id)}
              >
                <strong>{c.label}</strong>
                <small>
                  <i style={{ background: severityColor[c.severity] }} /> Gravidade {c.severity} de 5
                </small>
                <AnimatePresence>
                  {on && <motion.span className="cat-card__ring" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} />}
                </AnimatePresence>
              </motion.button>
            )
          })}
        </motion.div>
        <AnimatePresence>
          {error && (
            <motion.p className="field__error" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button variants={fadeUp} className={`voice-btn ${listening ? 'is-on' : ''}`} onClick={startVoice} aria-pressed={listening}>
          {listening ? <Square size={18} /> : <Mic size={20} />}
          <span>{listening ? 'Ouvindo... toque para parar' : 'Registrar por voz'}</span>
          {listening && (
            <span className="wave" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <i key={i} style={{ animationDelay: `${i * 0.12}s` }} />
              ))}
            </span>
          )}
        </motion.button>
        {transcript && <p className="muted small transcript">“{transcript}”</p>}

        <motion.div variants={fadeUp} className="textarea">
          <label htmlFor="details">Detalhes (opcional)</label>
          <textarea id="details" rows={3} maxLength={MAX} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Ex.: dois suspeitos de moto, sentido Av. Central" />
          <span className={details.length > MAX - 30 ? 'warn' : ''}>
            {details.length}/{MAX}
          </span>
        </motion.div>
      </motion.div>

      <div className="cta-bar cta-bar--stack">
        <Button block loading={sending} onClick={submit}>
          {sending ? 'Enviando...' : 'Enviar ocorrência'}
        </Button>
        <p className="muted small center">Sua identidade não é exibida a outros usuários</p>
      </div>
    </div>
  )
}
