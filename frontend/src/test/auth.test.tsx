import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserPublic } from '@/api/generated/model'
import { routeTree } from '../routeTree.gen'

const student: UserPublic = {
  id: 1,
  username: 'usuario1',
  first_name: 'Ana',
  last_name: 'Gil',
  role: 'student',
}

const httpError = (status: number, data?: unknown) =>
  new AxiosError('error', undefined, undefined, undefined, {
    status,
    data,
  } as AxiosResponse)

let session: UserPublic | null
let loginResult: UserPublic | AxiosError
const requests: string[] = []

vi.mock('@/api/client', () => ({
  apiClient: async (config: AxiosRequestConfig) => {
    requests.push(`${config.method} ${config.url}`)
    if (config.url === '/auth/me') {
      if (!session) throw httpError(401)
      return session
    }
    if (config.url === '/auth/login') {
      if (loginResult instanceof AxiosError) throw loginResult
      session = loginResult
      return loginResult
    }
    if (config.url === '/auth/logout') {
      session = null
      return undefined
    }
    throw new Error(`petición inesperada: ${config.url}`)
  },
}))

function renderAt(path: string) {
  const queryClient = new QueryClient()
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

async function logIn() {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText(/identificador/i), 'usuario1')
  await user.type(screen.getByLabelText('Contraseña'), 'secreto')
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
}

beforeEach(() => {
  session = null
  loginResult = student
  requests.length = 0
})

describe('autenticación', () => {
  it('sin sesión, una vista protegida lleva al inicio de sesión', async () => {
    const router = renderAt('/teacher')

    expect(
      await screen.findByRole('heading', { name: 'Inicia sesión' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it.each([
    [
      401,
      'invalid_credentials',
      /No es posible iniciar sesión con estos datos/,
    ],
    [403, 'account_pending', /pendiente de activación/],
    [403, 'account_disabled', /desactivada/],
  ])('%i %s muestra su aviso', async (status, code, message) => {
    loginResult = httpError(status, { detail: { code } })
    renderAt('/login')
    await logIn()

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })

  it('un inicio de sesión correcto lleva al inicio del rol', async () => {
    const router = renderAt('/login')
    await logIn()

    expect(
      await screen.findByRole('heading', { name: 'Inicio' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/student')
  })

  it('un estudiante que accede por URL a una vista de profesor no ve su contenido', async () => {
    session = student
    const router = renderAt('/teacher')

    expect(
      await screen.findByRole('heading', { name: 'Inicio' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Panel' })).toBeNull()
    expect(router.state.location.pathname).toBe('/student')
  })

  it('Salir invalida la sesión en el servidor y vuelve al inicio de sesión', async () => {
    session = student
    renderAt('/student')
    await userEvent.click(await screen.findByRole('button', { name: /salir/i }))

    expect(
      await screen.findByRole('heading', { name: 'Inicia sesión' }),
    ).toBeInTheDocument()
    expect(requests).toContain('POST /auth/logout')
  })
})
