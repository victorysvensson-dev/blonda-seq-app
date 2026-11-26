
/* ================= error log view (v283): hold the version number for a moment → the log, with copy and clear ================= */
(function(){let tm=null,box=null;
  function show(){if(box){box.remove();box=null;return}box=document.createElement('div');box.className='elog';
    box.innerHTML='<div class="elog-h"><b>error log</b><span></span><button data-a="copy">copy</button><button data-a="clear">clear</button><button data-a="x">close</button></div><pre></pre>';
    const fill=()=>{const t=window.__elText?__elText():'';box.querySelector('pre').textContent=t.split('\n').slice(1).join('\n')||'no errors';box.querySelector('.elog-h span').textContent=(window.__elog?__elog().length:0)+' kinds'};fill();
    box.onclick=async ev=>{const a=ev.target.closest('[data-a]');if(!a)return;const k=a.dataset.a;
      if(k==='x'){box.remove();box=null}else if(k==='clear'){__elClear();fill()}else if(k==='copy'){try{await navigator.clipboard.writeText(__elText());a.textContent='copied'}catch(_){const r=document.createRange();r.selectNodeContents(box.querySelector('pre'));const s=getSelection();s.removeAllRanges();s.addRange(r);a.textContent='selected'}setTimeout(()=>{a.textContent='copy'},1500)}};
    document.body.appendChild(box)}
  /* the release after the long press is not a tap: the project drawer under the version number stays closed */
  let eat=false;
  document.addEventListener('pointerdown',ev=>{if(!ev.target.closest||!ev.target.closest('.ver'))return;clearTimeout(tm);tm=setTimeout(()=>{eat=true;show()},650)},true);
  ['pointercancel','pointerleave'].forEach(t=>document.addEventListener(t,()=>clearTimeout(tm),true));
  ['pointerup','click'].forEach(t=>document.addEventListener(t,ev=>{clearTimeout(tm);if(eat&&!(box&&box.contains(ev.target))){ev.stopImmediatePropagation();ev.preventDefault();if(t==='click')eat=false}},true));
  const st=document.createElement('style');st.textContent='.elog{position:fixed;left:16px;right:16px;top:70px;bottom:16px;z-index:999;background:#17181A;box-shadow:inset 0 0 0 1px #2E3032,0 20px 60px rgba(0,0,0,.6);border-radius:12px;display:flex;flex-direction:column;font:500 11px var(--f-mono,monospace);color:rgba(232,230,220,.85)}.elog-h{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #2E3032}.elog-h b{font-weight:600;letter-spacing:.06em}.elog-h span{margin-right:auto;opacity:.5}.elog-h button{height:26px;padding:0 12px;border-radius:999px;box-shadow:inset 0 0 0 1px #2E3032;color:inherit;font:inherit}.elog pre{flex:1;margin:0;padding:12px 14px;overflow:auto;white-space:pre-wrap;word-break:break-word;-webkit-user-select:text;user-select:text}';document.head.appendChild(st);
})();
