const { db } = require('./db');
const { parseJson, nowIso } = require('./util');
const { descriptionSimilarity } = require('./ai');

const AREAS = [
  'College Road',
  'Gandhi Nagar',
  'MG Road',
  'Station Road',
  'Lake View Colony',
  'Industrial Area',
  'Civil Lines',
  'Green Park'
];

const AREA_POINTS = {
  'College Road': { x: 28, y: 36 },
  'Gandhi Nagar': { x: 52, y: 25 },
  'MG Road': { x: 62, y: 50 },
  'Station Road': { x: 45, y: 62 },
  'Lake View Colony': { x: 22, y: 69 },
  'Industrial Area': { x: 79, y: 35 },
  'Civil Lines': { x: 39, y: 17 },
  'Green Park': { x: 72, y: 77 }
};

const ACTIVE_STATUSES = ['Submitted', 'Under Review', 'Assigned', 'In Progress'];
const CLOSED_STATUSES = ['Resolved', 'Closed'];

const BASE_SELECT = `
  SELECT c.*, p.full_name AS citizen_name, p.email AS citizen_email, p.mobile AS citizen_mobile,
         p.area AS citizen_area, p.is_demo AS citizen_is_demo, d.name AS department_name
  FROM complaints c
  JOIN profiles p ON p.id = c.user_id
  LEFT JOIN departments d ON d.id = c.department_id
`;

function isOverdueRow(row) {
  return ACTIVE_STATUSES.includes(row.status) && new Date(row.deadline).getTime() < Date.now();
}

function publicUpdate(row) {
  return row.type !== 'note';
}

function decorate(row, user = null) {
  const now = Date.now();
  const overdue = isOverdueRow(row);
  const deadlineDelta = Math.floor((new Date(row.deadline).getTime() - now) / 1000);
  const resolved = row.resolved_at ? new Date(row.resolved_at).getTime() : null;
  const created = new Date(row.created_at).getTime();
  const assigned = row.assigned_at ? new Date(row.assigned_at).getTime() : null;
  const payload = {
    id: row.id,
    category: row.category,
    description: row.description,
    area: row.area,
    landmark: row.landmark,
    photoUrl: row.photo_path ? `/uploads/${row.photo_path}` : null,
    status: row.status,
    priority: row.priority,
    priorityScore: row.priority_score,
    department: row.department_id ? { id: row.department_id, name: row.department_name } : null,
    departmentName: row.department_name || 'Not assigned',
    resolutionHours: row.resolution_hours,
    deadline: row.deadline,
    resolvedAt: row.resolved_at,
    closedAt: row.closed_at,
    assignedAt: row.assigned_at,
    startedAt: row.started_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    escalated: Boolean(row.escalated),
    overdue,
    remainingSeconds: ACTIVE_STATUSES.includes(row.status) ? Math.max(0, deadlineDelta) : 0,
    deadlineDeltaSeconds: deadlineDelta,
    overdueSeconds: overdue ? Math.abs(deadlineDelta) : 0,
    resolutionDurationHours: resolved ? Math.round(((resolved - created) / 3600000) * 10) / 10 : null,
    assignmentHours: assigned ? Math.round(((assigned - created) / 3600000) * 10) / 10 : null,
    slaMet: resolved ? resolved <= new Date(row.deadline).getTime() : null,
    isDemo: Boolean(row.is_demo),
    ai: parseJson(row.ai_analysis, null)
  };
  if (user && user.role === 'admin') {
    payload.citizen = {
      id: row.user_id,
      fullName: row.citizen_name,
      email: row.citizen_email,
      mobile: row.citizen_mobile,
      area: row.citizen_area,
      isDemo: Boolean(row.citizen_is_demo)
    };
  }
  return payload;
}

function complaintUpdates(complaintId, includePrivate) {
  const rows = db.prepare(`
    SELECT id, complaint_id, actor_name, actor_role, type, message, old_status, new_status, created_at
    FROM complaint_updates WHERE complaint_id = ? ORDER BY created_at ASC, id ASC
  `).all(complaintId);
  return rows.filter((row) => includePrivate || publicUpdate(row)).map((row) => ({
    id: row.id,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    type: row.type,
    message: row.message,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    createdAt: row.created_at
  }));
}

