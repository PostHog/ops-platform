import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('tanstack-query root-provider', () => {
  const content = fs.readFileSync(
    path.join(
      process.cwd(),
      'src/integrations/tanstack-query/root-provider.tsx',
    ),
    'utf-8',
  )

  it('exports getContext function', () => {
    expect(content).toMatch(/export function getContext/)
  })

  it('getContext creates a QueryClient', () => {
    expect(content).toMatch(/new QueryClient/)
  })

  it('exports Provider component', () => {
    expect(content).toMatch(/export function Provider/)
  })

  it('Provider wraps children in QueryClientProvider', () => {
    expect(content).toMatch(/QueryClientProvider/)
  })

  it('accepts queryClient as a prop', () => {
    expect(content).toMatch(/queryClient:\s*QueryClient/)
  })
})
