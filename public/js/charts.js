import { esc, fmtNumber } from './ui.js';

const COLORS = {
  teal: '#14b8a6',
  cyan: '#22d3ee',
  navy: '#123457',
  orange: '#f59e0b',
  red: '#e5484d',
  purple: '#7c5cfc',
  blue: '#3b82f6',
  slate: '#8fa3b6',
  green: '#12a47a'
};

const STATUS_COLORS = {
  'Submitted': '#3b82f6',
  'Under Review': '#7c5cfc',
  'Assigned': '#22d3ee',
  'In Progress': '#f59e0b',
  'Resolved': '#12a47a',
  'Closed': '#8fa3b6'
};

const PRIORITY_COLORS = {
  Critical: '#e5484d',
  High: '#f59e0b',
  Medium: '#eab308',
  Low: '#14b8a6'
};

export function statusColor(name) {
  return STATUS_COLORS[name] || COLORS.slate;
}

export function priorityColor(name) {
  return PRIORITY_COLORS[name] || COLORS.slate;
}

export function donutChart(items, { centerValue = '', centerLabel = 'total', size = 126, thickness = 14 } = {}) {
  const total = items.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const segments = items.map((item) => {
    const fraction = total ? Number(item.count || 0) / total : 0;
    const length = fraction * circumference;
    const color = item.color || statusColor(item.name);
    const segment = `<circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${color}" stroke-width="${thickness}" stroke-dasharray="${Math.max(0, length - 2)} ${circumference}" stroke-dashoffset="${-offset}" stroke-linecap="round"><title>${esc(item.name)}: ${fmtNumber(item.count)}</title></circle>`;
    offset += length;
    return segment;
  }).join('');
  return `<div class="donut-wrap">
    <div class="donut-chart">
      <svg viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(centerLabel)} chart">
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="#eef3f8" stroke-width="${thickness}"/>
        ${segments}
      </svg>
      <div class="donut-center"><strong>${esc(centerValue || fmtNumber(total))}</strong><span>${esc(centerLabel)}</span></div>
    </div>
    <div class="donut-legend">
      ${items.map((item) => `<div class="legend-row"><span class="legend-dot" style="background:${item.color || statusColor(item.name)}"></span><span>${esc(item.name)}</span><strong>${fmtNumber(item.count)}</strong></div>`).join('')}
    </div>
  </div>`;
}

export function lineChart(data, { height = 210, width = 620 } = {}) {
  const pad = { top: 18, right: 14, bottom: 25, left: 30 };
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const max = Math.max(4, ...data.flatMap((item) => [Number(item.received) || 0, Number(item.resolved) || 0]));
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : innerWidth;
  const point = (value, index) => {
    const x = pad.left + index * stepX;
    const y = pad.top + innerHeight - (Number(value) || 0) / max * innerHeight;
    return [x, y];
  };
  const paths = (key) => data.map((item, index) => point(item[key], index));
  const received = paths('received');
  const resolved = paths('resolved');
  const line = (points) => points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line(received)} L${(pad.left + innerWidth).toFixed(1)},${(pad.top + innerHeight).toFixed(1)} L${pad.left},${(pad.top + innerHeight).toFixed(1)} Z`;
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
    const y = pad.top + innerHeight * fraction;
    const label = Math.round(max * (1 - fraction));
    return `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" stroke="#eef3f8" stroke-width="1"/><text x="${pad.left - 7}" y="${y + 3}" text-anchor="end" font-size="8" fill="#8fa3b6">${label}</text>`;
  }).join('');
  const labels = data.map((item, index) => {
    if (index % Math.ceil(data.length / 7) !== 0 && index !== data.length - 1) return '';
    const [x] = point(0, index);
    const date = new Date(item.date);
    return `<text x="${x}" y="${height - 7}" text-anchor="middle" font-size="8" fill="#8fa3b6">${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</text>`;
  }).join('');
  const dots = data.map((item, index) => {
    const [x, y] = point(item.received, index);
    const [rx, ry] = point(item.resolved, index);
    return `<g><circle cx="${x}" cy="${y}" r="3" fill="#fff" stroke="${COLORS.cyan}" stroke-width="2"><title>${esc(item.date)} · ${item.received} received</title></circle><circle cx="${rx}" cy="${ry}" r="2.5" fill="${COLORS.teal}" opacity=".9"><title>${esc(item.date)} · ${item.resolved} resolved</title></circle></g>`;
  }).join('');
  return `<div class="chart-legend" style="margin-bottom:8px"><span><i style="background:${COLORS.cyan}"></i>Received</span><span><i style="background:${COLORS.teal}"></i>Resolved</span></div>
    <div style="width:100%;height:${height}px"><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Complaint trend for the last 14 days">
      <defs><linearGradient id="cpAreaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${COLORS.cyan}" stop-opacity=".2"/><stop offset="100%" stop-color="${COLORS.cyan}" stop-opacity="0"/></linearGradient></defs>
      ${gridLines}
      <path d="${area}" fill="url(#cpAreaGradient)"/>
      <path d="${line(received)}" fill="none" stroke="${COLORS.cyan}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${line(resolved)}" fill="none" stroke="${COLORS.teal}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}${labels}
    </svg></div>`;
}

