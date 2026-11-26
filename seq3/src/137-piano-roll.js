/* ---------------- piano roll ---------------- */
const roll=$('#roll'),rCv=$('#rollCv'),rVel=$('#rollVel');
const MEL=TRACKS.map((t,i)=>t.mel?i:-1).filter(i=>i>=0),LO=24,HI=96,KW=46;
let rShift=false,rClip=[];const nid=()=>Math.random().toString(36).slice(2,9);
function glideTime(id){return (S.inst[id]==='acid')?.02+S.eng.acid.st*.28:(S.glideT||.07)}
let rOpen=false,rT=8,rMode='draw',rSnapI=0,rLenI=0,rZoom=1,rRowH=18,rSY=0,rSX=0,rScale=true,rGhost=true,rDrag=null,rLastTap={t:0,n:null},rPan=null,rLock=false,lastVel=.8;
const rSel=new Set(),rPtr=new Map(),rPress=new Map();
const SNAPS=[[1,'1/16'],[.5,'1/32'],[.25,'1/64']],LENS=[[1,'1/16'],[2,'1/8'],[4,'1/4'],[8,'1/2'],[16,'1 takt']];
const rSnap=()=>SNAPS[rSnapI][0],rLen=()=>LENS[rLenI][0];
const inScale=n=>[0,2,3,5,7,8,10].includes(((n-9)%12+12)%12),isBlack=n=>[1,3,6,8,10].includes(n%12);
const RN=()=>S.roll[S.pat][TRACKS[rT].id];
function rGeom(){const w=rCv.clientWidth,h=rCv.clientHeight,gw=Math.max(1,w-KW);return {w,h,gw,sw:gw/16*rZoom,rows:HI-LO+1}}
function rClamp(){const g=rGeom();rSX=clamp(rSX,0,Math.max(0,g.sw*16-g.gw));rSY=clamp(rSY,0,Math.max(0,g.rows*rRowH-g.h))}
function rCenter(){const ns=RN().map(n=>n.n);if(!ns.length)ns.push(firstNote(rT));const mid=(Math.min(...ns)+Math.max(...ns))/2,g=rGeom();rSY=(HI-mid+.5)*rRowH-g.h/2;rClamp()}
const rX=s=>KW+s*rGeom().sw-rSX,rY=n=>(HI-n)*rRowH-rSY;
const posS=x=>(x-KW+rSX)/rGeom().sw,posN=y=>HI-Math.floor((y+rSY)/rRowH);
const scaleFix=n=>(!rScale||inScale(n))?n:(inScale(n+1)?n+1:n-1);
function rr(c,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function commitRoll(){RN().sort((a,b)=>a.s-b.s||a.n-b.n);syncCells(S.pat,rT);renderCells();save();rInfo()}
function rInfo(){const id=TRACKS[rT].id,e=S.inst[id]||'analog';$('#rollName').textContent=TRACKS[rT].name;
  $('#rollInfo').textContent='mönster '+'ABCD'[S.pat]+' · '+RN().length+' toner · '+ENG[e].name.toLowerCase()+(rSel.size?' · '+rSel.size+' markerade':'')+(rDrag&&/resize/.test(rDrag.type)&&rDrag.nt?' · längd '+(Math.round(rDrag.nt.l*1000)/1000).toString().replace('.',',')+' steg':'')}
function rAud(n,v){if(!prevOn())return;initAudio();ctx.resume();trigger(rT,ctx.currentTime+.005,v||.8,n,Math.max(1,Math.min(4,rLen())))}
function rUI(){roll.style.setProperty('--rc',TRACKS[rT].hex);
  [...$('#rollTrk').children].forEach(b=>b.classList.toggle('on',+b.dataset.t===rT));
  $('#rSnap').textContent='snap '+SNAPS[rSnapI][1];$('#rLen').textContent='längd '+LENS[rLenI][1];
  $('#rScale').classList.toggle('on',rScale);$('#rGlT').textContent=TRACKS[rT]&&S.inst[TRACKS[rT].id]==='acid'?'glide: acid slide tid':'glide '+Math.round((S.glideT||.07)*1000)+' ms';$('#rGhost').classList.toggle('on',rGhost);
  const id=TRACKS[rT].id,ch=$('#rChord');ch.hidden=!(id==='keys'||id==='pad');ch.classList.toggle('on',!!(S.chord&&S.chord[id]!==0));
  document.querySelectorAll('#rollTool button').forEach(b=>b.classList.toggle('on',b.dataset.m===rMode));rInfo()}
MEL.forEach(ti=>{const t=TRACKS[ti],b=document.createElement('button');b.className='rtk';b.dataset.t=ti;b.dataset.ti=ti;regTC(b,t,'--c');b.innerHTML=`<i></i>${t.name.toLowerCase()}`;
  b.onclick=()=>{if(rT===ti)return;rT=ti;rSel.clear();select(ti);rCenter();rUI();rAud(firstNote(ti),.8)};$('#rollTrk').appendChild(b)});
function openRoll(ti){rT=TRACKS[ti]&&TRACKS[ti].mel?ti:(TRACKS[S.sel].mel?S.sel:8);rSel.clear();rOpen=true;roll.classList.add('open');roll.setAttribute('aria-hidden','false');rUI();requestAnimationFrame(()=>{rCenter()})}
function closeRoll(){rOpen=false;roll.classList.remove('open');roll.setAttribute('aria-hidden','true');rDrag=null;requestAnimationFrame(()=>{synIn.style.setProperty('--rx','0deg');synIn.style.setProperty('--ry','0deg');synCard.style.display='none';void synCard.offsetWidth;synCard.style.display='';refreshInst()})}
$('#actRoll').onclick=()=>openRoll(S.sel);$('#synRoll').onclick=e=>{e.stopPropagation();openRoll(synT)};$('#rollClose').onclick=closeRoll;
$('#rollPlay').onclick=play;$('#rollRec').onclick=()=>$('#recBtn').click();
const _spi2=setPlayIcon;setPlayIcon=function(){_spi2();$('#rollPlayIco').innerHTML=$('#playIco').innerHTML};
function rPort(x,y){const g=rGeom(),R=RN();for(let i=R.length-1;i>=0;i--){const a=R[i],px=rX(a.s)+Math.max(4,a.l*g.sw-2)+8,py=rY(a.n)+rRowH/2;if(x>px-5&&Math.hypot(x-px,y-py)<9)return a}return null}
function previewGlide(a,b){if(!prevOn())return;initAudio();ctx.resume();GL={list:[{at:b.s-a.s,n:b.n}],sd:stepDur(),n0:a.n,gt:glideTime(TRACKS[rT].id)};trigger(rT,ctx.currentTime+.01,a.v,a.n,(b.s+b.l)-a.s);GL=null}
function linkGlide(a,b){if(!b.id)b.id=nid();RN().forEach(m=>{if(m!==a&&m.g===b.id)delete m.g});a.g=b.id}
function rPos(e){const r=rCv.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}}
function rHit(x,y){const g=rGeom(),R=RN(),n0=posN(y);for(let i=R.length-1;i>=0;i--){const nt=R[i],nx=KW+nt.s*g.sw-rSX,wd=Math.max(4,nt.l*g.sw-2);
  const rowOk=nt.n===n0||(rScale&&!inScale(n0)&&Math.abs(nt.n-n0)===1);const ez=Math.max(7,Math.min(16,wd*.4));
  if(rowOk&&x>=nx-4&&x<=nx+wd+10){const edge=x>nx+wd-ez?'R':(wd>22&&x<nx+Math.min(10,wd*.25))?'L':false;return {nt,edge}}}return null}
