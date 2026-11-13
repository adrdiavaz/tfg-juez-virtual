import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { axiosInstance } from './api/client'
import { routeTree } from './routeTree.gen'

export const queryClient = new QueryClient()

export const router = createRouter({ routeTree, context: { queryClient } })

export function redirectOnUnauthorized(error: unknown) {
  if (
    isAxiosError(error) &&
    error.response?.status === 401 &&
    !error.config?.url?.startsWith('/auth/')
  ) {
    queryClient.clear()
    void router.navigate({ to: '/login' })
  }
  return Promise.reject(error)
}

axiosInstance.interceptors.response.use(undefined, redirectOnUnauthorized)

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
