/* Old SHADOWHQ UI skeleton + current Discord-only content and stats */
const CONFIG = {
    invite: 'https://discord.gg/3JsaVVGMgW',
    statsUrl: 'https://shq-stats.emenmenjli.workers.dev/stats',
    guildId: '1350769624014258177',
    refreshMs: 5 * 60 * 1000,
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.addEventListener('DOMContentLoaded', () => {
    initFade();
    initTypewriter();
    initStats();
    initSmoothScroll();
});

/* ===== Fade sections in on scroll (original behavior) ===== */
function initFade() {
    if (reduceMotion || !('IntersectionObserver' in window)) {
        document.querySelectorAll('.fade-element').forEach(el => el.classList.add('visible'));
        return;
    }
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });
    document.querySelectorAll('.fade-element').forEach(el => observer.observe(el));
}

/* ===== Typewriter with current-site copy ===== */
function initTypewriter() {
    const el = document.getElementById('typewriter');
    if (!el) return;

    const phrases = [
        'A place to talk, hang out, and stay a while.',
        'Live member numbers, an open invite, and no ceremony.',
        'One link. No application, no waiting room.',
        'Discord community. Live stats. Come say hello.'
    ];
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;

    function loop() {
        const phrase = phrases[phraseIndex];
        const cursor = '<span class="cursor"></span>';
        if (!deleting) {
            el.innerHTML = phrase.substring(0, charIndex + 1) + cursor;
            charIndex++;
            if (charIndex === phrase.length) {
                setTimeout(() => { deleting = true; loop(); }, 1800);
                return;
            }
        } else {
            el.innerHTML = phrase.substring(0, charIndex - 1) + cursor;
            charIndex--;
            if (charIndex === 0) {
                deleting = false;
                phraseIndex = (phraseIndex + 1) % phrases.length;
            }
        }
        setTimeout(loop, deleting ? 25 : 45);
    }
    loop();
}

/* ===== Smooth anchor scrolling (original behavior) ===== */
function initSmoothScroll() {
    document.querySelectorAll('nav a[href^="#"]').forEach(link => {
        link.addEventListener('click', e => {
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
            }
        });
    });
}

/* ===== Live Discord stats (current implementation) ===== */
let stats = { members: null, online: null, boosts: null, updated: null, source: null };
let liveNow = false;
let countersAnimated = false;

async function initStats() {
    await refreshStats();
    setInterval(refreshStats, CONFIG.refreshMs);
    setInterval(updateTimestamps, 30000);

    const btn = document.getElementById('refreshStatsBtn');
    if (btn) btn.addEventListener('click', async () => {
        btn.disabled = true;
        const original = btn.textContent;
        btn.textContent = 'Refreshing';
        await refreshStats();
        btn.disabled = false;
        btn.textContent = original;
    });

    const statsEl = document.getElementById('stats');
    if (statsEl && !reduceMotion && 'IntersectionObserver' in window) {
        const io = new IntersectionObserver(entries => {
            if (entries.some(e => e.isIntersecting)) animateCounters();
        }, { threshold: 0.5 });
        io.observe(statsEl);
    }
}

async function refreshStats() {
    const live = await fetchStats();
    liveNow = Boolean(live);
    if (live) stats = { ...stats, ...live, updated: new Date() };
    renderStats();

    if (stats.updated) {
        const prefix = liveNow ? `Live via ${stats.source}` : 'Last known stats';
        setStatus(`${prefix} · Updated ${timeAgo(stats.updated)}`);
    } else {
        setStatus('Live stats unavailable right now');
    }
}

async function fetchStats() {
    try {
        const res = await fetch(CONFIG.statsUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error('stats worker unavailable');
        const data = await res.json();
        return normalize({ members: data.members, online: data.online, boosts: data.boosts, source: 'SHADOWHQ API' });
    } catch {
        try {
            const res = await fetch(`https://discord.com/api/v10/guilds/${CONFIG.guildId}/widget.json`, { cache: 'no-store' });
            if (!res.ok) throw new Error('widget unavailable');
            const data = await res.json();
            return normalize({ online: data.presence_count, source: 'Discord widget' });
        } catch {
            return null;
        }
    }
}

function normalize(data) {
    const clean = {
        members: numOrNull(data.members),
        online: numOrNull(data.online),
        boosts: numOrNull(data.boosts),
        source: data.source,
    };
    if (clean.members == null && clean.online == null && clean.boosts == null) return null;
    return clean;
}

function numOrNull(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

function fmt(n) { return typeof n === 'number' ? n.toLocaleString() : '—'; }

function setText(sel, value) {
    const el = document.querySelector(sel);
    if (el) el.textContent = value == null ? '—' : fmt(value);
}

function setStatus(msg) {
    const el = document.getElementById('statsStatus');
    if (el) el.textContent = msg;
}

function renderStats() {
    setText('#heroOnline', stats.online);
    setText('#heroMembers', stats.members);
    updateTimestamps();

    const badge = document.getElementById('badgeOnline');
    if (badge) badge.textContent = stats.online == null ? 'LIVE' : `${fmt(stats.online)} ONLINE`;

    document.querySelectorAll('.stat-number[data-target]').forEach(counter => {
        const value = stats[counter.getAttribute('data-target')];
        counter.textContent = value == null ? '—' : fmt(value);
    });
}

function animateCounters() {
    if (countersAnimated) return;
    countersAnimated = true;

    document.querySelectorAll('.stat-number[data-target]').forEach(counter => {
        const target = stats[counter.getAttribute('data-target')];
        if (target == null) { counter.textContent = '—'; return; }
        const duration = 1500;
        const start = performance.now();
        function update(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            counter.textContent = Math.floor(eased * target).toLocaleString();
            if (progress < 1) requestAnimationFrame(update);
            else counter.textContent = fmt(target);
        }
        requestAnimationFrame(update);
    });
}

function updateTimestamps() {
    const el = document.getElementById('heroUpdated');
    if (el) el.textContent = stats.updated ? timeAgo(stats.updated) : '—';
}

function timeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm ago';
    return Math.floor(minutes / 60) + 'h ago';
}
