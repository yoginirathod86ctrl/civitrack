import { api } from '../api.js';
import { navigate, queryParam } from '../router.js';
import { state } from '../store.js';
import { avatar, esc, fmtNumber, icon, toast } from '../ui.js';

function brand(light = false) {
  return `<a class="brand ${light ? 'brand-light' : ''}" href="/">
    <span class="brand-mark" aria-hidden="true">${icon('activity')}</span>
    <span><span class="brand-name">Civic<span>Pulse</span> AI</span><span class="brand-sub">From complaints to action</span></span>
  </a>`;
}

function publicNav() {
  const loggedIn = Boolean(state.user);
  return `<header class="public-nav">
    <div class="public-nav-inner">
      ${brand()}
      <nav class="public-nav-links" aria-label="Main navigation">
        <a href="/#how-it-works">How it works</a>
        <a href="/#features">Platform</a>
        <a href="/#hotspots">Hotspots</a>
        <a href="/#impact">Impact</a>
      </nav>
      <div class="public-nav-actions">
        ${loggedIn
          ? `<a class="btn btn-secondary btn-sm" href="${state.user.role === 'admin' ? '/admin/dashboard' : '/citizen/dashboard'}">${icon('dashboard')} Dashboard</a>`
          : `<a class="btn btn-ghost btn-sm" href="/login">Sign in</a>
             <a class="btn btn-primary btn-sm" href="/login?redirect=%2Fcitizen%2Freport">Report an issue</a>`}
      </div>
    </div>
  </header>`;
}

function publicFooter() {
  return `<footer class="public-footer">
    <div class="public-footer-inner">
      <div class="footer-top">
        <div class="footer-about">
          ${brand(true)}
          <p>A transparent civic complaint platform that turns citizen reports into accountable, prioritised action.</p>
        </div>
        <div class="footer-col">
          <h4>Platform</h4>
          <a href="/login">Citizen portal</a>
          <a href="/login?portal=admin">Authority portal</a>
          <a href="/signup">Create account</a>
        </div>
        <div class="footer-col">
          <h4>Explore</h4>
          <a href="/#how-it-works">How it works</a>
          <a href="/#features">Features</a>
          <a href="/#hotspots">Hotspot detection</a>
        </div>
        <div class="footer-col">
          <h4>Prototype</h4>
          <a href="/#impact">Demo dataset</a>
          <a href="/login">Sign in</a>
          <a href="/forgot-password">Password help</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} CivicPulse AI. Academic prototype — not connected to a real government authority.</span>
        <div class="footer-bottom-links"><a href="/#features">Security</a><a href="/#impact">Privacy</a><a href="/#how-it-works">Accessibility</a></div>
      </div>
    </div>
  </footer>`;
}

