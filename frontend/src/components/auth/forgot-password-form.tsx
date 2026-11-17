import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, CircleAlert, CircleCheck, Mail, Send } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useRequestPasswordResetAuthPasswordResetPost } from '@/api/generated/auth/auth'
import { authCardClass } from '@/components/auth/auth-card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

const schema = z.object({
  credential: z
    .string()
    .trim()
    .min(1, 'Introduce tu identificador o tu correo')
    .max(255),
})

type Values = z.infer<typeof schema>

export function ForgotPasswordForm() {
  const reset = useRequestPasswordResetAuthPasswordResetPost()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  return (
    <form
      onSubmit={handleSubmit((v) =>
        reset.mutate({ data: { credential: v.credential } }),
      )}
      noValidate
      className={authCardClass}
    >
      <Link
        to="/login"
        className="flex items-center gap-2 self-start text-sm font-medium text-primary"
      >
        <ArrowLeft className="size-4" /> Volver a iniciar sesión
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Restablece tu contraseña</h1>
        <p className="text-sm text-muted-foreground">
          Indica tu identificador o tu correo electrónico y te enviaremos un
          enlace.
        </p>
      </div>

      <FieldGroup>
        <Field data-invalid={!!errors.credential}>
          <FieldLabel htmlFor="credential">Identificador o correo</FieldLabel>
          <div className="relative">
            <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="credential"
              autoComplete="username"
              className="pl-9"
              aria-invalid={!!errors.credential}
              {...register('credential')}
            />
          </div>
          <FieldError errors={[errors.credential]} />
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={reset.isPending}>
        <Send /> Enviar enlace
      </Button>

      {reset.isSuccess && (
        <Alert className="border-success/30 bg-success-soft text-success">
          <CircleCheck />
          <AlertDescription className="text-current">
            Si existe una cuenta activa con ese dato, recibirás un enlace en tu
            correo.
          </AlertDescription>
        </Alert>
      )}
      {reset.isError && (
        <Alert variant="destructive" className="bg-destructive-soft">
          <CircleAlert />
          <AlertDescription className="text-current">
            No se pudo enviar la solicitud. Inténtalo de nuevo más tarde.
          </AlertDescription>
        </Alert>
      )}
    </form>
  )
}
