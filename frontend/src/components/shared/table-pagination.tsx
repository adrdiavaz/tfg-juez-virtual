import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
}: Props) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-sm text-muted-foreground"
    >
      <p>
        Mostrando {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          className="h-7 px-2.5"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft /> Anterior
        </Button>
        <span aria-current="page">
          Página {page} de {pageCount}
        </span>
        <Button
          variant="secondary"
          className="h-7 px-2.5"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente <ChevronRight />
        </Button>
      </div>
    </nav>
  )
}
