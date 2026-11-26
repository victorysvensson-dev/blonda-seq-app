/* ================= Phone: a calmer header (v228) =================
   On a phone held upright the header shows only the logo, the menu button and the tempo. Everything that was on the second row
   (undo, idea, studio, the library, patterns A–D, settings, preview, motions, language) and the swing move into the menu, in
   rows of their own at the top. They are the same buttons, moved – not copies – so they work exactly as before, and they go back
   to the header as soon as the screen is wide enough again (phone on its side, tablet, computer).
   A button that opens another screen closes the menu; undo, patterns, swing and the toggles leave it open. ================= */
(()=>{
  const dd=document.getElementById('dockD'),top=document.querySelector('header.top');if(!dd||!top)return;
  const $i=id=>document.getElementById(id);
  const ROWS=[['verktyg',()=>[top.querySelector('.ux'),$i('duoBtn'),$i('dawBtn'),$i('libBtn')]],
              ['mönster',()=>[top.querySelector('.patseg'),$i('copyPat')]],
              ['mer',()=>[$i('setBtn'),$i('prevBtn'),$i('motBtn'),top.querySelector('.hx-lang')]]];
  /* (v241) phone on its side: A–D, idea, studio, swing and bpm stay in the row; undo, lib, copy and the rest go to the
     menu, so nothing in the row is cut off. A narrow tablet held upright moves only the swing (topbar.js sets .tb-s). */
  const LAND=[()=>[top.querySelector('.ux'),$i('libBtn'),$i('copyPat')],()=>[],ROWS[2][1]];
  const CLOSE=['duoBtn','dawBtn','libBtn','setBtn','motBtn'];
  const box=document.createElement('div');box.className='mm-tools';box.hidden=true;
  box.innerHTML=ROWS.map(([l],k)=>`<div class="dk-lab">${l}</div><div class="dk-row" data-r="${k}"></div>`).join('')+
    '<div class="dk-lab">swing</div><div class="dk-row mm-sw"><button data-s="-1" aria-label="Mindre swing">−</button><b class="mm-swv"></b><button data-s="1" aria-label="Mer swing">+</button><button data-s="0" class="mm-swr">rak</button></div>';
  dd.prepend(box);
  /* swing: − / + (hold = keeps going), rak = straight / back */
  let keep=62;
  box.querySelectorAll('.mm-sw button').forEach(b=>{const d=+b.dataset.s;let t=0,iv=0;
    b.addEventListener('pointerdown',e=>{e.preventDefault();if(!window.swingStep)return;
      if(!d){const p=swingPct();if(p>50){keep=p;swingStep(50-p)}else swingStep(keep-50);paint();return}
      swingStep(d);paint();t=setTimeout(()=>{iv=setInterval(()=>{swingStep(d);paint()},90)},380)});
    const up=()=>{clearTimeout(t);clearInterval(iv)};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up)});
  const swv=box.querySelector('.mm-swv'),swr=box.querySelector('.mm-swr');
  function paint(){if(!window.swingPct)return;const p=swingPct();swv.textContent=p+' %';swr.textContent=p>50?'rak':'swing '+keep+' %'}
  setInterval(()=>{if(!box.hidden)paint()},400);
  /* close the menu when a button that opens another screen is used */
  box.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&CLOSE.includes(b.id))setTimeout(()=>{try{if(window.__dock&&__dock.isOpen())__dock.toggle(false)}catch(_){globalThis.__el&&globalThis.__el(_)}},0)});
  /* move them in / back */
  const HOME=new Map();let cur='';
  const level=()=>{const c=document.body.classList;if(c.contains('mob-land'))return 'l';if(c.contains('mob'))return 'p';
    return c.contains('topbar')&&top.classList.contains('tb-s')?'s':''};
  function mode(){const want=level();if(want===cur)return;cur=want;
    [...HOME.entries()].reverse().forEach(([el,[par,nx]])=>{try{par.insertBefore(el,nx&&nx.parentNode===par?nx:null)}catch(_){par.appendChild(el)}});HOME.clear();
    const lists=want==='p'?ROWS.map(r=>r[1]):want==='l'?LAND:[];
    ROWS.forEach((_,k)=>{const row=box.querySelector(`.dk-row[data-r="${k}"]`);const els=lists[k]?lists[k]().filter(Boolean):[];
      els.forEach(el=>{if(!HOME.has(el))HOME.set(el,[el.parentNode,el.nextSibling]);row.appendChild(el)});
      row.hidden=!els.length;row.previousElementSibling.hidden=!els.length});
    const sw=want==='p'||want==='s';box.querySelector('.mm-sw').hidden=!sw;box.querySelector('.mm-sw').previousElementSibling.hidden=!sw;
    box.hidden=!want;document.body.classList.toggle('mhdr',want==='p');paint()}
  new MutationObserver(mode).observe(document.body,{attributes:true,attributeFilter:['class']});
  new MutationObserver(mode).observe(top,{attributes:true,attributeFilter:['class']});addEventListener('resize',mode);mode();
  const css=document.createElement('style');css.textContent=`
/* the header: one row – logo, menu, tempo */
body.mhdr .top.top{grid-template-areas:"brand menu bpm"!important;grid-template-rows:auto!important;row-gap:0!important}
body.mhdr .top #pats,body.mhdr .top .bpm.swp{display:none!important}
/* in the menu */
.mm-tools{display:flex;flex-direction:column;gap:8px;margin-bottom:6px}
.mm-tools[hidden],.mm-tools [hidden]{display:none!important}
.mm-tools .dk-row{align-items:center}
.mm-tools .ux{display:inline-flex;gap:6px}
.mm-tools .patseg{display:inline-flex;gap:6px;background:none!important;box-shadow:none!important;padding:0!important}
.mm-tools .dk-row button svg{width:16px;height:16px}
.mm-tools .dk-row button{min-width:40px;justify-content:center}
.mm-tools .mm-swv{min-width:52px;text-align:center;font:500 15px var(--f-mono);letter-spacing:.04em}
.mm-tools .mm-sw button{min-width:40px}
/* the chosen pattern: a ring in the menu's own text colour (works in every look) */
.mm-tools .patseg .pind{display:none!important}
.mm-tools .patseg .pat.cur{box-shadow:inset 0 0 0 2px currentColor!important}`;document.head.appendChild(css);
})();

