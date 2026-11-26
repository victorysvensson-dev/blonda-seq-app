/* ---------- Minimoog Model D clone: 3 VCOs (range LO–2′, 6 waveforms, osc 2/3 frequency), mixer with on/off + noise white/pink,
   osc 3 as LFO, modulation mix (osc 3 ↔ noise) to osc / filter, 24 dB ladder with emphasis + keyboard control, filter & loudness contours, decay switch ---------- */
const MG_WAVES={};
function mgWave(kind){if(MG_WAVES[kind])return MG_WAVES[kind];const N=64,re=new Float32Array(N),im=new Float32Array(N);
  for(let n=1;n<N;n++){const tri=(n%2?8/(Math.PI*Math.PI*n*n)*((((n-1)/2)%2)?-1:1):0),saw=2/(Math.PI*n)*(n%2?1:-1),pul=d=>2/(n*Math.PI)*Math.sin(n*Math.PI*d);
    if(kind==='tri')im[n]=tri;else if(kind==='shark')im[n]=tri*.6+saw*.4;else if(kind==='saw')im[n]=saw;else if(kind==='rsaw')im[n]=-saw;else if(kind==='sq')re[n]=pul(.5);else if(kind==='wide')re[n]=pul(.3);else if(kind==='narrow')re[n]=pul(.1)}
  MG_WAVES[kind]=ctx.createPeriodicWave(re,im);return MG_WAVES[kind]}
