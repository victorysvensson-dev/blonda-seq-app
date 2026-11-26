/* ---------------- audio ---------------- */
let ctx=null,A={};
function makeIR(c,dur,decay){const len=Math.floor(c.sampleRate*dur),b=c.createBuffer(2,len,c.sampleRate);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay)}return b}
const TFX0={drive:0,filt:0,reso:0,crush:0,comp:0,pump:0};
function tfxOf(id){if(!S.tfx)S.tfx={};if(!S.tfx[id])S.tfx[id]=Object.assign({},TFX0);return S.tfx[id]}
function applyTfx(i){const c=A.ch&&A.ch[i];if(!c||!c.inp)return;const F=tfxOf(TRACKS[i].id),t=ctx.currentTime;
  c.dsh.curve=F.drive>.005?driveCurve(F.drive*1.6):null;c.dpre.gain.setTargetAtTime(1+F.drive*1.5,t,.02);c.dpost.gain.setTargetAtTime(1/(1+F.drive*4.2),t,.02);
  const f=F.filt,q=.7+F.reso*14;c.flp.frequency.setTargetAtTime(f<-.01?Math.max(60,180*Math.pow(110,1+f)):20000,t,.03);c.fhp.frequency.setTargetAtTime(f>.01?20*Math.pow(110,f*1.1):18,t,.03);
  c.flp.Q.setTargetAtTime(f<-.01?q:.7,t,.03);c.fhp.Q.setTargetAtTime(f>.01?q:.7,t,.03);
  c.cr.curve=F.crush>.01?crushCurve(Math.round(14-F.crush*11)):null;
  c.cp.threshold.setTargetAtTime(-F.comp*34,t,.03);c.cp.ratio.setTargetAtTime(1+F.comp*9,t,.03);c.mk.gain.setTargetAtTime(1+F.comp*.55,t,.03)}
