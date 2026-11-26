/* ---------- cache and a background queue ---------- */
const INS_C=new Map(),INS_Q=[],INS_QK=new Set();let INS_T=0;
const insKey=(name,n,seed,sr)=>name+'|'+n+'|'+(seed|0)+'|'+sr;
function insBuf(c,name,n,seed){const k=insKey(name,n,seed,c.sampleRate),b=INS_C.get(k);if(b){INS_C.delete(k);INS_C.set(k,b);return b}return null}
function insMake(c,name,n,seed){const k=insKey(name,n,seed,c.sampleRate);let b=INS_C.get(k);if(b)return b;const ch=insRender(name,n,c.sampleRate,seed);if(!ch)return null;
  b=c.createBuffer(ch.length,ch[0].length,c.sampleRate);ch.forEach((d,i)=>b.copyToChannel?b.copyToChannel(d,i):b.getChannelData(i).set(d));INS_C.set(k,b);
  while(INS_C.size>360){const first=INS_C.keys().next().value;INS_C.delete(first)}return b}
function insWant(c,name,n,seed){if(!INS[name])return;const k=insKey(name,n,seed,c.sampleRate);if(INS_C.has(k)||INS_QK.has(k))return;INS_QK.add(k);INS_Q.push([c,name,n,seed,k]);if(!INS_T)INS_T=setTimeout(insWork,0)}
function insWork(){INS_T=0;const t0=performance.now();while(INS_Q.length&&performance.now()-t0<10){const [c,name,n,seed,k]=INS_Q.shift();try{insMake(c,name,n,seed)}catch(e){console.warn('ins',e)}INS_QK.delete(k)}if(INS_Q.length)INS_T=setTimeout(insWork,4)}
/* render ahead every note a plan will play on layers that use an instrument */
function insPrep(c,P,plan){if(!c||!P||!plan||!plan.steps)return;const L=P.ls||{};const lay=['ack','klo','sub','luft'].filter(l=>L[l]&&(INS[L[l].snd]||(L[l].st&&INS[L[l].st.snd]))&&P.lay&&P.lay[l]);if(!lay.length)return;
  plan.steps.forEach(st=>{if(!st)return;lay.forEach(l=>{const e=st[l];if(!e)return;const ns=e.ns||(e.n!=null?[e.n]:[]),Ll=L[l];ns.forEach(nn=>{if(INS[Ll.snd])insWant(c,Ll.snd,nn+12*(Ll.oct||0),Ll.tw||0);if(Ll.st&&INS[Ll.st.snd])insWant(c,Ll.st.snd,nn+12*((Ll.oct||0)+(Ll.st.oct||0)),Ll.st.tw||0)})})})}
