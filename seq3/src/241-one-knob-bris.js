/* ---- one knob: Bris ---- */
${K} .bk-sc{background:conic-gradient(from -135deg,${C.ink} 0 calc(var(--v,0)*270deg),rgba(232,230,220,.1) 0 270deg,transparent 0)!important;
  -webkit-mask:radial-gradient(circle,transparent calc(50% - 4px),#000 calc(50% - 3.5px));mask:radial-gradient(circle,transparent calc(50% - 4px),#000 calc(50% - 3.5px))}
${K} .bk-sc::after,${K} .bk-sc::before{display:none!important}
${K} .bk-f{width:36px!important;height:36px!important;filter:none!important;border-radius:50%;background:${C.bg2};box-shadow:inset 0 0 0 1px ${C.ln2}}
${K} .bk-f::before,${K} .bk-f::after{display:none!important}
${K} .bk-f i{border-radius:1px!important;box-shadow:none!important;background:${C.ink}!important;width:2px!important;margin-left:-1px!important}
${K} .bk-f i:first-child{top:3px!important;height:11px!important}${K} .bk-f i+i{display:none!important}
${K} .bk-c{display:none!important}
${K} .bkn.big .bk-f{width:54px!important;height:54px!important}${K} .bkn.big .bk-f i:first-child{height:16px!important;top:4px!important}
${K} .bkn.act .bk-f{box-shadow:inset 0 0 0 1.5px ${C.acc}}