function getComplaint(id, user) {
  const row = db.prepare(`${BASE_SELECT} WHERE c.id = ?`).get(id);
  if (!row) return null;
  if (user.role !== 'admin' && row.user_id !== user.id) return null;
  const payload = decorate(row, user);
  const admin = user.role === 'admin';
  payload.updates = complaintUpdates(id, admin);
  payload.latestUpdate = payload.updates.length ? payload.updates[payload.updates.length - 1] : null;
  if (admin) {
    payload.escalations = db.prepare('SELECT * FROM escalation_logs WHERE complaint_id = ? ORDER BY created_at DESC').all(id).map((log) => ({
      id: log.id,
      reason: log.reason,
      previousDeadline: log.previous_deadline,
      priority: log.priority,
      createdAt: log.created_at
    }));
  }
  return payload;
}

function statsForUser(userId = null) {
  const filter = userId ? 'WHERE user_id = ?' : '';
  const params = userId ? [nowIso(), userId] : [nowIso()];
  const row = db.prepare(`
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN status = 'Submitted' THEN 1 ELSE 0 END), 0) AS submitted,
      COALESCE(SUM(CASE WHEN status = 'Under Review' THEN 1 ELSE 0 END), 0) AS under_review,
      COALESCE(SUM(CASE WHEN status = 'Assigned' THEN 1 ELSE 0 END), 0) AS assigned,
      COALESCE(SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END), 0) AS in_progress,
      COALESCE(SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END), 0) AS resolved,
      COALESCE(SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END), 0) AS closed,
      COALESCE(SUM(CASE WHEN priority = 'Critical' AND status NOT IN ('Resolved','Closed') THEN 1 ELSE 0 END), 0) AS critical,
      COALESCE(SUM(CASE WHEN status NOT IN ('Resolved','Closed') AND deadline < ? THEN 1 ELSE 0 END), 0) AS overdue
    FROM complaints ${filter}
  `).get(...params);
  return {
    total: row.total,
    submitted: row.submitted,
    underReview: row.under_review,
    assigned: row.assigned,
    inProgress: row.in_progress,
    pending: row.submitted + row.under_review,
    active: row.submitted + row.under_review + row.assigned + row.in_progress,
    resolved: row.resolved,
    closed: row.closed,
    critical: row.critical,
    overdue: row.overdue
  };
}

function listComplaints(user, filters = {}) {
  const where = [];
  const params = [];
  if (user.role !== 'admin') {
    where.push('c.user_id = ?');
    params.push(user.id);
  }
  if (filters.status && filters.status !== 'All') {
    where.push('c.status = ?');
    params.push(filters.status);
  }
  if (filters.priority && filters.priority !== 'All') {
    where.push('c.priority = ?');
    params.push(filters.priority);
  }
  if (filters.area && filters.area !== 'All') {
    where.push('c.area = ?');
    params.push(filters.area);
  }
  if (filters.overdue) {
    where.push("c.status NOT IN ('Resolved','Closed') AND c.deadline < ?");
    params.push(nowIso());
  }
  if (filters.active) {
    where.push("c.status NOT IN ('Resolved','Closed')");
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    where.push('(c.id LIKE ? OR c.description LIKE ? OR c.area LIKE ? OR c.landmark LIKE ? OR p.full_name LIKE ? OR p.email LIKE ?)');
    params.push(term, term, term, term, term, term);
  }
  const sort = filters.sort === 'priority'
    ? `ORDER BY CASE WHEN c.status NOT IN ('Resolved','Closed') AND c.deadline < '${nowIso()}' THEN 0 ELSE 1 END, c.priority_score DESC, c.deadline ASC`
    : filters.sort === 'deadline'
      ? "ORDER BY CASE WHEN c.status IN ('Resolved','Closed') THEN 1 ELSE 0 END, c.deadline ASC"
      : 'ORDER BY c.created_at DESC';
  const limit = Math.min(Math.max(Number(filters.limit) || 200, 1), 500);
  const sql = `${BASE_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ${sort} LIMIT ${limit}`;
  const rows = db.prepare(sql).all(...params);
  return rows.map((row) => decorate(row, user));
}

function citizenDashboard(user) {
  const stats = statsForUser(user.id);
  const recent = db.prepare(`${BASE_SELECT} WHERE c.user_id = ? ORDER BY c.created_at DESC LIMIT 5`).all(user.id).map((row) => decorate(row, user));
  const active = db.prepare(`${BASE_SELECT} WHERE c.user_id = ? AND c.status NOT IN ('Resolved','Closed') ORDER BY c.deadline ASC LIMIT 1`).get(user.id);
  const unread = db.prepare('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0').get(user.id).count;
  return {
    stats,
    recent,
    nextDeadline: active ? decorate(active, user) : null,
    unreadNotifications: unread
  };
}

