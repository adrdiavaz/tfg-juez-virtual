import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { useConfirmPasswordResetAuthPasswordResetConfirmPost } from '@/api/generated/auth/auth'
import { InvalidLink } from '@/components/auth/invalid-link'
import { SetPasswordForm } from '@/components/auth/set-password-form'
import { isInvalidLink } from '@/lib/auth'

export const Route = createFileRoute('/_auth/reset-password')({
  validateSearch: z.object({ token: z.string().catch('') }),
  component: ResetPassword,
})

function ResetPassword() {
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const reset = useConfirmPasswordResetAuthPasswordResetConfirmPost()

  if (!token || isInvalidLink(reset.error)) {
    return <InvalidLink kind="reset" />
  }

  return (
    <SetPasswordForm
      title="Nueva contraseña"
      description="Introduce la nueva contraseña de tu cuenta."
      passwordLabel="Nueva contraseña"
      submitLabel="Guardar contraseña"
      isPending={reset.isPending}
      isError={reset.isError}
      onSubmit={(password) =>
        reset.mutate(
          { data: { token, password } },
          {
            onSuccess: () => {
              toast.success('Contraseña actualizada. Inicia sesión con ella.')
              navigate({ to: '/login' })
            },
          },
        )
      }
    />
  )
}
