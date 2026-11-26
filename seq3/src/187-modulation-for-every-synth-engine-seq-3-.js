/* ================= Modulation for every synth engine (SEQ.3 v134) =================
   Each engine has its own modulation set in S.mods[engine]: two LFOs, a mod envelope, a 16-step "steg" sequencer, a random
   value per note and the velocity. A row links a source to a target with an amount (−1..1 of the target's range).
   Targets are the engine's own params plus the "efter" chain (a filter, drive, pan and level after the engine, on every voice).
   How it moves:
   · the efter chain, and in grime cutoff/reso/wob/growl/formant/vowel/drive/fold/sub/level/pitch, move smoothly inside the note
     (a curve on the audio param, 100 points a second);
   · everything else is read when the note starts, so it changes from note to note (the LFOs keep running between notes).
   Free LFOs and the steps follow the song position (from play), so they stay on the grid. */
const MOD_RATES=[[64,'4 takter'],[32,'2 takter'],[16,'1 takt'],[8,'1/2'],[4,'1/4'],[2,'1/8'],[4/3,'1/8T'],[1,'1/16'],[.5,'1/32']];
const MOD_SH=['sine','triangle','saw up','saw down','square','random','smooth random'];
const MOD_SRC=[['l1','lfo 1','#B8F23A'],['l2','lfo 2','#6FD0C5'],['env','env','#F07AB0'],['stp','steg','#E9C54A'],['rnd','slump','#B9A6FF'],['vel','anslag','#FF8A3D']];
const MOD_SC=Object.fromEntries(MOD_SRC.map(s=>[s[0],s[2]]));
/* params that move inside the note (the engine connects the curve itself) */
const MOD_CONT={grime:new Set(['cut','res','wob','growl','form','vowel','drive','fold','sub','amp','pitch'])};
/* the efter chain, on every engine */
const MOD_X=[{k:'x.cut',l:'filter',f:v=>{const h=20*Math.pow(2,v*10);return h>=1000?[(h/1000).toFixed(1),'khz']:[String(Math.round(h)),'hz']}},{k:'x.res',l:'reso',f:v=>[String(Math.round(v*100)),'%']},
  {k:'x.drv',l:'drive',f:v=>[String(Math.round(v*100)),'%']},{k:'x.pan',l:'pan',f:v=>{const p=Math.round((v-.5)*200);return [p?Math.abs(p)+(p<0?' v':' h'):'mitt','']}},{k:'x.amp',l:'nivå',f:v=>[String(Math.round(v*100)),'%']}];
const MOD_XDEF={cut:1,res:0,drv:0,pan:.5,amp:1};
const MOD_HZ=100;
var MOD_T0=0;
function modOf(e){if(!S.mods||typeof S.mods!=='object')S.mods={};let M=S.mods[e];if(!M||typeof M!=='object')M=S.mods[e]={};
  M.l1=Object.assign({rate:5,shape:0,retrig:0},M.l1);M.l2=Object.assign({rate:2,shape:1,retrig:0},M.l2);M.env=Object.assign({a:.1,d:.4,s:.5,r:.3},M.env);
  M.stp=Object.assign({rate:7,glide:.2},M.stp);if(!Array.isArray(M.stp.v)||M.stp.v.length!==16)M.stp.v=[1,.2,.6,.2,.9,.3,.5,.1,1,.2,.7,.3,.8,.4,.6,.2];
  if(!Array.isArray(M.rows))M.rows=[];M.x=Object.assign({},MOD_XDEF,M.x);return M}
const modHash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
/* a source's value at absolute time T for a note (n = {t0,len,vel,rnd}); lfo/rnd are −1..1, env/stp/vel 0..1 */
function modSrc(M,s,T,n){const bps=S.bpm/15;
  if(s==='l1'||s==='l2'){const L=M[s],per=(MOD_RATES[L.rate]||MOD_RATES[5])[0]/bps,el=L.retrig?T-n.t0:T-MOD_T0,cy=el/per,p=cy-Math.floor(cy);
    switch(L.shape|0){case 1:return 1-4*Math.abs(p-.5);case 2:return 2*p-1;case 3:return 1-2*p;case 4:return p<.5?1:-1;case 5:return modHash(Math.floor(cy)+(s==='l2'?99:0))*2-1;
      case 6:{const i=Math.floor(cy),a=modHash(i+(s==='l2'?99:0)),b=modHash(i+1+(s==='l2'?99:0)),u=(1-Math.cos(p*Math.PI))/2;return (a+(b-a)*u)*2-1}default:return Math.sin(p*2*Math.PI)}}
  if(s==='env'){const E=M.env,a=.002+E.a*E.a*3,d=.01+E.d*E.d*3,r=.01+E.r*E.r*4,el=T-n.t0,g=Math.max(.02,n.len);if(el<0)return 0;
    const lv=x=>x<a?x/a:E.s+(1-E.s)*Math.exp(-(x-a)/(d/3));if(el<g)return lv(el);return lv(g)*Math.exp(-(el-g)/(r/3))}
  if(s==='stp'){const P=M.stp,st=(MOD_RATES[P.rate]||MOD_RATES[7])[0],x=(T-MOD_T0)*bps/st,i=Math.floor(x),u=x-i,a=P.v[((i%16)+16)%16],b=P.v[(((i+1)%16)+16)%16],gl=Math.max(.001,P.glide);
    return u<1-gl?a:a+(b-a)*((u-(1-gl))/gl)}
  if(s==='rnd')return n.rnd;if(s==='vel')return n.vel;return 0}
