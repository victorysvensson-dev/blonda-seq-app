/* ================= Step on the phone: sharper (v231) =================
   The step cells' dots were big and soft: each lit dot faded out over its edge, and a glow (drop-shadow) around the lit rows,
   cut off by the velocity, made a hazy light plate behind them. On the phone the dots are now crisp: a hard edge, a little
   smaller, no glow; the dark dots are the same crisp shape, only faint. The playhead step is lit brighter instead of glowing. ================= */
(()=>{const css=document.createElement('style');css.textContent=`
body.mob .seqlite.dotm .bigsteps .bs::before{background:radial-gradient(circle closest-side,rgba(232,230,220,.1) 50%,transparent 56%) 0 0/25% 25%!important;filter:none!important}
body.mob .seqlite.dotm .bigsteps .bs.ph:not(.on)::before{background:radial-gradient(circle closest-side,rgba(232,230,220,.26) 50%,transparent 56%) 0 0/25% 25%!important}
body.mob .seqlite.dotm .bigsteps .bs.on{background-image:radial-gradient(circle closest-side,rgba(232,230,220,.1) 50%,transparent 56%),linear-gradient(transparent,transparent)!important}
body.mob .seqlite.dotm .bigsteps .bs.on::before{background:radial-gradient(circle closest-side,var(--dc) 50%,transparent 56%) 0 0/25% 25%!important;filter:none!important}
body.mob .seqlite.dotm .bigsteps .bs.on.ph::before{--dc:#fff!important;opacity:1!important}
body.mob .seqlite.dotm .bigsteps .bs > i{font-size:9.5px!important;letter-spacing:.06em;opacity:.7;-webkit-font-smoothing:antialiased}`;document.head.appendChild(css)})();