const MG_W12=['tri','shark','saw','sq','wide','narrow'],MG_W3=['tri','shark','rsaw','saw','sq','wide'];
function miniVoice(id,t,v,p,out,note,len){const E=engE('mini'),gate=Math.max(.04,len*(.6+(p.decay??.5)*3)),
    fA=shT(E.fA,6),fD=shT(E.fD,10),aA=shT(E.aA,6),aD=shT(E.aD,10),fR=E.decSw?fD:.012,aR=E.decSw?aD:.012,end=t+gate+Math.max(aR,fR)*5+.15;
  const last=mgLast[id],gl=E.glideOn&&E.glide>.01&&last&&t>last.t&&t-last.t<4,gt=.004+E.glide*E.glide*2;
  if(last&&last.g&&t>last.t){try{last.g.gain.cancelAndHoldAtTime(t);last.g.gain.setTargetAtTime(.0001,t,.006)}catch(e){globalThis.__el&&globalThis.__el(e)}}
  const key=note+p.tune,mix=ctx.createGain(),oscs=[];
  const oscF=(r,fine,track)=>{if(!track)return r===0?.12*Math.pow(2,(fine+7)/2):hz(48+12*(r-3)+fine);return r===0?hz(key)/256*Math.pow(2,fine/12):hz(key+12*(r-3)+fine)};
  const mk=(r,w,fine,lvl,on,waves,track)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.setPeriodicWave(mgWave(waves[w]||'saw'));const f=oscF(r,fine,track);
    if(track&&gl){const lf=oscF(r,fine,true)*last.f0r;o.frequency.setValueAtTime(lf,t);o.frequency.exponentialRampToValueAtTime(f,t+gt)}else o.frequency.setValueAtTime(f,t);if(track)glideOsc(o.frequency,f,t);
    o.detune.value=(Math.random()-.5)*4;g.gain.value=on?lvl*lvl*.36:0;o.connect(g);g.connect(mix);oscs.push(o);return {o,g}};
  if(gl)last.f0r=hz(last.key)/hz(key);
  const O1=mk(E.o1r,E.o1w,0,E.m1,E.m1on,MG_W12,true),O2=mk(E.o2r,E.o2w,E.o2f,E.m2,E.m2on,MG_W12,true),O3=mk(E.o3r,E.o3w,E.o3f,E.m3,E.m3on,MG_W3,!E.o3lfo);
  let nz=null;if(E.mnon&&E.mn>.01||E.modmix>.01){nz=ctx.createBufferSource();nz.buffer=A.noise;nz.loop=true;nz.start(t,Math.random());nz.stop(end)}
  const nzOut=nz?(()=>{if(!E.ncol)return nz;const pk=ctx.createBiquadFilter();pk.type='lowpass';pk.frequency.value=1200;pk.Q.value=.4;nz.connect(pk);return pk})():null;
  if(nz&&E.mnon&&E.mn>.01){const ng=ctx.createGain();ng.gain.value=E.mn*E.mn*.3;nzOut.connect(ng);ng.connect(mix)}
  /* overload: hot mixer levels drive the ladder like the original */
  const hot=(E.m1on?E.m1:0)+(E.m2on?E.m2:0)+(E.m3on?E.m3:0),sh=ctx.createWaveShaper(),pre=ctx.createGain();pre.gain.value=1+Math.max(0,hot-1.4)*1.6;sh.curve=dCurve(Math.min(.9,.1+Math.max(0,hot-1.2)*.35));
  const fs=[0,1,2].map(()=>{const f=ctx.createBiquadFilter();f.type='lowpass';f.Q.value=.5;return f});fs[2].Q.value=.6+Math.pow(E.emph,1.3)*18;
  const ktAmt=(E.kt1?1/3:0)+(E.kt2?2/3:0),base=Math.min(18000,30*Math.pow(2,E.cut*9.6)*Math.pow(2,(note-60)/12*ktAmt)*(.6+(p.tone??.5)*.8)),
    oc=E.contour*7,peak=Math.min(19000,base*Math.pow(2,oc)),sus=Math.min(19000,base*Math.pow(2,oc*E.fS));
  fs.forEach(f=>{f.frequency.setValueAtTime(base,t);f.frequency.linearRampToValueAtTime(peak,t+Math.max(.004,fA));f.frequency.setTargetAtTime(sus,t+fA,fD/3);f.frequency.setTargetAtTime(base,t+gate,fR/3)});
  liveReg({fs,cc:()=>1200*(9.6*E.cut+Math.log2(.6+(p.tone??.5)*.8)),qs:[[fs[2],()=>.6+Math.pow(E.emph,1.3)*18]],end:t+gate+fR*5+.5});
  /* modulation mix: osc 3 ↔ noise → osc pitch and/or filter */
  if(E.modAmt>.01&&(E.oscMod||E.filtMod)){const mm=ctx.createGain(),a3=ctx.createGain(),an=ctx.createGain();a3.gain.value=1-E.modmix;an.gain.value=E.modmix;O3.o.connect(a3);a3.connect(mm);if(nzOut){nzOut.connect(an);an.connect(mm)}
    const a=E.modAmt*E.modAmt;if(E.oscMod){const og=ctx.createGain();og.gain.value=a*1200;mm.connect(og);[O1.o,O2.o].forEach(o=>og.connect(o.detune));if(!E.o3lfo)og.connect(O3.o.detune)}
    if(E.filtMod){const fg=ctx.createGain();fg.gain.value=a*base*3;mm.connect(fg);fs.forEach(f=>fg.connect(f.frequency))}}
  const g=ctx.createGain(),lvl=v*.3*(.4+E.vol*.9)/(1+E.emph*.5);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(lvl,t+Math.max(.003,aA));g.gain.setTargetAtTime(Math.max(.0001,lvl*E.aS),t+aA,aD/3);g.gain.setTargetAtTime(.0001,t+Math.max(gate,aA),aR/3);
  mix.connect(pre);pre.connect(sh);sh.connect(fs[0]);fs[0].connect(fs[1]);fs[1].connect(fs[2]);fs[2].connect(g);g.connect(out);oscs.forEach(o=>{o.start(t);o.stop(end)});
  mgLast[id]={t,key,g,f0r:1};if(typeof cloneLed==='function')cloneLed('mini',t)}

