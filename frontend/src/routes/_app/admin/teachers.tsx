import { createFileRoute } from '@tanstack/react-router'
import { TeachersPage } from '@/components/teachers/teachers-page'

export const Route = createFileRoute('/_app/admin/teachers')({
  component: TeachersPage,
})
