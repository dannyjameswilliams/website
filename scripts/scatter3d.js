/* ─── 3D scatter plots ────────────────────────────────────────────────────────
   Drag to rotate, pinch or ⌘-scroll to zoom, click a legend entry to hide a
   series. Everything is drawn on a canvas by hand — no plotting library, and the
   data sits next to the post it belongs to.

   Markup, anywhere in a post:
     <div class="scatter3d" data-scatter3d="/blog/asoiaf/data/embeddings.json"
          data-hint="…"></div>

   The JSON is { legend, series: [{ name, color, points: [[x, y, z, note?], …] }] }.
   ─────────────────────────────────────────────────────────────────────────── */

const DISTANCE = 7 // camera distance in data radii — how strong the perspective is
const RADIUS = 3.4 // marker radius in css pixels, at the middle of the cloud
const SPIN = 0.003 // radians per frame, until the reader takes over
const PITCH_LIMIT = 1.35

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)')

for (const element of document.querySelectorAll('[data-scatter3d]')) {
  fetch(element.dataset.scatter3d)
    .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
    .then((data) => plot(element, data))
    .catch(() => fallback(element))
}

// If the data can't be had, show the same still image a reader without
// JavaScript gets rather than an empty frame.
function fallback(element) {
  element.classList.add('is-unavailable')
  if (!element.dataset.fallback) return
  const image = document.createElement('img')
  image.src = element.dataset.fallback
  image.alt = element.dataset.fallbackAlt ?? ''
  element.replaceChildren(image)
}

// ─── Colour ───────────────────────────────────────────────────────────────────
// A series colour is authored once, but it has to hold up on both papers. These
// convert through Oklab so the colour can be pushed into a lightness band that
// reads against the current background without losing the hue that identifies it.

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

function toOklch(hex) {
  const value = parseInt(hex.slice(1), 16)
  const r = toLinear(((value >> 16) & 255) / 255)
  const g = toLinear(((value >> 8) & 255) / 255)
  const b = toLinear((value & 255) / 255)

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const b2 = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { lightness, chroma: Math.hypot(a, b2), hue: Math.atan2(b2, a) }
}

