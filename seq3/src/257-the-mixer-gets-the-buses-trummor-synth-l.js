/* ================= the mixer gets the buses: trummor · synth · loopar strips between the channels and the master =================
   fader = bus level, m / s = bus mute / solo (several), meter = the bus output; a small "pump" lamp when the bus pumps. */
(()=>{const mk=()=>{if(!mxEl||mxEl.querySelector('.ms.bus'))return;const master=mxEl.querySelector('.ms.master');if(!master)return;
  const sep=document.createElement('div');sep.className='ms-sep';sep.innerHTML='<span>bussar</span>';mxEl.insertBefore(sep,master);
  BUSES.forEach(({k,name,hex})=>{const el=document.createElement('div');el.className='ms bus';el.style.setProperty('--tc',hex);el.dataset.b=k;
    el.innerHTML=`<div class="nm"><i>${name[0].toUpperCase()}</i><span>${name}</span></div><div class="pn bp" title="Pump"><b></b></div><div class="fd"><div class="tr"><div class="fl"></div><div class="cap0"></div></div><div class="mt"><i></i></div></div><div class="db"></div><div class="bt"><button class="m" aria-label="Mute ${name}">M</button><button class="s" aria-label="Solo ${name}">S</button></div>`;
    /* desk view (mixer full screen): filter, drive, glue and pump as knobs, the name under the strip */
    const ks=document.createElement('div');ks.className='mks';const KN=[['filter','filter',-1,1],['drive','drive',0,1],['glue','glue',0,1],['pump','pump',0,1]];
    KN.forEach(([key,lab,lo,hi])=>{if(key==='pump'&&k==='dr'){const sp=document.createElement('div');sp.className='mk';sp.style.visibility='hidden';sp.innerHTML='<span class="mk-k"><i></i></span><em>-</em><b>-</b>';ks.appendChild(sp);return}
      const w=document.createElement('div');w.className='mk'+(key==='filter'?' pan':'');w.innerHTML=`<span class="mk-k"><i></i></span><em>${lab}</em><b></b>`;
      const get=()=>key==='pump'?pumpAmt(k):busOf(k)[key],set=v=>{if(key==='pump'){if(k==='sy'){S.master.pump=v;applyMaster()}else pumpOf(k).amt=v}else{busOf(k)[key]=key==='filter'&&Math.abs(v)<.04?0:v;applyBuses()}};
      const paint=()=>{const v=get();w.style.setProperty('--v',((v-lo)/(hi-lo)).toFixed(3));w.querySelector('b').textContent=key==='filter'?(Math.abs(v)<.03?'av':(v<0?'lp':'hp')+Math.round(Math.abs(v)*100)):Math.round(v*100)};
      let on=false,y0=0,v0=0,lt=0;w.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();const n=performance.now();if(n-lt<300){set(key==='filter'?0:key==='pump'&&k==='sy'?.4:0);paint();save();lt=0;return}lt=n;on=true;y0=e.clientY;v0=get();try{w.setPointerCapture(e.pointerId)}catch(_){globalThis.__el&&globalThis.__el(_)}});
      w.addEventListener('pointermove',e=>{if(!on)return;set(Math.max(lo,Math.min(hi,v0+(y0-e.clientY)/160*(hi-lo))));paint()});const up=()=>{if(on){on=false;save()}};w.addEventListener('pointerup',up);w.addEventListener('pointercancel',up);
      w._paint=paint;paint();ks.appendChild(w)});
    el.insertBefore(ks,el.querySelector('.pn'));const lab=document.createElement('div');lab.className='mlab';lab.textContent=name;el.appendChild(lab);el._ks=ks;
    mxDrag(el.querySelector('.fd'),()=>Math.sqrt(busOf(k).lv/1.5),v=>{busOf(k).lv=+(v*v*1.5).toFixed(4);applyBuses()},'y',Math.sqrt(1/1.5));
    el.querySelector('.m').onclick=()=>{busOf(k).mute=busOf(k).mute?0:1;applyBuses();save()};el.querySelector('.s').onclick=()=>{busOf(k).solo=busOf(k).solo?0:1;applyBuses();save()};
    el.querySelector('.nm').onclick=()=>{const c=document.querySelector('.card[data-card="master"]');if(c)c.scrollIntoView({behavior:'smooth',block:'center'})};
    mxEl.insertBefore(el,master)})};
  {const _b=buildMixer;buildMixer=function(){_b.apply(this,arguments);mk()}}mk();
  const pk={dr:0,sy:0,lp:0};
  (function loop(){requestAnimationFrame(loop);const card=mxEl&&mxEl.closest('.card');if(!card||!card.offsetParent)return;
    mxEl.querySelectorAll('.ms.bus').forEach(el=>{const k=el.dataset.b,b=busOf(k),on=busOn(k);el.querySelector('.tr').style.setProperty('--fv',Math.sqrt(b.lv/1.5).toFixed(4));
      el.querySelector('.db').textContent=b.lv<.001?'-∞':(20*Math.log10(b.lv)).toFixed(1);el.querySelector('.m').classList.toggle('on',!!b.mute);el.querySelector('.s').classList.toggle('on',!!b.solo);el.classList.toggle('muted',!on);
      let q=0;if(ctx&&A.buses){const B=A.buses[k];if(!B._mb)B._mb=new Float32Array(B.an.fftSize);B.an.getFloatTimeDomainData(B._mb);for(let i=0;i<B._mb.length;i+=2)q=Math.max(q,Math.abs(B._mb[i]))}
      pk[k]=Math.max(q,pk[k]*.9);const mt=el.querySelector('.mt i');mt.style.setProperty('--lv',lvOf(pk[k]).toFixed(3));mt.classList.toggle('hot',pk[k]>.89);
      const amt=k==='dr'?0:pumpAmt(k),g=k==='sy'?(A.duck?A.duck.gain.value:1):(A.buses?A.buses.lp.pg.gain.value:1);const bp=el.querySelector('.bp');bp.classList.toggle('on',amt>0);bp.style.setProperty('--pg',(1-g).toFixed(3));if(el._ks&&card.closest('#fullHost'))el._ks.querySelectorAll('.mk').forEach(w=>w._paint&&w._paint())})})()})();

window.__seq={S,play,stop,applyAll,GX,nudgeStep,setLook,SMP,SE,Aref:()=>A,openExport,EXP,imp:f=>importFiles(f),aLoop:(sm,k)=>assignLoop(sm,k),ded:i=>openEditor(i),hit:(sm,i)=>assignHit(sm,i),smpVoice:(...a)=>smpVoice(...a),dice:n=>applyDice(n),roll:{open:openRoll,RN,rX,rY,rGeom,rh:()=>rRowH,scrollTo:n=>{rSY=Math.max(0,(HI-n)*rRowH-200);rClamp()}}};
})();
