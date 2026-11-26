/* ---------- atmosphere: a bed under the Starter – vinyl, rain or a room (made once, looped) ---------- */
function insAtmos(c,kind){const ak=kind+'|'+c.sampleRate+'|'+(c===window.ctx?1:0),hit=INS_AC.get(ak);if(hit)return hit;const b=insAtmosRaw(c,kind);INS_AC.set(ak,b);return b}
const INS_AC=new Map();
function insAtmosRaw(c,kind){const sr=c.sampleRate,len=9,N=Math.floor(sr*len),L=new Float32Array(N),R=new Float32Array(N);let s=kind.length*977+13;const rnd=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296};
  let b1=0,b2=0,b3=0;
  for(let i=0;i<N;i++){const w=rnd()*2-1;b1=.997*b1+w*.03;b2+=(w-b2)*.08;b3+=(b2-b3)*.02;
    if(kind==='vinyl'){const h=(w-b2)*.012;L[i]=h;R[i]=h*.9}
    else if(kind==='regn'){const h=(w-b3)*.12;L[i]=h;R[i]=(rnd()*2-1-b3)*.12}
    else{const m=.6+.4*Math.sin(i/sr*.31*6.2832);L[i]=b1*.5*m+b2*.04;R[i]=b1*.5*(1.4-m)+b2*.04}}
  if(kind==='vinyl'){for(let k=0;k<len*9;k++){const at=Math.floor(rnd()*(N-200)),a=.15+rnd()*.55,ch=rnd()<.5?L:R;for(let j=0;j<60;j++)ch[at+j]+=a*Math.exp(-j/6)*(j%2?-1:1)}}
  if(kind==='regn'){for(let k=0;k<len*140;k++){const at=Math.floor(rnd()*(N-800)),a=.02+rnd()*.07,fr=1500+rnd()*4000,ch=rnd()<.5?L:R;for(let j=0;j<700;j++)ch[at+j]+=a*Math.exp(-j/(70+rnd()*50))*Math.sin(j*6.2832*fr/sr)}}
  [L,R].forEach(x=>{insBiquad(x,sr,'hp',kind==='rum'?40:180,.7);insBiquad(x,sr,'lp',kind==='vinyl'?7000:kind==='regn'?9000:2500,.7)});
  const f=Math.floor(sr*.4);for(let i=0;i<f;i++){const a=i/f;L[N-f+i]=L[N-f+i]*(1-a)+L[i]*a;R[N-f+i]=R[N-f+i]*(1-a)+R[i]*a}
  insNorm([L,R],.5);const b=c.createBuffer(2,N-f,sr);b.getChannelData(0).set(L.subarray(f));b.getChannelData(1).set(R.subarray(f));return b}
const INS_ATM=['vinyl','regn','rum'];
