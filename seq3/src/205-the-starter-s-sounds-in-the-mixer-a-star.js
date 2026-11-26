/* ================= The Starter's sounds in the mixer: a "starter" group between the channels and the buses, one strip each for
   the Starter as a whole and for its layers (chord, top, sub, air) and its two sample slots (voice, sound). A fader is the very
   same value as the "level" knob in the Starter (they move together), M mutes and S solos like on the channels, and the meter
   shows that layer after its level. ================= */
(()=>{if(typeof mxEl==='undefined'||!mxEl)return;
  const CH=[{k:'all',i:'st',name:'total',hex:'#B9A6FF'},{k:'ack',i:'ch',name:'chord',hex:'#F07AB0'},{k:'klo',i:'tp',name:'top',hex:'#6FD0C5'},
    {k:'sub',i:'sb',name:'sub',hex:'#B9A6FF'},{k:'luft',i:'ai',name:'air',hex:'#8A93A6'},{k:'s0',i:'vo',name:'voice',hex:'#E2C27A'},{k:'s1',i:'sn',name:'sound',hex:'#9FB6D8'}];
  const P=()=>stx(),SL=k=>/^s\d$/.test(k);
  /* the value behind each fader (0..1, the knob's own scale) and the gain it gives, as the Starter engine computes it */
  const get=k=>{const p=P();if(k==='all')return p.k.vol??.75;if(SL(k)){const q=(p.smp||[])[+k[1]];return q?(q.lv??.7):0}return p.ls[k]?p.ls[k].lv:0};
  const set=(k,v)=>{const p=P();v=Math.round(v*100)/100;if(k==='all')p.k.vol=v;else if(SL(k)){const q=(p.smp||[])[+k[1]];if(q)q.lv=v}else if(p.ls[k])p.ls[k].lv=v;
    if(STX.E)STX.E.apply(p);document.querySelectorAll('.card[data-card="starter"] :is(.sx-k,.sx-knobs .sx-k)').forEach(w=>w._pk&&w._pk())};
  const gain=k=>{const v=get(k);return k==='all'?v*v*.8:Math.pow(v/.75,2)};
  const def=k=>k==='all'?.75:k==='s0'?.6:k==='s1'?.55:.75;
  const isOn=k=>{const p=P();if(k==='all')return !!p.on;if(SL(k)){const q=(p.smp||[])[+k[1]];return !!(q&&q.on)}return !!(p.lay&&p.lay[k])};
  /* M is a mixer mute, like on the channels: it only silences the sound. The Starter keeps running (the 808 and the other
     channels that follow its chords keep following), and its own layer buttons are left as they are. Saved with the project. */
  const mxm=k=>{const m=P().mx;return !!(m&&m[k])};
  const tog=k=>{const p=P();if(!p.mx||typeof p.mx!=='object')p.mx={};p.mx[k]=p.mx[k]?0:1;save();if(STX.E)STX.E.apply(p)};
  const KNOBS=k=>k==='all'?[['eko','echo',.15],['rum','space',.12],['br','width',.7],['tejp','tape',.45]]:SL(k)?[['amt','often',.4],['fx','fx',.5]]:[['len','length',.5],['ton','tone',.5]];
  const kobj=k=>{const p=P();return k==='all'?p.k:SL(k)?(p.smp||[])[+k[1]]:p.ls[k]};
  const kget=(k,a)=>{const o=kobj(k);return o&&o[a]!=null?o[a]:.5};
  const kset=(k,a,v)=>{const o=kobj(k);if(!o)return;o[a]=Math.round(v*100)/100;if(a!=='lv')STX.pk='';const p=P();if(STX.E)STX.E.apply(p);document.querySelectorAll('.card[data-card="starter"] .sx-k').forEach(w=>w._pk&&w._pk())};
  const open=()=>{const t=[...document.querySelectorAll('.dw-tabs button')].find(b=>b.dataset.tab==='starter'||/^starter$/i.test(b.textContent.trim()));
    if(t&&t.offsetParent){t.click();return}const c=document.querySelector('#panes .card[data-card="starter"],#panes .card.stx');if(c)c.scrollIntoView({behavior:'smooth',block:'center'})};
  /* solo: the Starter's strips are part of the same solo as the channels. Their solos sit in the same list (S.solos, from place 40 on,
     so they are saved, undone and loaded with the project like the others). Solo a channel and the Starter falls silent; solo a
     Starter layer and the channels fall silent and, inside the Starter, only the soloed layers play (solo "total" = all of it). */
  const SB=40,SI=k=>SB+CH.findIndex(c=>c.k===k),sxSolo=k=>soloOn(SI(k)),sxAnyS=()=>CH.some(c=>sxSolo(c.k));
  const closed=k=>{if(!anySolo())return false;if(sxSolo('all'))return false;if(k==='all')return !sxAnyS();return !sxSolo(k)};
  const LG={ack:['ack','sw'],klo:['klo'],sub:['sub'],luft:['luft'],s0:['s0'],s1:['s1']};
  /* after the engine has set its levels, silence what the solo leaves out (cancel the engine's fade, then fade to 0) */
  function gate(E){if(!E||!ctx)return;const t=ctx.currentTime,off=g=>{if(!g)return;g.cancelAndHoldAtTime(t);g.setTargetAtTime(0,t,.015)};
    if(mxm('all')||closed('all')){off(E.vol.gain);return}for(const k in LG)if(mxm(k)||closed(k))LG[k].forEach(l=>off(E.lg[l]&&E.lg[l].gain))}
  const wrapE=()=>{const E=STX.E;if(!E||E._sxw)return;E._sxw=1;const ap=E.apply;E.apply=function(){const r=ap.apply(this,arguments);try{gate(E)}catch(e){globalThis.__el&&globalThis.__el(e)}return r};try{E.apply(stx())}catch(e){globalThis.__el&&globalThis.__el(e)}};
  {const _a=applyAll;applyAll=function(){const r=_a.apply(this,arguments);try{wrapE();if(STX.E)STX.E.apply(stx())}catch(e){globalThis.__el&&globalThis.__el(e)}return r}}
  function mk(){if(mxEl.querySelector('.ms.sx'))return;const before=mxEl.querySelector('.ms-sep,.ms.bus,.ms.master');if(!before)return;
    const sep=document.createElement('div');sep.className='ms-sep sx-sep';sep.innerHTML='<span>starter</span>';mxEl.insertBefore(sep,before);
    CH.forEach(c=>{const el=document.createElement('div');el.className='ms sx'+(c.k==='all'?' sx-all':'');el.dataset.sx=c.k;el.style.setProperty('--tc',c.hex);
      el.innerHTML=`<div class="nm"><i>${c.i}</i><span>${c.name}</span></div><div class="mks"></div><div class="pn" style="visibility:hidden"><b></b></div><div class="fd"><div class="tr"><div class="fl"></div><div class="cap0"></div></div><div class="mt"><i></i></div></div><div class="db"></div><div class="bt"><button class="m" aria-label="Mute ${c.name}">M</button><button class="s" aria-label="Solo ${c.name}">S</button></div><div class="mlab">${c.name}</div>`;
      el.querySelector('.nm').onclick=open;
      /* desk view (mixer full screen): the Starter's own knobs for this strip, the same values as in the Starter */
      {const ks=el.querySelector('.mks');const KN=KNOBS(c.k);for(let j=0;j<4;j++){const d=KN[j],w=document.createElement('div');w.className='mk';
        if(!d){w.style.visibility='hidden';w.innerHTML='<span class="mk-k"><i></i></span><em>-</em><b>-</b>';ks.appendChild(w);continue}
        w.innerHTML=`<span class="mk-k"><i></i></span><em>${d[1]}</em><b></b>`;w.title=d[1]+' · dra upp/ner · dubbeltryck = standard';
        const paint=()=>{const v=kget(c.k,d[0]);w.style.setProperty('--v',v.toFixed(3));w.querySelector('b').textContent=Math.round(v*100)};
        let on=false,y0=0,v0=0,lt=0;w.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();const n=performance.now();if(n-lt<300){kset(c.k,d[0],d[2]);paint();save();lt=0;return}lt=n;on=true;y0=e.clientY;v0=kget(c.k,d[0]);try{w.setPointerCapture(e.pointerId)}catch(_){globalThis.__el&&globalThis.__el(_)}});
        w.addEventListener('pointermove',e=>{if(!on)return;kset(c.k,d[0],Math.max(0,Math.min(1,v0+(y0-e.clientY)/160)));paint()});
        const up=()=>{if(on){on=false;save()}};w.addEventListener('pointerup',up);w.addEventListener('pointercancel',up);w._paint=paint;paint();ks.appendChild(w)}el._ks=ks}
      mxDrag(el.querySelector('.fd'),()=>get(c.k),v=>set(c.k,v),'y',def(c.k));
      el.querySelector('.m').onclick=()=>tog(c.k);
      el.querySelector('.s').onclick=()=>{soloTog(SI(c.k));applyAll();if(typeof renderSel==='function')renderSel();save()};
      el._x={tr:el.querySelector('.tr'),mt:el.querySelector('.mt i'),db:el.querySelector('.db'),m:el.querySelector('.m'),s:el.querySelector('.s'),k:'',pk:0};
      mxEl.insertBefore(el,before)})}
  {const _b=buildMixer;buildMixer=function(){_b.apply(this,arguments);mk()}}mk();
  /* meters: a tap after each layer's level (made once per engine) */
  let tapE=null,taps={};
  const tapOf=k=>{const E=STX.E;if(!E||!ctx)return null;if(tapE!==E){tapE=E;taps={}}if(taps[k])return taps[k];
    const an=ctx.createAnalyser();an.fftSize=256;
    if(k==='all'){if(!E.an)return null;taps[k]=E.an;return E.an}
    const src=k==='ack'?[E.lg.ack,E.lg.sw]:[E.lg[k]];if(!src[0])return null;src.forEach(n=>n&&n.connect(an));taps[k]=an;return an};
  (function loop(){requestAnimationFrame(loop);wrapE();const card=mxEl.closest('.card');if(!card||!card.offsetParent)return;const p=P(),stOn=!!p.on;
    mxEl.querySelectorAll('.ms.sx').forEach(el=>{const k=el.dataset.sx,X=el._x;if(!X)return;const v=get(k),on=isOn(k),so=sxSolo(k),cl=closed(k),mu=mxm(k),key=v+'|'+on+'|'+stOn+'|'+so+'|'+cl+'|'+mu;
      if(key!==X.k){X.k=key;X.tr.style.setProperty('--fv',v.toFixed(4));X.db.textContent=toDb(gain(k));X.m.classList.toggle('on',mu);X.s.classList.toggle('on',so);el.classList.toggle('muted',mu||!on||!stOn||cl)}
      let q=0;const an=tapOf(k);if(an){if(!X.buf||X.buf.length!==an.fftSize)X.buf=new Float32Array(an.fftSize);const b=X.buf;an.getFloatTimeDomainData(b);for(let i=0;i<b.length;i+=2){const a=Math.abs(b[i]);if(a>q)q=a}}
      if(el._ks&&card.closest('#fullHost'))el._ks.querySelectorAll('.mk').forEach(w=>w._paint&&w._paint());
      X.pk=Math.max(q,X.pk*.9);X.mt.style.setProperty('--lv',lvOf(X.pk).toFixed(3));X.mt.classList.toggle('hot',X.pk>.89)})})();
  /* with the Starter's strips there are more channels: a strip never gets narrower than its buttons (the row scrolls sideways
     instead of strips running into each other), and the buses' faders start at the same height as everyone else's */
  {const st=document.createElement('style');st.textContent=`
.card.mixer .mx{display:flex;align-items:stretch}
.card.mixer .mx>.ms{flex:1 1 0;min-width:52px;box-sizing:border-box}
.card.mixer .mx>.ms-sep{flex:0 0 16px}
.fullhost .card.mixer .mx>.ms{min-width:60px}
/* the master stays in view at the right edge while the channels scroll under it */
.card.mixer .mx>.ms.master{position:sticky;right:-6px;z-index:2;background:#121215!important}
body.look-dots :is(#panes,#fullHost,.daw .dw-slot,.daw .dw-cl) .card.mixer .mx>.ms.master{background:#121215!important}
.card.mixer .mx-wrap.ovf .mx>.ms.master{box-shadow:-6px 0 0 #121215,-14px 0 14px -6px rgba(0,0,0,.55)}
.mixer .ms{min-width:0}
.mixer .ms.bus .pn.bp{margin-block:5px}`;document.head.appendChild(st)}
  /* mark the row when it is wider than the card (a soft edge on the master shows that channels continue under it) */
  {const w=mxEl.closest('.mx-wrap');if(w){const ck=()=>w.classList.toggle('ovf',w.scrollWidth>w.clientWidth+1&&w.scrollLeft<w.scrollWidth-w.clientWidth-1);new ResizeObserver(ck).observe(w);w.addEventListener('scroll',ck,{passive:true});setInterval(ck,1000);ck()}}
  /* a vertical wheel over the mixer scrolls it sideways when it does not fit */
  mxEl.closest('.mx-wrap')?.addEventListener('wheel',e=>{const w=e.currentTarget;if(w.scrollWidth<=w.clientWidth+1||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;if(e.target.closest('.fd,.pn,.mk'))return;w.scrollLeft+=e.deltaY;e.preventDefault()},{passive:false});
  window.__mixstx={CH,get,set,isOn,tog,SI,closed}})();

