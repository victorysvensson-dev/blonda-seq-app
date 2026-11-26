/* ---------------- master deck ---------------- */
const deck=$('#deck'),scrim=$('#deckScrim');let deckOpen=false;const hist=[];
window.__setDeck=o=>setDeck(o);function setDeck(o){deckOpen=o;deck.classList.toggle('open',o);scrim.classList.toggle('on',o);deck.setAttribute('aria-hidden',o?'false':'true');deck.style.transform=''}
(()=>{const tp=document.querySelector('.transport');let y0=null;
  tp.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;y0=e.clientY;tp.setPointerCapture(e.pointerId)});
  tp.addEventListener('pointermove',e=>{if(y0!==null&&e.clientY-y0<-28){y0=null;setDeck(true)}});
  tp.addEventListener('pointerup',e=>{if(y0!==null&&Math.abs(e.clientY-y0)<10)setDeck(true);y0=null});
  tp.addEventListener('pointercancel',()=>{y0=null});
  const h=$('#deckH');let d0=null,dy=0;
  h.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;d0=e.clientY;dy=0;h.setPointerCapture(e.pointerId);deck.classList.add('dragging')});
  h.addEventListener('pointermove',e=>{if(d0===null)return;dy=Math.max(0,e.clientY-d0);deck.style.transform=`translateY(${dy}px)`});
  const end=()=>{if(d0===null)return;d0=null;deck.classList.remove('dragging');if(dy>110)setDeck(false);else deck.style.transform=''};
  h.addEventListener('pointerup',end);h.addEventListener('pointercancel',end)})();
scrim.onclick=()=>setDeck(false);$('#deckClose').onclick=()=>setDeck(false);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&deckOpen)setDeck(false)});
$('#deckPlay').onclick=play;$('#deckRec').onclick=()=>$('#recBtn').click();
const _spi=setPlayIcon;setPlayIcon=function(){_spi();$('#deckPlayIco').innerHTML=$('#playIco').innerHTML;$('#deckPlay').setAttribute('aria-label',playing?'Stoppa':'Spela')};
const dkChain=$('#dkChain');for(let k=0;k<16;k++)dkChain.appendChild(document.createElement('i'));
const dkBeats=[...$('#dkBeats').children],specPk=new Array(24).fill(0);
let dkLast=0,dkStat=0,tbuf=null,lbuf=null,rbuf=null,fbuf=null;
function fit(cv){const w=cv.clientWidth,h=cv.clientHeight,d=Math.min(2,devicePixelRatio||1);if(!w||!h)return null;
  if(cv.width!==Math.round(w*d)||cv.height!==Math.round(h*d)){cv.width=Math.round(w*d);cv.height=Math.round(h*d)}
  const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h);return {c,w,h}}
