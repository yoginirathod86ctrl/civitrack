const crypto = require('node:crypto');
const { db } = require('./db');
const { parseCookies, nowIso, HttpError } = require('./util');

const COOKIE_NAME = 'cp_session';
const SESSION_HOURS = 12;
const REMEMBER_DAYS = 30;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  try {
    const [algorithm, salt, hash] = String(stored).split('$');
    if (algorithm !== 'scrypt' || !salt || !hash) return false;
    const candidate = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
    const expected = Buffer.from(hash, 'hex');
    return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function publicUser(profile) {
  if (!profile) return null;
  return {
    id: profile.id,
    role: profile.role,
    fullName: profile.full_name,
    email: profile.email,
    mobile: profile.mobile,
    area: profile.area,
    isDemo: Boolean(profile.is_demo),
    createdAt: profile.created_at
  };
}

function cookieHeader(req, value, maxAge) {
  const secure = Boolean(req.socket.encrypted) || process.env.CIVICPULSE_SECURE_COOKIE === '1';
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

function createSession(req, res, userId, remember = false) {
  const token = crypto.randomBytes(32).toString('base64url');
  const maxAge = remember ? REMEMBER_DAYS * 24 * 3600 : SESSION_HOURS * 3600;
  const created = new Date();
  const expires = new Date(created.getTime() + maxAge * 1000);
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(nowIso());
  db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    tokenHash(token),
    userId,
    created.toISOString(),
    expires.toISOString()
  );
  res.setHeader('Set-Cookie', cookieHeader(req, token, maxAge));
  return token;
}

function destroySession(req, res) {
  const cookies = parseCookies(req.headers.cookie || '');
  if (cookies[COOKIE_NAME]) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(cookies[COOKIE_NAME]));
  }
  res.setHeader('Set-Cookie', cookieHeader(req, '', 0));
}

function getUser(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const row = db.prepare(`
    SELECT p.*, s.expires_at
    FROM sessions s
    JOIN profiles p ON p.id = s.user_id
    WHERE s.token_hash = ?
  `).get(tokenHash(token));
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token));
    return null;
  }
  return row;
}

function requireAuth(req) {
  const user = getUser(req);
  if (!user) throw new HttpError(401, 'Please sign in to continue.', 'AUTH_REQUIRED');
  return user;
}

function requireAdmin(req) {
  const user = requireAuth(req);
  if (user.role !== 'admin') throw new HttpError(403, 'Administrator access is required.', 'FORBIDDEN');
  return user;
}

function requireCitizen(req) {
  const user = requireAuth(req);
  if (user.role !== 'citizen') throw new HttpError(403, 'This area is for citizen accounts.', 'FORBIDDEN');
  return user;
}

function createLimiter({ windowMs, max }) {
  const buckets = new Map();
  return (key) => {
    const timestamp = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || timestamp - bucket.start > windowMs) {
      buckets.set(key, { start: timestamp, count: 1 });
      return true;
    }
    bucket.count += 1;
    return bucket.count <= max;
  };
}

module.exports = {
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
};
