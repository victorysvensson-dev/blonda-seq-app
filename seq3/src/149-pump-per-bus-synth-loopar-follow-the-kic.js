/* ---------- pump per bus (synth + loopar): follow the kick or a beat, with a curve and a release ----------
   synth: the amount is S.master.pump (the old master pump), shaped on A.duck; loopar: its own gain at the end of the bus.
   shape/rel left unset (null) = the classic web duck (duckAt), so old projects sound the same. */
const PUMP_DEF={src:'kick',rate:4,shape:null,rel:null};
function pumpOf(k){const b=busOf(k);if(!b.pump)b.pump={...PUMP_DEF};return b.pump}
function pumpAmt(k){return k==='sy'?(S.master.pump||0):(pumpOf(k).amt||0)}
function pumpNode(k){return k==='sy'?A.duck:(A.buses&&A.buses.lp?A.buses.lp.pg:null)}
const PUMPT={sy:-9,lp:-9};
function shapeP(sh){return Math.pow(2,((sh==null?.5:sh)-.5)*3.2)}   /* 0 = snaps back fast, .5 = straight, 1 = holds down then swells */
function pumpRel(k,a){const c=pumpOf(k);return c.rel!=null?c.rel:.06+Math.min(a,1)*.33}
function pumpGain(k,u){const a=Math.min(1,pumpAmt(k)),fl=1-Math.pow(a,.7);return fl+(1-fl)*Math.pow(Math.max(0,Math.min(1,u)),shapeP(pumpOf(k).shape))}
function pumpHit(k,t){const a=pumpAmt(k),g=pumpNode(k);if(!a||!g)return;PUMPT[k]=t;const c=pumpOf(k);
  if(c.shape==null&&c.rel==null){duckAt(g.gain,t,a,1);return}
  const rel=pumpRel(k,a),n=48,cv=new Float32Array(n);for(let j=0;j<n;j++)cv[j]=pumpGain(k,j/(n-1));
  const P=g.gain;try{if(P.cancelAndHoldAtTime)P.cancelAndHoldAtTime(t);else{P.cancelAndHoldAtTime(t);P.setValueAtTime(P.value,t)}P.linearRampToValueAtTime(cv[0],t+.004);P.setValueCurveAtTime(cv,t+.005,Math.max(.02,rel))}
  catch(e){P.setTargetAtTime(cv[0],t,.002);P.setTargetAtTime(1,t+.01,rel/3)}}
pump=function(t){if(A.ch)TRACKS.forEach((tr,i)=>{const a=(S.tfx&&S.tfx[tr.id]||{}).pump||0,c=A.ch[i];if(!a||!c||!c.pg||i===0)return;duckAt(c.pg.gain,t,a,1)});
  ['sy','lp'].forEach(k=>{if(pumpOf(k).src==='kick')pumpHit(k,t)})};
function beatPump(t,st){if(!ctx)return;['sy','lp'].forEach(k=>{const c=pumpOf(k);if(c.src==='beat'&&st%(c.rate||4)===0)pumpHit(k,t)})}

