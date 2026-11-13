import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import {
  AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserPublic } from '@/api/generated/model'
import { routeTree } from '../routeTree.gen'
import {
  queryClient as appQueryClient,
  redirectOnUnauthorized,
  router as appRouter,
} from '../router'

const student: UserPublic = {
  id: 1,
  username: 'usuario1',
  first_name: 'Ana',
  last_name: 'Gil',
  role: 'student',
}

const httpError = (status: number, data?: unknown, url?: string) =>
  new AxiosError(
    'error',
    undefined,
    { url } as InternalAxiosRequestConfig,
    undefined,
    { status, data } as AxiosResponse,
  )

let session: UserPublic | null
let loginResult: UserPublic | AxiosError
let meError: AxiosError | null
let logoutFails: boolean
const requests: string[] = []

vi.mock('@/api/client', () => ({
  axiosInstance: { interceptors: { response: { use: vi.fn() } } },
  apiClient: async (config: AxiosRequestConfig) => {
    requests.push(`${config.method} ${config.url}`)
    if (config.url === '/auth/me') {
      if (meError) throw meError
      if (!session) throw httpError(401)
      return session
    }
    if (config.url === '/auth/login') {
      if (loginResult instanceof AxiosError) throw loginResult
      session = loginResult
      return loginResult
    }
    if (config.url === '/auth/logout') {
      if (logoutFails) throw httpError(500)
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
  meError = null
  logoutFails = false
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

  it('si falla Salir, avisa y no abandona la vista', async () => {
    session = student
    logoutFails = true
    const router = renderAt('/student')
    await userEvent.click(await screen.findByRole('button', { name: /salir/i }))

    expect(
      await screen.findByText(/No se pudo cerrar la sesión/),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/student')
  })

  it('un error del servidor al comprobar la sesión no lleva al inicio de sesión', async () => {
    meError = httpError(500)
    const router = renderAt('/student')

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/student')
  })
})

describe('redirectOnUnauthorized', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('un 401 fuera de /auth/ limpia la caché y vuelve al inicio de sesión', async () => {
    const navigate = vi.spyOn(appRouter, 'navigate').mockResolvedValue()
    const clear = vi.spyOn(appQueryClient, 'clear')

    await expect(
      redirectOnUnauthorized(httpError(401, undefined, '/teacher/activities')),
    ).rejects.toBeInstanceOf(AxiosError)
    expect(clear).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith({ to: '/login' })
  })

  it.each([
    [401, '/auth/me'],
    [403, '/teacher/activities'],
  ])('un %i en %s no redirige', async (status, url) => {
    const navigate = vi.spyOn(appRouter, 'navigate').mockResolvedValue()

    await expect(
      redirectOnUnauthorized(httpError(status, undefined, url)),
    ).rejects.toBeInstanceOf(AxiosError)
    expect(navigate).not.toHaveBeenCalled()
  })
})
