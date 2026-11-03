import * as React from 'react'
import { Input as InputPrimitive } from '@base-ui/react/input'
import { cn } from '@/lib/utils'

// «Campo de texto» en Penpot: Normal, Foco (borde primario de 2px), Error y Bloqueado.
// El foco usa ring-1 sobre el borde de 1px para dar 2px sin desplazar el diseño.
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'h-[39px] w-full min-w-0 rounded-md border border-input bg-card px-3 py-[9px] text-sm text-foreground transition-colors outline-none placeholder:text-placeholder focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-destructive aria-invalid:ring-0',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
