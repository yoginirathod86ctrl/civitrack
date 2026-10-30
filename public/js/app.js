import { api } from './api.js';
import { navigate, parseRoute } from './router.js';
import {
  initials,
  roleLabel,
  setUnread,
  setUser,
  state,
  updateUnreadBadges
} from './store.js';
import {
  drawer,
  emptyState,
  errorState,
  esc,
  icon,
  loadingState,
  pageHeader,
  timeAgo,
  toast,
  updateCountdowns
} from './ui.js';
import { renderForgot, renderLanding, renderLogin, renderSignup } from './views/public.js';
import {
  renderCitizenComplaintDetail,
  renderCitizenComplaints,
  renderCitizenDashboard,
  renderCitizenReport,
  renderCitizenTrack
} from './views/citizen.js';
import { renderNotifications, renderProfile } from './views/common.js';
import {
  renderAdminAnalytics,
  renderAdminComplaints,
  renderAdminDashboard,
  renderAdminDepartments,
  renderAdminHotspots,
  renderAdminMap,
  renderAdminOverdue,
  renderAdminPriority,
  renderAdminReports,
  renderAdminTimers,
  renderAdminUsers
} from './views/admin.js';
import { renderAdminComplaintDetail } from './views/admin-detail.js';

const appRoot = document.getElementById('app');
const PUBLIC_PATHS = new Set(['/', '/login', '/signup', '/forgot-password']);
const NOTIFICATION_META = {
  submitted: { iconName: 'file-plus', tone: '' },
  status: { iconName: 'refresh', tone: 'teal' },
  assignment: { iconName: 'building', tone: 'orange' },
  resolved: { iconName: 'check-circle', tone: 'teal' },
  overdue: { iconName: 'alert-triangle', tone: 'red' },
  escalation: { iconName: 'alert-triangle', tone: 'red' },
  deadline: { iconName: 'clock', tone: 'orange' },
  new_complaint: { iconName: 'inbox', tone: '' },
  authority_update: { iconName: 'message-square', tone: 'teal' },
  password_request: { iconName: 'key', tone: 'orange' }
};
const NAV = {
  citizen: [
    {
      label: 'Overview',
      items: [
        { href: '/citizen/dashboard', label: 'Dashboard', iconName: 'dashboard' },
        { href: '/citizen/report', label: 'Report an issue', iconName: 'file-plus' }
      ]
    },
    {
      label: 'My reports',
      items: [
        { href: '/citizen/complaints', label: 'My complaints', iconName: 'list' },
        { href: '/citizen/track', label: 'Track complaint', iconName: 'search' }
      ]
    },
    {
      label: 'Account',
      items: [
        { href: '/citizen/notifications', label: 'Notifications', iconName: 'bell', unread: true },
        { href: '/citizen/profile', label: 'Profile & settings', iconName: 'settings' }
      ]
    }
  ],
  admin: [
    {
      label: 'Command centre',
      items: [
        { href: '/admin/dashboard', label: 'Dashboard', iconName: 'dashboard' },
        { href: '/admin/complaints', label: 'All complaints', iconName: 'list' },
        { href: '/admin/priority', label: 'Priority queue', iconName: 'flag' }
      ]
    },
    {
      label: 'Response',
      items: [
        { href: '/admin/timers', label: 'SLA timers', iconName: 'clock' },
        { href: '/admin/overdue', label: 'Overdue', iconName: 'alert-triangle' },
        { href: '/admin/hotspots', label: 'Hotspots', iconName: 'map-pin' },
        { href: '/admin/map', label: 'City map', iconName: 'map' }
      ]
    },
    {
      label: 'Insight',
      items: [
        { href: '/admin/analytics', label: 'Analytics', iconName: 'bar-chart' },
        { href: '/admin/reports', label: 'Reports & exports', iconName: 'download' }
      ]
    },
    {
      label: 'Administration',
      items: [
        { href: '/admin/users', label: 'Citizens', iconName: 'users' },
        { href: '/admin/departments', label: 'Departments', iconName: 'building' }
      ]
    },
    {
      label: 'Account',
      items: [
        { href: '/admin/notifications', label: 'Notifications', iconName: 'bell', unread: true },
        { href: '/admin/profile', label: 'Profile & settings', iconName: 'settings' }
      ]
    }
  ]
};
const PAGE_TITLES = {
  '/': 'Home',
  '/login': 'Sign in',
  '/signup': 'Create account',
  '/forgot-password': 'Forgot password',
  '/citizen/dashboard': 'Citizen dashboard',
  '/citizen/report': 'Report an issue',
  '/citizen/complaints': 'My complaints',
  '/citizen/track': 'Track complaint',
  '/citizen/profile': 'Profile & settings',
  '/citizen/notifications': 'Notifications',
  '/admin/dashboard': 'Authority dashboard',
  '/admin/complaints': 'All complaints',
  '/admin/priority': 'Priority queue',
  '/admin/timers': 'SLA timers',
  '/admin/overdue': 'Overdue complaints',
  '/admin/hotspots': 'Hotspots',
  '/admin/map': 'City map',
  '/admin/analytics': 'Analytics',
  '/admin/users': 'Citizens',
  '/admin/departments': 'Departments',
  '/admin/reports': 'Reports & exports',
  '/admin/profile': 'Profile & settings',
  '/admin/notifications': 'Notifications'
};

