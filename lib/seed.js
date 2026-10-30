const { db, getMeta, setMeta } = require('./db');
const { hashPassword } = require('./auth');
const { analyzeComplaint } = require('./ai');
const { uuid, addHours } = require('./util');

const DEMO_PASSWORD = 'Demo@1234';

const DEPARTMENTS = [
  { name: 'Public Works', code: 'PWD', description: 'Roads, pavements, bridges and public structures.', lead: 'Er. S. Kulkarni' },
  { name: 'Sanitation & Waste', code: 'SWM', description: 'Waste collection, bins, street cleaning and sanitation.', lead: 'Dr. N. Fernandes' },
  { name: 'Drainage & Stormwater', code: 'DSM', description: 'Drains, manholes, sewage lines and stormwater systems.', lead: 'Er. A. Deshpande' },
  { name: 'Electrical & Lighting', code: 'ELC', description: 'Streetlights, electrical hazards and public lighting.', lead: 'Er. M. Qureshi' },
  { name: 'General Administration', code: 'GEN', description: 'Routing, citizen communication and miscellaneous civic issues.', lead: 'Ms. R. Bhatt' },
  { name: 'Parks & Environment', code: 'PAR', description: 'Public parks, trees and environmental maintenance.', lead: 'Mr. K. Joshi' },
  { name: 'Traffic & Transport', code: 'TRF', description: 'Traffic signals, road safety and transport infrastructure.', lead: 'Mr. D. Chavan' }
];

const ADMINS = [
  { name: 'Priya Menon', email: 'admin@civicpulse.ai', mobile: '9876540101', password: 'Admin@1234', area: 'Civic Center' },
  { name: 'Rahul Verma', email: 'authority@civicpulse.ai', mobile: '9876540102', password: 'Authority@1234', area: 'Civic Center' }
];

const DEMO_USERS = [
  { name: 'Aarav Sharma', email: 'citizen@civicpulse.ai', mobile: '9876501001', area: 'College Road' },
  { name: 'Ananya Iyer', email: 'ananya@civicpulse.ai', mobile: '9876501002', area: 'Gandhi Nagar' },
  { name: 'Rohan Patel', email: 'rohan@civicpulse.ai', mobile: '9876501003', area: 'MG Road' },
  { name: 'Meera Nair', email: 'meera@civicpulse.ai', mobile: '9876501004', area: 'Station Road' },
  { name: 'Kabir Singh', email: 'kabir@civicpulse.ai', mobile: '9876501005', area: 'Lake View Colony' },
  { name: 'Sana Khan', email: 'sana@civicpulse.ai', mobile: '9876501006', area: 'Industrial Area' },
  { name: 'Vikram Rao', email: 'vikram@civicpulse.ai', mobile: '9876501007', area: 'Civil Lines' },
  { name: 'Ishita Bose', email: 'ishita@civicpulse.ai', mobile: '9876501008', area: 'Green Park' }
];

const AREA_PLANS = [
  {
    area: 'College Road', landmark: 'City College Gate', categories: ['Road Damage', 'Road Damage', 'Road Damage', 'Road Damage', 'Waterlogging', 'Streetlight Issues', 'Garbage Overflow', 'Drainage Problems', 'Electrical Hazards']
  },
  {
    area: 'MG Road', landmark: 'Metro Station', categories: ['Road Damage', 'Garbage Overflow', 'Waterlogging', 'Streetlight Issues', 'Electrical Hazards', 'Drainage Problems', 'Other']
  },
  {
    area: 'Gandhi Nagar', landmark: 'Gandhi Park', categories: ['Garbage Overflow', 'Road Damage', 'Waterlogging', 'Streetlight Issues', 'Drainage Problems', 'Garbage Overflow']
  },
  {
    area: 'Station Road', landmark: 'Railway Station', categories: ['Garbage Overflow', 'Waterlogging', 'Road Damage', 'Electrical Hazards', 'Streetlight Issues', 'Drainage Problems']
  },
  {
    area: 'Lake View Colony', landmark: 'Lake Garden', categories: ['Waterlogging', 'Drainage Problems', 'Garbage Overflow', 'Road Damage', 'Streetlight Issues']
  },
  {
    area: 'Industrial Area', landmark: 'Industrial Estate Gate', categories: ['Electrical Hazards', 'Road Damage', 'Waterlogging', 'Garbage Overflow', 'Drainage Problems']
  },
  {
    area: 'Civil Lines', landmark: 'District Office', categories: ['Road Damage', 'Streetlight Issues', 'Garbage Overflow', 'Drainage Problems', 'Other']
  },
  {
    area: 'Green Park', landmark: 'Green Park Market', categories: ['Garbage Overflow', 'Waterlogging', 'Road Damage', 'Streetlight Issues', 'Electrical Hazards']
  }
];

