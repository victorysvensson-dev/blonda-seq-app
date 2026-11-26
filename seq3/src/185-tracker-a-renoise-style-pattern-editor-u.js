/* ================= Tracker: a Renoise-style pattern editor under the clips. It shows the selected scene: a column per track with
   that track's clip (its pattern A–D), 16 rows. Drums: hit · volume · fx (ratchet, chance). Melodic tracks: one or more note
   columns, each note · volume; a note plays until the next note in its column or an OFF. Edits write straight into S.pats /
   S.roll (and keep the step row in sync, as the piano roll does), so the sound and the other editors follow. ================= */
(()=>{const D=document.getElementById('daw');if(!D||!window.__clips)return;const {CLX,clp}=window.__clips;
  const main=D.querySelector('.dw-main');if(!main)return;
  const css=document.createElement('style');css.textContent=`
.tq{display:none;min-height:0;min-width:0;flex-direction:column;background:var(--dk-p0);border-radius:var(--dk-r);box-shadow:inset 0 0 0 1px rgba(var(--dk-ink),.08);outline:none;overflow:hidden;font-family:var(--f-mono)}
.daw.clipv.tqon .tq{display:flex}.daw.clipv.tqon .dw-cl{display:none}
.daw.clipv.tqon .dw-main{grid-template-columns:minmax(0,2.2fr) minmax(340px,1fr)!important}
.tq:focus{box-shadow:inset 0 0 0 1px rgba(var(--dk-acc-rgb),.55)}
.tq-top{display:flex;align-items:center;gap:6px;padding:8px 10px;flex:none;border-bottom:1px solid rgba(var(--dk-ink),.07);flex-wrap:wrap}
.tq-top b{font:400 14px var(--f-linje);margin-right:6px;white-space:nowrap}
.tq-top .tq-lab{font-size:9px;letter-spacing:.08em;color:rgba(var(--dk-ink),.45);margin-left:8px}
.tq-top button{height:24px;min-width:24px;padding:0 7px;border-radius:var(--dk-r);font-size:10px!important;box-shadow:inset 0 0 0 1px rgba(var(--dk-ink),.16);background:var(--dk-p2)!important}
.tq-top button:hover{background:var(--dk-p4)!important}
.tq-top em{font-style:normal;font:400 13px var(--f-linje);min-width:18px;text-align:center}
.tq-hint{margin-left:auto;font-size:9px;color:rgba(var(--dk-ink),.36);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.tq-sc{flex:1;min-height:0;overflow:auto;scrollbar-width:thin;position:relative}\n.tq-hs{flex:none;height:31px;overflow:hidden;position:relative;background:var(--dk-p1);font-size:12.5px}\n.tq-hsi{display:flex;height:100%;min-width:max-content}\n.tq-hs .tq-col{flex:none!important;height:31px;overflow:hidden}\n.tq-hs .tq-hd{position:relative!important;top:auto;height:30px;-webkit-transform:none;transform:none;z-index:auto}\n.tq-hs .tq-num{position:relative;left:auto;z-index:2;background:var(--dk-p1)}\n.tq-sc .tq-hd{visibility:hidden;position:static!important;height:0!important;padding-top:0!important;padding-bottom:0!important;border:0!important;overflow:hidden;-webkit-transform:none;transform:none}
.tq-body{display:flex;min-width:max-content;font-size:11px;line-height:var(--rh,18px)}
.tq-col{display:flex;flex-direction:column;flex:none;border-right:1px solid rgba(var(--dk-ink),.06)}
.tq-hd{position:sticky;top:0;z-index:6;-webkit-transform:translateZ(0);transform:translateZ(0);height:30px;display:flex;flex-direction:column;justify-content:center;gap:2px;padding:0 8px;background:var(--dk-p1);border-bottom:1px solid rgba(var(--dk-ink),.08);cursor:pointer;white-space:nowrap}
.tq-hd::before{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:var(--h)}
.tq-hd b{font:500 10px var(--f-mono);letter-spacing:.04em;color:rgb(var(--dk-ink));display:flex;align-items:center;gap:6px}
.tq-hd b i{font-style:normal;font-size:9px;width:14px;height:14px;border-radius:var(--dk-r2);display:inline-grid;place-items:center;background:var(--c);color:var(--dk-on)}
.tq-hd small{font-size:8px;color:rgba(var(--dk-ink),.4);letter-spacing:.06em}
.tq-col.cur .tq-hd{background:var(--dk-p3)}.tq-col.cur .tq-hd b{color:#fff}
.tq-col.mute>.tq-r span{color:rgba(var(--dk-ink),.28)!important;text-shadow:none!important}.tq-col.mute>.tq-hd b,.tq-col.mute>.tq-hd small{opacity:.6}
.tq-num{position:sticky;left:0;z-index:7;-webkit-transform:translateZ(0);transform:translateZ(0);background:var(--dk-p0)}.tq-num .tq-hd{cursor:default}.tq-num .tq-hd::before{display:none}
.tq-r{height:var(--rh,18px);display:flex;align-items:center;gap:5px;padding:0 6px;white-space:pre;color:rgba(var(--dk-ink),.82)}
.tq-r.b4{background:rgba(var(--dk-ink),.035)}
.tq-r.cl{background:rgba(var(--dk-acc-rgb),.07)}
.tq-r.pl{background:rgba(var(--dk-acc-rgb),.2)!important;box-shadow:inset 2px 0 0 var(--dk-acc)}
/* the play line also runs through tracks that are not playing right now (empty or not in this clip), only quieter */
.tq-r.pg{background:rgba(var(--dk-acc-rgb),.11)!important;box-shadow:inset 0 1px 0 rgba(var(--dk-acc-rgb),.14),inset 0 -1px 0 rgba(var(--dk-acc-rgb),.14)}
/* a step that sounds right now lights up a little in white, like the glitch pads when they play */
.tq-r.pl.hit{background:rgba(255,255,255,.16)!important;box-shadow:inset 2px 0 0 rgba(255,255,255,.85)!important;animation:tqHit .45s ease-out}
.tq-r.pl.hit span:not(.e):not(.tie){color:#fff!important}
@keyframes tqHit{from{background:rgba(255,255,255,.3)}}
body.look-dots .daw .tq-r.pg{background:rgba(17,18,17,.06)!important}
body.look-dots .daw .tq-r.pl.hit{background:rgba(17,18,17,.3)!important;box-shadow:inset 2px 0 0 #111211!important;animation:none}
body.look-dots .daw .tq-r.pl.hit span:not(.e):not(.tie){color:#111211!important;font-weight:600}
.tq-r.out{opacity:.25}
.tq-num .tq-r{color:rgba(var(--dk-ink),.38);font-size:10px}.tq-num .tq-r.b4{color:rgba(var(--dk-ink),.7)}
.tq-r span{display:inline-block;text-align:left;border-radius:var(--dk-r2);cursor:text}
.tq-r .n{width:3ch}.tq-r .v{width:2ch;color:#7FB7E8}.tq-r .x{width:3ch;color:#D6A6F0}.tq-r .s{width:5ch;color:#8FE3C7}.tq-r .h{width:3ch;font-weight:500}
.tq-r .e{color:rgba(var(--dk-ink),.16)}
.tq-r .h:not(.e){color:var(--h)}.tq-r .h.acc{text-shadow:0 0 6px var(--h)}
.tq-r .n:not(.e):not(.off){color:rgb(var(--dk-ink))}.tq-r .off{color:rgba(var(--dk-ink),.38)}
.tq-r .tie{color:rgba(var(--dk-ink),.22)}
.tq-r .sub{width:6px}
.daw.tqfull .dw-clp,.daw.tqfull .dw-cr{display:none!important}
.daw.clipv.tqon.tqfull .dw-main{grid-template-columns:minmax(0,1fr)!important}
.daw.tqfull .tq-body{font-size:12.5px;min-width:100%}.daw.tqfull .tq-col:not(.tq-num){flex:1 0 auto}.daw.tqfull .tq-r{gap:7px;padding:0 9px}
.tq-top .tq-fs.on{background:rgb(var(--dk-ink))!important;color:var(--dk-on)!important}
.tq-r .cd{width:6ch;color:#CFC3FF;font-weight:500}.tq-sx .tq-r .n:not(.e):not(.tie){color:#CFC3FF}.tq-sx .tq-r span{cursor:default}.tq-sx .tq-hd{cursor:default}.tq-sxb{border:0;background:none;color:inherit;cursor:pointer;font:inherit;padding:0 3px;opacity:.75}.tq-sxb:hover{opacity:1;color:#fff}
.tq-col.sx0{border-left:1px solid rgba(185,166,255,.35)}.tq-sx .tq-r span.n:not(.e):not(.tie){color:color-mix(in srgb,var(--h) 70%,#fff)}
.tq-r .g{width:3ch;font-weight:500}
.tq-gl{display:inline-flex;gap:2px;vertical-align:middle}.tq-gl i.has:not(.on){color:#E2F53C}
.tq-r .w{width:3ch;color:#E2F53C}.tq-r .w.dv{color:rgba(226,245,60,.4)}.tq-r .w.e{color:rgba(var(--dk-ink),.16)}
.tq-gq{position:absolute;margin-left:-11px;font:600 8px var(--f-mono);color:#E2F53C;opacity:.8}.tq-gx .tq-r{position:relative}
.gx-no{font-style:normal;font:500 9px var(--f-mono);opacity:.55;margin-right:6px;padding:0 4px;border-radius:var(--dk-r2);box-shadow:inset 0 0 0 1px currentColor;vertical-align:1px}
.gx-t .gx-big{cursor:pointer;position:relative;z-index:2}.gx-t .gx-big:hover{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:5px}
.gxs-p{display:inline-flex;gap:3px}.gxs-p button{min-width:22px;height:20px;padding:0 6px;border-radius:var(--dk-r);border:0;cursor:pointer;font:500 10px var(--f-mono);background:none;color:inherit;opacity:.55;box-shadow:inset 0 0 0 1px rgba(127,127,127,.4)}
.gxs-p button.has{opacity:.85}.gxs-p button.on{opacity:1;background:#E2F53C;color:var(--dk-on);box-shadow:none}.tq-gl i{font-style:normal;padding:0 4px;border-radius:var(--dk-r2);cursor:pointer;box-shadow:inset 0 0 0 1px rgba(var(--dk-ink),.18)}
.tq-gl i.on{background:#E2F53C;color:var(--dk-on);box-shadow:none}
.gxs-clipnote{font:500 9px var(--f-mono);color:#E2F53C;margin-left:8px}.tq-r .g:not(.e){color:var(--gc)}
.sxf{position:fixed;inset:0;z-index:6500;display:grid;place-items:center;padding:24px;background:rgba(12,12,14,.38);-webkit-backdrop-filter:blur(18px) saturate(1.15);backdrop-filter:blur(18px) saturate(1.15);opacity:0;transition:opacity .25s}
.sxf[hidden]{display:none}.sxf.show{opacity:1}
.sxf-in{width:min(860px,94vw);max-height:88vh;overflow:auto;border-radius:var(--dk-r);box-shadow:0 30px 90px rgba(0,0,0,.55);scrollbar-width:none}.sxf-in::-webkit-scrollbar{display:none}
.sxf-in>.card{margin:0!important}.sxf-in .card .grab{display:none}
.sxf-x{position:fixed;top:18px;right:20px;height:36px;padding:0 14px;border-radius:var(--dk-r);border:0;cursor:pointer;font:500 11px var(--f-mono);background:rgba(20,20,22,.7);color:rgb(var(--dk-ink));box-shadow:inset 0 0 0 1px rgba(var(--dk-ink),.2)}
.tq-seg{display:inline-flex;padding:2px;border-radius:var(--dk-r);box-shadow:inset 0 0 0 1px rgba(var(--dk-ink),.14)}.tq-seg button{box-shadow:none!important;background:none!important;color:rgba(var(--dk-ink),.55)}
.tq-seg button.on{background:rgb(var(--dk-ink))!important;color:var(--dk-on)!important}.tq-top .tq-fol.on{background:var(--dk-acc)!important;color:var(--dk-on)!important;box-shadow:none}
.tq-r.bar{box-shadow:inset 0 1px 0 rgba(var(--dk-acc-rgb),.4)}.tq-num .tq-r.bar{color:var(--dk-acc)}
.tq-r.gh span:not(.f){opacity:.38}.tq-r.gh .h:not(.e){text-shadow:none}
.tq-r.tw{background:rgba(var(--dk-acc-rgb),.04)}.tq-r.tw span[data-k]{text-decoration:underline;text-decoration-color:rgba(var(--dk-acc-rgb),.35)}
.tq-r .f{width:3ch;color:#B9A6FF;font-weight:500;cursor:default}.tq-r .f.same{color:rgba(185,166,255,.45)}.tq-r .f.e{color:transparent}
.tq-r span.cu{background:var(--dk-acc)!important;color:var(--dk-on)!important;text-shadow:none}
.tq:not(:focus) .tq-r span.cu{background:rgba(var(--dk-acc-rgb),.35)!important;color:#fff!important}
.tq-empty .tq-r span{color:rgba(var(--dk-ink),.1)}
.xc-mode{display:inline-flex;margin-left:auto;padding:2px;border-radius:var(--dk-r);box-shadow:inset 0 0 0 1px rgba(var(--dk-ink),.14)}
.xc-mode button{height:24px!important;box-shadow:none!important;background:none!important;color:rgba(var(--dk-ink),.55)!important}
.xc-mode button.on{background:rgb(var(--dk-ink))!important;color:var(--dk-on)!important}
.daw.clipv .xc-hint{display:none}
`;document.head.appendChild(css);

  const T=document.createElement('section');T.className='tq';T.tabIndex=0;
  T.innerHTML=`<div class="tq-top"><b class="tq-ttl">scen 1</b><button data-u="u" title="Ångra (⌘Z)">↶</button><button data-u="r" title="Gör om (⇧⌘Z)">↷</button>
      <span class="tq-lab">oktav</span><button data-o="-1" title="Oktav ner ( < )">−</button><em class="tq-oct">4</em><button data-o="1" title="Oktav upp ( > )">+</button>
      <span class="tq-lab">steg</span><button data-e="-1" title="Hur många rader markören hoppar efter en not">−</button><em class="tq-st">1</em><button data-e="1">+</button>
      <span class="tq-lab">visa</span><span class="tq-seg"><button data-b="1" title="Bara mönstret (16 steg)">1 takt</button><button data-b="4" title="Fyra takter: mönstret loopar, det som följer Startern syns hela vägen">4 takter</button></span>
      <button class="tq-fol" data-f title="Rulla med när det spelar">följ</button><button data-sxo title="Visa Startern ensam i mitten">starter ◎</button><button class="tq-fs" data-fs title="Trackern på hela skärmen (esc = tillbaka)">⤢ hela skärmen</button>
      <span class="tq-hint">Z–M · Q–P = notes · A = OFF · Del = delete · 0–F in vol · R / P in fx = ratchet / chance · sample column: R reverse · 0–F start · − + pitch · [ ] glide · arrows = move</span></div>
    <div class="tq-hs"></div><div class="tq-sc"><div class="tq-body"></div></div>`;
  main.insertBefore(T,main.firstChild);
  const body=T.querySelector('.tq-body'),sc=T.querySelector('.tq-sc'),hs=T.querySelector('.tq-hs');
  /* the column headers live in their own strip above the rows (not sticky inside them): when the rows are rebuilt, Chrome and
     Safari could draw a frame with the rows on top of a sticky header, which showed as text blinking through it */
  function hdBuild(){const inner=document.createElement('div');inner.className='tq-hsi';
    body.querySelectorAll(':scope>.tq-col').forEach(c=>{const hd=c.querySelector(':scope>.tq-hd');if(!hd)return;const w=document.createElement('div');
      w.className=c.className;const st=c.getAttribute('style');if(st)w.setAttribute('style',st);if(c.dataset.t!=null)w.dataset.t=c.dataset.t;
      hdW(w,c);w.appendChild(hd.cloneNode(true));inner.appendChild(w)});
    hs.replaceChildren(inner);hdScroll();hdObserve()}
  function hdWidths(){const inner=hs.firstChild;if(!inner)return;const cs=body.querySelectorAll(':scope>.tq-col');if(cs.length!==inner.children.length){hdBuild();return}
    cs.forEach((c,k)=>hdW(inner.children[k],c));hdScroll()}
  function hdW(w,c){const x=c.getBoundingClientRect().width+'px';w.style.boxSizing='border-box';w.style.width=w.style.minWidth=w.style.maxWidth=x;w.style.flex='0 0 '+x}
  function hdScroll(){if(hs.scrollLeft)hs.scrollLeft=0;const inner=hs.firstChild;if(!inner)return;const x=sc.scrollLeft;inner.style.transform='translateX('+(-x)+'px)';const n=inner.querySelector('.tq-num');if(n)n.style.transform='translateX('+x+'px)'}
  sc.addEventListener('scroll',hdScroll,{passive:true});hs.addEventListener('scroll',hdScroll,{passive:true});
  let hdRO=null;try{hdRO=new ResizeObserver(()=>hdWidths())}catch(e){globalThis.__el&&globalThis.__el(e)}
  function hdObserve(){if(!hdRO)return;hdRO.disconnect();hdRO.observe(body);body.querySelectorAll(':scope>.tq-col').forEach(c=>hdRO.observe(c))}
  let mode=(()=>{try{return localStorage.getItem('blonda.trk.mode')||'tracker'}catch(e){return 'tracker'}})();
  let oct=4,estep=1,lastVel=.8,vPend=null;const cur={t:0,c:0,r:0};let gxSyncK='';
  /* 1 bar = the pattern itself; 4 bars = the same 16 steps four times, the repeats dimmed, so the loop shows and a track that
     follows the Starter shows what it really plays over the whole progression */
  let sxOpen=(()=>{try{return localStorage.getItem('blonda.trk.sxx')==='1'}catch(e){return false}})();
  let bars=(()=>{try{return +localStorage.getItem('blonda.trk.bars')||4}catch(e){return 4}})(),follow=1,rb=0;
  const NR=()=>bars*16;
  const stepOf=(i,r)=>{if(i>=TRACKS.length)return r;const L=trkLen(i);return bars>1&&L<16?(((rb+r)%L)+L)%L:L<16?r%L:r%16};
  const sr=()=>stepOf(cur.t,cur.r);
  /* the tracker | steg switch sits in the clip toolbar */
  const tools=D.querySelector('.xc-tools');const ms=document.createElement('span');ms.className='xc-mode';ms.innerHTML='<button data-m="tracker">tracker</button><button data-m="steg">steg</button>';tools.appendChild(ms);
  const setMode=m=>{mode=m;try{localStorage.setItem('blonda.trk.mode',m)}catch(e){globalThis.__el&&globalThis.__el(e)}D.classList.toggle('tqon',m==='tracker');ms.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));
    render();setTimeout(()=>{dispatchEvent(new Event('resize'))},40)};
  ms.onclick=e=>{const b=e.target.closest('[data-m]');if(b){e.stopPropagation();setMode(b.dataset.m)}};

  const DRN={kick:'BD',snare:'SD',clap:'CP',hat:'CH',ohat:'OH',perc:'PC',tom:'TM',rim:'RM',shaker:'SH',bell:'CB',conga:'CG',clave:'CL',snap:'SN',tick:'TK',kick2:'B2',snare2:'S2'};
  const NN=['C-','C#','D-','D#','E-','F-','F#','G-','G#','A-','A#','B-'];
  const nName=n=>NN[((n%12)+12)%12]+(Math.floor(n/12)-1);
  const hex=x=>Math.max(0,Math.min(127,Math.round(x))).toString(16).toUpperCase().padStart(2,'0');
  const scene=()=>clp().sc[Math.max(0,Math.min(7,CLX.sel.r|0))];
  const pOf=i=>scene().c[i];
  const R_=(p,i)=>{const id=TRACKS[i].id;if(!S.roll[p])S.roll[p]={};if(!Array.isArray(S.roll[p][id]))S.roll[p][id]=[];return S.roll[p][id]};
  /* note columns: every note gets a column (keeps the one it had when there is room), so chords spread out side by side (v264: up to 8) */
  function lay(p,i){const R=R_(p,i),ord=R.map((n,k)=>k).sort((a,b)=>R[a].s-R[b].s||R[a].n-R[b].n),end=[],col=new Array(R.length);
    ord.forEach(k=>{const n=R[k],free=c=>(end[c]==null||end[c]<=n.s+1e-6);let c=(n.tc!=null&&free(n.tc))?n.tc:-1;if(c<0){c=0;while(!free(c))c++}col[k]=c;end[c]=Math.max(end[c]||0,n.s+Math.max(.01,n.l));n.tc=c});
    const used=end.length;return {R,col,subs:Math.min(8,Math.max(1,used)+(used&&used<8&&i===cur.t?1:0))}}
  /* what each row shows in a note column */
  function melRows(p,i){const L=lay(p,i),rows=[];for(let r=0;r<16;r++)rows.push(new Array(L.subs).fill(null));
    for(let c=0;c<L.subs;c++){const ns=L.R.map((n,k)=>({n,k})).filter(o=>L.col[o.k]===c).sort((a,b)=>a.n.s-b.n.s);
      ns.forEach((o,j)=>{const r0=Math.floor(o.n.s+1e-6);if(r0<0||r0>15)return;rows[r0][c]={t:'n',n:o.n};const e=o.n.s+o.n.l,nx=j+1<ns.length?ns[j+1].n.s:16;
        for(let r=r0+1;r<16&&r<Math.ceil(e-1e-6)&&r<Math.floor(nx+1e-6);r++)if(!rows[r][c])rows[r][c]={t:'tie',n:o.n};
        const offR=Math.round(e);if(e<nx-1e-6&&offR<16&&offR>r0&&offR<Math.floor(nx+1e-6)&&(!rows[offR][c]||rows[offR][c].t==='tie'))rows[offR][c]={t:'off',n:o.n}})}
    return {rows,subs:L.subs,L}}
  /* does this track follow the Starter's chords right now? then the tracker also shows what is heard, bar by bar */
  const folOf=i=>{try{const tr=TRACKS[i];if(!tr.mel)return null;const P=stx();if(!P||!P.on||!P.fol||!P.fol.on||P.src==='off')return null;const m=P.fol[tr.id]||'av';return m==='av'?null:{P,m}}catch(e){return null}};
  const barNow=()=>playing?Math.max(0,gstep-(((gstep%16)+16)%16)):0;
  const FOLN={transp:'transponerar',rot:'grundton',skala:'skala',ackord:'ackord'};
  /* the Starter (read only: chord · sub · top line, 64 steps) and a glitch lane per scene (16 or 64 steps) sit after the tracks */
  const SXT=TRACKS.length,GXT=TRACKS.length+1,NAV=[...TRACKS.map((_,i)=>i),GXT];
  const GXN=['STU','ROL','REV','STP','HLV','CRU','GAT'];
  /* glitch has patterns A–D (the same S.gfx[0..3] the glitch card shows). A scene picks one (16 steps, loops) or plays A→B→C→D, a bar
     each (64 steps). Scenes 1–4 start on A–D. */
  const GFX=q=>{if(!S.gfx||typeof S.gfx!=='object')S.gfx={};if(!Array.isArray(S.gfx[q]))S.gfx[q]=[];return S.gfx[q]};
  const gxOf=r=>{const s=clp().sc[r];if(!s)return null;if(!s.gx||typeof s.gx!=='object')s.gx={};const g=s.gx;
    if(g.p==null){g.p=r<4?r:-1;
      /* a lane written in the version before: move it into the glitch patterns where they are empty */
      if(Array.isArray(g.b)&&g.b.length){if(g.len===64){for(let k=0;k<4;k++){const part=g.b.filter(x=>x.s>=16*k&&x.s<16*k+16);if(part.length&&!GFX(k).length)S.gfx[k]=part.map(x=>({...x,s:x.s-16*k,len:Math.min(x.len,16*k+16-x.s)}))}}
        else{const q=g.p>=0?g.p:[0,1,2,3].find(k=>!GFX(k).length);if(q!=null&&!GFX(q).length){S.gfx[q]=g.b.map(x=>({...x}));g.p=q}}}
      delete g.b;delete g.seeded}
    if(g.len!==64)g.len=16;return g};
  const gxS=()=>gxOf(Math.max(0,Math.min(7,CLX.sel.r|0)));
  const base64=()=>bars>1?0:(((barNow()%64)+64)%64);
  /* which glitch pattern and step a tracker row is */
  const gxAt=r=>{const g=gxS();if(g.len===64){const bar=bars>1?(r>>4):(base64()>>4);return {q:bar&3,s:r%16}}return {q:g.p,s:r%16}};
  const sxCells=()=>{const P=stx();if(!P||!P.on)return null;let pl;try{pl=stxPlanCached()}catch(e){return null}const K=['ack','sub','klo','luft'],A={mx:{ack:1,luft:1}};K.forEach(k=>A[k]=new Array(64).fill(null));
    K.forEach(k=>{const ar=(k==='ack'||k==='luft')&&P.ls&&P.ls[k]&&P.ls[k].arp&&P.ls[k].arp.on&&pl.arp&&pl.arp[k];let end=-1;
      for(let g=0;g<64;g++){const ev=pl.steps[g],e=ev&&ev[k];
        if(ar){const by=ar.by[g]||[];if(by.length){const ns=by.map(q=>q.n);A[k][g]={t:'n',txt:k==='ack'?((pl.ch[(ev||{}).ci!=null?ev.ci:(pl.two?(g>>4)*2+((g&15)<8?0:1):(g>>4))]||{}).name||'arp'):nName(ns[0]),ns};A.mx[k]=Math.max(A.mx[k],ns.length)}continue}
        if(e){const ns=e.ns?e.ns.slice().sort((a,b)=>a-b):null;A[k][g]={t:'n',txt:k==='ack'?((pl.ch[ev.ci]||{}).name||'chd'):nName(e.n!=null?e.n:(ns?ns[0]:60)),ns};if(ns)A.mx[k]=Math.max(A.mx[k],ns.length);end=g+Math.max(1,e.l||1)}else if(g<end)A[k][g]={t:'tie'}}});/* the two sample slots (voice, one-shot): where the Starter drops them; ◀ = reversed, ≋ = stutter */
    [0,1].forEach(k=>{const by=pl.sx&&pl.sx[k],a=new Array(64).fill(null);let end=-1;if(by)for(let g=0;g<64;g++){const e=by[g];if(e){a[g]={t:'n',txt:'■'+(e.rev?'◀':'')+(e.stu?'≋':'')};end=g+Math.max(1,e.l||1)}else if(g<end)a[g]={t:'tie'}}A['s'+k]=a});
    return A};
  const COLS=i=>{if(i===GXT)return ['g','w'];if(i===SXT)return [];if(!TRACKS[i].mel)return ['h','v','x','s'];const p=pOf(i),s=p>=0?lay(p,i).subs:1,a=[];for(let k=0;k<s;k++)a.push('n'+k,'v'+k);return a};

  function render(){if(!ARR.open||!D.classList.contains('clipv')||mode!=='tracker')return;
    const sn=scene();T.querySelector('.tq-ttl').textContent='scen '+((CLX.sel.r|0)+1);T.querySelector('.tq-oct').textContent=oct;T.querySelector('.tq-st').textContent=estep;T.querySelectorAll('.tq-seg button').forEach(b=>b.classList.toggle('on',+b.dataset.b===bars));T.querySelector('.tq-fol').classList.toggle('on',!!follow);T.querySelector('.tq-fol').style.display=bars>1?'':'none';
    rb=bars>1&&playing?Math.max(0,gstep-(((gstep%64)+64)%64)):0;cur.r=Math.min(cur.r,NR()-1);const N=NR(),cs=sr();
    /* the tracks in use, drums then synths */NAV.length=0;NAV.push(...(window.trkList?trkList():TRACKS.map((_,i)=>i)),GXT);
    if(!NAV.includes(cur.t))cur.t=0;const cc=COLS(cur.t);cur.c=Math.max(0,Math.min(cc.length-1,cur.c));
    let h='<div class="tq-col tq-num"><div class="tq-hd"></div>';for(let r=0;r<N;r++)h+=`<div class="tq-r${r%4===0?' b4':''}${r%16===0&&r?' bar':''}${r===cur.r?' cl':''}" data-r="${r}">${r.toString(16).toUpperCase().padStart(2,'0')}</div>`;h+='</div>';
    (window.trkList?trkList():TRACKS.map((_,i)=>i)).forEach(i=>{const tr=TRACKS[i],p=sn.c[i],L=trkLen(i),isCur=i===cur.t,cols=COLS(i),FO=p>=0?folOf(i):null,g0=barNow();
      h+=`<div class="tq-col${isCur?' cur':''}${p<0?' tq-empty':''}${isMuted(i)?' mute':''}" data-t="${i}" style="--h:${tr.hex}"><div class="tq-hd" data-hd="${i}"><b>${p>=0?`<i style="--c:${ARR_COL[p]}">${'ABCD'[p]}</i>`:''}${(tr.name||'').toLowerCase()}</b><small>${p<0?'tomt – skriv för att skapa':FO?'följer starter · '+(FOLN[FO.m]||FO.m)+(bars>1?'':' · takt '+((((barNow()>>4)%4)+4)%4+1)):bars>1?(L<16?L:16)+' steg ↻':L<16?L+' steg':''}</small></div>`;
      const M=tr.mel&&p>=0?melRows(p,i):null;
      for(let r=0;r<N;r++){const q=stepOf(i,r);let cells='';const cu=k=>isCur&&r===cur.r&&cols[cur.c]===k?' cu':'';
        if(!tr.mel){const c=p>=0?S.pats[p][i][q]:null,on=c&&c.v>0;
          cells+=`<span class="h${on?'':' e'}${on&&c.v===2?' acc':''}${cu('h')}" data-k="h">${on?(DRN[tr.id]||'HT')+(c.v===2?'!':'·'):'---'}</span>`;
          cells+=`<span class="v${on?'':' e'}${cu('v')}" data-k="v">${on?hex((c.vel??(c.v===2?1:.72))*127):'..'}</span>`;
          let fx='...';if(on&&(c.r||1)>1)fx='R'+(c.r|0)+' ';else if(on&&(c.p??1)<1)fx='?'+String(Math.round((c.p)*100)).padStart(2,'0');
          cells+=`<span class="x${fx==='...'?' e':''}${cu('x')}" data-k="x">${fx}</span>`;
          /* (v267) sample fx: R = reverse · start 0–F · pitch ±semitones · glide / up or \\ down */
          const sx=on?sxTxt(c):'.....';cells+=`<span class="s${sx==='.....'?' e':''}${cu('s')}" data-k="s">${sx}</span>`}
        else{const subs=M?M.subs:1;for(let k=0;k<subs;k++){const o=M?M.rows[q][k]:null;if(k)cells+='<i class="sub"></i>';
            let nt='---',cl=' e',vv='..',vcl=' e';if(o&&o.t==='n'){nt=nName(o.n.n);cl='';vv=hex(o.n.v*127);vcl=''}else if(o&&o.t==='off'){nt='OFF';cl=' off'}else if(o&&o.t==='tie'){nt=' | ';cl=' tie'}
            cells+=`<span class="n${cl}${cu('n'+k)}" data-k="n${k}">${nt}</span>`;
            if(FO){let hf='   ',fc=' e';if(o&&o.t==='n'){const hn=stxFollow(FO.P,tr.id,o.n.n,bars>1?r-q+Math.floor(o.n.s+1e-6):g0+Math.floor(o.n.s+1e-6));hf=nName(hn);fc=hn===o.n.n?' same':''}cells+=`<span class="f${fc}" title="det som hörs i den här takten">${hf}</span>`}
            cells+=`<span class="v${vcl}${cu('v'+k)}" data-k="v${k}">${vv}</span>`}}
        const gh=bars>1?r>=Math.min(16,L):false;h+=`<div class="tq-r${r%4===0?' b4':''}${r%16===0&&r?' bar':''}${r===cur.r?' cl':''}${!gh&&bars===1&&r>=L?' out':''}${gh?' gh':''}${isCur&&r!==cur.r&&q===cs?' tw':''}" data-r="${r}">${cells}</div>`}
      h+='</div>'});
    /* the Starter: v215 – it writes its notes into the synth tracks' columns, so it has no column of its own any more */
    if(0){const A=sxCells(),stOn=!!sn.stx,P=stx()||{},LY=P.lay||{},off=!A||!stOn,rowCls=r=>`tq-r${r%4===0?' b4':''}${r%16===0&&r?' bar':''}${r===cur.r?' cl':''}`,gOf=r=>bars>1?r:(base64()+r)%64;
      const cell=(k,g,w)=>{const o=A&&A[k][g];if(!o)return `<span class="${w>3?'cd':'n'} e">${'---'.padEnd(w,' ')}</span>`;if(o.t==='tie')return `<span class="${w>3?'cd':'n'} tie">${' | '.padEnd(w,' ')}</span>`;return `<span class="${w>3?'cd':'n'}">${o.txt.padEnd(w,' ')}</span>`};
      const notes=(k,g,m)=>{const o=A&&A[k][g];let t='';for(let j=0;j<m;j++){const v=o&&o.t==='n'&&o.ns?o.ns[j]:null;t+=`<span class="n${v==null?' e':''}">${v==null?(o&&o.t==='tie'&&j===0?' | ':'---'):nName(v)}</span>`}return t};
      if(!sxOpen){h+=`<div class="tq-col tq-sx${off?' mute':''}" data-t="${SXT}" style="--h:#B9A6FF"><div class="tq-hd"><b><button class="tq-sxb" data-sxx title="Visa alla Starterns spår">▸</button>starter<button class="tq-sxb" data-sx title="Visa Startern ensam">◎</button></b><small>${!A?'av':!stOn?'av i scenen':'ackord · sub · topp'}</small></div>`;
        for(let r=0;r<N;r++){const g=gOf(r);h+=`<div class="${rowCls(r)}" data-r="${r}">${cell('ack',g,6)}${cell('sub',g,3)}${cell('klo',g,3)}</div>`}h+='</div>'}
      else{const L4=[['ack','ackord','#F07AB0'],['klo','topp','#6FD0C5'],['sub','sub','#B9A6FF'],['luft','luft','#A9ADB3'],['s0','röst','#F3EEDD'],['s1','ljud','#FF8A3D']];
        L4.forEach(([k,nm,col],j)=>{const sm=k[0]==='s'&&k.length===2?(P.smp||[])[+k[1]]:null,lon=sm?!!(sm&&sm.on):!!LY[k],arp=P.ls&&P.ls[k]&&P.ls[k].arp&&P.ls[k].arp.on,mx=k==='ack'||k==='luft'?Math.min(4,A?A.mx[k]:1):0;
          h+=`<div class="tq-col tq-sx${off||!lon?' mute':''}${j===0?' sx0':''}" data-t="${SXT}" style="--h:${col}"><div class="tq-hd"><b>${j===0?'<button class="tq-sxb" data-sxx title="Fäll ihop Startern">▾</button>':''}${nm}${j===0?'<button class="tq-sxb" data-sx title="Visa Startern ensam">◎</button>':''}</b><small>${!A?'starter av':!stOn?'av i scenen':!lon?'lagret är av':sm?(sm.mode==='ett'?'one-shot':'klipp'):arp?'arpeggio':'starter'}</small></div>`;
          for(let r=0;r<N;r++){const g=gOf(r);h+=`<div class="${rowCls(r)}" data-r="${r}">${k==='ack'?cell('ack',g,6)+notes('ack',g,mx):k==='luft'?notes('luft',g,mx):sm?cell(k,g,3):cell(k,g,3)}</div>`}h+='</div>'})}}
    /* glitch: the scene's pattern (A–D) or A→D over four bars; fx · value */
    {const g=gxS(),isCur=cur.t===GXT,cov={};for(let q=0;q<4;q++){const c=new Array(16).fill(null);GFX(q).forEach(e=>{for(let k=0;k<e.len&&e.s+k<16;k++)c[e.s+k]={e,first:k===0}});cov[q]=c}
      const tab=k=>`<i data-gp="${k}" class="${g.len===16&&g.p===k?'on':''}${GFX(k).length?' has':''}">${'ABCD'[k]}</i>`;
      h+=`<div class="tq-col tq-gx${isCur?' cur':''}${g.len===16&&g.p<0?' tq-empty':''}" data-t="${GXT}" style="--h:#E2F53C"><div class="tq-hd"><b>glitch</b><small><span class="tq-gl" title="Glitch-mönster för scenen: ett av A–D (16 steg som loopar) eller A→D (en takt var, 64 steg)">${[0,1,2,3].map(tab).join('')}<i data-gp="64" class="${g.len===64?'on':''}">A→D</i></span></small></div>`;
      for(let r=0;r<N;r++){const at=gxAt(r),o=at.q>=0?cov[at.q][at.s]:null,gh=g.len===16&&bars>1&&r>=16;let val='..',vc=' e';
        if(o&&o.first){const P=GXP[o.e.fx-1];val=P.t[gxIdxShown(o.e.fx,o.e.v,o.e.sl)];vc=o.e.v!=null?'':' dv'}
        const lab=g.len===64&&r%16===0?`<b class="tq-gq">${'ABCD'[at.q]}</b>`:'';
        h+=`<div class="tq-r${r%4===0?' b4':''}${r%16===0&&r?' bar':''}${r===cur.r?' cl':''}${gh?' gh':''}" data-r="${r}">${lab}<span class="g${o?'':' e'}${isCur&&r===cur.r&&cur.c===0?' cu':''}" data-k="g" style="${o?'--gc:'+GXS_COL[o.e.fx-1]:''}">${o?(o.first?GXN[o.e.fx-1]:' | '):'---'}</span><span class="w${vc}${isCur&&r===cur.r&&cur.c===1?' cu':''}" data-k="w">${String(val).padEnd(3,' ')}</span></div>`}
      h+='</div>';
      /* the glitch card follows the tracker only when you move or change something in the tracker's glitch column, not on every redraw:
         otherwise picking D in the card jumped straight back to the scene's pattern, and edits landed in that one */
      if(window.GXC&&isCur){const at=gxAt(cur.r),k=cur.r+':'+g.p+':'+g.len+':'+(CLX.sel.r|0);if(at.q>=0&&k!==gxSyncK){gxSyncK=k;window.GXC.p=at.q}}else gxSyncK=''}
    body.innerHTML=h;fit();hdBuild();live(true);/* v216: the view only follows the cursor when the cursor moved – a redraw (a new bar, a change elsewhere) keeps where you scrolled */const cuK=cur.t+':'+cur.c+':'+cur.r+':'+(CLX.sel.r|0),cu=cuK!==render._cuK?body.querySelector('span.cu'):null;render._cuK=cuK;if(cu){const a=cu.getBoundingClientRect(),b=sc.getBoundingClientRect(),nw=(body.querySelector('.tq-num')||{}).offsetWidth||0;if(a.left<b.left+nw)sc.scrollLeft-=b.left+nw-a.left+8;else if(a.right>b.right)sc.scrollLeft+=a.right-b.right+8;if(a.top<b.top+32)sc.scrollTop-=b.top+32-a.top;else if(a.bottom>b.bottom-(T._padRes||0))sc.scrollTop+=a.bottom-b.bottom+(T._padRes||0)}}
  /* rows as tall as the space allows (16 rows + header), between 14 and 22 px */
  const fit=()=>{const H=sc.clientHeight;if(!H)return;const full=D.classList.contains('tqfull'),rh=bars>1?Math.max(full?15:14,Math.min(full?20:17,Math.floor((H-32)/NR()))):Math.max(14,Math.min(22,Math.floor((H-32)/16)));body.style.setProperty('--rh',rh+'px')};
  /* the play line: per track, only when the track plays this very clip */
  let lastPl='',lastBar=0;function live(force){const gstep=(()=>{const v=window.__visG?__visG():-1;return v>=0?v:(typeof window.gstepRef==='number'?window.gstepRef:0)})();if(!ARR.open||mode!=='tracker'||!D.classList.contains('clipv'))return;const sn=scene(),on=playing,V=CLX.vis,cm=clp().on;const pl=[];
    TRACKS.forEach((_,i)=>{const p=sn.c[i];let row=-1;if(on&&p>=0){const plays=cm?(V&&V.play[i]===p):S.pat===p;if(plays){const L=trkLen(i),g=((gstep%16)+16)%16;row=bars>1?((gstep%64)+64)%64:L<16?((gstep%L)+L)%L:g}}pl.push(row)});
    {const row=on?(bars>1?((gstep%64)+64)%64:((gstep%16)+16)%16):-1,P=stx();pl.push(P&&P.on&&(!cm||(V&&V.stx))?row:-1);pl.push(cm&&(gxS().len===64||gxS().p>=0)?row:-1)}
    const bk=bars>1?(playing&&TRACKS.some((_,i)=>trkLen(i)<16)?gstep>>6:0):(TRACKS.some((_,i)=>folOf(i))||(stx()&&stx().on)||gxS().len===64)?barNow():0;if(!force&&bk!==lastBar){lastBar=bk;render();return}const gRow=on?(bars>1?((gstep%64)+64)%64:((gstep%16)+16)%16):-1;const key=pl.join(',')+'|'+gRow;if(!force&&key===lastPl)return;lastPl=key;
    body.querySelectorAll('.tq-r.pl,.tq-r.pg').forEach(e=>e.classList.remove('pl','pg','hit'));
    pl.forEach((row,i)=>{if(row<0){if(gRow>=0)body.querySelectorAll(`.tq-col[data-t="${i}"] .tq-r[data-r="${gRow}"]`).forEach(el=>el.classList.add('pg'));return}
      body.querySelectorAll(`.tq-col[data-t="${i}"] .tq-r[data-r="${row}"]`).forEach(el=>{el.classList.add('pl');
        /* lit when this row starts something: a note, a drum hit, a chord or a glitch (not an empty step, a held note or an off) */
        const sp=el.querySelector('span:not(.e):not(.tie)');if(sp&&!/^(\s*|\s*\|\s*|-+|off)$/i.test(sp.textContent.trim())&&!el.closest('.tq-col.mute'))el.classList.add('hit')})});
    const any=pl.find(r=>r>=0);if(any!=null&&any>=0){const el=body.querySelector(`.tq-num .tq-r[data-r="${any}"]`);if(el){el.classList.add('pl');
      /* follow: keep the play line in view */
      if(follow&&bars>1&&playing){const top=el.offsetTop,H=sc.clientHeight;if(top<sc.scrollTop+4||top>sc.scrollTop+H-40)sc.scrollTop=Math.max(0,top-20)}}}}

  /* ---------- editing ---------- */
  const PN=()=>(S.pats||[]).length||4;
  const clHas=(p,i)=>{const tr=TRACKS[i];return tr.mel?R_(p,i).length>0:(S.pats[p][i]||[]).some(c=>c&&c.v>0)};
  /* typing into an empty slot makes a clip there: the first pattern of the track no scene uses (empty ones first) */
  function ensureClip(i){const sn=scene();if(sn.c[i]>=0)return sn.c[i];const used=new Set(clp().sc.map(s=>s.c[i]).filter(v=>v>=0));let np=-1;
    for(let p=0;p<PN();p++)if(!used.has(p)&&!clHas(p,i)){np=p;break}if(np<0)for(let p=0;p<PN();p++)if(!used.has(p)){np=p;break}
    if(np<0){toast('Alla fyra mönster för '+TRACKS[i].name.toLowerCase()+' används redan');return -1}
    sn.c[i]=np;return np}
  /* the step row of a melodic track follows its notes (the sequencer and the step grid read it) */
  function syncStep(p,i,r){const R=R_(p,i),ns=notesAt(R,r),c=S.pats[p][i][r];if(!ns.length){c.v=0;return}c.v=ns.some(n=>n.v>=.95)?2:1;c.n=Math.min(...ns.map(n=>n.n))}
  const preview=(i,vel,n)=>{if(playing)return;try{initAudio();ctx.resume();trigger(i,ctx.currentTime+.01,vel,n,TRACKS[i].mel?2:1)}catch(e){globalThis.__el&&globalThis.__el(e)}};
  const done=()=>{save();render();try{window.clPaint(true)}catch(e){globalThis.__el&&globalThis.__el(e)}};
  const move=dr=>{const N=NR();cur.r=((cur.r+dr)%N+N)%N};
  function noteIn(n){const i=cur.t,tr=TRACKS[i],k=COLS(i)[cur.c]||'';
    if(!tr.mel){if(k!=='h')return false;try{pushHist()}catch(e){globalThis.__el&&globalThis.__el(e)}const p=ensureClip(i);if(p<0)return true;const c=S.pats[p][i][sr()];if(!c.v)c.v=1;preview(i,c.vel??(c.v===2?1:.72));move(estep);done();return true}
    if(k[0]!=='n')return false;try{pushHist()}catch(e){globalThis.__el&&globalThis.__el(e)}const p=ensureClip(i);if(p<0)return true;const col=+k.slice(1),Lw=lay(p,i),R=Lw.R,r=sr();
    const inCol=R.map((m,j)=>({m,j})).filter(o=>Lw.col[o.j]===col).map(o=>o.m).sort((a,b)=>a.s-b.s);
    const here=inCol.find(m=>Math.floor(m.s+1e-6)===r);
    if(here){here.n=n}else{const prev=inCol.filter(m=>m.s<r&&m.s+m.l>r+1e-6).pop(),next=inCol.find(m=>m.s>r),nx=next?next.s:16;
      let end=prev?Math.min(nx,prev.s+prev.l):nx;if(prev)prev.l=r-prev.s;if(!prev)end=nx;
      R.push({s:r,l:Math.max(.25,end-r),n,v:lastVel,tc:col})}
    syncStep(p,i,r);preview(i,(here?here.v:lastVel),n);move(estep);done();return true}
  function offIn(){const i=cur.t,tr=TRACKS[i],k=COLS(i)[cur.c]||'';if(!tr.mel||k[0]!=='n')return false;const p=pOf(i);if(p<0)return true;try{pushHist()}catch(e){globalThis.__el&&globalThis.__el(e)}
    const col=+k.slice(1),Lw=lay(p,i),R=Lw.R,r=sr(),inCol=R.filter((m,j)=>Lw.col[j]===col).sort((a,b)=>a.s-b.s);
    const here=inCol.find(m=>Math.floor(m.s+1e-6)===r);if(here){R.splice(R.indexOf(here),1);syncStep(p,i,r)}
    const prev=inCol.filter(m=>m!==here&&m.s<r&&m.s+m.l>r+1e-6).pop();if(prev)prev.l=r-prev.s;move(estep);done();return true}
  function del(){const i=cur.t,tr=TRACKS[i],k=COLS(i)[cur.c]||'',p=pOf(i);if(p<0)return true;try{pushHist()}catch(e){globalThis.__el&&globalThis.__el(e)}
    if(!tr.mel){const c=S.pats[p][i][sr()];if(k==='h'){c.v=0}else if(k==='v'){delete c.vel}else if(k==='x'){delete c.r;delete c.p}else if(k==='s'){delete c.so;delete c.rv;delete c.pt;delete c.gl}move(estep);done();return true}
    const col=+k.slice(1),Lw=lay(p,i),R=Lw.R,r=sr(),inCol=R.filter((m,j)=>Lw.col[j]===col).sort((a,b)=>a.s-b.s),here=inCol.find(m=>Math.floor(m.s+1e-6)===r);
    if(k[0]==='v'){if(here)here.v=.8}
    else if(here){R.splice(R.indexOf(here),1);syncStep(p,i,r)}
    else{const M=melRows(p,i).rows[r][col];if(M&&M.t==='off'){const nx=inCol.find(m=>m.s>M.n.s);M.n.l=(nx?nx.s:16)-M.n.s}}
    move(estep);done();return true}
  function volIn(d){const i=cur.t,tr=TRACKS[i],k=COLS(i)[cur.c]||'';if(k[0]!=='v')return false;const p=pOf(i);if(p<0)return true;
    /* two hex digits: the first sets the high one, the next (on the same cell) the low one */
    const ck=cur.t+':'+cur.r+':'+cur.c,fold=old=>{let v;if(vPend&&vPend.k===ck){v=vPend.hi*16+d;vPend=null}else{v=d*16+(Math.round(old*127)&15);vPend={k:ck,hi:d}}return Math.max(1,Math.min(127,v))};
    if(!tr.mel){const c=S.pats[p][i][sr()];if(!c.v)return true;try{pushHist()}catch(e){globalThis.__el&&globalThis.__el(e)}c.vel=fold(c.vel??(c.v===2?1:.72))/127;done();return true}
    const col=+k.slice(1),Lw=lay(p,i),here=Lw.R.find((m,j)=>Lw.col[j]===col&&Math.floor(m.s+1e-6)===sr());if(!here)return true;try{pushHist()}catch(e){globalThis.__el&&globalThis.__el(e)}
    here.v=Math.max(.05,fold(here.v)/127);lastVel=here.v;syncStep(p,i,sr());done();return true}
  /* (v267) sample fx on a drum step: start position (0–F = sixteenths of the sound), reverse, pitch and glide (semitones) */
  const H1=x=>Math.abs(x).toString(16).toUpperCase();
  function sxTxt(c){if(!(c.so||c.rv||c.pt||c.gl))return '.....';return (c.rv?'R':'.')+(c.so?H1(c.so):'.')+(c.pt?(c.pt>0?'+':'-')+H1(Math.min(15,Math.abs(c.pt))):'..')+(c.gl?(c.gl>0?'/':'\\'):'.')}
  function sIn(what,d){const i=cur.t,tr=TRACKS[i],k=COLS(i)[cur.c]||'';if(tr.mel||k!=='s')return false;const p=pOf(i);if(p<0)return true;const c=S.pats[p][i][sr()];if(!c.v){toast('Put a hit on the step first');return true}try{pushHist()}catch(e){globalThis.__el&&globalThis.__el(e)}
    const smp=S.dk&&S.dk[tr.id]&&String(S.dk[tr.id]).startsWith('smp:');
    if(what==='rv'){if(c.rv)delete c.rv;else c.rv=1}else if(what==='so'){if(d)c.so=d;else delete c.so}
    else if(what==='pt'){const n=Math.max(-12,Math.min(12,(c.pt||0)+d));if(n)c.pt=n;else delete c.pt;toast('pitch '+(n>0?'+':'')+n+' st')}
    else if(what==='gl'){const n=Math.max(-12,Math.min(12,(c.gl||0)+d));if(n)c.gl=n;else delete c.gl;toast('glide '+(n>0?'+':'')+n+' st')}
    if(!smp&&what!=='pt')toast('Start, reverse and glide work when the drum plays a sample · pitch works on all');
    try{const sp=S.dk&&S.dk[tr.id];if(sp&&String(sp).startsWith('smp:')){initAudio();ctx.resume();SFX=c;trigger(i,ctx.currentTime+.005,c.vel??(c.v===2?1:.72),c.n);SFX=null}else if(what==='pt'){initAudio();ctx.resume();SFX=c;trigger(i,ctx.currentTime+.005,c.vel??.72,c.n);SFX=null}}catch(e){SFX=null}
    done();return true}
  function fxIn(key){const i=cur.t,tr=TRACKS[i],k=COLS(i)[cur.c]||'';if(tr.mel||k!=='x')return false;const p=pOf(i);if(p<0)return true;const c=S.pats[p][i][sr()];if(!c.v)return true;try{pushHist()}catch(e){globalThis.__el&&globalThis.__el(e)}
    if(key==='r'){const n=((c.r||1)%4)+1;if(n>1)c.r=n;else delete c.r}else{const L=[1,.75,.5,.25],j=L.indexOf(c.p??1),n=L[(j+1)%L.length];if(n<1)c.p=n;else delete c.p}done();return true}
  /* glitch: 1–7 = stutter roll rev stop halv crush gate; the same number on the next row makes the block longer; Del removes */
  /* 1–7 in the fx column = stutter roll rev stop halv crush gate (the same number on the next row makes it longer); in the value
     column a number picks the value (1 = the first, e.g. roll 1/8 · 2 = 1/16 · 3 = 1/32); Del removes */
  const gxTarget=()=>{const g=gxS();let at=gxAt(cur.r);if(at.q<0){const free=[0,1,2,3].find(k=>!GFX(k).length&&!clp().sc.some(x=>x.gx&&x.gx.p===k));g.p=free!=null?free:0;at=gxAt(cur.r)}return at};
  function gxPut(fx){try{pushHist()}catch(e){globalThis.__el&&globalThis.__el(e)}const at=gxTarget(),B=GFX(at.q),pos=at.s;
    for(let k=B.length-1;k>=0;k--){const b=B[k];if(pos>=b.s&&pos<b.s+b.len){if(b.s===pos)B.splice(k,1);else b.len=pos-b.s}}
    const prev=B.find(b=>b.fx===fx&&b.s+b.len===pos);if(prev)prev.len++;else B.push({s:pos,fx,len:1,sl:GXS_SL[fx-1]});B.sort((a,b)=>a.s-b.s);move(estep);done()}
  function gxDel(){const at=gxAt(cur.r);if(at.q<0)return;const B=GFX(at.q),pos=at.s,k=B.findIndex(b=>pos>=b.s&&pos<b.s+b.len);if(k>=0){try{pushHist()}catch(e){globalThis.__el&&globalThis.__el(e)}const b=B[k];if(b.s===pos)B.splice(k,1);else b.len=pos-b.s}move(estep);done()}
  const gxBlock=()=>{const at=gxAt(cur.r);if(at.q<0)return null;return GFX(at.q).find(b=>at.s>=b.s&&at.s<b.s+b.len)||null};
  function gxVal(d){const b=gxBlock();if(!b){toast('Skriv en glitch (1–7) först');return}const P=GXP[b.fx-1];if(d<1||d>P.l.length){toast(GX_NAMES[b.fx-1]+': 1–'+P.l.length+' ('+P.l.join(' · ')+')');return}
    try{pushHist()}catch(e){globalThis.__el&&globalThis.__el(e)}b.v=d-1;toast(GX_NAMES[b.fx-1]+' · '+P.l[b.v]+(P.u||''));done()}
  function gxValDel(){const b=gxBlock();if(b&&b.v!=null){try{pushHist()}catch(e){globalThis.__el&&globalThis.__el(e)}delete b.v;done()}move(estep);render()}
  function gxPick(v){try{pushHist()}catch(e){globalThis.__el&&globalThis.__el(e)}const g=gxS();if(v===64){g.len=64}else{if(g.len===16&&g.p===v)g.p=-1;else{g.p=v;g.len=16}}
    if(window.GXC){const q=g.len===64?gxAt(cur.r).q:g.p;if(q>=0)window.GXC.p=q}
    toast(g.len===64?'Glitch A→B→C→D, en takt var':g.p<0?'Ingen glitch i scenen':'Glitch '+'ABCD'[g.p]);done()}
  /* the Starter on its own, in the middle, everything else blurred */
  const fo=document.createElement('div');fo.className='sxf';fo.hidden=true;fo.innerHTML='<div class="sxf-in"></div><button class="sxf-x" aria-label="Stäng">stäng ×</button>';document.body.appendChild(fo);let foMark=null;
  function sxFocus(on){const c=document.querySelector('.card[data-card="starter"]');if(!c)return;
    if(on&&fo.hidden){foMark=document.createComment('sxf');c.before(foMark);fo.querySelector('.sxf-in').appendChild(c);fo.hidden=false;requestAnimationFrame(()=>fo.classList.add('show'))}
    else if(!on&&!fo.hidden){fo.classList.remove('show');if(foMark&&foMark.parentNode)foMark.replaceWith(c);foMark=null;fo.hidden=true;setTimeout(()=>{if(ARR.open)T.focus()},0)}
    setTimeout(()=>{dispatchEvent(new Event('resize'));try{if(window.stxPaint)stxPaint(true)}catch(e){globalThis.__el&&globalThis.__el(e)}},40)}
  fo.addEventListener('mousedown',e=>{if(e.target===fo||e.target.closest('.sxf-x'))sxFocus(false)});
  addEventListener('keydown',e=>{if(!fo.hidden&&e.key==='Escape'){e.preventDefault();e.stopPropagation();sxFocus(false)}},true);
  window.sxFocus=sxFocus;
  /* the tracker on the whole screen: the clips and the side panel step aside (the transport bar stays) */
  function tqFull(on){D.classList.toggle('tqfull',!!on);{const cb=D.querySelector('.dw-top [data-a="close"]');if(cb){if(on&&!cb.dataset.lab)cb.dataset.lab=cb.textContent;cb.textContent=on?'⤡ tillbaka till studion':(cb.dataset.lab||'stäng ×')}}const b=T.querySelector('[data-fs]');if(b){b.textContent=on?'⤡ tillbaka':'⤢ hela skärmen';b.classList.toggle('on',!!on)}
    setTimeout(()=>{fit();render();T.focus()},30)}
  /* leaving full screen always lands in the DAW: esc (a held or doubled esc is swallowed for a moment) or the top close button, which says "tillbaka" meanwhile */
  let escT=0;
  addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(D.classList.contains('tqfull')&&fo.hidden){e.preventDefault();e.stopPropagation();escT=Date.now();tqFull(false);return}
    if(ARR.open&&(e.repeat||Date.now()-escT<700)){e.preventDefault();e.stopPropagation()}},true);
  {const cb=D.querySelector('.dw-top [data-a="close"]');if(cb){cb.addEventListener('click',e=>{if(D.classList.contains('tqfull')){e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();tqFull(false)}},true)}}
  new MutationObserver(()=>{if(D.classList.contains('tqfull')&&(!D.classList.contains('clipv')||!D.classList.contains('tqon')||D.hidden))tqFull(false)}).observe(D,{attributes:true,attributeFilter:['class','hidden']});
  window.tqFull=tqFull;
  const KEYS={KeyZ:0,KeyS:1,KeyX:2,KeyD:3,KeyC:4,KeyV:5,KeyG:6,KeyB:7,KeyH:8,KeyN:9,KeyJ:10,KeyM:11,Comma:12,KeyL:13,Period:14,
    KeyQ:12,Digit2:13,KeyW:14,Digit3:15,KeyE:16,KeyR:17,Digit5:18,KeyT:19,Digit6:20,KeyY:21,Digit7:22,KeyU:23,KeyI:24,Digit9:25,KeyO:26,Digit0:27,KeyP:28};
  const HEXK={KeyA:10,KeyB:11,KeyC:12,KeyD:13,KeyE:14,KeyF:15};
  const sel=i=>{if(i>=TRACKS.length){if(cur.t!==i){cur.t=i;cur.c=0}return}if(cur.t!==i){cur.t=i;cur.c=0}CLX.sel={r:CLX.sel.r,c:i};try{window.clPaint(true)}catch(e){globalThis.__el&&globalThis.__el(e)}};
  T.addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey||e.altKey)return;if(e.code==='Space'||e.key==='Escape')return;
    const i=cur.t,cols=COLS(i),k=cols[cur.c]||'';let ok=true;
    if(e.key==='ArrowDown')move(1);else if(e.key==='ArrowUp')move(-1);else if(e.key==='PageDown')move(4);else if(e.key==='PageUp')move(-4);else if(e.key==='Home')cur.r=0;else if(e.key==='End')cur.r=NR()-1;
    else if(e.key==='ArrowRight'){if(cur.c<cols.length-1)cur.c++;else{const j=NAV[NAV.indexOf(i)+1];if(j!=null){sel(j);cur.c=0}}}
    else if(e.key==='ArrowLeft'){if(cur.c>0)cur.c--;else{const j=NAV[NAV.indexOf(i)-1];if(j!=null){sel(j);cur.c=COLS(j).length-1}}}
    else if(e.key==='Tab'){const n=NAV.length,j=NAV[(NAV.indexOf(i)+(e.shiftKey?-1:1)+n)%n];sel(j);cur.c=0}
    else if(i===GXT){const dg=/^(Digit|Numpad)[0-9]$/.test(e.code)?+e.code.slice(-1):null,del=e.key==='Delete'||e.key==='Backspace';
      if(cur.c===0){if(dg>=1&&dg<=7)gxPut(dg);else if(del)gxDel();else ok=false}else{if(dg!=null)gxVal(dg);else if(del)gxValDel();else ok=false}}
    else if(e.code==='NumpadDivide'||(e.code==='IntlBackslash'&&!e.shiftKey)){oct=Math.max(1,oct-1)}
    else if(e.code==='NumpadMultiply'||(e.code==='IntlBackslash'&&e.shiftKey)){oct=Math.min(7,oct+1)}
    else if(e.key==='Delete'||e.key==='Backspace'){del();e.preventDefault();e.stopPropagation();return}
    else if(k[0]==='v'&&(/^Digit[0-9]$/.test(e.code)||/^Numpad[0-9]$/.test(e.code)||HEXK[e.code]!=null)){const d=HEXK[e.code]!=null?HEXK[e.code]:+e.code.slice(-1);volIn(d)}
    else if(k==='x'&&(e.code==='KeyR'||e.code==='KeyP')){fxIn(e.code==='KeyR'?'r':'p')}
    else if(k==='s'&&e.code==='KeyR'){sIn('rv')}
    else if(k==='s'&&(/^(Digit|Numpad)[0-9]$/.test(e.code)||HEXK[e.code]!=null)){sIn('so',HEXK[e.code]!=null?HEXK[e.code]:+e.code.slice(-1))}
    else if(k==='s'&&(e.code==='Minus'||e.code==='NumpadSubtract'||e.code==='Equal'||e.code==='NumpadAdd')){sIn('pt',e.code==='Minus'||e.code==='NumpadSubtract'?-1:1)}
    else if(k==='s'&&(e.code==='BracketLeft'||e.code==='BracketRight')){sIn('gl',e.code==='BracketLeft'?-1:1)}
    else if(k==='s'){ok=true}
    else if(e.code==='KeyA'||e.code==='CapsLock'){if(!offIn())ok=false}
    else if(KEYS[e.code]!=null&&!e.repeat){if(!noteIn(Math.max(24,Math.min(96,(oct+1)*12+KEYS[e.code]))))ok=false}
    else if(KEYS[e.code]!=null&&e.repeat){}
    else ok=/^(Digit|Key|Numpad|Comma|Period|Minus|Equal|Semicolon|Quote|Bracket|Backquote|IntlBackslash|Slash)/.test(e.code);
    /* while the tracker has the keyboard, plain keys never reach the pads or the other shortcuts */
    e.preventDefault();e.stopPropagation();if(ok)render()});
  T.addEventListener('mousedown',e=>{const s=e.target.closest('.tq-r span[data-k]'),hd=e.target.closest('[data-hd]');
    if(e.target.closest('[data-sxx]')){e.preventDefault();sxOpen=!sxOpen;try{localStorage.setItem('blonda.trk.sxx',sxOpen?'1':'0')}catch(_){globalThis.__el&&globalThis.__el(_)}render();return}
    if(e.target.closest('[data-sx]')){e.preventDefault();sxFocus(true);return}
    {const gl=e.target.closest('[data-gp]');if(gl&&gl.closest('.tq-gx')){e.preventDefault();gxPick(+gl.dataset.gp);setTimeout(()=>T.focus(),0);return}}
    if(hd){const i=+hd.dataset.hd;sel(i);try{select(i)}catch(_){globalThis.__el&&globalThis.__el(_)}render();setTimeout(()=>T.focus(),0);return}
    if(!s)return;const col=s.closest('.tq-col'),row=s.closest('.tq-r');if(!col||col.dataset.t==null)return;const i=+col.dataset.t;sel(i);
    cur.r=+row.dataset.r;cur.c=Math.max(0,COLS(i).indexOf(s.dataset.k));render();setTimeout(()=>T.focus(),0)});
  /* double-click on a drum hit = on / off (for the mouse) */
  T.addEventListener('dblclick',e=>{const s=e.target.closest('.tq-r span[data-k="h"]');if(!s)return;const i=cur.t;try{pushHist()}catch(_){globalThis.__el&&globalThis.__el(_)}const p=ensureClip(i);if(p<0)return;const c=S.pats[p][i][sr()];c.v=c.v?0:1;if(c.v)preview(i,.72);done()});
  T.querySelector('.tq-top').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.sxo!=null){sxFocus(true);return}if(b.dataset.fs!=null){tqFull(!D.classList.contains('tqfull'));return}if(b.dataset.u){b.dataset.u==='u'?undo():redo();T.focus();return}if(b.dataset.b){bars=+b.dataset.b;try{localStorage.setItem('blonda.trk.bars',bars)}catch(_){globalThis.__el&&globalThis.__el(_)}cur.r=Math.min(cur.r,NR()-1)}if(b.dataset.f!=null)follow=follow?0:1;if(b.dataset.o)oct=Math.max(1,Math.min(7,oct+ +b.dataset.o));if(b.dataset.e)estep=Math.max(0,Math.min(8,estep+ +b.dataset.e));render();T.focus()});

  /* follow the clip grid: picking a clip moves the cursor to its track; any change elsewhere redraws */
  let seen='';const tick=()=>{if(ARR.open&&mode==='tracker'&&D.classList.contains('clipv')){const k=(CLX.sel.r|0)+':'+CLX.sel.c;if(k!==seen){seen=k;if(CLX.sel.c>=0&&CLX.sel.c<TRACKS.length&&CLX.sel.c!==cur.t){cur.t=CLX.sel.c;cur.c=0}render()}else live()}requestAnimationFrame(tick)};requestAnimationFrame(tick);
  {const _ra=renderAll;renderAll=function(){const r=_ra.apply(this,arguments);try{gxPaintBig()}catch(e){globalThis.__el&&globalThis.__el(e)}if(ARR.open&&mode==='tracker'){clearTimeout(render._t);render._t=setTimeout(render,70)}return r}}
  addEventListener('resize',()=>{if(ARR.open)fit()});
  new MutationObserver(()=>render()).observe(D,{attributes:true,attributeFilter:['class']});
  /* playback in clip mode: the playing scene's glitch pattern (or A→D, a bar each); outside clip mode the pattern's, as before */
  {const _gf=gxFill;gxFill=function(ps,sd){try{const C=clp();if(C.on&&window.CLIPP&&playing){const r=CLX.cur>=0?CLX.cur:CLX.last,g=gxOf(r);if(!g)return;
      const q=g.len===64?((gstep>>4)&3):g.p;if(q<0)return;const B=GFX(q);if(!B.length)return;if(GX.hs.length)return;if(!GX.node){gxInit();return}const sr=ctx.sampleRate;
      B.forEach(e=>{if(e.s!==ps)return;const a=gxArgs(e.fx,e.v,sd,e.sl||.5);GX.node.port.postMessage({t:'q',fx:e.fx,start:Math.round(nextT*sr),len:Math.round(e.len*sd*sr),slice:a.slice,p:a.p});GX.end=nextT+e.len*sd;GX.show={fx:e.fx,t0:nextT,t1:GX.end}});
      if(window.GXC)window.GXC.playing=q;return}}catch(e){globalThis.__el&&globalThis.__el(e)}
    return _gf.apply(this,arguments)}}
  {const h=document.querySelector('.card[data-card="glitch"] .gxs-h');if(h){const n=document.createElement('span');n.className='gxs-clipnote';h.querySelector('.gxs-p').after(n);
    setInterval(()=>{const on=clp().on;n.textContent=on?'· clips: scenen väljer glitch-mönster i trackern':'';n.hidden=!on},500)}}
  /* drag the seams: between the clips (or the song timeline) and what is under it, and between the tracker and the panel on the right.
     Double-click a seam = back to the default. Remembered per browser. */
  {const st=document.createElement('style');st.textContent=`
.dw-hs{flex:none;height:10px;margin:-6px 0;position:relative;z-index:3;cursor:row-resize;touch-action:none}
.dw-hs::after{content:"";position:absolute;left:50%;top:50%;width:46px;height:4px;margin:-2px 0 0 -23px;border-radius:var(--dk-r2);background:rgba(var(--dk-ink),.16);transition:background .15s,width .15s}
.dw-hs:hover::after,.dw-hs.drag::after{background:var(--dk-acc);width:70px}
.daw.tqfull .dw-hs{display:none}
.daw.has-clpH .dw-clp{max-height:none!important;height:var(--clpH)}
.daw.has-arrH .dw-arr{max-height:none!important;height:var(--arrH)}
.dw-main{position:relative}
.dw-vs{position:absolute;top:0;bottom:0;width:12px;margin-left:-6px;z-index:4;cursor:col-resize;touch-action:none;display:none}
.daw.clipv.tqon:not(.tqfull) .dw-vs{display:block}
.dw-vs::after{content:"";position:absolute;left:50%;top:50%;width:4px;height:46px;margin:-23px 0 0 -2px;border-radius:var(--dk-r2);background:rgba(var(--dk-ink),.16);transition:background .15s,height .15s}
.dw-vs:hover::after,.dw-vs.drag::after{background:var(--dk-acc);height:70px}
.daw.clipv.tqon.has-tqW:not(.tqfull) .dw-main{grid-template-columns:min(max(360px,var(--tqW)),calc(100% - 352px)) minmax(340px,1fr)!important}
body.dw-dragging,body.dw-dragging *{cursor:inherit!important;user-select:none!important}
/* the master never squeezes: wherever it is shown (main view, studio panel) and however narrow, the bus lanes, the mastering chain and
   the effect tiles wrap onto new rows instead of letting knobs and numbers run into each other */
.card.master.mx2 .m2{container-type:inline-size}
.card.master.mx2 .m2-lanes{grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}
.card.master.mx2 .m2-fx .ptiles{grid-template-columns:repeat(auto-fit,minmax(120px,1fr))!important}
@container (max-width:540px){.card.master.mx2 .m2-chain{grid-template-columns:1fr 1fr}.card.master.mx2 .m2-tile+.m2-tile::before{display:none}}`;document.head.appendChild(st)}
  {const LSK='blonda.studio.split',get=()=>{try{return JSON.parse(localStorage.getItem(LSK)||'{}')}catch(e){return {}}},put=o=>{try{localStorage.setItem(LSK,JSON.stringify(o))}catch(e){globalThis.__el&&globalThis.__el(e)}};
    const main=D.querySelector('.dw-main'),hs=document.createElement('div');hs.className='dw-hs';hs.title='Dra för att ändra storlek · dubbelklick = standard';main.before(hs);
    const vs=document.createElement('div');vs.className='dw-vs';vs.title=hs.title;main.appendChild(vs);
    const apply=()=>{const o=get();
      if(o.clpH){D.style.setProperty('--clpH',o.clpH+'px');D.classList.add('has-clpH')}else D.classList.remove('has-clpH');
      if(o.arrH){D.style.setProperty('--arrH',o.arrH+'px');D.classList.add('has-arrH')}else D.classList.remove('has-arrH');
      if(o.tqF){D.style.setProperty('--tqW',(o.tqF*100).toFixed(3)+'%');D.classList.add('has-tqW')}else if(o.tqW){D.style.setProperty('--tqW',o.tqW+'px');D.classList.add('has-tqW')}else D.classList.remove('has-tqW');placeV()};
    const top=()=>D.classList.contains('clipv')?D.querySelector('.dw-clp'):D.querySelector('.dw-arr');
    const placeV=()=>{if(!ARR.open)return;const r=T.getBoundingClientRect(),m=main.getBoundingClientRect();if(!r.width)return;vs.style.left=(r.right-m.left+6)+'px'};
    const done2=()=>{dispatchEvent(new Event('resize'));setTimeout(()=>{fit();render();placeV()},30)};
    const drag=(el,axis,onMove,onEnd)=>{el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);el.classList.add('drag');document.body.classList.add('dw-dragging');document.body.style.cursor=axis==='y'?'row-resize':'col-resize';
        const s0={x:e.clientX,y:e.clientY},mv=ev=>onMove(ev.clientX-s0.x,ev.clientY-s0.y,s0),up=()=>{el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);el.classList.remove('drag');document.body.classList.remove('dw-dragging');document.body.style.cursor='';onEnd()};
        el.addEventListener('pointermove',mv);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);onMove(0,0,s0,true)})};
    /* up/down: the top section's height */
    let h0=0,o=null;drag(hs,'y',(dx,dy,s0,first)=>{const t=top();if(!t)return;if(first){h0=t.getBoundingClientRect().height;o=get();return}
        const maxH=D.clientHeight-44-10-160,h=Math.round(Math.max(120,Math.min(maxH,h0+dy))),k=D.classList.contains('clipv')?'clpH':'arrH';o[k]=h;D.style.setProperty('--'+k,h+'px');D.classList.add('has-'+k);fit()},
      ()=>{if(o)put(o);done2()});
    hs.addEventListener('dblclick',()=>{const x=get();delete x[D.classList.contains('clipv')?'clpH':'arrH'];put(x);apply();done2()});
    /* left/right: the tracker's width */
    let w0=0,o2=null;drag(vs,'x',(dx,dy,s0,first)=>{if(first){w0=T.getBoundingClientRect().width;o2=get();return}
        const W=main.clientWidth,w=Math.round(Math.max(360,Math.min(W-340-12,w0+dx)));delete o2.tqW;o2.tqF=Math.round(w/W*10000)/10000;D.style.setProperty('--tqW',(o2.tqF*100).toFixed(3)+'%');D.classList.add('has-tqW');placeV();fit()},
      ()=>{if(o2)put(o2);done2()});
    vs.addEventListener('dblclick',()=>{const x=get();delete x.tqW;delete x.tqF;put(x);apply();done2()});
    new ResizeObserver(placeV).observe(T);addEventListener('resize',placeV);
    new MutationObserver(()=>setTimeout(placeV,20)).observe(D,{attributes:true,attributeFilter:['class']});
    apply()}
  /* ================= (v264, v265: bigger arrows, bigger still in full screen) touch keys: on the iPad (no keyboard) a tap on a cell opens two small panels over the bottom corners of
     the tracker, like a game controller – the arrows, delete and close to the left, and to the right what the column takes: a real
     piano (one octave, octave −/+, OFF, chord), volume 0–F, hit, ratchet/chance, glitch 1–7. Each button sends the key the tracker
     already understands, so it does exactly what the keyboard does. "chord" keeps the row: every note goes into the next free
     column of the same row (up to 8), and ↓ then goes to the next step's first column. ================= */
  {const PCSS=document.createElement('style');PCSS.textContent=`
.tq{position:relative}
.tq-pad{position:absolute;left:10px;right:10px;bottom:10px;z-index:80;display:flex;justify-content:space-between;align-items:flex-end;gap:10px;pointer-events:none;font-family:var(--f-mono)}
.tq-pad[hidden]{display:none}
.tq-pad .tp-p{pointer-events:auto;display:grid;gap:4px;padding:8px;border-radius:16px;background:color-mix(in srgb,var(--dk-p1) 90%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:0 10px 28px rgba(0,0,0,.4),inset 0 0 0 1px rgba(var(--dk-ink),.1)}
.tq-pad button{min-width:0;height:auto;padding:0 3px;border-radius:var(--dk-r);font-size:12px!important;background:var(--dk-p2)!important;box-shadow:inset 0 0 0 1px rgba(var(--dk-ink),.16);color:rgb(var(--dk-ink));touch-action:manipulation;-webkit-user-select:none;user-select:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tq-pad button:active{background:var(--dk-p4)!important}
.tq-pad button.bk{background:rgba(0,0,0,.42)!important}.tq-pad button.bk:active{background:rgba(0,0,0,.25)!important}
.tq-pad button.sm{font-size:10px!important;letter-spacing:.03em}
.tq-pad button.on{background:#E9C54A!important;color:#17181A;box-shadow:none}
.tq-pad .tp-nav{grid-template-columns:repeat(3,54px) 66px;grid-template-rows:50px 50px}
.daw.tqfull .tq-pad .tp-nav{grid-template-columns:repeat(3,66px) 78px;grid-template-rows:62px 62px;gap:6px}
.daw.tqfull .tq-pad .tp-nav [data-c^=Arrow]{font-size:22px!important}
.tq-pad .tp-nav [data-c=ArrowUp]{grid-area:1/2}.tq-pad .tp-nav [data-c=ArrowLeft]{grid-area:2/1}.tq-pad .tp-nav [data-c=ArrowDown]{grid-area:2/2}.tq-pad .tp-nav [data-c=ArrowRight]{grid-area:2/3}
.tq-pad .tp-nav [data-c=Delete]{grid-area:1/4}.tq-pad .tp-nav [data-x]{grid-area:2/4}.tq-pad .tp-nav [data-c^=Arrow]{font-size:18px!important}
.tq-pad .tp-pno{grid-template-columns:46px repeat(14,21px) 56px;grid-template-rows:42px 42px}
.tq-pad .tp-grid{grid-template-columns:repeat(var(--n,8),44px);grid-auto-rows:40px}
.tq-pad .tp-grid.wide{grid-template-columns:repeat(var(--n,2),88px)}
.tq-pad .tp-grid.tp-sx{grid-template-columns:repeat(8,52px)}.tq-pad .tp-sx button.sm{font-size:10px!important;padding:0 2px}
.tq-top button.tq-kb.on{box-shadow:inset 0 0 0 1px rgba(var(--dk-acc-rgb),.7)}
html:not(.coarse) .tq-top button.tq-kb{display:none}`;document.head.appendChild(PCSS);
    const pad=document.createElement('div');pad.className='tq-pad';pad.hidden=true;T.appendChild(pad);
    const kb=document.createElement('button');kb.className='tq-kb';kb.title='Touch keys';kb.textContent='keys';const tt=T.querySelector('.tq-top b.tq-ttl');if(tt)tt.after(kb);
    /* the piano: white keys on the lower row, black keys between them above (half-width columns), octave to the left, chord to the right */
    const PK=[['C','KeyZ',2,2],['C#','KeyS',1,3],['D','KeyX',2,4],['D#','KeyD',1,5],['E','KeyC',2,6],['F','KeyV',2,8],['F#','KeyG',1,9],['G','KeyB',2,10],['G#','KeyH',1,11],['A','KeyN',2,12],['A#','KeyJ',1,13],['B','KeyM',2,14]];
    const HX=['Digit0','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','KeyA','KeyB','KeyC','KeyD','KeyE','KeyF'];
    let chord=false,last='';
    const B=(lab,code,key,cls,st)=>`<button data-c="${code}" data-k="${key||''}"${cls?' class="'+cls+'"':''}${st?' style="'+st+'"':''}>${lab}</button>`;
    const send=(code,key)=>{T.dispatchEvent(new KeyboardEvent('keydown',{code,key:key||'',bubbles:true,cancelable:true}))};
    const kind=()=>{const i=cur.t;if(i===GXT)return cur.c===0?'g':'w';return (COLS(i)[cur.c])||''};
    function paint(){if(pad.hidden)return;const k=kind();let right='';
      if(k==='g')right=`<div class="tp-p tp-grid" style="--n:4">${GX_NAMES.map((n,j)=>B((j+1)+' '+n,'Digit'+(j+1),'','sm')).join('')}</div>`;
      else if(k==='w')right=`<div class="tp-p tp-grid" style="--n:5">${[1,2,3,4,5].map(n=>B(n,'Digit'+n)).join('')}</div>`;
      else if(k[0]==='n')right=`<div class="tp-p tp-pno">${B('oct +','NumpadMultiply','','sm','grid-area:1/1')}${B('oct −','NumpadDivide','','sm','grid-area:2/1')}${PK.map(([n,c,r,col])=>B(n,c,'',r===1?'bk':'','grid-area:'+r+'/'+col+'/'+(r+1)+'/'+(col+2))).join('')}${B('OFF','KeyA','','sm','grid-area:1/7/2/9')}<button class="sm${chord?' on':''}" data-ch style="grid-area:1/16/3/17">chord</button></div>`;
      else if(k[0]==='v')right=`<div class="tp-p tp-grid" style="--n:8">${HX.map((c,j)=>B(j.toString(16).toUpperCase(),c)).join('')}</div>`;
      else if(k==='h')right=`<div class="tp-p tp-grid wide" style="--n:1">${B('hit','KeyZ')}</div>`;
      else if(k==='x')right=`<div class="tp-p tp-grid wide" style="--n:2">${B('ratchet','KeyR')}${B('chance','KeyP')}</div>`;
      else if(k==='s')right=`<div class="tp-p tp-grid tp-sx" style="--n:8">${B('reverse','KeyR','','sm','grid-column:span 2')}${B('pitch −','Minus','','sm')}${B('pitch +','Equal','','sm')}${B('glide ↓','BracketLeft','','sm')}${B('glide ↑','BracketRight','','sm')}<span class="tp-lab2" style="grid-column:span 2;align-self:center;font-size:9px;letter-spacing:.06em;opacity:.55;text-align:center">START</span>${HX.map((c,j)=>B(j.toString(16).toUpperCase(),c,'',j?'':'sm')).join('')}</div>`;
      const nav=`<div class="tp-p tp-nav">${B('↑','ArrowUp','ArrowUp')}${B('←','ArrowLeft','ArrowLeft')}${B('↓','ArrowDown','ArrowDown')}${B('→','ArrowRight','ArrowRight')}${B('delete','Delete','Delete','sm')}<button class="sm" data-x>close</button></div>`;
      const h=nav+right;if(h!==last){last=h;pad.innerHTML=h}
      /* the rows under the panels can be scrolled up into view, and the cursor is kept above them */
      const ph=Math.max(0,...[...pad.children].map(c=>c.offsetHeight))+14;if(T._padRes!==ph){T._padRes=ph;body.style.paddingBottom=ph+'px'}}
    const show=on=>{pad.hidden=!on;kb.classList.toggle('on',on);last='';if(!on){T._padRes=0;body.style.paddingBottom=''}paint();try{fit()}catch(e){globalThis.__el&&globalThis.__el(e)}try{render()}catch(e){globalThis.__el&&globalThis.__el(e)}};
    /* keep the tracker's focus (and the cursor) while pressing the pad */
    pad.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation()});pad.addEventListener('mousedown',e=>{e.preventDefault();e.stopPropagation()});
    pad.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;e.stopPropagation();
      if(b.dataset.x!=null){show(false);return}
      if(b.dataset.ch!=null){chord=!chord;last='';paint();return}
      const c=b.dataset.c,k=kind(),i=cur.t;
      /* chord: a note stays on its row and the cursor goes on to the next note column; ↓ goes to the next step's first column */
      if(chord&&k[0]==='n'&&/^Key[ZSXDCVGBHNJM]$/.test(c)){const r0=cur.r,c0=cur.c;send(c,b.dataset.k);cur.r=r0;const cs=COLS(i);cur.c=Math.min(cs.length-2,c0+2);try{render()}catch(_){globalThis.__el&&globalThis.__el(_)}paint();return}
      if(chord&&k[0]==='n'&&c==='ArrowDown'){send(c,b.dataset.k);cur.c=0;try{render()}catch(_){globalThis.__el&&globalThis.__el(_)}paint();return}
      send(c,b.dataset.k);paint()});
    kb.addEventListener('click',e=>{e.stopPropagation();show(pad.hidden)});
    /* a finger (or pencil) on a cell opens the pad; the mouse never does */
    T.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||!e.target.closest('.tq-r span[data-k]'))return;if(pad.hidden)show(true);setTimeout(paint,0)},true);
    T.addEventListener('mousedown',e=>{if(!pad.hidden&&e.target.closest('.tq-r span[data-k]'))setTimeout(paint,0)});
    T.addEventListener('keydown',()=>setTimeout(paint,0))}
  setMode(mode);window.__trk={cur,render,T,gxOf,gxS,GFX}})();

