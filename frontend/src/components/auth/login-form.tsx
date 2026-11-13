import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { CircleAlert, Lock, Mail, Power, User } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useLoginAuthLoginPost } from '@/api/generated/auth/auth'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { homeByRole, loginError, meQueryOptions } from '@/lib/auth'
import type { LoginErrorVariant } from '@/lib/auth'

const schema = z.object({
  credential: z
    .string()
    .trim()
    .min(1, 'Introduce tu identificador, usuario o correo')
    .max(255),
  password: z.string().min(1, 'Introduce tu contraseña').max(128),
})

type Values = z.infer<typeof schema>

const alertStyle = {
  invalid: {
    icon: CircleAlert,
    className: 'border-destructive/30 bg-destructive-soft',
  },
  pending: {
    icon: Mail,
    className: 'border-primary/30 bg-primary-soft text-primary',
  },
  disabled: { icon: Power, className: 'bg-muted' },
} satisfies Record<LoginErrorVariant, object>

export function LoginForm() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const login = useLoginAuthLoginPost()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  const error = login.isError ? loginError(login.error) : null
  const style = error && alertStyle[error.variant]

  const onSubmit = (data: Values) =>
    login.mutate(
      { data: { credential: data.credential, password: data.password } },
      {
        onSuccess: (user) => {
          queryClient.setQueryData(meQueryOptions.queryKey, user)
          navigate({ to: homeByRole[user.role] })
        },
      },
    )

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex w-full max-w-110 flex-col gap-5 rounded-xl border bg-card p-10"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Inicia sesión</h1>
        <p className="text-sm text-muted-foreground">
          Accede con tu identificador institucional, tu nombre de usuario o tu
          correo electrónico.
        </p>
      </div>

      {error && style && (
        <Alert
          variant={error.variant === 'invalid' ? 'destructive' : 'default'}
          className={style.className}
        >
          <style.icon />
          <AlertDescription className="text-current">
            {error.message}
          </AlertDescription>
        </Alert>
      )}

      <FieldGroup className="gap-5">
        <Field data-invalid={!!errors.credential}>
          <FieldLabel htmlFor="credential">
            Identificador, usuario o correo
          </FieldLabel>
          <div className="relative">
            <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="credential"
              autoComplete="username"
              className="pl-9"
              aria-invalid={!!errors.credential || error?.variant === 'invalid'}
              {...register('credential')}
            />
          </div>
          <FieldError errors={[errors.credential]} />
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">Contraseña</FieldLabel>
          <div className="relative">
            <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              className="pl-9"
              aria-invalid={!!errors.password || error?.variant === 'invalid'}
              {...register('password')}
            />
          </div>
          <FieldError errors={[errors.password]} />
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={login.isPending}>
        Iniciar sesión
      </Button>
    </form>
  )
}
