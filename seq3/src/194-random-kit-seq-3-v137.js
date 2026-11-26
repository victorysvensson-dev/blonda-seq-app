/* ================= Random kit (SEQ.3 v137) =================
   "slumpa kit": new sounds on the six drum tracks only – the patterns, the synths and the Starter stay. Each drum gets either
   a sample from the sound library (its own kind: kicks for the kick, claps or snaps for the clap …) or one of the built-in
   drum models, a touch of tuning and length, and the open hat follows the closed one's character. Locked tracks keep their
   sound. Undo (the app's) brings the old kit back. */
const KIT_G={kick:['kick'],snare:['snare','rim'],clap:['clap','snap'],hat:['hat'],ohat:['open'],perc:['perc','rim','snap']};
function randomKit(){initAudio();if(typeof pushHist==='function')pushHist();const R=Math.random,pick=a=>a[Math.floor(R()*a.length)],names=[];
  const lib=[...SMP.values()].filter(s=>s&&s.pack&&s.group&&s.group!=='loop'&&s.group!=='vox');
  TRACKS.forEach((t,i)=>{if(t.mel||t.x||(S.lock&&S.lock[t.id])||String(S.dk[t.id]||'').startsWith('dk:'))return;/* (v293) a DUNK sound stays */const key=t.id==='ohat'?'hat':t.id,pool=lib.filter(s=>(KIT_G[t.id]||[]).includes(s.group)),models=(DKM[key]||[]).map(o=>o[0]);
    const P=S.params[t.id];let nm='';
    if(pool.length&&(R()<.62||!models.length)){const sm=pick(pool);S.dk[t.id]='smp:'+sm.id;Object.assign(P,{tone:.5,decay:1,tune:0});ensureBuf(sm).then(()=>{try{applyTrack(i)}catch(e){globalThis.__el&&globalThis.__el(e)}});nm=sm.name.replace(/^(kick|snare|clap|hat|open hat|open|perc|rim|snap)\s*/i,'')||sm.name}
    else{const m=pick(models);if(m)S.dk[t.id]=m;else delete S.dk[t.id];const D=DEF_P[t.id]||{};P.tone=Math.max(0,Math.min(1,(D.tone??.5)+(R()-.5)*.3));P.decay=Math.max(.05,Math.min(1,(D.decay??.5)+(R()-.5)*.3));P.tune=0;nm=((DKM[key]||[]).find(o=>o[0]===m)||['','blonda'])[1]}
    if(R()<.35&&!(S.dk[t.id]||'').startsWith('smp:'))P.tune=Math.round((R()-.5)*6);
    try{applyTrack(i)}catch(e){globalThis.__el&&globalThis.__el(e)}names.push(t.name.toLowerCase()+' '+nm)});
  /* the open hat sounds like the closed one when both are built-in */
  if(!(S.lock&&S.lock.ohat)&&!(S.dk.ohat||'').startsWith('smp:')&&!(S.dk.ohat||'').startsWith('dk:')&&!(S.dk.hat||'').startsWith('smp:')){if(S.dk.hat)S.dk.ohat=S.dk.hat;else delete S.dk.ohat}
  save();try{renderSnd();renderDial()}catch(e){globalThis.__el&&globalThis.__el(e)}if(!playing)setTimeout(()=>{try{audition(0)}catch(e){globalThis.__el&&globalThis.__el(e)}},350);
  toast('Nytt kit · '+names.slice(0,4).join(' · ')+(names.length>4?' …':''))}
window.randomKit=randomKit;
(()=>{const css=document.createElement('style');css.textContent=`.kit-btn{display:inline-flex;align-items:center;gap:6px}.kit-btn svg{width:14px;height:14px}
.cap .kit-cap{height:28px;padding:0 10px;border-radius:999px;border:0;background:rgba(255,255,255,.1);color:inherit;font:500 10px var(--f-mono,monospace);letter-spacing:.04em;cursor:pointer;margin-right:6px;white-space:nowrap}
.cap .kit-cap:hover{background:rgba(255,255,255,.18)}`;document.head.appendChild(css);
  const ic='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2.5" y="2.5" width="11" height="11" rx="2.5"/><circle cx="5.6" cy="5.6" r=".9" fill="currentColor"/><circle cx="10.4" cy="10.4" r=".9" fill="currentColor"/><circle cx="10.4" cy="5.6" r=".9" fill="currentColor"/><circle cx="5.6" cy="10.4" r=".9" fill="currentColor"/></svg>';
  /* in the grid's tool row, after "tärning" */
  const dice=document.getElementById('actDice');if(dice){const b=document.createElement('button');b.className='chip kit-btn';b.id='actKit';b.title='Slumpa nya trumljud – bara trummorna';b.innerHTML=ic+'slumpa kit';b.onclick=randomKit;dice.after(b)}
  /* and on the pads card */
  const cap=document.querySelector('.card[data-card="pads"] .cap .cbtns');if(cap){const b=document.createElement('button');b.className='kit-cap';b.title='Slumpa nya trumljud – bara trummorna';b.textContent='slumpa kit';b.onclick=e=>{e.stopPropagation();randomKit()};cap.prepend(b)}
})();

