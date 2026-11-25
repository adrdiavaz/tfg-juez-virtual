import { Pencil, RefreshCw, Send } from 'lucide-react'
import type { TeacherOut } from '@/api/generated/model'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fullName, initials, statusUi } from '@/lib/teachers'

type Props = {
  teachers: TeacherOut[]
  busy: boolean
  onEdit: (teacher: TeacherOut) => void
  onDeactivate: (teacher: TeacherOut) => void
  onReactivate: (teacher: TeacherOut) => void
  onResend: (teacher: TeacherOut) => void
}

const actionClass = 'h-7 px-2.5'

export function TeachersTable({
  teachers,
  busy,
  onEdit,
  onDeactivate,
  onReactivate,
  onResend,
}: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="px-5">Profesor</TableHead>
          <TableHead>Identificador</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="px-5">
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {teachers.map((teacher) => {
          const name = fullName(teacher)
          const status = statusUi[teacher.status]
          return (
            <TableRow key={teacher.id}>
              <TableCell className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">
                      {initials(teacher)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="leading-tight">
                    <div className="font-medium">{name}</div>
                    <div className="text-xs text-muted-foreground">
                      {teacher.email}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {teacher.identifier}
              </TableCell>
              <TableCell>
                <Badge variant={status.variant}>
                  <status.icon aria-hidden /> {status.label}
                </Badge>
              </TableCell>
              <TableCell className="px-5">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    className={actionClass}
                    disabled={busy}
                    aria-label={`Editar ${name}`}
                    onClick={() => onEdit(teacher)}
                  >
                    <Pencil /> Editar
                  </Button>
                  {teacher.status === 'active' && (
                    <Button
                      variant="destructive"
                      className={actionClass}
                      disabled={busy}
                      aria-label={`Desactivar ${name}`}
                      onClick={() => onDeactivate(teacher)}
                    >
                      Desactivar
                    </Button>
                  )}
                  {teacher.status === 'pending' && (
                    <Button
                      variant="secondary"
                      className={actionClass}
                      disabled={busy}
                      aria-label={`Reenviar invitación a ${name}`}
                      onClick={() => onResend(teacher)}
                    >
                      <Send /> Reenviar invitación
                    </Button>
                  )}
                  {teacher.status === 'disabled' && (
                    <Button
                      variant="secondary"
                      className={actionClass}
                      disabled={busy}
                      aria-label={`Reactivar ${name}`}
                      onClick={() => onReactivate(teacher)}
                    >
                      <RefreshCw /> Reactivar
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