export async function renderLanding(root) {
  let summary = state.publicSummary;
  if (!summary) {
    try {
      summary = await api.get('/api/public/summary');
      state.publicSummary = summary;
    } catch {
      summary = { totalComplaints: 0, resolved: 0, active: 0, citizens: 0, areas: 8 };
    }
  }
  const resolutionRate = summary.totalComplaints ? Math.round(summary.resolved / summary.totalComplaints * 100) : 0;
  const reportHref = state.user ? (state.user.role === 'admin' ? '/admin/dashboard' : '/citizen/report') : '/login?redirect=%2Fcitizen%2Freport';
  root.innerHTML = `<div class="public-shell">
    ${publicNav()}
    <main class="public-main">
      <section class="landing-hero">
        <div class="hero-inner">
          <div class="hero-copy">
            <span class="eyebrow"><span class="dot"></span>AI-assisted civic accountability</span>
            <h1 class="hero-title">Your city. Your voice.<br><span class="accent">Real action.</span></h1>
            <p class="hero-sub">Report civic issues in seconds, track every step, and let AI help authorities prioritise what matters most. CivicPulse AI closes the loop between citizens and the departments that serve them.</p>
            <div class="hero-actions">
              <a class="btn btn-primary btn-lg" href="${reportHref}">${icon('plus-circle')} Report an issue</a>
              <a class="btn btn-secondary btn-lg" href="${state.user ? '/citizen/complaints' : '/login'}">${icon('search')} Track a complaint</a>
            </div>
            <div class="hero-trust">
              <span>${icon('shield-check')} Secure role-based access</span>
              <span>${icon('clock')} SLA-backed resolution</span>
              <span>${icon('sparkles')} AI prioritisation</span>
            </div>
          </div>
          <div class="hero-visual">
            <span class="hero-orb hero-orb-one"></span><span class="hero-orb hero-orb-two"></span>
            <div class="hero-panel">
              <div class="hero-panel-top">
                <div class="hero-panel-title">${icon('map-pin')} Live civic hotspot map</div>
                <span class="hero-live">Live</span>
              </div>
              <div class="hero-map">
                <div class="hero-map-grid"></div>
                <span class="hero-road r1"></span><span class="hero-road r2"></span><span class="hero-road r3"></span>
                <span class="hero-hotspot h1">9</span><span class="hero-hotspot h2">6</span><span class="hero-hotspot h3">4</span><span class="hero-hotspot h4"></span>
                <span class="hero-map-label">${icon('layers')} Ward-level activity · demo data</span>
              </div>
              <div class="hero-alert">
                <div class="hero-alert-icon">${icon('alert-triangle')}</div>
                <div class="hero-alert-text"><strong>College Road needs attention</strong>9 reports · 4 road damage · 2 overdue</div>
              </div>
            </div>
            <div class="hero-float hero-float-a">
              <div class="hero-float-icon">${icon('check-circle')}</div>
              <div><div class="hero-float-num">${resolutionRate}%</div><div class="hero-float-lbl">Resolution rate</div></div>
            </div>
            <div class="hero-float hero-float-b">
              <div class="hero-float-icon cyan">${icon('zap')}</div>
              <div><div class="hero-float-num">&lt; 2 sec</div><div class="hero-float-lbl">AI triage</div></div>
            </div>
          </div>
        </div>
      </section>

      <div class="trust-strip">
        <div class="trust-inner">
          <span class="trust-label">Built for public accountability</span>
          <div class="trust-items">
            <span class="trust-item">${icon('shield-check')} Scrypt password security</span>
            <span class="trust-item">${icon('users')} Role-based access</span>
            <span class="trust-item">${icon('clock')} SLA timers</span>
            <span class="trust-item">${icon('activity')} Live audit trail</span>
            <span class="trust-item">${icon('sparkles')} Transparent AI</span>
          </div>
        </div>
      </div>

      <section class="landing-section tight" id="impact">
        <div class="section-head center">
          <span class="section-kicker">Demo dataset</span>
          <h2>Built to show measurable civic impact</h2>
          <p>Live numbers from the seeded prototype database. Every complaint, department and resolution timer is real application data.</p>
        </div>
        <div class="stat-band">
          <div class="landing-stat"><div class="landing-stat-icon">${icon('file-text')}</div><div class="landing-stat-num">${fmtNumber(summary.totalComplaints)}</div><div class="landing-stat-label">Total complaints</div></div>
          <div class="landing-stat"><div class="landing-stat-icon teal">${icon('check-circle')}</div><div class="landing-stat-num">${fmtNumber(summary.resolved)}</div><div class="landing-stat-label">Resolved</div></div>
          <div class="landing-stat"><div class="landing-stat-icon orange">${icon('clock')}</div><div class="landing-stat-num">${fmtNumber(summary.active)}</div><div class="landing-stat-label">Active cases</div></div>
          <div class="landing-stat"><div class="landing-stat-icon red">${icon('map-pin')}</div><div class="landing-stat-num">${fmtNumber(summary.areas)}</div><div class="landing-stat-label">Wards covered</div></div>
        </div>
      </section>

      <section class="landing-section" id="how-it-works">
        <div class="section-head center">
          <span class="section-kicker">Simple by design</span>
          <h2>From report to resolution in three clear steps</h2>
          <p>No paperwork, no opaque queues. Citizens get a clear timeline while departments get the context and priority signals they need.</p>
        </div>
        <div class="steps-grid">
          <article class="step-card" data-step="01">
            <div class="step-icon">${icon('camera')}</div>
            <div><h3>Report with context</h3><p>Describe the issue, pin the area and add a photo. AI detects the category, urgency and the right department in seconds.</p></div>
          </article>
          <article class="step-card" data-step="02">
            <div class="step-icon">${icon('activity')}</div>
            <div><h3>Track every update</h3><p>Follow the complaint from submission to closure. Each status change, assignment and authority note appears in one timeline.</p></div>
          </article>
          <article class="step-card" data-step="03">
            <div class="step-icon">${icon('shield-check')}</div>
            <div><h3>Hold the system accountable</h3><p>Priority-based SLA timers escalate overdue cases automatically. Authorities see hotspots, queues and response performance.</p></div>
          </article>
        </div>
      </section>

      <section class="landing-section" id="features">
        <div class="section-head">
          <span class="section-kicker">One connected platform</span>
          <h2>Everything a responsive city needs</h2>
          <p>Purpose-built workflows for citizens and civic teams, with security and transparency at the centre.</p>
        </div>
        <div class="feature-grid">
          <div class="feature-card"><div class="feature-icon cyan">${icon('sparkles')}</div><div><h3>Explainable AI triage</h3><p>Rule-based urgency scoring, category detection and recommended actions — clearly labelled as a prototype.</p></div></div>
          <div class="feature-card"><div class="feature-icon">${icon('map-pin')}</div><div><h3>Hotspot intelligence</h3><p>Ward-level clustering surfaces repeat problem areas and gives teams a prioritised inspection recommendation.</p></div></div>
          <div class="feature-card"><div class="feature-icon orange">${icon('clock')}</div><div><h3>Resolution timers</h3><p>Every priority level carries an SLA. Overdue complaints are escalated automatically and pushed to the authority queue.</p></div></div>
          <div class="feature-card"><div class="feature-icon purple">${icon('copy')}</div><div><h3>Duplicate detection</h3><p>Similar recent reports in the same category and area are flagged before submission, reducing noise and repeated effort.</p></div></div>
          <div class="feature-card"><div class="feature-icon">${icon('shield-check')}</div><div><h3>Privacy by role</h3><p>Citizens see only their own reports. Internal authority notes stay hidden. Session cookies are HTTP-only and hashed server-side.</p></div></div>
          <div class="feature-card"><div class="feature-icon cyan">${icon('bar-chart')}</div><div><h3>Operational analytics</h3><p>SLA compliance, resolution time, category trends and exportable reports give leadership a clear performance view.</p></div></div>
        </div>
      </section>

      <section class="landing-section" id="hotspots">
        <div class="hotspot-showcase">
          <div class="hotspot-showcase-inner">
            <div>
              <span class="section-kicker" style="color:var(--cyan)">Hotspot detection</span>
              <h2>See where the city hurts most</h2>
              <p>Instead of treating complaints as isolated tickets, CivicPulse groups them by ward and category to reveal repeat patterns that need structural attention.</p>
              <div class="hotspot-check-list">
                <span class="hotspot-check">${icon('check-circle')} Ranked areas by volume, criticality and overdue pressure</span>
                <span class="hotspot-check">${icon('check-circle')} Dominant category and resolution progress for each ward</span>
                <span class="hotspot-check">${icon('check-circle')} A clear recommendation for the next inspection</span>
                <span class="hotspot-check">${icon('check-circle')} Transparent methodology — no GPS or predictive claims</span>
              </div>
              <a class="btn btn-primary" href="${state.user?.role === 'admin' ? '/admin/hotspots' : '/login?portal=admin'}">${icon('map-pin')} Explore hotspot analysis</a>
            </div>
            <div class="hotspot-demo-board">
              <div class="hotspot-demo-head"><span>Ward hotspot ranking</span><span class="badge badge-cyan">Demo</span></div>
              <div class="hotspot-demo-row">
                <span class="hotspot-rank one">1</span>
                <div style="flex:1"><div class="hotspot-demo-name">College Road</div><div class="hotspot-demo-meta">9 reports · Road Damage</div><div class="hotspot-demo-bar"><span style="width:100%"></span></div></div>
                <span class="hotspot-trend">${icon('arrow-up')} 2</span>
              </div>
              <div class="hotspot-demo-row">
                <span class="hotspot-rank">2</span>
                <div style="flex:1"><div class="hotspot-demo-name">Station Road</div><div class="hotspot-demo-meta">7 reports · Waterlogging</div><div class="hotspot-demo-bar"><span style="width:78%"></span></div></div>
                <span class="hotspot-trend down">${icon('arrow-down')} 1</span>
              </div>
              <div class="hotspot-demo-row">
                <span class="hotspot-rank">3</span>
                <div style="flex:1"><div class="hotspot-demo-name">MG Road</div><div class="hotspot-demo-meta">6 reports · Garbage</div><div class="hotspot-demo-bar"><span style="width:67%"></span></div></div>
                <span class="hotspot-trend">${icon('arrow-up')} 3</span>
              </div>
              <div class="hotspot-demo-row">
                <span class="hotspot-rank">4</span>
                <div style="flex:1"><div class="hotspot-demo-name">Gandhi Nagar</div><div class="hotspot-demo-meta">6 reports · Streetlights</div><div class="hotspot-demo-bar"><span style="width:62%"></span></div></div>
                <span class="hotspot-trend down">${icon('arrow-down')} 1</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="landing-section tight">
        <div class="landing-cta">
          <div><h2>Ready to turn complaints into action?</h2><p>Start with a report, or sign in to explore the citizen and authority experiences.</p></div>
          <div class="landing-cta-actions">
            <a class="btn btn-primary" href="/signup">${icon('user-plus')} Create account</a>
            <a class="btn btn-secondary" href="${state.user ? '/citizen/dashboard' : '/login'}">${icon('log-in')} Sign in</a>
          </div>
        </div>
      </section>
    </main>
    ${publicFooter()}
  </div>`;
}

