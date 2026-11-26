/* ================= Studio look: the studio takes on SEQ.3's look (glass, studio or the all-yellow dots look) and is drawn crisper:
   small corners, flat fills, thin lines, no glows. All studio colours come from the --dk-* variables set here. ================= */
(()=>{const st=document.createElement('style');st.textContent=`
.daw{--dk-ink:232,230,220;--dk-acc:#E9C54A;--dk-acc-rgb:233,197,74;--dk-on:#17181A;--dk-bg:#121315;--dk-p0:#0F1012;--dk-p1:#17181A;--dk-p2:#1B1C1F;--dk-p3:#202125;--dk-p4:#28292D;--dk-solid:#111214;--dk-line:rgba(232,230,220,.09);--dk-r:3px;--dk-r2:2px;--dk-cell:22%}

/* glass: the living background shows through, every panel is frosted glass */
body:not(.look-studio):not(.look-dots).daw-on #app{visibility:hidden}
body:not(.look-studio):not(.look-dots) .daw{--dk-bg:rgba(8,8,12,.22);--dk-p0:rgba(10,10,14,.30);--dk-p1:rgba(16,16,20,.50);--dk-p2:rgba(255,255,255,.035);--dk-p3:rgba(255,255,255,.065);--dk-p4:rgba(255,255,255,.11);--dk-solid:rgba(16,16,21,.94);--dk-line:rgba(255,255,255,.08);--dk-r:6px;--dk-r2:3px;--dk-cell:30%}
body:not(.look-studio):not(.look-dots) .daw :is(.dw-clp,.dw-arr,.tq){-webkit-backdrop-filter:blur(30px) saturate(1.5);backdrop-filter:blur(30px) saturate(1.5);box-shadow:inset 0 0 0 1px rgba(255,255,255,.09)!important}
body:not(.look-studio):not(.look-dots) .daw .dw-top :is(.dw-b,.dw-pos,.dw-bpm,.dw-tg,.dw-view){-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);background-color:rgba(255,255,255,.05)}

/* studio: flat dark grey, square */
body.look-studio .daw{--dk-bg:#141516;--dk-p0:#17181A;--dk-p1:#1C1E20;--dk-p2:#222427;--dk-p3:#26282B;--dk-p4:#2E3033;--dk-solid:#1C1E20;--dk-line:#373738;--dk-r:0px;--dk-r2:0px;--dk-cell:24%}
body.look-studio .daw :is(.dw-clp,.dw-arr,.tq){box-shadow:inset 0 0 0 1px #373738!important}

/* dots: all yellow with black ink, like the rest of SEQ.3 in that look (white here; the look's yellow tint over the screen turns it yellow) */
body.look-dots .daw{--dk-ink:17,18,17;--dk-acc:#111211;--dk-acc-rgb:17,18,17;--dk-on:#fff;--dk-bg:#fff;--dk-p0:transparent;--dk-p1:transparent;--dk-p2:rgba(17,18,17,.05);--dk-p3:rgba(17,18,17,.09);--dk-p4:rgba(17,18,17,.15);--dk-solid:#fff;--dk-line:rgba(17,18,17,.25);--dk-r:0px;--dk-r2:0px;--dk-cell:0%}
/* the SEQ.3 cards shown in the studio (right panel, and the step grid in the song view) get the same black-on-yellow treatment as in the main view */
body.look-dots .daw :is(.dw-slot,.dw-cl){filter:grayscale(1) invert(1) contrast(8)}
body.look-dots .daw :is(.dw-tl,.dw-clp,.tq,.dw-top,.dw-tabs) *{--h:#111211!important;--c:#111211!important;--gc:#111211!important}
body.look-dots .daw :is(.dw-clp,.dw-arr,.tq){box-shadow:inset 0 0 0 1px #111211!important}
body.look-dots .daw .tq-r :is(.v,.x,.w,.cd,.n,.h,.g){color:#111211!important}
body.look-dots .daw .tq-r .e,body.look-dots .daw .tq-r .tie,body.look-dots .daw .tq-r .off{color:rgba(17,18,17,.32)!important}
body.look-dots .daw .xc-c.has{background:rgba(17,18,17,.1)!important}
body.look-dots .daw .xc-c.now{background:rgba(17,18,17,.22)!important}
body.look-dots .daw .xc-bd b{background:#111211;color:#fff}
body.look-dots .daw .xc-bd svg *{fill:#111211!important;stroke:#111211!important}
body.look-dots .daw .dw-cell{filter:brightness(0)}body.look-dots .daw .dw-cell:hover{filter:brightness(0) opacity(.8)}
body.look-dots .daw .tq-r.pl{background:rgba(17,18,17,.16)!important;box-shadow:inset 2px 0 0 #111211}

/* crisper everywhere: flat clip colours instead of gradients, no glows, thin lines */
.daw .xc-c.has{background:color-mix(in srgb,var(--h) var(--dk-cell),var(--dk-p2))}
.daw .xc-c.has:hover{background:color-mix(in srgb,var(--h) calc(var(--dk-cell) + 8%),var(--dk-p3))}
.daw .xc-c.now{background:color-mix(in srgb,var(--h) calc(var(--dk-cell) + 22%),var(--dk-p3))}
.daw .xc-c{box-shadow:inset 0 0 0 1px var(--dk-line)}
.daw .xc-c.sel{box-shadow:inset 0 0 0 1px rgb(var(--dk-ink))}
.daw .xc-c.now::after{box-shadow:none}
.daw .xc-h{background:var(--dk-p2)}
.daw .xc-h::before{height:1px}
.daw .xc-sc{background:var(--dk-p2)!important;box-shadow:inset 0 0 0 1px var(--dk-line)}
.daw .xc-sc:hover{background:var(--dk-p3)!important}
.daw .xc-sc.now{background:var(--dk-acc)!important;color:var(--dk-on)!important}
.daw .xc-tools>button,.daw .dw-tools>button{background:var(--dk-p2)!important;box-shadow:inset 0 0 0 1px var(--dk-line)}
.daw .xc-tools>button:hover,.daw .dw-tools>button:hover{background:var(--dk-p3)!important}
.daw .dw-ln i,.daw .dw-sec.now::after{box-shadow:none}
.daw .dw-sec{background:color-mix(in srgb,var(--c) 14%,var(--dk-p2))!important}
.daw .dw-sec:hover{background:color-mix(in srgb,var(--c) 22%,var(--dk-p3))!important}
.daw .dw-sec.now{background:color-mix(in srgb,var(--c) 32%,var(--dk-p3))!important}
.daw .dw-sec::before{height:2px}
.daw .dw-b,.daw .dw-tg,.daw .dw-pos,.daw .dw-bpm,.daw .dw-view,.daw .dw-tabs button{box-shadow:inset 0 0 0 1px var(--dk-line)}
.daw .dw-tabs button.on{box-shadow:none}

/* text that was plain white follows the look's ink */
.daw .tq-col.cur .tq-hd b,.daw .tq-sxb:hover{color:rgb(var(--dk-ink))}
.daw .tq:not(:focus) .tq-r span.cu{color:rgb(var(--dk-ink))!important}
body.look-dots .daw .tq-sx .tq-r span.n:not(.e):not(.tie){color:#111211!important}

/* tracker: fills its panel, sticky parts solid so rows never show through */
.daw .tq-body{min-width:100%}
.daw .tq-body>.tq-col:not(.tq-num){flex:1 0 auto}
.daw .tq-num,.daw .tq-hs,.daw .tq-hs .tq-num{background:var(--dk-solid)}
.daw .tq-hs .tq-hd{background:var(--dk-solid)}
.daw .tq-col{border-right-color:var(--dk-line)}
.daw .tq-hd{border-bottom-color:var(--dk-line)}
.daw .tq-hd::before{height:1px}
.daw .tq-r .h.acc{text-shadow:none;text-decoration:underline;text-underline-offset:2px}
`;document.head.appendChild(st)})();

