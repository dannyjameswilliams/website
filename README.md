# dannyjameswilliams.co.uk

A static site. Markdown in, HTML out, no framework. `npm run dev` and open
<http://localhost:4321>.

```
npm install
npm run dev      # rebuild on change, serve on :4321
npm run build    # write dist/
```

Pushing to `main` builds and publishes to GitHub Pages via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Nothing else to run.

## Where things live

| I want to change…                    | Edit                                        |
| ------------------------------------ | ------------------------------------------- |
| My name, role, email, nav, footer    | `content/site.json`                         |
| The homepage intro, side rail, about | `content/home.md`                           |
| A blog post                          | `content/blog/<slug>.md`                    |
| A paper                              | `content/publications/<slug>.md`            |
| A project                            | `content/projects/<slug>.md`                |
| Colours, type, spacing               | the token block at the top of `styles/site.css` |
| Page structure                       | `build/templates.mjs`                       |
| Images, CV, fonts                    | `assets/`                                   |

Everything under `content/` is markdown with YAML front matter, apart from `site.json`.
Nothing in `build/` needs touching to publish.

## Writing a blog post

Add one file and open a PR. That is the whole process.

```
content/blog/my-post.md      ->  /blog/my-post/
```

```markdown
---
title: What I learned about X
subtitle: One line that appears under the title and in the index.
date: 2026-08-18
tags: [Statistics, Python]
---

Your prose here.
```

`draft: true` keeps a post out of the build. Posts are ordered by `date`, newest first.

If the post has images, use a folder instead and put them alongside the prose — everything
in the folder is copied to the published post, so relative paths just work:

```
content/blog/my-post/index.md
content/blog/my-post/plot.png     ->  ![A caption.](plot.png)
```

### What you can write

Standard markdown, plus:

**Maths**, inline with `$...$` and display with `$$...$$` or `\[...\]`. Rendered by KaTeX at
build time, so no JavaScript is shipped and it does not flash on load.

```markdown
The score function $\nabla_x \log p(x; \theta)$ removes the dependence on $Z(\theta)$.

$$
\min_\theta \mathbb{E}\left[ g(x) \| \nabla_x \log p(x;\theta) \|_2^2 \right].
$$
```

**Code**, syntax highlighted at build time. Tag the fence with a language.

**Figures.** A standalone image becomes a captioned figure, and the alt text is the caption
(markdown allowed in it):

```markdown
![**Figure 1:** Homicide locations inside Chicago, 2008.](img/chicago.png)
```

**Footnotes**, using R Markdown's inline syntax `^[like this]`. They are numbered
automatically and collected at the end of the post.

**Blocks**, for anything a plain paragraph cannot hold. The last paragraph of a `figure`
block becomes its caption:

````markdown
::: figure
<iframe height="450" loading="lazy" width="100%" src="https://plotly.com/~you/3.embed"></iframe>

Caption, with **markdown** and $maths$ if you want.
:::

::: note
An aside, set in a box away from the running text.
:::

::: verse
Song lyrics or a quoted couplet,<br>
centred and set in italics.
:::
````

## Publications and projects

Same idea, different front matter. The body is the description.

```markdown
---
title: Truncated Kernelised Stein Discrepancies
authors: [Daniel Williams, Song Liu]
venue: ICML 2023
date: 2023-07-23
mark: boundary
skills: [Python, Asymptotic Theory, Machine Learning]
links:
  Paper: https://arxiv.org/abs/...
  Code: https://github.com/...
---

What the paper does, in a paragraph.
```

`authors` is matched against `authorName` in `site.json` so your own name is emphasised.
`mark` picks the small line drawing beside the entry — the available names are the keys in
[`build/marks.mjs`](build/marks.mjs), and adding a new one means adding an SVG path there.

Projects use `title`, `summary`, `date`, `tags`, `image` and `links`. The `summary` is what
shows on the homepage; the body shows on `/projects/`.

## Design notes

The layout is lifted from my CV: an alternating-weight wordmark, one forest green accent used
sparingly, a narrow metadata rail beside a wide content column, hairline rules instead of
cards, and justified body copy with automatic hyphenation. Archivo sets the structure,
Literata sets the prose. Both are self-hosted from `assets/fonts/`.

Light by default, with a dark theme that follows the operating system until the toggle in the
header is used.

Full brief in [`.impeccable.md`](.impeccable.md).
