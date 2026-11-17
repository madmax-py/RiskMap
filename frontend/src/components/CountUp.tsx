/** Mostra o número direto. (A contagem animada de 0 até o valor foi removida: distraía e atrasava a leitura.) */
export function CountUp({ value }: { value: number; duration?: number }) {
  return <span>{value}</span>
}
