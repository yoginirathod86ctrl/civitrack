export const state = {
  user: null,
  unread: 0,
  config: {
    areas: [],
    categories: [],
    statuses: ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed'],
    priorities: ['Low', 'Medium', 'High', 'Critical'],
    transitions: {
      'Submitted': ['Under Review', 'Assigned', 'In Progress', 'Resolved'],
      'Under Review': ['Assigned', 'In Progress', 'Resolved'],
      'Assigned': ['In Progress', 'Resolved'],
      'In Progress': ['Resolved'],
      'Resolved': ['Closed', 'Under Review'],
      'Closed': ['Under Review']
    },
    note: ''
  },
  route: null,
  publicSummary: null,
  notifications: null,
  sidebarOpen: false,
  lastComplaintFilters: {
    status: 'All',
    priority: 'All',
    area: 'All',
    search: '',
    sort: 'recent'
  }
};

export function setUser(user) {
  state.user = user || null;
  if (!user) {
    state.unread = 0;
    state.notifications = null;
  }
}

export function setUnread(count) {
  state.unread = Math.max(0, Number(count) || 0);
  updateUnreadBadges();
}

export function updateUnreadBadges() {
  document.querySelectorAll('[data-unread-count]').forEach((node) => {
    node.textContent = state.unread > 99 ? '99+' : String(state.unread);
    node.classList.toggle('hidden', state.unread === 0);
  });
}

export function initials(name = '') {
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase() || 'CP';
}

export function roleLabel(role) {
  return role === 'admin' ? 'Authority admin' : 'Citizen';
}

export const CATEGORY_META = {
  'Road Damage': { icon: 'construction', tone: 'orange' },
  'Garbage Overflow': { icon: 'trash-2', tone: 'teal' },
  'Waterlogging': { icon: 'waves', tone: 'cyan' },
  'Streetlight Issues': { icon: 'lightbulb', tone: 'purple' },
  'Electrical Hazards': { icon: 'zap', tone: 'orange' },
  'Drainage Problems': { icon: 'droplet', tone: 'cyan' },
  'Other': { icon: 'flag', tone: 'teal' }
};

export function categoryMeta(category) {
  return CATEGORY_META[category] || CATEGORY_META.Other;
}
