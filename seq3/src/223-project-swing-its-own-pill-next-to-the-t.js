/* ================= Project swing: its own pill next to the tempo (v223) =================
   The project's swing (S.master.swing, the same value as the Swing knob in the master section) in a pill of its own, so it is
   never mixed up with the tempo's − and +: − / + step 1 %, drag the number up/down, double tap = straight / back again.
   50 % = straight, up to 75 %. Everything follows it: the steps, the synth tracks, the Starter's notes and note repeat. ================= */
(()=>{
  const bpm=document.querySelector('header .bpm');if(!bpm)return;
  const pctOf=v=>Math.round(50+(v||0)*41.6),vOf=p=>Math.max(0,Math.min(.6,(p-50)/41.6));
  const w=document.createElement('div');w.className='bpm swp';w.setAttribute('role','group');w.setAttribute('aria-label','Swing');
  w.innerHTML='<button class="sw-dn" aria-label="Mindre swing"><svg viewBox="0 0 16 16"><path d="M4 8h8"/></svg></button>'+
    '<div class="bpmv swv" title="Swing för hela projektet · dra upp/ner · dubbeltryck = rak"><div class="num" id="swNum" data-dh="20"></div><span>swing</span></div>'+
    '<button class="sw-up" aria-label="Mer swing"><svg viewBox="0 0 16 16"><path d="M4 8h8M8 4v8"/></svg></button>';
  bpm.parentNode.insertBefore(w,bpm);
  const num=w.querySelector('.num'),sv=w.querySelector('.swv');
  const set=p=>{const v=+vOf(p).toFixed(4);if(Math.abs(v-(S.master.swing||0))<1e-6)return;S.master.swing=v;try{applyMaster()}catch(e){globalThis.__el&&globalThis.__el(e)}
    try{masterKnobs.forEach(k=>k.refresh&&k.refresh())}catch(e){globalThis.__el&&globalThis.__el(e)}try{renderCells()}catch(e){globalThis.__el&&globalThis.__el(e)}paint();save()};
  const step=d=>{set(pctOf(S.master.swing)+d);toast('swing '+pctOf(S.master.swing)+' %')};
  window.swingStep=step;window.swingPct=()=>pctOf(S.master.swing);
  /* − / +: tap = 1 %, hold = keeps going */
  [['.sw-dn',-1],['.sw-up',1]].forEach(([q,d])=>{const b=w.querySelector(q);let t=0,iv=0;
    b.addEventListener('pointerdown',e=>{e.preventDefault();step(d);t=setTimeout(()=>{iv=setInterval(()=>step(d),90)},380)});
    const up=()=>{clearTimeout(t);clearInterval(iv)};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up)});
  let y0=0,p0=0,on=false,last=0,keep=62;
  sv.addEventListener('pointerdown',e=>{e.preventDefault();on=true;y0=e.clientY;p0=pctOf(S.master.swing);try{sv.setPointerCapture(e.pointerId)}catch(_){globalThis.__el&&globalThis.__el(_)}
    const now=performance.now();if(now-last<320){const cur=pctOf(S.master.swing);if(cur>50){keep=cur;set(50)}else set(keep);on=false;last=0;toast('swing '+pctOf(S.master.swing)+' %');return}last=now});
  sv.addEventListener('pointermove',e=>{if(!on)return;const p=Math.max(50,Math.min(75,p0+Math.round((y0-e.clientY)/4)));if(p!==pctOf(S.master.swing))set(p)});
  const end=()=>{if(!on)return;on=false;if(pctOf(S.master.swing)!==p0)toast('swing '+pctOf(S.master.swing)+' %')};sv.addEventListener('pointerup',end);sv.addEventListener('pointercancel',end);
  sv.addEventListener('wheel',e=>{e.preventDefault();set(pctOf(S.master.swing)+(e.deltaY<0?1:-1))},{passive:false});
  function paint(){const p=pctOf(S.master.swing),mob=document.body.classList.contains('mob')&&!document.body.classList.contains('mob-land');num.dataset.dh=mob?14:20;setDM(num,String(p));w.classList.toggle('on',p>50);sv.setAttribute('aria-label','Swing '+p+' procent')}
  window.swingPaint=paint;paint();setInterval(paint,400);
  const css=document.createElement('style');css.textContent=`
header .bpm.swp{grid-area:auto}
.bpm.swp .swv{cursor:ns-resize;touch-action:none;user-select:none;-webkit-user-select:none}
.bpm.swp .swv .num{opacity:.55;transition:opacity .15s}
.bpm.swp.on .swv .num,.bpm.swp .swv:hover .num{opacity:1}
.top.tw .bpm.swp{grid-area:sw;justify-self:end}
.top.tw.tw{grid-template-areas:"brand hx menu" "pats sw bpm"!important}
body.mob .top.top{grid-template-areas:"brand menu bpm" "dock dock sw"!important}
body.mob .top .bpm.swp{grid-area:sw;align-self:center;justify-self:end}
body.mob-land .top .hxw .bpm.swp{grid-area:auto}
body.mob:not(.mob-land) .top .bpm.swp{transform:none!important;padding:3px!important;margin:0!important}
body.mob:not(.mob-land) .top .bpm.swp button{width:24px;height:24px}
body.mob:not(.mob-land) .top .bpm.swp button svg{width:11px;height:11px}
body.mob:not(.mob-land) .top .bpm.swp .bpmv{padding:0 4px 0 6px;gap:3px}
body.mob:not(.mob-land) .top .bpm.swp .bpmv span{font-size:7.5px;letter-spacing:.08em}`;document.head.appendChild(css);
})();