let mountedRole = null;
let renderVersion = 0;
let drawerClose = null;

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function homeFor(role) {
  return role === 'admin' ? '/admin/dashboard' : '/citizen/dashboard';
}

function roleForPath(path) {
  if (path === '/admin' || path.startsWith('/admin/')) return 'admin';
  if (path === '/citizen' || path.startsWith('/citizen/')) return 'citizen';
  return null;
}

function isPublicPath(path) {
  return PUBLIC_PATHS.has(path);
}

function navIsActive(href, path) {
  if (href === path) return true;
  if (href === '/admin/dashboard' || href === '/citizen/dashboard') return false;
  return path.startsWith(`${href}/`);
}

function pageTitle(path) {
  if (path.startsWith('/admin/complaints/')) return 'Complaint workspace';
  if (path.startsWith('/citizen/complaints/')) return 'Complaint details';
  return PAGE_TITLES[path] || 'Page not found';
}

function navBadge(item) {
  if (!item.unread) return '';
  return `<span class="nav-badge cyan ${state.unread ? '' : 'hidden'}" data-unread-count>${state.unread > 99 ? '99+' : state.unread}</span>`;
}

function navItem(item, path) {
  return `<a class="nav-item ${navIsActive(item.href, path) ? 'active' : ''}" href="${item.href}" data-nav="${item.href}">
    <span class="nav-icon">${icon(item.iconName)}</span>
    <span class="nav-text">${esc(item.label)}</span>
    ${navBadge(item)}
  </a>`;
}

function sidebarMarkup(role, path) {
  const groups = NAV[role] || NAV.citizen;
  return `<div class="sidebar-scroll">
    ${groups.map((group) => `<div class="sidebar-section">
      <span class="sidebar-label">${esc(group.label)}</span>
      <nav class="sidebar-nav" aria-label="${esc(group.label)}">${group.items.map((item) => navItem(item, path)).join('')}</nav>
    </div>`).join('')}
    <div class="sidebar-card">
      <div class="sidebar-card-head">${icon('sparkles')} Prototype build</div>
      <p>AI triage uses transparent local rules. Demo complaints are clearly labelled with a DEMO badge.</p>
    </div>
  </div>`;
}

