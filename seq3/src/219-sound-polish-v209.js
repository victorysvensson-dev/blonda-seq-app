/* ================= Sound polish (v209) =================
   1. Envelopes that are interrupted (a closed hat choking an open hat, a mono voice retriggered, a duck, a fade) now continue
      from where they really are. Before, the automation jumped back to its last fixed point, so e.g. an open hat stayed at full
      level until the choke, and how much depended on how far ahead the scheduler happened to work.
      (webpatch turns every cancelScheduledValues into cancelAndHoldAtTime; browsers without it keep the old behaviour.)
   2. Stop is stop: notes the scheduler had already queued for after the moment you press stop are cancelled. Notes that are
      already sounding ring out as before, and the echo and reverb tails stay.
   3. Changing the reverb size no longer cuts the reverb: the new room takes over what comes in from now on, while the old
      one rings out. ================= */
(()=>{
  if(window.AudioParam&&!AudioParam.prototype.cancelAndHoldAtTime)AudioParam.prototype.cancelAndHoldAtTime=AudioParam.prototype.cancelScheduledValues;

  /* ---- 2. queued notes: while a sequencer note is scheduled ahead, collect the sound sources it starts ---- */
  let CAP=null;const PEND=[];
  for(const C of [window.OscillatorNode,window.AudioBufferSourceNode,window.ConstantSourceNode]){if(!C)continue;const P=C.prototype,st=P.start;
    P.start=function(...a){if(CAP)CAP.push(this);return st.apply(this,a)}}
  window.__trgCap=(t,fn)=>{const A=__seq.Aref(),c=A&&A.out&&A.out.context;if(!c||t<=c.currentTime+.004)return fn();
    const prev=CAP,mine=[];CAP=mine;try{return fn()}finally{CAP=prev;
      if(mine.length){PEND.push({t,nodes:mine});const now=c.currentTime;while(PEND.length&&PEND[0].t<now-.05)PEND.shift();if(PEND.length>400)PEND.splice(0,PEND.length-400)}}};
  window.__stopGate=()=>{const A=__seq.Aref(),c=A&&A.out&&A.out.context;if(!c){PEND.length=0;return}const now=c.currentTime;
    /* stopping a source at its own start time means it never sounds */
    for(const r of PEND)if(r.t>now+.002)for(const n of r.nodes){try{n.stop(r.t)}catch(e){globalThis.__el&&globalThis.__el(e)}}PEND.length=0};

  /* ---- 3. reverb size: two rooms take turns ---- */
  let cur=0,busy=false,pend=null;
  function go(){const A=__seq.Aref(),c=A.out.context,R=A.rv,n=1-cur,N=R[n],C=R[cur],buf=pend;pend=null;busy=true;
    const t=c.currentTime;N.o.gain.cancelAndHoldAtTime(t);N.o.gain.setTargetAtTime(0,t,.012);/* the idle room may still hold an older tail: fade it */
    setTimeout(()=>{const t2=c.currentTime+.02;N.cv.buffer=buf;
      N.o.gain.cancelAndHoldAtTime(t2);N.o.gain.setValueAtTime(1,t2);
      N.i.gain.cancelAndHoldAtTime(t2);N.i.gain.setValueAtTime(0,t2);N.i.gain.linearRampToValueAtTime(1,t2+.01);
      C.i.gain.cancelAndHoldAtTime(t2);C.i.gain.setValueAtTime(1,t2);C.i.gain.linearRampToValueAtTime(0,t2+.01);
      cur=n;setTimeout(()=>{busy=false;if(pend)go()},150)},90)}
  window.__irSwap=buf=>{const A=__seq.Aref();if(!A||!A.rv)return false;pend=buf;if(!busy)go();return true};
  window.__rvCur=()=>cur;

  /* ---- 4. when the app is in the background and nothing is playing, the sound engine rests (saves battery);
     it wakes when the app is shown again or play is pressed ---- */
  let napT=0,napped=false;
  document.addEventListener('visibilitychange',()=>{clearTimeout(napT);const A=window.__seq&&__seq.Aref(),c=A&&A.out&&A.out.context;if(!c)return;
    if(document.hidden){napT=setTimeout(()=>{if(document.hidden&&!document.body.classList.contains('playing')&&c.state==='running'){napped=true;c.suspend().catch(()=>{})}},3000)}
    else if(napped){napped=false;c.resume().catch(()=>{})}});
  window.__nap=()=>napped;
})();

