/* ---------- the engine: works on any BaseAudioContext (the live one, or an offline one for tests) ----------
   layers (each its own level) → drive → filter → chorus (two modulated delays, L and R apart: the wide, soft sound) ┐
   sub ───────────────────────────────────────────────────────────────────────────────────────────────────────────┴→ tape
   (wow delay + warm saturation + top roll-off) → fx (stutter/rev/…) → eko · rum (cut with the phrase) → pump → volym → synth bus */
/* chorus depth in seconds (±), shared with the stem copies */
const STX_CHD=.0012;
function stxEngine(c,dest){const E={c,vo:{ack:[],klo:[],sub:[],luft:[],sw:[]},fxw:null,lastTop:0,lg:{}};
  const G=(v=1)=>{const n=c.createGain();n.gain.value=v;return n},sr=c.sampleRate;
  E.inS=G();E.inSub=G();E.dpre=G();E.drv=c.createWaveShaper();E.drv.oversample='2x';E.dpost=G();
  /* v191: each layer gets its own tone before they meet in the shared chain, so they stop masking each other: the chords
     leave the lowest end to the sub, the air (pad) sits above the chords' body, the top line gets room and a little presence */
  E.leq={};const LEQ={ack:[['highpass',110,.5]],sw:[['highpass',110,.5]],luft:[['highpass',190,.6],['peaking',420,.9,-2.5]],klo:[['highpass',260,.6],['peaking',2900,.8,2.5]]};
  /* v214: each layer then passes its synth track's strip (fader, pan, mute/solo) before the shared chain */
  E.ln={};const lane=(l,to)=>{const g=G(1),pn=c.createStereoPanner?c.createStereoPanner():null;
    /* the track's insert fx (drive → lowpass → highpass → crush → comp), the same as on the track's own channel; neutral until used */
    const fx={dpre:G(1),dsh:c.createWaveShaper(),dpost:G(1),flp:c.createBiquadFilter(),fhp:c.createBiquadFilter(),cr:c.createWaveShaper(),cp:c.createDynamicsCompressor(),mk:G(1)};
    fx.dsh.oversample='2x';fx.flp.type='lowpass';fx.fhp.type='highpass';fx.flp.frequency.value=20000;fx.fhp.frequency.value=18;fx.cp.threshold.value=0;fx.cp.ratio.value=1;fx.cp.attack.value=.006;fx.cp.release.value=.12;fx.cp.knee.value=6;
    g.connect(fx.dpre);fx.dpre.connect(fx.dsh);fx.dsh.connect(fx.dpost);fx.dpost.connect(fx.flp);fx.flp.connect(fx.fhp);fx.fhp.connect(fx.cr);fx.cr.connect(fx.cp);fx.cp.connect(fx.mk);
    if(pn){fx.mk.connect(pn);pn.connect(to)}else fx.mk.connect(to);E.ln[l]={g,pn,fx};return g};
  lane('ack',E.inS);lane('klo',E.inS);lane('luft',E.inS);lane('sub',E.inSub);
  ['ack','klo','luft','sw'].forEach(l=>{E.lg[l]=G();let n=E.lg[l];E.leq[l]=(LEQ[l]||[]).map(([ty,f,q,gn])=>{const b=c.createBiquadFilter();b.type=ty;b.frequency.value=f;b.Q.value=q;if(gn!=null)b.gain.value=gn;n.connect(b);n=b;return b});n.connect(E.ln[l==='sw'?'ack':l].g)});E.lg.sub=G();E.lg.sub.connect(E.ln.sub.g);
  E.flt=c.createBiquadFilter();E.flt.type='lowpass';E.flt.Q.value=.6;E.flt.frequency.value=2000;
  E.inS.connect(E.dpre);E.dpre.connect(E.drv);E.drv.connect(E.dpost);E.dpost.connect(E.flt);
  E.mix=G();E.chD=G(.8);E.cL=c.createDelay(.05);E.cR=c.createDelay(.05);E.cwL=G(.5);E.cwR=G(.5);const cm=c.createChannelMerger(2),lfo=c.createOscillator(),lA=G(STX_CHD),lB=G(-STX_CHD);
  E.cL.delayTime.value=.0068;E.cR.delayTime.value=.0127;lfo.frequency.value=.52;lfo.connect(lA);lfo.connect(lB);lA.connect(E.cL.delayTime);lB.connect(E.cR.delayTime);lfo.start();E.lfoC=lfo;E.lfoT0=c.currentTime;
  E.chHp=c.createBiquadFilter();E.chHp.type='highpass';E.chHp.frequency.value=240;E.chHp.Q.value=.5;E.flt.connect(E.chD);E.chD.connect(E.mix);E.flt.connect(E.chHp);E.chHp.connect(E.cL);E.chHp.connect(E.cR);E.cL.connect(E.cwL);E.cR.connect(E.cwR);E.cwL.connect(cm,0,0);E.cwR.connect(cm,0,1);cm.connect(E.mix);
  E.inSub.connect(E.mix);
  E.wow=c.createDelay(.3);E.wowB=.016;E.wow.delayTime.value=E.wowB;const w1=c.createOscillator(),w2=c.createOscillator();E.wg1=G(0);E.wg2=G(0);w1.frequency.value=.47;w2.frequency.value=1.9;
  w1.connect(E.wg1);w2.connect(E.wg2);E.wg1.connect(E.wow.delayTime);E.wg2.connect(E.wow.delayTime);w1.start();w2.start();E.w1=w1;E.w2=w2;
  E.tsat=c.createWaveShaper();E.tsat.oversample='2x';E.tlp=c.createBiquadFilter();E.tlp.type='lowpass';E.tlp.Q.value=.5;E.tlp.frequency.value=14000;
  E.tpre=G(.5);E.tpost=G(2);E.mix.connect(E.wow);E.wow.connect(E.tpre);E.tpre.connect(E.tsat);E.tsat.connect(E.tpost);E.tpost.connect(E.tlp);E.air=c.createBiquadFilter();E.air.type='highshelf';E.air.frequency.value=7000;E.air.gain.value=3;
  E.post=G();E.out=G();E.pump=G();E.vol=G();E.an=c.createAnalyser();E.an.fftSize=1024;E.tlp.connect(E.air);E.air.connect(E.post);
  E.sHp=c.createBiquadFilter();E.sHp.type='highpass';E.sHp.frequency.value=300;E.post.connect(E.sHp);
  /* v193: the atmosphere bed (vinyl / rain / room), looped, only while playing; level = the "atmos" knob */
  E.atmG=G(0);E.atmG.connect(E.post);E.atmK='';E.atmS=null;E.atmSet=(kind,lv,t)=>{if(kind!==E.atmK){E.atmK=kind;try{if(E.atmS)E.atmS.stop()}catch(e){globalThis.__el&&globalThis.__el(e)}const s=c.createBufferSource();s.buffer=insAtmos(c,kind);s.loop=true;s.connect(E.atmG);s.start();E.atmS=s}E.atmG.gain.setTargetAtTime(lv,t,.4)};
  E.eS=G(0);E.rS=G(0);E.sHp.connect(E.eS);E.sHp.connect(E.rS);
  const dl=c.createDelay(2),dr=c.createDelay(2),fb=G(.28),fl=c.createBiquadFilter(),mg=c.createChannelMerger(2),eo=G(.75);fl.type='lowpass';fl.frequency.value=2300;
  E.eS.connect(dl);dl.connect(fl);fl.connect(dr);dr.connect(fb);fb.connect(dl);dl.connect(mg,0,0);dr.connect(mg,0,1);E.eG=G(1);E.rG=G(1);mg.connect(eo);eo.connect(E.eG);E.eG.connect(E.out);E.dl=dl;E.dr=dr;
  {const L=Math.round(sr*1.1),b=c.createBuffer(2,L,sr);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);let lp=0,lp2=0;for(let i=0;i<L;i++){const t=i/sr;lp+=((Math.random()*2-1)-lp)*.2;lp2+=(lp-lp2)*.35;d[i]=lp2*Math.exp(-t/.17)*(t<.01?t/.01:1)}}
    E.cv=c.createConvolver();E.cv.normalize=true;E.cv.buffer=b;const ro=G(.6);E.rS.connect(E.cv);E.cv.connect(ro);ro.connect(E.rG);E.rG.connect(E.out)}
  E.post.connect(E.out);E.out.connect(E.pump);E.pump.connect(E.vol);E.vol.connect(dest);E.vol.connect(E.an);
  E.lg.s0=G();E.lg.s1=G();
  {const dl=c.createDelay(2),dr=c.createDelay(2),fb=G(.36),lp=c.createBiquadFilter(),hp=c.createBiquadFilter(),mg=c.createChannelMerger(2),eo=G(.7);lp.type='lowpass';lp.frequency.value=4200;hp.type='highpass';hp.frequency.value=280;
    E.sDin=G();E.sDin.connect(hp);hp.connect(dl);dl.connect(lp);lp.connect(dr);dr.connect(fb);fb.connect(dl);dl.connect(mg,0,0);dr.connect(mg,0,1);mg.connect(eo);eo.connect(E.out);E.sDl=dl;E.sDr=dr;
    const L=Math.round(sr*2.4),b=c.createBuffer(2,L,sr);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);let lp2=0;for(let i=0;i<L;i++){const t=i/sr,w=Math.random()*2-1;lp2+=(w-lp2)*.55;d[i]=(w-lp2*.6)*Math.exp(-t/.55)*(t<.008?t/.008:1)}}
    const cv=c.createConvolver();cv.normalize=true;cv.buffer=b;E.sCv=cv;E.sRin=G();const ro=G(.55),rh=c.createBiquadFilter();rh.type='highpass';rh.frequency.value=350;E.sRin.connect(rh);rh.connect(cv);cv.connect(ro);ro.connect(E.out)}
  E.sx=[0,1].map(k=>{const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=150;hp.Q.value=.6;const dS=G(0),rS=G(0);E.lg['s'+k].connect(lane('s'+k,hp));hp.connect(E.mix);hp.connect(dS);hp.connect(rS);dS.connect(E.sDin);rS.connect(E.sRin);return {dS,rS,hp}});
  /* a sample slot: the slice (or the one-shot) pitched to the chord — playbackRate, so it gets shorter going up, like a sampler */
  E.smpPlay=(t,k,ev,sd,plan)=>{const Q=E.P.smp&&E.P.smp[k],D=Q&&STX.sb[Q.id];if(!D||!D.sl||!D.sl.length)return;const ch=plan.ch[ev.ci]||plan.ch[0];
    const shiftTo=(own,tg)=>{let bd=99;for(const pc of tg){let d=((pc-own)%12+12)%12;if(d>6)d-=12;if(Math.abs(d)<Math.abs(bd))bd=d}return bd};
    let sl,BUF=D.buf,REV=D.rev;
    if(D.kit){const tg=(ch.iv||[0]).map(v=>(ch.r+v)%12),long=ev.l*sd>=.5,c=D.kit.filter(x=>long||!x.whole).map(x=>({x,d:shiftTo(x.n,tg)})),near=c.filter(q=>Math.abs(q.d)<=1.5),pool=near.length>=2?near:c.filter(q=>Math.abs(q.d)<=4);
      const pk=(pool.length?pool:c)[Math.floor(ev.r*(pool.length||c.length))];if(!pk)return;BUF=pk.x.buf;REV=pk.x.rev;sl={a:0,b:pk.x.buf.duration,n:pk.x.n}}
    else sl=D.sl[Math.min(D.sl.length-1,Math.floor(ev.r*D.sl.length))];
    const pcs=(ch.iv||[0]).map(v=>(ch.r+v)%12),own=sl.n,tg=Q.mode==='ett'?[ch.r]:pcs,bd=shiftTo(own,tg);
    const semi=bd+12*(Q.oct|0),rate=Math.pow(2,semi/12),dur=Math.min((sl.b-sl.a)/rate,ev.l*sd+(Q.mode==='ett'?sd*2:0));if(dur<.02)return;
    const play=(t0,len,rev)=>{const src=c.createBufferSource(),g=G(0);src.buffer=rev?REV:BUF;src.playbackRate.value=rate;const off=rev?BUF.duration-sl.b+Math.max(0,(sl.b-sl.a)-len*rate):sl.a;
      src.connect(g);g.connect(E.lg['s'+k]);const pk=D.norm*.78;g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(pk,t0+.003);g.gain.setValueAtTime(pk,t0+Math.max(.004,len-.016));g.gain.linearRampToValueAtTime(0,t0+len);src.start(t0,Math.max(0,off),len*rate+.01);src.stop(t0+len+.02)};
    /* the samples' own fx: a bit of echo and room always (the fx knob), and now and then a throw — the echo or the room opened wide for this one */
    const X=E.sx[k];
    /* (v260) a bass sample (wubbas) keeps its low end: the slot's highpass opens down to 30 Hz for it, 150 Hz for everything else as before */
    {let sm=null;try{sm=typeof SMP!=='undefined'?SMP.get(Q.id):null}catch(e){globalThis.__el&&globalThis.__el(e)}X.hp.frequency.setValueAtTime(sm&&sm.group==='bass'?30:150,t)}
    const fx=Q.fx??.5,eT=ev.thr!=null&&ev.thr<fx*.55,rT=ev.rv!=null&&ev.rv<fx*.3,eB=fx*.32,rB=fx*.36;
    X.dS.gain.cancelAndHoldAtTime(t);X.rS.gain.cancelAndHoldAtTime(t);X.dS.gain.setValueAtTime(eT?.95:eB,t);X.rS.gain.setValueAtTime(rT?.85:rB,t);
    X.dS.gain.setValueAtTime(eB,t+dur+.01);X.rS.gain.setValueAtTime(rB,t+dur+.01);
    if(ev.stu){const q=sd/2;for(let i=0;i<3;i++)play(t+i*q,q*.9,false);play(t+3*q,Math.max(.03,dur-3*q),false)}else play(t,dur,!!ev.rev)};
  E.useFx=node=>{E.air.disconnect(E.post);E.air.connect(node);node.connect(E.post);E.fxw=node};
  /* the shared lowpass sits well above the voices' own filters (E.fo × the tone), so it shapes, not muffles */
  E.P=null;E.base=2000;E.fo=3.4;{const L=Math.round(sr*.5),b=c.createBuffer(1,L,sr),x=b.getChannelData(0);for(let i=0;i<L;i++)x[i]=Math.random()*2-1;E.nz=b}
  /* v136: the old curves lifted quiet signals ~8 dB and squeezed everything above a fifth of full scale (and clipped hard
     above ±1) – that was the distortion. Now: slope 1 at zero (quiet stays clean), a soft knee that only rounds the peaks,
     over ±2 (the shaper is fed x/2 and followed by ×2), a touch of even warmth on the tape. */
  const softCurve=(g,ev)=>{const n=4096,cv=new Float32Array(n),o=Math.tanh(g*ev)/g;for(let i=0;i<n;i++){const x=(i/(n-1)*2-1)*2;cv[i]=(Math.tanh(g*(x+ev))/g-o)/2}return cv};
  const satCurve=a=>softCurve(1+a*1.1,.05*a),drvCurve=a=>softCurve(1+a*2.6,0);
  /* the old curves' gain for quiet signals, kept as plain gain so levels and the balance between layers stay as tuned */
  const oldG=k=>k/Math.tanh(k),drvMk=d=>d>.01?oldG(1+d*1.3*6)/(1+d*1.1):1,tapeMk=a=>oldG(1+a*3.2);
  E.apply=P=>{E.P=P;if(P.k&&P.k.atm==null)P.k.atm=0;const K=P.k,t=c.currentTime;E.fo=P.fo||3.4;E.base=160*Math.pow(2,K.ton*6.6);E.flt.frequency.setTargetAtTime(E.base*E.fo,t,.03);
    {const on=K.drv>.01;E.drv.curve=on?drvCurve(K.drv):null;E.dpre.gain.setTargetAtTime(on?.5*(1+K.drv*.8):1,t,.03);E.dpost.gain.setTargetAtTime((on?2/(1+K.drv*.45):1)*drvMk(K.drv),t,.03)}
    {const on=K.tejp>.01;E.tsat.curve=on?satCurve(K.tejp):null;E.tpre.gain.setTargetAtTime(on?.5:1,t,.03);E.tpost.gain.setTargetAtTime((on?2:1)*tapeMk(K.tejp),t,.03)}E.tlp.frequency.setTargetAtTime(16000-K.tejp*9500,t,.05);E.wg1.gain.setTargetAtTime(K.tejp*.0011,t,.05);E.wg2.gain.setTargetAtTime(K.tejp*.00012,t,.05);
    E.cwL.gain.setTargetAtTime(K.br*.75,t,.05);E.cwR.gain.setTargetAtTime(K.br*.75,t,.05);E.chD.gain.setTargetAtTime(1-K.br*.3,t,.05);
    E.eS.gain.setTargetAtTime(K.eko*.7,t,.03);E.rS.gain.setTargetAtTime(K.rum*.9,t,.03);E.vol.gain.setTargetAtTime(K.vol*K.vol*.8,t,.03);
    for(const l in E.lg){const L=P.ls[l==='sw'?'ack':l];if(L)E.lg[l].gain.setTargetAtTime(Math.pow(L.lv/.75,2)*(l==='klo'?.55:(l==='ack'||l==='sw')?.8:1),t,.03)}
    (P.smp||[]).forEach((q,k)=>{E.lg['s'+k].gain.setTargetAtTime(Math.pow((q.lv??.7)/.75,2),t,.03)});E.lanes()};
  E.lanes=()=>{const t=c.currentTime;for(const l in E.ln){const v=stxLaneOf(l),N=E.ln[l];N.g.gain.setTargetAtTime(v.g,t,.012);if(N.pn)N.pn.pan.setTargetAtTime(v.pan,t,.02);if(v.F&&N.fx&&typeof stxTfxSet==='function')stxTfxSet(N.fx,v.F,t)}};
  const f0=n=>440*Math.pow(2,(n-69)/12);
  E.choke=(lay,t)=>{const L=E.vo[lay];for(let i=L.length-1;i>=0;i--){const v=L[i];if(v.end<=t-.05){L.splice(i,1);continue}if(!v.cut&&t>v.t0+1e-4){v.cut=1;const g=v.ck.gain;const fd=.006+((E.P&&E.P.k.tail)||0)*.045;g.setValueAtTime(1,t);g.linearRampToValueAtTime(0,t+fd);v.end=Math.min(v.end,t+fd)}}};
  const voice=(lay,t,end,mk)=>{const ck=G(1),va=G(0),pn=c.createStereoPanner?c.createStereoPanner():null;
    const oscs=mk(va);va.connect(ck);const to=E.lg[lay]||E.inS;if(pn){ck.connect(pn);pn.connect(to)}else ck.connect(to);
    const rl=((E.P&&E.P.k.tail)||0)*.55;oscs.forEach(o=>{o.start(t);o.stop(end+.08+rl)});const v={t0:t,end:end+.06+rl,ck,va,pn};E.vo[lay].push(v);return v};
  const osc=(type,f,t,det=0,m=1)=>{const o=c.createOscillator();o.type=type;o.frequency.setValueAtTime(f*m,t);if(det)o.detune.setValueAtTime(det,t);o._m=m;o._f=f*m;return o};
  const scoop=(os,t,amt)=>{if(amt<1)return;os.forEach(o=>{const d=o.detune.value;o.detune.setValueAtTime(d-amt,t);o.detune.linearRampToValueAtTime(d,t+.07)})};
  /* recipes: att, peak, sustain(len), decay τ(len), filter base × and envelope, and the oscillators */
  const con=(a,b)=>{a.connect(b);return a};
  const REC={
    juno:{att:.009,pk:.15,sus:l=>.08+l*.3,fb:1,fe:v=>1.25+.5*v,ft:l=>.12+l*.2,b:(f,t,v,d)=>{const q=G(.6),s=G(.22);const o=[osc('sawtooth',f,t,-8),osc('sawtooth',f,t,8),con(osc('sawtooth',f,t),q),con(osc('square',f,t,0,.5),s)];o.forEach((x,i)=>x.connect(i===2?q:i===3?s:d));q.connect(d);s.connect(d);return o},sc:1},
    keys:{att:.004,pk:.3,sus:l=>.06+l*.25,fb:2.6,fe:v=>1.25+.5*v,ft:l=>.12+l*.2,b:(f,t,v,d)=>{const car=osc('sine',f,t),m=osc('sine',f,t),mg=G(0),h=osc('sine',f,t,3,2),hg=G(.07),c2=osc('sine',f,t,7),g2=G(.5);
      mg.gain.setValueAtTime(f*1.25*v,t);mg.gain.setTargetAtTime(f*.1,t,.18);m.connect(mg);mg.connect(car.frequency);car.connect(d);h.connect(hg);hg.connect(d);c2.connect(g2);g2.connect(d);return [car,m,h,c2]},sc:.6},
    plock:{att:.003,pk:.2,sus:l=>l*.08,fb:1.1,fe:v=>1.5+1.5*v,ft:l=>.04+l*.08,b:(f,t,v,d)=>{const s=G(.5),o=[osc('sawtooth',f,t,-6),osc('sawtooth',f,t,6),osc('sine',f,t,0,.5)];o[0].connect(d);o[1].connect(d);o[2].connect(s);s.connect(d);return o}},
    orgel:{att:.006,pk:.13,sus:()=>.6,fb:1.4,fe:()=>1.2,ft:()=>.2,b:(f,t,v,d)=>{const ag=G(.4),bg=G(.35),sg=G(.45),o=[osc('square',f,t),osc('sine',f,t,0,2),osc('sine',f,t,0,.5)];o[0].connect(ag);ag.connect(d);o[1].connect(bg);bg.connect(d);o[2].connect(sg);sg.connect(d);return o}},
    mjuk:{att:.06,pk:.11,sus:l=>.5+l*.3,fb:.8,fe:()=>1.05,ft:()=>.3,b:(f,t,v,d)=>{const tg=G(.6),o=[osc('sawtooth',f,t,-12),osc('sawtooth',f,t,12),osc('triangle',f,t,0,.5)];o[0].connect(d);o[1].connect(d);o[2].connect(tg);tg.connect(d);return o},sc:1},
    glas:{att:.004,pk:.15,sus:l=>.12+l*.35,fb:3,fe:()=>1.2,ft:()=>.2,b:(f,t,v,d)=>{const car=osc('sine',f,t),m=osc('sine',f,t,0,2),mg=G(0),h=osc('triangle',f,t,4),hg=G(.3);
      mg.gain.setValueAtTime(f*1.3*v,t);mg.gain.setTargetAtTime(f*.05,t,.06);m.connect(mg);mg.connect(car.frequency);car.connect(d);h.connect(hg);hg.connect(d);return [car,m,h]}},
    klocka:{att:.002,pk:.14,sus:()=>0,fb:4,fe:()=>1,ft:()=>.3,tau:l=>.15+l*.5,b:(f,t,v,d)=>{const car=osc('sine',f,t),m=osc('sine',f,t,0,3.5),mg=G(0),c2=osc('sine',f,t,0,2),g2=G(.18);
      mg.gain.setValueAtTime(f*2.2*v,t);mg.gain.setTargetAtTime(f*.2,t,.05);m.connect(mg);mg.connect(car.frequency);car.connect(d);c2.connect(g2);g2.connect(d);return [car,m,c2]}},
    'kör':{att:.03,pk:.28,sus:l=>.45+l*.3,fb:1.6,fe:()=>1.1,ft:()=>.25,b:(f,t,v,d)=>{const a=osc('sawtooth',f,t,-7),b=osc('sawtooth',f,t,7),mix=G(1),out=G(1);a.connect(mix);b.connect(mix);
      [[730,7,1],[1090,9,.6],[2440,12,.25]].forEach(([fr,q,g])=>{const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=fr;bp.Q.value=q;const gg=G(g*2.4);mix.connect(bp);bp.connect(gg);gg.connect(d)});return [a,b]},sc:.5},
    sinus:{att:.005,pk:.2,sus:l=>.35+l*.3,fb:4,fe:()=>1,ft:()=>.2,b:(f,t,v,d)=>{const h=G(.06),o=[osc('sine',f,t),osc('sine',f,t,0,2)];o[0].connect(d);o[1].connect(h);h.connect(d);return o}},
    /* mallet: an almost pure sine with a soft knock at the start, gone quickly — the clean stab of the "overcast" loops */
    mallet:{att:.002,pk:.34,sus:()=>0,fb:6,fe:v=>1.4+v,ft:()=>.03,tau:l=>.045+l*.32,b:(f,t,v,d)=>{const car=osc('sine',f,t),m=osc('sine',f,t,0,1),mg=G(0),h=osc('sine',f,t,0,3),hg=G(0);
      mg.gain.setValueAtTime(f*2.2*v,t);mg.gain.setTargetAtTime(f*.15*v,t,.011);m.connect(mg);mg.connect(car.frequency);hg.gain.setValueAtTime(.12*v,t);hg.gain.setTargetAtTime(0,t,.012);h.connect(hg);hg.connect(d);car.connect(d);
      if(E.nz){const n=c.createBufferSource(),bp=c.createBiquadFilter(),ng=G(0);n.buffer=E.nz;bp.type='bandpass';bp.frequency.value=Math.min(9000,Math.max(2200,f*6));bp.Q.value=1.4;ng.gain.setValueAtTime(.12*v,t);ng.gain.setTargetAtTime(0,t+.001,.007);n.connect(bp);bp.connect(ng);ng.connect(d);n.start(t);n.stop(t+.06)}return [car,m,h]}},
    /* stack: the layered synth-stack — two detuned saws, a saw an octave up and a square under, a quick filter snap */
    stack:{att:.004,pk:.12,sus:l=>.16+l*.3,fb:1.25,fe:v=>2.2+1.3*v,ft:l=>.045+l*.11,b:(f,t,v,d)=>{const up=G(.34),lo=G(.22),o=[osc('sawtooth',f,t,-11),osc('sawtooth',f,t,11),osc('sawtooth',f,t,4,2),osc('square',f,t,0,.5)];
      o[0].connect(d);o[1].connect(d);o[2].connect(up);up.connect(d);o[3].connect(lo);lo.connect(d);return o},sc:.7},
    /* röst: a plucked voice — saws through vowel formants that slide from "a" to "o" */
    'röst':{att:.004,pk:.3,sus:l=>.08+l*.25,fb:2.6,fe:()=>1.3,ft:()=>.1,b:(f,t,v,d)=>{const a=osc('sawtooth',f,t,-6),b=osc('sawtooth',f,t,6),mix=G(1);a.connect(mix);b.connect(mix);
      [[730,570,8,1],[1090,840,10,.55],[2440,2410,12,.22]].forEach(([f1,f2,q,g])=>{const bp=c.createBiquadFilter();bp.type='bandpass';bp.Q.value=q;bp.frequency.setValueAtTime(f1,t);bp.frequency.setTargetAtTime(f2,t+.02,.07);const gg=G(g*2.6);mix.connect(bp);bp.connect(gg);gg.connect(d)});return [a,b]},sc:.5},
    /* moln: soft, airy — two sines a little apart, a triangle an octave up and a breath of noise at the start */
    moln:{att:.012,pk:.17,sus:l=>.22+l*.35,fb:3,fe:()=>1.15,ft:()=>.25,b:(f,t,v,d)=>{const o=[osc('sine',f,t,-7),osc('sine',f,t,7),osc('triangle',f,t,0,2)],tg=G(.16);o[0].connect(d);o[1].connect(d);o[2].connect(tg);tg.connect(d);
      if(E.nz){const n=c.createBufferSource(),bp=c.createBiquadFilter(),ng=G(0);n.buffer=E.nz;bp.type='bandpass';bp.frequency.value=Math.min(12000,f*3);bp.Q.value=3;ng.gain.setValueAtTime(.09*v,t);ng.gain.setTargetAtTime(0,t+.01,.05);n.connect(bp);bp.connect(ng);ng.connect(d);n.start(t);n.stop(t+.4)}return o}},
    /* sub */
    's:sinus':{att:.006,pk:.6,sus:()=>.8,fb:8,fe:()=>1,ft:()=>.2,tau:()=>.2,b:(f,t,v,d)=>{const h=G(.1),o=[osc('sine',f,t),osc('sine',f,t,0,2)];o[0].connect(d);o[1].connect(h);h.connect(d);return o}},
    's:808':{att:.003,pk:.62,sus:l=>.5+l*.3,fb:8,fe:()=>1,ft:()=>.2,tau:()=>.35,b:(f,t,v,d)=>{const o=osc('sine',f,t),sh=c.createWaveShaper(),g=G(1.6);sh.curve=driveCurve(.45);o.frequency.setValueAtTime(f*2.4,t);o.frequency.exponentialRampToValueAtTime(f,t+.045);o.connect(g);g.connect(sh);const k=G(.62);sh.connect(k);k.connect(d);return [o]}},
    /* kort: a clean sine that dies away by itself — a deep thump under each chord */
    's:kort':{att:.004,pk:.72,sus:()=>0,fb:8,fe:()=>1,ft:()=>.2,tau:l=>.07+l*.36,b:(f,t,v,d)=>{const h=G(.07),o=[osc('sine',f,t),osc('sine',f,t,0,2)];o[0].connect(d);o[1].connect(h);h.connect(d);return o}},
    's:moog':{att:.004,pk:.42,sus:l=>.55+l*.2,fb:1,fe:()=>4,ft:()=>.09,b:(f,t,v,d)=>{const lp=c.createBiquadFilter();lp.type='lowpass';lp.Q.value=2.2;lp.frequency.setValueAtTime(f*14,t);lp.frequency.setTargetAtTime(f*3,t,.07);
      const o=[osc('sawtooth',f,t),osc('square',f,t,-6)],g2=G(.5);o[0].connect(lp);o[1].connect(g2);g2.connect(lp);lp.connect(d);return o}}};
  /* one note on a layer, the layer's own sound: oct, length and tone come from the layer strip */
  /* v192: an instrument (rendered notes) – played like a sample, the velocity opens the tone, it rings out after the note */
  const insPlay=(lay,t,nn,vel,dur,pan,b,L)=>{const P=E.P,I=INS[L.snd],end=t+dur,len=Math.max(0,Math.min(1,P.k.len+(L.len-.5)*.9)),ring=I.rel+len*.6+(P.k.tail||0)*.45;
    const v=voice(lay,t,end+ring,va=>{const s=c.createBufferSource();s.buffer=b;E._lastSrc=s;const vf=c.createBiquadFilter();vf.type='lowpass';vf.Q.value=.45;
      vf.frequency.setValueAtTime(Math.min(19000,(E.base||2000)*2.6*Math.pow(2,(L.ton-.5)*3)*(.55+vel*.75)),t);s.connect(vf);vf.connect(va);
      const g=va.gain,pk=I.pk*vel;g.setValueAtTime(pk,t);g.setTargetAtTime(0,end,Math.max(.02,ring/3));return [s]});
    if(v.pn)v.pn.pan.setValueAtTime(Math.max(-1,Math.min(1,pan||0)),t);if(E._cap)E._cap.push({v,src:E._lastSrc,ring});return f0(nn)};
  /* v198: a stack – a second instrument on the same notes (like the "melodic stack" loops): its own sound, octave, level and side */
  const stackPlay=(lay,t,n,vel,dur,pan)=>{const L=E.P.ls[lay],st=L&&L.st;if(!st||typeof INS==='undefined'||!INS[st.snd])return;const nn=n+12*((L.oct||0)+(st.oct||0));
    let bf=insBuf(c,st.snd,nn,st.tw||0);if(!bf&&c!==ctx)bf=insMake(c,st.snd,nn,st.tw||0);if(!bf){insWant(c,st.snd,nn,st.tw||0);return}
    insPlay(lay,t,nn,vel*(st.lv??.4),dur,Math.max(-1,Math.min(1,(pan||0)+(st.pan??.3))),bf,{snd:st.snd,ton:L.ton,len:L.len})};
  E.note=(lay,t,n,vel,dur,pan,from)=>{const P=E.P,L0=P.ls[lay];
    if(typeof INS!=='undefined'&&L0&&INS[L0.snd]){const nn=n+12*(L0.oct||0);let bf=insBuf(c,L0.snd,nn,L0.tw||0);if(!bf&&c!==ctx)bf=insMake(c,L0.snd,nn,L0.tw||0);if(bf)return insPlay(lay,t,nn,vel,dur,pan,bf,L0);insWant(c,L0.snd,nn,L0.tw||0)}
    /* v214: a layer can take any of the simple synth's sounds (a sub sound on a chord layer, a chord sound on the sub) */
    const L=L0,key=(String(L.snd).startsWith('s:')&&REC[L.snd])?L.snd:lay==='sub'?(STX_SUBS.includes(L.snd)?'s:'+L.snd:REC[L.snd]?L.snd:'s:sinus'):(REC[L.snd]?L.snd:(typeof INS!=='undefined'&&INS[L.snd]?'keys':'juno')),R=REC[key],end=t+dur;
    const len=Math.max(0,Math.min(1,P.k.len+(L.len-.5)*.9)),f=f0(n+12*L.oct),tau=R.tau?R.tau(len):.035*Math.pow(2,len*4.2);
    const v=voice(lay,t,end,va=>{const vf=c.createBiquadFilter();vf.type='lowpass';vf.Q.value=.55;vf.connect(va);
      const base=Math.min(16000,E.base*R.fb*Math.pow(2,(L.ton-.5)*3)),pk=Math.min(17000,base*R.fe(vel));vf.frequency.setValueAtTime(pk,t);vf.frequency.setTargetAtTime(base,t+.004,R.ft(len));
      const os=R.b(f,t,vel,vf);
      if(from){os.forEach(o=>{o.frequency.setValueAtTime(from*o._m,t);o.frequency.setTargetAtTime(f*o._m,t,.028)})}else if(R.sc)scoop(os,t,(18*P.k.tejp+6)*R.sc);
      const g=va.gain,p=R.pk*vel,sus=R.sus(len);g.setValueAtTime(from?p*.7:0,t);g.linearRampToValueAtTime(p,t+(from?.012:R.att));g.setTargetAtTime(p*sus,t+R.att,tau);g.setTargetAtTime(0,end-.004,.009+(P.k.tail||0)*.11);return os});
    if(v.pn)v.pn.pan.setValueAtTime(Math.max(-1,Math.min(1,pan||0)),t);return f};
  /* v214: the simple synth – the Starter's own sounds played by a synth track (its own notes, the keyboard): the same recipes,
     into the track's channel; the track's tone and decay knobs take the place of the layer's ton and längd */
  /* fromN: a glide – the note starts at that pitch and slides in (the Starter's top line), with a softer attack */
  /* (v272) env: the track's ADSR (0..1, .5 = the sound's own); left out (the Starter itself) = the sound as it always was */
  const envT=(v,b,lo,hi)=>v==null||Math.abs(v-.5)<.004?b:v<.5?lo*Math.pow(b/lo,v/.5):b*Math.pow(hi/b,(v-.5)/.5),envS=(v,b)=>v==null||Math.abs(v-.5)<.004?b:v<.5?b*v/.5:b+(1-b)*(v-.5)/.5;
  E.free=(dest,snd,sub,t,n,vel,dur,ton,lenK,pan,gain,tail,fromN,tw,env)=>{const tl=tail==null?.25:tail,ev=env||{},f=f0(n),gn=gain||1,fr=fromN!=null?f0(fromN)/f:0;
    /* every note gets a choke stage (held at 1), so the next note on the track can cut it cleanly, as the Starter's layers do */
    const ck=G(1),pn=c.createStereoPanner?c.createStereoPanner():null;if(pn){pn.pan.value=Math.max(-1,Math.min(1,pan||0));ck.connect(pn);pn.connect(dest)}else ck.connect(dest);
    if(typeof INS!=='undefined'&&INS[snd]){const W=tw||0;let bf=insBuf(c,snd,n,W),pr=1;if(!bf&&c!==ctx)bf=insMake(c,snd,n,W);
      /* (v275) a note not rendered yet is never silent: the nearest rendered note of the sound, pitched to it, while the real
         one renders; the very first note of a new sound is rendered on the spot */
      if(!bf){insWant(c,snd,n,W);for(let dd=1;dd<=7&&!bf;dd++)for(const m of [n-dd,n+dd]){const b2=insBuf(c,snd,m,W);if(b2){bf=b2;pr=Math.pow(2,(n-m)/12);break}}
        if(!bf){try{bf=insMake(c,snd,n,W)}catch(e){globalThis.__el&&globalThis.__el(e)}}if(!bf)return null}
      const I=INS[snd],end=t+dur,ring=I.rel+lenK*.6+tl*.45,base=160*Math.pow(2,.34*6.6);
      const s=c.createBufferSource(),vf=c.createBiquadFilter(),va=G(0);s.buffer=bf;vf.type='lowpass';vf.Q.value=.45;
      vf.frequency.setValueAtTime(Math.min(19000,base*2.6*Math.pow(2,(ton-.5)*3)*(.55+vel*.75)),t);s.connect(vf);vf.connect(va);va.connect(ck);if(pr!==1)s.playbackRate.setValueAtTime(pr,t);if(fr){s.playbackRate.setValueAtTime(fr*pr,t);s.playbackRate.setTargetAtTime(pr,t,.028)}
      const pk=I.pk*vel*gn;if(!env){va.gain.setValueAtTime(pk,t);va.gain.setTargetAtTime(0,end,Math.max(.02,ring/3));s.start(t);s.stop(end+ring+.1);return {ck,t0:t,end:end+ring,va,ins:1}}
      const at=envT(ev.a,.001,.001,2.5),sl=envS(ev.s,1),dt=envT(ev.d,.35,.01,4),rt=envT(ev.r,Math.max(.02,ring/3),.004,2.5);
      va.gain.setValueAtTime(at>.0015?0:pk,t);if(at>.0015)va.gain.linearRampToValueAtTime(pk,t+at);if(sl<.999)va.gain.setTargetAtTime(pk*sl,t+at,dt);va.gain.setTargetAtTime(0,end,rt);s.start(t);s.stop(end+rt*6+.1);return {ck,t0:t,end:end+rt*6,va,ins:1}}
    const key=sub?'s:'+(STX_SUBS.includes(snd)?snd:'sinus'):(REC[snd]?snd:'juno'),R=REC[key],end=t+dur,len=Math.max(0,Math.min(1,lenK)),tau=R.tau?R.tau(len):.035*Math.pow(2,len*4.2);
    const va=G(0),vf=c.createBiquadFilter();vf.type='lowpass';vf.Q.value=.55;vf.connect(va);va.connect(ck);
    const b0=160*Math.pow(2,.34*6.6),base=Math.min(16000,b0*R.fb*Math.pow(2,(ton-.5)*3)),pkf=Math.min(17000,base*R.fe(vel));vf.frequency.setValueAtTime(pkf,t);vf.frequency.setTargetAtTime(base,t+.004,R.ft(len));
    const AT=envT(ev.a,R.att,.001,2.5),TAU=envT(ev.d,tau,.01,4),RT=envT(ev.r,.009+tl*.11,.003,2.5),os=R.b(f,t,vel,vf);/* (v275) on a track: each note a few cents off, like an analog poly – chords breathe instead of sounding frozen */if(env)os.forEach(o=>{try{if(o.detune)o.detune.value+=(Math.random()-.5)*5}catch(_){globalThis.__el&&globalThis.__el(_)}});if(fr){os.forEach(o=>{if(!o.frequency)return;const tf=o._f||f;o.frequency.cancelAndHoldAtTime(t);o.frequency.setValueAtTime(tf*fr,t);o.frequency.setTargetAtTime(tf,t,.028)})}else if(R.sc)scoop(os,t,(18*.45+6)*R.sc);
    const p=R.pk*vel*gn,sus=envS(ev.s,R.sus(len)),stp=env?Math.max(.08+tl*.55,RT*6):.08+tl*.55;va.gain.setValueAtTime(fr?p*.7:0,t);va.gain.linearRampToValueAtTime(p,t+(fr?.012:AT));va.gain.setTargetAtTime(p*sus,t+AT,TAU);va.gain.setTargetAtTime(0,end-.004,RT);
    os.forEach(o=>{o.start(t);o.stop(end+stp)});return {ck,t0:t,end:end+stp,va}};
  /* v215: a sample slot played as notes (the sampler module on synth 5/6): the slice or voice chop nearest the note, pitched to it */
  E.freeSmp=(dest,k,t,n,vel,dur,P)=>{const Q=P&&P.smp&&P.smp[k];if(!Q)return null;stxSmpLoad(Q.id);const D=STX.sb[Q.id];if(!D||!D.sl||!D.sl.length)return null;
    let x=null,bd=99;const pool=D.kit?D.kit.filter(q=>dur>=.5||!q.whole):D.sl;const cand=(pool.length?pool:D.sl).map(q=>({q,d:n-q.n})).sort((a,b2)=>Math.abs(a.d)-Math.abs(b2.d));
    if(!cand.length)return null;const near=cand.filter(o=>Math.abs(o.d)<=1.5),pk=near.length>1?near[Math.floor(((n*7919+Math.round(t*1000))%near.length+near.length)%near.length)]:cand[0];x=pk.q;bd=pk.d;
    const buf=D.kit?x.buf:D.buf,a0=D.kit?0:x.a,b1=D.kit?x.buf.duration:x.b,rate=Math.pow(2,bd/12),len=Math.min((b1-a0)/rate,dur+(Q.mode==='ett'?.25:0));if(len<.02)return null;
    const src=c.createBufferSource(),g=G(0),hp=c.createBiquadFilter(),ck=G(1);hp.type='highpass';
    /* (v260) a bass sample (wubbas) keeps its low end: 30 Hz highpass for it, 150 Hz for the rest as before */
    {let sm=null;try{sm=typeof SMP!=='undefined'?SMP.get(Q.id):null}catch(e){globalThis.__el&&globalThis.__el(e)}hp.frequency.value=sm&&sm.group==='bass'?30:150}hp.Q.value=.6;src.buffer=buf;src.playbackRate.value=rate;
    src.connect(g);g.connect(hp);hp.connect(ck);ck.connect(dest);const pv=(D.norm||1)*.78*Math.pow((Q.lv??.7)/.75,2)*Math.min(1,vel/.85);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(pv,t+.003);g.gain.setValueAtTime(pv,t+Math.max(.004,len-.016));g.gain.linearRampToValueAtTime(0,t+len);src.start(t,Math.max(0,a0),len*rate+.01);src.stop(t+len+.02);return {ck,t0:t,end:t+len+.02}};
  /* a layer played by one of the app's synth channels (live only): the channel's own engine, one voice per note */
  E.trk=(lay,t,ns,vel,dur)=>{if(c!==ctx||!STX.rawTrig)return;const P=E.P,L=P.ls[lay],id=stxTrkOf(lay,L.snd),i=TRACKS.findIndex(x=>x.id===id);if(i<0)return;
    const steps=Math.max(.25,dur/stepDur()),lv=L.lv/.75;VOIC1=true;try{ns.forEach(n=>STX.rawTrig(i,t,Math.min(1,vel*lv),n+12*L.oct,steps))}finally{VOIC1=false}};
  const isT=lay=>stxViaTrk(E.P.ls[lay].snd);
  /* v196: an instrument (piano, rhodes, guitar …) plays a chord the way a player would: the same chord on the next step is held
     and rings on (not struck again – sixteen hard attacks a bar sounded broken and far too loud); a new strike comes at most once a
     beat, softer, or when the chord changes or after a rest */
  E.ackH=null;
  E.stab=(t,ns,vel,dur)=>{if(isT('ack'))return E.trk('ack',t,ns,vel,dur);const br=E.P.k.br,k=1/Math.sqrt(ns.length),L=E.P.ls.ack,ins=typeof INS!=='undefined'&&L&&INS[L.snd],sd=E._sd||.125;
    if(ins){const key=ns.join(','),H=E.ackH,next=H&&H.key===key&&t-H.last<=sd*1.6+1e-3;
      if(next&&t-H.t0<sd*3.9){H.last=t;const ne=t+dur;H.vs.forEach(o=>{try{const g=o.v.va.gain;g.cancelAndHoldAtTime(t);g.setTargetAtTime(0,ne,Math.max(.02,o.ring/3));if(o.src)o.src.stop(ne+o.ring+.1);o.v.end=ne+o.ring}catch(e){globalThis.__el&&globalThis.__el(e)}});return}
      E.choke('ack',t);E._cap=[];const v2=next?vel*.55:vel;
      ns.forEach((n,i)=>E.note('ack',t,n,v2*k,dur,ns.length>1?(i/(ns.length-1)*2-1)*Math.min(1,br*1.1):0));
      if(L.st)ns.slice(-2).forEach((n,i)=>stackPlay('ack',t,n,v2*k,dur,i?.35:-.35));
      E.ackH={key,t0:t,last:t,vs:E._cap};E._cap=null;return}
    E.ackH=null;E.choke('ack',t);ns.forEach((n,i)=>E.note('ack',t,n,vel*k,dur,ns.length>1?(i/(ns.length-1)*2-1)*Math.min(1,br*1.1):0));if(L&&L.st)ns.slice(-2).forEach((n,i)=>stackPlay('ack',t,n,vel*k,dur,i?.35:-.35))};
  E.klo=(t,n,vel,dur,pan,gl)=>{if(isT('klo'))return E.trk('klo',t,[n],vel,dur);const from=gl&&E.lastTop?E.lastTop:0;E.choke('klo',t);E.lastTop=E.note('klo',t,n,vel,dur,pan*E.P.k.br,from);stackPlay('klo',t,n,vel,dur,pan*E.P.k.br)};
  E.sub=(t,n,dur)=>{if(isT('sub'))return E.trk('sub',t,[n],1,dur);E.choke('sub',t);E.note('sub',t,n,1,dur,0)};
  E.luft=(t,ns,dur)=>{if(isT('luft'))return E.trk('luft',t,ns,.9,dur);E.choke('luft',t);const k=1/Math.sqrt(ns.length);ns.forEach((n,i)=>E.note('luft',t,n,.5*k,dur,(i%2?1:-1)*.4*E.P.k.br))};
  /* one arp note: chokes the last one on the layer (clean, no smear) */
  let arpPan=1;E.arpNote=(lay,t,n,v,dur)=>{if(isT(lay))return E.trk(lay,t,[n],v,dur);E.choke(lay,t);arpPan=-arpPan;E.note(lay,t,n,v*(lay==='luft'?.55:.8),dur,arpPan*.35*E.P.k.br)};
  E.swell=(t,ns,dur)=>{const end=t+dur,k=1/Math.sqrt(ns.length);E.choke('sw',t);
    ns.forEach(n=>voice('sw',t,end,va=>{const f=f0(n+12),a=osc('sawtooth',f,t,-9),b=osc('sawtooth',f,t,9),hp=c.createBiquadFilter(),lp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=500;lp.type='lowpass';
      lp.frequency.setValueAtTime(600,t);lp.frequency.exponentialRampToValueAtTime(Math.min(9000,E.base*3),end);a.connect(hp);b.connect(hp);hp.connect(lp);lp.connect(va);
      va.gain.setValueAtTime(.0004,t);va.gain.exponentialRampToValueAtTime(.11*k,end-.012);va.gain.linearRampToValueAtTime(0,end);return [a,b]}))};
  E.dip=(t,len)=>{const p=E.wow.delayTime,B=E.wowB,n=64,cv=new Float32Array(n);for(let i=0;i<n;i++){const u=i/(n-1),w=Math.sin(Math.PI*Math.pow(u,.7));cv[i]=B+.02*w*w}
    try{p.cancelAndHoldAtTime(t);p.setValueCurveAtTime(cv,t,len)}catch(e){globalThis.__el&&globalThis.__el(e)}};
  /* one 16th: what the plan says, the fx written into the loop, the pump, the groove */
  E.tick=(t,gs,sd,plan)=>{const P=E.P;if(!P)return;E._sd=sd;const Lg=((gs%64)+64)%64,b=Lg>>4,s=Lg&15,K=P.k,Gr=P.g;
    E.dl.delayTime.setTargetAtTime(Math.min(1.9,sd*3),t,.05);if(E.sDl){E.sDl.delayTime.setTargetAtTime(Math.min(1.9,sd*3),t,.05);E.sDr.delayTime.setTargetAtTime(Math.min(1.9,sd*3),t,.05)}E.dr.delayTime.setTargetAtTime(Math.min(1.9,sd*3),t,.05);
    if(s===0){E.flt.frequency.cancelAndHoldAtTime(t);E.flt.frequency.setValueAtTime(E.base*E.fo,t);E.eS.gain.cancelAndHoldAtTime(t);E.eS.gain.setValueAtTime(K.eko*.7,t)}
    if(s%4===0&&K.pump>.01){const g=E.pump.gain;g.cancelAndHoldAtTime(t);g.setTargetAtTime(1-Math.min(.85,K.pump*.9),t,.003);g.setTargetAtTime(1,t+.016,sd*4*.16)}
    if(!P.on)return;
    STX_FX.forEach(fx=>{if(!P.fx[fx.id])return;
      if(fx.id===6){const r=stxRh(P)[b]||'',last=r.lastIndexOf('x');if((b===0||b===2)&&s===last){E.eS.gain.setValueAtTime(.95,t);E.eS.gain.setValueAtTime(K.eko*.7,t+sd*.9)}return}
      if(fx.id===9){const w=plan.sw[Lg];if(w)E.swell(t,w.ns,w.l*sd);return}
      if(fx.b!==b||fx.s!==s)return;
      if(fx.id===7){E.flt.frequency.setValueAtTime(E.base*E.fo,t);E.flt.frequency.exponentialRampToValueAtTime(Math.max(140,E.base*.15),t+fx.len*sd);return}
      if(fx.id===8){E.dip(t,fx.len*sd);return}
      if(E.fxw)E.fxw.port.postMessage({t:'q',fx:fx.id,start:Math.round(t*sr),len:Math.round(fx.len*sd*sr),sl:Math.round((fx.sl||1)*sd*sr)})});
    {const ev0=plan.steps[Lg],pv=plan.steps[(Lg+63)%64];if(!ev0&&pv){const thr=P.fx[6]&&(b===0||b===2)&&(stxRh(P)[b]||'').lastIndexOf('x')===s-1;const tl=K.tail||0;E.rG.gain.setTargetAtTime(0,t,.035+tl*.5);if(!thr)E.eG.gain.setTargetAtTime(0,t,.045+tl*.6)}
      else if(ev0&&!pv){[E.rG,E.eG].forEach(g=>{g.gain.cancelAndHoldAtTime(t);g.gain.setTargetAtTime(1,t,.006)})}}
    const on=l=>(l==='v'||P.lay[l])&&stxFormOn(P,gs,l);
    if(plan.arp)for(const lay of ['ack','luft']){const ap=plan.arp[lay];if(!ap||!on(lay))continue;ap.by[Lg].forEach(a=>{const tt=Math.max(t,t+(a.t-Lg)*sd+(lay==='ack'?Gr.lat*.012:0));E.arpNote(lay,tt,a.n,a.v,a.d*sd)})}
    if(plan.sx)[0,1].forEach(k=>{const se=plan.sx[k][Lg];if(se&&P.smp[k]&&P.smp[k].on&&on('v')){stxSmpLoad(P.smp[k].id);E.smpPlay(t+P.g.lat*.01,k,se,sd,plan)}});
    const ev=plan.steps[Lg];if(!ev)return;
    /* groove: its own swing on the off 16ths, a laid-back top line, a little looseness */
    const rr=k=>{let h=Math.imul(gs*31+k*7+1,2654435761)>>>0;h^=h>>>15;return (h%10000)/10000-.5};
    const tb=t+(gs%2?Gr.sving*sd*.5:0),hu=Gr.human,T=k=>Math.max(t,tb+rr(k)*hu*.012),V=(v,k)=>Math.max(.2,Math.min(1,v*(1+rr(k+9)*hu*.3)));
    const acc=s%4===0?1:s%2?.74:.87;
    if(ev.ack&&on('ack')&&!(plan.arp&&plan.arp.ack))E.stab(T(1)+Gr.lat*.012,ev.ack.ns,V(ev.ack.re?acc*.8:acc,1),ev.ack.l*sd);
    if(ev.klo&&on('klo'))E.klo(T(2)+Gr.lat*.03,ev.klo.n,V(ev.klo.gl?.92:acc*(.92+((Lg*7)%5)*.02),2),ev.klo.l*sd,ev.klo.gl?0:(Lg%2?1:-1)*.5,!!ev.klo.gl);
    if(ev.sub&&on('sub'))E.sub(tb,ev.sub.n,ev.sub.l*sd);
    if(ev.luft&&on('luft')&&!(plan.arp&&plan.arp.luft))E.luft(tb,ev.luft.ns,ev.luft.l*sd)};
  E.live=(fx,on,sd)=>{const t=c.currentTime,K=E.P.k;
    if(fx===6){E.eS.gain.cancelAndHoldAtTime(t);E.eS.gain.setTargetAtTime(on?.95:K.eko*.7,t,on?.01:.08);[E.eG,E.rG].forEach(g=>{g.gain.cancelAndHoldAtTime(t);g.gain.setTargetAtTime(1,t,.01)});return}
    if(fx===7){E.flt.frequency.cancelAndHoldAtTime(t);E.flt.frequency.setTargetAtTime(on?Math.max(140,E.base*.15):E.base*E.fo,t,on?.35:.06);return}
    if(fx===8){const p=E.wow.delayTime;p.cancelAndHoldAtTime(t);p.setTargetAtTime(on?E.wowB+.06:E.wowB,t,on?.18:.12);return}
    if(fx===9){if(on){const pl=stxPlanCached(),f=pl.steps.find(Boolean);if(f&&f.ack)E.swell(t+.01,f.ack.ns,sd*4)}return}
    if(E.fxw)E.fxw.port.postMessage({t:'h',fx,on,sl:Math.round(sd*(fx===1?.5:fx===5?.5:1)*sr)})};
  E.kill=()=>{const t=c.currentTime;Object.keys(E.vo).forEach(l=>{E.vo[l].forEach(v=>{try{const g=v.ck.gain;g.cancelAndHoldAtTime(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(0,t+.01)}catch(e){globalThis.__el&&globalThis.__el(e)}});E.vo[l].length=0});
    if(E.fxw)E.fxw.port.postMessage({t:'clr'});E.flt.frequency.cancelAndHoldAtTime(t);E.flt.frequency.setTargetAtTime(E.base*E.fo,t,.02);E.pump.gain.cancelAndHoldAtTime(t);E.pump.gain.setTargetAtTime(1,t,.02);[E.rG,E.eG].forEach(g=>{g.gain.cancelAndHoldAtTime(t);g.gain.setTargetAtTime(1,t,.02)});
    const p=E.wow.delayTime;p.cancelAndHoldAtTime(t);p.setTargetAtTime(E.wowB,t,.03);E.lastTop=0};
  return E}
