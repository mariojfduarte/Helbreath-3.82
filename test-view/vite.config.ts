import { defineConfig, Plugin } from 'vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Vite plugin that serves game asset files from Binaries/.
 *   /sprites/*.pak  → Binaries/Game/SPRITES/*.pak
 *   /mapdata/*.amd  → Binaries/Game/MAPDATA/*.amd, else Binaries/Server/MAPDATA/*.amd
 * Assets live under Binaries/Game (and optionally Binaries/Server for mapdata).
 */
function serveGameAssets(): Plugin {
  const binariesDir = path.resolve(__dirname, '..', 'Binaries')
  const gameDir = path.join(binariesDir, 'Game')
  const serverDir = path.join(binariesDir, 'Server')

  const spriteDir = path.join(gameDir, 'SPRITES')
  const gameMapDir = path.join(gameDir, 'MAPDATA')
  const serverMapDir = path.join(serverDir, 'MAPDATA')

  return {
    name: 'serve-game-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || ''

        if (url.startsWith('/sprites/')) {
          const fileName = decodeURIComponent(url.slice('/sprites/'.length))
          const spriteDirRes = path.resolve(spriteDir)
          const filePath = path.resolve(spriteDir, fileName)
          if (filePath !== spriteDirRes && !filePath.startsWith(spriteDirRes + path.sep)) return next()
          serveFileOrDir(res, filePath, '.pak', 'application/octet-stream')
          return
        }

        if (url.startsWith('/mapdata/')) {
          const fileName = decodeURIComponent(url.slice('/mapdata/'.length))
          const gameMapDirRes = path.resolve(gameMapDir)
          const serverMapDirRes = path.resolve(serverMapDir)
          const primary = path.resolve(gameMapDir, fileName)
          const fallback = path.resolve(serverMapDir, fileName)
          const allowed = (p: string, dir: string) => p === dir || p.startsWith(dir + path.sep)
          let filePath: string | null = null
          if (fs.existsSync(primary) && allowed(primary, gameMapDirRes)) filePath = primary
          else if (fs.existsSync(fallback) && allowed(fallback, serverMapDirRes)) filePath = fallback
          if (!filePath) {
            res.statusCode = 404
            res.end('Not found: ' + fileName)
            return
          }
          serveFile(res, filePath, 'application/octet-stream')
          return
        }

        next()
      })
    }
  }

  function serveFile(res: any, filePath: string, contentType: string) {
    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) {
      res.statusCode = 404
      res.end('Not found')
      return
    }
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Length', stat.size.toString())
    res.setHeader('Cache-Control', 'public, max-age=3600')
    fs.createReadStream(filePath).pipe(res)
  }

  function serveFileOrDir(res: any, filePath: string, ext: string, contentType: string) {
    if (!fs.existsSync(filePath)) {
      res.statusCode = 404
      res.end('Not found: ' + path.basename(filePath))
      return
    }
    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) {
      const files = fs.readdirSync(filePath)
        .filter(f => f.toLowerCase().endsWith(ext))
        .sort()
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(files))
      return
    }
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Length', stat.size.toString())
    res.setHeader('Cache-Control', 'public, max-age=3600')
    fs.createReadStream(filePath).pipe(res)
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
