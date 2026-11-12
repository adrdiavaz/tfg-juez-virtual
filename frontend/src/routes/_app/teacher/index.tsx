import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/teacher/')({
  component: () => <h1 className="text-2xl font-semibold">Panel</h1>,
})
