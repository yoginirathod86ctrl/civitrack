const crypto = require('node:crypto');

const nowIso = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();
const addHours = (iso, hours) => new Date(new Date(iso).getTime() + hours * 3600000).toISOString();

function clean(value, max = 500) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
}

function parseCookies(header = '') {
  const out = {};
  for (const part of String(header).split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

function readBody(req, limit = 6 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('Request body is too large.'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('Invalid JSON body.'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload, headers = {}) {
  if (res.headersSent) return;
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers
  });
  res.end(body);
}

function sendError(res, status, message, code = 'REQUEST_FAILED', details = null) {
  sendJson(res, status, { ok: false, error: message, code, details });
}

class HttpError extends Error {
  constructor(status, message, code = 'REQUEST_FAILED', details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

function validateMobile(mobile) {
  const digits = mobile.replace(/[^\d]/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

function safeFilename(name) {
  return String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, columns) {
  const header = columns.map((column) => csvEscape(column.label)).join(',');
  const body = rows.map((row) => columns.map((column) => csvEscape(column.value(row))).join(',')).join('\r\n');
  return `${header}\r\n${body}\r\n`;
}

function isOverdue(complaint, at = new Date()) {
  return !['Resolved', 'Closed'].includes(complaint.status) && new Date(complaint.deadline).getTime() < at.getTime();
}

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
}

module.exports = {
  nowIso,
  uuid,
  addHours,
  clean,
  parseCookies,
  readBody,
  sendJson,
  sendError,
  HttpError,
  validateEmail,
  validateMobile,
  validatePassword,
  safeFilename,
  toCsv,
  isOverdue,
  parseJson,
  clientIp
};
