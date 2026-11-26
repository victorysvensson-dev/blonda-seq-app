/* ================= Undo for everything. The old undo only remembered notes, sounds and the mix, and only where the code asked for
   it. Now every change to what a project saves (patterns, glitch A–D, Starter, song, clips, loops, mixer, effects …) becomes an undo
   step on its own: the whole project is remembered when it has changed and then been still for a moment, so a knob turn is one step,
   not hundreds. ⌘Z / ⇧⌘Z and the ↶ ↷ buttons (top bar, studio, tracker, piano roll) all use it. Which track or pattern you have
   selected is not part of it, so undo never just jumps around. ================= */
(()=>{const EX=new Set(['sel','pat']),MAX=40;
  const take=()=>{const o={};PKEYS.forEach(k=>{if(!EX.has(k)&&S[k]!==undefined)o[k]=S[k]});return JSON.stringify(o)};
  let last=take(),U=[],R=[],busy=false,tm=null;const DIFF=[];
  /* only changes that follow something you did (click, key, drag, wheel, MIDI from a controller) become steps; changes the app makes
     on its own (setting itself up, things that move while it plays) just become the new starting point */
  let act=-1e9;const touch=e=>{if(!e||e.isTrusted)act=performance.now()};['pointerdown','keydown','wheel','input','change'].forEach(ev=>document.addEventListener(ev,touch,{capture:true,passive:true}));
  window.__undoTouch=touch;
  function check(){tm=null;if(busy)return;let c;try{c=take()}catch(e){return}if(c===last)return;if(performance.now()-act>4000){last=c;return}try{const A=JSON.parse(last),B=JSON.parse(c);DIFF.push(Object.keys(B).filter(k=>JSON.stringify(A[k])!==JSON.stringify(B[k])).join(','));if(DIFF.length>40)DIFF.shift()}catch(e){globalThis.__el&&globalThis.__el(e)}U.push(last);if(U.length>MAX)U.shift();R.length=0;last=c;paintBtns()}
  const soon=()=>{clearTimeout(tm);tm=setTimeout(check,450)};
  const _save=save;save=function(){const r=_save.apply(this,arguments);if(!busy)soon();return r};
  setInterval(()=>{if(!tm&&!busy)check()},1500);
  function apply(js){busy=true;try{const d=JSON.parse(js);const loopsCh=JSON.stringify(S.loops)!==JSON.stringify(d.loops);
      PKEYS.forEach(k=>{if(!EX.has(k)&&k in d)S[k]=d[k]});
      TRACKS.forEach(t=>{if(!S.params[t.id])S.params[t.id]=JSON.parse(JSON.stringify(DEF_P[t.id]))});while(S.mute.length<TRACKS.length)S.mute.push(0);
      for(const e in DEFS.eng)S.eng[e]=Object.assign({},DEFS.eng[e],S.eng[e]||{});
      if(loopsCh&&typeof loopsKill==='function'){try{loopsKill();renderLoops();warmSamples()}catch(e){globalThis.__el&&globalThis.__el(e)}}
      if(typeof rSel!=='undefined')rSel.clear();
      refreshSound();renderAll();renderChain();applyMaster();_save()}
    finally{last=take();busy=false;clearTimeout(tm);tm=null;paintBtns()}}
  const flush=()=>{if(tm){clearTimeout(tm);check()}};
  undo=function(){flush();if(!U.length){toast('Inget att ångra');return}R.push(last);apply(U.pop());toast('Ångrat')};
  redo=function(){flush();if(!R.length){toast('Inget att göra om');return}U.push(last);apply(R.pop());toast('Gjort om')};
  /* buttons in SEQ.3's top bar and in the studio */
  const btns=[];
  const mk=(host,cls,before)=>{if(!host)return;const w=document.createElement('span');w.className='ux '+cls;
    w.innerHTML='<button data-ux="u" title="Ångra (⌘Z)">↶</button><button data-ux="r" title="Gör om (⇧⌘Z)">↷</button>';
    w.addEventListener('click',e=>{const b=e.target.closest('[data-ux]');if(!b)return;e.stopPropagation();b.dataset.ux==='u'?undo():redo()});
    host.insertBefore(w,before||null);btns.push(w)};
  function paintBtns(){btns.forEach(w=>{w.querySelector('[data-ux="u"]').disabled=!U.length&&!tm;w.querySelector('[data-ux="r"]').disabled=!R.length})}
  const hx=document.querySelector('header .hx');if(hx)mk(hx,'ux-top',hx.firstChild);
  const dt=document.querySelector('#daw .dw-top');if(dt)mk(dt,'ux-daw',dt.querySelector('.dw-sp'));
  const st=document.createElement('style');st.textContent=`
.ux{display:inline-flex;gap:2px;flex:none}
.ux button{font:inherit;color:inherit;border:0;cursor:pointer;background:none}
.ux button:disabled{opacity:.3;cursor:default}
.ux-top button{width:30px;height:30px;font-size:15px;border-radius:var(--rad,9px)}
.ux-top button:not(:disabled):hover{background:rgba(255,255,255,.08)}
body.bg-light .ux-top button:not(:disabled):hover,body.look-dots .ux-top button:not(:disabled):hover{background:rgba(17,18,17,.08)}
.ux-daw{margin-left:8px}
.ux-daw button{height:36px;width:36px;font-size:15px!important;border-radius:var(--dk-r);box-shadow:inset 0 0 0 1px var(--dk-line)}
.ux-daw button:not(:disabled):hover{background:var(--dk-p3)}`;document.head.appendChild(st);
  paintBtns();
  window.__undo={U:()=>U.length,R:()=>R.length,check,DIFF,save:()=>save()}})();

