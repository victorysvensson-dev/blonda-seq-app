/* ---- one slider (SH-101) ---- */
${K} .cl-st::before{width:4px!important;margin-left:-2px!important;border-radius:0!important;background:${C.bg3}!important;box-shadow:inset 0 0 0 1px ${C.ln}!important}
${K} .cl-st::after{content:"";position:absolute;left:50%;width:4px;margin-left:-2px;bottom:4px;height:calc(var(--v,0)*(100% - 16px));background:rgba(232,230,220,.55);pointer-events:none}
${K} .cl-ticks{opacity:.35}
${K} .cl-sc2{width:22px!important;height:10px!important;margin-left:-11px!important;border-radius:0!important;background:${C.ink}!important;box-shadow:none!important;z-index:1}
${K} .cl-sc2::after{background:#141516!important;height:2px!important}
${K} .cl-s.act .cl-sc2{background:${C.acc}!important}
${K} .cl-wl{border-radius:0!important;background:${C.bg3}!important;box-shadow:inset 0 0 0 1px ${C.ln}!important}
${K} .cl-wl i{border-radius:0!important;background:${C.ink}!important;height:12px!important}
${K} .cl-wt span{font:500 9px var(--f-mono)!important;color:${C.dim}!important}${K} .cl-wt span.on{color:${C.ink}!important}