/* the range of a target, so an amount of 1 = the whole knob */
function modMax(e,k){if(k.startsWith('x.')||k==='pitch')return 1;const D=ENG[e]||{};const q=(D.ps||[]).concat(D.adv||[],(typeof RS_EXTRA!=='undefined'&&RS_EXTRA[e])||[]).find(q=>q.k===k);return q?(q.max||1):1}
function modStepOf(e,k){const D=ENG[e]||{};const q=(D.ps||[]).concat(D.adv||[],(typeof RS_EXTRA!=='undefined'&&RS_EXTRA[e])||[]).find(q=>q.k===k);return q&&q.step||0}
/* the note being started right now (set around each engine call) */
var MODN=null;
/* a smooth curve (sum of all rows for one target) for the note being started, scaled; null if nothing modulates it */
function modCurveFor(e,k,t,dur,sc){if(!MODN||MODN.e!==e)return null;const M=MODN.M,rows=M.rows.filter(r=>r.dst===k&&r.amt);if(!rows.length)return null;
  const N=Math.max(2,Math.ceil(dur*MOD_HZ)),out=new Float32Array(N),mx=modMax(e,k);
  for(let i=0;i<N;i++){const T=t+i/MOD_HZ;let s=0;for(const r of rows)s+=r.amt*modSrc(M,r.src,T,MODN.n);out[i]=s*mx*(sc||1)}return out}
/* adds a curve onto an audio param (an extra constant source summed into it) */
function modPush(prm,curve,t,dur,end){try{const cs=ctx.createConstantSource();cs.offset.value=curve[0]||0;cs.offset.setValueCurveAtTime(curve,t,Math.max(.01,dur));cs.connect(prm);cs.start(t);cs.stop(end+.05)}catch(e){globalThis.__el&&globalThis.__el(e)}}
const modXOn=M=>M.rows.some(r=>r.dst.startsWith('x.')&&r.amt)||Object.keys(MOD_XDEF).some(k=>Math.abs(M.x[k]-MOD_XDEF[k])>.001);
/* the efter chain for one voice: lowpass → drive → pan → level */
function modChain(M,out,t,dur){const X=M.x,c=ctx,end=t+dur,cv=k=>modCurveFor(MODN.e,'x.'+k,t,dur,1);
  const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=Math.min(20000,20*Math.pow(2,X.cut*10));lp.Q.value=.5+X.res*14;
  const cc=cv('cut');if(cc)modPush(lp.detune,cc.map(x=>x*12000),t,dur,end);const rc=cv('res');if(rc)modPush(lp.Q,rc.map(x=>x*14),t,dur,end);
  let last=lp;const dc=cv('drv');if(X.drv>.001||dc){const pre=c.createGain(),ws=c.createWaveShaper(),post=c.createGain();pre.gain.value=1+X.drv*4;ws.curve=dCurve(Math.max(.05,X.drv));post.gain.value=1/(1+X.drv*2);
    if(dc)modPush(pre.gain,dc.map(x=>x*4),t,dur,end);lp.connect(pre);pre.connect(ws);ws.connect(post);last=post}
  /* explicit stereo, so a mono voice is not 3 dB quieter in the middle */
  const pn=c.createStereoPanner();pn.channelCount=2;pn.channelCountMode='explicit';pn.channelInterpretation='speakers';pn.pan.value=X.pan*2-1;const pc=cv('pan');if(pc)modPush(pn.pan,pc.map(x=>x*2),t,dur,end);
  const g=c.createGain();g.gain.value=X.amp;const ac=cv('amp');if(ac)modPush(g.gain,ac,t,dur,end);last.connect(pn);pn.connect(g);g.connect(out);
  setTimeout(()=>{try{g.disconnect();lp.disconnect()}catch(e){globalThis.__el&&globalThis.__el(e)}},Math.max(0,(end+1.5-c.currentTime)*1000));return lp}