function crushCurve(bits){const n=2048,c=new Float32Array(n),st=Math.pow(2,bits)/2;for(let i=0;i<n;i++){const x=i/(n-1)*2-1;c[i]=Math.round(x*st)/st}return c}
const DRV_H=4;function driveCurve(amt){const n=8192,c=new Float32Array(n),k=1+amt*6;for(let i=0;i<n;i++){const x=i/(n-1)*2-1;c[i]=Math.tanh(k*x*DRV_H)/Math.tanh(k)/DRV_H}return c}
function initAudio(){
  if(ctx)return;
  const AC=window.AudioContext||window.webkitAudioContext;ctx=new AC({latencyHint:'interactive'});
  try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){globalThis.__el&&globalThis.__el(e)}
  const bus=ctx.createGain(),pre=ctx.createGain(),shaper=ctx.createWaveShaper(),post=ctx.createGain();shaper.oversample='2x';
  const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.Q.value=.9;const hp=ctx.createBiquadFilter();hp.type='highpass';hp.Q.value=.9;
  const comp=ctx.createDynamicsCompressor();comp.threshold.value=-12;comp.ratio.value=1.8;comp.attack.value=.025;comp.release.value=.25;comp.knee.value=12;
  const lim=ctx.createDynamicsCompressor();lim.threshold.value=-1.5;lim.ratio.value=20;lim.attack.value=.002;lim.release.value=.12;lim.knee.value=0;
  const out=ctx.createGain(),an=ctx.createAnalyser();an.fftSize=2048;
  const split=ctx.createChannelSplitter(2),anL=ctx.createAnalyser(),anR=ctx.createAnalyser();anL.fftSize=anR.fftSize=1024;out.connect(split);split.connect(anL,0);split.connect(anR,1);
  const rpDry=ctx.createGain(),rpIn=ctx.createGain(),rpDl=ctx.createDelay(4),rpFb=ctx.createGain(),rpWet=ctx.createGain();rpIn.gain.value=0;rpFb.gain.value=0;rpWet.gain.value=0;
  bus.connect(rpDry);rpDry.connect(pre);bus.connect(rpIn);rpIn.connect(rpDl);rpDl.connect(rpFb);rpFb.connect(rpDl);rpDl.connect(rpWet);rpWet.connect(pre);pre.connect(shaper);shaper.connect(post);const tapeLp=ctx.createBiquadFilter();tapeLp.type='lowpass';tapeLp.Q.value=.4;post.connect(tapeLp);
  const crushDry=ctx.createGain(),crush=ctx.createWaveShaper(),crushWet=ctx.createGain();crushWet.gain.value=0;tapeLp.connect(crushDry);crushDry.connect(lp);tapeLp.connect(crush);crush.connect(crushWet);crushWet.connect(lp);const eqL=ctx.createBiquadFilter(),eqM=ctx.createBiquadFilter(),eqH=ctx.createBiquadFilter(),loud=ctx.createGain();eqL.type='lowshelf';eqL.frequency.value=110;eqM.type='peaking';eqM.frequency.value=1500;eqM.Q.value=.8;eqH.type='highshelf';eqH.frequency.value=8000;const wSp=ctx.createChannelSplitter(2),wMg=ctx.createChannelMerger(2),wLL=ctx.createGain(),wLR=ctx.createGain(),wRL=ctx.createGain(),wRR=ctx.createGain();wLR.gain.value=wRL.gain.value=0;const pqIn=ctx.createGain(),pqMid=ctx.createGain(),pqOut=ctx.createGain(),fxIn=ctx.createGain(),fxOut=ctx.createGain();lp.connect(hp);hp.connect(fxIn);fxIn.connect(fxOut);fxOut.connect(eqL);eqL.connect(eqM);eqM.connect(eqH);eqH.connect(pqIn);pqIn.connect(pqMid);pqMid.connect(pqOut);pqOut.connect(wSp);wSp.connect(wLL,0);wSp.connect(wRL,0);wSp.connect(wLR,1);wSp.connect(wRR,1);wLL.connect(wMg,0,0);wLR.connect(wMg,0,0);wRR.connect(wMg,0,1);wRL.connect(wMg,0,1);wMg.connect(comp);comp.connect(loud);loud.connect(lim);lim.connect(out);const MST={eqL,eqM,eqH,loud,wLL,wLR,wRL,wRR,comp,lim,pqIn,pqMid,pqOut,fxIn,fxOut};out.connect(an);an.connect(ctx.destination);
  const dIn=ctx.createGain(),dl=ctx.createDelay(2),fb=ctx.createGain(),dTone=ctx.createBiquadFilter(),dRet=ctx.createGain();
  dTone.type='bandpass';dTone.frequency.value=1800;dTone.Q.value=.6;fb.gain.value=.38;
  dIn.connect(dl);dl.connect(dTone);dTone.connect(fb);fb.connect(dl);dTone.connect(dRet);dRet.connect(bus);
  const rIn=ctx.createGain(),cv=ctx.createConvolver(),rRet=ctx.createGain(),rHp=ctx.createBiquadFilter();
  rHp.type='highpass';rHp.frequency.value=250;cv.buffer=makeIR(ctx,S.fx.space.size,2.8);rIn.connect(rHp);/* two rooms: when the size changes the new one takes over the input while the old one rings out */const cvI=ctx.createGain(),cvO=ctx.createGain(),cv2=ctx.createConvolver(),cvI2=ctx.createGain(),cvO2=ctx.createGain();cvI2.gain.value=0;rHp.connect(cvI);cvI.connect(cv);cv.connect(cvO);cvO.connect(rRet);rHp.connect(cvI2);cvI2.connect(cv2);cv2.connect(cvO2);cvO2.connect(rRet);rRet.connect(bus);
  const dry=ctx.createGain();dry.connect(bus);const duck=ctx.createGain();duck.connect(dry);
  const perf=ctx.createGain();perf.gain.value=0;dry.connect(perf);perf.connect(dIn);perf.connect(rIn);
  A={rv:[{i:cvI,cv,o:cvO},{i:cvI2,cv:cv2,o:cvO2}],dry,perf,fb,bus,pre,shaper,post,lp,hp,comp,out,an,dIn,dl,dRet,rIn,rRet,duck,ch:[],anL,anR,cv,tapeLp,crush,crushDry,crushWet};A.mst=MST;A.rp={dry:rpDry,inp:rpIn,dl:rpDl,fb:rpFb,wet:rpWet};
  const BUSN={dr:mkBus(dry,dIn,rIn),sy:mkBus(duck,dIn,rIn),lp:mkBus(dry,dIn,rIn)};A.buses=BUSN;A.dry=dry;A.dIn=dIn;A.rIn=rIn;
  TRACKS.forEach((t,i)=>{const g=ctx.createGain(),pan=ctx.createStereoPanner?ctx.createStereoPanner():null,se=ctx.createGain(),ss=ctx.createGain();
    const BB=BUSN[t.mel?'sy':'dr'];if(pan){g.connect(pan);pan.connect(BB.in)}else g.connect(BB.in);
    g.connect(se);se.connect(BB.gd);g.connect(ss);ss.connect(BB.gr);
    /* per-track FX insert: in → drive → lp → hp → crush → comp → makeup → pump → fader */
    const inp=ctx.createGain(),dpre=ctx.createGain(),dsh=ctx.createWaveShaper(),dpost=ctx.createGain(),flp=ctx.createBiquadFilter(),fhp=ctx.createBiquadFilter(),cr=ctx.createWaveShaper(),
      cp=ctx.createDynamicsCompressor(),mk=ctx.createGain(),pg=ctx.createGain();dsh.oversample='2x';flp.type='lowpass';fhp.type='highpass';flp.frequency.value=20000;fhp.frequency.value=18;
    cp.threshold.value=0;cp.ratio.value=1;cp.attack.value=.006;cp.release.value=.12;cp.knee.value=6;
    inp.connect(dpre);dpre.connect(dsh);dsh.connect(dpost);dpost.connect(flp);flp.connect(fhp);fhp.connect(cr);cr.connect(cp);cp.connect(mk);mk.connect(pg);pg.connect(g);
    A.ch[i]={g,pan,se,ss,inp,dpre,dsh,dpost,flp,fhp,cr,cp,mk,pg}});
  const nb=ctx.createBuffer(1,ctx.sampleRate*1.5,ctx.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;A.noise=nb;
  applyAll();
}
function soloOn(i){return !!(S.solos&&S.solos[i])||S.solo===i}function anySolo(){return S.solo>=0||!!(S.solos&&S.solos.some(Boolean))}
function soloTog(i){S.solos=S.solos||[];if(S.solo>=0){S.solos[S.solo]=1;S.solo=-1}S.solos[i]=S.solos[i]?0:1}
function isMuted(i){return (anySolo()?!soloOn(i):!!S.mute[i])||!!(typeof arrMuted==='function'&&arrMuted(i))}
function applyTrack(i){if(!ctx)return;const p=S.params[TRACKS[i].id],c=A.ch[i],t=ctx.currentTime;applyTfx(i);
  c.g.gain.setTargetAtTime(isMuted(i)?0:p.level,t,.01);if(c.pan)c.pan.pan.setTargetAtTime(p.pan,t,.02);
  c.se.gain.setTargetAtTime(p.echo,t,.02);c.ss.gain.setTargetAtTime(p.space,t,.02)}
