/* ================= (v255) idea in the BLONDA look + the out module =================
   Drums and Starter chips, the big buttons, memories, undo and tempo get the app's straight corners and hairline edges
   (like the track tags under the orbit), the window and panel lose their big rounding. On iPad and computer the empty top
   of the right panel holds "out · level": the output as a dot waveform (as the app's out card), the peak in dB and a dot
   meter for left and right. */
const css3=document.createElement('style');css3.id='duoblonda';css3.textContent=`
body .duo .d-chip{border-radius:3px!important;background:rgba(255,255,255,.035);box-shadow:inset 0 0 0 1px rgba(255,255,255,.09);justify-content:flex-start;padding:0 9px;gap:7px;font-weight:500;letter-spacing:.03em}
body .duo .d-chip i{width:7px!important;height:7px!important;border-radius:1px!important}
body .duo .d-chip.d-press{background:rgba(255,255,255,.12)}
body .duo .d-chip.off,body .duo .d-chip.mut,body .duo .d-chip.tom{background:transparent;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}
body .duo .d-chip.d-flash{background:color-mix(in srgb,var(--c) 30%,#1d1c1a);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 70%,transparent)}
body .duo .d-big button{border-radius:4px!important;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);font-weight:600}
body .duo .d-big .idea{border-radius:4px!important;background:#FF8A3D;box-shadow:none}
body .duo .d-mem button{border-radius:3px!important}
body .duo .d-bot .u{border-radius:4px!important;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}
body .duo .d-tempo button{border-radius:4px!important}body .duo .d-tempo .d-key2{border-radius:4px!important}
body .duo .d-fx{border-radius:4px!important}
body .duo .d-lb{letter-spacing:.14em;font-weight:500}
.duo.box{border-radius:14px!important}
.duo.box.boxw.boxw>.d-panel,.duo>.d-panel{border-radius:6px!important;background:rgba(255,255,255,.025)!important}
.duo .d-out{display:none}
.duo.box.boxw.boxw{grid-template-rows:auto minmax(0,1fr) auto auto auto auto auto auto auto 14px!important}
.duo.box.boxw.boxw>.d-out{display:flex;flex-direction:column;grid-column:2;grid-row:2;min-height:0;margin:26px 0 20px;gap:10px}
.duo .d-oh{display:flex;align-items:flex-end;justify-content:space-between;font:500 8.5px/1 var(--f-mono,monospace);letter-spacing:.14em;text-transform:uppercase;color:rgba(236,232,220,.4)}
.duo .d-oh b{color:rgba(236,232,220,.75);font-weight:500}
.duo .d-oh em{font-style:normal;display:flex;align-items:baseline;gap:5px;letter-spacing:0}
.duo .d-oh .d-db{font:400 26px/1 var(--f-dot,monospace);color:#ECE8DC;letter-spacing:.02em}.duo .d-oh small{font:500 9px/1 var(--f-mono,monospace);text-transform:none;color:rgba(236,232,220,.45)}
.duo .d-oc{flex:1;min-height:0;width:100%;display:block;border-radius:3px;background:rgba(0,0,0,.18);box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}
.duo .d-om{display:grid;gap:5px}.duo .d-om i{display:block;height:6px;position:relative;
  background:radial-gradient(circle,rgba(236,232,220,.13) 1.3px,transparent 1.6px) 0 50%/6px 6px repeat-x}
.duo .d-om i::before{content:attr(data-ch);position:absolute;left:-12px;top:-1px;font:500 7px/8px var(--f-mono,monospace);color:rgba(236,232,220,.4)}
.duo .d-om i::after{content:"";position:absolute;inset:0;width:var(--v,0%);background:radial-gradient(circle,#ECE8DC 1.3px,transparent 1.6px) 0 50%/6px 6px repeat-x}
.duo .d-om i.hot::after{background:radial-gradient(circle,#FF8A3D 1.3px,transparent 1.6px) 0 50%/6px 6px repeat-x}
.duo .d-om{padding-left:12px}
@media (max-width:600px){body .duo .d-chip{justify-content:center;padding:0 3px;gap:5px;letter-spacing:0}}
@media (max-height:700px){.duo.box.boxw.boxw>.d-out{margin:20px 0 14px}.duo .d-oh .d-db{font-size:20px}}
`;document.head.appendChild(css3);
const OUT={buf:null,lb:null,rb:null,pk:0,lv:[0,0],t:0};
function outDraw(){const box=el.querySelector('.d-out');if(!box||!box.offsetParent)return;const cv=box.querySelector('canvas'),r=cv.getBoundingClientRect();if(r.width<10||r.height<10)return;
  const dpr=Math.min(2,devicePixelRatio||1),W=Math.round(r.width*dpr),H=Math.round(r.height*dpr);if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}
  const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);const w=r.width,h=r.height;g.clearRect(0,0,w,h);
  /* the faint dot grid behind, as in the app's cards */
  g.fillStyle='rgba(236,232,220,.07)';for(let y=8;y<h;y+=10)for(let x=8;x<w;x+=10){g.fillRect(x-.6,y-.6,1.2,1.2)}
  const an=window.A&&A.an||(typeof A!=='undefined'?A.an:null);let pk=0;
  if(typeof ctx!=='undefined'&&ctx&&an){if(!OUT.buf||OUT.buf.length!==an.fftSize)OUT.buf=new Float32Array(an.fftSize);an.getFloatTimeDomainData(OUT.buf);
    const N=Math.max(24,Math.floor(w/6)),L=Math.min(1024,OUT.buf.length);g.fillStyle='rgba(236,232,220,.92)';
    for(let x=0;x<N;x++){const v=OUT.buf[Math.floor(x/N*L)]||0;pk=Math.max(pk,Math.abs(v));g.beginPath();g.arc(3+x/(N-1)*(w-6),h*.5-v*h*.42,1.5,0,6.283);g.fill()}
    for(let i=0;i<OUT.buf.length;i+=4)pk=Math.max(pk,Math.abs(OUT.buf[i]));
    const side=[A.anL,A.anR];side.forEach((a,j)=>{let p=pk;if(a){if(!OUT['b'+j]||OUT['b'+j].length!==a.fftSize)OUT['b'+j]=new Float32Array(a.fftSize);a.getFloatTimeDomainData(OUT['b'+j]);p=0;const b=OUT['b'+j];for(let i=0;i<b.length;i+=2)p=Math.max(p,Math.abs(b[i]))}
      OUT.lv[j]=Math.max(p,OUT.lv[j]*.86)})}
  else{g.fillStyle='rgba(236,232,220,.35)';const N=Math.max(24,Math.floor(w/6));for(let x=0;x<N;x++){g.beginPath();g.arc(3+x/(N-1)*(w-6),h*.5,1.2,0,6.283);g.fill()}OUT.lv=[OUT.lv[0]*.86,OUT.lv[1]*.86]}
  OUT.pk=Math.max(pk,OUT.pk*.9);const now=performance.now();
  if(now-OUT.t>140){OUT.t=now;const db=OUT.pk>0?20*Math.log10(OUT.pk):-Infinity;box.querySelector('.d-db').textContent=isFinite(db)&&db>-60?db.toFixed(1):'--'}
  box.querySelectorAll('.d-om i').forEach((m,j)=>{const v=OUT.lv[j],db=v>0?20*Math.log10(v):-99,f=Math.max(0,Math.min(1,(db+48)/48));m.style.setProperty('--v',(Math.round(f*40)/40*100).toFixed(1)+'%');m.classList.toggle('hot',db>-3)})}
