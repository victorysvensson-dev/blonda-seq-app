/* ---------- the models (mono or stereo Float32, peak-normalised) ---------- */
function insModal(sr,len,parts,click){/* parts: [{f,a,t60,pan}] */const n=Math.floor(sr*len),L=new Float32Array(n),R=new Float32Array(n);
  parts.forEach(p=>{if(p.f>=sr*.45||p.a<=0)return;const w=2*Math.PI*p.f/sr,d=Math.exp(Math.log(.001)/(Math.max(.01,p.t60)*sr)),gl=p.a*(1-(p.pan||0))*.5+p.a*.5*(p.pan?0:0),pl=1-Math.max(0,p.pan||0),pr=1+Math.min(0,p.pan||0);
    let c1=Math.cos(w),s0=0,s1=Math.sin(w),a=p.a,ph=p.ph||0;let y1=Math.sin(ph-w),y2=Math.sin(ph-2*w);const k=2*c1;
    const att=Math.max(1,Math.floor(sr*(p.att||.0015)));
    for(let i=0;i<n;i++){const y=k*y1-y2;y2=y1;y1=y;const e=a*(i<att?i/att:1);L[i]+=y*e*pl;R[i]+=y*e*pr;a*=d;if(a<1e-5&&i>att)break}});
  if(click)click(L,R,n);return [L,R]}
function insNorm(ch,peak){let m=0;ch.forEach(c=>{for(let i=0;i<c.length;i++){const a=Math.abs(c[i]);if(a>m)m=a}});if(m>0){const g=peak/m;ch.forEach(c=>{for(let i=0;i<c.length;i++)c[i]*=g})}
  /* a short fade at the very end so a buffer never stops with a click */
  ch.forEach(c=>{const f=Math.min(c.length,512);for(let i=0;i<f;i++)c[c.length-1-i]*=i/f});return ch}
function insBiquad(x,sr,type,f,q,gdb){const w=2*Math.PI*f/sr,cs=Math.cos(w),sn=Math.sin(w),al=sn/(2*q),A=Math.pow(10,(gdb||0)/40);let b0,b1,b2,a0,a1,a2;
  if(type==='peak'){b0=1+al*A;b1=-2*cs;b2=1-al*A;a0=1+al/A;a1=-2*cs;a2=1-al/A}else if(type==='lp'){b0=(1-cs)/2;b1=1-cs;b2=(1-cs)/2;a0=1+al;a1=-2*cs;a2=1-al}else{b0=(1+cs)/2;b1=-(1+cs);b2=(1+cs)/2;a0=1+al;a1=-2*cs;a2=1-al}
  b0/=a0;b1/=a0;b2/=a0;a1/=a0;a2/=a0;let x1=0,x2=0,y1=0,y2=0;for(let i=0;i<x.length;i++){const xi=x[i],y=b0*xi+b1*x1+b2*x2-a1*y1-a2*y2;x2=x1;x1=xi;y2=y1;y1=y;x[i]=y}return x}
