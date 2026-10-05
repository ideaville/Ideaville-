const base = 'viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

const PATHS = {
  back: `<path d="M15 5 8 12l7 7"/>`,
  heart: `<path d="M12 19s-7-4.4-7-8.5A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 7 2.5C19 14.6 12 19 12 19z"/>`,
  search: `<circle cx="11" cy="11" r="6"/><path d="m20 20-3.5-3.5"/>`,
  board: `<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>`,
  clock: `<circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/>`,
  bell: `<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 18a2 2 0 0 0 4 0"/>`,
  chevronLeft: `<path d="M14 6 8 12l6 6"/>`,
  chevronRight: `<path d="m10 6 6 6-6 6"/>`,
  send: `<path d="M12 19V6"/><path d="m6 11 6-6 6 6"/>`,
  check: `<path d="m5 12 5 5L20 7"/>`,
  plus: `<path d="M12 5v14M5 12h14"/>`,
};

export function icon(name) {
  if (name === 'heart-on') {
    return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor"><path d="M12 19s-7-4.4-7-8.5A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 7 2.5C19 14.6 12 19 12 19z"/></svg>`;
  }
  if (name === 'home') {
    return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M4.2 10.6 12 4l7.8 6.6V20a1 1 0 0 1-1 1h-4.3v-6.2H9.5V21H5.2a1 1 0 0 1-1-1z"/></svg>`;
  }
  if (name === 'home-line') {
    return `<svg ${base}><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/></svg>`;
  }
  return `<svg ${base}>${PATHS[name] || ''}</svg>`;
}
