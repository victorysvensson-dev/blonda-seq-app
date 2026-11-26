/* ================= rörelser: knob moves recorded into the loop =================
   Works for every control MIDI learn knows (the .mlk elements and their keys: e.<motor>.<param>, s.<track>.<param>,
   p.<track>.<param>, f.<track>.<param>, m.<master>, x.… for the Starter). Press ● and ▶, then turn a control: its moves
   are written into the pattern (16 steps × 4) — Starter controls into the Starter's four bars (64 steps × 4) — and
   played back from then on. Touching a control while it plays back takes it over until you let go. MIDI CC records too.
   State: S.mot = {p0…p3: {key: [64 values or null]}, x: {key: [256]}}, S.motL = {key: label}. */
const MOT={pos:[],touch:new Map(),held:new Set(),last:new Map(),pend:new Set(),rq:0};
window.MOT=MOT;
function motStore(){if(!S.mot||typeof S.mot!=='object')S.mot={};if(!S.motL||typeof S.motL!=='object')S.motL={};return S.mot}
const motIsX=k=>k.startsWith('x.');
function motLane(key,create,pat){const M=motStore(),grp=motIsX(key)?'x':'p'+(pat??S.pat);if(!M[grp]){if(!create)return null;M[grp]={}}
  let L=M[grp][key];if(!L&&create)L=M[grp][key]=new Array(motIsX(key)?256:64).fill(null);return L||null}
function motGet(key){const q=key.split('.'),[a,b,c]=q;try{
  if(a==='e')return engE(b)[c];if(a==='s')return S.synth&&S.synth[b]?S.synth[b][c]:null;if(a==='p')return S.params[b]?S.params[b][c]:null;
  if(a==='f')return tfxOf(b)[c];if(a==='m')return S.master[b];if(a==='x'){let o=stx();for(const k of q.slice(1))o=o==null?null:o[k];return typeof o==='number'?o:null}}catch(e){globalThis.__el&&globalThis.__el(e)}return null}
function motWrite(key,v){const q=key.split('.'),[a,b,c]=q,tIx=id=>TRACKS.findIndex(t=>t.id===id);try{
  if(a==='e'){engE(b)[c]=v;if(b==='bris'&&typeof brisApplyAll==='function')brisApplyAll()}
  else if(a==='s'){if(S.synth&&S.synth[b])S.synth[b][c]=v}
  else if(a==='p'){if(!S.params[b])return;S.params[b][c]=v;applyTrack(tIx(b))}
  else if(a==='f'){tfxOf(b)[c]=v;applyTfx(tIx(b))}
  else if(a==='m'){S.master[b]=v;applyMaster()}
  else if(a==='x'){let o=stx();for(const k of q.slice(1,-1))o=o[k];o[q[q.length-1]]=v;if(q[1]==='mel')STX.pk='';if(STX.E)STX.E.apply(stx())}}catch(e){globalThis.__el&&globalThis.__el(e)}
  MOT.pend.add(key);if(!MOT.rq)MOT.rq=requestAnimationFrame(motRepaint)}
const motKeyOf=(el,ev)=>{const s=el&&el._mls;if(!s)return null;try{const k=typeof s.key==='function'?s.key(ev):s.key;return k||null}catch(e){return null}};
const motLabOf=(el,ev)=>{const s=el&&el._mls;if(!s)return '';try{return typeof s.label==='function'?s.label(ev):s.label}catch(e){return ''}};
function motRepaint(){MOT.rq=0;const keys=MOT.pend;MOT.pend=new Set();const pre=new Set([...keys].map(k=>k[0]));
  document.querySelectorAll('.mlk').forEach(el=>{const k=motKeyOf(el);if(k&&keys.has(k)&&el._mls.paint)try{el._mls.paint()}catch(e){globalThis.__el&&globalThis.__el(e)}});
  try{if(pre.has('p'))renderSnd();if(pre.has('f'))renderDial();if(pre.has('s'))renderSynth();if(pre.has('m')){if(typeof renderPlugs==='function')renderPlugs();masterKnobs.forEach(k=>k.refresh&&k.refresh())}}catch(e){globalThis.__el&&globalThis.__el(e)}}
/* where the loop is right now: the newest scheduled step that has started (pattern lanes by step, Starter lanes by the 4-bar step) */
function motNow(){if(!playing||!ctx||!MOT.pos.length)return null;const now=ctx.currentTime;let q=null;for(const p of MOT.pos)if(p.t<=now)q=p;return q}
const motIdx=(key,q,sub)=>motIsX(key)?(((q.g%64)+64)%64)*4+sub:q.step*4+sub;
MOT.rec=(key,v,label)=>{if(!(recording&&playing)||v==null||!isFinite(v))return;const q=motNow();if(!q)return;const now=ctx.currentTime,sub=Math.max(0,Math.min(3,Math.floor((now-q.t)/q.sd*4)));
  const L=motLane(key,true,q.pat),i=motIdx(key,q,sub),N=L.length,pv=MOT.last.get(key);
  if(pv&&pv.L===L&&performance.now()-pv.at<400){let j=pv.i,n=0;const span=((i-pv.i)%N+N)%N;if(span>0&&span<N/2)while(j!==i&&n<N){j=(j+1)%N;n++;L[j]=pv.v+(v-pv.v)*(n/span)}}
  L[i]=+v.toFixed(4);MOT.last.set(key,{L,i,v,at:performance.now()});if(label)motStore(),S.motL[key]=label;MOT.dirty=1};
