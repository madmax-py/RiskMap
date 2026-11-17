import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Lock, MapPinned, Route, ShieldCheck } from 'lucide-react'
import { CityMap } from './CityMap'
import { Logo } from './Logo'
import { g2w } from '../lib/city'
import { fadeUp, stagger } from '../lib/motion'

const view = { center: g2w([34, 26]), span: 1500 }

export function AuthShell({ children, compactLogo }: { children: ReactNode; compactLogo?: boolean }) {
  return (
    <div className="auth">
      <div className="auth__bg" aria-hidden="true">
        <CityMap variant="backdrop" view={view} interactive={false} showUser={false} />
      </div>

      <motion.section className="auth__hero" variants={stagger(0.08, 0.1)} initial="hidden" animate="show">
        <motion.div variants={fadeUp}>
          <Logo size={44} />
        </motion.div>
        <motion.h2 variants={fadeUp}>
          Navegue com informação.
          <br />
          <span>Escolha rotas mais seguras.</span>
        </motion.h2>
        <motion.ul variants={stagger(0.08)}>
          {[
            { icon: MapPinned, t: 'Mapa de risco atualizado com ocorrências da comunidade' },
            { icon: Route, t: 'Rotas que desviam de áreas de alto risco' },
            { icon: ShieldCheck, t: 'Alertas em tempo real quando você se aproxima de uma área perigosa' },
          ].map(({ icon: Icon, t }) => (
            <motion.li key={t} variants={fadeUp}>
              <span>
                <Icon size={20} />
              </span>
              {t}
            </motion.li>
          ))}
        </motion.ul>
      </motion.section>

      <section className="auth__panel">
        <motion.div className="auth__brand" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
          <Logo size={compactLogo ? 40 : 52} stacked={!compactLogo} />
          {!compactLogo && (
            <p>
              Navegue com informação.
              <br />
              Escolha rotas mais seguras.
            </p>
          )}
        </motion.div>
        <div className="auth__card">{children}</div>
        <p className="auth__privacy">
          <Lock size={13} /> Seus dados estão protegidos com criptografia e nunca são compartilhados.
        </p>
      </section>
    </div>
  )
}
