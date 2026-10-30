const CATEGORY_RULES = {
  'Road Damage': ['pothole', 'road damage', 'broken road', 'cracked road', 'crack', 'asphalt', 'pavement', 'speed breaker', 'sinkhole', 'road caved', 'road collapse'],
  'Garbage Overflow': ['garbage', 'trash', 'waste', 'rubbish', 'litter', 'dustbin', 'bin overflowing', 'dump', 'stink', 'smell', 'sanitation'],
  'Waterlogging': ['waterlogging', 'water logging', 'flood', 'flooding', 'standing water', 'stagnant water', 'rain water', 'ponding', 'submerged', 'knee deep'],
  'Streetlight Issues': ['streetlight', 'street light', 'street lamp', 'lamp post', 'light not working', 'no light', 'dark street', 'bulb', 'flickering light'],
  'Electrical Hazards': ['live wire', 'exposed wire', 'electric wire', 'electrocution', 'electric shock', 'short circuit', 'sparking', 'spark', 'transformer', 'power line', 'dangling wire', 'open wire'],
  'Drainage Problems': ['drainage', 'drain', 'sewer', 'sewage', 'manhole', 'blocked drain', 'drain overflow', 'gutter', 'septic'],
  'Other': []
};

const DEPARTMENT_BY_CATEGORY = {
  'Road Damage': 'Public Works',
  'Garbage Overflow': 'Sanitation & Waste',
  'Waterlogging': 'Drainage & Stormwater',
  'Streetlight Issues': 'Electrical & Lighting',
  'Electrical Hazards': 'Electrical & Lighting',
  'Drainage Problems': 'Drainage & Stormwater',
  'Other': 'General Administration'
};

const BASE_SCORE = {
  'Road Damage': 30,
  'Garbage Overflow': 36,
  'Waterlogging': 36,
  'Streetlight Issues': 30,
  'Electrical Hazards': 40,
  'Drainage Problems': 34,
  'Other': 18
};

const CRITICAL_TERMS = ['live wire', 'electrocution', 'electric shock', 'sparking', 'spark', 'fire', 'gas leak', 'collapse', 'collapsed', 'sinkhole', 'accident', 'injured', 'injury', 'child', 'school', 'hospital', 'emergency', 'immediate danger', 'open manhole', 'exposed wire', 'dangling wire'];
const HIGH_TERMS = ['flood', 'flooding', 'waterlogging', 'overflowing', 'blocked', 'severe', 'major', 'large', 'broken', 'hazard', 'unsafe', 'sewage', 'no light', 'dark', 'night'];
const MEDIUM_TERMS = ['pothole', 'garbage', 'smell', 'stink', 'crack', 'leak', 'dirty', 'damaged', 'not working', 'delay', 'not collected', 'flickering', 'dim', 'poorly lit', 'litter'];
const SAFETY_TERMS = ['children', 'child', 'school', 'hospital', 'elderly', 'accident', 'injury', 'night', 'pedestrian', 'bike', 'vehicle'];

const ACTIONS_BY_CATEGORY = {
  'Road Damage': ['Barricade the damaged section if it is unsafe.', 'Inspect the road surface and schedule repair.', 'Record the repaired stretch with a completion photo.'],
  'Garbage Overflow': ['Schedule an immediate waste collection pickup.', 'Clear the overflow and sanitize the surrounding area.', 'Increase collection frequency if the location repeats.'],
  'Waterlogging': ['Inspect the drainage outlet and pump standing water.', 'Clear blockages before the next rain event.', 'Place a temporary safety marker around deep water.'],
  'Streetlight Issues': ['Dispatch an electrician to inspect the pole and circuit.', 'Isolate the faulty line if there is a safety risk.', 'Verify night-time illumination after repair.'],
  'Electrical Hazards': ['Treat as an immediate safety hazard and isolate the supply.', 'Send a certified electrical crew to the location.', 'Cordon off the area until the hazard is removed.'],
  'Drainage Problems': ['Inspect and clear the blocked drain or manhole.', 'Check for sewage overflow and sanitize if needed.', 'Schedule preventive cleaning for the drain line.'],
  'Other': ['Review the report and route it to the correct department.', 'Contact the citizen if more detail is needed.', 'Record an authority update with the next action.']
};

