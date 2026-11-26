/* ---------------- project library ---------------- */
const PKEYS=['nrep','stxw','smpk','enk','trk','ck','gxEx','clips','duoMem','stxSnap','mods','userPre','rsPre','arr','mot','motL','stx','gfx','bus','solos','chop','se','glitch','eu','len','lock','tfx','dk','loops','bpm','pats','roll','inst','params','master','world','eng','synth','fx','chain','song','chord','glideT','mute','solo','pat','sel'];
const LIBK=KEY+'-lib',CURK=KEY+'-cur';
const pjData=()=>{const o={};PKEYS.forEach(k=>{if(S[k]!==undefined)o[k]=S[k]});return JSON.parse(JSON.stringify(o))};
const pjId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
let LIB=[],CUR=null;
try{LIB=JSON.parse(localStorage.getItem(LIBK)||'[]');CUR=localStorage.getItem(CURK)}catch(e){globalThis.__el&&globalThis.__el(e)}
if(!Array.isArray(LIB))LIB=[];
if(!LIB.length||!LIB.some(p=>p.id===CUR)){CUR=pjId();LIB.push({id:CUR,name:'Project '+(LIB.length+1),t:Date.now(),c:Date.now(),data:pjData()})}
function libWrite(){try{localStorage.setItem(LIBK,JSON.stringify(LIB));localStorage.setItem(CURK,CUR)}catch(e){toast('Lagringen är full – radera något projekt')}}
function curP(){return LIB.find(p=>p.id===CUR)}
function libSync(){const p=curP();if(!p)return;p.data=pjData();p.t=Date.now();libWrite();$('#projName').textContent=p.name.toLowerCase()}
libWrite();$('#projName').textContent=curP().name.toLowerCase();
function loadProject(p){if(playing)stop();const d=JSON.parse(JSON.stringify(p.data));
  PKEYS.forEach(k=>{if(d[k]!==undefined)S[k]=d[k]});window.__healed=[];window.__healNoted=0;try{stateHeal()}catch(e){console.error('stateHeal',e)}if(!d.glitch)S.glitch={amt:0,mask:127};if(!d.se)S.se={};if(!d.ck)S.ck={};if(!d.trk)S.trk=null;if(!d.enk)S.enk={};if(!d.stxw)S.stxw={};if(!d.nrep)S.nrep={};if(!d.smpk)S.smpk={};if(!d.chop)S.chop={};if(!d.bus)S.bus=null;if(!d.gfx)S.gfx={};if(!d.stx)S.stx=null;if(!d.arr)S.arr=null;if(!d.clips)S.clips=null;if(!d.gxEx)S.gxEx={};if(!d.mods)S.mods=null;if(!d.mot)S.mot={};if(!d.motL)S.motL={};if(!d.solos){S.solos=[];if(d.solo>=0)S.solos[d.solo]=1}S.solo=-1;if(!d.dk)S.dk={};if(!d.tfx)S.tfx={};if(!d.len)S.len={};if(!d.lock)S.lock={};if(!d.loops)S.loops=[0,1,2,3].map(()=>({sid:null,on:1,vol:.8,bars:0}));if(typeof loopsKill==='function'){loopsKill();renderLoops();warmSamples()}
  TRACKS.forEach(t=>{if(!S.params[t.id])S.params[t.id]=JSON.parse(JSON.stringify(DEF_P[t.id]))});while(S.mute.length<TRACKS.length)S.mute.push(0);
  for(const e in DEFS.eng)S.eng[e]=Object.assign({},DEFS.eng[e],S.eng[e]||{});
  try{stateHealEng()}catch(e){console.error('stateHealEng',e)}healNote();if(window.trkFix)trkFix();CUR=p.id;HIST.length=0;REDO.length=0;if(typeof rSel!=='undefined')rSel.clear();
  refreshSound();renderAll();renderChain();applyMaster();save();libWrite();$('#projName').textContent=p.name.toLowerCase()}
function freshData(){const d=pjData();d.pats=demo().map(pt=>pt.map((row,ti)=>row.map(c=>({v:0,n:c.n}))));
  d.roll=d.pats.map(()=>{const o={};TRACKS.forEach(t=>{if(t.mel)o[t.id]=[]});return o});d.chain=[0,0,0,0,0,0,0,0];d.song=0;d.pat=0;
  d.mute=TRACKS.map(()=>0);d.solo=-1;d.trk=null;/* a new project starts with 10 drums and 4 synths */return d}

