/* ---------- SH-101 clone: modulator (tri/sq/rand/noise), VCO (range, PW + PWM source), source mixer (pulse, saw, sub 3 modes, noise),
   24 dB VCF (freq, res, env, mod, kybd), VCA env/gate, ADSR, portamento off/on/auto ---------- */
const shLast={},mgLast={};
function engE(k){if(!S.eng[k])S.eng[k]=JSON.parse(JSON.stringify(DEFS.eng[k]));return S.eng[k]}
function monoGlide(store,id,prm,fr,t,len,amt){const last=store[id];if(last&&last.g&&t>last.t){try{last.g.gain.cancelAndHoldAtTime(t);last.g.gain.setTargetAtTime(.0001,t,.008)}catch(e){globalThis.__el&&globalThis.__el(e)}}
  const gl=amt>0&&last&&t>last.t&&t-last.t<len*1.8;if(gl){prm.setValueAtTime(last.f,t);prm.exponentialRampToValueAtTime(fr,t+.005+amt)}else prm.setValueAtTime(fr,t);return gl}
const shT=(v,mx)=>.0015+v*v*mx;
function shLfo(E,t,end){const rate=.1*Math.pow(2,E.lfoR*7.2);let src;
  if(E.lfoW===2){src=ctx.createConstantSource();for(let tt=t;tt<end;tt+=1/rate)src.offset.setValueAtTime(Math.random()*2-1,tt)}
  else if(E.lfoW===3){src=ctx.createBufferSource();src.buffer=A.noise;src.loop=true}
  else{src=ctx.createOscillator();src.type=E.lfoW===1?'square':'triangle';src.frequency.value=rate}
  src.start(t);src.stop(end);return {src,rate}}
function sh101Voice(id,t,v,p,out,note,len){const E=engE('sh101'),oct=[-1,0,1,2][E.range]??0,fr=hz(note+p.tune+12*oct),gate=Math.max(.04,len*(.55+(p.decay??.5)*2.4)),
    aA=shT(E.A,4),aD=shT(E.D,10),aR=shT(E.R,10),end=t+gate+aR*5+.15,acc=v>=.95;
  const last=shLast[id],legato=last&&t>last.t&&t-last.t<(last.gate||len)+.01,glOn=E.portaMode===1||(E.portaMode===2&&legato),gt=.004+E.porta*E.porta*1.6;
  if(last&&last.g&&t>last.t){try{last.g.gain.cancelAndHoldAtTime(t);last.g.gain.setTargetAtTime(.0001,t,.006)}catch(e){globalThis.__el&&globalThis.__el(e)}}
  const setF=(prm,m)=>{if(glOn&&last&&E.porta>.01){prm.setValueAtTime(last.f*m,t);prm.exponentialRampToValueAtTime(fr*m,t+gt)}else prm.setValueAtTime(fr*m,t);glideOsc(prm,fr*m,t)};
  const L=shLfo(E,t,end),mix=ctx.createGain();
  /* VCO: saw + variable pulse (saw minus delayed saw) */
  const saw=ctx.createOscillator(),ps=ctx.createOscillator(),dl=ctx.createDelay(.2),inv=ctx.createGain(),pg=ctx.createGain(),sg=ctx.createGain();saw.type=ps.type='sawtooth';inv.gain.value=-1;
  setF(saw.frequency,1);setF(ps.frequency,1);ps.connect(pg);ps.connect(dl);dl.connect(inv);inv.connect(pg);
  const w0=E.pwmSrc===1?.5+E.pw*.45:.5;dl.delayTime.setValueAtTime(w0/fr,t);
  if(E.pwmSrc===0&&E.pw>.01){const lg=ctx.createGain();lg.gain.value=E.pw*.42/fr;L.src.connect(lg);lg.connect(dl.delayTime)}
  if(E.pwmSrc===2&&E.pw>.01){dl.delayTime.linearRampToValueAtTime((.5+E.pw*.45)/fr,t+aA);dl.delayTime.setTargetAtTime((.5+E.pw*.45*E.S)/fr,t+aA,aD/3);dl.delayTime.setTargetAtTime(.5/fr,t+gate,aR/3)}
  sg.gain.value=E.saw*.5;pg.gain.value=E.pulse*.44;saw.connect(sg);sg.connect(mix);pg.connect(mix);
  /* sub: −1 oct square, −2 oct square, −2 oct 25 % pulse */
  const sub=ctx.createOscillator(),ub=ctx.createGain();if(E.subMode===2)sub.setPeriodicWave(chipWave(.25));else sub.type='square';setF(sub.frequency,E.subMode===0?.5:.25);ub.gain.value=E.sub*.45;sub.connect(ub);ub.connect(mix);
  if(E.noise>.01){const n=ctx.createBufferSource(),ng=ctx.createGain();n.buffer=A.noise;n.loop=true;ng.gain.value=E.noise*.35;n.connect(ng);ng.connect(mix);n.start(t,Math.random());n.stop(end)}
  if(E.vcoMod>.01){const vg=ctx.createGain();vg.gain.value=E.vcoMod*E.vcoMod*700;L.src.connect(vg);[saw,ps,sub].forEach(o=>vg.connect(o.detune))}
  /* VCF: 24 dB, env, LFO mod, keyboard follow */
  const f1=ctx.createBiquadFilter(),f2=ctx.createBiquadFilter();f1.type=f2.type='lowpass';f1.Q.value=.55;f2.Q.value=.6+Math.pow(E.res,1.25)*19;
  const kt=Math.pow(2,(note-60)/12*E.kybd),base=Math.min(18000,22*Math.pow(2,E.cut*9.8)*kt*(.6+(p.tone??.5)*.8)),oc=E.env*7*(acc?1.25:1),peak=Math.min(19000,base*Math.pow(2,oc)),sus=Math.min(19000,base*Math.pow(2,oc*E.S));
  [f1,f2].forEach(f=>{f.frequency.setValueAtTime(base,t);f.frequency.linearRampToValueAtTime(peak,t+Math.max(.003,aA));f.frequency.setTargetAtTime(sus,t+aA,aD/3);f.frequency.setTargetAtTime(base,t+gate,aR/3)});
  liveReg({fs:[f1,f2],cc:()=>1200*(9.8*E.cut+Math.log2(.6+(p.tone??.5)*.8)),qs:[[f2,()=>.6+Math.pow(E.res,1.25)*19]],end:t+gate+aR*5+.5});
  if(E.vcfMod>.01){const fm=ctx.createGain();fm.gain.value=E.vcfMod*E.vcfMod*base*3;L.src.connect(fm);fm.connect(f1.frequency);fm.connect(f2.frequency)}
  /* VCA: envelope or gate */
  const g=ctx.createGain(),lvl=v*(acc?.66:.54)/(1+E.res*.8)*(.4+E.vol*.9);g.gain.setValueAtTime(.0001,t);
  if(E.vcaMode===1){g.gain.linearRampToValueAtTime(lvl,t+.003);g.gain.setValueAtTime(lvl,t+gate);g.gain.linearRampToValueAtTime(.0001,t+gate+.006)}
  else{g.gain.linearRampToValueAtTime(lvl,t+Math.max(.003,aA));g.gain.setTargetAtTime(Math.max(.0001,lvl*E.S),t+aA,aD/3);g.gain.setTargetAtTime(.0001,t+Math.max(gate,aA),aR/3)}
  mix.connect(f1);f1.connect(f2);f2.connect(g);g.connect(out);[saw,ps,sub].forEach(o=>{o.start(t);o.stop(end)});shLast[id]={t,f:fr,g,gate};if(typeof cloneLed==='function')cloneLed('sh101',t)}
