import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

configure({ asyncUtilTimeout: 5000 })

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
