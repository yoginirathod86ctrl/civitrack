import { initials } from './store.js';

const ICON_PATHS = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  'file-plus': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9 15h6"/>',
  'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
  list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  'log-in': '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-up': '<path d="m18 15-6-6-6 6"/>',
  'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  'arrow-up': '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  'arrow-down': '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  'arrow-up-right': '<path d="M7 17 17 7"/><path d="M7 7h10v10"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  'check-circle': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  'check-square': '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  'alert-circle': '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  'alert-triangle': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  'x-circle': '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  'shield-check': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  'trash-2': '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="m2 2 20 20"/><path d="M6.71 6.71a10.7 10.7 0 0 0-4.65 4.94 1 1 0 0 0 0 .7 10.75 10.75 0 0 0 14.3 5.16"/><path d="M10.73 5.08A10.7 10.7 0 0 1 21.94 11.65a1 1 0 0 1 0 .7 10.7 10.7 0 0 1-1.67 2.68"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  'user-plus': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
  'map-pin': '<path d="M20 10c0 4.99-5.54 10.19-7.4 11.79a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  map: '<path d="M14.11 4.44a2 2 0 0 0-1.68-.04l-3.86 1.7a2 2 0 0 1-1.68-.04L3.66 4.49A1 1 0 0 0 2 5.36v13.78a1 1 0 0 0 .61.92l3.66 1.62a2 2 0 0 0 1.68.04l3.86-1.7a2 2 0 0 1 1.68.04l3.23 1.57a1 1 0 0 0 1.66-.92V6.07a1 1 0 0 0-.61-.92z"/><path d="M15 5.76v14.28"/><path d="M9 4.22v14.28"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/><path d="M12 14h.01"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  tools: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  lightbulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  waves: '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  construction: '<rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7"/><path d="M7 14v7"/><path d="M17 3v3"/><path d="M7 3v3"/><path d="M10 14 2.3 6.3"/><path d="m14 6 7.7 7.7"/><path d="m8 6 8 8"/>',
  'more-horizontal': '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  copy: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  'external-link': '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  'message-square': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  'help-circle': '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  'plus-circle': '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/>',
  minus: '<path d="M5 12h14"/>',
  'bar-chart': '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  'pie-chart': '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  'trending-up': '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  'trending-down': '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="m22 12.5-9.17 4.16a2 2 0 0 1-1.66 0L2 12.5"/><path d="m22 17.5-9.17 4.16a2 2 0 0 1-1.66 0L2 17.5"/>',
  sliders: '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  circle: '<circle cx="12" cy="12" r="10"/>',
  star: '<path d="M11.53 2.3a.5.5 0 0 1 .94 0l2.3 5.1 5.56.57a.5.5 0 0 1 .28.87l-4.17 3.76 1.2 5.46a.5.5 0 0 1-.73.54L12 15.7l-4.91 2.9a.5.5 0 0 1-.73-.54l1.2-5.46L3.4 8.84a.5.5 0 0 1 .28-.87l5.56-.57z"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
  cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v2"/><path d="M15 2v2"/><path d="M9 20v2"/><path d="M15 20v2"/><path d="M2 9h2"/><path d="M2 15h2"/><path d="M20 9h2"/><path d="M20 15h2"/>',
  wand: '<path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/>'
};

export function icon(name, className = '') {
  const path = ICON_PATHS[name] || ICON_PATHS.circle;
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

export function esc(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function attr(value = '') {
  return esc(value);
}

export function fmtNumber(value) {
  return new Intl.NumberFormat('en-IN').format(Number(value) || 0);
}

export function fmtDate(value, options = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options
  }).format(date);
}

export function fmtDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function fmtTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function timeAgo(value) {
  if (!value) return '—';
  const diff = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (!Number.isFinite(diff)) return '—';
  if (diff < 45) return 'just now';
  if (diff < 90) return '1 min ago';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 7200) return '1 hour ago';
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 172800) return 'yesterday';
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return fmtDate(value);
}

