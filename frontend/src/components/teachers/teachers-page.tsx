import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import {
  CircleAlert,
  GraduationCap,
  Mail,
  Search,
  Send,
  UserPlus,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type {
  AccountStatus,
  TeacherOut,
  TeacherSaved,
} from '@/api/generated/model'
import {
  getListTeachersTeachersGetQueryKey,
  useDeactivateTeacherTeachersTeacherIdDeactivatePost,
  useListTeachersTeachersGet,
  useReactivateTeacherTeachersTeacherIdReactivatePost,
  useResendInvitationTeachersTeacherIdInvitationPost,
} from '@/api/generated/teachers/teachers'
import { TablePagination } from '@/components/shared/table-pagination'
import { TeacherDialog } from '@/components/teachers/teacher-dialog'
import { TeachersTable } from '@/components/teachers/teachers-table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { apiErrorCode, statusUi } from '@/lib/teachers'

const PAGE_SIZE = 10

type StatusFilter = 'all' | AccountStatus

const filterLabels: Record<StatusFilter, string> = {
  all: 'Todos los estados',
  active: statusUi.active.label,
  pending: statusUi.pending.label,
  disabled: statusUi.disabled.label,
}

export function TeachersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim())
  const [status, setStatus] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)

  const [searched, setSearched] = useState(debouncedSearch)
  if (searched !== debouncedSearch) {
    setSearched(debouncedSearch)
    setPage(1)
  }

  const teachersQuery = useListTeachersTeachersGet(
    {
      page,
      page_size: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: status === 'all' ? undefined : status,
    },
    { query: { placeholderData: keepPreviousData } },
  )
  const teachers = teachersQuery.data?.items ?? []
  const total = teachersQuery.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  if (
    teachersQuery.data &&
    !teachersQuery.isPlaceholderData &&
    page > pageCount
  ) {
    setPage(pageCount)
  }
  const hasFilters = debouncedSearch !== '' || status !== 'all'
  const [dialog, setDialog] = useState<'create' | TeacherOut | null>(null)
  const [unsent, setUnsent] = useState<{
    id: number
    identifier: string
    created: boolean
  } | null>(null)

  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: getListTeachersTeachersGetQueryKey(),
    })
  const onError = () => {
    toast.error('No se pudo completar la acción. Inténtalo de nuevo.')
    refresh()
  }

  const deactivate = useDeactivateTeacherTeachersTeacherIdDeactivatePost({
    mutation: {
      onSuccess: (teacher) => {
        toast.success(`Cuenta de ${teacher.identifier} desactivada.`)
        refresh()
      },
      onError,
    },
  })
  const reactivate = useReactivateTeacherTeachersTeacherIdReactivatePost({
    mutation: {
      onSuccess: (teacher) => {
        toast.success(`Cuenta de ${teacher.identifier} reactivada.`)
        refresh()
      },
      onError,
    },
  })
  const resend = useResendInvitationTeachersTeacherIdInvitationPost({
    mutation: { onError },
  })
  const busy = deactivate.isPending || reactivate.isPending || resend.isPending

  const handleSaved = (
    { teacher, invitation_sent }: TeacherSaved,
    created: boolean,
  ) => {
    setDialog(null)
    refresh()
    if (invitation_sent === false) {
      setUnsent({ id: teacher.id, identifier: teacher.identifier, created })
    } else if (created) {
      toast.success(`Cuenta creada. Invitación enviada a ${teacher.email}.`)
    } else {
      toast.success(
        invitation_sent
          ? `Cambios guardados. Invitación enviada a ${teacher.email}.`
          : 'Cambios guardados.',
      )
    }
  }

  const handleResend = (teacher: Pick<TeacherOut, 'id' | 'identifier'>) =>
    resend.mutate(
      { teacherId: teacher.id },
      {
        onSuccess: ({ invitation_sent }) => {
          if (invitation_sent) {
            setUnsent(null)
            toast.success(`Invitación reenviada a ${teacher.identifier}.`)
          } else {
            setUnsent({ ...teacher, created: false })
          }
        },
        onError: (error) => {
          if (apiErrorCode(error) === 'invalid_status') setUnsent(null)
        },
      },
    )

  const handleDeactivateFromDialog = (teacher: TeacherOut) => {
    setDialog(null)
    deactivate.mutate({ teacherId: teacher.id })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold">Gestión de profesores</h1>
          <p className="text-sm text-muted-foreground">
            Da de alta al profesorado y gestiona el estado de sus cuentas.
          </p>
        </div>
        <Button onClick={() => setDialog('create')}>
          <UserPlus /> Dar de alta profesor
        </Button>
      </div>

      {unsent && (
        <Alert className="flex items-center gap-3 border-warning-border bg-warning-soft text-warning-text">
          <Mail />
          <AlertDescription className="flex-1 text-current">
            {unsent.created
              ? `La cuenta de ${unsent.identifier} se ha creado, pero la invitación no se ha enviado. Puedes reenviarla desde su fila.`
              : `No se ha podido enviar la invitación a ${unsent.identifier}. Inténtalo de nuevo más tarde.`}
          </AlertDescription>
          <Button
            variant="secondary"
            className="h-7 px-2.5"
            disabled={busy}
            onClick={() => handleResend(unsent)}
          >
            <Send /> Reenviar invitación
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-current hover:bg-warning-border/40"
            aria-label="Cerrar aviso"
            onClick={() => setUnsent(null)}
          >
            <X />
          </Button>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        <div className="relative w-full max-w-[360px]">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre, identificador o correo"
            aria-label="Buscar profesor"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          items={filterLabels}
          onValueChange={(value) => {
            setStatus(value as StatusFilter)
            setPage(1)
          }}
        >
          <SelectTrigger
            aria-label="Filtrar por estado"
            className="h-[39px] w-[220px] bg-card"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(filterLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {teachersQuery.isError ? (
        <Alert variant="destructive" className="bg-destructive-soft">
          <CircleAlert />
          <AlertDescription className="flex items-center justify-between gap-3 text-current">
            No se pudo cargar el listado de profesores.
            <Button
              variant="secondary"
              className="h-7 px-2.5"
              onClick={() => teachersQuery.refetch()}
            >
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div
          aria-busy={teachersQuery.isPlaceholderData}
          className="overflow-hidden rounded-xl border bg-card transition-opacity aria-busy:opacity-60"
        >
          {teachersQuery.isPending ? (
            <div
              className="flex flex-col gap-4 p-5"
              role="status"
              aria-label="Cargando profesores"
            >
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : teachers.length === 0 ? (
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  {hasFilters ? <Search /> : <GraduationCap />}
                </EmptyMedia>
                <EmptyTitle>
                  {hasFilters
                    ? 'Ningún profesor coincide con la búsqueda'
                    : 'Todavía no hay profesores'}
                </EmptyTitle>
                <EmptyDescription>
                  {hasFilters
                    ? 'Prueba con otro nombre, identificador o correo, o cambia el filtro de estado.'
                    : 'Da de alta al primero para que pueda registrar alumnos y crear actividades.'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <TeachersTable
                teachers={teachers}
                busy={busy}
                onEdit={setDialog}
                onDeactivate={(t) => deactivate.mutate({ teacherId: t.id })}
                onReactivate={(t) => reactivate.mutate({ teacherId: t.id })}
                onResend={handleResend}
              />
              <TablePagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      )}

      {dialog && (
        <TeacherDialog
          key={dialog === 'create' ? 'create' : dialog.id}
          teacher={dialog === 'create' ? undefined : dialog}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
          onDeactivate={handleDeactivateFromDialog}
        />
      )}
    </div>
  )
}