function dots(c,l,r,a){if(!l.length)return;c.fillStyle=`rgba(17,18,17,${a})`;c.beginPath();for(let i=0;i<l.length;i+=2){c.moveTo(l[i]+r,l[i+1]);c.arc(l[i],l[i+1],r,0,6.2832)}c.fill()}
function deckFrame(now){if(now-dkLast<33)return;dkLast=now;
  let pk=0,ms=0;
  if(ctx&&A.an){if(!tbuf){tbuf=new Float32Array(2048);fbuf=new Uint8Array(1024);lbuf=new Float32Array(1024);rbuf=new Float32Array(1024)}
    A.an.getFloatTimeDomainData(tbuf);for(let i=0;i<2048;i++){const v=tbuf[i];pk=Math.max(pk,Math.abs(v));ms+=v*v}ms=Math.sqrt(ms/2048);
    A.an.getByteFrequencyData(fbuf);A.anL.getFloatTimeDomainData(lbuf);A.anR.getFloatTimeDomainData(rbuf)}
  hist.push({p:pk,m:ms,b:playing&&curStep%4===0});if(hist.length>1200)hist.shift();if(!deckOpen)return;
  const el=ctx&&playing?Math.max(0,ctx.currentTime-startT):0;
  setDM($('#deckClock'),String(Math.floor(el/60)).padStart(2,'0')+':'+String(Math.floor(el%60)).padStart(2,'0'));
  dkBeats.forEach((b,i)=>b.classList.toggle('on',playing&&curStep>=0&&Math.floor(curStep/4)===i));
  [...dkChain.children].forEach((b,k)=>b.classList.toggle('on',playing&&curStep>=0&&k<=curStep));
  if(now-dkStat>160){dkStat=now;const db=x=>x>.001?(20*Math.log10(x)).toFixed(1):'--';
    setDM($('#dkPk'),db(pk));setDM($('#dkRms'),db(ms));setDM($('#dkBpm'),String(S.bpm));setDM($('#dkPat'),'ABCD'[S.pat]);
    $('#dkWorld').textContent=WORLDS[S.world||0].name.toLowerCase();
    $('#dkPos').textContent=playing?'takt '+String(bar+1).padStart(2,'0')+(S.song&&chainIdx>=0?' · del '+(chainIdx+1):''):'stopp';
    setDM($('#dkBar'),playing&&curStep>=0?String(bar+1)+'.'+(Math.floor(curStep/4)+1):'--');setDM($('#dkSw'),Math.round(50+S.master.swing*41.6)+'%');setDM($('#dkPu'),Math.round(S.master.pump*100)+'%');
    setDM($('#dkFx'),Math.round(S.master.echo*100)+'/'+Math.round(S.master.space*100));
    const q=$('#dkQ');if(q){if(!q.children.length)for(let k=0;k<8;k++){const sp=document.createElement('span');q.appendChild(sp)}
      [...q.children].forEach((sp,k)=>{const v=S.chain?S.chain[k]:-1,on=S.song&&chainIdx===k&&playing;setDM(sp,v>=0?'ABCD'[v]:'-',16);sp.classList.toggle('on',on);sp.classList.toggle('off',v<0)});
      $('#dkSongS').textContent=S.song?'låtläge · del '+(chainIdx>=0?chainIdx+1:1):'av'}
    const rec=hist.slice(-30);let mm=0;rec.forEach(e=>mm=Math.max(mm,e.m||0));$('#dkLu').textContent=mm>.001?(20*Math.log10(mm)).toFixed(1)+' db rms':'--'}
  /* per-channel meters (post fader) */
  if(ctx&&A.ch&&!A.ch[0].dkan){A.ch.forEach(ch=>{const an=ctx.createAnalyser();an.fftSize=256;an.smoothingTimeConstant=0;ch.g.connect(an);ch.dkan=an;ch.dkbuf=new Float32Array(256);ch.dkl=0})}
  {const f=fit($('#dkMtr'));if(f){const {c,w,h}=f,N=TRACKS.length,cw=w/N,rows=Math.max(8,Math.floor((h-18)/7)),on=[],off=[],pk=[];
    for(let i=0;i<N;i++){const ch=A.ch&&A.ch[i];let lv=0;if(ch&&ch.dkan){ch.dkan.getFloatTimeDomainData(ch.dkbuf);let m=0;for(const v of ch.dkbuf)m=Math.max(m,Math.abs(v));lv=m}
      const db=lv>.0001?20*Math.log10(lv):-80,n=Math.round(clamp((db+48)/48,0,1)*rows);if(ch){ch.dkl=Math.max(n,(ch.dkl||0)-.35)}const pr=ch?Math.round(ch.dkl)-1:-1;
      for(let q=0;q<rows;q++){const x=cw*(i+.5),y=h-20-q*(h-26)/(rows-1);if(q<n)on.push(x,y);else if(q===pr)pk.push(x,y);else off.push(x,y)}}
    dots(c,off,1.05,.12);dots(c,pk,1.9,.5);dots(c,on,1.9,.92);c.fillStyle='rgba(17,18,17,.6)';c.font='500 8.5px "BLONDA Mono",monospace';c.textAlign='center';
    /* (v282) the names ran into each other: on two lines when the columns are narrow, each cut to the room it has */const st=cw<34,room=(st?cw*2:cw)-6;if(cw<18)c.font='500 7.5px "BLONDA Mono",monospace';
    TRACKS.forEach((t,i)=>{let nm=t.name.toLowerCase();while(nm.length>1&&c.measureText(nm).width>room)nm=nm.slice(0,-1);const y=st&&i%2?h-12:h-3,N1=TRACKS.length-1;const hw=c.measureText(nm).width/2;c.textAlign='center';c.fillText(nm,i===0?Math.max(hw+1,cw*.5):i===N1?Math.min(w-hw-1,cw*(i+.5)):cw*(i+.5),y)});c.textAlign='left'}}
  /* loudness history: one dot column per ~1/3 s */
  {const f=fit($('#dkLoud'));if(f){const {c,w,h}=f,P=5,cols=Math.floor(w/P),rows=Math.floor((h-4)/P),on=[],off=[],per=Math.max(1,Math.floor(900/cols));
    for(let k=0;k<cols;k++){let m=0;for(let j=0;j<per;j++){const e=hist[hist.length-1-k*per-j];if(e)m=Math.max(m,e.m||0)}const db=m>.0001?20*Math.log10(m):-80,n=Math.round(clamp((db+42)/42,0,1)*rows),x=w-P/2-k*P;
      for(let r=0;r<rows;r++){(r<n?on:off).push(x,h-2-r*P)}}dots(c,off,1,.09);dots(c,on,1.6,.85)}}
  // waveform: mirrored dot columns, newest at the right edge, beat marks along the bottom
  let f=fit($('#dkWave'));if(f){const {c,w,h}=f,P=5,cols=Math.floor(w/P),rows=Math.floor((h/2-6)/P),per=2,on=[],off=[],bt=[];
    for(let k=0;k<cols;k++){const x=w-P/2-k*P;let a=0,isB=false;
      for(let j=0;j<per;j++){const e=hist[hist.length-1-k*per-j];if(e){a=Math.max(a,e.p);isB=isB||e.b}}
      const n=Math.round(Math.min(1,Math.sqrt(a))*rows);
      for(let r=0;r<=rows;r++){const t=(r<=n&&a>.003)?on:off;t.push(x,h/2-r*P);if(r)t.push(x,h/2+r*P)}
      if(isB)bt.push(x,h-1.5)}
    dots(c,off,1.05,.09);dots(c,on,1.75,.95);dots(c,bt,1.3,.45)}
  // last bar replay: 8 tracks x 16 steps
  f=fit($('#dkAct'));if(f){const {c,w,h}=f,cw=w/16,TL=window.trkList?trkList():TRACKS.map((_,i)=>i),rh=h/TL.length,sd=stepDur(),bd=sd*16,ct=ctx?ctx.currentTime:0,lit=[],dim=[],off=[],m=Math.min(cw,rh);
    if(playing&&curStep>=0){c.fillStyle='rgba(17,18,17,.08)';c.fillRect(cw*curStep,0,cw,h)}
    for(let r=0;r<TL.length;r++){const i=TL[r];for(let s2=0;s2<16;s2++){const x=cw*(s2+.5),y=rh*(r+.5),e=actT[i][s2],age=e?ct-e.t:99;
      if(e&&age>=0&&age<bd*.98)(age<sd*1.5?lit:dim).push(x,y);else off.push(x,y)}}
    dots(c,off,1.2,.13);dots(c,dim,m*.2,.5);dots(c,lit,m*.33,1)}
  // stereo field
  f=fit($('#dkGon'));if(f){const {c,w,h}=f,x0=w/2,y0=h/2,Rr=Math.min(w,h)/2-4,g=[],pts=[];
    for(let a=0;a<60;a++){const t=a/60*6.2832;g.push(x0+Math.cos(t)*Rr,y0+Math.sin(t)*Rr)}
    for(let k=-5;k<=5;k++){if(k){g.push(x0+k*Rr/6,y0);g.push(x0,y0+k*Rr/6)}}
    dots(c,g,.9,.2);
    if(lbuf)for(let i=0;i<1024;i+=3){const L=lbuf[i],Rt=rbuf[i];pts.push(x0+(L-Rt)*.75*Rr,y0-(L+Rt)*.75*Rr)}
    dots(c,pts,1.1,.55)}
  // spectrum: 24 log bands, dot columns with falling peak dot
  f=fit($('#dkSpec'));if(f){const {c,w,h}=f,B=24,cw=w/B,rows=Math.max(5,Math.floor(h/7)),on=[],off=[],pd=[],sr=ctx?ctx.sampleRate:48000,r=Math.min(2.1,cw*.3);
    for(let b=0;b<B;b++){const f0=40*Math.pow(400,b/B),f1=40*Math.pow(400,(b+1)/B),i0=Math.floor(f0/(sr/2)*1024),i1=Math.max(i0+1,Math.floor(f1/(sr/2)*1024));let m=0;
      if(fbuf)for(let i=i0;i<i1&&i<1024;i++)m=Math.max(m,fbuf[i]);
      const n=Math.round(m/255*rows);specPk[b]=Math.max(n,specPk[b]-.2);const pr=Math.round(specPk[b])-1;
      for(let q=0;q<rows;q++){const x=cw*(b+.5),y=h-3-q*(h-6)/(rows-1);if(q<n)on.push(x,y);else if(q===pr)pd.push(x,y);else off.push(x,y)}}
    dots(c,off,1.05,.1);dots(c,pd,r,.45);dots(c,on,r,.92)}
}

