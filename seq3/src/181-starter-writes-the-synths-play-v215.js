/* ================= Starter writes, the synths play (v215) =================
   The Starter is a note maker now ("MIDI"): its four bars are written as notes into the synth tracks' patterns A–D
     ackord → keys · topp → lead · sub → bass · luft → pad · röst → synth 5 · ljud → synth 6
   and the song plays A → B → C → D. Whenever the Starter changes (a new idea, other chords, rhythm, sounds, a layer on/off) it
   writes again; a locked track (the key lock in the pattern) is never touched – the same as the dice and the drums. Your own
   edits stay until the Starter changes next. The drums of the pattern are copied to the other three patterns while those are
   untouched copies, so all four bars have the beat.
   The sound is the synth track's own:
   - "Enkel": the Starter's own sounds as a synth module of their own, with the Starter's sound chain per track (drive, filter,
     chorus "bredd", tape with wow, air) – the same recipes, so a new idea sounds as it did.
   - "Sampler": the voice and the sound slots, played as notes (the chop nearest the note, pitched to it).
   - or any big synth (Bris, Moog, SH-101 …): picking it for the track in the synth card is picking it for the layer.
   The Starter's fx (stutter, roll, rev, tape stop, gate, filter) now act on the synth bus. ================= */
const STX_SLT={s0:'syn5',s1:'syn6'};
/* the Starter's own voices no longer play the layers (they are notes on the tracks now); its chain keeps the atmosphere bed and the swell */
function stxLaneOf(l){return {g:1,pan:0}}
(()=>{
  const LAYS=['ack','klo','sub','luft'],LN={ack:'ackord',klo:'topp',sub:'sub',luft:'luft',s0:'röst',s1:'ljud'};
  const TI=id=>TRACKS.findIndex(t=>t.id===id);
  const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)};

  /* ================= the simple synth: "Enkel" ================= */
  DEFS.eng.enkel={drv:.2,br:.7,tejp:.45,ton:.34,len:.5,tail:.3,vol:.72,a:.5,d:.5,s:.5,r:.5,eko:1};
  S.eng.enkel=Object.assign({},DEFS.eng.enkel,S.eng.enkel||{});
  const pc=v=>[String(Math.round(v*100)),'%'];
  /* (v272) named Starter (it plays the Starter's sounds), with a real ADSR: the middle of each knob is the sound as it was */
  const ef=v=>Math.abs(v-.5)<.004?['sound','']:[(v>.5?'+':'')+Math.round((v-.5)*200),'%'];
  ENG.enkel={name:'Simple',tag:'the starter synth · adsr',dot:'#F07AB0',ps:[{k:'a',l:'attack',f:ef},{k:'d',l:'decay',f:ef},{k:'s',l:'sustain',f:ef},{k:'r',l:'release',f:ef},{k:'ton',l:'tone',f:pc},{k:'drv',l:'drive',f:pc},{k:'br',l:'width',f:pc},{k:'tejp',l:'tape',f:pc},{k:'eko',l:'echo',f:pc}],opts:[]};
  try{window.__roleSet&&0}catch(e){globalThis.__el&&globalThis.__el(e)}
  ENG.smp={name:'Sampler',tag:'starterns röst och ljud',ps:[],opts:[]};DEFS.eng.smp={};if(!S.eng.smp)S.eng.smp={};
  const POLY=()=>STX_POLY.concat(typeof INS_POLY!=='undefined'?INS_POLY:[]),SUBS=()=>STX_SUBS.map(s=>'s:'+s).concat(typeof INS_SUB!=='undefined'?INS_SUB:[]);
  const enkOk=v=>POLY().includes(v)||SUBS().includes(v);
  const enkOf=id=>{if(!S.enk)S.enk={};const v=S.enk[id];return enkOk(v)?v:(id==='bass'?'s:sinus':'juno')};
  const enkName=v=>v&&v.startsWith('s:')?v.slice(2)+' (sub)':v;
  const EK=()=>Object.assign({},DEFS.eng.enkel,S.eng.enkel||{});

  /* ---- the Starter's chain (v223: shared again, as it was in the Starter) ----
     each track that plays Enkel or the sampler: its voices → the role's EQ → its level → its channel strip (fader, pan, inserts) ┐
     then all of them together:  chord voices → drive → filter → chorus ┐                                                       │
                                 sub voices and samples ────────────────┴→ tape (wow, saturation, roll-off) → air → pump → synth bus
     The shared stages have the same settings for every track, so a track on its own sounds the same; together the sum is held as it
     was (the chords press the top line a little in the drive, the tape catches the peaks). Big synths go straight to the bus. */
  const softCurve=(g,ev)=>{const n=4096,cv=new Float32Array(n),o=Math.tanh(g*ev)/g;for(let i=0;i<n;i++){const x=(i/(n-1)*2-1)*2;cv[i]=(Math.tanh(g*(x+ev))/g-o)/2}return cv};
  const satCurve=a=>softCurve(1+a*1.1,.05*a),drvCurve=a=>softCurve(1+a*2.6,0);
  const oldG=k=>k/Math.tanh(k),drvMk=d=>d>.01?oldG(1+d*1.3*6)/(1+d*1.1):1,tapeMk=a=>oldG(1+a*3.2);
  const LEQ={keys:[['highpass',110,.5]],pad:[['highpass',190,.6],['peaking',420,.9,-2.5]],lead:[['highpass',260,.6],['peaking',2900,.8,2.5]]};
  /* the Starter's layer levels (chord .8, top .55) and its output (volym² × .8), so a track at its starting fader sounds as the layer did */
  const RL={keys:.8,lead:.55,pad:1,bass:1,syn5:1/.84,syn6:1/.84};
  const CH={};let LFO=null;
  function lfos(c){if(LFO&&LFO.c===c)return LFO;const mk=f=>{const o=c.createOscillator();o.frequency.value=f;o.start();return o};LFO={c,ch:mk(.52),w1:mk(.47),w2:mk(1.9)};return LFO}
  function chainOf(id){const c=ctx,i=TI(id);if(!c||i<0||!A.ch||!A.ch[i])return null;let C=CH[id];if(C&&C.c===c)return C;
    const G=(v=1)=>{const n=c.createGain();n.gain.value=v;return n};C={c,in:G(),sub:G(),out:G(1),k:''};
    let n=C.in;(LEQ[id]||[]).forEach(([ty,f,q,gn])=>{const b=c.createBiquadFilter();b.type=ty;b.frequency.value=f;b.Q.value=q;if(gn!=null)b.gain.value=gn;n.connect(b);n=b});
    n.connect(C.out);C.sub.connect(C.out);C.out.connect(A.ch[i].inp||A.ch[i].g);
    CH[id]=C;try{glueSet()}catch(e){globalThis.__el&&globalThis.__el(e)}chainSet(id,true);return C}
  /* the track's level: the Starter's layer level and its volym² × .8, so a track at its starting fader sounds as the layer did */
  function chainSet(id,force){const C=CH[id];if(!C||!ctx)return;const K=EK(),d=DEF_P[id]||{level:.35},k=JSON.stringify([K.vol,d.level]);if(!force&&k===C.k)return;C.k=k;
    C.out.gain.setTargetAtTime(K.vol*K.vol*.8*(RL[id]??.8)/d.level*CAL(id),ctx.currentTime,.03)}
  /* calibration against the Starter's own output, layer by layer (measured: the same notes, Starter voices vs. the tracks) */
  const ENK_CALR={bass:1,keys:1.02,lead:.96,pad:.94},CAL=id=>ENK_CALR[id]??1;
  /* the shared part. It works at the level the Starter's chain had (its volym comes back after it), so drive and tape act as before */
  const GLU={c:null,n:null,r:{}};
  function glueOf(){const c=ctx;if(!c||!A.buses||!A.buses.sy||!A.ch)return null;if(GLU.c===c)return GLU.n;const G=(v=1)=>{const n=c.createGain();n.gain.value=v;return n},L=lfos(c);
    const n={inP:G(),inD:G(),preP:G(),preD:G(),dpre:G(),drv:c.createWaveShaper(),dpost:G(),flt:c.createBiquadFilter(),chD:G(.8),chHp:c.createBiquadFilter(),cL:c.createDelay(.05),cR:c.createDelay(.05),cwL:G(.5),cwR:G(.5),
      mix:G(),wow:c.createDelay(.3),wg1:G(0),wg2:G(0),tpre:G(.5),tsat:c.createWaveShaper(),tpost:G(2),tlp:c.createBiquadFilter(),air:c.createBiquadFilter(),post:G(),pump:G(1),snd:G(1),lA:G(STX_CHD),lB:G(-STX_CHD),k:'',sl:0};
    n.drv.oversample='2x';n.tsat.oversample='2x';n.flt.type='lowpass';n.flt.Q.value=.6;n.chHp.type='highpass';n.chHp.frequency.value=240;n.chHp.Q.value=.5;
    n.cL.delayTime.value=.0068;n.cR.delayTime.value=.0127;n.wow.delayTime.value=.016;n.tlp.type='lowpass';n.tlp.Q.value=.5;n.air.type='highshelf';n.air.frequency.value=7000;n.air.gain.value=3;
    n.inP.connect(n.preP);n.preP.connect(n.dpre);n.dpre.connect(n.drv);n.drv.connect(n.dpost);n.dpost.connect(n.flt);n.flt.connect(n.chD);n.chD.connect(n.mix);
    const cm=c.createChannelMerger(2);n.flt.connect(n.chHp);n.chHp.connect(n.cL);n.chHp.connect(n.cR);n.cL.connect(n.cwL);n.cR.connect(n.cwR);n.cwL.connect(cm,0,0);n.cwR.connect(cm,0,1);cm.connect(n.mix);
    L.ch.connect(n.lA);L.ch.connect(n.lB);n.lA.connect(n.cL.delayTime);n.lB.connect(n.cR.delayTime);
    n.inD.connect(n.preD);n.preD.connect(n.mix);n.mix.connect(n.wow);L.w1.connect(n.wg1);L.w2.connect(n.wg2);n.wg1.connect(n.wow.delayTime);n.wg2.connect(n.wow.delayTime);
    n.wow.connect(n.tpre);n.tpre.connect(n.tsat);n.tsat.connect(n.tpost);n.tpost.connect(n.tlp);n.tlp.connect(n.air);n.air.connect(n.post);n.post.connect(n.pump);n.pump.connect(A.buses.sy.in);
    n.air.connect(n.snd);GLU.c=c;GLU.n=n;GLU.r={};window.__glue=GLU;return n}
  function glueSet(){const n=glueOf();if(!n)return;const c=ctx,K=EK();let fo=3.4;try{const P=stx();if(P&&P.fo)fo=P.fo}catch(e){globalThis.__el&&globalThis.__el(e)}
    const k=JSON.stringify([K,fo]);if(k!==n.k){n.k=k;const t=c.currentTime,v=Math.max(.05,K.vol*K.vol*.8);
      n.preP.gain.setTargetAtTime(1/v,t,.03);n.preD.gain.setTargetAtTime(1/v,t,.03);n.post.gain.setTargetAtTime(v,t,.03);
      const base=160*Math.pow(2,K.ton*6.6);n.flt.frequency.setTargetAtTime(base*fo,t,.03);
      {const on=K.drv>.01;n.drv.curve=on?drvCurve(K.drv):null;n.dpre.gain.setTargetAtTime(on?.5*(1+K.drv*.8):1,t,.03);n.dpost.gain.setTargetAtTime((on?2/(1+K.drv*.45):1)*drvMk(K.drv),t,.03)}
      {const on=K.tejp>.01;n.tsat.curve=on?satCurve(K.tejp):null;n.tpre.gain.setTargetAtTime(on?.5:1,t,.03);n.tpost.gain.setTargetAtTime((on?2:1)*tapeMk(K.tejp),t,.03)}
      n.tlp.frequency.setTargetAtTime(16000-K.tejp*9500,t,.05);n.wg1.gain.setTargetAtTime(K.tejp*.0011,t,.05);n.wg2.gain.setTargetAtTime(K.tejp*.00012,t,.05);
      n.snd.gain.setTargetAtTime(K.eko??1,t,.05);n.cwL.gain.setTargetAtTime(K.br*.75,t,.05);n.cwR.gain.setTargetAtTime(K.br*.75,t,.05);n.chD.gain.setTargetAtTime(1-K.br*.3,t,.05)}
    /* the Starter's echo and room (cut with the phrase, as before): fed from the sum, as they were */
    {const E=STX.E;if(!n.sl&&E&&E.c===c&&E.sHp){n.snd.connect(E.sHp);n.sl=1}
     /* the Starter's swell ("sug", an fx written into the loop) is still its own voice: it joins the shared chain like the layers do */
     if(!n.sw&&E&&E.c===c&&E.lg&&E.lg.sw&&E.ln&&E.ln.ack){const q=(E.leq&&E.leq.sw&&E.leq.sw.length)?E.leq.sw[E.leq.sw.length-1]:E.lg.sw;try{q.disconnect(E.ln.ack.g);q.connect(n.dpre);n.sw=1}catch(e){globalThis.__el&&globalThis.__el(e)}}}
    /* which tracks go in: Enkel chords → the drive input, Enkel sub sounds and the sampler → straight to the tape */
    const B=A.buses.sy;TRACKS.forEach((tr,i)=>{if(!tr.mel)return;const ch=A.ch[i];if(!ch)return;const e=S.inst[tr.id];const want=e==='smp'?'D':e==='enkel'?(enkOf(tr.id).startsWith('s:')?'D':'P'):'';
      const cur=GLU.r[i]||'';if(cur===want)return;const src=ch.pan||ch.g;
      try{src.disconnect(cur?(cur==='P'?n.inP:n.inD):B.in)}catch(e){globalThis.__el&&globalThis.__el(e)}try{src.connect(want?(want==='P'?n.inP:n.inD):B.in)}catch(e){globalThis.__el&&globalThis.__el(e)}GLU.r[i]=want})}
  window.glueSet=glueSet;
  setInterval(()=>{try{glueSet()}catch(e){globalThis.__el&&globalThis.__el(e)}try{stkWatch()}catch(e){globalThis.__el&&globalThis.__el(e)}for(const id in CH)chainSet(id)},250);

  /* ---- the notes: the chord on one step plays together, spread across the stereo field as the Starter does; the next step cuts the last ---- */
  const VQ={},VO={};
  function flush(id){const q=VQ[id];delete VQ[id];if(!q||!q.length)return;const E=stxEnsure(),C=chainOf(id);if(!E||!E.free||!C)return;const K=q[0].kn||Object.assign(EK(),(S.enkT||{})[id]||{}),t=q[0].t;
    /* (v276) the next step always cuts the last notes (they piled up into mush when they rang on); a longer release only
       makes that cut softer */
    (VO[id]||[]).forEach(v=>{if(!v.cut&&t>v.t0+1e-4&&v.end>t){v.cut=1;const g=v.ck.gain,fd=Math.min(.2,(.006+K.tail*.045)*Math.pow(4,Math.max(0,(K.r??.5)-.5)*2));try{g.cancelAndHoldAtTime(t);g.setValueAtTime(1,t);g.linearRampToValueAtTime(0,t+fd)}catch(e){globalThis.__el&&globalThis.__el(e)}}});
    VO[id]=(VO[id]||[]).filter(v=>v.end>t-.05);
    q.sort((a,b)=>a.n-b.n);const n=q.length,br=K.br,k=1/Math.sqrt(n);
    q.forEach((o,j)=>{let pan=0;if(id==='keys'||!RL[id])pan=n>1?(j/(n-1)*2-1)*Math.min(1,br*1.1)*.9:0;else if(id==='pad')pan=n>1?(j%2?1:-1)*.4*br:0;else if(id==='lead'){LP[id]=-(LP[id]||1);pan=LP[id]*.5*br}
      let v=null;if(o.smp!=null)v=E.freeSmp(C.sub,o.smp,t,o.n,o.v,o.d,stx());
      else{const snd=enkOf(id),sub=snd.startsWith('s:'),nm=sub?snd.slice(2):snd,p=o.p,ton=Math.max(0,Math.min(1,(p.tone??.5)+(K.ton-.34)*2.2)),lenK=Math.max(0,Math.min(1,K.len+((p.decay??.5)-.5)*.9));
        const dst=sub?C.sub:C.in,vel=Math.min(1,o.v),G=o.gl;
        if(!G){v=E.free(dst,nm,sub,t,o.n,vel,o.d,ton,lenK,pan,o.k??1,K.tail,null,0,K);if(v)VO[id].push(v);stack(id,E,C,t,o.n,vel,o.d,ton,lenK,pan,j,n,K)}
        else{/* a glide, as the Starter played its top line: each note in the chain starts at the last one's pitch and slides in (the last one is cut) */
          const off=o.n-G.n0,seg=[{t,n:o.n,d:0}].concat(G.list.map(g=>({t:t+g.at*G.sd,n:g.n+off,d:0})));seg.forEach((x,k)=>x.d=Math.max(.03,(k+1<seg.length?seg[k+1].t:t+o.d)-x.t));
          let pv=null;seg.forEach((x,k)=>{if(pv&&!pv.cut){pv.cut=1;try{const g=pv.ck.gain;g.cancelAndHoldAtTime(x.t);g.setValueAtTime(1,x.t);g.linearRampToValueAtTime(0,x.t+.012)}catch(e){globalThis.__el&&globalThis.__el(e)}}
            const w=E.free(dst,nm,sub,x.t,x.n,k?Math.min(1,vel*.92):vel,x.d,ton,lenK,pan,o.k??1,K.tail,k?seg[k-1].n:null,0,K);if(w){VO[id].push(w);pv=w}stack(id,E,C,x.t,x.n,vel,x.d,ton,lenK,pan,j,n,K)})}
        return}
      if(v)VO[id].push(v)})}
  /* the stack: a second instrument on the same notes (the Starter's "stack" on chords and top line) – its own sound, octave, level and side */
  const layOf=id=>{for(const l in STX_LTRK)if(STX_LTRK[l]===id)return l;return null};
  function stack(id,E,C,t,nn,vel,d,ton,lenK,pan,j,n,K){try{const P=stx(),lay=layOf(id),L=P&&P.on&&lay&&P.ls[lay],st=L&&L.st;if(!st||typeof INS==='undefined'||!INS[st.snd])return;
    if(lay==='ack'&&j<n-2)return;/* on a chord: the two top notes, one each side */
    const pp=lay==='ack'?(j===n-1?.35:-.35):pan;const w=E.free(C.in,st.snd,false,t,nn+12*(st.oct||0),Math.min(1,vel*(st.lv??.4)),d,ton,lenK,Math.max(-1,Math.min(1,pp+(st.pan??.3))),1,K.tail,null,st.tw||0,K);if(w){VO[id].push(w);window.__stkN=(window.__stkN||0)+1}}catch(e){globalThis.__el&&globalThis.__el(e)}}
  const LP={};
  function queue(id,o){(VQ[id]=VQ[id]||[]).push(o);if(VQ[id].length===1)Promise.resolve().then(()=>flush(id))}
  /* a glide in the notes (the Starter's top line, or one you draw): the scheduler hands it over in GL while the note is triggered */
  window.enkelVoice=(id,t,v,p,out,note,len,vc)=>{const N=(vc&&vc.length)?vc:[0],gl=(typeof GL!=='undefined'&&GL&&GL.list&&GL.list.length)?{list:GL.list.map(g=>({at:g.at,n:g.n})),sd:GL.sd,n0:GL.n0}:null;
    /* (v276) the knobs as they are for this note: the track's own over the shared ones, then the modulation (lfo, random,
       velocity …) of the full synth, the same way the other engines get it */
    const k=Object.assign(EK(),(S.enkT||{})[id]||{});
    try{if(typeof MODN!=='undefined'&&MODN&&MODN.e==='enkel'&&MODN.M&&MODN.M.rows)MODN.M.rows.forEach(r=>{if(!r.amt||r.dst.startsWith('x.')||typeof k[r.dst]!=='number')return;k[r.dst]=Math.max(0,Math.min(1,k[r.dst]+r.amt*modSrc(MODN.M,r.src,t,MODN.n)))})}catch(e){globalThis.__el&&globalThis.__el(e)}
    N.forEach(iv=>queue(id,{t,n:note+iv+(p.tune||0),v,d:Math.max(.03,len||.2),p,gl,kn:k}))};
  window.smpVoice2=(id,t,v,p,out,note,len)=>{if(!S.smpk)S.smpk={};const k=S.smpk[id]??(id==='syn6'?1:0);queue(id,{t,n:note+(p.tune||0),v,d:Math.max(.03,len||.2),p,smp:k})};

  /* the engine buttons in the synth card */
  {const row=document.getElementById('engs');if(row){[['enkel','Simple','#F07AB0'],['smp','Sampler','#F3EEDD']].forEach(([e,nm,col],j)=>{if(row.querySelector(`[data-e="${e}"]`))return;const b=document.createElement('button');b.className='eng';b.dataset.e=e;b.innerHTML=`<i style="--d:${col}"></i>${nm}`;
    b.onclick=()=>{const id=TRACKS[synT].id;if(S.inst[id]===e)return;pushHist();S.inst[id]=e;if(e==='enkel'){if(!S.enk)S.enk={};S.enk[id]=enkOf(id)}swapAnim();refreshInst();save();synPreview();toast(TRACKS[synT].name+' → '+nm)};
    row.insertBefore(b,row.children[1+j]||null)})}}
  /* (v275) Simple remembers you. What you set on the Simple synth – its knobs, a preset, the sound of a track – stays for
     every new idea and in every project, until you pick "starter decides". Knobs: the shared ones (drive, width, tape, echo,
     tone, length, tail) and each track's own (attack, decay, sustain, release, tone). A Starter knob you turn counts too;
     a new idea (many knobs at once) does not change what you set. */
  const STK_KEY='blonda.simple.v2',SH=['drv','br','tejp','eko','ton','len','tail','a','d','s','r'],KK=['ton','len','drv','br','tejp','tail'],PT=['a','d','s','r','ton'];
  let STK={e:{},t:{}};try{const o=JSON.parse(localStorage.getItem(STK_KEY)||'{}');if(o&&typeof o==='object'){STK.e=o.e||{};STK.t=o.t||{}}}catch(e){globalThis.__el&&globalThis.__el(e)}
  const stkSave=()=>{try{localStorage.setItem(STK_KEY,JSON.stringify(STK))}catch(e){globalThis.__el&&globalThis.__el(e)}};
  let SNO=null,SNAP=null,SS=null;const snap=E=>{const o={};SH.forEach(q=>o[q]=E[q]);return o};
  function stkApply(){const E=S.eng.enkel;if(!E)return;SH.forEach(q=>{if(STK.e[q]!=null)E[q]=STK.e[q]});
    for(const id in STK.t){const p=STK.t[id]&&STK.t[id].p;if(p){if(!S.enkT)S.enkT={};S.enkT[id]=Object.assign({},p)}}SNAP=snap(E);SNO=E;SS=S}
  /* knob turns on the Simple synth (small card or full view) */
  function stkWatch(){const E=S.eng.enkel;if(!E)return;if(E!==SNO||S!==SS){stkApply();return}let ch=false;SH.forEach(q=>{if(E[q]!==SNAP[q]){STK.e[q]=E[q];ch=true}});if(ch){SNAP=snap(E);stkSave()}}
  /* (v277) the sound is not kept any more: every idea picks its own sounds again (kept sounds made every idea sound alike) */
  const pick=(id,v)=>{if(!S.enk)S.enk={};S.enk[id]=v;
    /* a rendered sound: its notes get ready in the background right away */try{if(typeof INS!=='undefined'&&INS[v]&&typeof ctx!=='undefined'&&ctx)for(let n=40;n<=76;n++)insWant(ctx,v,n,0)}catch(e){globalThis.__el&&globalThis.__el(e)}};
  let hush=false;
  window.SIMPLE={pick,quiet:f=>{hush=true;try{f()}finally{hush=false;const E=S.eng.enkel;if(E){SNAP=snap(E);SNO=E;SS=S}}},trk:(id)=>{if(hush)return;(STK.t[id]=STK.t[id]||{}).p=Object.assign({},(S.enkT||{})[id]||{});stkSave()},
    free:()=>{STK={e:{},t:{}};stkSave();if(S.enkT)S.enkT={};SNAP=S.eng.enkel?snap(S.eng.enkel):null},
    get sticky(){return JSON.parse(JSON.stringify(STK))},watch:stkWatch,PT};
  window.ENK={poly:()=>POLY(),subs:()=>SUBS(),get:enkOf,set:pick};
  /* (v275) factory sounds for Simple: [name, kind, sound, knobs]. Attack/decay/sustain/release/tone are the track's own
     (.5 = the sound as it is); drive, width, tape and echo are shared by the Simple tracks – the bass sounds leave them alone.
     Clean on purpose: little drive and tape, so the chords stay clear and apart from each other. */
  /* (v276) [name, kind, sound, knobs, modulation]. The modulation moves the knobs note by note (velocity opens the tone,
     a slow lfo breathes over the bars, random gives each note its own colour, the step sequence draws a pattern). Clean: little
     drive and tape, moderate echo, so the parts stay apart. */
  const V=(k,a)=>({src:'vel',dst:k,amt:a}),RN=(k,a)=>({src:'rnd',dst:k,amt:a}),L1=(rate,sh,rows)=>({l1:{rate,shape:sh,retrig:0},rows}),L2=(rate,sh,rows)=>({l2:{rate,shape:sh,retrig:0},rows});
  window.ENK_PRE=[
    ['Clean Keys','keys','keys',{ton:.42,drv:0,tejp:.1,br:.5,eko:.55,d:.56,s:.55,r:.58},{rows:[V('ton',.25)]}],
    ['Warm Juno','keys','juno',{ton:.44,drv:.04,tejp:.2,br:.75,eko:.6,d:.6,s:.65,r:.6},L1(0,0,[{src:'l1',dst:'ton',amt:.15},RN('ton',.06)])],
    ['Breathing Chords','keys','juno',{ton:.4,drv:0,tejp:.15,br:.8,eko:.6,a:.6,s:.7,r:.62},L1(1,0,[{src:'l1',dst:'ton',amt:.25}])],
    ['Dub Chords','keys','plock',{ton:.38,drv:.05,tejp:.2,br:.6,eko:.85,d:.45,s:.4},L1(0,0,[{src:'l1',dst:'ton',amt:.22}])],
    ['Night Rhodes','keys','rhodes',{ton:.4,drv:.03,tejp:.25,br:.55,eko:.55,r:.58},{rows:[V('ton',.3)]}],
    ['Grand Piano','keys','flygel',{ton:.44,drv:0,tejp:.05,br:.3,eko:.4,r:.58},{rows:[V('ton',.3)]}],
    ['DX Piano','keys','dx-piano',{ton:.42,drv:0,tejp:.08,br:.45,eko:.5},{rows:[V('ton',.2),RN('d',.08)]}],
    ['Glass Keys','keys','glas',{ton:.44,drv:0,tejp:.08,br:.55,eko:.65,d:.6,r:.6},L2(1,1,[{src:'l2',dst:'d',amt:.12}])],
    ['Mallet','pluck','mallet',{ton:.4,drv:0,tejp:.1,br:.4,eko:.65},{rows:[RN('ton',.1),V('d',.15)]}],
    ['Kalimba Drops','pluck','kalimba',{ton:.42,drv:0,tejp:.08,br:.45,eko:.7,r:.58},{rows:[RN('ton',.08)]}],
    ['Step Pluck','pluck','plock',{ton:.4,drv:0,tejp:.15,br:.6,eko:.6,d:.55,r:.58},{rows:[{src:'stp',dst:'ton',amt:.22}]}],
    ['Random Glass','pluck','glas',{ton:.42,drv:0,tejp:.08,br:.5,eko:.7,d:.45},{rows:[RN('ton',.2),RN('d',.15)]}],
    ['Vibes','pluck','vibrafon',{ton:.42,drv:0,tejp:.08,br:.5,eko:.6,r:.6},{rows:[V('ton',.2)]}],
    ['Stack Lead','lead','stack',{ton:.44,drv:.06,tejp:.12,br:.5,eko:.45,s:.6,r:.55},{rows:[V('ton',.2)]}],
    ['Vowel Lead','lead','röst',{ton:.4,drv:0,tejp:.12,br:.45,eko:.5},L2(3,1,[{src:'l2',dst:'ton',amt:.12}])],
    ['Soft Pad','pad','mjuk',{a:.8,d:.62,s:.85,r:.78,ton:.42,drv:0,tejp:.14,br:.85,eko:.65},L1(0,0,[{src:'l1',dst:'ton',amt:.15}])],
    ['Cloud Pad','pad','moln',{a:.72,s:.8,r:.8,ton:.44,drv:0,tejp:.08,br:.9,eko:.7},L1(0,0,[{src:'l1',dst:'ton',amt:.2}])],
    ['Grain Pad','pad','korn',{a:.7,s:.8,r:.8,ton:.42,drv:0,tejp:.1,br:.85,eko:.65},{rows:[RN('ton',.1)]}],
    ['Choir','pad','kör',{a:.7,s:.75,r:.76,ton:.4,drv:0,tejp:.15,br:.8,eko:.6},null],
    ['Organ','pad','orgel',{ton:.4,drv:.08,tejp:.18,br:.6,eko:.3,r:.55},null],
    ['Deep Sine','bass','s:sinus',{ton:.34,r:.55},null],
    ['Moog Bass','bass','s:moog',{ton:.38},{rows:[V('ton',.2)]}],
    ['Finger Bass','bass','fingerbas',{ton:.4},null],
    ['Short Sub','bass','s:kort',{ton:.34},null]];
  /* the sounds to choose from (Enkel) or the slot (sampler) */
  const _ri=refreshInst;refreshInst=function(){_ri.apply(this,arguments);try{const id=TRACKS[synT].id,e=S.inst[id];const ob=document.getElementById('engOpts');if(!ob)return;
      if(e==='enkel'){const cur=enkOf(id),mk=(v,lab)=>{const b=document.createElement('button');b.className='eopt'+(v===cur?' on':'');b.textContent=lab;b.onclick=()=>{pushHist();pick(id,v);refreshInst();save();synPreview()};return b};
        ob.innerHTML='';POLY().forEach(v=>ob.appendChild(mk(v,v)));const sep=document.createElement('span');sep.className='enk-sep';sep.textContent='sub';ob.appendChild(sep);SUBS().forEach(v=>ob.appendChild(mk(v,v.replace(/^s:/,''))));ob.hidden=false;
        const tg=document.getElementById('engTag');if(tg)tg.textContent='the starter sounds · '+enkName(cur)}
      else if(e==='smp'){if(!S.smpk)S.smpk={};const cur=S.smpk[id]??(id==='syn6'?1:0);ob.innerHTML='';[['röst',0],['ljud',1]].forEach(([lab,k])=>{const b=document.createElement('button');b.className='eopt'+(k===cur?' on':'');b.textContent=lab;b.onclick=()=>{pushHist();S.smpk[id]=k;refreshInst();save();synPreview()};ob.appendChild(b)});ob.hidden=false;
        const tg=document.getElementById('engTag');if(tg)tg.textContent='starterns '+(cur?'ljud':'röst')+' · välj ljudet i Starter'}}catch(e){globalThis.__el&&globalThis.__el(e)}};
  /* their picture: a dot field and the note's shape, lit when the track plays */
  const _de=drawEng;drawEng=function(now){let id;try{id=TRACKS[synT].id}catch(e){return _de.apply(this,arguments)}const e=S.inst[id];if(e!=='enkel'&&e!=='smp')return _de.apply(this,arguments);
    const f=fit(document.getElementById('engCv'));if(!f)return;const {c,w,h}=f,ac=engCol.acc||'#fff',fg=engCol.fg||'#fff',p=S.params[id]||{},hh=hitT.get(synT),el=hh&&ctx?ctx.currentTime-hh.t:99,K=EK();
    c.clearRect(0,0,w,h);const g=[];for(let x=8;x<w;x+=16)for(let y=8;y<h;y+=16)g.push(x,y);c.fillStyle=rgba(fg,.12);c.beginPath();for(let i=0;i<g.length;i+=2){c.moveTo(g[i]+1,g[i+1]);c.arc(g[i],g[i+1],1,0,6.2832)}c.fill();
    const len=Math.max(0,Math.min(1,K.len+((p.decay??.5)-.5)*.9)),sus=e==='smp'?.9:enkOf(id).startsWith('s:')?.7:.16+len*.3,tau=.035*Math.pow(2,len*4.2),T=Math.max(.6,tau*5+.4),X=t=>12+(w-24)*t/T,Y=v=>h-12-(h-24)*v,env=t=>t<.01?t/.01:t<T-.25?sus+(1-sus)*Math.exp(-(t-.01)/tau):sus*Math.max(0,1-(t-(T-.25))/.25);
    c.strokeStyle=rgba(ac,.75);c.lineWidth=2;c.beginPath();for(let k=0;k<=120;k++){const t=k/120*T;k?c.lineTo(X(t),Y(env(t))):c.moveTo(X(t),Y(env(t)))}c.stroke();
    if(el>=0&&el<T){const x=X(el),y=Y(env(el)),gr=c.createRadialGradient(x,y,0,x,y,18);gr.addColorStop(0,rgba(ac,.95));gr.addColorStop(1,rgba(ac,0));c.fillStyle=gr;c.beginPath();c.arc(x,y,18,0,6.2832);c.fill()}
    c.fillStyle=rgba(fg,.55);c.font='500 10px "BLONDA Mono",ui-monospace,monospace';c.textBaseline='top';c.fillText(e==='smp'?((S.smpk&&S.smpk[id])?'ljud':'röst'):enkName(enkOf(id)),12,10)};

  /* ================= one choice, seen in both places: the layer's sound ⇄ the track's synth ================= */
  const want=(lay,snd)=>{if(snd.startsWith('e:'))return {inst:snd.slice(2)};if(snd.startsWith('t:'))return null;
    if(lay==='sub')return {inst:'enkel',enk:STX_SUBS.includes(snd)?'s:'+snd:snd};return {inst:'enkel',enk:snd}};
  const back=(lay,id)=>{const e=S.inst[id]||'analog';if(e!=='enkel')return 'e:'+e;const v=enkOf(id);if(lay==='sub')return v.startsWith('s:')?v.slice(2):v;return v};
  const LAST={};
  function syncSounds(P){let chT=false,chS=false;
    LAYS.forEach(lay=>{const L=P.ls[lay];if(!L)return;const id=STX_LTRK[lay];if(!id||String(L.snd).startsWith('t:')||(S.lock&&S.lock[id])){delete LAST[lay];return}
      const sk=L.snd,tk=(S.inst[id]||'')+'|'+(S.enk&&S.enk[id]||''),ls=LAST[lay];
      if(!(P.on&&P.lay[lay])){LAST[lay]={sk,tk};return}
      if(!ls||ls.sk!==sk||ls.tk===tk){const kp=STK.t[id]&&STK.t[id].snd,w=kp&&enkOk(kp)?{inst:'enkel',enk:kp}:want(lay,L.snd);if(w){if(S.inst[id]!==w.inst){S.inst[id]=w.inst;chT=true}if(w.enk){if(!S.enk)S.enk={};if(S.enk[id]!==w.enk){S.enk[id]=w.enk;chT=true}}}}
      else{if(S.inst[id]!=='enkel'&&STK.t[id]&&STK.t[id].snd){delete STK.t[id].snd;stkSave()}const nb=back(lay,id);if(nb!==L.snd){L.snd=nb;chS=true}}
      {const kp=STK.t[id]&&STK.t[id].snd;if(kp&&S.inst[id]==='enkel'){const nb=back(lay,id);if(nb!==L.snd){L.snd=nb;chS=true}}}
      LAST[lay]={sk:L.snd,tk:(S.inst[id]||'')+'|'+(S.enk&&S.enk[id]||'')}});
    /* the sample slots: their tracks use the sampler */
    if(P.on&&Array.isArray(P.smp))P.smp.forEach((q,k)=>{if(!q||!q.on)return;const id=STX_SLT['s'+k];if(S.lock&&S.lock[id])return;if(S.inst[id]!=='smp'){S.inst[id]='smp';chT=true}if(!S.smpk)S.smpk={};if(S.smpk[id]!==k){S.smpk[id]=k;chT=true}});
    /* the Starter's sound knobs ⇄ Enkel's (one set, shared by every track that uses Enkel) */
    /* (v275) what you changed on the Simple synth since the last look is yours – noted before the Starter's knobs are matched */
    if(SNAP&&SNO===S.eng.enkel&&SS===S){let c=false;SH.forEach(q=>{if(S.eng.enkel[q]!==SNAP[q]){STK.e[q]=S.eng.enkel[q];c=true}});if(c)stkSave()}
    {const K=P.k,E=S.eng.enkel,ks=JSON.stringify(['ton','len','drv','br','tejp','tail','vol'].map(q=>K[q])),es=JSON.stringify(['ton','len','drv','br','tejp','tail','vol'].map(q=>E[q])),lk=LAST._k;
      if(ks!==es){if(!lk||lk.ks!==ks||lk.es===es){['ton','len','drv','br','tejp','tail','vol'].forEach(q=>{if(K[q]!=null)E[q]=K[q]});chT=true}else{['ton','len','drv','br','tejp','tail','vol'].forEach(q=>{if(E[q]!=null)K[q]=E[q]});chS=true}}
      /* (v275) one Starter knob turned = you set it (kept); a new idea moves many at once and gives way to what you set */
      {const pk=LAST._kv,dif=pk?KK.filter(q=>K[q]!==pk[q]):[];if(dif.length===1&&pk){STK.e[dif[0]]=K[dif[0]];stkSave()}
       SH.forEach(q=>{if(STK.e[q]!=null){if(E[q]!==STK.e[q]){E[q]=STK.e[q];chT=true}if(KK.includes(q)&&K[q]!==STK.e[q]){K[q]=STK.e[q];chS=true}}});SNAP=snap(E);SNO=E;SS=S;LAST._kv={};KK.forEach(q=>LAST._kv[q]=K[q])}
      LAST._k={ks:JSON.stringify(['ton','len','drv','br','tejp','tail','vol'].map(q=>K[q])),es:JSON.stringify(['ton','len','drv','br','tejp','tail','vol'].map(q=>E[q]))}}
    return {chT,chS}}

  /* ================= the writer ================= */
  const acc=s=>s%4===0?1:s%2?.74:.87;
  /* a layer's four bars as notes: what the Starter would have played (velocities, the swing and the laid-back top, the form) */
  /* (v276) the chord voicing on the tracks: the Starter's dense chords had up to six notes with semitones side by side and
     sat low – on a full synth that is mud. Per chord: lifted out of the bass register, no semitone clusters down low, at most five notes. */
  function voiceClean(out){const g=new Map();out.forEach(o=>{const k=Math.round(o.s*100);if(!g.has(k))g.set(k,[]);g.get(k).push(o)});const keep=new Set();
    g.forEach(a=>{a.sort((x,y)=>x.n-y.n);if(a.length<3){a.forEach(o=>keep.add(o));return}
      if(a[0].n<43){const up=a[a.length-1].n+12<=86?12:0;if(up)a.forEach(o=>o.n+=up)}
      /* (v277) softer: a semitone is only taken out down where it muddies (under G3); higher up the 9ths and add9s keep their colour */
      let L=a.slice();for(let i=L.length-2;i>=1;i--)if(L[i].n<55&&(L[i+1].n-L[i].n<=1||L[i].n-L[i-1].n<=1)){if(L.length>2)L.splice(i,1)}
      while(L.length>5){let bi=1,bd=99;for(let i=1;i<L.length-1;i++){const d=L[i].n-L[i-1].n;if(d<bd){bd=d;bi=i}}L.splice(bi,1)}
      L.forEach(o=>keep.add(o))});return out.filter(o=>keep.has(o))}
  function layerNotes(P,pl,lay,b){if(lay==='ack'||lay==='luft')return voiceClean(layerNotes0(P,pl,lay,b));return layerNotes0(P,pl,lay,b)}
  function layerNotes0(P,pl,lay,b){const L=P.ls[lay],sh=12*(L.oct||0),sd=60/S.bpm/4,Gr=P.g||{},sw=(Gr.sving||0)*.5,out=[];if(!P.lay[lay])return out;
    /* a layer on a big synth gets the velocities the Starter used to send that synth (the layer's level in the velocity, no chord scaling) */
    const big=String(L.snd).startsWith('e:'),lv=Math.min(1.4,(L.lv??.75)/.75),V=v=>+Math.min(1,v).toFixed(3);
    const on=s=>true,lat=lay==='ack'?(Gr.lat||0)*.012/sd:lay==='klo'?(Gr.lat||0)*.03/sd:0;
    const ins=typeof INS!=='undefined'&&INS[L.snd];
    if(pl.arp&&pl.arp[lay]){pl.arp[lay].all.forEach(a=>{if(a.t>=b*16&&a.t<b*16+16&&on(Math.floor(a.t-b*16)))out.push({s:+Math.min(15.9,a.t-b*16+(lay==='ack'?lat:0)).toFixed(4),l:Math.max(.25,a.d),n:a.n+sh,v:big?V(a.v*lv):V(a.v*(lay==='luft'?.55:.8))})});return out}
    let H=null;
    for(let s=0;s<16;s++){const ev=pl.steps[b*16+s],e=ev&&ev[lay];if(!e||!on(s))continue;const ns=(e.ns||[e.n]).map(n=>n+sh),k=1/Math.sqrt(ns.length),x=Math.min(15.9,s+(s%2?sw:0)+lat),l=Math.max(.25,Math.min(16-s,e.l));
      let v=lay==='ack'?(e.re?acc(s)*.8:acc(s)):lay==='klo'?(e.gl?.92:acc(s)*(.92+(((b*16+s)*7)%5)*.02)):lay==='sub'?1:big?.9:.5;
      if(big){ns.forEach(n=>out.push({s:+x.toFixed(4),l,n,v:V(v*lv)}));continue}
      /* an instrument holds a repeated chord (the Starter does not strike it again within the beat) */
      if(lay==='ack'&&ins){const key=ns.join(',');if(H&&H.key===key&&s-H.last<=1.6&&s-H.s0<3.9){H.last=s;H.ns.forEach(o=>o.l=Math.max(o.l,+(x+l-o.s).toFixed(4)));continue}
        const grp=ns.map(n=>({s:+x.toFixed(4),l,n,v:+(v*k*(H&&H.key===key?.55:1)).toFixed(3)}));H={key,s0:s,last:s,ns:grp};out.push(...grp);continue}
      if(lay==='klo'){const o={s:+x.toFixed(4),l,n:ns[0],v:+v.toFixed(3)};const pv=out[out.length-1];
        /* a glide in the Starter's top line: the note before slides into this one (shown and editable as a glide in the piano roll) */
        if(e.gl&&pv&&pv.s<o.s){o.id='k'+b+'_'+s;pv.id=pv.id||('k'+b+'_'+Math.floor(pv.s));pv.g=o.id}out.push(o);continue}
      ns.forEach(n=>out.push({s:+x.toFixed(4),l,n,v:+(v*(lay==='ack'||lay==='luft'?k:1)).toFixed(3)}))}
    return out}
  /* a sample slot's four bars as notes for the sampler: the chord tone the slot would have been pitched to */
  function slotNotes(P,pl,k,b){const Q=P.smp&&P.smp[k],out=[];if(!Q||!Q.on||!pl.sx||!pl.sx[k])return out;stxSmpLoad(Q.id);const D=STX.sb[Q.id];if(!D||!D.sl||!D.sl.length)return null;
    const shiftTo=(own,tg)=>{let bd=99;for(const pc of tg){let d=((pc-own)%12+12)%12;if(d>6)d-=12;if(Math.abs(d)<Math.abs(bd))bd=d}return bd};
    for(let s=0;s<16;s++){const ev=pl.sx[k][b*16+s];if(!ev)continue;const ch=pl.ch[ev.ci]||pl.ch[0],pcs=(ch.iv||[0]).map(v=>(ch.r+v)%12),tg=Q.mode==='ett'?[ch.r]:pcs;
      const pool=D.kit?D.kit.filter(x=>ev.l>=2||!x.whole):D.sl,sl=pool[Math.min(pool.length-1,Math.floor(ev.r*pool.length))]||D.sl[0],n=Math.round(sl.n+shiftTo(sl.n,tg)+12*(Q.oct|0));
      const l=Math.max(.25,Math.min(16-s,ev.l+(Q.mode==='ett'?2:0)));
      if(ev.stu){for(let i=0;i<3;i++)out.push({s:s+i*.5,l:.45,n,v:.85});out.push({s:s+1.5,l:Math.max(.25,l-1.5),n,v:.85})}else out.push({s,l,n,v:.85})}
    return out}
  const isEmptyRow=r=>!r||!r.some(c=>c&&c.v);
  function ensureSong(){if(!(S.song&&S.chain[0]===0&&S.chain[1]===1&&S.chain[2]===2&&S.chain[3]===3)){S.chain=[0,1,2,3,-1,-1,-1,-1];S.song=1;try{renderChain()}catch(e){globalThis.__el&&globalThis.__el(e)}}}
  /* the beat in all four bars: patterns that are still untouched copies (or empty) follow the pattern you work in */
  /* v234: what you put in by hand stays in the pattern you put it in. Only beats the app makes itself (a new groove, dice,
     variation …) are copied on to the patterns that were still copies; a step you click, play on a pad or record is yours –
     it used to be copied to every pattern where that row was empty (a tom put in C landed in A, B and D too). */
  let hand=false;const handOn=()=>{hand=true};
  document.addEventListener('pointerdown',e=>{if(e.target.closest&&e.target.closest('#grid,#sgrid,#bigsteps,#pads,.trk,.tracker,.roll,.pr,.dc'))handOn()},true);
  document.addEventListener('keydown',e=>{if(!e.metaKey&&!e.ctrlKey&&/^[0-9]$/.test(e.key))handOn()},true);
  function drumsFollow(){if(!S.stxw)S.stxw={};const W=S.stxw;if(!W.ph)W.ph={};let ch=false;
    TRACKS.forEach((t,i)=>{if(t.mel||(window.trkOn&&!trkOn(i)))return;const id=t.id,rows=[0,1,2,3].map(b=>S.pats[b][i]),cur=rows.map(r=>hash(JSON.stringify(r))),prev=W.ph[id];
      if(!prev){W.ph[id]=cur;return}const chg=[0,1,2,3].filter(b=>cur[b]!==prev[b]);
      /* one pattern changed (a new groove, your edit): the others that were still copies of it (or empty) follow */
      if(chg.length===1&&!hand&&!isEmptyRow(rows[chg[0]])){const src=chg[0];for(let b=0;b<4;b++){if(b===src)continue;if(isEmptyRow(rows[b])||cur[b]===prev[src]){S.pats[b][i]=JSON.parse(JSON.stringify(rows[src]));cur[b]=cur[src];ch=true}}}
      W.ph[id]=cur});hand=false;return ch}
  /* a new idea / a new groove: the drums of the pattern it was made in go to all four (locked drum tracks keep theirs), so the beat loops
     one bar while the synths play A → D. You can still make B–D different by hand afterwards. */
  window.drumsToAll=()=>{if(!S.stxw)S.stxw={};const W=S.stxw;if(!W.ph)W.ph={};const src=S.pat;
    TRACKS.forEach((t,i)=>{if(t.mel||(window.trkOn&&!trkOn(i))||(S.lock&&S.lock[t.id]))return;const row=S.pats[src][i];for(let b=0;b<4;b++)if(b!==src)S.pats[b][i]=JSON.parse(JSON.stringify(row));
      W.ph[t.id]=[0,1,2,3].map(b=>hash(JSON.stringify(S.pats[b][i])))});try{renderAll()}catch(e){globalThis.__el&&globalThis.__el(e)}};
  let writing=false;
  function write(P){if(!P.on)return false;const pl=stxPlanCached();if(!S.stxw)S.stxw={};const W=S.stxw;if(!W.h)W.h={};let any=false;
    const put=(id,bars)=>{const i=TI(id);if(i<0)return;if(S.lock&&S.lock[id])return;const h=hash(JSON.stringify(bars));if(W.h[id]===h)return;
      for(let b=0;b<4;b++){if(!S.roll[b])S.roll[b]={};S.roll[b][id]=bars[b].map(o=>{const m={s:o.s,l:o.l,n:o.n,v:o.v};if(o.id)m.id=o.id;if(o.g)m.g=o.g;return m});try{syncCells(b,i)}catch(e){globalThis.__el&&globalThis.__el(e)}}
      if(!S.chord)S.chord={};S.chord[id]=0;if(P.fol)P.fol[id]='av';W.h[id]=h;any=true};
    LAYS.forEach(lay=>{const id=STX_LTRK[lay];put(id,[0,1,2,3].map(b=>layerNotes(P,pl,lay,b)))});
    [0,1].forEach(k=>{const Q=P.smp&&P.smp[k];const id=STX_SLT['s'+k];if(!Q||!Q.on){if(W.h[id]&&W.h[id]!=='0'){put(id,[[],[],[],[]])}return}
      const bars=[0,1,2,3].map(b=>slotNotes(P,pl,k,b));if(bars.some(x=>x==null))return;/* the sample is still loading: next time */
      const c=S.trk;const need=k?6:5;if(c&&c.ns<need){c.ns=need;try{trkLayout()}catch(e){globalThis.__el&&globalThis.__el(e)}}put(id,bars)});
    if(any)ensureSong();return any}
  /* the mix side of a layer: its level, ton and längd become the track's fader, tone and decay (only when they change in the Starter) */
  function mixFollow(P){if(!S.stxw)S.stxw={};const W=S.stxw;if(!W.m)W.m={};let ch=false;
    LAYS.forEach(lay=>{const L=P.ls[lay],id=STX_LTRK[lay];if(!L||!P.on||(S.lock&&S.lock[id]))return;const big=String(L.snd).startsWith('e:'),k=[big?'e':'s',L.lv,L.ton,L.len].join('|');if(W.m[id]===k)return;W.m[id]=k;const p=S.params[id],d=DEF_P[id];if(!p||!d)return;
      /* the simple synth: the layer's level, ton and längd are the track's fader, tone and decay; a big synth keeps the track's own (the level is in the velocity, as before) */
      if(big){p.level=d.level;p.tone=d.tone;p.decay=d.decay}else{p.level=+Math.min(1,d.level*Math.pow((L.lv??.75)/.75,2)).toFixed(4);p.tone=L.ton??.5;p.decay=L.len??.5}ch=true;try{applyTrack(TI(id))}catch(e){globalThis.__el&&globalThis.__el(e)}});
    (P.smp||[]).forEach((q,k)=>{if(!q||!q.on||!P.on)return;const id=STX_SLT['s'+k];if(S.lock&&S.lock[id])return;const kk=String(q.lv);if(W.m[id]===kk)return;W.m[id]=kk;const p=S.params[id];if(p){p.level=DEF_P[id].level;ch=true;try{applyTrack(TI(id))}catch(e){globalThis.__el&&globalThis.__el(e)}}});
    return ch}
  function tick(){if(window.__noSync||writing)return;let P;try{P=stx()}catch(e){return}if(!P||!P.ls)return;writing=true;
    try{const r=syncSounds(P);const w=write(P),m=mixFollow(P),d=P.on&&S.song?drumsFollow():false;
      if(r.chT){try{refreshSound()}catch(e){globalThis.__el&&globalThis.__el(e)}try{refreshInst()}catch(e){globalThis.__el&&globalThis.__el(e)}}
      if(r.chS){try{if(window.stxPaint)stxPaint(true)}catch(e){globalThis.__el&&globalThis.__el(e)}}
      if(w||d){try{renderAll()}catch(e){globalThis.__el&&globalThis.__el(e)}}
      if(r.chT||r.chS||w||m||d)try{save()}catch(e){globalThis.__el&&globalThis.__el(e)}
      formSet(P);labels(P)}finally{writing=false}}
  /* the form (which layers play in which of 16 bars) is played live, as the Starter did: the tracks it writes are muted in the
     bars the form leaves them out (counted from where playback started). Locked tracks are yours and always play. */
  let FP=null,FL={};
  function formSet(P){const F=P&&P.on&&P.form&&P.form!=='allt'&&STX_FORM[P.form];FP=F?P:null;FL={};if(!F)return;
    LAYS.forEach(l=>{const id=STX_LTRK[l],i=TI(id);if(i>=0&&!(S.lock&&S.lock[id]))FL[i]=l});
    [0,1].forEach(k=>{const id=STX_SLT['s'+k],i=TI(id);if(i>=0&&P.smp&&P.smp[k]&&P.smp[k].on&&!(S.lock&&S.lock[id]))FL[i]='v'})}
  window.stxFormMute=(i,gs)=>{if(!FP)return false;const l=FL[i];return l?!stxFormOn(FP,gs,l):false};
  window.stxWriteNow=tick;
  /* write at once when the Starter changes (a new idea, new chords …), not up to a quarter second later – so the first beat already has the new notes */
  {const _p=window.stxPaint;if(_p)window.stxPaint=function(){const r=_p.apply(this,arguments);if(!writing)Promise.resolve().then(tick);return r}}
  setInterval(tick,250);

  /* the synth module shows which layer a track carries ("+ starter …") */
  let lblK='';function labels(P){const k=JSON.stringify([P.on,P.lay,(P.smp||[]).map(q=>q&&q.on),S.lock]);if(k===lblK)return;lblK=k;try{stxUsage()}catch(e){globalThis.__el&&globalThis.__el(e)}}

  /* ================= the Starter's own voices step aside; its fx move to the synth bus ================= */
  const _se=stxEnsure;stxEnsure=function(){const had=!!STX.E,E=_se.apply(this,arguments);if(E&&!had){const nop=()=>{};E.stab=nop;E.klo=nop;E.sub=nop;E.luft=nop;E.arpNote=nop;E.smpPlay=nop;busFx(E)}return E};
  let BFX=null;
  function busFx(E){if(!ctx||!A.buses||!A.buses.sy)return;const B=A.buses.sy;if(BFX&&BFX.c===ctx)return;
    const flt=ctx.createBiquadFilter();flt.type='lowpass';flt.frequency.value=20000;flt.Q.value=.6;
    /* dipp: a short delay that swells and comes back, so the synths bend down and up (the Starter's tape dip); at rest it is 0 */
    const dip=ctx.createDelay(.2);dip.delayTime.value=0;BFX={c:ctx,flt,dip,node:null};window.__bfx=BFX;
    try{B.in.disconnect(B.dpre)}catch(e){globalThis.__el&&globalThis.__el(e)}B.in.connect(flt);flt.connect(dip);dip.connect(B.dpre);
    stxFxNode(ctx).then(n=>{try{dip.disconnect(B.dpre);dip.connect(n);n.connect(B.dpre);BFX.node=n}catch(e){globalThis.__el&&globalThis.__el(e)}}).catch(()=>{});
    const dipAt=(t,len)=>{const n=64,cv=new Float32Array(n);for(let i=0;i<n;i++){const u=i/(n-1),w=Math.sin(Math.PI*Math.pow(u,.7));cv[i]=.02*w*w}
      const p=dip.delayTime;try{p.cancelAndHoldAtTime(t);p.setValueAtTime(p.value,t);p.setValueCurveAtTime(cv,t+.001,len)}catch(e){globalThis.__el&&globalThis.__el(e)}};
    /* the Starter's fx messages reach the bus too */
    const hook=()=>{if(!E.fxw||E.fxw._bus)return;const orig=E.fxw;E.fxw={_bus:1,port:{postMessage:m=>{try{orig.port.postMessage(m)}catch(e){globalThis.__el&&globalThis.__el(e)}try{if(BFX.node)BFX.node.port.postMessage(m)}catch(e){globalThis.__el&&globalThis.__el(e)}}},connect:(...a)=>orig.connect(...a),disconnect:(...a)=>orig.disconnect(...a)}};
    const iv=setInterval(()=>{if(E.fxw){hook();clearInterval(iv)}},100);
    /* the filter sweep (written into the loop, or held live) */
    const tk0=E.tick;E.tick=function(t,gs,sd,plan){const r=tk0.apply(this,arguments);try{const P=E.P;if(P&&P.on&&P.fx&&P.fx[8]){const fx=STX_FX.find(x=>x.id===8),Lg=((gs%64)+64)%64;if(fx&&fx.b===(Lg>>4)&&fx.s===(Lg&15))dipAt(t,fx.len*sd)}}catch(e){globalThis.__el&&globalThis.__el(e)}return r};
    const tk=E.tick;E.tick=function(t,gs,sd,plan){const r=tk.apply(this,arguments);try{const P=E.P;if(P&&P.on&&P.fx&&P.fx[7]){const fx=STX_FX.find(x=>x.id===7),Lg=((gs%64)+64)%64;if(fx&&fx.b===(Lg>>4)&&fx.s===(Lg&15)){const f=BFX.flt.frequency;f.cancelAndHoldAtTime(t);f.setValueAtTime(20000,t);f.exponentialRampToValueAtTime(260,t+fx.len*sd);f.setValueAtTime(20000,t+fx.len*sd+.02)}}}catch(e){globalThis.__el&&globalThis.__el(e)}return r};
    /* the Starter's beat pump on the tracks' chains */
    const tk2=E.tick;E.tick=function(t,gs,sd,plan){const r=tk2.apply(this,arguments);try{const K=E.P&&E.P.k;if(K&&K.pump>.01&&(((gs%64)+64)%64&15)%4===0)if(GLU.n&&GLU.c===ctx){const g=GLU.n.pump.gain;g.cancelAndHoldAtTime(t);g.setTargetAtTime(1-Math.min(.85,K.pump*.9),t,.003);g.setTargetAtTime(1,t+.016,sd*4*.16)}}catch(e){globalThis.__el&&globalThis.__el(e)}return r};
    const lv=E.live;E.live=function(fx,on,sd){const r=lv.apply(this,arguments);try{if(fx===8){const p=dip.delayTime,t=ctx.currentTime;p.cancelAndHoldAtTime(t);p.setValueAtTime(p.value,t);p.setTargetAtTime(on?.06:0,t,on?.18:.12)}if(fx===7){const f=BFX.flt.frequency,t=ctx.currentTime;f.cancelAndHoldAtTime(t);f.setTargetAtTime(on?260:20000,t,on?.35:.06)}}catch(e){globalThis.__el&&globalThis.__el(e)}return r}}

  /* ================= the synth module's dice: new chords (as "nya ackord" in the idea screen); the Starter writes them into the tracks ================= */
  {const act=document.querySelector('.card[data-card="synths"] .trk-act');if(act){const b=document.createElement('button');b.className='chip dice smdice';b.title='Kasta tärning – nya ackord (som i idé-läget) · låsta spår rörs inte';
    b.innerHTML='<span class="die">'+'<i></i>'.repeat(9)+'</span>nya ackord';act.insertBefore(b,act.firstChild);const pips={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
    const face=n=>b.querySelectorAll('.die i').forEach((x,k)=>x.classList.toggle('p',pips[n].includes(k)));face(5);
    b.onclick=()=>{if(b.disabled)return;b.disabled=true;let k=0;const spin=setInterval(()=>{face(1+Math.floor(Math.random()*6));if(++k>=6){clearInterval(spin);b.disabled=false;
      try{const P=stx();if(!P.on){P.on=1;stxEnsure()}const m=window.duoAct?duoAct('ch'):'';tick();toast(m||'Nya ackord')}catch(e){toast('Nya ackord gick inte: '+(e&&e.message||e))}}},55)}}}
  const css=document.createElement('style');css.textContent=`
/* a smaller die */
.chip.dice .die{width:16px;height:16px;padding:2px;border-radius:4px}
.trk-act .smdice{margin-right:4px}
#engOpts .enk-sep{font:500 9px var(--f-mono);opacity:.5;letter-spacing:.08em;align-self:center;margin:0 4px 0 8px}`;document.head.appendChild(css);
})();

