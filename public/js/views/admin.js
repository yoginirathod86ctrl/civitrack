import { api } from '../api.js';
import { navigate } from '../router.js';
import { state } from '../store.js';
import {
  avatar,
  complaintCard,
  confirmDialog,
  deadlineText,
  emptyState,
  errorState,
  esc,
  fmtDate,
  fmtDateTime,
  fmtDuration,
  fmtHours,
  fmtNumber,
  icon,
  loadingState,
  modal,
  pageHeader,
  priorityBadge,
  statusBadge,
  timeAgo,
  toast
} from '../ui.js';
import {
  barChart,
  donutChart,
  heatmap,
  lineChart,
  priorityColor,
  progressRing,
  rankList,
  sparkline,
  statusColor
} from '../charts.js';

const STATUSES = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed'];

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

function statCard({ iconName, tone = '', value, label, foot = '', delta = '' }) {
  return `<div class="stat-card">
    <div class="stat-top"><div class="stat-icon ${tone}">${icon(iconName)}</div>${delta}</div>
    <div class="stat-value">${value}</div>
    <div class="stat-label">${esc(label)}</div>
    ${foot ? `<div class="stat-foot">${foot}</div>` : ''}
  </div>`;
}

function complaintsTable(complaints, { showCitizen = true } = {}) {
  if (!complaints.length) {
    return emptyState({ iconName: 'inbox', title: 'No complaints match', text: 'Adjust the filters or check back soon.', action: `<button class="btn btn-secondary" data-clear-filters>${icon('refresh')} Clear filters</button>` });
  }
  return `<div class="table-card"><div class="table-scroll"><table class="data-table">
    <thead><tr><th>ID</th><th>Complaint</th><th>Category</th><th>Priority</th><th>Status</th><th>Department</th><th>Deadline</th>${showCitizen ? '<th>Citizen</th>' : ''}<th>Action</th></tr></thead>
    <tbody>${complaints.map((complaint) => `<tr>
      <td class="id-cell">${esc(complaint.id)}</td>
      <td class="title-cell"><a href="/admin/complaints/${encodeURIComponent(complaint.id)}">${esc(complaint.description.slice(0, 70))}${complaint.description.length > 70 ? '…' : ''}</a><span>${esc(complaint.area)}${complaint.landmark ? ` · ${esc(complaint.landmark)}` : ''}</span></td>
      <td>${esc(complaint.category)}</td>
      <td>${priorityBadge(complaint.priority)}</td>
      <td>${statusBadge(complaint.status)}</td>
      <td>${esc(complaint.departmentName)}</td>
      <td class="nowrap">${complaint.status === 'Resolved' || complaint.status === 'Closed' ? `<span class="muted">${complaint.resolvedAt ? fmtDate(complaint.resolvedAt) : 'Completed'}</span>` : `<span data-deadline="${esc(complaint.deadline)}" data-closed="0" class="${complaint.overdue ? 'text-danger' : ''}">${esc(deadlineText(complaint))}</span>`}</td>
      ${showCitizen ? `<td><div class="cell-user">${avatar(complaint.citizen?.fullName || 'Citizen')}<div><strong>${esc(complaint.citizen?.fullName || 'Citizen')}</strong><span>${esc(complaint.citizen?.email || '')}</span></div></div></td>` : ''}
      <td class="actions-cell"><div class="row-actions"><a class="btn btn-secondary" href="/admin/complaints/${encodeURIComponent(complaint.id)}">${icon('eye')} View</a><a class="btn btn-ghost" href="/admin/complaints/${encodeURIComponent(complaint.id)}?action=update">${icon('edit')} Update</a></div></td>
    </tr>`).join('')}</tbody>
  </table></div><div class="table-footer"><span class="table-count">${complaints.length} complaint${complaints.length === 1 ? '' : 's'} shown</span><span class="tiny muted">Deadlines are evaluated live</span></div></div>`;
}

function priorityItems(complaints) {
  if (!complaints.length) return emptyState({ iconName: 'check-circle', title: 'Priority queue is clear', text: 'There are no active complaints needing attention.' });
  return `<div class="priority-list">${complaints.map((complaint) => `<div class="priority-item">
    <div class="priority-severity ${esc((complaint.priority || '').toLowerCase())}"></div>
    <div class="priority-body">
      <div class="priority-top"><span class="priority-id">${esc(complaint.id)}</span>${priorityBadge(complaint.priority)}${complaint.escalated ? '<span class="badge badge-danger">Escalated</span>' : ''}</div>
      <a class="priority-title" href="/admin/complaints/${encodeURIComponent(complaint.id)}">${esc(complaint.description.slice(0, 90))}${complaint.description.length > 90 ? '…' : ''}</a>
      <div class="priority-meta"><span>${icon('map-pin')}${esc(complaint.area)}</span><span>${icon('building')}${esc(complaint.departmentName)}</span><span>${icon('flag')}${esc(complaint.category)}</span></div>
    </div>
    <div class="priority-aside">${statusBadge(complaint.status)}<span class="priority-time ${complaint.overdue ? 'overdue' : ''}" data-deadline="${esc(complaint.deadline)}" data-closed="0">${esc(deadlineText(complaint))}</span></div>
  </div>`).join('')}</div>`;
}

function hotspotItems(hotspots) {
  if (!hotspots?.length) return emptyState({ iconName: 'map-pin', title: 'No hotspot data', text: 'Hotspots appear after complaints are submitted.' });
  const max = Math.max(...hotspots.map((item) => item.total));
  return `<div class="hotspot-list">${hotspots.map((area, index) => `<div class="hotspot-item">
    <span class="hotspot-rank r${index + 1}">${index + 1}</span>
    <div class="hotspot-main">
      <div class="hotspot-top"><span class="hotspot-name">${esc(area.area)}</span><span class="hotspot-count">${area.total} report${area.total === 1 ? '' : 's'}</span></div>
      <div class="hotspot-meta"><div class="hotspot-progress"><span style="width:${Math.max(6, area.total / max * 100)}%"></span></div><span class="hotspot-severity ${area.critical ? '' : 'moderate'}">${area.critical ? `${area.critical} critical` : `${area.overdue} overdue`}</span></div>
    </div>
    <a class="btn btn-icon btn-icon-sm" href="/admin/complaints?area=${encodeURIComponent(area.area)}" aria-label="View ${esc(area.area)} complaints">${icon('chevron-right')}</a>
  </div>`).join('')}</div>`;
}

async function downloadComplaints() {
  try {
    await api.download('/api/admin/export/complaints', `civicpulse-complaints-${new Date().toISOString().slice(0, 10)}.csv`);
    toast('Complaint CSV downloaded.', 'success');
  } catch (error) {
    toast(error.message, 'error', 'Export failed');
  }
}

async function downloadUsers() {
  try {
    await api.download('/api/admin/export/users', `civicpulse-citizens-${new Date().toISOString().slice(0, 10)}.csv`);
    toast('Citizen CSV downloaded.', 'success');
  } catch (error) {
    toast(error.message, 'error', 'Export failed');
  }
}