function shellMarkup(role, path) {
  const user = state.user;
  const profilePath = `${role === 'admin' ? '/admin' : '/citizen'}/profile`;
  const notificationsPath = `${role === 'admin' ? '/admin' : '/citizen'}/notifications`;
  const searchPlaceholder = role === 'admin' ? 'Search complaints, citizens, areas...' : 'Search your complaints...';
  return `<div class="app-shell">
    <aside class="sidebar" aria-label="Primary navigation">
      <div class="sidebar-brand">
        <a class="brand brand-light" href="${homeFor(role)}">
          <span class="brand-mark" aria-hidden="true">${icon('activity')}</span>
          <span><span class="brand-name">Civic<span>Pulse</span> AI</span><span class="brand-sub">From complaints to action</span></span>
        </a>
      </div>
      ${sidebarMarkup(role, path)}
      <div class="sidebar-user">
        <a href="${profilePath}" class="flex gap-10 items-center" style="min-width:0;flex:1;color:inherit">
          <span class="sidebar-avatar" data-shell-avatar>${initials(user.fullName)}</span>
          <span class="sidebar-user-info">
            <span class="sidebar-user-name" data-shell-name>${esc(user.fullName)}</span>
            <span class="sidebar-user-role" data-shell-role>${esc(roleLabel(user.role))}</span>
          </span>
        </a>
        <button class="sidebar-user-action" type="button" data-logout title="Sign out" aria-label="Sign out">${icon('logout')}</button>
      </div>
    </aside>
    <div class="sidebar-overlay" data-sidebar-close></div>
    <div class="app-main">
      <header class="topbar">
        <button class="mobile-menu" type="button" data-sidebar-toggle aria-label="Open navigation">${icon('menu')}</button>
        <form class="topbar-search" data-global-search role="search">
          ${icon('search')}
          <input type="search" data-global-search-input placeholder="${esc(searchPlaceholder)}" aria-label="Search complaints">
          <span class="topbar-kbd">/</span>
        </form>
        <div class="topbar-spacer"></div>
        <div class="topbar-actions">
          <span class="topbar-live">Live</span>
          <button class="topbar-icon" type="button" data-notifications aria-label="Open notifications">
            ${icon('bell')}
            <span class="badge badge-count ${state.unread ? '' : 'hidden'}" data-unread-count>${state.unread > 99 ? '99+' : state.unread}</span>
          </button>
          <div class="topbar-divider"></div>
          <a class="topbar-profile" href="${profilePath}" aria-label="Open profile">
            <span class="avatar avatar-sm" data-shell-avatar>${initials(user.fullName)}</span>
            <span class="topbar-profile-name" data-shell-name>${esc(user.fullName)}</span>
            ${icon('chevron-down')}
          </a>
        </div>
      </header>
      <main class="page-content" id="page-root"></main>
    </div>
  </div>`;
}

function updateShellUser() {
  const shell = appRoot.querySelector('.app-shell');
  if (!shell || !state.user) return;
  shell.querySelectorAll('[data-shell-name]').forEach((node) => { node.textContent = state.user.fullName; });
  shell.querySelectorAll('[data-shell-role]').forEach((node) => { node.textContent = roleLabel(state.user.role); });
  shell.querySelectorAll('[data-shell-avatar]').forEach((node) => { node.textContent = initials(state.user.fullName); });
  updateUnreadBadges();
}

function updateNavActive() {
  const path = location.pathname;
  document.querySelectorAll('.nav-item[data-nav]').forEach((link) => {
    link.classList.toggle('active', navIsActive(link.dataset.nav, path));
  });
}

function bindShell(shell, role) {
  const search = shell.querySelector('[data-global-search]');
  search?.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = search.querySelector('input')?.value.trim() || '';
    const target = role === 'admin' ? '/admin/complaints' : '/citizen/complaints';
    document.body.classList.remove('sidebar-open');
    navigate(value ? `${target}?search=${encodeURIComponent(value)}` : target);
  });
}

function mountShell(role) {
  if (!state.user) return;
  if (mountedRole === role && appRoot.querySelector('.app-shell')) {
    updateShellUser();
    updateNavActive();
    return;
  }
  mountedRole = role;
  document.body.classList.remove('sidebar-open');
  appRoot.innerHTML = shellMarkup(role, location.pathname);
  const shell = appRoot.querySelector('.app-shell');
  bindShell(shell, role);
  updateShellUser();
}

function mountPublic() {
  mountedRole = null;
  document.body.classList.remove('sidebar-open');
}

function freshViewRoot() {
  const page = document.getElementById('page-root');
  if (!page) return appRoot;
  const wrapper = document.createElement('div');
  wrapper.className = 'view-root';
  page.replaceChildren(wrapper);
  window.scrollTo(0, 0);
  return wrapper;
}

function freshPublicRoot() {
  const wrapper = document.createElement('div');
  wrapper.className = 'public-view-root';
  appRoot.replaceChildren(wrapper);
  window.scrollTo(0, 0);
  return wrapper;
}

function scrollToHash(hash) {
  if (!hash || hash.length < 2) return;
  const target = document.getElementById(safeDecode(hash.slice(1)));
  if (!target) return;
  setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 90);
}

