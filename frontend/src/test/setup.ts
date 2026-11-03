import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom no implementa scrollTo y el router lo invoca al navegar
window.scrollTo = () => {}

// jsdom no implementa matchMedia y lo usan sonner y el hook use-mobile
window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }) as unknown as MediaQueryList

afterEach(() => {
  cleanup()
})
