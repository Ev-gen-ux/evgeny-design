import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { mediaQueries } from './src/tokens/generated.ts'

const sourcePath = fileURLToPath(new URL('./design-tokens.json', import.meta.url))

export default defineConfig({
  plugins: [
    {
      name: 'portfolio-design-tokens',
      enforce: 'pre',
      transform(code, id) {
        if (!/\.css(?:\?|$)/.test(id)) return
        return code.replace(/\(--(viewport-[\w-]+)\)/g, (_match, name: string) => {
          const query = mediaQueries[name as keyof typeof mediaQueries]
          if (!query) throw new Error(`Unknown media token: ${name}`)
          return query
        })
      },
      configureServer(server) {
        server.watcher.add(sourcePath)
        server.watcher.on('change', (path) => {
          if (path !== sourcePath) return
          execFileSync(process.execPath, ['scripts/generate-tokens.mjs'], { stdio: 'inherit' })
          void server.restart()
        })
      },
    },
    react(),
  ],
})
