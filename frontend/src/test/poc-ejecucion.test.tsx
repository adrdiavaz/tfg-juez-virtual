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
  axiosInstance.defaults.adapter = async (config: AxiosRequestConfig) =>
    ({ data, status: 200, statusText: 'OK', headers: {}, config }) as never
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
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/poc/ejecucion'] }),
    })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    await userEvent.click(
      await screen.findByRole('button', { name: 'Ejecutar' }),
    )

    expect(await screen.findByText('Tiempo excedido')).toBeInTheDocument()
    expect(screen.getByText('parcial')).toBeInTheDocument()
  })
})
