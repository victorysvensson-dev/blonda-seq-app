/* ================= Starter stems in the export (SEQ.3 v135) =================
   The Starter's layers share one chain (drive, filter, chorus, tape, echo, room), so they can't be tapped apart in the mix.
   While the export records, each layer gets its own silent copy of the Starter engine with only that layer on: it gets
   exactly the same steps as the real one (same time, swing, chords, fx pads), so every stem sounds like that layer in the
   mix and lines up sample for sample. Layers played on a synth channel ("grime ↗", "spår keys") are rendered straight from
   that channel's engine instead, so they don't mix with the channel's own pattern notes. */
const STEM={on:false,eng:[],out:{},fid:[],cs:[]};
if(EXP.stx==null)EXP.stx=1;
const STEM_LN={ack:'ackord',klo:'topp',sub:'sub',luft:'luft',s0:'röst',s1:'ljud'};
/* v215: the Starter's layers are notes on the synth tracks, so their stems are the tracks' stems */
function stemLayers(){return [];let P=null;try{P=stx()}catch(e){globalThis.__el&&globalThis.__el(e)}if(!P||!P.on)return [];const L=[];
  ['ack','klo','sub','luft'].forEach(l=>{if(P.lay&&P.lay[l])L.push(l)});[0,1].forEach(k=>{const q=P.smp&&P.smp[k];if(q&&q.on&&q.id)L.push('s'+k)});return L}