function toRgb({ lightness, chroma, hue }, alpha = 1) {
  const a = chroma * Math.cos(hue)
  const b = chroma * Math.sin(hue)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3

  const channel = (v) => Math.max(0, Math.min(255, Math.round(toGamma(v) * 255)))
  const r = channel(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)
  const g = channel(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)
  const blue = channel(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
  return `rgb(${r} ${g} ${blue} / ${alpha})`
}

function bandedColour(hex, dark) {
  const colour = toOklch(hex)
  const low = dark ? 0.62 : 0.42
  const high = dark ? 0.88 : 0.7
  return { ...colour, lightness: Math.min(high, Math.max(low, colour.lightness)) }
}

// ─── One plot ─────────────────────────────────────────────────────────────────

function plot(element, data) {
  const series = data.series.map((one) => ({ ...one, points: one.points.map((p) => p.slice(0, 3).map(Number)) }))
  const notes = data.series.map((one) => one.points.map((p) => p[3] ?? null))
  const total = series.reduce((sum, one) => sum + one.points.length, 0)

  // Centre the cloud on the origin and scale every axis by the same amount, so
  // the shape of the projection is the shape of the data.
  const axes = [0, 1, 2].map((axis) => {
    const values = series.flatMap((one) => one.points.map((point) => point[axis]))
    return { min: Math.min(...values), max: Math.max(...values) }
  })
  const centre = axes.map((axis) => (axis.min + axis.max) / 2)
  const radius = Math.max(...axes.map((axis) => (axis.max - axis.min) / 2))

  // A UMAP axis carries no meaning of its own, so which one to point where is
  // ours to choose: the widest goes across the frame, the narrowest becomes up.
  // Turning the plot then sweeps the long axis of the cloud past the reader
  // instead of foreshortening it.
  const widest = [0, 1, 2].sort((a, b) => axes[b].max - axes[b].min - (axes[a].max - axes[a].min))
  const order = [widest[0], widest[2], widest[1]]

  const normalise = (point) => order.map((axis) => (point[axis] - centre[axis]) / radius)
  const bounds = order.map((axis) => [(axes[axis].min - centre[axis]) / radius, (axes[axis].max - centre[axis]) / radius])
  const cloud = series.map((one) => one.points.map(normalise))

  element.innerHTML = `
    <div class="scatter3d-stage">
      <canvas tabindex="0" role="img" aria-label="${series.length} series of ${total} chapters, plotted in three dimensions. Rotate with the arrow keys."></canvas>
      <div class="scatter3d-tools">
        <button type="button" data-act="in" aria-label="Zoom in">${icon('M7 3v8M3 7h8')}</button>
        <button type="button" data-act="out" aria-label="Zoom out">${icon('M3 7h8')}</button>
        <button type="button" data-act="reset" aria-label="Reset the view">${icon('M11 7a4 4 0 1 1-1.2-2.85M11 2v3H8')}</button>
        <button type="button" data-act="full" aria-label="Fullscreen">${icon('M3 5.5V3h2.5M8.5 3H11v2.5M11 8.5V11H8.5M5.5 11H3V8.5')}</button>
      </div>
      <div class="scatter3d-tip" aria-hidden="true"></div>
    </div>
    <div class="scatter3d-foot">
      <div class="scatter3d-legend" role="group" aria-label="${data.legend ?? 'Series'}"></div>
      <p class="scatter3d-hint">${element.dataset.hint ?? 'Drag to rotate · pinch to zoom · click a name to hide it'}</p>
    </div>`

  const stage = element.querySelector('.scatter3d-stage')
  const canvas = element.querySelector('canvas')
  const tip = element.querySelector('.scatter3d-tip')
  const context = canvas.getContext('2d')

  const hidden = new Set()
  let focused = null // the series the pointer is resting on in the legend
  const home = { yaw: 0.5, pitch: 0.28, zoom: 1 }
  let view = { ...home }
  let base = 100 // css pixels per unit of normalised data, set by fit()
  let centred = { x: 0, y: 0 } // where the middle of the cloud lands, also from fit()
  let width = 0
  let height = 0
  let frame = [] // where every visible point landed, for hit testing
  let hover = null
  let spinning = !reduceMotion.matches
  let spun = 0
  let painting = 0
  let palette = []
  let theme = {}

  // ─── Legend ─────────────────────────────────────────────────────────────────

  const legend = element.querySelector('.scatter3d-legend')
  series.forEach((one, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.setAttribute('aria-pressed', 'true')
    button.innerHTML = `<span class="scatter3d-swatch"></span>${one.name}`
    button.addEventListener('click', () => {
      hidden.has(index) ? hidden.delete(index) : hidden.add(index)
      button.setAttribute('aria-pressed', String(!hidden.has(index)))
      paint()
    })
    const focus = (value) => {
      focused = value
      paint()
    }
    button.addEventListener('pointerenter', () => focus(index))
    button.addEventListener('pointerleave', () => focus(null))
    button.addEventListener('focus', () => focus(index))
    button.addEventListener('blur', () => focus(null))
    legend.append(button)
  })
  const swatches = [...legend.querySelectorAll('.scatter3d-swatch')]

  // ─── Theme ──────────────────────────────────────────────────────────────────

  function readTheme() {
    const styles = getComputedStyle(document.documentElement)
    const value = (name) => styles.getPropertyValue(name).trim()
    const dark =
      document.documentElement.dataset.theme === 'dark' ||
      (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches)

    theme = { paper: value('--paper-raised'), rule: value('--rule-strong'), accent: value('--accent'), dark }
    palette = series.map((one) => bandedColour(one.color, dark))
    swatches.forEach((swatch, index) => {
      swatch.style.background = toRgb(palette[index])
    })
  }

  new MutationObserver(() => {
    readTheme()
    paint()
  }).observe(document.documentElement, { attributeFilter: ['data-theme'] })

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    readTheme()
    paint()
  })

  // ─── Drawing ────────────────────────────────────────────────────────────────

  function project({ yaw, pitch }, unit = 1, middleX = 0, middleY = 0, centred = { x: 0, y: 0 }) {
    const cosYaw = Math.cos(yaw)
    const sinYaw = Math.sin(yaw)
    const cosPitch = Math.cos(pitch)
    const sinPitch = Math.sin(pitch)

    return (point) => {
      const x = point[0] * cosYaw - point[2] * sinYaw
      const depth = point[0] * sinYaw + point[2] * cosYaw
      const y = point[1] * cosPitch - depth * sinPitch
      const z = point[1] * sinPitch + depth * cosPitch
      const scale = DISTANCE / (DISTANCE - z)
      return {
        x: middleX + (x * scale - centred.x) * unit,
        y: middleY - (y * scale - centred.y) * unit,
        z,
        scale,
      }
    }
  }

  // Where the cloud lands for a given turn, in multiples of one unit — enough to
  // work out a scale and an offset that put it in the middle of the frame.
  function spread(candidate) {
    const to = project(candidate)
    let left = Infinity
    let right = -Infinity
    let top = -Infinity
    let bottom = Infinity
    for (const points of cloud) {
      for (const point of points) {
        const at = to(point)
        left = Math.min(left, at.x)
        right = Math.max(right, at.x)
        bottom = Math.min(bottom, -at.y)
        top = Math.max(top, -at.y)
      }
    }
    return { left, right, top, bottom }
  }

  const scaleFor = (box) => Math.min((width * 0.9) / (box.right - box.left), (height * 0.88) / (box.top - box.bottom))

  // Fit the frame to every turn the cloud can make, not just the one on show, so
  // that it neither clips nor breathes as the reader rotates it.
  function fit() {
    const swept = { left: Infinity, right: -Infinity, top: -Infinity, bottom: Infinity }
    for (let step = 0; step < 24; step++) {
      const box = spread({ yaw: (step / 24) * Math.PI * 2, pitch: view.pitch })
      swept.left = Math.min(swept.left, box.left)
      swept.right = Math.max(swept.right, box.right)
      swept.bottom = Math.min(swept.bottom, box.bottom)
      swept.top = Math.max(swept.top, box.top)
    }

    base = scaleFor(swept)
    centred = { x: (swept.left + swept.right) / 2, y: (swept.top + swept.bottom) / 2 }
  }

  const CORNERS = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [i & 1, (i >> 1) & 1, (i >> 2) & 1])
  const EDGES = []
  for (let a = 0; a < 8; a++) {
    for (const bit of [1, 2, 4]) if (a & bit) EDGES.push([a, a ^ bit])
  }

  // The box is the only cue for which way up the projection is, so it fades with
  // depth: the edges behind the cloud sit back, the ones in front read first.
  function drawBox(to) {
    const corners = CORNERS.map((corner) => to(corner.map((side, axis) => bounds[axis][side])))
    context.lineWidth = 1
    context.strokeStyle = theme.rule
    for (const [a, b] of EDGES) {
      context.globalAlpha = 0.16 + 0.12 * (corners[a].z + corners[b].z + 2)
      context.beginPath()
      context.moveTo(corners[a].x, corners[a].y)
      context.lineTo(corners[b].x, corners[b].y)
      context.stroke()
    }
    context.globalAlpha = 1
  }

  function draw() {
    if (!width || !height) return
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.scale(canvas.width / width, canvas.height / height)

    const to = project(view, base * view.zoom, width / 2, height / 2, centred)
    drawBox(to)

    frame = []
    cloud.forEach((points, index) => {
      if (hidden.has(index)) return
      points.forEach((point, pointIndex) => {
        const at = to(point)
        frame.push({ ...at, radius: RADIUS * at.scale * view.zoom ** 0.35, series: index, point: pointIndex })
      })
    })
    frame.sort((a, b) => a.z - b.z)

    for (const mark of frame) {
      const dim = focused !== null && focused !== mark.series
      context.beginPath()
      context.arc(mark.x, mark.y, mark.radius, 0, Math.PI * 2)
      context.fillStyle = toRgb(palette[mark.series], dim ? 0.12 : 0.9)
      context.fill()
      if (!dim) {
        // A ring in the paper colour keeps overlapping chapters countable
        context.lineWidth = 1
        context.globalAlpha = 0.85
        context.strokeStyle = theme.paper
        context.stroke()
        context.globalAlpha = 1
      }
    }

    if (hover) {
      const mark = frame.find((one) => one.series === hover.series && one.point === hover.point)
      if (mark) {
        context.beginPath()
        context.arc(mark.x, mark.y, mark.radius + 3.5, 0, Math.PI * 2)
        context.lineWidth = 1.5
        context.strokeStyle = theme.accent
        context.stroke()
      }
    }
  }

  function paint() {
    if (painting) return
    painting = requestAnimationFrame(() => {
      painting = 0
      if (spinning) {
        // One slow revolution says "this is three dimensional" better than any
        // label could, then it settles back exactly where it started.
        spun += SPIN
        view.yaw += SPIN
        if (spun >= Math.PI * 2) settle()
        paint()
      }
      draw()
    })
  }

  // ─── Interaction ────────────────────────────────────────────────────────────

  function settle() {
    spinning = false
  }

  const pointers = new Map()
  let pinch = 0

  canvas.addEventListener('pointerdown', (event) => {
    settle()
    canvas.setPointerCapture(event.pointerId)
    pointers.set(event.pointerId, event)
    element.classList.add('is-dragging')
    if (pointers.size === 2) pinch = pinchSpan()
  })

  canvas.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) {
      const found = pick(event)
      if (found?.series !== hover?.series || found?.point !== hover?.point) {
        hover = found
        showTip(event, found)
        paint()
      } else if (found) showTip(event, found)
      return
    }

    const last = pointers.get(event.pointerId)
    pointers.set(event.pointerId, event)

    if (pointers.size === 2) {
      const now = pinchSpan()
      if (pinch) zoomBy(now / pinch)
      pinch = now
      return
    }

    view.yaw += ((event.clientX - last.clientX) / Math.min(width, height)) * 3.4
    view.pitch = clamp(view.pitch + ((event.clientY - last.clientY) / Math.min(width, height)) * 3.4, -PITCH_LIMIT, PITCH_LIMIT)
    paint()
  })

  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
    canvas.addEventListener(type, (event) => {
      pointers.delete(event.pointerId)
      if (pointers.size < 2) pinch = 0
      if (!pointers.size) element.classList.remove('is-dragging')
      if (type === 'pointerleave') {
        hover = null
        tip.classList.remove('is-shown')
        paint()
      }
    })
  }

  function pinchSpan() {
    const [a, b] = [...pointers.values()]
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
  }

  // Plain scrolling belongs to the page; ⌘ or ctrl (which is what a trackpad
  // pinch sends) zooms the plot instead.
  canvas.addEventListener(
    'wheel',
    (event) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      settle()
      zoomBy(Math.exp(-event.deltaY / 240))
    },
    { passive: false },
  )

  canvas.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? 0.24 : 0.08
    const keys = {
      ArrowLeft: () => (view.yaw -= step),
      ArrowRight: () => (view.yaw += step),
      ArrowUp: () => (view.pitch = clamp(view.pitch - step, -PITCH_LIMIT, PITCH_LIMIT)),
      ArrowDown: () => (view.pitch = clamp(view.pitch + step, -PITCH_LIMIT, PITCH_LIMIT)),
      '+': () => zoomBy(1.15),
      '=': () => zoomBy(1.15),
      '-': () => zoomBy(1 / 1.15),
    }
    if (!keys[event.key]) return
    event.preventDefault()
    settle()
    keys[event.key]()
    paint()
  })

  element.querySelector('.scatter3d-tools').addEventListener('click', (event) => {
    const action = event.target.closest('button')?.dataset.act
    if (!action) return
    settle()
    if (action === 'in') zoomBy(1.2)
    if (action === 'out') zoomBy(1 / 1.2)
    if (action === 'reset') {
      view = { ...home }
      fit()
      paint()
    }
    if (action === 'full') {
      document.fullscreenElement ? document.exitFullscreen() : element.requestFullscreen?.()
    }
  })

  function zoomBy(factor) {
    view.zoom = clamp(view.zoom * factor, 0.6, 4)
    paint()
  }

  // ─── Hover ──────────────────────────────────────────────────────────────────

  function pick(event) {
    const box = canvas.getBoundingClientRect()
    const x = event.clientX - box.left
    const y = event.clientY - box.top

    let nearest = null
    let distance = 13
    for (let i = frame.length - 1; i >= 0; i--) {
      const mark = frame[i]
      const away = Math.hypot(mark.x - x, mark.y - y)
      if (away <= mark.radius + 1) return mark // straight through the front-most point
      if (away < distance) {
        distance = away
        nearest = mark
      }
    }
    return nearest
  }

  function showTip(event, mark) {
    if (!mark) {
      tip.classList.remove('is-shown')
      return
    }
    const note = notes[mark.series][mark.point]
    tip.innerHTML = `<b>${series[mark.series].name}</b>${note ? `<span>${note}</span>` : ''}`
    tip.classList.add('is-shown')

    const box = canvas.getBoundingClientRect()
    const x = event.clientX - box.left
    const y = event.clientY - box.top
    tip.style.left = `${clamp(x, 8, width - tip.offsetWidth - 8)}px`
    tip.style.top = `${Math.max(4, y - tip.offsetHeight - 12)}px`
  }

  // ─── Size, visibility ───────────────────────────────────────────────────────

  new ResizeObserver(([entry]) => {
    const box = entry.contentRect
    if (!box.width || !box.height) return
    width = box.width
    height = box.height
    const ratio = Math.min(devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    fit()
    paint()
  }).observe(stage)

  // Only spin while the plot is actually on screen, and only until it is touched.
  new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) paint()
      else if (painting) {
        cancelAnimationFrame(painting)
        painting = 0
      }
    },
    { threshold: 0.15 },
  ).observe(element)

  readTheme()
  paint()
}

function icon(path) {
  return `<svg viewBox="0 0 14 14" aria-hidden="true"><path d="${path}"/></svg>`
}

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value))
}
