/* ================= Volume drag on a step: a small read-out above the step while you drag it up or down ================= */
(()=>{const tip=document.createElement('div');tip.id='volTip';tip.setAttribute('aria-hidden','true');document.body.appendChild(tip);
  const st=document.createElement('style');st.textContent=`
#volTip{position:fixed;z-index:2147482500;pointer-events:none;display:none;transform:translate(-50%,-100%);margin-top:-6px;padding:3px 7px 4px;font:500 10px/1 var(--f-mono);letter-spacing:.06em;background:#111211;color:#E9C54A;box-shadow:inset 0 0 0 1px rgba(233,197,74,.5)}
#volTip.on{display:block}
#volTip i{display:block;height:2px;margin-top:3px;background:linear-gradient(90deg,#E9C54A var(--v),rgba(233,197,74,.2) var(--v))}
.cells .cell.voling{cursor:ns-resize;box-shadow:inset 0 0 0 1px #E9C54A!important}`;document.head.appendChild(st);
  window.__volTip=(el,v)=>{if(!el){tip.classList.remove('on');return}const r=el.getBoundingClientRect();tip.style.left=(r.left+r.width/2)+'px';tip.style.top=r.top+'px';
    tip.innerHTML='vol '+Math.round(v*100)+'<i></i>';tip.style.setProperty('--v',Math.round(v*100)+'%');tip.classList.add('on')}})();