function renderAppNotFound(root, path) {
  root.innerHTML = `${pageHeader({
    title: 'Page not found',
    subtitle: 'The page you requested does not exist in this workspace.',
    breadcrumb: `<a href="${homeFor(state.user.role)}">Dashboard</a>${icon('chevron-right')}<span>Not found</span>`
  })}${emptyState({
    iconName: 'search',
    title: 'We could not find that page',
    text: `No route matches ${path}. Use the navigation to return to the workspace.`,
    action: `<a class="btn btn-primary" href="${homeFor(state.user.role)}">${icon('dashboard')} Back to dashboard</a>`
  })}`;
}

function renderPublicNotFound(root, path) {
  root.innerHTML = `<div class="public-shell"><main class="public-main"><div style="max-width:640px;margin:80px auto;padding:0 20px">
    ${errorState({
      title: 'Page not found',
      text: `No page matches ${path}. Return to the CivicPulse home page to continue.`,
      action: `<a class="btn btn-primary" href="/">${icon('home')} Go home</a>`
    })}
  </div></main></div>`;
}

async function dispatchAppView(root, route) {
  const path = route.path;
  const segments = route.segments;

  if (path === '/citizen') {
    navigate('/citizen/dashboard', { replace: true });
    return;
  }
  if (path === '/admin') {
    navigate('/admin/dashboard', { replace: true });
    return;
  }
  if (path === '/citizen/dashboard') return renderCitizenDashboard(root);
  if (path === '/citizen/report') return renderCitizenReport(root);
  if (path === '/citizen/complaints') return renderCitizenComplaints(root);
  if (segments.length === 3 && segments[0] === 'citizen' && segments[1] === 'complaints') {
    return renderCitizenComplaintDetail(root, safeDecode(segments[2]));
  }
  if (path === '/citizen/track') return renderCitizenTrack(root);
  if (path === '/citizen/profile') return renderProfile(root);
  if (path === '/citizen/notifications') return renderNotifications(root);
  if (path === '/admin/dashboard') return renderAdminDashboard(root);
  if (path === '/admin/complaints') return renderAdminComplaints(root);
  if (segments.length === 3 && segments[0] === 'admin' && segments[1] === 'complaints') {
    return renderAdminComplaintDetail(root, safeDecode(segments[2]));
  }
  if (path === '/admin/priority') return renderAdminPriority(root);
  if (path === '/admin/timers') return renderAdminTimers(root);
  if (path === '/admin/overdue') return renderAdminOverdue(root);
  if (path === '/admin/hotspots') return renderAdminHotspots(root);
  if (path === '/admin/map') return renderAdminMap(root);
  if (path === '/admin/analytics') return renderAdminAnalytics(root);
  if (path === '/admin/users') return renderAdminUsers(root);
  if (path === '/admin/departments') return renderAdminDepartments(root);
  if (path === '/admin/reports') return renderAdminReports(root);
  if (path === '/admin/profile') return renderProfile(root);
  if (path === '/admin/notifications') return renderNotifications(root);
  return renderAppNotFound(root, path);
}

async function renderRoute() {
  const version = ++renderVersion;
  const route = parseRoute();
  state.route = route;
  const path = route.path;
  const user = state.user;

  if (user && (path === '/login' || path === '/signup')) {
    const redirect = route.query.get('redirect');
    navigate(redirect && redirect.startsWith('/') ? redirect : homeFor(user.role), { replace: true });
    return;
  }

  const requiredRole = roleForPath(path);
  if (isPublicPath(path)) {
    mountPublic();
    document.title = `${pageTitle(path)} | CivicPulse AI`;
    const root = freshPublicRoot();
    const views = {
      '/': renderLanding,
      '/login': renderLogin,
      '/signup': renderSignup,
      '/forgot-password': renderForgot
    };
    if (version !== renderVersion) return;
    await views[path](root);
    scrollToHash(route.hash);
    return;
  }

  if (!requiredRole) {
    mountPublic();
    document.title = 'Page not found | CivicPulse AI';
    renderPublicNotFound(freshPublicRoot(), path);
    return;
  }

  if (!user) {
    const target = path + (location.search || '') + (location.hash || '');
    navigate(`/login?redirect=${encodeURIComponent(target)}`, { replace: true });
    return;
  }

  if (user.role !== requiredRole) {
    toast(
      requiredRole === 'admin' ? 'That page is only available to authority admins.' : 'That page is only available to citizens.',
      'warning',
      'Access restricted'
    );
    navigate(homeFor(user.role), { replace: true });
    return;
  }

  mountShell(user.role);
  updateNavActive();
  document.title = `${pageTitle(path)} | CivicPulse AI`;
  const root = freshViewRoot();
  if (version !== renderVersion) return;
  await dispatchAppView(root, route);
  scrollToHash(route.hash);
}

