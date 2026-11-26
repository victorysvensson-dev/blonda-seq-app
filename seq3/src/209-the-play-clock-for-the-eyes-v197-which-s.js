/* ================= The play clock for the eyes (v197): which step you HEAR right now. Every scheduled step is noted with the
   time it sounds (incl. swing); the step shown is the last one whose sound has reached the speakers (the audio card's output
   latency subtracted, one display frame added – a change appears on screen a frame after it is made). The trackers use this
   instead of the scheduler's counter (up to 120 ms ahead) or a value updated by another drawing loop (a frame or more behind). ================= */
(()=>{const Q=[];let frameMs=16,lastF=0;
  {const _bp=beatPump;beatPump=function(t,st){_bp(t,st);try{const sd=stepDur()/(typeof tapeRate==='number'&&tapeRate>0?tapeRate:1),sw=(st%2)?(S.master.swing||0)*sd*.66:0;Q.push({t:t+sw,g:typeof gstep==='number'?gstep:0,s:st});if(Q.length>96)Q.splice(0,Q.length-96)}catch(e){globalThis.__el&&globalThis.__el(e)}}}
  {const _p=play;play=function(){const r=_p.apply(this,arguments);if(!playing)Q.length=0;return r}}
  (function fr(n){requestAnimationFrame(fr);if(lastF)frameMs=frameMs*.9+Math.min(100,n-lastF)*.1;lastF=n})(0);
  function now(){if(typeof ctx==='undefined'||!ctx)return 0;const lat=(ctx.outputLatency||0)+(ctx.baseLatency||0);return ctx.currentTime-lat+frameMs/1000}
  /* the global step heard now (or -1) */
  window.__visG=()=>{if(!playing||!Q.length)return -1;const t=now();let e=null;for(let i=Q.length-1;i>=0;i--){if(Q[i].t<=t){e=Q[i];break}}return e?e.g:-1};
})();

