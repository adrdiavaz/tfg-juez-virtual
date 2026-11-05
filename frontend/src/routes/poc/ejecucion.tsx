import { createFileRoute } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { Check, CircleAlert, Cpu, Timer, TriangleAlert, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useEjecutarPocEjecucionesPost } from '@/api/generated/poc/poc'
import { Language } from '@/api/generated/model/language'
import { Status } from '@/api/generated/model/status'
import type { EjecucionRespuesta } from '@/api/generated/model/ejecucionRespuesta'
import type { ResultadoComando } from '@/api/generated/model/resultadoComando'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/poc/ejecucion')({
  component: PruebaEjecucion,
})

const LENGUAJES: Record<Language, string> = {
  c: 'C',
  cpp: 'C++',
  python: 'Python',
  java: 'Java',
}

// Cada plantilla lee la entrada estándar y la repite
const PLANTILLAS: Record<Language, string> = {
  c: `#include <stdio.h>

int main(void) {
    char linea[256];
    while (fgets(linea, sizeof linea, stdin)) fputs(linea, stdout);
    return 0;
}
`,
  cpp: `#include <iostream>
#include <string>

int main() {
    std::string linea;
    while (std::getline(std::cin, linea)) std::cout << linea << '\\n';
}
`,
  python: `import sys

for linea in sys.stdin:
    print(linea, end="")
`,
  java: `import java.io.BufferedReader;
import java.io.InputStreamReader;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));
        String linea;
        while ((linea = in.readLine()) != null) System.out.println(linea);
    }
}
`,
}

// Programas que el aislamiento debe frenar (RQNF-007, RQNF-010)
const ESCENARIOS = [
  { nombre: 'Bucle infinito', codigo: 'while True:\n    pass\n' },
  {
    nombre: 'Memoria excesiva',
    codigo: 'datos = [0] * (200 * 1024 * 1024)\nprint(len(datos))\n',
  },
  {
    nombre: 'Acceso a red',
    codigo: `import socket

try:
    socket.create_connection(("1.1.1.1", 80), timeout=3).close()
    print("Conectado: la red NO está bloqueada")
except OSError as e:
    print("Bloqueado:", e)
`,
  },
  {
    nombre: 'Leer /etc/shadow',
    codigo: `try:
    print(open("/etc/shadow").read())
except OSError as e:
    print("Bloqueado:", e)
`,
  },
]

function veredicto(
  compilacion: ResultadoComando | null,
  ejecucion: ResultadoComando | null,
): {
  variant: 'ok' | 'ce' | 'tle' | 'mle' | 're' | 'error'
  icono: ReactNode
  texto: string
} {
  if (compilacion && compilacion.estado !== Status.Accepted)
    return {
      variant: 'ce',
      icono: <TriangleAlert />,
      texto: 'Error de compilación',
    }
  switch (ejecucion?.estado) {
    case Status.Accepted:
      return { variant: 'ok', icono: <Check />, texto: 'Ejecución correcta' }
    case Status.Time_Limit_Exceeded:
      return { variant: 'tle', icono: <Timer />, texto: 'Tiempo excedido' }
    case Status.Memory_Limit_Exceeded:
      return { variant: 'mle', icono: <Cpu />, texto: 'Memoria excedida' }
    case Status.Nonzero_Exit_Status:
    case Status.Signalled:
    case Status.Output_Limit_Exceeded:
      return { variant: 're', icono: <X />, texto: 'Error de ejecución' }
    default:
      return {
        variant: 'error',
        icono: <CircleAlert />,
        texto: 'Fallo técnico',
      }
  }
}

function Salida({ titulo, texto }: { titulo: string; texto: string }) {
  if (!texto) return null
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-medium">{titulo}</h3>
      <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-3 font-mono text-sm whitespace-pre-wrap">
        {texto}
      </pre>
    </div>
  )
}