/* fan UI */
const pj=$('#proj'),stage=$('#pjStage');let pjFocus=0,pjF=0,pjV=0,pjRaf=0,pjEls=[],pjOrder=[],delArm=0;
const fmtD=t=>{const d=new Date(t),n=new Date(),same=d.toDateString()===n.toDateString();
  return same?'idag '+d.toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString('sv-SE',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'})};
function thumb(cv,d){const W=cv.width=160,H=cv.height=74,c=cv.getContext('2d');c.clearRect(0,0,W,H);const pt=d.pats&&d.pats[0];if(!pt)return;
  const rows=pt.length,cw=W/16,rh=H/rows;for(let r=0;r<rows;r++)for(let s=0;s<16;s++){const v=pt[r][s].v;c.beginPath();c.arc(cw*(s+.5),rh*(r+.5),v?Math.min(cw,rh)*.34:1.1,0,6.2832);
    c.fillStyle=v?(v===2?'rgba(255,255,255,1)':'rgba(255,255,255,.8)'):'rgba(255,255,255,.28)';c.fill()}}
function pjBuild(){stage.querySelectorAll('.pj-card').forEach(e=>e.remove());pjOrder=LIB.slice().sort((a,b)=>a.c-b.c);
  pjEls=pjOrder.map((p,i)=>{const el=document.createElement('div');el.className='pj-card';el.innerHTML='<div class="pc-now" title="öppet nu"></div><div class="pc-n"></div><div class="pc-d"></div><canvas></canvas><div class="pc-b"><b></b><small>bpm</small></div>';
    el.querySelector('.pc-n').textContent=p.name;el.querySelector('.pc-d').textContent=fmtD(p.t);el.querySelector('b').textContent=p.data.bpm||'—';thumb(el.querySelector('canvas'),p.data);
    el.classList.toggle('cur',p.id===CUR);el.dataset.i=i;stage.appendChild(el);return el});
  $('#pjCount').textContent=String(LIB.length).padStart(2,'0')+' sparade';pjPose();pjSheet()}
function pjPose(){const n=pjEls.length,sp=Math.min(innerWidth*.035,46);pjEls.forEach((el,i)=>{const d=i-pjF,a=Math.abs(d),sg=Math.sign(d),e=Math.min(a,1);
  const x=sg*(e*Math.min(innerWidth*.28,170)+Math.max(0,a-1)*sp),z=-e*140-Math.max(0,a-1)*18,ry=-sg*e*64,sc=1-e*.12;
  el.style.transform=`translate3d(${x}px,0,${z}px) rotateY(${ry}deg) scale(${sc})`;el.style.zIndex=1000-Math.round(a*10);el.style.opacity=a>9?0:1-Math.max(0,a-6)*.25;
  el.classList.toggle('focus',Math.round(pjF)===i)})}
function pjTick(){const tgt=pjFocus;pjV=(pjV+(tgt-pjF)*.16)*.62;pjF+=pjV;if(Math.abs(tgt-pjF)<.001&&Math.abs(pjV)<.001){pjF=tgt;pjPose();pjRaf=0;return}pjPose();pjRaf=requestAnimationFrame(pjTick)}
function pjGo(i,snap=true){const n=pjEls.length;pjFocus=clamp(snap?Math.round(i):i,0,n-1);delArm=0;$('#pjDel').classList.remove('warn');pjSheet();if(!pjRaf)pjRaf=requestAnimationFrame(pjTick)}
function dupName(n){const b=n.replace(/ kopia( \d+)?$/,'');let k=1,nm=b+' kopia';while(LIB.some(p=>p.name===nm))nm=b+' kopia '+(++k);return nm}
function pjSel(){return pjOrder[Math.round(pjFocus)]}
function pjSheet(){const p=pjSel();if(!p)return;const inp=$('#pjNameIn');if(document.activeElement!==inp)inp.value=p.name;
  const nPat=p.data.pats?p.data.pats.filter(pt=>pt.some(r=>r.some(c=>c.v))).length:0;
  $('#pjMeta').textContent=(p.id===CUR?'öppet nu · ':'')+'sparat '+fmtD(p.t)+' · '+(p.data.bpm||'?')+' bpm · '+nPat+'/4 mönster';
  $('#pjOpen').firstChild.textContent=p.id===CUR?'tillbaka ':'öppna ';pjTl()}
function pjTl(){const cv=$('#pjTl'),r=cv.getBoundingClientRect();if(!r.width)return;const dpr=devicePixelRatio||1;cv.width=r.width*dpr;cv.height=r.height*dpr;const c=cv.getContext('2d');c.scale(dpr,dpr);
  const W=r.width,H=r.height,y=H-14,n=pjOrder.length,X=i=>n<2?W/2:14+(W-28)*i/(n-1);
  for(let x=4;x<W-4;x+=6){const big=Math.round((x-4)/6)%8===0;c.fillStyle=big?'rgba(255,255,255,.4)':'rgba(255,255,255,.16)';c.fillRect(x,y-(big?9:5),1,big?9:5)}
  const cols=['#F2C318','#6BE28C','#F255A8','#B9A6FF','#F27A2E','#A8C2A0'];
  pjOrder.forEach((p,i)=>{const sel=i===Math.round(pjFocus);c.beginPath();c.arc(X(i),y-18,sel?5:3.2,0,6.2832);c.fillStyle=p.id===CUR?'#6BE28C':cols[i%cols.length];c.globalAlpha=sel?1:.75;c.fill();c.globalAlpha=1});
  const ci=pjOrder.findIndex(p=>p.id===CUR),h=$('#pjHere');h.style.left=clamp(X(ci<0?0:ci),40,W-40)+'px';h.style.top=(y-48)+'px'}
function openProj(){libSync();pj.hidden=false;requestAnimationFrame(()=>pj.classList.add('show'));pjBuild();const ci=pjOrder.findIndex(p=>p.id===CUR);pjF=pjFocus=Math.max(0,ci);pjPose();pjSheet()}
function closeProj(){pj.classList.remove('show');setTimeout(()=>{pj.hidden=true},300)}
$('#projBtn').onclick=openProj;$('#pjBtn2').onclick=openProj;$('#pjX').onclick=closeProj;
document.addEventListener('keydown',e=>{if(pj.hidden||document.activeElement===$('#pjNameIn'))return;
  if(e.key==='Escape')closeProj();else if(e.key==='ArrowLeft')pjGo(pjFocus-1);else if(e.key==='ArrowRight')pjGo(pjFocus+1);else if(e.key==='Enter')$('#pjOpen').click()});
(()=>{let on=false,x0=0,f0=0,moved=0,lastX=0,lastT=0,vel=0;
  stage.addEventListener('pointerdown',e=>{on=true;moved=0;x0=lastX=e.clientX;lastT=performance.now();f0=pjFocus;vel=0;stage.setPointerCapture(e.pointerId)});
  stage.addEventListener('pointermove',e=>{if(!on)return;const dx=e.clientX-x0;moved=Math.max(moved,Math.abs(dx));const now=performance.now();vel=(e.clientX-lastX)/Math.max(1,now-lastT);lastX=e.clientX;lastT=now;
    if(moved>4)pjGo(f0-dx/70,false)});
  stage.addEventListener('pointerup',e=>{if(!on)return;on=false;if(moved<=4){const el=document.elementsFromPoint(e.clientX,e.clientY).find(n=>n.classList&&n.classList.contains('pj-card'));
      if(el){const i=+el.dataset.i;if(i===Math.round(pjFocus))$('#pjOpen').click();else pjGo(i)}return}
    pjGo(pjFocus-vel*4)});
  stage.addEventListener('pointercancel',()=>{on=false;pjGo(pjFocus)});
  stage.addEventListener('wheel',e=>{e.preventDefault();pjGo(pjFocus+(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)/120,false);clearTimeout(stage._w);stage._w=setTimeout(()=>pjGo(pjFocus),120)},{passive:false})})();
$('#pjNameIn').addEventListener('input',e=>{const p=pjSel();if(!p)return;p.name=e.target.value.trim()||'Utan namn';libWrite();const el=pjEls[Math.round(pjFocus)];if(el)el.querySelector('.pc-n').textContent=p.name;if(p.id===CUR)$('#projName').textContent=p.name.toLowerCase()});
$('#pjNameIn').addEventListener('keydown',e=>{if(e.key==='Enter')e.target.blur()});
$('#pjOpen').onclick=()=>{const p=pjSel();if(!p)return;if(p.id!==CUR){libSync();loadProject(p);toast('Öppnade '+p.name)}closeProj()};
$('#pjNew').onclick=()=>{libSync();const p={id:pjId(),name:'Project '+(LIB.length+1),t:Date.now(),c:Date.now(),data:freshData()};LIB.push(p);loadProject(p);pjBuild();pjF=pjFocus=pjOrder.indexOf(p);pjPose();pjSheet();toast('Nytt tomt projekt')};
$('#pjDup').onclick=()=>{const src=pjSel();if(!src)return;if(src.id===CUR)libSync();const p={id:pjId(),name:dupName(src.name),t:Date.now(),c:Date.now(),data:JSON.parse(JSON.stringify(src.data))};LIB.push(p);libWrite();pjBuild();pjGo(pjOrder.indexOf(p));toast('Duplicerat')};
$('#pjDel').onclick=()=>{const p=pjSel();if(!p)return;if(LIB.length<2){toast('Det sista projektet kan inte raderas');return}
  if(!delArm){delArm=1;$('#pjDel').classList.add('warn');$('#pjDel').lastChild.textContent='säker?';setTimeout(()=>{delArm=0;$('#pjDel').classList.remove('warn');$('#pjDel').lastChild.textContent='radera'},2500);return}
  delArm=0;$('#pjDel').classList.remove('warn');$('#pjDel').lastChild.textContent='radera';const i=Math.round(pjFocus);LIB=LIB.filter(q=>q!==p);
  if(p.id===CUR){const next=LIB.slice().sort((a,b)=>a.c-b.c)[Math.min(i,LIB.length-1)];loadProject(next)}libWrite();pjBuild();pjF=pjFocus=clamp(i,0,pjEls.length-1);pjPose();pjSheet();toast('Raderat '+p.name)};
$('#pjExp').onclick=async()=>{const p=pjSel();if(!p)return;if(p.id===CUR)libSync();const txt=JSON.stringify({blonda:'seq3',v:1,name:p.name,data:p.data}),fn=(p.name.replace(/[^\wåäöÅÄÖ -]/g,'')||'project')+'.blonda.json';
  const dl=window.claude&&window.claude.use?await window.claude.use('downloads').catch(()=>null):null;
  if(dl){try{await dl.save({filename:fn,data:txt});toast('Sparade '+fn)}catch(e){toast(e&&e.code==='declined'?'Export avbruten':'Export stöds inte här')}return}
  try{const f=new File([txt],fn,{type:'application/json'});if(navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f],title:p.name}).catch(()=>{});return}}catch(e){globalThis.__el&&globalThis.__el(e)}
  try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'application/json'}));a.download=fn;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);toast('Exporterar '+fn)}catch(e){toast('Export stöds inte här')}};
