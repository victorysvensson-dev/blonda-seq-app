/* ================= v233: the music keeps going while the window changes size =================
   In Safari's engine a big window change (zoom, full screen) relays and repaints the whole page, which can hold the page
   for over a second. The notes are planned only a fraction of a second ahead, so such a pause went silent. When the size
   starts to change, the next two seconds of notes are planned at once, before the engine starts relaying the page; the normal
   short planning carries on from there. ================= */
(()=>{let t=0;addEventListener('resize',()=>{try{if(typeof playing==='undefined'||!playing)return;
    if(!t&&window.__schedAhead){try{__schedAhead(2)}catch(e){globalThis.__el&&globalThis.__el(e)}}clearTimeout(t);
    t=setTimeout(()=>{t=0},700)}catch(e){globalThis.__el&&globalThis.__el(e)}},true)})();
/* (v239–v240) one fixed top row, no bar at the bottom: the clock, the step dots, the piano, rec and play buttons move up
   next to the name (without the yellow), a yellow dots button opens the yellow master deck over the screen, swing and
   bpm get smaller, everything in the row shares one height and centre line, and a faint line under the row marks it
   as its own fixed row. Phones keep their own layout (body.mob / body.mob-land). */
(()=>{const top=document.querySelector('header.top'),tr=document.querySelector('.app > .transport'),hxw=top&&top.querySelector('.hxw'),
    brand=top&&top.querySelector('.brand'),trr=tr&&tr.querySelector('.tr-r'),app=document.getElementById('app');
  if(!top||!tr||!hxw||!brand||!trr||!app)return;
  const css=document.createElement('style');css.id='topbar';
  const D='body.topbar:not(.mob):not(.mob-land)';
  css.textContent=`
header.top .tb-br{display:none}
${D} .app{box-sizing:border-box!important}
${D} header.top{position:relative;display:flex!important;flex-wrap:wrap;align-items:center!important;justify-content:flex-start!important;
  column-gap:10px!important;row-gap:10px!important;padding:0 4px 12px!important;height:auto!important;margin-bottom:2px}
${D} header.top::after{content:"";position:absolute;left:-14px;right:-14px;bottom:0;height:1px;background:rgba(232,230,220,.09);pointer-events:none}
${D} header.top .brand{align-self:center!important;margin:0 6px 0 0!important}
${D} header.top .hxw{display:contents!important}
${D} header.top .hxw > *{align-self:center!important;margin-top:0!important;margin-bottom:0!important}
${D} header.top .tb-br{display:none;flex-basis:100%;height:0;order:4}
${D} header.top.tb2 .tb-br{display:block}
/* the order: name · clock · steps · patterns · views · menu · swing · bpm ……… master · piano · rec · play */
${D} header.top .brand{order:0}
${D} header.top > .transport{display:contents!important}
${D} header.top > .transport .clock{order:1}
${D} header.top > .transport .bar16{order:2}
${D} header.top .hxw > #pats{order:5}
${D} header.top .hxw > .hx{order:6}
${D} header.top .hxw > #menuBtn{order:7}
${D} header.top .hxw > .bpm.swp{order:8}
${D} header.top .hxw > .bpm:not(.swp){order:9}
${D} header.top > .transport .tr-r{order:10;margin-left:auto!important}
${D} header.top.tb2 > .transport .tr-r{order:3}
${D} header.top.tb2 .hxw > .bpm.swp{margin-left:auto!important}
/* narrow tablet upright: swing goes to the ☰ menu so the second row holds the rest */
${D} header.top.tb-s .hxw > .bpm.swp{display:none!important}
${D} header.top.tb2.tb-s .hxw > .bpm:not(.swp){margin-left:auto!important}
/* one height for everything in the row: 32 */
${D} header.top .hxw .patseg{height:32px!important;padding:3px!important;box-sizing:border-box;gap:2px!important}
${D} header.top .hxw .patseg .pat,${D} header.top .hxw .patseg .pind{width:26px!important;height:26px!important}
${D} header.top .hxw .patseg .pat svg{height:11px!important;width:auto!important}
${D} header.top .hxw .gbtn{height:32px!important;min-height:0!important;box-sizing:border-box}
${D} header.top .hxw .gbtn.ic{width:32px!important;padding:0!important;justify-content:center}
${D} header.top .hxw .hx-b,${D} header.top .hxw #menuBtn{height:32px!important;min-height:0!important;box-sizing:border-box}
${D} header.top .hxw .hx-b:not(.hx-daw){min-width:32px!important}
${D} header.top .hxw .ux button{width:28px!important;height:28px!important}
${D} header.top .hxw .ux{height:32px!important;align-items:center}
${D} header.top > .transport{position:static;margin:0!important;padding:0!important;background:none!important;border-radius:0!important;
  box-shadow:none!important;outline:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;filter:none!important;min-height:0!important;height:34px;
  gap:10px;color:#E8E6DC;z-index:auto}
${D} header.top > .transport::before{display:none}
${D} .app{padding-bottom:14px!important}
${D} header.top > .transport .clock{width:auto;height:auto;align-items:center}
${D} header.top > .transport #clock svg{height:18px;width:auto}
${D} header.top > .transport #pos{display:none}
/* (v247) the 16 steps as a 4 × 4 square as tall as the clock (18 px), filling row by row from the top */
${D} header.top > .transport .bar16{gap:2px;width:max-content!important;flex:none;align-self:center;grid-template-columns:repeat(4,3px)!important;grid-auto-rows:3px}
${D} header.top > .transport .bar16 i{width:3px;height:3px;border-radius:50%;background:rgba(232,230,220,.18)!important}
${D} header.top > .transport .bar16 i.on{background:rgba(232,230,220,.75)!important}
${D} header.top > .transport .tr-r{gap:4px;margin-top:0!important;margin-bottom:0!important}
${D} header.top > .transport .tr-r button{width:32px;height:32px;border-radius:50%;background:rgba(232,230,220,.08)!important;color:#E8E6DC!important;
  box-shadow:none!important;border:0!important}
${D} header.top > .transport .tr-r button svg{width:15px;height:15px}
${D} header.top > .transport .tr-r button:hover{background:rgba(232,230,220,.16)!important}
${D} header.top > .transport #recBtn i{width:10px;height:10px;background:#E5484D!important}
${D} header.top > .transport #recBtn.on,${D} header.top > .transport #recBtn.armed,${D} header.top > .transport #recBtn.rec-on{background:rgba(229,72,77,.22)!important}
${D} header.top > .transport #kbBtn.on{background:#E8E6DC!important;color:#111211!important}
${D} header.top > .transport #deckBtn{background:#F2C318!important;color:#111211!important;display:grid;place-items:center;padding:0}
${D} header.top > .transport #deckBtn:hover{background:#FFD43A!important}
${D} header.top > .transport #deckBtn svg{width:14px;height:14px}
${D} header.top .hxw .bpm{height:32px!important;padding:3px!important;gap:2px!important;box-sizing:border-box}
${D} header.top .hxw .bpm button{width:24px!important;height:24px!important}
${D} header.top .hxw .bpm button svg{width:11px!important;height:11px!important}
${D} header.top .hxw .bpm .num svg{height:12px!important;width:auto!important}
${D} header.top .hxw .bpm .bpmv{padding:0 4px!important}
${D} header.top .hxw .bpm .bpmv small,${D} header.top .hxw .bpm .bpmv span:not(.num){font-size:8px!important}
${D} header.top .hxw .patseg,${D} header.top .hxw .gbtn,${D} header.top .hxw .hx-b,${D} header.top .hxw .ux{align-self:center}
${D} header.top .hxw .patseg .pind{transform:translateX(calc(var(--pi,0) * 28px))!important}
/* compact: when the row is a little too narrow for everything (iPad), smaller gaps, steps and lib as an icon */
${D} header.top.tb-c{column-gap:6px!important}
${D} header.top.tb-c .brand{margin-right:0!important;max-width:104px;overflow:hidden}
${D} header.top.tb-c .brand em{display:inline-block;max-width:44px;overflow:hidden;text-overflow:ellipsis;vertical-align:bottom;white-space:nowrap}
${D} header.top.tb-c .hxw .ux button{width:24px!important}
${D} header.top.tb-c > .transport .bar16{gap:2px!important;grid-template-columns:repeat(4,3px)!important}
${D} header.top.tb-c > .transport .bar16 i{width:3px!important;height:3px!important}
${D} header.top.tb-c > .transport .tr-r{gap:2px!important}
${D} header.top.tb-c > .transport .tr-r button{width:30px!important;height:30px!important}
${D} header.top.tb-c .hxw #libBtn{font-size:0!important;width:32px!important;padding:0!important;justify-content:center!important;gap:0!important}
.tb-lab{display:none}
.mmenu .dock-set .tb-lab{display:inline}
.mmenu .dock-set .hx-b{height:auto;min-height:0;padding:7px 12px;gap:7px;border-radius:999px;display:inline-flex;align-items:center}
.mmenu .dock-set .hx-b svg{width:14px;height:14px}
body:not(.topbar) #deckBtn{display:none}`;
  document.head.appendChild(css);
  /* the yellow dots button: opens the master deck (it used to come up from the bottom bar) */
  const db=document.createElement('button');db.id='deckBtn';db.type='button';db.title='Master · scopes, meters and the song';db.setAttribute('aria-label','Master');
  db.innerHTML='<svg viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">'+[2,7,12].map(y=>[2,7,12].map(x=>`<circle cx="${x}" cy="${y}" r="1.6"/>`).join('')).join('')+'</svg>';
  db.onclick=()=>{if(window.__setDeck)__setDeck(true)};
  trr.insertBefore(db,trr.firstChild);
  /* where the controls go to their own row when the top row is too narrow for everything */
  const br=document.createElement('i');br.className='tb-br';br.setAttribute('aria-hidden','true');hxw.insertBefore(br,hxw.firstChild);
  /* the bar's own swipe/tap that opened the deck does not belong in the top row */
  top.addEventListener('pointerdown',e=>{if(tr.contains(e.target)&&!e.target.closest('button'))e.stopPropagation()},true);
  const home=tr.nextSibling,parent=tr.parentNode;
  /* columns, preview and motions live in the ☰ menu (next to look and midi) so the row has room for everything */
  const extra=[['setBtn','columns'],['prevBtn','preview'],['motBtn','motions']].map(([id,l])=>{const e=document.getElementById(id);if(!e)return null;
    const t=document.createElement('span');t.className='tb-lab';t.textContent=l;e.appendChild(t);return {e,p:e.parentNode,n:e.nextSibling}}).filter(Boolean);
  const menuRow=()=>document.querySelector('.mmenu .dock-set .dk-row');
  /* columns and motions open panels of their own: the menu closes first so they come up on top (as midi does) */
  let fromMenu=0;
  for(const x of extra)if(x.e.id!=='prevBtn')x.e.addEventListener('click',()=>{const m=document.querySelector('.mmenu');if(m&&!m.hidden&&window.__menu){fromMenu=performance.now();__menu.close()}},true);
  /* their panel is placed by the button, which sat in the closed menu: it goes under the ☰ button instead */
  new MutationObserver(recs=>{if(performance.now()-fromMenu>1500)return;for(const r of recs)for(const n of r.addedNodes)if(n.nodeType===1&&n.classList.contains('mo-pop')){
      const mb=document.getElementById('menuBtn');if(!mb)return;requestAnimationFrame(()=>{const q=mb.getBoundingClientRect(),w=n.getBoundingClientRect().width;
        n.style.top=Math.round(q.bottom+8)+'px';n.style.left=Math.round(Math.max(8,Math.min(q.left+q.width/2-w/2,innerWidth-w-8)))+'px'});fromMenu=0}}).observe(document.body,{childList:true});
  function placeExtra(on){const row=menuRow();for(const x of extra){if(on&&row){if(x.e.parentNode!==row)row.appendChild(x.e)}
    else if(row&&x.e.parentNode===row)x.p.insertBefore(x.e,x.n&&x.n.parentNode===x.p?x.n:null)}}
  const desk=()=>!document.body.classList.contains('mob')&&!document.body.classList.contains('mob-land');
  /* one row when it fits (brand + bar + controls), otherwise the controls go to a second row. The widths are the
     contents' own (children and gaps), so the answer does not depend on which layout is showing – no back and forth. */
  const inner=el=>{const k=[...el.children].filter(c=>getComputedStyle(c).display!=='none');const g=parseFloat(getComputedStyle(el).columnGap)||0;
    return k.reduce((a,c)=>a+c.getBoundingClientRect().width,0)+g*Math.max(0,k.length-1)};
  /* the controls: groups that are rows of their own (patterns, views) counted by their contents, never their stretched box */
  const deep=el=>{const k=[...el.children].filter(c=>!c.matches('.tb-br')&&getComputedStyle(c).display!=='none');const g=10;
    return k.reduce((a,c)=>a+(/flex/.test(getComputedStyle(c).display)&&c.children.length>1&&!c.matches('.bpm,.patseg')?inner(c):c.getBoundingClientRect().width),0)+g*Math.max(0,k.length-1)};
  let mine=null;
  function fit(){const on=desk();document.body.classList.toggle('topbar',on);placeExtra(on);
    if(on&&tr.parentNode!==top)top.insertBefore(tr,hxw);
    if(!on&&tr.parentNode!==parent)parent.insertBefore(tr,home&&home.parentNode===parent?home:null);
    if(!on){mine=null;top.classList.remove('tb-c','tb-s','tb2');return}
    const cs=getComputedStyle(top),W=top.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
    const wOf=c=>/flex/.test(getComputedStyle(c).display)&&c.children.length>1&&!c.matches('.bpm,.patseg,.tr-r,.clock')?inner(c):c.getBoundingClientRect().width;
    const vis=a=>a.filter(c=>!c.matches('.tb-br')&&getComputedStyle(c).display!=='none');
    const need=g=>{const items=vis([brand,...tr.children,...hxw.children]);
      return items.reduce((t,c)=>t+wOf(c),0)+g*(items.length-1)+parseFloat(getComputedStyle(brand).marginRight||0)+4};
    /* the second row on its own (patterns, views, menu, swing, bpm) */
    const row2=g=>{const items=vis([...hxw.children]);return items.reduce((t,c)=>t+wOf(c),0)+g*(items.length-1)+4};
    top.classList.remove('tb-c','tb-s');let two=need(10)>W;
    if(two){top.classList.add('tb-c');two=need(6)>W;if(two){top.classList.remove('tb-c');
      if(row2(10)>W){top.classList.add('tb-c');if(row2(6)>W)top.classList.add('tb-s')}}}
    mine=two;top.classList.toggle('tb2',two);if(top.classList.contains('tw'))top.classList.remove('tw')}
  /* the header's own fit sets .tw (its old two-part layout, which also reshapes the controls) – not used with this row */
  new MutationObserver(()=>{if(mine!==null&&top.classList.contains('tw'))top.classList.remove('tw')}).observe(top,{attributes:true,attributeFilter:['class']});
  {let lastMob=null;new MutationObserver(()=>{const m=!desk();if(m!==lastMob){lastMob=m;fit()}}).observe(document.body,{attributes:true,attributeFilter:['class']})}
  addEventListener('resize',()=>requestAnimationFrame(fit));
  if(window.ResizeObserver){const ro=new ResizeObserver(()=>requestAnimationFrame(fit));[...hxw.children,brand].forEach(e=>ro.observe(e))}
  fit();setTimeout(fit,150);setTimeout(fit,800);document.fonts&&document.fonts.ready.then(()=>setTimeout(fit,80));
})();

