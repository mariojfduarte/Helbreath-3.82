import { defineConfig, Plugin } from 'vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Vite plugin that serves game asset files from Binaries/Game/.
 * Maps:
 *   /sprites/*.pak  → Binaries/Game/SPRITES/*.pak
 *   /mapdata/*.amd  → Binaries/Game/MAPDATA/*.amd
 */
function serveGameAssets(): Plugin {
  const gameDir = path.resolve(__dirname, '..', 'Binaries', 'Game')

  const routes: Record<string, { dir: string; ext: string }> = {
    '/sprites/': { dir: path.join(gameDir, 'SPRITES'), ext: '.pak' },
    '/mapdata/': { dir: path.join(gameDir, 'MAPDATA'), ext: '.amd' },
  }

  return {
    name: 'serve-game-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || ''

        // Find matching route
        const route = Object.entries(routes).find(([prefix]) => url.startsWith(prefix))
        if (!route) return next()

        const [prefix, { dir, ext }] = route
        const fileName = decodeURIComponent(url.slice(prefix.length))
        const filePath = path.join(dir, fileName)

        // Security: no path traversal
        if (!filePath.startsWith(dir)) return next()

        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath)

          // Directory listing
          if (stat.isDirectory()) {
            const files = fs.readdirSync(filePath)
              .filter(f => f.toLowerCase().endsWith(ext))
              .sort()
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(files))
            return
          }

          res.setHeader('Content-Type', 'application/octet-stream')
          res.setHeader('Content-Length', stat.size.toString())
          res.setHeader('Cache-Control', 'public, max-age=3600')
          fs.createReadStream(filePath).pipe(res)
        } else {
          res.statusCode = 404
          res.end('Not found: ' + fileName)
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [serveGameAssets()],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        map: path.resolve(__dirname, 'map.html'),
      },
    },
  },
})
