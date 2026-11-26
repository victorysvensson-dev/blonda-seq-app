/* ---------- BRIS: 6-voice poly analog (one VCO + sub per voice, 24 dB ladder, 2× ADSR, LFO, chorus + delay) ---------- */
const BR_DEF=DEFS.eng.bris;
const brT=(v,mx)=>.002+v*v*mx;/* envelope time curve */
const BR_LFO_DIV=[4,2,1,.5,.25,1/6];/* beats per cycle when synced: 1/1,1/2,1/4,1/8,1/16,1/16T */
const BR_DLY=[[.5,'1/8'],[.75,'1/8.'],[1,'1/4'],[.25,'1/16'],[1/3,'1/8T'],[1.5,'1/4.']];
const brPool=new Map(),brLast={},brFx=new WeakMap();let brWaves={};
function brPulse(d){const k=Math.round(d*40);if(brWaves[k])return brWaves[k];const N=48,re=new Float32Array(N),im=new Float32Array(N),dd=k/40;
  for(let n=1;n<N;n++)re[n]=2/(n*Math.PI)*Math.sin(n*Math.PI*dd);brWaves[k]=ctx.createPeriodicWave(re,im);return brWaves[k]}
/* chorus (Juno-style, two modes) + tempo delay, one per destination channel */
function brFxFor(out){let fx=brFx.get(out);if(fx)return fx;const inp=ctx.createGain(),dry=ctx.createGain(),sum=ctx.createGain();inp.connect(dry);dry.connect(sum);sum.connect(out);
  const mk=(pan)=>{const d=ctx.createDelay(.05),l=ctx.createOscillator(),lg=ctx.createGain(),p=ctx.createStereoPanner?ctx.createStereoPanner():ctx.createGain(),g=ctx.createGain();
    d.delayTime.value=.0045;lg.gain.value=0;g.gain.value=0;l.type='triangle';l.connect(lg);lg.connect(d.delayTime);inp.connect(d);d.connect(g);g.connect(p);if(p.pan)p.pan.value=pan;p.connect(sum);l.start();return {d,l,lg,g}};
  const cA=mk(-.85),cB=mk(.85);
  const dIn=ctx.createGain(),dl=ctx.createDelay(3),dFb=ctx.createGain(),dLp=ctx.createBiquadFilter(),dHp=ctx.createBiquadFilter(),dOut=ctx.createGain();dLp.type='lowpass';dLp.frequency.value=3800;dFb.gain.value=0;dOut.gain.value=0;dHp.type='highpass';dHp.frequency.value=180;
  sum.disconnect();sum.connect(out);sum.connect(dIn);dIn.connect(dHp);dHp.connect(dl);dl.connect(dLp);dLp.connect(dFb);dFb.connect(dl);dLp.connect(dOut);dOut.connect(out);
  fx={inp,dry,cA,cB,dl,dFb,dOut};brFx.set(out,fx);brFxApply(fx,true);return fx}
function brFxApply(fx,now){const E=engE('bris'),t=ctx.currentTime,m=E.cho?E.choMix:0,II=E.cho===2;
  if(now){const bd=60/S.bpm*(BR_DLY[E.dlyT]||BR_DLY[2])[0];fx.dl.delayTime.setValueAtTime(Math.min(2.9,bd),t);fx.dFb.gain.setValueAtTime(E.dlyFb*.85,t);fx.dOut.gain.setValueAtTime(E.dly*.7,t);fx.dry.gain.setValueAtTime(1-m*.35,t);[fx.cA,fx.cB].forEach((c,i)=>{c.g.gain.setValueAtTime(m*.75,t);c.d.delayTime.setValueAtTime(II?.0052:.0042,t);c.lg.gain.setValueAtTime(II?.0028:.0018,t);c.l.frequency.setValueAtTime((II?.83:.51)*(i?1.07:1),t)})}
  fx.dry.gain.setTargetAtTime(1-m*.35,t,.02);[fx.cA,fx.cB].forEach((c,i)=>{c.g.gain.setTargetAtTime(m*.75,t,.02);c.l.frequency.setTargetAtTime((II?.83:.51)*(i?1.07:1),t,.05);c.lg.gain.setTargetAtTime(II?.0028:.0018,t,.05);
    c.d.delayTime.setTargetAtTime(II?.0052:.0042,t,.05)});
  const bd=60/S.bpm*(BR_DLY[E.dlyT]||BR_DLY[2])[0];fx.dl.delayTime.setTargetAtTime(Math.min(2.9,bd),t,.04);fx.dFb.gain.setTargetAtTime(E.dlyFb*.85,t,.03);fx.dOut.gain.setTargetAtTime(E.dly*.7,t,.03)}
