import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Mail } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  getActivationInfoAuthActivationGetQueryOptions,
  useActivateAuthActivationPost,
} from '@/api/generated/auth/auth'
import { InvalidLink } from '@/components/auth/invalid-link'
import { SetPasswordForm } from '@/components/auth/set-password-form'
import { Badge } from '@/components/ui/badge'
import { isInvalidLink } from '@/lib/auth'

export const Route = createFileRoute('/_auth/activate')({
  validateSearch: z.object({ token: z.string().catch('') }),
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: async ({ context, deps }) => {
    if (!deps.token) return null
    return context.queryClient
      .query(
        getActivationInfoAuthActivationGetQueryOptions(
          { token: deps.token },
          { query: { retry: false } },
        ),
      )
      .catch((error: unknown) => {
        if (isInvalidLink(error)) return null
        throw error
      })
  },
  component: Activate,
})

function Activate() {
  const { token } = Route.useSearch()
  const info = Route.useLoaderData()
  const navigate = useNavigate()
  const activate = useActivateAuthActivationPost()

  if (!info || isInvalidLink(activate.error)) {
    return <InvalidLink kind="activation" />
  }

  return (
    <SetPasswordForm
      badge={
        <Badge variant="warning" className="self-start">
          <Mail /> Pendiente de activación
        </Badge>
      }
      title="Activa tu cuenta"
      description="Establece una contraseña para empezar a usar la plataforma."
      email={info.email}
      submitLabel="Activar cuenta"
      isPending={activate.isPending}
      isError={activate.isError}
      onSubmit={(password) =>
        activate.mutate(
          { data: { token, password } },
          {
            onSuccess: () => {
              toast.success('Cuenta activada. Ya puedes iniciar sesión.')
              navigate({ to: '/login' })
            },
          },
        )
      }
    />
  )
}
