import path from 'node:path'
import { loadEnvFile } from 'node:process'
import { defineConfig } from 'prisma/config'

try { loadEnvFile(path.join(process.cwd(), '.env')) } catch {}

export default defineConfig({
  earlyAccess: true,
  schema: path.join('prisma', 'schema.prisma'),
})
