import { createFileRoute } from '@tanstack/react-router'
import { requireRole } from '@/lib/auth'

export const Route = createFileRoute('/_app/admin')({
  beforeLoad: requireRole('admin'),
})
