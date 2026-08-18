// Small line marks that sit beside a publication, echoing the icons on the CV.
// Reference one from a publication's `mark:` field. Add new ones here.

const svg = (paths) =>
  `<svg class="mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`

export const marks = {
  boundary: svg('<path d="M12 3 21.5 20H2.5z"/><path d="M7.3 14h9.4"/>'),
  manifold: svg('<circle cx="12" cy="12" r="9"/><path d="M12 3c-3.2 3-3.2 15 0 18M12 3c3.2 3 3.2 15 0 18M3.4 9h17.2M3.4 15h17.2"/>'),
  density: svg('<path d="M3 20h18"/><rect x="4.5" y="12" width="3.4" height="8"/><rect x="10.3" y="8" width="3.4" height="12"/><rect x="16.1" y="14" width="3.4" height="6"/><path d="M3.5 8.5 8 4.5l4.5 3 6-5"/>'),
  rain: svg('<path d="M7 15a4.2 4.2 0 0 1-.3-8.4 5.6 5.6 0 0 1 10.7 1.2A3.6 3.6 0 0 1 17 15z"/><path d="M8.5 18v2M12 18.5v2.5M15.5 18v2"/>'),
  graph: svg('<circle cx="5" cy="7" r="2.1"/><circle cx="18.5" cy="5.5" r="2.1"/><circle cx="12" cy="14" r="2.1"/><circle cx="6" cy="19" r="2.1"/><path d="M6.7 8.4 10.5 12.6M16.6 7 13.4 12.2M10.9 15.7 7.3 17.6"/>'),
  text: svg('<path d="M4 4.5h16M4 4.5V8M20 4.5V8M12 4.5V20M9 20h6"/>'),
  timescore: svg('<path d="M4 3.5v17h16.5"/><path d="M6.5 17.5c3 0 3.2-9 7-9 3 0 3.6 4.6 6.5 4.6"/><path d="M8.6 14.8 16 6.6"/>'),
  spark: svg('<path d="M12 2.5 13.9 9l6.6 1.9-6.6 1.9L12 19.4 10.1 12.8 3.5 10.9 10.1 9z"/><path d="M18.5 16.5 19.3 19l2.5.8-2.5.8-.8 2.5"/>'),
  city: svg('<path d="M3 21h18"/><path d="M5 21V9l5-3.5V21"/><path d="M14 21V11l5 2.5V21"/><path d="M7.4 12h.01M7.4 15.5h.01M11.6 12h.01M11.6 15.5h.01M16.4 16h.01"/>'),
  code: svg('<path d="m8.5 8-5 4 5 4M15.5 8l5 4-5 4M13.6 4.5l-3.2 15"/>'),
}

export function mark(name) {
  return marks[name] ?? marks.spark
}
