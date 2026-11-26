/* ---------------- live: xy pad ---------------- */
const xy=$('#xy'),puck=$('#puck'),xyc=$('#xyc'),xx=xyc.getContext('2d');let xyOn=false,trail=[],xyLbl=0;const xyVals={f:0,fx:0};
function setFilterVal(f){const t=ctx.currentTime;A.lp.frequency.cancelAndHoldAtTime(t);A.hp.frequency.cancelAndHoldAtTime(t);
  A.lp.frequency.setTargetAtTime(f<0?200*Math.pow(100,1+f):20000,t,.02);A.hp.frequency.setTargetAtTime(f>0?20*Math.pow(100,f*1.15):20,t,.02)}
function xyAt(e){const r=xy.getBoundingClientRect(),x=clamp(e.clientX-r.left,0,r.width),y=clamp(e.clientY-r.top,0,r.height),nx=x/r.width,ny=1-y/r.height;
  const s=spr(puck);s.drag=true;s.tx=x-r.width/2;s.ty=y-r.height/2;trail.push({x,y,t:performance.now()});
  let f=(nx-.5)*2;f=Math.abs(f)<.08?0:(f-Math.sign(f)*.08)/.92;
  if(ctx){setFilterVal(f);const t=ctx.currentTime;A.perf.gain.setTargetAtTime(ny*.45,t,.03);A.fb.gain.setTargetAtTime(Math.min(.85,S.fx.echo.fb+ny*.42),t,.05);
    A.dRet.gain.setTargetAtTime(S.master.echo+ny*.45,t,.05);A.rRet.gain.setTargetAtTime(S.master.space*.7+ny*.55,t,.05)}
  xyVals.f=f;xyVals.fx=ny;$('#xyRead').textContent=(f===0?'Filter av':(f<0?'LP ':'HP ')+Math.round(Math.abs(f)*100))+' · FX '+Math.round(ny*100)}
xy.addEventListener('pointerdown',e=>{e.preventDefault();initAudio();ctx.resume();xy.setPointerCapture(e.pointerId);xyOn=true;xy.classList.add('on');xyAt(e)});
xy.addEventListener('pointermove',e=>{if(xyOn)xyAt(e)});
const xyEnd=()=>{if(!xyOn)return;xyOn=false;xy.classList.remove('on');const s=spr(puck);s.drag=false;s.tx=0;s.ty=0;
  if(ctx){const t=ctx.currentTime;A.perf.gain.setTargetAtTime(0,t,.12);A.fb.gain.setTargetAtTime(S.fx.echo.fb,t,.4);A.lp.frequency.cancelAndHoldAtTime(t);A.hp.frequency.cancelAndHoldAtTime(t);applyMaster()}
  xyVals.f=0;xyVals.fx=0;$('#xyRead').textContent='håll och dra'};
xy.addEventListener('pointerup',xyEnd);xy.addEventListener('pointercancel',xyEnd);
function perfFrame(dt){
  if(tapeStop)tapeRate=Math.max(.12,tapeRate*Math.pow(.07,dt));else if(tapeRate<1&&!window.__half)tapeRate=Math.min(1,tapeRate+dt*5);
  gTune=tapeRate<.999?12*Math.log2(tapeRate):0;
  const w=xyc.offsetParent?xyc.clientWidth:0,h=xyc.clientHeight;if(!w)return;const dpr=Math.min(2,devicePixelRatio||1);
  if(xyc.width!==Math.round(w*dpr)){xyc.width=Math.round(w*dpr);xyc.height=Math.round(h*dpr)}
  const now=performance.now();trail=trail.filter(p=>now-p.t<700);xx.setTransform(dpr,0,0,dpr,0,0);xx.clearRect(0,0,w,h);
  const lite=!!xy.closest('.lite'),INK=lite?'29,29,27':'255,255,255',cx=w/2,cy=h/2,R=Math.min(w,h)*.4,ps=SP.get(puck)||{x:0,y:0},px=cx+ps.x,py=cy+ps.y,act=xyOn?1:0;
  xx.lineWidth=1;[[1,.4],[.9,.2],[.22,.28]].forEach(([k,a])=>{xx.strokeStyle=`rgba(${INK},${a})`;xx.beginPath();xx.arc(cx,cy,R*k*(1+energy*.02),0,6.2832);xx.stroke()});
  const sp=9;xx.fillStyle=`rgba(${INK},.55)`;xx.beginPath();
  for(let y=cy-R*.86;y<=cy+R*.86;y+=sp)for(let x=cx-R*.86;x<=cx+R*.86;x+=sp){const dc=Math.hypot(x-cx,y-cy);if(dc>R*.84||dc<R*.27)continue;
    const d=Math.hypot(x-px,y-py),inf=Math.max(0,1-d/(R*.55)),rr=.6+inf*(1.1+act*1.7)+energy*.7*(1-dc/R);if(rr<.8&&(Math.round(x/sp)+Math.round(y/sp))%3)continue;xx.moveTo(x+rr,y);xx.arc(x,y,rr,0,6.2832)}
  xx.fill();
  if(xyOn||Math.hypot(ps.x,ps.y)>2){xx.setLineDash([2,4]);xx.strokeStyle=`rgba(${INK},.55)`;xx.beginPath();xx.moveTo(cx,cy);xx.lineTo(px,py);xx.stroke();
    xx.strokeStyle=`rgba(${INK},.13)`;xx.beginPath();xx.moveTo(px,0);xx.lineTo(px,h);xx.moveTo(0,py);xx.lineTo(w,py);xx.stroke();xx.setLineDash([])}
  for(let i=1;i<trail.length;i++){const a=trail[i-1],b=trail[i],age=(now-b.t)/700,d=Math.hypot(b.x-a.x,b.y-a.y),n=Math.max(1,Math.floor(d/8)),r=(1-age)*3+.8;
    xx.fillStyle=lite?`rgba(29,29,27,${((1-age)*.55).toFixed(3)})`:`rgba(242,195,24,${((1-age)*.9).toFixed(3)})`;
    for(let j=0;j<n;j++){const q=j/n;xx.beginPath();xx.arc(a.x+(b.x-a.x)*q,a.y+(b.y-a.y)*q,r,0,6.283);xx.fill()}}
  if(now-xyLbl>110){xyLbl=now;updXy()}}
function updXy(){const f=xyVals.f,fx=xyVals.fx,set=(id,t)=>{const e=document.getElementById(id);if(e&&e.textContent!==t)e.textContent=t};
  set('xtF',f===0?'av':(f<0?'lp ':'hp ')+Math.round(Math.abs(f)*100));set('xtFx',Math.round(fx*100)+' %');
  set('xtE',Math.round(Math.min(1,S.master.echo+fx*.45)*100)+' %');set('xtS',Math.round(Math.min(1,S.master.space+fx*.55)*100)+' %');
  set('xtB',S.bpm+' bpm');set('xtT',playing?'takt '+String(bar+1).padStart(2,'0'):'stopp');
  set('dnF',String(Math.round(Math.abs(f)*100)));set('dnFu',f===0?'av':(f<0?'lp':'hp'));set('dnX',String(Math.round(fx*100)));set('devAct',xyOn?'aktiv':playing?'spelar':'redo')}