function applyMaster(){if(!ctx)return;const m=S.master,t=ctx.currentTime,f=m.filter;
  A.lp.frequency.setTargetAtTime(f<0?200*Math.pow(100,1+f):20000,t,.03);
  A.hp.frequency.setTargetAtTime(f>0?20*Math.pow(100,f*1.15):20,t,.03);
  const X=S.fx,dr=X.tape.on?m.drive:0;A.shaper.curve=driveCurve(dr);/* 6 dB less into the tape stage (the mix peaks above 0 dBFS), made up after it – the compressor and limiter catch the peaks cleanly */A.pre.gain.setTargetAtTime((1+dr*.8)*.5/DRV_H,t,.03);A.post.gain.setTargetAtTime(DRV_H/(1+dr*.75)/.5,t,.03);
  A.tapeLp.frequency.setTargetAtTime(X.tape.on?3500*Math.pow(5.5,X.tape.color):20000,t,.05);A.crush.curve=crushCurve(X.crush.bits);
  A.crushWet.gain.setTargetAtTime(X.crush.on?X.crush.mix:0,t,.03);A.crushDry.gain.setTargetAtTime(X.crush.on?1-X.crush.mix*.6:1,t,.03);A.fb.gain.setTargetAtTime(X.echo.fb,t,.05);
  A.dRet.gain.setTargetAtTime(X.echo.on?m.echo:0,t,.03);A.rRet.gain.setTargetAtTime(X.space.on?m.space*.7:0,t,.03);
  A.dl.delayTime.setTargetAtTime(60/S.bpm*X.echo.time,t,.05);A.out.gain.setTargetAtTime(m.vol,t,.03)}