function notificationHref(complaintId) {
  if (!complaintId) return '';
  return `${state.user.role === 'admin' ? '/admin' : '/citizen'}/complaints/${encodeURIComponent(complaintId)}`;
}

function drawerNotification(item) {
  const meta = NOTIFICATION_META[item.type] || { iconName: 'bell', tone: '' };
  return `<div class="notification-item ${item.isRead ? '' : 'unread'}" data-drawer-notification="${item.id}">
    <div class="notification-icon ${meta.tone}">${icon(meta.iconName)}</div>
    <div class="notification-main">
      <div class="notification-title">${esc(item.title)}</div>
      <div class="notification-text">${esc(item.message)}</div>
      <div class="notification-time">${timeAgo(item.createdAt)}</div>
    </div>
    ${!item.isRead ? `<button class="btn btn-ghost btn-icon-sm" type="button" data-drawer-read="${item.id}" title="Mark as read" aria-label="Mark as read">${icon('check')}</button>` : ''}
    ${item.complaintId ? `<a class="btn btn-ghost btn-icon-sm" href="${notificationHref(item.complaintId)}" title="Open complaint" aria-label="Open complaint">${icon('chevron-right')}</a>` : ''}
  </div>`;
}

function openNotificationsDrawer() {
  if (!state.user) return;
  if (drawerClose) {
    drawerClose();
    drawerClose = null;
  }
  const notificationsPath = `${state.user.role === 'admin' ? '/admin' : '/citizen'}/notifications`;
  let wrapper = null;
  let load = async () => {};

  const close = drawer({
    title: 'Notifications',
    subtitle: 'Authority updates, status changes and deadline alerts.',
    body: `<div data-drawer-body>${loadingState('Loading notifications\u2026')}</div>`,
    footer: `<a class="btn btn-secondary" href="${notificationsPath}">${icon('bell')} Open all notifications</a><button class="btn btn-primary" type="button" data-drawer-read-all disabled>${icon('check')} Mark all read</button>`,
    onMount(node) {
      wrapper = node;
      node.addEventListener('click', (event) => {
        if (event.target.closest('a[href]')) close();
      });
      node.querySelector('[data-drawer-read-all]')?.addEventListener('click', async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        button.innerHTML = '<span class="spinner spinner-light"></span> Updating\u2026';
        try {
          await api.post('/api/notifications/read-all');
          setUnread(0);
          toast('All notifications marked as read.', 'success');
          await load();
        } catch (error) {
          toast(error.message, 'error');
          button.disabled = false;
          button.innerHTML = `${icon('check')} Mark all read`;
        }
      });
    }
  });
  drawerClose = close;

  load = async () => {
    if (!wrapper) return;
    const body = wrapper.querySelector('[data-drawer-body]');
    try {
      const data = await api.get('/api/notifications');
      setUnread(data.unread);
      const readAll = wrapper.querySelector('[data-drawer-read-all]');
      if (readAll) {
        readAll.disabled = !data.unread;
        readAll.innerHTML = `${icon('check')} Mark all read`;
      }
      body.innerHTML = data.items.length
        ? `<div class="notification-list">${data.items.slice(0, 8).map(drawerNotification).join('')}</div>${data.items.length > 8 ? `<div class="tiny muted" style="padding:10px 15px;text-align:center">Showing the 8 most recent notifications</div>` : ''}`
        : emptyState({ iconName: 'bell', title: 'No notifications yet', text: 'You will be notified when a complaint status changes or a deadline is crossed.' });
      body.querySelectorAll('[data-drawer-read]').forEach((button) => button.addEventListener('click', async () => {
        const id = Number(button.dataset.drawerRead);
        const row = button.closest('[data-drawer-notification]');
        try {
          await api.patch(`/api/notifications/${id}/read`);
          setUnread(Math.max(0, state.unread - 1));
          row?.classList.remove('unread');
          button.remove();
          if (state.unread === 0 && readAll) readAll.disabled = true;
        } catch (error) {
          toast(error.message, 'error');
        }
      }));
    } catch (error) {
      body.innerHTML = `<div style="padding:16px">${errorState({ title: 'Could not load notifications', text: error.message })}</div>`;
      body.querySelector('[data-retry]')?.addEventListener('click', () => {
        body.innerHTML = loadingState('Loading notifications\u2026');
        load();
      });
    }
  };
  load();
}

