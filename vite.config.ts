import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
// import netlify from '@netlify/vite-plugin-tanstack-start'
import { nitroV2Plugin } from '@tanstack/nitro-v2-vite-plugin'

const config = defineConfig({
  plugins: [
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    nitroV2Plugin({
      preset: 'vercel',
      compatibilityDate: '2025-10-01',
      externals: {
        external: [
          ".prisma", // ignore Prisma internals
          "@prisma/client", // don't bundle Prisma
          "process", // don't bundle "process"
        ],
      },
    }),
    // netlify(),
    viteReact(),
  ],
})

export default config
