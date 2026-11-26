/* ================= phone views (v257) =================
   1. Pads on the phone: the pads tab is itself the big pad view – the classic 4×4 like an MPC, pad 1 bottom left, the drum
      tracks in use and then the glitch pads (rev, stop, half, crush, stutter, roll) – and it is exactly as tall as the room
      between the top row and the tabs, so every pad is there without scrolling. "Full screen" is not needed there and is gone.
   2. Full screen on the phone (any card): the blurred background behind it (blur 22 px over the moving background) cost the
      phone more than everything else together, so playing stuttered after a while. On the phone the room behind a full
      screen card is plain dark instead – it is covered by the card anyway.
   3. The phone layout was 10 px taller than the screen (the top padding came on top of the full height), so the bottom of
      the yellow transport was cut off and the page could be pushed. Now it is exactly the screen.
   4. Step (the orbit) on the phone: the orbit is sized to the room, so hits / rotate / length and the track chips under it
      are there without scrolling. ================= */
(()=>{
  const css=document.createElement('style');css.id='phoneview';css.textContent=`
body.mob:not(.mob-land) #app{box-sizing:border-box}
body.mob #fullHost{-webkit-backdrop-filter:none!important;backdrop-filter:none!important;background:#17181A!important}
body.mob #panes .card.mhero[data-card="pads"]{height:var(--mpH,calc(var(--mph,420px) - 14px))!important;flex-shrink:0;display:flex;flex-direction:column;box-sizing:border-box}
body.mob .card[data-card="pads"].mhero .cfull{display:none!important}
body.mob .card[data-card="pads"].mhero .pads{flex:1;min-height:0;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;grid-template-rows:repeat(var(--mrows,4),minmax(0,1fr))!important;gap:7px!important;max-width:none!important;width:100%!important;margin:0!important;height:auto!important;aspect-ratio:auto!important}
body.mob .card[data-card="pads"].mhero .pad{grid-row:var(--mr)!important;grid-column:var(--mc)!important;aspect-ratio:auto!important;min-height:0!important;height:auto!important;width:auto!important;padding:7px 6px!important}
body.mob .card[data-card="pads"].mhero .pad.gxp{display:flex}
body.mob .card[data-card="pads"].mhero .pad.gxp::after{background:none;box-shadow:inset 0 0 0 1px currentColor}
body.mob .card[data-card="pads"].mhero .pad b{font-size:13px!important;letter-spacing:-.02em!important;max-width:calc(100% - 10px)!important}
body.mob .card[data-card="pads"].mhero .pad.gxp b{font-size:12px!important;letter-spacing:-.04em!important;max-width:calc(100% - 9px)!important}
body.mob .card[data-card="pads"].mhero .pad i{font-size:8.5px!important;max-width:100%}
body.mob .card[data-card="pads"].mhero .pad::after{width:6px!important;height:6px!important;border-radius:50%!important;right:6px!important;top:9px!important}
@media (max-width:380px){body.mob .card[data-card="pads"].mhero .pad b,body.mob .card[data-card="pads"].mhero .pad.gxp b{font-size:11px!important;letter-spacing:-.03em!important;max-width:100%!important}
  body.mob .card[data-card="pads"].mhero .pad::after{top:auto!important;bottom:9px!important;right:auto!important;left:7px!important}}
/* phone on its side: two rows of eight, pad 1 bottom left */
html body.mob-land #panes .card.mhero[data-card="pads"]{height:var(--mpH,calc(var(--mph,300px) - 22px))!important;box-sizing:border-box!important}
html body.mob-land #panes .card.mhero[data-card="pads"] .pads{grid-template-columns:repeat(8,minmax(0,1fr))!important;grid-template-rows:repeat(var(--lrows,2),minmax(0,1fr))!important;grid-auto-rows:auto!important}
html body.mob-land #panes .card.mhero[data-card="pads"] .pad{grid-row:var(--lr)!important;grid-column:var(--lc)!important}
html body.mob-land #panes .card.mhero[data-card="pads"] .pad b{font-size:11px!important;letter-spacing:-.03em!important;max-width:calc(100% - 10px)!important}
html body.mob-land #panes .card.mhero[data-card="pads"] .pad.gxp{display:flex!important}
html body.mob-land #panes .card.mhero[data-card="pads"] .pad::after{width:6px!important;height:6px!important;border-radius:50%!important;right:6px!important;top:8px!important}
html body.mob-land #panes .card.mhero[data-card="pads"] .pad.gxp::after{background:none;box-shadow:inset 0 0 0 1px currentColor}
html body.mob-land #panes .card.mhero[data-card="pads"] .cfull{display:none!important}
html body.mob-land #panes .card.mhero[data-card="pads"] .pads{gap:6px!important;min-height:0!important;flex:1 1 0!important}
body.mob-land #fullHost{-webkit-backdrop-filter:none!important;backdrop-filter:none!important;background:#17181A!important}
body.mob .card[data-card="tracks"].mhero{--orbMax:var(--moH,9999px)}
body.mob .card[data-card="tracks"].mhero .orb{max-width:min(420px,100%,var(--orbMax))!important;margin-inline:auto!important}`;
  document.head.appendChild(css);
  const panes=document.getElementById('panes'),root=document.documentElement;
  function fit(){const B=document.body.classList;if(!(B.contains('mob')||B.contains('mob-land'))||!panes)return;
    const h=panes.clientHeight;{const v=h+'px';if(panes.style.getPropertyValue('--mpH')!==v)panes.style.setProperty('--mpH',v)}
    /* on its side: place the pads in rows of eight from their number (1 = bottom left) */
    if(document.body.classList.contains('mob-land')){const ps=document.querySelector('.card[data-card="pads"] .pads');if(ps){const vis=[...ps.children].filter(e=>e.classList.contains('pad')&&e.dataset.n&&getComputedStyle(e).display!=='none'),rows=Math.max(1,Math.ceil(vis.length/8));
      ps.style.setProperty('--lrows',rows);vis.forEach(e=>{const k=+e.dataset.n-1;e.style.setProperty('--lr',rows-(k>>3));e.style.setProperty('--lc',(k&7)+1)})}}
    /* the orbit: as wide as the room left once the rest of the card is there */
    const oc=document.querySelector('.card[data-card="tracks"].mhero');
    if(oc){const o=oc.querySelector('.orb');if(o){const cur=o.getBoundingClientRect().height,rest=oc.scrollHeight-cur,room=h-rest-2;
      const mx=Math.max(150,Math.round(room));const v=mx+'px';if(oc.style.getPropertyValue('--moH')!==v)oc.style.setProperty('--moH',v)}}}
  if(panes){new ResizeObserver(fit).observe(panes);addEventListener('resize',fit);new MutationObserver(()=>requestAnimationFrame(fit)).observe(document.getElementById('app'),{attributes:true,attributeFilter:['data-v','class']});document.querySelectorAll('#panes .card[data-card="tracks"],#panes .card[data-card="pads"]').forEach(c=>new MutationObserver(()=>requestAnimationFrame(fit)).observe(c,{attributes:true,attributeFilter:['class']}));setInterval(fit,1500);fit()}
})();

