/* ================= the keyboard's sound strip (v245) =================
   Under the keyboard's top row: the sound the keyboard plays (engine + preset, ‹ › steps presets, tap for the picker),
   its envelope as A·D·S·R knobs with a drawing, and what came in over MIDI.
   - The picker: every engine and its presets, plus the instruments sampled in the Sampler card ("sampled").
   - MIDI: Bank Select (CC 0, or CC 32) picks the engine – bank 1 Analog, 2 Bris, 3 Acid … 12 sampled – and
     Program Change picks the preset in it (program 1 = the first). Always for the track the keyboard plays.
   - The knobs move the engine's own envelope params (each engine has its own set: Analog A D S R, Bris attack decay
     sustain release, FM only decay and release …); a knob the engine doesn't have is dimmed. The release also sets how
     long a key on this keyboard rings after you let go.
   ================= */
(()=>{
  const kb=document.getElementById('kb'),bar=kb&&kb.querySelector('.kb-bar');if(!kb||!bar)return;
  const BANKS=()=>ENG_ORDER.slice();/* bank n (1-based) = BANKS()[n-1]; Sample+ (msx) is the last engine */
  const TS=(t)=>t<1?[String(Math.round(t*1000)),'ms']:[t.toFixed(t<10?2:1),'s'];
  const P=v=>[String(Math.round(v*100)),'%'];
  const sq=(mx)=>({pos:v=>Math.sqrt(Math.max(0,v)/mx),val:p=>p*p*mx});/* raw seconds, knob on a square curve */
  const nrm={pos:v=>v,val:p=>p};
  /* per engine: [param key, show(v), knob mapping, seconds for the drawing] – null = the engine has no such stage */
  const ENV={
    analog:{o:id=>S.synth[id],A:['a',TS,sq(1),v=>v],D:['d',TS,sq(2),v=>v],S:['s',P,nrm],R:['r',TS,sq(3),v=>v]},
    bris:{o:()=>engE('bris'),A:['aA',v=>TS(brT(v,6)),nrm,v=>brT(v,6)],D:['aD',v=>TS(brT(v,10)),nrm,v=>brT(v,10)],S:['aS',P,nrm],R:['aR',v=>TS(brT(v,10)),nrm,v=>brT(v,10)]},
    sh101:{o:()=>engE('sh101'),A:['A',v=>TS(shT(v,6)),nrm,v=>shT(v,6)],D:['D',v=>TS(shT(v,10)),nrm,v=>shT(v,10)],S:['S',P,nrm],R:['R',v=>TS(shT(v,10)),nrm,v=>shT(v,10)]},
    mini:{o:()=>engE('mini'),A:['aA',v=>TS(shT(v,6)),nrm,v=>shT(v,6)],D:['aD',v=>TS(shT(v,10)),nrm,v=>shT(v,10)],S:['aS',P,nrm],R:null},
    super:{o:()=>engE('super'),A:['attack',v=>TS(.01+v*1.5),nrm,v=>.01+v*1.5],D:null,S:null,R:['release',v=>TS(.1+v*3),nrm,v=>.1+v*3]},
    fm:{o:()=>engE('fm'),A:null,D:['decay',v=>TS(.2+v*2.5),nrm,v=>.2+v*2.5],S:null,R:['rel',v=>TS(.05+v*1.5),nrm,v=>.05+v*1.5]},
    pluck:{o:()=>engE('pluck'),A:null,D:['len',v=>TS(.4+v*2.6),nrm,v=>.4+v*2.6],S:null,R:null},
    acid:{o:()=>engE('acid'),A:null,D:['dec',v=>TS(.06+v*.9),nrm,v=>.06+v*.9,'filter decay (the 303 decay shapes the filter, the volume stays)'],S:null,R:null,held:1},
    sub:{o:()=>engE('sub'),A:null,D:['decay',v=>TS(.1+v*2.5),nrm,v=>.1+v*2.5],S:null,R:null},
    grime:{o:()=>engE('grime'),A:null,D:['dec',v=>TS(.02+v*.5),nrm,v=>.02+v*.5,'filter decay (shapes the filter sweep, the volume stays)'],S:null,R:null,held:1},
    chip:{o:()=>engE('chip'),A:null,D:['dec',v=>TS(.05+v*1.4),nrm,v=>.05+v*1.4],S:null,R:null},
    msx:{o:()=>engE('msx'),A:['att',v=>TS(.001+v*v*2),nrm,v=>.001+v*v*2],D:['dec',v=>TS(.02+v*v*4),nrm,v=>.02+v*v*4],S:['sus',P,nrm],R:['rel',v=>TS(.02+v*v*4),nrm,v=>.02+v*v*4]}};
  /* ---- which track, which sound ---- */
  const kTrk=()=>{const b=kb.querySelector('#kbTrk button.on');const i=b?+b.dataset.i:S.sel;return TRACKS[i]&&TRACKS[i].mel?i:TRACKS.findIndex(t=>t.mel)};
  const msOf=id=>{const m=S.ms&&S.ms[id];return m&&window.TEX&&TEX.instruments.get(m)};
  const engOf=i=>S.inst[TRACKS[i].id]||'analog';
  const engName=e=>e==='analog'?'Analog':(ENG[e]&&ENG[e].name)||e;
  const engDot=e=>(ENG[e]&&ENG[e].dot)||'#B8F23A';
  const msList=()=>window.TEX&&TEX.list?TEX.list():[];
  const presets=(e,i)=>{if(e==='msx')return msList().map(I=>({l:I.meta.name,g:I.meta.dev||'sampled',ms:I.meta.id}));return window.__rsPresets?__rsPresets(e,TRACKS[i].id).map(p=>Object.assign(p,{g:{grund:'basic',sparade:'saved'}[p.g]||p.g})):[]};
  const presetName=(e,i)=>{const id=TRACKS[i].id;if(e==='msx'){const I=msOf(id);return I?I.meta.name:'–'}if(e==='grime'&&typeof GR_PRE!=='undefined')return (GR_PRE[engE('grime').pre]||['–'])[0];return (S.rsPre||{})[e]||'init'};
  function after(i){try{refreshInst()}catch(e){globalThis.__el&&globalThis.__el(e)}try{window.rsPaint&&rsPaint()}catch(e){globalThis.__el&&globalThis.__el(e)}try{save()}catch(e){globalThis.__el&&globalThis.__el(e)}paint(true)}
  function setEngine(i,e){const id=TRACKS[i].id;try{__kb.allOff()}catch(_){globalThis.__el&&globalThis.__el(_)}try{pushHist()}catch(_){globalThis.__el&&globalThis.__el(_)}
    if(e==='msx'){const L=msList();if(!L.length){toast('No sounds in Sample+ yet · autosample one in the Sampler card');return false}const cur=msOf(id);setMs(i,(cur||L[L.length-1]).meta.id);return true}
    if(S.ms&&S.ms[id]){delete S.ms[id];try{TEX.repaint&&TEX.repaint()}catch(_){globalThis.__el&&globalThis.__el(_)}}S.inst[id]=e;after(i);return true}
  function setMs(i,msId){if(window.TEX&&TEX.use)TEX.use(TRACKS[i].id,msId);paint(true)}
  function loadPreset(i,e,k){const L=presets(e,i),p=L[k];if(!p)return false;try{__kb.allOff()}catch(_){globalThis.__el&&globalThis.__el(_)}
    if(e==='msx'){setMs(i,p.ms);return true}
    if(engOf(i)!==e)setEngine(i,e);try{pushHist()}catch(_){globalThis.__el&&globalThis.__el(_)}p.f();if(!S.rsPre)S.rsPre={};S.rsPre[e]=p.l;after(i);return true}
  function step(d){const i=kTrk(),e=engOf(i),L=presets(e,i);if(!L.length)return;const cur=L.findIndex(p=>e==='msx'?p.ms===S.ms[TRACKS[i].id]:p.l===presetName(e,i));
    const k=((cur<0?(d>0?-1:0):cur)+d+L.length)%L.length;loadPreset(i,e,k);flash(engName(e)+' · '+L[k].l)}
  /* ---- the strip ---- */
  const css=document.createElement('style');css.id='keysx';css.textContent=`
.kx{display:flex;align-items:stretch;gap:8px;margin:-2px 0 10px;font-family:var(--f-mono);letter-spacing:.04em;color:#F5F5F2}
.kx-snd{flex:1 1 280px;min-width:0;display:flex;align-items:center;gap:4px;padding:4px;border-radius:16px;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}
.kx-snd .st{width:30px;height:44px;flex:none;border-radius:12px;color:rgba(245,245,242,.6);font-size:15px}.kx-snd .st:active{background:rgba(255,255,255,.12)}
.kx-nm{flex:1;min-width:0;display:flex;align-items:center;gap:10px;height:44px;padding:0 12px;border-radius:12px;text-align:left;transition:background .2s}
.kx-nm:hover{background:rgba(255,255,255,.05)}.kx-nm:active{background:rgba(255,255,255,.1)}
.kx-nm i{width:10px;height:10px;flex:none;border-radius:50%;background:var(--d);box-shadow:0 0 0 3px color-mix(in srgb,var(--d) 22%,transparent),0 0 12px var(--d)}
.kx-nm span{min-width:0;display:flex;flex-direction:column;gap:3px}
.kx-nm small{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:rgba(245,245,242,.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kx-nm b{font-weight:500;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kx-nm em{margin-left:auto;font-style:normal;font-size:9px;color:rgba(245,245,242,.4);white-space:nowrap}
.kx-env{flex:0 1 auto;display:flex;align-items:center;gap:6px;padding:4px 10px 4px 6px;border-radius:16px;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}
.kx-env svg.dr{width:92px;height:44px;flex:none}
.kx-env svg.dr path{fill:none;stroke:var(--kc,#F5F5F2);stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round}
.kx-env svg.dr path.f{fill:color-mix(in srgb,var(--kc,#F5F5F2) 14%,transparent);stroke:none}
.kx-k{width:46px;display:flex;flex-direction:column;align-items:center;gap:1px;touch-action:none;cursor:ns-resize;-webkit-user-select:none;user-select:none}
.kx-k svg{width:28px;height:28px}.kx-k svg circle{fill:none;stroke-width:3}.kx-k .bg{stroke:rgba(255,255,255,.1)}.kx-k .fg{stroke:var(--kc,#F5F5F2);stroke-linecap:round}
.kx-k b{font-weight:500;font-size:9.5px;line-height:1.1;white-space:nowrap}.kx-k small{font-size:8.5px;letter-spacing:.14em;color:rgba(245,245,242,.45)}
.kx-k.off{opacity:.28;cursor:default}.kx-k.off b{visibility:hidden}
.kx-midi{display:none;align-items:center;padding:0 12px;border-radius:16px;background:rgba(255,255,255,.06);font-size:9.5px;color:rgba(245,245,242,.55);white-space:nowrap}
.kx-midi.on{display:flex}.kx-midi b{color:#F5F5F2;font-weight:500;margin-left:6px}
.kx-sh{position:absolute;left:12px;right:12px;bottom:calc(100% + 8px);max-height:min(62vh,520px);display:flex;flex-direction:column;border-radius:20px;overflow:hidden;
  background:linear-gradient(180deg,rgba(38,39,38,.97),rgba(20,21,20,.98));-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 24px 60px -20px rgba(0,0,0,.8);font-family:var(--f-mono);color:#F5F5F2;animation:kxin .3s var(--spring,ease) both;z-index:5}
@keyframes kxin{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}
.kx-sh header{display:flex;align-items:center;gap:10px;padding:14px 16px 10px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(245,245,242,.55)}
.kx-sh header b{color:#F5F5F2;font-weight:500}.kx-sh header .x{margin-left:auto;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.08);color:#F5F5F2;font-size:13px}
.kx-cols{display:grid;grid-template-columns:minmax(170px,240px) 1fr;min-height:0;flex:1;border-top:1px solid rgba(255,255,255,.07)}
.kx-col{overflow:auto;padding:8px;scrollbar-width:thin}.kx-col+.kx-col{border-left:1px solid rgba(255,255,255,.07)}
.kx-col h6{margin:10px 8px 6px;font-size:9px;font-weight:400;letter-spacing:.16em;text-transform:uppercase;color:rgba(245,245,242,.4)}
.kx-e{width:100%;display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:12px;font-size:11.5px;text-align:left;color:rgba(245,245,242,.75)}
.kx-e i{width:8px;height:8px;border-radius:50%;background:var(--d);flex:none}.kx-e small{margin-left:auto;font-size:9px;color:rgba(245,245,242,.35)}
.kx-e:hover{background:rgba(255,255,255,.05)}.kx-e.sel{background:rgba(255,255,255,.09);color:#F5F5F2}.kx-e.on{color:#F5F5F2}.kx-e.on::after{content:"";width:6px;height:6px;border-radius:50%;background:#F5F5F2;margin-left:6px}
.kx-ps{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
.kx-p{display:flex;flex-direction:column;gap:4px;padding:10px 12px;border-radius:12px;text-align:left;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);min-width:0}
.kx-p small{font-size:8.5px;letter-spacing:.12em;text-transform:uppercase;color:rgba(245,245,242,.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kx-p b{font-weight:500;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kx-p:hover{background:rgba(255,255,255,.08)}.kx-p.on{background:#F5F5F2;color:#111211}.kx-p.on small{color:rgba(17,18,17,.55)}
.kx-empty{padding:18px 10px;font-size:10.5px;line-height:1.6;color:rgba(245,245,242,.5)}
@media (max-width:760px){.kx{flex-wrap:wrap}.kx-snd{flex-basis:100%}.kx-env{flex:1 1 auto;justify-content:space-between}.kx-env svg.dr{width:72px}}
@media (max-width:560px){.kx-sh header .hint{display:none}.kx-sh header{white-space:nowrap}.kb-trk{max-width:100%;overflow-x:auto;scrollbar-width:none}.kb-trk::-webkit-scrollbar{display:none}.kx-cols{grid-template-columns:1fr;grid-template-rows:auto 1fr}.kx-col+.kx-col{border-left:0;border-top:1px solid rgba(255,255,255,.07)}
  .kx-col.en{display:flex;gap:4px;overflow-x:auto;padding:8px}.kx-col.en h6{display:none}.kx-col.en .kx-e{width:auto;flex:none;padding:8px 11px;white-space:nowrap}.kx-col.en .kx-e small{display:none}
  .kx-ps{grid-template-columns:1fr 1fr}.kx-k{width:40px}.kx-sh{left:6px;right:6px}}
@media (max-height:520px){.kx-sh{max-height:calc(100vh - 40px)}}`;
  document.head.appendChild(css);
  const row=document.createElement('div');row.className='kx';
  row.innerHTML=`<div class="kx-snd"><button class="st" data-st="-1" aria-label="Previous sound">‹</button><button class="kx-nm" aria-label="Pick the sound"><i></i><span><small></small><b></b></span><em></em></button><button class="st" data-st="1" aria-label="Next sound">›</button></div>
<div class="kx-env"><svg class="dr" viewBox="0 0 92 44" aria-hidden="true"><path class="f"/><path class="l"/></svg>${['A','D','S','R'].map(k=>`<div class="kx-k" data-k="${k}" title="${{A:'attack',D:'decay',S:'sustain',R:'release'}[k]} · drag up or down"><svg viewBox="0 0 28 28"><circle class="bg" cx="14" cy="14" r="11" stroke-dasharray="51.8 69.1" transform="rotate(135 14 14)"/><circle class="fg" cx="14" cy="14" r="11" stroke-dasharray="0 69.1" transform="rotate(135 14 14)"/></svg><b>–</b><small>${k}</small></div>`).join('')}</div>
<div class="kx-midi"><span>midi</span><b></b></div>`;
  bar.after(row);
  const nmB=row.querySelector('.kx-nm'),midiEl=row.querySelector('.kx-midi');
  row.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>step(+b.dataset.st));
  nmB.onclick=()=>sheet?closeSheet():openSheet();
  /* knobs: drag up/down, double tap = the engine's default */
  const spec=(e,k)=>{const E=ENV[e];return E&&E[k]?E[k]:null};
  row.querySelectorAll('.kx-k').forEach(el=>{const k=el.dataset.k;let y0=null,p0=0,moved=false,lastTap=0;
    el.addEventListener('pointerdown',ev=>{const i=kTrk(),e=engOf(i),sp=spec(e,k),o=sp&&ENV[e].o(TRACKS[i].id);if(!sp||!o)return;ev.preventDefault();el.setPointerCapture(ev.pointerId);
      y0=ev.clientY;p0=sp[2].pos(o[sp[0]]??0);moved=false;try{pushHist()}catch(_){globalThis.__el&&globalThis.__el(_)}});
    el.addEventListener('pointermove',ev=>{if(y0==null)return;const i=kTrk(),e=engOf(i),sp=spec(e,k),o=sp&&ENV[e].o(TRACKS[i].id);if(!sp||!o)return;
      const p=Math.max(0,Math.min(1,p0+(y0-ev.clientY)/(ev.shiftKey?600:160)));if(Math.abs(y0-ev.clientY)>2)moved=true;o[sp[0]]=+sp[2].val(p).toFixed(4);liveApply(i,e);paintEnv()});
    const up=()=>{if(y0==null)return;y0=null;const i=kTrk(),e=engOf(i);
      if(!moved){const now=performance.now();if(now-lastTap<320){resetK(i,e,k)}lastTap=now}
      if(e==='msx'){const I=msOf(TRACKS[i].id);if(I&&TEX.keepEnv)TEX.keepEnv(I.meta.id)}try{save()}catch(_){globalThis.__el&&globalThis.__el(_)}try{window.rsPaint&&rsPaint()}catch(_){globalThis.__el&&globalThis.__el(_)}try{refreshInst()}catch(_){globalThis.__el&&globalThis.__el(_)}};
    el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)});
  function resetK(i,e,k){const sp=spec(e,k),o=sp&&ENV[e].o(TRACKS[i].id);if(!o)return;const d=e==='analog'?(DEFS.synth[TRACKS[i].id]||DEFS.synth.bass):DEFS.eng[e];if(d&&d[sp[0]]!=null)o[sp[0]]=d[sp[0]];liveApply(i,e);paintEnv()}
  function liveApply(i,e){if(e==='bris'){try{brisApplyAll()}catch(_){globalThis.__el&&globalThis.__el(_)}}}
  function paintEnv(){const i=kTrk(),e=engOf(i),E=ENV[e],o=E&&E.o(TRACKS[i].id);let segs={A:.004,D:.3,S:1,R:.15};
    row.querySelectorAll('.kx-k').forEach(el=>{const k=el.dataset.k,sp=E&&E[k];el.title=((sp&&sp[4])||{A:'attack',D:'decay',S:'sustain',R:'release'}[k])+(sp?' · drag up or down':' · this sound has none');el.classList.toggle('off',!sp||!o);if(!sp||!o)return;const v=o[sp[0]]??0;
      const f=sp[1](v);el.querySelector('b').textContent=f[0]+(f[1]?' '+f[1]:'');el.querySelector('.fg').setAttribute('stroke-dasharray',(51.8*Math.max(0,Math.min(1,sp[2].pos(v)))).toFixed(1)+' 69.1');
      segs[k]=k==='S'?v:sp[3]?sp[3](v):v});
    /* no sustain knob: a sound with a decay dies away (0), one with only attack/release is held (1) */
    if(!E||!E.S)segs.S=E&&E.D&&!E.held?0:1;
    /* the drawing: times on a square-root scale so short and long both show */
    const w=92,h=44,pad=3,tm=x=>Math.sqrt(Math.max(0,x));const a=tm(segs.A),d=tm(segs.D),r=tm(segs.R),hold=.55,tot=a+d+hold+r||1,sx=(w-2*pad)/tot;
    const y=v=>h-pad-v*(h-2*pad),x1=pad+a*sx,x2=x1+d*sx,x3=x2+hold*sx,x4=x3+r*sx,sl=Math.max(0,Math.min(1,segs.S));
    const pth=`M${pad} ${y(0)} L${x1.toFixed(1)} ${y(1)} L${x2.toFixed(1)} ${y(sl).toFixed(1)} L${x3.toFixed(1)} ${y(sl).toFixed(1)} L${x4.toFixed(1)} ${y(0)}`;
    row.querySelector('path.l').setAttribute('d',pth);row.querySelector('path.f').setAttribute('d',pth+` Z`)}
  let sig='';
  function paint(force){const i=kTrk();if(i<0)return;const e=engOf(i),id=TRACKS[i].id,s=[i,e,presetName(e,i),trkCol(i),S.ms&&S.ms[id]].join('|');if(!force&&s===sig)return;sig=s;
    nmB.style.setProperty('--d',engDot(e));nmB.querySelector('small').textContent=engName(e)+' · '+TRACKS[i].name.toLowerCase();nmB.querySelector('b').textContent=presetName(e,i);
    const L=presets(e,i);const ix=L.findIndex(p=>e==='msx'?p.ms===S.ms[id]:p.l===presetName(e,i));nmB.querySelector('em').textContent=`bank ${BANKS().indexOf(e)+1} · ${ix>=0?'prog '+(ix+1):L.length+' sounds'}`;
    paintEnv();if(sheet)drawSheet()}
  setInterval(()=>{if(!kb.hidden)paint()},300);
  /* ---- the picker ---- */
  let sheet=null,selE=null;
  function closeSheet(){if(sheet){sheet.remove();sheet=null}}
  /* the picker sits over the page above the keyboard, never above the top row or off the screen (phone: the keyboard can be high up) */
  function placeSheet(){if(!sheet)return;const r=kb.getBoundingClientRect(),hb=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdrB'))||8,room=Math.max(160,r.top-hb-8);
    const lr={position:'fixed',left:(r.left+(innerWidth<=560?6:12))+'px',right:(innerWidth-r.right+(innerWidth<=560?6:12))+'px'};
    if(r.top-hb-8<260)Object.assign(sheet.style,lr,{top:(hb+4)+'px',bottom:'8px',maxHeight:'none'});/* not enough room above the keys: between the top row and the bottom */
    else Object.assign(sheet.style,lr,{top:'auto',bottom:(innerHeight-r.top+8)+'px',maxHeight:Math.min(room,560)+'px'})}
  function openSheet(){closeSheet();sheet=document.createElement('div');sheet.className='kx-sh';kb.appendChild(sheet);selE=engOf(kTrk());drawSheet();placeSheet()}
  addEventListener('resize',placeSheet);
  function drawSheet(){if(!sheet)return;const i=kTrk(),cur=engOf(i),id=TRACKS[i].id,B=BANKS();
    const eBtn=(e,n)=>`<button class="kx-e${e===selE?' sel':''}${e===cur?' on':''}" data-e="${e}"><i style="--d:${engDot(e)}"></i>${engName(e)}<small>bank ${n}</small></button>`;
    const L=presets(selE,i),pcur=selE===cur?L.findIndex(p=>cur==='msx'?p.ms===S.ms[id]:p.l===presetName(cur,i)):-1;
    const ps=L.length?`<div class="kx-ps">${L.map((p,k)=>`<button class="kx-p${k===pcur?' on':''}" data-p="${k}"><small>${k+1} · ${String(p.g||'').replace(/</g,'&lt;')}</small><b>${String(p.l).replace(/</g,'&lt;')}</b></button>`).join('')}</div>`
      :selE==='msx'?`<div class="kx-empty">No sounds in Sample+ yet. Open the Sampler card, connect an instrument (OP-XY, OP-1 …) and press autosample – the sound shows up here.</div>`:`<div class="kx-empty">No presets.</div>`;
    const top=sheet.querySelector('.kx-col.ps');const st=top?top.scrollTop:0;
    sheet.innerHTML=`<header><span>sound for</span><b>${TRACKS[i].name.toLowerCase()}</b><span class="hint">· midi: bank picks the engine, program the sound</span><button class="x" aria-label="Close">×</button></header>
      <div class="kx-cols"><div class="kx-col en"><h6>engines</h6>${B.map((e,k)=>eBtn(e,k+1)).join('')}</div><div class="kx-col ps">${ps}</div></div>`;
    sheet.querySelector('.kx-col.ps').scrollTop=st;
    sheet.querySelector('.x').onclick=closeSheet;
    sheet.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{const e=b.dataset.e;selE=e;if(e!==cur&&(e!=='msx'||msList().length))setEngine(i,e);drawSheet()});
    sheet.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{loadPreset(i,selE,+b.dataset.p);drawSheet()})}
  addEventListener('pointerdown',ev=>{if(sheet&&!sheet.contains(ev.target)&&!nmB.contains(ev.target))closeSheet()},true);
  addEventListener('keydown',ev=>{if(sheet&&ev.key==='Escape')closeSheet()});
  new MutationObserver(()=>{if(kb.hidden)closeSheet();else paint(true)}).observe(kb,{attributes:true,attributeFilter:['hidden']});
  /* ---- MIDI bank select + program change ---- */
  let bankM=null,bankL=null,ft=0;
  function flash(t){midiEl.querySelector('b').textContent=t;midiEl.classList.add('on');clearTimeout(ft);ft=setTimeout(()=>midiEl.classList.remove('on'),2600)}
  /* the bank number: MSB (CC 0) – or LSB (CC 32) when a device leaves MSB at 0 and counts in LSB */
  const bankNo=()=>(bankM||0)>0?bankM:(bankL!=null?bankL:bankM);
  /* Bank Select on its own moves the keyboard's track to that engine straight away (its sound stays until a Program Change picks one) */
  function bank(){const i=kTrk();if(i<0)return;const B=BANKS(),n=bankNo();if(n==null)return;if(n>=B.length){flash('bank '+(n+1)+' · none');return}
    const e=B[n];if(e==='msx'&&!msList().length){flash('Sample+ · no sounds yet');return}if(engOf(i)!==e)setEngine(i,e);flash('bank '+(n+1)+' · '+engName(e))}
  function program(pc){const i=kTrk();if(i<0)return;const B=BANKS();let e=engOf(i);const bank=bankNo();
    if(bank!=null){if(bank>=B.length){flash('bank '+(bank+1)+' · none');return}e=B[bank]}
    if(e==='msx'&&!msList().length){flash('Sample+ · no sounds yet');return}
    const L=presets(e,i);if(pc>=L.length){flash(engName(e)+' · no program '+(pc+1));toast(engName(e)+' has '+L.length+' sounds');return}
    if(engOf(i)!==e)setEngine(i,e);loadPreset(i,e,pc);flash(engName(e)+' · '+(pc+1)+' '+L[pc].l)}
  window.KEYSX={
    midi(st,d){const ty=st&0xF0;if(ty===0xB0&&(d[1]===0||d[1]===32)){if(d[1]===0)bankM=d[2];else bankL=d[2];bank();return true}
      if(ty===0xC0){program(d[1]);return true}return false},
    rel(i){const e=engOf(i),E=ENV[e],o=E&&E.o(TRACKS[i].id);if(!o||!E.R)return null;/* (v266) every engine with a release knob uses it on the keyboard (SH-101's R did nothing there) */return Math.min(4,Math.max(.03,E.R[3](o[E.R[0]]??.25)))},
    open:openSheet,close:closeSheet,_paint:()=>paint(true),banks:BANKS};
})();

