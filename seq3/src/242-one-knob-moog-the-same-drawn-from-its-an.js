/* ---- one knob: Moog (the same, drawn from its angle) ---- */
${K} .cl-kw::before{content:"";position:absolute;inset:6px;border-radius:50%;background:conic-gradient(from -135deg,${C.ink} 0 calc(var(--a,-135deg) + 135deg),rgba(232,230,220,.1) 0 270deg,transparent 0);
  -webkit-mask:radial-gradient(circle,transparent calc(50% - 4px),#000 calc(50% - 3.5px));mask:radial-gradient(circle,transparent calc(50% - 4px),#000 calc(50% - 3.5px))}
${K} .cl-sc line{stroke:${C.dim}!important}${K} .cl-sc text{fill:${C.dim}!important;font-family:var(--f-mono)!important}
${K} .cl-kf{background:${C.bg2}!important;box-shadow:inset 0 0 0 1px ${C.ln2}!important}
${K} .cl-kf::after,${K} .cl-kf::before{display:none!important}
${K} .cl-kf i{background:${C.ink}!important;width:2px!important;margin-left:-1px!important;top:3px!important;height:36%!important;border-radius:1px!important}
${K} .cl-k.act .cl-kf{box-shadow:inset 0 0 0 1.5px ${C.acc}!important}