function brisApplyAll(){if(!ctx)return;A.ch.forEach(ch=>{const o=ch.inp||ch.g,fx=brFx.get(o);if(fx)brFxApply(fx)})}
function brSteal(id,t){let pool=brPool.get(id);if(!pool){pool=[];brPool.set(id,pool)}const now=ctx.currentTime;for(let k=pool.length-1;k>=0;k--)if(pool[k].end<now)pool.splice(k,1);
  const E=engE('bris'),lim=E.vmode===1?1:6;while(pool.length>=lim){const o=pool.shift();try{o.g.gain.cancelAndHoldAtTime(t);o.g.gain.setTargetAtTime(0,t,.008)}catch(e){globalThis.__el&&globalThis.__el(e)}}return pool}
function brChan(id,out){const i=TRACKS.findIndex(x=>x.id===id),ch=A.ch&&A.ch[i],ci=ch&&(ch.inp||ch.g);if(!ci||out===ci||ci.context!==out.context)return {fx:brFxFor(out),to:null};
  const fx=brFxFor(ci);if(!out._brR){try{out.disconnect();out.connect(fx.inp);out._brR=1}catch(e){globalThis.__el&&globalThis.__el(e)}}return {fx,to:out}}
function brisVoice(id,t,v,p,out,note,len,vc){const E=engE('bris'),BC=brChan(id,out),fx=BC.fx,notes=(E.vmode===1?[0]:vc).map(iv=>note+iv);
  const gate=Math.max(.03,len*(.5+(p.decay??.5)*2)),aA=brT(E.aA,6),aD=brT(E.aD,8),aR=brT(E.aR,10),fA=brT(E.fA,6),fD=brT(E.fD,8),fR=brT(E.fR,10);
  notes.forEach((n,ni)=>{const pool=brSteal(id,t),fr=hz(n+p.tune),end=t+gate+aR*5+.2;
    const vg=ctx.createGain(),mix=ctx.createGain(),f1=ctx.createBiquadFilter(),f2=ctx.createBiquadFilter(),sh=ctx.createWaveShaper();sh.curve=dCurve(.12);
    f1.type=f2.type='lowpass';f1.Q.value=.5;f2.Q.value=.5+Math.pow(E.res,1.5)*16;
    const uni=E.vmode===2?[-1,0,1]:[0],oscs=[];const drift=()=>(Math.random()-.5)*E.drift*14;
    const gl=E.glide>0&&brLast[id]&&t-brLast[id].t<4,from=gl?brLast[id].f*Math.pow(2,(n-notes[0])/12):fr,gt=.005+E.glide*E.glide*1.2;
    const setF=(prm,mult)=>{if(gl){prm.setValueAtTime(from*mult,t);prm.exponentialRampToValueAtTime(fr*mult,t+gt)}else prm.setValueAtTime(fr*mult,t);glideOsc(prm,fr*mult,t)};
    uni.forEach(u=>{const o1=ctx.createOscillator(),g1=ctx.createGain();if(E.wave===1)o1.setPeriodicWave(brPulse(.08+E.pw*.84));else o1.type='sawtooth';setF(o1.frequency,1);o1.detune.value=drift()+u*E.det*22-E.det*4;
      g1.gain.value=(.5/uni.length)*(uni.length>1?1.4:1);o1.connect(g1);g1.connect(mix);oscs.push(o1);
      if(E.det>.02){const o2=ctx.createOscillator(),g2=ctx.createGain();if(E.wave===1)o2.setPeriodicWave(brPulse(.08+E.pw*.84));else o2.type='sawtooth';setF(o2.frequency,1);o2.detune.value=drift()+E.det*16+u*E.det*22;
        g2.gain.value=Math.min(1,E.det*2.6)*.34/uni.length;o2.connect(g2);g2.connect(mix);oscs.push(o2)}});
    if(E.sub>.01){const s=ctx.createOscillator(),sg=ctx.createGain();s.type='square';setF(s.frequency,.5);sg.gain.value=E.sub*.42;s.connect(sg);sg.connect(mix);oscs.push(s)}
    if(E.noise>.01){const ns=ctx.createBufferSource(),ng=ctx.createGain();ns.buffer=A.noise;ns.loop=true;ng.gain.value=E.noise*.3;ns.connect(ng);ng.connect(mix);ns.start(t,Math.random());ns.stop(end)}
    /* filter: base cutoff + key tracking + velocity, envelope in octaves */
    const kt=Math.pow(2,(n-60)/12*E.kt),base=Math.min(18000,24*Math.pow(2,E.cut*9.6)*kt*(.6+(p.tone??.5)*.8)),vel=1-E.fvel+E.fvel*v,oct=E.fenv*7*vel,
      peak=Math.min(19000,base*Math.pow(2,oct)),sus=Math.min(19000,base*Math.pow(2,oct*E.fS));
    [f1,f2].forEach(f=>{f.frequency.setValueAtTime(base,t);f.frequency.linearRampToValueAtTime(peak,t+Math.max(.008,fA));f.frequency.setTargetAtTime(sus,t+fA,fD/3);f.frequency.setTargetAtTime(base,t+gate,fR/3)});
    liveReg({fs:[f1,f2],cc:()=>1200*(9.6*E.cut+Math.log2(.6+(p.tone??.5)*.8)),qs:[[f2,()=>.5+Math.pow(E.res,1.5)*16]],end});
    /* amp ADSR */
    const lvl=v*.4*(.4+E.vol*.9)/Math.sqrt(Math.max(1,notes.length))*(1/(1+E.res*.5)),aA2=Math.max(.005,aA);vg.gain.setValueAtTime(0,t);vg.gain.linearRampToValueAtTime(lvl,t+aA2);
    vg.gain.setTargetAtTime(Math.max(.0001,lvl*E.aS),t+aA,aD/3);vg.gain.setTargetAtTime(.0001,t+Math.max(gate,aA),aR/3);
    /* LFO (per voice, key-synced): tri, ramp up, ramp down, square, sample & hold */
    if(E.lfoAmt>.01){const rate=E.lfoSync?1/(60/S.bpm*BR_LFO_DIV[Math.min(5,Math.round(E.lfoR*5))]):.08*Math.pow(2,E.lfoR*7.5),lg=ctx.createGain(),src=[];
      if(E.lfoW===4){const cs=ctx.createConstantSource();const st=1/rate;for(let tt=t;tt<end;tt+=st)cs.offset.setValueAtTime(Math.random()*2-1,tt);cs.connect(lg);src.push(cs)}
      else{const l=ctx.createOscillator();l.type=['triangle','sawtooth','sawtooth','square'][E.lfoW]||'triangle';l.frequency.value=rate;if(E.lfoW===2){const inv=ctx.createGain();inv.gain.value=-1;l.connect(inv);inv.connect(lg)}else l.connect(lg);src.push(l)}
      const a=E.lfoAmt*E.lfoAmt;if(E.lfoDest===0){lg.gain.value=a*120;oscs.forEach(o=>lg.connect(o.detune))}
      else if(E.lfoDest===1){lg.gain.value=a*base*2.2;lg.connect(f1.frequency);lg.connect(f2.frequency)}
      else{const tg=ctx.createGain();tg.gain.value=1-a*.5;lg.gain.value=a*.5;mix.disconnect();mix.connect(tg);tg.connect(sh);lg.connect(tg.gain)}
      src.forEach(s=>{s.start(t);s.stop(end)})}
    if(!(E.lfoAmt>.01&&E.lfoDest===2))mix.connect(sh);sh.connect(f1);f1.connect(f2);f2.connect(vg);vg.connect(BC.to||fx.inp);
    oscs.forEach(o=>{o.start(t);o.stop(end)});pool.push({g:vg,end,t});if(ni===notes.length-1)brLast[id]={t,f:fr}});
  if(typeof brisLed==='function')brisLed(id,t,notes.length)}