async function stxFxNode(c){const url=URL.createObjectURL(new Blob([STX_SRC],{type:'application/javascript'}));await c.audioWorklet.addModule(url);
  return new AudioWorkletNode(c,'blonda-stx',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit'})}
const STX={E:null,plan:null,pk:'',vis:[],hits:new Map(),loading:false,live:null,hist:[],sb:{}};
/* a library sample for a slot: loaded once, cut into slices where the sound starts and stops (long phrases cut at the
   quietest point near every ~⅓ s), each slice with its own pitch (autocorrelation; the name's key — "…_E", "…_Amin" — if that fails) */
function stxSlice(buf,name){const sr=buf.sampleRate,n=buf.length,m=new Float32Array(n);for(let ch=0;ch<buf.numberOfChannels;ch++){const d=buf.getChannelData(ch);for(let i=0;i<n;i++)m[i]+=d[i]/buf.numberOfChannels}
  const H=Math.round(sr*.01),F=Math.floor(n/H),lv=new Float32Array(F);let mx=1e-9;for(let f=0;f<F;f++){let a=0;for(let i=f*H;i<(f+1)*H;i++)a+=m[i]*m[i];lv[f]=Math.sqrt(a/H);mx=Math.max(mx,lv[f])}
  const on=lv.map(v=>v>mx*.03),segs=[];let s0=-1;for(let f=0;f<=F;f++){if(f<F&&on[f]){if(s0<0)s0=f}else if(s0>=0){if(f-s0>=4)segs.push([s0,f]);s0=-1}}
  const out=[];segs.forEach(([a,b])=>{let x=a;while(b-x>45){let cut=x+33,lo=1e9;for(let f=x+25;f<Math.min(b-8,x+45);f++)if(lv[f]<lo){lo=lv[f];cut=f}out.push([x,cut]);x=cut}out.push([x,b])});
  const hint=(()=>{const re=/(?:^|[ _\-])([A-G])(#|b|s)?(?:min|maj|m)?(?=[ _\-.]|$)/gi,nm=String(name||'').replace(/\.[a-z0-9]+$/i,'')+' ';let q=null,x;while((x=re.exec(nm)))q=x;if(!q)return null;const B={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[q[1].toUpperCase()];return B+(q[2]==='#'||q[2]==='s'?1:q[2]==='b'?-1:0)})();
  const pitch=(a,b)=>{const c0=Math.round(((a+b)/2)*H),W=Math.min(Math.round(sr*.06),Math.floor((b-a)*H*.8));if(W<256)return null;let best=0,bt=0;
    const t0=Math.floor(sr/1000),t1=Math.min(Math.floor(sr/60),W-1);for(let tau=t0;tau<t1;tau++){let s=0,e1=0,e2=0;for(let i=0;i<W-tau;i+=2){const p=m[c0-(W>>1)+i]||0,q=m[c0-(W>>1)+i+tau]||0;s+=p*q;e1+=p*p;e2+=q*q}const r=s/Math.sqrt(e1*e2+1e-12);if(r>best){best=r;bt=tau}}
    return best>.55?69+12*Math.log2(sr/bt/440):null};
  const sl=out.map(([a,b])=>{let p=pitch(a,b);if(p==null)p=hint!=null?60+hint:60;if(hint!=null){/* trust the name's key for the pitch class when the measure is close to it */}return {a:a*H/sr,b:Math.min(n/sr,b*H/sr+.02),n:Math.round(p)}});
  return {sl,hint,norm:Math.min(4,.7/Math.max(1e-3,mx*1.4))}}
function stxSmpLoad(id){if(!id||STX.sb[id]||typeof SMP==='undefined')return;
  if(id==='kit:vox'){const ids=Object.keys(STX_VOXN),sms=ids.map(i=>SMP.get(i));if(sms.some(x=>!x))return;STX.sb[id]={sl:[],kit:null,loading:1};
    Promise.all(sms.map(sm=>ensureBuf(sm))).then(bufs=>{const kit=[];bufs.forEach((buf,i)=>{if(!buf)return;const rv=new AudioBuffer({length:buf.length,numberOfChannels:buf.numberOfChannels,sampleRate:buf.sampleRate});
      for(let ch=0;ch<buf.numberOfChannels;ch++){const a=buf.getChannelData(ch),b=rv.getChannelData(ch);for(let j=0,n=a.length;j<n;j++)b[j]=a[n-1-j]}kit.push({id:ids[i],buf,rev:rv,n:STX_VOXN[ids[i]],whole:/-hel$/.test(ids[i])})});
      if(!kit.length){delete STX.sb[id];return}STX.sb[id]={kit,sl:kit,norm:1};if(window.stxPaint)try{stxPaint()}catch(e){globalThis.__el&&globalThis.__el(e)}}).catch(()=>{delete STX.sb[id]});return}const sm=SMP.get(id);if(!sm)return;STX.sb[id]={sl:[],buf:null,loading:1};
  ensureBuf(sm).then(buf=>{if(!buf){delete STX.sb[id];return}const r=stxSlice(buf,sm.name),rv=new AudioBuffer({length:buf.length,numberOfChannels:buf.numberOfChannels,sampleRate:buf.sampleRate});
    for(let ch=0;ch<buf.numberOfChannels;ch++){const a=buf.getChannelData(ch),b=rv.getChannelData(ch);for(let i=0,n=a.length;i<n;i++)b[i]=a[n-1-i]}
    let sl=r.sl;const one=stx().smp.find(q=>q.id===id&&q.mode==='ett');if(one&&sl.length){const a=sl[0].a,b=buf.duration,nn=r.hint!=null?48+r.hint:sl.reduce((m,x)=>x.b-x.a>m.b-m.a?x:m,sl[0]).n;sl=[{a,b,n:nn}]}
    STX.sb[id]={buf,rev:rv,sl,norm:r.norm};if(window.stxPaint)try{stxPaint()}catch(e){globalThis.__el&&globalThis.__el(e)}}).catch(()=>{delete STX.sb[id]})}
function stxPlanCached(){const P=stx(),k=JSON.stringify([P.root,P.mode,P.prog,P.custom,P.rn,P.rh,P.arp,P.seed,P.mel,P.ed,P.pat,P.vc,P.subLo,(P.smp||[]).map(q=>[q.on,q.mode,q.amt,q.fx,q.id]),P.ls.ack.arp,P.ls.luft.arp,P.src,P.src==='piano'&&STX.live?STX.live.name:0]);if(k!==STX.pk||!STX.plan){STX.pk=k;STX.plan=stxPlan(P)}return STX.plan}
function stxEnsure(){if(STX.E||!ctx||!A||!A.buses)return STX.E;STX.E=stxEngine(ctx,A.buses.sy.in);STX.E.apply(stx());
  if(ctx.audioWorklet&&!STX.loading){STX.loading=true;stxFxNode(ctx).then(n=>{STX.E.useFx(n)}).catch(e=>{STX.err=String(e&&e.message||e)})}return STX.E}
function stxTick(t0){const P=stx();if(!ctx||!A||!A.buses)return;if(typeof ARR!=='undefined'&&ARR&&ARR.active&&!ARR.stx)return;if(!P.on&&!(P.k.pump>0&&STX.E))return;const E=stxEnsure();if(!E)return;
  const sd=stepDur()/tapeRate,t=Math.max(ctx.currentTime,t0+((gstep%2)?S.master.swing*sd*.66:0));E.P=P;{const al=+(P.k.atm||0);if(al>0||E.atmK)E.atmSet(INS_ATM.includes(P.atmK)?P.atmK:'vinyl',al*al*.6,t)}const pl=stxPlanCached();if(pl!==STX._ipl){STX._ipl=pl;try{insPrep(ctx,P,pl)}catch(e){globalThis.__el&&globalThis.__el(e)}}E.tick(t,gstep,sd,pl);
  if(P.on){STX.vis.push({t,g:gstep});if(STX.vis.length>64)STX.vis.splice(0,STX.vis.length-64)}}
{const _bp=beatPump;beatPump=function(t,st){_bp(t,st);try{stxTick(t)}catch(e){STX.err=String(e&&e.message||e)}}}
{const _sp=stop;stop=function(){_sp.apply(this,arguments);if(STX.E)STX.E.kill();STX.vis.length=0}}

