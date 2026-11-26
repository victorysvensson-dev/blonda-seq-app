/* ================= iPad and iPhone fit (v241) =================
   1. Phone on its side: the piano gets its own row between the cards and the tabs. It used to land in an extra grid
      cell of the first column, which made the whole page wider than the screen (the header and cards slid sideways).
   2. Small phones (iPhone SE): the version number next to the logo is left out, so the logo no longer runs under the menu button.
   3. Touch: small buttons (tempo and swing −/+, A–D, card buttons, the orbit steppers, mute/solo, loop buttons …) get an
      invisible larger touch area around them on touch screens. Nothing changes in how they look. ================= */
(()=>{
  const css=document.createElement('style');css.id='touchfit';
  const HIT=['header.top .bpm button','header.top .ux button','.cbtns .cbtn','.cap .grab','.capr .grab','.orb-ctl button',
    '.mms .m','.mms .s','.m2-ms .m','.m2-ms .s','.lp > .on','.lp > .x','.lpk .tm','.lpk .tp','.sx-ctl button','.sx-sr .sx-so',
    '.mm-tools .mm-sw button'].map(s=>'html.coarse '+s).join(',');
  /* buttons that sit close side by side: taller touch area only */
  const HITV=['header.top .patseg .pat','#orbTrk button','#gPats button','#synSeg button','.bt .m','.bt .s','.ms .fxb','.gxs-p button'].map(s=>'html.coarse '+s).join(',');
  css.textContent=`
@media (max-width:359px){body.mhdr .top .brand .ver{display:none}}
body.mob-land.kb-open #app#app{grid-template-rows:auto minmax(0,1fr) auto auto;grid-template-areas:"top top" "panes panes" "kb kb" "tabs foot"}
body.mob-land #kb{grid-area:kb;min-width:0;max-width:100%;box-sizing:border-box;margin:0!important}
${HIT},${HITV}{position:relative}
${HIT.split(',').map(s=>s+'::after').join(',')}{content:"";position:absolute;inset:-7px}
${HITV.split(',').map(s=>s+'::after').join(',')}{content:"";position:absolute;inset:-7px 0}`;
  document.head.appendChild(css);
})();

