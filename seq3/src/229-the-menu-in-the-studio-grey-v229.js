/* ================= The menu in the studio grey (v229) =================
   The menu box drawn like the rest of the app: the cards' grey, thin rings, square corners, mono text in lower case. Yellow only
   for what matters: save, and what is chosen (the pattern, song mode, the current song). The project buttons sit in an even grid,
   the patterns and the swing are one joined group each, every section has a quiet label with a hairline. ================= */
(()=>{
  const css=document.createElement('style');css.textContent=`
body .mmenu .mm-box{--mg:rgb(28,30,32);--mg2:rgb(23,24,26);--mr:rgb(55,55,56);--mr2:rgb(78,79,82);--mf:#F5F5F2;--mm:rgba(245,245,242,.5);--my:#F2C418;
  background:var(--mg)!important;color:var(--mf)!important;border-radius:2px!important;box-shadow:inset 0 0 0 1px var(--mr),0 30px 80px -20px rgba(0,0,0,.7)!important;
  padding:18px 18px 20px!important;max-width:min(560px,calc(100vw - 24px))!important;font-family:var(--f-mono)!important}
body .mmenu .mm-box *{font-family:var(--f-mono)}
/* head: "meny" as a card caption, the close as a card button */
body .mmenu .mm-hd{margin:0 0 14px!important;align-items:center}
body .mmenu .mm-hd b{font:500 12px var(--f-mono)!important;letter-spacing:.1em!important;color:var(--mm)!important;text-transform:lowercase}
body .mmenu .mm-x{width:32px!important;height:32px!important;border-radius:0!important;background:transparent!important;color:var(--mf)!important;box-shadow:inset 0 0 0 1px var(--mr)!important;font-size:16px!important;outline:none!important}
body .mmenu .mm-x:hover{box-shadow:inset 0 0 0 1px var(--mr2)!important}
/* section labels with a hairline */
body .mmenu .dk-lab{display:flex;align-items:center;gap:10px;font:500 9.5px var(--f-mono)!important;letter-spacing:.14em!important;text-transform:lowercase!important;color:var(--mm)!important;margin:14px 0 8px!important}
body .mmenu .dk-lab::after{content:"";flex:1;height:1px;background:var(--mr)}
body .mmenu .mm-tools .dk-lab:first-child{margin-top:0!important}
body .mmenu .mm-tools{gap:0!important;margin-bottom:0!important}
body .mmenu .dock-d,body .mmenu .dock-in{gap:0!important;display:flex;flex-direction:column}
/* every button the same: a ring, square, mono */
body .mmenu .dk-row{gap:6px!important}
body .mmenu .dk-row button,body .mmenu .dk-row .gbtn,body .mmenu .dk-row .hx-b{height:36px!important;min-width:36px!important;padding:0 12px!important;border-radius:0!important;
  background:transparent!important;color:var(--mf)!important;box-shadow:inset 0 0 0 1px var(--mr)!important;border:0!important;font:500 11.5px var(--f-mono)!important;letter-spacing:.06em!important;
  text-transform:lowercase;justify-content:center;filter:none!important;transform:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
body .mmenu .dk-row button:hover{box-shadow:inset 0 0 0 1px var(--mr2)!important;background:rgba(255,255,255,.03)!important}
body .mmenu .dk-row button:disabled,body .mmenu .dk-row button[aria-disabled="true"]{opacity:.35!important}
body .mmenu .dk-row button svg{width:15px!important;height:15px!important;color:currentColor}
body .mmenu .mm-tools .hx-b{width:auto!important;padding:0 11px!important}
/* save: the one yellow button; chosen things: yellow ring and text */
body .mmenu .dk-row button.go{background:var(--my)!important;color:#111211!important;box-shadow:none!important}
body .mmenu .dk-row button.go svg{color:#111211}
body .mmenu .dk-row button.on,body .mmenu .dk-row button[aria-pressed="true"],body .mmenu #dkSong.on{box-shadow:inset 0 0 0 1px var(--my)!important;color:var(--my)!important;background:rgba(242,196,24,.06)!important}
/* the project's buttons in an even grid */
body .mmenu .dock-in > .dk-name + .dk-row{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(136px,1fr));gap:6px!important}
body .mmenu .dock-in > .dk-name + .dk-row button{width:100%;padding:0 8px!important;white-space:nowrap}
/* the name */
body .mmenu .dk-name{display:flex;align-items:center;gap:10px;margin:0 0 8px!important}
body .mmenu .dk-name input{flex:1;height:40px!important;border-radius:0!important;background:var(--mg2)!important;color:var(--mf)!important;box-shadow:inset 0 0 0 1px var(--mr)!important;border:0!important;padding:0 12px!important;font:500 16px var(--f-mono)!important;letter-spacing:.02em}
body .mmenu .dk-name input:focus{outline:none;box-shadow:inset 0 0 0 1px var(--mr2)!important}
body .mmenu .dk-name small{color:var(--mm)!important;font-size:9.5px!important;letter-spacing:.08em;white-space:nowrap}
/* songs */
body .mmenu .dk-song{border-radius:0!important;background:var(--mg2)!important;box-shadow:inset 0 0 0 1px var(--mr)!important;color:var(--mf)!important}
body .mmenu .dk-song.cur{box-shadow:inset 0 0 0 1px var(--my)!important}
body .mmenu .dk-song *{color:inherit}
/* patterns: one joined group, the chosen one in yellow */
body .mmenu .mm-tools .patseg{gap:0!important;box-shadow:inset 0 0 0 1px var(--mr)!important;background:transparent!important;padding:0!important;border-radius:0!important}
body .mmenu .mm-tools .patseg .pat{width:40px!important;min-width:40px!important;padding:0!important;box-shadow:none!important;color:var(--mm)!important}
body .mmenu .mm-tools .patseg .pat + .pat{box-shadow:inset 1px 0 0 var(--mr)!important}
body .mmenu .mm-tools .patseg .pat.cur{background:var(--my)!important;color:#111211!important;box-shadow:none!important}
/* undo / redo as a pair */
body .mmenu .mm-tools .ux{gap:0!important}
body .mmenu .mm-tools .ux button + button{margin-left:-1px}
/* swing: − value + as one group, then straight */
body .mmenu .mm-sw{gap:0!important}
body .mmenu .mm-sw .mm-swv{height:36px;min-width:64px;display:inline-flex;align-items:center;justify-content:center;font:500 13px var(--f-mono)!important;letter-spacing:.04em;color:var(--mf);box-shadow:inset 0 1px 0 var(--mr),inset 0 -1px 0 var(--mr)}
body .mmenu .mm-sw .mm-swr{margin-left:6px}
/* the project part gets a label like the others, and lines up with them */
body .mmenu .dock-in{padding:0!important;margin:0!important}
body .mmenu .dock-in::before{content:"projekt";display:block;font:500 9.5px var(--f-mono);letter-spacing:.14em;color:var(--mm);margin:14px 0 8px;
  background:linear-gradient(var(--mr),var(--mr)) no-repeat right center/calc(100% - 74px) 1px}
body .mmenu .mm-tools .ux button{font-size:17px!important}
body .mmenu .mm-box{overflow-y:auto!important;max-height:calc(100dvh - 24px)!important;overscroll-behavior:contain}
html[lang="en"] body .mmenu .dock-in::before{content:"project"}
/* v229b: everything in one small, simple style */
body .mmenu .dk-row button,body .mmenu .dk-row .gbtn,body .mmenu .dk-row .hx-b{height:32px!important;min-width:32px!important;padding:0 10px!important;font:500 11px var(--f-mono)!important;letter-spacing:.06em!important}
body .mmenu .dk-row button svg{width:13px!important;height:13px!important}
body .mmenu .mm-tools .patseg .pat{width:34px!important;min-width:34px!important;font:500 11px var(--f-mono)!important;letter-spacing:.04em!important;color:var(--mf)!important;text-transform:uppercase!important;-webkit-text-stroke:0!important;text-shadow:none!important}
body .mmenu .mm-tools .patseg .pat.cur{background:rgba(242,196,24,.08)!important;color:var(--my)!important;box-shadow:inset 0 0 0 1px var(--my)!important;position:relative;z-index:1}
body .mmenu .mm-tools .patseg .pat.cur + .pat{box-shadow:none!important}
body .mmenu .mm-tools .ux button{font-size:13px!important}
body .mmenu .mm-sw .mm-swv{height:32px;min-width:56px;font:500 11px var(--f-mono)!important}
body .mmenu .dk-lab{margin:12px 0 7px!important;font-size:9px!important}
body .mmenu .dock-in::before{margin:12px 0 7px;font-size:9px}
body .mmenu .dk-name input{height:34px!important;font:400 16px var(--f-mono)!important}
body .mmenu .dk-name small{font-size:9px!important}
body .mmenu .mm-hd{margin-bottom:10px!important}
body .mmenu .mm-hd b{font-size:11px!important}
body .mmenu .mm-x{width:28px!important;height:28px!important;font-size:14px!important}
body .mmenu .dk-song{width:116px!important;padding:8px 9px!important}
body .mmenu .dk-song b,body .mmenu .dk-song .t{font-size:12px!important}
body .mmenu .dk-song small,body .mmenu .dk-song i{font-size:9px!important}
body .mmenu .dock-in > .dk-name + .dk-row{grid-template-columns:repeat(auto-fill,minmax(120px,1fr))}
body .mmenu .mm-box{padding:16px 16px 18px!important}
/* the pattern letters are dot-matrix pictures in the header; in the menu plain letters in the same mono */
body .mmenu .mm-tools .patseg .pat svg{display:none!important}
body .mmenu .mm-tools .patseg .pat[data-p="0"]::after{content:"A"}
body .mmenu .mm-tools .patseg .pat[data-p="1"]::after{content:"B"}
body .mmenu .mm-tools .patseg .pat[data-p="2"]::after{content:"C"}
body .mmenu .mm-tools .patseg .pat[data-p="3"]::after{content:"D"}
/* look and midi */
body .mmenu .dock-set{margin-top:0!important;padding:0!important}`;document.head.appendChild(css);
})();

