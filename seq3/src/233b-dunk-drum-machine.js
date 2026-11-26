/* ================= DUNK – BLONDA drum machine (v285) =================
   Eight synthesized drum channels, no samples. Each channel is one voice of the same small architecture, in the
   spirit of classic drum synths such as Microtonic:
     oscillator (sine / triangle / saw, attack + decay) whose pitch is swept by a decay envelope, a sine LFO or noise
     + noise (low / band / high pass, stereo option, exp / linear / clap envelope)
     → mix → drive → EQ → level → pan.
   BLONDA additions for weight: SUB (a sine an octave under the oscillator), CRUSH (bit steps) and the card's FAT
   (more drive and a low shelf on every channel).
   - Each channel is monophonic: a new hit cuts its last one; CHOKE groups cut each other (open / closed hat).
   - A drum track plays a channel when S.dk[track] = 'dk:<channel>' (trigger0, piece 109). The card's ON switch puts
     channels 1–8 on kick, snare, clap, hat, open hat, perc, toms, rim and puts back the old sounds when switched off.
   - The track's own tune / decay / tone still work on top (tune: pitch, decay: length, tone: noise colour).
   - Kits are stored in the project (S.dunk). Microtonic files ((.mtpreset / .mtpg kit + patterns, .mtdrum one channel) can be
     read: the eight patches become the kit, the patterns can go into SEQ.3's patterns A–D.
   Parameters keep Microtonic's units (Hz, ms, semitones, dB) so an imported preset needs no conversion. ================= */