const el=document.createElement('div');el.className='duo';el.hidden=true;el.setAttribute('role','dialog');el.setAttribute('aria-label','Idéläge');
el.innerHTML=`<div class="d-top"><div class="d-brand"><b>BLONDA <span>idé</span></b><small>seq.3 · v294</small></div><div class="d-pre"><button data-pp="-1" aria-label="Förra stilen">‹</button><button class="nm" data-pl title="Stil · idéerna görs i den här stilen"></button><button data-pp="1" aria-label="Nästa stil">›</button></div><button class="d-tb" data-trk title="Visa eller göm trackern (T)">tracker</button><button class="d-x" title="Stäng idéläget" aria-label="Stäng">×</button></div>
  <div class="d-trk"><div class="d-th"><b>tracker</b><span class="d-bars"><button data-bar="0" title="Takt 1">1</button><button data-bar="1" title="Takt 2">2</button><button data-bar="2" title="Takt 3">3</button><button data-bar="3" title="Takt 4">4</button></span><button class="d-fol" data-fol title="Följ med när det spelar">följ</button></div><div class="d-tc"></div><div class="d-tr"></div><div class="d-tf">trummor: klick = av/på · shift/högerklick = betoning · startern: klick = välj ackord / ton · scrollhjul = flytta tonen · alt-klick = ta bort / återställ</div></div>
  <div class="d-ring"><canvas></canvas><button class="d-fx l" data-fx="half" aria-label="Halvtempo, håll"><b>halv</b><small>håll</small></button><button class="d-fx r" data-fx="stut" aria-label="Stutter, håll"><b>stutter</b><small>håll</small></button><div class="d-tempo"><button data-bpm="1" aria-label="Snabbare">+</button><b class="t"></b><small>bpm</small><button data-bpm="-1" aria-label="Långsammare">−</button><button class="d-lk" title="Lås tempot – ny idé ändrar det inte" aria-label="Lås tempot"></button><button class="d-key2" title="Key of new ideas (K) – free, or locked, e.g. G minor" aria-label="Key"><b></b><small>key</small></button></div></div>
  <div class="d-panel" aria-hidden="true"></div><div class="d-out"><div class="d-oh"><span>out · <b>level</b></span><em><b class="d-db">--</b><small>dB</small></em></div><canvas class="d-oc"></canvas><div class="d-om"><i data-ch="L"></i><i data-ch="R"></i></div></div><div class="d-lb" data-l="dr">trummor</div><div class="d-chips" data-g="dr"></div><div class="d-lb" data-l="st">startern</div><div class="d-chips" data-g="st"></div>
  <div class="d-big"><button class="idea" data-a="idea">ny idé<small class="d-sty">trummor + starter</small></button><button data-a="ch">nya ackord<small>keeps the drums</small></button><button data-a="gr">nytt groove<small>bara trummor</small></button><button data-a="snd">nya ljud<small>kit + starter</small></button></div>
  <div class="d-bot"><button class="u" data-u="u" aria-label="Ångra">↶</button><button class="d-play" aria-label="Spela"></button><button class="u" data-u="r" aria-label="Gör om">↷</button><div class="d-mem">${[0,1,2,3].map(i=>`<button data-m="${i}" title="Minne ${i+1}: tryck = spara / hämta · håll = spara över"><b>${i+1}</b><small>tom</small></button>`).join('')}</div></div>
  <div class="d-note">tryck en trumma = av/på · håll = nytt mönster · tryck i mitten = spela/stoppa · håll ny idé = välj stil · dina egna syntmönster är tysta här</div>
  <div class="d-keys"><span><b>mellanslag</b>spela</span><span><b>enter</b>ny idé</span><span><b>C</b>ackord</span><span><b>G</b>groove</span><span><b>S</b>ljud</span><span><b>← →</b>stil</span><span><b>1–4</b>minnen</span><span><b>Q · W</b>håll = halv · stutter</span><span><b>⌘Z</b>ångra</span><span><b>T</b>tracker</span><span><b>esc</b>stäng</span></div>`;
