import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// Vite's static MIME table leaves .py without a Content-Type. Explicit UTF-8
// lets browsers display the same Korean source correctly in dev and preview.
function installTextMiddleware(server, directory) {
  server.middlewares.use(async (req, res, next) => {
    const pathname = (req.url || '').split('?')[0]
    if (!['GET', 'HEAD'].includes(req.method) ||
        !/^\/(?:space-invaders|mars-expedition)\/(?:checkpoints\/|experiments\/)?[\w-]+\.py$/.test(pathname)) {
      return next()
    }
    try {
      const bytes = await readFile(resolve(directory, pathname.slice(1)))
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('Content-Length', bytes.length)
      res.setHeader('Cache-Control', 'no-cache')
      res.end(req.method === 'HEAD' ? undefined : bytes)
    } catch (error) {
      next(error.code === 'ENOENT' ? undefined : error)
    }
  })
}

export default function curriculumText() {
  return {
    name: 'curriculum-utf8-source',
    configureServer(server) {
      installTextMiddleware(server, server.config.publicDir)
    },
    configurePreviewServer(server) {
      installTextMiddleware(server, resolve(server.config.root, server.config.build.outDir))
    },
  }
}
