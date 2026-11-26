/* ================= Ableton Link (v284, only in the app) =================
   The app (LinkBridge + LinkKit) holds the Link session and sends its timeline ten times a second: tempo, the beat at a
   moment, and whether the session is playing. Link is switched on and off in Ableton's own settings view (Ableton's rule).
   - Tempo: a change in SEQ.3 goes to the session, a change from the session (Live, other apps) comes to SEQ.3.
   - Start: SEQ.3 starts on the session's next bar (quantum 4 beats = 16 steps). Alone in the session it starts at once
     and the session's bar begins there.
   - The beat: like the MIDI clock follower, the next step's time is set from the timeline, converted to the audio clock
     at the moment the sound is heard (CLK.toCtx), so SEQ.3 stays on the session's beat.
   - Start/stop sync (if switched on in the settings view): play and stop go both ways.
   The MIDI clock follower wins when it is running (two masters can't both steer the beat). */
(()=>{const N=window.BLONDA_NATIVE;if(!N||!N.link)return;const L=N.link,Q=4;
  const K={st:null,base:null,hold:0,mine:null,sentAt:0,applied:0,shown:0,was:false,err:[]};
  const clkRun=()=>{try{return !!(window.CLK&&CLK._st().run)}catch(e){return false}};
  const toCtx=p=>window.CLK&&CLK.toCtx?CLK.toCtx(p):ctx.currentTime+(p-performance.now())/1000;
  const on=()=>!!(K.st&&K.st.on);
  /* start SEQ.3 on the session's beat: the next bar (or now, when alone and the session is not playing) */
  function startPlan(){const p0=performance.now()+90,b0=L.beatAt(p0),B=Math.ceil(b0/Q-1e-6)*Q;
    const alone=!K.st.peers&&!K.st.playing;return alone?{p:p0,beat:B}:{p:L.pageAtBeat(B),beat:B}}
  {const _p=play;play=function(){
    if(!on()||playing||window.__extStart||clkRun())return _p.apply(this,arguments);
    try{initAudio()}catch(e){globalThis.__el&&globalThis.__el(e)}if(!ctx)return _p.apply(this,arguments);
    const pl=startPlan();K.base={beat:pl.beat,g:0};K.hold=performance.now()+300;
    window.__extStart={t:toCtx(pl.p),g:0};const r=_p.apply(this,arguments);
    if(playing)L.play(pl.p,pl.beat);else K.base=null;return r}}
  {const _s=stop;stop=function(){const was=playing,r=_s.apply(this,arguments);if(was&&on())L.stop();K.base=null;return r}}
  function tempo(s){const now=performance.now();
    if(K.mine==null)K.mine=S.bpm;
    if(Math.abs(S.bpm-K.mine)>.005){K.mine=S.bpm;K.sentAt=now;L.tempo(S.bpm);return}/* changed in SEQ.3 */
    if(now-K.sentAt<400)return;/* a timeline sent before our change got there */
    if(Math.abs(s.bpm-S.bpm)>.005){S.bpm=Math.round(s.bpm*1000)/1000;K.mine=S.bpm;
      if(Math.round(S.bpm)!==K.shown){K.shown=Math.round(S.bpm);try{setDM($('#bpmNum'),String(K.shown))}catch(e){globalThis.__el&&globalThis.__el(e)}}
      if(now-K.applied>400){K.applied=now;try{applyMaster()}catch(e){globalThis.__el&&globalThis.__el(e)}}}}
  function transport(s){if(!s.ss){K.was=s.playing;return}
    if(s.playing&&!K.was&&!playing&&!clkRun())play();
    else if(!s.playing&&K.was&&playing&&K.base)stop();
    K.was=s.playing}
  function beat(){if(!(playing&&K.base&&ctx)||clkRun()||performance.now()<K.hold||tapeRate!==1)return;
    const b=K.base.beat+(gstep-K.base.g)/4,target=toCtx(L.pageAtBeat(b)),d=target-nextT,sd=stepDur();
    K.err.push(d*1000);if(K.err.length>30)K.err.shift();
    if(Math.abs(d)<.0015)return;
    if(Math.abs(d)<sd*.5){startT+=d;nextT+=d}else{startT+=d;nextT=Math.max(target,ctx.currentTime+.003)}}
  L.sub(s=>{const first=!K.st;K.st=s;if(!s.on){K.base=null;K.mine=null;K.was=false;return}
    if(first)return;
    try{tempo(s);transport(s);beat()}catch(e){globalThis.__el&&globalThis.__el(e)}});
  /* the MIDI panel */
  function stat(){const s=K.st;if(!s)return 'Ableton Link is starting …';if(!s.on)return 'off';
    const e=K.err.slice(-10),m=e.length?e.reduce((a,b)=>a+Math.abs(b),0)/e.length:0;
    return `on · <b>${s.peers}</b> ${s.peers===1?'link':'links'} · tempo <b>${s.bpm.toFixed(2)}</b>${s.ss?' · start/stop sync':''}${playing&&K.base?` · on the beat <b>±${m.toFixed(1)} ms</b>`:''}`}
  window.LINK={
    panelHTML(){return `<div class="lk-row"><span><b>Ableton Link</b><small>play in time with Live and other apps on the same network</small></span><button class="lk-btn" id="lkSet">Link settings</button></div><div class="clk-st" id="lkSt">${stat()}</div>`},
    bindPanel(el){const b=el.querySelector('#lkSet');if(b)b.onclick=()=>L.settings()},
    _st:()=>({st:K.st,base:K.base,err:K.err.slice(),g:gstep,n:nextT,bpm:S.bpm,playing})};
  setInterval(()=>{const el=document.getElementById('lkSt');if(el)el.innerHTML=stat()},500);
  const css=document.createElement('style');css.textContent=`.lk-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:10px 0 4px}.lk-row span{display:flex;flex-direction:column;gap:2px;font-size:11px}.lk-row small{font-size:9px;opacity:.55}
.lk-btn{height:28px;padding:0 12px;font:500 11px var(--f-mono);color:inherit;background:none;border:0;box-shadow:inset 0 0 0 1px rgba(232,230,220,.18);white-space:nowrap}`;document.head.appendChild(css);
})();
