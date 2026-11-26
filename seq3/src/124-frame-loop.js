/* ---------------- frame loop ---------------- */
let curStep=-1,curStepT=0,lastNow=performance.now(),pkT=0;
function trkPos(i,s,g){const L=trkLen(i);return s<0?-1:(L<16&&!rep)?g%L:s}
function paintPlayhead(s,g=curG){for(let i=0;i<TRACKS.length;i++){const ts=trkPos(i,s,g);for(let k=0;k<16;k++)cellEls[i][k].classList.toggle('ph',k===ts)}
  const bs=trkPos(S.sel,s,g);bigEls.forEach((b,k)=>b.classList.toggle('ph',k===bs));[...rule.children].forEach((sp,k)=>sp.classList.toggle('ph',k===s));[...bar16.children].forEach((b,k)=>b.classList.toggle('on',s>=0&&k<=s))}
const cv=$('#scope'),cx=cv.getContext('2d');let buf=null;
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.033,(now-lastNow)/1000);lastNow=now;
  stepSprings(dt);stepKnobs();perfFrame(dt);deckFrame(now);drawRoll(now);drawSnd(now);drawDial();updPhBand();drawSynth(now);drawEng(now);miniFrame();loopFrame();mixerFrame();m4Frame();drawOrbit(now);
  if(ctx&&playing){const ct=ctx.currentTime;let ev=null;while(visQ.length&&visQ[0].t<=ct)ev=visQ.shift();
    if(ev&&(ev.step!==curStep||ev.g!==curG)){curStep=ev.step;curG=ev.g||0;curStepT=ev.t;paintPlayhead(curStep);$('#pos').textContent=String(ev.bar+1).padStart(2,'0')+'·'+(Math.floor(ev.step/4)+1);$('#barNum').textContent=ev.bar+1}
    const el=Math.max(0,ct-startT);setDM($('#clock'),String(Math.floor(el/60)).padStart(2,'0')+':'+String(Math.floor(el%60)).padStart(2,'0'))}
  if(ctx){const ct=ctx.currentTime;hitT.forEach((h,i)=>{const on=ct>=h.t&&ct-h.t<.09;tagDots[i].classList.toggle('hit',on);if(padEls[i])padEls[i].classList.toggle('lit',ct>=h.t&&ct-h.t<.12);const rw=trkRowEl(i);if(rw)rw.classList.toggle('hit',ct>=h.t&&ct-h.t<.1);
      if(on&&!h.done){h.done=1;energy=Math.min(1,energy+(i===0?.9:i<3?.35:.12)*h.v);if(i===S.sel||i===0)selCol=hex2(TRACKS[S.sel].hex)}})}
  energy*=Math.pow(.02,dt);
  if(now-bgLast>32){bgLast=now;drawBg(now)}
  // scope
  const w=cv.offsetParent?cv.clientWidth:0,h=cv.clientHeight;if(!w)return;const dpr=Math.min(2,devicePixelRatio||1);
  if(cv.width!==Math.round(w*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr)}
  cx.setTransform(dpr,0,0,dpr,0,0);cx.clearRect(0,0,w,h);
  const grad=cx.createLinearGradient(0,0,w,0);grad.addColorStop(0,'rgba(255,255,255,.2)');grad.addColorStop(.5,'rgba(255,255,255,.95)');grad.addColorStop(1,'rgba(255,255,255,.2)');
  cx.strokeStyle=grad;cx.lineWidth=1.8;cx.shadowColor='rgba(255,255,255,.7)';cx.shadowBlur=8;cx.beginPath();
  if(ctx&&A.an){if(!buf)buf=new Float32Array(A.an.fftSize);A.an.getFloatTimeDomainData(buf);let pk=0;
    cx.fillStyle='rgba(255,255,255,.92)';const N=Math.floor(w/5);for(let x=0;x<N;x++){const v=buf[Math.floor(x/N*1024)]||0;pk=Math.max(pk,Math.abs(v));const px=x/(N-1)*w,py=h*.42-v*h*.38;cx.beginPath();cx.arc(px,py,1.5,0,6.283);cx.fill()}
    const db=pk>0?20*Math.log10(pk):-Infinity;if(now-pkT>140){pkT=now;setDM($('#peak'),isFinite(db)&&db>-60?db.toFixed(1):'--')}$('#meter').style.width=clamp((db+48)/48,0,1)*100+'%'}
  else{cx.moveTo(0,h*.42);cx.lineTo(w,h*.42);cx.stroke()}
  cx.shadowBlur=0}
requestAnimationFrame(frame);

