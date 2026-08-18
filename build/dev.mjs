import { createServer } from 'node:http'
import { spawnSync } from 'node:child_process'
import { watch } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const OUT = join(ROOT, 'dist')
const PORT = Number(process.env.PORT ?? 4321)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
  '.ipynb': 'application/json',
}

function rebuild() {
  const result = spawnSync('node', [join(ROOT, 'build/build.mjs')], { stdio: 'inherit' })
  if (result.status !== 0) console.error('build failed')
}

rebuild()

let queued = null
for (const directory of ['content', 'styles', 'scripts', 'build', 'assets']) {
  watch(join(ROOT, directory), { recursive: true }, () => {
    clearTimeout(queued)
    queued = setTimeout(rebuild, 60)
  })
}

createServer(async (request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, 'http://x').pathname))
  const candidates = [join(OUT, path), join(OUT, path, 'index.html')]

  for (const candidate of candidates) {
    if (!candidate.startsWith(OUT)) break
    try {
      if (!(await stat(candidate)).isFile()) continue
      response.writeHead(200, { 'content-type': TYPES[extname(candidate)] ?? 'application/octet-stream' })
      response.end(await readFile(candidate))
      return
    } catch {}
  }

  response.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
  response.end(await readFile(join(OUT, '404.html')).catch(() => 'Not found'))
}).listen(PORT, () => console.log(`\n  http://localhost:${PORT}\n`))
