import { useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import {
  CodeXml,
  GraduationCap,
  House,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useLogoutAuthLogoutPost } from '@/api/generated/auth/auth'
import type { Role, UserPublic } from '@/api/generated/model'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { homeByRole, roleLabel } from '@/lib/auth'

type NavItem = {
  to: (typeof homeByRole)[Role]
  label: string
  icon: LucideIcon
}

const navByRole: Record<Role, NavItem[]> = {
  student: [{ to: '/student', label: 'Inicio', icon: House }],
  teacher: [{ to: '/teacher', label: 'Panel', icon: LayoutDashboard }],
  admin: [{ to: '/admin/teachers', label: 'Profesores', icon: GraduationCap }],
}

export function AppShell({
  user,
  children,
}: {
  user: UserPublic
  children: ReactNode
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const items = navByRole[user.role]
  const current = items.find((item) => pathname.startsWith(item.to))
  const logout = useLogoutAuthLogoutPost({
    mutation: {
      onSettled: () => {
        queryClient.clear()
        navigate({ to: '/login' })
      },
    },
  })

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="flex-row items-center gap-3 p-4">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CodeXml className="size-4" />
          </span>
          <span className="font-semibold">Juez virtual</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="uppercase">
              Navegación
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      render={<Link to={item.to} />}
                      isActive={item === current}
                    >
                      <item.icon />
                      {item.label}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="flex-row items-center gap-3 border-t p-4">
          <Avatar>
            <AvatarFallback>
              {user.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium">{user.username}</div>
            <div className="text-xs text-muted-foreground">
              {roleLabel[user.role]}
            </div>
          </div>
          <Button
            variant="ghost"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
          >
            <LogOut /> Salir
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-15 items-center gap-2 border-b bg-card px-6">
          <SidebarTrigger className="md:hidden" />
          <span className="text-sm font-medium">{current?.label}</span>
        </header>
        <div className="p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