export function barChart(items, { tone = 'teal', max: customMax = null } = {}) {
  const max = customMax || Math.max(1, ...items.map((item) => Number(item.count) || 0));
  const toneClass = tone === 'red' ? 'red' : tone === 'orange' ? 'orange' : '';
  return `<div class="bar-chart">${items.map((item) => {
    const height = Math.max(3, (Number(item.count) || 0) / max * 100);
    return `<div class="bar-column" title="${esc(item.name)}: ${fmtNumber(item.count)}">
      <span class="bar-value">${fmtNumber(item.count)}</span>
      <div class="bar-track"><div class="bar-fill ${toneClass}" style="height:${height}%"></div></div>
      <span class="bar-label">${esc(item.name.replace(' Issues', '').replace(' Overflow', '').replace(' Problems', ''))}</span>
    </div>`;
  }).join('')}</div>`;
}

export function rankList(items, { max: customMax = null, limit = 6 } = {}) {
  const list = items.slice(0, limit);
  const max = customMax || Math.max(1, ...list.map((item) => Number(item.count) || 0));
  return `<div class="rank-list">${list.map((item, index) => `
    <div class="rank-row">
      <span class="rank-num ${index === 0 ? 'top' : ''}">${index + 1}</span>
      <div class="rank-main">
        <div class="rank-top"><strong>${esc(item.name)}</strong><span>${fmtNumber(item.count)}</span></div>
        <div class="rank-bar"><span style="width:${Math.max(4, (Number(item.count) || 0) / max * 100)}%"></span></div>
      </div>
    </div>`).join('')}</div>`;
}

export function sparkline(values, { color = COLORS.teal, fill = true } = {}) {
  const data = values.length ? values : [0, 0];
  const width = 180;
  const height = 48;
  const max = Math.max(1, ...data);
  const step = width / Math.max(1, data.length - 1);
  const points = data.map((value, index) => [index * step, height - (Number(value) || 0) / max * (height - 6) - 3]);
  const path = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${path} L${width},${height} L0,${height} Z`;
  return `<svg class="sparkline" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
    ${fill ? `<path d="${areaPath}" fill="${color}" opacity=".1"/>` : ''}
    <path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

export function heatmap(trend) {
  const max = Math.max(1, ...trend.map((item) => Number(item.received) || 0));
  return `<div class="heatmap" role="img" aria-label="Complaint volume heatmap">
    ${trend.map((item) => {
      const level = Math.ceil((Number(item.received) || 0) / max * 5);
      return `<div class="heat-cell ${level ? `l${level}` : ''}" title="${esc(item.date)} · ${item.received} complaints"></div>`;
    }).join('')}
  </div>
  <div class="heatmap-labels"><span>${trend.length ? new Date(trend[0].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</span><span>Today</span></div>
  <div class="heatmap-legend"><span>Low</span><i style="background:#d9f7f2"></i><i style="background:#a7ece2"></i><i style="background:#5dd7c8"></i><i style="background:#14b8a6"></i><i style="background:#0f8f83"></i><span>High</span></div>`;
}

export function progressRing(percent, { size = 42, stroke = 4, color = COLORS.teal } = {}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = Math.max(0, Math.min(100, Number(percent) || 0));
  return `<div class="timer-ring" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="#edf2f7" stroke-width="${stroke}"/><circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-dasharray="${circumference * value / 100} ${circumference}" stroke-linecap="round" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>
    <span class="timer-ring-label">${Math.round(value)}%</span>
  </div>`;
}

export { COLORS, STATUS_COLORS, PRIORITY_COLORS };
