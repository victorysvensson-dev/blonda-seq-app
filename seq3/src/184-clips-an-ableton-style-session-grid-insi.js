/* ================= Clips: an Ableton-style session grid inside the DAW mode. A column per track (and the Starter and the loops),
   a row per scene. A clip is one of the track's own patterns A–D, so every track can play its own pattern. Clips and scenes start on
   the next bar. State: S.clips (in the project). While it plays, the arrangement and the 8-slot song mode are not used. ================= */
var CLX={play:TRACKS.map(()=>-1),stx:0,lp:0,q:null,last:0,vq:[],vis:null,sel:{r:0,c:0},clip:null};
window.CLIPP=null;window.clPaint=()=>{};
const CL_N=8,CL_SX=TRACKS.length,CL_LP=TRACKS.length+1;
const clHas=(p,i)=>{try{const tr=TRACKS[i];if(tr.mel)return (S.roll[p][tr.id]||[]).length>0;return (S.pats[p][i]||[]).some(c=>c&&c.v>0)}catch(e){return false}};
function clp(){if(!S.clips||typeof S.clips!=='object'||!Array.isArray(S.clips.sc)){
    S.clips={on:0,sc:Array.from({length:CL_N},(_,r)=>({c:TRACKS.map((_,i)=>r<4&&clHas(r,i)?r:-1),stx:r<4?1:0,lp:r<4?1:0}))}}
  const C=S.clips,PN=(S.pats||[]).length||4;
  while(C.sc.length<CL_N)C.sc.push({c:TRACKS.map(()=>-1),stx:0,lp:0});
  C.sc.forEach(s=>{if(!Array.isArray(s.c))s.c=[];for(let i=0;i<TRACKS.length;i++){const v=s.c[i];s.c[i]=(v>=0&&v<PN)?v|0:-1}s.stx=s.stx?1:0;s.lp=s.lp?1:0});return C}
/* what a scene asks for: a queue entry that sets every column */
const clSceneQ=r=>{const s=clp().sc[r];return {c:s.c.slice(),stx:s.stx,lp:s.lp,scene:r}};
const clIsEmptyScene=r=>{const s=clp().sc[r];return !s.stx&&!s.lp&&s.c.every(v=>v<0)};
function clQueue(part){const Q=CLX.q||(CLX.q={c:TRACKS.map(()=>undefined)});if(part.c)part.c.forEach((v,i)=>{if(v!==undefined)Q.c[i]=v});
  if(part.stx!==undefined)Q.stx=part.stx;if(part.lp!==undefined)Q.lp=part.lp;if(part.scene!==undefined)Q.scene=part.scene}
/* start clip mode (and the transport if it is stopped) */
function clGo(){const C=clp();if(!C.on){C.on=1;try{arr().on=0}catch(e){globalThis.__el&&globalThis.__el(e)}S.song=0;try{renderChain()}catch(e){globalThis.__el&&globalThis.__el(e)}}queued=-1;
  if(!playing){initAudio();ctx.resume();play()}save();clPaint(true)}
/* called by the sequencer at the start of every bar, before the arrangement */
{const _ab=window.arrBar;window.arrBar=t=>{const C=clp();
  if(C.on&&(queued>=0||S.song)){C.on=0;toast(queued>=0?'Mönster '+'ABCD'[queued]+' · clips av':'Låtläge · clips av');setTimeout(()=>clPaint(true),0)}
  if(!C.on||(arr().on)){if(C.on)C.on=0;window.CLIPP=null;return _ab(t)}
  /* nothing playing and nothing asked for: start the last scene */
  if(!CLX.q&&CLX.play.every(v=>v<0)&&!CLX.stx&&!CLX.lp){const r=clIsEmptyScene(CLX.last)?0:CLX.last;clQueue(clSceneQ(r))}
  const Q=CLX.q;CLX.q=null;let chg=false;
  if(Q){Q.c.forEach((v,i)=>{if(v!==undefined&&CLX.play[i]!==v){CLX.play[i]=v;chg=true}});if(Q.stx!==undefined&&CLX.stx!==Q.stx){CLX.stx=Q.stx;chg=true}if(Q.lp!==undefined&&CLX.lp!==Q.lp){CLX.lp=Q.lp;chg=true}if(Q.scene!==undefined){CLX.last=Q.scene;CLX.cur=Q.scene}else if(chg)CLX.cur=-1}
  window.CLIPP=CLX.play;ARR.active=true;ARR.idx=-1;ARR.stx=CLX.stx;ARR.lp=CLX.lp;
  CLX.vq.push({t,play:CLX.play.slice(),stx:CLX.stx,lp:CLX.lp,scene:CLX.cur==null?-1:CLX.cur});if(CLX.vq.length>8)CLX.vq.shift();
  if(chg&&A&&A.ch)TRACKS.forEach((tr,i)=>{try{A.ch[i].g.gain.setTargetAtTime(isMuted(i)?0:S.params[tr.id].level,t,.008)}catch(e){globalThis.__el&&globalThis.__el(e)}});
  return true}}
{const _p=play;play=function(){CLX.vq.length=0;CLX.vis=null;return _p.apply(this,arguments)}}
{const _s=stop;stop=function(){const r=_s.apply(this,arguments);CLX.play=TRACKS.map(()=>-1);CLX.stx=0;CLX.lp=0;CLX.q=null;CLX.cur=-1;CLX.vq.length=0;CLX.vis=null;window.CLIPP=null;clPaint(true);return r}}

