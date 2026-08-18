const root = document.documentElement

// Colour scheme. Until the toggle is used the site follows the operating system.
document.querySelector('.theme-toggle')?.addEventListener('click', () => {
  const current = root.dataset.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  const next = current === 'dark' ? 'light' : 'dark'
  root.dataset.theme = next
  localStorage.setItem('theme', next)
})

// The home masthead owns the name until it scrolls away, then the header takes over.
const header = document.querySelector('.site-header-home')
const masthead = document.querySelector('.masthead')

if (header && masthead) {
  new IntersectionObserver(([entry]) => header.classList.toggle('is-scrolled', !entry.isIntersecting), {
    rootMargin: '-40% 0px 0px 0px',
  }).observe(masthead)
}

// Rotatable 3D scatter plots, fetched only on the pages that hold one.
if (document.querySelector('[data-scatter3d]')) import('./scatter3d.js')

// Click-to-enlarge, fetched only where there is something to enlarge.
if (document.querySelector('.post-hero, .prose .figure img')) import('./lightbox.js')

// Highlight the section currently being read in a post's contents list.
const tocLinks = [...document.querySelectorAll('.toc a')]

if (tocLinks.length) {
  const byId = new Map(tocLinks.map((link) => [link.hash.slice(1), link]))
  const visible = new Set()

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target.id)
        else visible.delete(entry.target.id)
      }
      const first = [...byId.keys()].find((id) => visible.has(id))
      for (const [id, link] of byId) link.classList.toggle('is-active', id === first)
    },
    { rootMargin: '-15% 0px -70% 0px' },
  )

  for (const id of byId.keys()) {
    const heading = document.getElementById(id)
    if (heading) observer.observe(heading)
  }
}
