document.addEventListener('DOMContentLoaded', () => {

    // ===== Intersection Observer (fade-in) =====
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });
    document.querySelectorAll('.fade-element').forEach(el => observer.observe(el));

    // ===== Typewriter =====
    const typewriterEl = document.getElementById('typewriter');
    const phrases = [
        'Join the SHADOWHQ Discord server.',
        'Live stats, active community, one invite away.',
        'Tap in and connect with the squad.'
    ];
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function typeLoop() {
        const current = phrases[phraseIndex];
        const cursor = '<span class="cursor"></span>';

        if (!isDeleting) {
            typewriterEl.innerHTML = current.substring(0, charIndex + 1) + cursor;
            charIndex++;
            if (charIndex === current.length) {
                setTimeout(() => { isDeleting = true; typeLoop(); }, 2000);
                return;
            }
        } else {
            typewriterEl.innerHTML = current.substring(0, charIndex - 1) + cursor;
            charIndex--;
            if (charIndex === 0) {
                isDeleting = false;
                phraseIndex = (phraseIndex + 1) % phrases.length;
            }
        }
        setTimeout(typeLoop, isDeleting ? 25 : 50);
    }
    typeLoop();

    // ===== Live Discord Stats =====
    const BACKEND_URL = 'https://shq-stats.emenmenjli.workers.dev/stats';
    const GUILD_ID = '1350769624014258177';

    async function fetchDiscordStats() {
        try {
            const res = await fetch(BACKEND_URL, { cache: 'no-store' });
            if (!res.ok) throw new Error('Backend unavailable');
            const data = await res.json();
            return {
                members: data.members ?? null,
                online: data.online ?? null,
                boosts: data.boosts ?? null
            };
        } catch {
            try {
                const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/widget.json`);
                if (!res.ok) throw new Error('Widget unavailable');
                const data = await res.json();
                return { members: null, online: data.presence_count ?? null, boosts: null };
            } catch {
                return null;
            }
        }
    }

    let countersAnimated = false;
    let statsData = { members: 567, online: 102, boosts: 4 };

    function applyStats() {
        document.querySelectorAll('.stat-number[data-target]').forEach(counter => {
            const key = counter.getAttribute('data-target');
            counter.textContent = statsData[key] || 0;
        });
        const badge = document.getElementById('badgeCount');
        if (badge && statsData.members) badge.textContent = 'Join ' + statsData.members + '+';
    }

    function animateCounters() {
        const counters = document.querySelectorAll('.stat-number[data-target]');
        counters.forEach(counter => {
            const key = counter.getAttribute('data-target');
            const target = statsData[key] || 0;
            const duration = 1500;
            const start = performance.now();
            function update(now) {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                counter.textContent = Math.floor(eased * target);
                if (progress < 1) requestAnimationFrame(update);
                else counter.textContent = target;
            }
            requestAnimationFrame(update);
        });
        const badge = document.getElementById('badgeCount');
        if (badge && statsData.members) badge.textContent = 'Join ' + statsData.members + '+';
    }

    async function refreshStats({ animate }) {
        const live = await fetchDiscordStats();
        if (live) {
            if (live.members) statsData.members = live.members;
            if (live.online) statsData.online = live.online;
            if (live.boosts) statsData.boosts = live.boosts;
        }
        if (animate) {
            if (countersAnimated) applyStats();
            else animateCounters();
            countersAnimated = true;
        } else {
            applyStats();
        }
    }

    const statsEl = document.getElementById('stats');
    if (statsEl) {
        new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    refreshStats({ animate: true });
                }
            });
        }, { threshold: 0.5 }).observe(statsEl);
        setInterval(() => refreshStats({ animate: false }), 5 * 60 * 1000);
    }

    // ===== Smooth Scroll =====
    document.querySelectorAll('nav a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

});
