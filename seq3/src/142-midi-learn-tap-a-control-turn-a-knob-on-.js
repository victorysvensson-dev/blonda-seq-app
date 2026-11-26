/* ---------- MIDI learn: tap a control, turn a knob on your controller ---------- */
(function mlMod(){const LS='blonda.midi.map';let MAP=[];try{MAP=JSON.parse(localStorage.getItem(LS)||'[]')||[]}catch(e){globalThis.__el&&globalThis.__el(e)}
  const saveMap=()=>{try{localStorage.setItem(LS,JSON.stringify(MAP))}catch(e){globalThis.__el&&globalThis.__el(e)}};
  let on=false,arm=null,armEl=null,bar=null,rq=0,pend=new Set();
  const resolve=(el,ev)=>{const s=el._mls;if(!s)return null;const f=v=>typeof v==='function'?v(ev):v;const rg=s.range?f(s.range):[s.min,s.max];
    return {key:f(s.key),label:f(s.label),min:rg[0],max:rg[1],int:!!s.int,step:s.step||0,curve:s.curve||''}};
  const tIx=id=>TRACKS.findIndex(t=>t.id===id);
  function write(m,v01){let v=m.curve==='sq'?v01*v01:v01;v=m.min+v*(m.max-m.min);if(m.int)v=Math.round(v);else if(m.step)v=Math.round(v/m.step)*m.step;
    const [a,b,c]=m.key.split('.');
    if(a==='e'){engE(b)[c]=v;if(b==='bris'&&typeof brisApplyAll==='function')brisApplyAll()}
    else if(a==='s'){if(S.synth&&S.synth[b])S.synth[b][c]=v}
    else if(a==='p'){if(!S.params[b])return;if(c==='pan'&&Math.abs(v)<.03)v=0;S.params[b][c]=v;applyTrack(tIx(b))}
    else if(a==='f'){if(c==='filt'&&Math.abs(v)<.03)v=0;tfxOf(b)[c]=v;applyTfx(tIx(b))}
    else if(a==='x'){if(typeof motWrite==='function')motWrite(m.key,v)}else if(a==='m'){if(b==='filter'&&Math.abs(v)<.03)v=0;S.master[b]=v;applyMaster();if(b==='vol')try{masterKnobs.forEach(k=>k.refresh&&k.refresh())}catch(e){globalThis.__el&&globalThis.__el(e)}}
    pend.add(m.key);if(window.MOT)MOT.cc(m.key,v);if(!rq)rq=requestAnimationFrame(repaint);clearTimeout(write.t);write.t=setTimeout(save,400)}
  function repaint(){rq=0;const keys=pend;pend=new Set();const pre=new Set([...keys].map(k=>k[0]));
    document.querySelectorAll('.mlk').forEach(el=>{const s=el._mls;if(!s||!s.paint)return;const r=resolve(el);if(r&&keys.has(r.key))try{s.paint()}catch(e){globalThis.__el&&globalThis.__el(e)}});
    try{if(pre.has('p'))renderSnd();if(pre.has('f'))renderDial();if(pre.has('s'))renderSynth();if(pre.has('m')&&typeof renderPlugs==='function')renderPlugs()}catch(e){globalThis.__el&&globalThis.__el(e)}}
  function cc(ch,n,val){if(on&&arm){MAP=MAP.filter(m=>!(m.ch===ch&&m.cc===n)&&m.key!==arm.key);MAP.push(Object.assign({ch,cc:n},arm));saveMap();
      toast('cc '+n+' → '+arm.label);flashEl(armEl);disarm();badges();if(window.MIDIX)MIDIX.repaint();return true}
    let hit=false;MAP.forEach(m=>{if(m.ch===ch&&m.cc===n){write(m,val/127);hit=true}});return hit}
  function flashEl(el){if(!el)return;el.classList.add('mlok');setTimeout(()=>el.classList.remove('mlok'),700)}
  function disarm(){arm=null;if(armEl)armEl.classList.remove('mlarm');armEl=null;paintBar()}
  function badges(){document.querySelectorAll('.mlk').forEach(el=>{const r=on&&resolve(el);const m=r&&MAP.find(x=>x.key===r.key);if(m)el.dataset.cc=m.cc;else delete el.dataset.cc})}
  function paintBar(){if(!bar)return;const m=arm&&MAP.find(x=>x.key===arm.key);
    bar.innerHTML=`<i class="mld"></i><span>${arm?`<b>${esc(arm.label)}</b> · vrid på en ratt på din controller${m?' · nu cc '+m.cc:''}`:'<b>midi learn</b> · tryck på en ratt eller reglage'}</span>${m?'<button data-a="del">ta bort</button>':''}<button data-a="done" class="go">klar</button>`;
    bar.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(b.dataset.a==='del'){MAP=MAP.filter(x=>x.key!==arm.key);saveMap();badges();disarm();toast('Koppling borttagen')}else toggle(false)})}
  const esc=x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  async function toggle(v){on=v==null?!on:!!v;document.body.classList.toggle('mlearn',on);disarm();
    if(on){if(!navigator.requestMIDIAccess){toast('MIDI learn kräver Chrome eller Edge på dator');on=false;document.body.classList.remove('mlearn');return}
      if(window.MIDIX&&MIDIX.connect)await MIDIX.connect();bar=document.createElement('div');bar.className='mlbar';document.body.appendChild(bar);paintBar()}
    else if(bar){bar.remove();bar=null}badges()}
  /* while learning, a tap on a learnable control arms it instead of moving it */
  const grab=e=>{if(!on)return;const el=e.target.closest&&e.target.closest('.mlk');if(!el||e.target.closest('.mlbar'))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    if(e.type!=='pointerdown')return;if(armEl)armEl.classList.remove('mlarm');arm=resolve(el,e);armEl=el;el.classList.add('mlarm');paintBar()};
  ['pointerdown','pointerup','click','mousedown','touchstart'].forEach(t=>window.addEventListener(t,grab,{capture:true,passive:false}));
  document.addEventListener('keydown',e=>{if(on&&e.key==='Escape')toggle(false)});
  window.MLX={cc,toggle,get on(){return on},list:()=>MAP,remove:i=>{MAP.splice(i,1);saveMap();badges()},clear:()=>{MAP=[];saveMap();badges();toast('Alla MIDI-kopplingar borttagna')},_write:write}})();

