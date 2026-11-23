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
  initChaos();
  initStats();
  initCanvasFx();
  initMagneticButtons();
});

/* Nav */
function initNav(){
  const toggle = $('#navToggle');
  const links = $('#navLinks');
  if(!toggle || !links) return;
  const close = () => { toggle.setAttribute('aria-expanded','false'); links.classList.remove('open'); };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    links.classList.toggle('open', !open);
  });
  $$('#navLinks a').forEach(a => a.addEventListener('click', close));
  document.addEventListener('click', e => { if(!e.target.closest('.nav')) close(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') close(); });
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

/* Chaos zone */
function initChaos(){
  const chaosBtn=$('#chaosBtn'), calmBtn=$('#calmBtn');
  setMeter(42);
  chaosBtn?.addEventListener('click', ()=>{
    const val = clamp(getMeter() + Math.floor(10+Math.random()*28), 0, 100);
    setMeter(val);
    setChaosText(randomFrom(chaosLines(val)));
    addLog(randomFrom(logLines(val)));
    burst(rand(window.innerWidth*0.2, window.innerWidth*0.8), rand(window.innerHeight*0.2, window.innerHeight*0.7), 24);
  });
  calmBtn?.addEventListener('click', ()=>{
    const val = clamp(getMeter() - Math.floor(12+Math.random()*20), 0, 100);
    setMeter(val);
    setChaosText(randomFrom([
      'Calm mode enabled. The chaos is still there, just wearing a hoodie.',
      'Aura stabilized. For now.',
      'You have chosen peace. The logo is mildly disappointed.',
      'Serenity restored. Boring, but respectable.'
    ]));
    addLog('System: calm button pressed. suspicious.');
  });
}
function chaosLines(v){
  if(v>80) return [
    'Vibe report: unhinged in a charming way. Hydrate before joining VC.',
    'Chaos critical. Someone just pinged @everyone in spirit.',
    'The server aura is vibrating. That is either hype or caffeine.',
    'Maximum shadow energy detected. The logo is thriving.'
  ];
  if(v>50) return [
    'Vibe report: perfectly chaotic. Like a group chat with good lighting.',
    'Energy levels spicy. Not dangerous, just interesting.',
    'Shadow meter says: fun night ahead.',
    'Mild chaos detected. Exactly as intended.'
  ];
  return [
    'Vibe report: chill. A suspiciously wholesome calm.',
    'Low chaos. Someone is probably making tea.',
    'The aura is peaceful. Don\'t ruin it. Or do.',
    'Calm vibes detected. The logo is resting its eyes.'
  ];
}
function logLines(){ return [
  'System: detected a cool person visiting the site.',
  'System: shadow particles passed vibe check.',
  'System: invite button looking extra clickable today.',
  'System: logo performed one (1) dramatic shimmer.',
  'System: Discord stats refreshed without complaining.'
]; }
function setChaosText(t){ const el=$('#chaosText'); if(el) el.textContent=t; }
function addLog(t){
  const log=$('#miniLog'); if(!log) return;
  const d=document.createElement('div'); d.className='log-item'; d.textContent=t;
  log.prepend(d); while(log.children.length>4) log.lastElementChild.remove();
}
function getMeter(){ return Number($('#meterFill')?.dataset.value || 42); }
function setMeter(v){
  v=clamp(Math.round(v),0,100);
  const fill=$('#meterFill'), label=$('#meterValue');
  if(fill){ fill.style.width=v+'%'; fill.dataset.value=String(v); }
  if(label) label.textContent=v+'%';
}

/* Canvas FX */
let particles=[]; let ctx, canvas, w=0, h=0, anim;
function initCanvasFx(){
  canvas = $('#fx-canvas'); if(!canvas) return;
  ctx = canvas.getContext('2d');
  resize(); window.addEventListener('resize', resize);
  const count = reduceMotion ? 0 : Math.min(90, Math.floor(window.innerWidth / 16));
  particles = Array.from({length:count}, ()=>makeParticle(true));
  if(!reduceMotion) loop();
  document.addEventListener('mousemove', e => { if(!reduceMotion && Math.random()<0.08) particles.push(spark(e.clientX,e.clientY)); });
}
function resize(){ w=canvas.width=window.innerWidth; h=canvas.height=window.innerHeight; }
function makeParticle(randomY=false){
  return { x:Math.random()*w, y:randomY?Math.random()*h:h+20, r:Math.random()*1.8+.4, vx:(Math.random()-.5)*.35, vy:-Math.random()*.45-.15, a:Math.random()*.45+.15, life:1, decay:0, hue: Math.random()>0.5 ? 210 : 265 };
}
function spark(x,y){
  const a=Math.random()*Math.PI*2, s=Math.random()*2+.5;
  return {x,y,r:Math.random()*2+1,vx:Math.cos(a)*s,vy:Math.sin(a)*s,a:1,life:1,decay:0.02+Math.random()*0.02,hue:Math.random()>.5?205:280};
}
function burst(x,y,count=20){
  if(reduceMotion) return;
  for(let i=0;i<count;i++) particles.push(spark(x,y));
  if(particles.length>220) particles.splice(0, particles.length-220);
}
function loop(){
  ctx.clearRect(0,0,w,h);
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.x+=p.vx; p.y+=p.vy; p.life-=p.decay;
    if(p.decay){ p.vy+=0.01; p.a=p.life; }
    ctx.beginPath();
    ctx.fillStyle=`hsla(${p.hue}, 90%, 65%, ${Math.max(0,p.a*p.life)})`;
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    if(p.y < -20 || p.life<=0 || p.x<-30 || p.x>w+30 || p.y>h+30){
      particles[i] = p.decay ? makeParticle(true) : makeParticle(false);
      if(p.decay) particles.splice(i,1);
    }
  }
  anim=requestAnimationFrame(loop);
}

/* Magnetic buttons */
function initMagneticButtons(){
  if(reduceMotion || window.matchMedia('(pointer: coarse)').matches) return;
  $$('.btn-primary, .btn-ghost').forEach(btn=>{
    btn.addEventListener('mousemove', e=>{
      const r=btn.getBoundingClientRect(), x=e.clientX-r.left-r.width/2, y=e.clientY-r.top-r.height/2;
      btn.style.transform=`translate(${x*0.08}px, ${y*0.08}px)`;
    });
    btn.addEventListener('mouseleave', ()=>{ btn.style.transform=''; });
  });
}

function randomFrom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function rand(a,b){ return a + Math.random()*(b-a); }

// expose for logo click
window.SHADOWHQ = { burst };
