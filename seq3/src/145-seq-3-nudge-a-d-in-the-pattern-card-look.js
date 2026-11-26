/* ================= SEQ.3 · nudge, A–D in the pattern card, looks, BLONDA GLITCH (same as the native app) ================= */
let NG=null;
/* nudge past half a step: the step moves into the free neighbour and keeps the rest; a taken neighbour stops it at the edge */
function setNudge(c,o){o=Math.round(clamp(o,-.5,.5)*100)/100;if(Math.abs(o)>=.005)c.o=o;else delete c.o}
function nudgeStep(ti,s,o){const row=S.pats[S.pat][ti],d=o>.5?1:o<-.5?-1:0;
  if(!d){setNudge(row[s],o);return s}
  const s2=(s+d+16)%16;if(row[s2].v){setNudge(row[s],d*.5);return s}
  const c={...row[s]},keepN=row[s2].n;
  if(TRACKS[ti].mel)S.roll[S.pat][TRACKS[ti].id].forEach(n=>{if(Math.floor(n.s+1e-4)===s){n.s+=d;if(n.s>=16)n.s-=16;if(n.s<0)n.s+=16}});
  Object.keys(row[s2]).forEach(k=>delete row[s2][k]);Object.assign(row[s2],c);setNudge(row[s2],o-d);
  Object.keys(row[s]).forEach(k=>delete row[s][k]);row[s].v=0;row[s].n=keepN??c.n;
  return s2}
/* swing: the dots on the off-beats lean as far as the swing pushes them */
{let lastSw=S.master.swing;setInterval(()=>{if(S.master.swing!==lastSw){lastSw=S.master.swing;renderCells()}},250)}

/* inspector: timing */
(()=>{const ob=$('#sinsO');if(!ob)return;let on=false;
  const paint=()=>{if(!sins)return;const o=inspCell().o||0,i=ob.querySelector('i');i.style.left=(50+Math.min(0,o)*100)+'%';i.style.width=(Math.abs(o)*100)+'%';$('#sinsON').textContent=(o>0?'+':'')+Math.round(o*100)+' %'};
  const setX=e=>{const r=ob.getBoundingClientRect(),c=inspCell();setNudge(c,((e.clientX-r.left)/r.width-.5));renderCells();save();paint()};
  ob.addEventListener('pointerdown',e=>{e.preventDefault();ob.setPointerCapture(e.pointerId);on=true;setX(e)});ob.addEventListener('pointermove',e=>{if(on)setX(e)});
  const up=()=>{if(on){on=false;inspPreview()}};ob.addEventListener('pointerup',up);ob.addEventListener('pointercancel',up);
  ob.addEventListener('dblclick',()=>{if(!sins)return;delete inspCell().o;renderCells();save();paint()});
  const _ri=renderInsp;renderInsp=function(){_ri();paint()}})();

/* A–D + copy inside the pattern card */
(()=>{const box=$('#gPats');if(!box)return;
  box.querySelectorAll('button[data-p]').forEach(b=>b.onclick=()=>{const d=document.querySelector('.pat[data-p="'+b.dataset.p+'"]');if(d)d.click()});
  $('#gCopy').onclick=()=>{pushHist();const to=(S.pat+1)%4;S.pats[to]=JSON.parse(JSON.stringify(S.pats[S.pat]));S.roll[to]=JSON.parse(JSON.stringify(S.roll[S.pat]));
    toast('ABCD'[S.pat]+' kopierat till '+'ABCD'[to]+' · nu på '+'ABCD'[to]);if(playing){queued=to}else{S.pat=to;queued=-1}renderAll();save()};
  const _rp=renderPats;renderPats=function(){_rp();box.querySelectorAll('button[data-p]').forEach(b=>{const p=+b.dataset.p;b.classList.toggle('cur',p===S.pat);b.classList.toggle('queued',p===queued);
      b.classList.toggle('has',S.pats[p].some(r=>r.some(c=>c.v)))});$('#gCopy span').textContent=' → '+'ABCD'[(S.pat+1)%4]};renderPats()})();

/* looks — an app setting (not saved in the project): glas · studio · dots */
const LOOKS=['glas','studio','dots'];let LOOK=0;try{LOOK=clamp(+localStorage.getItem('seq3-look')||0,0,2)}catch(e){globalThis.__el&&globalThis.__el(e)}
function setLook(i){LOOK=((i%3)+3)%3;document.body.classList.toggle('look-studio',LOOK===1);document.body.classList.toggle('look-dots',LOOK===2);
  const b=$('#lookBtn');if(b)b.querySelector('span').textContent=LOOKS[LOOK];try{localStorage.setItem('seq3-look',LOOK)}catch(e){globalThis.__el&&globalThis.__el(e)}}
$('#lookBtn').onclick=()=>{setLook(LOOK+1);toast('Utseende · '+LOOKS[LOOK])};setLook(LOOK);

