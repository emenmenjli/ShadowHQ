/* SHADOWHQ - editorial, Discord-only, live stats */
const CONFIG = {
  invite: 'https://discord.gg/3JsaVVGMgW',
  statsUrl: 'https://shq-stats.emenmenjli.workers.dev/stats',
  guildId: '1350769624014258177',
  refreshMs: 5 * 60 * 1000,
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.documentElement.classList.add('js');

function fmt(n) { return typeof n === 'number' ? n.toLocaleString() : '—'; }
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveal();
  initStats();
  initScrollFx();
});

/* Navigation */
function initNav() {
  const toggle = $('#navToggle');
  const links = $('#navLinks');
  const navLinks = $$('.nav-link', links);
  if (!toggle || !links) return;

  const close = () => {
    toggle.setAttribute('aria-expanded', 'false');
    links.classList.remove('open');
  };

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    links.classList.toggle('open', !open);
  });

  navLinks.forEach(a => a.addEventListener('click', close));
  document.addEventListener('click', e => { if (!e.target.closest('.nav')) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  const sections = ['top', 'stats'].map(id => document.getElementById(id)).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) {
        const id = visible.target.id === 'top' ? 'top' : 'stats';
        navLinks.forEach(a => a.classList.toggle('active', a.dataset.nav === id));
      }
    }, { rootMargin: '-20% 0px -65% 0px', threshold: [.1, .3, .6] });
    sections.forEach(s => io.observe(s));
  }
}

/* Reveal on scroll */
function initReveal() {
  const els = $$('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    els.forEach(e => e.classList.add('visible'));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('visible');
        io.unobserve(en.target);
      }
    });
  }, { threshold: .12 });
  els.forEach(e => io.observe(e));
}

/* Live Discord stats */
let stats = { members: null, online: null, boosts: null, updated: null, source: null };
let countersStarted = false;
let liveNow = false;

async function initStats() {
  await refreshStats(true);
  setInterval(() => refreshStats(false), CONFIG.refreshMs);
  setInterval(updateTimestamps, 30000);

  const btn = $('#refreshStatsBtn');
  if (btn) btn.addEventListener('click', async () => {
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'Refreshing';
    await refreshStats(false);
    btn.disabled = false;
    btn.textContent = original;
  });
}

async function refreshStats(animate) {
  const live = await fetchStats();
  liveNow = Boolean(live);
  if (live) {
    stats = { ...stats, ...live, updated: new Date() };
  }
  renderStats(animate);
  if (stats.updated) {
    const prefix = liveNow ? `Live via ${stats.source}` : 'Last known stats';
    setStatus(`${prefix} · Updated ${timeAgo(stats.updated)}`);
  } else {
    setStatus('Live stats unavailable right now');
  }
}

async function fetchStats() {
  try {
    const r = await fetch(CONFIG.statsUrl, { cache: 'no-store' });
    if (!r.ok) throw new Error('bad response');
    const d = await r.json();
    return normalize({ members: d.members, online: d.online, boosts: d.boosts, source: 'SHADOWHQ API' });
  } catch {
    try {
      const r = await fetch(`https://discord.com/api/v10/guilds/${CONFIG.guildId}/widget.json`, { cache: 'no-store' });
      if (!r.ok) throw new Error('bad response');
      const d = await r.json();
      return normalize({ online: d.presence_count, source: 'Discord widget' });
    } catch {
      return null;
    }
  }
}

function normalize(d) {
  const clean = {
    members: numOrNull(d.members),
    online: numOrNull(d.online),
    boosts: numOrNull(d.boosts),
    source: d.source,
  };
  if (clean.members == null && clean.online == null && clean.boosts == null) return null;
  return clean;
}

function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

function setStatus(msg) {
  const el = $('#statsStatus');
  if (el) el.textContent = msg;
}

function renderStats(animate) {
  const m = stats.members, o = stats.online, b = stats.boosts;

  setText('#heroMembers', m);
  setText('#heroOnline', o);
  setText('#navOnline', o);
  updateTimestamps();

  setStat('#statMembers', m, animate);
  setStat('#statOnline', o, animate);
  setStat('#statBoosts', b, animate);

  setBar('#barMembers', m, 1000);
  setBar('#barOnline', o, Math.max(150, m || 150));
  setBar('#barBoosts', b, 20);

  countersStarted = true;
}

function setText(sel, value) {
  const el = $(sel);
  if (el) el.textContent = value == null ? '—' : fmt(value);
}

function setStat(sel, value, animate) {
  const el = $(sel);
  if (!el) return;
  if (value == null) { el.textContent = '—'; return; }
  el.textContent = fmt(value);
  if (!animate || reduceMotion || countersStarted) return;
  animateCount(el, value);
}

function animateCount(el, target) {
  const start = performance.now();
  const duration = 900;
  function frame(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(Math.round(target * eased));
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function setBar(sel, value, max) {
  const el = $(sel);
  if (!el) return;
  const pct = value == null ? 0 : clamp((value / max) * 100, 4, 100);
  el.style.width = pct + '%';
  el.style.opacity = value == null ? '.25' : '1';
}

function updateTimestamps() {
  const el = $('#heroUpdated');
  if (!el) return;
  el.textContent = stats.updated ? timeAgo(stats.updated) : '—';
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  return h + 'h ago';
}

/* Scroll progress + header state */
function initScrollFx() {
  const progress = $('#scrollProgress');
  const header = $('#siteHeader');
  let ticking = false;

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY || 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? clamp(y / max, 0, 1) : 0;
      if (progress) progress.style.transform = `scaleX(${p})`;
      header?.classList.toggle('scrolled', y > 12);
      ticking = false;
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
