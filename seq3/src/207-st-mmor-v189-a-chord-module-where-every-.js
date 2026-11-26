/* ================= Stämmor (v189): a chord module where every note of the chord is a voice – a line of dots that glides to
   its note in the next chord (the notes that move a little pitch over, the ones that jump are struck again). Big chord name,
   its degree in the key and its notes, the coming chords along the time line and a dot piano that lights the notes.
   Inspired by the "chords from a 1920s ballroom" / "one note blooms into 11 voices" videos Victory sent.
   Own progressions (styles), in the Starter's key; follows the app's tempo – one chord per ½, 1 or 2 bars.
   Sound: per voice two detuned saws + a sine, a filter and an envelope, a shared filter and a room, out on the synth bus.
   State in S.stm (saved with the project). ================= */
(()=>{
  const card=document.querySelector('.card[data-card="stammor"]'),box=document.getElementById('smBox');if(!card||!box)return;
  /* ---------- chords ---------- */
  const Q={maj:[0,4,7],m:[0,3,7],maj7:[0,4,7,11],maj9:[0,4,7,11,14],'6/9':[0,4,7,9,14],'maj7#11':[0,4,7,11,18],add9:[0,4,7,14],
    m7:[0,3,7,10],m9:[0,3,7,10,14],m11:[0,3,7,10,14,17],madd9:[0,3,7,14],'7':[0,4,7,10],'9':[0,4,7,10,14],'13':[0,4,10,14,21],
    '7b9':[0,4,7,10,13],'7#9':[0,4,7,10,15],'7#5':[0,4,8,10],dim7:[0,3,6,9],m7b5:[0,3,6,10],'13sus':[0,5,10,14,21],'7sus4':[0,5,7,10]};
  const QN={maj:'',m:'m',maj7:'maj7',maj9:'maj9','6/9':'6/9','maj7#11':'maj7(♯11)',add9:'add9',m7:'m7',m9:'m9',m11:'m11',madd9:'m(add9)','7':'7','9':'9','13':'13',
    '7b9':'7(♭9)','7#9':'7(♯9)','7#5':'7(♯5)',dim7:'dim7',m7b5:'m7♭5','13sus':'13sus','7sus4':'7sus4'};
  const STYS=[
    {id:'balsal',nm:'balsal 1920',mode:'dur',n:5,ch:[[0,'maj9'],[9,'7b9'],[2,'m9'],[7,'13'],[4,'m7'],[3,'dim7'],[2,'m9'],[7,'7b9'],[0,'6/9']]},
    {id:'blomma',nm:'en ton blir elva',mode:'dur',n:11,wide:1,ch:[[0,'maj'],[1,'maj7'],[10,'m9'],[10,'madd9'],[0,'maj'],[10,'m11'],[1,'maj9'],[1,'maj7#11']]},
    {id:'neosoul',nm:'neo soul',mode:'moll',n:6,ch:[[0,'m11'],[5,'9'],[10,'13'],[3,'maj9'],[8,'maj7#11'],[2,'m7b5'],[7,'7b9']]},
    {id:'gospel',nm:'gospel',mode:'dur',n:6,ch:[[0,'maj9'],[4,'m7'],[9,'7#5'],[2,'m9'],[7,'13sus'],[7,'13'],[0,'6/9'],[5,'maj7#11']]},
    {id:'film',nm:'film',mode:'moll',n:7,wide:1,ch:[[0,'madd9'],[8,'maj7#11'],[3,'maj9'],[10,'6/9'],[5,'m9'],[8,'maj9'],[7,'7sus4'],[7,'7b9']]},
    {id:'natt',nm:'natt',mode:'moll',n:5,ch:[[0,'m9'],[8,'maj9'],[5,'m9'],[7,'7b9']]},
    {id:'solsken',nm:'solsken',mode:'dur',n:5,ch:[[5,'maj9'],[4,'m7'],[2,'m9'],[0,'6/9']]}];
  const NN=typeof STX_NN!=='undefined'?STX_NN:['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const RN=['I','♭II','II','♭III','III','IV','♭V','V','♭VI','VI','♭VII','VII'];
  const DEF=()=>({on:0,src:'starter',sty:'balsal',n:0,gl:.6,snd:'glas',rate:1,ton:.55,rum:.4,lv:.7,bloom:1,sc:.35,mu:0});
  const M=()=>{if(!S.stm||typeof S.stm!=='object')S.stm=DEF();const d=DEF();for(const k in d)if(S.stm[k]==null)S.stm[k]=d[k];return S.stm};
  const sty=()=>STYS.find(s=>s.id===M().sty)||STYS[0];
  const nVo=()=>M().n||(M().src!=='egen'?6:sty().n);
  function keyRoot(s){let P=null;try{P=stx()}catch(e){globalThis.__el&&globalThis.__el(e)}const r=P?P.root:0,md=P?P.mode:'dur';if(s.mode==='dur'&&md==='moll')return (r+3)%12;if(s.mode==='moll'&&md==='dur')return (r+9)%12;return r}
  /* ---------- voicing and voice leading ---------- */
  function stack(base,tones,U,gap){const out=[],used=new Set();let last=base-gap;
    for(let k=0;k<U;k++){let pick=null;const need=tones.filter(t=>!used.has(t));
      for(let p=last+gap;p<last+gap+12&&pick==null;p++){const pc=((p%12)+12)%12;if(tones.includes(pc)&&(!need.length||need.includes(pc)))pick=p}
      if(pick==null)for(let p=last+gap;p<last+gap+12&&pick==null;p++)if(tones.includes(((p%12)+12)%12))pick=p;
      if(pick==null)return null;out.push(pick);used.add(((pick%12)+12)%12);if(used.size>=tones.length)used.clear();last=pick}return out}
  function voice(r,iv,N,prev,wide){const U=N-1;
    let bass=36+r;if(prev&&prev[0]!=null&&Math.abs(bass+12-prev[0])<Math.abs(bass-prev[0])&&bass+12<=50)bass+=12;
    const tones=[...new Set(iv.filter(x=>x!==0).map(x=>(r+x)%12))];if(U>tones.length)tones.push(r);
    const okPrev=prev&&prev.length===N;let best=null;
    for(const [gap,lim] of [[wide?3:2,93],[2,96],[1,100]]){if(best)break;
    for(let base=bass+7;base<=bass+26;base++){const up=stack(base,tones,U,gap);if(!up)continue;const top=up[up.length-1];if(top>lim)continue;
      const cost=okPrev?up.reduce((a,p,i)=>a+Math.abs(p-prev[i+1]),0)+(Math.abs(top-prev[N-1])>4?3:0):Math.abs(up[Math.floor((U-1)/2)]-(wide?66:64));
      if(!best||cost<best.c)best={c:cost,up}}}
    return [bass,...(best?best.up:[])]}
  /* the chords it plays: the Starter's own (default – same chords, same changes, so it always fits) or one of its own styles */
  const fromStarter=()=>M().src!=='egen';
  let chC=null,chT=0;function CH(){const n=performance.now();if(chC&&n-chT<120)return chC;chC=CH0();chT=n;return chC}
  function CH0(){if(fromStarter()){let P=null,ch=[];try{P=stx();ch=stxChords(P)}catch(e){globalThis.__el&&globalThis.__el(e)}if(P&&ch&&ch.length){
        const list=ch.map(c=>{const pc=((Math.round(c.r)%12)+12)%12,iv=(c.iv||(typeof STX_Q!=='undefined'&&STX_Q[c.q])||Q.maj).slice(),nm=String(c.name||NN[pc]),m=nm.match(/^([A-G][#b♯♭]?)(.*)$/);
          return {pc,iv,root:m?m[1]:NN[pc],q:m?m[2]:''}});
        return {list,key:P.root,mode:P.mode,per:list.length>4?8:16,loop:64,wide:P.vc==='vid'}}}
    const s=sty(),kr=keyRoot(s);return {list:s.ch.map(c=>({pc:(kr+c[0])%12,iv:(Q[c[1]]||Q.maj).slice(),root:NN[(kr+c[0])%12],q:QN[c[1]]??c[1]})),key:kr,mode:s.mode,per:Math.max(4,Math.round(16*M().rate)),loop:0,wide:!!s.wide}}
  let VS=[],vsKey='';
  function voicings(){const C=CH(),N=nVo(),k=JSON.stringify([C.list.map(c=>[c.pc,c.iv]),N,C.wide]);if(k===vsKey&&VS.length)return VS;
    /* plain triads get a 9th when there are voices enough (not on diminished chords) */
    const col=c=>{const iv=c.iv.slice();if(iv.length<=3&&N>=5&&!(iv.includes(3)&&iv.includes(6))&&!iv.includes(14)&&!iv.includes(2))iv.push(14);return iv};
    let prev=null;for(let pass=0;pass<2;pass++){VS=[];C.list.forEach(c=>{const v=voice(c.pc,col(c),N,prev,C.wide);VS.push(v);prev=v})}vsKey=k;return VS}
  const chName=k=>{const C=CH(),c=C.list[((k%C.list.length)+C.list.length)%C.list.length];return {root:c.root,q:c.q}};
  const roman=k=>{const C=CH(),c=C.list[((k%C.list.length)+C.list.length)%C.list.length],deg=((c.pc-C.key)%12+12)%12;let n=RN[deg];if(c.iv.includes(3)&&!c.iv.includes(4))n=n.toLowerCase();return n+String(c.q).replace(/^m(?!aj)/,'')};
  const mtof=p=>440*Math.pow(2,(p-69)/12);
  /* ---------- sound ---------- */
  const SND={
    glas:{t:['sawtooth','sawtooth','sine'],dt:[0,0,1200],g:[.42,.3,.55],cut:2600,q:.5,a:.008,d:1.1,s:.42,r:.6,v:2.8},
    'sträng':{t:['sawtooth','sawtooth','sawtooth'],dt:[0,0,-1200],g:[.5,.5,.22],cut:1700,q:.4,a:.32,d:1.4,s:.9,r:1.3,v:1.4},
    mjuk:{t:['triangle','triangle','sine'],dt:[0,0,0],g:[.12,.08,1],cut:1500,q:.4,a:.02,d:.9,s:.68,r:.8,v:1.8},
    piano:{t:['sine','triangle','sine'],dt:[0,1200,2400],g:[1,.32,.12],cut:3400,q:.3,a:.004,d:1.7,s:.18,r:.45,v:4.4},
    orgel:{t:['sine','sine','sine'],dt:[0,1200,1902],g:[1,.55,.32],cut:5200,q:.2,a:.006,d:.2,s:1,r:.09,v:1.29},
    'kör':{t:['sawtooth','sawtooth','square'],dt:[0,5,1200],g:[.45,.45,.12],cut:1150,q:2.4,a:.28,d:1,s:.85,r:1,v:1.56},
    klocka:{t:['sine','sine','triangle'],dt:[0,2400,1902],g:[1,.28,.18],cut:6000,q:.2,a:.002,d:2.4,s:0,r:1.4,v:6.2},
    varm:{t:['square','sawtooth','sine'],dt:[0,7,-1200],g:[.3,.36,.5],cut:950,q:.7,a:.45,d:1.6,s:.92,r:1.5,v:1.46}};
  let E=null;
  function ir(c,sec){const n=Math.floor(c.sampleRate*sec),b=c.createBuffer(2,n,c.sampleRate);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.6)*(i<c.sampleRate*.012?i/(c.sampleRate*.012):1)}return b}
  function ensure(){if(E)return E;if(typeof ctx==='undefined'||!ctx||typeof A==='undefined'||!A||!A.buses||!A.buses.sy)return null;const c=ctx;
    const sum=c.createGain(),hp=c.createBiquadFilter(),lp=c.createBiquadFilter(),dry=c.createGain(),wet=c.createGain(),conv=c.createConvolver(),out=c.createGain();
    hp.type='highpass';hp.frequency.value=38;lp.type='lowpass';lp.Q.value=.25;conv.buffer=ir(c,3);
    const sc=c.createGain(),gate=c.createGain();let bus=null;try{if(A.dry&&typeof mkBus==='function')bus=mkBus(A.dry,A.dIn||c.createGain(),A.rIn||c.createGain())}catch(e){bus=null}
    sum.connect(hp);hp.connect(lp);lp.connect(dry);lp.connect(conv);conv.connect(wet);dry.connect(out);wet.connect(out);out.connect(sc);sc.connect(gate);gate.connect(bus?bus.in:A.buses.sy.in);
    const V=[];for(let i=0;i<11;i++){const o=[c.createOscillator(),c.createOscillator(),c.createOscillator()],g=o.map(()=>c.createGain()),f=c.createBiquadFilter(),amp=c.createGain(),pan=c.createStereoPanner();o.ch=[-7+i*.7,7-i*.5,0];
      f.type='lowpass';f.Q.value=.5;amp.gain.value=0;
      o.forEach((x,j)=>{x.connect(g[j]);g[j].connect(f);x.frequency.value=261.6;x.start()});f.connect(amp);amp.connect(pan);pan.connect(sum);V.push({o,g,f,amp,pan,p:null,on:0})}
    E={sum,lp,dry,wet,out,V,sc,gate,bus,g0:-1};setParams();return E}
  function kill(){if(!E)return;const e=E;E=null;try{e.out.gain.setTargetAtTime(0,ctx.currentTime,.05)}catch(_){globalThis.__el&&globalThis.__el(_)}setTimeout(()=>{try{e.V.forEach(v=>v.o.forEach(o=>o.stop()));e.out.disconnect();if(e.bus)e.bus.pg.disconnect()}catch(_){globalThis.__el&&globalThis.__el(_)}},400)}
  function setParams(){if(!E)return;const m=M(),s=SND[m.snd]||SND.glas,t=ctx.currentTime;
    E.lp.frequency.setTargetAtTime(1200*Math.pow(2,m.ton*3.6),t,.05);E.wet.gain.setTargetAtTime(m.rum*.9,t,.05);E.dry.gain.setTargetAtTime(1-m.rum*.35,t,.05);
    E.out.gain.setTargetAtTime(m.lv*1.15,t,.05);E.V.forEach(v=>{v.f.Q.setTargetAtTime(s.q||.5,t,.05);v.g.forEach((g,j)=>g.gain.setTargetAtTime(s.g[j],t,.05));v.o.forEach((o,j)=>{if(o.type!==s.t[j])o.type=s.t[j];o.detune.setTargetAtTime(v.o.ch[j]+s.dt[j],t,.02)})})}
  /* the time line: what was played (and what is coming) – the drawing and the sound share it */
  const EV=[];let lastK=-1,relT=0;
  const bassOff=()=>{if(!fromStarter())return false;try{const P=stx();return !!(P.on&&P.lay&&P.lay.sub)}catch(e){return false}};
  const glideT=()=>.05+M().gl*.42,thr=()=>Math.round(1+M().gl*6);
  function chordAt(t,k,bloom){const e=ensure();if(!e)return;const s=SND[M().snd]||SND.glas,vs=voicings(),pit=vs[((k%vs.length)+vs.length)%vs.length],N=pit.length,now=ctx.currentTime,gT=glideT(),th=thr();
    t=Math.max(t,now+.005);const peak=.34*(s.v||1)/Math.sqrt(N),cut=s.cut*Math.pow(2,(M().ton-.5)*1.6),prev=e.V.map(v=>v.on?v.p:null);
    for(let i=0;i<11;i++){const v=e.V[i];
      if(i>=N){if(v.on){v.amp.gain.cancelAndHoldAtTime(t);v.amp.gain.setTargetAtTime(0,t,s.r/3);v.on=0}continue}
      const q=pit[i],fr=mtof(q),bm=i===0&&bassOff(),glide=!bloom&&v.on&&v.p!=null&&Math.abs(q-v.p)<=th,st=bloom?i*.045:(glide?0:i*.006);
      v.pan.pan.setTargetAtTime(i===0?0:((i-1)/Math.max(1,N-2)*2-1)*.55,t,.1);
      v.o.forEach(o=>{o.frequency.cancelAndHoldAtTime(t);
        if(bloom){o.frequency.setValueAtTime(mtof(60),t);o.frequency.setTargetAtTime(fr,t+.12,.45)}
        else if(glide)o.frequency.setTargetAtTime(fr,t,gT/3);
        else o.frequency.setValueAtTime(fr,t+st)});
      if(!glide){const g=v.amp.gain;g.cancelAndHoldAtTime(Math.max(now,t-.014));if(v.on)g.setTargetAtTime(0,Math.max(now,t-.014),.004);
        const pk=bm?0:peak*(i===0?1.15:1);g.setTargetAtTime(pk,t+st,s.a/3+(bloom?.15:0));g.setTargetAtTime(pk*s.s,t+st+s.a+.02,s.d/3);
        v.f.frequency.cancelAndHoldAtTime(t);v.f.frequency.setTargetAtTime(Math.min(16000,cut*2.2),t+st,.008);v.f.frequency.setTargetAtTime(cut,t+st+.03,s.d/2.5)}
      v.p=q;v.on=1}
    EV.push({t,k,pit:pit.slice(),prev,g:bloom?1.4:Math.max(.12,gT),bloom:!!bloom});if(EV.length>24)EV.splice(0,EV.length-24);lastK=k}
  function release(t){if(!E)return;const s=SND[M().snd]||SND.glas,now=ctx.currentTime;t=Math.max(t||now,now);E.V.forEach(v=>{if(!v.on)return;v.amp.gain.cancelAndHoldAtTime(t);v.amp.gain.setTargetAtTime(0,t,s.r/3);v.on=0});EV.push({t,off:1})}
  /* sidechain: the kick ducks the chords (amount = "pump"); the duck follows the kick as it is scheduled */
  const KI=TRACKS.findIndex(t=>t.id==='kick');
  function duck(t){if(!E)return;const a=M().sc;if(!(a>0))return;const g=E.sc.gain,now=ctx.currentTime;t=Math.max(now,t||now);g.cancelAndHoldAtTime(t);g.setTargetAtTime(1-a*.9,t,.004);g.setTargetAtTime(1,t+.03,.06+a*.1)}
  {const _t=trigger;trigger=function(i,t){const r=_t.apply(this,arguments);try{if(i===KI&&E&&M().on&&!(typeof isMuted==='function'&&isMuted(KI)))duck(t)}catch(e){globalThis.__el&&globalThis.__el(e)}return r}}
  /* mute (M) and solo (S): the same solo list as the channels and the Starter (place 50) */
  const SOLO=50,soloed=()=>typeof soloOn==='function'&&soloOn(SOLO),closedS=()=>typeof anySolo==='function'&&anySolo()&&!soloed();
  const silent=()=>!!M().mu||closedS();
  function gateTick(){if(!E)return;const v=silent()?0:1;if(v!==E.g0){E.g0=v;E.gate.gain.setTargetAtTime(v,ctx.currentTime,.015)}}
  setInterval(gateTick,60);
  const togMute=()=>{M().mu=M().mu?0:1;try{save()}catch(e){globalThis.__el&&globalThis.__el(e)}gateTick();paintUI()},togSolo=()=>{soloTog(SOLO);try{applyAll()}catch(e){globalThis.__el&&globalThis.__el(e)}try{save()}catch(e){globalThis.__el&&globalThis.__el(e)}gateTick();paintUI()};
  /* follow the transport: a new chord on every chord boundary */
  {const _bp=beatPump;beatPump=function(t,st){_bp(t,st);try{tick(t)}catch(e){console.warn('stammor',e)}}}
  {const _s=stop;stop=function(){_s.apply(this,arguments);try{if(M().on)release()}catch(e){globalThis.__el&&globalThis.__el(e)}}}
  const cSteps=()=>CH().per;
  function tick(t){const m=M();if(!m.on)return;const C=CH(),cs=C.per,g=typeof gstep==='number'?gstep:0;if(g%cs)return;const k=C.loop?Math.floor((g%C.loop)/cs)%C.list.length:Math.floor(g/cs);chordAt(t,k,g===0&&m.bloom)}
  /* ---------- the card ---------- */
  const css=document.createElement('style');css.textContent=`
.card[data-card="stammor"] #smBox{display:flex;flex-direction:column;gap:12px;min-height:0}
.sm-cvw{position:relative;border-radius:14px;overflow:hidden;background:rgba(0,0,0,.28);box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);cursor:pointer}
.sm-cv{display:block;width:100%;height:390px}
.sm-tip{display:block;margin:-4px 2px 0;font:500 9.5px var(--f-mono);letter-spacing:.08em;opacity:.5;min-height:12px}
.sm-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.sm-row button{height:32px;padding:0 12px;border-radius:999px;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);font:500 10.5px var(--f-mono);letter-spacing:.04em;white-space:nowrap}
.sm-row button:hover{background:rgba(255,255,255,.15)}
.sm-row button.on,.sm-seg button.on{background:#F2C318;color:#111211;box-shadow:none}
.sm-on{min-width:86px}
.sm-sty{display:flex;align-items:center;gap:2px}.sm-sty .sm-nm{min-width:150px;font-family:var(--f-dot,var(--f-mono))}
.sm-sty [data-d]{width:32px;padding:0!important}
.sm-seg{display:flex;gap:2px;padding:2px;border-radius:999px;background:rgba(255,255,255,.05)}
.sm-seg button{height:28px;min-width:30px;padding:0 9px;box-shadow:none;background:transparent}
.sm-lab{font:500 9px var(--f-mono);letter-spacing:.14em;text-transform:uppercase;opacity:.5;margin:0 2px 0 6px}
.sm-kn{display:flex;gap:6px;flex-wrap:wrap;align-items:flex-start}
.sm-kn .dk{--cc:#F2C318}.sm-kn .dk .dk-l,.sm-kn .dk .dk-v{color:inherit!important}.sm-kn .dk .dk-sc line,.sm-kn .dk .dk-tr{stroke:currentColor}
body.bg-light .sm-cvw{background:rgba(17,18,17,.82)}
body.bg-light .sm-row button{background:rgba(17,18,17,.06);box-shadow:inset 0 0 0 1px rgba(17,18,17,.14)}
.fullhost>.card[data-card="stammor"] .sm-cv{height:calc(100vh - 250px);min-height:300px}
body.look-studio .sm-cvw{border-radius:4px;background:#0E0F10}`;document.head.appendChild(css);
  box.innerHTML=`<div class="sm-cvw"><canvas class="sm-cv"></canvas></div><span class="sm-tip"></span>
    <div class="sm-row"><button class="sm-on"></button><span class="sm-lab">ackord</span><div class="sm-seg sm-src"><button data-src="starter">startern</button><button data-src="egen">egna</button></div><div class="sm-sty"><button data-d="-1" aria-label="Förra stilen">‹</button><button class="sm-nm" title="Välj stil"></button><button data-d="1" aria-label="Nästa stil">›</button></div>
      <span class="sm-lab">röster</span><div class="sm-seg sm-n">${[0,4,5,6,8,11].map(n=>`<button data-n="${n}">${n||'stil'}</button>`).join('')}</div></div>
    <div class="sm-row"><span class="sm-lab">ljud</span><div class="sm-seg sm-snd">${Object.keys(SND).map(k=>`<button data-s="${k}">${k}</button>`).join('')}</div>
      <span class="sm-lab sm-ownr">ackord per</span><div class="sm-seg sm-rate sm-ownr">${[[.5,'½ takt'],[1,'takt'],[2,'2 takter']].map(([v,l])=>`<button data-r="${v}">${l}</button>`).join('')}</div>
      <button class="sm-bl" title="Första ackordet blommar ut från en enda ton">blom</button></div>
    <div class="sm-kn"></div>`;
  const $=q=>box.querySelector(q),cv=$('.sm-cv'),g2=cv.getContext('2d');
  const read=card.querySelector('#smRead');
  function paintUI(){const m=M(),s=sty(),own=m.src==='egen';$('.sm-sty').style.display=own?'':'none';box.querySelectorAll('.sm-ownr').forEach(e=>e.style.display=own?'':'none');box.querySelectorAll('[data-src]').forEach(b=>b.classList.toggle('on',(b.dataset.src==='egen')===own));$('.sm-on').textContent=m.on?'på':'av';$('.sm-on').classList.toggle('on',!!m.on);$('.sm-nm').textContent=s.nm;
    box.querySelectorAll('[data-n]').forEach(b=>b.classList.toggle('on',+b.dataset.n===(m.n||0)));box.querySelectorAll('[data-s]').forEach(b=>b.classList.toggle('on',b.dataset.s===m.snd));
    box.querySelectorAll('[data-r]').forEach(b=>b.classList.toggle('on',+b.dataset.r===m.rate));$('.sm-bl').classList.toggle('on',!!m.bloom);
    $('.sm-tip').textContent=m.on?(typeof playing!=='undefined'&&playing?'':'tryck här = nästa ackord · ▶ = spela med låten'):'slå på för att höra ackorden';
    if(read){const k=lastK>=0?lastK:0,n=chName(k);read.textContent=n.root+n.q}}
  const chg=fn=>{fn(M());vsKey='';chC=null;try{save()}catch(e){globalThis.__el&&globalThis.__el(e)}setParams();paintUI()};
  $('.sm-on').onclick=()=>{try{initAudio();ctx.resume()}catch(e){globalThis.__el&&globalThis.__el(e)}chg(m=>{m.on=m.on?0:1});if(M().on){ensure();if(!(typeof playing!=='undefined'&&playing)){chordAt(ctx.currentTime+.03,0,M().bloom);armRel()}}else release()};
  box.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{const i=STYS.indexOf(sty()),n=STYS.length;chg(m=>{m.src='egen';m.sty=STYS[((i+(+b.dataset.d))%n+n)%n].id});preview()});
  $('.sm-nm').onclick=()=>{if(typeof pickShow==='function')pickShow($('.sm-nm'),STYS.map(s=>s.nm),STYS.indexOf(sty()),i=>{chg(m=>{m.sty=STYS[i].id});preview()})};
  box.querySelectorAll('[data-src]').forEach(b=>b.onclick=()=>{chg(m=>{m.src=b.dataset.src});preview()});
  box.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>chg(m=>{m.n=+b.dataset.n}));
  box.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{chg(m=>{m.snd=b.dataset.s});preview(true)});
  box.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>chg(m=>{m.rate=+b.dataset.r}));
  $('.sm-bl').onclick=()=>chg(m=>{m.bloom=m.bloom?0:1});
  /* stopped: a tap plays the next chord (and it rings for a while) */
  let relTo=0;function armRel(){clearTimeout(relTo);relTo=setTimeout(()=>{if(!(typeof playing!=='undefined'&&playing))release()},4200)}
  function preview(same){if(!M().on||(typeof playing!=='undefined'&&playing))return;try{initAudio();ctx.resume()}catch(e){globalThis.__el&&globalThis.__el(e)}ensure();chordAt(ctx.currentTime+.03,same&&lastK>=0?lastK:0,!same&&M().bloom);armRel()}
  cv.parentElement.addEventListener('click',()=>{try{initAudio();ctx.resume()}catch(e){globalThis.__el&&globalThis.__el(e)}if(!M().on){chg(m=>{m.on=1})}ensure();if(typeof playing!=='undefined'&&playing)return;
    const n=CH().list.length,live=EV.length&&!EV[EV.length-1].off;chordAt(ctx.currentTime+.03,live?(lastK+1)%n:0,!live&&M().bloom);armRel();paintUI()});
  if(typeof window.__dknob==='function'){const kn=$('.sm-kn'),P=(lab,key,fmt)=>window.__dknob(kn,{label:lab,min:0,max:1,def:DEF()[key],get:()=>M()[key],set:v=>{M()[key]=v;setParams()},fmt:fmt||(v=>Math.round(v*100)+''),cls:'sm',end:()=>{try{save()}catch(e){globalThis.__el&&globalThis.__el(e)}}});
    P('glid','gl',v=>Math.round((.05+v*.42)*1000)+' ms');P('ton','ton');P('rymd','rum');P('pump','sc');P('nivå','lv')}
  /* ---------- drawing ---------- */
  const COL=['#F2C318','#ECE8DC','#9FD8FF','#B9A6FF','#7FE0C4','#FF9CC2','#F7B267','#C9F27A','#8EC5FF','#FFD27A','#D7C8FF'];
  let vis=true;if(window.IntersectionObserver)new IntersectionObserver(es=>{vis=es.some(e=>e.isIntersecting)}).observe(cv);
  const ff=()=>{const v=getComputedStyle(card).getPropertyValue('--f-dot').trim();return v||'"BLONDA Dot",monospace'},fm=()=>{const v=getComputedStyle(card).getPropertyValue('--f-mono').trim();return v||'monospace'};
  function evList(now){const L=EV.slice();if(!(typeof playing!=='undefined'&&playing)||!M().on)return L;const last=[...L].reverse().find(e=>!e.off);if(!last)return L;
    const cd=cSteps()*stepDur(),vs=voicings();let prev=last.pit;for(let j=1;j<=4;j++){const k=last.k+j,pit=vs[k%vs.length];L.push({t:last.t+j*cd,k,pit,prev,g:Math.max(.12,glideT()),fut:1});prev=pit}return L}
  const ease=x=>x<=0?0:x>=1?1:x*x*(3-2*x);
  function pitchAt(L,i,t){let e=null;for(let j=L.length-1;j>=0;j--)if(L[j].t<=t){e=L[j];break}if(!e||e.off)return null;const q=e.pit[i];if(q==null)return null;
    const p0=e.bloom?60:(e.prev&&e.prev[i]!=null?e.prev[i]:q);return p0+(q-p0)*ease((t-e.t)/e.g)}
  function frame(){requestAnimationFrame(frame);if(!vis||document.hidden||!card.isConnected)return;if(!card.offsetParent&&!card.closest('.fullhost'))return;
    const d=devicePixelRatio||1,W=cv.clientWidth,H=cv.clientHeight;if(!W||!H)return;if(cv.width!==Math.round(W*d)||cv.height!==Math.round(H*d)){cv.width=Math.round(W*d);cv.height=Math.round(H*d)}
    const c=g2;c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,W,H);const now=typeof ctx!=='undefined'&&ctx?ctx.currentTime:performance.now()/1000;
    const C=CH(),vs=voicings(),L=evList(now),N=nVo(),ink='#ECE8DC',bOff=bassOff();
    let lo=99,hi=0;vs.forEach(v=>v.forEach(p=>{lo=Math.min(lo,p);hi=Math.max(hi,p)}));lo-=3;hi+=3;
    const big0=Math.round(Math.min(48,W*.07)),top=big0+86,kbH=Math.min(46,H*.14),bot=H-kbH-22,yOf=p=>bot-(p-lo)/(hi-lo)*(bot-top);
    const cd=cSteps()*(typeof stepDur==='function'?stepDur():.125),xh=Math.round(W*.36),pps=(W-xh)/(2.15*cd),tOf=x=>now+(x-xh)/pps;
    /* the chord now */
    const cur=[...L].reverse().find(e=>!e.off&&e.t<=now),k=cur?cur.k:(lastK>=0?lastK:0),s=sty(),since=cur?now-cur.t:9,al=Math.min(1,.25+since*4);
    const nm=chName(k);c.textAlign='center';c.textBaseline='alphabetic';c.globalAlpha=al;c.fillStyle=ink;
    const big=big0;c.font=`400 ${big}px ${ff()}`;const w1=c.measureText(nm.root).width;c.font=`400 ${Math.round(big*.6)}px ${ff()}`;const w2=c.measureText(nm.q).width;
    const x0=W/2-(w1+w2+4)/2;c.textAlign='left';c.font=`400 ${big}px ${ff()}`;c.fillText(nm.root,x0,14+big);c.font=`400 ${Math.round(big*.6)}px ${ff()}`;c.fillText(nm.q,x0+w1+4,14+big);
    c.textAlign='center';c.font=`500 10px ${fm()}`;c.globalAlpha=al*.6;const md=C.mode==='dur'?'major':'minor';c.fillText(roman(k)+'  ·  '+(NN[C.key]+' '+md).toUpperCase(),W/2,32+big);
    const notes=(cur?cur.pit:vs[k%vs.length]).map(p=>NN[((p%12)+12)%12]);c.globalAlpha=al*.45;c.fillText([...new Set(notes)].join('  '),W/2,47+big);c.globalAlpha=1;
    /* chord boundaries + names along the time line */
    c.font=`500 9.5px ${fm()}`;c.textAlign='left';
    L.forEach(e=>{if(e.off)return;const x=xh+(e.t-now)*pps;if(x<-40||x>W)return;c.fillStyle=ink;for(let y=top-6;y<bot+6;y+=7){c.globalAlpha=.12;c.fillRect(x-.5,y,1,1.5)}
      const n=chName(e.k);c.globalAlpha=e.fut?.35:.5;c.fillText(n.root+n.q,x+4,top-10)});
    /* the playhead */
    c.globalAlpha=.22;c.fillStyle=ink;for(let y=top-8;y<bot+8;y+=4)c.fillRect(xh-.5,y,1,2);c.globalAlpha=1;
    /* the voices: lines of dots */
    for(let i=0;i<N;i++){const col=COL[i%COL.length];c.fillStyle=col;
      for(let x=0;x<=W;x+=5){const t=tOf(x),p=pitchAt(L,i,t);if(p==null)continue;const dx=Math.abs(x-xh),fut=x>xh;
        let a=fut?.18+.5*Math.max(0,1-dx/(W*.35)):Math.max(0,.75*(1-dx/xh));if(i===0&&bOff)a*=.35;if(a<=.02)continue;c.globalAlpha=a;const r=dx<24?1.9:1.3;c.beginPath();c.arc(x,yOf(p),r,0,6.283);c.fill()}
      const p=pitchAt(L,i,now);if(p==null)continue;const y=yOf(p),hit=cur&&since<.5&&!(cur.prev&&cur.prev[i]!=null&&Math.abs(cur.pit[i]-cur.prev[i])<=thr()&&!cur.bloom);
      const gr=c.createRadialGradient(xh,y,0,xh,y,16);gr.addColorStop(0,col);gr.addColorStop(1,'rgba(0,0,0,0)');c.globalAlpha=.35;c.fillStyle=gr;c.beginPath();c.arc(xh,y,16,0,6.283);c.fill();
      c.globalAlpha=1;c.fillStyle=col;c.beginPath();c.arc(xh,y,3.6,0,6.283);c.fill();c.fillStyle='#fff';c.globalAlpha=.8;c.beginPath();c.arc(xh,y,1.4,0,6.283);c.fill();
      if(hit){c.globalAlpha=Math.max(0,.7-since*1.4);c.strokeStyle=col;c.lineWidth=1.2;c.beginPath();c.arc(xh,y,5+since*26,0,6.283);c.stroke()}}
    c.globalAlpha=1;
    /* the dot piano */
    const kLo=Math.max(24,12*Math.floor((lo+3)/12)),kHi=Math.max(kLo+35,12*Math.ceil((hi-3)/12)),isB=n=>[1,3,6,8,10].includes(((n%12)+12)%12);let wc=0;for(let n=kLo;n<=kHi;n++)if(!isB(n))wc++;
    const kx=12,kw=(W-24)/wc,ky=H-kbH-8,lit={};for(let i=0;i<N;i++){const p=pitchAt(L,i,now);if(p!=null)lit[Math.round(p)]=COL[i%COL.length]}
    let wi=0;const wx={};for(let n=kLo;n<=kHi;n++){if(isB(n))continue;wx[n]=kx+wi*kw;const l=lit[n];c.globalAlpha=l?.95:.13;c.fillStyle=l||ink;c.beginPath();c.roundRect?c.roundRect(wx[n]+1,ky,kw-2,kbH,2):c.rect(wx[n]+1,ky,kw-2,kbH);c.fill();wi++}
    for(let n=kLo;n<=kHi;n++){if(!isB(n))continue;const x=wx[n-1]+kw*.68,l=lit[n];c.globalAlpha=1;c.fillStyle=l||'#0B0C0D';c.beginPath();c.roundRect?c.roundRect(x,ky,kw*.64,kbH*.6,2):c.rect(x,ky,kw*.64,kbH*.6);c.fill();
      if(!l){c.globalAlpha=.25;c.strokeStyle=ink;c.lineWidth=.6;c.stroke()}}
    c.globalAlpha=1}
  /* keep the drawing and the header in step */
  let lastSeen=-2;setInterval(()=>{if(lastK!==lastSeen){lastSeen=lastK;paintUI()}},120);
  addEventListener('blonda-load',()=>{vsKey='';paintUI()});
  /* v193: always there – off and folded (minimised) from the start, never hidden (a hidden module could play unseen) */
  try{if(!S.cmin||typeof S.cmin!=='object')S.cmin={};if(S.cmin.stammor==null&&!M().on)S.cmin.stammor=1}catch(e){globalThis.__el&&globalThis.__el(e)}
  const shown=()=>true,setShown=()=>{},showApply=()=>{};
  /* its own strip in the mixer, after the Starter's: fader = the level knob, M, S, a meter, and in the desk view glide, space, pump and tone */
  function mkStrip(){if(typeof mxEl==='undefined'||!mxEl||mxEl.querySelector('.ms.smx'))return;const before=mxEl.querySelector('.ms-sep:not(.sx-sep):not(.sm-sep),.ms.bus,.ms.master');if(!before)return;
    const sep=document.createElement('div');sep.className='ms-sep sm-sep';sep.innerHTML='<span>stämmor</span>';mxEl.insertBefore(sep,before);
    const el=document.createElement('div');el.className='ms smx';el.style.setProperty('--tc','#F2C318');
    el.innerHTML=`<div class="nm"><i>sm</i><span>stämmor</span></div><div class="mks"></div><div class="pn" style="visibility:hidden"><b></b></div><div class="fd"><div class="tr"><div class="fl"></div><div class="cap0"></div></div><div class="mt"><i></i></div></div><div class="db"></div><div class="bt"><button class="m" aria-label="Mute stämmor">M</button><button class="s" aria-label="Solo stämmor">S</button></div><div class="mlab">stämmor</div>`;
    el.querySelector('.nm').onclick=()=>{try{card.scrollIntoView({behavior:'smooth',block:'center'})}catch(e){globalThis.__el&&globalThis.__el(e)}};
    {const ks=el.querySelector('.mks');[['gl','glide',.6],['rum','space',.4],['sc','pump',.35],['ton','tone',.55]].forEach(d=>{const w=document.createElement('div');w.className='mk';w.innerHTML=`<span class="mk-k"><i></i></span><em>${d[1]}</em><b></b>`;
      const paint=()=>{const v=M()[d[0]];w.style.setProperty('--v',(+v).toFixed(3));w.querySelector('b').textContent=Math.round(v*100)};
      let on=false,y0=0,v0=0,lt=0;w.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();const n=performance.now();if(n-lt<300){M()[d[0]]=d[2];setParams();paint();try{save()}catch(_){globalThis.__el&&globalThis.__el(_)}lt=0;return}lt=n;on=true;y0=e.clientY;v0=M()[d[0]];try{w.setPointerCapture(e.pointerId)}catch(_){globalThis.__el&&globalThis.__el(_)}});
      w.addEventListener('pointermove',e=>{if(!on)return;M()[d[0]]=Math.round(Math.max(0,Math.min(1,v0+(y0-e.clientY)/160))*100)/100;setParams();paint()});
      const up=()=>{if(on){on=false;try{save()}catch(_){globalThis.__el&&globalThis.__el(_)}}};w.addEventListener('pointerup',up);w.addEventListener('pointercancel',up);w._paint=paint;paint();ks.appendChild(w)});el._ks=ks}
    if(typeof mxDrag==='function')mxDrag(el.querySelector('.fd'),()=>M().lv,v=>{M().lv=Math.round(v*100)/100;setParams()},'y',.7);
    el.querySelector('.m').onclick=togMute;el.querySelector('.s').onclick=togSolo;
    el._x={tr:el.querySelector('.tr'),mt:el.querySelector('.mt i'),db:el.querySelector('.db'),m:el.querySelector('.m'),s:el.querySelector('.s'),k:'',pk:0};mxEl.insertBefore(el,before);showApply()}
  if(typeof buildMixer==='function'){const _b=buildMixer;buildMixer=function(){_b.apply(this,arguments);mkStrip()}}mkStrip();
  (function mloop(){requestAnimationFrame(mloop);if(typeof mxEl==='undefined'||!mxEl)return;const el=mxEl.querySelector('.ms.smx');if(!el||!el._x||el.classList.contains('sm-hide'))return;const mc=mxEl.closest('.card');if(!mc||!mc.offsetParent)return;
    const X=el._x,m=M(),key=m.lv+'|'+m.on+'|'+m.mu+'|'+soloed()+'|'+closedS();if(key!==X.k){X.k=key;X.tr.style.setProperty('--fv',(+m.lv).toFixed(4));X.db.textContent=typeof toDb==='function'?toDb(m.lv*m.lv*1.3):'';X.m.classList.toggle('on',!!m.mu);X.s.classList.toggle('on',soloed());el.classList.toggle('muted',!m.on||!!m.mu||closedS())}
    let q=0;const an=E&&E.bus&&E.bus.an;if(an){if(!X.buf||X.buf.length!==an.fftSize)X.buf=new Float32Array(an.fftSize);an.getFloatTimeDomainData(X.buf);for(let i=0;i<X.buf.length;i+=2){const a=Math.abs(X.buf[i]);if(a>q)q=a}}
    if(el._ks&&mc.closest('#fullHost'))el._ks.querySelectorAll('.mk').forEach(w=>w._paint&&w._paint());
    X.pk=Math.max(q,X.pk*.9);if(typeof lvOf==='function')X.mt.style.setProperty('--lv',lvOf(X.pk).toFixed(3));X.mt.classList.toggle('hot',X.pk>.89)})();
  showApply();paintUI();requestAnimationFrame(frame);
  const FIT={house:['glas','piano','varm','orgel'],techno:['varm','kör','glas'],disco:['sträng','piano','orgel'],afro:['orgel','piano','glas','klocka'],garage:['piano','orgel','glas'],
    lofi:['piano','mjuk','kör'],hiphop:['piano','mjuk','orgel','kör'],trap:['klocka','mjuk','sträng','kör'],drill:['klocka','sträng','kör'],synthwave:['sträng','varm','glas'],
    dnb:['sträng','varm','glas'],electro:['glas','varm','kör'],brk:['orgel','kör','piano']};
  function idea(genre){const m=M();if(!m.on)return '';const R0=Math.random,pk=a=>a[Math.floor(R0()*a.length)],L=(FIT[genre]||Object.keys(SND)).filter(x=>x!==m.snd);
    m.src='starter';m.snd=pk(L.length?L:Object.keys(SND));m.n=pk([0,5,6,6,7,8]);m.gl=+(.25+R0()*.55).toFixed(2);m.ton=+(.4+R0()*.3).toFixed(2);m.rum=+(.25+R0()*.3).toFixed(2);
    vsKey='';chC=null;try{save()}catch(e){globalThis.__el&&globalThis.__el(e)}setParams();paintUI();return m.snd}
  window.__stm={idea,CH,togMute,togSolo,isMuted:()=>!!M().mu,isSolo:soloed,shown,setShown,refresh:()=>{vsKey='';chC=null;setParams();paintUI()},STYS,voicings,chordAt,release,ensure,M,EV,kill,sty};
})();

