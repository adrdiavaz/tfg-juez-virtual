import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert, Lock, Mail } from 'lucide-react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
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
import { passwordSchema } from '@/lib/auth'

const schema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Las contraseñas no coinciden.',
  })

type Values = z.infer<typeof schema>

type Props = {
  title: string
  description: string
  submitLabel: string
  passwordLabel?: string
  badge?: ReactNode
  email?: string
  isPending: boolean
  isError: boolean
  onSubmit: (password: string) => void
}

export function SetPasswordForm({
  title,
  description,
  submitLabel,
  passwordLabel = 'Contraseña',
  badge,
  email,
  isPending,
  isError,
  onSubmit,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  return (
    <form
      onSubmit={handleSubmit((v) => onSubmit(v.password))}
      noValidate
      className={authCardClass}
    >
      <div className="flex flex-col gap-2">
        {badge}
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {isError && (
        <Alert variant="destructive" className="bg-destructive-soft">
          <CircleAlert />
          <AlertDescription className="text-current">
            No se pudo guardar la contraseña. Inténtalo de nuevo más tarde.
          </AlertDescription>
        </Alert>
      )}

      <FieldGroup className="gap-5">
        {email && (
          <Field>
            <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
            <div className="relative">
              <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                value={email}
                readOnly
                className="bg-muted pl-9"
              />
            </div>
          </Field>
        )}
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">{passwordLabel}</FieldLabel>
          <div className="relative">
            <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              className="pl-9"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
          </div>
          <FieldError errors={[errors.password]} />
        </Field>
        <Field data-invalid={!!errors.confirm}>
          <FieldLabel htmlFor="confirm">Repite la contraseña</FieldLabel>
          <div className="relative">
            <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              className="pl-9"
              aria-invalid={!!errors.confirm}
              {...register('confirm')}
            />
          </div>
          <FieldError errors={[errors.confirm]} />
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={isPending}>
        {submitLabel}
      </Button>
    </form>
  )
}
