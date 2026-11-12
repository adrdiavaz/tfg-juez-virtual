import { createFileRoute } from '@tanstack/react-router'
import { requireRole } from '@/lib/auth'

export const Route = createFileRoute('/_app/teacher')({
  beforeLoad: requireRole('teacher'),
})
