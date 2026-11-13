import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { getMeAuthMeGetQueryOptions } from '@/api/generated/auth/auth'
import type { Role, UserPublic } from '@/api/generated/model'

export const homeByRole = {
  student: '/student',
  teacher: '/teacher',
  admin: '/admin/teachers',
} as const satisfies Record<Role, string>

export const roleLabel: Record<Role, string> = {
  student: 'Estudiante',
  teacher: 'Profesor',
  admin: 'Administrador',
}

export const meQueryOptions = getMeAuthMeGetQueryOptions({
  query: { retry: false, staleTime: Infinity },
})

export const getSession = (queryClient: QueryClient) =>
  queryClient.query(meQueryOptions).catch((error: unknown) => {
    if (isAxiosError(error) && error.response?.status === 401) return null
    throw error
  })

export const requireRole =
  (role: Role) =>
  ({ context }: { context: { user: UserPublic } }) => {
    if (context.user.role !== role) {
      throw redirect({ to: homeByRole[context.user.role] })
    }
  }

export type LoginErrorVariant = 'invalid' | 'pending' | 'disabled'

const loginErrors: Record<LoginErrorVariant, string> = {
  invalid:
    'No es posible iniciar sesión con estos datos. Revisa el identificador y la contraseña.',
  pending:
    'Tu cuenta está pendiente de activación. Actívala desde el enlace que recibiste por correo; si no lo encuentras, pide que te reenvíen la invitación.',
  disabled: 'Esta cuenta está desactivada y no puede iniciar sesión.',
}

const loginErrorByCode: Record<string, LoginErrorVariant> = {
  invalid_credentials: 'invalid',
  account_pending: 'pending',
  account_disabled: 'disabled',
}

export function loginError(error: unknown) {
  const code = isAxiosError(error) ? error.response?.data?.detail?.code : null
  const variant = loginErrorByCode[code] ?? null
  return variant
    ? { variant, message: loginErrors[variant] }
    : {
        variant: 'invalid' as const,
        message: 'No se pudo iniciar sesión. Inténtalo de nuevo más tarde.',
      }
}
