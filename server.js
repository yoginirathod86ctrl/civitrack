const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { db, DATA_DIR } = require('./lib/db');
const { seedDemoData } = require('./lib/seed');
const { analyzeComplaint, CATEGORY_RULES } = require('./lib/ai');
const {
  hashPassword,
  verifyPassword,
  publicUser,
  createSession,
  destroySession,
  getUser,
  requireAuth,
  requireAdmin,
  requireCitizen,
  createLimiter
} = require('./lib/auth');
const {
  AREAS,
  ACTIVE_STATUSES,
  statsForUser,
  getComplaint,
  listComplaints,
  citizenDashboard,
  adminDashboard,
  searchDuplicates,
  hotspotData,
  mapData,
  analyticsData,
  listUsers,
  listDepartments,
  notify,
  notifyAdmins,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  escalateOverdue,
  publicSummary
} = require('./lib/service');
const {
  nowIso,
  uuid,
  addHours,
  clean,
  readBody,
  sendJson,
  sendError,
  HttpError,
  validateEmail,
  validateMobile,
  validatePassword,
  toCsv,
  clientIp
} = require('./lib/util');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const STATUSES = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const CATEGORIES = Object.keys(CATEGORY_RULES);
const TRANSITIONS = {
  'Submitted': ['Under Review', 'Assigned', 'In Progress', 'Resolved'],
  'Under Review': ['Assigned', 'In Progress', 'Resolved'],
  'Assigned': ['In Progress', 'Resolved'],
  'In Progress': ['Resolved'],
  'Resolved': ['Closed', 'Under Review'],
  'Closed': ['Under Review']
};

const loginLimiter = createLimiter({ windowMs: 10 * 60 * 1000, max: 12 });
const signupLimiter = createLimiter({ windowMs: 60 * 60 * 1000, max: 12 });
const forgotLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 6 });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

seedDemoData();

function securityHeaders(extra = {}) {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    ...extra
  };
}

function checkOrigin(req) {
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) return;
  const origin = req.headers.origin;
  if (!origin) return;
  try {
    const parsed = new URL(origin);
    if (parsed.host !== req.headers.host) {
      throw new HttpError(403, 'Request origin is not allowed.', 'ORIGIN_REJECTED');
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(403, 'Request origin is not allowed.', 'ORIGIN_REJECTED');
  }
}

