import { useId } from 'react'

export function LogoMark({ size = 40 }: { size?: number }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 64 74" aria-hidden="true">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e3262b" />
          <stop offset="0.47" stopColor="#e3262b" />
          <stop offset="0.47" stopColor="#f6b500" />
          <stop offset="0.66" stopColor="#f6b500" />
          <stop offset="0.66" stopColor="#1f5be0" />
          <stop offset="1" stopColor="#1546b8" />
        </linearGradient>
      </defs>
      <path d="M32 72 C26 60 4 48 4 30 A28 28 0 1 1 60 30 C60 48 38 60 32 72Z" fill={`url(#g${id})`} />
      <path d="M32 14 L46 19 V31 C46 40 40 46 32 49 C24 46 18 40 18 31 V19 Z" fill="#fff" />
      <path d="M32 22 V34" stroke="#e3262b" strokeWidth="5" strokeLinecap="round" />
      <circle cx="32" cy="41" r="2.8" fill="#e3262b" />
    </svg>
  )
}

export function Logo({ size = 36, stacked = false }: { size?: number; stacked?: boolean }) {
  return (
    <span className={`logo ${stacked ? 'logo--stacked' : ''}`} style={{ ['--logo-size' as string]: `${size}px` }}>
      <LogoMark size={stacked ? size * 1.9 : size} />
      <span className="logo__word">
        Risk<span>Map</span>
      </span>
    </span>
  )
}

export function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}
