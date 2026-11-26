/* ---------- editing the Starter in the tracker ----------
   chord: pick another chord for that chord's part of the bar (from the chords that suit the key) — it becomes your own progression;
   sub: pick the bass note under that chord; top: pick, add or remove a note on that step. Scroll on a sub/top note moves it a scale
   step. Alt-click: top = remove the note (again = back to what the Starter wrote), sub/chord = back to the Starter's own.
   Everything goes through the Starter's own edit layer (P.ed / P.custom), so it shows and plays the same in the big Starter. */
const SCL={dur:[0,2,4,5,7,9,11],moll:[0,2,3,5,7,8,10]};
const ciAt=(q,n)=>n>4?(q>>4)*2+((q&15)<8?0:1):(q>>4);
const inScale=(P,n)=>(SCL[P.mode]||SCL.moll).includes((((n-P.root)%12)+12)%12);
const stepScale=(P,n,d)=>{let m=n;for(let k=0;k<12;k++){m+=d;if(inScale(P,m))return m}return n+d};
function stEdit(fn,msg){push();const P=stx();fn(P);commit();trkPaint(true);if(msg)toast(msg)}
function chordPick(anchor,q){const P=stx(),prog=stxProg(P).map(e=>Array.isArray(e)?e.slice():e),ci=ciAt(q,prog.length),cur=prog[ci];
  const pool=(STX_POOL[P.mode]||[]).map(e=>e.slice());if(Array.isArray(cur)&&!pool.some(e=>e[0]===cur[0]&&e[1]===cur[1]))pool.unshift(cur.slice());
  const names=pool.map(e=>stxCh(P,e).name),sel=Math.max(0,pool.findIndex(e=>Array.isArray(cur)&&e[0]===cur[0]&&e[1]===cur[1]));
  pickShow(anchor,names,sel,i=>stEdit(P=>{const ch=stxProg(P).map(e=>Array.isArray(e)?e.slice():e);ch[ci]=pool[i].slice();P.custom={mode:P.mode,ch,nm:'egen'};P.prog=0},
    'ackord '+(ci+1)+' · '+names[i]))}
function subPick(anchor,q){const P=stx(),ch=stxChords(P),ci=ciAt(q,ch.length),c=ch[ci],lo=P.subLo??33,base=lo+(((c.r-lo)%12)+12)%12;
  const ns=[];for(let n=lo-5;n<=lo+14;n++)if(inScale(P,n)||c.iv.some(v=>(((n-c.r-v)%12)+12)%12===0))ns.push(n);
  const cur=((P.ed.sub||{})[ci]&&P.ed.sub[ci].nm===c.name)?P.ed.sub[ci].n:base;
  const L=['grundton (startern)',...ns.map(n=>nName(n)+(n===base?' · grundton':c.iv.some(v=>(((n-c.r-v)%12)+12)%12===0)?' · ackordton':''))];
  pickShow(anchor,L,Math.max(0,ns.indexOf(cur)+1),i=>stEdit(P=>{if(!i)delete P.ed.sub[ci];else P.ed.sub[ci]={nm:c.name,n:ns[i-1]}},i?'sub '+nName(ns[i-1])+' under '+c.name:'sub · grundton'))}
function topPick(anchor,q,ev){const P=stx(),ref=60+P.root,cur=ev&&ev.klo?ev.klo.n:null,ns=[];for(let n=ref-7;n<=ref+19;n++)if(inScale(P,n))ns.push(n);
  const L=['ingen ton här','som startern skrev',...ns.slice().reverse().map(nName)];const rv=ns.slice().reverse();
  pickShow(anchor,L,cur!=null&&rv.includes(cur)?rv.indexOf(cur)+2:0,i=>stEdit(P=>{if(i===0)P.ed.klo[q]=0;else if(i===1)delete P.ed.klo[q];else P.ed.klo[q]=rv[i-2]},
    i===0?'topp borta · steg '+q.toString(16).toUpperCase():i===1?'topp som startern skrev':'topp '+nName(rv[i-2])+' · steg '+q.toString(16).toUpperCase()))}