function Resultado({ datos }: { datos: EjecucionRespuesta }) {
  const { compilacion, ejecucion } = datos
  const v = veredicto(compilacion, ejecucion)
  const medido = ejecucion ?? compilacion
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={v.variant}>
          {v.icono} {v.texto}
        </Badge>
        {medido && (
          <span className="text-sm text-muted-foreground">
            {medido.estado} · {medido.tiempo_ms} ms · {medido.memoria_kb} KB ·
            salida {medido.codigo_salida}
          </span>
        )}
      </div>
      {compilacion && (
        <Salida
          titulo="Compilación"
          texto={compilacion.stderr || compilacion.stdout}
        />
      )}
      {ejecucion && (
        <Salida titulo="Salida estándar" texto={ejecucion.stdout} />
      )}
      {ejecucion && <Salida titulo="Error estándar" texto={ejecucion.stderr} />}
    </div>
  )
}

function mensajeDeError(error: unknown) {
  if (isAxiosError(error)) {
    if (error.response?.status === 503)
      return 'El servicio de ejecución no está disponible'
    if (error.response?.status === 422)
      return 'Los datos enviados no son válidos'
  }
  return 'No se pudo contactar con el backend'
}

function PruebaEjecucion() {
  const [lenguaje, setLenguaje] = useState<Language>('python')
  const [codigo, setCodigo] = useState(PLANTILLAS.python)
  const [entrada, setEntrada] = useState('hola\n')
  const [tiempo, setTiempo] = useState(1000)
  const [memoria, setMemoria] = useState(256)
  const { mutate, isPending, data } = useEjecutarPocEjecucionesPost({
    mutation: { onError: (e) => toast.error(mensajeDeError(e)) },
  })

  function cambiarLenguaje(nuevo: Language) {
    setLenguaje(nuevo)
    setCodigo(PLANTILLAS[nuevo])
  }

  function cargarEscenario(escenario: string) {
    setLenguaje('python')
    setCodigo(escenario)
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-primary">
          Prueba de ejecución aislada
        </h1>
        <p className="text-muted-foreground">
          Compila y ejecuta un programa en go-judge con límites de tiempo y
          memoria.
        </p>
      </header>
      <Alert variant="destructive">
        <TriangleAlert />
        <AlertTitle>Solo para pruebas</AlertTitle>
        <AlertDescription>
          Esta página ejecuta código arbitrario sin autenticación.
        </AlertDescription>
      </Alert>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Programa</CardTitle>
            <CardDescription>Elige un lenguaje o un escenario.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                mutate({
                  data: {
                    lenguaje,
                    codigo,
                    entrada,
                    limite_tiempo_ms: tiempo,
                    limite_memoria_mb: memoria,
                  },
                })
              }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="lenguaje">Lenguaje</FieldLabel>
                  <Select
                    value={lenguaje}
                    items={LENGUAJES}
                    onValueChange={(v) => v && cambiarLenguaje(v)}
                  >
                    <SelectTrigger id="lenguaje" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LENGUAJES).map(([valor, nombre]) => (
                        <SelectItem key={valor} value={valor}>
                          {nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Cambiar de lenguaje carga su plantilla.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="codigo">Código</FieldLabel>
                  <Textarea
                    id="codigo"
                    className="min-h-48 font-mono"
                    spellCheck={false}
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="entrada">Entrada estándar</FieldLabel>
                  <Textarea
                    id="entrada"
                    className="font-mono"
                    spellCheck={false}
                    value={entrada}
                    onChange={(e) => setEntrada(e.target.value)}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="tiempo">Tiempo (ms)</FieldLabel>
                    <Input
                      id="tiempo"
                      type="number"
                      min={100}
                      max={10000}
                      value={tiempo}
                      onChange={(e) => setTiempo(Number(e.target.value))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="memoria">Memoria (MB)</FieldLabel>
                    <Input
                      id="memoria"
                      type="number"
                      min={16}
                      max={1024}
                      value={memoria}
                      onChange={(e) => setMemoria(Number(e.target.value))}
                    />
                  </Field>
                </div>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Ejecutando…' : 'Ejecutar'}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Escenarios de aislamiento</CardTitle>
              <CardDescription>
                Cargan un programa en Python que el sandbox debe frenar.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {ESCENARIOS.map((e) => (
                <Button
                  key={e.nombre}
                  type="button"
                  variant="secondary"
                  onClick={() => cargarEscenario(e.codigo)}
                >
                  {e.nombre}
                </Button>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Resultado</CardTitle>
            </CardHeader>
            <CardContent>
              {data ? (
                <Resultado datos={data} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aún no se ha ejecutado nada.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