export function fmtDuration(seconds, compact = false) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days > 0) return compact ? `${days}d ${hours}h` : `${days} day${days === 1 ? '' : 's'} ${hours} hr`;
  if (hours > 0) return compact ? `${hours}h ${minutes}m` : `${hours} hr ${minutes} min`;
  if (minutes > 0) return compact ? `${minutes}m` : `${minutes} min`;
  return compact ? '<1m' : 'under a minute';
}

export function fmtHours(hours) {
  const value = Number(hours) || 0;
  if (value < 1) return `${Math.round(value * 60)} min`;
  if (value < 24) return `${value} hr`;
  return `${Math.round((value / 24) * 10) / 10} days`;
}

export function deadlineText(complaint) {
  if (!complaint) return '—';
  if (complaint.status === 'Resolved' || complaint.status === 'Closed') return complaint.resolvedAt ? `Resolved ${fmtDate(complaint.resolvedAt)}` : 'Completed';
  if (complaint.overdue) return `Overdue by ${fmtDuration(complaint.overdueSeconds, true)}`;
  return `${fmtDuration(complaint.remainingSeconds, true)} left`;
}

export function statusKey(status = '') {
  return {
    'Submitted': 'submitted',
    'Under Review': 'review',
    'Assigned': 'assigned',
    'In Progress': 'progress',
    'Resolved': 'resolved',
    'Closed': 'closed'
  }[status] || 'submitted';
}

export function statusBadge(status) {
  return `<span class="badge badge-${statusKey(status)}">${esc(status || 'Unknown')}</span>`;
}

export function priorityBadge(priority) {
  const key = String(priority || 'Low').toLowerCase();
  return `<span class="badge badge-${key}">${esc(priority || 'Low')}</span>`;
}

export function categoryChip(category, withLabel = true) {
  const meta = { 'Road Damage': 'construction', 'Garbage Overflow': 'trash-2', 'Waterlogging': 'waves', 'Streetlight Issues': 'lightbulb', 'Electrical Hazards': 'zap', 'Drainage Problems': 'droplet', 'Other': 'flag' }[category] || 'flag';
  return `<span class="pill pill-teal">${icon(meta)}${withLabel ? esc(category) : ''}</span>`;
}

export function avatar(name, className = '') {
  return `<span class="avatar ${className}" aria-hidden="true">${esc(initials(name))}</span>`;
}

export function emptyState({ iconName = 'inbox', title = 'Nothing here yet', text = '', action = '' }) {
  return `<div class="empty-state">
    <div class="empty-icon">${icon(iconName)}</div>
    <h3>${esc(title)}</h3>
    ${text ? `<p>${esc(text)}</p>` : ''}
    ${action}
  </div>`;
}

export function errorState({ title = 'Something went wrong', text = 'Please try again.', action = '' } = {}) {
  return `<div class="error-state">
    <div class="error-code">!</div>
    <h2>${esc(title)}</h2>
    <p>${esc(text)}</p>
    ${action || `<button class="btn btn-navy" data-retry>${icon('refresh')} Try again</button>`}
  </div>`;
}

export function loadingState(text = 'Loading…') {
  return `<div class="loading-panel"><span class="spinner spinner-lg"></span><span>${esc(text)}</span></div>`;
}

export function skeletonStats(count = 4) {
  return `<div class="stats-grid">${Array.from({ length: count }, () => `
    <div class="stat-card"><div class="skeleton" style="height:14px;width:40%;margin-bottom:16px"></div><div class="skeleton" style="height:30px;width:55%;margin-bottom:8px"></div><div class="skeleton" style="height:10px;width:65%"></div></div>
  `).join('')}</div>`;
}

