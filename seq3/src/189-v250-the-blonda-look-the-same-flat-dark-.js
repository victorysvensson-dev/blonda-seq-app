/* ---- (v250) the BLONDA look: the same flat dark cards as the rest of the app (square, one hairline), mono captions,
   colour only where it means something (each mod source keeps its colour on its dot and its line), one page that scrolls ---- */
.rs{background:#17181A;padding:14px 18px 22px;gap:12px;overflow:auto;scrollbar-width:thin}
.rs-top{flex-wrap:wrap;row-gap:10px;min-height:0;padding-bottom:12px;border-bottom:1px solid #2A2B2D}
.rs-top>div:nth-of-type(1){min-width:0}
.rs-logo{font:500 10px var(--f-mono);letter-spacing:.24em;color:rgba(232,230,220,.45)}
.rs-name{font:300 28px/1 var(--f-linje);white-space:nowrap;letter-spacing:0}
.rs-tag{display:block!important;font-size:9.5px;letter-spacing:.04em;color:rgba(232,230,220,.4);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px}
.rs-eng-sel{order:10;flex:1 1 100%;max-width:none!important;border-radius:0;padding:0;background:none;gap:4px}
.rs-eng-sel button{height:30px;padding:0 12px;border-radius:0;font-size:10.5px;letter-spacing:.04em;background:#1C1E20;box-shadow:inset 0 0 0 1px #2E3032;color:rgba(232,230,220,.6)}
.rs-eng-sel button:hover{color:#E8E6DC}.rs-eng-sel button.on{background:#E8E6DC;color:#141516;box-shadow:none}
.rs-trk{gap:0;box-shadow:inset 0 0 0 1px #2E3032}.rs-trk button{height:30px;padding:0 12px;border-radius:0;box-shadow:none;font-size:10.5px}.rs-trk button.on{background:#E8E6DC;color:#141516}
.rs-pb,.rs-x{height:34px;padding:0 14px;border-radius:0;box-shadow:inset 0 0 0 1px #2E3032;background:#1C1E20;font-size:10.5px!important;letter-spacing:.04em;white-space:nowrap}
.rs-pb:hover,.rs-x:hover{background:#232528}.rs-pb small{font-size:8.5px;letter-spacing:.12em;color:rgba(232,230,220,.4)}.rs-pb b{font:500 11px var(--f-mono);letter-spacing:.02em;color:#F2C318;max-width:150px;overflow:hidden;text-overflow:ellipsis}
.rs-x{background:#E8E6DC;color:#141516;box-shadow:none}.rs-x:hover{background:#fff}
.rs-main{flex:none;grid-template-columns:minmax(0,1fr) 280px;gap:12px}
.rs-eng{overflow:visible;gap:12px}
.rs-sec{background:#1C1E20;border-radius:0;box-shadow:inset 0 0 0 1px #2E3032;padding:12px 14px 14px}
.rs-sec h5{font:500 9.5px var(--f-mono);letter-spacing:.08em;text-transform:lowercase;color:rgba(232,230,220,.45);margin-bottom:10px}
.rs-sec h5::before{display:none}
.rk{border-radius:0}.rk:hover{background:rgba(255,255,255,.025)}
.rk .tr{stroke:rgba(232,230,220,.09);stroke-width:3}.rk .vl{stroke:#E8E6DC;stroke-width:3}.rk .cap{fill:#141517;stroke:#2E3032}
.rk b{font:500 12px/1.1 var(--f-mono);letter-spacing:.02em;color:#E8E6DC}.rk b sup{font-size:7.5px}
.rk small{font-size:9px;letter-spacing:.04em;color:rgba(232,230,220,.45)}
.rk.drop{background:rgba(255,255,255,.06)}
.rs-ch .opts button{border-radius:0;background:#141517;box-shadow:inset 0 0 0 1px #2E3032}.rs-ch .opts button.on{background:#E8E6DC;color:#141516;box-shadow:none}
.rs-side{overflow:visible}
.rs-mat{background:#1C1E20;border-radius:0;box-shadow:inset 0 0 0 1px #2E3032;padding:12px 14px;gap:8px}
.rs-mat h5{font:500 9.5px var(--f-mono);letter-spacing:.08em;text-transform:lowercase;color:rgba(232,230,220,.45)}
.rs-mr{border-radius:0;background:#141517;box-shadow:inset 0 0 0 1px #2A2B2D}.rs-mr .src{border-radius:0}.rs-amt{border-radius:0;background:#0F1011}.rs-amt i{border-radius:0}
.rs-add{border-radius:0;box-shadow:inset 0 0 0 1px #2E3032;background:#141517}
.rs-help{font-size:9.5px;line-height:1.6;color:rgba(232,230,220,.42)}
.rs-mod{flex:none;max-height:none;min-height:0;grid-template-columns:repeat(auto-fill,minmax(176px,1fr));gap:12px}
.rs-src{background:#1C1E20;border-radius:0;box-shadow:inset 0 0 0 1px #2E3032;padding:12px;gap:8px}
.rs-src.armed{box-shadow:inset 0 0 0 1.5px var(--c)}
.rs-sh b{font:500 9.5px var(--f-mono);letter-spacing:.08em;text-transform:lowercase;color:#E8E6DC}
.rs-sh small{font-size:9px;color:rgba(232,230,220,.4)}
.rs-grab{width:22px;height:22px;background:radial-gradient(circle,var(--c) 0 4px,transparent 4.5px);box-shadow:inset 0 0 0 1px #3A3C3F}
.rs-src canvas,.rs-steps{flex:none;height:96px;min-height:0;max-height:none;border-radius:0;background:#0F1011;box-shadow:inset 0 0 0 1px #2A2B2D}
.rs-steps i{border-radius:0}
.rs-shp{gap:0;box-shadow:inset 0 0 0 1px #2E3032}.rs-shp button{border-radius:0;height:26px;min-width:0;background:transparent}.rs-shp button.on{background:#E8E6DC;color:#141516}
.rs-ctl{gap:0;font-size:10px}.rs-ctl>span{min-width:34px;font-size:9px;letter-spacing:.04em}
.rs-ctl button.st{flex:none;width:26px;height:26px;border-radius:0;box-shadow:inset 0 0 0 1px #2E3032;font-size:12px!important}
.rs-ctl b{flex:1;min-width:0;height:26px;line-height:26px;font:500 11px/26px var(--f-mono);box-shadow:inset 0 1px 0 #2E3032,inset 0 -1px 0 #2E3032}
.rs-ctl .tg{flex:none;margin-left:6px;height:26px;border-radius:0;padding:0 9px;box-shadow:inset 0 0 0 1px #2E3032}.rs-ctl .tg.on{background:#E8E6DC;color:#141516}
.rs-mini .rk{width:auto;flex:1}
.rs-note{font-size:9.5px;color:rgba(232,230,220,.42);margin:0}
.rs-eng>.card{border-radius:0!important}
@media (max-width:900px){.rs-main{grid-template-columns:1fr}}
.rs .rs-pb{background:#1C1E20}.rs .rs-pb:hover{background:#232528}.rs .rs-x{background:#E8E6DC;color:#141516}.rs .rs-x:hover{background:#fff}
.rs .rs-eng-sel button.on,.rs .rs-trk button.on,.rs .rs-shp button.on,.rs .rs-ch .opts button.on{background:#E8E6DC;color:#141516}
.rs-ctl b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 4px}.rs-ctl>span{white-space:nowrap}
.rs-mini .rk small{font-size:8px;letter-spacing:0}
.rs-src .rs-ctl>span{display:none}
.rs-msx{flex:1 1 100%;display:grid;grid-template-columns:minmax(0,1fr);gap:8px}
.rs .rs-msx-pick{display:flex;align-items:center;justify-content:space-between;gap:10px;height:40px;padding:0 14px;background:#141517;box-shadow:inset 0 0 0 1px #2E3032;font:500 13px var(--f-mono);color:#E8E6DC;text-align:left}
.rs .rs-msx-pick span{font-size:10px;color:rgba(232,230,220,.45)}.rs .rs-msx-pick:hover{background:#1A1B1D}
.rs-msx canvas{width:100%;height:92px;display:block;background:#0F1011;box-shadow:inset 0 0 0 1px #2A2B2D}
.rs-msx small{font-size:9.5px;color:rgba(232,230,220,.45)}
/* (v253) tidier: the sections fill each row, the knobs in a section spread evenly in a grid (choice buttons take a row of
   their own), the mod sources fill the row below */
.rs-eng>.rs-sec{flex:1 1 300px;min-width:0}
.rs-sec .rs-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:10px 4px;align-items:start}
.rs-sec .rs-row>.rk{justify-self:center}
.rs-sec .rs-row>.rs-ch{grid-column:1/-1;min-width:0}
.rs-sec .rs-row>:not(.rk):not(.rs-ch){grid-column:1/-1}
.rs-mod{grid-template-columns:repeat(auto-fit,minmax(176px,1fr))!important}
.rs-src{min-width:0}
.rs-src .rs-note{font-size:9px;line-height:1.5}
@media (max-width:560px){.rs-sec .rs-row{grid-template-columns:repeat(auto-fill,minmax(64px,1fr))}}
`;document.head.appendChild(css);

  /* --- the button in the synth card --- */
  const capr=document.querySelector('[data-card="synth"] .capr');
  const ob=document.createElement('button');ob.className='rs-open';ob.id='rsOpen';ob.title='Öppna hela synthen: alla rattar och modulation';
  ob.innerHTML='<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M7 1.5h3.5V5M5 10.5H1.5V7M10.5 1.5 6.8 5.2M1.5 10.5l3.7-3.7"/></svg>synth';
  if(capr)capr.prepend(ob);

  /* --- the overlay --- */
  const R=document.createElement('div');R.id='rs';R.className='rs';R.hidden=true;
  R.innerHTML=`<header class="rs-top"><span class="rs-logo">BLONDA</span><div><div class="rs-name"></div><div class="rs-tag"></div></div>
      <div class="rs-eng-sel"></div><div class="rs-trk"></div><span class="rs-sp"></span>
      <button class="rs-pb" data-a="pre"><small>FÖRVAL</small><b class="rs-pn">–</b></button><button class="rs-pb" data-a="save">spara ljud</button>
      <button class="rs-pb" data-a="mpre"><small>MOD</small><b class="rs-mn">egen</b></button><button class="rs-pb" data-a="prev" title="Spela en ton">▶ ton</button><button class="rs-x" data-a="close">stäng ×</button></header>
    <div class="rs-main"><div class="rs-eng"></div><aside class="rs-side"><div class="rs-mat"></div></aside></div>
    <div class="rs-dock"><button class="rs-dk" title="Show the modulation small or open – it stays at the bottom while you scroll"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7.5 6 4.5l3 3"/></svg><span>open</span></button><div class="rs-mod"></div></div>`;
  document.body.appendChild(R);
  {const dk=R.querySelector('.rs-dock'),b=R.querySelector('.rs-dk');let big=false;try{big=localStorage.getItem('rsDockBig')==='1'}catch(_){globalThis.__el&&globalThis.__el(_)}
   const pd=()=>{dk.classList.toggle('rs-sm',!big);b.querySelector('span').textContent=big?'small':'open';b.classList.toggle('up',big)};pd();
   b.onclick=()=>{big=!big;try{localStorage.setItem('rsDockBig',big?'1':'0')}catch(_){globalThis.__el&&globalThis.__el(_)}pd()}}
  document.addEventListener('mouseover',ev=>{const b=ev.target.closest&&ev.target.closest('.cl-trk button,.br-trk button');if(!b)return;const c=b.closest('[data-clone]'),k=c?c.dataset.clone:'bris',nm=(ENG[k]||{}).name||k,j=+b.dataset.i,t=TRACKS[j];if(!t)return;
    b.title=S.inst[t.id]===k?nm+' plays on '+t.name.toLowerCase()+' – click to give the track its own sound back':'Play '+nm+' on the '+t.name.toLowerCase()+' track'},true);
  const engBox=R.querySelector('.rs-eng'),mat=R.querySelector('.rs-mat'),modBox=R.querySelector('.rs-mod'),selBox=R.querySelector('.rs-eng-sel'),trkBox=R.querySelector('.rs-trk');
  let docked=null,dockMark=null;
  const undock=()=>{if(docked&&dockMark&&dockMark.parentNode)dockMark.replaceWith(docked);docked=null;dockMark=null};
  /* (v272) all eight synth tracks, and the one chosen last (synT) – also when it was chosen in a front panel */
  const SYT=()=>TRACKS.map((t,i)=>i).filter(i=>TRACKS[i].mel&&S.inst[TRACKS[i].id]!=null);
  const cur=()=>{const Y=SYT(),i=Y.includes(synT)?synT:Y.includes(S.sel)?S.sel:6;RS.id=TRACKS[i].id;RS.e=S.inst[RS.id]||'analog';return RS.e};
  const prevNote=()=>{try{initAudio();ctx.resume();const i=TRACKS.findIndex(t=>t.id===RS.id);trigger(i,ctx.currentTime+.02,.9,i===6?45:57,4)}catch(e){globalThis.__el&&globalThis.__el(e)}};

  /* --- knob --- */
  const A0=-135,A1=135,arcP=(r,a0,a1)=>{const p=a=>[Math.sin(a*Math.PI/180)*r,-Math.cos(a*Math.PI/180)*r];if(Math.abs(a1-a0)<.5)a1=a0+.5;const [x0,y0]=p(Math.min(a0,a1)),[x1,y1]=p(Math.max(a0,a1));return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${Math.abs(a1-a0)>180?1:0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`};
  function knob(e,q,opt={}){const el=document.createElement('div');el.className='rk';el.dataset.mk=q.k;const mx=q.max||1;
    el.innerHTML=`<svg viewBox="-34 -34 68 68"><path class="tr" d="${arcP(26,A0,A1)}"/><g class="mds"></g><path class="vl"/><circle class="cap" r="17"/><line class="ptr" x1="0" y1="-7" x2="0" y2="-15"/><circle class="live" r="2.6" style="display:none"/></svg><span class="badge"></span><b></b><small>${q.l}</small>`;
    const vl=el.querySelector('.vl'),ptr=el.querySelector('.ptr'),mds=el.querySelector('.mds'),lab=el.querySelector('b'),live=el.querySelector('.live'),badge=el.querySelector('.badge');
    const ang=v=>A0+(Math.max(0,Math.min(mx,v))/mx)*(A1-A0);
    el.paint=()=>{const v=opt.get?opt.get():rsGet(e,q.k);if(typeof v!=='number')return;const a=ang(v);vl.setAttribute('d',arcP(26,A0,a));ptr.setAttribute('transform',`rotate(${a})`);
      const [n,u]=q.f?q.f(v):[String(Math.round(v/mx*100)),'%'];lab.innerHTML=`${n}<sup>${u||''}</sup>`;
      if(opt.noMod)return;const rows=modOf(e).rows.filter(r=>r.dst===q.k&&r.amt);mds.innerHTML=rows.map((r,i)=>{const rr=30+i*3.2,a2=ang(v+r.amt*mx);return `<path class="md" d="${arcP(rr,a,a2)}" stroke="${MOD_SC[r.src]}"/>`}).join('');
      badge.innerHTML=rows.map(r=>`<i style="background:${MOD_SC[r.src]}"></i>`).join('');el._rows=rows};
    el.live=()=>{if(!el._rows||!el._rows.length||!ctx){live.style.display='none';return}const M=modOf(e),T=ctx.currentTime,n={t0:RS.lastT||T,len:.5,vel:.8,rnd:RS.lastR||0};let s=0;el._rows.forEach(r=>s+=r.amt*modSrc(M,r.src,T,n));
      const v=(opt.get?opt.get():rsGet(e,q.k))+s*mx,a=ang(v)*Math.PI/180;live.style.display='';live.setAttribute('cx',(Math.sin(a)*26).toFixed(2));live.setAttribute('cy',(-Math.cos(a)*26).toFixed(2))};
    let y0=0,v0=0,lt=0,mode=null,row=null;
    el.addEventListener('pointerdown',ev=>{ev.preventDefault();el.setPointerCapture(ev.pointerId);y0=ev.clientY;const n=performance.now();
      if(RS.arm&&!opt.noMod){mode='amt';const M=modOf(e);row=M.rows.find(r=>r.src===RS.arm&&r.dst===q.k);if(!row){row={src:RS.arm,dst:q.k,amt:0};M.rows.push(row)}v0=row.amt;paintMat()}
      else{mode='val';v0=opt.get?opt.get():rsGet(e,q.k);if(n-lt<300){const d=opt.def?opt.def():rsDef(e,q.k);if(d!=null){opt.set?opt.set(d):rsSet(e,q.k,d);el.paint()}}}lt=n});
    el.addEventListener('pointermove',ev=>{if(!el.hasPointerCapture(ev.pointerId))return;const dy=(y0-ev.clientY)/(ev.shiftKey?700:200);
      if(mode==='amt'&&row){row.amt=Math.round(Math.max(-1,Math.min(1,v0+dy))*100)/100;el.paint();paintMat(true);clearTimeout(rsSet._t);rsSet._t=setTimeout(save,300)}
      else if(mode==='val'){let v=Math.max(0,Math.min(mx,v0+dy*mx));if(q.step)v=Math.round(v/q.step)*q.step;opt.set?opt.set(v):rsSet(e,q.k,v);el.paint()}});
    const up=()=>{if(mode==='amt'&&row&&!row.amt){const M=modOf(e);M.rows=M.rows.filter(r=>r!==row);paintMat();el.paint()}if(mode==='val'&&!playing)prevNote();mode=null;row=null};
    el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.paint();return el}
  function choice(e,k,l,ch){const el=document.createElement('div');el.className='rs-ch';el.innerHTML=`<small>${l}</small><div class="opts">${ch.map(([v,lb])=>`<button data-v="${v}">${lb}</button>`).join('')}</div>`;
    const paint=()=>el.querySelectorAll('button').forEach(b=>b.classList.toggle('on',String(rsGet(e,k))===b.dataset.v));
    el.querySelectorAll('button').forEach(b=>b.onclick=()=>{const raw=b.dataset.v,v=isNaN(+raw)?raw:+raw;if(e==='grime'&&k==='pre'){grimeLoadPre(v);build();return}rsSet(e,k,v);paint();if(!playing)prevNote()});el.paint=paint;paint();return el}

  /* --- engine area --- */
  function buildEng(e){undock();engBox.innerHTML='';{const o=rsObj(e),d=e==='analog'?(DEFS.synth[RS.id]||DEFS.synth.bass):DEFS.eng[e];if(o&&d)for(const k in d)if(o[k]==null)o[k]=JSON.parse(JSON.stringify(d[k]))}
    if(RS_CLONE[e]){const c=document.querySelector('.card[data-clone="'+e+'"]');if(c){dockMark=document.createComment('rs');c.before(dockMark);engBox.appendChild(c);docked=c;c.classList.remove('cl-off')}}
    else{const D=ENG[e]||{};(RS_SEC[e]||[['ljud',rsParams(e).map(q=>q.k)]]).forEach(([t,keys])=>{const s=document.createElement('section');s.className='rs-sec';s.innerHTML=`<h5>${t}</h5><div class="rs-row"></div>`;const row=s.querySelector('.rs-row');
      keys.forEach(k=>{if(k[0]==='@'){const kk=k.slice(1),o=e==='analog'&&kk==='wave'?{ch:RS_WAVE}:(D.opts||[]).find(o=>o.k===kk);if(o)row.appendChild(choice(e,kk,{wave:'våg',slide:'slide',duty:'puls',oct:'oktav',arpm:'arpeggio',shape:'wob-form',pre:'förval'}[kk]||kk,o.ch))}
        else{const q=rsQ(e,k);if(q&&typeof rsGet(e,k)==='number')row.appendChild(knob(e,q))}});engBox.appendChild(s)})}
    /* (v272) Starter: which of the Starter's sounds the track plays */
    if(e==='enkel'&&window.ENK){const s=document.createElement('section'),c=ENK.get(RS.id),mk=(v,l)=>`<button data-ek="${v}" class="${v===c?'on':''}">${l}</button>`;s.className='rs-sec rs-ek';
      s.innerHTML=`<h5>sound</h5><div class="rs-ch"><small>poly</small><div class="opts">${ENK.poly().map(v=>mk(v,v)).join('')}</div></div><div class="rs-ch"><small>sub</small><div class="opts">${ENK.subs().map(v=>mk(v,v.replace(/^s:/,''))).join('')}</div></div>`;
      s.querySelectorAll('[data-ek]').forEach(b=>b.onclick=()=>{pushHist();ENK.set(RS.id,b.dataset.ek);try{refreshInst()}catch(_){globalThis.__el&&globalThis.__el(_)}save();build();prevNote()});engBox.prepend(s)}
    /* (v250) Sample+: the sound itself – its sample drawn, and the picker */
    if(e==='msx'&&window.TEX){const I=TEX.instruments.get((S.ms||{})[RS.id]),L=TEX.list(),s=document.createElement('section');s.className='rs-sec rs-msx';
      s.innerHTML=`<h5>sound${I?`<button class="rs-msx-al" title="Find a loop in every note (BLONDA SAMPLER's loop finder)">auto loop</button>`:''}<button class="rs-msx-imp" title="An instrument exported from BLONDA SAMPLER with SEQ.3 (.json)">import</button></h5><button class="rs-msx-pick">${I?String(I.meta.name).replace(/</g,'&lt;'):(L.length?'pick a sound':'no sounds yet – autosample one in the Sampler card')}<span>${L.length} ▾</span></button><canvas></canvas><small>${I?I.regions.length+' notes'+(I.meta.loop?' · loop':'')+(I.meta.dev?' · '+String(I.meta.dev).replace(/</g,'&lt;'):''):''}</small>`;
      engBox.prepend(s);s.querySelector('.rs-msx-imp').onclick=()=>TEX.pickImport&&TEX.pickImport();{const al=s.querySelector('.rs-msx-al');if(al)al.onclick=async()=>{al.textContent='…';const k=TEX.autoLoopIns?await TEX.autoLoopIns(I.meta.id):null;if(k)toast(k.n+' of '+k.of+' notes got a loop'+(k.n<k.of?' · short notes keep none':''));build();prevNote()}}const b=s.querySelector('.rs-msx-pick');b.onclick=()=>{if(!L.length||!window.pickShow)return;pickShow(b,L.map(x=>x.meta.name),L.findIndex(x=>x===I),k=>{TEX.use(RS.id,L[k].meta.id);build();prevNote()},L.map(x=>x.meta.dev||'sample+'))};
      requestAnimationFrame(()=>{const cv=s.querySelector('canvas'),w=cv.clientWidth,h=cv.clientHeight;if(!w)return;const dpr=devicePixelRatio||1;cv.width=w*dpr;cv.height=h*dpr;const c=cv.getContext('2d');c.scale(dpr,dpr);TEX.draw(c,w,h,-1,'#E8E6DC','#F2C318',RS.id)})}
    /* (v272) voice: poly / mono / legato and glide, per track, on every engine */
    {const vs=document.createElement('section');vs.className='rs-sec rs-vm';vs.innerHTML=`<h5>voice · poly · mono · legato · glide</h5><div class="rs-row"><div class="rs-ch"><small>voice</small><div class="opts">${['poly','mono','legato'].map((l,i)=>`<button data-vm="${i}" title="${['all notes sound together','one note at a time – a new note cuts the last','one note at a time – glides only when the notes touch'][i]}">${l}</button>`).join('')}</div></div></div>`;
     const VM=()=>{if(!S.vm)S.vm={};return S.vm[RS.id]||(S.vm[RS.id]={m:0,gl:0})},pv=()=>vs.querySelectorAll('[data-vm]').forEach(b=>b.classList.toggle('on',+b.dataset.vm===(VM().m|0)));
     vs.querySelectorAll('[data-vm]').forEach(b=>b.onclick=()=>{VM().m=+b.dataset.vm;pv();save();if(!playing)prevNote()});pv();
     vs.querySelector('.rs-row').appendChild(knob(e,{k:'vm.gl',l:'glide',f:v=>v<.005?['off','']:[String(Math.round((.006+v*v*1.4)*1000)),'ms']},{noMod:true,get:()=>+VM().gl||0,set:v=>{VM().gl=Math.round(v*1000)/1000;clearTimeout(vs._t);vs._t=setTimeout(save,300)},def:()=>0}));engBox.appendChild(vs)}
    /* efter: on every engine */
    const s=document.createElement('section');s.className='rs-sec rs-x-sec';s.innerHTML=`<h5>efter · filter · drive · pan · nivå</h5><div class="rs-row"></div>`;MOD_X.forEach(q=>s.querySelector('.rs-row').appendChild(knob(e,q)));engBox.appendChild(s)}

  /* --- modulation sources --- */
  const SH_IC=['∿','△','⟋','⟍','⊓','⁘','≈'];
  function stepper(label,val,cb,list){return `<div class="rs-ctl" data-plist='${JSON.stringify(list).replace(/'/g,"&#39;")}' data-pcur="${list.indexOf(val)}" data-cb="${cb}"><span>${label}</span><button class="st" data-d="-1">−</button><b>${val}</b><button class="st" data-d="1">+</button></div>`}
  function buildMod(e){const M=modOf(e);modBox.innerHTML=MOD_SRC.map(([k,l,c])=>{const n=M.rows.filter(r=>r.src===k).length;let body='';
      if(k==='l1'||k==='l2'){const L=M[k];body=`<canvas data-cv="${k}"></canvas><div class="rs-shp">${SH_IC.map((ic,i)=>`<button data-sh="${i}" class="${L.shape===i?'on':''}" title="${MOD_SH[i]}">${ic}</button>`).join('')}</div>
          ${stepper('takt',MOD_RATES[L.rate][1],k+'.rate',MOD_RATES.map(r=>r[1])).replace('</div>',`<button class="tg${L.retrig?' on':''}" data-rt="${k}">${L.retrig?'omstart':'fri'}</button></div>`)}`}
      else if(k==='env')body=`<canvas data-cv="env"></canvas><div class="rs-mini" data-env></div>`;
      else if(k==='stp')body=`<div class="rs-steps" data-steps>${M.stp.v.map(v=>`<i style="height:${Math.max(3,v*100)}%"></i>`).join('')}</div>${stepper('takt',MOD_RATES[M.stp.rate][1],'stp.rate',MOD_RATES.map(r=>r[1]))}<div class="rs-mini" data-sg></div>`;
      else if(k==='rnd')body=`<canvas data-cv="rnd"></canvas><p class="rs-note">Ett nytt värde för varje ton – gör att ingen ton låter exakt som den förra.</p>`;
      else body=`<canvas data-cv="vel"></canvas><p class="rs-note">Hur hårt tonen spelas (anslaget i mönstret eller på klaviaturen).</p>`;
      return `<div class="rs-src${RS.arm===k?' armed':''}" data-src="${k}" style="--c:${c}"><div class="rs-sh"><span class="rs-grab" data-grab="${k}" title="Dra till en ratt – eller tryck och dra sedan i en ratt"></span><b>${l}</b>${n?`<small>${n} link${n>1?'s':''}</small>`:`<span class="rs-hint" data-grab="${k}" title="Drag the dot to a knob"><i></i>drag</span>`}</div>${body}</div>`}).join('');
    const envBox=modBox.querySelector('[data-env]');[['a','attack',v=>msX(.002+v*v*3)],['d','decay',v=>msX(.01+v*v*3)],['s','sustain',pcF],['r','release',v=>msX(.01+v*v*4)]].forEach(([kk,l,f])=>envBox.appendChild(knob(e,{k:'env.'+kk,l,f},{noMod:1,get:()=>modOf(e).env[kk],set:v=>{modOf(e).env[kk]=v;save()},def:()=>({a:.1,d:.4,s:.5,r:.3})[kk]})));
    const sg=modBox.querySelector('[data-sg]');sg.appendChild(knob(e,{k:'stp.g',l:'glid',f:pcF},{noMod:1,get:()=>modOf(e).stp.glide,set:v=>{modOf(e).stp.glide=Math.max(.001,v);save()},def:()=>.2}));
    modBox.querySelectorAll('[data-sh]').forEach(b=>b.onclick=()=>{const k=b.closest('[data-src]').dataset.src;modOf(e)[k].shape=+b.dataset.sh;save();buildMod(e)});
    modBox.querySelectorAll('[data-rt]').forEach(b=>b.onclick=()=>{const L=modOf(e)[b.dataset.rt];L.retrig=L.retrig?0:1;save();buildMod(e)});
    modBox.querySelectorAll('.rs-ctl[data-cb]').forEach(w=>{const [k,p]=w.dataset.cb.split('.');const set=i=>{modOf(e)[k][p]=Math.max(0,Math.min(MOD_RATES.length-1,i));save();buildMod(e)};
      w.querySelectorAll('.st').forEach(b=>b.onclick=()=>set(modOf(e)[k][p]+(+b.dataset.d)));w.addEventListener('pick',ev=>set(ev.detail))});
    const st=modBox.querySelector('[data-steps]');const setStep=ev=>{const r=st.getBoundingClientRect(),i=Math.max(0,Math.min(15,Math.floor((ev.clientX-r.left)/r.width*16))),v=Math.max(0,Math.min(1,1-(ev.clientY-r.top-4)/(r.height-8)));modOf(e).stp.v[i]=Math.round(v*100)/100;st.children[i].style.height=Math.max(3,v*100)+'%'};
    st.addEventListener('pointerdown',ev=>{ev.preventDefault();st.setPointerCapture(ev.pointerId);setStep(ev)});st.addEventListener('pointermove',ev=>{if(st.hasPointerCapture(ev.pointerId))setStep(ev)});st.addEventListener('pointerup',()=>save());
    /* arm / drag a source */
    modBox.querySelectorAll('[data-grab]').forEach(g=>{const k=g.dataset.grab;g.addEventListener('pointerdown',ev=>{ev.preventDefault();g.setPointerCapture(ev.pointerId);RS.drag={k,x:ev.clientX,y:ev.clientY,moved:false,ghost:null,hot:null}});
      g.addEventListener('pointermove',ev=>{const D=RS.drag;if(!D||!g.hasPointerCapture(ev.pointerId))return;if(!D.moved&&Math.hypot(ev.clientX-D.x,ev.clientY-D.y)>6){D.moved=true;D.ghost=document.createElement('div');D.ghost.className='rs-ghost';D.ghost.style.background=MOD_SC[k];D.ghost.style.color=MOD_SC[k];document.body.appendChild(D.ghost)}
        if(D.moved){D.ghost.style.left=ev.clientX+'px';D.ghost.style.top=ev.clientY+'px';const t=document.elementFromPoint(ev.clientX,ev.clientY),h=t&&t.closest('#rs [data-mk],#rs .rs-eng [data-k]');if(D.hot&&D.hot!==h){D.hot.classList.remove('drop')}if(h&&!(h.dataset.mk||'').includes('.')||h&&(h.dataset.mk||'').startsWith('x.')){h.classList.add('drop');h.style.setProperty('--dc',MOD_SC[k]);D.hot=h}else D.hot=null}});
      const end=ev=>{const D=RS.drag;RS.drag=null;if(!D)return;if(D.ghost)D.ghost.remove();if(D.hot)D.hot.classList.remove('drop');
        if(!D.moved){RS.arm=RS.arm===k?null:k;paintArm();return}
        if(D.hot){const dst=D.hot.dataset.mk||D.hot.dataset.k,M=modOf(e);if(!rsTargets(e).includes(dst)){toast('Den ratten kan inte moduleras');return}if(!M.rows.some(r=>r.src===k&&r.dst===dst)){M.rows.push({src:k,dst,amt:.3});save();toast(MOD_SRC.find(s=>s[0]===k)[1]+' → '+rsLabel(e,dst)+' · dra i ratten eller i listan för mängd')}paintAll()}};
      g.addEventListener('pointerup',end);g.addEventListener('pointercancel',end)})}
  const paintArm=()=>{R.classList.toggle('arming',!!RS.arm);R.style.setProperty('--armc',RS.arm?MOD_SC[RS.arm]:'transparent');modBox.querySelectorAll('[data-src]').forEach(s=>s.classList.toggle('armed',s.dataset.src===RS.arm));
    if(RS.arm)toast(MOD_SRC.find(s=>s[0]===RS.arm)[1]+' vald · dra i en ratt för att länka · tryck igen för att sluta')};

  /* --- matrix --- */
  function paintMat(light){const e=RS.e,M=modOf(e);
    if(light){mat.querySelectorAll('.rs-mr').forEach((w,i)=>{const r=M.rows[i];if(!r)return;const a=w.querySelector('.rs-amt i'),x=Math.abs(r.amt)*50;a.style.left=(r.amt<0?50-x:50)+'%';a.style.width=x+'%';w.querySelector('.rs-amt em').textContent=(r.amt>0?'+':'')+Math.round(r.amt*100)+'%'});return}
    const T=rsTargets(e);
    mat.innerHTML=`<h5><span>länkar · ${M.rows.length}</span><button class="rs-add" data-add>+ länk</button></h5>`+(M.rows.length?M.rows.map((r,i)=>{const c=MOD_SC[r.src]||'#fff',x=Math.abs(r.amt)*50;
      return `<div class="rs-mr" data-i="${i}" style="--c:${c}"><span data-plist='${JSON.stringify(MOD_SRC.map(s=>s[1]))}' data-pcur="${MOD_SRC.findIndex(s=>s[0]===r.src)}" data-pf="src"><button class="src">${(MOD_SRC.find(s=>s[0]===r.src)||[0,'?'])[1]} ▾</button></span>
        <span data-plist='${JSON.stringify(T.map(k=>rsLabel(e,k))).replace(/'/g,"&#39;")}' data-pcur="${T.indexOf(r.dst)}" data-pf="dst"><button class="dst">→ ${rsLabel(e,r.dst)} ▾</button></span><button class="del" data-del="${i}" aria-label="Ta bort">×</button>
        <div class="rs-amt" data-amt="${i}"><i style="left:${r.amt<0?50-x:50}%;width:${x}%"></i><em>${r.amt>0?'+':''}${Math.round(r.amt*100)}%</em></div></div>`}).join(''):'')
      +`<p class="rs-help"><b style="color:#EDEBE3">How to link:</b> drag the round dot of a source (lfo, env, step …) to a knob. Or press the dot and then drag any knob – that sets how much. The ring around the knob shows the depth, the white dot where it is right now.${RS_CLONE[RS.e]?' On the Moog, 101 and Bris panels the sound changes from note to note; the after part moves all the time.':RS.e==='grime'?' In grime, cutoff, wob, growl, formant, vowel, drive, fold, sub, level and pitch move inside every note.':' The engine\'s knobs change from note to note; the after part moves all the time.'}</p>`;
    mat.querySelector('[data-add]').onclick=()=>{const free=MOD_SRC.find(s=>!M.rows.some(r=>r.src===s[0]))||MOD_SRC[0];M.rows.push({src:free[0],dst:'x.cut',amt:.25});save();paintAll()};
    mat.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{M.rows.splice(+b.dataset.del,1);save();paintAll()});
    mat.querySelectorAll('[data-pf]').forEach(w=>w.addEventListener('pick',ev=>{const i=+w.closest('[data-i]').dataset.i,r=M.rows[i];if(w.dataset.pf==='src')r.src=MOD_SRC[ev.detail][0];else r.dst=T[ev.detail];save();paintAll()}));
    mat.querySelectorAll('.rs-pick-btn,[data-pf] button').forEach(b=>b.onclick=ev=>{ev.stopPropagation();if(window.pickOpen)pickOpen(b.parentNode,b)});
    mat.querySelectorAll('[data-amt]').forEach(a=>{const set=ev=>{const r=a.getBoundingClientRect(),v=Math.max(-1,Math.min(1,((ev.clientX-r.left)/r.width-.5)*2));M.rows[+a.dataset.amt].amt=Math.round(v*100)/100;paintMat(true);engBox.querySelectorAll('.rk').forEach(k=>k.paint())};
      a.addEventListener('pointerdown',ev=>{ev.preventDefault();a.setPointerCapture(ev.pointerId);set(ev)});a.addEventListener('pointermove',ev=>{if(a.hasPointerCapture(ev.pointerId))set(ev)});a.addEventListener('pointerup',()=>save());
      a.addEventListener('dblclick',()=>{M.rows[+a.dataset.amt].amt=0;paintMat(true)})})}
  function paintAll(){header(RS.e);engBox.querySelectorAll('.rk').forEach(k=>k.paint&&k.paint());paintMat();buildMod(RS.e);paintClone()}
  /* knobs on the docked front panels: a coloured outline shows they are modulated */
  const paintClone=()=>{if(!docked)return;const M=modOf(RS.e);docked.querySelectorAll('[data-k]').forEach(el=>{const rows=M.rows.filter(r=>r.dst===el.dataset.k&&r.amt);el.style.boxShadow=rows.length?`0 0 0 1.5px ${MOD_SC[rows[0].src]}`:'';el.style.borderRadius=rows.length?'10px':''})};

  /* --- header --- */
  function header(e){const D=ENG[e]||{};R.querySelector('.rs-name').textContent=e==='analog'?'Analog':D.name||e;R.querySelector('.rs-tag').textContent=D.tag||'';R.style.setProperty('--ac',D.dot||'#B8F23A');
    selBox.innerHTML=ENG_ORDER.concat(ENG.enkel?['enkel']:[]).map(k=>`<button data-e="${k}" class="${k===e?'on':''}"><i style="--d:${ENG[k].dot}"></i>${ENG[k].name}</button>`).join('');
    trkBox.innerHTML=SYT().map(j=>{const id=TRACKS[j].id,en=S.inst[id]||'analog',E=ENG[en]||{};return `<button data-j="${j}" class="${id===RS.id?'on':''}" title="track ${TRACKS[j].name.toLowerCase()} · plays ${E.name||en}"><i style="--d:${E.dot||'#888'}"></i>${TRACKS[j].name.toLowerCase()}</button>`}).join('');
    const st=e==='msx'&&window.TEX?((TEX.instruments.get((S.ms||{})[RS.id])||{meta:{name:'–'}}).meta.name):(S.rsPre||{})[e];R.querySelector('.rs-pn').textContent=e==='grime'?(GR_PRE[engE('grime').pre]||['–'])[0]:st||'–';R.querySelector('.rs-mn').textContent=modOf(e).rows.length?modOf(e).rows.length+' länkar':'ingen'}
  selBox.onclick=ev=>{const b=ev.target.closest('[data-e]');if(!b)return;pushHist();S.inst[RS.id]=b.dataset.e;try{refreshInst()}catch(_){globalThis.__el&&globalThis.__el(_)}save();build();prevNote()};
  trkBox.onclick=ev=>{const b=ev.target.closest('[data-j]');if(!b)return;try{select(+b.dataset.j)}catch(_){globalThis.__el&&globalThis.__el(_)}build()};
  /* (v272) the "on track" row in a front panel changes which track plays the engine: follow it */
  engBox.addEventListener('click',ev=>{if(ev.target.closest('.cl-trk button,.br-trk button'))setTimeout(()=>{try{build()}catch(_){globalThis.__el&&globalThis.__el(_)}},0)});
  /* (v251) factory sounds for Acid and Analog (they only had "init" and your own) */
  const ACID_PRE=[
    ['Classic 303','bass',{cut:.32,res:.72,env:.6,dec:.3,acc:.6,drive:.35,dtone:.5,st:.2,wave:'sawtooth',slide:0}],
    ['Squelch','bass',{cut:.22,res:.9,env:.8,dec:.25,acc:.8,drive:.45,dtone:.55,st:.2,wave:'sawtooth',slide:0}],
    ['Rubber bass','bass',{cut:.18,res:.55,env:.35,dec:.45,acc:.4,drive:.2,dtone:.35,st:.25,wave:'sawtooth',slide:0}],
    ['Deep acid','bass',{cut:.12,res:.45,env:.3,dec:.6,acc:.3,drive:.12,dtone:.3,st:.3,wave:'sawtooth',slide:0}],
    ['Square acid','bass',{cut:.3,res:.75,env:.55,dec:.3,acc:.6,drive:.3,dtone:.5,st:.2,wave:'square',slide:0}],
    ['Hardfloor','lead',{cut:.26,res:.85,env:.75,dec:.35,acc:.7,drive:.65,dtone:.6,st:.22,wave:'sawtooth',slide:0}],
    ['Screamer','lead',{cut:.4,res:.95,env:.9,dec:.2,acc:.9,drive:.8,dtone:.7,st:.18,wave:'sawtooth',slide:0}],
    ['Slide line','lead',{cut:.28,res:.8,env:.65,dec:.32,acc:.6,drive:.35,dtone:.5,st:.38,wave:'sawtooth',slide:1}],
    ['Pluck acid','pluck',{cut:.35,res:.6,env:.7,dec:.12,acc:.5,drive:.3,dtone:.45,st:.15,wave:'sawtooth',slide:0}],
    ['Square slide','pluck',{cut:.24,res:.7,env:.6,dec:.18,acc:.55,drive:.4,dtone:.5,st:.32,wave:'square',slide:1}]];
  const ANA_PRE=[
    ['Saw bass','bass',{wave:'sawtooth',a:.004,d:.22,s:.35,r:.12,cut:.42,res:.35,env:.55}],
    ['Square bass','bass',{wave:'square',a:.003,d:.3,s:.5,r:.1,cut:.35,res:.25,env:.45}],
    ['Sine sub','bass',{wave:'sine',a:.005,d:.4,s:.8,r:.15,cut:.5,res:0,env:0}],
    ['Pluck','keys',{wave:'sawtooth',a:.002,d:.18,s:0,r:.15,cut:.5,res:.45,env:.7}],
    ['Soft keys','keys',{wave:'triangle',a:.01,d:.8,s:.3,r:.4,cut:.55,res:.1,env:.3}],
    ['Brass','keys',{wave:'sawtooth',a:.06,d:.4,s:.7,r:.25,cut:.38,res:.2,env:.6}],
    ['Square lead','lead',{wave:'square',a:.01,d:.3,s:.8,r:.2,cut:.6,res:.3,env:.3}],
    ['Saw lead','lead',{wave:'sawtooth',a:.008,d:.25,s:.75,r:.25,cut:.65,res:.4,env:.35}],
    ['Warm pad','pad',{wave:'sawtooth',a:.6,d:1,s:.75,r:1.4,cut:.45,res:.1,env:.2}],
    ['Glass pad','pad',{wave:'triangle',a:.8,d:1.2,s:.7,r:2,cut:.6,res:.25,env:.15}]];
  function presetList(e){const L=[];if(e==='grime')GR_PRE.forEach((p,i)=>L.push({l:p[0],g:'grime',f:()=>{grimeLoadPre(i);try{refreshInst()}catch(_){globalThis.__el&&globalThis.__el(_)}}}));
    if(e==='mini'&&window.__mini)__mini.pre.forEach(p=>L.push({l:p[0],g:'moog',f:()=>__mini.load(p)}));if(e==='sh101'&&window.__sh101&&__sh101.pre)__sh101.pre.forEach(p=>L.push({l:p[0],g:'sh-101',f:()=>__sh101.load(p)}));
    if(e==='bris'&&typeof BR_PRE!=='undefined')BR_PRE.forEach(p=>L.push({l:p[1],g:'bris · '+p[0].toLowerCase(),f:()=>{if(window.__bris&&__bris.load)__bris.load(p);else{Object.assign(engE('bris'),BR_DEF,p[2]);try{brisApplyAll()}catch(_){globalThis.__el&&globalThis.__el(_)}}}}));
    if(e==='acid')ACID_PRE.forEach(p=>L.push({l:p[0],g:'acid · '+p[1],f:()=>{Object.assign(engE('acid'),JSON.parse(JSON.stringify(DEFS.eng.acid)),p[2])}}));
    if(e==='analog')ANA_PRE.forEach(p=>L.push({l:p[0],g:'analog · '+p[1],f:()=>{const o=S.synth[RS.id];if(o)Object.assign(o,JSON.parse(JSON.stringify(DEFS.synth[RS.id]||DEFS.synth.bass)),p[2])}}));
    if(e==='enkel'&&window.ENK_PRE){ENK_PRE.forEach(p=>L.push({l:p[0],g:'simple · '+p[1],f:()=>SIMPLE.quiet(()=>{const o=rsObj('enkel'),D=DEFS.eng.enkel;ENK_PT.forEach(k=>o[k]=D[k]);Object.assign(o,p[3]);if(!S.mods)S.mods={};S.mods.enkel=p[4]?JSON.parse(JSON.stringify(p[4])):null;modOf('enkel');try{SIMPLE.pick(RS.id,p[2]);refreshInst()}catch(_){globalThis.__el&&globalThis.__el(_)}})}));
      L.push({l:'starter decides',g:'simple',f:()=>{try{SIMPLE.free()}catch(_){globalThis.__el&&globalThis.__el(_)}}})}
    if(e==='msx'&&window.TEX&&TEX.list)TEX.list().forEach(I=>L.push({l:I.meta.name,g:I.meta.dev||'sample+',f:()=>TEX.use(RS.id,I.meta.id)}));
    /* (v269) sounds from BLONDA SYNTHS (every project) */((typeof synImp==='function'?synImp():{})[e]||[]).forEach(u=>{if(u&&u.p)L.push({l:u.n,g:'synths',f:()=>{const o=rsObj(e);if(o)Object.assign(o,JSON.parse(JSON.stringify(e==='analog'?(DEFS.synth[RS.id]||DEFS.synth.bass):DEFS.eng[e])),JSON.parse(JSON.stringify(u.p)));S.mods[e]=u.m?JSON.parse(JSON.stringify(u.m)):null;modOf(e);if(e==='bris'){try{brisApplyAll()}catch(_){globalThis.__el&&globalThis.__el(_)}}}})});
    ((S.userPre||{})[e]||[]).forEach(u=>L.push({l:u.n,g:'sparade',f:()=>{const o=rsObj(e);if(o)Object.assign(o,JSON.parse(JSON.stringify(u.p)));if(u.m)S.mods[e]=JSON.parse(JSON.stringify(u.m));modOf(e)}}));
    L.push({l:'init',g:'grund',f:()=>{const o=rsObj(e);if(o)Object.assign(o,JSON.parse(JSON.stringify(e==='analog'?DEFS.synth[RS.id]:DEFS.eng[e])));S.mods[e]=null;modOf(e)}});
    /* (v250) a preset is the whole sound: a factory preset starts with no modulation (the LFOs, envelope and steps of the
       sound before don't stay on); a saved sound brings its own; a Sample+ sound brings what it was last played with */
    L.forEach(x=>{if(x.g==='sparade'||x.g==='synths'||x.g==='grund'||e==='msx'||String(x.g).startsWith('simple'))return;const f=x.f;x.f=()=>{f();if(!S.mods||typeof S.mods!=='object')S.mods={};S.mods[e]=null;modOf(e)}});
    return L}
  /* (v245) the keyboard's sound picker and MIDI program change use the same list, for any synth track */
  window.__rsPresets=(e,id)=>presetList(e).map(x=>({l:x.l,g:x.g,f:()=>{const o=RS.id;RS.id=id||o;if(!S.mods)S.mods={};try{x.f()}finally{RS.id=o}}}));
  R.querySelector('.rs-top').addEventListener('click',ev=>{const b=ev.target.closest('[data-a]');if(!b)return;const a=b.dataset.a,e=RS.e;
    if(a==='close')close();else if(a==='prev')prevNote();
    else if(a==='pre'){const L=presetList(e);if(window.pickShow)pickShow(b,L.map(x=>x.l),-1,i=>{L[i].f();if(!S.rsPre)S.rsPre={};S.rsPre[e]=L[i].l;save();build();prevNote()},L.map(x=>x.g))}
    else if(a==='mpre'){if(window.pickShow)pickShow(b,MOD_PRE.map(p=>p[0]),-1,i=>{modApplyPre(e,i);build();toast('Modulation: '+MOD_PRE[i][0])})}
    else if(a==='save'){if(window.pickAsk)pickAsk(b,'Namn på ljudet',(ENG[e]?ENG[e].name:'ljud').toLowerCase()+' '+(((S.userPre||{})[e]||[]).length+1),n=>{if(!n)return;if(!S.userPre)S.userPre={};const L=S.userPre[e]=S.userPre[e]||[];
      const o=rsObj(e);L.push({n,p:JSON.parse(JSON.stringify(o||{})),m:JSON.parse(JSON.stringify(modOf(e)))});if(!S.rsPre)S.rsPre={};S.rsPre[e]=n;save();header(e);toast('Sparat: '+n)})}});

  /* --- open / close / live --- */
  function build(){const e=cur();header(e);buildEng(e);paintMat();buildMod(e);paintClone();RS.arm=null;paintArm()}
  function open(){if(RS.open)return;RS.open=true;R.hidden=false;document.body.classList.add('rs-on');build();requestAnimationFrame(()=>R.classList.add('show'))}
  function close(){if(!RS.open)return;RS.open=false;R.classList.remove('show');undock();document.body.classList.remove('rs-on');setTimeout(()=>{if(!RS.open)R.hidden=true},230);try{refreshInst();renderAll()}catch(_){globalThis.__el&&globalThis.__el(_)}if(window.stxPaint)stxPaint(true)}
  ob.onclick=ev=>{ev.stopPropagation();open()};window.rsOpen=open;window.rsClose=close;window.rsPaint=()=>{if(RS.open)paintAll()};
  addEventListener('keydown',ev=>{if(ev.key==='Escape'&&RS.open&&!document.querySelector('.pk-pop')){ev.preventDefault();close()}});
  /* remember the last note's start and random value, so the knobs' live dots match what you hear */
  {const _mv=melVoice;melVoice=function(id,t,v,p,out,note,len){if(RS.open&&id===RS.id){RS.lastT=t;RS.lastR=MODN&&MODN.n?MODN.n.rnd:0}return _mv.apply(this,arguments)}}
  const drawCv=()=>{if(!RS.open)return;const e=RS.e,M=modOf(e),T=ctx?ctx.currentTime:performance.now()/1000;
    modBox.querySelectorAll('canvas[data-cv]').forEach(cv=>{const k=cv.dataset.cv,w=cv.clientWidth,h=cv.clientHeight;if(!w)return;const dpr=devicePixelRatio||1;if(cv.width!==Math.round(w*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr)}
      const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);const col=MOD_SC[k];c.strokeStyle='rgba(255,255,255,.07)';c.beginPath();c.moveTo(0,h/2);c.lineTo(w,h/2);c.stroke();
      const n={t0:RS.lastT||T,len:.5,vel:.8,rnd:RS.lastR||0};
      if(k==='l1'||k==='l2'){const L=M[k],per=MOD_RATES[L.rate][0]/(S.bpm/15),span=per*2;c.strokeStyle=col;c.lineWidth=2;c.beginPath();
        for(let x=0;x<=w;x+=2){const tt=T-span+x/w*span,v=modSrc(M,k,tt,n);x?c.lineTo(x,h/2-v*h*.4):c.moveTo(x,h/2-v*h*.4)}c.stroke();const v=modSrc(M,k,T,n);c.fillStyle='#fff';c.beginPath();c.arc(w-3,h/2-v*h*.4,3.5,0,6.283);c.fill()}
      else if(k==='env'){const E=M.env,a=.002+E.a*E.a*3,d=.01+E.d*E.d*3,r=.01+E.r*E.r*4,g=Math.max(a+d,.6),tot=g+r*1.2;c.strokeStyle=col;c.lineWidth=2;c.beginPath();
        for(let x=0;x<=w;x+=2){const tt=x/w*tot,v=modSrc(M,'env',tt,{t0:0,len:g,vel:1,rnd:0});x?c.lineTo(x,h-4-v*(h-10)):c.moveTo(x,h-4-v*(h-10))}c.stroke();
        if(RS.lastT&&T-RS.lastT<tot){const x=(T-RS.lastT)/tot*w,v=modSrc(M,'env',T,n);c.fillStyle='#fff';c.beginPath();c.arc(x,h-4-v*(h-10),3.5,0,6.283);c.fill()}}
      else if(k==='rnd'){if(!RS.rh)RS.rh=[];if(RS.lastR!==RS.rh[RS.rh.length-1]){RS.rh.push(RS.lastR||0);if(RS.rh.length>24)RS.rh.shift()}RS.rh.forEach((v,i)=>{c.fillStyle=i===RS.rh.length-1?'#fff':col;c.globalAlpha=.35+.65*i/RS.rh.length;c.beginPath();c.arc(8+i*(w-16)/23,h/2-v*h*.4,3,0,6.283);c.fill()});c.globalAlpha=1}
      else if(k==='vel'){const hh=hitT&&hitT.get&&hitT.get(TRACKS.findIndex(t=>t.id===RS.id)),vv=hh?hh.v:0,el=hh&&ctx?ctx.currentTime-hh.t:9;c.fillStyle=col;c.globalAlpha=.25+.75*Math.exp(-Math.max(0,el)*2);c.fillRect(8,h-6-vv*(h-14),w-16,vv*(h-14));c.globalAlpha=1}});
    const sp=modBox.querySelector('[data-steps]');if(sp&&ctx){const P=M.stp,i=Math.floor((T-MOD_T0)*(S.bpm/15)/MOD_RATES[P.rate][0]);[...sp.children].forEach((b,j)=>b.classList.toggle('now',playing&&((i%16)+16)%16===j))}
    engBox.querySelectorAll('.rk').forEach(k=>k.live&&k.live())};
  (function loop(){requestAnimationFrame(loop);if(RS.open)drawCv()})();
  /* the synth card's own track changes follow into the full synth */
  setInterval(()=>{if(!RS.open)return;const i=S.sel>=6&&S.sel<=9?S.sel:synT;const id=TRACKS[i].id,e=S.inst[id]||'analog';if(id!==RS.id||e!==RS.e)build()},500);
})();