MOT.cc=(key,v)=>{MOT.touch.set(key,performance.now());MOT.rec(key,v)};
/* hold a control: it is yours (no playback) — and while recording, its value is sampled every frame */
document.addEventListener('pointerdown',e=>{const el=e.target&&e.target.closest&&e.target.closest('.mlk');if(!el)return;const key=motKeyOf(el,e);if(!key)return;
  const lab=motLabOf(el,e);MOT.held.add(key);let alive=true;const rec=recording&&playing;if(rec)el.classList.add('motrec');
  const tick=()=>{if(!alive)return;MOT.touch.set(key,performance.now());if(recording&&playing)MOT.rec(key,motGet(key),lab);requestAnimationFrame(tick)};requestAnimationFrame(tick);
  const end=()=>{alive=false;MOT.held.delete(key);MOT.last.delete(key);el.classList.remove('motrec');window.removeEventListener('pointerup',end,true);window.removeEventListener('pointercancel',end,true);
    if(MOT.dirty){MOT.dirty=0;save();motBadges();motList()}};
  window.addEventListener('pointerup',end,true);window.addEventListener('pointercancel',end,true)},true);
/* playback: four times a step, every lane of the playing pattern (and the Starter's) */
function motPlay(t,st){if(!ctx)return;MOT.pos.push({t,step:st,pat:S.pat,g:gstep,sd:stepDur()/tapeRate});if(MOT.pos.length>48)MOT.pos.splice(0,MOT.pos.length-48);
  const M=S.mot;if(!M)return;const P=M['p'+S.pat],X=stx().on?M.x:null;if(!(P&&Object.keys(P).length)&&!(X&&Object.keys(X).length))return;const sd=stepDur()/tapeRate,g=gstep;
  for(let k=0;k<4;k++)setTimeout(()=>{const now=performance.now();
    const run=(lanes,idx)=>{for(const key in lanes){if(MOT.held.has(key)||now-(MOT.touch.get(key)||0)<250)continue;const v=lanes[key][idx];if(v==null)continue;const cur=motGet(key);if(cur==null||Math.abs(cur-v)>1e-4)motWrite(key,v)}};
    if(P)run(P,st*4+k);if(X)run(X,(((g%64)+64)%64)*4+k)},Math.max(0,(t+k*sd/4-ctx.currentTime)*1000-8))}
{const _bp=beatPump;beatPump=function(t,st){_bp(t,st);try{motPlay(t,st)}catch(e){globalThis.__el&&globalThis.__el(e)}}}
{const _sp=stop;stop=function(){_sp.apply(this,arguments);MOT.pos.length=0}}
/* a dot on every control that has moves in the pattern on screen */
function motBadges(){const M=S.mot||{},P=M['p'+S.pat]||{},X=M.x||{};document.querySelectorAll('.mlk').forEach(el=>{const k=motKeyOf(el);el.classList.toggle('mot',!!k&&(!!P[k]||!!X[k]))})}
{const _ra=renderAll;renderAll=function(){_ra.apply(this,arguments);try{motBadges();motList()}catch(e){globalThis.__el&&globalThis.__el(e)}}}
/* the list, in the master card: what has moves, per pattern, with × to clear */
function motList(){document.querySelectorAll('.m2-mot,.mo-list').forEach(motList1);const n=motCount(),b=document.getElementById('motBtn');if(b){b.querySelector('b').textContent=n;b.classList.toggle('has',n>0)}}
function motCount(){const M=S.mot||{};let n=0;for(const g in M)for(const k in M[g]||{})if(M[g][k]&&M[g][k].some(v=>v!=null))n++;return n}
function motList1(box){const M=motStore(),rows=[];
  Object.keys(M).sort().forEach(g=>Object.keys(M[g]||{}).forEach(k=>{const L=M[g][k];if(!L||!L.some(v=>v!=null))return;rows.push([g,k])}));
  box.innerHTML=rows.length?rows.map(([g,k])=>{const L=M[g][k],w=L.length,pts=L.map((v,i)=>v==null?null:[i/(w-1)*100,v]).filter(Boolean);
      const lo=Math.min(...pts.map(p=>p[1])),hi=Math.max(...pts.map(p=>p[1])),sc=hi-lo>1e-6?hi-lo:1,path=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+(16-((p[1]-lo)/sc)*14).toFixed(1)).join(' ');
      return `<div class="mo-r"><b>${g==='x'?'starter':'ABCD'[+g.slice(1)]||g}</b><span>${(S.motL||{})[k]||k}</span><svg viewBox="0 0 100 18" preserveAspectRatio="none"><path d="${path}"/></svg><button data-g="${g}" data-k="${k}" aria-label="Ta bort rörelsen">×</button></div>`}).join('')+'<button class="mo-clr">töm alla rörelser</button>'
    :'<p class="mo-e">inga rörelser än · tryck ● och ▶, vrid sedan på en ratt (filter, cutoff, eko …) så spelas rörelsen in i loopen</p>';
  box.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{delete M[b.dataset.g][b.dataset.k];save();motBadges();motList();toast('Rörelsen är borta')});
  const c=box.querySelector('.mo-clr');if(c)c.onclick=()=>{S.mot={};save();motBadges();motList();toast('Alla rörelser borta')}}
(()=>{const root=document.querySelector('.card[data-card="master"] .m2');if(!root)return;const sec=document.createElement('div');sec.className='m2-sec';sec.innerHTML='<span>rörelser</span><small>● + ▶ och vrid på en ratt · spelas upp i loopen · ta tag i ratten för att ta över</small>';
  const box=document.createElement('div');box.className='m2-mot';root.appendChild(sec);root.appendChild(box);motList();setTimeout(motBadges,500)})();

