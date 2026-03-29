import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ─── index.tsx ──────────────────────────────────────────────────────────────

describe('index route', () => {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'src/routes/index.tsx'),
    'utf-8',
  )

  it('creates a file route at /', () => {
    expect(content).toMatch(/createFileRoute\('\/'/)
  })

  it('redirects admin users to /org-chart', () => {
    expect(content).toMatch(/ROLES\.ADMIN/)
    expect(content).toMatch(/navigate\(\{.*to:.*\/org-chart/)
  })

  it('redirects org-chart users to /org-chart', () => {
    expect(content).toMatch(/ROLES\.ORG_CHART/)
  })

  it('redirects internal users to their employee page', () => {
    expect(content).toMatch(/\/employee\/\$employeeId/)
  })

  it('redirects unauthenticated users to /login', () => {
    expect(content).toMatch(/navigate\(\{.*to:.*\/login/)
  })

  it('shows "Redirecting..." while loading', () => {
    expect(content).toMatch(/Redirecting/)
  })

  it('uses useSession and useQuery for myEmployeeId', () => {
    expect(content).toMatch(/useSession/)
    expect(content).toMatch(/myEmployeeId/)
  })
})

// ─── login.tsx ──────────────────────────────────────────────────────────────

describe('login route', () => {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'src/routes/login.tsx'),
    'utf-8',
  )

  it('creates a file route at /login', () => {
    expect(content).toMatch(/createFileRoute\('\/login'/)
  })

  it('has Google sign-in button', () => {
    expect(content).toMatch(/Sign in with Google/)
  })

  it('calls signIn.social with google provider', () => {
    expect(content).toMatch(/signIn\.social/)
    expect(content).toMatch(/provider:.*google/)
  })

  it('shows DevLoginForm only in dev mode', () => {
    expect(content).toMatch(/isDevMode && <DevLoginForm/)
  })

  it('redirects authenticated admins to /org-chart', () => {
    expect(content).toMatch(/ROLES\.ADMIN/)
    expect(content).toMatch(/navigate\(\{.*to:.*\/org-chart/)
  })

  it('uses callbackURL and errorCallbackURL', () => {
    expect(content).toMatch(/callbackURL:.*\/login/)
    expect(content).toMatch(/errorCallbackURL:.*\/error/)
  })
})

// ─── error.tsx ──────────────────────────────────────────────────────────────

describe('error route', () => {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'src/routes/error.tsx'),
    'utf-8',
  )

  it('creates a file route at /error', () => {
    expect(content).toMatch(/createFileRoute\('\/error'/)
  })

  it('reads error from search params', () => {
    expect(content).toMatch(/useSearch/)
    expect(content).toMatch(/message.*error_description.*error/)
  })

  it('displays the error message', () => {
    expect(content).toMatch(/errorMessage/)
  })

  it('shows logged-in email hint when session exists', () => {
    expect(content).toMatch(/session\.user\.email/)
    expect(content).toMatch(/work email/)
  })

  it('shows "An error occurred" heading', () => {
    expect(content).toMatch(/An error occurred/)
  })
})

// ─── __root.tsx ─────────────────────────────────────────────────────────────

describe('root route', () => {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'src/routes/__root.tsx'),
    'utf-8',
  )

  it('creates root route with context', () => {
    expect(content).toMatch(/createRootRouteWithContext/)
  })

  it('sets page title to "PostHog Ops"', () => {
    expect(content).toMatch(/PostHog Ops/)
  })

  it('renders Header component', () => {
    expect(content).toMatch(/<Header/)
  })

  it('renders ChatPanel component', () => {
    expect(content).toMatch(/<ChatPanel/)
  })

  it('includes viewport meta tag', () => {
    expect(content).toMatch(/viewport/)
  })

  it('includes favicon link', () => {
    expect(content).toMatch(/favicon\.svg/)
  })

  it('wraps children in main element with overflow', () => {
    expect(content).toMatch(/<main.*overflow-y-auto/)
  })
})

// ─── location-factor-scenarios.tsx ──────────────────────────────────────────

describe('location-factor-scenarios route', () => {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'src/routes/location-factor-scenarios.tsx'),
    'utf-8',
  )

  it('redirects to /payroll-scenarios', () => {
    expect(content).toMatch(/redirect\(\{.*to:.*\/payroll-scenarios/)
  })

  it('renders null component', () => {
    expect(content).toMatch(/component:.*\(\).*=>.*null/)
  })
})
