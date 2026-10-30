import { render, screen } from '@testing-library/react'
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import { routeTree } from '../routeTree.gen'

describe('ruta de inicio', () => {
  it('muestra el título de la aplicación', async () => {
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    render(<RouterProvider router={router} />)

    expect(
      await screen.findByRole('heading', { name: 'Juez virtual' }),
    ).toBeInTheDocument()
  })
})
