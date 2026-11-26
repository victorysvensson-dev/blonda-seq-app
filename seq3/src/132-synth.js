/* ---------------- synth ---------------- */
let synT=6,synDrag=null,synTilt=true;
const synCv=$('#synCv'),synIn=$('#synIn'),synCard=document.querySelector('.card.syn');
const SY=()=>S.synth[TRACKS[synT].id];
const fmtT=v=>v<1?Math.round(v*1000)+' ms':v.toFixed(2)+' s';
function cutHz(){return 70*Math.pow(160,SY().cut)}
function renderSynth(){const sy=SY(),hz=cutHz();
  $('#synName').textContent=TRACKS[synT].name.toLowerCase()+' · '+ENG[S.inst[TRACKS[synT].id]||'analog'].name.toLowerCase();
  $('#synCut span').textContent=hz>=1000?Math.round(hz).toLocaleString('sv-SE'):String(Math.round(hz));
  document.querySelector('.syn-sm[data-k="res"] span').textContent=Math.round(sy.res*100);
  document.querySelector('.syn-sm[data-k="env"] span').textContent=Math.round(sy.env*100);
  document.querySelectorAll('#synSeg button').forEach(b=>b.classList.toggle('on',+b.dataset.t===synT));
  document.querySelectorAll('#synWaves button').forEach(b=>b.classList.toggle('on',b.dataset.w===sy.wave))}
function synPreview(){if(!prevOn())return;initAudio();ctx.resume();trigger(synT,ctx.currentTime+.01,.85,firstNote(synT))}
document.querySelectorAll('#synSeg button').forEach(b=>b.onclick=()=>{synT=+b.dataset.t;swapAnim();refreshInst();synPreview()});
document.querySelectorAll('#synWaves button').forEach(b=>b.onclick=()=>{SY().wave=b.dataset.w;renderSynth();save();synPreview()});
function dragNum(el,key,lo,hi){let y0=0,v0=0;el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);y0=e.clientY;v0=SY()[key]});
  el.addEventListener('pointermove',e=>{if(!el.hasPointerCapture(e.pointerId))return;SY()[key]=clamp(v0+(y0-e.clientY)/220,lo,hi);renderSynth();save()});
  el.addEventListener('pointerup',()=>synPreview())}
dragNum($('#synCut'),'cut',0,1);dragNum(document.querySelector('.syn-sm[data-k="res"]'),'res',0,1);dragNum(document.querySelector('.syn-sm[data-k="env"]'),'env',0,1);
[['#synCut','cut','cutoff'],['.syn-sm[data-k="res"]','res','resonans'],['.syn-sm[data-k="env"]','env','env']].forEach(([q,k,l])=>mlReg(document.querySelector(q),{key:()=>'s.'+TRACKS[synT].id+'.'+k,label:()=>l+' · synth '+TRACKS[synT].name.toLowerCase(),min:0,max:1,paint:renderSynth}));
function envGeom(w,h){const sy=SY(),top=22,bot=h-18,x0=14,W=w-28;
  const xa=x0+W*.22*Math.sqrt(sy.a),xd=xa+8+W*.22*Math.sqrt(sy.d/2),xs=xd+W*.16,xr=xs+8+W*.3*Math.sqrt(sy.r/3);
  return {top,bot,x0,W,xa,xd,xs,xr,ys:bot-(bot-top)*sy.s}}
function cvPos(e){const r=synCv.getBoundingClientRect();return {x:(e.clientX-r.left)*synCv.clientWidth/r.width,y:(e.clientY-r.top)*synCv.clientHeight/r.height}}
synCv.addEventListener('pointerdown',e=>{e.preventDefault();const g=envGeom(synCv.clientWidth,synCv.clientHeight),q=cvPos(e);
  const pts=[['a',g.xa,g.top],['d',g.xd,g.ys],['r',g.xr,g.bot]];let best=null,bd=34;
  for(const [k,x,y] of pts){const d=Math.hypot(q.x-x,q.y-y);if(d<bd){bd=d;best=k}}
  if(!best){synPreview();return}synDrag=best;synCv.setPointerCapture(e.pointerId);synIn.style.setProperty('--rx','0deg');synIn.style.setProperty('--ry','0deg')});
synCv.addEventListener('pointermove',e=>{if(!synDrag)return;const g=envGeom(synCv.clientWidth,synCv.clientHeight),q=cvPos(e),sy=SY();
  if(synDrag==='a')sy.a=clamp(Math.pow(Math.max(0,q.x-g.x0)/(g.W*.22),2),.001,1);
  if(synDrag==='d'){sy.d=clamp(Math.pow(Math.max(0,q.x-g.xa-8)/(g.W*.22),2)*2,.02,2);sy.s=clamp((g.bot-q.y)/(g.bot-g.top),0,1)}
  if(synDrag==='r')sy.r=clamp(Math.pow(Math.max(0,q.x-g.xs-8)/(g.W*.3),2)*3,.02,3);save()});
