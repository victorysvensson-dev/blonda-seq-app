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
    const len=60/S.bpm/4*(ls||1);if(SCHED&&window.MIDIX&&MIDIX.notesOut)MIDIX.note(i,t,vel,note,len);if(!isMuted(i))hitT.set(i,{t,v:vel})}}
  {const _p=play;play=function(){const was=playing,r=_p.apply(this,arguments);if(K.on&&playing!==was){if(playing){sync(false);mute(true)}NA.play(playing)}return r}}
  {const _s=stop;stop=function(){const was=playing,r=_s.apply(this,arguments);if(K.on&&was)NA.play(false);return r}}
  setInterval(()=>{if(K.on){sync(false);if(!K.muted)mute(true)}},200);
  function stat(){const s=K.st;if(!K.on)return 'off · the page plays (web audio)';if(s.err)return 'error: '+String(s.err).replace(/[<>&]/g,'');
    return `on · C++ engine · load <b>${Math.round((s.load||0)*100)} %</b>${s.playing?' · playing':''}`}
  function paint(){const el=document.getElementById('naSt');if(el)el.innerHTML=stat();const b=document.getElementById('naBtn');if(b){b.textContent=K.on?'ON':'OFF';b.classList.toggle('on',K.on)}}
  NA.sub(s=>{K.st=s;paint()});
  window.NATIVE={
    panelHTML(){return `<div class="lk-row"><span><b>Native audio · beta</b><small>the C++ engine plays (steadier, lighter) · samples, loops and the Starter not yet</small></span><button class="lk-btn na-btn" id="naBtn">${K.on?'ON':'OFF'}</button></div><div class="clk-st" id="naSt">${stat()}</div>`},
    bindPanel(el){const b=el.querySelector('#naBtn');if(b)b.onclick=()=>{try{initAudio();ctx.resume()}catch(e){globalThis.__el&&globalThis.__el(e)}setOn(!K.on)}},
    on:()=>K.on,_st:()=>({on:K.on,muted:K.muted,st:K.st,len:K.last.length})};
  const css=document.createElement('style');css.textContent='.na-btn.on{background:#F2C318!important;color:#141517!important;box-shadow:none!important}';document.head.appendChild(css);
  /* the choice is kept: on again after the start (once the page's audio exists) */
  try{if(localStorage.getItem(LS)==='1'){const iv=setInterval(()=>{if(ctx&&A.an){clearInterval(iv);setOn(true)}},500)}}catch(e){globalThis.__el&&globalThis.__el(e)}
})();
