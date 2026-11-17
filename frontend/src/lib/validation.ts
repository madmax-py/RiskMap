import { z } from 'zod'

const email = z.string().trim().min(1, 'Informe seu e-mail').email('E-mail inválido')
const password = z.string().min(1, 'Informe sua senha').min(6, 'A senha precisa ter pelo menos 6 caracteres')

export const loginSchema = z.object({ email, password })

export const signupSchema = z
  .object({
    name: z.string().trim().min(3, 'Informe seu nome completo').regex(/\s/, 'Informe nome e sobrenome'),
    email,
    password: password.regex(/\d/, 'Use pelo menos um número').regex(/[A-Za-z]/, 'Use pelo menos uma letra'),
    confirm: z.string().min(1, 'Confirme sua senha'),
    terms: z.literal(true, { errorMap: () => ({ message: 'Você precisa aceitar os termos' }) }),
  })
  .refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'As senhas não coincidem' })

export const forgotSchema = z.object({ email })

export const profileSchema = z.object({
  name: z.string().trim().min(3, 'Nome muito curto').regex(/\s/, 'Informe nome e sobrenome'),
  email,
})

export type LoginForm = z.infer<typeof loginSchema>
export type SignupForm = z.infer<typeof signupSchema>
export type ForgotForm = z.infer<typeof forgotSchema>
export type ProfileForm = z.infer<typeof profileSchema>

/** "pedro.silva@x.com" → "Pedro Silva" */
export function nameFromEmail(e: string) {
  return e
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(' ')
}