function adminDashboard() {
  escalateOverdue();
  const stats = statsForUser(null);
  const queue = db.prepare(`
    ${BASE_SELECT}
    WHERE c.status NOT IN ('Resolved','Closed')
    ORDER BY CASE WHEN c.deadline < ? THEN 0 ELSE 1 END, c.priority_score DESC, c.deadline ASC
    LIMIT 6
  `).all(nowIso()).map((row) => decorate(row, { role: 'admin' }));
  const recent = db.prepare(`${BASE_SELECT} ORDER BY c.created_at DESC LIMIT 6`).all().map((row) => decorate(row, { role: 'admin' }));
  const categories = db.prepare('SELECT category, COUNT(*) AS count FROM complaints GROUP BY category ORDER BY count DESC').all();
  const hotspots = hotspotData().areas.slice(0, 4);
  return { stats, queue, recent, categories, hotspots };
}

function searchDuplicates({ description, category, area, userId }) {
  const cutoff = new Date(Date.now() - 72 * 3600000).toISOString();
  const rows = db.prepare(`
    SELECT id, user_id, category, description, area, status, priority, created_at
    FROM complaints
    WHERE category = ? AND area = ? COLLATE NOCASE AND created_at >= ?
    ORDER BY created_at DESC LIMIT 40
  `).all(category, area, cutoff);
  return rows
    .map((row) => ({
      id: row.id,
      category: row.category,
      area: row.area,
      status: row.status,
      priority: row.priority,
      createdAt: row.created_at,
      similarity: descriptionSimilarity(description, row.description),
      owned: row.user_id === userId,
      descriptionPreview: row.user_id === userId ? row.description.slice(0, 180) : null
    }))
    .filter((row) => row.similarity >= 30)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);
}

function hotspotData() {
  const rows = db.prepare('SELECT * FROM complaints').all();
  const areas = {};
  const categoryTotals = {};
  for (const row of rows) {
    if (!areas[row.area]) areas[row.area] = { area: row.area, total: 0, critical: 0, overdue: 0, resolved: 0, categories: {} };
    const area = areas[row.area];
    area.total += 1;
    if (row.priority === 'Critical') area.critical += 1;
    if (isOverdueRow(row)) area.overdue += 1;
    if (CLOSED_STATUSES.includes(row.status)) area.resolved += 1;
    area.categories[row.category] = (area.categories[row.category] || 0) + 1;
    categoryTotals[row.category] = (categoryTotals[row.category] || 0) + 1;
  }
  const areaList = Object.values(areas).map((area) => {
    const topCategory = Object.entries(area.categories).sort((a, b) => b[1] - a[1])[0] || ['None', 0];
    return {
      ...area,
      topCategory: topCategory[0],
      topCategoryCount: topCategory[1],
      riskScore: Math.min(100, area.total * 4 + area.critical * 9 + area.overdue * 6)
    };
  }).sort((a, b) => b.total - a.total || b.critical - a.critical || a.area.localeCompare(b.area));
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0] || ['None', 0];
  const top = areaList[0] || null;
  let recommendation = 'No complaint data is available yet. Recommendations will appear after citizens submit reports.';
  if (top) {
    const parts = [`${top.area} has the highest complaint activity with ${top.total} report${top.total === 1 ? '' : 's'}`];
    if (top.topCategory !== 'None') parts.push(`led by ${top.topCategory} (${top.topCategoryCount} reports)`);
    if (top.critical) parts.push(`${top.critical} critical complaint${top.critical === 1 ? '' : 's'} recorded`);
    if (top.overdue) parts.push(`${top.overdue} currently overdue`);
    recommendation = `${parts.join('. ')}. Prioritize an inspection and targeted ${top.topCategory === 'None' ? 'civic maintenance' : top.topCategory.toLowerCase()} action in this area.`;
  }
  return {
    areas: areaList,
    topArea: top,
    totalAreas: areaList.length,
    totalComplaints: rows.length,
    topCategory: { name: topCategory[0], count: topCategory[1] },
    recommendation,
    methodology: 'This is complaint-count hotspot analysis by ward/area. It is not a GPS heatmap or a prediction model.'
  };
}