(()=>{const D=document.getElementById('daw');if(!D)return;
  const css=document.createElement('style');css.textContent=`
.dw-view{display:inline-flex;height:36px;padding:3px;border-radius:var(--dk-r);box-shadow:inset 0 0 0 1px rgba(var(--dk-ink),.16);margin-right:6px}
.dw-view button{padding:0 14px;border-radius:var(--dk-r);font-size:11px!important;letter-spacing:.06em;color:rgba(var(--dk-ink),.6)!important}
.dw-view button.on{background:rgb(var(--dk-ink))!important;color:var(--dk-on)!important}
.daw.clipv .dw-arr,.daw.clipv [data-a="on"],.daw.clipv [data-a="loop"],.daw.clipv .dw-len,.daw.clipv .dw-now{display:none!important}
.daw:not(.clipv) .dw-clp{display:none!important}
.dw-clp{flex:none;display:flex;flex-direction:column;gap:8px;background:var(--dk-p1);border-radius:var(--dk-r);padding:10px 12px;box-shadow:inset 0 0 0 1px rgba(var(--dk-ink),.08);max-height:54vh;min-height:0}
.xc-tools{display:flex;flex-wrap:wrap;align-items:center;gap:6px;flex:none}
.xc-tools button{height:28px;padding:0 10px;font-size:10px!important;box-shadow:inset 0 0 0 1px rgba(var(--dk-ink),.16);border-radius:var(--dk-r);background:var(--dk-p3)!important}
.xc-tools button:hover{background:var(--dk-p4)!important}.xc-tools button:disabled{opacity:.3;pointer-events:none}
.xc-tools .xc-p{width:30px;padding:0}.xc-tools .xc-p.on{background:var(--c)!important;color:var(--dk-on)!important;box-shadow:none}
.xc-what{display:flex;align-items:center;gap:8px;min-width:150px;font:400 14px var(--f-linje);white-space:nowrap}
.xc-what i{width:9px;height:9px;border-radius:var(--dk-r2);background:var(--h)}.xc-what small{font:400 9px var(--f-mono);color:rgba(var(--dk-ink),.45);letter-spacing:.08em}
.xc-hint{font-size:9px;color:rgba(var(--dk-ink),.38);margin-left:auto}
.xc-wrap{overflow:auto;min-height:0;scrollbar-width:thin}
.xc-grid{display:grid;grid-template-columns:repeat(${TRACKS.length+2},minmax(60px,1fr)) 96px;gap:3px;min-width:${(TRACKS.length+2)*63+116}px}
.xc-h{height:26px;display:flex;align-items:center;gap:6px;padding:0 8px;border-radius:var(--dk-r);background:var(--dk-p2);font-size:10px;letter-spacing:.04em;color:rgba(var(--dk-ink),.75);white-space:nowrap;overflow:hidden;position:relative}
.xc-h::before{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:var(--h)}
.xc-h.sx{margin-left:8px}.xc-c.sx,.xc-st.sx{margin-left:8px}
.xc-h.mst{background:none;color:rgba(var(--dk-ink),.4);font-size:9px;letter-spacing:.12em;justify-content:center}.xc-h.mst::before{display:none}
.xc-c{position:relative;height:34px;border-radius:var(--dk-r);display:flex;overflow:hidden;background:var(--dk-p2);box-shadow:inset 0 0 0 1px rgba(var(--dk-ink),.05)}
.xc-c.sel{box-shadow:inset 0 0 0 1.5px rgb(var(--dk-ink))}
.xc-c button{padding:0;height:100%}
.xc-go{width:24px;flex:none;display:grid;place-items:center;color:rgba(var(--dk-ink),.5)!important;font-size:9px!important}
.xc-go:hover{color:rgb(var(--dk-ink))!important}
.xc-bd{flex:1;min-width:0;position:relative;display:flex;align-items:center;gap:6px;padding:0 6px 0 2px!important;text-align:left}
.xc-bd b{font:500 10px var(--f-mono);width:16px;height:16px;border-radius:var(--dk-r2);display:grid;place-items:center;flex:none;background:var(--h);color:var(--dk-on)}
.xc-bd svg{flex:1;min-width:0;height:22px;display:block}
.xc-c.has{background:linear-gradient(180deg,color-mix(in srgb,var(--h) 26%,var(--dk-p3)),color-mix(in srgb,var(--h) 14%,var(--dk-p2)))}
.xc-c.has:hover{background:linear-gradient(180deg,color-mix(in srgb,var(--h) 34%,var(--dk-p4)),color-mix(in srgb,var(--h) 20%,var(--dk-p2)))}
.xc-c:not(.has) .xc-go{opacity:0}.xc-c:not(.has):hover .xc-go{opacity:1}
.xc-c:not(.has) .xc-go::after{content:"■";font-size:8px}.xc-c:not(.has) .xc-go{font-size:0!important}
.xc-c.has .xc-go::after{content:"▶"}
.xc-c.now{background:linear-gradient(180deg,color-mix(in srgb,var(--h) 52%,var(--dk-p4)),color-mix(in srgb,var(--h) 30%,var(--dk-p3)))}
.xc-c.now .xc-go{color:var(--dk-acc)!important}
.xc-c.now::after{content:"";position:absolute;left:0;bottom:0;height:2px;width:calc(var(--pr,0)*100%);background:var(--dk-acc);box-shadow:0 0 8px rgba(var(--dk-acc-rgb),.7)}
.xc-c.wait .xc-go{color:var(--dk-acc)!important;animation:xcBl .5s steps(2) infinite}
.xc-c.stopq .xc-go{animation:xcBl .5s steps(2) infinite}
@keyframes xcBl{50%{opacity:.15}}
.xc-txt{font-size:10px;color:rgb(var(--dk-ink));letter-spacing:.04em;white-space:nowrap;overflow:hidden}
.xc-sc{height:34px;border-radius:var(--dk-r);display:flex;align-items:center;gap:8px;padding:0 10px!important;background:var(--dk-p3)!important;box-shadow:inset 0 0 0 1px rgba(var(--dk-ink),.1);font-size:10px!important;letter-spacing:.06em;margin-left:6px}
.xc-sc{white-space:nowrap}.xc-sc i{font-style:normal;font-size:8px;color:rgba(var(--dk-ink),.35);margin-left:auto}
.daw.clipv .dw-pos{min-width:118px}
.xc-sc:hover{background:var(--dk-p4)!important}
.xc-sc.now{background:var(--dk-acc)!important;color:var(--dk-on)!important}.xc-sc.now i{color:var(--dk-on)}
.xc-sc.wait{animation:xcBl .5s steps(2) infinite;box-shadow:inset 0 0 0 1.5px var(--dk-acc)}
.xc-sc.selr{box-shadow:inset 0 0 0 1.5px rgb(var(--dk-ink))}
.xc-st{height:26px;border-radius:var(--dk-r);display:grid;place-items:center;background:var(--dk-p2)!important;color:rgba(var(--dk-ink),.45)!important;font-size:9px!important}
.xc-st:hover{color:rgb(var(--dk-ink))!important;background:var(--dk-p4)!important}
.xc-st.live{color:rgb(var(--dk-ink))!important}
.xc-st.all{margin-left:6px;letter-spacing:.08em}
@media (max-width:760px){.dw-view button{padding:0 9px}}
@media (max-height:860px){.xc-c,.xc-sc{height:28px}.xc-h{height:22px}.xc-st{height:22px}.dw-clp{max-height:50vh}}
@media (max-width:1250px){.xc-hint{display:none}}
`;document.head.appendChild(css);

  /* the view switch: låt (the timeline) | clips */
  const top=D.querySelector('.dw-top'),logo=top.querySelector('.dw-logo');
  const vw=document.createElement('span');vw.className='dw-view';vw.innerHTML='<button data-v="arr">låt</button><button data-v="clips">clips</button>';logo.after(vw);
  let view=(()=>{try{return localStorage.getItem('blonda.daw.view')||'clips'}catch(e){return 'clips'}})();
  const sec=document.createElement('section');sec.className='dw-clp';
  sec.innerHTML=`<div class="xc-tools"><span class="xc-what"></span>
      <button data-k="go">▶ starta</button><span class="dw-lab">mönster</span>${[0,1,2,3].map(p=>`<button class="xc-p" data-p="${p}" style="--c:${ARR_COL[p]}">${'ABCD'[p]}</button>`).join('')}
      <button data-k="var" title="Kopiera mönstret till ett ledigt mönster (A–D) och lägg det i nästa tomma ruta under – en variant att jobba vidare på">variant ↓</button>
      <button data-k="dn" title="Samma clip (eller hela scenen) i nästa tomma ruta under">kopiera ↓</button><button data-k="clr">töm</button>
      <span class="xc-hint">▶ = starta vid nästa takt · tryck i rutan = välj och redigera nedan · ■ = stoppa spåret</span></div>
    <div class="xc-wrap"><div class="xc-grid"></div></div>`;
  D.querySelector('.dw-arr').after(sec);
  const grid=sec.querySelector('.xc-grid'),tools=sec.querySelector('.xc-tools');
  const setView=v=>{view=v;try{localStorage.setItem('blonda.daw.view',v)}catch(e){globalThis.__el&&globalThis.__el(e)}D.classList.toggle('clipv',v==='clips');vw.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
    if(v==='clips')build();setTimeout(()=>{dispatchEvent(new Event('resize'))},40)};
  vw.onclick=e=>{const b=e.target.closest('[data-v]');if(b)setView(b.dataset.v)};
  /* turning the arrangement on hands playback back to it */
  top.addEventListener('click',e=>{const b=e.target.closest('[data-a="on"]');if(b&&!arr().on&&clp().on){clp().on=0;setTimeout(()=>clPaint(true),0)}},true);

  const COLS=()=>[...(window.trkList?trkList():TRACKS.map((t,i)=>i)).map(i=>{const t=TRACKS[i];return {c:i,nm:(t.name||'').toLowerCase(),hex:t.hex}}),{c:CL_LP,nm:'loopar',hex:'#6FD0C5'}];
  /* a small picture of what is in the clip: hits for drums, a tiny piano roll for melodic tracks */
  const pic=(p,i)=>{const tr=TRACKS[i];let s='';
    if(tr.mel){const R=(S.roll[p]&&S.roll[p][tr.id])||[];if(!R.length)return '';let lo=127,hi=0;R.forEach(n=>{lo=Math.min(lo,n.n);hi=Math.max(hi,n.n)});const sp=Math.max(6,hi-lo);
      R.forEach(n=>{const x=(n.s%16)/16*100,w=Math.max(1.6,Math.min(16-n.s%16,n.l||1)/16*100-.8),y=18-((n.n-lo)/sp)*16;s+=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="3" rx="1"/>`})}
    else{const P=(S.pats[p]&&S.pats[p][i])||[];P.forEach((c,k)=>{if(!c||!(c.v>0))return;const h=c.v>=2?18:c.vel!=null?6+12*c.vel:12;s+=`<rect x="${(k/16*100+.6).toFixed(1)}" y="${(20-h).toFixed(1)}" width="4.6" height="${h.toFixed(1)}" rx="1" opacity="${c.v>=2?1:.7}"/>`})}
    return `<svg viewBox="0 0 100 21" preserveAspectRatio="none" fill="#EFEDE4" fill-opacity=".85">${s}</svg>`};
  const freeBelow=(r,c)=>{for(let k=r+1;k<CL_N;k++){if(c<0?clIsEmptyScene(k):cellVal(k,c)<0)return k}return -1};
  const cellVal=(r,c)=>{const s=clp().sc[r];return c===CL_SX?(s.stx?1:-1):c===CL_LP?(s.lp?1:-1):s.c[c]};
  function build(){if(!ARR.open||view!=='clips')return;const C=clp(),cols=COLS();let h='';
    cols.forEach(o=>{h+=`<div class="xc-h${o.sx?' sx':''}" style="--h:${o.hex}">${o.nm}</div>`});h+='<div class="xc-h mst">scener</div>';
    for(let r=0;r<CL_N;r++){cols.forEach(o=>{const v=cellVal(r,o.c),has=v>=0,sel=CLX.sel.r===r&&CLX.sel.c===o.c;
        let inner='';if(has){if(o.c===CL_SX)inner='<span class="xc-txt">ackord</span>';else if(o.c===CL_LP)inner='<span class="xc-txt">loopar</span>';else inner=`<b style="--h:${ARR_COL[v]}">${'ABCD'[v]}</b>${pic(v,o.c)}`}
        h+=`<div class="xc-c${has?' has':''}${sel?' sel':''}${o.sx?' sx':''}" data-r="${r}" data-c="${o.c}" style="--h:${o.hex}"><button class="xc-go" data-go aria-label="${has?'Starta':'Stoppa spåret'}"></button><button class="xc-bd" data-bd>${inner}</button></div>`});
      h+=`<button class="xc-sc${CLX.sel.r===r&&CLX.sel.c<0?' selr':''}" data-sc="${r}" title="Starta hela raden vid nästa takt"><span>▶</span>scen ${r+1}<i>${clIsEmptyScene(r)?(window.BLONDA_LANG==='en'?'–':'tom'):''}</i></button>`}
    cols.forEach(o=>{h+=`<button class="xc-st${o.sx?' sx':''}" data-st="${o.c}" title="Stoppa ${o.nm} vid nästa takt">■</button>`});h+='<button class="xc-st all" data-st="all">■ stoppa alla</button>';
    /* as many columns as there are tracks in use */grid.style.gridTemplateColumns=`repeat(${cols.length},minmax(60px,1fr)) 96px`;grid.style.minWidth=(cols.length*63+116)+'px';
    grid.innerHTML=h;paintTools();live()}
  function paintTools(){const {r,c}=CLX.sel,cols=COLS(),o=cols.find(x=>x.c===c),what=tools.querySelector('.xc-what');
    if(c<0||!o){what.innerHTML=`<i style="--h:#E9C54A"></i>scen ${r+1}<small>${clIsEmptyScene(r)?'tom':''}</small>`}
    else{const v=cellVal(r,c);what.innerHTML=`<i style="--h:${o.hex}"></i>${o.nm}<small>scen ${r+1}${v<0?' · tom':''}</small>`}
    const trk=c>=0&&c<CL_SX,v=c>=0?cellVal(r,c):-1;
    tools.querySelectorAll('.xc-p').forEach(b=>{b.disabled=!trk;b.classList.toggle('on',trk&&+b.dataset.p===v)});
    tools.querySelector('[data-k="go"]').disabled=c<0?clIsEmptyScene(r):v<0;
    tools.querySelector('[data-k="var"]').disabled=!trk||v<0||freeBelow(r,c)<0;tools.querySelector('[data-k="dn"]').disabled=(c<0?clIsEmptyScene(r):v<0)||freeBelow(r,c)<0;tools.querySelector('[data-k="clr"]').disabled=c<0?clIsEmptyScene(r):v<0}
  /* playing / waiting states, painted every frame without rebuilding */
  let lastKey='';
  function live(){if(!ARR.open||view!=='clips')return;
    while(CLX.vq.length&&ctx&&CLX.vq[0].t<=ctx.currentTime)CLX.vis=CLX.vq.shift();
    const V=playing&&clp().on?CLX.vis:null,Q=CLX.q,pr=playing?((((gstep%16)+16)%16)/16).toFixed(3):0;
    const nowOf=c=>!V?-1:c===CL_SX?(V.stx?1:-1):c===CL_LP?(V.lp?1:-1):V.play[c];
    const qOf=c=>!Q?undefined:c===CL_SX?(Q.stx===undefined?undefined:Q.stx?1:-1):c===CL_LP?(Q.lp===undefined?undefined:Q.lp?1:-1):Q.c[c];
    const key=JSON.stringify([V&&[V.play,V.stx,V.lp],Q&&[Q.c,Q.stx,Q.lp,Q.scene],V&&V.scene,clp().on]);
    grid.style.setProperty('--pr',pr);
    if(key!==lastKey){lastKey=key;
      grid.querySelectorAll('.xc-c').forEach(el=>{const r=+el.dataset.r,c=+el.dataset.c,v=cellVal(r,c),n=nowOf(c),q=qOf(c);
        /* a clip plays when its column plays the same thing as this cell and the row is the one it came from, or the only match */
        const plays=v>=0&&n===v&&(c>=CL_SX?(V&&V.scene>=0?V.scene===r:clFirst(c,v)===r):clRowFor(c,v,V)===r);
        el.classList.toggle('now',!!plays);el.classList.toggle('wait',v>=0&&q!==undefined&&q===v&&!plays&&(Q.scene===undefined||Q.scene===r||clFirst(c,v)===r));
        el.classList.toggle('stopq',!!plays&&q!==undefined&&q!==v)});
      grid.querySelectorAll('.xc-sc').forEach(b=>{const r=+b.dataset.sc;b.classList.toggle('now',!!V&&clp().on&&CLX.last===r&&clSceneLive(r,V));b.classList.toggle('wait',!!Q&&Q.scene===r)});
      grid.querySelectorAll('.xc-st').forEach(b=>{const c=b.dataset.st;if(c==='all')return;b.classList.toggle('live',nowOf(+c)>=0)})}}
  /* which row a playing pattern belongs to: the last launched scene if it holds it, otherwise the first row that does */
  const clFirst=(c,v)=>{for(let r=0;r<CL_N;r++)if(cellVal(r,c)===v)return r;return -1};
  const clRowFor=(c,v,V)=>{if(V&&CLX.last>=0&&cellVal(CLX.last,c)===v)return CLX.last;const pick=CLX.pick&&CLX.pick[c];if(pick!=null&&cellVal(pick,c)===v)return pick;return clFirst(c,v)};
  const clSceneLive=(r,V)=>{const s=clp().sc[r];return s.c.every((v,i)=>v===V.play[i])&&!!s.stx===!!V.stx&&!!s.lp===!!V.lp};
  window.clPaint=force=>{if(force)lastKey='';if(ARR.open&&view==='clips'){if(force===true)build();else live()}};

  const launchCell=(r,c)=>{const v=cellVal(r,c);CLX.pick=CLX.pick||{};
    if(c===CL_SX)clQueue({stx:v>=0?1:0});else if(c===CL_LP)clQueue({lp:v>=0?1:0});else{const part={c:TRACKS.map(()=>undefined)};part.c[c]=v;clQueue(part)}
    if(v>=0)CLX.pick[c]=r;clGo()};
  const launchScene=r=>{CLX.last=r;CLX.pick={};clQueue(clSceneQ(r));clGo()};
  const selCell=(r,c)=>{CLX.sel={r,c};const v=cellVal(r,c);
    if(c>=0&&c<CL_SX){if(v>=0){S.pat=v}try{select(c)}catch(e){try{renderAll()}catch(_){globalThis.__el&&globalThis.__el(_)}}}
    else if(c===CL_SX){const b=D.querySelector('.dw-tabs [data-tab="starter"]');if(b)b.click()}
    else if(c===CL_LP){const b=D.querySelector('.dw-tabs [data-tab="loops"]');if(b)b.click()}
    build()};
  grid.addEventListener('click',e=>{const sc=e.target.closest('[data-sc]');if(sc){const r=+sc.dataset.sc;CLX.sel={r,c:-1};if(!clIsEmptyScene(r))launchScene(r);else build();return}
    const st=e.target.closest('[data-st]');if(st){const c=st.dataset.st;
      if(c==='all'){clQueue({c:TRACKS.map(()=>-1),stx:0,lp:0});if(playing)clGo()}
      else{const k=+c;if(k===CL_SX)clQueue({stx:0});else if(k===CL_LP)clQueue({lp:0});else{const part={c:TRACKS.map(()=>undefined)};part.c[k]=-1;clQueue(part)}if(playing)clGo()}
      clPaint(true);return}
    const cell=e.target.closest('.xc-c');if(!cell)return;const r=+cell.dataset.r,c=+cell.dataset.c;
    if(e.target.closest('[data-go]')){if(cellVal(r,c)>=0)launchCell(r,c);else{if(c===CL_SX)clQueue({stx:0});else if(c===CL_LP)clQueue({lp:0});else{const part={c:TRACKS.map(()=>undefined)};part.c[c]=-1;clQueue(part)}if(playing)clGo();clPaint(true)}CLX.sel={r,c};build();return}
    selCell(r,c)});
  grid.addEventListener('dblclick',e=>{const cell=e.target.closest('.xc-c');if(!cell||e.target.closest('[data-go]'))return;const r=+cell.dataset.r,c=+cell.dataset.c;if(cellVal(r,c)>=0)launchCell(r,c)});
  tools.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;const C=clp(),{r,c}=CLX.sel,s=C.sc[r],trk=c>=0&&c<CL_SX;
    if(b.dataset.p!=null&&trk){try{pushHist()}catch(_){globalThis.__el&&globalThis.__el(_)}s.c[c]=+b.dataset.p;S.pat=s.c[c];try{select(c)}catch(_){globalThis.__el&&globalThis.__el(_)}}
    else if(b.dataset.k==='go'){if(c<0)launchScene(r);else launchCell(r,c)}
    else if(b.dataset.k==='clr'){try{pushHist()}catch(_){globalThis.__el&&globalThis.__el(_)}if(c<0){s.c=s.c.map(()=>-1);s.stx=0;s.lp=0;s.gx={p:-1,len:16}}else if(c===CL_SX)s.stx=0;else if(c===CL_LP)s.lp=0;else s.c[c]=-1}
    else if(b.dataset.k==='dn'){const t=freeBelow(r,c);if(t<0){toast(c<0?'Ingen tom scen under':'Ingen tom ruta under');return}try{pushHist()}catch(_){globalThis.__el&&globalThis.__el(_)}const d=C.sc[t];if(c<0){d.c=s.c.slice();d.stx=s.stx;d.lp=s.lp;if(s.gx)d.gx=JSON.parse(JSON.stringify(s.gx))}else if(c===CL_SX)d.stx=s.stx;else if(c===CL_LP)d.lp=s.lp;else d.c[c]=s.c[c];CLX.sel={r:t,c}}
    else if(b.dataset.k==='var'&&trk){const t=freeBelow(r,c);if(t<0){toast('Ingen tom ruta under');return}const v=s.c[c],PN=(S.pats||[]).length||4,used=new Set(C.sc.map(x=>x.c[c]).filter(x=>x>=0));
      let np=-1;for(let k=1;k<PN;k++){const p=(v+k)%PN;if(!used.has(p)&&!clHas(p,c)){np=p;break}}
      if(np<0)for(let k=1;k<PN;k++){const p=(v+k)%PN;if(!used.has(p)){np=p;break}}
      if(np<0){toast('Alla fyra mönster används redan i '+TRACKS[c].name.toLowerCase());return}
      try{pushHist()}catch(_){globalThis.__el&&globalThis.__el(_)}const tr=TRACKS[c];
      if(tr.mel){S.roll[np][tr.id]=JSON.parse(JSON.stringify(S.roll[v][tr.id]||[]))}else{S.pats[np][c]=JSON.parse(JSON.stringify(S.pats[v][c]))}
      C.sc[t].c[c]=np;CLX.sel={r:t,c};S.pat=np;try{select(c)}catch(_){globalThis.__el&&globalThis.__el(_)}toast('Variant · '+tr.name.toLowerCase()+' mönster '+'ABCD'[np])}
    else return;save();build()});

  /* keep the grid in step with edits made elsewhere (the pattern grid, undo, a new project) */
  {const _ra=renderAll;renderAll=function(){const r=_ra.apply(this,arguments);if(ARR.open&&view==='clips'){clearTimeout(build._t);build._t=setTimeout(build,60)}return r}}
  /* the DAW opens on the view it had */
  {const _o=window.dawOpen;window.dawOpen=function(){const r=_o.apply(this,arguments);setView(view);return r}}
  const dbtn=document.getElementById('dawBtn');if(dbtn){const _c=dbtn.onclick;dbtn.onclick=function(){const wasOpen=ARR.open;const r=_c.apply(this,arguments);if(!wasOpen)setView(view);return r}}
  setView(view);
  const tick=()=>{if(ARR.open&&view==='clips'){live();if(playing&&clp().on){const pb=D.querySelector('.dw-pos:not(.dw-now) b');if(pb){const V=CLX.vis;pb.textContent=(V&&V.scene>=0?'scen '+(V.scene+1)+' · ':'')+((((gstep%16)+16)%16>>2)+1)}}}requestAnimationFrame(tick)};requestAnimationFrame(tick)})();
window.__clips={CLX,clp,hitT};