function applyAll(){TRACKS.forEach((_,i)=>applyTrack(i));applyMaster()}
function env(g,t,a,peak,dec){g.gain.cancelAndHoldAtTime(t);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+dec)}
function noiseSrc(t,dur){const s=ctx.createBufferSource();s.buffer=A.noise;s.start(t,Math.random()*.4);s.stop(t+dur+.05);return s}
let ohatGain=null;
const VOICE={
 kick(t,v,p,out){const o=ctx.createOscillator(),g=ctx.createGain(),tr=Math.pow(2,p.tune/12),d=.18+p.decay*.7;
   o.frequency.setValueAtTime(165*tr,t);o.frequency.exponentialRampToValueAtTime(48*tr,t+.045+p.tone*.05);o.frequency.exponentialRampToValueAtTime(38*tr,t+d);
   env(g,t,.002,v,d);o.connect(g);g.connect(out);o.start(t);o.stop(t+d+.05);
   const n=noiseSrc(t,.02),ng=ctx.createGain(),nf=ctx.createBiquadFilter();nf.type='highpass';nf.frequency.value=2500;env(ng,t,.001,v*.25*p.tone+.05,.012);n.connect(nf);nf.connect(ng);ng.connect(out);pump(t)},
 snare(t,v,p,out){const tr=Math.pow(2,p.tune/12),d=.09+p.decay*.3;
   const o=ctx.createOscillator(),og=ctx.createGain();o.type='triangle';o.frequency.setValueAtTime(240*tr,t);o.frequency.exponentialRampToValueAtTime(170*tr,t+.05);env(og,t,.001,v*.55,.1);o.connect(og);og.connect(out);o.start(t);o.stop(t+.2);
   const n=noiseSrc(t,d),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='highpass';f.frequency.value=900+p.tone*3500;env(g,t,.001,v*.7,d);n.connect(f);f.connect(g);g.connect(out)},
 clap(t,v,p,out){const d=.1+p.decay*.4,n=noiseSrc(t,d+.04),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='bandpass';f.frequency.value=(900+p.tone*1400)*Math.pow(2,p.tune/12);f.Q.value=1.6;
   g.gain.setValueAtTime(.0001,t);[0,.011,.022].forEach(o=>{g.gain.setValueAtTime(v*.9,t+o);g.gain.exponentialRampToValueAtTime(v*.15,t+o+.009)});
   g.gain.setValueAtTime(v*.8,t+.031);g.gain.exponentialRampToValueAtTime(.0001,t+.031+d);n.connect(f);f.connect(g);g.connect(out)},
 hat(t,v,p,out,open){const d=open?.12+p.decay*.6:.025+p.decay*.09,tr=Math.pow(2,p.tune/12);
   const g=ctx.createGain(),bp=ctx.createBiquadFilter(),hp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=9000*tr;bp.Q.value=.8;hp.type='highpass';hp.frequency.value=6000+p.tone*3000;
   [2,3,4.16,5.43,6.79,8.21].forEach(r=>{const o=ctx.createOscillator();o.type='square';o.frequency.value=160*r*tr;o.connect(bp);o.start(t);o.stop(t+d+.05)});
   const n=noiseSrc(t,d),ng=ctx.createGain();ng.gain.value=.5;n.connect(ng);ng.connect(hp);bp.connect(hp);hp.connect(g);g.connect(out);env(g,t,.001,v*.5,d);
   if(open)ohatGain=g;else if(ohatGain){try{ohatGain.gain.cancelAndHoldAtTime(t);ohatGain.gain.setTargetAtTime(.0001,t,.008)}catch(e){globalThis.__el&&globalThis.__el(e)}ohatGain=null}},
 perc(t,v,p,out){const tr=Math.pow(2,p.tune/12),d=.06+p.decay*.4,o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';
   o.frequency.setValueAtTime(420*tr,t);o.frequency.exponentialRampToValueAtTime(260*tr,t+d);env(g,t,.001,v*.8,d);o.connect(g);g.connect(out);o.start(t);o.stop(t+d+.05);
   const n=noiseSrc(t,.03),f=ctx.createBiquadFilter(),ng=ctx.createGain();f.type='bandpass';f.frequency.value=1800*tr;f.Q.value=3;env(ng,t,.001,v*p.tone*.9,.03);n.connect(f);f.connect(ng);ng.connect(out)},
 bass(t,v,p,out,_,note,len){melVoice('bass',t,v,p,out,note,len)},
 keys(t,v,p,out,_,note,len){melVoice('keys',t,v,p,out,note,len)},
 lead(t,v,p,out,_,note,len){melVoice('lead',t,v,p,out,note,len)},
 pad(t,v,p,out,_,note,len){melVoice('pad',t,v,p,out,note,len)},
};
/* live filter: voices register their filters so cutoff/resonance moves (mouse or MIDI CC) also bend notes that are already sounding.
   detune (cents) rides on top of the scheduled envelope, so the envelope shape is kept. */
