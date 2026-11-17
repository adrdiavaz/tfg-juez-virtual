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
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routeTree } from '../routeTree.gen'

const invalidLink = () =>
  new AxiosError(
    'error',
    undefined,
    {} as InternalAxiosRequestConfig,
    undefined,
    {
      status: 400,
      data: { detail: { code: 'invalid_link' } },
    } as AxiosResponse,
  )

let linkIsValid: boolean
const requests: { url?: string; data?: unknown }[] = []

vi.mock('@/api/client', () => ({
  axiosInstance: { interceptors: { response: { use: vi.fn() } } },
  apiClient: async (config: AxiosRequestConfig) => {
    requests.push({ url: config.url, data: config.data })
    if (config.url === '/auth/me') {
      throw new AxiosError('', undefined, undefined, undefined, {
        status: 401,
      } as AxiosResponse)
    }
    if (
      config.url === '/auth/activation' &&
      config.method?.toLowerCase() === 'get'
    ) {
      if (!linkIsValid) throw invalidLink()
      return { email: 'usuario1@ejemplo.es' }
    }
    if (!linkIsValid) throw invalidLink()
    return undefined
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

beforeEach(() => {
  linkIsValid = true
  requests.length = 0
})

describe('activación de cuenta', () => {
  it('muestra el correo de la cuenta y activa con la contraseña indicada', async () => {
    const user = userEvent.setup()
    const router = renderAt('/activate?token=abc')

    expect(await screen.findByLabelText('Correo electrónico')).toHaveValue(
      'usuario1@ejemplo.es',
    )
    await user.type(screen.getByLabelText('Contraseña'), 'contraseña-larga')
    await user.type(
      screen.getByLabelText('Repite la contraseña'),
      'contraseña-larga',
    )
    await user.click(screen.getByRole('button', { name: 'Activar cuenta' }))

    expect(
      await screen.findByRole('heading', { name: 'Inicia sesión' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(requests).toContainEqual({
      url: '/auth/activation',
      data: { token: 'abc', password: 'contraseña-larga' },
    })
  })

  it('indica qué corregir si las contraseñas no coinciden o son cortas', async () => {
    const user = userEvent.setup()
    renderAt('/activate?token=abc')

    await user.type(await screen.findByLabelText('Contraseña'), 'corta')
    await user.type(screen.getByLabelText('Repite la contraseña'), 'otra')
    await user.click(screen.getByRole('button', { name: 'Activar cuenta' }))

    expect(await screen.findByText(/al menos 8 caracteres/)).toBeInTheDocument()
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeVisible()
    expect(requests.some((r) => r.url === '/auth/activation' && r.data)).toBe(
      false,
    )
  })

  it.each(['/activate?token=abc', '/activate'])(
    'un enlace no válido (%s) lo indica',
    async (path) => {
      linkIsValid = false
      renderAt(path)

      expect(
        await screen.findByRole('heading', { name: 'Enlace no válido' }),
      ).toBeInTheDocument()
    },
  )
})

describe('restablecimiento de contraseña', () => {
  it('desde el inicio de sesión se llega a la solicitud', async () => {
    const user = userEvent.setup()
    renderAt('/login')

    await user.click(
      await screen.findByRole('link', { name: '¿Has olvidado tu contraseña?' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Restablece tu contraseña' }),
    ).toBeInTheDocument()
  })

  it('tras la solicitud muestra el mensaje neutro', async () => {
    const user = userEvent.setup()
    renderAt('/forgot-password')

    await user.type(
      await screen.findByLabelText('Identificador o correo'),
      'nadie@ejemplo.es',
    )
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Si existe una cuenta activa con ese dato, recibirás un enlace en tu correo.',
    )
    expect(requests).toContainEqual({
      url: '/auth/password-reset',
      data: { credential: 'nadie@ejemplo.es' },
    })
  })

  it('guarda la nueva contraseña desde un enlace válido', async () => {
    const user = userEvent.setup()
    renderAt('/reset-password?token=xyz')

    await user.type(
      await screen.findByLabelText('Nueva contraseña'),
      'nueva-contraseña',
    )
    await user.type(
      screen.getByLabelText('Repite la contraseña'),
      'nueva-contraseña',
    )
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(
      await screen.findByRole('heading', { name: 'Inicia sesión' }),
    ).toBeInTheDocument()
    expect(requests).toContainEqual({
      url: '/auth/password-reset/confirm',
      data: { token: 'xyz', password: 'nueva-contraseña' },
    })
  })

  it('un enlace caducado o usado se indica al guardar', async () => {
    linkIsValid = false
    const user = userEvent.setup()
    renderAt('/reset-password?token=xyz')

    await user.type(
      await screen.findByLabelText('Nueva contraseña'),
      'nueva-contraseña',
    )
    await user.type(
      screen.getByLabelText('Repite la contraseña'),
      'nueva-contraseña',
    )
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(
      await screen.findByRole('heading', { name: 'Enlace no válido' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Solicitar un enlace nuevo' }),
    ).toBeInTheDocument()
  })
})
