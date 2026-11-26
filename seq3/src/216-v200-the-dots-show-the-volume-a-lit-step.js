/* ================= v200: the dots show the volume. A lit step is 4×4 dots, and each row of dots is 25 %: drag a step down and its
   rows go out from the top (1–25 % = one row, 26–50 % = two, 51–75 % = three, 76–100 % = all four). The rows that are out show as
   the step's dim dots, so the step keeps its shape. ================= */
(()=>{const st=document.createElement('style');st.textContent=`
.seqlite.dotm .cells .cell.on::before,.seqlite.dotm .bigsteps .bs.on::before{clip-path:inset(calc((1 - var(--vq,1)) * 100%) 0 0 0);transition:clip-path .08s linear}
@media (prefers-reduced-motion:reduce){.seqlite.dotm .cells .cell.on::before,.seqlite.dotm .bigsteps .bs.on::before{transition:none}}
/* the dim dots under the lit ones (the step's own colour stays): the same 4×4 grid, laid in the content box so it lines up exactly */
.seqlite.dotm .cells .cell.on,body.look-dots .seqlite.dotm .cells .cell.on{box-sizing:border-box;padding:10%;--dd:rgba(232,230,220,.09);
  background-image:radial-gradient(circle closest-side,var(--dd) 60%,transparent 74%),linear-gradient(transparent,transparent)!important;
  background-size:25% 25%,100% 100%!important;background-position:0 0,0 0!important;background-repeat:repeat,no-repeat!important;
  background-origin:content-box,border-box!important;background-clip:content-box,border-box!important}
.seqlite.dotm .cells .cell.on.ph{--dd:rgba(232,230,220,.22)}
body.look-dots .seqlite.dotm .cells .cell.on{--dd:rgba(232,230,220,.16)}
.seqlite.dotm .bigsteps .bs.on{box-sizing:border-box;padding:19%;--dd:rgba(232,230,220,.09);
  background-image:radial-gradient(circle closest-side,var(--dd) 60%,transparent 74%),linear-gradient(transparent,transparent)!important;
  background-size:25% 25%,100% 100%!important;background-position:0 0,0 0!important;background-repeat:repeat,no-repeat!important;
  background-origin:content-box,border-box!important;background-clip:content-box,border-box!important}`;document.head.appendChild(st);
  if(typeof stepDeco!=='function')return;const _sd=stepDeco;
  stepDeco=function(el,s0,ti,s){_sd.apply(this,arguments);try{const v=stepVel(s0,ti,s);el.style.setProperty('--vq',(Math.min(4,Math.max(1,Math.ceil(v*4-1e-6)))/4).toFixed(2))}catch(e){globalThis.__el&&globalThis.__el(e)}}})();

