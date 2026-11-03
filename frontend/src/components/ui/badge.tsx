import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// «Badge de estado» y «Badge de veredicto» en Penpot. El color nunca va solo (DD-11):
// quien use el badge debe incluir icono y texto.
const badgeVariants = cva(
  'inline-flex min-h-[22px] w-fit shrink-0 items-center gap-1 rounded-full border border-transparent px-2 py-[3px] text-xs font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        // Estados (Badge de estado)
        neutral: 'bg-verdict-pending-bg text-verdict-pending-fg',
        primary: 'bg-primary-soft text-primary',
        success: 'bg-success-soft text-success',
        warning: 'bg-warning-soft text-warning-text',
        destructive: 'bg-destructive-soft text-destructive',
        study: 'bg-study-soft text-study',
        // Veredictos (Badge de veredicto)
        ok: 'bg-verdict-ok-bg text-verdict-ok-fg',
        wa: 'bg-verdict-wa-bg text-verdict-wa-fg',
        ce: 'bg-verdict-ce-bg text-verdict-ce-fg',
        re: 'bg-verdict-re-bg text-verdict-re-fg',
        tle: 'bg-verdict-tle-bg text-verdict-tle-fg',
        mle: 'bg-verdict-mle-bg text-verdict-mle-fg',
        pending: 'bg-verdict-pending-bg text-verdict-pending-fg',
        // Fallo técnico: borde discontinuo para distinguirlo de un veredicto de la solución
        error:
          'border-dashed border-placeholder bg-verdict-error-bg text-verdict-error-fg',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
)

function Badge({
  className,
  variant = 'neutral',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      { className: cn(badgeVariants({ variant }), className) },
      props,
    ),
    render,
    state: { slot: 'badge', variant },
  })
}

export { Badge, badgeVariants }