/* magnetic length: snaps to the grid only when close to a line, otherwise free in 1/16-step increments (shift = always free) */
const R_MIN=.125;function rMag(v,sn,free){const fine=Math.round(v/.0625)*.0625;if(free)return fine;const r=Math.round(v/sn)*sn;return Math.abs(v-r)<=sn*.2?r:fine}
// recording from the on-screen keyboard
function playPos(){if(!playing||!ctx)return null;return curStep+clamp((ctx.currentTime-curStepT)/stepDur(),0,.999)}
function keyDown(n){rPress.set(n,{pos:playPos(),t:performance.now()});rAud(n,lastVel)}
function keyUp(n){const k=rPress.get(n);rPress.delete(n);if(!k||!recording||k.pos===null)return;pushHist();
  const sn=rSnap(),s0=clamp(Math.round(k.pos/sn)*sn,0,16-sn),dur=(performance.now()-k.t)/1000/stepDur(),l=clamp(Math.max(sn,Math.round(dur/sn)*sn),sn,16-s0);
  RN().push({s:s0%16,l,n,v:lastVel});commitRoll()}
rCv.addEventListener('pointerdown',e=>{e.preventDefault();rCv.setPointerCapture(e.pointerId);const p=rPos(e);rPtr.set(e.pointerId,p);
  if(rPtr.size===2){if(rDrag&&rDrag.created){const R=RN();const i=R.indexOf(rDrag.nt);if(i>=0)R.splice(i,1);commitRoll()}
    if(rDrag&&rDrag.type==='keys')keyUp(rDrag.n);rDrag=null;rLock=true;const a=[...rPtr.values()];rPan={x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2,sx:rSX,sy:rSY,d:Math.abs(a[0].x-a[1].x),z:rZoom};return}
  if(rPtr.size>2||rLock)return;
  if(p.x<KW){const n=clamp(posN(p.y),LO,HI);rDrag={type:'keys',y0:p.y,sy:rSY,moved:false,n};keyDown(n);return}
  const SH=e.shiftKey||rShift,port=rPort(p.x,p.y);
  if(port&&!SH){pushHist();rDrag={type:'cable',from:port,x:p.x,y:p.y};return}
  const hit=rHit(p.x,p.y),now=performance.now();
  if(hit&&!SH&&rLastTap.n===hit.nt&&now-rLastTap.t<320){pushHist();const R=RN();R.splice(R.indexOf(hit.nt),1);rSel.delete(hit.nt);commitRoll();rLastTap={t:0,n:null};return}
  rLastTap={t:now,n:hit?hit.nt:null};
  if(hit){pushHist();
    if(SH&&rSel.has(hit.nt)){rSel.delete(hit.nt);rInfo();return}
    if(!rSel.has(hit.nt)){if(!SH)rSel.clear();rSel.add(hit.nt)}
    let lead=hit.nt;if(e.altKey&&!hit.edge){const arr=[...rSel],cps=arr.map(n=>({s:n.s,l:n.l,n:n.n,v:n.v}));RN().push(...cps);rSel.clear();cps.forEach(n=>rSel.add(n));lead=cps[arr.indexOf(hit.nt)];toast('Kopierar')}
    hit.nt=lead;
    rDrag={type:hit.edge==='L'?'resizeL':hit.edge?'resize':'move',p0:p,nt:hit.nt,orig:[...rSel].map(n=>({n,s:n.s,l:n.l,p:n.n})),lastN:hit.nt.n};lastVel=hit.nt.v;if(!hit.edge)rAud(hit.nt.n,hit.nt.v);rInfo();return}
  if(rMode==='sel'||SH){const base=SH?[...rSel]:[];if(!SH)rSel.clear();rDrag={type:'box',x0:p.x,y0:p.y,x1:p.x,y1:p.y,base};rInfo();return}
  pushHist();rSel.clear();const sn=rSnap(),st=clamp(Math.floor(posS(p.x)/sn)*sn,0,16-sn),n=scaleFix(clamp(posN(p.y),LO,HI)),nt={s:st,l:Math.min(rLen(),16-st),n,v:lastVel};
  RN().push(nt);rSel.add(nt);rDrag={type:'resize',p0:p,nt,orig:[{n:nt,s:nt.s,l:nt.l,p:nt.n}],created:true};rAud(n,nt.v);commitRoll()});
