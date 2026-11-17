import { Link } from '@tanstack/react-router'
import { Info } from 'lucide-react'
import { authCardClass } from '@/components/auth/auth-card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

const content = {
  activation: {
    description:
      'Este enlace de activación no es válido o la cuenta ya está activa.',
    hint: 'Si tu cuenta sigue pendiente, pide al profesor o al administrador que te reenvíe la invitación. Si ya está activa, inicia sesión.',
    to: '/login',
    action: 'Ir a iniciar sesión',
  },
  reset: {
    description:
      'Este enlace de restablecimiento no es válido, ha caducado o ya se ha usado.',
    hint: 'Solicita un enlace nuevo para restablecer tu contraseña.',
    to: '/forgot-password',
    action: 'Solicitar un enlace nuevo',
  },
} as const

export function InvalidLink({ kind }: { kind: keyof typeof content }) {
  const { description, hint, to, action } = content[kind]
  return (
    <div className={authCardClass}>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Enlace no válido</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Alert className="border-primary/30 bg-primary-soft text-primary">
        <Info />
        <AlertDescription className="text-current">{hint}</AlertDescription>
      </Alert>
      <Button render={<Link to={to} />}>{action}</Button>
    </div>
  )
}
