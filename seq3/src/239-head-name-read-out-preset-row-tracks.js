/* ---- head: name, read-out, preset row, tracks ---- */
${K} .cl-logo{font:300 24px/1 var(--f-linje,var(--f-display))!important;font-style:normal!important;letter-spacing:0!important;color:${C.ink}!important}
${K} .cl-logo small{display:block;margin-top:4px;font:500 9px var(--f-mono)!important;letter-spacing:.08em!important;text-transform:lowercase!important;color:${C.dim}!important}
${K} .cl-read{font:500 10px var(--f-mono)!important;color:${C.mute}!important;opacity:1!important}
${K} :is(.cl-nav,.br-nav){gap:0!important;padding:0!important;border-radius:0!important;background:${C.bg2}!important;box-shadow:inset 0 0 0 1px ${C.ln}!important;min-width:200px}
${K} :is(.cl-nav,.br-nav) button{width:34px!important;height:34px!important;border-radius:0!important;background:transparent!important;color:${C.ink}!important;font-size:15px!important;flex:none}
${K} :is(.cl-nav,.br-nav) button:hover{background:rgba(255,255,255,.05)!important}
${K} :is(.cl-nav,.br-nav) b{flex:1;min-width:0;text-align:center;font:500 12.5px var(--f-mono)!important;letter-spacing:.02em!important;color:${C.ink}!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 6px}
${K} :is(.cl-trk,.br-trk,.br-cats){gap:0!important;padding:0!important;border-radius:0!important;background:transparent!important;box-shadow:inset 0 0 0 1px ${C.ln}!important}
${K} :is(.cl-trk,.br-trk,.br-cats) button{height:26px;padding:0 9px!important;border-radius:0!important;background:transparent!important;color:${C.mute}!important;font:500 10px var(--f-mono)!important;letter-spacing:.03em}
${K} :is(.cl-trk,.br-trk,.br-cats) button.on{background:${C.ink}!important;color:#141516!important}
${K} :is(.cl-kb,.br-kb,.br-save){height:26px!important;border-radius:0!important;background:${C.bg2}!important;box-shadow:inset 0 0 0 1px ${C.ln}!important;color:${C.ink}!important;font:500 10px var(--f-mono)!important}
${K} .br-play,${K} .cl-play{color:${C.mute}!important;font-family:var(--f-mono)!important}
${K} .cl-play{flex-wrap:wrap;max-width:100%;min-width:0}${K} :is(.cl-trk,.br-trk){max-width:100%;overflow-x:auto;scrollbar-width:none}${K} :is(.cl-trk,.br-trk)::-webkit-scrollbar{display:none}${K} :is(.cl-trk,.br-trk) button{flex:none}
${K} .cl-led{background:#2A2B2D!important;box-shadow:none!important}${K} .cl-led.on{background:${C.acc}!important;box-shadow:0 0 6px ${C.acc}!important}
