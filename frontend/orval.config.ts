import { defineConfig } from 'orval'

// Genera hooks de TanStack Query a partir del OpenAPI del backend (pnpm gen:api con el backend arrancado)
export default defineConfig({
  juez: {
    input: 'http://localhost:8000/openapi.json',
    output: {
      mode: 'tags-split',
      target: 'src/api/generated',
      schemas: 'src/api/generated/model',
      client: 'react-query',
      httpClient: 'axios',
      clean: true,
      override: {
        mutator: { path: 'src/api/client.ts', name: 'apiClient' },
      },
    },
  },
})
