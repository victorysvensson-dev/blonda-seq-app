/* ================= native audio (v292, only in the app, beta) =================
   The C++ sound engine in the app (Core/: the same sequencer, drums, DUNK, synths, strips, buses and master as the web
   version, ported) plays the project; the page stays the editor. The page sends its project whenever it changes
   (checked five times a second), and play / stop. Its own sound is cut off (nothing is built in Web Audio for the
   sequencer), but it keeps its clock for the screen (the playhead, the pads lighting up) and for MIDI out.
   Switched in the MIDI panel (beta: always off at the start). Not yet in the C++ engine: samples and loops (silent), the Starter,
   Grime, live glitch from the page. ================= */
(()=>{const N=window.BLONDA_NATIVE;if(!N||!N.native)return;const NA=N.native,LS='blonda.native';
  const K={on:false,last:'',st:{},muted:false,sent:null};
  const json=()=>{const o={};PKEYS.forEach(k=>{if(S[k]!==undefined)o[k]=S[k]});return JSON.stringify(o)};
  function sync(force){if(!K.on)return;let j='';try{j=json()}catch(e){globalThis.__el&&globalThis.__el(e);return}if(!force&&j===K.last)return;K.last=j;NA.project(j)}
  /* the page's own output: off while the C++ engine plays (the analyser before the speakers is its last node) */
  function mute(on){if(on===K.muted)return;if(!ctx||!A.an)return;try{if(on)A.an.disconnect(ctx.destination);else A.an.connect(ctx.destination);K.muted=on}catch(e){globalThis.__el&&globalThis.__el(e)}}
  /* The page's clock. Its own clock is its audio, and on the iPad the page's audio and the engine can't both run (each
     stops the other). So while the engine plays, the page's audio is suspended (nothing to compute twice) and the page
     reads a clock of its own, which follows the engine's clock (the app reports the engine's time four times a second;
     small differences are taken in slowly). Everything that asks ctx for the time, its state or a time stamp gets this
     clock; resume() does nothing. Back to web audio: the page starts again (saved first), because sounds the page
     timed on this clock would otherwise wait until its real audio clock caught up. */
  const VC={on:false,base:0,p0:0,corr:0,off:null};
  const vnow=()=>VC.base+(performance.now()-VC.p0)/1000+VC.corr;
  function clockOn(){if(VC.on||!ctx)return;VC.base=ctx.currentTime;VC.p0=performance.now();VC.corr=0;VC.off=null;VC.on=true;
    const P=Object.getPrototypeOf(ctx);
    Object.defineProperty(ctx,'currentTime',{get:vnow,configurable:true});
    Object.defineProperty(ctx,'state',{get:()=>'running',configurable:true});
    ctx.resume=()=>Promise.resolve();ctx.getOutputTimestamp=()=>({contextTime:vnow(),performanceTime:performance.now()});
    try{P.suspend.call(ctx)}catch(e){globalThis.__el&&globalThis.__el(e)}}
  function follow(s){if(!VC.on||!(s.et>0))return;const d=vnow()-s.et;   /* page clock minus engine clock: kept constant */
    if(VC.off==null||Math.abs(d-VC.off)>.25){VC.off=d;return}VC.corr-=(d-VC.off)*.1}
  function setOn(on){if(on===K.on)return;K.on=on;try{localStorage.setItem(LS,on?'1':'0')}catch(e){globalThis.__el&&globalThis.__el(e)}
    if(on){clockOn();K.last=json();NA.on(K.last);mute(true);K.sent=null;pushPlay();paint()}
    else{NA.off();paint();if(VC.on){if(playing)stop();try{save()}catch(e){globalThis.__el&&globalThis.__el(e)}setTimeout(()=>location.reload(),150)}else mute(false)}}
  /* play / stop: the buttons hold the page's own play() from before this piece, so wrapping it is not enough –
     the engine follows the page's 'playing' itself (checked every frame, and at once from the wrappers) */
  function pushPlay(){if(!K.on||playing===K.sent)return;K.sent=playing;if(!playing){NA.play(false);return}sync(false);mute(true);const s=startIn();
    if(VC.off!=null)NA.play(true,0,.06,s.t-VC.off);else NA.play(true,s.d,s.pre)}   /* the first step on the engine's clock */
  /* in step with the screen: both engines play their first step .06 s after 'play', so the engine is told how long to wait.
     The page's first step is at startT; switched on in the middle, the engine starts at the page's next bar. */
  function startIn(){if(!ctx)return {d:0,pre:.06};const now=ctx.currentTime,bar=16*stepDur();let t=startT;
    if(now>t-.005)t=startT+Math.ceil((now+.1-startT)/bar)*bar;   /* already past the first step: the next bar */
    const r=t-now;return r>=.06?{d:r-.06,pre:.06,t}:{d:0,pre:r,t}}   /* sooner than .06 s away: a shorter run-up */
  {const tick=()=>{try{pushPlay()}catch(e){globalThis.__el&&globalThis.__el(e)}requestAnimationFrame(tick)};requestAnimationFrame(tick)}
  {const _t0=trigger0;trigger0=function(i,t,vel,note,ls){if(!K.on)return _t0.apply(this,arguments);if(!ctx)return;
    const len=60/S.bpm/4*(ls||1);if(SCHED&&window.MIDIX&&MIDIX.notesOut)MIDIX.note(i,t,vel,note,len);if(!isMuted(i))hitT.set(i,{t,v:vel});
    if(!SCHED)live(i,note,vel,len,t)}}
  /* played live (pads, auditions, the keyboard): straight to the C++ engine; a synth note is let go after its length */
  function live(i,note,vel,len,t){if(!K.on)return;const tr=TRACKS[i];if(!tr)return;const n=note==null?60:Math.round(note),d=Math.max(0,(t||0)-(ctx?ctx.currentTime:0));
    const go=()=>{NA.note(i,n,vel==null?.8:vel,true);if(tr.mel)setTimeout(()=>NA.note(i,n,0,false),Math.max(30,len*1000))};if(d>.01)setTimeout(go,d*1000);else go()}
  {const _p=play;play=function(){const r=_p.apply(this,arguments);pushPlay();return r};
    /* buttons made before this piece hold the original: give them this one, so the engine hears play at once */
    document.querySelectorAll('*').forEach(el=>{if(el.onclick===_p)el.onclick=play})}
  {const _s=stop;stop=function(){const r=_s.apply(this,arguments);pushPlay();return r}}
  setInterval(()=>{if(K.on){sync(false);if(!K.muted)mute(true);
    }},200);
  /* web mode meter: Safari gives no audio CPU figure, so two things that show strain: how busy the page is
     (how late a 50 ms timer fires, as a share of the time) and sound dropouts (the audio clock falling behind real time) */
  const W={busy:0,drops:0,t:0,ct:0,lag:0,n0:0};
  {let due=performance.now()+50;const tk=()=>{const now=performance.now();W.lag+=Math.max(0,now-due);due=now+50;setTimeout(tk,50)};setTimeout(tk,50);
   setInterval(()=>{const now=performance.now(),dt=now-(W.t||now);W.busy=dt>0?Math.min(1,W.lag/dt):0;W.lag=0;
     const run=!!(ctx&&ctx.state==='running');if(run){const ct=ctx.currentTime*1000;if(W.run&&W.t&&dt>200&&dt<3000&&(dt-(ct-W.ct))>40)W.drops++;W.ct=ct}W.run=run&&!document.hidden;W.t=now;if(!K.on)paint()},1000)}
  function stat(){const s=K.st;if(!K.on)return `off · web audio · page busy <b>${Math.round(W.busy*100)} %</b> · dropouts <b>${W.drops}</b>`;if(s.err)return 'error: '+String(s.err).replace(/[<>&]/g,'');
    if(s.on!==true)return (s.restarts?'the audio engine stopped · building it again ('+s.restarts+')':'starting the C++ engine… · '+String(s.stage||'waiting for the app').replace(/[<>&]/g,''));
    if(s.load<0||s.peak<0)return 'on · C++ engine · the engine reports broken numbers (load '+s.load+', out '+s.peak+')';
    const pk=s.peak>0?Math.round(20*Math.log10(s.peak)):null;
    return `on · C++ engine${s.sr?' · '+Math.round(s.sr/100)/10+' kHz':''} · load <b>${Math.round((s.load||0)*100)} %</b> · out <b>${pk==null||pk<-90?'silent':pk+' dB'}</b>${VC.off!=null?'':' · syncing the clock'}${s.playing?' · playing':''}${s.restarts?' · rebuilt '+s.restarts+'×':''}`}
  function paint(){const el=document.getElementById('naSt');if(el)el.innerHTML=stat();const b=document.getElementById('naBtn');if(b){b.textContent=K.on?'ON':'OFF';b.classList.toggle('on',K.on)}}
  NA.sub(s=>{K.st=s;follow(s);paint()});
  window.NATIVE={
    panelHTML(){return `<div class="lk-row"><span><b>Native audio · beta</b><small>the C++ engine plays (steadier, lighter) · samples, loops and the Starter not yet · switching off restarts the page</small></span><button class="lk-btn na-btn" id="naBtn">${K.on?'ON':'OFF'}</button></div><div class="clk-st" id="naSt">${stat()}</div>`},
    bindPanel(el){const b=el.querySelector('#naBtn');if(b)b.onclick=()=>{try{initAudio();ctx.resume()}catch(e){globalThis.__el&&globalThis.__el(e)}setOn(!K.on)}},
    on:()=>K.on,
    /* the keyboard holds notes: on at key down, off at key up */
    note(i,n,v,on){if(K.on)NA.note(i,Math.round(n),on?(v==null?.8:v):0,!!on)},
    /* used by the app's self-test: switch on, a pad, the sequencer, read the engine's output, back as it was */
    async test(){const was=K.on,pl=playing,w=ms=>new Promise(r=>setTimeout(r,ms)),r={};try{setOn(true);for(let k=0;k<25&&K.st.on!==true;k++)await w(200);await w(400);r.st=Object.assign({},K.st);
      const pk0=K.st.peak||0;live(0,60,.9,.2,0);await w(700);r.pad=K.st.peak||0;r.padRose=r.pad>pk0+.005||r.pad>.01;
      if(!playing)play();await w(1800);r.play=K.st.peak||0;r.playing=!!K.st.playing;if(!pl&&playing)play();await w(300)}catch(e){r.err=String(e)}
      return r},   /* left on: switching off restarts the page */
    _st:()=>({on:K.on,muted:K.muted,st:K.st,len:K.last.length})};
  const css=document.createElement('style');css.textContent='.na-btn.on{background:#F2C318!important;color:#141517!important;box-shadow:none!important}';document.head.appendChild(css);
  /* beta: never switched on by itself at the start (a crash in the engine must not lock you out of the app) */
  try{localStorage.removeItem(LS)}catch(e){globalThis.__el&&globalThis.__el(e)}
})();