rCv.addEventListener('pointermove',e=>{if(!rPtr.has(e.pointerId))return;const p=rPos(e);rPtr.set(e.pointerId,p);
  if(rPan&&rPtr.size>=2){const a=[...rPtr.values()],cx=(a[0].x+a[1].x)/2,cy=(a[0].y+a[1].y)/2,d=Math.abs(a[0].x-a[1].x);
    if(rPan.d>50&&d>50){const nz=clamp(rPan.z*d/rPan.d,1,6);const anchor=(cx-KW+rPan.sx)/(rGeom().gw/16*rPan.z);rZoom=nz;rSX=anchor*(rGeom().gw/16*rZoom)-(cx-KW)}else rSX=rPan.sx-(cx-rPan.x);
    rSY=rPan.sy-(cy-rPan.y);rClamp();return}
  const D=rDrag;if(!D)return;const g=rGeom(),sn=rSnap();
  if(D.type==='keys'){const dy=p.y-D.y0;if(!D.moved&&Math.abs(dy)>8){D.moved=true;keyUp(D.n)}if(D.moved){rSY=D.sy-dy;rClamp()}return}
  if(D.type==='cable'){D.x=p.x;D.y=p.y;return}
  if(D.type==='box'){D.x1=p.x;D.y1=p.y;const x0=Math.min(D.x0,D.x1),x1=Math.max(D.x0,D.x1),y0=Math.min(D.y0,D.y1),y1=Math.max(D.y0,D.y1);
    rSel.clear();(D.base||[]).forEach(n=>rSel.add(n));RN().forEach(nt=>{const nx=rX(nt.s),ny=rY(nt.n),wd=nt.l*g.sw;if(nx<x1&&nx+wd>x0&&ny<y1&&ny+rRowH>y0)rSel.add(nt)});rInfo();return}
  if(D.type==='move'){const ds=Math.round((p.x-D.p0.x)/g.sw/sn)*sn,dn=Math.round(-(p.y-D.p0.y)/rRowH);
    const minS=Math.min(...D.orig.map(o=>o.s)),maxE=Math.max(...D.orig.map(o=>o.s+o.l)),dc=clamp(ds,-minS,16-maxE);
    D.orig.forEach(o=>{o.n.s=Math.round((o.s+dc)*1000)/1000;let nn=clamp(o.p+dn,LO,HI);if(D.orig.length===1)nn=scaleFix(nn);o.n.n=nn});
    if(D.nt.n!==D.lastN){D.lastN=D.nt.n;rAud(D.nt.n,D.nt.v)}commitRoll();return}
  if(D.type==='resize'){const fr=e.shiftKey;if(D.created){const end=rMag(posS(p.x),sn,fr);D.nt.l=clamp(Math.max(end-D.nt.s,R_MIN),R_MIN,16-D.nt.s)}
    else{const dx=(p.x-D.p0.x)/g.sw;D.orig.forEach(o=>{const end=rMag(o.s+o.l+dx,sn,fr);o.n.l=clamp(end-o.s,R_MIN,16-o.n.s)})}rInfo();commitRoll();return}
  if(D.type==='resizeL'){const fr=e.shiftKey,dx=(p.x-D.p0.x)/g.sw;D.orig.forEach(o=>{const end=o.s+o.l,st=clamp(rMag(o.s+dx,sn,fr),0,end-R_MIN);o.n.s=Math.round(st*10000)/10000;o.n.l=Math.round((end-st)*10000)/10000});rInfo();commitRoll()}});
