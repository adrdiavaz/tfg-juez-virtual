import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TeacherOut } from '@/api/generated/model'
import { routeTree } from '../routeTree.gen'

const admin = {
  id: 100,
  username: 'admin',
  first_name: 'Admin',
  last_name: '',
  role: 'admin',
}

const fixtures = (): TeacherOut[] => [
  {
    id: 1,
    identifier: 'ana',
    email: 'ana@ejemplo.es',
    first_name: 'Ana',
    last_name: 'Pérez',
    status: 'active',
  },
  {
    id: 2,
    identifier: 'luis',
    email: 'luis@ejemplo.es',
    first_name: 'Luis',
    last_name: 'Gómez',
    status: 'pending',
  },
  {
    id: 3,
    identifier: 'marta',
    email: 'marta@ejemplo.es',
    first_name: 'Marta',
    last_name: 'Ruiz',
    status: 'disabled',
  },
]

let teachers: TeacherOut[]
let invitationSent: boolean
let holdCreate: Promise<void> | null
const requests: {
  method?: string
  url?: string
  data?: unknown
  params?: Record<string, unknown>
}[] = []

const many = (count: number): TeacherOut[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    identifier: `prof${i + 1}`,
    email: `prof${i + 1}@ejemplo.es`,
    first_name: 'Prof',
    last_name: `N${i + 1}`,
    status: 'active',
  }))

const apiError = (status: number, code: string) =>
  new AxiosError(
    'error',
    undefined,
    {} as InternalAxiosRequestConfig,
    undefined,
    { status, data: { detail: { code } } } as AxiosResponse,
  )

vi.mock('@/api/client', () => ({
  axiosInstance: { interceptors: { response: { use: vi.fn() } } },
  apiClient: async (config: AxiosRequestConfig) => {
    const method = config.method?.toLowerCase()
    requests.push({
      method,
      url: config.url,
      data: config.data,
      params: config.params,
    })
    if (config.url === '/auth/me') return admin
    if (config.url === '/teachers' && method === 'get') {
      const { page = 1, page_size = 10, search, status } = config.params ?? {}
      const found = teachers.filter(
        (t) =>
          (!status || t.status === status) &&
          (!search ||
            `${t.first_name} ${t.last_name} ${t.identifier} ${t.email}`
              .toLowerCase()
              .includes(search.toLowerCase())),
      )
      return {
        items: found.slice((page - 1) * page_size, page * page_size),
        total: found.length,
        page,
        page_size,
      }
    }
    if (config.url === '/teachers' && method === 'post') {
      if (config.data.identifier === 'ana') {
        throw apiError(409, 'identifier_taken')
      }
      await holdCreate
      const teacher: TeacherOut = { ...config.data, id: 9, status: 'pending' }
      teachers.push(teacher)
      return { teacher, invitation_sent: invitationSent }
    }
    const [, id, action] =
      /^\/teachers\/(\d+)(?:\/(\w+))?$/.exec(config.url ?? '') ?? []
    const teacher = teachers.find((t) => t.id === Number(id))!
    if (action === 'invitation') return { invitation_sent: true }
    if (action === 'deactivate') teacher.status = 'disabled'
    if (action === 'reactivate') teacher.status = 'active'
    if (method === 'patch') {
      const emailChanged = teacher.email !== config.data.email
      Object.assign(teacher, config.data)
      const resent = emailChanged && teacher.status === 'pending'
      return { teacher, invitation_sent: resent ? invitationSent : null }
    }
    return teacher
  },
}))

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: ['/admin/teachers'] }),
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

const posted = (url: string) => requests.find((r) => r.url === url)
const lastList = () =>
  requests.filter((r) => r.url === '/teachers' && r.method === 'get').at(-1)

beforeEach(() => {
  teachers = fixtures()
  invitationSent = true
  holdCreate = null
  requests.length = 0
})

