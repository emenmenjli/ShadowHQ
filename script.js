/* SHADOWHQ - fun, visual, Discord-only */
const CONFIG = {
  invite: 'https://discord.gg/3JsaVVGMgW',
  statsUrl: 'https://shq-stats.emenmenjli.workers.dev/stats',
  guildId: '1350769624014258177',
  refreshMs: 5 * 60 * 1000,
};

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function fmt(n){ return typeof n === 'number' ? n.toLocaleString() : '--'; }
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveal();
  initTilt();
  initLogoCard();
  initStats();
  initCanvasFx();
  initMagneticButtons();
  initScrollFx();
});

/* Nav */
function initNav(){
  const toggle = $('#navToggle');
  const links = $('#navLinks');
  const header = $('#siteHeader');
  const pill = $('#navPill');
  const navLinks = $$('.nav-link', links);
  if(!toggle || !links) return;

  const close = () => { toggle.setAttribute('aria-expanded','false'); links.classList.remove('open'); };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    links.classList.toggle('open', !open);
    if(!open) movePill(getActiveLink() || navLinks[0]);
  });
  navLinks.forEach(a => a.addEventListener('click', () => { if(window.innerWidth <= 760) close(); }));
  document.addEventListener('click', e => { if(!e.target.closest('.nav')) close(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') close(); });

  function getActiveLink(){ return navLinks.find(a => a.classList.contains('active')) || navLinks[0]; }
  function movePill(el){
    if(!pill || !el || window.innerWidth <= 760) { if(pill) pill.style.opacity='0'; return; }
    const shell = links.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    pill.style.opacity = '1';
    pill.style.width = r.width + 'px';
    pill.style.height = r.height + 'px';
    pill.style.transform = `translate(${r.left - shell.left}px, ${r.top - shell.top}px)`;
  }
  navLinks.forEach(a => {
    a.addEventListener('mouseenter', () => movePill(a));
    a.addEventListener('focus', () => movePill(a));
  });
  links.addEventListener('mouseleave', () => movePill(getActiveLink()));
  window.addEventListener('resize', () => movePill(getActiveLink()));

  const sections = ['top','stats'].map(id => document.getElementById(id)).filter(Boolean);
  const setActive = (id) => {
    navLinks.forEach(a => a.classList.toggle('active', a.dataset.nav === id));
    movePill(getActiveLink());
  };
  if('IntersectionObserver' in window){
    const io = new IntersectionObserver(entries => {
      const visible = entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(visible) setActive(visible.target.id === 'top' ? 'top' : visible.target.id);
    }, {rootMargin:'-20% 0px -65% 0px', threshold:[.1,.3,.6]});
    sections.forEach(s => io.observe(s));
  }
  setActive('top');
  requestAnimationFrame(()=>movePill(getActiveLink()));

  // sync header scroll state from global scroll fx
  window.__setHeaderScrolled = (on) => header?.classList.toggle('scrolled', on);
}

/* Reveal */
function initReveal(){
  const els = $$('.reveal');
  if(reduceMotion || !('IntersectionObserver' in window)){ els.forEach(e=>e.classList.add('visible')); return; }
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('visible'); io.unobserve(en.target); } });
  }, {threshold:.12});
  els.forEach(e=>io.observe(e));
}

