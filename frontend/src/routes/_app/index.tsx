import { createFileRoute, redirect } from '@tanstack/react-router'
import { homeByRole } from '@/lib/auth'

export const Route = createFileRoute('/_app/')({
  beforeLoad: ({ context }) => {
    throw redirect({ to: homeByRole[context.user.role] })
  },
})