const STATUS_PLAN = [
  'Resolved', 'Submitted', 'In Progress', 'Assigned', 'Under Review', 'Resolved', 'Closed', 'Submitted',
  'Assigned', 'Resolved', 'In Progress', 'Under Review', 'Resolved', 'Submitted', 'Closed', 'Assigned',
  'Resolved', 'In Progress', 'Under Review', 'Resolved', 'Submitted', 'Assigned', 'Resolved', 'Closed',
  'In Progress', 'Resolved', 'Under Review', 'Submitted', 'Assigned', 'Resolved', 'Closed', 'In Progress',
  'Resolved', 'Under Review', 'Assigned', 'Submitted', 'Resolved', 'Closed', 'In Progress', 'Resolved',
  'Assigned', 'Resolved', 'Resolved', 'Resolved', 'Resolved', 'Closed', 'Resolved', 'Resolved'
];

const SEVERITY_BY_STATUS = {
  'Submitted': ['High', 'Medium', 'Low', 'Medium', 'Critical', 'Low'],
  'Under Review': ['Critical', 'High', 'Medium', 'Low', 'High'],
  'Assigned': ['Critical', 'High', 'Medium', 'High', 'Medium', 'Low', 'Critical'],
  'In Progress': ['Critical', 'High', 'Medium', 'Low', 'High', 'Medium'],
  'Resolved': ['High', 'Medium', 'Low', 'Critical', 'High', 'Medium', 'Low', 'High', 'Medium', 'Low', 'Critical', 'Medium', 'Low', 'High', 'Medium', 'Low', 'High', 'Medium'],
  'Closed': ['Medium', 'High', 'Low', 'Medium', 'Low', 'High']
};

const OVERDUE_INDEXES = new Set([27, 35, 4, 33, 3, 15, 40, 2, 10, 24]);
const DEMO_OWNED_INDEXES = new Set([0, 1, 2, 3, 4, 6, 11, 22, 30, 36, 42, 47]);

const RESOLUTION_FACTORS = [0.55, 0.8, 1.35, 1.6, 0.45, 0.9, 1.15, 0.7, 1.4, 0.5, 0.85, 1.2, 0.65, 1.5, 0.75, 0.95, 1.1, 0.6];

function isoMinutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60000).toISOString();
}

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function descriptionFor(category, severity, area, landmark) {
  const templates = {
    'Road Damage': {
      Critical: `A deep sinkhole has opened on the road near ${landmark} in ${area}. The road surface has collapsed and two-wheelers are swerving dangerously. Children use this route to school and it is an immediate danger.`,
      High: `Large potholes and broken asphalt near ${landmark}, ${area}, are causing accidents at night. The damaged stretch is unsafe for two-wheelers and pedestrians.`,
      Medium: `Several potholes and a cracked road surface near ${landmark} in ${area} are making the commute bumpy. Routine road repair is needed.`,
      Low: `A small crack and minor road damage were noticed near ${landmark}, ${area}. It can be handled in the next maintenance round.`
    },
    'Garbage Overflow': {
      Critical: `Garbage is overflowing from the bins near ${landmark} in ${area}. Waste is blocking the footpath and creating an immediate danger for children and elderly residents. Immediate collection is required.`,
      High: `Garbage bins are overflowing near ${landmark}, ${area}. Trash is spilling onto the street, the smell is severe, children play nearby and stray animals are scattering waste.`,
      Medium: `Garbage has not been collected for two days near ${landmark} in ${area}. The bins are full and need a routine pickup.`,
      Low: `A small pile of litter is lying near ${landmark}, ${area}. It is not blocking the road but should be cleared.`
    },
    'Waterlogging': {
      Critical: `Severe flooding near ${landmark} in ${area} has submerged the road outside a school. Children and pedestrians are at immediate danger because an open manhole is hidden under the water. Immediate pumping and barricading are needed.`,
      High: `Heavy waterlogging near ${landmark}, ${area}, after the rain. Standing water is deep enough to stall vehicles and the blocked drain is overflowing.`,
      Medium: `Standing water is collecting near ${landmark} in ${area} after rain. The drain appears blocked and the area becomes slippery.`,
      Low: `A small patch of stagnant water remains near ${landmark}, ${area}. It clears slowly but is not blocking the road.`
    },
    'Streetlight Issues': {
      Critical: `The streetlight pole near ${landmark} in ${area} is sparking and leaning after an accident. Exposed wires are hanging at head height and it is an immediate danger at night.`,
      High: `Streetlights are not working near ${landmark}, ${area}. The entire stretch is dark at night and unsafe for pedestrians and two-wheelers.`,
      Medium: `Two streetlights are flickering near ${landmark} in ${area}. The stretch is poorly lit after sunset and needs an electrician.`,
      Low: `One streetlight bulb is dim near ${landmark}, ${area}. It is still usable but should be replaced during routine maintenance.`
    },
    'Electrical Hazards': {
      Critical: `A live wire is dangling from a transformer near ${landmark} in ${area}. There was sparking and an electric shock risk for children walking below. The area needs immediate isolation and emergency repair.`,
      High: `Exposed electrical wires are hanging near ${landmark}, ${area}. The connection sparks during wind and is unsafe for pedestrians.`,
      Medium: `An electrical junction box near ${landmark} in ${area} is damaged and occasionally sparks. It needs inspection before it becomes a hazard.`,
      Low: `A street-side electrical box near ${landmark}, ${area}, has a loose cover. No sparking was seen but it should be secured.`
    },
    'Drainage Problems': {
      Critical: `A manhole cover is missing near ${landmark} in ${area} and the open drain is full of sewage. A child could fall in and it is an immediate danger. Barricade and repair are urgent.`,
      High: `Sewage is overflowing from a blocked drain near ${landmark}, ${area}. The waste is spreading across the road and creating a severe health hazard.`,
      Medium: `The drain near ${landmark} in ${area} is blocked and water is not flowing. It will overflow if it rains again.`,
      Low: `The roadside gutter near ${landmark}, ${area}, is partially blocked with leaves. It should be cleaned as routine maintenance.`
    },
    'Other': {
      Critical: `There is an immediate danger near ${landmark} in ${area}: a damaged public structure is unstable and people are still walking under it. Emergency inspection is needed.`,
      High: `A public facility near ${landmark}, ${area}, is damaged and unsafe. It needs attention before someone is injured.`,
      Medium: `A civic maintenance issue was noticed near ${landmark} in ${area}. Public property needs repair.`,
      Low: `A minor civic issue was noticed near ${landmark}, ${area}. It is not urgent but should be reviewed.`
    }
  };
  return templates[category][severity];
}

function flatAreaCategories() {
  const rows = [];
  for (const plan of AREA_PLANS) {
    for (const category of plan.categories) {
      rows.push({ area: plan.area, landmark: plan.landmark, category });
    }
  }
  return rows;
}

function generateSeverityByIndex() {
  const severityQueues = {};
  for (const [status, values] of Object.entries(SEVERITY_BY_STATUS)) {
    severityQueues[status] = values.slice();
  }
  return STATUS_PLAN.map((status) => severityQueues[status].shift());
}

function departmentIdByName(name) {
  const row = db.prepare('SELECT id FROM departments WHERE name = ?').get(name);
  return row ? row.id : null;
}

function insertNotification(userId, complaintId, type, title, message, createdAt, isRead = 0) {
  if (!userId) return;
  db.prepare('INSERT INTO notifications (user_id, complaint_id, type, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    userId, complaintId, type, title, message, isRead ? 1 : 0, createdAt
  );
}

function advanceTime(createdAt, hoursFraction) {
  const time = new Date(createdAt).getTime() + hoursFraction * 3600000;
  return new Date(Math.min(time, Date.now() - 60000)).toISOString();
}

function seedDepartments() {
  const createdAt = isoDaysAgo(120);
  const insert = db.prepare('INSERT OR IGNORE INTO departments (id, name, code, description, lead, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  for (const department of DEPARTMENTS) {
    insert.run(uuid(), department.name, department.code, department.description, department.lead, createdAt);
  }
}

