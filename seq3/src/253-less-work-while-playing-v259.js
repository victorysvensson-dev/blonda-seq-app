/* ================= less work while playing (v259) =================
   Measured while a song plays (Chrome's own traces of the audio thread and the page):
   1. A muted (or soloed-away) track still made every note: its voices were built, played and thrown away behind the
      channel's closed fader. Now a muted track makes no sound at all – exactly what is heard, for less work.
   2. Canvases scrolled out of sight are no longer drawn 60 times a second (the orbit, the sound chart, the dial ruler,
      the synth curve and the perform pad were drawn even when scrolled away). What they do besides drawing (the tape-stop
      slowdown, the sound card's tint) still runs.
   (v258 also had a second clock in a worker; on the iPhone and iPad simulators the page then stopped answering after the
   sound started, so it is left out.) ================= */
(()=>{try{
  /* 1: muted tracks make no voices (their MIDI still goes out when MIDI out is on) */
  const tg=trigger;trigger=function(i,t,vel,note,ls){try{if(ctx&&TRACKS[i]&&isMuted(i)){if(SCHED&&window.MIDIX&&MIDIX.notesOut)MIDIX.note(i,t,vel,note,60/S.bpm/4*(ls||1));return}}catch(e){globalThis.__el&&globalThis.__el(e)}return tg.apply(this,arguments)};
  /* 2: what is on screen */
  const seen=new WeakMap(),io=new IntersectionObserver(es=>es.forEach(e=>seen.set(e.target,e.isIntersecting)),{rootMargin:'40px'});
  const on=el=>{if(!el)return false;if(!seen.has(el)){seen.set(el,true);io.observe(el)}return seen.get(el)};
  const $id=id=>document.getElementById(id);
  {const f=drawOrbit;drawOrbit=function(){if(on($id('orbC')))return f.apply(this,arguments)}}
  {const f=drawSnd;drawSnd=function(){if(on($id('sdChart')))return f.apply(this,arguments);sndTint()}}
  {const f=drawDial;drawDial=function(){if(on($id('dlRulerC')))return f.apply(this,arguments)}}
  {const f=drawSynth;drawSynth=function(){if(on($id('synCv')))return f.apply(this,arguments)}}
  {const f=perfFrame;perfFrame=function(dt){if(on(xyc))return f.apply(this,arguments);
    /* off screen: only the tape stop (it bends the pitch of what plays) */
    if(tapeStop)tapeRate=Math.max(.12,tapeRate*Math.pow(.07,dt));else if(tapeRate<1&&!window.__half)tapeRate=Math.min(1,tapeRate+dt*5);gTune=tapeRate<.999?12*Math.log2(tapeRate):0}}
}catch(e){console.warn('loadfix',e)}})();

