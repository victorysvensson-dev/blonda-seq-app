/* ================= Smoother (v203) =================
   1. The app is always in the studio look: the glass look (blurred cards over a moving background) and the two-colour dots look
      are gone, they cost the most to draw. The look button is removed from the menu.
   2. While idea mode is open it covers the whole app, but every card behind it went on drawing its canvases and meters 60 times a
      second (and measuring the layout to do it) – that is what made it stutter. Now the app behind is taken out of the page while
      idea mode is open: its drawing loops find nothing to draw and stop, only the clock that follows the playback keeps going.
      When idea mode closes, everything is measured again. ================= */
(()=>{
  try{localStorage.setItem('seq3-look','1')}catch(e){globalThis.__el&&globalThis.__el(e)}
  try{setLook(1);const sl=setLook;setLook=function(){sl(1)}}catch(e){globalThis.__el&&globalThis.__el(e)}
  {const b=document.getElementById('lookBtn');if(b)b.remove()}
  const css=document.createElement('style');css.textContent=`body.duo-on:not(:has(>.duo.box)) :is(#app,#bg,#dotsTint){display:none!important}
/* (v253) on iPad and computer the idea screen is a window: the app stays behind it, still (its drawing is paused), blurred by the veil */
/* the header buttons blurred what was behind them (a glass-look leftover, invisible on the flat studio background but redrawn every frame) */
#patseg,#copyPat,#libBtn,#pjBtn2,.top .bpm{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}`;document.head.appendChild(css);
  const du=document.querySelector('body>.duo');
  const sync=()=>{const on=!!du&&!du.hidden;if(document.body.classList.contains('duo-on')===on)return;document.body.classList.toggle('duo-on',on);
    if(!on)requestAnimationFrame(()=>{try{dispatchEvent(new Event('resize'))}catch(e){globalThis.__el&&globalThis.__el(e)}try{window.__hdrFit&&__hdrFit()}catch(e){globalThis.__el&&globalThis.__el(e)}try{renderAll()}catch(e){globalThis.__el&&globalThis.__el(e)}})};
  if(du){new MutationObserver(sync).observe(du,{attributes:true,attributeFilter:['hidden']});sync()}
  /* 3. Cards scrolled out of view (the panes scroll; master, analysis, mixer … are often off screen) stop drawing. Every drawing
     loop in the app already asks "can this be seen?" with offsetParent before it draws, so an element inside a card that is off
     screen now answers no (null) – an IntersectionObserver keeps track of which cards are on screen. Nothing else changes: the
     card, its controls and its sound are all still there, and it draws again the moment it scrolls into view. */
  {const OP=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'offsetParent');
   if(OP&&OP.get&&window.IntersectionObserver){
     const io=new IntersectionObserver(es=>es.forEach(e=>{e.target.__off=!e.isIntersecting}),{rootMargin:'120px'});
     const seen=new WeakSet(),watch=()=>document.querySelectorAll('.card').forEach(c=>{if(!seen.has(c)){seen.add(c);io.observe(c)}});
     watch();setInterval(watch,1500);
     Object.defineProperty(HTMLElement.prototype,'offsetParent',{configurable:true,enumerable:OP.enumerable,get(){
       let c=this.__card;if(c===undefined||(c&&!c.isConnected)){c=this.closest?this.closest('.card'):null;this.__card=c||null}
       if(c&&c.__off)return null;return OP.get.call(this)}})}}
  /* 4. (v204) One shared drawing beat. The app has a dozen separate drawing loops (orbit, pads, sound, synth, meters, loops,
     mixer …), each asking the browser for its own frame 60 times a second – and each one measuring and changing the page on its
     own, so the page was laid out and painted several times per frame. Now every loop is run together, in one go, and while the
     music plays in the main view at 30 frames a second (the clock and the sound are unaffected – they never depended on the
     drawing). Stopped, or in idea mode, everything draws at full rate as before. */
  {const r0=window.requestAnimationFrame.bind(window),c0=window.cancelAnimationFrame.bind(window);let q=new Map(),id=1e9,pend=0,last=0;
   const full=()=>!playing||document.body.classList.contains('duo-on');
   const tick=t=>{pend=0;if(!full()&&t-last<30){pend=r0(tick);return}last=t;const run=q;q=new Map();
     run.forEach(f=>{try{f(t)}catch(e){setTimeout(()=>{throw e})}})};
   window.requestAnimationFrame=f=>{const i=id++;q.set(i,f);if(!pend)pend=r0(tick);return i};
   window.cancelAnimationFrame=i=>{if(!q.delete(i))c0(i)}}
  /* 5. (v204) the cards no longer each ask for their own graphics layer (a glass-look leftover): 20 cards = 20 extra layers to
     keep in memory and to compose every frame */
  {const st=document.createElement('style');st.textContent='.card{will-change:auto}';document.head.appendChild(st)}
  /* 6. (v204) The scheduler plans the notes 0.12 s ahead and is woken every 25 ms. When the page is busy (a heavy view, a weak
     phone) it is woken late, and once it is more than 0.12 s late the notes come late – that is the stutter you hear. Now the
     plan-ahead time follows how late it is woken: after a late wake-up it plans further ahead (up to 0.4 s), and when the page is
     calm again it slowly goes back to 0.12 s, so knobs and edits still answer quickly when the device keeps up. */
  window.__LA=.12;let laT=0;
  /* test hook: how much time the scheduler had left each time it ran (below 0 = a note would come late) */
try{const sc=schedule,L={n:0,late:0,low:0,min:1};schedule=function(){try{const t=performance.now();if(laT){const gap=(t-laT)/1000;if(gap>1.5){}else if(gap>.045)window.__LA=Math.min(.4,Math.max(window.__LA,gap*1.6+.06));else window.__LA=Math.max(.12,window.__LA-.0004)}laT=t;
    if(ctx){const d=nextT-ctx.currentTime;L.n++;if(d<0)L.late++;if(d<.03)L.low++;if(d<L.min)L.min=d}}catch(e){globalThis.__el&&globalThis.__el(e)}return sc.apply(this,arguments)};
    window.__late={get:()=>({...L,la:+window.__LA.toFixed(3)}),reset:()=>{L.n=0;L.late=0;L.low=0;L.min=1}};window.__schedAhead=sec=>{const k=window.__LA;window.__LA=sec;try{sc()}finally{window.__LA=k}}}catch(e){globalThis.__el&&globalThis.__el(e)}
  /* the main animation frame: behind idea mode only follow the playback (the step and bar the rest of the app reads) */
  try{const fr=frame;frame=function(now){if(!document.body.classList.contains('duo-on'))return fr(now);requestAnimationFrame(frame);lastNow=now;
    if(ctx&&playing){const ct=ctx.currentTime;let ev=null;while(visQ.length&&visQ[0].t<=ct)ev=visQ.shift();if(ev){curStep=ev.step;curG=ev.g||0;curStepT=ev.t}}}}catch(e){console.warn('perf',e)}
})();