function seedProfiles() {
  const insert = db.prepare('INSERT OR IGNORE INTO profiles (id, role, full_name, email, mobile, password_hash, area, is_demo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const adminIds = [];
  for (const admin of ADMINS) {
    const existing = db.prepare('SELECT id FROM profiles WHERE email = ?').get(admin.email);
    if (existing) {
      adminIds.push(existing.id);
      continue;
    }
    const id = uuid();
    insert.run(id, 'admin', admin.name, admin.email, admin.mobile, hashPassword(admin.password), admin.area, 1, isoDaysAgo(150));
    adminIds.push(id);
  }
  const userIds = [];
  for (const user of DEMO_USERS) {
    const existing = db.prepare('SELECT id FROM profiles WHERE email = ?').get(user.email);
    if (existing) {
      userIds.push(existing.id);
      continue;
    }
    const id = uuid();
    insert.run(id, 'citizen', user.name, user.email, user.mobile, hashPassword(DEMO_PASSWORD), user.area, 1, isoDaysAgo(45 + userIds.length * 3));
    userIds.push(id);
  }
  return { adminIds, userIds };
}

function seedDemoData() {
  if (getMeta('demo_seed_version') === '2') return { seeded: false, reason: 'Demo data already present' };
  const complaintCount = db.prepare('SELECT COUNT(*) AS count FROM complaints').get().count;
  if (complaintCount > 0) {
    setMeta('demo_seed_version', '2');
    return { seeded: false, reason: 'Complaints already present' };
  }

  seedDepartments();
  const { adminIds, userIds } = seedProfiles();
  const severityByIndex = generateSeverityByIndex();
  const areaRows = flatAreaCategories();
  const notes = [
    'Site inspection scheduled with the ward supervisor.',
    'Field team has been requested to share a completion photo.',
    'Citizen was contacted for an additional location detail.',
    'Temporary safety marking has been placed at the site.',
    'Material requirement has been forwarded to the store.',
    'Night inspection planned to verify the repair.',
    'Preventive maintenance added to the weekly work order.'
  ];

  db.exec('BEGIN');
  try {
    for (let index = 0; index < 48; index += 1) {
      const areaRow = areaRows[index];
      const status = STATUS_PLAN[index];
      const severity = severityByIndex[index];
      const description = descriptionFor(areaRow.category, severity, areaRow.area, areaRow.landmark);
      const analysis = analyzeComplaint({ description, category: areaRow.category });
      const complaintId = `CP-2026-${String(index + 1).padStart(4, '0')}`;
      const isTerminal = ['Resolved', 'Closed'].includes(status);
      const overdue = OVERDUE_INDEXES.has(index);
      let createdAt;
      if (isTerminal) {
        createdAt = isoDaysAgo(4 + (index % 12));
      } else if (overdue) {
        createdAt = isoMinutesAgo(analysis.resolutionHours * 60 + 90 + ((index * 37) % 600));
      } else {
        createdAt = isoMinutesAgo(Math.max(5, Math.round(analysis.resolutionHours * 60 * (0.15 + (index % 5) * 0.1))));
      }

      const deadline = addHours(createdAt, analysis.resolutionHours);
      const deptId = departmentIdByName(analysis.department);
      const ownerId = DEMO_OWNED_INDEXES.has(index) ? userIds[0] : userIds[1 + (index % 7)];
      const assigned = ['Assigned', 'In Progress', 'Resolved', 'Closed'].includes(status);
      const started = ['In Progress', 'Resolved', 'Closed'].includes(status);
      const assignedAt = assigned ? advanceTime(createdAt, Math.max(0.08, analysis.resolutionHours * 0.18)) : null;
      const startedAt = started ? advanceTime(createdAt, Math.max(0.15, analysis.resolutionHours * 0.33)) : null;

      let resolvedAt = null;
      let closedAt = null;
      let factor = 0;
      if (isTerminal) {
        factor = RESOLUTION_FACTORS[index % RESOLUTION_FACTORS.length];
        resolvedAt = advanceTime(createdAt, analysis.resolutionHours * factor);
        if (status === 'Closed') closedAt = advanceTime(resolvedAt, 3 + (index % 5));
      }

      const escalated = !isTerminal && overdue;
      const lastEscalatedAt = escalated
        ? new Date(Math.min(Date.now() - 60000, new Date(deadline).getTime() + 900000)).toISOString()
        : null;

      db.prepare(`
        INSERT INTO complaints (
          id, user_id, category, description, area, landmark, photo_path, status, priority,
          priority_score, department_id, resolution_hours, deadline, resolved_at, closed_at,
          assigned_at, started_at, escalated, last_escalated_at, ai_analysis, is_demo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        complaintId, ownerId, areaRow.category, description, areaRow.area, areaRow.landmark, null, status,
        analysis.priority, analysis.priorityScore, deptId, analysis.resolutionHours, deadline, resolvedAt, closedAt,
        assignedAt, startedAt, escalated ? 1 : 0, lastEscalatedAt, JSON.stringify(analysis), 1, createdAt,
        closedAt || resolvedAt || startedAt || assignedAt || createdAt
      );

      const submitActor = db.prepare('SELECT full_name FROM profiles WHERE id = ?').get(ownerId);
      db.prepare('INSERT INTO complaint_updates (complaint_id, actor_id, actor_name, actor_role, type, message, new_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        complaintId, ownerId, submitActor.full_name, 'citizen', 'submitted', 'Complaint submitted by citizen.', 'Submitted', createdAt
      );

      if (status !== 'Submitted') {
        const reviewTime = advanceTime(createdAt, Math.max(0.05, analysis.resolutionHours * 0.08));
        db.prepare('INSERT INTO complaint_updates (complaint_id, actor_id, actor_name, actor_role, type, message, old_status, new_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
          complaintId, adminIds[0], 'Priya Menon', 'admin', 'status', 'Complaint moved to under review.', 'Submitted', 'Under Review', reviewTime
        );
      }
      if (assigned) {
        db.prepare('INSERT INTO complaint_updates (complaint_id, actor_id, actor_name, actor_role, type, message, old_status, new_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
          complaintId, adminIds[0], 'Priya Menon', 'admin', 'assignment', `Assigned to ${analysis.department}.`, status === 'Assigned' ? 'Under Review' : null, 'Assigned', assignedAt
        );
      }
      if (started) {
        db.prepare('INSERT INTO complaint_updates (complaint_id, actor_id, actor_name, actor_role, type, message, old_status, new_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
          complaintId, adminIds[1], 'Rahul Verma', 'admin', 'status', 'Field work started by the assigned department.', 'Assigned', 'In Progress', startedAt
        );
      }
      if (resolvedAt) {
        db.prepare('INSERT INTO complaint_updates (complaint_id, actor_id, actor_name, actor_role, type, message, old_status, new_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
          complaintId, adminIds[0], 'Priya Menon', 'admin', 'status', 'Work completed and marked as resolved.', 'In Progress', 'Resolved', resolvedAt
        );
      }
      if (closedAt) {
        db.prepare('INSERT INTO complaint_updates (complaint_id, actor_id, actor_name, actor_role, type, message, old_status, new_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
          complaintId, adminIds[1], 'Rahul Verma', 'admin', 'status', 'Complaint verified and closed.', 'Resolved', 'Closed', closedAt
        );
      }
      if (index % 5 === 0) {
        const noteTime = advanceTime(createdAt, Math.max(0.2, analysis.resolutionHours * 0.45));
        db.prepare('INSERT INTO complaint_updates (complaint_id, actor_id, actor_name, actor_role, type, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          complaintId, adminIds[index % 2], index % 2 ? 'Rahul Verma' : 'Priya Menon', 'admin', 'note', notes[index % notes.length], noteTime
        );
      }

      const recent = Date.now() - new Date(createdAt).getTime() < 48 * 3600000;
      insertNotification(ownerId, complaintId, 'submitted', 'Complaint submitted', `Your complaint ${complaintId} was received for ${areaRow.area}.`, createdAt, !recent ? 1 : 0);

      if (resolvedAt) {
        insertNotification(ownerId, complaintId, 'resolved', 'Complaint resolved', `Complaint ${complaintId} has been marked resolved by the authority.`, resolvedAt, 1);
      }
      if (escalated) {
        db.prepare('INSERT INTO escalation_logs (complaint_id, reason, previous_deadline, priority, created_at) VALUES (?, ?, ?, ?, ?)').run(
          complaintId, `Resolution deadline exceeded for ${analysis.priority.toLowerCase()} priority complaint.`, deadline, analysis.priority, lastEscalatedAt
        );
        insertNotification(ownerId, complaintId, 'overdue', 'Resolution deadline exceeded', `Complaint ${complaintId} has crossed its expected resolution time and was escalated to the authority queue.`, lastEscalatedAt, 0);
        insertNotification(adminIds[index % 2], complaintId, 'escalation', 'Overdue complaint escalated', `${complaintId} (${analysis.priority}) in ${areaRow.area} is overdue and needs attention.`, lastEscalatedAt, 0);
      } else if (recent && !isTerminal) {
        insertNotification(adminIds[index % 2], complaintId, 'new_complaint', 'New complaint received', `${complaintId} · ${analysis.priority} priority · ${areaRow.area}.`, createdAt, index % 3 === 0 ? 0 : 1);
      }
    }
    setMeta('demo_seed_version', '2');
    setMeta('demo_seeded_at', new Date().toISOString());
    db.exec('COMMIT');
    return { seeded: true };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

module.exports = { seedDemoData, DEMO_PASSWORD };