trkBox.addEventListener('click',e=>{const c=e.target.closest('.sc');if(!c||typeof pickShow!=='function')return;const l=c.dataset.l,q=+c.dataset.q,P=stx();
  if(!P.on){toast('Startern är av');return}let pl=null;try{pl=stxPlanCached()}catch(_){globalThis.__el&&globalThis.__el(_)}const ev=pl?pl.steps[q]:null;
  if(e.altKey){if(l==='klo')stEdit(P=>{if(P.ed.klo[q]===0||(P.ed.klo[q]!=null&&!(ev&&ev.klo)))delete P.ed.klo[q];else P.ed.klo[q]=0},'topp · steg '+q.toString(16).toUpperCase());
    else if(l==='sub'){const ci=ciAt(q,stxChords(P).length);stEdit(P=>{delete P.ed.sub[ci]},'sub · grundton')}
    else stEdit(P=>{P.custom=null},'ackord · startern');return}
  if(l==='ack')chordPick(c,q);else if(l==='sub')subPick(c,q);else topPick(c,q,ev)});
trkBox.addEventListener('wheel',e=>{const c=e.target.closest('.sc.k-st');if(!c)return;const l=c.dataset.l;if(l==='ack')return;e.preventDefault();
  clearTimeout(trkBox._w);const q=+c.dataset.q,P=stx();let pl=null;try{pl=stxPlanCached()}catch(_){globalThis.__el&&globalThis.__el(_)}const ev=pl&&pl.steps[q];if(!ev||!ev[l])return;const d=e.deltaY<0?1:-1;
  if(!trkBox._wp){push();trkBox._wp=1}trkBox._w=setTimeout(()=>{trkBox._wp=0},500);
  if(l==='klo'){P.ed.klo[q]=stepScale(P,ev.klo.n,d)}else{const ch=stxChords(P),ci=ev.ci!=null?ev.ci:ciAt(q,ch.length),c=ch[ci],lo=P.subLo??33,e0=(P.ed.sub||{})[ci],cur=e0&&e0.nm===c.name?e0.n:lo+(((c.r-lo)%12)+12)%12;P.ed.sub[ci]={nm:c.name,n:stepScale(P,cur,d)}}
  commit();trkPaint(true)},{passive:false});
function loop(){if(!DUO.open)return;requestAnimationFrame(loop);try{outDraw()}catch(e){globalThis.__el&&globalThis.__el(e)}const vg=window.__visG?__visG():-1;if(vg>=0){HG=vg}const k=[playing?HG:-1,playing].join('|');if(k!==lastK){lastK=k;trkPaint();draw();$d('.d-play').innerHTML=playing?PAUSE:PLAY}}
let HG=0;const hG=()=>playing?(window.__visG&&__visG()>=0?__visG():HG):-1;
function open(){if(DUO.open)return;DUO.open=true;boxMode();if(el.classList.contains('box')&&TRK.on){TRK.on=false;el.classList.remove('trk')}el.hidden=false;initAudio();
  const P=stx();if(!P.on){P.on=1;try{stxEnsure()}catch(e){globalThis.__el&&globalThis.__el(e)}commit()}
  try{localStorage.setItem('blonda.duo','1')}catch(e){globalThis.__el&&globalThis.__el(e)}paint();requestAnimationFrame(loop)}
function close(){if(!DUO.open)return;DUO.open=false;window.__half=0;tapeRate=1;try{if(window.__rpt)__rpt.release()}catch(_){globalThis.__el&&globalThis.__el(_)}el.hidden=true;if(DUO.mel){MELT.forEach((i,k)=>{S.mute[i]=DUO.mel[k]});DUO.mel=null;try{applyAll()}catch(e){globalThis.__el&&globalThis.__el(e)}save()}
  try{localStorage.setItem('blonda.duo','0')}catch(e){globalThis.__el&&globalThis.__el(e)}try{renderAll()}catch(e){globalThis.__el&&globalThis.__el(e)}}
addEventListener('resize',()=>{if(DUO.open)draw()});
{const _sp=window.stxPaint;if(_sp)window.stxPaint=function(){const r=_sp.apply(this,arguments);try{if(DUO.open)paint()}catch(e){globalThis.__el&&globalThis.__el(e)}return r}}
{const _ra=renderAll;renderAll=function(){const r=_ra.apply(this,arguments);try{if(DUO.open)paint()}catch(e){globalThis.__el&&globalThis.__el(e)}return r}}
/* the way in: a button among the tools (on a phone they ride on the pattern row) */
const ic='<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="2.2"/></svg>';
{const hx=document.querySelector('header .hx')||document.querySelector('.hx');const b=document.createElement('button');b.className=(hx&&hx.firstElementChild?hx.firstElementChild.className:'gbtn')+' duo-btn';b.id='duoBtn';b.title='Idéläge – Starter och trummor på en skärm';b.innerHTML=ic+'<span>idé</span>';b.onclick=open;
  if(hx)hx.insertBefore(b,hx.firstChild);else document.body.appendChild(b)}