function isTypingTarget(target) {
  if (!target) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function onGlobalKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    const input = document.querySelector('[data-global-search-input]');
    if (input) {
      event.preventDefault();
      input.focus();
      input.select();
    }
    return;
  }
  if (event.key === '/' && !isTypingTarget(event.target)) {
    const input = document.querySelector('[data-global-search-input]');
    if (input) {
      event.preventDefault();
      input.focus();
    }
  }
}

function onGlobalClick(event) {
  const toggle = event.target.closest('[data-sidebar-toggle]');
  if (toggle) {
    event.preventDefault();
    document.body.classList.toggle('sidebar-open');
    return;
  }
  if (event.target.closest('[data-sidebar-close]')) {
    document.body.classList.remove('sidebar-open');
    return;
  }
  if (event.target.closest('[data-logout]')) {
    event.preventDefault();
    logout();
    return;
  }
  if (event.target.closest('[data-notifications]')) {
    event.preventDefault();
    openNotificationsDrawer();
    return;
  }

  const anchor = event.target.closest('a[href]');
  if (!anchor) return;
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (anchor.target && anchor.target !== '_self') return;
  if (anchor.hasAttribute('download')) return;
  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) return;
  if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
  if (url.pathname === location.pathname && !url.search && !url.hash) {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  event.preventDefault();
  document.body.classList.remove('sidebar-open');
  navigate(`${url.pathname}${url.search}${url.hash}`);
}

let logoutBusy = false;
async function logout() {
  if (logoutBusy) return;
  logoutBusy = true;
  try {
    await api.post('/api/auth/logout');
  } catch {}
  setUser(null);
  mountedRole = null;
  toast('You have been signed out.', 'success', 'See you soon');
  navigate('/login', { replace: true });
  logoutBusy = false;
}

function onUnauthorized() {
  if (!state.user) return;
  setUser(null);
  mountedRole = null;
  toast('Your session has expired. Please sign in again.', 'warning', 'Session ended');
  const target = location.pathname + location.search;
  navigate(`/login?redirect=${encodeURIComponent(target)}`, { replace: true });
}

async function refreshUnread() {
  if (!state.user) return;
  try {
    const me = await api.get('/api/auth/me');
    if (!me) {
      onUnauthorized();
      return;
    }
    setUser(me.user);
    setUnread(me.unreadNotifications);
    updateShellUser();
  } catch {}
}

async function loadBootstrap() {
  const [configResult, meResult] = await Promise.allSettled([
    api.get('/api/config'),
    api.get('/api/auth/me')
  ]);
  if (configResult.status === 'fulfilled' && configResult.value) {
    state.config = { ...state.config, ...configResult.value };
  }
  if (meResult.status === 'fulfilled') {
    if (meResult.value) {
      setUser(meResult.value.user);
      setUnread(meResult.value.unreadNotifications);
    } else {
      setUser(null);
    }
  }
}

async function boot() {
  await loadBootstrap();
  window.addEventListener('popstate', renderRoute);
  window.addEventListener('civicpulse:unauthorized', onUnauthorized);
  document.addEventListener('click', onGlobalClick);
  document.addEventListener('keydown', onGlobalKeydown);
  setInterval(() => updateCountdowns(document), 1000);
  setInterval(refreshUnread, 90000);
  await renderRoute();
}

boot().catch((error) => {
  appRoot.innerHTML = `<div style="max-width:640px;margin:70px auto;padding:0 20px">${errorState({
    title: 'CivicPulse could not start',
    text: error.message || 'An unexpected error occurred while starting the application.'
  })}</div>`;
});
