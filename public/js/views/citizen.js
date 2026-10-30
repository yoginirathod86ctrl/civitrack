import { api } from '../api.js';
import { navigate } from '../router.js';
import { state, categoryMeta } from '../store.js';
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
  statusKey,
  timeAgo,
  toast
} from '../ui.js';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function statCard({ iconName, tone = '', value, label, foot = '', delta = '' }) {
  return `<div class="stat-card">
    <div class="stat-top"><div class="stat-icon ${tone}">${icon(iconName)}</div>${delta}</div>
    <div class="stat-value">${value}</div>
    <div class="stat-label">${esc(label)}</div>
    ${foot ? `<div class="stat-foot">${foot}</div>` : ''}
  </div>`;
}

function quickActions(admin = false) {
  if (admin) {
    return `<div class="quick-actions">
      <a class="quick-action" href="/admin/complaints?status=Submitted"><span class="quick-action-icon cyan">${icon('inbox')}</span><strong>Review new</strong><span>Triage submissions</span></a>
      <a class="quick-action" href="/admin/priority"><span class="quick-action-icon orange">${icon('flag')}</span><strong>Priority queue</strong><span>Critical & high first</span></a>
      <a class="quick-action" href="/admin/timers"><span class="quick-action-icon">${icon('clock')}</span><strong>SLA timers</strong><span>Approaching deadlines</span></a>
      <a class="quick-action" href="/admin/reports"><span class="quick-action-icon purple">${icon('bar-chart')}</span><strong>Reports</strong><span>Export performance</span></a>
    </div>`;
  }
  return `<div class="quick-actions">
    <a class="quick-action" href="/citizen/report"><span class="quick-action-icon">${icon('plus-circle')}</span><strong>Report issue</strong><span>AI-assisted submission</span></a>
    <a class="quick-action" href="/citizen/complaints"><span class="quick-action-icon cyan">${icon('list')}</span><strong>My complaints</strong><span>All your reports</span></a>
    <a class="quick-action" href="/citizen/track"><span class="quick-action-icon orange">${icon('search')}</span><strong>Track status</strong><span>Find by complaint ID</span></a>
    <a class="quick-action" href="/citizen/profile"><span class="quick-action-icon purple">${icon('user')}</span><strong>Profile</strong><span>Account settings</span></a>
  </div>`;
}

