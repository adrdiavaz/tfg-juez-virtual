import { createFileRoute, redirect } from '@tanstack/react-router'
import { LoginForm } from '@/components/auth/login-form'
import { LoginHero } from '@/components/auth/login-hero'
import { getSession, homeByRole } from '@/lib/auth'

export const Route = createFileRoute('/login')({
  beforeLoad: async ({ context }) => {
    const user = await getSession(context.queryClient)
    if (user) throw redirect({ to: homeByRole[user.role] })
  },
  component: () => (
    <main className="flex min-h-screen">
      <LoginHero />
      <div className="flex flex-1 items-center justify-center p-6">
        <LoginForm />
      </div>
    </main>
  ),
})
