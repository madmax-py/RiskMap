/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ORS_API_KEY?: string
  readonly VITE_MAP_MODE?: 'real' | 'demo'
  readonly VITE_MAP_STYLE_URL?: string
}