document.body.appendChild(el);
const veil=document.createElement('div');veil.className='duo-veil';veil.onclick=()=>close();document.body.insertBefore(veil,el);
/* a window on iPad and computer (not on phones: their screens are too small for a window) */
function boxMode(){const w=innerWidth,h=innerHeight,on=w>=700&&h>=560;el.classList.toggle('box',on);el.classList.toggle('boxw',on&&w>=900&&w>h*1.05)}
boxMode();addEventListener('resize',boxMode);
const $d=q=>el.querySelector(q),cv=$d('canvas'),cx=cv.getContext('2d');
const PLAY='<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>',PAUSE='<svg viewBox="0 0 24 24"><path d="M6 4h4.5v16H6zM13.5 4H18v16h-4.5z"/></svg>';
/* chips */
const drC=$d('[data-g="dr"]'),stC=$d('[data-g="st"]');
DR.forEach(i=>{const b=document.createElement('button');b.className='d-chip dr';b.style.setProperty('--c',TRACKS[i].hex||DC[i]);b.innerHTML=`<i></i><span>${TRACKS[i].name.toLowerCase()}</span>`;
  b.title='Tryck = av/på · håll = nytt mönster';let t=0,held=false,down=false,pid=null;
  const clear=()=>{clearTimeout(t);down=false;b.classList.remove('d-hold','d-press');if(b._lab)b.querySelector('span').textContent=b._lab};
  b.addEventListener('contextmenu',e=>e.preventDefault());
  b.addEventListener('pointerdown',e=>{e.preventDefault();initAudio();held=false;down=true;pid=e.pointerId;try{b.setPointerCapture(e.pointerId)}catch(_){globalThis.__el&&globalThis.__el(_)}b.classList.add('d-press','d-hold');b._lab=b._lab||b.querySelector('span').textContent;
    t=setTimeout(()=>{if(!down)return;held=true;b.classList.remove('d-hold');b.querySelector('span').textContent='nytt!';newDrum(i);b.classList.add('d-flash');setTimeout(()=>b.classList.remove('d-flash'),350)},480)});
  b.addEventListener('pointerup',e=>{if(!down||e.pointerId!==pid)return;const r=b.getBoundingClientRect(),inside=e.clientX>=r.left-8&&e.clientX<=r.right+8&&e.clientY>=r.top-8&&e.clientY<=r.bottom+8;clear();if(held||!inside)return;
    if(!S.pats[S.pat][i].some(c=>c.v)){newDrum(i);return}S.mute[i]=S.mute[i]?0:1;applyAll();save();paint();if(!S.mute[i])try{audition(i)}catch(_){globalThis.__el&&globalThis.__el(_)}});
  b.addEventListener('pointercancel',clear);drC.appendChild(b)});
