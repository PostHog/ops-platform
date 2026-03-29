import { vi } from 'vitest'

// Stores the last handler registered via the builder chain
let lastRegisteredHandler: ((...args: unknown[]) => unknown) | null = null
// validator captured but not yet exposed — add getLastRegisteredValidator() when needed

export function getLastRegisteredHandler() {
  return lastRegisteredHandler
}

export function resetHandlerCapture() {
  lastRegisteredHandler = null
  // validator reset
}

// Builder chain that mimics createServerFn().middleware([...]).inputValidator(...).handler(...)
function createBuilderChain() {
  const chain = {
    middleware: () => chain,
    inputValidator: (_validator: (data: unknown) => unknown) => {
      // validator captured
      return chain
    },
    handler: (fn: (...args: unknown[]) => unknown) => {
      lastRegisteredHandler = fn
      // Return a callable that also has the builder methods
      const callable = vi.fn(async (...args: unknown[]) => {
        return fn(...args)
      })
      return callable
    },
  }
  return chain
}

const mockCreateServerFn = vi.fn(() => createBuilderChain())
const mockCreateMiddleware = vi.fn(() => ({
  server: vi.fn((fn: unknown) => fn),
}))
const mockGetRequest = vi.fn(() => ({
  headers: new Headers(),
}))
const mockRedirect = vi.fn((opts: unknown) => {
  throw { __isRedirect: true, ...((opts as object) || {}) }
})
const mockCreateFileRoute = vi.fn((path: string) => {
  return (opts: unknown) => ({ ...((opts as object) || {}), path })
})

vi.mock('@tanstack/react-start', () => ({
  createServerFn: mockCreateServerFn,
  createMiddleware: mockCreateMiddleware,
}))

vi.mock('@tanstack/react-start/server', () => ({
  getRequest: mockGetRequest,
}))

vi.mock('@tanstack/react-router', () => ({
  redirect: mockRedirect,
  createFileRoute: mockCreateFileRoute,
  Link: 'a',
  useNavigate: vi.fn(() => vi.fn()),
  useRouter: vi.fn(() => ({ invalidate: vi.fn() })),
  useParams: vi.fn(() => ({})),
  useSearch: vi.fn(() => ({})),
  useLoaderData: vi.fn(() => ({})),
}))

export {
  mockCreateServerFn,
  mockCreateMiddleware,
  mockGetRequest,
  mockRedirect,
  mockCreateFileRoute,
}
