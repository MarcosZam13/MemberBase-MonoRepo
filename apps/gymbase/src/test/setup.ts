import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/dom'

afterEach(() => {
  cleanup()
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
      auth: { getSession: vi.fn(), onAuthStateChange: vi.fn() },
    })),
  createServerClient: vi.fn(),
}))

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))