/* Tilt cards */
function initTilt(){
  if(reduceMotion || window.matchMedia('(pointer: coarse)').matches) return;
  $$('.tilt, #logoCard').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      card.style.transform = `perspective(900px) rotateY(${x*10}deg) rotateX(${-y*10}deg) translateY(-2px)`;
      card.style.setProperty('--mx', `${(x+.5)*100}%`);
      card.style.setProperty('--my', `${(y+.5)*100}%`);
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

/* Logo interactions */
function initLogoCard(){
  const card = $('#logoCard');
  const caption = $('#logoCaption');
  const quips = [
    'The logo is watching respectfully.',
    'The logo saw that. It said nothing.',
    'Certified shiny object.',
    'Do not tap the logo. It likes it.',
    'Current mood: mysterious but friendly.',
    'This logo pays rent in aura.'
  ];
  let i = 0;
  card?.addEventListener('click', () => {
    i = (i+1) % quips.length;
    if(caption) caption.textContent = quips[i];
    card.classList.remove('logo-pop'); void card.offsetWidth; card.classList.add('logo-pop');
    burst(card.getBoundingClientRect().left + card.offsetWidth/2, card.getBoundingClientRect().top + card.offsetHeight/2, 18);
    setMeter(getMeter()+7);
  });
  $('#hypeBtn')?.addEventListener('click', () => {
    burst(window.innerWidth*0.72, window.innerHeight*0.45, 30);
    setMeter(getMeter()+12);
    setChaosText(randomFrom([
      'Hype deployed. No refunds.',
      'Shadow HQ morale increased by 17 imaginary points.',
      'The logo approved this hype event.',
      'You clicked hype. The vibes felt it.',
      'Chaos levels rising. Looks good on you.'
    ]));
  });
}

/* Stats */
let stats = { members:null, online:null, boosts:null, updated:null, source:null };
let countersStarted = false;
async function initStats(){
  await refreshStats(true);
  setInterval(()=>refreshStats(false), CONFIG.refreshMs);
  $('#refreshStatsBtn')?.addEventListener('click', async (e)=>{
    const btn=e.currentTarget; btn.disabled=true; btn.textContent='Refreshing...';
    await refreshStats(false); btn.disabled=false; btn.textContent='Refresh stats';
  });
}
async function refreshStats(animate){
  setStatus('Fetching live Discord stats...');
  const live = await fetchStats();
  if(live){
    stats = { ...stats, ...live, updated:new Date(), source: live.source };
    setStatus(`Live via ${live.source} • Updated ${timeAgo(stats.updated)}`);
  } else {
    setStatus(stats.updated ? `Showing last known stats • Updated ${timeAgo(stats.updated)}` : 'Live stats unavailable right now. The Discord is still cool though.');
  }
  renderStats(animate);
}
async function fetchStats(){
  try {
    const r = await fetch(CONFIG.statsUrl, {cache:'no-store'});
    if(!r.ok) throw new Error('bad');
    const d = await r.json();
    return normalize({members:d.members, online:d.online, boosts:d.boosts, source:'SHADOWHQ API'});
  } catch {
    try {
      const r = await fetch(`https://discord.com/api/v10/guilds/${CONFIG.guildId}/widget.json`, {cache:'no-store'});
      if(!r.ok) throw new Error('bad');
      const d = await r.json();
      return normalize({members:null, online:d.presence_count, boosts:null, source:'Discord widget'});
    } catch { return null; }
  }
}
function normalize(d){
  const clean = {
    members: numOrNull(d.members),
    online: numOrNull(d.online),
    boosts: numOrNull(d.boosts),
    source: d.source
  };
  if(clean.members==null && clean.online==null && clean.boosts==null) return null;
  return clean;
}
function numOrNull(v){ const n=Number(v); return Number.isFinite(n) && n>=0 ? Math.round(n) : null; }
function setStatus(msg){ const el=$('#statsStatus'); if(el) el.textContent=msg; }

function renderStats(animate){
  const m = stats.members, o = stats.online, b = stats.boosts;
  $('#heroMembers').textContent = m==null ? 'mysterious' : fmt(m);
  $('#heroOnline').textContent = o==null ? 'stealthy' : fmt(o);
  $('#navOnline').textContent = o==null ? '...' : fmt(o);
  $('#moodText').textContent = moodFor(o,m);
  $('#chipC').textContent = o!=null && o>120 ? 'very online' : o!=null && o>50 ? 'nicely active' : 'certified chaos';

  setStat('#statMembers', m, animate);
  setStat('#statOnline', o, animate);
  setStat('#statBoosts', b, animate);
  setBar('#barMembers', m, 1000);
  setBar('#barOnline', o, Math.max(150, m||150));
  setBar('#barBoosts', b, 20);
  countersStarted = true;
}
function setStat(sel, value, animate){
  const el=$(sel); if(!el) return;
  if(value==null){ el.textContent='N/A'; return; }
  if(!animate || reduceMotion || countersStarted){ el.textContent=fmt(value); return; }
  animateCount(el, value);
}
function animateCount(el, target){
  const start=performance.now(), dur=1200, from=0;
  function frame(now){
    const p=Math.min((now-start)/dur,1); const eased=1-Math.pow(1-p,3);
    el.textContent = fmt(Math.round(from + (target-from)*eased));
    if(p<1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
function setBar(sel, value, max){
  const el=$(sel); if(!el) return;
  const pct = value==null ? 8 : clamp((value/max)*100, 6, 100);
  el.style.width = pct + '%';
  el.style.opacity = value==null ? '.35' : '1';
}
function moodFor(online, members){
  if(online==null) return 'Calculating vibes';
  if(online > 150) return 'Absolutely cooking';
  if(online > 80) return 'Active & dangerous';
  if(online > 30) return 'Vibing';
  if(online > 0) return 'Chill but awake';
  return members ? 'Stealth mode' : 'Mysterious';
}
function timeAgo(date){
  const s=Math.floor((Date.now()-date.getTime())/1000);
  if(s<60) return 'just now';
  const m=Math.floor(s/60); if(m<60) return m+'m ago';
  const h=Math.floor(m/60); return h+'h ago';
}

/* Canvas FX */
let particles=[]; let ctx, canvas, w=0, h=0, anim;
let mouse = {x: window.innerWidth/2, y: window.innerHeight/2, tx: window.innerWidth/2, ty: window.innerHeight/2, active:false};
let fxBoost = 0;
function initCanvasFx(){
  canvas = $('#fx-canvas'); if(!canvas) return;
  ctx = canvas.getContext('2d');
  resize(); window.addEventListener('resize', resize);
  const count = reduceMotion ? 0 : Math.min(110, Math.floor(window.innerWidth / 14));
  particles = Array.from({length:count}, ()=>makeParticle(true));
  if(!reduceMotion) loop();
  window.addEventListener('mousemove', e => {
    mouse.tx=e.clientX; mouse.ty=e.clientY; mouse.active=true;
    const aura=$('#cursorAura'); if(aura){ aura.classList.add('visible'); aura.style.left=e.clientX+'px'; aura.style.top=e.clientY+'px'; }
    if(!reduceMotion && Math.random()<0.12) particles.push(spark(e.clientX,e.clientY));
  }, {passive:true});
  window.addEventListener('mouseleave', ()=>$('#cursorAura')?.classList.remove('visible'));
}
function resize(){ w=canvas.width=window.innerWidth; h=canvas.height=window.innerHeight; }
function makeParticle(randomY=false){
  return { x:Math.random()*w, y:randomY?Math.random()*h:h+20, r:Math.random()*1.9+.35, vx:(Math.random()-.5)*.3, vy:-Math.random()*.4-.12, a:Math.random()*.45+.12, life:1, decay:0, hue: Math.random()>0.5 ? 210 : 265 };
}
function spark(x,y,boost=1){
  const a=Math.random()*Math.PI*2, s=(Math.random()*2.2+.6)*boost;
  return {x,y,r:Math.random()*2.2+.8,vx:Math.cos(a)*s,vy:Math.sin(a)*s,a:1,life:1,decay:0.018+Math.random()*0.02,hue:Math.random()>.45?205:280};
}
function burst(x,y,count=20){
  if(reduceMotion) return;
  fxBoost = Math.min(1, fxBoost + 0.35);
  for(let i=0;i<count;i++) particles.push(spark(x,y,1.15));
  if(particles.length>260) particles.splice(0, particles.length-260);
}
function loop(){
  ctx.clearRect(0,0,w,h);
  mouse.x += (mouse.tx-mouse.x)*0.08; mouse.y += (mouse.ty-mouse.y)*0.08;
  fxBoost *= 0.96;
  const g = ctx.createRadialGradient(mouse.x,mouse.y,0,mouse.x,mouse.y,220);
  g.addColorStop(0, `rgba(110,168,255,${0.07+fxBoost*0.05})`);
  g.addColorStop(1, 'rgba(110,168,255,0)');
  ctx.fillStyle=g; ctx.fillRect(0,0,w,h);

  for(let i=0;i<particles.length;i++){
    const p=particles[i];
    const dx=mouse.x-p.x, dy=mouse.y-p.y, dist=Math.hypot(dx,dy) || 1;
    if(dist < 140){ p.vx -= (dx/dist)*0.003; p.vy -= (dy/dist)*0.003; }
    p.x+=p.vx; p.y+=p.vy; p.life-=p.decay;
    if(p.decay){ p.vy+=0.015; p.a=p.life; }
    if(!p.decay){ p.vx *= 0.995; p.vy *= 0.995; }
    ctx.beginPath();
    ctx.fillStyle=`hsla(${p.hue}, 90%, 68%, ${Math.max(0,p.a*p.life)})`;
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    if(p.y < -20 || p.life<=0 || p.x<-30 || p.x>w+30 || p.y>h+30){
      particles[i] = p.decay ? makeParticle(true) : makeParticle(false);
      if(p.decay) particles.splice(i,1), i--;
    }
  }
  anim=requestAnimationFrame(loop);
}

/* Magnetic buttons */
function initMagneticButtons(){
  if(reduceMotion || window.matchMedia('(pointer: coarse)').matches) return;
  $$('.btn-primary, .btn-ghost, .nav-join').forEach(btn=>{
    btn.addEventListener('mousemove', e=>{
      const r=btn.getBoundingClientRect(), x=e.clientX-r.left-r.width/2, y=e.clientY-r.top-r.height/2;
      btn.style.transform=`translate(${x*0.08}px, ${y*0.08}px)`;
    });
    btn.addEventListener('mouseleave', ()=>{ btn.style.transform=''; });
  });
}

/* Scroll + ambient sync effects */
function initScrollFx(){
  const progress = $('#scrollProgress');
  const header = $('#siteHeader');
  const orbs = $$('.bg-orb');
  const rings = $$('.stage-ring');
  let ticking = false;
  const onScroll = () => {
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(()=>{
      const y = window.scrollY || 0;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? clamp(y / h, 0, 1) : 0;
      if(progress) progress.style.transform = `scaleX(${p})`;
      if(window.__setHeaderScrolled) window.__setHeaderScrolled(y > 12);
      if(!reduceMotion){
        orbs.forEach((orb, i) => { orb.style.translate = `0 ${y * (i===0?0.03:i===1?-0.02:0.015)}px`; });
        rings.forEach((ring, i) => { ring.style.rotate = `${y * (i===0?0.02:-0.015)}deg`; });
      }
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();
}

function randomFrom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function rand(a,b){ return a + Math.random()*(b-a); }

// expose for logo click
window.SHADOWHQ = { burst };