export async function renderCitizenDashboard(root) {
  root.innerHTML = `${pageHeader({
    title: 'Citizen dashboard',
    subtitle: 'Track your reports and see how your ward is responding.',
    actions: `<a class="btn btn-primary" href="/citizen/report">${icon('plus')} Report an issue</a>`
  })}${loadingState('Loading your dashboard…')}`;
  try {
    const data = await api.get('/api/citizen/dashboard');
    const { stats, recent, nextDeadline, unreadNotifications } = data;
    const resolutionRate = stats.total ? Math.round(stats.resolved / stats.total * 100) : 0;
    root.innerHTML = `${pageHeader({
      title: 'Citizen dashboard',
      subtitle: `${greeting()}, ${state.user.fullName.split(' ')[0]}. Here is what is happening with your reports.`,
      actions: `<a class="btn btn-secondary" href="/citizen/track">${icon('search')} Track complaint</a><a class="btn btn-primary" href="/citizen/report">${icon('plus')} Report an issue</a>`
    })}
    <div class="welcome-banner">
      <div class="welcome-copy">
        <span class="welcome-kicker">Your civic pulse</span>
        <h2>Every report makes your ward more accountable.</h2>
        <p>${stats.active ? `You have ${stats.active} active complaint${stats.active === 1 ? '' : 's'} with the authority. Follow the timeline for live updates.` : 'You have no active complaints. Spotted something that needs attention? Report it in under a minute.'}</p>
      </div>
      <div class="welcome-actions">
        <a class="btn btn-secondary" href="/citizen/complaints">${icon('list')} View reports</a>
        <a class="btn btn-primary" href="/citizen/report">${icon('camera')} Report</a>
      </div>
    </div>
    <div class="stats-grid">
      ${statCard({ iconName: 'file-text', tone: 'navy', value: fmtNumber(stats.total), label: 'Total reports', foot: `<strong>${fmtNumber(stats.submitted + stats.underReview)}</strong> awaiting triage` })}
      ${statCard({ iconName: 'activity', tone: 'orange', value: fmtNumber(stats.active), label: 'Active complaints', foot: `<strong>${fmtNumber(stats.inProgress)}</strong> in progress` })}
      ${statCard({ iconName: 'check-circle', tone: 'teal', value: `${resolutionRate}%`, label: 'Resolution rate', foot: `<strong>${fmtNumber(stats.resolved)}</strong> resolved so far` })}
      ${statCard({ iconName: 'alert-triangle', tone: 'red', value: fmtNumber(stats.overdue), label: 'Overdue', foot: stats.overdue ? '<strong class="text-danger">Needs attention</strong>' : '<strong>All within SLA</strong>' })}
    </div>
    <div class="dashboard-grid">
      <div class="dashboard-main">
        <div class="section-title-row"><h2>Quick actions</h2></div>
        ${quickActions()}
        <div class="card">
          <div class="card-header"><div><h2>Recent reports</h2><p>Your latest complaint activity</p></div><a class="card-link" href="/citizen/complaints">View all ${icon('arrow-right')}</a></div>
          <div class="card-body">
            ${recent.length ? `<div class="complaint-list">${recent.map((complaint) => complaintCard(complaint)).join('')}</div>` : emptyState({ iconName: 'file-plus', title: 'No reports yet', text: 'Report a civic issue and it will appear here with a live resolution timeline.', action: `<a class="btn btn-primary" href="/citizen/report">${icon('plus')} Report your first issue</a>` })}
          </div>
        </div>
      </div>
      <div class="dashboard-side">
        ${nextDeadline ? `<div class="card"><div class="card-header"><div><h2>Next deadline</h2><p>Closest active SLA</p></div>${priorityBadge(nextDeadline.priority)}</div><div class="card-body">
          <div style="font-size:.82rem;font-weight:700;color:var(--ink);line-height:1.4;margin-bottom:6px">${esc(nextDeadline.description.slice(0, 100))}</div>
          <div class="flex gap-8 items-center muted small">${icon('clock')}<span data-deadline="${esc(nextDeadline.deadline)}" data-closed="0" class="${nextDeadline.overdue ? 'text-danger' : ''}">${esc(deadlineText(nextDeadline))}</span></div>
          <div class="sla-bar" style="margin-top:10px"><span class="${nextDeadline.overdue ? 'overdue' : ''}" style="width:${nextDeadline.overdue ? 100 : Math.min(100, Math.max(5, 100 - (nextDeadline.remainingSeconds / (nextDeadline.resolutionHours * 3600) * 100)))}%"></span></div>
          <div class="flex-between mt-12"><span class="tiny muted">${esc(nextDeadline.departmentName)}</span><a class="card-link" href="/citizen/complaints/${encodeURIComponent(nextDeadline.id)}">View ${icon('arrow-right')}</a></div>
        </div></div>` : `<div class="card"><div class="card-header"><div><h2>Next deadline</h2><p>No active SLA</p></div></div><div class="card-body">${emptyState({ iconName: 'check-circle', title: 'Nothing pending', text: 'You have no active complaints with a running resolution timer.' })}</div></div>`}
        <div class="card"><div class="card-header"><div><h2>Notifications</h2><p>${unreadNotifications ? `${unreadNotifications} unread update${unreadNotifications === 1 ? '' : 's'}` : 'You are all caught up'}</p></div><a class="card-link" href="/citizen/notifications">Open ${icon('arrow-right')}</a></div><div class="card-body">
          ${unreadNotifications ? `<div class="callout callout-info">${icon('bell')}<div><strong>${unreadNotifications} new update${unreadNotifications === 1 ? '' : 's'}</strong><br>Authority activity on your complaints will appear in your notification centre.</div></div>` : `<div class="callout callout-success">${icon('check-circle')}<div><strong>No unread notifications</strong><br>We will alert you when a complaint status changes.</div></div>`}
        </div></div>
        <div class="card"><div class="card-header"><div><h2>How it works</h2><p>From report to resolution</p></div></div><div class="card-body">
          <div class="activity-list">
            <div class="activity-item"><div class="activity-icon">${icon('camera')}</div><div class="activity-body"><div class="activity-text"><strong>1. Report</strong> with a photo and location.</div></div></div>
            <div class="activity-item"><div class="activity-icon teal">${icon('sparkles')}</div><div class="activity-body"><div class="activity-text"><strong>2. AI triage</strong> sets priority and department.</div></div></div>
            <div class="activity-item"><div class="activity-icon orange">${icon('clock')}</div><div class="activity-body"><div class="activity-text"><strong>3. SLA timer</strong> keeps the authority accountable.</div></div></div>
            <div class="activity-item"><div class="activity-icon red">${icon('check-circle')}</div><div class="activity-body"><div class="activity-text"><strong>4. Resolution</strong> is recorded on your timeline.</div></div></div>
          </div>
        </div></div>
      </div>
    </div>`;
  } catch (error) {
    root.innerHTML = errorState({ title: 'Could not load your dashboard', text: error.message });
    root.querySelector('[data-retry]')?.addEventListener('click', () => renderCitizenDashboard(root));
  }
}

function aiPreviewPlaceholder() {
  return `<div class="ai-preview">
    <div class="ai-preview-head"><div class="ai-preview-icon">${icon('sparkles')}</div><div><strong>AI-assisted triage</strong><span>Prototype rule-based analysis</span></div></div>
    <p class="small muted" style="line-height:1.6;margin:0">Start describing the issue and our prototype will estimate the priority, likely department and expected resolution window.</p>
    <div class="ai-preview-note">No external AI model is used. Results are generated by transparent local rules.</div>
  </div>`;
}

function renderAnalysis(analysis) {
  if (!analysis) return aiPreviewPlaceholder();
  const confidence = Number(analysis.categoryConfidence) || 0;
  return `<div class="ai-preview">
    <div class="ai-preview-head"><div class="ai-preview-icon">${icon('sparkles')}</div><div><strong>AI-assisted triage</strong><span>Prototype rule-based analysis</span></div></div>
    <div class="ai-preview-row"><span>Suggested category</span><strong>${esc(analysis.category)}</strong></div>
    <div class="ai-preview-row"><span>Predicted priority</span><strong style="display:flex;align-items:center;gap:5px">${priorityBadge(analysis.priority)}</strong></div>
    <div class="ai-preview-row"><span>Priority score</span><strong>${analysis.priorityScore}/100</strong></div>
    <div class="ai-preview-row"><span>Suggested department</span><strong>${esc(analysis.department)}</strong></div>
    <div class="ai-preview-row"><span>Target resolution</span><strong>${fmtHours(analysis.resolutionHours)}</strong></div>
    <div class="ai-preview-row"><span>Category confidence</span><strong>${confidence}%</strong></div>
    <div class="mini-bar" style="margin:4px 0 9px"><span style="width:${confidence}%"></span></div>
    <div class="ai-preview-note">${analysis.reasons.map((reason) => esc(reason)).join(' ')}</div>
    <div class="ai-preview-note">This is a prototype estimate. An authority admin can review and change the assignment.</div>
  </div>`;
}