/* hover: show resize cursor at note edges */
rCv.addEventListener('pointermove',e=>{if(rDrag||rPtr.size)return;const p=rPos(e);if(p.x<KW){rCv.style.cursor='';return}const h=rHit(p.x,p.y);rCv.style.cursor=h?(h.edge?'ew-resize':'grab'):'';});
const rEnd=e=>{rPtr.delete(e.pointerId);if(rPtr.size<2)rPan=null;if(rPtr.size===0)rLock=false;
  if(rDrag&&rDrag.type==='cable'){const D=rDrag,hit=rHit(D.x,D.y);
    if(hit&&hit.nt!==D.from&&hit.nt.s>D.from.s+1e-6){linkGlide(D.from,hit.nt);previewGlide(D.from,hit.nt);toast('Glide '+nname(D.from.n)+' → '+nname(hit.nt.n))}
    else if(!hit&&D.from.g){delete D.from.g;toast('Glide borttagen')}else if(hit&&hit.nt.s<=D.from.s+1e-6&&hit.nt!==D.from)toast('Dra kabeln till en senare ton');
    rDrag=null;commitRoll();return}
  if(rDrag){if(rDrag.type==='keys'&&!rDrag.moved)keyUp(rDrag.n);if(rDrag.type==='move'||rDrag.type==='resize'){if(rDrag.type==='resize')rLenI=Math.max(0,LENS.findIndex(x=>x[0]>=rDrag.nt.l-1e-6));}rDrag=null;commitRoll();rUI()}};
