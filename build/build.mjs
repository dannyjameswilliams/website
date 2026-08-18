import { cp, mkdir, readdir, rm, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { formatDate, readCollection, readPage, readSite } from './content.mjs'
import { renderMarkdown } from './markdown.mjs'
import * as pages from './templates.mjs'

const ROOT = new URL('..', import.meta.url).pathname
const OUT = join(ROOT, 'dist')

async function write(path, contents) {
  const file = join(OUT, path)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, contents)
}

function headingsOf(html) {
  return [...html.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<a class="heading-anchor"/g)].map(([, id, text]) => ({
    id,
    text: text.replace(/<[^>]+>/g, ''),
  }))
}

// Folder-form entries keep their images beside the prose; ship them alongside the page.
async function copyAssets(entry, destination) {
  if (!entry.assetDir) return
  for (const file of await readdir(entry.assetDir)) {
    if (file === 'index.md') continue
    await cp(join(entry.assetDir, file), join(OUT, destination, file), { recursive: true })
  }
}

async function copyKatex() {
  const source = join(ROOT, 'node_modules/katex/dist')
  await cp(join(source, 'katex.min.css'), join(OUT, 'styles/katex.css'))

  const fonts = (await readdir(join(source, 'fonts'))).filter((file) => file.endsWith('.woff2'))
  for (const file of fonts) {
    await cp(join(source, 'fonts', file), join(OUT, 'styles/fonts', file))
  }
}

async function build() {
  const started = Date.now()
  await rm(OUT, { recursive: true, force: true })
  await mkdir(OUT, { recursive: true })

  const site = await readSite()
  const home = await readPage('home.md')
  const posts = await readCollection('blog')
  const projects = await readCollection('projects')
  const publications = await readCollection('publications')

  for (const directory of ['assets', 'styles', 'scripts']) {
    await cp(join(ROOT, directory), join(OUT, directory), { recursive: true })
  }
  await copyKatex()

  await write('index.html', pages.homePage(site, home, { publications, posts, projects }))
  await write('blog/index.html', pages.blogIndexPage(site, posts))
  await write('publications/index.html', pages.publicationsPage(site, publications))
  await write('projects/index.html', pages.projectsPage(site, projects))
  await write('404.html', pages.notFoundPage(site))
  await write('blog/feed.xml', pages.feed(site, posts))

  for (const [index, post] of posts.entries()) {
    const html = renderMarkdown(post.body)
    await write(
      `blog/${post.slug}/index.html`,
      pages.postPage(site, post, {
        html,
        headings: headingsOf(html),
        previous: posts[index + 1] ?? null,
        next: posts[index - 1] ?? null,
      }),
    )
    await copyAssets(post, `blog/${post.slug}`)
  }

  for (const [index, project] of projects.entries()) {
    await write(
      `projects/${project.slug}/index.html`,
      pages.projectPage(site, project, {
        previous: projects[index + 1] ?? null,
        next: projects[index - 1] ?? null,
      }),
    )
    await copyAssets(project, `projects/${project.slug}`)
  }

  const urls = [
    '/',
    '/blog/',
    '/projects/',
    '/publications/',
    ...posts.map((post) => `/blog/${post.slug}/`),
    ...projects.map((project) => `/projects/${project.slug}/`),
  ]
  await write(
    'sitemap.xml',
    `<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${site.url}${url}</loc></url>`).join('\n')}
</urlset>
`,
  )
  // GitHub Pages cannot issue a 301, so each old path gets a stub that sends the
  // browser on and tells crawlers where the page really lives.
  for (const [from, to] of Object.entries(site.redirects ?? {})) {
    await write(
      `${from.replace(/^\/|\/$/g, '')}/index.html`,
      `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Moved</title>
<link rel="canonical" href="${site.url}${to}">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${to}">
<body><p>This page has moved to <a href="${to}">${to}</a>.</p>
<script>location.replace('${to}' + location.hash)</script>
</body>
</html>
`,
    )
  }

  for (const [from, to] of Object.entries(site.aliases ?? {})) {
    const source = join(OUT, to)
    if (!existsSync(source)) {
      console.warn(`  alias ${from}: ${to} was not built`)
      continue
    }
    await mkdir(dirname(join(OUT, from)), { recursive: true })
    await cp(source, join(OUT, from))
  }

  await write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`)
  if (site.domain) await write('CNAME', site.domain + '\n')
  await write('.nojekyll', '')

  console.log(
    `built ${urls.length + 2} pages · ${posts.length} posts · ${publications.length} publications · ${projects.length} projects · ${Date.now() - started}ms`,
  )
}

await build()
