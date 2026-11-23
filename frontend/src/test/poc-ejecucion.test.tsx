import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import type { AxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import { axiosInstance } from '@/api/client'
import { routeTree } from '../routeTree.gen'

const adaptadorOriginal = axiosInstance.defaults.adapter

function responderCon(data: unknown) {
  const peticiones: unknown[] = []
  axiosInstance.defaults.adapter = async (config: AxiosRequestConfig) => {
    peticiones.push(JSON.parse(config.data as string))
    return { data, status: 200, statusText: 'OK', headers: {}, config } as never
  }
  return peticiones
}

function renderizarPagina() {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/poc/ejecucion'] }),
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('página de prueba de ejecución', () => {
  afterEach(() => {
    axiosInstance.defaults.adapter = adaptadorOriginal
  })

  it('muestra el veredicto y la salida tras ejecutar', async () => {
    responderCon({
      compilacion: null,
      ejecucion: {
        estado: 'Time Limit Exceeded',
        codigo_salida: -1,
        tiempo_ms: 500,
        memoria_kb: 1024,
        stdout: 'parcial',
        stderr: '',
      },
    })
    renderizarPagina()

    await userEvent.click(
      await screen.findByRole('button', { name: 'Ejecutar' }),
    )

    expect(await screen.findByText('Tiempo excedido')).toBeInTheDocument()
    expect(screen.getByText('parcial')).toBeInTheDocument()
  })

  it('entrega una solución y muestra el resultado de cada test', async () => {
    const peticiones = responderCon({
      veredicto: 'error_ejecucion',
      ejecucion: {
        estado: 'Nonzero Exit Status',
        codigo_salida: 1,
        tiempo_ms: 90,
        memoria_kb: 16000,
        stdout: '1 failed, 1 passed',
        stderr: '',
      },
      pruebas: [
        {
          nombre: 'test_primos',
          resultado: 'errored',
          tiempo_ms: 0,
          mensaje: 'RuntimeError: sin terminar',
        },
        {
          nombre: 'test_fibonacci',
          resultado: 'passed',
          tiempo_ms: 1,
          mensaje: '',
        },
      ],
    })
    renderizarPagina()

    await userEvent.click(await screen.findByRole('tab', { name: 'Tests' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Ejecutar tests' }),
    )

    expect(await screen.findByText('Error de ejecución')).toBeInTheDocument()
    expect(screen.getByText('test_primos')).toBeInTheDocument()
    expect(screen.getByText('RuntimeError: sin terminar')).toBeInTheDocument()
    expect(screen.getByText('Pasa')).toBeInTheDocument()
    expect(peticiones[0]).toMatchObject({
      framework: 'pytest',
      tests: { 'test_solucion.py': expect.stringContaining('def test_primos') },
    })
  })
})
