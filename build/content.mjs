import { readdir, readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import matter from 'gray-matter'

export const CONTENT_DIR = new URL('../content/', import.meta.url).pathname

export async function readSite() {
  return JSON.parse(await readFile(join(CONTENT_DIR, 'site.json'), 'utf8'))
}

export async function readPage(name) {
  const { data, content } = matter(await readFile(join(CONTENT_DIR, name), 'utf8'))
  return { ...data, body: content }
}

// A collection entry is either `<slug>.md` or `<slug>/index.md`, where the folder
// form lets a post keep its images next to the prose.
export async function readCollection(name) {
  const dir = join(CONTENT_DIR, name)
  if (!existsSync(dir)) return []

  const entries = []
  for (const item of await readdir(dir)) {
    if (item.startsWith('.')) continue

    const path = join(dir, item)
    const isDirectory = (await stat(path)).isDirectory()
    const file = isDirectory ? join(path, 'index.md') : path
    if (!isDirectory && extname(item) !== '.md') continue
    if (!existsSync(file)) continue

    const slug = isDirectory ? item : basename(item, '.md')
    const { data, content } = matter(await readFile(file, 'utf8'))
    if (data.draft) continue

    // An empty or half-written file would otherwise render as a blank entry.
    if (!data.title) {
      console.warn(`  skipped ${name}/${item}: no title in front matter`)
      continue
    }

    entries.push({
      ...data,
      slug,
      body: content,
      assetDir: isDirectory ? path : null,
      date: data.date ? new Date(data.date) : null,
      tags: data.tags ?? [],
    })
  }

  return entries.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
}

export function formatDate(date, { month = 'long' } = {}) {
  if (!date) return ''
  return date.toLocaleDateString('en-GB', { day: 'numeric', month, year: 'numeric', timeZone: 'UTC' })
}

export function readingTime(body) {
  const words = body.split(/\s+/).filter(Boolean).length
  return `${Math.max(1, Math.round(words / 220))} min read`
}
