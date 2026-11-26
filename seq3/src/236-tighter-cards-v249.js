/* ================= tighter cards (v249) =================
   1. The sound card is smaller: the decay number, its curve and text, and the four tiles take less height.
   2. Buses: when the mixer is two columns wide, drums takes the whole first row and synth and loops sit side by side
      under it (there was an empty square next to loops). One or three columns stay as they were.
   3. The start screen: "tap to start" sits in the middle between SEQ.3 and the text under it. ================= */
(()=>{
  const css=document.createElement('style');css.id='cardfit';
  css.textContent=`
.card.sndcard .snd-hero{padding:2px 14px 10px!important}
.card.sndcard .snd-big b{font-size:40px!important}
.card.sndcard .snd-big em{font-size:14px!important}
.card.sndcard #sdChart{height:44px!important}
.card.sndcard .snd-hero p{margin:6px 0 0!important;font-size:11px!important;line-height:1.4!important}
.card.sndcard .snd-grid{gap:6px!important;padding:8px!important}
.card.sndcard .snd-tile{min-height:96px!important;padding:10px 12px!important}
.card.sndcard .snd-tile.wide{min-height:0!important}
.card.sndcard .snd-num{font-size:26px!important}
.card.sndcard .t-lvl .lvl-v .snd-num{font-size:28px!important}
.card.sndcard .t-lvl #sdBurst{height:50px!important}
.card.sndcard #sdBars{height:42px!important;margin-top:8px!important}
.card.sndcard #sdStep{height:44px!important;margin-top:6px!important}
.card.sndcard #sdPanC{height:30px!important}
.card.sndcard .pan-row{grid-template-columns:52px 1fr!important}
.card.master.mx2 .m2-lanes{container-type:inline-size}
@container (min-width:390px) and (max-width:589.98px){.card.master.mx2 .m2-lanes>.m2-lane:first-child{grid-column:span 2}.card.master.mx2 .m2-lanes>.m2-lane:first-child .m2-hc{flex:none;height:110px}}
.start button{gap:0!important}
.start .go{margin:30px 0!important}
.start p{margin:0!important}`;
  document.head.appendChild(css);
  /* 4. (v251) Fullscreen – a card made big, or the whole synth – starts under the top row, so the menu row is always there,
     and ends above the keyboard when the keyboard is open.
     The row's bottom edge is measured (it changes height between phone, iPad and Mac, one or two rows). */
  const top=document.querySelector('header.top'),root=document.documentElement;
  const css2=document.createElement('style');css2.id='fullhdr';
  css2.textContent=`#fullHost,#rs{top:var(--hdrB,0px)!important;bottom:var(--kbB,0px)!important;height:auto!important}
.fullhost .card[data-card="pads"] .pads{max-width:min(100%,calc((100vh - var(--hdrB,0px) - var(--kbB,0px) - 170px) * 5 / var(--mrows,4)))!important}
body .fullhost .card[data-card="pads"].pf-on .pads{max-width:min(calc(100% - var(--pfr,100px) * 2),calc((100vh - var(--hdrB,0px) - var(--kbB,0px) - 170px) * 5 / var(--mrows,4)))!important}`;document.head.appendChild(css2);
  const meas=()=>{if(!top)return;const r=top.getBoundingClientRect(),b=top.offsetParent||getComputedStyle(top).display!=='none'?Math.max(0,Math.round(r.bottom+6)):0;
    if(root.style.getPropertyValue('--hdrB')!==b+'px')root.style.setProperty('--hdrB',b+'px');
    /* the keyboard, when it is open, stays playable under a fullscreen card too */
    const kb=document.getElementById('kb'),kv=kb&&!kb.hidden&&kb.offsetParent?Math.max(0,Math.round(innerHeight-kb.getBoundingClientRect().top+4)):0;
    if(root.style.getPropertyValue('--kbB')!==kv+'px')root.style.setProperty('--kbB',kv+'px')};
  if(top){new ResizeObserver(meas).observe(top);const kbe=document.getElementById('kb');if(kbe){new ResizeObserver(meas).observe(kbe);new MutationObserver(()=>{meas();setTimeout(meas,520)}).observe(kbe,{attributes:true,attributeFilter:['hidden']});kbe.addEventListener('animationend',meas)}addEventListener('resize',meas);new MutationObserver(meas).observe(document.body,{attributes:true,attributeFilter:['class']});setInterval(meas,1500);meas()}
})();

