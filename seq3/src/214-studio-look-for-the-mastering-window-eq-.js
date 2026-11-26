/* ================= Studio look for the mastering window (eq, multi, fx): a flat grey hardware panel, outlined modules with the
   name printed into the top line, black square buttons with a red LED, black knobs with a printed scale. Same in every look
   except dots, which keeps its own black-and-white print. Only styling: nothing here changes sound or behaviour. ================= */
(()=>{const st=document.createElement('style');st.textContent=`
.pq-ov.pq-ov .pq-win{--dm-bg:#262628;--dm-ink:#E8E6E0;--dm-dim:rgba(232,230,224,.5);--dm-edge:#55555A;--dm-led:#FF3B30;--pq-acc:#E9C54A;
  background:var(--dm-bg);border-radius:4px;padding:0 18px 18px;gap:16px;color:var(--dm-ink);
  box-shadow:0 30px 90px rgba(0,0,0,.6),inset 0 0 0 1px #3E3E42,inset 0 1px 0 rgba(255,255,255,.06)}
.pq-ov.pq-ov .pq-wh{margin:0 -18px;padding:10px 18px;gap:6px;background:#1E1E20;border-bottom:1px solid #3A3A3D;position:sticky;top:0;z-index:2}
.pq-ov.pq-ov .pq-wsp{display:flex;justify-content:flex-end;padding-right:10px;min-width:0;overflow:hidden}@media (max-width:760px){.pq-ov.pq-ov .pq-wsp::before{display:none}}
.pq-ov.pq-ov .pq-wsp::before{content:'BLONDA  ·  MASTER SECTION';white-space:pre;font:600 9px var(--f-mono);letter-spacing:.32em;color:var(--dm-dim)}
/* black square buttons with an LED */
.pq-ov.pq-ov :is(.pq-tabs button,.pq-wbyp,.pq-x,.rk-tg button,.rk-on,.mb-bo,.rk-b){position:relative;border:0;border-radius:2px;background:#121213;color:#C9C7C1;opacity:1;
  box-shadow:inset 0 0 0 1px #000,inset 0 1px 0 rgba(255,255,255,.07),0 1px 0 rgba(255,255,255,.04);font:600 9px var(--f-mono)!important;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transition:color .1s}
.pq-ov.pq-ov :is(.pq-tabs button,.pq-wbyp,.rk-tg button,.rk-on,.mb-bo){padding:6px 12px 6px 22px!important;height:auto!important}
.pq-ov.pq-ov :is(.pq-tabs button,.pq-wbyp,.rk-tg button,.rk-on,.mb-bo)::before{content:'';position:absolute;left:9px;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:#3A1A18;box-shadow:inset 0 0 0 1px rgba(0,0,0,.6)}
.pq-ov.pq-ov :is(.pq-tabs button.on,.pq-wbyp.on,.rk-tg button.on,.rk-on.on,.mb-bo.on)::before{background:var(--dm-led);box-shadow:0 0 6px var(--dm-led),0 0 2px var(--dm-led)}
.pq-ov.pq-ov :is(.pq-tabs button,.pq-wbyp,.pq-x,.rk-tg button,.rk-on,.mb-bo,.rk-b):hover{color:#fff}
.pq-ov.pq-ov :is(.pq-tabs button.on,.rk-tg button.on){color:#fff;background:#0B0B0C}
.pq-ov.pq-ov :is(.pq-wbyp.on,.rk-on.on,.mb-bo.on){background:#121213;color:#fff}
.pq-ov.pq-ov .pq-x{width:26px;height:24px!important;padding:0!important;font-size:11px!important;letter-spacing:0}
.pq-ov.pq-ov .rk-b{width:20px;height:18px;padding:0;font-size:8px!important;letter-spacing:0}
.pq-ov.pq-ov .rk-tg{gap:5px;padding-bottom:2px}
.pq-ov.pq-ov .rk-tg button{padding:5px 10px 5px 20px!important;font-size:8.5px!important}
.pq-ov.pq-ov .rk-tg button::before{left:8px;width:5px;height:5px;margin-top:-2.5px}
.pq-ov.pq-ov .rk-tg button:not(.has):not(.on){color:#8A8883}
.pq-ov.pq-ov .rk-tg sup{font-size:7.5px;color:var(--dm-led);margin-left:4px;vertical-align:4px}
/* graphs */
.pq-ov.pq-ov .pq-win .pq-cv{border-radius:2px;background:#131314;box-shadow:inset 0 0 0 1px #000,0 0 0 1px #3A3A3D}
.pq-ov.pq-ov .pq-ic{gap:4px}
.pq-ov.pq-ov .pq-i{border-radius:2px;background:#151516;box-shadow:inset 0 0 0 1px #000,inset 0 1px 0 rgba(255,255,255,.05);color:#C9C7C1}
.pq-ov.pq-ov .pq-i.sel{box-shadow:inset 0 0 0 1px var(--bc),inset 0 0 0 2px #000}
.pq-ov.pq-ov .pq-i em{text-transform:uppercase;letter-spacing:.12em;font-size:8px}
/* modules: an outlined box with the name printed into its top line */
.pq-ov.pq-ov :is(.rk-card,.dm-mod,.rk-cat){position:relative;border:1px solid var(--dm-edge);border-radius:3px;background:transparent;box-shadow:none;margin-top:7px}
.pq-ov.pq-ov :is(.dm-t,.rk-cat>b){position:absolute;top:-7px;left:10px;display:flex;align-items:center;gap:6px;padding:0 7px;background:var(--dm-bg);
  font:600 9.5px/14px var(--f-mono);letter-spacing:.2em;text-transform:uppercase;color:var(--dm-ink);border:0;white-space:nowrap}
.pq-ov.pq-ov button.dm-t{cursor:pointer;margin:0;height:14px}
.dm-led{display:block;width:6px;height:6px;border-radius:50%;background:var(--cc);box-shadow:0 0 5px var(--cc)}
.pq-ov.pq-ov .dm-mod.off .dm-led,.pq-ov.pq-ov .rk-card.off .rk-n b::before{background:#3A3A3D;box-shadow:none}
.pq-ov.pq-ov .dm-mods{display:grid;gap:14px 12px}
.pq-ov.pq-ov .dm-mod{display:flex;flex-direction:column;align-items:stretch;gap:10px;padding:18px 10px 12px}
.pq-ov.pq-ov .dm-ks{display:flex;justify-content:space-evenly;align-items:flex-start;gap:4px 6px;flex-wrap:wrap}
.pq-ov.pq-ov .dm-mod.off .dm-ks{opacity:.4}
/* knob text always printed in the panel ink (the app's own knob rules would make it dark) */
.pq-ov.pq-ov .dk .dk-l{color:var(--dm-ink)!important;font:600 7.5px/1 var(--f-mono)!important;letter-spacing:.16em!important;text-transform:uppercase!important;opacity:.82}
.pq-ov.pq-ov .dk .dk-v{color:var(--dm-ink)!important;font:500 9.5px/1 var(--f-mono)!important}
/* eq: eight band modules */
.pq-ov.pq-ov .pq-tb.dm-mods{grid-template-columns:repeat(8,minmax(0,1fr))}
.pq-ov.pq-ov .pq-tb .dm-mod{padding:18px 4px 10px;border-radius:3px}
.pq-ov.pq-ov .pq-tb .dm-mod.sel{border-color:var(--cc)}
.pq-ov.pq-ov .pq-tb .dm-ks{gap:0;flex-wrap:nowrap;justify-content:space-around}
.pq-ov.pq-ov .pq-tb .dk.sm{min-width:0;flex:0 1 46px;--dk-sz:36px}.pq-ov.pq-ov .pq-tb .dk .dk-v{font-size:8.5px!important}
@media (max-width:1250px){.pq-ov.pq-ov .pq-tb.dm-mods{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media (max-width:640px){.pq-ov.pq-ov .pq-tb.dm-mods{grid-template-columns:repeat(2,minmax(0,1fr))}}
/* multi: three band modules + one for all bands */
.pq-ov.pq-ov .mb-tb.dm-mods{grid-template-columns:repeat(3,minmax(0,1fr)) minmax(0,1.35fr)}
.pq-ov.pq-ov .mb-tb.off{opacity:1}.pq-ov.pq-ov .mb-tb.off .dm-ks{opacity:.55}
.pq-ov.pq-ov .mb-mod .mb-bo{align-self:flex-start;margin:0;color:#C9C7C1}
.pq-ov.pq-ov .mb-mod .mb-bo i{display:none}
.pq-ov.pq-ov .mb-mod[data-i]{padding-top:14px}
.mb-grm{position:relative;height:14px;display:flex;align-items:center;justify-content:flex-end;background:#0F0F10;border-radius:1px;box-shadow:inset 0 0 0 1px #000;overflow:hidden}
.mb-grm b{position:absolute;inset:3px 3px;transform-origin:right center;transform:scaleX(0);background:var(--cc);opacity:.85}
.mb-grm em{position:relative;font:500 8.5px var(--f-mono);font-style:normal;padding:0 6px;color:var(--dm-ink);mix-blend-mode:difference}
.pq-ov.pq-ov .mb-mod[data-i] .mb-bo{position:absolute;top:-10px;right:10px;padding:3px 9px 3px 19px!important;font-size:8px!important}
.pq-ov.pq-ov .mb-mod[data-i] .mb-bo::before{left:7px;width:5px;height:5px;margin-top:-2.5px}
@media (max-width:900px){.pq-ov.pq-ov .mb-tb.dm-mods{grid-template-columns:repeat(2,minmax(0,1fr))}}
/* fx: effect cards as modules */
.pq-ov.pq-ov .rk-chain{gap:14px;padding:2px 2px 6px;min-height:230px}
.pq-ov.pq-ov .rk-card{padding:20px 14px 14px;gap:12px;min-width:250px}
.pq-ov.pq-ov .rk-ch{position:absolute;top:-10px;left:8px;right:8px;display:flex;align-items:center;gap:3px;pointer-events:none}
.pq-ov.pq-ov .rk-ch>*{pointer-events:auto}
.pq-ov.pq-ov .rk-n{flex:0 1 auto;display:block}
.pq-ov.pq-ov .rk-n b{display:flex;align-items:center;gap:6px;padding:0 7px;background:var(--dm-bg);font:600 9.5px/18px var(--f-mono);letter-spacing:.2em;text-transform:uppercase;color:var(--dm-ink)}
.pq-ov.pq-ov .rk-n b::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--cc);box-shadow:0 0 5px var(--cc)}
.pq-ov.pq-ov .rk-cg{display:block;flex:none;margin-left:-4px;padding:0 6px 0 0;background:var(--dm-bg);font:500 7.5px/18px var(--f-mono);letter-spacing:.16em;text-transform:uppercase;color:var(--dm-dim)}
.pq-ov.pq-ov .rk-ch::after{content:'';flex:1;order:1}
.pq-ov.pq-ov .rk-b{order:2;outline:3px solid var(--dm-bg)}
.pq-ov.pq-ov .rk-on{align-self:flex-start;font-size:8.5px!important}
.pq-ov.pq-ov .rk-k{grid-template-columns:repeat(4,minmax(56px,1fr));gap:14px 6px}
.pq-ov.pq-ov .rk-addc{flex:0 0 130px;margin-top:7px;border-radius:3px;background:transparent;box-shadow:none;border:1px dashed var(--dm-edge);color:var(--dm-dim);text-transform:uppercase;letter-spacing:.16em;font:600 8.5px var(--f-mono)}
.pq-ov.pq-ov .rk-addc:hover{color:var(--dm-ink);border-color:var(--dm-ink)}
.pq-ov.pq-ov .rk-empty{text-transform:uppercase;letter-spacing:.14em;font-size:9px}
/* fx library */
.pq-ov.pq-ov .rk-lib{gap:14px 12px}
.pq-ov.pq-ov .rk-cat{padding:16px 10px 10px;gap:5px}
.pq-ov.pq-ov .rk-cat>b{color:var(--dm-ink)}
.pq-ov.pq-ov .rk-cat>b::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--cc);box-shadow:0 0 5px var(--cc)}
.pq-ov.pq-ov .rk-cat button{border-radius:2px;background:#151516;box-shadow:inset 0 0 0 1px #000,inset 0 1px 0 rgba(255,255,255,.05);color:#D6D4CE;padding:7px 10px;font-size:10.5px}
.pq-ov.pq-ov .rk-cat button:hover{color:#fff;box-shadow:inset 0 0 0 1px #000,inset 2px 0 0 var(--cc)}
/* dots: no half-tones (the print filter would wipe them): off = dashed outline instead of faded */
.pq-ov.dots :is(.rk-card.off .rk-k,.dm-mod.off .dm-ks,.mb-tb.off .dm-ks,.mb-tb.off){opacity:1}.pq-ov.dots :is(.rk-card.off,.dm-mod.off){border-style:dashed}
.pq-ov.dots .dk .dk-l{opacity:1}
/* dots: black and white print, panel black, lines light (the window's filter inverts it to black on white) */
.pq-ov.dots .pq-win{--dm-bg:#121215;--dm-ink:#ECEAE3;--dm-dim:#ECEAE3;--dm-edge:#ECEAE3;--dm-led:#ECEAE3}
.pq-ov.dots .pq-wh{background:#121215;border-bottom-color:#ECEAE3}
.pq-ov.dots :is(.pq-tabs button,.pq-wbyp,.pq-x,.rk-tg button,.rk-on,.mb-bo,.rk-b,.pq-i,.rk-cat button){background:#121215!important;color:#ECEAE3!important;box-shadow:inset 0 0 0 1px #ECEAE3!important}
.pq-ov.dots :is(.pq-tabs button,.pq-wbyp,.rk-tg button,.rk-on,.mb-bo)::before{background:transparent;box-shadow:inset 0 0 0 1px #ECEAE3}
.pq-ov.dots :is(.pq-tabs button.on,.pq-wbyp.on,.rk-tg button.on,.rk-on.on,.mb-bo.on)::before{background:#ECEAE3;box-shadow:none}
.pq-ov.dots .dm-led,.pq-ov.dots .rk-n b::before,.pq-ov.dots .rk-cat>b::before{background:#ECEAE3;box-shadow:none}
.pq-ov.dots .dm-mod.off .dm-led,.pq-ov.dots .rk-card.off .rk-n b::before{background:transparent;box-shadow:inset 0 0 0 1px #ECEAE3}
.pq-ov.dots .mb-grm{background:#121215;box-shadow:inset 0 0 0 1px #ECEAE3}.pq-ov.dots .mb-grm b{background:#ECEAE3;opacity:1}
.pq-ov.dots .pq-tb .dm-mod.sel{border-width:2px}
.pq-ov.dots .pq-win .pq-cv{box-shadow:0 0 0 1px #ECEAE3}`;document.head.appendChild(st)})();