function stemName(l){let P=null;try{P=stx()}catch(e){globalThis.__el&&globalThis.__el(e)}let s='';try{if(l[0]==='s'&&l.length===2){const q=P.smp[+l[1]],sm=q.id!=='kit:vox'&&typeof SMP!=='undefined'?SMP.get(q.id):null;s=q.id==='kit:vox'?'röster':(sm&&sm.name)||q.id}else s=stxSndName(P.ls[l].snd)}catch(e){globalThis.__el&&globalThis.__el(e)}
  return ('starter – '+STEM_LN[l]+(s?' ('+s.replace(/ ↗/,'')+')':'')).replace(/[\\/:*?"<>|]/g,'').trim()}
/* the layer's own copy of the params: only that layer (or that sample slot) plays */
function stemP(P,l){const lay={ack:0,klo:0,sub:0,luft:0};if(l in lay)lay[l]=1;return Object.assign({},P,{lay,smp:(P.smp||[]).map((q,k)=>q?Object.assign({},q,{on:'s'+k===l?q.on:0}):q)})}
/* the copies' chorus and tape-wow LFOs move exactly in step with the real engine's (same frequency, same phase): their own
   oscillators are unhooked and replaced by curves computed from when the real ones started */
function stemPhase(E,main){if(!main)return;
  /* the same room, echo-room and noise as the real engine (those are made from random numbers, one set per engine) */
  try{if(main.cv&&E.cv)E.cv.buffer=main.cv.buffer;if(main.sCv&&E.sCv)E.sCv.buffer=main.sCv.buffer;if(main.nz)E.nz=main.nz}catch(e){globalThis.__el&&globalThis.__el(e)}
  if(main.lfoT0==null||!E.lfoC)return;const t=ctx.currentTime,dur=Math.min(1800,expSecs()+30),N=Math.ceil(dur*200),T0=main.lfoT0;
  const mk=(f,amp,dests)=>{const cv=new Float32Array(N);for(let i=0;i<N;i++)cv[i]=amp*Math.sin(2*Math.PI*f*(t+i/200-T0));const cs=ctx.createConstantSource();cs.offset.value=cv[0];cs.offset.setValueCurveAtTime(cv,t,dur);dests.forEach(d=>cs.connect(d));cs.start(t);cs.stop(t+dur);STEM.cs.push(cs);return cs};
  try{E.lfoC.disconnect();E.w1.disconnect();E.w2.disconnect()}catch(e){globalThis.__el&&globalThis.__el(e)}
  /* chorus: ±2.6 ms opposite on the two sides, as in the engine; wow: through the engine's own depth gains */
  const c=mk(.52,1,[]),gA=ctx.createGain(),gB=ctx.createGain();gA.gain.value=STX_CHD;gB.gain.value=-STX_CHD;c.connect(gA);c.connect(gB);gA.connect(E.cL.delayTime);gB.connect(E.cR.delayTime);
  mk(.47,1,[E.wg1]);mk(1.9,1,[E.wg2])}
/* the glue: the real Starter runs all layers through one drive and one tape, which squeezes them together (about 2 dB when
   everything plays). The copies don't feel each other, so one slow gain (50 ms) follows the real Starter's level over
   the copies' sum and is put on every stem the same way: the stems keep their own sound and add up to the real level. */
const GLUE_SRC=`class G extends AudioWorkletProcessor{constructor(o){super();this.n=o.processorOptions.n;this.er=0;this.es=0;this.g=1;this.a=1/(sampleRate*.05);this.b=1/(sampleRate*.02)}
 process(I,O){const R=I[0]||[],rL=R[0],rR=R[1]||rL,n=(O[0]&&O[0][0])?O[0][0].length:128;
  for(let i=0;i<n;i++){let sl=0,sr=0;for(let k=0;k<this.n;k++){const x=I[k+1];if(x&&x[0]){sl+=x[0][i];sr+=(x[1]||x[0])[i]}}
   const r=rL?rL[i]*rL[i]+rR[i]*rR[i]:0;this.er+=(r-this.er)*this.a;this.es+=(sl*sl+sr*sr-this.es)*this.a;
   const t=this.es>1e-9?Math.max(.3,Math.min(1.4,Math.sqrt(this.er/this.es))):this.g;this.g+=(t-this.g)*this.b;
   for(let k=0;k<this.n;k++){const x=I[k+1],o=O[k];if(!o)continue;const xl=x&&x[0]?x[0][i]:0,xr=x&&x[0]?(x[1]||x[0])[i]:0;o[0][i]=xl*this.g;if(o[1])o[1][i]=xr*this.g}}
  return true}}
registerProcessor('blonda-glue',G);`;
let glueReady=null;
async function stemSetup(){STEM.eng=[];STEM.out={};STEM.fid=[];const L=EXP.stx?stemLayers():[];if(!L.length||!ctx)return;const P=stx(),main=stxEnsure();if(!main)return;
  /* wait for the real engine's fx stage (it loads the first time the Starter plays), so the copies can reuse it */
  for(let i=0;i<40&&!main.fxw;i++)await new Promise(r=>setTimeout(r,50));
  for(const l of L){const o=ctx.createGain();STEM.out[l]=o;const E=stxEngine(ctx,o);
    try{let n;try{n=new AudioWorkletNode(ctx,'blonda-stx',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit'})}catch(e){n=await stxFxNode(ctx)}E.useFx(n)}catch(e){globalThis.__el&&globalThis.__el(e)}
    E.apply(stemP(P,l));
    /* a layer on a synth channel: the channel's engine straight into this stem (a stand-in id, so the real voice is untouched) */
    E.trk=(lay,t,ns,vel,dur)=>{if(lay!==l)return;const Q=E.P,LL=Q.ls[lay],id=stxTrkOf(lay,LL.snd),i=TRACKS.findIndex(x=>x.id===id);if(i<0)return;const fid=id+'~stem';
      if(!STEM.fid.includes(fid)){STEM.fid.push(fid);S.inst[fid]=S.inst[id];if(S.synth[id])S.synth[fid]=S.synth[id];const g=ctx.createGain();g.gain.value=S.params[id].level??.8;g.connect(o);STEM.out[l+'~g']=g}
      S.inst[fid]=S.inst[id];const steps=Math.max(.25,dur/stepDur()),lv=LL.lv/.75,p=S.params[id];VOIC1=true;
      try{ns.forEach(n=>melVoice(fid,t,Math.min(1,vel*lv),p,STEM.out[l+'~g'],n+12*LL.oct,60/S.bpm/4*steps))}catch(e){globalThis.__el&&globalThis.__el(e)}finally{VOIC1=false}};
    stemPhase(E,main);STEM.eng.push({l,E,onTrk:l in {ack:1,klo:1,sub:1,luft:1}&&stxViaTrk(P.ls[l].snd)})}
  /* the glue between the copies' outputs and the stems the recorder takes */
  try{if(!glueReady)glueReady=ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([GLUE_SRC],{type:'application/javascript'})));await glueReady;
    const G=STEM.eng.filter(s=>!s.onTrk);if(G.length){const gl=new AudioWorkletNode(ctx,'blonda-glue',{numberOfInputs:G.length+1,numberOfOutputs:G.length,outputChannelCount:G.map(()=>2),channelCount:2,channelCountMode:'explicit',processorOptions:{n:G.length}});
      main.vol.connect(gl,0,0);G.forEach((s,i)=>{const raw=STEM.out[s.l],o=ctx.createGain();raw.connect(gl,0,i+1);gl.connect(o,i);STEM.out[s.l+'~raw']=raw;STEM.out[s.l]=o});
      STEM.glue=gl;STEM.unglue=()=>{try{main.vol.disconnect(gl)}catch(e){globalThis.__el&&globalThis.__el(e)}try{gl.disconnect()}catch(e){globalThis.__el&&globalThis.__el(e)}}}}catch(e){console.warn('glue',e)}
  /* the real engine's every step also steps the copies */
  const tk=main.tick;main.tick=function(t,gs,sd,plan){const r=tk.apply(this,arguments);if(STEM.on){const P2=stx();STEM.eng.forEach(s=>{try{s.E.P=stemP(P2,s.l);s.E.tick(t,gs,sd,plan)}catch(e){globalThis.__el&&globalThis.__el(e)}})}return r};
  /* …and when the real one is stopped (end of the music, before the tail), the copies stop the same way */
  const kl=main.kill;main.kill=function(){const r=kl.apply(this,arguments);if(STEM.on)STEM.eng.forEach(s=>{try{s.E.kill()}catch(e){globalThis.__el&&globalThis.__el(e)}});return r};
  STEM.restore=()=>{main.tick=tk;main.kill=kl};STEM.on=true}
function stemTeardown(){STEM.on=false;if(STEM.restore){STEM.restore();STEM.restore=null}if(STEM.unglue){STEM.unglue();STEM.unglue=null}
  STEM.eng.forEach(s=>{try{s.E.kill()}catch(e){globalThis.__el&&globalThis.__el(e)}try{s.E.vol.disconnect()}catch(e){globalThis.__el&&globalThis.__el(e)}});
  setTimeout(()=>{Object.values(STEM.out).forEach(n=>{try{n.disconnect()}catch(e){globalThis.__el&&globalThis.__el(e)}})},300);
  STEM.cs.forEach(c=>{try{c.stop()}catch(e){globalThis.__el&&globalThis.__el(e)}try{c.disconnect()}catch(e){globalThis.__el&&globalThis.__el(e)}});STEM.cs=[];
  STEM.fid.forEach(f=>{delete S.inst[f];delete S.synth[f]});STEM.eng=[];STEM.fid=[]}
{const _ep=expPlan;expPlan=function(){const L=_ep();if(EXP.stx)stemLayers().forEach(l=>L.push({k:'stx-'+l,name:stemName(l),node:()=>STEM.out[l]||(()=>{const g=ctx.createGain();return g})()}));
  if(window.__refTap&&STX.E)L.push({k:'stx-ref',name:'starter – REF',node:()=>STX.E.vol});return L}}  /* __refTap: test only, the real Starter as heard */
{const _re=runExport;runExport=async function(paint){try{initAudio();await ctx.resume();await stemSetup()}catch(e){console.warn('starter-stems',e)}try{return await _re.apply(this,arguments)}finally{stemTeardown()}}}
/* test only: play 'secs' with the copies running and return the level of the real Starter vs the sum of the copies (dB) */
window.__stemCmp=async secs=>{initAudio();await ctx.resume();await stemSetup();const main=STX.E,an1=ctx.createAnalyser(),an2=ctx.createAnalyser(),sum=ctx.createGain();an1.fftSize=an2.fftSize=2048;
  main.vol.connect(an1);Object.keys(STEM.out).filter(k=>!k.includes('~')).forEach(k=>STEM.out[k].connect(sum));sum.connect(an2);play();const b1=new Float32Array(2048),b2=new Float32Array(2048);let e1=0,e2=0;
  for(let i=0;i<secs*20;i++){await new Promise(r=>setTimeout(r,50));an1.getFloatTimeDomainData(b1);an2.getFloatTimeDomainData(b2);for(let j=0;j<2048;j++){e1+=b1[j]*b1[j];e2+=b2[j]*b2[j]}}
  stop();stemTeardown();return 'real '+(10*Math.log10(e1/(secs*20*2048))).toFixed(2)+' dB · copies '+(10*Math.log10(e2/(secs*20*2048))).toFixed(2)+' dB'};

