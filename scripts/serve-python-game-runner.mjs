import http from 'node:http'
import { readFile } from 'node:fs/promises'
const port = Number(process.env.PYTHON_GAME_RUNNER_PORT || 4178)
const html = await readFile(new URL('../runtime/python-game-runner/index.html', import.meta.url))
http.createServer((req, res) => {
  if (req.url !== '/' && req.url !== '/index.html') { res.writeHead(404); res.end(); return }
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://pygame-web.github.io; connect-src https://pygame-web.github.io; style-src 'unsafe-inline'; img-src blob: data:; media-src blob: data: https://pygame-web.github.io; worker-src blob:; frame-ancestors http://localhost:* http://127.0.0.1:*",
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), usb=()',
    'Referrer-Policy': 'no-referrer',
  }); res.end(html)
}).listen(port, '127.0.0.1', () => console.log(`Python game runner: http://127.0.0.1:${port}`))