const synUp=()=>{if(synDrag){synDrag=null;synPreview()}};synCv.addEventListener('pointerup',synUp);synCv.addEventListener('pointercancel',synUp);
synCard.addEventListener('pointermove',e=>{if(synDrag||RM)return;const r=synCard.getBoundingClientRect(),nx=(e.clientX-r.left)/r.width-.5,ny=(e.clientY-r.top)/r.height-.5;
  synIn.style.setProperty('--ry',(nx*5).toFixed(2)+'deg');synIn.style.setProperty('--rx',(-ny*4).toFixed(2)+'deg')});
synCard.addEventListener('pointerleave',()=>{synIn.style.setProperty('--rx','0deg');synIn.style.setProperty('--ry','0deg')});
function drawSynth(now){const f=fit(synCv);if(!f)return;const {c,w,h}=f,g=envGeom(w,h),sy=SY();
  // cutoff line, slightly slanted like a horizon
  const yc=g.bot-(g.bot-g.top)*sy.cut*.85;c.strokeStyle='rgba(255,255,255,.75)';c.lineWidth=1.2;c.beginPath();c.moveTo(0,yc+12);c.lineTo(w,yc-12);c.stroke();
  const ampPath=(k,off)=>{c.beginPath();c.moveTo(g.x0,off(g.bot,0));
    c.bezierCurveTo(g.x0+(g.xa-g.x0)*.5,off(g.bot,0),g.x0+(g.xa-g.x0)*.6,off(g.top,1),g.xa,off(g.top,1));
    c.bezierCurveTo(g.xa+(g.xd-g.xa)*.3,off(g.ys,sy.s)-(g.ys-g.top)*.0,g.xa+(g.xd-g.xa)*.45,off(g.ys,sy.s),g.xd,off(g.ys,sy.s));
    c.lineTo(g.xs,off(g.ys,sy.s));
    c.bezierCurveTo(g.xs+(g.xr-g.xs)*.3,off(g.bot,0),g.xs+(g.xr-g.xs)*.5,off(g.bot,0),g.xr,off(g.bot,0));c.lineTo(w-g.x0,off(g.bot,0))};
  // filter envelope (dashed, drifting)
  c.setLineDash([5,6]);c.lineDashOffset=-(now/45)%11;c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=1.3;
  ampPath(0,(y,lvl)=>yc-lvl*sy.env*(yc-g.top)*.9);c.stroke();c.setLineDash([]);
  // amplitude envelope (solid, glowing)
  c.shadowColor='rgba(255,255,255,.7)';c.shadowBlur=(synCard.closest('.daw')&&!document.body.classList.contains('look-dots'))||document.body.classList.contains('look-studio')?0:10;c.strokeStyle='#fff';c.lineWidth=2.2;ampPath(0,y=>y);c.stroke();c.shadowBlur=0;
  // handles + labels
  c.font='500 10px "BLONDA Mono", ui-monospace, monospace';c.textBaseline='bottom';
  [[g.xa,g.top,'a '+fmtT(sy.a),'a'],[g.xd,g.ys,'d '+fmtT(sy.d)+' · s '+Math.round(sy.s*100)+'%','d'],[g.xr,g.bot,'r '+fmtT(sy.r),'r']].forEach(([x,y,t,k])=>{
    c.fillStyle='rgba(255,255,255,.25)';c.beginPath();c.arc(x,y,synDrag===k?13:9,0,6.2832);c.fill();
    c.fillStyle='#fff';c.beginPath();c.arc(x,y,5,0,6.2832);c.fill();
    c.fillStyle='rgba(255,255,255,.9)';const tw=c.measureText(t).width;if(k==='a')c.fillText(t,clamp(x+14,2,w-tw-2),y+5);else if(k==='d')c.fillText(t,clamp(x+12,2,w-tw-2),y-16);else c.fillText(t,clamp(x-tw/2,2,w-tw-2),y-14)});
  // a glowing dot rides the envelope each time this track plays
  const hh=ctx&&hitT.get(synT);if(hh){const el=ctx.currentTime-hh.t,p=S.params[TRACKS[synT].id],gate=Math.max(.06,stepDur()*(.6+p.decay*3.4));let x=null,y=null;
    const lerp=(a,b,u)=>a+(b-a)*clamp(u,0,1);
    if(el>=0&&el<sy.a){x=lerp(g.x0,g.xa,el/sy.a);y=lerp(g.bot,g.top,Math.pow(el/sy.a,.7))}
    else if(el>=sy.a&&el<sy.a+sy.d){const u=(el-sy.a)/sy.d;x=lerp(g.xa,g.xd,u);y=lerp(g.top,g.ys,1-Math.pow(1-u,2))}
    else if(el>=0&&el<Math.max(gate,sy.a+sy.d)){x=lerp(g.xd,g.xs,(el-sy.a-sy.d)/Math.max(.01,gate-sy.a-sy.d));y=g.ys}
    else if(el>=0&&el<Math.max(gate,sy.a+sy.d)+sy.r){const u=(el-Math.max(gate,sy.a+sy.d))/sy.r;x=lerp(g.xs,g.xr,u);y=lerp(g.ys,g.bot,1-Math.pow(1-u,2))}
    if(x!==null){const gr=c.createRadialGradient(x,y,0,x,y,22);gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(.25,'rgba(255,255,255,.5)');gr.addColorStop(1,'rgba(255,255,255,0)');
      c.fillStyle=gr;c.beginPath();c.arc(x,y,22,0,6.2832);c.fill()}}}
