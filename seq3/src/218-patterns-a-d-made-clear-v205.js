/* ================= Patterns A–D made clear (v205) =================
   · A change while playing is shown when you hear it (the scheduler plans up to 0.4 s ahead, so the buttons and the grid
     used to jump before the new pattern sounded).
   · Empty patterns are dimmed; each button says what it holds.
   · Copy goes to the next EMPTY pattern (so it never overwrites by accident); if all four are in use it goes to the next one
     and says so (undo brings it back). The button tells you where it will copy before you press it.
   · In song mode the song decides the pattern: pressing A–D says so instead of pretending to switch. ================= */
(()=>{
  const css=document.createElement('style');css.textContent=`
.patseg .pat.empty{opacity:.38}
.patseg .pat.empty.cur{opacity:1}
.patseg .pat.queued::after{inset:-3px;border-width:1.5px}`;document.head.appendChild(css);
  const L='ABCD';
  const used=i=>{const S0=S;const pt=S0.pats[i]||[];for(const r of pt)for(const c of r||[])if(c&&c.v)return true;const R=S0.roll&&S0.roll[i]||{};for(const k in R)if(R[k]&&R[k].length)return true;return false};
  const count=i=>{let n=0;(S.pats[i]||[]).forEach(r=>(r||[]).forEach(c=>{if(c&&c.v)n++}));const R=S.roll&&S.roll[i]||{};for(const k in R)n+=(R[k]||[]).length;return n};
  const target=()=>{for(let k=1;k<4;k++){const j=(S.pat+k)%4;if(!used(j))return {to:j,over:false}}return {to:(S.pat+1)%4,over:true}};
  function paint(){document.querySelectorAll('.patseg .pat').forEach(b=>{const p=+b.dataset.p,n=count(p);b.classList.toggle('empty',!n);
      const t='Mönster '+L[p]+(n?' · '+n+(n===1?' not':' noter'):' · tomt')+(p===S.pat?' · spelas':p===queued?' · byter vid nästa takt':'');b.title=t;b.setAttribute('aria-label',t)});
    const cb=document.getElementById('copyPat');if(cb){const g=target(),t='Kopiera '+L[S.pat]+' till '+L[g.to]+(g.over?' (skriver över '+L[g.to]+')':'');cb.title=t;cb.setAttribute('aria-label',t)}}
  /* show the switch when it is heard */
  window.patAtHeard=function(t,song){const ms=Math.max(0,(t-ctx.currentTime-(ctx.outputLatency||0)*0)*1000);setTimeout(()=>{try{renderAll();if(song&&typeof renderChain==='function')renderChain()}catch(e){globalThis.__el&&globalThis.__el(e)}},ms)};
  /* the buttons */
  const songOn=()=>!!(S.song&&S.chain&&S.chain.some(v=>v>=0));
  document.querySelectorAll('.pat').forEach(b=>b.onclick=()=>{const p=+b.dataset.p;
    if(playing&&songOn()){toast('Låtläget bestämmer mönstret just nu · stäng av låt för att byta själv');return}
    if(playing&&p!==S.pat){if(queued===p){queued=-1;toast('Bytet till '+L[p]+' avbrutet')}else{queued=p;toast('Byter till '+L[p]+' vid nästa takt')}}
    else{S.pat=p;queued=-1}renderAll();save()});
  {const cb=document.getElementById('copyPat');if(cb)cb.onclick=()=>{const g=target();pushHist();
    S.pats[g.to]=JSON.parse(JSON.stringify(S.pats[S.pat]));S.roll[g.to]=JSON.parse(JSON.stringify(S.roll[S.pat]));
    toast(L[S.pat]+' kopierat till '+L[g.to]+(g.over?' · '+L[g.to]+' skrevs över (ångra med ⌘Z)':' · tryck '+L[g.to]+' för att göra en variant'));renderAll();save()}}
  {const _rp=renderPats;renderPats=function(){const r=_rp.apply(this,arguments);try{paint()}catch(e){globalThis.__el&&globalThis.__el(e)}return r}}
  paint();setInterval(paint,1500);
})();