export async function renderAdminDashboard(root) {
  root.innerHTML = `${pageHeader({
    title: 'Authority dashboard',
    subtitle: 'A live view of civic demand, priority and response performance.',
    actions: `<button class="btn btn-secondary" data-export>${icon('download')} Export</button><a class="btn btn-primary" href="/admin/complaints?status=Submitted">${icon('inbox')} Review new</a>`
  })}${loadingState('Loading the civic command centre…')}`;
  try {
    const data = await api.get('/api/admin/dashboard');
    const { stats, queue, recent, categories, hotspots } = data;
    const categoryColors = ['#14b8a6', '#22d3ee', '#7c5cfc', '#f59e0b', '#3b82f6', '#e5484d', '#8fa3b6'];
    root.innerHTML = `${pageHeader({
      title: 'Authority dashboard',
      subtitle: `${greeting()}, ${state.user.fullName.split(' ')[0]}. Here is the city's civic pulse right now.`,
      actions: `<button class="btn btn-secondary" data-export>${icon('download')} Export</button><a class="btn btn-primary" href="/admin/complaints?status=Submitted">${icon('inbox')} Review new</a>`
    })}
    <div class="welcome-banner">
      <div class="welcome-copy">
        <span class="welcome-kicker">Civic command centre</span>
        <h2>${stats.overdue ? `${stats.overdue} complaint${stats.overdue === 1 ? '' : 's'} need urgent attention.` : 'The city is on track today.'}</h2>
        <p>${stats.critical ? `${stats.critical} critical active case${stats.critical === 1 ? '' : 's'} in the queue.` : 'No critical complaints are currently active.'} ${stats.active} active cases across ${hotspots.length ? hotspots[0].area : 'the city'}. Priority signals update automatically.</p>
      </div>
      <div class="welcome-actions">
        <a class="btn btn-secondary" href="/admin/priority">${icon('flag')} Priority queue</a>
        <a class="btn btn-primary" href="/admin/hotspots">${icon('map-pin')} Hotspots</a>
      </div>
    </div>
    <div class="stats-grid">
      ${statCard({ iconName: 'file-text', tone: 'navy', value: fmtNumber(stats.total), label: 'Total complaints', foot: `<strong>${fmtNumber(stats.active)}</strong> active right now` })}
      ${statCard({ iconName: 'alert-triangle', tone: 'red', value: fmtNumber(stats.overdue), label: 'Overdue', foot: stats.overdue ? '<strong class="text-danger">Requires escalation</strong>' : '<strong>Within all SLAs</strong>' })}
      ${statCard({ iconName: 'zap', tone: 'orange', value: fmtNumber(stats.critical), label: 'Critical active', foot: `<strong>${fmtNumber(stats.pending)}</strong> awaiting triage` })}
      ${statCard({ iconName: 'check-circle', tone: 'teal', value: fmtNumber(stats.resolved), label: 'Resolved', foot: `<strong>${fmtNumber(stats.closed)}</strong> verified & closed` })}
    </div>
    <div class="dashboard-grid">
      <div class="dashboard-main">
        <div class="section-title-row"><h2>Authority actions</h2></div>
        <div class="quick-actions">
          <a class="quick-action" href="/admin/timers"><span class="quick-action-icon">${icon('clock')}</span><strong>SLA timers</strong><span>Watch deadlines</span></a>
          <a class="quick-action" href="/admin/overdue"><span class="quick-action-icon orange">${icon('alert-triangle')}</span><strong>Overdue</strong><span>Escalated cases</span></a>
          <a class="quick-action" href="/admin/map"><span class="quick-action-icon cyan">${icon('map')}</span><strong>City map</strong><span>Ward-level view</span></a>
          <a class="quick-action" href="/admin/analytics"><span class="quick-action-icon purple">${icon('bar-chart')}</span><strong>Analytics</strong><span>Performance trends</span></a>
        </div>
        <div class="card">
          <div class="card-header"><div><h2>Priority queue</h2><p>Most urgent active complaints</p></div><a class="card-link" href="/admin/priority">Open queue ${icon('arrow-right')}</a></div>
          <div class="card-body">${priorityItems(queue)}</div>
        </div>
        <div class="card">
          <div class="card-header"><div><h2>Recent activity</h2><p>Newest complaints across the city</p></div><a class="card-link" href="/admin/complaints">All complaints ${icon('arrow-right')}</a></div>
          <div class="card-body">
            ${recent.length ? `<div class="activity-list">${recent.map((complaint) => `<div class="activity-item">
              <div class="activity-icon ${complaint.priority === 'Critical' ? 'red' : complaint.overdue ? 'orange' : 'teal'}">${icon(complaint.overdue ? 'alert-triangle' : 'file-plus')}</div>
              <div class="activity-body"><div class="activity-text"><strong>${esc(complaint.citizen?.fullName || 'Citizen')}</strong> reported ${esc(complaint.category.toLowerCase())} in <strong>${esc(complaint.area)}</strong>.</div><div class="activity-time">${esc(complaint.id)} · ${timeAgo(complaint.createdAt)}</div></div>
              ${priorityBadge(complaint.priority)}
            </div>`).join('')}</div>` : emptyState({ iconName: 'inbox', title: 'No complaints yet', text: 'New citizen reports will appear here.' })}
          </div>
        </div>
      </div>
      <div class="dashboard-side">
        <div class="card">
          <div class="card-header"><div><h2>Category mix</h2><p>All-time complaint share</p></div></div>
          <div class="card-body">${donutChart(categories.map((item, index) => ({ ...item, color: categoryColors[index % categoryColors.length] })), { centerLabel: 'complaints' })}</div>
        </div>
        <div class="card">
          <div class="card-header"><div><h2>Hotspot watch</h2><p>Top wards by report volume</p></div><a class="card-link" href="/admin/hotspots">All hotspots ${icon('arrow-right')}</a></div>
          <div class="card-body">${hotspotItems(hotspots)}</div>
        </div>
        <div class="card">
          <div class="card-header"><div><h2>System status</h2><p>Prototype services</p></div><span class="badge badge-teal">Operational</span></div>
          <div class="card-body">
            <div class="side-row"><span class="side-row-label">Complaint database</span><span class="side-row-value text-success">Online</span></div>
            <div class="side-row"><span class="side-row-label">AI triage rules</span><span class="side-row-value text-success">Active</span></div>
            <div class="side-row"><span class="side-row-label">SLA escalation</span><span class="side-row-value text-success">Scheduled</span></div>
            <div class="side-row"><span class="side-row-label">Demo dataset</span><span class="side-row-value">${fmtNumber(stats.total)} records</span></div>
          </div>
        </div>
      </div>
    </div>`;
    root.querySelector('[data-export]')?.addEventListener('click', downloadComplaints);
  } catch (error) {
    root.innerHTML = errorState({ title: 'Could not load the dashboard', text: error.message });
    root.querySelector('[data-retry]')?.addEventListener('click', () => renderAdminDashboard(root));
  }
}

export async function renderAdminComplaints(root) {
  const params = new URL(location.href).searchParams;
  const filters = {
    status: params.get('status') || 'All',
    priority: params.get('priority') || 'All',
    area: params.get('area') || 'All',
    search: params.get('search') || '',
    sort: params.get('sort') || 'recent',
    overdue: params.get('overdue') === '1'
  };
  root.innerHTML = `${pageHeader({
    title: 'All complaints',
    subtitle: 'Filter, triage and manage every complaint in the system.',
    actions: `<button class="btn btn-secondary" data-export-users>${icon('users')} Citizens CSV</button><button class="btn btn-primary" data-export>${icon('download')} Complaints CSV</button>`
  })}${loadingState('Loading complaints…')}`;
  try {
    root.innerHTML = `${pageHeader({
      title: 'All complaints',
      subtitle: 'Filter, triage and manage every complaint in the system.',
      actions: `<button class="btn btn-secondary" data-export-users>${icon('users')} Citizens CSV</button><button class="btn btn-primary" data-export>${icon('download')} Complaints CSV</button>`
    })}
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-field">${icon('search')}<input type="search" value="${esc(filters.search)}" placeholder="Search ID, citizen, area…" data-search></div>
        <select class="select-sm" data-sort aria-label="Sort"><option value="recent" ${filters.sort === 'recent' ? 'selected' : ''}>Newest first</option><option value="priority" ${filters.sort === 'priority' ? 'selected' : ''}>Priority first</option><option value="deadline" ${filters.sort === 'deadline' ? 'selected' : ''}>Deadline first</option></select>
        <select class="select-sm" data-area aria-label="Area"><option value="All">All areas</option>${(state.config.areas || []).map((area) => `<option value="${esc(area)}" ${filters.area === area ? 'selected' : ''}>${esc(area)}</option>`).join('')}</select>
        <select class="select-sm" data-priority aria-label="Priority"><option value="All">All priorities</option>${state.config.priorities.map((priority) => `<option value="${esc(priority)}" ${filters.priority === priority ? 'selected' : ''}>${priority}</option>`).join('')}</select>
        <label class="form-check"><input type="checkbox" data-overdue ${filters.overdue ? 'checked' : ''}> Overdue only</label>
      </div>
    </div>
    <div class="filter-tabs" style="margin-bottom:14px" data-status-tabs>${['All', ...STATUSES].map((status) => `<button class="filter-tab ${filters.status === status ? 'active' : ''}" data-status="${esc(status)}">${esc(status)}</button>`).join('')}</div>
    <div data-complaint-list>${loadingState('Applying filters…')}</div>`;
    const list = root.querySelector('[data-complaint-list]');
    const search = root.querySelector('[data-search]');
    const sort = root.querySelector('[data-sort]');
    const area = root.querySelector('[data-area]');
    const priority = root.querySelector('[data-priority]');
    const overdue = root.querySelector('[data-overdue]');
    let timer = null;

    const load = async () => {
      const query = new URLSearchParams();
      if (filters.status !== 'All') query.set('status', filters.status);
      if (filters.priority !== 'All') query.set('priority', filters.priority);
      if (filters.area !== 'All') query.set('area', filters.area);
      if (filters.search) query.set('search', filters.search);
      if (filters.overdue) query.set('overdue', '1');
      query.set('sort', filters.sort);
      list.innerHTML = loadingState('Filtering complaints…');
      try {
        const complaints = await api.get(`/api/admin/complaints?${query.toString()}`);
        list.innerHTML = complaintsTable(complaints, { showCitizen: true });
        list.querySelector('[data-clear-filters]')?.addEventListener('click', () => {
          filters.status = 'All'; filters.priority = 'All'; filters.area = 'All'; filters.search = ''; filters.overdue = false;
          renderAdminComplaints(root);
        });
      } catch (error) {
        list.innerHTML = errorState({ title: 'Could not load complaints', text: error.message });
        list.querySelector('[data-retry]')?.addEventListener('click', load);
      }
    };

    root.querySelectorAll('[data-status]').forEach((button) => button.addEventListener('click', () => {
      filters.status = button.dataset.status;
      root.querySelectorAll('[data-status]').forEach((item) => item.classList.toggle('active', item === button));
      load();
    }));
    search.addEventListener('input', () => {
      filters.search = search.value.trim();
      clearTimeout(timer);
      timer = setTimeout(load, 350);
    });
    sort.addEventListener('change', () => { filters.sort = sort.value; load(); });
    area.addEventListener('change', () => { filters.area = area.value; load(); });
    priority.addEventListener('change', () => { filters.priority = priority.value; load(); });
    overdue.addEventListener('change', () => { filters.overdue = overdue.checked; load(); });
    root.querySelector('[data-export]')?.addEventListener('click', downloadComplaints);
    root.querySelector('[data-export-users]')?.addEventListener('click', downloadUsers);
    await load();
  } catch (error) {
    root.innerHTML = errorState({ title: 'Could not load complaints', text: error.message });
    root.querySelector('[data-retry]')?.addEventListener('click', () => renderAdminComplaints(root));
  }
}

export async function renderAdminPriority(root) {
  root.innerHTML = `${pageHeader({
    title: 'Priority queue',
    subtitle: 'Active complaints ordered by urgency and deadline.',
    actions: `<button class="btn btn-secondary" data-refresh>${icon('refresh')} Refresh</button><a class="btn btn-primary" href="/admin/complaints">${icon('list')} All complaints</a>`
  })}${loadingState('Building the priority queue…')}`;
  try {
    const complaints = await api.get('/api/admin/priority-queue');
    const critical = complaints.filter((complaint) => complaint.priority === 'Critical').length;
    const high = complaints.filter((complaint) => complaint.priority === 'High').length;
    const overdue = complaints.filter((complaint) => complaint.overdue).length;
    const escalated = complaints.filter((complaint) => complaint.escalated).length;
    root.innerHTML = `${pageHeader({
      title: 'Priority queue',
      subtitle: 'Active complaints ordered by urgency and deadline.',
      actions: `<button class="btn btn-secondary" data-refresh>${icon('refresh')} Refresh</button><a class="btn btn-primary" href="/admin/complaints">${icon('list')} All complaints</a>`
    })}
    <div class="stats-grid">
      ${statCard({ iconName: 'zap', tone: 'red', value: fmtNumber(critical), label: 'Critical priority', foot: 'Immediate action target' })}
      ${statCard({ iconName: 'alert-triangle', tone: 'orange', value: fmtNumber(high), label: 'High priority', foot: '6-hour resolution target' })}
      ${statCard({ iconName: 'clock', tone: 'red', value: fmtNumber(overdue), label: 'Past deadline', foot: `${fmtNumber(escalated)} escalated` })}
      ${statCard({ iconName: 'activity', tone: 'teal', value: fmtNumber(complaints.length), label: 'Active queue', foot: 'Across all departments' })}
    </div>
    <div class="callout callout-warning mb-16">${icon('sparkles')}<div><strong>How this queue is ordered</strong><br>Overdue complaints appear first, followed by priority score and the nearest deadline. AI scores are advisory and can be overridden by an authority admin.</div></div>
    ${complaintsTable(complaints, { showCitizen: true })}`;
    root.querySelector('[data-refresh]')?.addEventListener('click', () => renderAdminPriority(root));
  } catch (error) {
    root.innerHTML = errorState({ title: 'Could not load the priority queue', text: error.message });
    root.querySelector('[data-retry]')?.addEventListener('click', () => renderAdminPriority(root));
  }
}

export async function renderAdminTimers(root, { overdueOnly = false } = {}) {
  const title = overdueOnly ? 'Overdue complaints' : 'SLA timers';
  root.innerHTML = `${pageHeader({
    title,
    subtitle: overdueOnly ? 'Complaints that have crossed their resolution deadline.' : 'Active resolution clocks across the city.',
    actions: `<button class="btn btn-secondary" data-refresh>${icon('refresh')} Refresh</button><a class="btn btn-primary" href="/admin/priority">${icon('flag')} Priority queue</a>`
  })}${loadingState('Loading resolution timers…')}`;
  try {
    const complaints = await api.get(overdueOnly ? '/api/admin/overdue' : '/api/admin/timers');
    const now = Date.now();
    const overdue = complaints.filter((complaint) => complaint.overdue).length;
    const soon = complaints.filter((complaint) => !complaint.overdue && new Date(complaint.deadline).getTime() - now < 6 * 3600000).length;
    const onTrack = complaints.length - overdue - soon;
    root.innerHTML = `${pageHeader({
      title,
      subtitle: overdueOnly ? 'Complaints that have crossed their resolution deadline.' : 'Active resolution clocks across the city.',
      actions: `<button class="btn btn-secondary" data-refresh>${icon('refresh')} Refresh</button><a class="btn btn-primary" href="/admin/priority">${icon('flag')} Priority queue</a>`
    })}
    <div class="stats-grid">
      ${statCard({ iconName: 'clock', tone: 'navy', value: fmtNumber(complaints.length), label: overdueOnly ? 'Overdue cases' : 'Active timers', foot: 'Live SLA windows' })}
      ${statCard({ iconName: 'alert-triangle', tone: 'red', value: fmtNumber(overdue), label: 'Past deadline', foot: overdue ? '<strong class="text-danger">Escalated automatically</strong>' : '<strong>None overdue</strong>' })}
      ${statCard({ iconName: 'clock', tone: 'orange', value: fmtNumber(soon), label: 'Due within 6 hours', foot: 'Approaching deadline' })}
      ${statCard({ iconName: 'check-circle', tone: 'teal', value: fmtNumber(onTrack), label: 'On track', foot: 'Healthy resolution window' })}
    </div>
    ${complaints.length ? `<div class="grid grid-2">${complaints.map((complaint) => {
      const total = Math.max(1, complaint.resolutionHours * 3600);
      const elapsed = complaint.overdue ? 100 : Math.min(100, Math.max(3, (1 - complaint.remainingSeconds / total) * 100));
      const color = complaint.overdue ? '#e5484d' : elapsed > 75 ? '#f59e0b' : '#14b8a6';
      return `<a class="timer-card" href="/admin/complaints/${encodeURIComponent(complaint.id)}">
        ${progressRing(elapsed, { color, size: 46 })}
        <div class="timer-main">
          <div class="timer-title">${esc(complaint.id)} · ${esc(complaint.description.slice(0, 58))}${complaint.description.length > 58 ? '…' : ''}</div>
          <div class="timer-meta">${esc(complaint.priority)} · ${esc(complaint.area)} · ${esc(complaint.departmentName)}</div>
          <div class="mini-bar" style="margin-top:5px"><span style="width:${elapsed}%;background:${color}"></span></div>
        </div>
        <div style="text-align:right"><div class="timer-time ${complaint.overdue ? 'overdue' : elapsed > 75 ? 'soon' : ''}" data-deadline="${esc(complaint.deadline)}" data-closed="0">${esc(deadlineText(complaint))}</div><div class="tiny muted" style="margin-top:2px">${statusBadge(complaint.status)}</div></div>
      </a>`;
    }).join('')}</div>` : emptyState({ iconName: 'check-circle', title: overdueOnly ? 'No overdue complaints' : 'No active timers', text: overdueOnly ? 'Every active complaint is currently within its resolution window.' : 'There are no active complaints with a running timer.' })}
    <div class="callout callout-info mt-24">${icon('clock')}<div><strong>How timers work</strong><br>Critical cases have a 2-hour target, high priority 6 hours, medium 24 hours and low priority 48 hours. Overdue cases are escalated automatically by the backend scheduler.</div></div>`;
    root.querySelector('[data-refresh]')?.addEventListener('click', () => renderAdminTimers(root, { overdueOnly }));
  } catch (error) {
    root.innerHTML = errorState({ title: 'Could not load timers', text: error.message });
    root.querySelector('[data-retry]')?.addEventListener('click', () => renderAdminTimers(root, { overdueOnly }));
  }
}

export async function renderAdminOverdue(root) {
  return renderAdminTimers(root, { overdueOnly: true });
}

export async function renderAdminHotspots(root) {
  root.innerHTML = `${pageHeader({
    title: 'Hotspot analysis',
    subtitle: 'Ward-level complaint concentration and risk signals.',
    actions: `<button class="btn btn-secondary" data-refresh>${icon('refresh')} Refresh</button><a class="btn btn-primary" href="/admin/map">${icon('map')} Open city map</a>`
  })}${loadingState('Analysing civic hotspots…')}`;
  try {
    const data = await api.get('/api/admin/hotspots');
    const topThree = data.areas.slice(0, 3);
    const max = Math.max(1, ...data.areas.map((area) => area.total));
    root.innerHTML = `${pageHeader({
      title: 'Hotspot analysis',
      subtitle: 'Ward-level complaint concentration and risk signals.',
      actions: `<button class="btn btn-secondary" data-refresh>${icon('refresh')} Refresh</button><a class="btn btn-primary" href="/admin/map">${icon('map')} Open city map</a>`
    })}
    <div class="hotspot-cards">
      <div class="hotspot-summary-card"><div class="stat-icon navy">${icon('file-text')}</div><div class="hotspot-summary-num">${fmtNumber(data.totalComplaints)}</div><div class="hotspot-summary-label">Complaints analysed</div><div class="hotspot-summary-note">${data.totalAreas} wards</div></div>
      <div class="hotspot-summary-card"><div class="stat-icon red">${icon('map-pin')}</div><div class="hotspot-summary-num">${esc(data.topArea?.area || 'No data')}</div><div class="hotspot-summary-label">Highest activity ward</div><div class="hotspot-summary-note">${data.topArea ? `${data.topArea.total} reports · ${data.topArea.critical} critical` : 'Waiting for reports'}</div></div>
      <div class="hotspot-summary-card"><div class="stat-icon orange">${icon('flag')}</div><div class="hotspot-summary-num">${esc(data.topCategory?.name || 'None')}</div><div class="hotspot-summary-label">Top category</div><div class="hotspot-summary-note">${fmtNumber(data.topCategory?.count || 0)} reports citywide</div></div>
    </div>
    <div class="callout callout-info mb-16">${icon('sparkles')}<div><strong>Recommendation</strong><br>${esc(data.recommendation)}</div></div>
    <div class="hotspot-table-area">
      <div class="hotspot-toolbar"><div><h3>Ward ranking</h3><span class="tiny muted">Ranked by complaint volume, then criticality</span></div><span class="badge badge-neutral">${data.areas.length} areas</span></div>
      <div class="hotspot-table-row head"><span>#</span><span>Area / ward</span><span>Reports</span><span>Critical</span><span>Overdue</span><span>Dominant category</span><span></span></div>
      ${data.areas.map((area, index) => `<div class="hotspot-table-row">
        <span class="hotspot-rank r${index + 1}">${index + 1}</span>
        <span class="hotspot-table-name">${esc(area.area)}<span>Risk score ${area.riskScore}/100 · ${area.resolved} resolved</span></span>
        <span class="hotspot-table-num">${area.total}</span>
        <span class="hotspot-table-num ${area.critical ? 'text-danger' : ''}">${area.critical}</span>
        <span class="hotspot-table-num ${area.overdue ? 'text-danger' : ''}">${area.overdue}</span>
        <span><div class="flex gap-8 items-center"><span class="small">${esc(area.topCategory)}</span><div class="mini-bar" style="flex:1"><span style="width:${area.total / max * 100}%"></span></div></div></span>
        <a class="btn btn-icon btn-icon-sm" href="/admin/complaints?area=${encodeURIComponent(area.area)}" aria-label="View complaints">${icon('chevron-right')}</a>
      </div>`).join('')}
    </div>
    <div class="callout mt-16">${icon('info')}<div><strong>Methodology</strong><br>${esc(data.methodology)}</div></div>`;
    root.querySelector('[data-refresh]')?.addEventListener('click', () => renderAdminHotspots(root));
  } catch (error) {
    root.innerHTML = errorState({ title: 'Could not load hotspot analysis', text: error.message });
    root.querySelector('[data-retry]')?.addEventListener('click', () => renderAdminHotspots(root));
  }
}

export async function renderAdminMap(root) {
  root.innerHTML = `${pageHeader({
    title: 'City complaint map',
    subtitle: 'Approximate ward-level complaint distribution.',
    actions: `<button class="btn btn-secondary" data-refresh>${icon('refresh')} Refresh</button><a class="btn btn-primary" href="/admin/hotspots">${icon('map-pin')} Hotspot analysis</a>`
  })}${loadingState('Plotting complaint markers…')}`;
  try {
    const data = await api.get('/api/admin/map');
    const groups = Object.values(data.markers.reduce((accumulator, marker) => {
      if (!accumulator[marker.area]) accumulator[marker.area] = { area: marker.area, x: 0, y: 0, total: 0, critical: 0, high: 0, overdue: 0 };
      const group = accumulator[marker.area];
      group.x += marker.x; group.y += marker.y; group.total += 1;
      if (marker.priority === 'Critical') group.critical += 1;
      if (marker.priority === 'High') group.high += 1;
      if (marker.overdue) group.overdue += 1;
      return accumulator;
    }, {})).map((group) => ({ ...group, x: group.x / group.total, y: group.y / group.total })).sort((a, b) => b.total - a.total);
    const critical = data.markers.filter((marker) => marker.priority === 'Critical').length;
    root.innerHTML = `${pageHeader({
      title: 'City complaint map',
      subtitle: 'Approximate ward-level complaint distribution.',
      actions: `<button class="btn btn-secondary" data-refresh>${icon('refresh')} Refresh</button><a class="btn btn-primary" href="/admin/hotspots">${icon('map-pin')} Hotspot analysis</a>`
    })}
    <div class="stats-grid">
      ${statCard({ iconName: 'map-pin', tone: 'navy', value: fmtNumber(data.markers.length), label: 'Mapped complaints', foot: `${groups.length} areas represented` })}
      ${statCard({ iconName: 'zap', tone: 'red', value: fmtNumber(critical), label: 'Critical markers', foot: 'Highest urgency' })}
      ${statCard({ iconName: 'alert-triangle', tone: 'orange', value: fmtNumber(data.markers.filter((marker) => marker.overdue).length), label: 'Overdue markers', foot: 'Past resolution deadline' })}
      ${statCard({ iconName: 'layers', tone: 'teal', value: fmtNumber(groups.length), label: 'Wards mapped', foot: 'Ward-level approximation' })}
    </div>
    <div class="callout callout-info mb-16">${icon('info')}<div><strong>Approximate locations</strong><br>${esc(data.note)}</div></div>
    <div class="map-layout">
      <div class="map-card">
        <div class="city-map">
          <span class="map-park p1"></span><span class="map-park p2"></span>
          <span class="map-river"></span>
          <span class="map-road h r1"></span><span class="map-road h r2"></span><span class="map-road h r3"></span>
          <span class="map-road v v1"></span><span class="map-road v v2"></span><span class="map-road v v3"></span>
          <span class="map-road h thin" style="top:46%;transform:rotate(5deg)"></span>
          <span class="map-road h thin" style="top:68%;transform:rotate(-2deg)"></span>
          <div class="map-controls"><a class="map-control" href="/admin/hotspots" aria-label="Hotspot analysis">${icon('map-pin')}</a><button class="map-control" data-refresh aria-label="Refresh map">${icon('refresh')}</button></div>
          ${groups.map((group) => {
            const priority = group.critical ? 'critical' : group.overdue ? 'high' : group.high ? 'medium' : 'low';
            return `<a class="map-pin" href="/admin/complaints?area=${encodeURIComponent(group.area)}" style="left:${group.x}%;top:${group.y}%" title="${esc(group.area)} · ${group.total} complaints · ${group.critical} critical"><span class="map-pin-bubble ${priority}">${group.total}</span><span class="map-pin-label">${esc(group.area)}</span></a>`;
          }).join('')}
          <div class="map-legend"><span><i class="critical"></i>Critical</span><span><i class="high"></i>High</span><span><i class="medium"></i>Medium</span><span><i class="low"></i>Low</span></div>
        </div>
      </div>
      <div class="map-side">
        <div class="card">
          <div class="map-side-head"><h3>Ward overview</h3><span class="badge badge-neutral">${groups.length}</span></div>
          <div class="map-side-list">
            ${groups.map((group) => `<a class="map-location" href="/admin/complaints?area=${encodeURIComponent(group.area)}">
              <span class="map-loc-icon ${group.critical ? '' : group.overdue ? 'moderate' : 'low'}">${icon(group.critical ? 'alert-triangle' : 'map-pin')}</span>
              <span class="map-loc-main"><span class="map-loc-name">${esc(group.area)}</span><span class="map-loc-meta">${group.critical} critical · ${group.overdue} overdue</span></span>
              <span class="map-loc-count">${group.total}</span>
            </a>`).join('')}
          </div>
        </div>
        <div class="card card-pad">
          <div class="side-card-head"><h3>Map notes</h3>${icon('info')}</div>
          <p class="small muted" style="line-height:1.65;margin:0 0 10px">Markers represent complaint counts by ward, not individual GPS coordinates. Click a marker to open that ward's complaint list.</p>
          <div class="callout callout-teal" style="padding:10px;font-size:.68rem">${icon('shield-check')}<div><strong>Privacy-safe map</strong><br>No precise citizen location is stored or displayed.</div></div>
        </div>
      </div>
    </div>`;
    root.querySelectorAll('[data-refresh]').forEach((button) => button.addEventListener('click', () => renderAdminMap(root)));
  } catch (error) {
    root.innerHTML = errorState({ title: 'Could not load the map', text: error.message });
    root.querySelector('[data-retry]')?.addEventListener('click', () => renderAdminMap(root));
  }
}

export async function renderAdminAnalytics(root) {
  root.innerHTML = `${pageHeader({
    title: 'Analytics & performance',
    subtitle: 'Operational trends, SLA compliance and service demand.',
    actions: `<button class="btn btn-secondary" data-export>${icon('download')} Export CSV</button><a class="btn btn-primary" href="/admin/reports">${icon('file-text')} Reports</a>`
  })}${loadingState('Crunching civic performance data…')}`;
  try {
    const data = await api.get('/api/admin/analytics');
    const statusItems = data.statuses.map((item) => ({ ...item, color: statusColor(item.name) }));
    const priorityItems = data.priorities.map((item) => ({ ...item, color: priorityColor(item.name) }));
    const topArea = data.areas[0];
    const insights = [
      { tone: data.slaCompliance >= 80 ? 'success' : 'warning', icon: data.slaCompliance >= 80 ? 'check-circle' : 'alert-triangle', text: `SLA compliance is ${data.slaCompliance}% across ${fmtNumber(data.resolved)} resolved complaints.` },
      { tone: data.overdue ? 'danger' : 'success', icon: data.overdue ? 'alert-triangle' : 'check-circle', text: data.overdue ? `${data.overdue} active complaints are overdue and need escalation.` : 'No active complaints are currently overdue.' },
      { tone: 'info', icon: 'map-pin', text: topArea ? `${topArea.name} has the highest demand with ${topArea.count} reports.` : 'No area demand data is available yet.' },
      { tone: 'info', icon: 'clock', text: `Average assignment takes ${fmtHours(data.avgAssignmentHours)}; average resolution takes ${fmtHours(data.avgResolutionHours)}.` }
    ];
    root.innerHTML = `${pageHeader({
      title: 'Analytics & performance',
      subtitle: 'Operational trends, SLA compliance and service demand.',
      actions: `<button class="btn btn-secondary" data-export>${icon('download')} Export CSV</button><a class="btn btn-primary" href="/admin/reports">${icon('file-text')} Reports</a>`
    })}
    <div class="stats-grid">
      ${statCard({ iconName: 'file-text', tone: 'navy', value: fmtNumber(data.total), label: 'Total complaints', foot: `<strong>${fmtNumber(data.active)}</strong> active` })}
      ${statCard({ iconName: 'check-circle', tone: 'teal', value: `${data.resolvedRate}%`, label: 'Resolution rate', foot: `<strong>${fmtNumber(data.resolved)}</strong> resolved` })}
      ${statCard({ iconName: 'shield-check', tone: 'purple', value: `${data.slaCompliance}%`, label: 'SLA compliance', foot: 'Resolved within target' })}
      ${statCard({ iconName: 'clock', tone: 'orange', value: fmtHours(data.avgResolutionHours), label: 'Avg resolution', foot: `<strong>${fmtHours(data.avgAssignmentHours)}</strong> to assign` })}
    </div>
    <div class="analytics-grid">
      <div class="analytics-card span-2">
        <div class="analytics-card-head"><div><h3>Complaint flow · last 14 days</h3><p>Received vs resolved complaints</p></div><span class="badge badge-neutral">${data.demoCount} demo records</span></div>
        ${lineChart(data.trend, { height: 230 })}
      </div>
      <div class="analytics-card"><div class="analytics-card-head"><div><h3>Category demand</h3><p>All-time complaint volume</p></div>${icon('bar-chart')}</div>${barChart(data.categories.slice(0, 6))}</div>
      <div class="analytics-card"><div class="analytics-card-head"><div><h3>Area demand</h3><p>Top wards by reports</p></div>${icon('map-pin')}</div>${rankList(data.areas, { limit: 7 })}</div>
      <div class="analytics-card"><div class="analytics-card-head"><div><h3>Status distribution</h3><p>Current complaint states</p></div>${icon('pie-chart')}</div>${donutChart(statusItems, { centerLabel: 'complaints' })}</div>
      <div class="analytics-card"><div class="analytics-card-head"><div><h3>Priority mix</h3><p>AI-assisted priority levels</p></div>${icon('flag')}</div>${donutChart(priorityItems, { centerLabel: 'complaints' })}</div>
      <div class="analytics-card"><div class="analytics-card-head"><div><h3>Daily intake heatmap</h3><p>Received complaints by day</p></div>${icon('activity')}</div>${heatmap(data.trend)}</div>
      <div class="analytics-card"><div class="analytics-card-head"><div><h3>Operational insights</h3><p>Signals for the next stand-up</p></div>${icon('sparkles')}</div><div class="insight-list">${insights.map((insight) => `<div class="insight-item ${insight.tone}">${icon(insight.icon)}<span>${esc(insight.text)}</span></div>`).join('')}</div></div>
    </div>`;
    root.querySelector('[data-export]')?.addEventListener('click', downloadComplaints);
  } catch (error) {
    root.innerHTML = errorState({ title: 'Could not load analytics', text: error.message });
    root.querySelector('[data-retry]')?.addEventListener('click', () => renderAdminAnalytics(root));
  }
}

function userCard(user) {
  const searchHref = `/admin/complaints?search=${encodeURIComponent(user.fullName)}`;
  return `<div class="user-card">
    ${avatar(user.fullName)}
    <div class="user-main">
      <div class="user-name-row"><span class="user-name">${esc(user.fullName)}</span>${user.isDemo ? '<span class="badge badge-demo">DEMO</span>' : ''}</div>
      <div class="user-email">${esc(user.email)}</div>
      <div class="user-meta"><span>${icon('map-pin')} ${esc(user.area)}</span><span>${icon('phone')} ${esc(user.mobile)}</span><span>${icon('calendar')} Joined ${fmtDate(user.registeredAt)}</span></div>
    </div>
    <div class="user-stats"><div><div class="user-stat-num">${fmtNumber(user.complaintCount)}</div><div class="user-stat-label">reports</div></div><div><div class="user-stat-num">${fmtNumber(user.activeCount)}</div><div class="user-stat-label">active</div></div></div>
    <a class="btn btn-icon btn-icon-sm" href="${searchHref}" title="View complaints" aria-label="View ${esc(user.fullName)} complaints">${icon('chevron-right')}</a>
  </div>`;
}

export async function renderAdminUsers(root) {
  root.innerHTML = `${pageHeader({
    title: 'Citizens',
    subtitle: 'Registered citizen accounts and their complaint activity.',
    actions: `<button class="btn btn-secondary" data-export>${icon('download')} Export citizens</button>`
  })}${loadingState('Loading citizen directory…')}`;
  try {
    const all = await api.get('/api/admin/users');
    const demo = all.filter((user) => user.isDemo).length;
    const engaged = all.filter((user) => user.complaintCount > 0).length;
    const activeCitizens = all.filter((user) => user.activeCount > 0).length;
    root.innerHTML = `${pageHeader({
      title: 'Citizens',
      subtitle: 'Registered citizen accounts and their complaint activity.',
      actions: `<button class="btn btn-secondary" data-export>${icon('download')} Export citizens</button>`
    })}
    <div class="stats-grid">
      ${statCard({ iconName: 'users', tone: 'navy', value: fmtNumber(all.length), label: 'Registered citizens', foot: `${demo} demo accounts` })}
      ${statCard({ iconName: 'file-text', tone: 'teal', value: fmtNumber(engaged), label: 'Citizens who reported', foot: 'At least one complaint' })}
      ${statCard({ iconName: 'activity', tone: 'orange', value: fmtNumber(activeCitizens), label: 'With active cases', foot: 'Currently being served' })}
      ${statCard({ iconName: 'sparkles', tone: 'purple', value: fmtNumber(all.reduce((sum, user) => sum + user.complaintCount, 0)), label: 'Linked complaints', foot: 'Across all citizens' })}
    </div>
    <div class="toolbar"><div class="toolbar-left"><div class="search-field">${icon('search')}<input type="search" placeholder="Search name, email, mobile or area" data-user-search></div></div><span class="tiny muted" data-user-count>${all.length} citizens</span></div>
    <div data-user-list>${all.length ? `<div class="users-grid">${all.map(userCard).join('')}</div>` : emptyState({ iconName: 'users', title: 'No citizens found', text: 'Citizen accounts will appear here after signup.' })}</div>`;
    let timer = null;
    const search = root.querySelector('[data-user-search]');
    const list = root.querySelector('[data-user-list]');
    const count = root.querySelector('[data-user-count]');
    search.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const term = search.value.trim();
        try {
          const users = await api.get(`/api/admin/users?search=${encodeURIComponent(term)}`);
          count.textContent = `${users.length} citizen${users.length === 1 ? '' : 's'}`;
          list.innerHTML = users.length ? `<div class="users-grid">${users.map(userCard).join('')}</div>` : emptyState({ iconName: 'search', title: 'No matching citizens', text: 'Try a different name, email, mobile or area.' });
        } catch (error) {
          toast(error.message, 'error');
        }
      }, 350);
    });
    root.querySelector('[data-export]')?.addEventListener('click', downloadUsers);
  } catch (error) {
    root.innerHTML = errorState({ title: 'Could not load citizens', text: error.message });
    root.querySelector('[data-retry]')?.addEventListener('click', () => renderAdminUsers(root));
  }
}

function departmentIcon(name) {
  const lower = name.toLowerCase();
  if (lower.includes('road') || lower.includes('works')) return 'construction';
  if (lower.includes('water') || lower.includes('drain')) return 'droplet';
  if (lower.includes('sanit') || lower.includes('waste')) return 'trash-2';
  if (lower.includes('electric') || lower.includes('light')) return 'zap';
  return 'building';
}

function departmentFormModal(root, department = null) {
  const isEdit = Boolean(department);
  const close = modal({
    title: isEdit ? 'Edit department' : 'Add department',
    subtitle: isEdit ? 'Update the responsible team for civic resolution.' : 'Create a new civic department for complaint routing.',
    iconName: 'building',
    body: `<form data-department-form>
      <div class="form-group"><label class="form-label" for="dept-name">Department name</label><input class="form-input" id="dept-name" name="name" value="${esc(department?.name || '')}" placeholder="e.g. Parks & Horticulture" required maxlength="80"></div>
      <div class="form-row"><div class="form-group"><label class="form-label" for="dept-code">Short code</label><input class="form-input" id="dept-code" name="code" value="${esc(department?.code || '')}" placeholder="PARKS" required maxlength="12"></div><div class="form-group"><label class="form-label" for="dept-lead">Department lead</label><input class="form-input" id="dept-lead" name="lead" value="${esc(department?.lead || '')}" placeholder="Lead officer" maxlength="80"></div></div>
      <div class="form-group"><label class="form-label" for="dept-description">Description</label><textarea class="form-textarea" id="dept-description" name="description" maxlength="300" placeholder="What this department is responsible for">${esc(department?.description || '')}</textarea></div>
    </form>`,
    footer: `<button class="btn btn-secondary" data-modal-close>Cancel</button><button class="btn btn-primary" data-save-department type="submit" form="department-form">${icon('save')} ${isEdit ? 'Save changes' : 'Create department'}</button>`,
    onMount(backdrop, done) {
      const form = backdrop.querySelector('[data-department-form]');
      form.id = 'department-form';
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = backdrop.querySelector('[data-save-department]');
        button.disabled = true;
        button.innerHTML = '<span class="spinner spinner-light"></span> Saving…';
        try {
          const payload = {
            name: form.name.value.trim(),
            code: form.code.value.trim().toUpperCase(),
            description: form.description.value.trim(),
            lead: form.lead.value.trim()
          };
          if (isEdit) await api.patch(`/api/admin/departments/${encodeURIComponent(department.id)}`, payload);
          else await api.post('/api/admin/departments', payload);
          done(true);
          toast(isEdit ? 'Department updated.' : 'Department created.', 'success');
          renderAdminDepartments(root);
        } catch (error) {
          toast(error.message, 'error', 'Could not save department');
          button.disabled = false;
          button.innerHTML = `${icon('save')} ${isEdit ? 'Save changes' : 'Create department'}`;
        }
      });
    }
  });
  return close;
}

export async function renderAdminDepartments(root) {
  root.innerHTML = `${pageHeader({
    title: 'Departments',
    subtitle: 'Responsible teams, workloads and overdue pressure.',
    actions: `<button class="btn btn-primary" data-add-department>${icon('plus')} Add department</button>`
  })}${loadingState('Loading departments…')}`;
  try {
    const departments = await api.get('/api/admin/departments');
    const totalActive = departments.reduce((sum, department) => sum + department.activeCount, 0);
    const totalOverdue = departments.reduce((sum, department) => sum + department.overdueCount, 0);
    root.innerHTML = `${pageHeader({
      title: 'Departments',
      subtitle: 'Responsible teams, workloads and overdue pressure.',
      actions: `<button class="btn btn-primary" data-add-department>${icon('plus')} Add department</button>`
    })}
    <div class="stats-grid">
      ${statCard({ iconName: 'building', tone: 'navy', value: fmtNumber(departments.length), label: 'Departments', foot: 'Complaint routing teams' })}
      ${statCard({ iconName: 'activity', tone: 'teal', value: fmtNumber(totalActive), label: 'Active workload', foot: 'Across all departments' })}
      ${statCard({ iconName: 'alert-triangle', tone: 'red', value: fmtNumber(totalOverdue), label: 'Overdue cases', foot: totalOverdue ? 'Needs escalation' : 'No overdue pressure' })}
      ${statCard({ iconName: 'check-circle', tone: 'purple', value: fmtNumber(departments.reduce((sum, department) => sum + department.resolvedCount, 0)), label: 'Resolved cases', foot: 'Department completions' })}
    </div>
    ${departments.length ? `<div class="department-grid">${departments.map((department, index) => `<div class="department-card">
      <div class="department-head"><div class="department-icon ${['', 'cyan', 'orange', 'purple'][index % 4]}">${icon(departmentIcon(department.name))}</div><div style="flex:1"><h3>${esc(department.name)}</h3><p>${esc(department.code)} · ${esc(department.lead || 'No lead assigned')}</p></div><button class="btn btn-icon btn-icon-sm" data-edit-department="${esc(department.id)}" aria-label="Edit department">${icon('edit')}</button><button class="btn btn-icon btn-icon-sm" data-delete-department="${esc(department.id)}" aria-label="Delete department">${icon('trash')}</button></div>
      <div class="small muted" style="line-height:1.55;min-height:36px">${esc(department.description || 'No description provided.')}</div>
      <div class="department-stats"><div><div class="department-stat-num">${department.complaintCount}</div><div class="department-stat-label">Total</div></div><div><div class="department-stat-num">${department.activeCount}</div><div class="department-stat-label">Active</div></div><div><div class="department-stat-num ${department.overdueCount ? 'text-danger' : ''}">${department.overdueCount}</div><div class="department-stat-label">Overdue</div></div></div>
      <div class="department-foot"><div class="department-slots">${avatar(department.lead || department.name, '')}${department.overdueCount ? `<span class="more" title="Overdue cases">${department.overdueCount}</span>` : ''}</div><a class="card-link" href="/admin/complaints?area=All&search=${encodeURIComponent(department.name)}">View workload ${icon('arrow-right')}</a></div>
    </div>`).join('')}</div>` : emptyState({ iconName: 'building', title: 'No departments yet', text: 'Add a department so complaints can be routed to the right team.', action: `<button class="btn btn-primary" data-add-department>${icon('plus')} Add department</button>` })}
    <div class="callout callout-info mt-24">${icon('shield-check')}<div><strong>Department safety</strong><br>A department cannot be deleted while complaints are assigned to it. Reassign those complaints first.</div></div>`;
    root.querySelectorAll('[data-add-department]').forEach((button) => button.addEventListener('click', () => departmentFormModal(root)));
    departments.forEach((department) => {
      root.querySelector(`[data-edit-department="${CSS.escape(department.id)}"]`)?.addEventListener('click', () => departmentFormModal(root, department));
      root.querySelector(`[data-delete-department="${CSS.escape(department.id)}"]`)?.addEventListener('click', async () => {
        const confirmed = await confirmDialog({
          title: 'Delete department?',
          message: `Delete ${department.name}? This cannot be undone. Departments with assigned complaints cannot be deleted.`,
          confirmLabel: 'Delete department',
          tone: 'danger'
        });
        if (!confirmed) return;
        try {
          await api.delete(`/api/admin/departments/${encodeURIComponent(department.id)}`);
          toast('Department deleted.', 'success');
          renderAdminDepartments(root);
        } catch (error) {
          toast(error.message, 'error', 'Could not delete department');
        }
      });
    });
  } catch (error) {
    root.innerHTML = errorState({ title: 'Could not load departments', text: error.message });
    root.querySelector('[data-retry]')?.addEventListener('click', () => renderAdminDepartments(root));
  }
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export async function renderAdminReports(root) {
  root.innerHTML = `${pageHeader({
    title: 'Reports & exports',
    subtitle: 'Generate operational summaries and downloadable civic data.',
    actions: `<button class="btn btn-secondary" data-print>${icon('file-text')} Print</button><a class="btn btn-primary" href="/admin/analytics">${icon('bar-chart')} Analytics</a>`
  })}${loadingState('Preparing reports…')}`;
  try {
    const data = await api.get('/api/admin/reports');
    const analytics = data.analytics;
    const hotspots = data.hotspots;
    const departments = data.departments;
    root.innerHTML = `${pageHeader({
      title: 'Reports & exports',
      subtitle: 'Generate operational summaries and downloadable civic data.',
      actions: `<button class="btn btn-secondary" data-print>${icon('file-text')} Print</button><a class="btn btn-primary" href="/admin/analytics">${icon('bar-chart')} Analytics</a>`
    })}
    <div class="callout callout-info mb-16">${icon('file-text')}<div><strong>Report generated ${fmtDateTime(data.generatedAt)}</strong><br>All figures come from the live prototype database, including ${analytics.demoCount} clearly labelled demo records.</div></div>
    <div class="report-summary">
      <div><strong>${fmtNumber(analytics.total)}</strong><span>Total complaints</span></div>
      <div><strong>${analytics.resolvedRate}%</strong><span>Resolution rate</span></div>
      <div><strong>${analytics.slaCompliance}%</strong><span>SLA compliance</span></div>
    </div>
    <div class="analytics-grid">
      <div class="analytics-card span-2">
        <div class="analytics-card-head"><div><h3>Citizen demand · last 14 days</h3><p>Received and resolved complaints</p></div><span class="badge badge-teal">Live data</span></div>
        ${lineChart(analytics.trend, { height: 220 })}
      </div>
      <div class="analytics-card">
        <div class="analytics-card-head"><div><h3>Export centre</h3><p>Download operational data</p></div>${icon('download')}</div>
        <div class="export-grid">
          <button class="export-option" data-export-complaints>${icon('file-text')}<strong>Complaints CSV</strong><span>Full complaint register</span></button>
          <button class="export-option" data-export-users>${icon('users')}<strong>Citizens CSV</strong><span>Citizen directory</span></button>
          <button class="export-option" data-export-json>${icon('database')}<strong>Report JSON</strong><span>Analytics & hotspots</span></button>
          <button class="export-option" data-print>${icon('file-text')}<strong>Print report</strong><span>Save as PDF</span></button>
        </div>
      </div>
      <div class="analytics-card">
        <div class="analytics-card-head"><div><h3>Top hotspots</h3><p>Ward-level concentration</p></div>${icon('map-pin')}</div>
        <div class="rank-list">${hotspots.areas.slice(0, 6).map((area, index) => `<div class="rank-row"><span class="rank-num ${index === 0 ? 'top' : ''}">${index + 1}</span><div class="rank-main"><div class="rank-top"><strong>${esc(area.area)}</strong><span>${area.total}</span></div><div class="rank-bar"><span style="width:${Math.max(6, area.total / hotspots.areas[0].total * 100)}%"></span></div></div></div>`).join('')}</div>
      </div>
      <div class="analytics-card span-2">
        <div class="analytics-card-head"><div><h3>Department workload</h3><p>Active and overdue cases by responsible team</p></div>${icon('building')}</div>
        <div class="table-scroll"><table class="data-table" style="min-width:620px"><thead><tr><th>Department</th><th>Total</th><th>Active</th><th>Resolved</th><th>Overdue</th><th>Lead</th></tr></thead><tbody>${departments.map((department) => `<tr><td><strong>${esc(department.name)}</strong><span class="tiny muted"> ${esc(department.code)}</span></td><td>${department.complaintCount}</td><td>${department.activeCount}</td><td>${department.resolvedCount}</td><td class="${department.overdueCount ? 'text-danger' : ''}">${department.overdueCount}</td><td>${esc(department.lead || '—')}</td></tr>`).join('')}</tbody></table></div>
      </div>
      <div class="analytics-card span-2">
        <div class="analytics-card-head"><div><h3>Executive summary</h3><p>Generated observations</p></div>${icon('sparkles')}</div>
        <div class="insight-list">
          <div class="insight-item ${analytics.overdue ? 'danger' : ''}">${icon(analytics.overdue ? 'alert-triangle' : 'check-circle')}<span>${analytics.overdue ? `${analytics.overdue} active complaints are overdue.` : 'No active complaints are overdue.'} ${analytics.criticalActive} critical cases remain active.</span></div>
          <div class="insight-item">${icon('clock')}<span>Average assignment time is ${fmtHours(analytics.avgAssignmentHours)} and average resolution time is ${fmtHours(analytics.avgResolutionHours)}.</span></div>
          <div class="insight-item">${icon('map-pin')}<span>${esc(hotspots.recommendation)}</span></div>
          <div class="insight-item warning">${icon('info')}<span>Demo records: ${analytics.demoCount} of ${analytics.total} complaints. This report is for an academic prototype and is not an official government record.</span></div>
        </div>
      </div>
    </div>`;
    root.querySelectorAll('[data-print]').forEach((button) => button.addEventListener('click', () => window.print()));
    root.querySelector('[data-export-complaints]')?.addEventListener('click', downloadComplaints);
    root.querySelector('[data-export-users]')?.addEventListener('click', downloadUsers);
    root.querySelector('[data-export-json]')?.addEventListener('click', () => {
      downloadJson(`civicpulse-report-${new Date().toISOString().slice(0, 10)}.json`, data);
      toast('Report JSON downloaded.', 'success');
    });
  } catch (error) {
    root.innerHTML = errorState({ title: 'Could not generate reports', text: error.message });
    root.querySelector('[data-retry]')?.addEventListener('click', () => renderAdminReports(root));
  }
}

export { downloadComplaints, downloadUsers, downloadJson, complaintsTable, statCard, statusColor };
