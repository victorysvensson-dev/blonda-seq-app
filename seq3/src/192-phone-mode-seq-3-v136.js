/* ================= Phone mode (SEQ.3 v136) =================
   On a phone the screen is small and the Claude app takes part of it, so: a compact top (brand + tempo on one row, the
   pattern and the tools on one sliding row), no scroll rails, a slimmer transport, and each tab opens with its main card
   filling the screen – the pads as big pads (2 × 5), the grid, the mixer. Turn the phone sideways and the main card takes
   the whole screen (pads 5 × 2). A pad card in fullscreen fills the screen too. */
(()=>{
  const css=document.createElement('style');css.textContent=`
@media (max-width:719px){
  body.mob .top{display:grid!important;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"brand bpm" "dock dock";align-items:center;gap:6px 8px;padding-bottom:4px!important;height:auto!important;min-height:0!important}
  body.mob .top .brand{grid-area:brand;max-width:none!important;padding:0!important;min-height:0}
  body.mob .top .hxw{display:contents!important}
  body.mob .top .bpm{grid-area:bpm;transform:scale(.86);transform-origin:right center;margin:0!important}
  body.mob .top .dock-slot{grid-area:dock;height:46px!important;min-height:0!important;margin:0!important;position:relative!important;top:0!important}
  body.mob #dock{position:relative!important;inset:auto!important;width:100%!important;padding:4px 6px!important}
  body.mob #dockH{height:8px!important;min-height:0!important;opacity:.6}
  body.mob #pats{overflow-x:auto;overflow-y:hidden;scrollbar-width:none;flex-wrap:nowrap!important;justify-content:flex-start!important;gap:6px!important;-webkit-overflow-scrolling:touch}
  body.mob #pats::-webkit-scrollbar{display:none}
  body.mob #pats>*{flex:none!important}
  body.mob #pats .gbtn{width:auto!important;min-width:34px;padding:0 10px!important;display:inline-flex!important;align-items:center;gap:6px;white-space:nowrap}
  body.mob #pats .hx{display:flex;gap:6px;flex:none}
  body.mob .srail{display:none!important}
  body.mob .transport{padding-top:6px!important;padding-bottom:6px!important;min-height:0!important}
  body.mob .transport .clock{transform:scale(.72);transform-origin:left center;margin-right:-50px}
  body.mob .transport .tr-r button{width:44px!important;height:44px!important}
  /* the main card of the tab first, and the pads filling the screen */
  body.mob #panes{display:flex!important;flex-direction:column}
  body.mob #panes>.pane{display:contents!important}
  body.mob #panes>.hinge{display:none!important}
  body.mob #panes .card.mhero{order:-1}
  body.mob #panes .card.mhero[data-card="pads"]{display:flex!important;flex-direction:column;height:calc(var(--mph,420px) - 14px);min-height:300px}
  body.mob .card[data-card="pads"].mhero .pads,body.mob .fullhost .card[data-card="pads"] .pads{flex:1;display:grid!important;grid-template-columns:repeat(2,1fr)!important;grid-auto-rows:1fr!important;height:auto!important;min-height:0}
  body.mob .card[data-card="pads"].mhero .pad,body.mob .fullhost .card[data-card="pads"] .pad{height:auto!important;min-height:0!important;aspect-ratio:auto!important}
  body.mob .card[data-card="pads"].mhero .pad b,body.mob .fullhost .card[data-card="pads"] .pad b{font-size:22px}
  body.mob .fullhost .card[data-card="pads"]{display:flex!important;flex-direction:column;height:calc(100dvh - 24px)!important;width:100%!important;zoom:1!important}
}
/* sideways on a phone: almost everything goes, the main card gets the screen */
@media (max-height:500px) and (orientation:landscape) and (max-width:1000px){
  body.mob-land .top .brand,body.mob-land .top .hxw,body.mob-land .top .dock-slot{display:none!important}
  body.mob-land .top{height:0!important;min-height:0!important;padding:0!important;margin:0!important;overflow:hidden}
  body.mob-land #app{display:grid!important;grid-template-columns:1fr auto;grid-template-rows:minmax(0,1fr) auto;grid-template-areas:"panes panes" "tabs foot";height:100dvh!important}
  body.mob-land #panes{grid-area:panes;height:auto!important;max-height:none!important}
  body.mob-land #tabs{grid-area:tabs;margin:0 6px 4px!important}
  body.mob-land .transport{grid-area:foot;padding:2px 8px!important;margin:0!important}
  body.mob-land .transport .clock{display:none!important}
  body.mob-land .srail{display:none!important}
  body.mob-land #panes{display:flex!important;flex-direction:column}
  body.mob-land #panes>.pane{display:contents!important}
  body.mob-land #panes>.hinge{display:none!important}
  body.mob-land #panes .card.mhero{order:-1}
  body.mob-land #panes{overflow-y:auto!important;overflow-x:hidden!important;padding:6px 10px!important;gap:10px}
  body.mob-land #tabs{display:flex!important;position:relative!important;gap:3px;align-items:stretch;background:rgba(0,0,0,.28);border-radius:14px;padding:4px!important;height:44px;align-self:center}
  body.mob-land #tabs #tabInd{display:none!important}
  body.mob-land #tabs button{flex:1;border:0;background:none;color:inherit;font:500 11px var(--f-mono,monospace);letter-spacing:.06em;border-radius:10px;padding:0 8px;opacity:.7;text-transform:lowercase}
  body.mob-land #tabs button.cur{background:#F2EFE6;color:#141516;opacity:1}
  body.mob-land .transport .tr-r button{width:40px!important;height:40px!important}
  body.mob-land .transport{height:auto!important;min-height:0!important;align-self:center}
  body.mob-land .transport{position:relative!important;inset:auto!important;transform:none!important;width:auto!important;border-radius:16px!important}
  ${['seq','pads','grid','mix','live'].map(v=>`body.mob-land #panes[data-v="${v}"] .card:not(.in-${v}):not(.mhero){display:none!important}`).join('\n  ')}
  body.mob-land #panes .card.mhero[data-card="pads"]{display:flex!important;flex-direction:column;height:calc(var(--mph,300px) - 22px);flex:none}
  body.mob-land .card[data-card="pads"].mhero .pads{flex:1;display:grid!important;grid-template-columns:repeat(5,1fr)!important;grid-auto-rows:1fr!important;height:auto!important}
  body.mob-land .card[data-card="pads"].mhero .pad{height:auto!important;min-height:0!important;aspect-ratio:auto!important}
}`;document.head.appendChild(css);
  const HERO={seq:'tracks',pads:'pads',grid:'grid',mix:'mixer',live:'perform'};
  const panes=document.getElementById('panes'),hx=document.querySelector('header .hx'),pats=document.getElementById('pats');
  let hxHome=null;
  const isPhone=()=>innerWidth<=719,isLand=()=>innerHeight<=500&&innerWidth>innerHeight&&innerWidth<=1000;
  function apply(){const ph=isPhone(),ld=isLand();document.body.classList.toggle('mob',ph);document.body.classList.toggle('mob-land',ld);
    /* the tool buttons ride along on the pattern row on a phone */
    if(ph&&!ld&&hx&&pats&&hx.parentNode!==pats){if(!hxHome){hxHome=document.createComment('hx');hx.before(hxHome)}pats.prepend(hx)}
    else if((!ph||ld)&&hx&&hxHome&&hx.parentNode===pats){hxHome.replaceWith(hx);hxHome=null}
    hero();requestAnimationFrame(size)}
  function hero(){if(!panes)return;const v=panes.dataset.v,k=HERO[v];document.querySelectorAll('#panes .card.mhero').forEach(c=>{if(c.dataset.card!==k)c.classList.remove('mhero')});
    if(!(isPhone()||isLand())||!k)return;const c=document.querySelector('#panes .card[data-card="'+k+'"]');if(c&&(c.classList.contains('in-'+v)||k==='pads'))c.classList.add('mhero')}
  function size(){if(!panes)return;document.documentElement.style.setProperty('--mph',panes.clientHeight+'px')}
  addEventListener('resize',()=>{clearTimeout(apply._t);apply._t=setTimeout(apply,80)});addEventListener('orientationchange',()=>setTimeout(apply,250));
  if(panes)new MutationObserver(()=>{hero();size()}).observe(panes,{attributes:true,attributeFilter:['data-v']});
  apply();setTimeout(apply,600);
  window.__mob={apply,hero};
})();