function duplicateWarning(duplicates) {
  if (!duplicates?.length) return '';
  return `<div class="callout callout-warning" style="margin-bottom:14px">${icon('copy')}<div><strong>Possible duplicate${duplicates.length === 1 ? '' : 's'} found</strong><br>${duplicates.map((duplicate) => `${esc(duplicate.id)} · ${duplicate.similarity}% similar`).join('<br>')}<br><span class="tiny">You can still submit if this is a distinct issue.</span></div></div>`;
}

export async function renderCitizenReport(root) {
  const categories = state.config.categories?.length ? state.config.categories : ['Road Damage', 'Garbage Overflow', 'Waterlogging', 'Streetlight Issues', 'Electrical Hazards', 'Drainage Problems', 'Other'];
  const areas = state.config.areas || [];
  root.innerHTML = `${pageHeader({
    title: 'Report an issue',
    subtitle: 'Give us the details and our prototype AI will route your report to the right team.',
    breadcrumb: `<a href="/citizen/dashboard">Dashboard</a>${icon('chevron-right')}<span>Report an issue</span>`
  })}
  <div class="report-layout">
    <form class="report-main" data-report-form novalidate>
      <div class="card form-card">
        <div class="form-card-head"><span class="form-step">1</span><div><h2>What is the problem?</h2><p>Choose a category and describe what you can see.</p></div></div>
        <div class="form-group">
          <span class="form-label">Issue category <span class="optional">Required</span></span>
          <div class="category-grid">
            ${categories.map((category) => {
              const meta = categoryMeta(category);
              return `<div class="category-option"><input type="radio" id="cat-${esc(category.replace(/\s+/g, '-'))}" name="category" value="${esc(category)}" required><label for="cat-${esc(category.replace(/\s+/g, '-'))}">${icon(meta.icon)}<span>${esc(category)}</span></label></div>`;
            }).join('')}
          </div>
          <div class="form-error" data-category-error>Select the category that best matches the issue.</div>
        </div>
        <div class="form-group">
          <label class="form-label" for="report-description">Description <span class="optional">Required</span></label>
          <textarea class="form-textarea" id="report-description" name="description" maxlength="2000" placeholder="What exactly is the problem? Is it blocking traffic, creating a safety risk, or affecting nearby homes? Include visible landmarks." required></textarea>
          <div class="flex-between mt-8"><span class="form-hint">At least 10 characters. Do not include personal or sensitive information.</span><span class="form-hint" data-desc-count>0 / 2000</span></div>
          <div class="form-error" data-description-error>Describe the problem in at least 10 characters.</div>
        </div>
      </div>

      <div class="card form-card">
        <div class="form-card-head"><span class="form-step">2</span><div><h2>Where is it?</h2><p>Help the field team find the exact location.</p></div></div>
        <div class="location-grid">
          <div class="form-group"><label class="form-label" for="report-area">Area / ward <span class="optional">Required</span></label><select class="form-select" id="report-area" name="area" required><option value="">Select area</option>${areas.map((area) => `<option value="${esc(area)}">${esc(area)}</option>`).join('')}</select><div class="form-error" data-area-error>Select the area or ward.</div></div>
          <div class="form-group"><label class="form-label" for="report-landmark">Landmark <span class="optional">Optional</span></label><input class="form-input" id="report-landmark" name="landmark" maxlength="140" placeholder="e.g. Near the bus stop"></div>
        </div>
        <div class="callout callout-info">${icon('map-pin')}<div><strong>Location note</strong><br>This prototype uses ward-level locations and does not collect exact GPS coordinates. Add a clear landmark to help the field team.</div></div>
      </div>

      <div class="card form-card">
        <div class="form-card-head"><span class="form-step">3</span><div><h2>Add a photo</h2><p>Optional, but it helps the authority verify the issue faster.</p></div></div>
        <div data-upload-area>
          <label class="upload-zone" for="report-photo" data-dropzone>
            ${icon('upload')}
            <strong>Click to upload or drag a photo here</strong>
            <span>PNG, JPEG or WebP · up to 4 MB</span>
            <input type="file" id="report-photo" name="photo" accept="image/png,image/jpeg,image/webp">
          </label>
        </div>
        <div class="form-error" data-photo-error></div>
      </div>

      <div class="card form-card">
        <div data-duplicate-slot></div>
        <div class="report-submit-row">
          <label class="form-check report-agree"><input type="checkbox" name="declare" required> The information I have provided is accurate to the best of my knowledge.</label>
          <button class="btn btn-primary btn-lg" type="submit" data-submit>${icon('send')} Submit complaint</button>
        </div>
      </div>
    </form>
    <aside class="report-side">
      <div data-ai-preview>${aiPreviewPlaceholder()}</div>
      <div class="review-card">
        <h3>Before you submit</h3>
        <div class="review-check">${icon('check-circle')} Use a clear, specific title-like description</div>
        <div class="review-check">${icon('check-circle')} Add the nearest landmark</div>
        <div class="review-check">${icon('check-circle')} Include a photo if it is safe to do so</div>
        <div class="review-check">${icon('check-circle')} Avoid personal information</div>
      </div>
      <div class="callout callout-teal">${icon('shield-check')}<div><strong>Your report is private</strong><br>Only you and the authority can see the details of this complaint.</div></div>
    </aside>
  </div>`;

  const form = root.querySelector('[data-report-form]');
  const description = form.description;
  const categoryInputs = [...form.querySelectorAll('input[name="category"]')];
  const areaInputs = form.area;
  const preview = root.querySelector('[data-ai-preview]');
  const duplicateSlot = root.querySelector('[data-duplicate-slot]');
  const uploadArea = root.querySelector('[data-upload-area]');
  const submit = root.querySelector('[data-submit]');
  let photoData = '';
  let analysis = null;
  let duplicates = [];
  let requestSequence = 0;
  let debounceTimer = null;

  const setError = (name, show, message = '') => {
    const box = root.querySelector(`[data-${name}-error]`);
    if (box) {
      if (message) box.textContent = message;
      box.classList.toggle('show', show);
    }
    const field = form[name];
    if (field && field.classList) field.classList.toggle('is-invalid', show);
  };

  description.addEventListener('input', () => {
    root.querySelector('[data-desc-count]').textContent = `${description.value.length} / 2000`;
    setError('description', false);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runPreview, 550);
  });
  categoryInputs.forEach((input) => input.addEventListener('change', () => {
    setError('category', false);
    runPreview();
  }));
  areaInputs.addEventListener('change', () => {
    setError('area', false);
    runPreview();
  });

  async function runPreview() {
    const text = description.value.trim();
    const category = form.querySelector('input[name="category"]:checked')?.value || '';
    const area = form.area.value;
    const sequence = ++requestSequence;
    if (text.length < 10) {
      preview.innerHTML = aiPreviewPlaceholder();
      duplicateSlot.innerHTML = '';
      analysis = null;
      duplicates = [];
      return;
    }
    preview.innerHTML = `<div class="ai-preview"><div class="loading-panel" style="min-height:150px"><span class="spinner"></span><span>Analysing your report…</span></div></div>`;
    try {
      const result = await api.post('/api/citizen/analyze', { description: text, category, hasPhoto: Boolean(photoData) });
      if (sequence !== requestSequence) return;
      analysis = result;
      preview.innerHTML = renderAnalysis(result);
      if (area && category) {
        const found = await api.post('/api/citizen/duplicates', { description: text, category, area });
        if (sequence !== requestSequence) return;
        duplicates = found || [];
        duplicateSlot.innerHTML = duplicateWarning(duplicates);
      } else {
        duplicateSlot.innerHTML = '';
      }
    } catch (error) {
      if (sequence !== requestSequence) return;
      preview.innerHTML = `<div class="ai-preview"><div class="callout callout-warning" style="border:0;background:transparent;padding:0">${icon('alert-circle')}<div><strong>Analysis unavailable</strong><br>${esc(error.message)} You can still submit the complaint.</div></div></div>`;
    }
  }

  function showPhoto(file) {
    const photoError = root.querySelector('[data-photo-error]');
    photoError.classList.remove('show');
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      photoError.textContent = 'Please choose a PNG, JPEG or WebP image.';
      photoError.classList.add('show');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      photoError.textContent = 'Photo must be smaller than 4 MB.';
      photoError.classList.add('show');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      photoData = reader.result;
      uploadArea.innerHTML = `<div class="upload-preview"><img src="${photoData}" alt="Selected complaint photo"><button type="button" class="upload-remove" data-remove-photo aria-label="Remove photo">${icon('x')}</button></div><div class="upload-meta">${icon('check-circle')} ${esc(file.name)} · ${(file.size / 1024).toFixed(0)} KB</div>`;
      uploadArea.querySelector('[data-remove-photo]').addEventListener('click', () => {
        photoData = '';
        form.photo.value = '';
        uploadArea.innerHTML = `<label class="upload-zone" for="report-photo">${icon('upload')}<strong>Click to upload or drag a photo here</strong><span>PNG, JPEG or WebP · up to 4 MB</span><input type="file" id="report-photo" name="photo" accept="image/png,image/jpeg,image/webp"></label>`;
        bindDropzone();
      });
      runPreview();
    };
    reader.readAsDataURL(file);
  }

  function bindDropzone() {
    const input = uploadArea.querySelector('input[type="file"]');
    const zone = uploadArea.querySelector('.upload-zone');
    if (!input || !zone) return;
    input.addEventListener('change', () => showPhoto(input.files[0]));
    ['dragenter', 'dragover'].forEach((type) => zone.addEventListener(type, (event) => {
      event.preventDefault();
      zone.classList.add('dragover');
    }));
    ['dragleave', 'drop'].forEach((type) => zone.addEventListener(type, (event) => {
      event.preventDefault();
      zone.classList.remove('dragover');
    }));
    zone.addEventListener('drop', (event) => {
      const file = event.dataTransfer.files[0];
      if (file) showPhoto(file);
    });
  }
  bindDropzone();

  const submitComplaint = async (confirmDistinct) => {
    const payload = {
      category: form.querySelector('input[name="category"]:checked')?.value || '',
      description: description.value.trim(),
      area: form.area.value,
      landmark: form.landmark.value.trim(),
      photo: photoData,
      confirmDistinct
    };
    return api.post('/api/citizen/complaints', payload);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    let valid = true;
    if (!form.querySelector('input[name="category"]:checked')) { setError('category', true); valid = false; }
    if (description.value.trim().length < 10) { setError('description', true); valid = false; }
    if (!form.area.value) { setError('area', true); valid = false; }
    if (!form.declare.checked) { toast('Please confirm the information is accurate.', 'warning', 'One more step'); valid = false; }
    if (!valid) return;
    submit.disabled = true;
    submit.innerHTML = '<span class="spinner spinner-light"></span> Submitting…';
    try {
      const result = await submitComplaint(false);
      toast(`Complaint ${result.id} was submitted successfully.`, 'success', 'Report received');
      navigate(`/citizen/complaints/${encodeURIComponent(result.id)}`);
    } catch (error) {
      if (error.code === 'DUPLICATE_SUSPECTED' && error.details?.duplicates?.length) {
        const duplicateList = error.details.duplicates.map((item) => `<div class="duplicate-card"><div class="duplicate-top"><strong>${esc(item.id)}</strong><span class="badge badge-neutral">${item.similarity}% similar</span></div><p>${esc(item.descriptionPreview || `${item.category} · ${item.area} · ${item.status}`)}</p></div>`).join('');
        const close = modal({
          title: 'A similar complaint already exists',
          subtitle: 'Check whether one of these reports describes the same issue.',
          iconName: 'copy',
          body: `<p class="muted small" style="line-height:1.6">Submitting a duplicate can slow down response times. If this is the same issue, track the existing complaint instead.</p>${duplicateList}`,
          footer: `<button class="btn btn-secondary" data-modal-close>Cancel</button><button class="btn btn-navy" data-submit-anyway>${icon('send')} Submit anyway</button>`,
          onMount(backdrop, done) {
            backdrop.querySelector('[data-submit-anyway]').addEventListener('click', async (event) => {
              const button = event.currentTarget;
              button.disabled = true;
              button.innerHTML = '<span class="spinner spinner-light"></span> Submitting…';
              try {
                const result = await submitComplaint(true);
                done(null);
                toast(`Complaint ${result.id} was submitted successfully.`, 'success', 'Report received');
                navigate(`/citizen/complaints/${encodeURIComponent(result.id)}`);
              } catch (retryError) {
                button.disabled = false;
                button.innerHTML = `${icon('send')} Submit anyway`;
                toast(retryError.message, 'error', 'Could not submit');
              }
            });
          }
        });
        void close;
      } else {
        toast(error.message, 'error', 'Could not submit complaint');
      }
      submit.disabled = false;
      submit.innerHTML = `${icon('send')} Submit complaint`;
    }
  });
}

