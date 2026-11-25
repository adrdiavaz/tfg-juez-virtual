import { isAxiosError } from 'axios'
import { Check, Mail, Power, type LucideIcon } from 'lucide-react'
import type { AccountStatus, TeacherOut } from '@/api/generated/model'

export const statusUi: Record<
  AccountStatus,
  {
    label: string
    variant: 'success' | 'warning' | 'neutral'
    icon: LucideIcon
  }
> = {
  active: { label: 'Activa', variant: 'success', icon: Check },
  pending: { label: 'Pendiente de activación', variant: 'warning', icon: Mail },
  disabled: { label: 'Desactivada', variant: 'neutral', icon: Power },
}

export const fullName = (teacher: TeacherOut) =>
  `${teacher.first_name} ${teacher.last_name}`.trim()

export const initials = (teacher: TeacherOut) =>
  `${teacher.first_name[0] ?? ''}${teacher.last_name[0] ?? ''}`.toUpperCase()

export const apiErrorCode = (error: unknown): string | undefined =>
  isAxiosError(error) ? error.response?.data?.detail?.code : undefined
