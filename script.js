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
        'The fastest growing Blood Strike clan — EU-MENA & NA.',
        '405 members and scaling. Join the roster.',
        'Daily scrims, weekly tournaments, lifelong squad.',
        'Competitive. Community. Commitment.'
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

    // ===== Load Roster from JSON =====
    fetch('roster.json')
        .then(r => r.json())
        .then(data => {
            const grid = document.getElementById('rosterGrid');
            grid.innerHTML = data.map(m => `
                <div class="roster-card">
                    <div class="roster-avatar">
                        <img src="${m.image}" alt="${m.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                        <div class="roster-avatar-placeholder">${m.fallback}</div>
                    </div>
                    <h3>${m.name}${m.nickname ? ` <span style="font-size:0.75rem;color:var(--text-muted)">(${m.nickname})</span>` : ''}</h3>
                    <span class="roster-role">${m.role}</span>
                    <p>${m.description}</p>
                </div>
            `).join('');
        })
        .catch(() => {});

    // ===== Load Events from JSON =====
    fetch('tournaments.json')
        .then(r => r.json())
        .then(data => {
            const grid = document.getElementById('eventsGrid');
            grid.innerHTML = data.map(e => `
                <div class="event-card">
                    <span class="event-type ${e.type}">${e.type === 'scrim' ? 'Scrim' : 'Tournament'}</span>
                    <h3>${e.title}</h3>
                    <div class="event-details">${e.date} <span>•</span> ${e.time}</div>
                    <p>${e.description}</p>
                    ${e.prize ? `<div class="event-prize">🏆 ${e.prize}</div>` : ''}
                </div>
            `).join('');
        })
        .catch(() => {});

    // ===== Live Discord Stats =====
    const BACKEND_URL = 'https://dawn-bird-0be8.emenmenjli.workers.dev/stats';

    async function fetchDiscordStats() {
        try {
            const res = await fetch(BACKEND_URL);
            if (!res.ok) throw new Error('Backend unavailable');
            const data = await res.json();
            return { members: data.members, online: data.online, boosts: data.boosts };
        } catch {
            try {
                const res = await fetch('https://discord.com/api/v10/guilds/1350769624014258177/widget.json');
                if (!res.ok) throw new Error('Widget unavailable');
                const data = await res.json();
                return { members: null, online: data.presence_count, boosts: null };
            } catch {
                return null;
            }
        }
    }

    // ===== Stat Counters =====
    let countersAnimated = false;
    let statsData = { members: null, online: 0, boosts: null };

    async function animateCounters() {
        if (countersAnimated) return;
        const live = await fetchDiscordStats();
        if (live) {
            statsData.online = live.online;
            if (live.members) statsData.members = live.members;
            if (live.boosts) statsData.boosts = live.boosts;
        }

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
        countersAnimated = true;
    }

    const statsEl = document.getElementById('stats');
    if (statsEl) {
        new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounters();
                }
            });
        }, { threshold: 0.5 }).observe(statsEl);
    }

    // ===== Video Grid (Dynamic) =====
    const videos = []; // add YouTube IDs here: 'dQw4w9WgXcQ'
    const grid = document.getElementById('videoGrid');
    let currentSlide = 0;

    function scrollToRecruit() {
        document.getElementById('recruit').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function buildVideoHTML(id) {
        return `
            <div class="video-card has-video">
                <div class="video-placeholder" style="position:relative;padding:0;">
                    <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${id}" title="Gameplay" frameborder="0" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%"></iframe>
                </div>
                <div class="card-info"><h3>Clan Highlight</h3><p>SHQ Gameplay</p></div>
            </div>`;
    }

    function buildPlaceholderHTML(label = 'Your clip here') {
        return `
            <div class="video-card add-video-card">
                <div class="video-placeholder" style="background:linear-gradient(135deg,#000d1a,#0a0a0a);">
                    <div class="play-icon">+</div>
                    <p class="placeholder-text">${label}</p>
                    <span class="submit-cta">Submit yours →</span>
                </div>
                <div class="card-info"><h3>Your Highlight</h3><p>Join SHQ to get featured</p></div>
            </div>`;
    }

    function renderVideos() {
        grid.innerHTML = '';
        const len = videos.length;

        if (len === 0) {
            grid.innerHTML = buildPlaceholderHTML('Be the first — add your clip');
            grid.querySelector('.add-video-card').addEventListener('click', scrollToRecruit);
        } else if (len === 1) {
            grid.innerHTML = buildVideoHTML(videos[0]) + buildPlaceholderHTML('Add yours +');
            grid.querySelector('.add-video-card').addEventListener('click', scrollToRecruit);
        } else if (len === 2) {
            grid.innerHTML = buildVideoHTML(videos[0]) + buildVideoHTML(videos[1]) + buildPlaceholderHTML('Want yours here?');
            grid.querySelector('.add-video-card').addEventListener('click', scrollToRecruit);
        } else {
            grid.classList.add('carousel-mode');
            grid.innerHTML = `
                <button class="carousel-btn prev" id="prevBtn">‹</button>
                <div class="carousel-track" id="carouselTrack">
                    ${videos.map(id => buildVideoHTML(id)).join('')}
                    <div class="video-card add-video-card carousel-add">
                        ${buildPlaceholderHTML('+ Add yours')}
                    </div>
                </div>
                <button class="carousel-btn next" id="nextBtn">›</button>
            `;
            const track = document.getElementById('carouselTrack');
            const addCard = track.querySelector('.carousel-add');
            if (addCard) addCard.addEventListener('click', scrollToRecruit);

            const maxSlide = Math.max(0, videos.length - 1);
            currentSlide = Math.min(currentSlide, maxSlide);

            function updateCarousel() {
                const cardWidth = track.querySelector('.video-card')?.offsetWidth || 340;
                const gap = 24;
                track.style.transform = `translateX(-${currentSlide * (cardWidth + gap)}px)`;
                document.getElementById('prevBtn').style.opacity = currentSlide === 0 ? '0.3' : '1';
                document.getElementById('nextBtn').style.opacity = currentSlide >= maxSlide ? '0.3' : '1';
            }

            document.getElementById('prevBtn').addEventListener('click', () => {
                if (currentSlide > 0) { currentSlide--; updateCarousel(); }
            });
            document.getElementById('nextBtn').addEventListener('click', () => {
                if (currentSlide < maxSlide) { currentSlide++; updateCarousel(); }
            });
            updateCarousel();
            window.addEventListener('resize', updateCarousel);
        }
    }

    renderVideos();

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
