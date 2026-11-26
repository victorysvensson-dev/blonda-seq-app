/* ---- (v253) the studio's top row looks like the app's top row: the dot-matrix name, round-ended pills 32 px high in
   the same glass, round play and stop, the position and tempo as small read-outs ---- */
body .daw .dw-top{height:52px!important;gap:8px!important;align-items:center!important}
body .daw .dw-logo{font:400 16px/1 var(--f-pixel,"BLONDA Pixel",var(--f-mono))!important;letter-spacing:.04em!important;color:#F5F5F2!important;white-space:nowrap}
body .daw .dw-logo i{font:500 10px var(--f-mono)!important;font-style:normal!important;letter-spacing:.06em;color:${C.acc}!important;margin-left:6px}
body .daw .dw-top :is(.dw-view,.dw-pos,.dw-bpm,.dw-tg,.dw-b,.ux){height:32px!important;border-radius:999px!important;background:rgba(255,255,255,.08)!important;box-shadow:none!important;border:0!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
body .daw .dw-top .dw-view{display:inline-flex!important;padding:0!important;gap:0!important;overflow:hidden}
body .daw .dw-top .dw-view button{height:32px!important;padding:0 14px!important;border-radius:999px!important;background:transparent!important;font:500 11px var(--f-mono)!important;color:rgba(245,245,242,.6)!important;box-shadow:none!important}
body .daw .dw-top .dw-view button.on{background:#F5F5F2!important;color:#111211!important}
body .daw .dw-top .dw-play{width:32px!important;height:32px!important;padding:0!important;border-radius:50%!important;background:${C.acc}!important;color:#111211!important;box-shadow:none!important;display:grid!important;place-items:center}
body .daw .dw-top .dw-b[data-a="stop"]{width:32px!important;padding:0!important;border-radius:50%!important;font-size:11px!important}
body .daw .dw-top .dw-b{padding:0 14px!important;font:500 11px var(--f-mono)!important;color:#F5F5F2!important}
body .daw .dw-top :is(.dw-pos,.dw-bpm){display:inline-flex!important;flex-direction:row!important;align-items:baseline!important;gap:6px!important;padding:0 14px!important;min-width:0!important;width:auto!important;line-height:32px}
body .daw .dw-top :is(.dw-pos,.dw-bpm) b{font:400 15px/32px var(--f-dot,var(--f-mono))!important;color:#F5F5F2}
body .daw .dw-top :is(.dw-pos,.dw-bpm) small{font:500 8.5px var(--f-mono)!important;letter-spacing:.06em;color:rgba(245,245,242,.45)!important}
body .daw .dw-top .dw-tg{padding:0 14px!important;font:500 11px var(--f-mono)!important;color:rgba(245,245,242,.7)!important}
body .daw .dw-top .dw-tg.on{background:rgba(242,195,24,.16)!important;color:${C.acc}!important;box-shadow:inset 0 0 0 1px rgba(242,195,24,.45)!important}
body .daw .dw-top .ux{display:inline-flex!important;padding:0 4px!important;gap:0!important}
body .daw .dw-top .ux button{width:30px!important;height:32px!important;background:transparent!important;border:0!important;box-shadow:none!important;color:#F5F5F2!important}
body .daw .dw-top .ux button:disabled{opacity:.3}
body .daw .dw-top .dw-len{font:500 9.5px var(--f-mono)!important;color:rgba(245,245,242,.45)!important}
`;
  document.head.appendChild(css);
})();

