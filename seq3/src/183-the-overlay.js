/* ---------- the overlay ---------- */
(()=>{const hx=document.querySelector('header .hx');if(!hx)return;
  const btn=document.createElement('button');btn.className='hx-b hx-daw';btn.id='dawBtn';btn.title='Studio · hela låten på en skärm';btn.textContent='studio';hx.prepend(btn);
  const D=document.createElement('div');D.id='daw';D.className='daw';D.hidden=true;
  D.innerHTML=`<header class="dw-top"><b class="dw-logo">BLONDA <i>studio</i></b>
      <button class="dw-play" data-a="play" aria-label="Spela">▶</button><button class="dw-b" data-a="stop" aria-label="Stoppa">■</button>
      <span class="dw-pos"><b>1.1</b><small>takt · steg</small></span><span class="dw-bpm"><b></b><small>bpm</small></span><span class="dw-pos dw-now"><b>–</b><small>del</small></span>
      <button class="dw-tg" data-a="on" title="Spela arrangemanget i stället för ett mönster i taget">arrangemang <i></i></button>
      <button class="dw-tg" data-a="loop" title="Börja om när låten är slut">loopa <i></i></button>
      <span class="dw-len"></span><span class="dw-sp"></span><button class="dw-b" data-a="close" title="Stäng (esc)">stäng ×</button></header>
    <section class="dw-arr">
      <div class="dw-tools"><button data-t="add">+ sektion</button><button data-t="dup">duplicera</button><button data-t="del">ta bort</button><button data-t="left">◀</button><button data-t="right">▶</button>
        <span class="dw-div"></span><span class="dw-lab">namn</span><button data-t="nm-">‹</button><b class="dw-nm"></b><button data-t="nm+">›</button>
        <span class="dw-lab">mönster</span>${[0,1,2,3].map(p=>`<button class="dw-p" data-p="${p}" style="--c:${ARR_COL[p]}">${'ABCD'[p]}</button>`).join('')}
        <span class="dw-lab">takter</span><button data-t="b-">−</button><b class="dw-bars"></b><button data-t="b+">+</button>
        <span class="dw-sp"></span><small class="dw-hint">tryck i en ruta = tyst / på i den sektionen · dubbeltryck på en sektion = spela därifrån</small></div>
      <div class="dw-tl"><div class="dw-lanes"></div><i class="dw-ph"></i></div></section>
    <div class="dw-main"><div class="dw-col dw-cl"></div><div class="dw-col dw-cr"><div class="dw-tabs"></div><div class="dw-slot"></div></div></div>`;
  document.body.appendChild(D);
  const lanes=D.querySelector('.dw-lanes'),ph=D.querySelector('.dw-ph'),cl=D.querySelector('.dw-cl'),slot=D.querySelector('.dw-slot'),tabs=D.querySelector('.dw-tabs');
  const RT=[['starter','starter'],['mixer','mixer'],['synth','synth'],['sound','ljud'],['loops','loopar'],['master','master'],['glitch','glitch']];
  let tab=(()=>{try{return localStorage.getItem('blonda.daw.tab')||'starter'}catch(e){return 'starter'}})();
  tabs.innerHTML=RT.map(([id,l])=>`<button data-tab="${id}">${l}</button>`).join('');
  /* cards move in while the DAW is open and go back to their places after */
  const docked=new Map();const dock=(id,host)=>{const c=document.querySelector('.card[data-card="'+id+'"]');if(!c||c.closest('#daw'))return;if(!docked.has(id)){const m=document.createComment('daw:'+id);c.before(m);docked.set(id,m)}host.appendChild(c)};
  const undockAll=()=>{docked.forEach((m,id)=>{const c=document.querySelector('.card[data-card="'+id+'"]');if(c&&m.parentNode)m.replaceWith(c)});docked.clear()};
  const showTab=t=>{tab=t;try{localStorage.setItem('blonda.daw.tab',t)}catch(e){globalThis.__el&&globalThis.__el(e)}[...slot.children].forEach(c=>{const id=c.dataset.card;if(id!==t){const m=docked.get(id);if(m&&m.parentNode){m.replaceWith(c);docked.delete(id)}}});dock(t,slot);
    tabs.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));{const on=tabs.querySelector('.on');if(on&&tabs.scrollWidth>tabs.clientWidth){const l=on.offsetLeft-tabs.offsetLeft,w=on.offsetWidth;if(l<tabs.scrollLeft)tabs.scrollLeft=l-4;else if(l+w>tabs.scrollLeft+tabs.clientWidth)tabs.scrollLeft=l+w-tabs.clientWidth+4}}setTimeout(()=>{dispatchEvent(new Event('resize'));try{renderAll()}catch(e){globalThis.__el&&globalThis.__el(e)}if(window.stxPaint)stxPaint(true)},30)};
  tabs.onclick=e=>{const b=e.target.closest('[data-tab]');if(b)showTab(b.dataset.tab)};
  /* when the panel is narrow only the tab row scrolls sideways (wheel or trackpad); the panel itself stays put */
  tabs.addEventListener('wheel',e=>{if(tabs.scrollWidth<=tabs.clientWidth)return;const d=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;if(!d)return;tabs.scrollLeft+=d;e.preventDefault()},{passive:false});
  const open=()=>{if(ARR.open)return;ARR.open=true;D.hidden=false;document.body.classList.add('daw-on');dock('grid',cl);showTab(tab);requestAnimationFrame(()=>D.classList.add('show'));build();dawPaint();
    setTimeout(()=>{dispatchEvent(new Event('resize'));try{renderAll()}catch(e){globalThis.__el&&globalThis.__el(e)}fitL()},60);setTimeout(fitL,400)};
  const close=()=>{if(!ARR.open)return;ARR.open=false;{const g=cl.querySelector('.card[data-card="grid"]');if(g)g.style.width='';D.querySelector('.dw-main').style.gridTemplateColumns=''}D.classList.remove('show');undockAll();document.body.classList.remove('daw-on');setTimeout(()=>{if(!ARR.open)D.hidden=true},250);
    setTimeout(()=>{dispatchEvent(new Event('resize'));try{renderAll()}catch(e){globalThis.__el&&globalThis.__el(e)}if(window.stxPaint)stxPaint(true)},60)};
  btn.onclick=()=>ARR.open?close():open();window.dawOpen=open;window.dawClose=close;
  addEventListener('keydown',e=>{if(e.key==='Escape'&&ARR.open&&!document.querySelector('.fullhost:not([hidden])')&&!e.target.closest('input,textarea')){e.preventDefault();close()}});
  {const _sl=saveLayout;saveLayout=function(){if(ARR.open)return;return _sl.apply(this,arguments)}}

  /* ---------- the timeline: sections across, a lane per track (and the Starter and the loops) down ---------- */
  const LANES=()=>[...(window.trkList?trkList():TRACKS.map((_,i)=>i)).map(i=>{const t=TRACKS[i];return {k:t.id,nm:t.name.toLowerCase(),i}}),{k:'@lp',nm:'loopar'}];
  const act=(p,i)=>{const tr=TRACKS[i];const out=new Array(16).fill(0);try{if(tr.mel){(S.roll[p][tr.id]||[]).forEach(n=>{const s=Math.floor(n.s)%16;out[s]=1})}else (S.pats[p][i]||[]).forEach((c,s)=>{if(c&&c.v>0)out[s]=c.v})}catch(e){globalThis.__el&&globalThis.__el(e)}return out};
  const h2r=(h,a)=>{h=(h||'#E8E6DC').replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`};
  /* one bar of a pattern as a hard-stop gradient; the cell repeats it once per bar, so the lane shows the real hits */
  const hitsBg=(a,hex,dim)=>{const st=[];let x=0;a.forEach((v,s)=>{if(!v)return;const x0=s/16*100+.9,x1=(s+1)/16*100-.9,c=h2r(hex,(dim?.22:1)*(v>=1?.95:.4+.55*v));
      st.push(`transparent ${x.toFixed(2)}%`,`transparent ${x0.toFixed(2)}%`,`${c} ${x0.toFixed(2)}%`,`${c} ${x1.toFixed(2)}%`);x=x1});
    return st.length?`linear-gradient(90deg,${st.join(',')},transparent ${x.toFixed(2)}%)`:''};
  function build(){const R=arr(),tot=arrTotal();lanes.style.setProperty('--tot',tot);
    let h=`<div class="dw-row dw-head"><span class="dw-ln dw-cnt">${R.secs.length} delar</span><div class="dw-cells">${R.secs.map((s,i)=>`<button class="dw-sec${i===R.sel?' sel':''}" data-s="${i}" style="--b:${s.bars};--c:${ARR_COL[s.p]}"><b>${s.nm}</b><small><em>${'ABCD'[s.p]}</em>${s.bars} takt${s.bars>1?'er':''}</small></button>`).join('')}</div></div>`;
    h+=`<div class="dw-row dw-ruler"><span class="dw-ln"></span><div class="dw-cells">${R.secs.map((s,i)=>`<span class="dw-rs" style="--b:${s.bars}">${Array.from({length:s.bars},(_,k)=>{const b=arrStart(i)+k;return `<i class="${k===0?'r0':''}${b%4?' mn':''}">${b+1}</i>`}).join('')}</span>`).join('')}</div></div>`;
    LANES().forEach(L=>{const hex=L.i!=null?TRACKS[L.i].hex:L.k==='@stx'?'#B9A6FF':'#6FD0C5';
      h+=`<div class="dw-row dw-lane${L.i==null?' dw-ext':''}" data-l="${L.k}"><span class="dw-ln"><i style="--h:${hex}"></i>${L.nm}</span><div class="dw-cells">${R.secs.map((s,si)=>{
        const off=L.k==='@stx'?!s.stx:L.k==='@lp'?!s.lp:s.m.includes(L.k);let st=`--b:${s.bars};--h:${hex}`,cls='dw-cell'+(off?' off':'')+(si===R.sel?' sel':''),inner='';
        if(L.i!=null){const bg=hitsBg(act(s.p,L.i),hex,off);if(bg)st+=`;--hits:${bg}`;else cls+=' empty'}
        else inner=off?'<span class="dw-txt">av</span>':'';
        return `<button class="${cls}" data-s="${si}" data-l="${L.k}" style="${st}" title="${L.nm} · ${s.nm}: ${off?'tyst – tryck för att slå på':'tryck för att tysta'}">${inner}</button>`}).join('')}</div></div>`});
    lanes.innerHTML=h;dense();paintTools()}
  /* bar numbers: every bar when there is room, otherwise every fourth */
  const dense=()=>{const c=lanes.querySelector('.dw-ruler .dw-cells');if(c)lanes.classList.toggle('dense',c.clientWidth/Math.max(1,arrTotal())<30)};
  /* the pattern grid on the left is sized so all its rows fit the height; the tabs on the right get the rest */
  const fitL=()=>{if(!ARR.open)return;const g=cl.querySelector(':scope>.card[data-card="grid"]'),main=D.querySelector('.dw-main');if(!g)return;
    g.style.width='';main.style.gridTemplateColumns='';const W=cl.clientWidth,H=cl.clientHeight;if(!W||!H)return;let w=W;
    for(let k=0;k<3;k++){const hh=g.scrollHeight;if(hh<=H+2)break;w=Math.max(520,Math.floor(w*H/hh));g.style.width=w+'px'}
    /* never narrower than its own contents (the step row and the buttons under it) */
    for(let k=0;k<4&&w<W;k++){let ov=0;g.querySelectorAll(':scope>:not(.grid)').forEach(c=>{ov=Math.max(ov,c.scrollWidth-c.clientWidth)});if(ov<=12)break;w=Math.min(W,w+ov-8);g.style.width=w+'px'}
    const ow=g.offsetWidth;if(ow<W-8)main.style.gridTemplateColumns=`${ow}px minmax(0,1fr)`;else{g.style.width='';main.style.gridTemplateColumns=''}
    try{renderAll()}catch(e){globalThis.__el&&globalThis.__el(e)}if(window.stxPaint)stxPaint(true)};
  addEventListener('resize',()=>{if(ARR.open){dense();clearTimeout(fitL._t);fitL._t=setTimeout(fitL,120)}});window.dawFit=fitL;
  function paintTools(){const R=arr(),s=R.secs[R.sel];D.querySelector('.dw-nm').textContent=s?s.nm:'–';D.querySelector('.dw-bars').textContent=s?s.bars:'–';
    D.querySelectorAll('.dw-p').forEach(b=>b.classList.toggle('on',!!s&&+b.dataset.p===s.p));
    const tot=arrTotal(),sec=tot*4*60/S.bpm;D.querySelector('.dw-len').textContent=R.secs.length+' sektioner · '+tot+' takter · '+Math.floor(sec/60)+':'+String(Math.round(sec%60)).padStart(2,'0');
    D.querySelector('[data-a="on"]').classList.toggle('on',!!R.on);D.querySelector('[data-a="loop"]').classList.toggle('on',!!R.loop)}
  const commit=()=>{save();build();dawPaint()};
  lanes.addEventListener('click',e=>{const R=arr();
    /* (v268) the name of an instrument opens its piano roll on the selected section's pattern (drums: the track is selected) */
    {const ln=e.target.closest('.dw-lane>.dw-ln');if(ln){const k=ln.parentElement.dataset.l,i=TRACKS.findIndex(t=>t.id===k);if(i<0)return;const s=R.secs[R.sel];
      if(s&&(!playing||!R.on)&&S.pat!==s.p){S.pat=s.p}S.sel=i;try{renderAll()}catch(_){globalThis.__el&&globalThis.__el(_)}
      if(TRACKS[i].mel){try{openRoll(i)}catch(_){globalThis.__el&&globalThis.__el(_)}}else toast(TRACKS[i].name+' selected · edit its steps in the pattern grid');return}}
    const sb=e.target.closest('.dw-sec');if(sb){const i=+sb.dataset.s;R.sel=i;if(!playing||!R.on){S.pat=R.secs[i].p;try{renderAll()}catch(_){globalThis.__el&&globalThis.__el(_)}}ARR.startBar=arrStart(i);commit();return}
    const c=e.target.closest('.dw-cell');if(!c)return;const s=R.secs[+c.dataset.s],k=c.dataset.l;if(k==='@stx')s.stx=s.stx?0:1;else if(k==='@lp')s.lp=s.lp?0:1;else{const j=s.m.indexOf(k);if(j>=0)s.m.splice(j,1);else s.m.push(k)}
    if(ARR.active&&+c.dataset.s===ARR.idx){if(k==='@stx')ARR.stx=s.stx;else if(k==='@lp')ARR.lp=s.lp;else try{applyAll()}catch(_){globalThis.__el&&globalThis.__el(_)}}commit()});
  lanes.addEventListener('dblclick',e=>{const sb=e.target.closest('.dw-sec');if(!sb)return;const R=arr(),i=+sb.dataset.s;R.on=1;S.song=0;ARR.startBar=arrStart(i);if(playing){ARR.bar=ARR.startBar-1}else{initAudio();ctx.resume();play()}commit();toast('Spelar från '+R.secs[i].nm)});
  D.querySelector('.dw-tools').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const R=arr(),i=R.sel,s=R.secs[i],t=b.dataset.t;
    if(b.dataset.p!=null){if(s){s.p=+b.dataset.p;if(!playing||!R.on){S.pat=s.p;try{renderAll()}catch(_){globalThis.__el&&globalThis.__el(_)}}}}
    else if(t==='add'){const p=s?(s.p+1)%4:0;R.secs.splice(i+1,0,{nm:ARR_NM[(R.secs.length)%ARR_NM.length],p,bars:s?s.bars:4,m:[],stx:1,lp:1});R.sel=i+1}
    else if(t==='dup'&&s){R.secs.splice(i+1,0,JSON.parse(JSON.stringify(s)));R.sel=i+1}
    else if(t==='del'&&s&&R.secs.length>1){R.secs.splice(i,1);R.sel=Math.max(0,i-1)}
    else if(t==='left'&&i>0){[R.secs[i-1],R.secs[i]]=[R.secs[i],R.secs[i-1]];R.sel=i-1}
    else if(t==='right'&&i<R.secs.length-1){[R.secs[i+1],R.secs[i]]=[R.secs[i],R.secs[i+1]];R.sel=i+1}
    else if((t==='nm-'||t==='nm+')&&s){const k=ARR_NM.indexOf(s.nm);s.nm=ARR_NM[((k<0?0:k)+(t==='nm+'?1:-1)+ARR_NM.length)%ARR_NM.length]}
    else if((t==='b-'||t==='b+')&&s){const L=[1,2,4,8,12,16,24,32],k=L.indexOf(s.bars);s.bars=L[Math.max(0,Math.min(L.length-1,(k<0?2:k)+(t==='b+'?1:-1)))]}
    else return;commit()});
  D.querySelector('.dw-top').addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a,R=arr();
    if(a==='close')close();else if(a==='play'){initAudio();ctx.resume();if(playing)stop();else play()}else if(a==='stop'){if(playing)stop()}
    else if(a==='on'){R.on=R.on?0:1;if(R.on)S.song=0;try{renderChain()}catch(_){globalThis.__el&&globalThis.__el(_)}commit();toast(R.on?'Arrangemanget spelar · '+arrTotal()+' takter':'Ett mönster i taget')}
    else if(a==='loop'){R.loop=R.loop?0:1;commit()}});
  window.dawBuild=build;
  /* the playhead and the counters */
  const tick=()=>{if(ARR.open){const R=arr(),tot=arrTotal(),cells=lanes.querySelector('.dw-head .dw-cells');D.querySelector('.dw-play').textContent=playing?'❚❚':'▶';D.querySelector('.dw-bpm b').textContent=Math.round(S.bpm);
      if(cells){const r=cells.getBoundingClientRect(),lr=lanes.getBoundingClientRect();let pos=-1;
        while(ARR.q.length&&ctx&&ARR.q[0].t<=ctx.currentTime){ARR.vis=ARR.q.shift()}const V=ARR.vis;
        /* (v268) where the sound is: the bar that is heard plus how far into it the audio clock is (the step counter runs ahead
           of the sound, so near a bar line it jumped back a bar and then forward again) */
        const bd=stepDur()*16,fr=playing&&ARR.active&&V.t!=null&&ctx?Math.max(0,Math.min(.999,(ctx.currentTime-V.t)/bd)):0;
        if(playing&&ARR.active)pos=(V.bar+fr)/tot;else if(!playing)pos=(ARR.startBar||0)/tot;
        ph.style.display=pos<0?'none':'block';ph.style.left=(r.left-lr.left+pos*r.width)+'px';ph.classList.toggle('run',playing&&ARR.active);
        {const R2=arr(),ni=playing&&ARR.active?ARR.vis.idx:R2.sel,nb=D.querySelector('.dw-now b'),ns=R2.secs[ni];if(nb){nb.textContent=ns?ns.nm:'–';nb.style.color=ns?ARR_COL[ns.p]:''}}
        D.querySelector('.dw-pos:not(.dw-now) b').textContent=playing&&ARR.active?(V.bar+1)+'.'+(Math.floor(fr*4)+1):playing?'mönster '+'ABCD'[S.pat]:((ARR.startBar||0)+1)+'.1'}
      lanes.querySelectorAll('.dw-sec').forEach((b,i)=>b.classList.toggle('now',playing&&ARR.active&&i===ARR.vis.idx))}
    requestAnimationFrame(tick)};requestAnimationFrame(tick)})();
function dawPaint(){if(ARR.open&&window.dawBuild)dawBuild()}
/* (v268) song view: one bar = the same width everywhere. The sections used flex gaps, so they drifted against the playhead
   (up to 4 px per section, the last ones visibly off the bar lines); now each section is exactly its bars wide and the gap is a
   transparent edge inside it. Edits elsewhere (a kick added in the grid …) show in the song view at once. */
(()=>{const st=document.createElement('style');st.textContent=`
.daw .dw-cells{gap:0!important}
.daw .dw-cells>*{flex:none!important;box-sizing:border-box!important;width:calc(100% * var(--b) / var(--tot,1))!important;margin:0!important;border:0!important;border-right:4px solid transparent!important;background-clip:padding-box!important;background-origin:border-box!important}
.daw .dw-cells>.dw-rs{border-right:0!important}
.daw .dw-lane>.dw-ln{cursor:pointer;border-radius:var(--dk-r)}
.daw .dw-lane>.dw-ln:hover{color:rgb(var(--dk-ink));background:rgba(var(--dk-ink),.06)}`;document.head.appendChild(st);
  let bt=0;const _sv=save;save=function(){const r=_sv.apply(this,arguments);if(ARR.open&&window.dawBuild){clearTimeout(bt);bt=setTimeout(()=>{try{dawBuild()}catch(e){globalThis.__el&&globalThis.__el(e)}},90)}return r}})();

