import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom no implementa scrollTo y el router lo invoca al navegar
window.scrollTo = () => {}

afterEach(() => {
  cleanup()
})
