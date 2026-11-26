/* ================= analys (was "plugins · master"): spectrum, loudness over time, stereo ================= */
(()=>{const card=document.querySelector('.card[data-card="plugins"]');if(!card)return;card.classList.add('ana');
  const t=card.querySelector('.cap .t');if(t)t.innerHTML='analys · <b>mix</b>';
  const box=document.createElement('div');box.className='an2';
  box.innerHTML=`<div class="an-h"><span>spektrum</span><small>20 hz – 20 khz · linje = topp</small></div><canvas class="an-sp"></canvas>
    <div class="an-row"><div class="an-c"><div class="an-h"><span>loudness</span><small>senaste 30 s</small></div><canvas class="an-lh"></canvas></div>
      <div class="an-c"><div class="an-h"><span>stereo</span><small>korrelation</small></div><canvas class="an-st"></canvas></div></div>
    <div class="an-num"><div><span>loudness</span><b class="a-lu">–</b><small>lufs ca</small></div><div><span>topp</span><b class="a-pk">–</b><small>db</small></div><div><span>dynamik</span><b class="a-dr">–</b><small>db topp − loud</small></div><div><span>korrelation</span><b class="a-co">–</b><small>+1 mono · 0 brett</small></div></div>`;
  card.appendChild(box);
  const sp=box.querySelector('.an-sp'),lh=box.querySelector('.an-lh'),st=box.querySelector('.an-st');
  const prep=cv=>{const r=cv.getBoundingClientRect(),d=devicePixelRatio||1,w=Math.max(1,r.width),h=Math.max(1,r.height);if(cv.width!==Math.round(w*d)){cv.width=Math.round(w*d);cv.height=Math.round(h*d)}const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h);return [c,w,h]};
  let fb=null,hold=null,bL=null,bR=null,ms=0,pk=0,hist=[],lastH=0,corr=0;
  const col=()=>getComputedStyle(card).color,mono=()=>getComputedStyle(document.body).getPropertyValue('--f-mono');
  (function loop(){requestAnimationFrame(loop);if(!card.offsetParent||!ctx||!A.an)return;
    if(!fb||fb.length!==A.an.frequencyBinCount){fb=new Float32Array(A.an.frequencyBinCount);hold=new Float32Array(96).fill(-120)}A.an.getFloatFrequencyData(fb);
    {const [c,w,h]=prep(sp),cl=col(),cols=96,cw=w/cols,rows=Math.floor((h-14)/6),ny=ctx.sampleRate/2;
      for(let i=0;i<cols;i++){const f0=20*Math.pow(1000,i/cols),f1=20*Math.pow(1000,(i+1)/cols);let m=-140;for(let k=Math.floor(f0/ny*fb.length);k<=Math.min(fb.length-1,Math.ceil(f1/ny*fb.length));k++)m=Math.max(m,fb[k]);
        const v=Math.max(0,Math.min(1,(m+96)/84)),lit=Math.round(v*rows);hold[i]=Math.max(m,hold[i]-.35);
        for(let r=0;r<rows;r++){const on=r<lit;c.globalAlpha=on?.95:.12;c.fillStyle=on?(r>rows*.85?'#FF4A33':r>rows*.65?'#F2C318':cl):cl;c.fillRect(i*cw+cw/2-1.5,h-14-r*6-1.5,3,3)}
        const hy=h-14-Math.max(0,Math.min(1,(hold[i]+96)/84))*rows*6;c.globalAlpha=.9;c.fillStyle='#E2F53C';c.fillRect(i*cw+1,hy-1,cw-2,1.6)}
      c.globalAlpha=.55;c.fillStyle=cl;c.font='8.5px '+mono();[[50,'50'],[100,'100'],[500,'500'],[1000,'1k'],[5000,'5k'],[10000,'10k']].forEach(([f,l])=>{c.fillText(l,Math.log(f/20)/Math.log(1000)*w-6,h-2)});c.globalAlpha=1}
    if(A.anL&&A.anR){if(!bL)bL=new Float32Array(A.anL.fftSize),bR=new Float32Array(A.anR.fftSize);A.anL.getFloatTimeDomainData(bL);A.anR.getFloatTimeDomainData(bR);
      let s=0,p=0,lr=0,ll=0,rr=0;for(let i=0;i<bL.length;i++){const l=bL[i],r=bR[i];s+=(l*l+r*r)/2;p=Math.max(p,Math.abs(l),Math.abs(r));lr+=l*r;ll+=l*l;rr+=r*r}
      ms+=(s/bL.length-ms)*.02;pk=Math.max(p,pk*.985);const c0=ll>1e-9&&rr>1e-9?lr/Math.sqrt(ll*rr):1;corr+=(c0-corr)*.1;
      const lu=ms>1e-9?-0.691+10*Math.log10(ms):-70,pdb=pk>1e-5?20*Math.log10(pk):-70,now=performance.now();if(now-lastH>100){lastH=now;hist.push(lu);if(hist.length>300)hist.shift()}
      box.querySelector('.a-lu').textContent=lu>-69?lu.toFixed(1):'–';box.querySelector('.a-pk').textContent=pdb>-69?pdb.toFixed(1):'–';box.querySelector('.a-dr').textContent=lu>-69?(pdb-lu).toFixed(1):'–';box.querySelector('.a-co').textContent=(corr>=0?'+':'')+corr.toFixed(2);
      {const [c,w,h]=prep(lh),cl=col(),Y=v=>4+(h-8)*(1-Math.max(0,Math.min(1,(v+36)/36)));c.globalAlpha=.14;c.fillStyle=cl;for(let x=4;x<w;x+=6)for(let y=4;y<h;y+=6)c.fillRect(x-.6,y-.6,1.2,1.2);
        c.globalAlpha=.5;c.font='8.5px '+mono();[-14,-9].forEach(v=>{c.fillRect(0,Y(v),w,1);c.fillText(String(v),2,Y(v)-2)});c.globalAlpha=1;
        c.beginPath();hist.forEach((v,i)=>{const x=w-(hist.length-1-i)*(w/300),y=Y(v);i?c.lineTo(x,y):c.moveTo(x,y)});c.strokeStyle='#F2C318';c.lineWidth=1.8;c.stroke()}
      {const [c,w,h]=prep(st),cl=col(),m=Math.min(w*.6,h)/2-6,cx=m+8,cy=h/2;c.globalAlpha=.2;c.strokeStyle=cl;c.beginPath();c.arc(cx,cy,m,0,6.283);c.stroke();c.globalAlpha=1;c.fillStyle='#F2C318';
        for(let i=0;i<bL.length;i+=3){const x=(bL[i]-bR[i])*.707,y=(bL[i]+bR[i])*.707;c.fillRect(cx+x*m*1.5-.8,cy-y*m*1.5-.8,1.6,1.6)}
        const bx=cx+m+18,bw=w-bx-6;c.globalAlpha=.25;c.fillStyle=cl;c.fillRect(bx,cy-1,bw,2);c.globalAlpha=1;c.fillStyle=corr<0?'#FF4A33':'#E2F53C';const px=bx+bw*(corr+1)/2;c.fillRect(px-2,cy-8,4,16);
        c.globalAlpha=.55;c.fillStyle=cl;c.font='8.5px '+mono();c.fillText('−1',bx,cy+20);c.fillText('0',bx+bw/2-3,cy+20);c.fillText('+1',bx+bw-12,cy+20);c.globalAlpha=1}}})();
})();

