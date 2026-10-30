import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Inicio,
})

function Inicio() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold text-primary">Juez virtual</h1>
    </main>
  )
}
