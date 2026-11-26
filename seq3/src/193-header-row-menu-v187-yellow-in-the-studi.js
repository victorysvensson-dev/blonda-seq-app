/* ================= Header row + menu (v187; yellow in the studio look v188) =================
   One row in the header: brand on the left; on the right the pattern buttons (A–D, copy, lib), the tools (undo, idea,
   studio …), a menu button and the tempo. The old pull-down tab is gone: the menu button opens a rounded box in the
   middle of the screen with the background blurred. The box holds what the tab's drawer held (project name, save, new,
   export, switch song, song mode, tap tempo) plus colour, look and midi.
   The drawer's own code (open/close, build, actions) is reused: its content is moved into the box and the box shows
   whenever the drawer is open.
   When the row does not fit ('tw'): brand · tools · menu on top, patterns (left) and tempo (right) on a second row.
   Phone: brand · menu · tempo on top, the sliding row with tools and patterns under it (as before).
   Phone sideways: a slim row with everything on top (scrolls sideways). ================= */
(()=>{
  const css=document.createElement('style');css.textContent=`
.top .dock-slot{display:none!important}
#pjBtn2{display:none!important}
.top #pats{display:flex;align-items:center;gap:6px;flex:none;flex-wrap:nowrap}
.top #pats .gbtn{height:34px}
#menuBtn svg{width:15px;height:15px}
@media (min-width:720px){
  .top.top{grid-template-columns:auto minmax(0,1fr)!important}
  .top .hxw{grid-column:2;justify-self:end;flex-wrap:nowrap;margin-left:14px}
  /* two rows: brand · tools · menu on top, patterns (left) and tempo (right) under */
  .top.tw.tw{grid-template-columns:minmax(0,1fr) auto auto!important;grid-template-areas:"brand hx menu" "pats bpm bpm";row-gap:12px;align-items:center}
  .top.tw .brand{grid-area:brand;grid-column:auto}
  .top.tw .hxw{display:contents}
  .top.tw .hx{grid-area:hx;margin-top:10px}
  .top.tw #menuBtn{grid-area:menu;margin-top:10px;justify-self:end}
  .top.tw #pats{grid-area:pats;justify-self:start}
  .top.tw .bpm{grid-area:bpm;justify-self:end;margin-top:0}
}
@media (max-width:719px){
  body.mob .top.top{grid-template-columns:minmax(0,1fr) auto auto;grid-template-areas:"brand menu bpm" "dock dock dock"}
  body.mob .top #menuBtn{grid-area:menu;align-self:center}
  body.mob .top #pats{grid-area:dock;padding:2px 0 4px;min-width:0}
}
@media (max-height:500px) and (orientation:landscape) and (max-width:1000px){
  body.mob-land .top.top{display:flex!important;justify-content:flex-end;align-items:center;height:auto!important;min-height:0!important;padding:4px 10px 0!important;margin:0!important;overflow:visible;grid-area:top}
  body.mob-land .top .hxw.hxw{display:contents!important}
  body.mob-land .top.top{gap:6px;flex-wrap:nowrap!important}
  body.mob-land .top .hxw>*{flex:none}
  body.mob-land .top #pats{flex:0 1 auto;min-width:0;overflow-x:auto;scrollbar-width:none;margin-right:auto}
  body.mob-land .top #pats::-webkit-scrollbar{display:none}
  body.mob-land .top .hx{flex:0 1 auto!important;min-width:0;overflow-x:auto;scrollbar-width:none}
  body.mob-land .top .hx::-webkit-scrollbar{display:none}
  body.mob-land .top .hx>*{flex:none}
  body.mob-land .top #pats>*{flex:none}
  body.mob-land .top .hxw .bpm{transform:scale(.86);transform-origin:right center;margin:0!important}
  body.mob-land #app#app{grid-template-rows:auto minmax(0,1fr) auto;grid-template-areas:"top top" "panes panes" "tabs foot"}
}
/* the menu: a rounded box in the middle, the app blurred behind it */
.mmenu{position:fixed;inset:0;z-index:6500;display:grid;place-items:center;padding:16px;box-sizing:border-box;
  background:rgba(8,8,10,.36);-webkit-backdrop-filter:blur(16px) saturate(1.15);backdrop-filter:blur(16px) saturate(1.15);animation:mmIn .2s ease both}
.mmenu[hidden]{display:none}
.mmenu .mm-box.dock{position:relative;left:auto;top:auto;transform:none;width:min(640px,100%);max-height:min(86vh,760px);overflow:auto;scrollbar-width:none;
  display:block;padding:16px 18px 4px;border-radius:24px;transition:none;animation:mmBox .34s cubic-bezier(.2,1.1,.3,1) both}
.mmenu .mm-box::-webkit-scrollbar{display:none}
body.look-studio .mmenu .mm-box.dock{border-radius:18px;background:#F2C318;color:#111211;box-shadow:0 30px 70px -24px rgba(0,0,0,.7)}
/* studio: the menu is yellow like the bottom bar and the deck */
body.look-studio .mmenu .dk-row button,body.look-studio .mmenu .dock-set .gbtn{background:rgba(17,18,17,.08);color:#111211;box-shadow:inset 0 0 0 1px rgba(17,18,17,.22)}
body.look-studio .mmenu .dk-row button:hover,body.look-studio .mmenu .dock-set .gbtn:hover{background:rgba(17,18,17,.16)}
body.look-studio .mmenu .dk-row button.go{background:#111211;color:#F2C318;box-shadow:none}
body.look-studio .mmenu .dk-row button.on{background:#111211;color:#F2C318}
body.look-studio .mmenu .dk-name input{background:rgba(17,18,17,.08);color:#111211;box-shadow:inset 0 0 0 1px rgba(17,18,17,.22)}
body.look-studio .mmenu .dk-name small,body.look-studio .mmenu .dk-lab{color:rgba(17,18,17,.6)}
body.look-studio .mmenu .mm-x{background:rgba(17,18,17,.1);color:#111211}
body.look-studio .mmenu .dock-set .mbtn .mdot{background:rgba(17,18,17,.4)}
body.look-studio .mmenu .dk-song.cur{box-shadow:inset 0 0 0 2px #111211}
.mm-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 14px}
.mm-hd b{font:400 20px var(--f-display);letter-spacing:.01em}
.mm-x{width:32px;height:32px;border:0;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.1);color:inherit;font:400 18px/1 var(--f-mono);cursor:pointer}
.mm-x:hover{background:rgba(255,255,255,.18)}
body.bg-light .mm-x{background:rgba(17,18,17,.08)}
.mmenu .dock-d{max-height:none!important;opacity:1!important;overflow:visible!important}
.dock-set{padding:0 2px 14px;display:flex;flex-direction:column;gap:8px;font-family:var(--f-mono);font-size:11px}
.dock-set .dk-row .gbtn{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:999px}
.dock-set #palBtn{width:auto;min-width:96px}
@keyframes mmIn{from{opacity:0}}
@keyframes mmBox{from{opacity:0;transform:scale(.96) translateY(10px)}}
@media (prefers-reduced-motion:reduce){.mmenu,.mmenu .mm-box{animation:none}}`;document.head.appendChild(css);

  const top=document.querySelector('header.top'),dock=document.getElementById('dock'),dd=document.getElementById('dockD'),
    pats=document.getElementById('pats'),brand=top&&top.querySelector('.brand'),hxw=top&&top.querySelector('.hxw'),bpm=hxw&&hxw.querySelector('.bpm');
  if(!top||!dock||!dd||!pats||!brand||!hxw||!bpm)return;

  /* pattern buttons into the row (the drawer code still measures a .pats inside the dock, so it keeps an empty one) */
  hxw.insertBefore(pats,hxw.firstChild);
  {const ph=document.createElement('div');ph.className='pats';ph.setAttribute('aria-hidden','true');dock.prepend(ph)}

  /* the menu button */
  const mb=document.createElement('button');mb.id='menuBtn';mb.className='hx-b';mb.title='Meny · projekt, spara, utseende och midi';mb.setAttribute('aria-label','Meny');
  mb.setAttribute('aria-haspopup','dialog');
  mb.innerHTML='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"/></svg>';
  hxw.insertBefore(mb,bpm);

  /* the box */
  const menu=document.createElement('div');menu.className='mmenu';menu.hidden=true;
  menu.innerHTML='<div class="mm-box dock open" role="dialog" aria-modal="true" aria-label="Meny"><div class="mm-hd"><b>meny</b><button class="mm-x" aria-label="Stäng">×</button></div></div>';
  document.body.appendChild(menu);const box=menu.firstElementChild;box.appendChild(dd);
  {const set=document.createElement('div');set.className='dock-set';set.innerHTML='<div class="dk-lab">utseende och midi</div><div class="dk-row"></div>';
   const row=set.lastElementChild;['palBtn','lookBtn','midiBtn'].forEach(id=>{const b=document.getElementById(id);if(b)row.appendChild(b)});dd.appendChild(set)}
  /* the drawer closes on a click outside the dock – the box counts as inside */
  {const oc=Node.prototype.contains;dock.contains=function(n){return oc.call(this,n)||oc.call(menu,n)}}
  const D=()=>window.__dock;
  const close=()=>{if(D()&&D().isOpen())D().toggle(false)};
  mb.onclick=()=>{if(D())D().toggle(true)};
  box.querySelector('.mm-x').onclick=close;
  /* the midi button opens its own panel (z-index 66, under the menu's 6500): the menu closes first, otherwise the
     panel opened behind the blur and the tap that closed the menu also counted as a tap outside the panel */
  {const mi=document.getElementById('midiBtn');if(mi)mi.addEventListener('click',()=>{if(!menu.hidden)close()},true)}
  menu.addEventListener('click',e=>{if(e.target===menu)close()});
  addEventListener('keydown',e=>{if(!menu.hidden&&e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}},true);
  let last=null;
  new MutationObserver(()=>{const o=dock.classList.contains('open')&&!dock.classList.contains('drag');if(menu.hidden!==o)return;
    menu.hidden=!o;mb.setAttribute('aria-expanded',o);
    if(o){last=document.activeElement;box.scrollTop=0;setTimeout(()=>{const x=box.querySelector('.mm-x');if(x)x.focus({preventScroll:true})},30)}
    else if(last&&last.focus){try{last.focus({preventScroll:true})}catch(_){globalThis.__el&&globalThis.__el(_)}last=null}}).observe(dock,{attributes:true,attributeFilter:['class']});

  /* toasts and bars sit under the header (the old code measured the hidden tab) */
  const wantB=()=>Math.round(top.getBoundingClientRect().bottom)+'px';
  const root=document.documentElement;
  const fixB=()=>{const w=wantB();if(root.style.getPropertyValue('--dockB')!==w)root.style.setProperty('--dockB',w)};
  new MutationObserver(fixB).observe(root,{attributes:true,attributeFilter:['style']});

  const GAP=14;
  function fit(){
    let tw=false;
    if(innerWidth>=720&&!document.body.classList.contains('mob-land')){
      top.classList.remove('tw');
      const cs=getComputedStyle(top),W=top.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
      top.classList.remove('tw');void top.offsetWidth;
      tw=Math.ceil(brand.scrollWidth)+Math.ceil(hxw.scrollWidth)+GAP+14>W}
    top.classList.toggle('tw',tw);fixB()}
  let t=0;const later=()=>{cancelAnimationFrame(t);t=requestAnimationFrame(fit)};
  addEventListener('resize',later);setTimeout(fit,120);setTimeout(fit,700);document.fonts&&document.fonts.ready.then(()=>setTimeout(fit,60));
  if(window.ResizeObserver){const ro=new ResizeObserver(later);[...hxw.querySelectorAll('.hx>*'),bpm,brand.firstElementChild,...pats.children].forEach(e=>e&&ro.observe(e))}
  window.__hdrFit=fit;window.__menu={open:()=>D()&&D().toggle(true),close,el:menu};
})();

