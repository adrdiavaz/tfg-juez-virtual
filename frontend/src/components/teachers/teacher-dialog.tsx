import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert, Mail, Power, Send, User } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  useCreateTeacherTeachersPost,
  useUpdateTeacherTeachersTeacherIdPatch,
} from '@/api/generated/teachers/teachers'
import type { TeacherOut, TeacherSaved } from '@/api/generated/model'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { apiErrorCode, statusUi } from '@/lib/teachers'

const schema = z.object({
  first_name: z.string().trim().min(1, 'Introduce el nombre.').max(255),
  last_name: z.string().trim().min(1, 'Introduce los apellidos.').max(255),
  identifier: z
    .string()
    .trim()
    .min(1, 'Introduce el identificador o el nombre de usuario.')
    .max(255),
  email: z
    .string()
    .trim()
    .pipe(z.email('Introduce un correo electrónico válido.')),
})

type Values = z.infer<typeof schema>

type Props = {
  teacher?: TeacherOut
  onClose: () => void
  onSaved: (result: TeacherSaved, created: boolean) => void
  onDeactivate: (teacher: TeacherOut) => void
}

export function TeacherDialog({
  teacher,
  onClose,
  onSaved,
  onDeactivate,
}: Props) {
  const create = useCreateTeacherTeachersPost()
  const update = useUpdateTeacherTeachersTeacherIdPatch()
  const [failed, setFailed] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: teacher?.first_name ?? '',
      last_name: teacher?.last_name ?? '',
      identifier: teacher?.identifier ?? '',
      email: teacher?.email ?? '',
    },
  })
  const isPending = create.isPending || update.isPending

  const onError = (error: unknown) => {
    const code = apiErrorCode(error)
    if (code === 'identifier_taken') {
      setError('identifier', {
        message: 'Este identificador ya pertenece a otra cuenta.',
      })
    } else if (code === 'email_taken') {
      setError('email', { message: 'Este correo ya pertenece a otra cuenta.' })
    } else {
      setFailed(true)
    }
  }

  const onSubmit = (data: Values) => {
    setFailed(false)
    if (teacher) {
      update.mutate(
        { teacherId: teacher.id, data },
        { onSuccess: (result) => onSaved(result, false), onError },
      )
    } else {
      create.mutate(
        { data },
        { onSuccess: (result) => onSaved(result, true), onError },
      )
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isPending && onClose()}>
      <DialogContent className="gap-5 p-7 sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-xl leading-tight font-semibold">
            {teacher ? 'Editar profesor' : 'Dar de alta profesor'}
          </DialogTitle>
          <DialogDescription>
            {teacher
              ? `${teacher.identifier} · cuenta ${statusUi[teacher.status].label.toLowerCase()}`
              : 'La cuenta quedará pendiente de activación y se enviará una invitación por correo.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-5"
        >
          {failed && (
            <Alert variant="destructive" className="bg-destructive-soft">
              <CircleAlert />
              <AlertDescription className="text-current">
                No se pudieron guardar los datos. Inténtalo de nuevo más tarde.
              </AlertDescription>
            </Alert>
          )}

          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.first_name}>
                <FieldLabel htmlFor="first_name">Nombre</FieldLabel>
                <Input
                  id="first_name"
                  autoComplete="off"
                  aria-invalid={!!errors.first_name}
                  {...register('first_name')}
                />
                <FieldError errors={[errors.first_name]} />
              </Field>
              <Field data-invalid={!!errors.last_name}>
                <FieldLabel htmlFor="last_name">Apellidos</FieldLabel>
                <Input
                  id="last_name"
                  autoComplete="off"
                  aria-invalid={!!errors.last_name}
                  {...register('last_name')}
                />
                <FieldError errors={[errors.last_name]} />
              </Field>
            </div>
            <Field data-invalid={!!errors.identifier}>
              <FieldLabel htmlFor="identifier">
                Identificador o nombre de usuario
              </FieldLabel>
              <div className="relative">
                <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="identifier"
                  autoComplete="off"
                  className="pl-9"
                  aria-invalid={!!errors.identifier}
                  {...register('identifier')}
                />
              </div>
              <FieldError errors={[errors.identifier]} />
            </Field>
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="off"
                  className="pl-9"
                  aria-invalid={!!errors.email}
                  {...register('email')}
                />
              </div>
              <FieldError errors={[errors.email]} />
            </Field>
          </FieldGroup>

          {teacher && teacher.status !== 'disabled' && (
            <div className="flex gap-3 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              <Power className="mt-0.5 size-4 shrink-0" />
              <p>
                Si desactivas la cuenta, no podrá iniciar sesión. Sus datos y
                sus actividades se conservan y los colaboradores pueden seguir
                gestionándolas.
              </p>
            </div>
          )}

          <DialogFooter className="m-0 border-0 bg-transparent p-0 sm:justify-between">
            {teacher && teacher.status !== 'disabled' ? (
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={() => onDeactivate(teacher)}
              >
                <Power /> Desactivar cuenta
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                disabled={isPending}
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {teacher ? (
                  'Guardar cambios'
                ) : (
                  <>
                    <Send /> Dar de alta y enviar invitación
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