rCv.addEventListener('pointerup',rEnd);rCv.addEventListener('pointercancel',rEnd);
rCv.addEventListener('wheel',e=>{e.preventDefault();if(e.ctrlKey||e.metaKey){rZoom=clamp(rZoom*(e.deltaY<0?1.15:1/1.15),1,6)}else{rSY+=e.deltaY;rSX+=e.deltaX}rClamp()},{passive:false});
// velocity lane
(()=>{let vd=null;rVel.addEventListener('pointerdown',e=>{const r=rVel.getBoundingClientRect(),x=e.clientX-r.left,R=RN();if(!R.length)return;
    let best=null,bd=18;R.forEach(nt=>{const d=Math.abs(rX(nt.s)+4-x)-(rSel.has(nt)?6:0);if(d<bd){bd=d;best=nt}});if(!best)return;
    e.preventDefault();rVel.setPointerCapture(e.pointerId);pushHist();const grp=rSel.has(best)?[...rSel]:[best];vd={best,grp:grp.map(n=>({n,v:n.v})),y0:e.clientY,h:r.height}});
  rVel.addEventListener('pointermove',e=>{if(!vd)return;const r=rVel.getBoundingClientRect(),nv=clamp((r.bottom-e.clientY-6)/(r.height-14),.05,1),d=nv-vd.grp.find(o=>o.n===vd.best).v;
    vd.grp.forEach(o=>o.n.v=clamp(o.n===vd.best?nv:o.v+d,.05,1));lastVel=vd.best.v;commitRoll()});
  const up=()=>{if(vd){vd=null;rAud(lastVel>0?RN()[0]&&RN()[0].n:60,lastVel)}};rVel.addEventListener('pointerup',()=>{vd=null});rVel.addEventListener('pointercancel',()=>{vd=null})})();
// tools
const target=()=>rSel.size?[...rSel]:RN();
document.querySelectorAll('#rollTool button').forEach(b=>b.onclick=()=>{rMode=b.dataset.m;rUI()});
$('#rSnap').onclick=()=>{rSnapI=(rSnapI+1)%SNAPS.length;rUI()};
$('#rLen').onclick=()=>{rLenI=(rLenI+1)%LENS.length;rUI()};
$('#rScale').onclick=()=>{rScale=!rScale;rUI()};$('#rGhost').onclick=()=>{rGhost=!rGhost;rUI()};
$('#rChord').onclick=()=>{const id=TRACKS[rT].id;S.chord[id]=S.chord[id]===0?1:0;rUI();save();rAud(firstNote(rT),.8);toast(S.chord[id]?'Auto-ackord på':'Auto-ackord av · rita egna ackord')};
$('#rQuant').onclick=()=>{pushHist();const sn=rSnap();target().forEach(n=>{n.s=clamp(Math.round(n.s/sn)*sn,0,16-sn);n.l=clamp(Math.max(sn,Math.round(n.l/sn)*sn),sn,16-n.s)});commitRoll();toast('Kvantiserat till '+SNAPS[rSnapI][1])};
const tr=d=>()=>{pushHist();target().forEach(n=>n.n=clamp(n.n+d,LO,HI));commitRoll();const f=target()[0];if(f)rAud(f.n,f.v)};
$('#rDn12').onclick=tr(-12);$('#rDn').onclick=tr(-1);$('#rUp').onclick=tr(1);$('#rUp12').onclick=tr(12);
$('#rLegato').onclick=()=>{pushHist();const T=target().slice().sort((a,b)=>a.s-b.s);T.forEach((n,i)=>{const nx=T.slice(i+1).find(m=>m.s>n.s+1e-6);n.l=nx?nx.s-n.s:Math.max(n.l,16-n.s)});commitRoll()};
$('#rDup').onclick=()=>{if(!rSel.size){toast('Markera toner att duplicera');return}pushHist();const T=[...rSel],a=Math.min(...T.map(n=>n.s)),b=Math.max(...T.map(n=>n.s+n.l)),span=b-a;
  const cp=T.filter(n=>n.s+span<16).map(n=>({s:n.s+span,l:Math.min(n.l,16-n.s-span),n:n.n,v:n.v}));if(!cp.length){toast('Ingen plats kvar i takten');return}
  RN().push(...cp);rSel.clear();cp.forEach(n=>rSel.add(n));commitRoll()};