/* sidechain pump: at max the ducked signal is fully silent while the kick hits, then breathes back in */
function duckAt(g,t,a,base){const dip=Math.min(1,Math.pow(a,.7)),floor=dip>=.999?0:Math.max(0,1-dip),over=Math.max(0,a-1),hold=.02+Math.min(a,1)*.13+over*.3,rel=.04+Math.min(a,1)*.2+over*1.1;if(g.cancelAndHoldAtTime)g.cancelAndHoldAtTime(t);else{g.cancelAndHoldAtTime(t);g.setValueAtTime(g.value,t)}
  g.linearRampToValueAtTime(floor*base,t+.004);g.setValueAtTime(floor*base,t+.004+hold);g.setTargetAtTime(base,t+.004+hold,rel/3)}
function pump(t){if(A.ch)TRACKS.forEach((tr,i)=>{const a=(S.tfx&&S.tfx[tr.id]||{}).pump||0,c=A.ch[i];if(!a||!c||!c.pg||i===0)return;duckAt(c.pg.gain,t,a,1)});
  const depth=S.master.pump;if(!depth||!A.duck)return;duckAt(A.duck.gain,t,depth,1)}
const hitT=new (class extends Map{
  _a(i){if(!this._q)this._q=new Map();let a=this._q.get(i);if(!a)this._q.set(i,a=[]);return a}
  _trim(a){const now=ctx?ctx.currentTime:0;while(a.length>1&&a[1].t<=now)a.shift();if(a.length>32)a.splice(0,a.length-32)}
  set(i,h){const a=this._a(i);let k=a.length;while(k>0&&a[k-1].t>h.t)k--;a.splice(k,0,h);this._trim(a);return super.set(i,h)}
  get(i){const a=this._q&&this._q.get(i);if(!a||!a.length)return undefined;this._trim(a);return a[0]}
  forEach(cb,th){super.forEach((_,i)=>cb.call(th,this.get(i),i,this))}})();window.__hitT=hitT;