export async function renderCitizenComplaints(root) {
  root.innerHTML = `${pageHeader({
    title: 'My complaints',
    subtitle: 'Search, filter and follow every report you have submitted.',
    actions: `<a class="btn btn-primary" href="/citizen/report">${icon('plus')} New complaint</a>`
  })}${loadingState('Loading your complaints…')}`;
  const statuses = ['All', 'Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
  const params = new URL(location.href).searchParams;
  const filters = {
    status: params.get('status') || 'All',
    priority: params.get('priority') || 'All',
    area: params.get('area') || 'All',
    search: params.get('search') || '',
    sort: params.get('sort') || 'recent'
  };
  const initialQuery = new URLSearchParams();
  if (filters.status !== 'All') initialQuery.set('status', filters.status);
  if (filters.priority !== 'All') initialQuery.set('priority', filters.priority);
  if (filters.area !== 'All') initialQuery.set('area', filters.area);
  if (filters.search) initialQuery.set('search', filters.search);
  initialQuery.set('sort', filters.sort);
  try {
    const initial = await api.get(`/api/citizen/complaints?${initialQuery.toString()}`);
    state.lastComplaintFilters = filters;
    root.innerHTML = `${pageHeader({
      title: 'My complaints',
      subtitle: 'Search, filter and follow every report you have submitted.',
      actions: `<a class="btn btn-primary" href="/citizen/report">${icon('plus')} New complaint</a>`
    })}
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-field">${icon('search')}<input type="search" value="${esc(filters.search)}" placeholder="Search by ID, issue or area" data-search></div>
        <select class="select-sm" data-sort aria-label="Sort complaints"><option value="recent" ${filters.sort === 'recent' ? 'selected' : ''}>Newest first</option><option value="priority" ${filters.sort === 'priority' ? 'selected' : ''}>Priority first</option><option value="deadline" ${filters.sort === 'deadline' ? 'selected' : ''}>Deadline first</option></select>
        <select class="select-sm" data-area aria-label="Filter by area"><option value="All">All areas</option>${(state.config.areas || []).map((area) => `<option value="${esc(area)}" ${filters.area === area ? 'selected' : ''}>${esc(area)}</option>`).join('')}</select>
        <select class="select-sm" data-priority aria-label="Filter by priority"><option value="All">All priorities</option>${state.config.priorities.map((priority) => `<option value="${esc(priority)}" ${filters.priority === priority ? 'selected' : ''}>${priority}</option>`).join('')}</select>
      </div>
    </div>
    <div class="filter-tabs" style="margin-bottom:14px" data-status-tabs>${statuses.map((status) => `<button class="filter-tab ${filters.status === status ? 'active' : ''}" data-status="${esc(status)}">${esc(status)}</button>`).join('')}</div>
    <div data-complaint-list>${initial.length ? `<div class="complaint-list">${initial.map((complaint) => complaintCard(complaint)).join('')}</div>` : emptyState({ iconName: 'file-text', title: 'No matching complaints', text: 'Try a different search term or clear the filters.', action: `<a class="btn btn-primary" href="/citizen/report">${icon('plus')} Report an issue</a>` })}</div>`;

    const list = root.querySelector('[data-complaint-list]');
    const search = root.querySelector('[data-search]');
    const sort = root.querySelector('[data-sort]');
    const area = root.querySelector('[data-area]');
    const priority = root.querySelector('[data-priority]');
    let timer = null;

    const load = async (showSkeleton = false) => {
      const query = new URLSearchParams();
      if (filters.status !== 'All') query.set('status', filters.status);
      if (filters.priority !== 'All') query.set('priority', filters.priority);
      if (filters.area !== 'All') query.set('area', filters.area);
      if (filters.search) query.set('search', filters.search);
      query.set('sort', filters.sort || 'recent');
      if (showSkeleton) list.innerHTML = loadingState('Filtering complaints…');
      try {
        const complaints = await api.get(`/api/citizen/complaints?${query.toString()}`);
        state.lastComplaintFilters = filters;
        list.innerHTML = complaints.length
          ? `<div class="complaint-list">${complaints.map((complaint) => complaintCard(complaint)).join('')}</div><div class="tiny muted mt-12" style="text-align:right">${complaints.length} complaint${complaints.length === 1 ? '' : 's'} shown</div>`
          : emptyState({ iconName: 'search', title: 'No matching complaints', text: 'Try changing the filters or search term.', action: `<a class="btn btn-secondary" href="/citizen/report">${icon('plus')} Report an issue</a>` });
      } catch (error) {
        list.innerHTML = errorState({ title: 'Could not load complaints', text: error.message });
        list.querySelector('[data-retry]')?.addEventListener('click', () => load(true));
      }
    };

    root.querySelectorAll('[data-status]').forEach((button) => button.addEventListener('click', () => {
      filters.status = button.dataset.status;
      root.querySelectorAll('[data-status]').forEach((item) => item.classList.toggle('active', item === button));
      load(true);
    }));
    search.addEventListener('input', () => {
      filters.search = search.value.trim();
      clearTimeout(timer);
      timer = setTimeout(() => load(false), 350);
    });
    sort.addEventListener('change', () => { filters.sort = sort.value; load(true); });
    area.addEventListener('change', () => { filters.area = area.value; load(true); });
    priority.addEventListener('change', () => { filters.priority = priority.value; load(true); });
  } catch (error) {
    root.innerHTML = errorState({ title: 'Could not load complaints', text: error.message });
    root.querySelector('[data-retry]')?.addEventListener('click', () => renderCitizenComplaints(root));
  }
}

export async function renderCitizenComplaintDetail(root, id) {
  root.innerHTML = loadingState('Loading complaint details…');
  try {
    const complaint = await api.get(`/api/complaints/${encodeURIComponent(id)}`);
    const updates = complaint.updates || [];
    const ai = complaint.ai;
    const resolved = complaint.status === 'Resolved' || complaint.status === 'Closed';
    root.innerHTML = `${pageHeader({
      title: complaint.id,
      subtitle: complaint.category,
      breadcrumb: `<a href="/citizen/dashboard">Dashboard</a>${icon('chevron-right')}<a href="/citizen/complaints">My complaints</a>${icon('chevron-right')}<span>${esc(complaint.id)}</span>`,
      actions: `<button class="btn btn-secondary" data-print>${icon('file-text')} Print</button><a class="btn btn-secondary" href="/citizen/complaints">${icon('arrow-left')} Back</a>`
    })}
    <div class="detail-layout">
      <div class="detail-main">
        <div class="card detail-hero">
          <div class="detail-hero-top">
            <div>
              <div class="detail-id-row"><span class="complaint-id">${esc(complaint.id)}</span>${complaint.isDemo ? '<span class="badge badge-demo">DEMO</span>' : ''}${complaint.overdue ? '<span class="badge badge-overdue">Overdue</span>' : ''}</div>
              <h1 class="detail-title">${esc(complaint.description.slice(0, 120))}${complaint.description.length > 120 ? '…' : ''}</h1>
              <div class="flex gap-8 wrap">${priorityBadge(complaint.priority)}${statusBadge(complaint.status)}${complaint.escalated ? '<span class="badge badge-danger">Escalated</span>' : ''}</div>
            </div>
            <div style="text-align:right">${resolved ? `<span class="badge badge-resolved">${icon('check')} ${esc(complaint.status)}</span>` : `<div class="tiny muted">Expected resolution</div><div style="font-size:.82rem;font-weight:800" data-deadline="${esc(complaint.deadline)}" data-closed="0" class="${complaint.overdue ? 'text-danger' : ''}">${esc(deadlineText(complaint))}</div>`}</div>
          </div>
          <p class="detail-description">${esc(complaint.description)}</p>
          ${complaint.photoUrl ? `<div class="detail-photo"><img src="${esc(complaint.photoUrl)}" alt="Photo attached to complaint ${esc(complaint.id)}"></div>` : ''}
          <div class="detail-facts">
            <div class="detail-fact"><div class="detail-fact-label">Category</div><div class="detail-fact-value">${icon('flag')} ${esc(complaint.category)}</div></div>
            <div class="detail-fact"><div class="detail-fact-label">Priority</div><div class="detail-fact-value">${priorityBadge(complaint.priority)}</div></div>
            <div class="detail-fact"><div class="detail-fact-label">Department</div><div class="detail-fact-value">${icon('building')} ${esc(complaint.departmentName)}</div></div>
            <div class="detail-fact"><div class="detail-fact-label">Reported</div><div class="detail-fact-value">${icon('calendar')} ${fmtDate(complaint.createdAt)}</div></div>
            <div class="detail-fact"><div class="detail-fact-label">Target</div><div class="detail-fact-value">${icon('clock')} ${fmtHours(complaint.resolutionHours)}</div></div>
            <div class="detail-fact"><div class="detail-fact-label">Last updated</div><div class="detail-fact-value">${icon('activity')} ${timeAgo(complaint.updatedAt)}</div></div>
          </div>
          <div class="detail-location">
            <div class="detail-location-icon">${icon('map-pin')}</div>
            <div><strong>${esc(complaint.area)}</strong><span>${complaint.landmark ? esc(complaint.landmark) : 'No landmark provided'}</span></div>
          </div>
          ${ai ? `<div class="detail-ai"><div class="detail-ai-head">${icon('sparkles')} Prototype AI analysis</div><p>${esc(ai.reasons?.join(' ') || 'Rule-based triage applied.')} Suggested department: ${esc(ai.department)}. Priority score: ${ai.priorityScore}/100.</p><div class="detail-ai-tags"><span class="pill pill-teal">${esc(ai.category)}</span><span class="pill">Confidence ${ai.categoryConfidence}%</span><span class="pill">SLA ${fmtHours(ai.resolutionHours)}</span></div><div class="ai-disclaimer">This analysis is generated by transparent local rules and is not a real AI model.</div></div>` : ''}
        </div>
        <div class="card">
          <div class="card-header"><div><h2>Resolution timeline</h2><p>Every authority action on this complaint</p></div><span class="badge badge-neutral">${updates.length} update${updates.length === 1 ? '' : 's'}</span></div>
          <div class="card-body">
            ${updates.length ? `<div class="timeline">${updates.map((update) => {
              const tone = update.type === 'status' ? (update.newStatus === 'Resolved' || update.newStatus === 'Closed' ? 'teal' : 'cyan') : update.type === 'submitted' ? 'cyan' : update.type === 'assignment' ? 'orange' : update.type === 'deadline' ? 'red' : '';
              const iconName = update.type === 'submitted' ? 'file-plus' : update.type === 'status' ? (update.newStatus === 'Resolved' ? 'check-circle' : 'refresh') : update.type === 'assignment' ? 'building' : update.type === 'deadline' ? 'clock' : update.type === 'note' ? 'message-square' : 'activity';
              return `<div class="timeline-item"><div class="timeline-marker ${tone}">${icon(iconName)}</div><div class="timeline-body"><div class="timeline-top"><span class="timeline-title">${update.oldStatus ? `${esc(update.oldStatus)} → ${esc(update.newStatus)}` : update.type === 'submitted' ? 'Complaint submitted' : esc(update.type.replace(/_/g, ' '))}</span><span class="timeline-time">${fmtDateTime(update.createdAt)}</span></div><div class="timeline-text">${esc(update.message)}</div><div class="timeline-author">${icon('user')} ${esc(update.actorName)} · ${esc(update.actorRole)}</div></div></div>`;
            }).join('')}</div>` : emptyState({ iconName: 'activity', title: 'No timeline updates yet', text: 'Updates from the authority will appear here.' })}
          </div>
        </div>
      </div>
      <aside class="detail-side">
        <div class="side-card">
          <div class="side-card-head"><h3>Resolution SLA</h3>${icon('clock')}</div>
          ${resolved ? `<div class="callout callout-success" style="border:0;background:transparent;padding:0">${icon('check-circle')}<div><strong>${esc(complaint.status)}</strong><br>${complaint.resolvedAt ? `Resolved ${fmtDateTime(complaint.resolvedAt)}` : 'This complaint is complete.'} ${complaint.resolutionDurationHours ? `<br>Total time: ${fmtHours(complaint.resolutionDurationHours)}` : ''}</div></div>` : `
            <div class="side-row"><span class="side-row-label">Expected by</span><span class="side-row-value">${fmtDateTime(complaint.deadline)}</span></div>
            <div class="side-row"><span class="side-row-label">Time remaining</span><span class="side-row-value ${complaint.overdue ? 'text-danger' : ''}" data-deadline="${esc(complaint.deadline)}" data-closed="0">${esc(deadlineText(complaint))}</span></div>
            <div class="side-row"><span class="side-row-label">SLA window</span><span class="side-row-value">${fmtHours(complaint.resolutionHours)}</span></div>
            <div class="sla-bar"><span class="${complaint.overdue ? 'overdue' : ''}" style="width:${complaint.overdue ? 100 : Math.min(100, Math.max(4, 100 - (complaint.remainingSeconds / (complaint.resolutionHours * 3600) * 100)))}%"></span></div>
            ${complaint.escalated ? `<div class="callout callout-danger mt-12" style="padding:9px 10px;font-size:.68rem">${icon('alert-triangle')}<div><strong>Escalated</strong><br>This complaint crossed its deadline and was sent to the authority queue.</div></div>` : ''}`}
        </div>
        <div class="side-card">
          <div class="side-card-head"><h3>Assigned team</h3>${icon('building')}</div>
          <div class="contact-card"><span class="avatar" style="background:var(--teal-soft);color:var(--teal-dark)">${icon('building')}</span><div><strong>${esc(complaint.departmentName)}</strong><span>Responsible department</span></div></div>
          <div class="side-row"><span class="side-row-label">Priority score</span><span class="side-row-value">${complaint.priorityScore}/100</span></div>
          <div class="side-row"><span class="side-row-label">Assignment</span><span class="side-row-value">${complaint.assignedAt ? fmtDate(complaint.assignedAt) : 'Pending'}</span></div>
          <div class="side-row"><span class="side-row-label">Field work started</span><span class="side-row-value">${complaint.startedAt ? fmtDate(complaint.startedAt) : 'Not yet'}</span></div>
        </div>
        <div class="side-card">
          <div class="side-card-head"><h3>Need help?</h3>${icon('help-circle')}</div>
          <p class="small muted" style="line-height:1.6;margin:0 0 10px">If the issue has worsened or you need to add context, contact the civic authority and quote your complaint ID.</p>
          <div class="callout callout-info" style="padding:10px;font-size:.68rem">${icon('info')}<div><strong>${esc(complaint.id)}</strong><br>Keep this ID handy for follow-ups.</div></div>
        </div>
      </aside>
    </div>`;
    root.querySelector('[data-print]')?.addEventListener('click', () => window.print());
  } catch (error) {
    root.innerHTML = errorState({ title: 'Complaint not available', text: error.message, action: `<a class="btn btn-navy" href="/citizen/complaints">${icon('arrow-left')} Back to my complaints</a>` });
  }
}

export async function renderCitizenTrack(root) {
  let recent = [];
  try {
    recent = await api.get('/api/citizen/complaints?limit=6');
  } catch {}
  root.innerHTML = `${pageHeader({
    title: 'Track a complaint',
    subtitle: 'Enter your complaint ID to open its live resolution timeline.',
    breadcrumb: `<a href="/citizen/dashboard">Dashboard</a>${icon('chevron-right')}<span>Track</span>`
  })}
  <div class="grid grid-sidebar">
    <div class="card card-pad">
      <div class="flex-start" style="margin-bottom:18px"><div class="detail-location-icon" style="width:42px;height:42px;border-radius:12px">${icon('search')}</div><div><h2 style="font-size:1.05rem;margin:0">Find your complaint</h2><p class="small muted" style="margin:2px 0 0">Use the ID from your submission confirmation, for example CP-2026-0001.</p></div></div>
      <div class="auth-error" data-track-error>${icon('alert-circle')}<span></span></div>
      <form data-track-form class="flex gap-8" style="align-items:stretch;flex-wrap:wrap">
        <div class="search-field" style="flex:1;min-width:220px">${icon('search')}<input type="text" name="id" placeholder="CP-2026-0001" autocomplete="off" style="height:46px" required></div>
        <button class="btn btn-primary" type="submit" style="min-height:46px">${icon('arrow-right')} Track complaint</button>
      </form>
      <div class="callout callout-info mt-24">${icon('shield-check')}<div><strong>Private by default</strong><br>You can only open complaints linked to your own citizen account.</div></div>
      ${recent.length ? `<div class="section-title-row mt-24"><h3>Your recent reports</h3><a class="link" href="/citizen/complaints">View all ${icon('arrow-right')}</a></div><div class="complaint-list">${recent.slice(0, 4).map((complaint) => `<a class="pill" href="/citizen/complaints/${encodeURIComponent(complaint.id)}" style="justify-content:space-between;width:100%;padding:10px 12px">${icon('file-text')}<span style="flex:1;text-align:left">${esc(complaint.id)} · ${esc(complaint.category)}</span>${statusBadge(complaint.status)}</a>`).join('')}</div>` : ''}
    </div>
    <div class="card">
      <div class="card-header"><div><h2>What you can track</h2><p>Every step is recorded</p></div></div>
      <div class="card-body">
        <div class="activity-list">
          <div class="activity-item"><div class="activity-icon">${icon('file-plus')}</div><div class="activity-body"><div class="activity-text"><strong>Submitted</strong><br><span class="muted">Your report enters the civic queue.</span></div></div></div>
          <div class="activity-item"><div class="activity-icon teal">${icon('search')}</div><div class="activity-body"><div class="activity-text"><strong>Under review</strong><br><span class="muted">An authority admin validates the details.</span></div></div></div>
          <div class="activity-item"><div class="activity-icon orange">${icon('building')}</div><div class="activity-body"><div class="activity-text"><strong>Assigned</strong><br><span class="muted">The responsible department takes ownership.</span></div></div></div>
          <div class="activity-item"><div class="activity-icon cyan">${icon('tools')}</div><div class="activity-body"><div class="activity-text"><strong>In progress</strong><br><span class="muted">Field work has started on the ground.</span></div></div></div>
          <div class="activity-item"><div class="activity-icon red">${icon('check-circle')}</div><div class="activity-body"><div class="activity-text"><strong>Resolved</strong><br><span class="muted">The fix is recorded, with SLA performance.</span></div></div></div>
        </div>
      </div>
    </div>
  </div>`;
  const form = root.querySelector('[data-track-form]');
  const errorBox = root.querySelector('[data-track-error]');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.classList.remove('show');
    const id = form.id.value.trim().toUpperCase();
    if (!id) return;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.innerHTML = '<span class="spinner spinner-light"></span> Searching…';
    try {
      const complaint = await api.get(`/api/complaints/${encodeURIComponent(id)}`);
      navigate(`/citizen/complaints/${encodeURIComponent(complaint.id)}`);
    } catch (error) {
      errorBox.querySelector('span').textContent = error.message;
      errorBox.classList.add('show');
      button.disabled = false;
      button.innerHTML = `${icon('arrow-right')} Track complaint`;
    }
  });
}
