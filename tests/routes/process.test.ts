import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('process route server functions', () => {
  const filePath = path.join(process.cwd(), 'src/routes/process.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  it('imports createAdminFn from auth-middleware', () => {
    expect(content).toMatch(/import\s*\{[^}]*createAdminFn[^}]*\}\s*from\s*['"]@\/lib\/auth-middleware['"]/)
  })

  it('defines getProcessDocument as a GET server function', () => {
    expect(content).toMatch(/const\s+getProcessDocument\s*=\s*createAdminFn\(\{/)
    expect(content).toMatch(/getProcessDocument\s*=\s*createAdminFn\(\{\s*method:\s*['"]GET['"]/)
  })

  it('defines saveProcessDocument as a POST server function with inputValidator', () => {
    expect(content).toMatch(/const\s+saveProcessDocument\s*=\s*createAdminFn\(\{/)
    expect(content).toMatch(/saveProcessDocument\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/)
    expect(content).toMatch(/saveProcessDocument[\s\S]*?\.inputValidator\(/)
  })

  it('reads process document via prisma.processDocument.findUnique', () => {
    expect(content).toMatch(/prisma\.processDocument\.findUnique/)
    expect(content).toMatch(/where:\s*\{\s*id:\s*['"]process['"]/)
  })

  it('saves process document via prisma.processDocument.upsert', () => {
    expect(content).toMatch(/prisma\.processDocument\.upsert/)
  })

  it('creates the route at /process', () => {
    expect(content).toMatch(/createFileRoute\(['"]\/process['"]\)/)
  })
})
