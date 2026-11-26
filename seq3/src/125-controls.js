/* ---------------- controls ---------------- */
$('#playBtn').onclick=play;
$('#recBtn').onclick=()=>{recording=!recording;document.body.classList.toggle('recording',recording);$('#recHint').textContent=recording?'● REC':'';toast(recording?'Inspelning: spela på pads eller klaviaturen · vrid på en ratt så spelas rörelsen in':'Inspelning av');if(recording&&!playing)play()};
document.querySelectorAll('.pat').forEach(b=>b.onclick=()=>{const p=+b.dataset.p;if(playing&&p!==S.pat){queued=p;toast('Byter till '+'ABCD'[p]+' vid nästa takt')}else{S.pat=p;queued=-1}renderAll();save()});
$('#copyPat').onclick=()=>{pushHist();const to=(S.pat+1)%4;S.pats[to]=JSON.parse(JSON.stringify(S.pats[S.pat]));S.roll[to]=JSON.parse(JSON.stringify(S.roll[S.pat]));toast('ABCD'[S.pat]+' kopierat till '+'ABCD'[to]);save()};
$('#palBtn').onclick=()=>applyWorld((S.world+1)%WORLDS.length);
function setBpm(v){S.bpm=clamp(Math.round(v),60,180);setDM($('#bpmNum'),String(S.bpm));applyMaster();save()}
$('#bpmUp').onclick=()=>setBpm(S.bpm+1);$('#bpmDn').onclick=()=>setBpm(S.bpm-1);
(()=>{const el=$('#bpmNum');let y0=0,b0=0;el.addEventListener('pointerdown',e=>{el.setPointerCapture(e.pointerId);y0=e.clientY;b0=S.bpm});
  el.addEventListener('pointermove',e=>{if(el.hasPointerCapture(e.pointerId))setBpm(b0+(y0-e.clientY)/4)})})();
$('#actClear').onclick=()=>{pushHist();S.pats[S.pat][S.sel].forEach(clrStep);renderCells();save();toast(TRACKS[S.sel].name+' rensad')};
$('#actShift').onclick=()=>{pushHist();if(TRACKS[S.sel].mel){S.roll[S.pat][TRACKS[S.sel].id].forEach(n=>{n.s=(n.s+1)%16});syncCells(S.pat,S.sel);renderCells();save();return}const r=S.pats[S.pat][S.sel];r.unshift(r.pop());renderCells();save()};
$('#actVar').onclick=()=>{pushHist();const r=S.pats[S.pat][S.sel],t=TRACKS[S.sel];r.forEach(s=>{const p=Math.random();
    if(s.v&&p<.18)clrStep(s);else if(!s.v&&p<.12)s.v=1;else if(s.v&&p<.3){s.v=s.v===2?1:2;delete s.vel}
    if(t.mel&&s.v&&Math.random()<.25){const i=SCALE.indexOf(s.n);s.n=SCALE[clamp((i<0?0:i)+(Math.random()<.5?-2:2),0,SCALE.length-1)]}});renderCells();save();toast('Variation på '+t.name)};
$('#actMute').onclick=()=>{S.mute[S.sel]=S.mute[S.sel]?0:1;applyAll();renderSel();save()};
$('#actSolo').onclick=()=>{soloTog(S.sel);applyAll();renderSel();save()};
const tabBtns=[...document.querySelectorAll('.tabs button')];
function setView(v,anim){tabBtns.forEach((b,i)=>{const on=b.dataset.v===v;b.classList.toggle('cur',on);if(on)$('#tabInd').style.transform=`translateX(${i*100}%)`});panes.dataset.v=v;
  try{localStorage.setItem(KEY+'-view',v)}catch(e){globalThis.__el&&globalThis.__el(e)}
  if(anim&&!RM){panes.scrollTop=0;let i=0;cards().forEach(c=>{if(!c.offsetParent)return;c.classList.remove('enter');void c.offsetWidth;c.style.setProperty('--i',i++);c.classList.add('enter')})}}
tabBtns.forEach(b=>b.onclick=()=>setView(b.dataset.v,true));
document.addEventListener('animationend',e=>{if(e.animationName==='enter')e.target.classList.remove('enter')});
const typing=e=>{const t=e.target;return !!(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))};
document.addEventListener('keydown',e=>{if(typing(e))return;if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return}if(e.code==='Space'){e.preventDefault();play()}if(/^[0-9]$/.test(e.key)&&!e.metaKey&&!e.ctrlKey){const k=e.key==='0'?9:+e.key-1,j=window.trkKey?trkKey(k):k;if(j>=0&&j<TRACKS.length)hitPad(j)}});
let tt=0;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),1500)}
$('#startBtn').onclick=()=>{initAudio();ctx.resume();$('#start').classList.add('out');setTimeout(()=>{$('#start').hidden=true},650);
  let i=0;if(!RM)cards().forEach(c=>{if(!c.offsetParent)return;c.style.setProperty('--i',i++);c.classList.add('enter')})};

