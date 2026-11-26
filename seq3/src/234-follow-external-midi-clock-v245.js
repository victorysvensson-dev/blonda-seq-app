/* ================= follow external MIDI clock (v245) =================
   Tempo, start, stop and the beat itself follow the clock (OP-XY, EP-133, Ableton …).
   - Each tick's own arrival time is used (Web MIDI timeStamp; in the app CoreMIDI's), not the moment the page gets
     round to it, so a busy page or messages arriving in batches do not shake the timing.
   - Tempo: a straight line through the last ~3 beats of ticks (least squares) – steady, and it notices a tempo
     change within a few ticks (then only the newest ticks are kept).
   - The beat: every tick the next step's time is set from that line, converted to the audio clock at the moment the
     sound is heard (getOutputTimestamp), so SEQ.3 is heard together with the instrument and cannot drift away.
   - Start begins on the first tick after Start (as MIDI says); Continue begins at the song position (0xF2).
   (v252) - The page clock → audio clock step is the median of the last samples: WebKit moves the audio clock in whole
     buffers, which shook the old average by several ms.
   - "sync offset" in the MIDI panel moves SEQ.3 earlier or later against the instrument (ms), e.g. for a slow output.
   - The MIDI panel shows how steady the clock comes in (jitter) and how close SEQ.3 sits on it.
   ================= */