/* every melodic voice goes through here */
{const _mv=melVoice;melVoice=function(id,t,v,p,out,note,len){const e=S.inst[id]||'analog',M=S.mods&&S.mods[e];
  if(!M||!M.rows||(!M.rows.length&&!modXOn(modOf(e))))return _mv.apply(this,arguments);modOf(e);
  const n={t0:t,len:Math.max(.05,len),vel:v,rnd:Math.random()*2-1},dur=Math.min(12,Math.max(.3,len)*1.5+3.5),prev=MODN;MODN={e,M,n};
  let restore=null;const cont=MOD_CONT[e],rows=M.rows.filter(r=>r.amt&&!r.dst.startsWith('x.')&&r.dst!=='pitch'&&!(cont&&cont.has(r.dst)));
  if(rows.length){const host=e==='analog'?S.synth:S.eng,key=e==='analog'?id:e,orig=host[key];if(orig){const cp=Object.assign({},orig);
    rows.forEach(r=>{if(typeof cp[r.dst]!=='number')return;const mx=modMax(e,r.dst),st=modStepOf(e,r.dst);let x=Math.max(0,Math.min(mx,cp[r.dst]+r.amt*modSrc(M,r.src,t,n)*mx));if(st)x=Math.round(x/st)*st;cp[r.dst]=x});
    host[key]=cp;restore=()=>{host[key]=orig}}}
  let o2=out;try{if(modXOn(M)){
    /* Bris sends its voices through the channel's chorus/delay: the chain goes before that, and Bris must not re-route it */
    if(e==='bris'&&typeof brFxFor==='function'){const i=TRACKS.findIndex(x=>x.id===id),ch=A&&A.ch&&A.ch[i],ci=ch&&(ch.inp||ch.g);
      if(ci&&ci===out&&ci.context===ctx){const fx=brFxFor(ci);o2=modChain(M,fx.inp,t,dur);o2._brR=1}else o2=modChain(M,out,t,dur)}
    else o2=modChain(M,out,t,dur)}}catch(err){o2=out}
  try{return _mv.call(this,id,t,v,p,o2,note,len)}finally{if(restore)restore();MODN=prev}}}
{const _p=play;play=function(){const r=_p.apply(this,arguments);try{if(ctx)MOD_T0=ctx.currentTime+.05}catch(e){globalThis.__el&&globalThis.__el(e)}return r}}
/* modulation that comes with a preset (grime's list); null clears the rows */
function modSetFromPreset(e,P){const M=modOf(e);M.rows=P&&P.rows?JSON.parse(JSON.stringify(P.rows)):[];['l1','l2','env','stp'].forEach(k=>{if(P&&P[k])Object.assign(M[k],JSON.parse(JSON.stringify(P[k])))});if(window.rsPaint)rsPaint()}
/* ready-made modulation for any engine (the "mod" list in the full synth); targets that the engine doesn't have are skipped */
const MOD_PRE=[['ingen',{rows:[]}],
  ['andas',{l1:{rate:1,shape:0,retrig:0},rows:[{src:'l1',dst:'x.cut',amt:.18}]}],
  ['pumpa',{l1:{rate:4,shape:3,retrig:0},rows:[{src:'l1',dst:'x.amp',amt:-.35}]}],
  ['trappa',{stp:{rate:7,glide:.1},rows:[{src:'stp',dst:'x.cut',amt:.3}]}],
  ['vandra',{l2:{rate:2,shape:6,retrig:0},rows:[{src:'l2',dst:'x.pan',amt:.35},{src:'l2',dst:'x.cut',amt:.08}]}],
  ['anslag',{rows:[{src:'vel',dst:'x.cut',amt:.25},{src:'vel',dst:'x.amp',amt:.15}]}],
  ['slump',{rows:[{src:'rnd',dst:'x.cut',amt:.12},{src:'rnd',dst:'x.pan',amt:.2}]}],
  ['svep',{env:{a:.55,d:.6,s:.6,r:.4},rows:[{src:'env',dst:'x.cut',amt:.3}]}],
  ['tremolo',{l1:{rate:7,shape:0,retrig:1},rows:[{src:'l1',dst:'x.amp',amt:-.25}]}],
  ['wob',{l1:{rate:5,shape:0,retrig:1},rows:[{src:'l1',dst:'x.cut',amt:.3}],x:{cut:.62,res:.35}}]];
function modApplyPre(e,i){const P=MOD_PRE[i];if(!P)return;const M=modOf(e);M.rows=JSON.parse(JSON.stringify(P[1].rows));['l1','l2','env','stp'].forEach(k=>{if(P[1][k])Object.assign(M[k],P[1][k])});
  M.x=Object.assign({},MOD_XDEF,P[1].x||{});save()}
window.__mod={of:modOf,src:modSrc,pre:MOD_PRE,apply:modApplyPre,curve:modCurveFor};
/* offline render for tests: any engine on the bass track, with a modulation set */
window.__engRender=async(e,M,notes,dur,sr)=>{sr=sr||48000;const oc=new OfflineAudioContext(2,Math.ceil(dur*sr),sr),real=ctx,ki=S.inst.bass,km=S.mods?JSON.stringify(S.mods):null,t0=MOD_T0;
  S.inst.bass=e;if(!S.mods)S.mods={};S.mods[e]=M||null;modOf(e);MOD_T0=0;ctx=oc;
  try{notes.forEach(([t,n,l,v])=>melVoice('bass',t,v,S.params.bass,oc.destination,n,l))}finally{ctx=real;MOD_T0=t0;S.inst.bass=ki;S.mods=km?JSON.parse(km):null}
  const b=await oc.startRendering();return [Array.from(b.getChannelData(0)),Array.from(b.getChannelData(1))]};

