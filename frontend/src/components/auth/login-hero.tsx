import { Check, CodeXml, TriangleAlert, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function LoginHero() {
  return (
    <div className="hidden flex-col justify-between bg-primary p-14 text-primary-foreground md:flex md:w-[39%]">
      <div className="flex items-center gap-3 text-lg font-semibold">
        <span className="flex size-10 items-center justify-center rounded-lg bg-card text-primary">
          <CodeXml className="size-5" />
        </span>
        Juez virtual
      </div>
      <div className="flex flex-col gap-4">
        <h2 className="text-3xl leading-tight font-semibold">
          Practica, entrega y consulta el resultado de tus soluciones.
        </h2>
        <p className="text-brand-panel-foreground">
          Plataforma de evaluación automática de actividades de programación.
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="ok">
            <Check /> Aceptado
          </Badge>
          <Badge variant="wa">
            <X /> Respuesta incorrecta
          </Badge>
          <Badge variant="ce">
            <TriangleAlert /> Error de compilación
          </Badge>
        </div>
      </div>
      <div />
    </div>
  )
}
