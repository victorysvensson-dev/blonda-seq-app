/* ================= (v270) the sound must never stay late =================
   On the iPhone the page renders its sound a little ahead and hands it to the system through a buffer. When the phone could not
   keep up for a moment, the page afterwards stayed ahead of what is heard – in the video from 22 Nov every pad came 1.6 s after the
   tap, and it stayed that way. That shows as the audio clock (ctx.currentTime) having moved further than real time: normally the
   two run side by side. Here the distance is watched; when the sound has run more than 0.3 s ahead for over a second, the audio
   output is restarted (a short pause), which empties the buffer – everything is in time again, and a short note says so. ================= */
(()=>{try{let base=null,over=0,lastFix=0,lastNow=0;
  const fix=()=>{lastFix=performance.now();base=null;over=0;const c=ctx;try{c.suspend().then(()=>setTimeout(()=>{c.resume().catch(()=>{})},40)).catch(()=>{})}catch(e){globalThis.__el&&globalThis.__el(e)}
    try{toast('The sound fell behind · caught up again')}catch(e){globalThis.__el&&globalThis.__el(e)}window.__latFix=(window.__latFix||0)+1};
  setInterval(()=>{const c=typeof ctx!=='undefined'?ctx:null,now=performance.now();if(!c||c.state!=='running'||document.hidden){base=null;over=0;lastNow=now;return}
    /* a long gap in this timer (the page was frozen) says nothing about the sound buffer: start over */
    if(lastNow&&now-lastNow>2000){base=null;over=0}lastNow=now;
    const off=c.currentTime-now/1000;if(base==null||off<base)base=off;else base+=.0000175;/* the audio clock and the system clock may differ by up to ~70 ppm */
    const lead=off-base;window.__latLead=lead;
    if(lead>.3)over++;else over=0;
    if(over>=5&&now-lastFix>8000)fix()},250);
  window.__lat={lead:()=>window.__latLead||0,fixes:()=>window.__latFix||0,fix}}catch(e){console.warn('latfix',e)}})();