function normalize(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function countTerms(text, terms) {
  return terms.filter((term) => text.includes(term)).length;
}

function detectCategory(description) {
  const text = normalize(description);
  let best = { category: 'Other', matches: 0 };
  for (const [category, terms] of Object.entries(CATEGORY_RULES)) {
    const matches = countTerms(text, terms);
    if (matches > best.matches) best = { category, matches };
  }
  return best;
}

function priorityFromScore(score) {
  if (score >= 80) return 'Critical';
  if (score >= 56) return 'High';
  if (score >= 38) return 'Medium';
  return 'Low';
}

function resolutionHoursFor(priority) {
  return { Critical: 2, High: 6, Medium: 24, Low: 48 }[priority] || 24;
}

function analyzeComplaint({ description, category, hasPhoto = false }) {
  const text = normalize(description);
  const detection = detectCategory(description);
  const selectedCategory = CATEGORY_RULES[category] ? category : detection.category;
  const criticalMatches = CRITICAL_TERMS.filter((term) => text.includes(term));
  const highMatches = HIGH_TERMS.filter((term) => text.includes(term));
  const mediumMatches = MEDIUM_TERMS.filter((term) => text.includes(term));
  const safetyMatches = SAFETY_TERMS.filter((term) => text.includes(term));

  let score = BASE_SCORE[selectedCategory] || 20;
  score += Math.min(42, criticalMatches.length * 14);
  score += Math.min(18, highMatches.length * 6);
  score += Math.min(10, mediumMatches.length * 3);
  score += Math.min(10, safetyMatches.length * 5);
  if (text.length > 90) score += 4;
  if (text.length > 180) score += 4;
  if (hasPhoto) score += 2;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const priority = priorityFromScore(score);
  const department = DEPARTMENT_BY_CATEGORY[selectedCategory] || 'General Administration';
  const reasons = [];
  if (criticalMatches.length) reasons.push(`Urgency language detected: ${criticalMatches.slice(0, 3).join(', ')}.`);
  if (highMatches.length) reasons.push(`Impact language detected: ${highMatches.slice(0, 3).join(', ')}.`);
  if (safetyMatches.length) reasons.push(`Public safety context: ${safetyMatches.slice(0, 3).join(', ')}.`);
  if (!reasons.length) reasons.push(`Category baseline applied for ${selectedCategory}.`);

  return {
    label: 'Prototype rule-based AI analysis',
    category: selectedCategory,
    detectedCategory: detection.category,
    categoryMatches: detection.matches,
    categoryConfidence: detection.matches ? Math.min(96, 58 + detection.matches * 12) : 55,
    priority,
    priorityScore: score,
    urgencyTerms: criticalMatches.concat(highMatches).slice(0, 5),
    department,
    resolutionHours: resolutionHoursFor(priority),
    reasons,
    recommendedActions: ACTIONS_BY_CATEGORY[selectedCategory],
    generatedAt: new Date().toISOString()
  };
}

const STOP_WORDS = new Set(['the', 'and', 'for', 'this', 'that', 'with', 'from', 'have', 'has', 'been', 'very', 'near', 'there', 'here', 'our', 'are', 'was', 'were', 'not', 'but', 'you', 'your', 'its', 'it', 'is', 'on', 'in', 'at', 'to', 'of', 'a', 'an', 'we', 'my', 'me', 'i']);

function tokenSet(text) {
  return new Set(normalize(text).split(' ').filter((token) => token.length > 2 && !STOP_WORDS.has(token)));
}

function tokenSimilarity(a, b) {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return shared / (left.size + right.size - shared);
}

function bigrams(text) {
  const flat = normalize(text).replace(/\s+/g, '');
  const set = new Set();
  for (let index = 0; index < flat.length - 1; index += 1) set.add(flat.slice(index, index + 2));
  return set;
}

function bigramSimilarity(a, b) {
  const left = bigrams(a);
  const right = bigrams(b);
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const gram of left) if (right.has(gram)) shared += 1;
  return (2 * shared) / (left.size + right.size);
}

function descriptionSimilarity(a, b) {
  return Math.round((tokenSimilarity(a, b) * 0.65 + bigramSimilarity(a, b) * 0.35) * 100);
}

module.exports = {
  CATEGORY_RULES,
  DEPARTMENT_BY_CATEGORY,
  ACTIONS_BY_CATEGORY,
  analyzeComplaint,
  descriptionSimilarity,
  resolutionHoursFor,
  priorityFromScore
};
