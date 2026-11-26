/* ================= the master card, redesigned: loudness on top, three bus lanes, a mastering chain, colour & room ================= */
(()=>{const card=document.querySelector('.card[data-card="master"]');if(!card)return;card.classList.add('mx2');
  const capB=card.querySelector('.cap .t b');if(capB)capB.textContent='mix · mastering';
  const old=card.querySelector('#masterKnobs'),oldMeter=card.querySelector('.meter');
  const root=document.createElement('div');root.className='m2';
  root.innerHTML=`<div class="m2-top"><div class="m2-big"><span class="m2-cap">loudness</span><b class="m2-lufs" data-dh="34"></b><span class="m2-unit">lufs<br>kort</span></div>
      <div class="m2-meters"><canvas class="m2-pk"></canvas><div class="m2-rd"><span>topp <b class="m2-pkv">–</b> db</span><span>komp <b class="m2-gr">0.0</b> db</span><span>ceiling <b>−1.5</b> db</span></div></div></div>
    <div class="m2-sec"><span>bussar</span><small>allt går genom en buss · m tystar · s solar (flera går)</small></div><div class="m2-lanes"></div>
    <div class="m2-sec"><span>mastering</span><small>eq → glue → bredd → loud → limiter</small></div><div class="m2-chain"></div>
    <div class="m2-sec"><span>effekter</span><small>eko · rymd · tejp · crush · pennan byter vad siffran styr</small></div><div class="m2-fx"></div>
    <div class="m2-sec"><span>färg & rum</span><small>tejp, eko, rymd, groove och volym</small></div><div class="m2-color"></div>`;
  card.appendChild(root);if(old)root.querySelector('.m2-color').appendChild(old);if(oldMeter)oldMeter.style.display='none';
  {const pt=document.getElementById('ptiles');if(pt)root.querySelector('.m2-fx').appendChild(pt)}   /* the plugin tiles live in the master now */
  /* the old master pump knob lives in the synth lane now */
  const oldPump=[...(old?old.querySelectorAll('.knob'):[])].find(k=>k.getAttribute('aria-label')==='Pump');if(oldPump)oldPump.style.display='none';
  const lanes=root.querySelector('.m2-lanes'),chain=root.querySelector('.m2-chain');const dbf=v=>v<.001?'−∞':((v>=1?'+':'')+(20*Math.log10(v)).toFixed(1));
  const sk=(parent,o)=>{const k=knob(parent,o);masterKnobs.push(k);return k};
  BUSES.forEach(({k,name,hex})=>{const el=document.createElement('div');el.className='m2-lane';el.style.setProperty('--bc',hex);const b=()=>busOf(k);
    el.innerHTML=`<div class="m2-lh"><i></i><b>${name}</b><small>${k==='dr'?'trumspår 1–'+(window.trkDrums?trkDrums().length:6):k==='sy'?'syntspår 1–'+(window.trkSyns?trkSyns().length:4)+' · starter':'loopar'}</small><span class="m2-ms"><button class="m" title="Tysta bussen">m</button><button class="s" title="Solo (flera bussar går)">s</button></span></div>
      <div class="m2-lb"><div class="m2-fd" title="Nivå · dra upp/ner · dubbelklick = 0 dB"><div class="m2-tr"><span class="m2-dots"></span><i class="m2-th"></i></div><b class="m2-db"></b></div><div class="knobs m2-lk"></div></div>
      ${k==='dr'?'<div class="m2-hits"><canvas class="m2-hc"></canvas><div class="m2-note">kicken styr pumpen när synth eller loopar står på <b>följ kick</b></div></div>':`<div class="m2-pump"><div class="m2-ph"><span>pump</span><div class="m2-seg"><button data-s="kick">följ kick</button><button data-s="beat">takt</button></div></div>
        <canvas class="m2-pc"></canvas><div class="m2-rate">${[[8,'1/2'],[4,'1/4'],[2,'1/8'],[1,'1/16']].map(([r,l])=>`<button data-r="${r}">${l}</button>`).join('')}</div><div class="knobs m2-pk3"></div></div>`}`;
    lanes.appendChild(el);
    const lk=el.querySelector('.m2-lk');
    sk(lk,{label:'filter',min:-1,max:1,def:0,color:hex,fmt:v=>Math.abs(v)<.03?'av':(v<0?'lp':'hp'),ml:'b.'+k+'.filter',mll:'filter · '+name,get:()=>b().filter,set:v=>{b().filter=Math.abs(v)<.03?0:v;applyBuses();save()}});
    sk(lk,{label:'drive',min:0,max:1,def:0,color:hex,fmt:pct,ml:'b.'+k+'.drive',mll:'drive · '+name,get:()=>b().drive,set:v=>{b().drive=v;applyBuses();save()}});
    sk(lk,{label:'glue',min:0,max:1,def:0,color:hex,fmt:pct,ml:'b.'+k+'.glue',mll:'glue · '+name,get:()=>b().glue,set:v=>{b().glue=v;applyBuses();save()}});
    /* fader: sqrt travel like the mixer, dot meter inside the track */
    const fd=el.querySelector('.m2-fd'),tr=el.querySelector('.m2-tr'),th=el.querySelector('.m2-th'),dbe=el.querySelector('.m2-db'),dots=el.querySelector('.m2-dots');
    dots.innerHTML='<i></i>'.repeat(14);const dl=[...dots.children];
    const lvTo=y=>{const r=tr.getBoundingClientRect(),u=1-Math.max(0,Math.min(1,(y-r.top)/r.height));return Math.pow(u,2)*1.5};
    const paintF=()=>{const u=Math.sqrt(b().lv/1.5);th.style.bottom=`calc(${(u*100).toFixed(2)}% - 7px)`;dbe.textContent=dbf(b().lv)};
    let drag=false,lt=0;tr.addEventListener('pointerdown',e=>{e.preventDefault();const n=performance.now();if(n-lt<300){b().lv=1;applyBuses();save();paintF();lt=0;return}lt=n;drag=true;tr.setPointerCapture(e.pointerId);b().lv=lvTo(e.clientY);applyBuses();paintF()});
    tr.addEventListener('pointermove',e=>{if(drag){b().lv=lvTo(e.clientY);applyBuses();paintF()}});const up=()=>{if(drag){drag=false;save()}};tr.addEventListener('pointerup',up);tr.addEventListener('pointercancel',up);
    el._paintF=paintF;el._dl=dl;paintF();
    if(k!=='dr'){const pk=el.querySelector('.m2-pk3'),cv=el.querySelector('.m2-pc');
      sk(pk,{label:'mängd',min:0,max:1,def:k==='sy'?.4:0,color:hex,fmt:pct,ml:'b.'+k+'.pump',mll:'pump · '+name,get:()=>pumpAmt(k),set:v=>{if(k==='sy'){S.master.pump=v;applyMaster()}else pumpOf(k).amt=v;save();drawPump()}});
      sk(pk,{label:'kurva',min:0,max:1,def:.5,color:hex,fmt:v=>pumpOf(k).shape==null?'klass':v<.4?'snabb':v>.6?'sug':'rak',get:()=>pumpOf(k).shape==null?.5:pumpOf(k).shape,set:v=>{pumpOf(k).shape=v;save();drawPump()}});
      sk(pk,{label:'release',min:.03,max:.8,def:.2,color:hex,fmt:v=>pumpOf(k).rel==null?'auto':Math.round(v*1000)+'',get:()=>pumpOf(k).rel==null?pumpRel(k,pumpAmt(k)):pumpOf(k).rel,set:v=>{pumpOf(k).rel=v;save();drawPump()}});
      el.querySelectorAll('.m2-seg button').forEach(bt=>bt.onclick=()=>{pumpOf(k).src=bt.dataset.s;save();paintP()});
      el.querySelectorAll('.m2-rate button').forEach(bt=>bt.onclick=()=>{pumpOf(k).rate=+bt.dataset.r;pumpOf(k).src='beat';save();paintP()});
      const paintP=()=>{const c=pumpOf(k);el.querySelectorAll('.m2-seg button').forEach(bt=>bt.classList.toggle('on',bt.dataset.s===c.src));
        el.querySelectorAll('.m2-rate button').forEach(bt=>bt.classList.toggle('on',c.src==='beat'&&+bt.dataset.r===(c.rate||4)));el.classList.toggle('beat',c.src==='beat');drawPump()};
      /* the curve over one pump period, with a dot riding it after each hit */
      const drawPump=()=>{const r=cv.getBoundingClientRect(),dpr=devicePixelRatio||1,w=Math.max(1,r.width),h=Math.max(1,r.height);if(cv.width!==Math.round(w*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr)}
        const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);const col=getComputedStyle(el).color;
        const a=pumpAmt(k),rel=pumpRel(k,a),per=pumpOf(k).src==='beat'?60/S.bpm*(pumpOf(k).rate||4)/4:60/S.bpm,span=Math.max(per,rel+.03);
        c.globalAlpha=.18;c.fillStyle=col;for(let x=4;x<w;x+=6)for(let y=4;y<h;y+=6)c.fillRect(x-.6,y-.6,1.2,1.2);c.globalAlpha=1;
        const X=tt=>4+(w-8)*tt/span,Y=g=>4+(h-8)*(1-g);
        c.beginPath();c.moveTo(X(0),Y(1));c.lineTo(X(.004),Y(pumpGain(k,0)));for(let j=0;j<=60;j++){const tt=.005+rel*j/60;c.lineTo(X(tt),Y(pumpGain(k,j/60)))}c.lineTo(X(span),Y(1));
        c.strokeStyle=getComputedStyle(el).getPropertyValue('--bc');c.lineWidth=2;c.stroke();
        if(ctx){const d=ctx.currentTime-PUMPT[k];if(d>=0&&d<span&&a>0){const u=Math.min(1,Math.max(0,(d-.005)/rel));c.fillStyle='#E2F53C';c.beginPath();c.arc(X(Math.min(d,span)),Y(d<.005?1:pumpGain(k,u)),3.5,0,6.283);c.fill()}}};
      el._drawPump=drawPump;el._paintP=paintP;paintP()}
    const paintM=()=>{el.querySelector('.m').classList.toggle('on',!!b().mute);el.querySelector('.s').classList.toggle('on',!!b().solo);el.classList.toggle('off',!busOn(k));paintF();if(el._paintP)el._paintP()};
    el.querySelector('.m').onclick=()=>{b().mute=b().mute?0:1;applyBuses();save()};el.querySelector('.s').onclick=()=>{b().solo=b().solo?0:1;applyBuses();save()};el._paint=paintM});
  window.busPaint=()=>lanes.querySelectorAll('.m2-lane').forEach(e=>e._paint());busPaint();
  /* mastering chain: four tiles */
  const tile=(cls,title,sub)=>{const t=document.createElement('div');t.className='m2-tile '+cls;t.innerHTML=`<div class="m2-th2"><b>${title}</b><small>${sub}</small></div><canvas class="m2-vis"></canvas><div class="knobs m2-tk"></div>`;chain.appendChild(t);return t};
  const tEq=tile('eq','eq','110 hz · 1.5 khz · 8 khz'),tGl=tile('gl','glue','buss-komp på hela mixen'),tWd=tile('wd','bredd','mono ↔ bred'),tLd=tile('ld','loud','in i limitern');
  const mk=(t,label,min,max,def,key,fmt)=>sk(t.querySelector('.m2-tk'),{label,min,max,def,color:'var(--yellow)',fmt,ml:'m.'+key,mll:label+' · mastering',get:()=>mv(key),set:v=>{S.master[key]=v;applyMastering();save()}});
  const sdb=v=>(v>0?'+':'')+v.toFixed(1);
  mk(tEq,'låg',-12,12,0,'eqL',sdb);mk(tEq,'mitt',-12,12,0,'eqM',sdb);mk(tEq,'hög',-12,12,0,'eqH',sdb);
  mk(tGl,'glue',0,1,.5,'glue',pct);mk(tWd,'bredd',0,2,1,'width',v=>Math.round(v*100)+'%');mk(tLd,'loud',0,1,0,'loud',v=>'+'+(v*9).toFixed(1));
  const cvs=t=>t.querySelector('.m2-vis');
  const prep=(cv)=>{const r=cv.getBoundingClientRect(),dpr=devicePixelRatio||1,w=Math.max(1,r.width),h=Math.max(1,r.height);if(cv.width!==Math.round(w*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr)}const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);return [c,w,h]};
  const grid=(c,w,h,col)=>{c.globalAlpha=.16;c.fillStyle=col;for(let x=4;x<w;x+=6)for(let y=4;y<h;y+=6)c.fillRect(x-.6,y-.6,1.2,1.2);c.globalAlpha=1};
  /* EQ response computed like Web Audio's shelves/peak (no audio needed to draw it) */
  const shelfResp=(f,f0,g,type)=>{const A=Math.pow(10,g/40),w0=2*Math.PI*f0/48000,w=2*Math.PI*f/48000,cs=Math.cos(w0),sn=Math.sin(w0);let b0,b1,b2,a0,a1,a2;
    if(type==='pk'){const al=sn/(2*.8);b0=1+al*A;b1=-2*cs;b2=1-al*A;a0=1+al/A;a1=-2*cs;a2=1-al/A}
    else{const al=sn/2*Math.SQRT2,k2=2*Math.sqrt(A)*al;if(type==='lo'){b0=A*((A+1)-(A-1)*cs+k2);b1=2*A*((A-1)-(A+1)*cs);b2=A*((A+1)-(A-1)*cs-k2);a0=(A+1)+(A-1)*cs+k2;a1=-2*((A-1)+(A+1)*cs);a2=(A+1)+(A-1)*cs-k2}
      else{b0=A*((A+1)+(A-1)*cs+k2);b1=-2*A*((A-1)+(A+1)*cs);b2=A*((A+1)+(A-1)*cs-k2);a0=(A+1)-(A-1)*cs+k2;a1=2*((A-1)-(A+1)*cs);a2=(A+1)-(A-1)*cs-k2}}
    const re=z=>[Math.cos(z),-Math.sin(z)],num=[b0+b1*Math.cos(w)+b2*Math.cos(2*w),-(b1*Math.sin(w)+b2*Math.sin(2*w))],den=[a0+a1*Math.cos(w)+a2*Math.cos(2*w),-(a1*Math.sin(w)+a2*Math.sin(2*w))];
    return 20*Math.log10(Math.hypot(...num)/Math.hypot(...den))};
  const drawEq=()=>{const [c,w,h]=prep(cvs(tEq));const col=getComputedStyle(tEq).color;grid(c,w,h,col);c.strokeStyle=col;c.globalAlpha=.25;c.beginPath();c.moveTo(0,h/2);c.lineTo(w,h/2);c.stroke();c.globalAlpha=1;
    c.beginPath();for(let x=0;x<=w;x+=2){const f=20*Math.pow(1000,x/w),db=shelfResp(f,110,mv('eqL'),'lo')+shelfResp(f,1500,mv('eqM'),'pk')+shelfResp(f,8000,mv('eqH'),'hi');const y=h/2-db/14*(h/2-4);x?c.lineTo(x,y):c.moveTo(x,y)}
    c.strokeStyle='#F2C318';c.lineWidth=2;c.stroke()};
  let ms=0,pk=0,pkL=0,pkR=0,buf=null,bL=null,bR=null,grS=0;
  const lufsEl=root.querySelector('.m2-lufs'),pkv=root.querySelector('.m2-pkv'),gre=root.querySelector('.m2-gr'),pkc=root.querySelector('.m2-pk');
  let eqKey='';
  (function loop(){requestAnimationFrame(loop);if(!card.offsetParent)return;
    const k2=[mv('eqL'),mv('eqM'),mv('eqH'),cvs(tEq).clientWidth].join();if(k2!==eqKey){eqKey=k2;drawEq()}
    lanes.querySelectorAll('.m2-lane').forEach(e=>{if(e._drawPump)e._drawPump()});
    {const hc=lanes.querySelector('.m2-hc');if(hc&&ctx){const [c,w,h]=prep(hc);const names=['kick','snare','clap','hat','open','perc'],cw=w/6,rows=Math.floor((h-16)/6);
      for(let i=0;i<6;i++){const ht=hitT.get(i),age=ht?ctx.currentTime-ht.t:9,lv=age>=0?Math.max(0,1-age*3.2)*(ht?ht.v:0):0,lit=Math.round(lv*rows),col=TRACKS[i].hex;
        for(let r=0;r<rows;r++){const on=r<lit;c.globalAlpha=on?.95:.14;c.fillStyle=on?col:'#ECEAE3';c.beginPath();c.arc(i*cw+cw/2,h-14-r*6,2.2,0,6.283);c.fill()}
        c.globalAlpha=.5;c.fillStyle='#ECEAE3';c.font='8px '+getComputedStyle(document.body).getPropertyValue('--f-mono');c.textAlign='center';c.fillText(names[i],i*cw+cw/2,h-2)}c.globalAlpha=1;c.textAlign='left'}}
    let gr=0;
    if(ctx&&A.an){if(!buf||buf.length!==A.an.fftSize)buf=new Float32Array(A.an.fftSize);A.an.getFloatTimeDomainData(buf);let s=0,p=0;for(const v of buf){s+=v*v;const a=Math.abs(v);if(a>p)p=a}
      ms+=(s/buf.length-ms)*.02;pk=Math.max(p,pk*.97);gr=A.mst?Math.abs(A.mst.comp.reduction)+Math.abs(A.mst.lim.reduction):0;grS+=(gr-grS)*.2;
      if(A.anL&&A.anR){if(!bL)bL=new Float32Array(A.anL.fftSize),bR=new Float32Array(A.anR.fftSize);A.anL.getFloatTimeDomainData(bL);A.anR.getFloatTimeDomainData(bR);let l=0,r=0;for(let i=0;i<bL.length;i++){l=Math.max(l,Math.abs(bL[i]));r=Math.max(r,Math.abs(bR[i]))}pkL=Math.max(l,pkL*.94);pkR=Math.max(r,pkR*.94)}}
    setDM(lufsEl,ms>1e-9?(-0.691+10*Math.log10(ms)).toFixed(1):'--',34);pkv.textContent=pk>1e-5?(20*Math.log10(pk)).toFixed(1):'–';gre.textContent=grS.toFixed(1);
    /* L/R peak as dot rows */
    {const [c,w,h]=prep(pkc);const col=getComputedStyle(root).color,n=Math.floor((w-4)/7);[pkL,pkR].forEach((v,row)=>{const db=20*Math.log10(v+1e-6),lit=Math.round(Math.max(0,Math.min(1,(db+48)/48))*n);
      for(let j=0;j<n;j++){const x=4+j*7,y=row?h*.72:h*.28,on=j<lit,hot=j>=n-3;c.globalAlpha=on?1:.16;c.fillStyle=on?(hot?'#FF4A33':j>=n-8?'#F2C318':col):col;c.beginPath();c.arc(x+2.5,y,2.4,0,6.283);c.fill()}});c.globalAlpha=1}
    /* glue: gain reduction as a falling bar of dots */
    {const [c,w,h]=prep(cvs(tGl));const col=getComputedStyle(tGl).color;grid(c,w,h,col);const n=Math.floor((w-4)/6),lit=Math.round(Math.min(1,grS/12)*n);c.fillStyle='#F2C318';for(let j=0;j<lit;j++)c.fillRect(4+j*6-1.4,h/2-1.4,2.8,2.8);
      c.fillStyle=col;c.font='9px '+getComputedStyle(document.body).getPropertyValue('--f-mono');c.globalAlpha=.6;c.fillText('−'+grS.toFixed(1)+' db',4,h-4);c.globalAlpha=1}
    /* width: stereo dots (goniometer) */
    {const [c,w,h]=prep(cvs(tWd));const col=getComputedStyle(tWd).color;grid(c,w,h,col);if(bL&&bR){c.fillStyle='#F2C318';const m=Math.min(w,h)/2-4,cx=w/2,cy=h/2;for(let i=0;i<bL.length;i+=4){const l=bL[i],r=bR[i],x=(l-r)*.707,y=(l+r)*.707;c.fillRect(cx+x*m*1.6-.8,cy-y*m*1.6-.8,1.6,1.6)}}}
    /* loud: short-term loudness against −14 / −9 / −6 marks */
    {const [c,w,h]=prep(cvs(tLd));const col=getComputedStyle(tLd).color;grid(c,w,h,col);const lu=ms>1e-9?-0.691+10*Math.log10(ms):-60,X=v=>4+(w-8)*Math.max(0,Math.min(1,(v+30)/30));
      c.fillStyle='#F2C318';const n=Math.floor((w-8)/6);for(let j=0;j<n;j++){if(4+j*6>X(lu))break;c.fillRect(4+j*6-1.4,h/2-4,2.8,8)}
      c.fillStyle=col;c.globalAlpha=.55;c.font='8.5px '+getComputedStyle(document.body).getPropertyValue('--f-mono');[-14,-9,-6].forEach(v=>{c.fillRect(X(v),h/2-9,1,18);c.fillText(String(v),X(v)-7,h-2)});c.globalAlpha=1}
    /* bus meters in the faders */
    if(A.buses)lanes.querySelectorAll('.m2-lane').forEach((e,j)=>{const B=A.buses[BUSES[j].k];if(!B._b)B._b=new Float32Array(B.an.fftSize);B.an.getFloatTimeDomainData(B._b);let q=0;for(const v of B._b)q=Math.max(q,Math.abs(v));
      B._m=Math.max(q,(B._m||0)*.9);const lit=Math.round(Math.max(0,Math.min(1,(20*Math.log10(B._m+1e-6)+48)/48))*e._dl.length);e._dl.forEach((d,i)=>d.classList.toggle('on',e._dl.length-1-i<lit))})})();
})();

