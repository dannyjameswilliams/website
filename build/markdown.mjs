import { Marked } from 'marked'
import katex from 'katex'
import hljs from 'highlight.js'

const INLINE_MATH = /^\$(?!\s)((?:\\.|[^\\$])+?)(?<!\s)\$|^\\\(([\s\S]+?)\\\)/
const BLOCK_MATH = /^\$\$([\s\S]+?)\$\$|^\\\[([\s\S]+?)\\\]/

// throwOnError so a bad expression is reported at build time rather than turning
// into silent red text on the page.
function renderMath(tex, displayMode) {
  try {
    return katex.renderToString(tex.trim(), { displayMode, throwOnError: true, strict: false })
  } catch (error) {
    console.warn(`  katex: ${error.message.replace(/\n[\s\S]*/, '')}`)
    return `<code class="math-error">${escapeHtml(tex.trim())}</code>`
  }
}

// $...$ and \(...\) inline, $$...$$ and \[...\] as display blocks.
const math = {
  extensions: [
    {
      name: 'blockMath',
      level: 'block',
      start: (src) => src.match(/\$\$|\\\[/)?.index,
      tokenizer(src) {
        const match = BLOCK_MATH.exec(src)
        if (match) return { type: 'blockMath', raw: match[0], tex: match[1] ?? match[2] }
      },
      renderer: (token) => `<div class="math-block">${renderMath(token.tex, true)}</div>`,
    },
    {
      name: 'inlineMath',
      level: 'inline',
      start: (src) => src.match(/\$|\\\(/)?.index,
      tokenizer(src) {
        const match = INLINE_MATH.exec(src)
        if (match) return { type: 'inlineMath', raw: match[0], tex: match[1] ?? match[2] }
      },
      renderer: (token) => renderMath(token.tex, false),
    },
  ],
}

// R Markdown inline footnotes: `^[some note]`. Collected per document and
// printed as numbered notes at the end of the piece.
let footnotes = []

const footnote = {
  extensions: [
    {
      name: 'footnote',
      level: 'inline',
      start: (src) => src.indexOf('^['),
      tokenizer(src) {
        const match = /^\^\[((?:[^[\]]|\[[^\]]*\])+)\]/.exec(src)
        if (!match) return
        return { type: 'footnote', raw: match[0], tokens: this.lexer.inlineTokens(match[1]) }
      },
      renderer(token) {
        const number = footnotes.push(this.parser.parseInline(token.tokens))
        return `<sup class="note-ref" id="ref-${number}"><a href="#note-${number}">${number}</a></sup>`
      },
    },
  ],
}

function footnoteList() {
  if (!footnotes.length) return ''
  const items = footnotes
    .map((note, index) => `<li id="note-${index + 1}">${note} <a class="note-back" href="#ref-${index + 1}">&#8617;</a></li>`)
    .join('')
  return `<section class="notes"><h2>Notes</h2><ol>${items}</ol></section>`
}

// Fenced blocks:
//   ::: note      an aside set apart from the running text
//   ::: figure    anything (an <iframe>, several images) plus a markdown caption,
//                 where the final paragraph becomes the caption
const directive = {
  extensions: [
    {
      name: 'directive',
      level: 'block',
      start: (src) => src.match(/^:::/m)?.index,
      tokenizer(src) {
        const match = /^:::\s*(\w+)?[ \t]*\n([\s\S]*?)\n:::[ \t]*(?:\n|$)/.exec(src)
        if (!match) return
        return {
          type: 'directive',
          raw: match[0],
          variant: match[1] ?? 'note',
          tokens: this.lexer.blockTokens(match[2] + '\n'),
        }
      },
      renderer(token) {
        if (token.variant !== 'figure') {
          return `<aside class="callout callout-${token.variant}">${this.parser.parse(token.tokens)}</aside>`
        }

        const tokens = [...token.tokens]
        const last = tokens.at(-1)
        const caption =
          last?.type === 'paragraph'
            ? `<figcaption>${this.parser.parseInline(tokens.pop().tokens)}</figcaption>`
            : ''
        return `<figure class="figure figure-embed">${this.parser.parse(tokens)}${caption}</figure>`
      },
    },
  ],
}

const renderer = {
  heading({ tokens, depth }) {
    const text = this.parser.parseInline(tokens)
    const id = text
      .replace(/<[^>]+>/g, '')
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
    return `<h${depth} id="${id}">${text}<a class="heading-anchor" href="#${id}" aria-label="Link to this section">#</a></h${depth}>\n`
  },

  code({ text, lang }) {
    const language = hljs.getLanguage(lang) ? lang : null
    const body = language ? hljs.highlight(text, { language }).value : escapeHtml(text)
    const label = language ? `<span class="code-lang">${language}</span>` : ''
    return `<figure class="code">${label}<pre><code class="hljs">${body}</code></pre></figure>\n`
  },

  // A standalone image becomes a figure; its alt text doubles as the caption and
  // may contain markdown, which is stripped for the alt attribute itself.
  paragraph({ tokens }) {
    if (tokens.length === 1 && tokens[0].type === 'image') {
      const { href, text, title } = tokens[0]
      const source = title || text
      return `<figure class="figure"><img src="${href}" alt="${escapeHtml(text.replace(/[*_`]/g, ''))}" loading="lazy" decoding="async">${
        source ? `<figcaption>${marked.parseInline(source)}</figcaption>` : ''
      }</figure>\n`
    }
    return `<p>${this.parser.parseInline(tokens)}</p>\n`
  },

  table(token) {
    const head = token.header.map((cell) => `<th>${this.parser.parseInline(cell.tokens)}</th>`).join('')
    const body = token.rows
      .map((row) => `<tr>${row.map((cell) => `<td>${this.parser.parseInline(cell.tokens)}</td>`).join('')}</tr>`)
      .join('\n')
    return `<div class="table-scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>\n`
  },
}

export function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  )
}

const marked = new Marked({ gfm: true }, math, footnote, directive, { renderer })

export function renderMarkdown(source) {
  footnotes = []
  return marked.parse(source ?? '') + footnoteList()
}

export function renderInline(source) {
  return marked.parseInline(source ?? '')
}

export function plainText(source) {
  return renderMarkdown(source)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