describe('gestión de profesores', () => {
  it('lista a los profesores con su estado y la acción que corresponde a cada uno', async () => {
    renderPage()

    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument()
    expect(screen.getByText('Pendiente de activación')).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Desactivar Ana Pérez' }),
    ).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Reenviar invitación a Luis Gómez' }),
    ).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Reactivar Marta Ruiz' }),
    ).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Desactivar Luis Gómez' }),
    ).not.toBeInTheDocument()
  })

  it('busca en el servidor, ignorando mayúsculas', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByLabelText('Buscar profesor'), 'ANA P')

    await waitFor(() =>
      expect(screen.queryByText('Luis Gómez')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('Ana Pérez')).toBeVisible()
    expect(lastList()?.params).toMatchObject({ page: 1, search: 'ANA P' })
  })

  it('muestra que no hay coincidencias', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByLabelText('Buscar profesor'), 'zzz')

    expect(
      await screen.findByText('Ningún profesor coincide con la búsqueda'),
    ).toBeVisible()
  })

  describe('paginación', () => {
    beforeEach(() => {
      teachers = many(25)
    })

    it('muestra la primera página y navega entre páginas', async () => {
      const user = userEvent.setup()
      renderPage()

      expect(await screen.findByText('Mostrando 1–10 de 25')).toBeVisible()
      expect(screen.getByText('Página 1 de 3')).toBeVisible()
      expect(screen.getByRole('button', { name: /Anterior/ })).toBeDisabled()

      await user.click(screen.getByRole('button', { name: /Siguiente/ }))
      expect(await screen.findByText('Mostrando 11–20 de 25')).toBeVisible()
      expect(lastList()?.params).toMatchObject({ page: 2, page_size: 10 })

      await user.click(screen.getByRole('button', { name: /Siguiente/ }))
      expect(await screen.findByText('Mostrando 21–25 de 25')).toBeVisible()
      expect(screen.getByRole('button', { name: /Siguiente/ })).toBeDisabled()
    })

    it('una búsqueda nueva vuelve a la primera página sin pedir antes otra', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.click(await screen.findByRole('button', { name: /Siguiente/ }))
      await screen.findByText('Mostrando 11–20 de 25')

      await user.type(screen.getByLabelText('Buscar profesor'), 'N2')

      expect(await screen.findByText('Mostrando 1–7 de 7')).toBeVisible()
      expect(
        requests.some((r) => r.params?.search && r.params.page !== 1),
      ).toBe(false)
    })

    it('retrocede si la página actual deja de existir', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.click(await screen.findByRole('button', { name: /Siguiente/ }))
      await user.click(await screen.findByRole('button', { name: /Siguiente/ }))
      await screen.findByText('Mostrando 21–25 de 25')

      teachers = teachers.slice(0, 20) // otro administrador los da de baja
      window.dispatchEvent(new Event('visibilitychange'))

      expect(await screen.findByText('Mostrando 11–20 de 20')).toBeVisible()
    })
  })

  it('desactiva una cuenta desde su fila y refresca el listado', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Desactivar Ana Pérez' }),
    )

    expect(
      await screen.findByRole('button', { name: 'Reactivar Ana Pérez' }),
    ).toBeVisible()
    expect(posted('/teachers/1/deactivate')?.method).toBe('post')
  })

  it('edita los datos de un profesor', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Editar Ana Pérez' }),
    )
    const name = await screen.findByLabelText('Nombre')
    expect(name).toHaveValue('Ana')
    await user.clear(name)
    await user.type(name, 'Anabel')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Anabel Pérez')).toBeVisible()
    expect(posted('/teachers/1')?.data).toEqual({
      first_name: 'Anabel',
      last_name: 'Pérez',
      identifier: 'ana',
      email: 'ana@ejemplo.es',
    })
  })

  describe('alta', () => {
    async function fillAndSubmit(identifier: string) {
      const user = userEvent.setup()
      await user.click(
        await screen.findByRole('button', { name: 'Dar de alta profesor' }),
      )
      await user.type(await screen.findByLabelText('Nombre'), 'Eva')
      await user.type(screen.getByLabelText('Apellidos'), 'Sanz')
      await user.type(
        screen.getByLabelText('Identificador o nombre de usuario'),
        identifier,
      )
      await user.type(
        screen.getByLabelText('Correo electrónico'),
        'eva@ejemplo.es',
      )
      await user.click(
        screen.getByRole('button', { name: 'Dar de alta y enviar invitación' }),
      )
      return user
    }

    it('indica qué dato corregir si falta alguno y no llama al servidor', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.click(
        await screen.findByRole('button', { name: 'Dar de alta profesor' }),
      )
      await user.click(
        await screen.findByRole('button', {
          name: 'Dar de alta y enviar invitación',
        }),
      )

      expect(await screen.findByText('Introduce el nombre.')).toBeVisible()
      expect(
        screen.getByText('Introduce un correo electrónico válido.'),
      ).toBeVisible()
      expect(requests.some((r) => r.method === 'post')).toBe(false)
    })

    it('muestra en el campo el identificador que pertenece a otra cuenta', async () => {
      renderPage()
      await fillAndSubmit('ana')

      expect(
        await screen.findByText(
          'Este identificador ya pertenece a otra cuenta.',
        ),
      ).toBeVisible()
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    it('si la invitación no se envía, avisa y permite reenviarla', async () => {
      invitationSent = false
      renderPage()
      const user = await fillAndSubmit('eva')

      expect(
        await screen.findByText(
          /se ha creado, pero la invitación no se ha enviado/,
        ),
      ).toBeVisible()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: 'Reenviar invitación' }),
      )

      expect(
        await screen.findByRole('button', { name: 'Dar de alta profesor' }),
      ).toBeVisible()
      expect(
        screen.queryByText(/se ha creado, pero la invitación no se ha enviado/),
      ).not.toBeInTheDocument()
      expect(posted('/teachers/9/invitation')?.method).toBe('post')
    })
  })

  it('al cambiar el correo de una cuenta pendiente avisa si la invitación no sale', async () => {
    invitationSent = false
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Editar Luis Gómez' }),
    )
    const email = await screen.findByLabelText('Correo electrónico')
    await user.clear(email)
    await user.type(email, 'luis.bien@ejemplo.es')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(
      await screen.findByText(/No se ha podido enviar la invitación a luis/),
    ).toBeVisible()
  })

  it('el aviso de invitación no enviada se puede cerrar', async () => {
    invitationSent = false
    const user = userEvent.setup()
    renderPage()
    await user.click(
      await screen.findByRole('button', { name: 'Editar Luis Gómez' }),
    )
    const email = await screen.findByLabelText('Correo electrónico')
    await user.clear(email)
    await user.type(email, 'luis.bien@ejemplo.es')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByText(/No se ha podido enviar la invitación/)

    await user.click(screen.getByRole('button', { name: 'Cerrar aviso' }))

    expect(
      screen.queryByText(/No se ha podido enviar la invitación/),
    ).not.toBeInTheDocument()
  })

  it('no deja cerrar el diálogo mientras se guarda, para no perder la respuesta', async () => {
    invitationSent = false
    let release = () => {}
    holdCreate = new Promise((resolve) => (release = resolve))
    const user = userEvent.setup()
    renderPage()
    await user.click(
      await screen.findByRole('button', { name: 'Dar de alta profesor' }),
    )
    await user.type(await screen.findByLabelText('Nombre'), 'Eva')
    await user.type(screen.getByLabelText('Apellidos'), 'Sanz')
    await user.type(
      screen.getByLabelText('Identificador o nombre de usuario'),
      'eva',
    )
    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'eva@ejemplo.es',
    )
    await user.click(
      screen.getByRole('button', { name: 'Dar de alta y enviar invitación' }),
    )

    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeVisible()

    release()
    expect(
      await screen.findByText(
        /se ha creado, pero la invitación no se ha enviado/,
      ),
    ).toBeVisible()
  })
})
