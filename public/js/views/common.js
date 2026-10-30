import { api } from '../api.js';
import { navigate } from '../router.js';
import { setUnread, state } from '../store.js';
import {
  avatar,
  emptyState,
  errorState,
  esc,
  fmtDate,
  fmtDateTime,
  icon,
  loadingState,
  pageHeader,
  timeAgo,
  toast
} from '../ui.js';

const NOTIFICATION_META = {
  submitted: { icon: 'file-plus', tone: '' },
  status: { icon: 'refresh', tone: 'teal' },
  assignment: { icon: 'building', tone: 'orange' },
  resolved: { icon: 'check-circle', tone: 'teal' },
  overdue: { icon: 'alert-triangle', tone: 'red' },
  escalation: { icon: 'alert-triangle', tone: 'red' },
  deadline: { icon: 'clock', tone: 'orange' },
  new_complaint: { icon: 'inbox', tone: '' },
  authority_update: { icon: 'message-square', tone: 'teal' },
  password_request: { icon: 'key', tone: 'orange' }
};

function detailHref(complaintId) {
  if (!complaintId) return '';
  return `${state.user.role === 'admin' ? '/admin' : '/citizen'}/complaints/${encodeURIComponent(complaintId)}`;
}

function notificationItem(item) {
  const meta = NOTIFICATION_META[item.type] || { icon: 'bell', tone: '' };
  return `<div class="notification-item ${item.isRead ? '' : 'unread'}" data-notification="${item.id}">
    <div class="notification-icon ${meta.tone}">${icon(meta.icon)}</div>
    <div class="notification-main">
      <div class="notification-title">${esc(item.title)}</div>
      <div class="notification-text">${esc(item.message)}</div>
      <div class="notification-time">${timeAgo(item.createdAt)}</div>
    </div>
    ${!item.isRead ? `<button class="btn btn-ghost btn-icon-sm" data-read="${item.id}" title="Mark as read" aria-label="Mark as read">${icon('check')}</button>` : ''}
    ${item.complaintId ? `<a class="btn btn-ghost btn-icon-sm" href="${detailHref(item.complaintId)}" title="Open complaint" aria-label="Open complaint">${icon('chevron-right')}</a>` : ''}
  </div>`;
}

export async function renderNotifications(root) {
  root.innerHTML = `${pageHeader({
    title: 'Notifications',
    subtitle: 'Authority updates, status changes and deadline alerts.',
    actions: `<button class="btn btn-secondary" data-refresh>${icon('refresh')} Refresh</button><button class="btn btn-navy" data-read-all>${icon('check')} Mark all read</button>`
  })}${loadingState('Loading notifications…')}`;
  let items = [];
  const load = async () => {
    try {
      const data = await api.get('/api/notifications');
      items = data.items;
      setUnread(data.unread);
      root.innerHTML = `${pageHeader({
        title: 'Notifications',
        subtitle: data.unread ? `${data.unread} unread update${data.unread === 1 ? '' : 's'} from the civic authority.` : 'Authority updates, status changes and deadline alerts.',
        actions: `<button class="btn btn-secondary" data-refresh>${icon('refresh')} Refresh</button><button class="btn btn-navy" data-read-all ${data.unread ? '' : 'disabled'}>${icon('check')} Mark all read</button>`
      })}
      <div class="notification-page-list">
        ${items.length ? `<div class="notification-list">${items.map(notificationItem).join('')}</div>` : emptyState({ iconName: 'bell', title: 'No notifications yet', text: 'You will be notified when a complaint status changes or a deadline is crossed.' })}
      </div>`;
      bind();
    } catch (error) {
      root.innerHTML = errorState({ title: 'Could not load notifications', text: error.message });
      root.querySelector('[data-retry]')?.addEventListener('click', load);
    }
  };
  const bind = () => {
    root.querySelector('[data-refresh]')?.addEventListener('click', load);
    root.querySelector('[data-read-all]')?.addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      button.innerHTML = '<span class="spinner spinner-light"></span> Updating…';
      try {
        await api.post('/api/notifications/read-all');
        setUnread(0);
        toast('All notifications marked as read.', 'success');
        load();
      } catch (error) {
        toast(error.message, 'error');
        button.disabled = false;
        button.innerHTML = `${icon('check')} Mark all read`;
      }
    });
    root.querySelectorAll('[data-read]').forEach((button) => button.addEventListener('click', async (event) => {
      event.preventDefault();
      const id = Number(button.dataset.read);
      try {
        await api.patch(`/api/notifications/${id}/read`);
        setUnread(Math.max(0, state.unread - 1));
        const row = button.closest('[data-notification]');
        row?.classList.remove('unread');
        button.remove();
      } catch (error) {
        toast(error.message, 'error');
      }
    }));
  };
  await load();
}