$('#rAll').onclick=()=>{RN().forEach(n=>rSel.add(n));rInfo()};
$('#rShift').onclick=()=>{rShift=!rShift;$('#rShift').classList.toggle('on',rShift);toast(rShift?'Shift låst: tryck toner för att lägga till · dra för ruta':'Shift av')};
$('#rGlide').onclick=()=>{const T=(rSel.size>1?[...rSel]:RN()).slice().sort((a,b)=>a.s-b.s);if(T.length<2){toast('Markera minst två toner');return}pushHist();let k=0;
  T.forEach((a,i)=>{const b=T.slice(i+1).find(m=>m.s>a.s+1e-6);if(b&&i<T.length-1&&(rSel.size>1||true)){linkGlide(a,b);k++}});commitRoll();toast(k+' glide-kablar');if(T[0]&&T[1])previewGlide(T[0],T[1])};
$('#rUnglide').onclick=()=>{pushHist();target().forEach(n=>{delete n.g});commitRoll();toast('Glide borttagen')};
const GLT=[.04,.07,.12,.2,.35];$('#rGlT').onclick=()=>{const i=GLT.findIndex(x=>Math.abs(x-S.glideT)<.001);S.glideT=GLT[(i+1)%GLT.length];save();rUI()};
$('#rDel').onclick=()=>{if(!rSel.size)return;pushHist();const R=RN();[...rSel].forEach(n=>{const i=R.indexOf(n);if(i>=0)R.splice(i,1)});rSel.clear();commitRoll()};
$('#rZoomIn').onclick=()=>{rZoom=clamp(rZoom*1.5,1,6);rClamp()};$('#rZoomOut').onclick=()=>{rZoom=clamp(rZoom/1.5,1,6);rClamp()};
$('#rUndo').onclick=()=>{undo();rSel.clear();rUI()};
document.addEventListener('keydown',e=>{if(!rOpen)return;
  if(e.key==='Escape'){closeRoll();e.stopImmediatePropagation();return}
  if((e.key==='Backspace'||e.key==='Delete')&&rSel.size){e.preventDefault();$('#rDel').click()}
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='a'){e.preventDefault();$('#rAll').click()}
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='d'){e.preventDefault();$('#rDup').click()}
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='c'&&rSel.size){e.preventDefault();const T=[...rSel],m=Math.min(...T.map(n=>n.s));rClip=T.map(n=>({s:n.s-m,l:n.l,n:n.n,v:n.v}));toast(T.length+' toner kopierade')}
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='v'&&rClip.length){e.preventDefault();pushHist();const sn=rSnap(),pp=playPos();
    const at=pp!==null?Math.floor(pp/sn)*sn:(rSel.size?Math.max(...[...rSel].map(n=>n.s+n.l)):0),cp=rClip.filter(n=>at+n.s<16).map(n=>({s:at+n.s,l:Math.min(n.l,16-at-n.s),n:n.n,v:n.v}));
    if(!cp.length){toast('Ingen plats kvar i takten');return}RN().push(...cp);rSel.clear();cp.forEach(n=>rSel.add(n));commitRoll()}
  if(e.key.toLowerCase()==='g'&&!e.metaKey&&!e.ctrlKey&&rSel.size>1){e.preventDefault();$('#rGlide').click()}
  if(rSel.size&&(e.key==='ArrowUp'||e.key==='ArrowDown')){e.preventDefault();tr((e.key==='ArrowUp'?1:-1)*(e.shiftKey?12:1))()}},true);