DLAY.forEach(([l,lab])=>{const b=document.createElement('button');b.className='d-chip';b.style.setProperty('--c',LC[l]);b.innerHTML=`<i></i><span>${lab}</span>`;b.addEventListener('pointerdown',e=>{e.preventDefault();b.classList.add('d-press')});['pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,()=>b.classList.remove('d-press')));
  b.addEventListener('pointerup',()=>{if(!b.classList.contains('d-press'))return;b.classList.remove('d-press');b._go()});b._go=()=>{initAudio();const P=stx();if(l[0]==='s'&&l.length===2){const q=P.smp[+l[1]];if(!q.id)q.id=l==='s0'?'kit:vox':'b-stx-stop-low-e';q.on=q.on?0:1;if(q.on)try{stxSmpLoad(q.id)}catch(e){globalThis.__el&&globalThis.__el(e)}}else P.lay[l]=P.lay[l]?0:1;if(!P.on)P.on=1;commit();paint()};stC.appendChild(b)});
/* the state of an idea, for undo and the memories */
/* the synth sounds belong to an idea too: which engine each synth channel uses and the settings of the engines the Starter plays */
const sndSnap=()=>{const inst={},eng={},used=new Set();MELT.forEach(i=>{const id=TRACKS[i].id;inst[id]=S.inst[id]});
  try{const P=stx();for(const l in P.ls){const sn=P.ls[l].snd;if(sn&&sn.startsWith('e:'))used.add(S.inst[stxTrkOf(l,sn)]||sn.slice(2))}}catch(e){globalThis.__el&&globalThis.__el(e)}
  used.forEach(e=>{if(S.eng[e])eng[e]=JSON.parse(JSON.stringify(S.eng[e]))});return {inst,eng,pre:S.rsPre?{...S.rsPre}:null}};
function sndLoad(o){if(!o)return;MELT.forEach(i=>{const id=TRACKS[i].id;if(o.inst&&o.inst[id])S.inst[id]=o.inst[id]});
  for(const e in (o.eng||{})){S.eng[e]=JSON.parse(JSON.stringify(o.eng[e]))}if(o.pre)S.rsPre={...(S.rsPre||{}),...o.pre};engRefresh()}
function engRefresh(){try{brisApplyAll()}catch(e){globalThis.__el&&globalThis.__el(e)}try{if(window.__mini)__mini.paintAll()}catch(e){globalThis.__el&&globalThis.__el(e)}try{if(window.__sh101)__sh101.paintAll()}catch(e){globalThis.__el&&globalThis.__el(e)}try{refreshInst()}catch(e){globalThis.__el&&globalThis.__el(e)}}
const snapI=()=>JSON.stringify({pats:S.pats,roll:S.roll,dk:S.dk,stx:S.stx,bpm:S.bpm,dice:S.dice||null,sw:S.master.swing,snd:sndSnap(),stm:S.stm||null,mx:{bus:S.bus||null,m:{pump:S.master.pump,glue:S.master.glue,width:S.master.width,eqL:S.master.eqL,eqM:S.master.eqM,eqH:S.master.eqH}},pp:Object.fromEntries(DR.map(i=>[TRACKS[i].id,S.params[TRACKS[i].id]]))});
function loadI(js){const o=JSON.parse(js);if(o.mx){if(o.mx.bus)S.bus=o.mx.bus;if(o.mx.m)for(const k in o.mx.m)if(o.mx.m[k]!=null)S.master[k]=o.mx.m[k];try{applyBuses()}catch(e){globalThis.__el&&globalThis.__el(e)}try{applyMastering()}catch(e){globalThis.__el&&globalThis.__el(e)}}if(o.stm)S.stm=o.stm;if(o.pp)for(const id in o.pp)if(o.pp[id])S.params[id]=o.pp[id];S.pats=o.pats;if(o.roll)S.roll=o.roll;S.dk=o.dk||{};S.stx=o.stx;S.bpm=o.bpm;S.dice=o.dice;S.master.swing=o.sw;try{stx()}catch(e){globalThis.__el&&globalThis.__el(e)}if(o.snd)sndLoad(o.snd);try{stateHeal();stateHealEng();if(window.trkFix)trkFix()}catch(e){console.error('heal',e)}try{DR.forEach(k=>applyTrack(k))}catch(e){globalThis.__el&&globalThis.__el(e)}try{if(window.__stm)__stm.refresh()}catch(e){globalThis.__el&&globalThis.__el(e)}commit(true)}
function commit(all){save();try{if(STX.E)STX.E.apply(stx())}catch(e){globalThis.__el&&globalThis.__el(e)}try{applyMaster()}catch(e){globalThis.__el&&globalThis.__el(e)}try{renderAll()}catch(e){globalThis.__el&&globalThis.__el(e)}try{if(window.stxPaint)stxPaint(true)}catch(e){globalThis.__el&&globalThis.__el(e)}paint()}
function push(){DUO.hist.push(snapI());if(DUO.hist.length>40)DUO.hist.shift();DUO.redo.length=0}
/* idea makers */
function styleNew(){const d=dState();let st;const si=typeof curSty==='function'?curSty():null;if(si!=null&&PDR[STX_PRE[si].nm]){st=PDR[STX_PRE[si].nm];S.dice={...(S.dice||{}),style:st,si};try{S.master.swing=STY[st].sw}catch(e){globalThis.__el&&globalThis.__el(e)}return st}if(DUO.sty&&STY[DUO.sty])st=DUO.sty;else do{st=pickA(STY_K)}while(st===d.style&&Math.random()<.8);S.dice={style:st,prog:d.prog};try{S.master.swing=STY[st].sw}catch(e){globalThis.__el&&globalThis.__el(e)}return st}
function grooveNew(){const st=styleNew(),pat=S.pats[S.pat];const keep=DR.filter(i=>S.lock&&S.lock[TRACKS[i].id]).map(i=>[i,JSON.parse(JSON.stringify(pat[i]))]);genDrumsS(pat,st);keep.forEach(([i,r])=>{pat[i]=r});return STY[st].name}
const DKEY=['K','S','C','H','O','P'];
function newDrum(i){initAudio();push();const st=STY[(S.dice&&S.dice.style)||pickA(STY_K)]||STY[STY_K[0]],ok=x=>typeof x==='string'&&/[xXgo]/.test(x),cur=JSON.stringify(S.pats[S.pat][i].map(c=>c.v));let L=(st[DKEY[i]]||[]).filter(ok);if(L.length<2)L=L.concat(...STY_K.map(k=>(STY[k][DKEY[i]]||[]).filter(ok)));const row=S.pats[S.pat][i];
  for(let tries=0;tries<6;tries++){cellsClear(row);put(row,pickA(L.length?L:['x...x...x...x...']));if(JSON.stringify(row.map(c=>c.v))!==cur)break}
  if(S.mute[i]){S.mute[i]=0;applyAll()}commit();toast(TRACKS[i].name+' · nytt mönster');if(!playing)try{audition(i)}catch(e){globalThis.__el&&globalThis.__el(e)}}
function soundsNew(){if(window.randomKit)randomKit();bigSounds(stx(),(S.dice&&S.dice.style)||'house',.6)}
