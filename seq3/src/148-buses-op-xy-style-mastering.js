/* ================= buses (OP-XY style) + mastering =================
   drums 1–6 → TRUMMOR, synths 7–10 → SYNTH, loops → LOOPAR. Each bus: level, mute, solo, filter, drive, glue (bus compressor).
   The sends (echo, space) of a muted bus go quiet too. Master: EQ low/mid/high, glue, width, loudness into the limiter. */
const BUSES=[{k:'dr',name:'trummor',hex:'#F2F2EE'},{k:'sy',name:'synth',hex:'#F07AB0'},{k:'lp',name:'loopar',hex:'#6BE28C'}];
const BUS_DEF={lv:1,mute:0,solo:0,filter:0,drive:0,glue:0};
function busOf(k){if(!S.bus)S.bus={};if(!S.bus[k])S.bus[k]={...BUS_DEF};return S.bus[k]}
function mkBus(dest,dIn,rIn){const c=ctx,inp=c.createGain(),dpre=c.createGain(),dsh=c.createWaveShaper(),dpost=c.createGain(),flp=c.createBiquadFilter(),fhp=c.createBiquadFilter(),
  cp=c.createDynamicsCompressor(),mk=c.createGain(),lv=c.createGain(),pg=c.createGain(),gd=c.createGain(),gr=c.createGain(),an=c.createAnalyser();
  dsh.oversample='2x';flp.type='lowpass';fhp.type='highpass';flp.frequency.value=20000;fhp.frequency.value=10;flp.Q.value=fhp.Q.value=.7;
  cp.threshold.value=0;cp.ratio.value=1;cp.attack.value=.01;cp.release.value=.2;cp.knee.value=8;an.fftSize=512;
  inp.connect(dpre);dpre.connect(dsh);dsh.connect(dpost);dpost.connect(flp);flp.connect(fhp);fhp.connect(cp);cp.connect(mk);mk.connect(lv);lv.connect(pg);pg.connect(dest);pg.connect(an);gd.connect(dIn);gr.connect(rIn);
  return {in:inp,dpre,dsh,dpost,flp,fhp,cp,mk,lv,pg,gd,gr,an}}
function busSolo(){return BUSES.some(b=>busOf(b.k).solo)}
function busOn(k){const b=busOf(k);return busSolo()?!!b.solo:!b.mute}
function applyBuses(){if(!ctx||!A.buses)return;const t=ctx.currentTime;
  BUSES.forEach(({k})=>{const B=A.buses[k],b=busOf(k),on=busOn(k)?1:0,f=b.filter,dr=b.drive,g=b.glue;
    B.lv.gain.setTargetAtTime(on*b.lv,t,.012);B.gd.gain.setTargetAtTime(on,t,.012);B.gr.gain.setTargetAtTime(on,t,.012);
    B.flp.frequency.setTargetAtTime(f<0?200*Math.pow(100,1+f):20000,t,.03);B.fhp.frequency.setTargetAtTime(f>0?20*Math.pow(100,f*1.15):10,t,.03);
    B.dsh.curve=dr>.005?driveCurve(dr):null;{const h=dr>.005?DRV_H:1;B.dpre.gain.setTargetAtTime((1+dr*.8)/h,t,.03);B.dpost.gain.setTargetAtTime(h/(1+dr*.75),t,.03)}
    B.cp.threshold.setTargetAtTime(-30*g,t,.03);B.cp.ratio.setTargetAtTime(1+3*g,t,.03);B.mk.gain.setTargetAtTime(1+g*.5,t,.03)});if(window.busPaint)busPaint()}
const MST_DEF={eqL:0,eqM:0,eqH:0,glue:.5,width:1,loud:0};
const mv=k=>S.master[k]!=null?S.master[k]:MST_DEF[k];
function applyMastering(){if(!ctx||!A.mst)return;const M=A.mst,t=ctx.currentTime,w=mv('width'),g=mv('glue');
  M.eqL.gain.setTargetAtTime(mv('eqL'),t,.03);M.eqM.gain.setTargetAtTime(mv('eqM'),t,.03);M.eqH.gain.setTargetAtTime(mv('eqH'),t,.03);
  M.wLL.gain.setTargetAtTime((1+w)/2,t,.03);M.wRR.gain.setTargetAtTime((1+w)/2,t,.03);M.wLR.gain.setTargetAtTime((1-w)/2,t,.03);M.wRL.gain.setTargetAtTime((1-w)/2,t,.03);
  M.comp.threshold.setTargetAtTime(-24*g,t,.03);M.comp.ratio.setTargetAtTime(1+1.6*g,t,.03);
  M.loud.gain.setTargetAtTime(Math.pow(10,mv('loud')*9/20),t,.03)}
{const _am=applyMaster;applyMaster=function(){_am.apply(this,arguments);applyMastering()}}
{const _aa=applyAll;applyAll=function(){_aa.apply(this,arguments);applyBuses()}}
