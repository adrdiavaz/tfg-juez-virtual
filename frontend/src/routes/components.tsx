import { createFileRoute } from '@tanstack/react-router'
import {
  Check,
  CircleAlert,
  Clock,
  Cpu,
  Lock,
  Send,
  Timer,
  TriangleAlert,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export const Route = createFileRoute('/components')({
  component: Componentes,
})

// Las clases van literales para que Tailwind las detecte
const colores = [
  {
    grupo: 'Superficies',
    items: [
      ['background', 'bg-background'],
      ['card', 'bg-card'],
      ['muted', 'bg-muted'],
      ['table-header', 'bg-table-header'],
      ['code', 'bg-code'],
      ['border', 'bg-border'],
      ['input', 'bg-input'],
    ],
  },
  {
    grupo: 'Texto',
    items: [
      ['foreground', 'bg-foreground'],
      ['muted-foreground', 'bg-muted-foreground'],
      ['placeholder', 'bg-placeholder'],
    ],
  },
  {
    grupo: 'Primario',
    items: [
      ['primary', 'bg-primary'],
      ['primary-hover', 'bg-primary-hover'],
      ['primary-soft', 'bg-primary-soft'],
      ['primary-foreground', 'bg-primary-foreground'],
    ],
  },
  {
    grupo: 'Acento y estados',
    items: [
      ['warning', 'bg-warning'],
      ['warning-soft', 'bg-warning-soft'],
      ['warning-text', 'bg-warning-text'],
      ['destructive', 'bg-destructive'],
      ['destructive-soft', 'bg-destructive-soft'],
      ['success', 'bg-success'],
      ['success-soft', 'bg-success-soft'],
      ['study', 'bg-study'],
      ['study-soft', 'bg-study-soft'],
    ],
  },
  {
    grupo: 'Veredictos (fondo / texto)',
    items: [
      ['ok bg', 'bg-verdict-ok-bg'],
      ['ok fg', 'bg-verdict-ok-fg'],
      ['wa bg', 'bg-verdict-wa-bg'],
      ['wa fg', 'bg-verdict-wa-fg'],
      ['ce bg', 'bg-verdict-ce-bg'],
      ['ce fg', 'bg-verdict-ce-fg'],
      ['re bg', 'bg-verdict-re-bg'],
      ['re fg', 'bg-verdict-re-fg'],
      ['tle bg', 'bg-verdict-tle-bg'],
      ['tle fg', 'bg-verdict-tle-fg'],
      ['mle bg', 'bg-verdict-mle-bg'],
      ['mle fg', 'bg-verdict-mle-fg'],
      ['pending bg', 'bg-verdict-pending-bg'],
      ['pending fg', 'bg-verdict-pending-fg'],
    ],
  },
]

function Seccion({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{titulo}</h2>
      {children}
    </section>
  )
}

function Componentes() {
  return (
    <main className="mx-auto max-w-4xl space-y-10 p-6">
      <h1 className="text-title font-semibold text-primary">
        Sistema de diseño
      </h1>

      <Seccion titulo="Colores">
        {colores.map(({ grupo, items }) => (
          <div key={grupo} className="space-y-2">
            <h3 className="text-base font-semibold">{grupo}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {items.map(([nombre, clase]) => (
                <div key={nombre} className="space-y-1">
                  <div className={`h-10 rounded-md border ${clase}`} />
                  <p className="text-xs text-muted-foreground">{nombre}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Seccion>

      <Seccion titulo="Tipografía">
        <div className="space-y-1">
          <p className="text-title font-semibold">Título 28</p>
          <p className="text-xl font-semibold">Encabezado 2 · 20</p>
          <p className="text-base font-semibold">Encabezado 3 · 16</p>
          <p className="text-sm">Cuerpo · 14</p>
          <p className="text-sm font-medium">Cuerpo fuerte · 14</p>
          <p className="text-xs">Pequeño · 12</p>
          <p className="rounded-md bg-code p-2 font-mono text-[13px]">
            Código · int main() {'{ return 0; }'}
          </p>
        </div>
      </Seccion>

      <Seccion titulo="Botones">
        <div className="flex flex-wrap gap-3">
          <Button>
            <Send /> Enviar solución
          </Button>
          <Button variant="secondary">Cancelar</Button>
          <Button variant="ghost">Ver detalle</Button>
          <Button variant="destructive">Retirar</Button>
          <Button disabled>Deshabilitado</Button>
          <Button size="icon" aria-label="Enviar">
            <Send />
          </Button>
        </div>
      </Seccion>

      <Seccion titulo="Campos de texto">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="normal">Normal</Label>
            <Input id="normal" placeholder="Identificador" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="error">Error</Label>
            <Input
              id="error"
              aria-invalid
              defaultValue="ab"
              aria-describedby="error-msg"
            />
            <p
              id="error-msg"
              className="flex items-center gap-1.5 text-xs text-destructive"
            >
              <CircleAlert className="size-3.5" /> Indica qué dato hay que
              corregir.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bloqueado">Bloqueado</Label>
            <Input id="bloqueado" disabled defaultValue="No editable" />
          </div>
        </div>
      </Seccion>

      <Seccion titulo="Badges de estado">
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">
            <Check /> Activa
          </Badge>
          <Badge variant="neutral">
            <Check /> Finalizada
          </Badge>
          <Badge variant="primary">
            <Clock /> Próxima
          </Badge>
          <Badge variant="study">Estudio</Badge>
          <Badge variant="warning">
            <Lock /> Bloqueado: hay entregas
          </Badge>
          <Badge variant="destructive">
            <X /> Error
          </Badge>
        </div>
      </Seccion>

      <Seccion titulo="Badges de veredicto">
        <div className="flex flex-wrap gap-2">
          <Badge variant="ok">
            <Check /> Aceptado
          </Badge>
          <Badge variant="wa">
            <X /> Respuesta incorrecta
          </Badge>
          <Badge variant="ce">
            <TriangleAlert /> Error de compilación
          </Badge>
          <Badge variant="re">
            <CircleAlert /> Error de ejecución
          </Badge>
          <Badge variant="tle">
            <Timer /> Tiempo excedido
          </Badge>
          <Badge variant="mle">
            <Cpu /> Memoria excedida
          </Badge>
          <Badge variant="pending">
            <Clock /> En evaluación
          </Badge>
          <Badge variant="error">
            <CircleAlert /> Fallo técnico
          </Badge>
        </div>
      </Seccion>
      <Seccion titulo="Formularios (Field)">
        <FieldGroup className="max-w-md">
          <Field>
            <FieldLabel htmlFor="lenguaje">Lenguaje</FieldLabel>
            <Select
              defaultValue="cpp"
              items={{ cpp: 'C++', java: 'Java', py: 'Python' }}
            >
              <SelectTrigger id="lenguaje" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpp">C++</SelectItem>
                <SelectItem value="java">Java</SelectItem>
                <SelectItem value="py">Python</SelectItem>
              </SelectContent>
            </Select>
            <FieldDescription>Bloqueado si ya hay entregas.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="enunciado">Enunciado</FieldLabel>
            <Textarea id="enunciado" aria-invalid defaultValue="" />
            <FieldError>El enunciado es obligatorio.</FieldError>
          </Field>
          <Field orientation="horizontal">
            <Checkbox id="privado" />
            <FieldLabel htmlFor="privado">Caso de prueba privado</FieldLabel>
          </Field>
        </FieldGroup>
      </Seccion>

      <Seccion titulo="Alertas, tarjetas y estados">
        <Alert>
          <TriangleAlert />
          <AlertTitle>Examen abierto</AlertTitle>
          <AlertDescription>
            Quedan 45 minutos hasta el cierre.
          </AlertDescription>
        </Alert>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Prácticas de bucles</CardTitle>
              <CardDescription>Modo estudio · Individual</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="primary">Abierta</Badge>
            </CardContent>
          </Card>
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>Sin actividades</EmptyTitle>
              <EmptyDescription>Crea la primera para empezar.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button>Crear actividad</Button>
            </EmptyContent>
          </Empty>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </Seccion>

      <Seccion titulo="Tabla y pestañas">
        <Tabs defaultValue="entregas">
          <TabsList>
            <TabsTrigger value="enunciado">Enunciado</TabsTrigger>
            <TabsTrigger value="entregas">Entregas</TabsTrigger>
          </TabsList>
          <TabsContent value="entregas">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Intento</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>2</TableCell>
                  <TableCell>12/11/2026</TableCell>
                  <TableCell>
                    <Badge variant="ok">
                      <Check /> Aceptado
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>1</TableCell>
                  <TableCell>11/11/2026</TableCell>
                  <TableCell>
                    <Badge variant="wa">
                      <X /> Respuesta incorrecta
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="enunciado">
            <p className="py-3 text-sm">Contenido del enunciado.</p>
          </TabsContent>
        </Tabs>
      </Seccion>

      <Seccion titulo="Diálogos, menú, tooltip y toast">
        <div className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger render={<Button variant="secondary" />}>
              Abrir diálogo
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar alumno</DialogTitle>
                <DialogDescription>
                  Recibirá una invitación por correo.
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" />}>
              Eliminar
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar la actividad?</AlertDialogTitle>
                <AlertDialogDescription>
                  Si tiene entregas, se retirará en lugar de eliminarse.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction>Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" />}>
              <Avatar className="size-6">
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
              Mi cuenta
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Cerrar sesión</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button size="icon" variant="secondary" aria-label="Enviar" />
              }
            >
              <Send />
            </TooltipTrigger>
            <TooltipContent>Enviar solución</TooltipContent>
          </Tooltip>

          <Button
            variant="ghost"
            onClick={() => toast.success('Invitación enviada')}
          >
            Mostrar toast
          </Button>
        </div>
      </Seccion>
    </main>
  )
}