const LIVEV=[];
function liveReg(o){if(!ctx)return;try{o.c0=o.cc();o.q0=o.qs.map(q=>q[1]());o.lc=0;o.lq=o.q0.slice();if(!isFinite(o.end))o.end=ctx.currentTime+6;o.end=Math.min(o.end,ctx.currentTime+40);LIVEV.push(o);if(LIVEV.length>160)LIVEV.splice(0,LIVEV.length-160)}catch(e){globalThis.__el&&globalThis.__el(e)}}
function liveTick(){if(!ctx||!LIVEV.length)return;const now=ctx.currentTime;
  for(let i=LIVEV.length-1;i>=0;i--){const o=LIVEV[i];if(now>o.end){LIVEV.splice(i,1);continue}
    const d=o.cc()-o.c0;if(isFinite(d)&&Math.abs(d-o.lc)>1.5){o.lc=d;o.fs.forEach(f=>{try{f.detune.setTargetAtTime(clamp(d,-9600,9600),now,.012)}catch(e){globalThis.__el&&globalThis.__el(e)}})}
    o.qs.forEach((q,k)=>{const v=q[1]();if(isFinite(v)&&Math.abs(v-o.lq[k])>.01){o.lq[k]=v;try{q[0].Q.setTargetAtTime(v,now,.015)}catch(e){globalThis.__el&&globalThis.__el(e)}}})}}
setInterval(liveTick,25);window.__live=LIVEV;
function synthVoice(t,v,p,out,note,len,sy,chord,sub){
  const gate=Math.max(.06,len*(.6+p.decay*3.4)),a=sy.a,d=sy.d,s=sy.s,r=sy.r;
  const base=Math.min(16000,70*Math.pow(160,sy.cut)*(.55+p.tone*.9)),peak=Math.min(18000,base*(1+sy.env*7)*(.7+v*.3));
  const f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='lowpass';f.Q.value=.5+sy.res*16;
  f.frequency.setValueAtTime(base,t);f.frequency.linearRampToValueAtTime(peak,t+a);f.frequency.setTargetAtTime(base+(peak-base)*s*.5,t+a,Math.max(.01,d/3));
  const lvl=v*(sub?.5:.42)/Math.sqrt(chord.length),te=t+Math.max(gate,a+.01),end=te+r+.2;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(lvl,t+a);g.gain.setTargetAtTime(lvl*Math.max(.001,s),t+a,Math.max(.01,d/3));
  g.gain.setTargetAtTime(.0001,te,Math.max(.01,r/4));f.frequency.setTargetAtTime(base,te,Math.max(.01,r/4));
  liveReg({fs:[f],cc:()=>8786*sy.cut+1200*Math.log2(.55+p.tone*.9),qs:[[f,()=>.5+sy.res*16]],end:end});
  chord.forEach((iv,k)=>{const fr=440*Math.pow(2,(note+iv-69+p.tune)/12);(sub?[0]:[-7,7]).forEach(dt=>{const o=ctx.createOscillator(),og=ctx.createGain();
    o.type=sy.wave;o.frequency.value=fr;glideOsc(o.frequency,fr,t);o.detune.value=dt;og.gain.value=sub?1:(k===0?.9:.55)/(1+k*.2);o.connect(og);og.connect(f);o.start(t);o.stop(end)})});
  if(sub){const o2=ctx.createOscillator(),g2=ctx.createGain();o2.type='square';o2.frequency.value=440*Math.pow(2,(note-81+p.tune)/12);glideOsc(o2.frequency,o2.frequency.value,t);g2.gain.value=sy.wave==='sine'?.15:.35;o2.connect(g2);g2.connect(f);o2.start(t);o2.stop(end)}
  f.connect(g);g.connect(out)}