export function renderProfile(root) {
  const user = state.user;
  const areas = state.config.areas || [];
  root.innerHTML = `${pageHeader({
    title: 'Profile & settings',
    subtitle: 'Manage your account details and password.',
    breadcrumb: `<a href="${user.role === 'admin' ? '/admin/dashboard' : '/citizen/dashboard'}">Dashboard</a>${icon('chevron-right')}<span>Profile</span>`
  })}
  <div class="profile-layout">
    <div class="profile-card">
      <div class="profile-cover"></div>
      <div class="profile-body">
        ${avatar(user.fullName, 'avatar-xl profile-avatar')}
        <h2 class="profile-name">${esc(user.fullName)}</h2>
        <div class="profile-email">${esc(user.email)}</div>
        <div class="profile-badges"><span class="badge ${user.role === 'admin' ? 'badge-cyan' : 'badge-teal'}">${user.role === 'admin' ? 'Authority admin' : 'Citizen'}</span>${user.isDemo ? '<span class="badge badge-demo">DEMO</span>' : ''}</div>
        <div class="profile-meta">
          <div class="profile-meta-row"><span>${icon('phone')} Mobile</span><strong>${esc(user.mobile || 'Not set')}</strong></div>
          <div class="profile-meta-row"><span>${icon('map-pin')} Area</span><strong>${esc(user.area || 'Not set')}</strong></div>
          <div class="profile-meta-row"><span>${icon('calendar')} Member since</span><strong>${fmtDate(user.createdAt)}</strong></div>
          <div class="profile-meta-row"><span>${icon('shield-check')} Account status</span><strong class="text-success">Active</strong></div>
        </div>
      </div>
    </div>
    <div class="profile-form-card card">
      <h2>Personal information</h2>
      <p class="sub">Update the details the authority uses to contact you.</p>
      <div class="auth-success" data-profile-success>${icon('check-circle')}<span></span></div>
      <div class="auth-error" data-profile-error>${icon('alert-circle')}<span></span></div>
      <form data-profile-form novalidate>
        <div class="form-row">
          <div class="form-group"><label class="form-label" for="profile-name">Full name</label><input class="form-input" id="profile-name" name="fullName" value="${esc(user.fullName)}" required maxlength="80"></div>
          <div class="form-group"><label class="form-label" for="profile-email">Email</label><input class="form-input" id="profile-email" value="${esc(user.email)}" disabled></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label" for="profile-mobile">Mobile</label><input class="form-input" id="profile-mobile" name="mobile" type="tel" value="${esc(user.mobile || '')}" required></div>
          <div class="form-group"><label class="form-label" for="profile-area">Area / ward</label><select class="form-select" id="profile-area" name="area" required>${areas.map((area) => `<option value="${esc(area)}" ${area === user.area ? 'selected' : ''}>${esc(area)}</option>`).join('')}</select></div>
        </div>
        <button class="btn btn-primary" type="submit" data-profile-submit>${icon('save')} Save changes</button>
      </form>
      <div class="profile-section">
        <h3>Change password</h3>
        <div class="auth-success" data-password-success>${icon('check-circle')}<span></span></div>
        <div class="auth-error" data-password-error>${icon('alert-circle')}<span></span></div>
        <form data-password-form novalidate>
          <div class="form-group"><label class="form-label" for="current-password">Current password</label><input class="form-input" id="current-password" name="currentPassword" type="password" autocomplete="current-password" required></div>
          <div class="form-row">
            <div class="form-group"><label class="form-label" for="new-password">New password</label><input class="form-input" id="new-password" name="newPassword" type="password" autocomplete="new-password" required><div class="form-hint">At least 8 characters with a letter and a number.</div></div>
            <div class="form-group"><label class="form-label" for="confirm-password">Confirm new password</label><input class="form-input" id="confirm-password" name="confirmPassword" type="password" autocomplete="new-password" required></div>
          </div>
          <button class="btn btn-secondary" type="submit" data-password-submit>${icon('key')} Update password</button>
        </form>
      </div>
      <div class="profile-section">
        <h3>Security & privacy</h3>
        <div class="callout callout-teal">${icon('shield-check')}<div><strong>Your session is protected</strong><br>Passwords are hashed with scrypt. Sessions use a hashed, HTTP-only cookie. Changing your password signs out other sessions.</div></div>
      </div>
    </div>
  </div>`;

  const profileForm = root.querySelector('[data-profile-form]');
  const profileError = root.querySelector('[data-profile-error]');
  const profileSuccess = root.querySelector('[data-profile-success]');
  profileForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    profileError.classList.remove('show');
    profileSuccess.classList.remove('show');
    const button = root.querySelector('[data-profile-submit]');
    button.disabled = true;
    button.innerHTML = '<span class="spinner spinner-light"></span> Saving…';
    try {
      const result = await api.patch('/api/profile', {
        fullName: profileForm.fullName.value,
        mobile: profileForm.mobile.value,
        area: profileForm.area.value
      });
      state.user = result.user;
      profileSuccess.querySelector('span').textContent = 'Profile updated successfully.';
      profileSuccess.classList.add('show');
      toast('Profile updated.', 'success');
      renderProfile(root);
    } catch (error) {
      profileError.querySelector('span').textContent = error.message;
      profileError.classList.add('show');
      button.disabled = false;
      button.innerHTML = `${icon('save')} Save changes`;
    }
  });

  const passwordForm = root.querySelector('[data-password-form]');
  const passwordError = root.querySelector('[data-password-error]');
  const passwordSuccess = root.querySelector('[data-password-success]');
  passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    passwordError.classList.remove('show');
    passwordSuccess.classList.remove('show');
    if (passwordForm.newPassword.value !== passwordForm.confirmPassword.value) {
      passwordError.querySelector('span').textContent = 'New passwords do not match.';
      passwordError.classList.add('show');
      return;
    }
    const button = root.querySelector('[data-password-submit]');
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Updating…';
    try {
      const result = await api.patch('/api/profile/password', {
        currentPassword: passwordForm.currentPassword.value,
        newPassword: passwordForm.newPassword.value,
        confirmPassword: passwordForm.confirmPassword.value
      });
      passwordForm.reset();
      passwordSuccess.querySelector('span').textContent = result.message;
      passwordSuccess.classList.add('show');
      toast('Password updated.', 'success');
    } catch (error) {
      passwordError.querySelector('span').textContent = error.message;
      passwordError.classList.add('show');
    } finally {
      button.disabled = false;
      button.innerHTML = `${icon('key')} Update password`;
    }
  });
}

export function notificationIcon(type) {
  return icon((NOTIFICATION_META[type] || NOTIFICATION_META.status).icon);
}

export function notificationDate(value) {
  return fmtDateTime(value);
}

export function goToNotifications() {
  navigate(`${state.user.role === 'admin' ? '/admin' : '/citizen'}/notifications`);
}
