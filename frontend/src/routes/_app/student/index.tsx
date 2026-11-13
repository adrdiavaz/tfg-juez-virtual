import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/student/')({
  component: () => <h1 className="text-2xl font-semibold">Inicio</h1>,
})