export function toast(message, type = 'success', title = '') {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const iconName = { success: 'check-circle', error: 'alert-circle', warning: 'alert-triangle', info: 'info' }[type] || 'info';
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icon(iconName)}<div><strong>${esc(title || { success: 'Done', error: 'Something went wrong', warning: 'Attention', info: 'Heads up' }[type] || 'Notice')}</strong><p>${esc(message)}</p></div><button class="toast-close" aria-label="Dismiss">${icon('x')}</button>`;
  const remove = () => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => el.remove(), 180);
  };
  el.querySelector('.toast-close').addEventListener('click', remove);
  root.appendChild(el);
  setTimeout(remove, type === 'error' ? 6500 : 4200);
}

function trapFocus(container, event) {
  if (event.key !== 'Tab') return;
  const focusables = [...container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((el) => el.offsetParent !== null);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function modal({ title = '', subtitle = '', body = '', footer = '', size = '', onMount = null, dismissible = true, iconName = '' }) {
  const root = document.getElementById('modal-root');
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  const id = `modal-${Date.now()}`;
  backdrop.innerHTML = `<div class="modal ${size ? `modal-${size}` : ''}" role="dialog" aria-modal="true" aria-labelledby="${id}">
    <div class="modal-head">
      <div>${iconName ? `<div class="modal-icon">${icon(iconName)}</div>` : ''}<h2 id="${id}">${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>
      ${dismissible ? `<button class="modal-close" data-modal-close aria-label="Close">${icon('x')}</button>` : ''}
    </div>
    <div class="modal-body">${body}</div>
    ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
  </div>`;
  let closed = false;
  const close = (value) => {
    if (closed) return;
    closed = true;
    document.body.classList.remove('modal-open');
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
    if (typeof backdrop._resolve === 'function') backdrop._resolve(value);
  };
  const onKey = (event) => {
    if (event.key === 'Escape' && dismissible) close(null);
    trapFocus(backdrop, event);
  };
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop && dismissible) close(null);
  });
  backdrop.querySelectorAll('[data-modal-close]').forEach((button) => button.addEventListener('click', () => close(null)));
  document.addEventListener('keydown', onKey);
  document.body.classList.add('modal-open');
  root.appendChild(backdrop);
  if (onMount) onMount(backdrop, close);
  setTimeout(() => {
    const focusable = backdrop.querySelector('input:not([type="hidden"]), select, textarea, button:not([data-modal-close])');
    if (focusable) focusable.focus();
  }, 40);
  return close;
}

export function confirmDialog({ title = 'Please confirm', message = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'danger', iconName = 'alert-triangle' }) {
  return new Promise((resolve) => {
    const close = modal({
      title,
      body: `<div class="modal-icon ${tone === 'danger' ? 'danger' : tone === 'success' ? 'success' : ''}">${icon(iconName)}</div><p class="muted" style="font-size:.82rem;line-height:1.65;margin:0">${esc(message)}</p>`,
      footer: `<button class="btn btn-secondary" data-cancel>${esc(cancelLabel)}</button><button class="btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}" data-confirm>${esc(confirmLabel)}</button>`,
      size: 'sm',
      onMount(root, done) {
        root._resolve = resolve;
        root.querySelector('[data-cancel]').addEventListener('click', () => done(false));
        root.querySelector('[data-confirm]').addEventListener('click', () => done(true));
      }
    });
    const root = document.getElementById('modal-root').lastElementChild;
    const originalClose = close;
    root._cleanup = () => resolve(false);
    void originalClose;
  });
}

export function drawer({ title = '', subtitle = '', body = '', footer = '', onMount = null }) {
  const root = document.getElementById('drawer-root');
  const backdrop = document.createElement('div');
  backdrop.className = 'drawer-backdrop';
  const wrapper = document.createElement('aside');
  wrapper.className = 'drawer';
  wrapper.setAttribute('role', 'dialog');
  wrapper.setAttribute('aria-modal', 'true');
  wrapper.innerHTML = `
    <div class="drawer-head">
      <div><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>
      <button class="btn-icon" data-drawer-close aria-label="Close">${icon('x')}</button>
    </div>
    <div class="drawer-body">${body}</div>
    ${footer ? `<div class="drawer-footer">${footer}</div>` : ''}`;
  const close = () => {
    document.body.classList.remove('modal-open');
    backdrop.remove();
    wrapper.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (event) => {
    if (event.key === 'Escape') close();
    trapFocus(wrapper, event);
  };
  backdrop.addEventListener('click', close);
  wrapper.querySelector('[data-drawer-close]').addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.classList.add('modal-open');
  root.appendChild(backdrop);
  root.appendChild(wrapper);
  if (onMount) onMount(wrapper, close);
  return close;
}

export function updateCountdowns(scope = document) {
  scope.querySelectorAll('[data-deadline]').forEach((node) => {
    if (node.dataset.closed === '1') return;
    const deadline = new Date(node.dataset.deadline).getTime();
    if (Number.isNaN(deadline)) return;
    const diff = Math.round((deadline - Date.now()) / 1000);
    node.textContent = diff >= 0 ? `${fmtDuration(diff, true)} left` : `Overdue by ${fmtDuration(Math.abs(diff), true)}`;
    if (diff < 0) node.classList.add('overdue');
  });
}

export function downloadButton(label, format = 'csv', iconName = 'download') {
  return `<button class="btn btn-secondary" data-export="${esc(format)}">${icon(iconName)}${esc(label)}</button>`;
}

export function pageHeader({ title, subtitle = '', breadcrumb = '', actions = '', meta = '' }) {
  return `<div class="page-head">
    <div class="page-head-main">
      ${breadcrumb ? `<div class="breadcrumbs">${breadcrumb}</div>` : ''}
      <h1>${esc(title)}</h1>
      ${subtitle ? `<p>${esc(subtitle)}</p>` : ''}
      ${meta ? `<div class="page-head-meta">${meta}</div>` : ''}
    </div>
    ${actions ? `<div class="page-actions">${actions}</div>` : ''}
  </div>`;
}

export function complaintCard(c, { admin = false, href = '' } = {}) {
  const target = href || `${admin ? '/admin' : '/citizen'}/complaints/${encodeURIComponent(c.id)}`;
  return `<article class="complaint-card" data-id="${esc(c.id)}">
    <div class="complaint-severity ${esc((c.priority || '').toLowerCase())}"></div>
    <div class="complaint-main">
      <div class="complaint-top">
        <div class="complaint-heading">
          <div class="complaint-id-row">
            <span class="complaint-id">${esc(c.id)}</span>
            ${c.isDemo ? '<span class="badge badge-demo">DEMO</span>' : ''}
            ${c.overdue ? '<span class="badge badge-overdue">Overdue</span>' : ''}
          </div>
          <h3 class="complaint-title"><a href="${target}">${esc(c.description?.slice(0, 110) || c.category)}${(c.description || '').length > 110 ? '…' : ''}</a></h3>
          <p class="complaint-desc">${esc(c.description || '')}</p>
        </div>
        <div class="complaint-badges">${priorityBadge(c.priority)}${statusBadge(c.status)}</div>
      </div>
      <div class="complaint-meta">
        <span>${icon('flag')}${esc(c.category)}</span>
        <span>${icon('map-pin')}${esc(c.area)}</span>
        <span>${icon('building')}${esc(c.departmentName || 'Unassigned')}</span>
        <span>${icon('calendar')}${timeAgo(c.createdAt)}</span>
        <span class="${c.overdue ? 'overdue' : ''}">${icon('clock')}<span data-deadline="${esc(c.deadline)}" data-closed="${c.status === 'Resolved' || c.status === 'Closed' ? '1' : '0'}">${esc(deadlineText(c))}</span></span>
      </div>
      <div class="complaint-actions">
        <a class="btn btn-secondary" href="${target}">${icon('eye')} View details</a>
        ${admin && c.status !== 'Closed' ? `<a class="btn btn-ghost" href="${target}?action=update">${icon('edit')} Update</a>` : ''}
        ${c.citizen ? `<span class="complaint-reporter">${icon('user')} ${esc(c.citizen.fullName)}</span>` : ''}
      </div>
    </div>
  </article>`;
}