function trigger(i,t,vel,note,ls){return window.__trgCap?__trgCap(t,()=>trigger0(i,t,vel,note,ls)):trigger0(i,t,vel,note,ls)}
function trigger0(i,t,vel,note,ls){if(!ctx)return;const tr=TRACKS[i],p0=S.params[tr.id],sp=!tr.mel&&typeof SFX!=='undefined'&&SFX&&SFX.pt?SFX.pt:0,p=gTune||sp?Object.assign({},p0,{tune:p0.tune+gTune+sp}):p0,out=ckOut(i,t,A.ch[i].inp||A.ch[i].g),len=60/S.bpm/4*(ls||1);
  if(tr.id==='kick'&&isMuted(i))return;
  const dkk=tr.id==='ohat'?'hat':tr.id,dm=S.dk&&S.dk[tr.id],alt=dm&&DKV[dkk]&&DKV[dkk][dm];
  if(dm&&dm.startsWith('smp:'))smpVoice(dm.slice(4),t,vel,p,out,tr.id);else if(alt)alt(t,vel,p,out,tr.id==='ohat');else if(tr.id==='hat')VOICE.hat(t,vel,p,out,false);else if(tr.id==='ohat')VOICE.hat(t,vel,p,out,true);else VOICE[tr.id](t,vel,p,out,null,note,len);
  if(SCHED&&window.MIDIX&&MIDIX.notesOut)MIDIX.note(i,t,vel,note,len);
  if(!isMuted(i))hitT.set(i,{t,v:vel})}

