import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppShell } from '@/components/layout/app-shell'
import { getSession } from '@/lib/auth'

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context }) => {
    const user = await getSession(context.queryClient)
    if (!user) throw redirect({ to: '/login' })
    return { user }
  },
  component: Layout,
})

function Layout() {
  const { user } = Route.useRouteContext()
  return (
    <AppShell user={user}>
      <Outlet />
    </AppShell>
  )
}
