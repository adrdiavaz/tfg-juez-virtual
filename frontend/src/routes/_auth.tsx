import { createFileRoute, Outlet } from '@tanstack/react-router'
import { LoginHero } from '@/components/auth/login-hero'

export const Route = createFileRoute('/_auth')({
  component: () => (
    <main className="flex min-h-screen">
      <LoginHero />
      <div className="flex flex-1 items-center justify-center p-6">
        <Outlet />
      </div>
    </main>
  ),
})
