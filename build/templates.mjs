import { formatDate, readingTime } from './content.mjs'
import { escapeHtml, renderInline, renderMarkdown, plainText } from './markdown.mjs'
import { mark } from './marks.mjs'

// ─── Shared chrome ────────────────────────────────────────────────────────────

function wordmark(site, { large = false } = {}) {
  const [first, middle, ...rest] = site.name.split(' ')
  return `<span class="wordmark${large ? ' wordmark-large' : ''}"><b>${first}</b> <i>${middle}</i> <b>${rest.join(' ')}</b></span>`
}

function head(site, page) {
  const title = page.nav === 'home' ? `${site.name} — ${site.role}` : `${page.title} · ${site.name}`
  const description = page.description ?? site.description
  const url = site.url + page.path
  const image = site.url + (page.image ?? site.socialImage)

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="${page.type ?? 'website'}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="${escapeHtml(site.name)} — Blog" href="/blog/feed.xml">
<link rel="preload" href="/assets/fonts/archivo-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/literata-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/styles/site.css">
${page.math ? '<link rel="stylesheet" href="/styles/katex.css">' : ''}
<script>
  const stored = localStorage.getItem('theme')
  if (stored) document.documentElement.dataset.theme = stored
</script>
</head>`
}

function header(site, page) {
  const links = site.nav
    .map(
      (item) =>
        `<a href="${item.href}"${item.key === page.nav ? ' aria-current="page"' : ''}${item.external ? ' target="_blank" rel="noopener"' : ''
        }>${item.label}</a>`,
    )
    .join('')

  return `<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header${page.nav === 'home' ? ' site-header-home' : ''}">
  <div class="shell site-header-inner">
    <a class="site-mark" href="/">${wordmark(site)}</a>
    <nav class="site-nav" aria-label="Primary">${links}</nav>
    <button class="theme-toggle" type="button" aria-label="Switch colour scheme">
      <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.25"/><path d="M10 2.75a7.25 7.25 0 0 1 0 14.5z"/></svg>
    </button>
  </div>
</header>`
}

function footer(site) {
  const links = site.links
    .map((link) => `<a href="${link.href}"${link.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${link.label}</a>`)
    .join('')

  return `<footer class="site-footer">
  <div class="shell site-footer-inner">
    <p class="footer-mark">${wordmark(site)}</p>
    <p class="footer-note">© ${new Date().getFullYear()} ${escapeHtml(site.name)}. ${escapeHtml(site.footer)}</p>
    <nav class="footer-links" aria-label="Elsewhere">${links}</nav>
  </div>
</footer>`
}

function schema(site, page) {
  const data =
    page.type === 'article'
      ? {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: page.title,
        datePublished: page.datePublished,
        author: { '@type': 'Person', name: site.name },
        url: site.url + page.path,
      }
      : {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: site.name,
        jobTitle: site.role,
        email: `mailto:${site.email}`,
        url: site.url,
        sameAs: site.links.filter((link) => link.href.startsWith('http')).map((link) => link.href),
      }
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`
}

export function layout(site, page, body) {
  return `${head(site, page)}
<body${page.nav === 'home' ? ' class="is-home"' : ''}>
${header(site, page)}
<main id="main">
${body}
</main>
${footer(site)}
${schema(site, page)}
<script src="/scripts/site.js" type="module"></script>
</body>
</html>
`
}

// ─── Reusable pieces ──────────────────────────────────────────────────────────

function tagList(tags) {
  if (!tags?.length) return ''
  return `<p class="tags">${tags.map(escapeHtml).join(' · ')}</p>`
}

function linkRow(links) {
  if (!links) return ''
  const entries = Object.entries(links)
  if (!entries.length) return ''
  return `<p class="link-row">${entries
    .map(
      ([label, href]) =>
        `<a href="${href}"${href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${escapeHtml(label)}<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 9 9 3M4.4 3H9v4.6"/></svg></a>`,
    )
    .join('')}</p>`
}

function authorLine(authors, site) {
  if (!authors?.length) return ''
  return authors
    .map((author) => (author === site.authorName ? `<b>${escapeHtml(author)}</b>` : escapeHtml(author)))
    .join(', ')
}

// The CV entry, rendered for the web: mark, title, authorship, prose, skills.
function publicationEntry(publication, site, { showYear = false } = {}) {
  return `<article class="entry${showYear ? ' entry-dated' : ''}">
  ${showYear ? `<p class="entry-year">${publication.date?.getUTCFullYear() ?? ''}</p>` : ''}
  <div class="entry-mark">${mark(publication.mark)}</div>
  <div class="entry-body">
    <h3 class="entry-title">${publication.links?.Paper
      ? `<a href="${publication.links.Paper}" target="_blank" rel="noopener">${renderInline(publication.title)}</a>`
      : renderInline(publication.title)
    }</h3>
    <p class="entry-meta">${authorLine(publication.authors, site)}${publication.venue ? `<span class="entry-venue">${escapeHtml(publication.venue)}</span>` : ''}</p>
    <div class="entry-prose">${renderMarkdown(publication.body)}</div>
    ${publication.skills?.length ? `<p class="entry-skills">${publication.skills.map(escapeHtml).join(' · ')}</p>` : ''}
    ${linkRow(publication.links)}
  </div>
</article>`
}

// One row of a listing. Posts and projects share it so the two cannot drift apart.
function listRow({ href, date, image, title, subtitle, tags }) {
  return `<a class="post-row" href="${href}">
  <span class="post-row-date">${escapeHtml(date ?? '')}</span>
  <span class="post-row-thumb">${image ? `<img src="${image}" alt="" loading="lazy" decoding="async">` : ''}</span>
  <span class="post-row-text">
    <span class="post-row-title">${renderInline(title)}</span>
    ${subtitle ? `<span class="post-row-subtitle">${renderInline(subtitle)}</span>` : ''}
  </span>
  ${tagList(tags?.slice(0, 3))}
</a>`
}

function postRow(post) {
  return listRow({
    href: `/blog/${post.slug}/`,
    date: formatDate(post.date, { month: 'short' }),
    image: post.image,
    title: post.title,
    subtitle: post.subtitle,
    tags: post.tags,
  })
}

function projectRow(project) {
  return listRow({
    href: `/projects/${project.slug}/`,
    date: project.date?.getUTCFullYear(),
    image: project.image,
    title: project.title,
    subtitle: project.summary,
    tags: project.tags,
  })
}

function sectionHead(title, link) {
  return `<div class="section-head">
  <h2>${title}</h2>
  ${link ? `<a class="section-link" href="${link.href}">${link.label}<svg viewBox="0 0 16 12" aria-hidden="true"><path d="M0 6h14M9.5 1.5 14 6l-4.5 4.5"/></svg></a>` : ''}
</div>`
}

// ─── Pages ────────────────────────────────────────────────────────────────────

export function homePage(site, home, { publications, posts, projects }) {
  const rail = home.rail
    .map(
      (group) => `<section class="rail-group">
  <h2>${escapeHtml(group.heading)}</h2>
  <ul>${group.items
          .map(
            (item) => `<li>
    <span class="rail-primary">${item.href ? `<a href="${item.href}"${item.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${renderInline(item.primary)}</a>` : renderInline(item.primary)}</span>
    ${item.secondary ? `<span class="rail-secondary">${renderInline(item.secondary)}</span>` : ''}
  </li>`,
          )
          .join('')}</ul>
</section>`,
    )
    .join('')

  const body = `<div class="shell">

  <div class="masthead">
    <div class="masthead-text">
      <h1>${wordmark(site, { large: true })}</h1>
      <p class="masthead-role">${escapeHtml(site.role)}<span>${escapeHtml(site.affiliation)}</span></p>
      <div class="masthead-contact">
        ${site.contact.map((item) => `<a href="${item.href}"${item.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${escapeHtml(item.label)}</a>`).join('')}
        <a class="masthead-jump" href="#about">${escapeHtml(home.closingHeading.toLowerCase())}<svg viewBox="0 0 12 14" aria-hidden="true"><path d="M6 1v11M1.8 8.2 6 12.4l4.2-4.2"/></svg></a>
      </div>
    </div>
    <img class="masthead-portrait" src="${site.portrait}" alt="${escapeHtml(site.name)}" width="150" height="150">
  </div>

  <p class="lede">${renderInline(home.lede)}</p>

  <div class="split">
    <div class="split-main">

      <section class="block">
        ${sectionHead('Research', { href: '/publications/', label: 'All publications' })}
        ${publications.slice(0, 3).map((publication) => publicationEntry(publication, site)).join('')}
      </section>

      <section class="block">
        ${sectionHead('Blog', { href: '/blog/', label: 'All posts' })}
        <div class="post-list">${posts.slice(0, 4).map(postRow).join('')}</div>
      </section>

      <section class="block">
        ${sectionHead('Projects', { href: '/projects/', label: 'All projects' })}
        <div class="post-list">${projects.slice(0, 3).map(projectRow).join('')}</div>
      </section>

    </div>

    <aside class="split-rail">${rail}</aside>
  </div>

  <section class="closing" id="about">
    <h2>${renderInline(home.closingHeading)}</h2>
    <div class="closing-body">${renderMarkdown(home.body)}</div>
  </section>

</div>`

  return layout(site, { nav: 'home', path: '/', title: site.name }, body)
}

export function blogIndexPage(site, posts) {
  const years = [...new Set(posts.map((post) => post.date.getUTCFullYear()))]

  const groups = years
    .map(
      (year) => `<section class="year-group">
  <h2 class="year-label">${year}</h2>
  <div class="post-list">${posts.filter((post) => post.date.getUTCFullYear() === year).map(postRow).join('')}</div>
</section>`,
    )
    .join('')

  const body = `<div class="shell">
  <div class="page-head">
    <h1>Blogs</h1>
    <p>Notes on statistics, machine learning, AI, or whatever else has been holding my attention. ${posts.length} posts.</p>
  </div>
  ${groups}
</div>`

  return layout(site, { nav: 'blog', path: '/blog/', title: 'Writing', description: `Blog posts by ${site.name}.` }, body)
}

export function postPage(site, post, { previous, next, html, headings }) {
  const contents =
    headings.length >= 3
      ? `<nav class="toc" aria-label="Contents">
  <h2>Contents</h2>
  <ol>${headings.map((heading) => `<li><a href="#${heading.id}">${heading.text}</a></li>`).join('')}</ol>
</nav>`
      : ''

  const body = `<article class="shell post">
  <div class="post-head">
    ${post.image ? `<img class="post-hero" src="${post.image}" alt="" fetchpriority="high" decoding="async">` : ''}
    <p class="post-kicker">
      <a href="/blog/">Blogs</a>
      <time datetime="${post.date.toISOString().slice(0, 10)}">${formatDate(post.date)}</time>
      <span>${readingTime(post.body)}</span>
    </p>
    <h1>${renderInline(post.title)}</h1>
    ${post.subtitle ? `<p class="post-subtitle">${renderInline(post.subtitle)}</p>` : ''}
    ${tagList(post.tags)}
  </div>

  <div class="post-layout${contents ? '' : ' post-layout-solo'}">
    ${contents}
    <div class="prose">${html}</div>
  </div>

  <nav class="post-nav" aria-label="More posts">
    ${previous ? `<a class="post-nav-item" href="/blog/${previous.slug}/"><span>Previous</span>${renderInline(previous.title)}</a>` : '<span></span>'}
    ${next ? `<a class="post-nav-item post-nav-next" href="/blog/${next.slug}/"><span>Next</span>${renderInline(next.title)}</a>` : '<span></span>'}
  </nav>
</article>`

  return layout(
    site,
    {
      nav: 'blog',
      path: `/blog/${post.slug}/`,
      title: post.title,
      description: post.summary ?? post.subtitle ?? plainText(post.body).slice(0, 180),
      image: post.image,
      type: 'article',
      datePublished: post.date.toISOString(),
      math: html.includes('katex'),
    },
    body,
  )
}

export function publicationsPage(site, publications) {
  const body = `<div class="shell">
  <div class="page-head">
    <h1>Research</h1>
    <p>Peer-reviewed work and papers.</p>
  </div>
  <div class="entry-list">${publications
      .map((publication) => publicationEntry(publication, site, { showYear: true }))
      .join('')}</div>
</div>`

  return layout(
    site,
    { nav: 'publications', path: '/publications/', title: 'Research', description: `Publications by ${site.name}.` },
    body,
  )
}

// The first paragraph only, marked with an ellipsis when there is more to read.
function excerpt(body) {
  const html = renderMarkdown(body)
  const end = html.indexOf('</p>')
  if (end === -1) return { html, truncated: false }

  const first = html.slice(0, end)
  const truncated = html.slice(end + 4).trim().length > 0
  return { html: `${first}${truncated ? ' …' : ''}</p>`, truncated }
}

export function projectsPage(site, projects) {
  const items = projects
    .map((project) => {
      const { html, truncated } = excerpt(project.body)
      const href = `/projects/${project.slug}/`

      return `<article class="project" id="${project.slug}">
  ${
    project.image
      ? `<a class="project-image" href="${href}" tabindex="-1" aria-hidden="true"><img src="${project.image}" alt="" loading="lazy" decoding="async"></a>`
      : '<div></div>'
  }
  <div class="project-body">
    <p class="project-year">${project.date?.getUTCFullYear() ?? ''}</p>
    <h2><a href="${href}">${renderInline(project.title)}</a></h2>
    <div class="entry-prose">${html}</div>
    ${truncated ? `<p class="read-more"><a href="${href}">Read more<svg viewBox="0 0 16 12" aria-hidden="true"><path d="M0 6h14M9.5 1.5 14 6l-4.5 4.5"/></svg></a></p>` : ''}
    ${tagList(project.tags)}
  </div>
</article>`
    })
    .join('')

  const body = `<div class="shell">
  <div class="page-head">
    <h1>Projects</h1>
    <p>Various projects and applications built to answer a question or just simply for fun. Anything I've built that I'm proud of.</p>
  </div>
  <div class="project-list">${items}</div>
</div>`

  return layout(site, { nav: 'projects', path: '/projects/', title: 'Projects', description: `Projects by ${site.name}.` }, body)
}

export function projectPage(site, project, { previous, next }) {
  const html = renderMarkdown(project.body)

  const body = `<article class="shell post">
  <div class="post-head">
    ${project.image ? `<img class="post-hero" src="${project.image}" alt="" fetchpriority="high" decoding="async">` : ''}
    <p class="post-kicker">
      <a href="/projects/">Projects</a>
      ${project.date ? `<time datetime="${project.date.toISOString().slice(0, 10)}">${project.date.getUTCFullYear()}</time>` : ''}
    </p>
    <h1>${renderInline(project.title)}</h1>
    ${project.summary ? `<p class="post-subtitle">${renderInline(project.summary)}</p>` : ''}
    ${tagList(project.tags)}
    ${linkRow(project.links)}
  </div>

  <div class="post-layout post-layout-solo">
    <div class="prose">${html}</div>
  </div>

  <nav class="post-nav" aria-label="More projects">
    ${previous ? `<a class="post-nav-item" href="/projects/${previous.slug}/"><span>Previous</span>${renderInline(previous.title)}</a>` : '<span></span>'}
    ${next ? `<a class="post-nav-item post-nav-next" href="/projects/${next.slug}/"><span>Next</span>${renderInline(next.title)}</a>` : '<span></span>'}
  </nav>
</article>`

  return layout(
    site,
    {
      nav: 'projects',
      path: `/projects/${project.slug}/`,
      title: project.title,
      description: project.summary ?? plainText(project.body).slice(0, 180),
      image: project.image,
      math: html.includes('katex'),
    },
    body,
  )
}

export function notFoundPage(site) {
  const body = `<div class="shell">
  <div class="page-head page-head-404">
    <p class="post-kicker"><span>404</span></p>
    <h1>This page was truncated.</h1>
    <p>The boundary of this site does not extend here. Try the <a href="/blog/">writing</a>, the <a href="/publications/">research</a>, or go <a href="/">home</a>.</p>
  </div>
</div>`

  return layout(site, { nav: null, path: '/404.html', title: 'Not found', description: 'Page not found.' }, body)
}

export function feed(site, posts) {
  const items = posts
    .slice(0, 20)
    .map(
      (post) => `  <item>
    <title>${escapeHtml(post.title)}</title>
    <link>${site.url}/blog/${post.slug}/</link>
    <guid>${site.url}/blog/${post.slug}/</guid>
    <pubDate>${post.date.toUTCString()}</pubDate>
    <description>${escapeHtml(post.summary ?? post.subtitle ?? '')}</description>
  </item>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escapeHtml(site.name)} — Blog</title>
  <link>${site.url}/blog/</link>
  <description>${escapeHtml(site.description)}</description>
  <language>en-GB</language>
  <atom:link href="${site.url}/blog/feed.xml" rel="self" type="application/rss+xml"/>
${items}
</channel>
</rss>
`
}