$('#pjImp').onclick=()=>$('#pjFile').click();
$('#pjFile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{const o=JSON.parse(await f.text()),d=o.data||o;if(!d.pats||d.pats.length!==4)throw 0;
  const p={id:pjId(),name:o.name||f.name.replace(/\..*$/,''),t:Date.now(),c:Date.now(),data:d};LIB.push(p);libWrite();pjBuild();pjGo(pjOrder.indexOf(p));toast('Importerade '+p.name)}catch(err){toast('Kunde inte läsa filen')}};
addEventListener('resize',()=>{if(!pj.hidden){pjPose();pjTl()}});
/* smooth playhead band over the step grid */
const phb=document.createElement('div');phb.className='phband';const gridCard=document.querySelector('.card[data-card="grid"]');gridCard.appendChild(phb);
function updPhBand(){if(!playing||curStep<0||!gridEl.offsetParent){if(phb.style.opacity!=='0')phb.style.opacity='0';return}
  const cells=gridEl.querySelector('.cells');if(!cells)return;const r=cells.getBoundingClientRect(),cr=gridCard.getBoundingClientRect(),gr=gridEl.getBoundingClientRect(),cw=r.width/16,pos=playPos()??curStep;
  phb.style.opacity='1';phb.style.width=cw+'px';phb.style.height=gr.height+'px';phb.style.transform=`translate(${(r.left-cr.left+pos*cw).toFixed(1)}px,${(gr.top-cr.top).toFixed(1)}px)`}

