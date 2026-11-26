/* ================= No emoji, ever (v208) =================
   Some symbols the app uses (▶ ◀ ✂ ☁ ↗ ↔ …) are drawn as colourful emoji on iPhone, iPad and Mac. Wherever such a symbol
   appears on screen it is now shown as a BLONDA icon instead: a simple line/solid shape in the colour of the text around it.
   The symbol itself stays in the page as hidden text, so anything that reads the text (and screen readers) works as before.
   In tooltips, which can only hold text, the symbol is followed by the "show as text" marker (U+FE0E), so it is never an emoji.
   Any other emoji that might sneak in later gets the same text marker. ================= */
(()=>{
  const svg=(d,fill)=>'url("data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="${fill?'#000':'none'}" stroke="#000" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`)+'")';
  const IC={
    '▶':svg('<path d="M5 3.4v9.2L12.6 8z"/>',1),
    '◀':svg('<path d="M11 3.4v9.2L3.4 8z"/>',1),
    '✂':svg('<circle cx="4.6" cy="11.6" r="2"/><circle cx="11.4" cy="11.6" r="2"/><path d="M5.9 10.1L12 2.6M10.1 10.1L4 2.6"/>'),
    '☁':svg('<path d="M4.6 12.4h6.9a2.9 2.9 0 0 0 .2-5.8A3.9 3.9 0 0 0 4.3 7.5a2.5 2.5 0 0 0 .3 4.9z"/>'),
    '↗':svg('<path d="M4.6 11.4l6.8-6.8M6 4.6h5.4V10"/>'),
    '↔':svg('<path d="M2.5 8h11M5 5.5L2.5 8 5 10.5M11 5.5l2.5 2.5-2.5 2.5"/>'),
    '↕':svg('<path d="M8 2.5v11M5.5 5L8 2.5 10.5 5M5.5 11L8 13.5l2.5-2.5"/>'),
    '☀':svg('<circle cx="8" cy="8" r="2.8"/><path d="M8 1.8v1.4M8 12.8v1.4M1.8 8h1.4M12.8 8h1.4M3.6 3.6l1 1M11.4 11.4l1 1M3.6 12.4l1-1M11.4 4.6l1-1"/>'),
    '✔':svg('<path d="M3.2 8.4l3 3 6.6-6.8"/>'),
    '✖':svg('<path d="M4 4l8 8M12 4l-8 8"/>'),
    '⏸':svg('<path d="M5.5 3.5v9M10.5 3.5v9"/>'),
    '⏹':svg('<rect x="4" y="4" width="8" height="8" rx="1"/>',1),
    '⏺':svg('<circle cx="8" cy="8" r="4.2"/>',1)};
  const KEYS=Object.keys(IC).join('');
  /* symbols that can turn into emoji (the mapped ones, everything that is an emoji by default, and the classic "can be either" set) */
  const RX_ANY=/[↔-↙↩↪⌚⌛⌨⏏⏩-⏳⏸-⏺Ⓜ▪▫▶◀◻-◾☀-☄☎☑☔☕☘☝☠☢☣☦☪☮☯☸-☺♀♂♈-♓♟♠♣♥♦♨♻♾♿⚒-⚗⚙⚛⚜⚠⚡⚧⚪⚫⚰⚱⚽⚾⛄⛅⛈⛎⛏⛑⛓⛔⛩⛪⛰-⛵⛷-⛺⛽✂✅✈-✍✏✒✔✖✝✡✨✳✴❄❇❌❎❓-❕❗❣❤➕-➗➡➰➿⤴⤵⬅-⬇⬛⬜⭐⭕〰〽㊗㊙]|[\u{1F000}-\u{1FAFF}]/u;
  const RX_G=new RegExp(RX_ANY.source,'gu');
  const css=document.createElement('style');css.textContent=`
/* its own element (bl-ico), so no other style in the app (dots drawn with <i>, chips …) can restyle it */
bl-ico.bne{display:inline-block!important;position:static!important;width:.86em!important;height:.86em!important;min-width:0!important;min-height:0!important;margin:0 .08em!important;padding:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;
  vertical-align:-.1em!important;background:currentColor!important;opacity:1!important;-webkit-mask:var(--bne) center/contain no-repeat!important;mask:var(--bne) center/contain no-repeat!important;
  overflow:hidden!important;text-indent:300%!important;white-space:nowrap!important;line-height:1!important;font-style:normal!important;flex:none!important;transform:none!important}
/* the clip launcher's start arrow was drawn by CSS */
.xc-c.has .xc-go::after{content:""!important;display:inline-block;width:.86em;height:.86em;background:currentColor;-webkit-mask:${IC['▶']} center/contain no-repeat;mask:${IC['▶']} center/contain no-repeat}`;
  document.head.appendChild(css);
  const SKIP=n=>{const p=n.nodeType===1?n:n.parentNode;return !p||!!(p.closest&&p.closest('script,style,textarea,input,select,option,svg,canvas,title,.bne,[data-noemoji]'))};
  const tr=s=>(window.BLONDA_LANG==='en'&&typeof window.i18n==='function')?window.i18n(s):s;
  function doText(n){const v=n.nodeValue;if(!v||!RX_ANY.test(v)||SKIP(n))return;
    const t=tr(v),frag=document.createDocumentFragment();let last=0;RX_G.lastIndex=0;let m;
    while((m=RX_G.exec(t))){const ch=m[0];let end=m.index+ch.length;if(t[end]==='️'||t[end]==='︎')end++;
      if(m.index>last)frag.appendChild(document.createTextNode(t.slice(last,m.index)));
      if(IC[ch]){const i=document.createElement('bl-ico');i.className='bne';i.setAttribute('aria-hidden','true');i.style.setProperty('--bne',IC[ch]);i.textContent=ch;frag.appendChild(i)}
      else frag.appendChild(document.createTextNode(ch+'︎'));
      last=end}
    if(last<t.length)frag.appendChild(document.createTextNode(t.slice(last)));
    n.parentNode.replaceChild(frag,n)}
  const ATTRS=['title','aria-label','placeholder','data-tip'];
  const fixA=s=>s.replace(RX_G,(c,o,str)=>{const nx=str[o+c.length];return nx==='︎'?c:(nx==='️'?c:c+'︎')}).replace(/️/g,'︎');
  function doEl(el){if(el.nodeType!==1||el.closest&&el.closest('script,style,svg'))return;for(const a of ATTRS){const v=el.getAttribute(a);if(v&&RX_ANY.test(v)){const f=fixA(v);if(f!==v)el.setAttribute(a,f)}}}
  function walk(root){if(root.nodeType===3){doText(root);return}if(root.nodeType!==1)return;doEl(root);if(SKIP(root))return;
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT),list=[];let n;while((n=w.nextNode()))list.push(n);
    list.forEach(x=>x.nodeType===3?doText(x):doEl(x))}
  let busy=false;
  const mo=new MutationObserver(ms=>{if(busy)return;busy=true;try{for(const m of ms){if(m.type==='characterData'){if(m.target.isConnected)doText(m.target)}
    else if(m.type==='attributes')doEl(m.target);else m.addedNodes.forEach(x=>{if(x.isConnected)walk(x)})}}finally{busy=false}});
  walk(document.body);mo.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS});
  /* the page title and the drawn canvas words: text marker only */
  try{if(RX_ANY.test(document.title))document.title=fixA(document.title)}catch(e){globalThis.__el&&globalThis.__el(e)}
  {const fT=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(t,...a){return fT.call(this,typeof t==='string'&&RX_ANY.test(t)?fixA(t):t,...a)}}
  window.__noemoji={walk,RX:RX_ANY};
})();

