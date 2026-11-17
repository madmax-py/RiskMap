import { useMemo } from 'react'
import qrcode from 'qrcode-generator'

/**
 * QR code em SVG. Sempre escuro sobre branco, nos dois temas: leitores de QR
 * precisam desse contraste, e é isso que o parceiro vai apontar a câmera.
 */
export function QrCode({ value, size = 200, label }: { value: string; size?: number; label: string }) {
  const path = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(value)
    qr.make()
    const n = qr.getModuleCount()
    let d = ''
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`
    return { d, n: n + 8 }
  }, [value])
  return (
    <svg className="qr" width={size} height={size} viewBox={`0 0 ${path.n} ${path.n}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={path.n} height={path.n} fill="#fff" />
      <path d={path.d} fill="#0b1422" />
    </svg>
  )
}
