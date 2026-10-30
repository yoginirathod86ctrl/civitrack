import { api } from '../api.js';
import { state } from '../store.js';
import {
  avatar,
  categoryChip,
  deadlineText,
  emptyState,
  errorState,
  esc,
  fmtDate,
  fmtDateTime,
  fmtDuration,
  fmtHours,
  icon,
  loadingState,
  pageHeader,
  priorityBadge,
  statusBadge,
  timeAgo,
  toast
} from '../ui.js';

const FALLBACK_TRANSITIONS = {
  'Submitted': ['Under Review', 'Assigned', 'In Progress', 'Resolved'],
  'Under Review': ['Assigned', 'In Progress', 'Resolved'],
  'Assigned': ['In Progress', 'Resolved'],
  'In Progress': ['Resolved'],
  'Resolved': ['Closed', 'Under Review'],
  'Closed': ['Under Review']
};

function toLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function statusOptions(complaint) {
  const transitions = state.config.transitions || FALLBACK_TRANSITIONS;
  const choices = [complaint.status, ...(transitions[complaint.status] || [])];
  return choices.filter((status, index) => choices.indexOf(status) === index);
}

function updateTitle(update) {
  if (update.oldStatus && update.newStatus) return `${update.oldStatus} \u2192 ${update.newStatus}`;
  const titles = {
    submitted: 'Complaint submitted',
    assignment: 'Department assignment',
    deadline: 'Resolution deadline updated',
    note: 'Internal authority note',
    escalation: 'Complaint escalated',
    status: 'Status updated'
  };
  return titles[update.type] || String(update.type || 'Update').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function updateMeta(update) {
  if (update.type === 'submitted') return { iconName: 'file-plus', tone: 'cyan' };
  if (update.type === 'assignment') return { iconName: 'building', tone: 'orange' };
  if (update.type === 'deadline') return { iconName: 'clock', tone: 'red' };
  if (update.type === 'note') return { iconName: 'lock', tone: '' };
  if (update.type === 'escalation') return { iconName: 'alert-triangle', tone: 'red' };
  if (update.newStatus === 'Resolved' || update.newStatus === 'Closed') return { iconName: 'check-circle', tone: 'teal' };
  return { iconName: 'refresh', tone: 'cyan' };
}

function timelineItem(update) {
  const meta = updateMeta(update);
  return `<div class="timeline-item">
    <div class="timeline-marker ${meta.tone}">${icon(meta.iconName)}</div>
    <div class="timeline-body">
      <div class="timeline-top">
        <span class="timeline-title">${esc(updateTitle(update))}</span>
        <span class="timeline-time">${fmtDateTime(update.createdAt)}</span>
      </div>
      <div class="timeline-text">${esc(update.message)}</div>
      ${update.type === 'note' ? `<div class="timeline-note">${icon('lock')} Private note - visible to authority admins only</div>` : ''}
      <div class="timeline-author">${icon('user')} ${esc(update.actorName || 'System')} &middot; ${esc(update.actorRole || 'system')}</div>
    </div>
  </div>`;
}

export async function renderAdminComplaintDetail(root, id) {
  root.innerHTML = loadingState('Loading the complaint workspace\u2026');
  try {
    const [complaint, departments] = await Promise.all([
      api.get(`/api/complaints/${encodeURIComponent(id)}`),
      api.get('/api/admin/departments')
    ]);
    const updates = complaint.updates || [];
    const ai = complaint.ai;
    const citizen = complaint.citizen;
    const department = departments.find((item) => item.id === complaint.department?.id);
    const resolved = complaint.status === 'Resolved' || complaint.status === 'Closed';
    const noteCount = updates.filter((update) => update.type === 'note').length;
    const focusUpdate = new URL(location.href).searchParams.get('action') === 'update';
    const slaPercent = complaint.overdue
      ? 100
      : Math.min(100, Math.max(4, 100 - (complaint.remainingSeconds / Math.max(1, complaint.resolutionHours * 3600) * 100)));
    const statusChoices = statusOptions(complaint);

    root.innerHTML = `${pageHeader({
      title: complaint.id,
      subtitle: `${complaint.category} in ${complaint.area}`,
      breadcrumb: `<a href="/admin/dashboard">Dashboard</a>${icon('chevron-right')}<a href="/admin/complaints">All complaints</a>${icon('chevron-right')}<span>${esc(complaint.id)}</span>`,
      actions: `<button class="btn btn-secondary" data-print>${icon('file-text')} Print</button><a class="btn btn-secondary" href="/admin/complaints">${icon('arrow-left')} Back to complaints</a>`
    })}
    ${complaint.overdue ? `<div class="callout callout-danger" style="margin-bottom:16px">${icon('alert-triangle')}<div><strong>Overdue by ${fmtDuration(complaint.overdueSeconds, true)}</strong><br>This complaint has crossed its ${fmtHours(complaint.resolutionHours)} SLA${complaint.escalated ? ' and is marked as escalated in the authority queue' : ''}. Update the status, assignment or deadline below.</div></div>` : ''}
    <div class="detail-layout">
      <div class="detail-main">
        <div class="card detail-hero">
          <div class="detail-hero-top">
            <div>
              <div class="detail-id-row">
                <span class="complaint-id">${esc(complaint.id)}</span>
                ${complaint.isDemo ? '<span class="badge badge-demo">DEMO</span>' : ''}
                ${complaint.overdue ? '<span class="badge badge-overdue">Overdue</span>' : ''}
                ${complaint.escalated ? '<span class="badge badge-danger">Escalated</span>' : ''}
              </div>
              <h1 class="detail-title">${esc(complaint.description.slice(0, 130))}${complaint.description.length > 130 ? '\u2026' : ''}</h1>
              <div class="flex gap-8 wrap">${categoryChip(complaint.category)}${priorityBadge(complaint.priority)}${statusBadge(complaint.status)}</div>
            </div>
            <div style="text-align:right;min-width:170px">
              ${resolved
                ? `<span class="badge badge-resolved">${icon('check')} ${esc(complaint.status)}</span><div class="tiny muted mt-8">${complaint.resolvedAt ? fmtDateTime(complaint.resolvedAt) : 'Completed'}</div>`
                : `<div class="tiny muted">Expected resolution</div><div style="font-size:.82rem;font-weight:800" data-deadline="${esc(complaint.deadline)}" data-closed="0" class="${complaint.overdue ? 'text-danger' : ''}">${esc(deadlineText(complaint))}</div><div class="tiny muted mt-8">${fmtDateTime(complaint.deadline)}</div>`}
            </div>
          </div>
          <p class="detail-description">${esc(complaint.description)}</p>
          ${complaint.photoUrl ? `<div class="detail-photo"><img src="${esc(complaint.photoUrl)}" alt="Photo attached to complaint ${esc(complaint.id)}"></div>` : ''}
          <div class="detail-facts">
            <div class="detail-fact"><div class="detail-fact-label">Category</div><div class="detail-fact-value">${icon('flag')} ${esc(complaint.category)}</div></div>
            <div class="detail-fact"><div class="detail-fact-label">Priority</div><div class="detail-fact-value">${priorityBadge(complaint.priority)}</div></div>
            <div class="detail-fact"><div class="detail-fact-label">Department</div><div class="detail-fact-value">${icon('building')} ${esc(complaint.departmentName)}</div></div>
            <div class="detail-fact"><div class="detail-fact-label">Reported</div><div class="detail-fact-value">${icon('calendar')} ${fmtDate(complaint.createdAt)}</div></div>
            <div class="detail-fact"><div class="detail-fact-label">SLA target</div><div class="detail-fact-value">${icon('clock')} ${fmtHours(complaint.resolutionHours)}</div></div>
            <div class="detail-fact"><div class="detail-fact-label">Last updated</div><div class="detail-fact-value">${icon('activity')} ${timeAgo(complaint.updatedAt)}</div></div>
          </div>
          <div class="detail-location">
            <div class="detail-location-icon">${icon('map-pin')}</div>
            <div><strong>${esc(complaint.area)}</strong><span>${complaint.landmark ? esc(complaint.landmark) : 'No landmark provided'}</span></div>
          </div>
          ${ai ? `<div class="detail-ai">
            <div class="detail-ai-head">${icon('sparkles')} Prototype AI analysis</div>
            <p>${esc(ai.reasons?.join(' ') || 'Rule-based triage applied.')} Suggested department: ${esc(ai.department || complaint.departmentName)}. Priority score: ${ai.priorityScore}/100.</p>
            <div class="detail-ai-tags"><span class="pill pill-teal">${esc(ai.category || complaint.category)}</span><span class="pill">Confidence ${Number(ai.categoryConfidence) || 0}%</span><span class="pill">SLA ${fmtHours(ai.resolutionHours || complaint.resolutionHours)}</span></div>
            <div class="ai-disclaimer">This analysis is generated by transparent local rules and is not a real AI model.</div>
          </div>` : ''}
        </div>

        <div class="card">
          <div class="card-header"><div><h2>Resolution timeline</h2><p>Every public update and internal note on this complaint</p></div><span class="badge badge-neutral">${updates.length} update${updates.length === 1 ? '' : 's'}${noteCount ? ` &middot; ${noteCount} private` : ''}</span></div>
          <div class="card-body">
            ${updates.length ? `<div class="timeline">${updates.map(timelineItem).join('')}</div>` : emptyState({ iconName: 'activity', title: 'No timeline updates yet', text: 'Updates will appear here as the complaint is handled.' })}
          </div>
          <div class="card-body update-composer" id="update-composer">
            <div class="section-title-row" style="margin-bottom:14px"><div><h3>Update complaint</h3><p>Record a status change, reassign the department, adjust the deadline or add a private note.</p></div></div>
            <div class="auth-error" data-update-error>${icon('alert-circle')}<span></span></div>
            <form data-update-form novalidate>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="admin-status">Status</label>
                  <select class="form-select" id="admin-status" name="status">${statusChoices.map((status) => `<option value="${esc(status)}" ${status === complaint.status ? 'selected' : ''}>${esc(status)}</option>`).join('')}</select>
                  <div class="form-hint">Only valid workflow transitions are offered.</div>
                </div>
                <div class="form-group">
                  <label class="form-label" for="admin-department">Responsible department</label>
                  <select class="form-select" id="admin-department" name="departmentId">${departments.map((item) => `<option value="${esc(item.id)}" ${item.id === complaint.department?.id ? 'selected' : ''}>${esc(item.name)} (${esc(item.code)})</option>`).join('')}</select>
                  <div class="form-hint">Changing the department records an assignment update.</div>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" for="admin-deadline">Resolution deadline</label>
                <input class="form-input" id="admin-deadline" name="deadline" type="datetime-local" value="${toLocalInput(complaint.deadline)}" min="${toLocalInput(new Date(Date.now() + 60000).toISOString())}" required>
                <div class="form-hint">Leave unchanged to keep the current SLA deadline. New deadlines must be in the future.</div>
              </div>
              <div class="form-group">
                <label class="form-label" for="admin-note">Update note <span class="optional">Optional</span></label>
                <textarea class="form-textarea" id="admin-note" name="note" maxlength="1000" style="min-height:96px" placeholder="Add context for the citizen or a private note for the authority team."></textarea>
                <div class="form-hint">Notes are visible to citizens when sent with a status change. Notes without a status change remain private to authority admins.</div>
              </div>
              <div class="update-actions">
                <span class="small muted">${icon('shield-check')} Only authority admins can change these fields.</span>
                <div class="flex gap-8">
                  <button class="btn btn-secondary" type="button" data-reset-update>${icon('refresh')} Reset</button>
                  <button class="btn btn-primary" type="submit" data-update-submit>${icon('save')} Save update</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      <aside class="detail-side">
        <div class="side-card">
          <div class="side-card-head"><h3>Resolution SLA</h3>${icon('clock')}</div>
          ${resolved ? `<div class="callout ${complaint.slaMet === false ? 'callout-warning' : 'callout-success'}" style="border:0;background:transparent;padding:0">${icon(complaint.slaMet === false ? 'alert-triangle' : 'check-circle')}<div><strong>${complaint.slaMet === false ? 'Resolved after deadline' : 'SLA target met'}</strong><br>${complaint.resolvedAt ? `Resolved ${fmtDateTime(complaint.resolvedAt)}` : 'This complaint is complete.'}${complaint.resolutionDurationHours ? `<br>Total time: ${fmtHours(complaint.resolutionDurationHours)}` : ''}</div></div>` : `
            <div class="side-row"><span class="side-row-label">Expected by</span><span class="side-row-value">${fmtDateTime(complaint.deadline)}</span></div>
            <div class="side-row"><span class="side-row-label">Time remaining</span><span class="side-row-value ${complaint.overdue ? 'text-danger' : ''}" data-deadline="${esc(complaint.deadline)}" data-closed="0">${esc(deadlineText(complaint))}</span></div>
            <div class="side-row"><span class="side-row-label">SLA window</span><span class="side-row-value">${fmtHours(complaint.resolutionHours)}</span></div>
            <div class="sla-bar"><span class="${complaint.overdue ? 'overdue' : ''}" style="width:${slaPercent}%"></span></div>
            ${complaint.escalated ? `<div class="callout callout-danger mt-12" style="padding:9px 10px;font-size:.68rem">${icon('alert-triangle')}<div><strong>Escalated</strong><br>This complaint crossed its deadline and was sent to the authority queue.</div></div>` : ''}`}
        </div>

        <div class="side-card">
          <div class="side-card-head"><h3>Citizen contact</h3>${icon('user')}</div>
          ${citizen ? `
            <div class="contact-card">${avatar(citizen.fullName)}<div><strong>${esc(citizen.fullName)}</strong><span>${esc(citizen.email)}</span></div><a href="mailto:${esc(citizen.email)}" title="Email citizen" aria-label="Email citizen">${icon('mail')}</a></div>
            <div class="side-row"><span class="side-row-label">Mobile</span><span class="side-row-value"><a class="link" href="tel:${esc(citizen.mobile || '')}">${esc(citizen.mobile || 'Not set')}</a></span></div>
            <div class="side-row"><span class="side-row-label">Area / ward</span><span class="side-row-value">${esc(citizen.area || complaint.area)}</span></div>
            <div class="side-row"><span class="side-row-label">Account</span><span class="side-row-value">${citizen.isDemo ? 'Demo citizen' : 'Registered citizen'}</span></div>
          ` : '<p class="small muted" style="margin:0">Citizen contact details are unavailable for this complaint.</p>'}
        </div>

        <div class="side-card">
          <div class="side-card-head"><h3>Assignment</h3>${icon('building')}</div>
          <div class="side-row"><span class="side-row-label">Department</span><span class="side-row-value">${esc(complaint.departmentName)}</span></div>
          ${department ? `<div class="side-row"><span class="side-row-label">Code</span><span class="side-row-value">${esc(department.code)}</span></div><div class="side-row"><span class="side-row-label">Lead</span><span class="side-row-value">${esc(department.lead || 'Not set')}</span></div><div class="side-row"><span class="side-row-label">Open cases</span><span class="side-row-value">${department.activeCount}</span></div>` : ''}
          <div class="side-row"><span class="side-row-label">Assigned</span><span class="side-row-value">${complaint.assignedAt ? fmtDate(complaint.assignedAt) : 'Pending'}</span></div>
          <div class="side-row"><span class="side-row-label">Field work started</span><span class="side-row-value">${complaint.startedAt ? fmtDate(complaint.startedAt) : 'Not yet'}</span></div>
          <div class="side-row"><span class="side-row-label">Priority score</span><span class="side-row-value">${complaint.priorityScore}/100</span></div>
        </div>

        ${complaint.escalations?.length ? `<div class="side-card">
          <div class="side-card-head"><h3>Escalation log</h3>${icon('alert-triangle')}</div>
          ${complaint.escalations.map((log) => `<div class="side-row"><span class="side-row-label">${fmtDateTime(log.createdAt)}</span><span class="side-row-value">${priorityBadge(log.priority)}</span></div><p class="tiny muted" style="margin:2px 0 10px">${esc(log.reason)}</p>`).join('')}
        </div>` : ''}

        <div class="side-card">
          <div class="side-card-head"><h3>Prototype note</h3>${icon('info')}</div>
          <p class="small muted" style="line-height:1.6;margin:0">Priority, category and department suggestions come from transparent local rules. Demo complaints are labelled and can be identified by their DEMO badge.</p>
        </div>
      </aside>
    </div>`;

    root.querySelector('[data-print]')?.addEventListener('click', () => window.print());
    root.querySelector('[data-reset-update]')?.addEventListener('click', () => renderAdminComplaintDetail(root, complaint.id));

    const form = root.querySelector('[data-update-form]');
    const errorBox = root.querySelector('[data-update-error]');
    const submit = root.querySelector('[data-update-submit]');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorBox.classList.remove('show');
      const payload = {};
      const status = form.status.value;
      const departmentId = form.departmentId.value;
      const deadlineValue = form.deadline.value;
      const note = form.note.value.trim();

      if (status && status !== complaint.status) payload.status = status;
      if (departmentId && departmentId !== (complaint.department?.id || '')) payload.departmentId = departmentId;
      if (deadlineValue && deadlineValue !== toLocalInput(complaint.deadline)) {
        const parsed = new Date(deadlineValue);
        if (Number.isNaN(parsed.getTime())) {
          errorBox.querySelector('span').textContent = 'Enter a valid resolution deadline.';
          errorBox.classList.add('show');
          return;
        }
        if (parsed.getTime() <= Date.now()) {
          errorBox.querySelector('span').textContent = 'The resolution deadline must be in the future.';
          errorBox.classList.add('show');
          return;
        }
        payload.deadline = parsed.toISOString();
      }
      if (note) payload.note = note;

      if (!Object.keys(payload).length) {
        errorBox.querySelector('span').textContent = 'Change the status, department, deadline or note before saving.';
        errorBox.classList.add('show');
        return;
      }

      submit.disabled = true;
      submit.innerHTML = '<span class="spinner spinner-light"></span> Saving\u2026';
      try {
        const updated = await api.patch(`/api/admin/complaints/${encodeURIComponent(complaint.id)}`, payload);
        toast(`Complaint ${updated.id} updated successfully.`, 'success', 'Update saved');
        await renderAdminComplaintDetail(root, complaint.id);
      } catch (error) {
        errorBox.querySelector('span').textContent = error.message;
        errorBox.classList.add('show');
        submit.disabled = false;
        submit.innerHTML = `${icon('save')} Save update`;
      }
    });

    if (focusUpdate) {
      setTimeout(() => {
        const composer = root.querySelector('#update-composer');
        composer?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        root.querySelector('#admin-status')?.focus({ preventScroll: true });
      }, 80);
    }
  } catch (error) {
    root.innerHTML = errorState({
      title: 'Complaint not available',
      text: error.message,
      action: `<a class="btn btn-navy" href="/admin/complaints">${icon('arrow-left')} Back to complaints</a>`
    });
  }
}