try{if(localStorage.getItem('blonda.duo')==='1'&&innerWidth<=719)setTimeout(open,700)}catch(e){globalThis.__el&&globalThis.__el(e)}
/* while idea mode is open the synth tracks' own patterns are held back (only notes from the sequencer); the Starter plays
   its layers through the same channels with the raw trigger, so those are heard */
/* v215: the synth tracks carry the Starter's notes now, so they play in the idea screen too (they used to be held back here) */
window.__engLoad=engLoad;window.__engRefresh=engRefresh;
DUO.big={engLoad,bigSounds,fatten,BIG,BIG_LV,BIG_OCT,octOf,ROLE_TRK,engRefresh};
/* keyboard (computer): space play/stop · enter or N new idea · C chords · G groove · S sounds · ← → presets · 1–4 memories ·
   Q / W held = half / stutter · ⌘Z / ⇧⌘Z (Ctrl on Windows) undo / redo · + − tempo · esc close. Only while idea mode is open;
   the keys stop here so the main app underneath doesn't also react (notes on Z–M, the tracker cursor …). */
{const ptr=(b,type)=>{try{b.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:1,isPrimary:true,button:0}))}catch(e){globalThis.__el&&globalThis.__el(e)}};const held={};
  addEventListener('keydown',e=>{if(!DUO.open)return;if(e.target&&e.target.closest&&e.target.closest('input,textarea,[contenteditable],.pk-pop'))return;
    const k=e.key,lk=k.length===1?k.toLowerCase():k,mod=e.metaKey||e.ctrlKey,click=q=>{const b=$d(q);if(b)b.click()};let hit=true;
    if(mod&&lk==='z')click(e.shiftKey?'[data-u="r"]':'[data-u="u"]');
    else if(mod)return;
    else if(k===' ')click('.d-play');
    else if(k==='Enter'||lk==='n'){if(!e.repeat)click('[data-a="idea"]')}
    else if(lk==='c'){if(!e.repeat)click('[data-a="ch"]')}else if(lk==='g'){if(!e.repeat)click('[data-a="gr"]')}else if(lk==='s'){if(!e.repeat)click('[data-a="snd"]')}else if(lk==='k'){if(!e.repeat)click('.d-key2')}
    else if(k==='ArrowLeft')click('[data-pp="-1"]');else if(k==='ArrowRight')click('[data-pp="1"]');
    else if(/^[1-4]$/.test(k)){if(!e.repeat){const b=$d('[data-m="'+(+k-1)+'"]');ptr(b,'pointerdown');ptr(b,'pointerup')}}
    else if(lk==='q'||lk==='w'){if(!held[lk]){held[lk]=1;ptr($d(lk==='q'?'.d-fx.l':'.d-fx.r'),'pointerdown')}}
    else if(k==='+'||k==='=')setBpm(S.bpm+1),paint();else if(k==='-'||k==='_')setBpm(S.bpm-1),paint();
    else if(lk==='t'){if(!e.repeat)trkSet(!TRK.on)}
    else if(k==='Escape')close();
    else hit=false;
    e.stopImmediatePropagation();if(hit||k.length===1)e.preventDefault()},true);
  addEventListener('keyup',e=>{if(!DUO.open)return;const lk=e.key.length===1?e.key.toLowerCase():e.key;if((lk==='q'||lk==='w')&&held[lk]){held[lk]=0;ptr($d(lk==='q'?'.d-fx.l':'.d-fx.r'),'pointerup')}e.stopImmediatePropagation()},true);
  addEventListener('blur',()=>{for(const lk in held)if(held[lk]){held[lk]=0;ptr($d(lk==='q'?'.d-fx.l':'.d-fx.r'),'pointerup')}})}
window.duoOpen=open;window.duoClose=close;window.__duo=DUO;
/* v216: the synth module's dice runs the same actions as the idea screen's buttons (new chords) */
window.duoAct=k=>{initAudio();ctx.resume();push();const m=act[k]();if(k==='idea'||k==='gr')drumsAll();commit();return m};
})();