function mapData() {
  const rows = db.prepare(`${BASE_SELECT} ORDER BY c.created_at DESC`).all();
  const markers = rows.map((row, index) => {
    const point = AREA_POINTS[row.area] || { x: 50, y: 50 };
    const hash = [...row.id].reduce((total, char) => total + char.charCodeAt(0), 0);
    const jitterX = ((hash + index * 7) % 9) - 4;
    const jitterY = ((hash + index * 11) % 9) - 4;
    return {
      id: row.id,
      category: row.category,
      area: row.area,
      landmark: row.landmark,
      priority: row.priority,
      status: row.status,
      overdue: isOverdueRow(row),
      createdAt: row.created_at,
      x: Math.max(5, Math.min(95, point.x + jitterX)),
      y: Math.max(5, Math.min(95, point.y + jitterY))
    };
  });
  return {
    markers,
    areas: Object.entries(AREA_POINTS).map(([name, point]) => ({ name, ...point })),
    approximate: true,
    note: 'Markers use approximate ward/area locations. Exact GPS coordinates were not captured in this prototype.'
  };
}

function analyticsData() {
  const rows = db.prepare('SELECT * FROM complaints').all();
  const total = rows.length;
  const resolvedRows = rows.filter((row) => row.resolved_at);
  const resolutionHours = resolvedRows.map((row) => (new Date(row.resolved_at).getTime() - new Date(row.created_at).getTime()) / 3600000);
  const assignmentHours = rows.filter((row) => row.assigned_at).map((row) => (new Date(row.assigned_at).getTime() - new Date(row.created_at).getTime()) / 3600000);
  const avg = (list) => list.length ? Math.round((list.reduce((sum, value) => sum + value, 0) / list.length) * 10) / 10 : 0;
  const categories = {};
  const statuses = {};
  const priorities = {};
  const areas = {};
  for (const row of rows) {
    categories[row.category] = (categories[row.category] || 0) + 1;
    statuses[row.status] = (statuses[row.status] || 0) + 1;
    priorities[row.priority] = (priorities[row.priority] || 0) + 1;
    areas[row.area] = (areas[row.area] || 0) + 1;
  }
  const trend = [];
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date(Date.now() - offset * 86400000);
    const key = date.toISOString().slice(0, 10);
    trend.push({
      date: key,
      received: rows.filter((row) => row.created_at.slice(0, 10) === key).length,
      resolved: rows.filter((row) => row.resolved_at && row.resolved_at.slice(0, 10) === key).length
    });
  }
  const slaMet = resolvedRows.filter((row) => new Date(row.resolved_at).getTime() <= new Date(row.deadline).getTime()).length;
  const active = rows.filter((row) => ACTIVE_STATUSES.includes(row.status));
  return {
    total,
    active: active.length,
    resolved: resolvedRows.length,
    resolvedRate: total ? Math.round((resolvedRows.length / total) * 100) : 0,
    avgResolutionHours: avg(resolutionHours),
    avgAssignmentHours: avg(assignmentHours),
    slaCompliance: resolvedRows.length ? Math.round((slaMet / resolvedRows.length) * 100) : 0,
    overdue: active.filter((row) => isOverdueRow(row)).length,
    criticalActive: active.filter((row) => row.priority === 'Critical').length,
    demoCount: rows.filter((row) => row.is_demo).length,
    categories: Object.entries(categories).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    statuses: Object.entries(statuses).map(([name, count]) => ({ name, count })),
    priorities: Object.entries(priorities).map(([name, count]) => ({ name, count })),
    areas: Object.entries(areas).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    trend
  };
}