function serveStatic(req, res, pathname) {
  let target = null;
  let root = PUBLIC_DIR;
  if (pathname.startsWith('/uploads/')) {
    root = UPLOAD_DIR;
    target = path.join(UPLOAD_DIR, path.basename(pathname));
  } else {
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    target = path.resolve(PUBLIC_DIR, relative);
    if (!target.startsWith(path.resolve(PUBLIC_DIR) + path.sep) && target !== path.resolve(PUBLIC_DIR, 'index.html')) {
      sendError(res, 403, 'Forbidden.');
      return;
    }
  }
  if (path.basename(target).startsWith('.')) {
    sendError(res, 404, 'Not found.');
    return;
  }
  fs.stat(target, (error, stat) => {
    if (error || !stat.isFile()) {
      if (pathname === '/' || !path.extname(pathname)) {
        const fallback = path.join(PUBLIC_DIR, 'index.html');
        fs.readFile(fallback, (fallbackError, content) => {
          if (fallbackError) return sendError(res, 404, 'Not found.');
          res.writeHead(200, securityHeaders({ 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' }));
          res.end(content);
        });
        return;
      }
      sendError(res, 404, 'Not found.');
      return;
    }
    const extension = path.extname(target).toLowerCase();
    const cache = ['.html', '.js', '.css'].includes(extension) ? 'no-cache' : 'public, max-age=86400';
    res.writeHead(200, securityHeaders({
      'Content-Type': MIME[extension] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': cache
    }));
    fs.createReadStream(target).pipe(res);
  });
}

function nextComplaintId() {
  const year = new Date().getUTCFullYear();
  const prefix = `CP-${year}-`;
  const rows = db.prepare('SELECT id FROM complaints WHERE id LIKE ?').all(`${prefix}%`);
  let max = 0;
  for (const row of rows) {
    const value = Number.parseInt(row.id.slice(prefix.length), 10);
    if (Number.isFinite(value)) max = Math.max(max, value);
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

function savePhoto(dataUrl) {
  if (!dataUrl) return null;
  const match = /^data:(image\/(png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl));
  if (!match) throw new HttpError(400, 'Photo must be a PNG, JPEG or WebP image.', 'INVALID_PHOTO');
  const mime = match[1];
  const buffer = Buffer.from(match[3].replace(/\s/g, ''), 'base64');
  if (buffer.length > 4 * 1024 * 1024) throw new HttpError(400, 'Photo must be smaller than 4 MB.', 'PHOTO_TOO_LARGE');
  const magicOk = (mime === 'image/png' && buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])))
    || (mime === 'image/jpeg' && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])))
    || (mime === 'image/webp' && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP');
  if (!magicOk) throw new HttpError(400, 'The uploaded file is not a valid image.', 'INVALID_PHOTO');
  const extension = mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : 'webp';
  const filename = `${uuid()}.${extension}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
  return filename;
}

function statusMessage(status, departmentName) {
  return {
    'Under Review': 'Complaint moved to under review.',
    'Assigned': `Complaint assigned to ${departmentName || 'the responsible department'}.`,
    'In Progress': 'Field work has started on this complaint.',
    'Resolved': 'Complaint marked as resolved by the authority.',
    'Closed': 'Complaint verified and closed by the authority.'
  }[status] || `Complaint status updated to ${status}.`;
}

async function handleApi(req, res, pathname, searchParams) {
  if (req.method === 'GET' && pathname === '/api/config') {
    return sendJson(res, 200, {
      ok: true,
      data: {
        areas: AREAS,
        categories: CATEGORIES,
        statuses: STATUSES,
        priorities: PRIORITIES,
        transitions: TRANSITIONS,
        note: 'CivicPulse AI is an academic prototype. It is not connected to a real government authority.'
      }
    });
  }

  if (req.method === 'GET' && pathname === '/api/public/summary') {
    return sendJson(res, 200, { ok: true, data: publicSummary() });
  }

  if (req.method === 'GET' && pathname === '/api/auth/me') {
    const user = getUser(req);
    if (!user) return sendJson(res, 200, { ok: true, data: null });
    const unread = db.prepare('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0').get(user.id).count;
    return sendJson(res, 200, { ok: true, data: { user: publicUser(user), unreadNotifications: unread } });
  }

  if (req.method === 'POST' && pathname === '/api/auth/signup') {
    const ip = clientIp(req);
    if (!signupLimiter(ip)) throw new HttpError(429, 'Too many registration attempts. Please try again later.', 'RATE_LIMITED');
    const body = await readBody(req);
    const fullName = clean(body.fullName, 80);
    const email = clean(body.email, 254).toLowerCase();
    const mobile = clean(body.mobile, 25);
    const area = clean(body.area, 80);
    const password = String(body.password || '');
    const confirmPassword = String(body.confirmPassword || '');
    if (fullName.length < 2) throw new HttpError(400, 'Please enter your full name.', 'INVALID_NAME');
    if (!validateEmail(email)) throw new HttpError(400, 'Please enter a valid email address.', 'INVALID_EMAIL');
    if (!validateMobile(mobile)) throw new HttpError(400, 'Please enter a valid mobile number.', 'INVALID_MOBILE');
    if (area.length < 2) throw new HttpError(400, 'Please select your area or ward.', 'INVALID_AREA');
    if (!validatePassword(password)) throw new HttpError(400, 'Password must be at least 8 characters and include a letter and a number.', 'WEAK_PASSWORD');
    if (password !== confirmPassword) throw new HttpError(400, 'Passwords do not match.', 'PASSWORD_MISMATCH');
    const existing = db.prepare('SELECT id FROM profiles WHERE email = ?').get(email);
    if (existing) throw new HttpError(409, 'An account with this email already exists. Please sign in instead.', 'EMAIL_EXISTS');
    const id = uuid();
    db.prepare('INSERT INTO profiles (id, role, full_name, email, mobile, password_hash, area, is_demo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)').run(
      id, 'citizen', fullName, email, mobile, hashPassword(password), area, nowIso()
    );
    createSession(req, res, id, false);
    const user = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id);
    return sendJson(res, 201, { ok: true, data: { user: publicUser(user) } });
  }

  if (req.method === 'POST' && pathname === '/api/auth/login') {
    const ip = clientIp(req);
    const body = await readBody(req);
    const email = clean(body.email, 254).toLowerCase();
    const password = String(body.password || '');
    const remember = Boolean(body.remember);
    const portal = clean(body.portal, 20);
    if (!loginLimiter(`${ip}:${email}`)) throw new HttpError(429, 'Too many sign-in attempts. Please wait a few minutes.', 'RATE_LIMITED');
    if (!validateEmail(email) || !password) throw new HttpError(400, 'Enter your email and password.', 'INVALID_CREDENTIALS');
    const user = db.prepare('SELECT * FROM profiles WHERE email = ?').get(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      throw new HttpError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
    }
    if (portal && ['citizen', 'admin'].includes(portal) && user.role !== portal) {
      throw new HttpError(403, portal === 'admin' ? 'This account does not have Authority access. Use the Citizen tab.' : 'This is an Authority account. Use the Authority Admin tab.', 'ROLE_MISMATCH');
    }
    createSession(req, res, user.id, remember);
    return sendJson(res, 200, { ok: true, data: { user: publicUser(user) } });
  }

  if (req.method === 'POST' && pathname === '/api/auth/logout') {
    destroySession(req, res);
    return sendJson(res, 200, { ok: true, data: { message: 'Signed out.' } });
  }

  if (req.method === 'POST' && pathname === '/api/auth/forgot-password') {
    const ip = clientIp(req);
    if (!forgotLimiter(ip)) throw new HttpError(429, 'Too many reset requests. Please try again later.', 'RATE_LIMITED');
    const body = await readBody(req);
    const email = clean(body.email, 254).toLowerCase();
    if (!validateEmail(email)) throw new HttpError(400, 'Enter a valid email address.', 'INVALID_EMAIL');
    const user = db.prepare('SELECT id, full_name FROM profiles WHERE email = ?').get(email);
    if (user) {
      notifyAdmins(null, 'password_request', 'Password reset requested', `A reset request was recorded for ${email}. Email delivery is not enabled in this prototype.`);
    }
    return sendJson(res, 200, {
      ok: true,
      data: {
        message: 'Your request has been recorded. Automated email delivery is not enabled in this prototype, so please contact the civic administrator to reset the password.'
      }
    });
  }

  if (pathname === '/api/profile' && req.method === 'PATCH') {
    const user = requireAuth(req);
    const body = await readBody(req);
    const fullName = clean(body.fullName, 80);
    const mobile = clean(body.mobile, 25);
    const area = clean(body.area, 80);
    if (fullName.length < 2) throw new HttpError(400, 'Please enter your full name.', 'INVALID_NAME');
    if (!validateMobile(mobile)) throw new HttpError(400, 'Please enter a valid mobile number.', 'INVALID_MOBILE');
    if (area.length < 2) throw new HttpError(400, 'Please select your area or ward.', 'INVALID_AREA');
    db.prepare('UPDATE profiles SET full_name = ?, mobile = ?, area = ? WHERE id = ?').run(fullName, mobile, area, user.id);
    const updated = db.prepare('SELECT * FROM profiles WHERE id = ?').get(user.id);
    return sendJson(res, 200, { ok: true, data: { user: publicUser(updated) } });
  }

  if (pathname === '/api/profile/password' && req.method === 'PATCH') {
    const user = requireAuth(req);
    const body = await readBody(req);
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');
    const confirmPassword = String(body.confirmPassword || '');
    if (!verifyPassword(currentPassword, user.password_hash)) throw new HttpError(400, 'Current password is incorrect.', 'INVALID_PASSWORD');
    if (!validatePassword(newPassword)) throw new HttpError(400, 'New password must be at least 8 characters and include a letter and a number.', 'WEAK_PASSWORD');
    if (newPassword !== confirmPassword) throw new HttpError(400, 'New passwords do not match.', 'PASSWORD_MISMATCH');
    db.prepare('UPDATE profiles SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), user.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    createSession(req, res, user.id, false);
    return sendJson(res, 200, { ok: true, data: { message: 'Password updated. Other sessions have been signed out.' } });
  }

  if (pathname === '/api/citizen/dashboard' && req.method === 'GET') {
    const user = requireCitizen(req);
    return sendJson(res, 200, { ok: true, data: citizenDashboard(user) });
  }

  if (pathname === '/api/citizen/complaints' && req.method === 'GET') {
    const user = requireCitizen(req);
    return sendJson(res, 200, {
      ok: true,
      data: listComplaints(user, {
        status: searchParams.get('status') || 'All',
        priority: searchParams.get('priority') || 'All',
        area: searchParams.get('area') || 'All',
        search: clean(searchParams.get('search'), 120),
        sort: searchParams.get('sort') || 'recent',
        limit: searchParams.get('limit') || 200
      })
    });
  }

  if (pathname === '/api/citizen/analyze' && req.method === 'POST') {
    requireCitizen(req);
    const body = await readBody(req);
    const description = clean(body.description, 2000);
    const category = clean(body.category, 40);
    if (description.length < 10) throw new HttpError(400, 'Describe the problem in at least 10 characters.', 'INVALID_DESCRIPTION');
    const analysis = analyzeComplaint({ description, category, hasPhoto: Boolean(body.hasPhoto) });
    return sendJson(res, 200, { ok: true, data: analysis });
  }

  if (pathname === '/api/citizen/duplicates' && req.method === 'POST') {
    const user = requireCitizen(req);
    const body = await readBody(req);
    const description = clean(body.description, 2000);
    const area = clean(body.area, 80);
    const category = clean(body.category, 40);
    if (description.length < 10 || !area || !category) {
      return sendJson(res, 200, { ok: true, data: [] });
    }
    return sendJson(res, 200, { ok: true, data: searchDuplicates({ description, category, area, userId: user.id }) });
  }

  if (pathname === '/api/citizen/complaints' && req.method === 'POST') {
    const user = requireCitizen(req);
    const body = await readBody(req);
    const description = clean(body.description, 2000);
    const area = clean(body.area, 80);
    const landmark = clean(body.landmark, 140);
    const requestedCategory = clean(body.category, 40);
    const category = CATEGORY_RULES[requestedCategory] ? requestedCategory : '';
    if (description.length < 10) throw new HttpError(400, 'Describe the problem in at least 10 characters.', 'INVALID_DESCRIPTION');
    if (area.length < 2) throw new HttpError(400, 'Please select the area or location.', 'INVALID_AREA');
    const analysis = analyzeComplaint({ description, category, hasPhoto: Boolean(body.photo) });
    if (!body.confirmDistinct) {
      const duplicates = searchDuplicates({ description, category: analysis.category, area, userId: user.id });
      if (duplicates.length) {
        throw new HttpError(409, 'A similar complaint was submitted recently.', 'DUPLICATE_SUSPECTED', { duplicates });
      }
    }
    const photoPath = savePhoto(body.photo);
    const id = nextComplaintId();
    const createdAt = nowIso();
    const deadline = addHours(createdAt, analysis.resolutionHours);
    const department = db.prepare('SELECT id, name FROM departments WHERE name = ?').get(analysis.department);
    if (!department) throw new HttpError(500, 'The suggested department is not configured.', 'DEPARTMENT_MISSING');
    db.exec('BEGIN');
    try {
      db.prepare(`
        INSERT INTO complaints (
          id, user_id, category, description, area, landmark, photo_path, status, priority, priority_score,
          department_id, resolution_hours, deadline, escalated, ai_analysis, is_demo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Submitted', ?, ?, ?, ?, ?, 0, ?, 0, ?, ?)
      `).run(
        id, user.id, analysis.category, description, area, landmark, photoPath, analysis.priority,
        analysis.priorityScore, department.id, analysis.resolutionHours, deadline, JSON.stringify(analysis), createdAt, createdAt
      );
      db.prepare('INSERT INTO complaint_updates (complaint_id, actor_id, actor_name, actor_role, type, message, new_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        id, user.id, user.full_name, 'citizen', 'submitted', 'Complaint submitted by citizen.', 'Submitted', createdAt
      );
      notify(user.id, id, 'submitted', 'Complaint submitted', `Your complaint ${id} was received for ${area}. Expected resolution: ${analysis.resolutionHours} hours.`);
      notifyAdmins(id, 'new_complaint', 'New complaint received', `${id} · ${analysis.priority} priority · ${area}.`);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    return sendJson(res, 201, { ok: true, data: getComplaint(id, user) });
  }

  if (pathname === '/api/notifications' && req.method === 'GET') {
    const user = requireAuth(req);
    return sendJson(res, 200, { ok: true, data: listNotifications(user.id) });
  }

  if (pathname === '/api/notifications/read-all' && req.method === 'POST') {
    const user = requireAuth(req);
    markAllNotificationsRead(user.id);
    return sendJson(res, 200, { ok: true, data: { unread: 0 } });
  }

  let match = pathname.match(/^\/api\/notifications\/(\d+)\/read$/);
  if (match && req.method === 'PATCH') {
    const user = requireAuth(req);
    const updated = markNotificationRead(user.id, Number(match[1]));
    if (!updated) throw new HttpError(404, 'Notification not found.', 'NOT_FOUND');
    return sendJson(res, 200, { ok: true, data: { read: true } });
  }

  match = pathname.match(/^\/api\/complaints\/([^/]+)$/);
  if (match && req.method === 'GET') {
    const user = requireAuth(req);
    const complaint = getComplaint(decodeURIComponent(match[1]), user);
    if (!complaint) throw new HttpError(404, 'Complaint not found or you do not have access to it.', 'NOT_FOUND');
    return sendJson(res, 200, { ok: true, data: complaint });
  }

  if (pathname === '/api/admin/dashboard' && req.method === 'GET') {
    requireAdmin(req);
    return sendJson(res, 200, { ok: true, data: adminDashboard() });
  }

  if (pathname === '/api/admin/complaints' && req.method === 'GET') {
    const user = requireAdmin(req);
    return sendJson(res, 200, {
      ok: true,
      data: listComplaints(user, {
        status: searchParams.get('status') || 'All',
        priority: searchParams.get('priority') || 'All',
        area: searchParams.get('area') || 'All',
        search: clean(searchParams.get('search'), 120),
        sort: searchParams.get('sort') || 'recent',
        overdue: searchParams.get('overdue') === '1',
        active: searchParams.get('active') === '1',
        limit: searchParams.get('limit') || 200
      })
    });
  }

  if (pathname === '/api/admin/priority-queue' && req.method === 'GET') {
    const user = requireAdmin(req);
    return sendJson(res, 200, {
      ok: true,
      data: listComplaints(user, { active: true, sort: 'priority', limit: 300 })
    });
  }

  if (pathname === '/api/admin/timers' && req.method === 'GET') {
    const user = requireAdmin(req);
    return sendJson(res, 200, {
      ok: true,
      data: listComplaints(user, { active: true, sort: 'deadline', limit: 300 })
    });
  }

  if (pathname === '/api/admin/overdue' && req.method === 'GET') {
    const user = requireAdmin(req);
    return sendJson(res, 200, {
      ok: true,
      data: listComplaints(user, { active: true, overdue: true, sort: 'priority', limit: 300 })
    });
  }

  if (pathname === '/api/admin/hotspots' && req.method === 'GET') {
    requireAdmin(req);
    return sendJson(res, 200, { ok: true, data: hotspotData() });
  }

  if (pathname === '/api/admin/map' && req.method === 'GET') {
    requireAdmin(req);
    return sendJson(res, 200, { ok: true, data: mapData() });
  }

  if (pathname === '/api/admin/analytics' && req.method === 'GET') {
    requireAdmin(req);
    return sendJson(res, 200, { ok: true, data: analyticsData() });
  }

  if (pathname === '/api/admin/users' && req.method === 'GET') {
    requireAdmin(req);
    return sendJson(res, 200, { ok: true, data: listUsers(clean(searchParams.get('search'), 120)) });
  }

  if (pathname === '/api/admin/departments' && req.method === 'GET') {
    requireAdmin(req);
    return sendJson(res, 200, { ok: true, data: listDepartments() });
  }

  if (pathname === '/api/admin/departments' && req.method === 'POST') {
    requireAdmin(req);
    const body = await readBody(req);
    const name = clean(body.name, 80);
    const code = clean(body.code, 12).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const description = clean(body.description, 300);
    const lead = clean(body.lead, 80);
    if (name.length < 2) throw new HttpError(400, 'Department name is required.', 'INVALID_NAME');
    if (code.length < 2) throw new HttpError(400, 'A short department code is required.', 'INVALID_CODE');
    const exists = db.prepare('SELECT id FROM departments WHERE name = ? COLLATE NOCASE OR code = ?').get(name, code);
    if (exists) throw new HttpError(409, 'A department with this name or code already exists.', 'DEPARTMENT_EXISTS');
    const id = uuid();
    db.prepare('INSERT INTO departments (id, name, code, description, lead, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, name, code, description, lead, nowIso());
    return sendJson(res, 201, { ok: true, data: listDepartments().find((department) => department.id === id) });
  }

  match = pathname.match(/^\/api\/admin\/departments\/([^/]+)$/);
  if (match && req.method === 'PATCH') {
    requireAdmin(req);
    const id = decodeURIComponent(match[1]);
    const body = await readBody(req);
    const current = db.prepare('SELECT * FROM departments WHERE id = ?').get(id);
    if (!current) throw new HttpError(404, 'Department not found.', 'NOT_FOUND');
    const name = clean(body.name, 80) || current.name;
    const code = (clean(body.code, 12) || current.code).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const description = body.description === undefined ? current.description : clean(body.description, 300);
    const lead = body.lead === undefined ? current.lead : clean(body.lead, 80);
    if (name.length < 2 || code.length < 2) throw new HttpError(400, 'Department name and code are required.', 'INVALID_DEPARTMENT');
    const duplicate = db.prepare('SELECT id FROM departments WHERE (name = ? COLLATE NOCASE OR code = ?) AND id != ?').get(name, code, id);
    if (duplicate) throw new HttpError(409, 'Another department already uses this name or code.', 'DEPARTMENT_EXISTS');
    db.prepare('UPDATE departments SET name = ?, code = ?, description = ?, lead = ? WHERE id = ?').run(name, code, description, lead, id);
    return sendJson(res, 200, { ok: true, data: listDepartments().find((department) => department.id === id) });
  }

  if (match && req.method === 'DELETE') {
    requireAdmin(req);
    const id = decodeURIComponent(match[1]);
    const current = db.prepare('SELECT * FROM departments WHERE id = ?').get(id);
    if (!current) throw new HttpError(404, 'Department not found.', 'NOT_FOUND');
    const used = db.prepare('SELECT COUNT(*) AS count FROM complaints WHERE department_id = ?').get(id).count;
    if (used) throw new HttpError(409, 'This department is assigned to complaints and cannot be deleted.', 'DEPARTMENT_IN_USE');
    db.prepare('DELETE FROM departments WHERE id = ?').run(id);
    return sendJson(res, 200, { ok: true, data: { deleted: true } });
  }

  match = pathname.match(/^\/api\/admin\/complaints\/([^/]+)$/);
  if (match && req.method === 'PATCH') {
    const user = requireAdmin(req);
    const id = decodeURIComponent(match[1]);
    const body = await readBody(req);
    const complaint = db.prepare(`${'SELECT c.*, p.full_name AS citizen_name, d.name AS department_name FROM complaints c JOIN profiles p ON p.id = c.user_id LEFT JOIN departments d ON d.id = c.department_id'} WHERE c.id = ?`).get(id);
    if (!complaint) throw new HttpError(404, 'Complaint not found.', 'NOT_FOUND');
    const newStatus = clean(body.status, 30) || complaint.status;
    if (!STATUSES.includes(newStatus)) throw new HttpError(400, 'Invalid complaint status.', 'INVALID_STATUS');
    if (newStatus !== complaint.status && !TRANSITIONS[complaint.status]?.includes(newStatus)) {
      throw new HttpError(409, `Cannot move a complaint from ${complaint.status} to ${newStatus}.`, 'INVALID_TRANSITION');
    }
    let departmentId = complaint.department_id;
    let departmentName = complaint.department_name;
    if (body.departmentId !== undefined) {
      if (body.departmentId === null || body.departmentId === '') {
        throw new HttpError(400, 'Select a department.', 'INVALID_DEPARTMENT');
      }
      const department = db.prepare('SELECT id, name FROM departments WHERE id = ?').get(clean(body.departmentId, 80));
      if (!department) throw new HttpError(400, 'Selected department was not found.', 'INVALID_DEPARTMENT');
      departmentId = department.id;
      departmentName = department.name;
    }
    let deadline = complaint.deadline;
    if (body.deadline !== undefined) {
      const parsed = new Date(body.deadline);
      if (Number.isNaN(parsed.getTime())) throw new HttpError(400, 'Enter a valid resolution deadline.', 'INVALID_DEADLINE');
      if (parsed.getTime() <= Date.now()) throw new HttpError(400, 'The resolution deadline must be in the future.', 'INVALID_DEADLINE');
      deadline = parsed.toISOString();
    }
    const note = clean(body.note, 1000);
    const statusChanged = newStatus !== complaint.status;
    const departmentChanged = departmentId !== complaint.department_id;
    const deadlineChanged = deadline !== complaint.deadline;
    if (!statusChanged && !departmentChanged && !deadlineChanged && !note) {
      throw new HttpError(400, 'No changes were provided.', 'NO_CHANGES');
    }
    const now = nowIso();
    let assignedAt = complaint.assigned_at;
    let startedAt = complaint.started_at;
    let resolvedAt = complaint.resolved_at;
    let closedAt = complaint.closed_at;
    let escalated = complaint.escalated;
    if (statusChanged) {
      if (['Assigned', 'In Progress', 'Resolved', 'Closed'].includes(newStatus) && !assignedAt) assignedAt = now;
      if (['In Progress', 'Resolved', 'Closed'].includes(newStatus) && !startedAt) startedAt = now;
      if (newStatus === 'Resolved') resolvedAt = now;
      if (newStatus === 'Closed') closedAt = now;
      if (newStatus === 'Under Review' && ['Resolved', 'Closed'].includes(complaint.status)) {
        resolvedAt = null;
        closedAt = null;
      }
    }
    if (deadlineChanged && new Date(deadline).getTime() > Date.now()) escalated = 0;
    db.exec('BEGIN');
    try {
      db.prepare(`
        UPDATE complaints SET status = ?, department_id = ?, deadline = ?, assigned_at = ?, started_at = ?,
          resolved_at = ?, closed_at = ?, escalated = ?, updated_at = ? WHERE id = ?
      `).run(newStatus, departmentId, deadline, assignedAt, startedAt, resolvedAt, closedAt, escalated ? 1 : 0, now, id);
      const actorName = user.full_name;
      if (departmentChanged) {
        db.prepare('INSERT INTO complaint_updates (complaint_id, actor_id, actor_name, actor_role, type, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          id, user.id, actorName, 'admin', 'assignment', `Complaint assigned to ${departmentName}.`, now
        );
        notify(complaint.user_id, id, 'assignment', 'Department assigned', `Complaint ${id} was assigned to ${departmentName}.`);
      }
      if (statusChanged) {
        const message = note || statusMessage(newStatus, departmentName);
        db.prepare('INSERT INTO complaint_updates (complaint_id, actor_id, actor_name, actor_role, type, message, old_status, new_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
          id, user.id, actorName, 'admin', 'status', message, complaint.status, newStatus, now
        );
        notify(complaint.user_id, id, newStatus === 'Resolved' ? 'resolved' : 'status', `Complaint ${newStatus}`, `Complaint ${id} is now ${newStatus}.`);
      } else if (note) {
        db.prepare('INSERT INTO complaint_updates (complaint_id, actor_id, actor_name, actor_role, type, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          id, user.id, actorName, 'admin', 'note', note, now
        );
        notify(complaint.user_id, id, 'authority_update', 'Authority update', `A new authority update was added to ${id}.`);
      }
      if (deadlineChanged) {
        db.prepare('INSERT INTO complaint_updates (complaint_id, actor_id, actor_name, actor_role, type, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          id, user.id, actorName, 'admin', 'deadline', `Expected resolution deadline updated to ${new Date(deadline).toLocaleString('en-IN')}.`, now
        );
        notify(complaint.user_id, id, 'deadline', 'Resolution deadline updated', `The expected resolution time for ${id} was updated.`);
      }
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    escalateOverdue();
    return sendJson(res, 200, { ok: true, data: getComplaint(id, user) });
  }

  if (pathname === '/api/admin/reports' && req.method === 'GET') {
    requireAdmin(req);
    return sendJson(res, 200, {
      ok: true,
      data: {
        analytics: analyticsData(),
        hotspots: hotspotData(),
        departments: listDepartments(),
        generatedAt: nowIso()
      }
    });
  }

  if (pathname === '/api/admin/export/complaints' && req.method === 'GET') {
    requireAdmin(req);
    const rows = db.prepare(`
      SELECT c.*, p.full_name AS citizen_name, p.email AS citizen_email, d.name AS department_name
      FROM complaints c JOIN profiles p ON p.id = c.user_id LEFT JOIN departments d ON d.id = c.department_id
      ORDER BY c.created_at DESC
    `).all();
    const csv = toCsv(rows, [
      { label: 'Complaint ID', value: (row) => row.id },
      { label: 'Citizen', value: (row) => row.citizen_name },
      { label: 'Email', value: (row) => row.citizen_email },
      { label: 'Category', value: (row) => row.category },
      { label: 'Description', value: (row) => row.description },
      { label: 'Area', value: (row) => row.area },
      { label: 'Landmark', value: (row) => row.landmark },
      { label: 'Priority Score', value: (row) => row.priority_score },
      { label: 'Priority', value: (row) => row.priority },
      { label: 'Department', value: (row) => row.department_name },
      { label: 'Status', value: (row) => row.status },
      { label: 'Created At', value: (row) => row.created_at },
      { label: 'Deadline', value: (row) => row.deadline },
      { label: 'Resolved At', value: (row) => row.resolved_at },
      { label: 'Demo Record', value: (row) => row.is_demo ? 'Yes' : 'No' }
    ]);
    res.writeHead(200, securityHeaders({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="civicpulse-complaints-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store'
    }));
    return res.end(csv);
  }

  if (pathname === '/api/admin/export/users' && req.method === 'GET') {
    requireAdmin(req);
    const rows = listUsers('');
    const csv = toCsv(rows, [
      { label: 'Citizen', value: (row) => row.fullName },
      { label: 'Email', value: (row) => row.email },
      { label: 'Mobile', value: (row) => row.mobile },
      { label: 'Area / Ward', value: (row) => row.area },
      { label: 'Registered At', value: (row) => row.registeredAt },
      { label: 'Complaints', value: (row) => row.complaintCount },
      { label: 'Active Complaints', value: (row) => row.activeCount },
      { label: 'Demo Account', value: (row) => row.isDemo ? 'Yes' : 'No' }
    ]);
    res.writeHead(200, securityHeaders({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="civicpulse-citizens-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store'
    }));
    return res.end(csv);
  }

  throw new HttpError(404, 'API route not found.', 'NOT_FOUND');
}

const server = http.createServer(async (req, res) => {
  try {
    checkOrigin(req);
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURI(url.pathname);
    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname, url.searchParams);
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendError(res, 405, 'Method not allowed.');
      return;
    }
    serveStatic(req, res, pathname);
  } catch (error) {
    if (res.headersSent) return;
    if (error instanceof HttpError) {
      sendError(res, error.status, error.message, error.code, error.details);
      return;
    }
    console.error(error);
    sendError(res, 500, 'An unexpected server error occurred.', 'SERVER_ERROR');
  }
});

setInterval(() => {
  try {
    const escalated = escalateOverdue();
    if (escalated) console.log(`[CivicPulse] Escalated ${escalated} overdue complaint(s).`);
  } catch (error) {
    console.error('Escalation check failed:', error);
  }
}, 60000).unref();

setTimeout(() => {
  try {
    const escalated = escalateOverdue();
    if (escalated) console.log(`[CivicPulse] Escalated ${escalated} overdue complaint(s).`);
  } catch (error) {
    console.error('Startup escalation check failed:', error);
  }
}, 1000);

server.listen(PORT, HOST, () => {
  console.log(`CivicPulse AI is running at http://localhost:${PORT}`);
  console.log('Citizen demo: citizen@civicpulse.ai / Demo@1234');
  console.log('Admin demo:   admin@civicpulse.ai / Admin@1234');
});

module.exports = { server, statsForUser };