(()=>{
  const MAP=['kick','snare','clap','hat','ohat','perc','tom','rim'];
  const WAVES=['sine','triangle','sawtooth'],WN=['SINE','TRI','SAW'],MN=['DECAY','SINE','NOISE'],FT=['lowpass','bandpass','highpass'],FN=['LP','BP','HP'],EN=['EXP','LIN','CLAP'];
  const P0={name:'init',wave:0,freq:60,atk:0,dcy:300,mod:0,rate:50,amt:0,nf:0,nfreq:2000,q:.7071,st:0,ne:0,natk:0,ndcy:50,mix:50,dist:0,eqf:1000,eqg:0,lvl:0,pan:0,ov:0,nv:0,mv:0,ck:0,sub:0,crush:0};
  const RNG={wave:[0,2],freq:[20,20000],atk:[0,10000],dcy:[1,20000],mod:[0,2],rate:[.01,20000],amt:[-96,96],nf:[0,2],nfreq:[20,20000],q:[.1,8000],st:[0,1],ne:[0,2],natk:[0,10000],ndcy:[1,20000],mix:[0,100],dist:[0,100],eqf:[20,20000],eqg:[-40,40],lvl:[-60,12],pan:[-100,100],ov:[0,200],nv:[0,200],mv:[0,200],ck:[0,4],sub:[0,1],crush:[0,1]};
  const fix=o=>{const p=Object.assign({},P0);if(o&&typeof o==='object'){for(const k in P0){if(k==='name'){if(typeof o.name==='string')p.name=o.name.slice(0,24);continue}const v=+o[k];if(isFinite(v))p[k]=Math.max(RNG[k][0],Math.min(RNG[k][1],v))}}return p};

  /* ---------------- the kits (our own sounds) ---------------- */
  const B={
    kick:{name:'Kick',wave:0,freq:50,dcy:480,mod:0,rate:45,amt:28,nf:0,nfreq:1600,q:.7,ne:0,ndcy:10,mix:90,dist:22,eqf:80,eqg:3,lvl:0},
    snare:{name:'Snare',wave:1,freq:190,dcy:120,mod:0,rate:18,amt:8,nf:1,nfreq:2600,q:.8,ne:0,ndcy:170,mix:40,dist:15,eqf:5000,eqg:3,lvl:3},
    clap:{name:'Clap',wave:0,freq:900,dcy:8,mod:0,rate:5,amt:0,nf:1,nfreq:1250,q:1.5,ne:2,ndcy:220,mix:3,dist:10,eqf:2400,eqg:2,lvl:2},
    hat:{name:'Hat',wave:2,freq:7800,dcy:16,mod:1,rate:2900,amt:30,nf:2,nfreq:8000,q:1.1,st:1,ne:0,ndcy:38,mix:20,dist:5,eqf:11000,eqg:3,lvl:-6,ck:1},
    ohat:{name:'Open hat',wave:2,freq:7800,dcy:90,mod:1,rate:2900,amt:30,nf:2,nfreq:8000,q:1.1,st:1,ne:0,ndcy:320,mix:20,dist:5,eqf:11000,eqg:3,lvl:-7,ck:1},
    perc:{name:'Perc',wave:1,freq:620,dcy:110,mod:0,rate:25,amt:12,nf:1,nfreq:3000,q:4,ne:0,ndcy:25,mix:82,dist:8,eqf:1200,eqg:2,lvl:0},
    tom:{name:'Tom',wave:0,freq:110,dcy:360,mod:0,rate:70,amt:12,nf:0,nfreq:900,q:.7,ne:0,ndcy:35,mix:88,dist:12,eqf:200,eqg:2,lvl:-3},
    rim:{name:'Rim',wave:1,freq:1700,dcy:20,mod:0,rate:4,amt:7,nf:1,nfreq:4800,q:3,ne:0,ndcy:16,mix:60,dist:22,eqf:3000,eqg:2,lvl:1}};
  const kit=(name,fat,o)=>({name,fat,p:MAP.map(k=>fix(Object.assign({},B[k],o[k]||{})))});
  const KITS=[
    kit('Dunk',.35,{kick:{sub:.2}}),
    kit('Tonal',.1,{kick:{freq:56,dcy:300,amt:22,rate:30,dist:8},snare:{freq:220,mix:60,nfreq:1800,ndcy:120,dist:6},clap:{nfreq:1600,ndcy:180},
      hat:{wave:0,freq:4200,mod:1,rate:1310,amt:48,mix:60,nfreq:9000,ndcy:26,lvl:-8},ohat:{wave:0,freq:4200,mod:1,rate:1310,amt:48,mix:60,nfreq:9000,dcy:160,ndcy:220,lvl:-9},
      perc:{name:'Pluck',wave:0,freq:820,mod:0,rate:12,amt:24,dcy:70,mix:95,dist:2},tom:{name:'Tone',wave:1,freq:160,dcy:260,amt:7},rim:{wave:0,freq:2400,dcy:30,mod:2,rate:900,amt:4,mix:80}}),
    kit('Grit',.7,{kick:{dist:70,dcy:600,crush:.25,eqf:120,eqg:5},snare:{nf:2,nfreq:1500,dist:60,crush:.2},clap:{dist:50,crush:.3},hat:{crush:.5,dist:30},ohat:{crush:.5,dist:30},
      perc:{wave:2,freq:300,dist:60,crush:.35,name:'Metal'},tom:{dist:50,crush:.2},rim:{crush:.6,dist:40}}),
    kit('Deep',.2,{kick:{freq:45,dcy:650,amt:18,rate:60,dist:6,eqf:60,eqg:4,sub:.35},snare:{freq:200,nf:0,nfreq:6000,ndcy:140,mix:30,dist:4,eqg:0},clap:{ndcy:300,nfreq:1100,lvl:-2},
      hat:{wave:0,mod:0,amt:0,mix:4,nfreq:9000,ndcy:30,lvl:-9},ohat:{wave:0,mod:0,amt:0,mix:4,nfreq:9000,ndcy:260,lvl:-10},
      perc:{name:'Conga',wave:0,freq:330,amt:6,rate:20,dcy:180,mix:97,dist:3},tom:{wave:0,freq:140,dcy:300},rim:{name:'Clave',wave:0,freq:2500,dcy:25,mix:96,amt:2}}),
    kit('Electro',.4,{kick:{wave:1,freq:55,dcy:420,amt:36,rate:25,dist:30},snare:{freq:240,nf:2,nfreq:2200,dist:20},
      hat:{mod:2,rate:6000,amt:24},ohat:{mod:2,rate:6000,amt:24},perc:{name:'Cowbell',wave:2,freq:560,mod:1,rate:270,amt:7,nf:1,nfreq:800,q:3,dcy:180,mix:92},
      tom:{wave:1,freq:120,amt:16,rate:40}}),
    kit('Boom',.5,{kick:{name:'808',freq:42,dcy:1600,amt:12,rate:90,dist:35,sub:.4,eqf:50,eqg:4,ndcy:6,lvl:-4},snare:{freq:210,ndcy:130,nfreq:3200,dist:25},clap:{ndcy:350,lvl:0},
      hat:{dcy:10,ndcy:22},ohat:{ndcy:240},perc:{wave:0,freq:700,dcy:90,amt:18,rate:10,mix:96,name:'Pluck'},tom:{name:'808 tom',freq:80,dcy:900,amt:9,rate:80,mix:98},rim:{dist:30}}),
    kit('Glass',.15,{kick:{freq:70,dcy:180,amt:40,rate:15,dist:10},snare:{wave:0,freq:330,mod:2,rate:40,amt:12,nfreq:6000,q:6,mix:45},clap:{nfreq:3000,q:3},
      hat:{wave:0,freq:10000,mod:1,rate:7000,amt:60,mix:50,ndcy:20},ohat:{wave:0,freq:10000,mod:1,rate:7000,amt:60,mix:50,dcy:200,ndcy:200},
      perc:{name:'Bell',wave:0,freq:1500,mod:1,rate:2200,amt:30,dcy:260,mix:98,dist:0},tom:{wave:0,freq:280,amt:18},rim:{wave:0,freq:3200,dcy:12}}),
    kit('Psy',.45,{kick:{freq:52,dcy:260,amt:34,rate:22,dist:35,eqf:1200,eqg:4},snare:{nfreq:3200,ndcy:110,mix:25},clap:{ndcy:140},
      hat:{wave:0,mod:0,amt:0,mix:2,nfreq:10000,ndcy:20},ohat:{wave:0,mod:0,amt:0,mix:2,nfreq:10000,ndcy:160},perc:{name:'Zap',wave:2,freq:1100,mod:0,rate:8,amt:30,dcy:60,crush:.2},tom:{freq:150,amt:20,rate:30}}),
    kit('Lo-Fi',.3,{kick:{crush:.45,nf:0,dist:20},snare:{crush:.5,nf:0,nfreq:4500},clap:{crush:.5,nf:0,nfreq:2000,q:1},hat:{crush:.6,nf:1,nfreq:7000},ohat:{crush:.6,nf:1,nfreq:7000},
      perc:{crush:.5},tom:{crush:.45},rim:{crush:.55}}),
    kit('Micro',.1,{kick:{freq:60,dcy:150,amt:20,rate:12,dist:12},snare:{dcy:60,ndcy:70,nfreq:4200,mix:30},clap:{ndcy:110,nfreq:2200},
      hat:{dcy:6,ndcy:9,nfreq:11000,lvl:-5},ohat:{dcy:30,ndcy:90,nfreq:11000},perc:{name:'Tick',wave:0,freq:1800,dcy:15,amt:14,rate:3,mix:90},tom:{freq:190,dcy:120},rim:{dcy:10,ndcy:8}})];

  /* ---------------- grooves (our own) ---------------- */
  const GROOVES=[
    ['Four floor',{kick:'X...x...X...x...',clap:'....x.......x...',hat:'x.x.x.x.x.x.x.x.',ohat:'..x...x...x...x.'}],
    ['Minimal',{kick:'X...x...X...x..x',clap:'....x.......x...',hat:'..x...x...x...x.',perc:'...x..x....x..x.',rim:'.x.....x..x.....'}],
    ['Breaks',{kick:'X.....x...x.....',snare:'....X.......X...',hat:'x.x.x.x.x.x.x.x.',ohat:'.......x........',tom:'..........x..x..'}],
    ['Electro',{kick:'X.....X...x.....',snare:'....X.......X...',hat:'X.x.X.x.X.x.X.x.',perc:'......x.......x.'}],
    ['Psy',{kick:'X...X...X...X...',clap:'....x.......x...',hat:'..x...x...x...x.',perc:'.x.x...x.x.x...x'}],
    ['Trap',{kick:'X......x..x.....',snare:'........X.......',hat:'xxxxxxxxXxxxXxXx',ohat:'..............x.',tom:'...........x....'}],
    ['Shuffle',{kick:'X...x...X...x...',clap:'....x.......x...',hat:'..x...x...x...x.',perc:'..x..x..x..x.x..',rim:'...x.......x....'}],
    ['Broken',{kick:'X..x....x.x.....',snare:'....X..x....X...',hat:'x.xxx.x.x.xxx.x.',perc:'..x.......x...x.'}],
    ['Dub',{kick:'X...x...X...x...',clap:'....x.......x...',hat:'..x...x...x...x.',perc:'...x..x....x....',rim:'......x.......x.'}],
    ['Tom roll',{kick:'X...x...X...x...',snare:'....X.......X...',hat:'x.x.x.x.x.x.x.x.',tom:'x..x..x.xx.x.xxx'}]];

  /* ---------------- state ---------------- */
  const st=()=>{if(!S.dunk||typeof S.dunk!=='object'||!Array.isArray(S.dunk.p)||S.dunk.p.length!==8){const k=KITS[0];S.dunk={kit:k.name,fat:k.fat,p:k.p.map(fix),on:false,prev:{},sel:0}}
    const d=S.dunk;if(!d.p.every(x=>x&&typeof x==='object'))d.p=d.p.map(fix);if(!(d.sel>=0&&d.sel<8))d.sel=0;if(!d.prev||typeof d.prev!=='object')d.prev={};if(!isFinite(+d.fat))d.fat=.3;return d};

  /* ---------------- the voice ---------------- */
  const tanhC=new Map(),stepC=new Map();
  /* drive: soft at low settings, a hard overdrive at the top; a little offset adds even harmonics (warmth) */
  const tanhCurve=k=>{k=Math.round(k*4)/4;let c=tanhC.get(k);if(c)return c;const n=4096,a=.12,f=x=>Math.tanh(k*(x+a))-Math.tanh(k*a),d=Math.max(Math.abs(f(1)),Math.abs(f(-1)));c=new Float32Array(n);for(let i=0;i<n;i++){const x=i/(n-1)*2-1;c[i]=f(x)/d}tanhC.set(k,c);return c};
  const stepCurve=a=>{const L=Math.max(3,Math.round(3+Math.pow(1-a,2)*125));let c=stepC.get(L);if(c)return c;const n=4096;c=new Float32Array(n);for(let i=0;i<n;i++){const x=i/(n-1)*2-1;c[i]=Math.round(x*L)/L}stepC.set(L,c);return c};
  const last=new Array(8).fill(null);
  /* Microtonic's oscillator "triggers at full force" with attack 0, a distinct click: the sine starts at its peak (cosine phase) */
  const cosW=new WeakMap();const cosWave=c=>{let w=cosW.get(c);if(!w){w=c.createPeriodicWave(new Float32Array([0,1]),new Float32Array([0,0]),{disableNormalization:true});cosW.set(c,w)}return w};
  const cut=(v,t)=>{try{v.vg.gain.cancelAndHoldAtTime(t);v.vg.gain.setTargetAtTime(0,t,.003)}catch(e){globalThis.__el&&globalThis.__el(e)}stopV(v,t+.03)};
  const CAL=.75;
  /* a Microtonic kit plays about 9 dB louder here than in Microtonic (A/B against a recording of the same preset), so imports are trimmed */
  const IMPORT_TRIM=-9;
  /* constants of the Microtonic match, kept together so the A/B tests can try values */
  const TUNE={cosStart:true,expAtk:true,modLin:false,eqQ:.4,eqQn:.4,eqK:.85,eqFree:6,mixRev:false,dcyK:4.6,ndcyK:4.6,modK:4.6};/* level match with SEQ.3's own drums (same peak for the default kick) */
  let SRC=null;/* the sources of the voice being built */
  const nz=(c,t,end)=>{const s=c.createBufferSource();s.buffer=A.noise;s.loop=true;s.start(t,Math.random()*Math.max(.01,A.noise.duration-.05));SRC.push(s);return s};
  function voice(ch,t,vel,tp,out){const c=ctx;if(!c||!A.noise)return;const d=st(),P=d.p[ch];if(!P)return;
    tp=tp||{};const tune=+tp.tune||0,dsc=Math.pow(2,((tp.decay??.45)-.45)*2.2),tsc=Math.pow(2,((tp.tone??.5)-.5)*2.5);
    vel=Math.max(0,Math.min(1,vel==null?.8:vel));
    /* Microtonic: a step without accent plays at velocity 64, with accent 127. SEQ.3's steps are .72 and 1, so they map onto that */
    const mv=vel<=.72?vel/.72*.5:.5+(vel-.72)/.28*.5,sens=P.ov||P.nv||P.mv;const vs=s=>Math.max(0,1-s/100*(1-mv));
    /* the channel's own last hit, and its choke group */
    if(last[ch])cut(last[ch],t);if(P.ck)for(let j=0;j<8;j++)if(j!==ch&&last[j]&&d.p[j].ck===P.ck)cut(last[j],t);
    SRC=[];
    const atk=P.atk/1000,dcy=Math.max(.001,P.dcy/1000*dsc),natk=P.natk/1000,ndcy=Math.max(.001,P.ndcy/1000*dsc);
    const oLen=atk+dcy*1.5,nLen=natk+(P.ne===1?ndcy:ndcy*1.5)+(P.ne===2?.03:0),end=t+Math.max(oLen,nLen)+.06;
    const sum=c.createGain();const mixO=TUNE.mixRev?1-P.mix/100:P.mix/100,mixN=1-mixO;
    /* oscillator (+ sub) */
    if(mixO>.0005){const f=Math.max(5,Math.min(20000,P.freq*Math.pow(2,tune/12)));const o=c.createOscillator();if(TUNE.cosStart&&(P.wave|0)===0)o.setPeriodicWave(cosWave(c));else o.type=WAVES[P.wave|0]||'sine';o.frequency.setValueAtTime(f,t);
      const og=c.createGain(),pk=Math.max(1e-6,mixO*vs(P.ov));og.gain.setValueAtTime(0,t);
      if(atk>.0005){if(TUNE.expAtk){og.gain.setValueAtTime(pk*.001,t);og.gain.exponentialRampToValueAtTime(Math.max(1e-5,pk),t+atk)}else og.gain.linearRampToValueAtTime(pk,t+atk)}else og.gain.setValueAtTime(pk,t);
      og.gain.setTargetAtTime(0,t+Math.max(atk,.0004),dcy/TUNE.dcyK);
      const oscs=[o];o.connect(og);
      if(P.sub>.001){const s=c.createOscillator();s.type='sine';s.frequency.setValueAtTime(f/2,t);const sg=c.createGain();sg.gain.value=P.sub*1.2;s.connect(sg).connect(og);oscs.push(s)}
      const amt=P.amt*vs(P.mv)*100;
      if(Math.abs(amt)>.5){
        if(P.mod===0){const r=Math.max(.0005,P.rate/1000*dsc)/TUNE.modK;oscs.forEach(x=>{x.detune.setValueAtTime(amt,t);if(TUNE.modLin)x.detune.linearRampToValueAtTime(0,t+Math.max(.0005,P.rate/1000*dsc));else x.detune.setTargetAtTime(0,t,r)})}
        else{let src;if(P.mod===1){src=c.createOscillator();src.type='sine';src.frequency.value=Math.max(.01,P.rate);src.start(t);SRC.push(src)}
          else{const n=nz(c,t,end),lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=Math.max(1,Math.min(20000,P.rate));lp.Q.value=.5;n.connect(lp);src=lp}
          const mg=c.createGain();mg.gain.value=P.mod===2?amt*Math.min(6,Math.sqrt(c.sampleRate/2/Math.max(1,P.rate))*.6):amt;src.connect(mg);oscs.forEach(x=>mg.connect(x.detune))}}
      oscs.forEach(x=>{x.start(t);SRC.push(x)});og.connect(sum)}
    /* noise */
    if(mixN>.0005){const ng=c.createGain(),pk=Math.max(1e-6,mixN*vs(P.nv));const g=ng.gain;g.setValueAtTime(0,t);
      if(P.ne===2){/* clap: bursts for the attack time (Microtonic: the attack sets the number of triggers and the time between them), then the tail */
        const span=natk>.002?natk:.03,nb=Math.max(2,Math.min(8,Math.round(span/.01))),sp=span/nb;
        for(let k=0;k<nb;k++){const a=t+k*sp;g.setValueAtTime(0,a);g.linearRampToValueAtTime(pk,a+.0006);g.setTargetAtTime(pk*.08,a+.0006,sp/3)}
        const a=t+nb*sp;g.setValueAtTime(0,a);g.linearRampToValueAtTime(pk,a+.0006);g.setTargetAtTime(0,a+.0006,ndcy/6.9)}
      else{if(natk>.0005&&P.ne===0&&TUNE.expAtk){g.setValueAtTime(pk*.001,t);g.exponentialRampToValueAtTime(Math.max(1e-5,pk),t+natk)}else if(natk>.0005)g.linearRampToValueAtTime(pk,t+natk);else g.setValueAtTime(pk,t);if(P.ne===1)g.linearRampToValueAtTime(0,t+natk+ndcy);else g.setTargetAtTime(0,t+Math.max(natk,.0004),ndcy/TUNE.ndcyK)}
      const mk=()=>{const n=nz(c,t,end),f=c.createBiquadFilter();f.type=FT[P.nf|0]||'lowpass';f.frequency.value=Math.max(20,Math.min(c.sampleRate*.45,P.nfreq*tsc*Math.pow(2,tune/24)));f.Q.value=P.nf===1?Math.min(300,Math.max(.1,P.q)):Math.max(-20,Math.min(40,20*Math.log10(Math.max(.1,P.q))));/* Web Audio: LP/HP Q is in dB */n.connect(f);if(P.nf!==1)return f;
        /* band pass as a state-variable filter: its peak rises with Q, so a narrow band still sounds (low BP noise kicks) */
        const q=Math.max(.1,P.q),bg=c.createGain();bg.gain.value=q<=30?q:30*Math.sqrt(q/30);f.connect(bg);return bg};
      if(P.st){const m=c.createChannelMerger(2);mk().connect(m,0,0);mk().connect(m,0,1);m.connect(ng)}else mk().connect(ng);
      ng.connect(sum)}
    /* drive → EQ → fat shelf → crush → level → pan */
    let node=sum;const fat=+d.fat||0,drv=P.dist/100*13+fat*4;
    if(drv>.05){const w=c.createWaveShaper();w.curve=tanhCurve(1+drv);w.oversample='none';/* Microtonic: the only part not made alias-free */node.connect(w);node=w}
    if(Math.abs(P.eqg)>.05){const e=c.createBiquadFilter();e.type='peaking';e.frequency.value=Math.max(20,Math.min(c.sampleRate*.45,P.eqf));e.Q.value=P.eqg<0?TUNE.eqQn:TUNE.eqQ;e.gain.value=P.eqg;node.connect(e);node=e}
    /* as in Microtonic: a strong EQ boost turns the channel down so the volume stays about the same */
    const eqComp=P.eqg>TUNE.eqFree?Math.pow(10,-(P.eqg-TUNE.eqFree)*TUNE.eqK/20):1;
    if(fat>.01){const e=c.createBiquadFilter();e.type='lowshelf';e.frequency.value=95;e.gain.value=fat*5;node.connect(e);node=e}
    if(P.crush>.01){const w=c.createWaveShaper();w.curve=stepCurve(P.crush);node.connect(w);node=w}
    const vg=c.createGain();vg.gain.value=CAL*Math.pow(10,(+d.trim||0)/20)*eqComp*Math.pow(10,P.lvl/20)*(sens?1:.5+.5*vel);/* a patch without velocity settings still hears the accent */node.connect(vg);
    if(Math.abs(P.pan)>.5){const pn=c.createStereoPanner();pn.pan.value=Math.max(-1,Math.min(1,P.pan/100));vg.connect(pn).connect(out)}else vg.connect(out);
    /* when the sources stop: a short voice at its end; a long one (a tail of seconds) as soon as the channel's next hit or its choke
       cuts it, else at its end (the housekeeping below) */
    const v={vg,srcs:SRC,end,stopped:false};SRC=null;if(RENDER||end-t<.6)stopV(v,end);last[ch]=v;if(!RENDER)LIVE.add(v);
    if(ch===0&&!RENDER&&typeof pump==='function')pump(t)}
  const LIVE=new Set();
  function stopV(v,at){if(v.stopped)return;v.stopped=true;const a=Math.min(v.end,at);for(const s of v.srcs)try{s.stop(a)}catch(e){globalThis.__el&&globalThis.__el(e)}}
  setInterval(()=>{if(!ctx)return;const now=ctx.currentTime;for(const v of LIVE){if(!v.stopped&&v.end<=now+1)stopV(v,v.end);if(v.stopped&&v.end<now-1)LIVE.delete(v)}},250);
  let RENDER=false;
  /* offline render for tests: one channel of the current kit (or a list of [channel, time, velocity]) → [L,R] */
  window.__dunkRender=async(ch,dur,sr,vel,tp)=>{sr=sr||48000;const oc=new OfflineAudioContext(2,Math.ceil(dur*sr),sr),real=ctx,rn=A.noise,keep=last.slice();
    const nb=oc.createBuffer(1,sr*1.5,sr),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
    try{ctx=oc;A.noise=nb;RENDER=true;last.fill(null);if(Array.isArray(ch)){for(const [c,t,v] of ch)voice(c,t,v,tp||null,oc.destination)}else if(typeof ch==='string'){const id=ch,P=S.params[id],v=vel==null?.9:vel;if(id==='hat'||id==='ohat')VOICE.hat(.01,v,P,oc.destination,id==='ohat');else VOICE[id](.01,v,P,oc.destination,null,57,.2)}else voice(ch,.01,vel==null?.9:vel,tp||null,oc.destination)}finally{ctx=real;A.noise=rn;RENDER=false;keep.forEach((v,i)=>last[i]=v)}
    const b=await oc.startRendering();return [b.getChannelData(0),b.getChannelData(1)]};

  /* ---------------- Microtonic files ---------------- */
  /* Microtonic's text: "Key: value" with { } blocks (version 3), "Key = value" in older files */
  function parseTree(txt){const root={},stack=[root];
    for(const raw of String(txt).split(/\r?\n/)){const line=raw.trim();if(!line)continue;if(line==='}'){if(stack.length>1)stack.pop();continue}
      const i=line.search(/[:=]/);if(i<=0)continue;const k=line.slice(0,i).trim(),v=line.slice(i+1).trim();const cur=stack[stack.length-1];
      if(v==='{'){const o={};cur[k]=o;stack.push(o)}else cur[k]=v.length>1&&v[0]==='"'&&v[v.length-1]==='"'?v.slice(1,-1):v.replace(/[,;]$/,'').trim()}
    return root}
  const num=(v,def)=>{if(v==null)return def;if(/^\s*\+?inf/i.test(String(v)))return 1e9;if(/^\s*-inf/i.test(String(v)))return -1e9;const m=/^\s*([+-]?[\d.]+(?:e[+-]?\d+)?)\s*([a-z%]*)/i.exec(String(v));if(!m)return def;let x=parseFloat(m[1]);const u=m[2].toLowerCase();
    if(u==='khz')x*=1000;else if(u==='s')x*=1000;return isFinite(x)?x:def};
  const unit=v=>{const m=/[\d.]\s*([a-z]+)/i.exec(String(v||''));return m?m[1].toLowerCase():''};
  const pick=(v,list,def)=>{const s=String(v||'').toLowerCase();const i=list.findIndex(x=>s.startsWith(x));return i>=0?i:def};
  function toPatch(o){const mix=String(o.Mix||'').split('/');const mo=mix.length===2?num(mix[0],50):num(o.Mix,50);
    const mod=pick(o.ModMode,['decay','sine','noise'],0);let rate=num(o.ModRate,50);const u=unit(o.ModRate);
    if(mod===0&&u==='hz')rate=1000/Math.max(.01,rate);if(mod>0&&(u==='ms'||u==='s'))rate=1000/Math.max(.01,rate);
    const pan=num(o.Pan,0);
    return fix({name:o.Name||o.name||'patch',wave:pick(o.OscWave,['sin','tri','saw'],0),freq:num(o.OscFreq,60),atk:num(o.OscAtk,0),dcy:num(o.OscDcy,300),mod,rate,amt:num(o.ModAmt,0),
      nf:pick(o.NFilMod,['lp','bp','hp'],0),nfreq:num(o.NFilFrq,2000),q:num(o.NFilQ,.7071),st:/on|true|1/i.test(String(o.NStereo||''))?1:0,ne:pick(o.NEnvMod,['exp','lin','mod'],0),
      natk:num(o.NEnvAtk,0),ndcy:num(o.NEnvDcy,50),mix:mo,dist:num(o.DistAmt,0),eqf:num(o.EQFreq,1000),eqg:num(o.EQGain,0),lvl:num(o.Level,0),pan,
      ov:num(o.OscVel,0),nv:num(o.NVel,0),mv:num(o.ModVel,0),ck:/^\s*on/i.test(String(o.Choke||''))?1:0})}
  const isPatch=o=>o&&typeof o==='object'&&('OscFreq' in o||'OscWave' in o||'NFilFrq' in o);
  function stepsOf(v){if(v==null)return null;if(typeof v==='object')return Object.keys(v).sort((a,b)=>a-b).map(k=>/^(1|on|true|#|x)$/i.test(String(v[k]).trim()));
    const s=String(v).trim();if(/^0x[0-9a-f]+$/i.test(s)){const n=parseInt(s,16);return Array.from({length:16},(_,i)=>!!(n&(1<<i)))}
    const c=s.replace(/[\s"]/g,'');if(!c)return null;return [...c].map(ch=>/[#xX*1oO]/.test(ch))}
  function readFile(txt){const T=parseTree(txt);const top=Object.values(T).find(v=>v&&typeof v==='object')||T;
    if(isPatch(top))return {patch:toPatch(top)};
    const dp=top.DrumPatches||top.Patches;if(!dp||typeof dp!=='object')return null;
    const p=[];for(let i=1;i<=8;i++){const o=dp[String(i)]||dp[String(i-1)]||Object.values(dp)[i-1];p.push(isPatch(o)?toPatch(o):fix({}))}
    const mu=String(top.Mutes||'').replace(/[{}]/g,'').split(',').map(x=>/^\s*on/i.test(x));/* muted channels stay silent, as in Microtonic */
    const pats=[];const PT=top.Patterns;if(PT&&typeof PT==='object')for(const key of Object.keys(PT)){const P=PT[key];if(!P||typeof P!=='object')continue;
      const len=Math.max(1,Math.min(16,Math.round(num(P.Length,16))));const rows=[],fills=[];
      for(let i=1;i<=8;i++){const r=P[String(i)]||{};const tg=stepsOf(r.Triggers)||[],ac=stepsOf(r.Accents)||[],fl=stepsOf(r.Fills)||[];rows.push(Array.from({length:16},(_,s)=>!mu[i-1]&&s<len&&tg[s]?(ac[s]?2:1):0));
        fills.push(Array.from({length:16},(_,s)=>!mu[i-1]&&s<len&&fl[s]&&tg[s]?1:0))}/* a fill is a roll on a step that has a trigger */
      if(rows.some(r=>r.some(x=>x)))pats.push({key,len,rows,fills,swing:num(P.Swing,0)})}
    const sr=String(top.StepRate||'1/16').replace(/\s/g,'');const m=/^1\/(\d+)(T?)$/i.exec(sr);let k16=1;if(m){k16=16/(+m[1]);if(m[2])k16*=2/3}
    return {p,pats,fillRate:Math.max(1,Math.min(8,num(top.FillRate,2))),tempo:num(top.Tempo,0),swing:num(top.Swing,0),k16,stepRate:sr,name:typeof top.Name==='string'?top.Name:''}}

  /* ---------------- applying ---------------- */
  const tIdx=id=>TRACKS.findIndex(t=>t.id===id);
  const isOn=()=>MAP.some(id=>String((S.dk||{})[id]||'').startsWith('dk:'));
  function setOn(on){const d=st();if(on===isOn())return;d.on=on;
    /* channels 7 and 8 (toms, rim) are drum tracks 7–8: a project with only 6 drum tracks gets them back, or they would stay silent */
    if(on)try{const c=trkCfg();while(c.nd<8){const i=TRK_D[c.nd];trkClear(i);c.nd++;if(ctx&&typeof applyTrack==='function')applyTrack(i)}}catch(e){globalThis.__el&&globalThis.__el(e)}
    MAP.forEach((id,c)=>{if(tIdx(id)<0)return;if(on){if(!String(S.dk[id]||'').startsWith('dk:'))d.prev[id]=S.dk[id]||'';S.dk[id]='dk:'+c}
      else if(String(S.dk[id]||'').startsWith('dk:')){const pv=d.prev[id];if(pv)S.dk[id]=pv;else delete S.dk[id]}});
    if(!on)d.prev={}}
  function loadKit(k){const d=st();d.fill=null;d.trim=0;d.kit=k.name;d.p=k.p.map(fix);if(k.fat!=null)d.fat=k.fat;setOn(true)}
  function writeRows(pi,rows){const pat=S.pats[pi];if(!pat)return;MAP.forEach((id,c)=>{const i=tIdx(id);if(i<0||!pat[i])return;const r=rows[c];if(!r)return;
    for(let s=0;s<16;s++){const old=pat[i][s]||{};pat[i][s]={v:r[s]|0,n:old.n}}})}
  const fromGroove=g=>MAP.map(id=>{const s=g[id]||'';return Array.from({length:16},(_,i)=>s[i]==='X'?2:s[i]==='x'?1:0)});
  const done=()=>{try{renderAll()}catch(e){globalThis.__el&&globalThis.__el(e)}try{save()}catch(e){globalThis.__el&&globalThis.__el(e)}build()};

  /* ---------------- the card ---------------- */
  const card=document.querySelector('.card[data-card="dunk"]');const body=card&&card.querySelector('.dkb');
  const audition=c=>{try{initAudio();ctx.resume()}catch(e){globalThis.__el&&globalThis.__el(e)}if(!ctx)return;const id=MAP[c],i=tIdx(id);
    if(i>=0&&String(S.dk[id]||'')==='dk:'+c){trigger(i,ctx.currentTime+.015,.9);return}
    const o=i>=0&&A.ch&&A.ch[i]?(A.ch[i].inp||A.ch[i].g):(A.out||ctx.destination);voice(c,ctx.currentTime+.015,.9,i>=0?S.params[id]:null,o)};
  let sig='';const sigNow=()=>{const d=st();return JSON.stringify([d.kit,d.p,d.fat,d.sel,isOn()])};
  let dirty=false;const touch=()=>{if(!dirty){try{pushHist()}catch(e){globalThis.__el&&globalThis.__el(e)}dirty=true}};const settle=()=>{dirty=false;sig=sigNow();try{save()}catch(e){globalThis.__el&&globalThis.__el(e)}};
  const LOG=(a,b)=>({toN:v=>Math.log(Math.max(a,v)/a)/Math.log(b/a),fromN:u=>a*Math.pow(b/a,u)});
  const POW=(b,e)=>({toN:v=>Math.pow(Math.max(0,v)/b,1/e),fromN:u=>b*Math.pow(u,e)});
  const hz=v=>v>=1000?(v/1000).toFixed(v>=10000?1:2)+'k':v>=100?Math.round(v)+'':v.toFixed(1);
  const ms=v=>v>=1000?(v/1000).toFixed(2)+'s':v>=10?Math.round(v)+'ms':v.toFixed(1)+'ms';
  const pc=v=>Math.round(v)+'%';
  const DEFS={
    OSC:[['freq','Pitch',20,12000,hz,LOG(20,12000)],['atk','Attack',0,2000,ms,POW(2000,3)],['dcy','Decay',1,8000,ms,LOG(1,8000)],['sub','Sub',0,1,v=>pc(v*100)],['ov','Vel',0,100,pc]],
    MOD:[['rate','Rate',.1,8000,null,LOG(.1,8000)],['amt','Amount',-96,96,v=>(v>0?'+':'')+v.toFixed(1)+'st'],['mv','Vel',0,100,pc]],
    NOISE:[['nfreq','Filter',20,20000,hz,LOG(20,20000)],['q','Q',.1,30,v=>v.toFixed(2),LOG(.1,30)],['natk','Attack',0,2000,ms,POW(2000,3)],['ndcy','Decay',1,8000,ms,LOG(1,8000)],['nv','Vel',0,100,pc]],
    OUT:[['mix','Osc/noise',0,100,v=>Math.round(v)+'/'+Math.round(100-v)],['dist','Drive',0,100,pc],['eqf','EQ freq',20,20000,hz,LOG(20,20000)],['eqg','EQ gain',-24,24,v=>(v>0?'+':'')+v.toFixed(1)+'dB'],
      ['crush','Crush',0,1,v=>pc(v*100)],['lvl','Level',-40,12,v=>(v>0?'+':'')+v.toFixed(1)+'dB'],['pan','Pan',-100,100,v=>Math.abs(v)<.5?'C':(v<0?'L':'R')+Math.round(Math.abs(v))]]};
  const SEG={wave:WN,mod:MN,nf:FN,ne:EN,st:['MONO','STEREO'],ck:['—','A','B','C','D']};
  let knobs=[];
  function paint(){if(!body)return;const d=st();const rd=card.querySelector('#dkRead');if(rd)rd.textContent=d.kit||'kit';
    body.querySelector('.dk-kit b').textContent=d.kit||'kit';const on=isOn();body.querySelector('.dk-on').classList.toggle('on',on);body.querySelector('.dk-on').textContent=on?'ON DRUMS':'OFF';
    body.querySelectorAll('.dk-pad').forEach((b,c)=>{b.classList.toggle('sel',c===d.sel);b.querySelector('b').textContent=d.p[c].name;const ti=tIdx(MAP[c]);b.querySelector('small').textContent=(c+1)+' · '+(ti>=0?TRACKS[ti].name:MAP[c])});
    const P=d.p[d.sel];body.querySelectorAll('[data-seg]').forEach(g=>{const k=g.dataset.seg;g.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('on',(P[k]|0)===i))});
    knobs.forEach(k=>k.refresh());body.querySelector('.dk-name').value=P.name}
  function build(){if(!body)return;const d=st();
    body.innerHTML=`<div class="dk-top"><button class="dk-arw" data-k="-1" aria-label="Previous kit">‹</button><div class="dk-kit"><small>KIT</small><b></b></div><button class="dk-arw" data-k="1" aria-label="Next kit">›</button>
      <button class="dk-on"></button><button class="dk-imp">IMPORT</button><input type="file" class="dk-file" hidden></div>
      <div class="dk-pads">${MAP.map((_,c)=>`<button class="dk-pad" data-c="${c}"><b></b><small></small></button>`).join('')}</div>
      <div class="dk-ed"><div class="dk-row"><input class="dk-name" maxlength="24" aria-label="Sound name" spellcheck="false"><span class="dk-segs"></span></div><div class="dk-secs"></div></div>
      <div class="dk-gr"><small>GROOVES · into pattern</small><div class="dk-grl">${GROOVES.map((g,i)=>`<button data-g="${i}">${g[0]}</button>`).join('')}</div></div>
      <div class="dk-mv"><small>MOVES · press ● and ▶, then turn a knob · it plays back in the pattern</small><div class="dk-mvl"></div></div>
      <div class="dk-msg" aria-live="polite"></div>`;
    const segs=body.querySelector('.dk-segs');
    const secs=body.querySelector('.dk-secs');knobs=[];
    const addSeg=(host,k,lab)=>{const g=document.createElement('span');g.className='dk-seg';g.dataset.seg=k;g.innerHTML=(lab?`<i>${lab}</i>`:'')+SEG[k].map((n,i)=>`<button data-i="${i}">${n}</button>`).join('');
      g.onclick=e=>{const b=e.target.closest('button');if(!b)return;touch();st().p[st().sel][k]=+b.dataset.i;settle();paint();if(k==='mod')build();else audition(st().sel)};host.appendChild(g)};
    for(const sec of Object.keys(DEFS)){const s=document.createElement('div');s.className='dk-sec';s.innerHTML=`<div class="dk-h">${sec}</div><div class="dk-segrow"></div><div class="dk-kn"></div>`;secs.appendChild(s);
      const sr=s.querySelector('.dk-segrow'),kn=s.querySelector('.dk-kn');
      if(sec==='OSC')addSeg(sr,'wave');if(sec==='MOD')addSeg(sr,'mod');if(sec==='NOISE'){addSeg(sr,'nf');addSeg(sr,'ne');addSeg(sr,'st')}if(sec==='OUT')addSeg(sr,'ck','CHOKE');
      for(const [k,l,mn,mx,f,map] of DEFS[sec]){let o={label:l,min:mn,max:mx,def:P0[k]??0,cls:'sm',get:()=>st().p[st().sel][k],set:v=>{touch();st().p[st().sel][k]=Math.max(mn,Math.min(mx,v))},end:()=>{settle();audition(st().sel)},fmt:f||(v=>String(Math.round(v)))};
        if(k==='rate'){const dec=st().p[st().sel].mod===0;o=Object.assign(o,dec?{label:'Time',min:1,max:2000,fmt:ms}:{min:.1,max:8000},LOG(dec?1:.1,dec?2000:8000));if(!dec)o.fmt=v=>hz(v)+'Hz'}
        else if(map)Object.assign(o,map);
        if(k==='amt'||k==='eqg'||k==='pan')o.bi=true;
        const el=__dknob(kn,o);knobs.push(el);try{mlReg(el,{key:()=>'d.'+st().sel+'.'+k,label:()=>'dunk '+(st().sel+1)+' '+String(o.label).toLowerCase(),min:o.min,max:o.max,paint:()=>el.refresh()})}catch(e){globalThis.__el&&globalThis.__el(e)}}}
    {const s=document.createElement('div');s.className='dk-sec dk-fat';s.innerHTML='<div class="dk-h">KIT</div><div class="dk-kn"></div>';secs.appendChild(s);
      knobs.push(__dknob(s.querySelector('.dk-kn'),{label:'Fat',min:0,max:1,def:.3,cls:'sm',get:()=>+st().fat||0,set:v=>{touch();st().fat=v},end:()=>{settle();audition(0)},fmt:v=>pc(v*100)}));const fk=knobs[knobs.length-1];try{mlReg(fk,{key:'d.fat',label:'dunk fat',min:0,max:1,paint:()=>fk.refresh()})}catch(e){globalThis.__el&&globalThis.__el(e)}}
    body.querySelectorAll('.dk-arw').forEach(b=>b.onclick=()=>{const d=st();let i=KITS.findIndex(k=>k.name===d.kit);i=(i+(+b.dataset.k)+KITS.length)%KITS.length;try{pushHist()}catch(e){globalThis.__el&&globalThis.__el(e)}loadKit(KITS[i]);done();audition(0)});
    body.querySelector('.dk-on').onclick=()=>{try{pushHist()}catch(e){globalThis.__el&&globalThis.__el(e)}setOn(!isOn());done()};
    body.querySelectorAll('.dk-pad').forEach(b=>b.onclick=()=>{const c=+b.dataset.c;const d=st();const same=d.sel===c;d.sel=c;if(!same)build();paint();
      /* (v293) on the drums: the pad is that track's pad, so with ● and ▶ it is recorded into the pattern */
      const i=tIdx(MAP[c]);if(i>=0&&String(S.dk[MAP[c]]||'')==='dk:'+c&&typeof hitPad==='function'){try{hitPad(i)}catch(e){globalThis.__el&&globalThis.__el(e);audition(c)}}else audition(c)});
    body.querySelector('.dk-name').onchange=e=>{touch();st().p[st().sel].name=String(e.target.value||'').slice(0,24)||'sound';settle();paint()};
    body.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{try{pushHist()}catch(e){globalThis.__el&&globalThis.__el(e)}writeRows(S.pat,fromGroove(GROOVES[+b.dataset.g][1]));if(!isOn())setOn(true);done();msg('Groove "'+GROOVES[+b.dataset.g][0]+'" in pattern '+'ABCDEFGH'[S.pat])});
    const fi=body.querySelector('.dk-file');body.querySelector('.dk-imp').onclick=()=>fi.click();
    fi.onchange=async()=>{const f=fi.files&&fi.files[0];fi.value='';if(!f)return;let txt='';try{txt=await f.text()}catch(e){globalThis.__el&&globalThis.__el(e)}importText(txt,f.name)};
    paint();moves();sig=sigNow()}
  function msg(t,btns){const m=body&&body.querySelector('.dk-msg');if(!m)return;m.innerHTML='';const s=document.createElement('span');s.textContent=t;m.appendChild(s);
    (btns||[]).forEach(([l,f])=>{const b=document.createElement('button');b.textContent=l;b.onclick=()=>{m.innerHTML='';f()};m.appendChild(b)});if(!btns){clearTimeout(msg._t);msg._t=setTimeout(()=>{if(m.firstChild===s)m.innerHTML=''},4000)}}
  /* (v286) the file input has no accept list: iPadOS greys out file types it doesn't know (.mtpreset), so any file can be
     picked and the content decides */
  function importText(txt,name){let r=null;try{r=readFile(txt)}catch(e){globalThis.__el&&globalThis.__el(e)}
    if(!r){msg('Could not read '+(name||'the file')+' (Microtonic .mtpreset or .mtdrum, version 3)');return}
    if(r.patch){try{pushHist()}catch(e){globalThis.__el&&globalThis.__el(e)}const d=st();d.p[d.sel]=fix(Object.assign({},r.patch,{lvl:Math.max(-60,r.patch.lvl+(IMPORT_TRIM-(+d.trim||0)))}));setOn(true);done();build();msg('"'+r.patch.name+'" on channel '+(d.sel+1));audition(d.sel);return}
    const kitName=String(r.name||name||'Import').replace(/\.(mtpreset|mtpg|txt)$/i,'').replace(/^SC\s+/,'').slice(0,24);
    const go=withPats=>{try{pushHist()}catch(e){globalThis.__el&&globalThis.__el(e)}const d=st();d.kit=kitName;d.p=r.p;d.fill=null;d.trim=IMPORT_TRIM;setOn(true);
      let tx='';if(withPats){const use=r.pats.slice(0,S.pats.length);use.forEach((P,k)=>writeRows(k,P.rows));
        /* the pattern length (Microtonic loops all eight channels over it): SEQ.3's per-track length */
        const L=use[0].len;if(!S.len)S.len={};MAP.forEach(id=>{if(L<16)S.len[id]=L;else delete S.len[id]});if(L<16)tx+=' · '+L+' steps';
        /* fills: Microtonic's rolls, FillRate hits per step on steps with a trigger (fractional rates run free) */
        d.fill={rate:r.fillRate,pats:{}};use.forEach((P,k)=>{if(P.fills.some(x=>x.some(v=>v)))d.fill.pats[k]=P.fills});if(Object.keys(d.fill.pats).length)tx+=' · fills '+(Math.round(r.fillRate*100)/100)+'×';
        /* the same speed as in Microtonic: SEQ.3's steps are 16ths, so the tempo carries the preset's step rate */
        if(r.tempo>0){S.bpm=Math.round(Math.max(40,Math.min(300,r.tempo/r.k16))*100)/100;try{setDM($('#bpmNum'),String(Math.round(S.bpm)));applyMaster()}catch(e){globalThis.__el&&globalThis.__el(e)}tx+=' · '+Math.round(S.bpm)+' bpm'}
        if(isFinite(r.swing)){S.master.swing=Math.max(0,Math.min(1,r.swing/100/.66));tx+=' · swing '+Math.round(r.swing)+'%'}}done();build();
      msg('Kit "'+kitName+'" loaded'+(withPats?' with '+Math.min(r.pats.length,S.pats.length)+' patterns'+tx:''));audition(0)};
    if(r.pats.length)askImport(kitName,r,go);else go(false)}
  /* the choice as a small window in the export window's BLONDA yellow */
  function askImport(kitName,r,go){const esc=x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    const n=Math.min(r.pats.length,S.pats.length),bpm=r.tempo>0?Math.round(r.tempo/r.k16):0;
    try{if(window.__dock&&__dock.isOpen())__dock.toggle(false)}catch(e){globalThis.__el&&globalThis.__el(e)}/* the menu must not lie over the window */
    const scrim=document.createElement('div');scrim.className='ex-scrim';const el=document.createElement('div');el.className='dk-dlg';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
    el.innerHTML=`<div class="dkd-top"><small>BLONDA / DUNK / IMPORT</small><button class="dkd-x" aria-label="Close">CLOSE ×</button></div>
      <h2 class="dkd-t">${esc(kitName)}</h2>
      <div class="dkd-info"><span><b>8</b>sounds</span><span><b>${r.pats.length}</b>patterns</span>${bpm?`<span><b>${bpm}</b>bpm</span>`:''}${r.swing?`<span><b>${Math.round(r.swing)}%</b>swing</span>`:''}</div>
      <p class="dkd-note">Kit + patterns puts Microtonic's patterns ${'abcdefghijkl'.slice(0,n).toUpperCase().split('').join(' ')} into SEQ.3's patterns A–${'ABCDEFGH'[n-1]} (drum tracks only) and sets the tempo and swing. Undo takes it back.</p>
      <div class="dkd-go"><button class="dkd-kit">KIT ONLY</button><button class="dkd-all">KIT + PATTERNS</button></div>`;
    const close=()=>{el.remove();scrim.remove();document.removeEventListener('keydown',key,true)};const key=e=>{if(e.key==='Escape'){e.preventDefault();close()}};
    scrim.onclick=close;el.querySelector('.dkd-x').onclick=close;el.querySelector('.dkd-kit').onclick=()=>{close();go(false)};el.querySelector('.dkd-all').onclick=()=>{close();go(true)};
    document.addEventListener('keydown',key,true);document.body.appendChild(scrim);document.body.appendChild(el);el.querySelector('.dkd-all').focus({preventScroll:true})}
  {const _bp=beatPump;beatPump=function(t,stp){const r=_bp.apply(this,arguments);try{const d=S.dunk,F=d&&d.fill,rows=F&&F.pats&&F.pats[S.pat];
    if(rows&&isOn()){MAP.forEach((id,c)=>{const i=tIdx(id);if(i<0||!trkOn(i)||String(S.dk[id]||'')!=='dk:'+c)return;const L=trkLen(i),q=gstep%L,round=Math.floor(gstep/L);
      if(!(rows[c]&&rows[c][q]))return;const st0=S.pats[S.pat]&&S.pats[S.pat][i]&&S.pats[S.pat][i][q];if(!st0||!st0.v)return;
      const sd=stepDur()/tapeRate,t0=t+((q%2)?S.master.swing*sd*.66:0),gap=sd/Math.max(1,F.rate);let v=st0.v===2?1:.72;
      for(let k=1;k*gap<sd-1e-4;k++){v*=.8;trigger(i,t0+k*gap,v)}})}}catch(e){globalThis.__el&&globalThis.__el(e)}return r}}
  /* recorded moves (SEQ.3's "rörelser", piece 169): keys d.<channel>.<param> and d.fat. A move changes the value the next hit uses */
  {const _g=motGet,_w=motWrite;
    motGet=function(key){if(String(key).startsWith('d.')){const q=key.split('.'),d=st();if(q[1]==='fat')return +d.fat||0;const P=d.p[+q[1]];return P&&typeof P[q[2]]==='number'?P[q[2]]:null}return _g.apply(this,arguments)};
    motWrite=function(key,v){if(!String(key).startsWith('d.'))return _w.apply(this,arguments);const q=key.split('.'),d=st();if(q[1]==='fat')d.fat=v;else{const P=d.p[+q[1]];if(P&&q[2] in P)P[q[2]]=Math.max(RNG[q[2]][0],Math.min(RNG[q[2]][1],v))}
      sig=sigNow();/* a played-back move is not a reason to rebuild the card */MOT.pend.add(key);if(!MOT.rq)MOT.rq=requestAnimationFrame(motRepaint)};
    const _l=motList;motList=function(){const r=_l.apply(this,arguments);try{moves()}catch(e){globalThis.__el&&globalThis.__el(e)}return r}}
  /* the card's own list of DUNK moves, with × per move and one to clear them all */
  function moves(){const box=body&&body.querySelector('.dk-mvl');if(!box)return;const M=S.mot||{},rows=[];
    for(const g of Object.keys(M).sort())for(const k of Object.keys(M[g]||{}))if(k.startsWith('d.')&&M[g][k]&&M[g][k].some(v=>v!=null))rows.push([g,k]);
    box.innerHTML=rows.map(([g,k])=>`<span class="dk-mvr"><b>${'ABCDEFGH'[+g.slice(1)]||g}</b>${String((S.motL||{})[k]||k).replace(/[<>&]/g,'')}<button data-g="${g}" data-k="${k}" aria-label="Remove move">×</button></span>`).join('')+(rows.length>1?'<button class="dk-mvc">CLEAR ALL</button>':'');
    box.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{try{pushHist()}catch(e){globalThis.__el&&globalThis.__el(e)}delete M[b.dataset.g][b.dataset.k];try{save();motList();motBadges()}catch(e){globalThis.__el&&globalThis.__el(e)}});
    const c=box.querySelector('.dk-mvc');if(c)c.onclick=()=>{try{pushHist()}catch(e){globalThis.__el&&globalThis.__el(e)}for(const [g,k] of rows)delete M[g][k];try{save();motList();motBadges()}catch(e){globalThis.__el&&globalThis.__el(e)}};
    try{motBadges()}catch(e){globalThis.__el&&globalThis.__el(e)}}
  window.DUNK={TUNE,voice,KITS,GROOVES,readFile,importText,setOn,loadKit:i=>{loadKit(KITS[i]);done()},state:st,_last:last,_live:LIVE};
  /* undo, a loaded project: the card follows */
  setInterval(()=>{if(!body||dirty||!body.offsetParent)return;if(sigNow()!==sig)build()},1000);
  if(body){build();const css=document.createElement('style');css.textContent=`
.card.dunk .dkb{display:flex;flex-direction:column;gap:10px;font-family:var(--f-mono);color:#E8E6DC}
.dk-top{display:flex;align-items:center;gap:6px}.dk-top button{height:30px;padding:0 10px;font:600 10px var(--f-mono);letter-spacing:.1em;color:inherit;background:none;border:0;box-shadow:inset 0 0 0 1px #3A3C3F}
.dk-arw{width:30px;padding:0!important;font-size:15px!important}.dk-kit{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;padding:0 4px}.dk-kit small{font-size:8px;letter-spacing:.14em;opacity:.5}
.dk-kit b{font:600 14px var(--f-mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dk-on.on{background:#F2C318!important;color:#141517!important;box-shadow:none!important}
.dk-pads{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}.dk-pad{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:7px 8px;min-height:44px;color:inherit;background:#141517;border:0;box-shadow:inset 0 0 0 1px #2E3032;text-align:left;min-width:0}
.dk-pad b{font:600 11px var(--f-mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}.dk-pad small{font-size:8px;letter-spacing:.1em;opacity:.5;text-transform:uppercase}
.dk-pad.sel{box-shadow:inset 0 0 0 1.5px #F2C318}.dk-pad:active{background:#1C1E20}
.dk-row{display:flex;align-items:center;gap:8px}.dk-name{flex:1;min-width:0;height:28px;padding:0 8px;font:600 12px var(--f-mono);color:inherit;background:#141517;border:0;box-shadow:inset 0 0 0 1px #2E3032;border-radius:0}
.dk-secs{display:flex;flex-wrap:wrap;gap:10px 14px}.dk-sec{display:flex;flex-direction:column;gap:6px;min-width:0}.dk-h{font:600 8.5px var(--f-mono);letter-spacing:.16em;opacity:.55}
.dk-segrow{display:flex;flex-wrap:wrap;gap:6px;min-height:22px}.dk-seg{display:inline-flex;align-items:center;box-shadow:inset 0 0 0 1px #2E3032}.dk-seg i{font:normal 8px var(--f-mono);letter-spacing:.12em;opacity:.5;padding:0 6px}
.dk-seg button{height:22px;padding:0 7px;font:600 8.5px var(--f-mono);letter-spacing:.08em;color:inherit;background:none;border:0;opacity:.6}.dk-seg button.on{background:#E8E6DC;color:#141517;opacity:1}
.dk-kn{display:flex;flex-wrap:wrap;gap:4px}.card.dunk .dk-l{color:#E8E6DC!important;opacity:.62}.dk-kn .dk.sm{--dk-sz:40px;min-width:48px}
.dk-gr small{font-size:8px;letter-spacing:.14em;opacity:.5}.dk-grl{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}.dk-grl button{height:26px;padding:0 9px;font:600 9.5px var(--f-mono);color:inherit;background:none;border:0;box-shadow:inset 0 0 0 1px #2E3032}
.dk-grl button:active{background:#F2C318;color:#141517}
.dk-dlg{position:fixed;z-index:80;left:50%;top:50%;transform:translate(-50%,-50%);width:min(520px,calc(100vw - 32px));max-height:calc(100vh - 40px);overflow:auto;box-sizing:border-box;padding:20px 22px 20px;border-radius:26px;background:#EFCB4A;color:#17181A;box-shadow:0 40px 90px rgba(0,0,0,.55);font-family:var(--f-mono)}
.dkd-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.dkd-top small{font:500 9px var(--f-mono);letter-spacing:.12em;opacity:.7;padding-top:4px}
.dkd-x{height:34px;padding:0 16px;border:0;border-radius:999px;background:transparent;color:#17181A;font:600 10.5px var(--f-mono);letter-spacing:.06em;box-shadow:inset 0 0 0 1.5px #17181A}
.dkd-t{margin:6px 0 14px;font:500 clamp(26px,4.4vw,38px)/1.05 var(--f-display);letter-spacing:-.035em;word-break:break-word}
.dkd-info{display:flex;flex-wrap:wrap;gap:6px 22px;padding:12px 0;border-top:1px solid rgba(23,24,26,.25);border-bottom:1px solid rgba(23,24,26,.25)}.dkd-info span{display:flex;flex-direction:column;gap:2px;font:500 9px var(--f-mono);letter-spacing:.12em;text-transform:uppercase;opacity:.8}.dkd-info b{font:400 26px var(--f-mono);letter-spacing:-.02em;opacity:1}
.dkd-note{margin:12px 0 16px;font:400 10.5px/1.5 var(--f-mono);opacity:.75}
.dkd-go{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}.dkd-go button{height:42px;padding:0 18px;border:0;border-radius:999px;font:600 10.5px var(--f-mono);letter-spacing:.06em}
.dk-dlg button:focus{outline:none}.dk-dlg button:focus-visible{outline:2px solid #17181A;outline-offset:2px}
.dkd-kit{background:transparent;color:#17181A;box-shadow:inset 0 0 0 1.5px #17181A}.dkd-all{background:#17181A;color:#EFCB4A}
.dk-mv small{font-size:8px;letter-spacing:.14em;opacity:.5}.dk-mvl{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}.dk-mvl:empty{display:none}
.dk-mvr{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 0 0 8px;font:500 9.5px var(--f-mono);box-shadow:inset 0 0 0 1px #2E3032}.dk-mvr b{color:#F2C318;font-weight:600}
.dk-mvr button{width:26px;height:26px;border:0;background:none;color:inherit;font-size:13px;opacity:.7}.dk-mvc{height:26px;padding:0 9px;font:600 9px var(--f-mono);color:inherit;background:none;border:0;box-shadow:inset 0 0 0 1px #3A3C3F}
.dk-msg{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:10px;min-height:0}.dk-msg:empty{display:none}.dk-msg button{height:26px;padding:0 9px;font:600 9.5px var(--f-mono);color:#141517;background:#F2C318;border:0}`;document.head.appendChild(css)}
})();
