// Click a hero or figure to see it full size without leaving the page.
// Click anywhere, or press Escape, to dismiss.

const dialog = document.createElement('dialog')
dialog.className = 'lightbox'
dialog.innerHTML = '<img alt=""><p class="lightbox-caption"></p>'
document.body.append(dialog)

const image = dialog.querySelector('img')
const caption = dialog.querySelector('.lightbox-caption')

function open(source) {
  image.src = source.currentSrc || source.src
  image.alt = source.alt

  const figcaption = source.closest('figure')?.querySelector('figcaption')
  caption.innerHTML = figcaption?.innerHTML ?? ''
  caption.hidden = !figcaption

  dialog.showModal()
}

for (const source of document.querySelectorAll('.post-hero, .prose .figure img')) {
  source.classList.add('zoomable')
  source.addEventListener('click', () => open(source))
}

dialog.addEventListener('click', () => dialog.close())

// Links inside a caption should still work.
caption.addEventListener('click', (event) => {
  if (event.target.closest('a')) event.stopPropagation()
})
