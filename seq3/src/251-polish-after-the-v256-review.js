/* ================= polish after the v256 review =================
   1. The length handles at the end of each lane are placed in pixels. They were only placed again when the drum grid
      changed size, so in the synth card (and after switching view on the phone) they stayed where an old, wider layout
      put them – out past the edge of the card. Now every grid that holds lanes is watched.
   2. Touch: the orbit's − / +, the effect page dots and the pattern buttons A–D were 6–26 px – hard to hit with a finger.
      They keep their look but get a bigger invisible touch area.
   3. Pads in a narrow pads card (iPad upright): the name lost one letter to the on/off pill ("ki…"). In a narrow card the
      pill becomes a small dot, so the whole name fits.
   4. Pads made big on the phone: the 16 pads stood in two set columns plus two narrow extra ones, so they were thin and the
      names were cut ("re.", "st."). Now four even columns over the whole width, the name a little smaller, the pill a dot.
   5. Loops in a narrow card: the name had 26 px ("loo…"). In a narrow card the volume goes to its own line under the loop,
      so the name gets the room.
   6. Live (the XY pad) on the phone: "filter off" lay on top of the "echo + space" label, and the lower tags touched the
      "lowpass" label. The tags now keep clear of the labels at the edges.
   7. The selected track in the orbit list: a white track's colour square disappeared on the white button – it gets a thin edge. ================= */
(()=>{
  const css=document.createElement('style');css.id='polish256';css.textContent=`
html.coarse .orb-ctl button,html.coarse .dl-dots button,html.coarse .gpats button{position:relative}
html.coarse .orb-ctl button::after,html.coarse .gpats button::after{content:"";position:absolute;inset:-9px -4px}
html.coarse .dl-dots{gap:14px}html.coarse .dl-dots button::after{content:"";position:absolute;inset:-9px -7px}
.card[data-card="pads"]{container-type:inline-size}
@container (max-width:420px){.card[data-card="pads"] .pad::after{width:6px!important;height:6px!important;border-radius:50%!important;right:6px!important;top:8px!important}.card[data-card="pads"] .pad b{max-width:calc(100% - 9px)!important}}
body.mob .fullhost .card[data-card="pads"] .pads{grid-template-columns:repeat(4,minmax(0,1fr))!important;width:100%;max-width:100%!important;margin-inline:0}
body.mob .fullhost .card[data-card="pads"] .pad b{font-size:13px!important;letter-spacing:-.02em!important;max-width:calc(100% - 10px)!important}
body.mob .fullhost .card[data-card="pads"] .pad::after{width:6px!important;height:6px!important;border-radius:50%!important;right:6px!important;top:8px!important}
.card[data-card="loops"]{container-type:inline-size}
@container (max-width:470px){.card[data-card="loops"] .lp{grid-template-columns:26px minmax(0,1fr) auto 22px!important;row-gap:6px}
  .card[data-card="loops"] .lp>.on{grid-column:1;grid-row:1}.card[data-card="loops"] .lp>.w{grid-column:2;grid-row:1}.card[data-card="loops"] .lp>.lpk{grid-column:3;grid-row:1}
  .card[data-card="loops"] .lp>.x{grid-column:4;grid-row:1}.card[data-card="loops"] .lp>.vol{grid-column:2/4;grid-row:2}}
.xy .xtag.x1{top:max(10%,26px)}.xy .xtag.x2{top:max(6%,22px)}.xy .xtag.x5{bottom:max(12%,26px)}.xy .xtag.x6{bottom:max(16%,26px)}
.orb-trk button.on i{box-shadow:0 0 0 1px rgba(23,24,26,.55)}`;document.head.appendChild(css);
  /* 1b. A card made big is zoomed (CSS zoom, e.g. 1.2). The handle's place was measured on screen (zoomed pixels) but set
     as an unzoomed position, so in a big synth card the handles stood 20 % too far right – out past the steps. The measured
     place is now divided by the card's zoom. (Where the browser already measures unzoomed, the zoom reads as 1.) */
  try{const one=renderLens;renderLens=function(){one.apply(this,arguments);document.querySelectorAll('.lenh').forEach(h=>{const op=h.offsetParent;if(!op||!op.offsetWidth||!h.style.left)return;
      const k=op.getBoundingClientRect().width/op.offsetWidth;if(k>0&&Math.abs(k-1)>.01)h.style.left=(parseFloat(h.style.left)/k)+'px'})}}catch(e){console.warn('polish lens zoom',e)}
  try{const seen=new WeakSet(),ro=new ResizeObserver(()=>{try{renderLens()}catch(e){globalThis.__el&&globalThis.__el(e)}});
    const watch=()=>{document.querySelectorAll('.lenh').forEach(h=>{const g=h.closest('.grid')||h.parentElement;if(g&&!seen.has(g)){seen.add(g);ro.observe(g)}})};
    watch();setInterval(watch,2000);
    /* and a light check: a visible handle standing past the end of its steps is placed again (whatever moved the steps) */
    setInterval(()=>{for(const h of document.querySelectorAll('.lenh')){const op=h.offsetParent;if(op&&h.offsetLeft>op.offsetWidth+6){try{renderLens()}catch(e){globalThis.__el&&globalThis.__el(e)}break}}},600);
    /* a view change shows other grids: place their handles at once */
    {const app=document.getElementById('app');if(app)new MutationObserver(()=>{requestAnimationFrame(()=>{try{renderLens()}catch(e){globalThis.__el&&globalThis.__el(e)}});setTimeout(()=>{try{renderLens()}catch(e){globalThis.__el&&globalThis.__el(e)}},350)}).observe(app,{attributes:true,attributeFilter:['data-v']})}}catch(e){console.warn('polish lens',e)}
})();

