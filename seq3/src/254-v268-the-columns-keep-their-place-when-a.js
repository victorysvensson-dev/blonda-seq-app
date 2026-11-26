/* ================= (v268) the columns keep their place when a card above changes height =================
   Chrome keeps what you look at in place when something above it grows or shrinks (scroll anchoring). Safari – and so the
   Mac, iPad and iPhone app – does not: a card higher up that changed height (when the sound starts, a meter or a text that
   appears …) pushed everything below it down, so the bottom of a column slid out of view. Here the same thing is done by
   hand, only where the browser does not do it itself. ================= */
(()=>{try{if(window.CSS&&CSS.supports&&CSS.supports('overflow-anchor','auto'))return;const panes=document.getElementById('panes');if(!panes||!window.ResizeObserver)return;
  const A=new WeakMap();/* pane -> {el, off}: the first card that reaches into view and where its top was */
  const vis=c=>c.getClientRects().length>0;
  const pick=p=>{const pt=p.getBoundingClientRect().top;for(const c of p.children){if(!c.classList||!c.classList.contains('card')||!vis(c))continue;const r=c.getBoundingClientRect();if(r.bottom>pt+1){A.set(p,{el:c,off:r.top-pt});return}}A.delete(p)};
  let busy=false;
  const fix=p=>{const a=A.get(p);if(a&&a.el.isConnected&&a.el.parentElement===p&&p.scrollTop>0){const d=a.el.getBoundingClientRect().top-p.getBoundingClientRect().top-a.off;if(Math.abs(d)>.5){busy=true;p.scrollTop+=d;busy=false}}pick(p)};
  const ro=new ResizeObserver(es=>{const ps=new Set();es.forEach(e=>{const p=e.target.parentElement;if(p&&p.parentElement===panes)ps.add(p)});ps.forEach(fix)});
  const seen=new WeakSet();
  const watch=()=>{panes.querySelectorAll(':scope>.pane').forEach(p=>{if(!seen.has(p)){seen.add(p);pick(p)}
    p.querySelectorAll(':scope>.card').forEach(c=>{if(!seen.has(c)){seen.add(c);ro.observe(c)}})})};
  /* where you are: noted on every scroll of a column (one listener for all of them, so a column added later counts too) */
  document.addEventListener('scroll',e=>{const p=e.target;if(!busy&&p&&p.parentElement===panes)pick(p)},{passive:true,capture:true});
  watch();new MutationObserver(()=>{watch();panes.querySelectorAll(':scope>.pane').forEach(pick)}).observe(panes,{childList:true,subtree:false});
  panes.querySelectorAll(':scope>.pane').forEach(p=>new MutationObserver(()=>{watch();pick(p)}).observe(p,{childList:true}));
  setTimeout(()=>{const x=panes.querySelector(':scope>.pane.extra');if(x&&!x.__anc){x.__anc=1;new MutationObserver(()=>{watch();pick(x)}).observe(x,{childList:true});watch()}},400)}catch(e){console.warn('anchor',e)}})();

