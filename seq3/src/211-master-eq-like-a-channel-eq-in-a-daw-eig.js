/* ================= Master EQ, like a channel EQ in a DAW: eight bands — low cut, low shelf, four bells, high shelf, high cut —
   each with its own colour and on/off, on one graph with a dB / frequency grid and a live spectrum of what leaves the EQ.
   Drag a point: sideways = frequency, up/down = gain (on the cuts: resonance); wheel or ⌥-drag = Q; double-click = reset.
   The icons above the graph switch bands on/off. ⤢ opens it full screen with a table of every band's frequency, gain and Q
   (drag the numbers). A bypass compares with and without.
   Sound: the three old filters stay (low shelf, the 1.5 kHz bell, high shelf); the new ones sit in the master chain right after
   them. Every new band starts off or flat, and a filter that is not in use is a flat "peaking 0 dB" filter (exactly unity),
   so a project made before sounds exactly as it did. ================= */
(()=>{const tile=document.querySelector('.card.master .m2-tile.eq');if(!tile||typeof MST_DEF==='undefined')return;
  const DEF={eqOn:1,eqHPon:0,eqHPf:30,eqHPs:24,eqHPq:.71,eqLon:1,eqLf:110,eqP1on:1,eqP1:0,eqP1f:200,eqP1q:1,eqP2on:1,eqP2:0,eqP2f:600,eqP2q:1,
    eqMon:1,eqMf:1500,eqMq:.8,eqP4on:1,eqP4:0,eqP4f:3500,eqP4q:1,eqHon:1,eqHf:8000,eqLPon:0,eqLPf:18000,eqLPs:24,eqLPq:.71};
  Object.assign(MST_DEF,DEF);
  /* the bands, low to high. kind: hp/lp = cut (slope in dB/oct, resonance), lo/hi = shelf, pk = bell */
  const B=[{id:'hp',kind:'hp',on:'eqHPon',f:'eqHPf',s:'eqHPs',q:'eqHPq',name:'low cut',tag:'C',col:'#F07A7A'},
    {id:'ls',kind:'lo',on:'eqLon',f:'eqLf',g:'eqL',name:'low',tag:'L',col:'#F4A27A'},
    {id:'p1',kind:'pk',on:'eqP1on',f:'eqP1f',g:'eqP1',q:'eqP1q',name:'1',tag:'1',col:'#EED27A'},
    {id:'p2',kind:'pk',on:'eqP2on',f:'eqP2f',g:'eqP2',q:'eqP2q',name:'2',tag:'2',col:'#A9D67A'},
    {id:'p3',kind:'pk',on:'eqMon',f:'eqMf',g:'eqM',q:'eqMq',name:'mid',tag:'3',col:'#72CF9E'},
    {id:'p4',kind:'pk',on:'eqP4on',f:'eqP4f',g:'eqP4',q:'eqP4q',name:'4',tag:'4',col:'#7FB7E8'},
    {id:'hs',kind:'hi',on:'eqHon',f:'eqHf',g:'eqH',name:'high',tag:'H',col:'#B9A6FF'},
    {id:'lp',kind:'lp',on:'eqLPon',f:'eqLPf',s:'eqLPs',q:'eqLPq',name:'high cut',tag:'C',col:'#B4B2AA'}];
  const cut=b=>b.kind==='hp'||b.kind==='lp',gOf=b=>b.g?mv(b.g):0,bOn=b=>mv(b.on)!==0,allOn=()=>mv('eqOn')!==0;
  const setm=(k,v)=>{S.master[k]=v};
  const FMIN=20,FMAX=20000,GMAX=12;
  const clampF=f=>Math.max(FMIN,Math.min(FMAX,f)),clampQ=q=>Math.max(.2,Math.min(10,q));
  /* ---------- sound ---------- */
  let N=null;const typ=(n,t)=>{if(n.type!==t)n.type=t};
  const qdb=q=>20*Math.log10(q);/* Web Audio reads Q of lowpass/highpass in dB */
  function build(){if(N||!ctx||!A.mst||!A.mst.pqIn)return;const M=A.mst,mk=()=>{const f=ctx.createBiquadFilter();f.type='peaking';f.gain.value=0;return f};
    N={hp:[mk(),mk(),mk(),mk()],lp:[mk(),mk(),mk(),mk()],p1:mk(),p2:mk(),p4:mk()};
    const chain=[...N.hp,N.p1,N.p2,N.p4,...N.lp];M.pqIn.disconnect();let prev=M.pqIn;chain.forEach(n=>{prev.connect(n);prev=n});prev.connect(M.pqMid);setAudio()}
  function setAudio(){if(!ctx||!A.mst)return;build();if(!N)return;const M=A.mst,t=ctx.currentTime,on=allOn(),tg=(p,v)=>{p.cancelAndHoldAtTime(t);p.setTargetAtTime(v,t,.025)};
    const cutSet=(arr,b,type)=>{const n=on&&bOn(b)?Math.round(mv(b.s)/12):0,f=mv(b.f),q=mv(b.q);arr.forEach((x,i)=>{if(i<n){typ(x,type);tg(x.frequency,f);tg(x.Q,qdb(i===n-1?q:Math.SQRT1_2))}else{if(x.type!=='peaking'){typ(x,'peaking');x.Q.value=1}x.gain.value=0}})};
    cutSet(N.hp,B[0],'highpass');cutSet(N.lp,B[7],'lowpass');
    [['p1',B[2]],['p2',B[3]],['p4',B[5]]].forEach(([k,b])=>{const x=N[k];typ(x,'peaking');tg(x.frequency,mv(b.f));tg(x.Q,mv(b.q));tg(x.gain,on&&bOn(b)?gOf(b):0)});
    /* the three old filters: frequency, Q, and flat when their band is off or the eq is bypassed */
    tg(M.eqL.frequency,mv('eqLf'));tg(M.eqM.frequency,mv('eqMf'));tg(M.eqM.Q,mv('eqMq'));tg(M.eqH.frequency,mv('eqHf'));
    [[M.eqL,B[1]],[M.eqM,B[4]],[M.eqH,B[6]]].forEach(([x,b])=>tg(x.gain,on&&bOn(b)?gOf(b):0))}
  {const _m=applyMastering;applyMastering=function(){const r=_m.apply(this,arguments);try{setAudio()}catch(e){globalThis.__el&&globalThis.__el(e)}return r}}
  /* ---------- the response, by the Web Audio specification's own biquad formulas ---------- */
  const SR=()=>ctx?ctx.sampleRate:48000;
  function bq(type,f0,G,Q,f){const sr=SR(),w0=2*Math.PI*f0/sr,w=2*Math.PI*f/sr,cs=Math.cos(w0),sn=Math.sin(w0),A=Math.pow(10,G/40);let b0,b1,b2,a0,a1,a2;
    if(type==='pk'){const al=sn/(2*Q);b0=1+al*A;b1=-2*cs;b2=1-al*A;a0=1+al/A;a1=-2*cs;a2=1-al/A}
    else if(type==='lo'||type==='hi'){const al=sn/2*Math.SQRT2,k2=2*Math.sqrt(A)*al;if(type==='lo'){b0=A*((A+1)-(A-1)*cs+k2);b1=2*A*((A-1)-(A+1)*cs);b2=A*((A+1)-(A-1)*cs-k2);a0=(A+1)+(A-1)*cs+k2;a1=-2*((A-1)+(A+1)*cs);a2=(A+1)+(A-1)*cs-k2}
      else{b0=A*((A+1)+(A-1)*cs+k2);b1=-2*A*((A-1)+(A+1)*cs);b2=A*((A+1)+(A-1)*cs-k2);a0=(A+1)-(A-1)*cs+k2;a1=2*((A-1)-(A+1)*cs);a2=(A+1)-(A-1)*cs-k2}}
    else{const al=sn/(2*Q);if(type==='lp'){b0=(1-cs)/2;b1=1-cs;b2=(1-cs)/2}else{b0=(1+cs)/2;b1=-(1+cs);b2=(1+cs)/2}a0=1+al;a1=-2*cs;a2=1-al}
    const nr=b0+b1*Math.cos(w)+b2*Math.cos(2*w),ni=-(b1*Math.sin(w)+b2*Math.sin(2*w)),dr=a0+a1*Math.cos(w)+a2*Math.cos(2*w),di=-(a1*Math.sin(w)+a2*Math.sin(2*w));
    return 10*Math.log10((nr*nr+ni*ni)/(dr*dr+di*di))}
  const bandDb=(b,f,force)=>{if(!force&&!bOn(b))return 0;const F=mv(b.f);if(cut(b)){const n=Math.round(mv(b.s)/12);let s=0;for(let i=0;i<n;i++)s+=bq(b.kind,F,0,i===n-1?mv(b.q):Math.SQRT1_2,f);return s}
    return bq(b.kind,F,gOf(b),b.q?mv(b.q):1,f)};
  const total=f=>allOn()?B.reduce((s,b)=>s+bandDb(b,f),0):0;
  const nodeY=b=>cut(b)?Math.max(-GMAX,Math.min(GMAX,bandDb(b,mv(b.f),true))):gOf(b);
  /* ---------- analyser (what leaves the eq) ---------- */
  let an=null,anBuf=null,playingSpec=false;
  const tapAn=()=>{if(an||!ctx||!A.mst||!A.mst.pqMid)return;an=ctx.createAnalyser();an.fftSize=4096;an.smoothingTimeConstant=.82;an.minDecibels=-96;an.maxDecibels=-12;A.mst.pqMid.connect(an);anBuf=new Float32Array(an.frequencyBinCount)};
  const fmtF=f=>f>=1000?(f/1000).toFixed(f>=10000?1:2).replace(/\.?0+$/,'')+' kHz':Math.round(f)+' Hz';
  const fmtG=g=>(g>0?'+':'')+g.toFixed(1)+' dB';
  const knobsIn=el=>{try{(typeof masterKnobs!=='undefined'?masterKnobs:[]).forEach(k=>{if(el.contains(k)&&k.refresh)k.refresh()})}catch(e){globalThis.__el&&globalThis.__el(e)}};
  let sel=B[4];
  /* ---------- a view: one graph (+ band icons, + read-out or table); the tile has one, full screen has a bigger one ---------- */
  function View(host,big){const V={host,big,hover:null,drag:null,sm:null};
    const icons=document.createElement('div');icons.className='pq-ic';host.appendChild(icons);
    B.forEach(b=>{const bt=document.createElement('button');bt.className='pq-i';bt.dataset.b=b.id;bt.style.setProperty('--bc',b.col);bt.title=b.name+' · av/på';
      bt.innerHTML=`<svg viewBox="0 0 24 12" aria-hidden="true"><path d="${{hp:'M2 11 C6 11 7 3 11 2 L22 2',lp:'M2 2 L13 2 C17 3 18 11 22 11',lo:'M2 9 L7 9 C10 9 11 4 14 4 L22 4',hi:'M2 8 L10 8 C13 8 14 3 17 3 L22 3',pk:'M2 7 L7 7 C9 7 10 2 12 2 C14 2 15 7 17 7 L22 7'}[b.kind]}"/></svg><em>${b.name}</em>`;
      bt.onclick=()=>{setm(b.on,bOn(b)?0:1);sel=b;applyMastering();save();paintAll()};icons.appendChild(bt)});
    const cv=document.createElement('canvas');cv.className='pq-cv';host.appendChild(cv);V.cv=cv;
    const info=document.createElement('div');info.className=big?'pq-tb':'pq-rd';host.appendChild(info);V.info=info;
    if(big){/* one module per band with studio knobs: frequency, gain (or slope for the cuts), Q. Click the name = band on/off */
      info.className='pq-tb dm-mods';V.kn=[];const lg=(lo,hi)=>({toN:v=>Math.log(v/lo)/Math.log(hi/lo),fromN:u=>lo*Math.pow(hi/lo,u)});
      B.forEach(b=>{const m=document.createElement('div');m.className='dm-mod pq-col';m.dataset.b=b.id;m.style.setProperty('--cc',b.col);
        m.innerHTML=`<button class="dm-t" title="Band av/på"><i class="dm-led"></i>${b.name}</button><div class="dm-ks"></div>`;info.appendChild(m);
        m.querySelector('.dm-t').onclick=()=>{setm(b.on,bOn(b)?0:1);sel=b;applyMastering();save();paintAll()};
        const ks=m.querySelector('.dm-ks');
        const K=(o,key,rnd,act)=>{V.kn.push(__dknob(ks,Object.assign({cls:'sm',def:MST_DEF[key],get:()=>mv(key),set:v=>{v=rnd(v);sel=b;if(v===mv(key))return;setm(key,v);if(act&&!bOn(b))setm(b.on,1);applyMastering();paintAll()},end:()=>save()},o)))};
        K(Object.assign({label:'freq',fmt:fmtF},lg(FMIN,FMAX)),b.f,v=>Math.round(clampF(v)),0);
        if(b.s)K({label:'slope',min:12,max:48,light:1,fmt:v=>v+' dB'},b.s,v=>Math.max(12,Math.min(48,Math.round(v/12)*12)),1);
        else if(b.g)K({label:'gain',min:-GMAX,max:GMAX,bi:1,def:0,fmt:fmtG},b.g,v=>+Math.max(-GMAX,Math.min(GMAX,v)).toFixed(1),1);
        if(b.q)K(Object.assign({label:'q',light:1,fmt:v=>v.toFixed(2)},lg(.2,10)),b.q,v=>+clampQ(v).toFixed(2),1)})}
    let W=1,H=1;const PADL=big?34:26,PADB=big?18:14,DBR=big?18:15;
    const fx=f=>PADL+(W-PADL-6)*Math.log(f/FMIN)/Math.log(FMAX/FMIN),xf=x=>FMIN*Math.pow(FMAX/FMIN,(x-PADL)/(W-PADL-6));
    const dy=db=>4+(H-PADB-8)*(1-(db+DBR)/(2*DBR));
    V.paint=()=>{if(!cv.offsetParent)return;const r=cv.getBoundingClientRect(),d=devicePixelRatio||1;W=Math.max(1,r.width);H=Math.max(1,r.height);if(cv.width!==Math.round(W*d)||cv.height!==Math.round(H*d)){cv.width=Math.round(W*d);cv.height=Math.round(H*d)}
      const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,W,H);
      /* the yellow dots look makes the card black-and-white with a strong contrast filter: no half-tones there, so solid lines,
         dotted grids and a dot pattern for the spectrum, like the other master graphs in that look */
      const D=document.body.classList.contains('look-dots')&&!!host.closest('#panes,#fullHost,.dw-slot,.dw-cl,.pq-ov'),al=a=>D?1:a;
      const ink=D?'#ECEAE3':getComputedStyle(host).color,acc=D?'#ECEAE3':(getComputedStyle(host).getPropertyValue('--pq-acc').trim()||'#F2C318'),mono=getComputedStyle(document.body).getPropertyValue('--f-mono')||'monospace';
      const colOf=b=>D?'#ECEAE3':b.col,act=allOn();
      c.font=(big?'9px ':'8px ')+mono;c.textBaseline='middle';
      if(D)c.setLineDash([1,4]);
      for(let db=-DBR+(DBR%6);db<=DBR;db+=6){const y=Math.round(dy(db))+.5;c.globalAlpha=al(db===0?.32:.12);c.strokeStyle=ink;c.beginPath();c.moveTo(PADL,y);c.lineTo(W-6,y);c.stroke();c.globalAlpha=al(.45);c.fillStyle=ink;c.textAlign='right';c.fillText((db>0?'+':'')+db,PADL-5,y)}
      const FL=big?[[20,'20'],[30,'30'],[40,''],[50,'50'],[60,''],[80,''],[100,'100'],[200,'200'],[300,'300'],[400,''],[500,'500'],[800,''],[1000,'1k'],[2000,'2k'],[3000,'3k'],[5000,'5k'],[8000,''],[10000,'10k'],[20000,'20k']]:[[30,''],[50,'50'],[100,'100'],[200,'200'],[500,'500'],[1000,'1k'],[2000,'2k'],[5000,'5k'],[10000,'10k'],[20000,'']];
      FL.forEach(([f,l])=>{const x=Math.round(fx(f))+.5;c.globalAlpha=al(l?.12:.06);c.strokeStyle=ink;c.beginPath();c.moveTo(x,4);c.lineTo(x,H-PADB);c.stroke();if(l){c.globalAlpha=al(.45);c.fillStyle=ink;c.textAlign='center';c.fillText(l,Math.min(W-12,Math.max(PADL+8,x)),H-PADB/2+1)}});c.setLineDash([]);
      /* live spectrum */
      if(an&&playingSpec){const spec=anBuf,n=spec.length,bw=SR()/2/n,NP=Math.ceil((W-6-PADL)/2)+1;if(!V.sm||V.sm.length!==NP)V.sm=new Float32Array(NP).fill(an.minDecibels);const sm=V.sm;
        c.globalAlpha=.16;c.fillStyle=ink;c.beginPath();c.moveTo(PADL,H-PADB);
        for(let j=0;j<NP;j++){const x=PADL+j*2,i0=xf(x-1)/bw,i1=xf(x+1)/bw;let db;
          /* low end: fewer bins than pixels, so read between two bins; high end: many bins per pixel, so average their power */
          if(i1-i0<1){const fi=Math.min(n-2,Math.max(1,(i0+i1)/2)),k=Math.floor(fi),u=fi-k;db=spec[k]*(1-u)+spec[k+1]*u}
          else{let pw=0,cnt=0;for(let k=Math.max(1,Math.floor(i0));k<=Math.min(n-1,Math.ceil(i1));k++){pw+=Math.pow(10,spec[k]/10);cnt++}db=10*Math.log10(pw/Math.max(1,cnt)+1e-12)}
          sm[j]+=(Math.max(an.minDecibels,db)-sm[j])*(db>sm[j]?.5:.12);
          const v=Math.max(0,Math.min(1,(sm[j]-an.minDecibels)/(an.maxDecibels-an.minDecibels)));c.lineTo(x,(H-PADB)-(H-PADB-6)*v)}
        c.lineTo(PADL+(NP-1)*2,H-PADB);c.closePath();
        if(D){c.save();c.clip();c.globalAlpha=1;for(let x=PADL+3;x<W-6;x+=5)for(let y=H-PADB-3;y>4;y-=5)c.fillRect(x-.8,y-.8,1.6,1.6);c.restore()}else c.fill()}
      c.save();c.beginPath();c.rect(PADL,2,W-PADL-6,H-PADB-2);c.clip();
      /* each band on its own, in its colour (filled lightly), then the sum */
      B.forEach(b=>{if(!bOn(b)||(!cut(b)&&Math.abs(gOf(b))<.05))return;const hot=V.hover===b||(V.drag&&V.drag.b===b)||sel===b;
        if(!D){c.beginPath();for(let x=PADL;x<=W-6;x+=2){const y=dy(bandDb(b,xf(x)));x===PADL?c.moveTo(x,y):c.lineTo(x,y)}c.globalAlpha=act?(hot?.22:.11):.05;c.fillStyle=b.col;c.lineTo(W-6,dy(0));c.lineTo(PADL,dy(0));c.closePath();c.fill()}
        else{c.setLineDash([2,3]);c.globalAlpha=1;c.strokeStyle=ink;c.lineWidth=1;c.beginPath();for(let x=PADL;x<=W-6;x+=2){const y=dy(bandDb(b,xf(x)));x===PADL?c.moveTo(x,y):c.lineTo(x,y)}c.stroke();c.setLineDash([])}});
      const pts=[];for(let x=PADL;x<=W-6;x+=1.5)pts.push([x,dy(total(xf(x)))]);
      if(D&&!act)c.setLineDash([3,3]);c.globalAlpha=act?1:al(.35);c.strokeStyle=acc;c.lineWidth=big?2.2:2;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke();c.setLineDash([]);c.restore();
      /* the points */
      B.forEach(b=>{const x=fx(mv(b.f)),y=dy(nodeY(b)),hot=V.hover===b||(V.drag&&V.drag.b===b),s=sel===b,o=bOn(b)&&act,R=big?7.5:6;
        c.globalAlpha=o?1:al(.4);c.fillStyle=hot||s?colOf(b):'#121215';c.strokeStyle=colOf(b);c.lineWidth=1.5;c.beginPath();c.arc(x,y,hot?R+1:R,0,6.283);c.fill();c.stroke();
        c.fillStyle=hot||s?'#121215':colOf(b);c.textAlign='center';c.font='600 '+(big?'8px ':'7px ')+mono;c.fillText(b.tag,x,y+.5)});
      c.globalAlpha=1;
      /* icons, read-out / table */
      icons.querySelectorAll('.pq-i').forEach(bt=>{const b=B.find(x=>x.id===bt.dataset.b);bt.classList.toggle('on',bOn(b));bt.classList.toggle('sel',sel===b)});
      if(big){info.querySelectorAll('.pq-col[data-b]').forEach(col=>{const b=B.find(x=>x.id===col.dataset.b);col.classList.toggle('off',!bOn(b));col.classList.toggle('sel',sel===b)});if(!info.querySelector('.dk.active'))V.kn.forEach(k=>k.refresh())}
      else{const b=V.hover||(V.drag&&V.drag.b)||sel,t=`<span class="on" style="--bc:${b.col}"><b>${b.name}</b> ${fmtF(mv(b.f))}${b.g?' · '+fmtG(gOf(b)):''}${b.s?' · '+mv(b.s)+' dB/oct':''}${b.q?' · Q '+mv(b.q).toFixed(2):''}${bOn(b)?'':' · av'}</span><span class="pq-hint">dra punkterna · hjul = Q · dubbelklick = noll</span>`;if(info._t!==t){info._t=t;info.innerHTML=t}}};
    /* dragging */
    const pick=(x,y)=>{let best=null,bd=14;B.forEach(b=>{const d=Math.hypot(fx(mv(b.f))-x,dy(nodeY(b))-y);if(d<bd){bd=d;best=b}});return best};
    const pos=e=>{const r=cv.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top]};
    let lastDown=0,lastB=null;
    cv.addEventListener('pointerdown',e=>{const [x,y]=pos(e);const b=pick(x,y);if(!b)return;e.preventDefault();e.stopPropagation();const n=performance.now();sel=b;
      if(n-lastDown<300&&b===lastB){reset(b);lastDown=0;return}lastDown=n;lastB=b;
      if(!bOn(b))setm(b.on,1);
      V.drag={b,x0:x,y0:y,f0:mv(b.f),g0:gOf(b),q0:b.q?mv(b.q):0,alt:e.altKey};try{cv.setPointerCapture(e.pointerId)}catch(_){globalThis.__el&&globalThis.__el(_)}cv.classList.add('drag');applyMastering();paintAll()});
    cv.addEventListener('pointermove',e=>{const [x,y]=pos(e);if(!V.drag){const h=pick(x,y);if(h!==V.hover){V.hover=h;cv.style.cursor=h?'grab':'';V.paint()}return}
      const b=V.drag.b,fine=e.shiftKey?.25:1,dyp=(V.drag.y0-y)*fine;
      if((V.drag.alt||cut(b))&&b.q){setm(b.q,+clampQ(V.drag.q0*Math.pow(2,dyp/(cut(b)?90:60))).toFixed(2))}
      if(!V.drag.alt||!b.q){const lf=Math.log(V.drag.f0)+(x-V.drag.x0)*fine*Math.log(FMAX/FMIN)/(W-PADL-6);setm(b.f,Math.round(clampF(Math.exp(lf))));
        if(b.g)setm(b.g,+Math.max(-GMAX,Math.min(GMAX,V.drag.g0+dyp*(2*DBR)/(H-PADB-8))).toFixed(1))}
      applyMastering();paintAll()});
    const end=()=>{if(V.drag){V.drag=null;cv.classList.remove('drag');save();paintAll()}};
    cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);cv.addEventListener('pointerleave',()=>{if(!V.drag&&V.hover){V.hover=null;V.paint()}});
    cv.addEventListener('wheel',e=>{const [x,y]=pos(e);const b=pick(x,y)||(V.hover&&V.hover.q?V.hover:null);if(!b||!b.q)return;e.preventDefault();sel=b;setm(b.q,+clampQ(mv(b.q)*Math.pow(2,-e.deltaY/400)).toFixed(2));applyMastering();paintAll();clearTimeout(cv._wt);cv._wt=setTimeout(save,400)},{passive:false});
    return V}
  function reset(b,k){if(!k||k==='f')setm(b.f,DEF[b.f]);if(b.g&&(!k||k==='g'))setm(b.g,0);if(b.s&&(!k||k==='g'))setm(b.s,24);if(b.q&&(!k||k==='q'))setm(b.q,DEF[b.q]);applyMastering();save();paintAll()}
  /* ---------- the tile ---------- */
  tile.classList.add('pq');const head=tile.querySelector('.m2-th2'),sub=head&&head.querySelector('small');
  const byp=document.createElement('button');byp.className='pq-byp';byp.title='Bypass: jämför med och utan eq';byp.textContent='bypass';
  const fsb=document.createElement('button');fsb.className='pq-fs';fsb.title='Öppna eq i helskärm';fsb.textContent='⤢';
  if(head){head.appendChild(byp);head.appendChild(fsb)}
  byp.onclick=()=>{setm('eqOn',allOn()?0:1);applyMastering();save();paintAll()};
  const old=tile.querySelector('.m2-vis');const box=document.createElement('div');box.className='pq-box';(old||tile.querySelector('.m2-tk')).before(box);
  const TV=View(box,false);
  /* ---------- full screen: a window of its own over everything, with tabs (the multiband compressor adds its own) ---------- */
  const ov=document.createElement('div');ov.className='pq-ov';ov.hidden=true;
  ov.innerHTML='<div class="pq-win" role="dialog" aria-label="Mastering"><div class="pq-wh"><div class="pq-tabs"><button data-t="eq" class="on">eq</button></div><span class="pq-wsp"></span><button class="pq-wbyp">bypass</button><button class="pq-x" title="Stäng (Esc)">✕</button></div><div class="pq-pane" data-t="eq"></div></div>';
  document.body.appendChild(ov);
  const FV=View(ov.querySelector('.pq-pane[data-t="eq"]'),true);
  const wbyp=ov.querySelector('.pq-wbyp');wbyp.onclick=()=>{const t=ov.dataset.t||'eq';if(t==='eq')byp.onclick();else if(window.__mbBypass)window.__mbBypass()};
  const tabPaint={};
  const setTab=t=>{ov.dataset.t=t;ov.querySelectorAll('.pq-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));ov.querySelectorAll('.pq-pane').forEach(p=>p.hidden=p.dataset.t!==t);paintAll();if(tabPaint[t])tabPaint[t]()};
  ov.querySelector('.pq-tabs').addEventListener('click',e=>{const b=e.target.closest('button[data-t]');if(b)setTab(b.dataset.t)});
  const look=()=>{ov.classList.toggle('dots',document.body.classList.contains('look-dots'));ov.classList.toggle('studio',document.body.classList.contains('look-studio')||(document.body.classList.contains('daw-on')&&!document.body.classList.contains('look-dots')))};
  const open=t=>{look();ov.hidden=false;setTab(t||'eq');requestAnimationFrame(paintAll)};
  const close=()=>{ov.hidden=true};
  fsb.onclick=()=>open('eq');ov.querySelector('.pq-x').onclick=close;ov.addEventListener('pointerdown',e=>{if(e.target===ov)close()});
  addEventListener('keydown',e=>{if(e.key==='Escape'&&!ov.hidden){e.stopPropagation();e.preventDefault();close()}},true);
  window.__pqOv={ov,open,close,setTab,addTab:(t,label,paint)=>{const b=document.createElement('button');b.dataset.t=t;b.textContent=label;ov.querySelector('.pq-tabs').appendChild(b);const p=document.createElement('div');p.className='pq-pane';p.dataset.t=t;p.hidden=true;ov.querySelector('.pq-win').appendChild(p);if(paint)tabPaint[t]=paint;return p}};
  function paintAll(){TV.paint();if(!ov.hidden)FV.paint();knobsIn(tile);
    if(sub){const s=B.filter(b=>bOn(b)&&(cut(b)||Math.abs(gOf(b))>=.05)).length;const t=allOn()?(s?s+' band':'platt'):'bypass';if(sub.textContent!==t)sub.textContent=t}
    byp.classList.toggle('on',!allOn());tile.classList.toggle('pq-off',!allOn());if((ov.dataset.t||'eq')==='eq')wbyp.classList.toggle('on',!allOn())}
  window.__pqPaint=paintAll;
  /* redraw every frame while it is in view and sound plays (for the spectrum), otherwise when something changes */
  let lastKey='';
  (function loop(){requestAnimationFrame(loop);build();const vis=!!tile.offsetParent||!ov.hidden;if(!vis)return;tapAn();
    if(an&&typeof playing!=='undefined'&&playing){an.getFloatFrequencyData(anBuf);playingSpec=true;TV.paint();if(!ov.hidden&&(ov.dataset.t||'eq')==='eq')FV.paint();knobsIn(tile);return}
    const k=Object.keys(DEF).map(k=>mv(k)).join(',')+[mv('eqL'),mv('eqM'),mv('eqH')]+'|'+ov.hidden+(ov.dataset.t||'')+document.body.className+tile.clientWidth+'x'+innerWidth;if(k!==lastKey||playingSpec){lastKey=k;playingSpec=false;paintAll()}})();
  try{applyMastering()}catch(e){globalThis.__el&&globalThis.__el(e)}
  const st=document.createElement('style');st.textContent=`
.card.master.mx2 .m2-chain{grid-template-columns:repeat(4,minmax(0,1fr))}
.card.master.mx2 .m2-tile.eq{grid-column:1/-1;--pq-acc:#F2C318}
.card.master.mx2 .m2-tile.eq .m2-vis{display:none}
.card.master.mx2 .m2-tile.eq+.m2-tile::before{display:none}
.card.master.mx2 .m2-tile.eq .m2-th2{display:flex;align-items:baseline;gap:8px}
.card.master.mx2 .m2-tile.eq .m2-th2 small{flex:1;min-width:0}
.pq-byp,.pq-fs,.pq-wbyp,.pq-x{font:500 8.5px var(--f-mono)!important;letter-spacing:.06em;padding:3px 8px!important;height:auto!important;border-radius:var(--dk-r2,4px);background:transparent;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18);color:inherit;opacity:.75;cursor:pointer;flex:none;border:0}
.pq-fs{font-size:11px!important;padding:1px 7px!important}
.pq-byp:hover,.pq-fs:hover,.pq-wbyp:hover,.pq-x:hover{opacity:1}.pq-byp.on,.pq-wbyp.on{background:#F2C318;color:#111211;box-shadow:none;opacity:1}
.pq-box{display:flex;flex-direction:column;gap:5px;min-width:0}
.pq-ic{display:flex;gap:3px;flex-wrap:nowrap;overflow:hidden}
.pq-i{flex:1 1 0;min-width:0;display:flex;align-items:center;justify-content:center;gap:4px;height:20px;padding:0 3px!important;border:0;border-radius:var(--dk-r2,4px);background:transparent;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);color:inherit;cursor:pointer;opacity:.45}
.pq-i svg{width:20px;height:10px;flex:none;fill:none;stroke:var(--bc);stroke-width:1.6}
.pq-i em{font:normal 8px var(--f-mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pq-i.on{opacity:1}.pq-i.sel{box-shadow:inset 0 0 0 1px var(--bc)}
.pq-cv{display:block;width:100%;height:150px;border-radius:10px;background:#0B0C0D;touch-action:none;user-select:none}
.pq-cv.drag{cursor:grabbing!important}
.pq-rd{display:flex;flex-wrap:wrap;gap:4px 14px;font:400 9px var(--f-mono);padding:2px 2px 0;align-items:baseline}
.pq-rd span.on{color:var(--bc)}.pq-rd b{font-weight:600;margin-right:2px}.pq-rd .pq-hint{opacity:.4;margin-left:auto}
.m2-tile.eq.pq-off .m2-tk{opacity:.45}
@container (max-width:640px){.card.master.mx2 .m2-chain{grid-template-columns:1fr 1fr}.pq-cv{height:130px}.pq-i em{display:none}.pq-rd .pq-hint{display:none}}
body.look-dots .pq-rd span.on{color:inherit;text-decoration:underline;text-underline-offset:2px}
body.look-dots .pq-byp.on{background:#ECEAE3;color:#111211}
body.look-dots .pq-i svg{stroke:currentColor}
body.look-studio :is(#panes,#fullHost,.daw .dw-slot,.daw .dw-cl) .card.master.mx2 .m2-tile.eq,.daw :is(.dw-slot,.dw-cl) .card.master.mx2 .m2-tile.eq{--pq-acc:var(--dk-acc,#E9C54A)}
body.look-studio :is(#panes,#fullHost,.daw .dw-slot,.daw .dw-cl) .pq-cv,body:not(.look-dots) .daw :is(.dw-slot,.dw-cl) .pq-cv{border-radius:var(--dk-r2,2px);background:var(--dk-p0,#0B0C0D);box-shadow:inset 0 0 0 1px var(--dk-line,rgba(255,255,255,.08))}
/* the full-screen window */
.pq-ov{position:fixed;inset:0;z-index:9500;background:rgba(6,6,8,.55);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:4vh 3vw}
.pq-ov[hidden]{display:none}
.pq-win{--pq-acc:#F2C318;width:min(1400px,100%);max-height:100%;overflow:auto;display:flex;flex-direction:column;gap:10px;padding:14px 16px 16px;border-radius:16px;background:rgba(20,20,24,.94);box-shadow:0 30px 80px rgba(0,0,0,.5),inset 0 0 0 1px rgba(255,255,255,.1);color:#ECEAE3;font-family:var(--f-mono)}
.pq-ov.studio .pq-win{--pq-acc:#E9C54A;border-radius:3px;background:#1C1E20;box-shadow:0 30px 80px rgba(0,0,0,.5),inset 0 0 0 1px #373738}
.pq-ov.dots{filter:grayscale(1) invert(1) contrast(8)}.pq-ov.dots .pq-win{background:#121215;border-radius:0}
.pq-wh{display:flex;align-items:center;gap:8px}.pq-wsp{flex:1}
.pq-tabs{display:flex;gap:4px}.pq-tabs button{font:500 10px var(--f-mono);letter-spacing:.06em;padding:5px 12px;border:0;border-radius:var(--dk-r2,4px);background:transparent;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);color:inherit;opacity:.6;cursor:pointer}
.pq-tabs button.on{opacity:1;background:#ECEAE3;color:#111211;box-shadow:none}
.pq-pane{display:flex;flex-direction:column;gap:8px;min-width:0}.pq-pane[hidden]{display:none}
.pq-win .pq-cv{height:min(52vh,460px);border-radius:8px}
.pq-ov.studio .pq-win .pq-cv{border-radius:2px;background:#141516;box-shadow:inset 0 0 0 1px #373738}
.pq-win .pq-i{height:26px}.pq-win .pq-i svg{width:26px;height:13px}.pq-win .pq-i em{font-size:9px}
.pq-tb{display:grid;grid-template-columns:repeat(8,minmax(0,1fr)) 80px;gap:4px}
.pq-col{display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 0;border-radius:var(--dk-r2,4px)}
.pq-col span{font:500 12px var(--f-mono);color:var(--bc);cursor:ns-resize;padding:3px 6px;border-radius:3px;user-select:none;touch-action:none;white-space:nowrap}
.pq-col span:hover{background:rgba(255,255,255,.06)}.pq-col span.na{visibility:hidden}
.pq-col.off span{opacity:.35}.pq-col.sel{box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}
.pq-lab span{color:rgba(236,234,227,.45);font-size:9px;cursor:default;align-self:flex-start}
.pq-ov.dots .pq-col span{color:#ECEAE3}
:is(.pq-ov.dots,body.look-dots #panes,body.look-dots .daw) .pq-i:not(.on){opacity:1}:is(.pq-ov.dots,body.look-dots #panes,body.look-dots .daw) .pq-i:not(.on) em{text-decoration:line-through}
.pq-ov.dots .pq-lab span{color:#ECEAE3}`;document.head.appendChild(st);
  window.__pq={B,bandDb,total,bq,paintAll,setAudio,N:()=>N}})();

