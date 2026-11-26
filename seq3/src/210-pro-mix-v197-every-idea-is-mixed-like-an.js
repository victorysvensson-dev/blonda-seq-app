/* ================= Pro mix (v197): every idea is mixed like an engineer would, not "three synths and play".
   Per genre: gain staging (the kick is the anchor, then snare/clap, hats, perc and the Starter's layers in a fixed balance),
   sidechain (the kick ducks the synths/chords – strong in house/techno, gentle in lofi/hip hop; the Starter's own beat pump is
   turned off so it does not pump twice), compression where it belongs (glue on the drum bus, a light glue on the synth bus and
   the master, nothing extra on the kick), panning (kick/snare/bass in the middle, hats a little right, open hat and perc left,
   chords and pad wide), sends (kick dry, a little room on the snare, more on the clap, hats almost dry, perc into the echo,
   the Starter's echo/room limited per genre), and groove (hat dynamics: on-beat eighths louder than the 16ths in between;
   in lofi and hip hop the backbeat sits a little late). Based on common practice (iZotope on house mixing, LANDR on lo-fi). ================= */
(()=>{
  const BASE={kick:{level:.8,pan:0,echo:0,space:.02},snare:{level:.5,pan:0,echo:.04,space:.16},clap:{level:.42,pan:.05,echo:.06,space:.24},
    hat:{level:.24,pan:.22,echo:0,space:.04},ohat:{level:.2,pan:-.16,echo:.03,space:.1},perc:{level:.3,pan:-.3,echo:.22,space:.16}};
  const G={
    house:{pump:.5,dGlue:.45,dDrive:.04,dFilt:0,syGlue:.22,st:{eko:.16,rum:.12,tejp:.22,drv:.08,br:.75},hatTone:.55,mst:{glue:.55,width:1.1,eqL:.5,eqH:.5}},
    techno:{pump:.55,dGlue:.5,dDrive:.08,dFilt:0,syGlue:.25,st:{eko:.2,rum:.1,tejp:.18,drv:.12,br:.7},hatTone:.5,mst:{glue:.6,width:1.05,eqL:.8,eqH:.3}},
    disco:{pump:.4,dGlue:.4,dDrive:.03,dFilt:0,syGlue:.2,st:{eko:.14,rum:.14,tejp:.2,drv:.06,br:.8},hatTone:.6,mst:{glue:.5,width:1.12,eqL:.4,eqH:.8}},
    garage:{pump:.45,dGlue:.45,dDrive:.05,dFilt:0,syGlue:.22,st:{eko:.15,rum:.12,tejp:.2,drv:.08,br:.75},hatTone:.55,mst:{glue:.55,width:1.1,eqL:.6,eqH:.5}},
    afro:{pump:.4,dGlue:.4,dDrive:.03,dFilt:0,syGlue:.2,st:{eko:.18,rum:.15,tejp:.2,drv:.06,br:.8},hatTone:.55,mst:{glue:.5,width:1.12,eqL:.5,eqH:.6}},
    synthwave:{pump:.35,dGlue:.4,dDrive:.04,dFilt:0,syGlue:.25,st:{eko:.26,rum:.24,tejp:.22,drv:.06,br:.85},hatTone:.55,mst:{glue:.5,width:1.15,eqL:.4,eqH:.6}},
    electro:{pump:.35,dGlue:.45,dDrive:.06,dFilt:0,syGlue:.22,st:{eko:.18,rum:.12,tejp:.2,drv:.1,br:.75},hatTone:.55,mst:{glue:.55,width:1.1,eqL:.6,eqH:.5}},
    brk:{pump:.3,dGlue:.5,dDrive:.08,dFilt:0,syGlue:.22,st:{eko:.16,rum:.12,tejp:.25,drv:.1,br:.75},hatTone:.5,mst:{glue:.55,width:1.08,eqL:.6,eqH:.4}},
    dnb:{pump:.3,dGlue:.5,dDrive:.06,dFilt:0,syGlue:.22,st:{eko:.2,rum:.2,tejp:.18,drv:.06,br:.8},hatTone:.55,mst:{glue:.55,width:1.12,eqL:.6,eqH:.6}},
    lofi:{pump:.18,dGlue:.5,dDrive:.14,dFilt:-.12,syGlue:.2,st:{eko:.14,rum:.18,tejp:.45,drv:.1,br:.7},hatTone:.42,late:.08,mst:{glue:.5,width:1,eqL:.6,eqH:-1.2}},
    hiphop:{pump:.15,dGlue:.55,dDrive:.12,dFilt:-.06,syGlue:.2,st:{eko:.14,rum:.14,tejp:.35,drv:.1,br:.7},hatTone:.45,late:.06,mst:{glue:.55,width:1.02,eqL:.8,eqH:-.6}},
    trap:{pump:.2,dGlue:.4,dDrive:.06,dFilt:0,syGlue:.2,st:{eko:.22,rum:.18,tejp:.2,drv:.06,br:.8},hatTone:.5,mst:{glue:.5,width:1.1,eqL:.8,eqH:.4}},
    drill:{pump:.2,dGlue:.4,dDrive:.08,dFilt:0,syGlue:.2,st:{eko:.2,rum:.16,tejp:.2,drv:.08,br:.75},hatTone:.5,mst:{glue:.5,width:1.08,eqL:.8,eqH:.3}}};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function grooveDrums(g){const pat=S.pats[S.pat],H=TRACKS.findIndex(t=>t.id==='hat'),SN=TRACKS.findIndex(t=>t.id==='snare'),CL=TRACKS.findIndex(t=>t.id==='clap'),PC=TRACKS.findIndex(t=>t.id==='perc'),R=Math.random;
    if(H>=0&&pat[H])pat[H].forEach((c,s)=>{if(!c||!c.v)return;if(S.lock&&S.lock.hat)return;const base=s%4===0?.85:s%2===0?.62:.42;c.vel=clamp(base+(R()-.5)*.1,.2,1);c.o=g.late?clamp((R()-.5)*.04,-.03,.03):0});
    [SN,CL].forEach(i=>{if(i<0||!pat[i])return;const id=TRACKS[i].id;if(S.lock&&S.lock[id])return;pat[i].forEach(c=>{if(!c||!c.v)return;c.o=g.late||0;if(c.vel==null||c.vel>.9)c.vel=c.v===2?.95:.85})});
    if(PC>=0&&pat[PC])pat[PC].forEach(c=>{if(c&&c.v&&!(S.lock&&S.lock.perc))c.vel=clamp(.62+(R()-.5)*.25,.3,1)})}
  function mixFor(genre){const g=G[genre]||G.house;
    /* drums: levels, pan, sends, the hats a little darker in the dusty styles */
    for(const id in BASE){const i=TRACKS.findIndex(t=>t.id===id);if(i<0||(S.lock&&S.lock[id]))continue;const p=S.params[id];if(!p)continue;Object.assign(p,BASE[id]);if(id==='hat'||id==='ohat')p.tone=g.hatTone}
    try{grooveDrums(g)}catch(e){globalThis.__el&&globalThis.__el(e)}
    /* buses: glue (compression) on the drums, a light one on the synths, drive/filter for the dusty styles */
    try{const dr=busOf('dr');dr.glue=g.dGlue;dr.drive=g.dDrive;dr.filter=g.dFilt;const sy=busOf('sy');sy.glue=g.syGlue;sy.drive=0;sy.filter=0;sy.lv=1;dr.lv=1}catch(e){globalThis.__el&&globalThis.__el(e)}
    /* sidechain: the kick ducks the synth bus (the Starter, the synths, the chord module) */
    try{S.master.pump=g.pump;const pc=pumpOf('sy');pc.src='kick';pc.shape=null;pc.rel=null}catch(e){globalThis.__el&&globalThis.__el(e)}
    /* the Starter: its layers in balance, its own beat pump off (the kick does it), echo/room/tape per genre */
    try{const P=stx();if(P&&P.k&&P.ls){
      /* v199: the style's own echo, room, tape, drive and brightness are its character – keep them (leaning a little toward the
         genre) and only rein in the extremes; the layer balance keeps the style's own proportions, scaled to the mix levels */
      const own=!!P.styNm,w=own?.25:.5,cap={eko:.32,rum:.3,tejp:.6,drv:.3,br:1};
      /* running auto-mix again starts from the same source values (not from its own last result), unless you turned a knob since */
      const km=P._kmx||{},ks=P._ksrc||{};P._kmx={};P._ksrc={};
      for(const q in g.st){let v=P.k[q]==null?g.st[q]:+P.k[q];if(km[q]!=null&&Math.abs(v-km[q])<1e-6&&ks[q]!=null)v=ks[q];P._ksrc[q]=v;
        P.k[q]=P._kmx[q]=+Math.min(cap[q]??1,Math.max(0,v*(1-w)+g.st[q]*w)).toFixed(3)}
      P.k.pump=0;P.k.tail=Math.min(P.k.tail??.3,own?.65:.45);P.k.vol=.72;
      const LV={ack:.62,klo:.74,sub:.74,luft:.44};for(const l in LV)if(P.ls[l]&&!String(P.ls[l].snd).startsWith('e:')){const L=P.ls[l];let v=L.lv??.75;if(L._mx!=null&&Math.abs(v-L._mx)<1e-6&&L._src!=null)v=L._src;L._src=v;L.lv=L._mx=+Math.max(.15,Math.min(LV[l]*1.12,v*LV[l]/.75)).toFixed(3)}
      for(const l in P.ls)if(P.ls[l]&&String(P.ls[l].snd).startsWith('e:'))P.ls[l].lv=Math.min(P.ls[l].lv,.72)}}catch(e){globalThis.__el&&globalThis.__el(e)}
    /* the chord module, if it plays: under the Starter, ducked like the synths */
    try{if(S.stm&&S.stm.on){S.stm.lv=.55;S.stm.sc=Math.max(.25,g.pump)}}catch(e){globalThis.__el&&globalThis.__el(e)}
    /* the master: a light glue, width and a gentle tilt */
    try{Object.assign(S.master,g.mst)}catch(e){globalThis.__el&&globalThis.__el(e)}
    try{applyAll()}catch(e){globalThis.__el&&globalThis.__el(e)}try{applyBuses()}catch(e){globalThis.__el&&globalThis.__el(e)}try{applyMastering()}catch(e){globalThis.__el&&globalThis.__el(e)}try{applyMaster()}catch(e){globalThis.__el&&globalThis.__el(e)}try{if(STX.E)STX.E.apply(stx())}catch(e){globalThis.__el&&globalThis.__el(e)}try{if(window.__stm)__stm.refresh()}catch(e){globalThis.__el&&globalThis.__el(e)}
    return genre}
  /* gain matching (v198): while the idea plays, the Starter's level is measured (the whole synth bus) against the drums and set so it sits where the
     genre wants it (a few dB under the drums in house/techno, close to them in lofi). Measured twice, a few seconds each. */
  /* targets from the mix as it sounds (the synth bus sits about 6 dB under the drum bus on average); only ideas that are more than
     2.5 dB off are corrected, toward the target – it evens out the extremes without changing the character */
  const TD={house:-7,techno:-7.5,disco:-6,garage:-6.5,afro:-6,synthwave:-5,electro:-6.5,brk:-6,dnb:-6.5,lofi:-4,hiphop:-4.5,trap:-6.5,drill:-6.5};
  let LV=null,taps=null,tapE=null;
  function tapsNow(){if(typeof A==='undefined'||!A||!A.buses)return null;if(taps)return taps;const c=A.buses.dr.pg.context,a1=c.createAnalyser(),a2=c.createAnalyser();a1.fftSize=a2.fftSize=2048;A.buses.dr.pg.connect(a1);A.buses.sy.pg.connect(a2);taps={dr:a1,st:a2,b:new Float32Array(2048)};return taps}
  function level(genre){LV={genre,pass:0,e:{dr:0,st:0},n:0,t0:0}}
  setInterval(()=>{if(!LV||typeof playing==='undefined'||!playing)return;const T=tapsNow();if(!T)return;const now=performance.now();if(!LV.t0){LV.t0=now+900;return}if(now<LV.t0)return;
    ['dr','st'].forEach(k=>{T[k].getFloatTimeDomainData(T.b);let e=0;for(let i=0;i<T.b.length;i+=2)e+=T.b[i]*T.b[i];LV.e[k]+=e/(T.b.length/2)});LV.n++;
    if(LV.n<36)return;const dr=10*Math.log10(LV.e.dr/LV.n+1e-12),st=10*Math.log10(LV.e.st/LV.n+1e-12),P=stx();
    if(dr<-60||st<-70){LV=null;return}
    /* the drums first: kits differ a lot in level (samples vs models), so the drum bus is brought toward one level */
    const dOff=-11.5-dr;let drN=dr;if(Math.abs(dOff)>2){const dc=Math.max(-5,Math.min(5,dOff-Math.sign(dOff)*1)),bd=busOf('dr');bd.lv=+Math.max(.4,Math.min(1.8,(bd.lv||1)*Math.pow(10,dc/20))).toFixed(3);drN=dr+dc;try{applyBuses()}catch(e){globalThis.__el&&globalThis.__el(e)}}
    const want=drN+(TD[LV.genre]??-6),off=want-st;if(Math.abs(off)<2.5&&drN===dr){LV.last={dr:+dr.toFixed(1),st:+st.toFixed(1),corr:0,bus:busOf('sy').lv};window.__mixLv=LV.last;LV=null;return}
    const corr=Math.abs(off)<2.5?0:Math.max(-5,Math.min(5,off-Math.sign(off)*1)),f=Math.pow(10,corr/20);
    /* the whole synth bus (the Starter and the synths it plays) moves together, so the balance inside it stays */
    const sy=busOf('sy');sy.lv=+Math.max(.35,Math.min(1.8,(sy.lv||1)*f)).toFixed(3);try{applyBuses()}catch(e){globalThis.__el&&globalThis.__el(e)}
    LV.last={dr:+dr.toFixed(1),st:+st.toFixed(1),corr:+corr.toFixed(1),bus:sy.lv};window.__mixLv=LV.last;
    LV.pass++;LV.e={dr:0,st:0};LV.n=0;LV.t0=now+600;if(LV.pass>=2||Math.abs(corr)<.6){try{save()}catch(e){globalThis.__el&&globalThis.__el(e)}LV=null}},90);
  const _mf=mixFor;window.__mix={mixFor:g=>{const r=_mf(g);level(g);return r},G,level};
  /* the mixer card gets an "auto-mix" button: the same mix for the current idea's style */
  const addBtn=()=>{const cap=document.querySelector('.card.mixer .cap');if(!cap||cap.querySelector('.amx'))return;const box=cap.querySelector('.cbtns');const b=document.createElement('button');b.className='kit-cap amx';b.textContent='auto-mix';b.title='Mixa som en ljudtekniker: nivåer, sidechain, kompression, panorering och effekter efter stilen';
    b.onclick=e=>{e.stopPropagation();const g=(S.dice&&S.dice.style)||'house';window.__mix.mixFor(g);try{save()}catch(_){globalThis.__el&&globalThis.__el(_)}try{renderAll()}catch(_){globalThis.__el&&globalThis.__el(_)}toast('Auto-mix · '+((STY[g]&&STY[g].name)||g))};if(box)box.before(b);else cap.appendChild(b)};
  addBtn();setTimeout(addBtn,800);
})();

