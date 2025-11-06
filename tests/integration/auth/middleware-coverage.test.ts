import { describe, it } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Recursively find all .tsx files in a directory
function findTsxFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir)

  files.forEach((file) => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      findTsxFiles(filePath, fileList)
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath)
    }
  })

  return fileList
}

describe('Middleware Coverage', () => {
  it('should ensure we do not use the default createServerFn', () => {
    // Recursively find all .tsx and .ts files in src/
    const srcDir = path.join(process.cwd(), 'src')
    const allFiles = findTsxFiles(srcDir)

    const violations: Array<{ file: string; lines: string[] }> = []

    allFiles.forEach((filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8')
      const relativePath = path.relative(process.cwd(), filePath)

      // Skip the auth-middleware file itself (it defines the wrappers)
      if (relativePath.includes('auth-middleware')) {
        return
      }

      // Check if file uses createServerFn
      if (/import.*createServerFn/.test(content)) {
        // Look for direct usage of createServerFn without middleware
        // Pattern matches: createServerFn({ or createServerFn().
        const directServerFnPattern = /const\s+\w+\s*=\s*createServerFn\s*\(/g
        const matches = content.match(directServerFnPattern)

        if (matches) {
          // Check if the file also uses createAuthenticatedFn or createUserFn
          const usesAuthFn = /create(Authenticated|User)Fn/.test(content)

          if (!usesAuthFn) {
            // File uses createServerFn directly without any auth middleware
            violations.push({
              file: relativePath,
              lines: matches,
            })
          } else {
            // File has both - need to check if the specific function uses middleware
            // For now, flag it for manual review
            const lines = content.split('\n')
            const problematicLines: string[] = []

            lines.forEach((line, index) => {
              if (/const\s+\w+\s*=\s*createServerFn\s*\(/.test(line)) {
                // This is a direct createServerFn call - might be unprotected
                problematicLines.push(`Line ${index + 1}: ${line.trim()}`)
              }
            })

            if (problematicLines.length > 0) {
              violations.push({
                file: relativePath,
                lines: problematicLines,
              })
            }
          }
        }
      }
    })

    if (violations.length > 0) {
      const errorMessage = violations
        .map(
          (v) =>
            `\n${v.file}:\n  ${v.lines.join('\n  ')}\n  → This file uses createServerFn without auth middleware!`,
        )
        .join('\n')

      throw new Error(
        `Found ${violations.length} file(s) with unprotected server functions:${errorMessage}`,
      )
    }
  })
})
