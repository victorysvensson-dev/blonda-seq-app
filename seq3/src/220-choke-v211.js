/* ================= Choke (v211) =================
   Works for every drum track, built-in sound or sample. Set in the sound box (the first box that opens on a drum track) and in
   the sample editor; both change the same setting (S.ck, saved with the project).
     på = every track with choke on cuts what is still ringing on the tracks with choke on (itself included), like open and closed hat
   Each hit of a choking track gets its own little level stage; a choke is a 6 ms fade on it, so there is no click.
   In the pattern grid a choking track has a thin orange line before its name; on the phone's track chips a line under the name. ================= */
const CKV=[];
function ckOut(i,t,out){const tr=TRACKS[i];if(!tr||tr.mel||!ctx)return out;const m=!!(S.ck&&S.ck[tr.id]);if(!m)return out;const c=ctx,now=c.currentTime;
  for(let k=CKV.length-1;k>=0;k--){const v=CKV[k];if(v.c!==c||v.t<now-8){CKV.splice(k,1);continue}
    if(v.cut||v.t>=t)continue;if(!(S.ck&&S.ck[TRACKS[v.i].id]))continue;
    try{const G=v.g.gain;G.cancelAndHoldAtTime(t);G.setValueAtTime(1,t);G.linearRampToValueAtTime(0,t+.006)}catch(e){globalThis.__el&&globalThis.__el(e)}/* this stage only ever holds 1, so the fade starts exactly at t */v.cut=1}
  const g=c.createGain();g.gain.setValueAtTime(1,Math.max(now,t-.001));/* an anchor, so a later cut starts exactly at the cut */g.connect(out);CKV.push({i,t,g,c});if(CKV.length>128)CKV.splice(0,CKV.length-128);return g}
(()=>{
  const ckSet=(tid,m)=>{pushHist();if(!S.ck)S.ck={};if(m)S.ck[tid]='on';else delete S.ck[tid];save();ckPaintAll()};
  const ckHint=tid=>{if(!(S.ck&&S.ck[tid]))return 'varje slag klingar ut';
    const mates=TRACKS.filter((tr,i)=>!tr.mel&&S.ck[tr.id]&&(!window.trkOn||trkOn(i))).map(tr=>tr.name.toLowerCase());return mates.length>1?'stryper varandra: '+mates.join(' · '):'ett nytt slag stryper det förra · slå på fler spår så stryper de varandra'};
  window.ckHint=ckHint;window.ckSet=ckSet;
  window.__ck={set:ckSet,hint:ckHint};
  /* the row in the sound box */
  const row=document.createElement('div');row.className='sed-bar sed-ckb ded-ck';row.id='dedCk';
  row.innerHTML='<span class="sed-cl">choke</span><button class="sed-b tog" data-ck="">av</button><button class="sed-b tog" data-ck="on" title="Spåren med choke på stryper varandra">på</button><span class="sed-ckh"></span>';
  const box=document.getElementById('ded'),kn=document.getElementById('dedKnobs');
  if(box&&kn){kn.insertAdjacentElement('afterend',row)}
  const dedTid=()=>{const d=document.getElementById('dedDot'),n=d&&d.dataset.ti!=null?+d.dataset.ti:-1,tr=TRACKS[n];return tr&&!tr.mel?tr.id:''};
  function dedPaint(){const tid=dedTid();row.hidden=!tid;if(!tid)return;const m=S.ck&&S.ck[tid]?'on':'';row.querySelectorAll('[data-ck]').forEach(b=>b.classList.toggle('on',b.dataset.ck===m));row.querySelector('.sed-ckh').textContent=ckHint(tid)}
  row.querySelectorAll('[data-ck]').forEach(b=>b.onclick=()=>{const tid=dedTid();if(tid)ckSet(tid,b.dataset.ck)});
  if(box){new MutationObserver(()=>{if(!box.hidden)dedPaint()}).observe(box,{attributes:true,attributeFilter:['hidden']});const d=document.getElementById('dedDot');if(d)new MutationObserver(dedPaint).observe(d,{childList:true,characterData:true,subtree:true})}
  /* the mark in the pattern grid */
  const markOf=k=>{const tr=TRACKS[k];return tr&&!tr.mel&&S.ck&&S.ck[tr.id]?'1':''};
  const mark=(b,want)=>{if((b.dataset.ck||'')!==want){if(want)b.dataset.ck=want;else delete b.dataset.ck}};
  function gridPaint(){
    /* pattern grid: one .row per track, in track order */
    document.querySelectorAll('.row > .rl').forEach(b=>{const r=b.parentElement,ti=r&&r.dataset.ti;if(ti!=null)mark(b,markOf(+ti))});
    /* the track chips under the orbit (phone) */
    document.querySelectorAll('.orb-trk').forEach(w=>[...w.children].forEach((b,k)=>mark(b,markOf(b.dataset.ti!=null?+b.dataset.ti:k))))}
  function ckPaintAll(){try{dedPaint()}catch(e){globalThis.__el&&globalThis.__el(e)}try{gridPaint()}catch(e){globalThis.__el&&globalThis.__el(e)}}
  window.ckPaintAll=ckPaintAll;
  let last='';setInterval(()=>{const k=JSON.stringify(S.ck||{})+'|'+document.querySelectorAll('.row > .rl,.orb-trk > *').length+'|'+document.querySelectorAll('.row > .rl:not([data-ck]),.orb-trk > :not([data-ck])').length;if(k!==last){last=k;ckPaintAll()}},400);
  const css=document.createElement('style');css.textContent=`
.ded-ck{margin:10px 0 2px}
.row > .rl[data-ck] .nm{box-shadow:inset 2px 0 0 #FF6A1F;padding-left:6px}
.orb-trk > [data-ck]{box-shadow:inset 0 -2px 0 #FF6A1F}`;
  document.head.appendChild(css);
})();

