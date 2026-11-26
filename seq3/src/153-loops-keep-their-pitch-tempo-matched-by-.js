/* ================= loops keep their pitch: tempo-matched by time-stretching (WSOLA in a worker), transposable =================
   Before, a loop was sped up to the tempo, so an 80 bpm loop at 118 came out ~6.7 semitones up and ~70 cents off the
   synths. Now (ton låst, default) the loop is stretched to the tempo and keeps its key; − / + transposes it. */
const WSOLA_SRC=`onmessage=e=>{const {ch,ratio,sr,id}=e.data,N=Math.round(2048*sr/48000)&~1,Hs=N>>1,Ha=Hs/ratio,tol=Math.round(512*sr/48000),inL=ch[0].length,outL=Math.max(1,Math.round(inL*ratio));
 const w=new Float32Array(N);for(let i=0;i<N;i++)w[i]=.5-.5*Math.cos(2*Math.PI*i/N);const mono=new Float32Array(inL);for(const c of ch)for(let i=0;i<inL;i++)mono[i]+=c[i];
 const out=ch.map(()=>new Float32Array(outL+N)),norm=new Float32Array(outL+N);let prev=0;
 for(let k=0;k*Hs<outL;k++){const ideal=Math.round(k*Ha);let best=0;
  if(k>0){const nat=prev+Hs;let bv=-1e30;for(let d=-tol;d<=tol;d+=2){const p=ideal+d;if(p<0||p+N>inL)continue;let c=0;for(let i=0;i<Hs;i+=4)c+=mono[nat+i]*mono[p+i];if(c>bv){bv=c;best=d}}}
  let pos=Math.max(0,Math.min(inL-N,ideal+best));if(pos<0)pos=0;prev=pos;const o=k*Hs;
  for(let c=0;c<ch.length;c++){const s=ch[c],d=out[c];for(let i=0;i<N&&pos+i<inL;i++)d[o+i]+=s[pos+i]*w[i]}for(let i=0;i<N;i++)norm[o+i]+=w[i]}
 for(const d of out)for(let i=0;i<outL;i++)d[i]/=Math.max(.5,norm[i]);postMessage({id,out:out.map(d=>d.slice(0,outL))})}`;
let wsW=null,wsN=0;const wsCb=new Map();
function wsola(buf,ratio){if(!wsW){wsW=new Worker(URL.createObjectURL(new Blob([WSOLA_SRC],{type:'application/javascript'})));wsW.onmessage=e=>{const f=wsCb.get(e.data.id);wsCb.delete(e.data.id);if(f)f(e.data.out)}}
  return new Promise(res=>{const id=++wsN;wsCb.set(id,res);const ch=[];for(let c=0;c<buf.numberOfChannels;c++)ch.push(buf.getChannelData(c).slice());wsW.postMessage({ch,ratio,sr:buf.sampleRate,id})})}
function loopLocked(L){return L.lock!==0}
function loopBuf(L,sm){if(!ctx||!sm||!sm.buf)return null;const tr=L.tr||0,p=Math.pow(2,tr/12);
  if(!loopLocked(L))return tr?[sm.buf,S.bpm/sm.bpm*p]:null;
  const key=S.bpm+'|'+tr;if(!sm._st)sm._st={};const hit=sm._st[key];if(hit&&hit.buf)return [hit.buf,p];
  if(!hit){sm._st[key]={buf:null};const ratio=sm.bpm/S.bpm*p;
    if(Math.abs(ratio-1)<.002){sm._st[key].buf=sm.buf}
    else wsola(sm.buf,ratio).then(out=>{const b=ctx.createBuffer(out.length,out[0].length,sm.buf.sampleRate);out.forEach((d,c)=>b.copyToChannel(d,c));sm._st[key].buf=b;
      const ks=Object.keys(sm._st);if(ks.length>6)delete sm._st[ks[0]]})}
  return Math.abs(sm.bpm/S.bpm*p-1)<.002?[sm.buf,p]:null}   /* not ready yet: this bar plays the old way, the next one stretched */
function loopsWarm(){if(!ctx)return;(S.loops||[]).forEach(L=>{if(!L.sid)return;const sm=SMP.get(L.sid);if(sm&&sm.buf)loopBuf(L,sm)})}
{const _bl=buildLoops;buildLoops=function(){_bl.apply(this,arguments);lpRows.forEach((row,k)=>{const L=()=>S.loops[k];
  row.querySelector('.lk').onclick=e=>{e.stopPropagation();L().lock=loopLocked(L())?0:1;loopsWarm();renderLoops();save();toast(loopLocked(L())?'Loopen behåller sin ton':'Loopens ton följer tempot')};
  row.querySelector('.tm').onclick=e=>{e.stopPropagation();L().tr=Math.max(-12,(L().tr||0)-1);if(!loopLocked(L()))L().lock=1;loopsWarm();renderLoops();save()};
  row.querySelector('.tp').onclick=e=>{e.stopPropagation();L().tr=Math.min(12,(L().tr||0)+1);if(!loopLocked(L()))L().lock=1;loopsWarm();renderLoops();save()}})}}
{const _rl=renderLoops;renderLoops=function(){_rl.apply(this,arguments);lpRows.forEach((row,k)=>{const L=S.loops[k],lk=row.querySelector('.lk');if(!lk)return;lk.classList.toggle('lck',loopLocked(L));lk.textContent=loopLocked(L)?'låst':'fri';lk.title=loopLocked(L)?'Tonen är låst: loopen behåller sin tonhöjd i alla tempon':'Tonen följer tempot (spelas snabbare = högre)';
  row.querySelector('.tv').textContent=((L.tr||0)>0?'+':'')+(L.tr||0)+' st'});loopsWarm()}}
buildLoops();

