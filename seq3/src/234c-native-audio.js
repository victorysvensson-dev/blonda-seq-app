/* ================= native audio (v292, only in the app, beta) =================
   The C++ sound engine in the app (Core/: the same sequencer, drums, DUNK, synths, strips, buses and master as the web
   version, ported) plays the project; the page stays the editor. The page sends its project whenever it changes
   (checked five times a second), and play / stop. Its own sound is cut off (nothing is built in Web Audio for the
   sequencer), but it keeps its clock for the screen (the playhead, the pads lighting up) and for MIDI out.
   Switched in the MIDI panel; the choice is kept. Not yet in the C++ engine: samples and loops (silent), the Starter,
   Grime, live glitch from the page. ================= */
(()=>{const N=window.BLONDA_NATIVE;if(!N||!N.native)return;const NA=N.native,LS='blonda.native';
  const K={on:false,last:'',st:{},muted:false};
  const json=()=>{const o={};PKEYS.forEach(k=>{if(S[k]!==undefined)o[k]=S[k]});return JSON.stringify(o)};
  function sync(force){if(!K.on)return;let j='';try{j=json()}catch(e){globalThis.__el&&globalThis.__el(e);return}if(!force&&j===K.last)return;K.last=j;NA.project(j)}
  /* the page's own output: off while the C++ engine plays (the analyser before the speakers is its last node) */
  function mute(on){if(on===K.muted)return;if(!ctx||!A.an)return;try{if(on)A.an.disconnect(ctx.destination);else A.an.connect(ctx.destination);K.muted=on}catch(e){globalThis.__el&&globalThis.__el(e)}}
  function setOn(on){if(on===K.on)return;K.on=on;try{localStorage.setItem(LS,on?'1':'0')}catch(e){globalThis.__el&&globalThis.__el(e)}
    if(on){K.last=json();NA.on(K.last);mute(true);if(playing)NA.play(true)}else{NA.off();mute(false)}paint()}
  {const _t0=trigger0;trigger0=function(i,t,vel,note,ls){if(!K.on)return _t0.apply(this,arguments);if(!ctx)return;
    const len=60/S.bpm/4*(ls||1);if(SCHED&&window.MIDIX&&MIDIX.notesOut)MIDIX.note(i,t,vel,note,len);if(!isMuted(i))hitT.set(i,{t,v:vel});
    if(!SCHED)live(i,note,vel,len,t)}}
  /* played live (pads, auditions, the keyboard): straight to the C++ engine; a synth note is let go after its length */
  function live(i,note,vel,len,t){if(!K.on)return;const tr=TRACKS[i];if(!tr)return;const n=note==null?60:Math.round(note),d=Math.max(0,(t||0)-(ctx?ctx.currentTime:0));
    const go=()=>{NA.note(i,n,vel==null?.8:vel,true);if(tr.mel)setTimeout(()=>NA.note(i,n,0,false),Math.max(30,len*1000))};if(d>.01)setTimeout(go,d*1000);else go()}
  {const _p=play;play=function(){const was=playing,r=_p.apply(this,arguments);if(K.on&&playing!==was){if(playing){sync(false);mute(true)}NA.play(playing)}return r}}
  {const _s=stop;stop=function(){const was=playing,r=_s.apply(this,arguments);if(K.on&&was)NA.play(false);return r}}
  setInterval(()=>{if(K.on){sync(false);if(!K.muted)mute(true)}},200);
  function stat(){const s=K.st;if(!K.on)return 'off · the page plays (web audio)';if(s.err)return 'error: '+String(s.err).replace(/[<>&]/g,'');
    if(s.on===false)return 'starting the C++ engine…';
    const pk=s.peak>0?Math.round(20*Math.log10(s.peak)):null;
    return `on · C++ engine${s.sr?' · '+Math.round(s.sr/100)/10+' kHz':''} · load <b>${Math.round((s.load||0)*100)} %</b> · out <b>${pk==null||pk<-90?'silent':pk+' dB'}</b>${s.playing?' · playing':''}`}
  function paint(){const el=document.getElementById('naSt');if(el)el.innerHTML=stat();const b=document.getElementById('naBtn');if(b){b.textContent=K.on?'ON':'OFF';b.classList.toggle('on',K.on)}}
  NA.sub(s=>{K.st=s;paint()});
  window.NATIVE={
    panelHTML(){return `<div class="lk-row"><span><b>Native audio · beta</b><small>the C++ engine plays (steadier, lighter) · samples, loops and the Starter not yet</small></span><button class="lk-btn na-btn" id="naBtn">${K.on?'ON':'OFF'}</button></div><div class="clk-st" id="naSt">${stat()}</div>`},
    bindPanel(el){const b=el.querySelector('#naBtn');if(b)b.onclick=()=>{try{initAudio();ctx.resume()}catch(e){globalThis.__el&&globalThis.__el(e)}setOn(!K.on)}},
    on:()=>K.on,
    /* the keyboard holds notes: on at key down, off at key up */
    note(i,n,v,on){if(K.on)NA.note(i,Math.round(n),on?(v==null?.8:v):0,!!on)},
    /* used by the app's self-test: switch on, a pad, the sequencer, read the engine's output, back as it was */
    async test(){const was=K.on,pl=playing,w=ms=>new Promise(r=>setTimeout(r,ms)),r={};try{setOn(true);await w(1200);r.st=Object.assign({},K.st);
      const pk0=K.st.peak||0;live(0,60,.9,.2,0);await w(700);r.pad=K.st.peak||0;r.padRose=r.pad>pk0+.005||r.pad>.01;
      if(!playing)play();await w(1800);r.play=K.st.peak||0;r.playing=!!K.st.playing;if(!pl&&playing)play();await w(300)}catch(e){r.err=String(e)}
      if(!was)setOn(false);return r},
    _st:()=>({on:K.on,muted:K.muted,st:K.st,len:K.last.length})};
  const css=document.createElement('style');css.textContent='.na-btn.on{background:#F2C318!important;color:#141517!important;box-shadow:none!important}';document.head.appendChild(css);
  /* the choice is kept: on again after the start (once the page's audio exists) */
  try{if(localStorage.getItem(LS)==='1'){const iv=setInterval(()=>{if(ctx&&A.an){clearInterval(iv);setOn(true)}},500)}}catch(e){globalThis.__el&&globalThis.__el(e)}
})();