function listUsers(search = '') {
  const term = `%${search}%`;
  const rows = db.prepare(`
    SELECT p.id, p.full_name, p.email, p.mobile, p.area, p.created_at, p.is_demo,
           COUNT(c.id) AS complaint_count,
           COALESCE(SUM(CASE WHEN c.status NOT IN ('Resolved','Closed') THEN 1 ELSE 0 END), 0) AS active_count,
           MAX(c.created_at) AS last_complaint_at
    FROM profiles p
    LEFT JOIN complaints c ON c.user_id = p.id
    WHERE p.role = 'citizen' AND (? = '' OR p.full_name LIKE ? OR p.email LIKE ? OR p.mobile LIKE ? OR p.area LIKE ?)
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all(search, term, term, term, term);
  return rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    mobile: row.mobile,
    area: row.area,
    registeredAt: row.created_at,
    complaintCount: row.complaint_count,
    activeCount: row.active_count,
    lastComplaintAt: row.last_complaint_at,
    isDemo: Boolean(row.is_demo)
  }));
}

function listDepartments() {
  return db.prepare(`
    SELECT d.*,
      COUNT(c.id) AS complaint_count,
      COALESCE(SUM(CASE WHEN c.status NOT IN ('Resolved','Closed') THEN 1 ELSE 0 END), 0) AS active_count,
      COALESCE(SUM(CASE WHEN c.status IN ('Resolved','Closed') THEN 1 ELSE 0 END), 0) AS resolved_count,
      COALESCE(SUM(CASE WHEN c.status NOT IN ('Resolved','Closed') AND c.deadline < ? THEN 1 ELSE 0 END), 0) AS overdue_count
    FROM departments d
    LEFT JOIN complaints c ON c.department_id = d.id
    GROUP BY d.id
    ORDER BY d.name ASC
  `).all(nowIso()).map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    lead: row.lead,
    createdAt: row.created_at,
    complaintCount: row.complaint_count,
    activeCount: row.active_count,
    resolvedCount: row.resolved_count,
    overdueCount: row.overdue_count
  }));
}

function notify(userId, complaintId, type, title, message, isRead = 0) {
  db.prepare('INSERT INTO notifications (user_id, complaint_id, type, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    userId, complaintId, type, title, message, isRead ? 1 : 0, nowIso()
  );
}

function notifyAdmins(complaintId, type, title, message) {
  const admins = db.prepare("SELECT id FROM profiles WHERE role = 'admin'").all();
  for (const admin of admins) notify(admin.id, complaintId, type, title, message);
}

function listNotifications(userId) {
  const items = db.prepare(`
    SELECT n.* FROM notifications n WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 60
  `).all(userId).map((row) => ({
    id: row.id,
    complaintId: row.complaint_id,
    type: row.type,
    title: row.title,
    message: row.message,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at
  }));
  const unread = db.prepare('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0').get(userId).count;
  return { items, unread };
}

function markNotificationRead(userId, id) {
  const result = db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, userId);
  return result.changes > 0;
}

function markAllNotificationsRead(userId) {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
}

function escalateOverdue() {
  const rows = db.prepare(`
    SELECT c.*, p.full_name AS citizen_name FROM complaints c
    JOIN profiles p ON p.id = c.user_id
    WHERE c.status NOT IN ('Resolved','Closed') AND c.deadline < ? AND c.escalated = 0
  `).all(nowIso());
  let count = 0;
  for (const row of rows) {
    const timestamp = nowIso();
    db.prepare('UPDATE complaints SET escalated = 1, last_escalated_at = ?, updated_at = ? WHERE id = ?').run(timestamp, timestamp, row.id);
    db.prepare('INSERT INTO escalation_logs (complaint_id, reason, previous_deadline, priority, created_at) VALUES (?, ?, ?, ?, ?)').run(
      row.id,
      `Resolution deadline exceeded for ${row.priority.toLowerCase()} priority complaint.`,
      row.deadline,
      row.priority,
      timestamp
    );
    notify(row.user_id, row.id, 'overdue', 'Resolution deadline exceeded', `Complaint ${row.id} has crossed its expected resolution time and was escalated to the authority queue.`);
    notifyAdmins(row.id, 'escalation', 'Overdue complaint escalated', `${row.id} · ${row.priority} priority · ${row.area} is overdue and needs attention.`);
    count += 1;
  }
  return count;
}

function publicSummary() {
  const stats = statsForUser(null);
  const citizens = db.prepare("SELECT COUNT(*) AS count FROM profiles WHERE role = 'citizen'").get().count;
  const areas = db.prepare('SELECT COUNT(DISTINCT area) AS count FROM complaints').get().count;
  return {
    totalComplaints: stats.total,
    resolved: stats.resolved,
    active: stats.active,
    citizens,
    areas: Math.max(areas, AREAS.length),
    demoComplaints: db.prepare('SELECT COUNT(*) AS count FROM complaints WHERE is_demo = 1').get().count
  };
}

module.exports = {
  AREAS,
  AREA_POINTS,
  ACTIVE_STATUSES,
  CLOSED_STATUSES,
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
};
