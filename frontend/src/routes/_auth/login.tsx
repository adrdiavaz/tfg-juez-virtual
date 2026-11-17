import { createFileRoute, redirect } from '@tanstack/react-router'
import { LoginForm } from '@/components/auth/login-form'
import { getSession, homeByRole } from '@/lib/auth'

export const Route = createFileRoute('/_auth/login')({
  beforeLoad: async ({ context }) => {
    const user = await getSession(context.queryClient)
    if (user) throw redirect({ to: homeByRole[user.role] })
  },
  component: LoginForm,
})