const insF=n=>440*Math.pow(2,(n-69)/12);
function insRender(name,n,sr,seed){const f=insF(n),T=insTw(name,seed),low=Math.pow(261.6/f,.5);
  if(name==='rhodes'){const T60=Math.min(6,Math.max(.9,3.4*low))*T.dec,len=Math.min(5,T60*.9+.3);
    const ch=insModal(sr,len,[{f,a:1,t60:T60},{f:f*2,a:T.bar,t60:T60*.45},{f:f*3,a:T.bar*.35,t60:T60*.25},{f:f*4.03,a:.06*T.bright,t60:T60*.18},
      {f:Math.min(f*7.1,sr*.4),a:T.tine*T.bright,t60:.06+.05*low,att:.0008},{f:Math.min(f*11.3,sr*.4),a:T.tine*.35*T.bright,t60:.03,att:.0006}]);
    /* bark: a soft saturation that adds the growl of a hard hit */const d=T.bark;ch.forEach(c=>{const nd=Math.tanh(d);for(let i=0;i<c.length;i++)c[i]=Math.tanh(c[i]*d)/nd});
    /* stereo: a touch of width from a tiny delay on one side */const R=ch[1],dl=Math.floor(sr*.0006);for(let i=R.length-1;i>=dl;i--)R[i]=R[i-dl];
    return insNorm(ch,.9)}
  if(name==='flygel'){const T1=Math.min(1.6,.45*Math.pow(261.6/f,.6))*T.dec,T2=Math.min(9,3.2*low)*T.dec,len=Math.min(5.5,T2*.6+.4),B=.00012*Math.pow(f/65,1.5)*T.stretch,fc=1400*T.hard*(1+f/1200),parts=[];
    for(let k=1;k<=26;k++){const fk=k*f*Math.sqrt(1+B*k*k);if(fk>Math.min(13000,sr*.42))break;const am=Math.pow(1/k,.85)/(1+Math.pow(k*f/fc,2));
      const dk=1+k*.09;[-1,0,1].forEach(s=>{const cents=s*T.det*(1+k*.02);parts.push({f:fk*Math.pow(2,cents/1200),a:am*(s?.36:.42)*.55,t60:T1/dk,pan:s*.35,ph:k*1.3+s});parts.push({f:fk*Math.pow(2,cents/1200),a:am*(s?.36:.42)*.45,t60:T2/dk,pan:s*.35,ph:k*1.3+s})})}
    const ch=insModal(sr,len,parts,(L,R,N)=>{const m=Math.floor(sr*.05);let lp=0;for(let i=0;i<m;i++){lp+=((Math.random()*2-1)-lp)*.08;const e=Math.exp(-i/(sr*.008))*.05*T.hard;L[i]+=lp*e;R[i]+=lp*e}});
    if(T.body)ch.forEach(c=>insBiquad(c,sr,'peak',180,.9,2*T.body));return insNorm(ch,.9)}
  if(name==='gitarr'||name==='fingerbas'){const sub=name==='fingerbas',len=sub?2.6:Math.min(4,2.2*low+.6)*T.dec,N=Math.floor(sr*len),out=new Float32Array(N);
    const P=sr/f,D=Math.floor(P-.5),frac=P-.5-D,ap=(1-frac)/(1+frac),buf=new Float32Array(D+2);
    /* the pluck: noise, brightness, then a comb for where the string is plucked */
    let lp=0;const br=sub?T.bright*.5:T.bright;for(let i=0;i<buf.length;i++){lp+=((Math.random()*2-1)-lp)*(.15+br*.8);buf[i]=lp}
    const pp=Math.max(1,Math.floor(buf.length*(sub?.18:T.pos)));const tmp=buf.slice();for(let i=0;i<buf.length;i++)buf[i]=tmp[i]-tmp[(i+pp)%buf.length]*.9;
    const t60=(sub?2.4:Math.min(5,2.6*low))*T.dec,rho=Math.exp(Math.log(.001)/(t60*f)),s=sub?.5:.5-(.5-T.damp)*.6;let idx=0,prev=0,apx=0,apy=0;
    for(let i=0;i<N;i++){const cur=buf[idx],nx=buf[(idx+1)%buf.length],avg=rho*((1-s)*cur+s*nx);const y=ap*avg+apx-ap*apy;apx=avg;apy=y;buf[idx]=y;out[i]=cur;idx=(idx+1)%buf.length}
    if(sub){/* a sine under the string so the root carries on small speakers, the thump of the finger, a little growl */let ph=0;const w=2*Math.PI*f/sr;for(let i=0;i<N;i++){const e=Math.exp(-i/(sr*t60*.35));out[i]=out[i]*.7+Math.sin(ph)*.55*e;ph+=w}
      for(let i=0;i<Math.min(N,sr*.03);i++)out[i]+=Math.sin(2*Math.PI*60*i/sr)*Math.exp(-i/(sr*.008))*.4*T.thump;const g=1+T.growl*2.5,nd=Math.tanh(g);for(let i=0;i<N;i++)out[i]=Math.tanh(out[i]*g)/nd;insBiquad(out,sr,'lp',900+T.bright*1400,.7);return insNorm([out],.92)}
    insBiquad(out,sr,'peak',105,1.1,4*T.body);insBiquad(out,sr,'peak',230,1.2,3*T.body);insBiquad(out,sr,'peak',2600,.8,1.5);insBiquad(out,sr,'hp',70,.7);
    const R=new Float32Array(N),dl=Math.floor(sr*.0011);for(let i=dl;i<N;i++)R[i]=out[i-dl]*.92;return insNorm([out,R],.9)}
  if(name==='marimba'){const T60=Math.min(2.2,.9*Math.pow(261.6/f,.45))*T.dec;
    return insNorm(insModal(sr,Math.min(2.6,T60+.3),[{f,a:1,t60:T60},{f:f*3.93,a:.32*T.hard,t60:T60*.28},{f:f*9.24,a:.12*T.hard,t60:T60*.09},{f:f*2.01,a:.04*T.wood,t60:T60*.4}],
      (L,R,N)=>{for(let i=0;i<Math.min(N,sr*.006);i++){const e=(Math.random()*2-1)*Math.exp(-i/(sr*.0012))*.25*T.hard;L[i]+=e;R[i]+=e}}),.9)}
  if(name==='vibrafon'){const T60=Math.min(7,4.2*low)*T.dec;return insNorm(insModal(sr,Math.min(5,T60*.7+.3),[{f,a:1,t60:T60,pan:-.1},{f:f*1.002,a:.4,t60:T60,pan:.2},{f:f*3.98,a:.18*T.hard,t60:T60*.3},{f:f*9.9,a:.05*T.hard,t60:T60*.1},{f:f*2,a:.06*T.shim,t60:T60*.6,pan:.3}]),.88)}
  if(name==='kalimba'){const T60=Math.min(3.2,1.8*low)*T.dec;return insNorm(insModal(sr,Math.min(3.4,T60+.3),[{f,a:1,t60:T60},{f:f*5.4,a:.18*T.hard,t60:T60*.15},{f:f*8.9,a:.08*T.hard,t60:.06},{f:f*1.007,a:.25*T.buzz,t60:T60*.5,pan:.4}],
      (L,R,N)=>{for(let i=0;i<Math.min(N,sr*.004);i++){const e=(Math.random()*2-1)*Math.exp(-i/(sr*.0008))*.18*T.hard;L[i]+=e;R[i]+=e}}),.9)}
  if(name==='dx-piano'||name==='dx-klocka'||name==='dx-mallet'||name==='dx-bas'){
    /* two FM operator pairs, computed sample by sample: the index (brightness) falls away like on the DX7 */
    const sr2=sr,pairs=[];
    if(name==='dx-piano'){const T60=Math.min(5.5,3*low)*T.dec;pairs.push({cr:1,mr:1,i0:T.idx*1.6,i1:.25,it:.35*low,a:1,t60:T60,dt:-T.det},{cr:1,mr:T.tr,i0:2.2,i1:0,it:.035,a:T.tine,t60:Math.min(1.2,.9*low),dt:T.det})}
    else if(name==='dx-klocka'){const T60=Math.min(7,4.5*low)*T.dec;pairs.push({cr:1,mr:T.ratio,i0:T.idx,i1:.4,it:1.2,a:1,t60:T60,dt:-2},{cr:2,mr:T.ratio*1.003,i0:T.idx*.6,i1:.2,it:.8,a:T.shim,t60:T60*.6,dt:3})}
    else if(name==='dx-mallet'){const T60=Math.min(2,1.1*Math.pow(261.6/f,.45))*T.dec;pairs.push({cr:1,mr:T.ratio,i0:T.idx,i1:0,it:.05,a:1,t60:T60,dt:0},{cr:1,mr:1,i0:.6,i1:0,it:.2,a:.5,t60:T60*.8,dt:2})}
    else{pairs.push({cr:1,mr:1,i0:T.idx*2,i1:.3,it:.09*T.punch+.04,a:1,t60:1.8*T.dec,dt:0},{cr:.5,mr:1,i0:0,i1:0,it:1,a:T.sub,t60:2.2*T.dec,dt:0})}
    const len=Math.min(5.5,Math.max(...pairs.map(q=>q.t60))*.85+.25),N=Math.floor(sr2*len),Lc=new Float32Array(N),Rc=new Float32Array(N);
    pairs.forEach((q,k)=>{const fc=f*q.cr*Math.pow(2,q.dt/1200),fm=f*q.mr*Math.pow(2,q.dt/1200),wc=2*Math.PI*fc/sr2,wm=2*Math.PI*fm/sr2,d=Math.exp(Math.log(.001)/(q.t60*sr2)),di=Math.exp(-1/(q.it*sr2));
      if(fc>sr2*.45)return;let pc=0,pm=0,a=q.a,ix=q.i0;const att=Math.floor(sr2*.002),pl=k?.85:1,pr=k?1:.85;
      for(let i=0;i<N;i++){const y=Math.sin(pc+(ix+q.i1)*Math.sin(pm))*a*(i<att?i/att:1);Lc[i]+=y*pl;Rc[i]+=y*pr;pc+=wc;pm+=wm;if(pc>6.2832)pc-=6.2832;if(pm>6.2832)pm-=6.2832;a*=d;ix*=di;if(a<1e-5)break}});
    if(name==='dx-bas'){insBiquad(Lc,sr2,'lp',1200,.7);insBiquad(Rc,sr2,'lp',1200,.7);return insNorm([Lc],.92)}
    return insNorm([Lc,Rc],.9)}
  if(name==='korn'){/* a granular pad: grains of a source note, scattered in time and a little in pitch, now and then an octave up */
    const src=T.src==='rhodes'?insRender('rhodes',n,sr,seed+1):T.src==='dx'?insRender('dx-klocka',n,sr,seed+2):(()=>{const N=Math.floor(sr*1.6),x=new Float32Array(N);let p1=0,p2=0,p3=0;const w=f/sr;for(let i=0;i<N;i++){p1=(p1+w*1.003)%1;p2=(p2+w*.997)%1;p3=(p3+w*.5)%1;x[i]=(p1*2-1)*.4+(p2*2-1)*.4+Math.sin(p3*6.2832)*.4}insBiquad(x,sr,'lp',Math.min(5000,f*6),.7);return [x]})();
    const s0=src[0],sl=s0.length,len=4.2,N=Math.floor(sr*len),Lc=new Float32Array(N),Rc=new Float32Array(N),gs=Math.floor(sr*T.size),cnt=Math.floor(T.dens*len);let rs=seed*7+n;const rr=()=>{rs=(Math.imul(rs,1103515245)+12345)>>>0;return rs/4294967296};
    for(let g=0;g<cnt;g++){const at=Math.floor(rr()*(N-gs)),from=Math.floor(sl*(.08+rr()*.5)),oct=rr()<T.shim?2:1,cents=(rr()*2-1)*T.spread,rate=oct*Math.pow(2,cents/1200),pan=rr()*2-1,pl=Math.min(1,1-pan),pr=Math.min(1,1+pan);
      for(let i=0;i<gs;i++){const si=from+i*rate,i0=Math.floor(si);if(i0+1>=sl)break;const v=(s0[i0]+(s0[i0+1]-s0[i0])*(si-i0))*(.5-.5*Math.cos(6.2832*i/gs));Lc[at+i]+=v*pl;Rc[at+i]+=v*pr}}
    /* a slow swell in and a long tail, a soft top */const A=sr*.45;for(let i=0;i<N;i++){const e=(i<A?i/A:1)*(i>N-sr*.8?(N-i)/(sr*.8):1);Lc[i]*=e;Rc[i]*=e}
    insBiquad(Lc,sr,'lp',2500+T.air*5000,.6);insBiquad(Rc,sr,'lp',2500+T.air*5000,.6);return insNorm([Lc,Rc],.9)}
  return null}