window.__roll=()=>({rSY,rSX,rZoom,rRowH,KW,HI,sel:rSel.size});
function drawRoll(now){if(!rOpen)return;const f=fit(rCv);if(!f)return;const {c,w,h}=f,g=rGeom(),sw=g.sw,col=TRACKS[rT].hex;
  for(let n=HI;n>=LO;n--){const y=rY(n);if(y>h||y+rRowH<0)continue;
    c.fillStyle=isBlack(n)?'rgba(0,0,0,.3)':(rScale&&inScale(n)?'rgba(255,255,255,.05)':'rgba(255,255,255,.015)');c.fillRect(KW,y,w-KW,rRowH);
    if(n%12===0){c.fillStyle='rgba(255,255,255,.13)';c.fillRect(KW,y+rRowH-1,w-KW,1)}}
  const sn=Math.min(1,rSnap()*(rZoom>=2?1:2));for(let st=0;st<=16+1e-9;st+=sn){const x=rX(st);if(x<KW-1||x>w+1)continue;const beat=Math.abs(st%4)<1e-9,whole=Math.abs(st%1)<1e-9;
    c.fillStyle=(st===0||Math.abs(st-16)<1e-9)?'rgba(255,255,255,.4)':beat?'rgba(255,255,255,.17)':whole?'rgba(255,255,255,.07)':'rgba(255,255,255,.03)';c.fillRect(Math.round(x),0,1,h)}
  const xe=rX(16);if(xe<w){c.fillStyle='rgba(0,0,0,.4)';c.fillRect(xe,0,w-xe,h)}
  if(rGhost)MEL.forEach(ti=>{if(ti===rT)return;c.fillStyle=rgba(TRACKS[ti].hex,.17);S.roll[S.pat][TRACKS[ti].id].forEach(nt=>{const y=rY(nt.n);if(y>h||y<-rRowH)return;rr(c,rX(nt.s)+1,y+3,Math.max(3,nt.l*sw-2),rRowH-6,3);c.fill()})});
  c.font='500 9px "BLONDA Mono",ui-monospace,monospace';c.textBaseline='middle';
  try{stxRollGhost(c,rX,rY,sw,h,rT)}catch(e){globalThis.__el&&globalThis.__el(e)}const ph=playPos();
  RN().forEach(nt=>{const x=rX(nt.s),y=rY(nt.n),wd=Math.max(4,nt.l*sw-2);if(y>h||y<-rRowH||x>w||x+wd<KW)return;const sel=rSel.has(nt),live=ph!==null&&ph>=nt.s&&ph<nt.s+nt.l;
    if(live){c.shadowColor=col;c.shadowBlur=14}c.fillStyle=rgba(col,.42+.58*nt.v);rr(c,x+1,y+1,wd,rRowH-2,4);c.fill();c.shadowBlur=0;
    if(sel){c.strokeStyle='#fff';c.lineWidth=1.6;c.stroke()}
    c.fillStyle='rgba(17,18,17,.35)';c.fillRect(x+1,y+rRowH-4,wd*nt.v,2);
    if(wd>10){c.fillStyle='rgba(255,255,255,.6)';c.fillRect(x+wd-3,y+5,1.5,rRowH-10)}
    if(wd>30&&rRowH>=14){c.fillStyle='rgba(17,18,17,.82)';c.fillText(nname(nt.n),x+6,y+rRowH/2)}});
  // glide cables (patch-cable style)
  const R0=RN(),byId=new Map();R0.forEach(n=>{if(n.id)byId.set(n.id,n)});
  const cable=(x1,y1,x2,y2,live)=>{const dx=Math.abs(x2-x1),sag=14+dx*.18+Math.abs(y2-y1)*.1,yb=Math.max(y1,y2)+sag;c.lineCap='round';
    c.beginPath();c.moveTo(x1,y1);c.bezierCurveTo(x1+dx*.35,yb,x2-dx*.35,yb,x2,y2);
    c.strokeStyle='rgba(0,0,0,.6)';c.lineWidth=6;c.stroke();c.strokeStyle=col;c.lineWidth=3.4;c.stroke();c.strokeStyle='rgba(255,255,255,.4)';c.lineWidth=1;c.stroke();
    if(live){c.setLineDash([3,9]);c.lineDashOffset=-(now/18)%12;c.strokeStyle='#fff';c.lineWidth=2.2;c.stroke();c.setLineDash([])}
    [[x1,y1],[x2,y2]].forEach(([x,y])=>{c.fillStyle='#111211';c.beginPath();c.arc(x,y,5.5,0,6.2832);c.fill();c.fillStyle=col;c.beginPath();c.arc(x,y,3.4,0,6.2832);c.fill()})};
  R0.forEach(a=>{if(!a.g)return;const b=byId.get(a.g);if(!b||b.s<=a.s)return;const xa=rX(a.s)+Math.max(4,a.l*sw-2)+8,ya=rY(a.n)+rRowH/2,xb=rX(b.s)+2,yb=rY(b.n)+rRowH/2;
    cable(xa,ya,xb,yb,ph!==null&&ph>=a.s&&ph<b.s+b.l)});
  R0.forEach(a=>{if(a.g)return;const x=rX(a.s)+Math.max(4,a.l*sw-2)+8,y=rY(a.n)+rRowH/2;if(y<-10||y>h+10||x>w+10)return;c.strokeStyle=rgba(col,.75);c.lineWidth=1.4;c.beginPath();c.arc(x,y,3.6,0,6.2832);c.stroke()});
  if(rDrag&&rDrag.type==='cable'){const a=rDrag.from;cable(rX(a.s)+Math.max(4,a.l*sw-2)+8,rY(a.n)+rRowH/2,rDrag.x,rDrag.y,true)}
  if(rDrag&&rDrag.type==='box'){c.setLineDash([4,4]);c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=1;c.strokeRect(Math.min(rDrag.x0,rDrag.x1)+.5,Math.min(rDrag.y0,rDrag.y1)+.5,Math.abs(rDrag.x1-rDrag.x0),Math.abs(rDrag.y1-rDrag.y0));c.setLineDash([]);
    c.fillStyle='rgba(255,255,255,.05)';c.fillRect(Math.min(rDrag.x0,rDrag.x1),Math.min(rDrag.y0,rDrag.y1),Math.abs(rDrag.x1-rDrag.x0),Math.abs(rDrag.y1-rDrag.y0))}
  if(ph!==null){const x=rX(ph);if(x>=KW){c.fillStyle='#F2C318';c.fillRect(x,0,2,h);c.beginPath();c.moveTo(x-4,0);c.lineTo(x+6,0);c.lineTo(x+1,6);c.fill()}}
  // keyboard
  c.fillStyle='#0D0D11';c.fillRect(0,0,KW,h);
  for(let n=HI;n>=LO;n--){const y=rY(n);if(y>h||y+rRowH<0||isBlack(n))continue;c.fillStyle=rPress.has(n)?col:'#E7E7E2';c.fillRect(0,y+.5,KW-1,rRowH-1);
    if(n%12===0){c.fillStyle='rgba(17,18,17,.6)';c.font='600 8px "BLONDA Mono",monospace';c.fillText('C'+(n/12-1),KW-20,y+rRowH/2)}}
  for(let n=HI;n>=LO;n--){const y=rY(n);if(y>h||y+rRowH<0||!isBlack(n))continue;c.fillStyle=rPress.has(n)?col:'#18181C';rr(c,0,y+1,KW*.6,rRowH-2,2);c.fill()}
  c.fillStyle='rgba(255,255,255,.12)';c.fillRect(KW-1,0,1,h);
  if(!RN().length){c.fillStyle='rgba(255,255,255,.55)';c.font='400 12px "BLONDA Sans",system-ui';c.textBaseline='top';
    ['tryck för att rita en ton · dra för längd','dra kanten = längd · dubbeltryck = ta bort','dra från ringen bakom en ton till nästa = glide','shift = markera flera · två fingrar = scrolla/zooma'].forEach((t,i)=>c.fillText(t,KW+14,14+i*18))}
  // velocity lane
  const v=fit(rVel);if(!v)return;const vc=v.c,vh=v.h;vc.fillStyle='rgba(255,255,255,.06)';vc.fillRect(0,vh-6,v.w,1);
  RN().forEach(nt=>{const x=rX(nt.s)+4;if(x<KW||x>v.w)return;const sel=rSel.has(nt),top=vh-6-(vh-14)*nt.v;
    vc.fillStyle=sel?'#fff':rgba(col,.85);vc.fillRect(x-1,top,2,vh-6-top);vc.beginPath();vc.arc(x,top,sel?4.5:3.5,0,6.2832);vc.fill()})}

document.querySelectorAll('.pat').forEach(b=>setDM(b,b.textContent.trim(),13));
document.querySelectorAll('.hold b').forEach(b=>setDM(b,b.textContent.trim(),17));
setDM($('#clock'),'00:00');setDM($('#peak'),'--');setDM($('#startBig'),'SEQ.3',Math.round(Math.min(96,innerWidth*.16)));
loadLayout();
try{const v=localStorage.getItem(KEY+'-view');setView(v||'seq',false)}catch(e){setView('seq',false)}
setPal(WORLDS[S.world||0].pal);$('#palBtn').textContent=WORLDS[S.world||0].short;buildTrackKnobs();renderAll();renderChain();


