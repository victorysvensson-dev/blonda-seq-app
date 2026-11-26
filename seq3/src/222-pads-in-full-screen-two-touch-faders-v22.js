/* ================= Pads in full screen: two touch faders (v226) =================
   Left: the volume of the track you play (the last pad you hit) – the same fader as in the mixer.
   Right: the note repeat rate – av · 1/4 · 1/8 · 1/8T · 1/16 · 1/16T · 1/32 · 1/32T · 1/64, top = fastest. It works on the pads you
   hold right now (all of them, as on an MPC), otherwise on the last pad you hit. A pad with note repeat turned on (the dots) keeps
   the rate you set; a pad without plays in note repeat only while the fader is touched and is back to none when you let go.
   Touch anywhere on a fader and it jumps there (a touch fader, not a knob). Shown only in full screen, when there is room. ================= */
(()=>{
  const card=document.querySelector('.card[data-card="pads"]'),grid=card&&card.querySelector('.pads');if(!card||!grid||!window.padRepRates)return;
  const RATES=padRepRates,ORANGE='#F08A24';let pk='';
  const mk=(k,lab)=>{const f=document.createElement('div');f.className='pfad';f.dataset.k=k;
    f.innerHTML=`<b class="pf-t"></b><div class="pf-tr" role="slider" aria-label="${lab}"><i class="pf-fill"></i><i class="pf-cap"></i><span class="pf-ticks"></span></div><em class="pf-v"></em><small class="pf-l">${lab}</small>`;card.appendChild(f);return f};
  const FV=mk('vol','volym'),FR=mk('rate','note repeat');
  /* the rate fader's steps, labelled */
  FR.querySelector('.pf-ticks').innerHTML=RATES.map((r,k)=>`<i style="bottom:${(k/(RATES.length-1)*100).toFixed(2)}%"><s>${r[0]}</s></i>`).join('');
  FV.querySelector('.pf-ticks').innerHTML='<i class="def"></i>';
  const sel=()=>Math.max(0,Math.min(TRACKS.length-1,S.sel|0));
  const rateTargets=()=>{const h=(window.padRepHeld?padRepHeld():[]).filter(i=>!TRACKS[i].mel||true);return h.length?h:[sel()]};
  const rIdx=id=>{const v=padRepEff(id);const k=RATES.findIndex(r=>r[0]===v);return k<0?0:k};
  /* drag: the value follows the finger, straight from where it touches */
  function drag(f,set,end,lite){const tr=f.querySelector('.pf-tr');let on=null;
    const at=e=>{const r=tr.getBoundingClientRect();return Math.max(0,Math.min(1,1-(e.clientY-r.top)/r.height))};
    tr.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(on!==null)return;on=e.pointerId;try{tr.setPointerCapture(e.pointerId)}catch(_){globalThis.__el&&globalThis.__el(_)}try{pushHist()}catch(_){globalThis.__el&&globalThis.__el(_)}f.classList.add('drag');set(at(e),true);if(!lite)paint()});
    tr.addEventListener('pointermove',e=>{if(e.pointerId!==on)return;set(at(e),false);if(!lite)paint()});
    const up=e=>{if(e.pointerId!==on)return;on=null;f.classList.remove('drag');if(end)end();try{save()}catch(_){globalThis.__el&&globalThis.__el(_)}paint()};tr.addEventListener('pointerup',up);tr.addEventListener('pointercancel',up)}
  /* (v242) the volume follows the finger smoothly: while dragging only the level and the track's gain change, once per frame
     (the gain glides to it); the sound and dial cards behind the full-screen view are redrawn when the finger lets go.
     Redrawing them on every move (under the blurred full screen) is what made the fader stutter on the iPad. */
  let volU=null,volRaf=0,volDirty=false;
  const volApply=()=>{volRaf=0;if(volU===null)return;const i=sel(),id=TRACKS[i].id,lv=+(volU*volU).toFixed(4);volU=null;if(S.params[id].level===lv)return;
    S.params[id].level=lv;volDirty=true;try{const c=A.ch[i];if(ctx&&c&&c.g)c.g.gain.setTargetAtTime(isMuted(i)?0:lv,ctx.currentTime,.012);else applyTrack(i)}catch(e){try{applyTrack(i)}catch(_){globalThis.__el&&globalThis.__el(_)}}paint()};
  drag(FV,u=>{volU=u;if(!volRaf)volRaf=requestAnimationFrame(volApply)},()=>{if(volRaf){cancelAnimationFrame(volRaf);volApply()}
    if(volDirty){volDirty=false;try{applyTrack(sel())}catch(e){globalThis.__el&&globalThis.__el(e)}try{renderSnd();renderDial()}catch(e){globalThis.__el&&globalThis.__el(e)}}},true);
  /* the rate fader. A pad whose note repeat is turned on with the dots: the fader changes its rate and it stays.
     A pad without: the fader plays it in note repeat only while the fader is touched; let go and the pad has no note repeat again.
     Which kind a pad is, is decided the first time the fader reaches it in a touch (pads you press while holding the fader count too). */
  let MODE={};
  drag(FR,(u,first)=>{if(first)MODE={};const k=Math.round(u*(RATES.length-1)),v=RATES[k][0];
    rateTargets().forEach(i=>{const id=TRACKS[i].id;if(!MODE[id])MODE[id]=padRepOn(id)?'keep':'temp';
      if(MODE[id]==='keep'){if(rIdx(id)!==k)padRepSet(id,v)}else if(padRepEff(id)!==v)padRepTemp(id,k?v:null)});
    if(window.padRepRefresh)padRepRefresh()},
    ()=>{for(const id in MODE)if(MODE[id]==='temp')padRepTemp(id,null);MODE={}});
  /* place them beside the grid: in landscape in the room left and right of it, otherwise the grid gives them room */
  let shown=false,raf=0,pfr='';
  /* measured from the layout (offsets), not the screen: the full-screen view animates in with a scale, which must not move them */
  function place(){raf=0;const full=!!card.closest('.fullhost'),cw=card.clientWidth,room=full&&cw>=640;card.classList.toggle('pf-on',room);
    FV.hidden=FR.hidden=!room;shown=room;if(!room)return;
    const W=Math.max(54,Math.min(76,cw*.06)),gap=Math.max(14,Math.min(26,cw*.02)),v=Math.round(W+gap)+'px';if(v!==pfr){pfr=v;card.style.setProperty('--pfr',v)}
    let x=0,y=0,e=grid;while(e&&e!==card){x+=e.offsetLeft;y+=e.offsetTop;e=e.offsetParent}if(e!==card)return;
    const gw=grid.offsetWidth,gh=grid.offsetHeight;
    [[FV,x-gap-W],[FR,x+gw+gap]].forEach(([f,l])=>{const st=f.style,L=Math.round(l)+'px',T=Math.round(y)+'px',Wd=Math.round(W)+'px',H=Math.round(gh)+'px';if(st.left!==L)st.left=L;if(st.top!==T)st.top=T;if(st.width!==Wd)st.width=Wd;if(st.height!==H)st.height=H});pk=''}
  const later=()=>{if(!raf)raf=requestAnimationFrame(place)};
  new ResizeObserver(later).observe(card);new ResizeObserver(later).observe(grid);
  const fh=document.querySelector('.fullhost');if(fh)new MutationObserver(()=>{later();setTimeout(later,320)}).observe(fh,{childList:true});
  addEventListener('resize',later);
  /* paint: the track's name, its volume in its colour, the rate in orange */
  function paint(){if(!shown)return;const i=sel(),t=TRACKS[i],id=t.id,u=Math.sqrt(S.params[id].level||0),tg=rateTargets(),rk=rIdx(TRACKS[tg[0]].id);
    const k=[i,u.toFixed(3),tg.join(','),rk,t.hex].join('|');if(k===pk)return;pk=k;
    FV.querySelector('.pf-t').textContent=t.name.toLowerCase();FV.querySelector('.pf-v').textContent=String(Math.round(u*100));
    FV.style.setProperty('--pf',(u*100).toFixed(2)+'%');FV.style.setProperty('--pc',t.hex);
    const d=FV.querySelector('.pf-ticks .def'),dl=DEF_P[id]&&DEF_P[id].level;if(d){d.style.bottom=(Math.sqrt(dl||0)*100).toFixed(2)+'%'}
    FR.querySelector('.pf-t').textContent=tg.length>1?tg.length+' pads':TRACKS[tg[0]].name.toLowerCase();FR.querySelector('.pf-v').textContent=RATES[rk][0];
    FR.style.setProperty('--pf',(rk/(RATES.length-1)*100).toFixed(2)+'%');FR.style.setProperty('--pfu',(rk/(RATES.length-1)).toFixed(4));FR.style.setProperty('--pc',rk?ORANGE:'rgba(232,230,220,.28)');FR.classList.toggle('on',rk>0);
    FR.querySelectorAll('.pf-ticks i').forEach((e,j)=>e.classList.toggle('cur',j===rk))}
  window.padFadPaint=()=>{pk='';paint()};setInterval(paint,90);place();
  const css=document.createElement('style');css.textContent=`
.card[data-card="pads"]{position:relative}
.pfad{position:absolute;display:flex;flex-direction:column;align-items:center;gap:8px;z-index:3;user-select:none;-webkit-user-select:none}
.pfad[hidden]{display:none}
.pfad .pf-t{font:500 11px var(--f-mono);letter-spacing:.06em;color:var(--fg);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.2}
.pfad .pf-tr{position:relative;flex:1;width:100%;border-radius:12px;background:rgba(232,230,220,.045);box-shadow:inset 0 0 0 1px rgba(232,230,220,.1);touch-action:none;cursor:ns-resize;overflow:hidden}
.pfad .pf-fill{position:absolute;left:0;right:0;bottom:0;height:var(--pf,0%);background:linear-gradient(to top,color-mix(in srgb,var(--pc) 34%,transparent),color-mix(in srgb,var(--pc) 14%,transparent));transition:height .06s linear}
.pfad .pf-cap{position:absolute;left:8px;right:8px;bottom:calc(var(--pf,0%) - 2px);height:4px;border-radius:2px;background:var(--pc);box-shadow:0 0 10px color-mix(in srgb,var(--pc) 45%,transparent);transition:bottom .06s linear}
.pfad.drag .pf-fill,.pfad.drag .pf-cap{transition:none}
.pfad .pf-fill,.pfad .pf-cap{will-change:height,bottom}
.pfad.drag .pf-tr{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--pc) 60%,transparent)}
.pfad .pf-ticks{position:absolute;inset:14px 0;pointer-events:none}
.pfad .pf-ticks i{position:absolute;left:0;right:0;height:0}
.pfad .pf-ticks i::before{content:"";position:absolute;right:6px;width:7px;height:1px;background:rgba(232,230,220,.28);transform:translateY(-.5px)}
.pfad .pf-ticks i s{position:absolute;left:8px;transform:translateY(-50%);font:500 9px var(--f-mono);letter-spacing:.04em;color:rgba(232,230,220,.38);text-decoration:none;white-space:nowrap}
.pfad .pf-ticks i.cur s{color:var(--pc)}
.pfad .pf-ticks i.cur::before{background:var(--pc);width:10px}
.pfad[data-k="vol"] .pf-ticks .def::before{left:6px;right:6px;width:auto;background:rgba(232,230,220,.18)}
.pfad .pf-v{font:500 13px var(--f-mono);font-style:normal;color:var(--fg);letter-spacing:.04em;line-height:1}
.pfad[data-k="rate"]:not(.on) .pf-v{color:var(--mute)}
.pfad[data-k="rate"].on .pf-v{color:${ORANGE}}
.pfad .pf-l{font:500 8.5px var(--f-mono);letter-spacing:.14em;color:var(--mute);text-transform:lowercase;white-space:nowrap}
.pfad .pf-tr{margin-top:-2px}
/* the rate fader's steps sit inside it, the label of the current one in orange */
.pfad[data-k="rate"] .pf-ticks i s{left:9px}
/* the rate fader's handle sits by the marks on the right, so the chosen step's name stays readable */
.pfad[data-k="rate"] .pf-cap{left:auto;right:5px;width:16px;bottom:calc(14px + (100% - 28px) * var(--pfu,0) - 2px)}
.pfad[data-k="rate"] .pf-fill{height:calc(14px + (100% - 28px) * var(--pfu,0))}
.pfad[data-k="vol"] .pf-ticks{inset:2px 0}
/* the grid leaves room for the two faders (in landscape there is room already, in portrait it gets a little narrower) */
body .fullhost .card[data-card="pads"].pf-on .pads{max-width:min(calc(100% - var(--pfr,100px) * 2),calc((100vh - 170px) * 5 / var(--mrows,4)))!important;margin-inline:auto}`;document.head.appendChild(css);
})();

