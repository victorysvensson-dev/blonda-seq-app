/* ================= M and S on the module cards (v191): mute and solo right in the card, the very same as in the mixer.
   Starter = its "total" strip · Stämmor = its own strip · Loops = the loop bus · a synth card (Bris, Moog, SH-101 …) = every
   channel that plays that synth right now (the pattern tracks and the Starter layers routed to it). ================= */
(()=>{
  const css=document.createElement('style');css.textContent=`
.mms{display:inline-flex;gap:4px;margin-right:6px;align-items:center}
.mms button{width:26px;height:26px;border-radius:50%;border:0;background:rgba(255,255,255,.1);color:inherit;font:600 10px var(--f-mono,monospace);cursor:pointer;display:grid;place-items:center;padding:0}
.mms button:hover{background:rgba(255,255,255,.18)}
.mms button.m.on{background:#FF6B5B;color:#111211}.mms button.s.on{background:#F2C318;color:#111211}
.mms.none button{opacity:.35}
body.bg-light .mms button{background:rgba(17,18,17,.08)}
.card.min .mms{display:none}`;document.head.appendChild(css);
  const SX={all:40,ack:41,klo:42,sub:43,luft:44};
  const P=()=>{try{return stx()}catch(e){return null}};
  const stxApply=()=>{try{const p=P();if(STX.E&&p)STX.E.apply(p)}catch(e){globalThis.__el&&globalThis.__el(e)}};
  const after=()=>{try{applyAll()}catch(e){globalThis.__el&&globalThis.__el(e)}try{applyBuses()}catch(e){globalThis.__el&&globalThis.__el(e)}try{if(typeof renderSel==='function')renderSel()}catch(e){globalThis.__el&&globalThis.__el(e)}try{save()}catch(e){globalThis.__el&&globalThis.__el(e)}stxApply()};
  /* what a synth card controls: track indexes playing engine e, and Starter layers routed to it */
  function engCh(e){const tr=[],ly=[];TRACKS.forEach((t,i)=>{if(t.mel&&S.inst&&S.inst[t.id]===e)tr.push(i)});
    const p=P();if(p&&p.ls&&p.lay)for(const l in p.ls){const sn=p.ls[l].snd;if(p.lay[l]&&sn==='e:'+e)ly.push(l)}return {tr,ly}}
  const MOD={
    starter:{m:()=>{const p=P();return !!(p&&p.mx&&p.mx.all)},s:()=>soloOn(SX.all),
      tm:()=>{const p=P();if(!p)return;if(!p.mx||typeof p.mx!=='object')p.mx={};p.mx.all=p.mx.all?0:1;after()},ts:()=>{soloTog(SX.all);after()}},
    stammor:{m:()=>!!(window.__stm&&__stm.isMuted()),s:()=>!!(window.__stm&&__stm.isSolo()),tm:()=>window.__stm&&__stm.togMute(),ts:()=>window.__stm&&__stm.togSolo()},
    loops:{m:()=>!!busOf('lp').mute,s:()=>!!busOf('lp').solo,tm:()=>{const b=busOf('lp');b.mute=b.mute?0:1;after()},ts:()=>{const b=busOf('lp');b.solo=b.solo?0:1;after()}}};
  function engMod(e){return {
    none:()=>{const c=engCh(e);return !c.tr.length&&!c.ly.length},
    m:()=>{const c=engCh(e),p=P();const all=[...c.tr.map(i=>!!S.mute[i]),...c.ly.map(l=>!!(p&&p.mx&&p.mx[l]))];return all.length>0&&all.every(Boolean)},
    s:()=>{const c=engCh(e);const all=[...c.tr.map(i=>soloOn(i)),...c.ly.map(l=>soloOn(SX[l]))];return all.length>0&&all.every(Boolean)},
    tm:function(){const c=engCh(e),p=P(),on=!this.m();c.tr.forEach(i=>{S.mute[i]=on?1:0});if(p&&c.ly.length){if(!p.mx||typeof p.mx!=='object')p.mx={};c.ly.forEach(l=>{p.mx[l]=on?1:0})}after()},
    ts:function(){const c=engCh(e),on=!this.s();[...c.tr,...c.ly.map(l=>SX[l])].forEach(i=>{if(soloOn(i)!==on)soloTog(i)});after()}}}
  const made=[];
  function add(card,mod){if(!card||card.querySelector('.mms'))return;const cap=card.querySelector('.cap');if(!cap)return;const box=cap.querySelector('.cbtns');
    const w=document.createElement('span');w.className='mms';w.innerHTML='<button class="m" title="Tysta modulen (mute)" aria-label="Mute">M</button><button class="s" title="Spela bara den här (solo)" aria-label="Solo">S</button>';
    w.querySelector('.m').onclick=e=>{e.stopPropagation();mod.tm();paint()};w.querySelector('.s').onclick=e=>{e.stopPropagation();mod.ts();paint()};
    w.addEventListener('dblclick',e=>e.stopPropagation());
    if(box)box.before(w);else cap.appendChild(w);made.push([w,mod])}
  function paint(){made.forEach(([w,mod])=>{if(!w.isConnected)return;let m=false,s=false,n=false;try{m=mod.m();s=mod.s();n=mod.none?mod.none():false}catch(e){globalThis.__el&&globalThis.__el(e)}
    w.querySelector('.m').classList.toggle('on',m);w.querySelector('.s').classList.toggle('on',s);w.classList.toggle('none',n);if(n)w.title='Inget spår spelar den här synthen just nu'})}
  function scan(){add(document.querySelector('.card[data-card="starter"]'),MOD.starter);add(document.querySelector('.card[data-card="stammor"]'),MOD.stammor);add(document.querySelector('.card[data-card="loops"]'),MOD.loops);
    document.querySelectorAll('.card[data-clone]').forEach(c=>add(c,engMod(c.dataset.clone)))}
  scan();setTimeout(scan,800);setTimeout(scan,2500);setInterval(paint,300);
  window.__mms={scan,paint,engCh,muted:i=>isMuted(i),anySolo:()=>anySolo()};
})();