(()=>{
  const N0=72,MIN=6;
  const C={t:[],i:[],cnt:0,last:0,b:0,a:0,off:null,run:false,pend:null,base:null,spp:0,bpm:0,applied:0,shown:0,neg:0,pos:0,os:[],jit:0,err:[]};
  const LSO='blonda.clk.off';let user=0;try{user=+localStorage.getItem(LSO)||0}catch(e){globalThis.__el&&globalThis.__el(e)}
  /* Two kinds of audio clock reading. A real output time stamp (its performanceTime is when that sample is heard, a little
     in the past): the median of the last readings. A reading that is just "now" (no time stamp, or one that only repeats
     the present – the audio clock then moves in whole buffers): the highest of the last readings is the one taken right
     at a buffer edge, and the output latency is taken off so it still means "heard". */
  function sample(){const now=performance.now();try{const ts=ctx.getOutputTimestamp&&ctx.getOutputTimestamp();
      if(ts&&ts.performanceTime>0&&ts.contextTime>0&&now-ts.performanceTime>.75)return {o:ts.contextTime-ts.performanceTime/1000,k:'ots'}}catch(e){globalThis.__el&&globalThis.__el(e)}
    return {o:ctx.currentTime-now/1000,k:'now'}}
  function toCtx(ms){/* page ms → audio clock seconds (the sample that is heard at that moment), plus the sync offset */
    let r=sample();
    /* the kind is sticky: one odd reading doesn't switch it (only 24 in a row do) */
    if(C.ok==='ots'&&r.k==='now'){C.bad=(C.bad||0)+1;if(C.bad<24&&C.off!=null)return ms/1000+C.off+user/1000}else C.bad=0;
    if(r.k!==C.ok||(C.off!=null&&Math.abs(r.o-(C.raw??r.o))>.25))C.os.length=0;C.ok=r.k;C.raw=r.o;
    C.os.push(r.o);if(C.os.length>48)C.os.shift();
    if(r.k==='ots'){const so=C.os.slice().sort((a,b)=>a-b);C.off=so[so.length>>1]}
    else C.off=Math.max(...C.os)-(ctx.outputLatency||ctx.baseLatency||0);
    return ms/1000+C.off+user/1000}
  function fit(){const n=C.t.length;if(n<2)return false;let si=0,st=0;for(let k=0;k<n;k++){si+=C.i[k];st+=C.t[k]}const mi=si/n,mt=st/n;let sxx=0,sxy=0;
    for(let k=0;k<n;k++){const di=C.i[k]-mi;sxx+=di*di;sxy+=di*(C.t[k]-mt)}if(!sxx)return false;C.b=sxy/sxx;C.a=mt-C.b*mi;return C.b>0}
  const at=i=>C.a+C.b*i;/* page ms of tick i */
  function tick(ms){
    if(C.last&&ms-C.last>250){C.t.length=0;C.i.length=0}/* the clock stopped for a while: start the line again */
    C.last=ms;C.cnt++;
    /* a tempo change: the newest ticks keep landing on one side of the line → keep only them */
    if(C.t.length>=MIN&&C.b){const r=ms-at(C.cnt),lim=Math.max(1.5,C.b*.06);if(r>lim){C.pos++;C.neg=0}else if(r<-lim){C.neg++;C.pos=0}else{C.pos=C.neg=0}
      if(C.pos>=4||C.neg>=4){C.t.splice(0,C.t.length-4);C.i.splice(0,C.i.length-4);C.pos=C.neg=0}}
    C.t.push(ms);C.i.push(C.cnt);if(C.t.length>N0){C.t.shift();C.i.shift()}
    const ok=fit();
    if(ok&&C.t.length>=MIN){let q=0;const n=Math.min(24,C.t.length);for(let k=C.t.length-n;k<C.t.length;k++){const r=C.t[k]-at(C.i[k]);q+=r*r}C.jit=Math.sqrt(q/n)}
    if(ok&&C.t.length>=MIN){const bpm=60000/(C.b*24);if(bpm>=30&&bpm<=300){C.bpm=bpm;
      if(Math.abs(bpm-S.bpm)>.01){S.bpm=Math.round(bpm*100)/100;const now=performance.now();
        if(Math.round(S.bpm)!==C.shown){C.shown=Math.round(S.bpm);try{setDM($('#bpmNum'),String(C.shown))}catch(e){globalThis.__el&&globalThis.__el(e)}}
        if(now-C.applied>400){C.applied=now;try{applyMaster()}catch(e){globalThis.__el&&globalThis.__el(e)}}}}}
    if(C.pend){/* Start / Continue: the first tick after it is the downbeat (or the song position) */
      const g=C.pend.g;C.pend=null;try{initAudio()}catch(e){globalThis.__el&&globalThis.__el(e)}if(!ctx)return;if(playing)stop();
      C.base={cnt:C.cnt,g};window.__extStart={t:toCtx(ms),g};play();C.run=playing;return}
    if(!playing)C.run=false;/* stopped here: the next start of our own is not locked to the clock */
    if(!ok||!(C.run&&playing&&ctx)||C.t.length<3)return;
    /* the beat: the next step to be planned (gstep) belongs to tick base.cnt + 6 per step */
    const K=C.base.cnt+(gstep-C.base.g)*6,target=toCtx(at(K)),d=target-nextT,sd=stepDur();
    C.err.push(d*1000);if(C.err.length>48)C.err.shift();
    if(Math.abs(d)<sd*.5){startT+=d;nextT+=d}
    else{startT+=d;nextT=Math.max(target,ctx.currentTime+.003)}}
  /* Start / Continue. The clock usually runs before Start (OP-XY, EP-133 and Ableton all send it), so the tempo is
     known and the downbeat tick can be planned before it arrives; otherwise SEQ.3 starts on the first tick. */
  function begin(g,ms){C.pend=null;
    if(C.t.length>=MIN&&C.b&&ms-C.last<250){try{initAudio()}catch(e){globalThis.__el&&globalThis.__el(e)}if(!ctx){C.pend={g};return}if(playing)stop();
      C.base={cnt:C.cnt+1,g};window.__extStart={t:toCtx(at(C.cnt+1)),g};play();C.run=playing}
    else C.pend={g}}
  window.CLK={
    toCtx(ms){return toCtx(ms)},/* (v284) Ableton Link uses the same page → audio clock step */
    msg(st,d,ms){if(ms==null||!(ms>0))ms=performance.now();
      if(st===0xF8)tick(ms);
      else if(st===0xFA){C.spp=0;begin(0,ms)}
      else if(st===0xFB){begin(C.spp,ms)}
      else if(st===0xF2){C.spp=(d[1]|(d[2]<<7))}
      else if(st===0xFC){C.pend=null;C.run=false;if(playing)stop()}
      return C.bpm},
    _st:()=>({bpm:C.bpm,n:C.t.length,run:C.run,b:C.b,off:C.off,cnt:C.cnt,base:C.base,jit:C.jit,user}),
    /* the MIDI panel: sync offset and how it holds */
    panelHTML(){return `<div class="clk-row"><span>sync offset<small>move SEQ.3 earlier (−) or later (+) against the instrument</small></span><div class="clk-off"><button data-co="-1" aria-label="Earlier">−</button><b id="clkOff">${user>0?'+':''}${user} ms</b><button data-co="1" aria-label="Later">+</button></div></div><div class="clk-st" id="clkSt">${stat()}</div>`},
    bindPanel(el){el.querySelectorAll('[data-co]').forEach(b=>{let t=0;const go=()=>{user=Math.max(-80,Math.min(80,user+(+b.dataset.co)));try{localStorage.setItem(LSO,String(user))}catch(e){globalThis.__el&&globalThis.__el(e)}const o=el.querySelector('#clkOff');if(o)o.textContent=(user>0?'+':'')+user+' ms'};
      b.onpointerdown=e=>{e.preventDefault();go();clearInterval(t);let n=0;t=setInterval(()=>{if(++n>4)go()},90)};b.onpointerup=b.onpointerleave=b.onpointercancel=()=>clearInterval(t)})},
    _reset(){C.t.length=0;C.i.length=0;C.last=0;C.run=false;C.pend=null}};
  function stat(){if(!C.bpm||performance.now()-C.last>1000)return 'waiting for clock …';const e=C.err.slice(-24),m=e.length?e.reduce((a,b)=>a+Math.abs(b),0)/e.length:0;
    return `tempo <b>${C.bpm.toFixed(2)}</b> · clock jitter <b>${C.jit.toFixed(1)} ms</b>${C.run?` · on the beat <b>±${m.toFixed(1)} ms</b>`:''}`}
  setInterval(()=>{const el=document.getElementById('clkSt');if(el)el.innerHTML=stat()},500);
  const css=document.createElement('style');css.textContent=`.clk-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:6px 0 4px}.clk-row span{display:flex;flex-direction:column;gap:2px;font-size:11px}.clk-row small{font-size:9px;opacity:.55}
.clk-off{display:flex;align-items:center;box-shadow:inset 0 0 0 1px rgba(232,230,220,.18)}.clk-off button{width:30px;height:28px;font-size:14px;color:inherit;background:none;border:0;touch-action:none}.clk-off b{min-width:64px;text-align:center;font:500 11px var(--f-mono)}
.clk-st{font:10px var(--f-mono);opacity:.7;margin-bottom:6px}.clk-st b{font-weight:500;opacity:1}`;document.head.appendChild(css);
})();

