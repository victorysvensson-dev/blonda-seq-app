/* ================= Pads: a new face and note repeat (v217) =================
   Each pad: the track's name top left, its colour as a small pill top right (an orange ring around it when the track has choke
   on), and at the bottom the note repeat: the rate on the left, a grip on the right.
   Note repeat, as on an MPC: hold the pad and it plays again and again at the rate (in time with the beat when playing; while
   recording the hits are written into the pattern). Drag the grip up/down to pick the rate: av · 1/4 · 1/8 · 1/8T · 1/16 ·
   1/16T · 1/32 · 1/32T · 1/64. Every second hit follows the project's swing (triplets stay straight). Tap the rate to turn it on/off (it remembers the last rate). Saved per track with the project (S.nrep). ================= */
(()=>{
  const RATES=[['av',0],['1/4',4],['1/8',2],['1/8T',4/3],['1/16',1],['1/16T',2/3],['1/32',.5],['1/32T',1/3],['1/64',.25]];
  const rOf=id=>{const v=S.nrep&&S.nrep[id];return RATES.find(r=>r[0]===v)?v:'av'};
  /* a rate held only while the fader in full screen is touched (on a pad whose note repeat is not turned on with the dots): it is not saved and goes away when the fader is let go */
  const TEMP={};const eff=id=>TEMP[id]!=null?TEMP[id]:rOf(id);
  const steps=id=>(RATES.find(r=>r[0]===eff(id))||RATES[0])[1];
  const setR=(id,v)=>{if(!S.nrep)S.nrep={};if(v==='av'){const cur=S.nrep[id];if(cur&&cur!=='av'){S.nrep['_'+id]=cur}delete S.nrep[id]}else S.nrep[id]=v;save();paint()};
  const GRIP='<svg viewBox="0 0 14 9" fill="currentColor" aria-hidden="true"><circle cx="2" cy="2" r="1.3"/><circle cx="7" cy="2" r="1.3"/><circle cx="12" cy="2" r="1.3"/><circle cx="2" cy="7" r="1.3"/><circle cx="7" cy="7" r="1.3"/><circle cx="12" cy="7" r="1.3"/></svg>';
  /* the bottom row on every track pad */
  padEls.forEach((p,i)=>{if(!p||p.querySelector('.nrw'))return;const id=TRACKS[i].id,w=document.createElement('span');w.className='nrw';
    w.innerHTML=`<em class="nr"></em><span class="nrg" title="Note repeat · tryck = på/av · dra upp/ner för takt">${GRIP}</span>`;p.appendChild(w);
    const nr=w.querySelector('.nr'),g=w.querySelector('.nrg');
    /* tap the rate: on/off */
    nr.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault()});
    nr.addEventListener('click',e=>{e.stopPropagation();pushHist();const cur=rOf(id);setR(id,cur==='av'?((S.nrep&&S.nrep['_'+id])||'1/16'):'av');toast(TRACKS[i].name+' · note repeat '+rOf(id))});
    /* drag the grip: the rate */
    let y0=0,k0=0,on=false,moved=false;
    /* the grip: a tap turns note repeat on/off, a drag up/down picks the rate */
    g.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();on=true;moved=false;y0=e.clientY;k0=RATES.findIndex(r=>r[0]===rOf(id));try{g.setPointerCapture(e.pointerId)}catch(_){globalThis.__el&&globalThis.__el(_)}pushHist();g.classList.add('drag')});
    g.addEventListener('pointermove',e=>{if(!on)return;if(Math.abs(y0-e.clientY)>5)moved=true;if(!moved)return;const k=Math.max(0,Math.min(RATES.length-1,k0+Math.round((y0-e.clientY)/14)));if(RATES[k][0]!==rOf(id))setR(id,RATES[k][0])});
    const up=()=>{if(!on)return;on=false;g.classList.remove('drag');if(!moved){const cur=rOf(id);setR(id,cur==='av'?((S.nrep&&S.nrep['_'+id])||'1/16'):'av')}toast(TRACKS[i].name+' · note repeat '+rOf(id))};g.addEventListener('pointerup',up);g.addEventListener('pointercancel',up);
    g.addEventListener('click',e=>e.stopPropagation());
    /* hold the pad: repeat */
    p.addEventListener('pointerdown',e=>{if(e.target.closest('.nrw'))return;HELD.add(i);try{p.setPointerCapture(e.pointerId)}catch(_){globalThis.__el&&globalThis.__el(_)}const st=steps(id);if(!st)return;startRep(i,st)});
    const stop=()=>{HELD.delete(i);stopRep(i)};p.addEventListener('pointerup',stop);p.addEventListener('pointercancel',stop);p.addEventListener('lostpointercapture',stop)});
  /* the pad's own tap still plays once (the app's handler); the repeat adds the hits after it, on the grid */
  const REP={},HELD=new Set();
  /* the pads held right now (the fader for the rate in full screen works on them), and starting a repeat on a held pad when its rate is turned on */
  window.padRepHeld=()=>[...HELD];window.padRepRefresh=()=>HELD.forEach(i=>{const st=steps(TRACKS[i].id);if(st&&!REP[i])startRep(i,st)});
  /* the hits sit on a grid of the rate; every second hit is pushed late by the project's swing (as on an MPC: the swing works on
     the rate you repeat at, so 1/16 swings exactly like the steps). Triplet rates are left straight. */
  const isTri=st=>Math.abs(st*3-Math.round(st*3))<1e-6&&Math.abs(st*2-Math.round(st*2))>1e-6;
  function startRep(i,st){stopRep(i);if(!ctx)return;const sd=stepDur(),iv=st*sd,t0=ctx.currentTime;let tri=isTri(st),g,k;
    if(playing){k=Math.floor((t0-startT)/iv)+1;g=startT+k*iv}else{k=1;g=t0+iv}
    const R={g,k,timer:0};REP[i]=R;
    const run=()=>{if(REP[i]!==R)return;
      /* the rate can change while the pad is held (the grip, or the fader in full screen): the next hits follow, on the new grid */
      const cur=steps(TRACKS[i].id);if(!cur){stopRep(i);return}if(cur!==st){st=cur;tri=isTri(st);if(playing){const iv3=st*stepDur(),k=Math.ceil((R.g-startT)/iv3-1e-6);R.g=startT+k*iv3;R.k=k}}
      const now=ctx.currentTime,sd2=stepDur(),iv2=st*sd2,sw=tri?0:(S.master.swing||0)*iv2*.66;
      while(true){const tg=R.g+((R.k%2)?sw:0);if(tg>=now+.1)break;const t=Math.max(tg,now+.003);trigger(i,t,.88,firstNote(i));window.__nrN=(window.__nrN||0)+1;
        (window.__nrT||(window.__nrT=[])).push(t);if(window.__nrT.length>64)window.__nrT.shift();
        if(recording&&playing){const s=((Math.round((R.g-startT)/sd2)%16)+16)%16,cell=S.pats[S.pat][i][s];if(!cell.v){cell.v=1;if(st<1)cell.r=Math.max(cell.r||1,Math.round(1/st))}}
        const pd=padEls[i];if(pd){const d=Math.max(0,(t-now)*1000);setTimeout(()=>{pd.classList.add('hit');setTimeout(()=>pd.classList.remove('hit'),60)},d)}
        R.g+=iv2;R.k++}
      R.timer=setTimeout(run,20)};run()}
  function stopRep(i){const R=REP[i];if(!R)return;clearTimeout(R.timer);delete REP[i];if(recording){try{renderCells();save()}catch(e){globalThis.__el&&globalThis.__el(e)}}}
  /* paint: the rate, and the choke ring */
  let pk='';function paint(){const k=JSON.stringify([S.nrep||{},S.ck||{},TEMP]);if(k===pk)return;pk=k;
    padEls.forEach((p,i)=>{if(!p)return;const id=TRACKS[i].id,r=eff(id),nr=p.querySelector('.nr');if(nr){nr.textContent=r==='av'?'':r;nr.classList.toggle('on',r!=='av')}const gg=p.querySelector('.nrg');if(gg)gg.classList.toggle('on',r!=='av');
      if(S.ck&&S.ck[id]&&!TRACKS[i].mel)p.dataset.ck='1';else delete p.dataset.ck})}
  window.padRepPaint=paint;window.padRepRates=RATES;window.padRepSet=(id,v)=>{setR(id,v)};window.padRepOn=id=>rOf(id)!=='av';window.padRepEff=eff;
  window.padRepTemp=(id,v)=>{if(v==null)delete TEMP[id];else TEMP[id]=v;paint()};paint();setInterval(paint,300);

  const css=document.createElement('style');css.textContent=`
.pad{justify-content:space-between}
.pad > i{display:none}
/* the name: smaller and crisp, never under the pill */
.pad > b{font-family:var(--f-mono);font-weight:500;font-size:10.5px!important;letter-spacing:.05em!important;opacity:1;-webkit-font-smoothing:antialiased;max-width:calc(100% - 26px)!important;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.2}
.pad::after{width:22px!important;height:8px!important;border-radius:5px!important;right:9px!important;top:10px!important}
.card[data-card="pads"] .pad::after{width:16px!important;height:6px!important;border-radius:4px!important;right:7px!important;top:8px!important}
.pad[data-ck]::after{outline:1.5px solid #F08A24;outline-offset:2px}
.pad .nrw{display:flex;align-items:center;width:100%;gap:6px;min-height:14px}
.pad .nr{font:500 9.5px var(--f-mono);font-style:normal;letter-spacing:.05em;color:#F08A24;white-space:nowrap;pointer-events:none}
/* the grip: grey = off, orange = on; a little in from the corner */
/* the grip sits under the pill: its right edge on the same line as the pill's (the padding is the touch area) */
.pad .nrg{position:absolute;right:3px;bottom:3px;padding:6px;display:grid;place-items:center;color:rgba(232,230,220,.38);cursor:pointer;touch-action:none;border-radius:5px}
.card[data-card="pads"] .pad .nrg{right:1px;bottom:1px}
.pad .nrg svg{width:12px;height:8px}
.pad .nrg:hover{color:rgba(232,230,220,.7)}
.pad .nrg.on{color:#F08A24}
.pad .nrg.drag{color:#F08A24;background:rgba(240,138,36,.12)}
.pad.hit .nrg,.pad.lit .nrg,.pad.hit .nr,.pad.lit .nr{color:inherit}
.fullhost .card[data-card="pads"] .pad > b,body.mob .card[data-card="pads"] .pad > b{font-size:13px!important}
.fullhost .card[data-card="pads"] .pad .nr{font-size:11px}
.fullhost .card[data-card="pads"] .pad::after,body.mob .card[data-card="pads"] .pad::after{width:24px!important;height:9px!important;border-radius:5px!important;right:11px!important;top:12px!important}
.fullhost .card[data-card="pads"] .pad .nrg,body.mob .card[data-card="pads"] .pad .nrg{right:5px;bottom:5px}
body:not(.mob) .fullhost .card[data-card="pads"] .pad .nrg{right:4.2px}
.fullhost .card[data-card="pads"] .pad .nrg svg,body.mob .card[data-card="pads"] .pad .nrg svg{width:15px;height:10px}
@container (max-width:470px){.card[data-card="pads"] .pad{justify-content:space-between!important}}
body.mob .card[data-card="pads"] .pad{justify-content:space-between!important}`;document.head.appendChild(css);
})();

