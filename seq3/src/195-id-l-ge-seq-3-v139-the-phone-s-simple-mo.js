/* ================= Idéläge (SEQ.3 v139) – the phone's simple mode for making ideas =================
   One screen, no scrolling: the Starter in the middle of a circle and the six drums as rings around it (the outer rings are the
   drum pattern, one bar; the inner rings the Starter's four bars). Under it: the drums and the Starter's sounds as chips (tap =
   on/off, hold a drum = new pattern for it), four big buttons that make ideas (ny idé, nya ackord, nytt groove, nya ljud), and at
   the bottom play, undo/redo and four memories. While it is open your own synth patterns are silent (their notes are held back), but the synth channels stay open so the
   Starter's layers can play through the big synths (Bris, Moog, SH-101, Grime …). */
(()=>{
const DUO={open:false,hist:[],redo:[],mel:null};
const DR=[0,1,2,3,4,5],MELT=TRACKS.map((t,i)=>t.mel?i:-1).filter(i=>i>=0);
const DLAY=[['ack','ackord'],['klo','topp'],['sub','sub'],['luft','luft'],['s0','röst'],['s1','ljud']];
const LC={ack:'#F07AB0',klo:'#6FD0C5',sub:'#B9A6FF',luft:'#A9B3C6',s0:'#F3EEDD',s1:'#FF8A3D'};
const DC=TRACKS.slice(0,6).map(t=>t.hex);
const css=document.createElement('style');css.textContent=`
.duo{position:fixed;inset:0;z-index:7000;display:flex;flex-direction:column;background:radial-gradient(120% 70% at 50% 38%,#24221f,#121110 70%);color:#ECE8DC;font-family:var(--f-display,"BLONDA Sans",system-ui);
  padding:max(8px,env(safe-area-inset-top,0px)) max(12px,env(safe-area-inset-right,0px)) max(10px,env(safe-area-inset-bottom,0px)) max(12px,env(safe-area-inset-left,0px));gap:8px;-webkit-user-select:none;user-select:none;touch-action:manipulation;overflow:hidden}
.duo[hidden]{display:none!important}
/* the app's picker (styles, presets) must open above the idea screen */
body:has(>.duo:not([hidden])) .pk-pop{z-index:7100}
.duo,.duo *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.duo button{font:inherit;color:inherit;border:0;background:none;padding:0;margin:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.duo .d-top{display:flex;align-items:center;gap:8px;min-height:38px}
.duo .d-brand{display:flex;flex-direction:column;gap:4px;white-space:nowrap}.duo .d-brand b{font:800 15px/1 var(--f-display,system-ui);letter-spacing:-.01em}.duo .d-brand span{color:#FF8A3D}.duo .d-brand small{font:500 7.5px/1 var(--f-mono,monospace);letter-spacing:.18em;text-transform:uppercase;color:rgba(236,232,220,.38)}
.duo .d-fx{position:absolute;display:flex;flex-direction:column;justify-content:flex-end;gap:3px;padding:10px 12px;touch-action:none;-webkit-mask:var(--m);mask:var(--m);background:linear-gradient(160deg,rgba(255,255,255,.1),rgba(255,255,255,.04));transition:background .12s,transform .08s}
.duo .d-fx.l{align-items:flex-start;border-radius:6px 6px 6px 26px}.duo .d-fx.r{align-items:flex-end;border-radius:6px 6px 26px 6px}
.duo .d-fx b{font:700 12.5px/1 var(--f-display,system-ui);letter-spacing:.02em}.duo .d-fx small{font:500 7.5px/1 var(--f-mono,monospace);letter-spacing:.16em;text-transform:uppercase;color:rgba(236,232,220,.45)}
.duo .d-fx.l b{color:#9FE3CF}.duo .d-fx.r b{color:#FF9A57}
.duo .d-fx.l.on{background:linear-gradient(160deg,#7FD9C2,#4FAE96)}.duo .d-fx.r.on{background:linear-gradient(160deg,#FF9A57,#E2602A)}.duo .d-fx.on b,.duo .d-fx.on small{color:#12110f}.duo .d-fx.on{transform:scale(.985)}
.duo .d-pre{flex:1;min-width:0;display:flex;align-items:center;justify-content:center;gap:2px}
.duo .d-pre button{height:34px;min-width:30px;border-radius:17px;font:500 15px/34px var(--f-mono,monospace);color:rgba(236,232,220,.6)}
.duo .d-pre .nm{flex:0 1 auto;min-width:0;padding:0 10px;background:rgba(255,255,255,.07);color:#ECE8DC;font:400 13px/34px var(--f-dot,var(--f-mono,monospace));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:46vw}
.duo .d-x{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.08);font:400 18px/34px var(--f-mono,monospace)}
.duo .d-ring{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center}
.duo .d-ring canvas{display:block;touch-action:none}
.duo .d-tempo{position:absolute;right:0;top:0;display:flex;flex-direction:column;align-items:center;gap:2px}
.duo .d-tempo button{width:34px;height:26px;border-radius:13px;background:rgba(255,255,255,.07);font:500 14px/26px var(--f-mono,monospace)}
.duo .d-tempo .d-lk{width:34px;height:26px;border-radius:13px;margin-top:6px;display:grid;place-items:center;background:rgba(255,255,255,.05);color:rgba(236,232,220,.5)}
.duo .d-tempo .d-lk svg{width:13px;height:13px}
.duo .d-tempo .d-lk.d-on{background:#FF8A3D;color:#1A0E07}
.duo .d-tempo .d-key2{min-width:34px;height:38px;padding:0 6px;border-radius:13px;margin-top:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;background:rgba(255,255,255,.05);color:rgba(236,232,220,.75)}
.duo .d-tempo .d-key2 b{font:400 12px/1 var(--f-dot,monospace);padding:0;white-space:nowrap}.duo .d-tempo .d-key2 small{font-size:7px}
.duo .d-tempo .d-key2.d-on{background:#FF8A3D;color:#1A0E07}.duo .d-tempo .d-key2.d-on small{color:rgba(26,14,7,.6)}
.duo .d-tempo b{font:400 15px/1 var(--f-dot,monospace);padding:3px 0}.duo .d-tempo small{font:500 8px/1 var(--f-mono,monospace);letter-spacing:.14em;color:rgba(236,232,220,.45)}
.duo .d-key{position:absolute;left:0;top:0;display:flex;flex-direction:column;gap:3px}
.duo .d-key small{font:500 8px/1 var(--f-mono,monospace);letter-spacing:.14em;color:rgba(236,232,220,.45);text-transform:uppercase}.duo .d-key b{font:400 15px/1 var(--f-dot,monospace)}
.duo .d-chips{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px;flex:none}
.duo .d-chips::-webkit-scrollbar{display:none}
.duo .d-chip{min-width:0;height:34px;padding:0 4px;border-radius:17px;background:rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;gap:6px;font:600 9.5px/1 var(--f-mono,monospace);letter-spacing:.02em;text-transform:lowercase;white-space:nowrap;position:relative;overflow:hidden;text-overflow:ellipsis}
.duo .d-chip i{width:7px;height:7px;border-radius:50%;background:var(--c);flex:none}
.duo .d-chip{-webkit-touch-callout:none;transition:background .12s,transform .1s,color .12s}
.duo .d-chip span{overflow:hidden;text-overflow:ellipsis}
.duo .d-chip.d-press{transform:scale(.95);background:rgba(255,255,255,.14)}
.duo .d-chip.d-flash{background:color-mix(in srgb,var(--c) 45%,#1d1c1a)}
.duo .d-chip.off,.duo .d-chip.mut{color:rgba(236,232,220,.35)}.duo .d-chip.off i,.duo .d-chip.mut i{background:transparent;box-shadow:inset 0 0 0 1.5px var(--c);opacity:.6}
.duo .d-chip.mut span{text-decoration:line-through;text-decoration-thickness:1px}
.duo .d-chip.tom{color:rgba(236,232,220,.6)}.duo .d-chip.tom i{background:transparent;box-shadow:inset 0 0 0 1.5px var(--c);opacity:.8}
.duo .d-chip.d-hold::after{content:"";position:absolute;left:0;bottom:0;height:3px;width:0;background:var(--c);animation:duoHold .36s linear .12s forwards}
@keyframes duoHold{from{width:0}to{width:100%}}
.duo .d-big{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;flex:none}
.duo .d-big button{height:52px;border-radius:14px;background:rgba(255,255,255,.08);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font:700 12px/1 var(--f-display,system-ui);letter-spacing:.02em}
.duo .d-big button small{font:500 8.5px/1 var(--f-mono,monospace);letter-spacing:.06em;color:rgba(236,232,220,.5);text-transform:lowercase}
.duo .d-big .idea{grid-column:1/-1;height:58px;background:linear-gradient(180deg,#FF8A3D,#E2602A);color:#1A0E07;font-size:17px}
.duo .d-big .idea small{color:rgba(26,14,7,.6)}
.duo .d-big button:active{transform:scale(.98)}
.duo .d-bot{display:flex;align-items:center;gap:6px;flex:none}
.duo .d-bot .u{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.07);font:500 17px/40px var(--f-mono,monospace)}
.duo .d-play{width:62px;height:62px;border-radius:50%;background:#ECE8DC;color:#141312;display:grid;place-items:center;flex:none;box-shadow:0 6px 20px -6px rgba(0,0,0,.6)}
.duo .d-play svg{width:22px;height:22px;fill:currentColor}
.duo .d-mem{flex:1;display:grid;grid-template-columns:repeat(4,1fr);gap:4px;min-width:0}
.duo .d-mem button{height:40px;border-radius:10px;background:rgba(255,255,255,.05);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-width:0;position:relative;overflow:hidden}
.duo .d-mem button b{font:400 13px/1 var(--f-dot,monospace)}.duo .d-mem button small{font:500 7.5px/1 var(--f-mono,monospace);color:rgba(236,232,220,.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;padding:0 3px}
.duo .d-mem button.full{background:rgba(255,138,61,.16);box-shadow:inset 0 0 0 1px rgba(255,138,61,.5)}.duo .d-mem button.cur{background:#FF8A3D;color:#1A0E07}.duo .d-mem button.cur small{color:rgba(26,14,7,.65)}
.duo .d-mem button.d-hold::after{content:"";position:absolute;left:0;bottom:0;height:3px;background:#FF8A3D;animation:duoHold .6s linear forwards}
.duo .d-note{font:400 8.5px/1.3 var(--f-mono,monospace);color:rgba(236,232,220,.4);text-align:center;flex:none}
@media (min-width:760px){.duo{padding-left:max(24px,calc(50vw - 260px));padding-right:max(24px,calc(50vw - 260px))}}
@media (max-height:640px){.duo .d-big button{height:44px}.duo .d-big .idea{height:48px}.duo .d-play{width:52px;height:52px}.duo .d-note{display:none}}
.duo-btn{display:inline-flex;align-items:center;gap:6px}
/* iPhone Duo open (and any wide, not too low screen held sideways): the circle on the left, the controls in a column on the right */
@media (orientation:landscape) and (min-width:700px) and (min-height:420px){
  .duo{display:grid;grid-template-columns:minmax(0,1fr) minmax(330px,min(44vw,440px));grid-template-rows:auto minmax(0,1fr) auto auto auto minmax(0,1fr) auto auto;column-gap:22px;row-gap:8px;align-content:stretch;
    padding-left:max(18px,env(safe-area-inset-left,0px));padding-right:max(18px,env(safe-area-inset-right,0px))}
  .duo>.d-ring{grid-column:1;grid-row:1/-1;min-height:0}
  .duo>.d-top,.duo>.d-chips,.duo>.d-big,.duo>.d-bot,.duo>.d-note{grid-column:2}
  .duo>.d-top{grid-row:1}.duo>.d-chips[data-g="dr"]{grid-row:3}.duo>.d-chips[data-g="st"]{grid-row:4}.duo>.d-big{grid-row:5;margin-top:6px}.duo>.d-bot{grid-row:7}.duo>.d-note{grid-row:8}
  .duo .d-chip{height:40px;font-size:10.5px}.duo .d-big .idea{height:clamp(58px,12vh,86px);font-size:19px}.duo .d-big button{height:clamp(52px,10vh,72px)}.duo .d-mem button{height:46px}
  .duo .d-pre .nm{max-width:22vw}}
/* the extra desktop pieces are hidden on phones */
.duo .d-panel,.duo .d-lb,.duo .d-keys,.duo .d-trk,.duo .d-tb{display:none}
/* the compact tracker (computer): the current bar as 16 rows — six drum columns you can click, and what the Starter plays
   (chord, sub, top) read-only; the play line runs down it and playing cells light up white, like the big tracker */
.duo .d-trk{flex-direction:column;min-height:0;border-radius:22px;background:rgba(0,0,0,.22);box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);padding:14px 12px 10px;font:500 10.5px/1 var(--f-mono,monospace)}
.duo .d-th{display:flex;align-items:center;gap:6px;padding:0 4px 10px}
.duo .d-th b{font:600 8.5px/1 var(--f-mono,monospace);letter-spacing:.2em;text-transform:uppercase;color:rgba(236,232,220,.45);margin-right:auto}
.duo .d-bars{display:flex;gap:3px}.duo .d-bars button,.duo .d-fol{height:24px;min-width:26px;padding:0 8px;border-radius:12px;background:rgba(255,255,255,.06);font:500 10px/24px var(--f-mono,monospace);color:rgba(236,232,220,.6)}
.duo .d-bars button.on{background:#ECE8DC;color:#141312}.duo .d-bars button.pl:not(.on){box-shadow:inset 0 0 0 1px rgba(255,138,61,.7);color:#FF9A57}
.duo .d-fol.on{background:rgba(255,138,61,.2);color:#FF9A57;box-shadow:inset 0 0 0 1px rgba(255,138,61,.5)}
.duo .d-tc,.duo .d-r{display:grid;grid-template-columns:20px repeat(6,minmax(0,.9fr)) minmax(0,2.6fr) minmax(0,1.25fr) minmax(0,1.25fr);column-gap:2px;align-items:center}
.duo .d-tc{padding:0 4px 6px;border-bottom:1px solid rgba(255,255,255,.07);margin-bottom:4px}
.duo .d-tc span{display:flex;flex-direction:column;align-items:center;gap:4px;font:600 7.5px/1 var(--f-mono,monospace);letter-spacing:.08em;text-transform:uppercase;color:rgba(236,232,220,.42);white-space:nowrap;overflow:hidden}
.duo .d-tc span i{width:6px;height:6px;border-radius:50%;background:var(--c)}
.duo .d-tr{flex:1;min-height:0;display:flex;flex-direction:column}
.duo .d-r{flex:1;min-height:16px;padding:0 4px;border-radius:6px;position:relative}
.duo .d-r:nth-child(4n+1){background:rgba(255,255,255,.035)}
.duo .d-r>*{height:100%;min-width:0;display:flex;align-items:center;justify-content:center;border-radius:4px;white-space:nowrap;overflow:hidden;color:rgba(236,232,220,.16);background:none;box-shadow:none;padding:0;font:inherit;font-size:11px}
.duo .d-r>b{font-weight:500;color:rgba(236,232,220,.32);justify-content:flex-start;font-size:9.5px!important}
.duo .d-r>.dc,.duo .d-r>.sc{cursor:pointer}.duo .d-r>.sc:hover,.duo .d-r>.dc:hover{background:rgba(255,255,255,.08)}
.duo .d-r>.k-on{color:var(--c)}.duo .d-r>.k-ac{color:var(--c);font-weight:800}
.duo .d-r>.k-mu{opacity:.35}
.duo .d-r>.k-st{color:var(--c);justify-content:flex-start;padding-left:4px}.duo .d-r>.k-hd{color:color-mix(in srgb,var(--c) 30%,transparent);justify-content:flex-start;padding-left:4px}
.duo .d-r.pl{background:rgba(255,138,61,.13)!important;box-shadow:inset 2px 0 0 #FF8A3D}
.duo .d-r.pl>.k-on,.duo .d-r.pl>.k-ac,.duo .d-r.pl>.k-st{background:rgba(255,255,255,.16);color:#fff}
.duo .d-tf{padding:8px 4px 0;font:400 8px/1.4 var(--f-mono,monospace);color:rgba(236,232,220,.3)}
/* computer (a big, wide window): a calm two-part studio layout — the header across the top, the circle as a square on the left
   with the hold pads hugging it, the controls in one panel on the right with labelled groups, and keyboard shortcuts */
@media (orientation:landscape) and (min-width:1100px) and (min-height:620px){
  .duo{grid-template-columns:minmax(0,1fr) clamp(390px,30vw,480px);grid-template-rows:auto minmax(0,1fr) auto auto auto auto auto auto auto minmax(0,1fr);
    column-gap:clamp(40px,5vw,96px);row-gap:0;padding:26px max(44px,calc((100vw - 1640px)/2)) 26px}
  .duo>.d-top{grid-column:1/-1;grid-row:1;min-height:48px;padding-bottom:6px}
  .duo .d-brand b{font-size:19px}.duo .d-brand small{font-size:8.5px}
  .duo .d-pre button{height:40px;min-width:36px;border-radius:20px;font-size:17px;line-height:40px}.duo .d-pre .nm{padding:0 18px;font-size:15px;line-height:40px;max-width:30vw}
  .duo .d-x{width:40px;height:40px;font-size:20px;line-height:40px}
  .duo>.d-ring{grid-column:1;grid-row:2/-1;align-self:center;justify-self:center;width:min(100%,calc(100vh - 110px));height:auto;aspect-ratio:1;max-height:100%}
  .duo .d-tempo{gap:4px}.duo .d-tempo button,.duo .d-tempo .d-lk{width:40px;height:30px;border-radius:15px;line-height:30px;font-size:16px}.duo .d-tempo b{font-size:18px}
  .duo .d-fx{padding:14px 18px}.duo .d-fx b{font-size:15px}.duo .d-fx small{font-size:8.5px}
  .duo>.d-panel{display:block;grid-column:2;grid-row:3/10;margin:-24px -26px;border-radius:26px;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.02));box-shadow:inset 0 0 0 1px rgba(255,255,255,.06),0 30px 80px -40px rgba(0,0,0,.8)}
  .duo>.d-lb{display:block;grid-column:2;font:600 8.5px/1 var(--f-mono,monospace);letter-spacing:.2em;text-transform:uppercase;color:rgba(236,232,220,.4);padding:0 2px 9px;position:relative}
  .duo>.d-lb[data-l="dr"]{grid-row:3}.duo>.d-chips[data-g="dr"]{grid-row:4;grid-column:2}.duo>.d-lb[data-l="st"]{grid-row:5;padding-top:18px}.duo>.d-chips[data-g="st"]{grid-row:6;grid-column:2}
  .duo>.d-big{grid-row:7;grid-column:2;margin-top:22px;gap:8px}.duo>.d-bot{grid-row:8;grid-column:2;margin-top:22px;gap:8px}
  .duo>.d-note{grid-row:9;grid-column:2;margin-top:18px;font-size:9px;text-align:left;line-height:1.5}
  .duo>.d-keys{display:flex;flex-wrap:wrap;gap:8px 16px;grid-row:10;grid-column:2;align-self:start;margin-top:40px;font:400 9px/16px var(--f-mono,monospace);color:rgba(236,232,220,.38)}
  .duo .d-keys span{white-space:nowrap;display:inline-flex;align-items:center;gap:6px}
  .duo .d-keys b{display:inline-block;min-width:16px;padding:0 5px;border-radius:4px;background:rgba(255,255,255,.07);color:rgba(236,232,220,.75);font-weight:600;text-align:center;line-height:16px}
  .duo .d-chips{gap:6px}.duo .d-chip{height:42px;border-radius:21px;font-size:11px;gap:8px}.duo .d-chip i{width:8px;height:8px}
  .duo .d-big .idea{height:clamp(76px,10vh,96px);border-radius:18px;font-size:23px;gap:7px}.duo .d-big .idea small{font-size:9.5px}
  .duo .d-big button{height:clamp(62px,8vh,76px);border-radius:16px;font-size:14px;gap:6px}.duo .d-big button small{font-size:9px}
  .duo .d-play{width:72px;height:72px}.duo .d-play svg{width:26px;height:26px}.duo .d-bot .u{width:46px;height:46px;line-height:46px;font-size:19px}
  .duo .d-mem button{height:54px;border-radius:12px}.duo .d-mem button b{font-size:15px}.duo .d-mem button small{font-size:8.5px}}
@media (orientation:landscape) and (min-width:1100px) and (max-height:720px){.duo>.d-keys{margin-top:26px}}
/* a smaller computer screen: the tracker takes the circle's place instead of squeezing in beside it (T or the button swaps back) */
@media (orientation:landscape) and (min-width:1100px) and (max-width:1359px) and (min-height:620px){
  .duo.trk.trk{grid-template-columns:minmax(0,1fr) clamp(360px,34vw,460px)}
  .duo.trk.trk>.d-ring{display:none}
  .duo.trk.trk>.d-trk{grid-column:1;justify-self:center;width:min(100%,620px)}
  .duo.trk.trk>.d-panel,.duo.trk.trk>.d-lb,.duo.trk.trk>.d-chips,.duo.trk.trk>.d-big,.duo.trk.trk>.d-bot,.duo.trk.trk>.d-note,.duo.trk.trk>.d-keys{grid-column:2}
  .duo.trk.trk .d-chip{font-size:10.5px}}
/* with the tracker on a smaller screen the shortcut list gives way (the keys still work) */
@media (max-width:1499px),(max-height:819px){.duo.trk>.d-keys{display:none!important}}
@media (orientation:landscape) and (min-width:1100px) and (min-height:620px){
  .duo .d-tb{display:block;height:40px;padding:0 16px;border-radius:20px;background:rgba(255,255,255,.07);font:500 11px/40px var(--f-mono,monospace);color:rgba(236,232,220,.65);margin-right:4px}
  .duo.trk .d-tb{background:rgba(255,138,61,.18);color:#FF9A57;box-shadow:inset 0 0 0 1px rgba(255,138,61,.5)}
  .duo.trk{grid-template-columns:minmax(0,1fr) clamp(280px,22vw,400px) clamp(340px,27vw,470px);column-gap:clamp(24px,3vw,56px)}
  .duo.trk>.d-trk{display:flex;grid-column:2;grid-row:2/-1;align-self:center;height:min(100%,calc(100vh - 110px),760px)}
  .duo.trk .d-chip{font-size:10px;gap:5px}
  .duo.trk>.d-panel,.duo.trk>.d-lb,.duo.trk>.d-chips,.duo.trk>.d-big,.duo.trk>.d-bot,.duo.trk>.d-note,.duo.trk>.d-keys{grid-column:3}}
@media (orientation:landscape) and (min-width:1100px) and (min-height:620px) and (hover:hover){
  .duo .d-chip:hover,.duo .d-big button:not(.idea):hover,.duo .d-mem button:hover,.duo .d-bot .u:hover,.duo .d-x:hover,.duo .d-pre button:hover,.duo .d-tempo button:hover{background:rgba(255,255,255,.14)}
  .duo .d-big .idea:hover{filter:brightness(1.07)}.duo .d-play:hover{transform:scale(1.04)}.duo .d-fx:not(.on):hover{background:linear-gradient(160deg,rgba(255,255,255,.15),rgba(255,255,255,.06))}
  .duo .d-chip,.duo .d-big button,.duo .d-mem button,.duo .d-play{transition:background .12s,transform .12s,filter .12s}}
/* iPhone Duo open, held upright: a bit more room for everything, the column stays centred */
@media (orientation:portrait) and (min-width:600px){.duo .d-chip{height:38px;font-size:10.5px}.duo .d-big button{height:58px}.duo .d-big .idea{height:66px}.duo .d-mem button{height:46px}}
/* iPhone Duo closed: wide and short, so the controls get a little slimmer and the circle keeps its size */
@media (orientation:portrait) and (min-aspect-ratio:2/3) and (max-width:599px){.duo{gap:6px}.duo .d-chip{height:31px}.duo .d-big button{height:46px}.duo .d-big .idea{height:52px}.duo .d-play{width:54px;height:54px}.duo .d-bot .u{width:36px;height:36px;line-height:36px}.duo .d-mem button{height:38px}}
`;document.head.appendChild(css);