function authVisual({ title, text, features = [] }) {
  return `<div class="auth-visual">
    <div style="position:relative;z-index:2">${brand(true)}</div>
    <div class="auth-visual-content">
      <span class="eyebrow" style="background:rgba(34,211,238,.08);border-color:rgba(34,211,238,.16);color:var(--cyan)"><span class="dot"></span>Civic accountability platform</span>
      <h1>${title}</h1>
      <p>${text}</p>
      <div class="auth-feature-list">
        ${features.map((feature) => `<div class="auth-feature"><span class="auth-feature-icon">${icon(feature.icon)}</span>${esc(feature.text)}</div>`).join('')}
      </div>
    </div>
    <div class="auth-visual-footer">Prototype environment · Demo data only · <a href="/">Back to home</a></div>
  </div>`;
}

function authShell({ visual, body }) {
  return `<div class="auth-page">${visual}
    <div class="auth-panel">
      <div class="auth-card">
        <a class="auth-mobile-logo brand" href="/"><span class="brand-mark">${icon('activity')}</span><span><span class="brand-name">Civic<span>Pulse</span> AI</span></span></a>
        ${body}
      </div>
    </div>
  </div>`;
}

export async function renderLogin(root) {
  const portal = queryParam('portal') === 'admin' ? 'admin' : 'citizen';
  const redirect = queryParam('redirect');
  root.innerHTML = authShell({
    visual: authVisual({
      title: 'Your city, <span>accountable.</span>',
      text: 'Sign in to report issues, follow resolution timelines and see how your community is being served.',
      features: [
        { icon: 'clock', text: 'Live status and SLA tracking' },
        { icon: 'sparkles', text: 'AI-assisted complaint triage' },
        { icon: 'shield-check', text: 'Private, role-based access' }
      ]
    }),
    body: `<div class="auth-card-head">
      <h2>Welcome back</h2>
      <p>Sign in to your CivicPulse account.</p>
    </div>
    <div class="role-tabs" role="tablist" aria-label="Portal">
      <button class="role-tab ${portal === 'citizen' ? 'active' : ''}" data-portal="citizen" role="tab" aria-selected="${portal === 'citizen'}">Citizen</button>
      <button class="role-tab ${portal === 'admin' ? 'active' : ''}" data-portal="admin" role="tab" aria-selected="${portal === 'admin'}">Authority Admin</button>
    </div>
    <div class="auth-error" data-auth-error>${icon('alert-circle')}<span></span></div>
    <form data-login-form novalidate>
      <input type="hidden" name="portal" value="${portal}">
      <div class="form-group">
        <label class="form-label" for="login-email">Email address</label>
        <div class="input-wrap"><span class="input-icon">${icon('mail')}</span><input class="form-input has-icon" id="login-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required></div>
      </div>
      <div class="form-group">
        <label class="form-label" for="login-password">Password</label>
        <div class="input-wrap"><span class="input-icon">${icon('lock')}</span><input class="form-input has-icon has-action" id="login-password" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required><button type="button" class="btn btn-ghost btn-icon-sm input-action" data-toggle-password aria-label="Show password">${icon('eye')}</button></div>
      </div>
      <div class="auth-options"><label class="form-check"><input type="checkbox" name="remember"> Remember me</label><a href="/forgot-password">Forgot password?</a></div>
      <button class="btn btn-primary btn-block btn-lg" type="submit" data-submit>${icon('log-in')} Sign in</button>
    </form>
    <div class="demo-box">
      <div class="demo-box-head"><strong>Demo access</strong><button class="btn btn-ghost btn-sm" data-fill-demo>Use demo login</button></div>
      <p data-demo-text></p>
    </div>
    <div class="auth-footer-link">New to CivicPulse? <a href="/signup">Create an account</a></div>
    <div class="auth-terms">By signing in you agree that this is an academic prototype and not a government service.</div>`
  });

  const errorBox = root.querySelector('[data-auth-error]');
  const form = root.querySelector('[data-login-form]');
  const submit = root.querySelector('[data-submit]');
  const demoText = root.querySelector('[data-demo-text]');
  const demo = {
    citizen: { email: 'citizen@civicpulse.ai', password: 'Demo@1234', text: 'Citizen · <code>citizen@civicpulse.ai</code> · <code>Demo@1234</code>' },
    admin: { email: 'admin@civicpulse.ai', password: 'Admin@1234', text: 'Authority · <code>admin@civicpulse.ai</code> · <code>Admin@1234</code>' }
  };
  const setPortal = (value) => {
    form.portal.value = value;
    root.querySelectorAll('[data-portal]').forEach((button) => {
      const active = button.dataset.portal === value;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    demoText.innerHTML = demo[value].text;
  };
  setPortal(portal);
  root.querySelectorAll('[data-portal]').forEach((button) => button.addEventListener('click', () => setPortal(button.dataset.portal)));
  root.querySelector('[data-toggle-password]').addEventListener('click', (event) => {
    const input = form.password;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    event.currentTarget.innerHTML = icon(show ? 'eye-off' : 'eye');
    event.currentTarget.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });
  root.querySelector('[data-fill-demo]').addEventListener('click', () => {
    const value = form.portal.value;
    form.email.value = demo[value].email;
    form.password.value = demo[value].password;
    form.email.focus();
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.classList.remove('show');
    const data = Object.fromEntries(new FormData(form));
    if (!data.email || !data.password) {
      errorBox.querySelector('span').textContent = 'Enter your email and password.';
      errorBox.classList.add('show');
      return;
    }
    submit.disabled = true;
    submit.innerHTML = '<span class="spinner spinner-light"></span> Signing in…';
    try {
      const result = await api.post('/api/auth/login', {
        email: data.email,
        password: data.password,
        remember: Boolean(form.remember.checked),
        portal: data.portal
      });
      state.user = result.user;
      state.unread = 0;
      toast('Signed in successfully.', 'success', 'Welcome back');
      const fallback = result.user.role === 'admin' ? '/admin/dashboard' : '/citizen/dashboard';
      const target = redirect && redirect.startsWith('/') ? redirect : fallback;
      navigate(target);
    } catch (error) {
      errorBox.querySelector('span').textContent = error.message;
      errorBox.classList.add('show');
      form.classList.add('shake');
      setTimeout(() => form.classList.remove('shake'), 400);
      submit.disabled = false;
      submit.innerHTML = `${icon('log-in')} Sign in`;
    }
  });
}

export async function renderSignup(root) {
  const areas = state.config.areas || [];
  root.innerHTML = authShell({
    visual: authVisual({
      title: 'Join the civic <span>feedback loop.</span>',
      text: 'Create a citizen account to report issues, follow progress and help your ward get the attention it needs.',
      features: [
        { icon: 'camera', text: 'Report with photos and location context' },
        { icon: 'activity', text: 'A transparent timeline for every case' },
        { icon: 'shield', text: 'Your reports stay private to you' }
      ]
    }),
    body: `<a class="auth-back" href="/login">${icon('arrow-left')} Back to sign in</a>
    <div class="auth-card-head"><h2>Create your account</h2><p>Join CivicPulse as a citizen reporter.</p></div>
    <div class="auth-error" data-auth-error>${icon('alert-circle')}<span></span></div>
    <form data-signup-form novalidate>
      <div class="form-group"><label class="form-label" for="signup-name">Full name</label><div class="input-wrap"><span class="input-icon">${icon('user')}</span><input class="form-input has-icon" id="signup-name" name="fullName" autocomplete="name" placeholder="Your full name" required maxlength="80"></div></div>
      <div class="form-group"><label class="form-label" for="signup-email">Email address</label><div class="input-wrap"><span class="input-icon">${icon('mail')}</span><input class="form-input has-icon" id="signup-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required></div></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label" for="signup-mobile">Mobile</label><div class="input-wrap"><span class="input-icon">${icon('phone')}</span><input class="form-input has-icon" id="signup-mobile" name="mobile" type="tel" autocomplete="tel" placeholder="98765 43210" required></div></div>
        <div class="form-group"><label class="form-label" for="signup-area">Area / ward</label><select class="form-select" id="signup-area" name="area" required><option value="">Select area</option>${areas.map((area) => `<option value="${esc(area)}">${esc(area)}</option>`).join('')}</select></div>
      </div>
      <div class="form-group"><label class="form-label" for="signup-password">Password</label><div class="input-wrap"><span class="input-icon">${icon('lock')}</span><input class="form-input has-icon has-action" id="signup-password" name="password" type="password" autocomplete="new-password" placeholder="At least 8 characters" required><button type="button" class="btn btn-ghost btn-icon-sm input-action" data-toggle-password aria-label="Show password">${icon('eye')}</button></div><div class="password-strength" data-strength><span></span><span></span><span></span><span></span></div><div class="form-hint">Use at least 8 characters with a letter and a number.</div></div>
      <div class="form-group"><label class="form-label" for="signup-confirm">Confirm password</label><div class="input-wrap"><span class="input-icon">${icon('shield-check')}</span><input class="form-input has-icon" id="signup-confirm" name="confirmPassword" type="password" autocomplete="new-password" placeholder="Repeat your password" required></div></div>
      <label class="form-check" style="margin-bottom:18px"><input type="checkbox" name="terms" required> I understand this is an academic prototype and agree to report responsibly.</label>
      <button class="btn btn-primary btn-block btn-lg" type="submit" data-submit>${icon('user-plus')} Create account</button>
    </form>
    <div class="auth-footer-link">Already have an account? <a href="/login">Sign in</a></div>`
  });

  const form = root.querySelector('[data-signup-form]');
  const submit = root.querySelector('[data-submit]');
  const errorBox = root.querySelector('[data-auth-error]');
  const strength = root.querySelector('[data-strength]');
  form.password.addEventListener('input', () => {
    const value = form.password.value;
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[a-zA-Z]/.test(value) && /\d/.test(value)) score += 1;
    if (value.length >= 12) score += 1;
    if (/[^a-zA-Z0-9]/.test(value)) score += 1;
    strength.className = `password-strength ${['', 'weak', 'fair', 'good', 'strong'][score]}`;
  });
  root.querySelector('[data-toggle-password]').addEventListener('click', (event) => {
    const input = form.password;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    event.currentTarget.innerHTML = icon(show ? 'eye-off' : 'eye');
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.classList.remove('show');
    const data = Object.fromEntries(new FormData(form));
    if (!data.terms) {
      errorBox.querySelector('span').textContent = 'Please confirm that you understand this is a prototype.';
      errorBox.classList.add('show');
      return;
    }
    if (data.password !== data.confirmPassword) {
      errorBox.querySelector('span').textContent = 'Passwords do not match.';
      errorBox.classList.add('show');
      return;
    }
    submit.disabled = true;
    submit.innerHTML = '<span class="spinner spinner-light"></span> Creating account…';
    try {
      const result = await api.post('/api/auth/signup', data);
      state.user = result.user;
      toast('Your citizen account is ready.', 'success', 'Account created');
      navigate('/citizen/dashboard');
    } catch (error) {
      errorBox.querySelector('span').textContent = error.message;
      errorBox.classList.add('show');
      form.classList.add('shake');
      setTimeout(() => form.classList.remove('shake'), 400);
      submit.disabled = false;
      submit.innerHTML = `${icon('user-plus')} Create account`;
    }
  });
}

export async function renderForgot(root) {
  root.innerHTML = authShell({
    visual: authVisual({
      title: 'Find your way <span>back in.</span>',
      text: 'Record a password reset request with the civic administrator. Automated email delivery is not enabled in this prototype.',
      features: [
        { icon: 'mail', text: 'A request is sent to the authority admin' },
        { icon: 'shield-check', text: 'No passwords are ever displayed or emailed' },
        { icon: 'help-circle', text: 'Contact your civic administrator for a manual reset' }
      ]
    }),
    body: `<a class="auth-back" href="/login">${icon('arrow-left')} Back to sign in</a>
    <div class="auth-card-head"><h2>Reset your password</h2><p>Enter the email linked to your CivicPulse account.</p></div>
    <div class="auth-success" data-auth-success>${icon('check-circle')}<span></span></div>
    <div class="auth-error" data-auth-error>${icon('alert-circle')}<span></span></div>
    <form data-forgot-form novalidate>
      <div class="form-group"><label class="form-label" for="forgot-email">Email address</label><div class="input-wrap"><span class="input-icon">${icon('mail')}</span><input class="form-input has-icon" id="forgot-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required></div></div>
      <button class="btn btn-primary btn-block btn-lg" type="submit" data-submit>${icon('send')} Request reset</button>
    </form>
    <div class="auth-footer-link">Remembered it? <a href="/login">Return to sign in</a></div>`
  });
  const form = root.querySelector('[data-forgot-form]');
  const submit = root.querySelector('[data-submit]');
  const errorBox = root.querySelector('[data-auth-error]');
  const successBox = root.querySelector('[data-auth-success]');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.classList.remove('show');
    successBox.classList.remove('show');
    submit.disabled = true;
    submit.innerHTML = '<span class="spinner spinner-light"></span> Recording request…';
    try {
      const result = await api.post('/api/auth/forgot-password', { email: form.email.value });
      successBox.querySelector('span').textContent = result.message;
      successBox.classList.add('show');
      form.reset();
    } catch (error) {
      errorBox.querySelector('span').textContent = error.message;
      errorBox.classList.add('show');
    } finally {
      submit.disabled = false;
      submit.innerHTML = `${icon('send')} Request reset`;
    }
  });
}

export function publicAvatar(user) {
  return avatar(user?.fullName || 'Citizen');
}
