/* ---------- (v253) iPad and computer: the idea screen is a window over the app, the app blurred behind it ----------
   "tracker" (T) puts the tracker in the circle's place; T again brings the circle back. Phones keep the full screen.
   (v254) The panel on the right is as tall as the circle / tracker beside it. */
const css2=document.createElement('style');css2.textContent=`
.duo-veil{position:fixed;inset:0;z-index:6999;display:none;background:rgba(10,10,9,.34);-webkit-backdrop-filter:blur(22px) saturate(.8);backdrop-filter:blur(22px) saturate(.8);animation:duoVeil .3s ease both}
@keyframes duoVeil{from{opacity:0}to{opacity:1}}
body:has(>.duo.box:not([hidden])) .duo-veil{display:block}
.duo.box.boxw.boxw[hidden],.duo.box[hidden]{display:none!important}
.duo.box{box-sizing:border-box;inset:auto!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%);width:min(620px,88vw);height:min(980px,88vh);border-radius:28px;
  background:linear-gradient(180deg,rgba(38,36,33,.9),rgba(20,19,18,.94));-webkit-backdrop-filter:blur(30px);backdrop-filter:blur(30px);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 0 0 1px rgba(255,255,255,.07),0 40px 120px -30px rgba(0,0,0,.85);padding:20px 22px!important;animation:duoBox .38s cubic-bezier(.2,.9,.25,1.08) both}
@keyframes duoBox{from{opacity:0;transform:translate(-50%,-47%) scale(.97)}to{opacity:1;transform:translate(-50%,-50%)}}
.duo.box>*{position:relative;z-index:1}
.duo.box .d-tb{display:block;height:34px;padding:0 14px;border-radius:17px;background:rgba(255,255,255,.07);font:500 11px/34px var(--f-mono,monospace);color:rgba(236,232,220,.65);margin-right:4px}
.duo.box.trk .d-tb{background:rgba(255,138,61,.18);color:#FF9A57;box-shadow:inset 0 0 0 1px rgba(255,138,61,.5)}
.duo.box .d-keys{display:none!important}
.duo.box:not(.trk)>.d-trk{display:none!important}
/* the tracker in front, in the circle's place */
.duo.box.trk>.d-ring{display:none!important}
.duo.box.trk>.d-trk{display:flex!important;position:relative!important;inset:auto!important;opacity:1;pointer-events:auto;z-index:1;-webkit-mask:none;mask:none;padding:14px 12px 10px!important;background:rgba(0,0,0,.24)!important;border-radius:20px!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)!important}
.duo.box:not(.boxw).trk>.d-trk{flex:1;min-height:0}
/* a wide window: the circle (or the tracker) on the left, the controls in a panel on the right */
.duo.box.boxw.boxw{display:grid!important;width:min(1180px,90vw);height:min(760px,86vh);grid-template-columns:minmax(0,1fr) clamp(370px,38%,440px)!important;
  grid-template-rows:auto minmax(0,1fr) auto auto auto auto auto auto auto minmax(0,1fr)!important;column-gap:clamp(24px,3vw,44px)!important;row-gap:0!important;padding:22px 30px!important}
.duo.box.boxw.boxw>.d-top{grid-column:1/-1;grid-row:1;padding-bottom:6px}
.duo.box.boxw.boxw>.d-ring{display:flex;grid-column:1;grid-row:2/-1;width:auto!important;height:auto!important;aspect-ratio:auto!important;align-self:stretch!important;justify-self:stretch!important;max-height:none!important}
.duo.box.boxw.boxw.trk>.d-trk{grid-column:1!important;grid-row:2/-1!important;align-self:stretch;justify-self:stretch;width:auto!important;height:auto!important;margin:8px 0 0}
.duo.box.boxw.boxw>.d-ring{margin-top:8px}
.duo.box.boxw.boxw>.d-panel{display:block;grid-column:2;grid-row:2/-1;margin:8px -18px 0;border-radius:22px;background:rgba(255,255,255,.035);box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}
.duo.box.boxw.boxw>.d-lb{display:block;grid-column:2;font:600 8.5px/1 var(--f-mono,monospace);letter-spacing:.2em;text-transform:uppercase;color:rgba(236,232,220,.4);padding:0 2px 9px}
.duo.box.boxw.boxw>.d-lb[data-l="dr"]{grid-row:3}.duo.box.boxw.boxw>.d-chips[data-g="dr"]{grid-row:4;grid-column:2}
.duo.box.boxw.boxw>.d-lb[data-l="st"]{grid-row:5;padding-top:16px}.duo.box.boxw.boxw>.d-chips[data-g="st"]{grid-row:6;grid-column:2}
.duo.box.boxw.boxw>.d-big{grid-row:7;grid-column:2;margin-top:18px;gap:7px}.duo.box.boxw.boxw>.d-bot{grid-row:8;grid-column:2;margin-top:18px;gap:7px}
.duo.box.boxw.boxw>.d-note{grid-row:9;grid-column:2;margin-top:14px;font-size:8.5px;text-align:left;line-height:1.5}
.duo.box.boxw .d-chips{gap:5px}.duo.box.boxw .d-chip{height:38px;border-radius:19px;font-size:10px;gap:5px}
.duo.box.boxw .d-big .idea{height:clamp(62px,9vh,84px);font-size:20px}.duo.box.boxw .d-big button{height:clamp(54px,7.5vh,66px);font-size:13px}
.duo.box.boxw .d-play{width:64px;height:64px}.duo.box.boxw .d-mem button{height:48px}
.duo.box .d-pre .nm{max-width:min(30vw,280px)}
`;document.head.appendChild(css2);
