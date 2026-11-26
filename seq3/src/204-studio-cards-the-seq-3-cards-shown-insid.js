/* ================= Studio cards: the SEQ.3 cards shown inside the studio (the panel on the right, and the step grid in the song view)
   are drawn the studio way in the glass and studio looks: the studio look's flat card style, one quiet panel behind them, fewer
   colours, nothing that follows the mouse, every rotary knob as a ring like the Starter's, and the glitch pads small with a BLONDA dot
   symbol instead of the big drawings and glows. The main view is not touched; the yellow dots look keeps its own black-on-yellow. ======= */
(()=>{const SC='body:not(.look-dots) .daw :is(.dw-slot,.dw-cl)';
  /* 1) the studio look's card rules, copied so they also apply to the studio's cards in the glass look */
  const skip=/\.transport|\.dock|#bg|#grain|\.daw|#panes|#fullHost|#deck|#dotsTint|^\s*body\.look-studio\s*$/;
  const split=sel=>{const o=[];let d=0,cur='';for(const ch of sel){if(ch==='('||ch==='[')d++;else if(ch===')'||ch===']')d--;if(ch===','&&d===0){o.push(cur);cur=''}else cur+=ch}o.push(cur);return o};
  function conv(sel){const parts=split(sel).map(x=>x.trim()).filter(x=>x.startsWith('body.look-studio')&&!skip.test(x));
    if(!parts.length)return null;return parts.map(x=>SC+x.slice('body.look-studio'.length)).join(',')}
  function collect(rules,out,wrap){for(const r of rules){if(r.type===1){if(!r.selectorText||r.selectorText.indexOf('body.look-studio')<0)continue;const s=conv(r.selectorText);if(s)out.push(wrap(s+'{'+r.style.cssText+'}'))}
      else if(r.type===4){const m=r.media.mediaText;collect(r.cssRules,out,t=>wrap('@media '+m+'{'+t+'}'))}}}
  function build(){const out=[];for(const ss of document.styleSheets){if(ss.ownerNode&&ss.ownerNode.id==='sstC')continue;let rs;try{rs=ss.cssRules}catch(e){continue}collect(rs,out,t=>t)}
    let el=document.getElementById('sstC');if(!el){el=document.createElement('style');el.id='sstC';document.head.appendChild(el)}
    el.textContent=out.join('\n');document.head.appendChild(document.getElementById('sstS'))}
  /* 2) the studio's own rules (after the copied ones, so they win) */
  const dot=g=>{let c='';for(let i=0;i<25;i++)if(g[i]==='x')c+=`<circle cx='${(i%5)*5+2.5}' cy='${Math.floor(i/5)*5+2.5}' r='1.9'/>`;
    return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 25 25'>${c}</svg>`)}")`};
  const G={1:'x.x.xx.x.xx.x.xx.x.xx.x.x',2:'xxxxxx...xx.x.xx...xxxxxx',3:'..x...x...xxxxx.x.....x..',4:'xx....x....xx.....x.....x',
    5:'..........xxxxxxxxxxxxxxx',6:'x.x.x.x.x.x.x.x.x.x.x.x.x',7:'xx.xxxx.xx.....xx.xxxx.xx',8:'x...x..x.....x..x...x.x..'};
  /* each glitch symbol moves while it is playing (held, or running from the sequence), and stands still otherwise: a few 5x5 frames per effect (stutter chops, roll goes round, rev sweeps backwards, stop runs
     down, half halves, crush flips its bits, gate opens and shuts, random scatters) */
  const g2s=a=>{let t='';for(let i=0;i<25;i++)t+=a.includes(i)?'x':'.';return t},S2=s=>[...s].map((c,i)=>c==='x'?i:-1).filter(i=>i>=0);
  const ring=[0,1,2,3,4,9,14,19,24,23,22,21,20,15,10,5];
  const shiftL=(g,k)=>{let t='';for(let y=0;y<5;y++)for(let x=0;x<5;x++)t+=g[y*5+((x+k)%5)];return t};
  const F={1:['x....x....x....x....x....','x.x..x.x..x.x..x.x..x.x..','x.x.xx.x.xx.x.xx.x.xx.x.x','x.x.xx.x.xx.x.xx.x.xx.x.x'],
    2:[0,2,4,6,8,10,12,14].map(k=>g2s(ring.filter((_,i)=>i!==k&&i!==(k+1)%16))),
    3:(()=>{const H=[2,6,10,16,22];return [[14],[13,14],[12,13,14],[11,12,13,14],[11,12,13,14],[11,12,13,14]].map(t=>g2s([...H,...t]))})(),
    4:(()=>{const A=[0,1,6,11,12,18,24];return [7,7,7,7,1,2,3,4,5,6].map(n=>g2s(A.slice(0,n)))})(),
    5:['..........xxxxxxxxxxxxxxx','..........xxxxxxxxxxxxxxx','...............xxxxxxxxxx','...............xxxxxxxxxx','....................xxxxx','...............xxxxxxxxxx'],
    6:['x.x.x.x.x.x.x.x.x.x.x.x.x','.x.x.x.x.x.x.x.x.x.x.x.x.'],
    7:(()=>{const TL=[0,1,5,6],TR=[3,4,8,9],BL=[15,16,20,21],BR=[18,19,23,24];return [[...TL,...TR,...BL,...BR],[...TL,...BR],[...TL,...TR,...BL,...BR],[...TR,...BL]].map(g2s)})(),
    8:['x...x..x.....x..x...x.x..','.x.....x.x.x......x...x.x','...x.x.....x..x.x.....x..','x.....x...x.x...x.x....x.']};
  const anim=SC=>Object.entries(F).map(([k,fr])=>{const n=fr.length,kf=fr.map((g,i)=>`${(i*100/n).toFixed(2)}%{-webkit-mask-image:${dot(g)};mask-image:${dot(g)}}`).join('');
    return `@keyframes gxa${k}{${kf}100%{-webkit-mask-image:${dot(fr[0])};mask-image:${dot(fr[0])}}}
${SC} .gx-t${k}:is(.on,.live)::before{animation:gxa${k} ${(n*0.09).toFixed(2)}s step-end infinite}`}).join('\n')+`
@media (prefers-reduced-motion:reduce){${SC} .gx-t::before{animation:none!important}}`;
  const MP='body.look-studio :is(#panes,#fullHost,.daw .dw-slot,.daw .dw-cl)';
  const inner=SC=>`/* small corners instead of round ones (round dots and knob rings stay round) */
${SC} .card :is(button,.ms,.cap0,.seg,.snd-tile,.lp,.w,.lpk,.m2-seg,.ptile,.gxs,.m2-exp,.pact,.eng):not(.face):not(.gx-key){border-radius:var(--dk-r2)!important}
/* nothing follows the mouse */
${SC} .syn-in{transform:none!important;transition:none!important}
${SC} .card{--mx:50%!important;--my:50%!important}
/* every rotary knob as a ring, like the Starter's (the master's bus and pump knobs keep their own size and layout, only the ring changes) */
${SC} .knob .face{border-radius:50%!important;background:conic-gradient(from -135deg,rgba(var(--dk-ink),.88) 0 calc(var(--v,0)*270deg),rgba(var(--dk-ink),.13) 0 270deg,transparent 0)!important;
  -webkit-mask:radial-gradient(closest-side,transparent calc(100% - 5px),#000 calc(100% - 4.4px));mask:radial-gradient(closest-side,transparent calc(100% - 5px),#000 calc(100% - 4.4px));box-shadow:none!important;outline:none!important;border:0!important}
${SC} .knob:active .face,${SC} .knob.drag .face{background:conic-gradient(from -135deg,var(--dk-acc) 0 calc(var(--v,0)*270deg),rgba(var(--dk-ink),.13) 0 270deg,transparent 0)!important}
${SC} .knob .mark{display:none!important}
${SC} .card.master.mx2 .m2-lk .knob{--fw:34px}
${SC} .card.master.mx2 .m2-lk .knob .kv{font-size:11px}
${SC} .knob .bubble{display:none!important}
${SC} .knob:not(:is(.m2-lk,.m2-pk3) .knob){position:relative;gap:4px;align-items:center!important}
${SC} .knob:not(:is(.m2-lk,.m2-pk3) .knob) .face{width:34px!important;height:34px!important;flex:none}
${SC} .knob:not(:is(.m2-lk,.m2-pk3) .knob) .kv{position:absolute;left:0;right:0;top:8px;transform:none!important;height:18px;line-height:18px;margin:0!important;text-align:center;font:400 10px var(--f-linje)!important;letter-spacing:-.03em!important;white-space:nowrap;color:rgb(var(--dk-ink))!important;pointer-events:none}
${SC} .knob:not(:is(.m2-lk,.m2-pk3) .knob) .kl{font:normal 9px var(--f-mono)!important;letter-spacing:.04em!important;text-transform:none!important;color:rgba(var(--dk-ink),.5)!important}
/* the FX card's knobs (small ones in the list and the big one) as rings too */
${SC} .dl-mini{width:26px!important;height:26px!important;border-radius:50%!important;box-shadow:none!important;border:0!important;background:conic-gradient(from -135deg,rgba(var(--dk-ink),.88) 0 calc(var(--a,-135deg) + 135deg),rgba(var(--dk-ink),.13) 0 270deg,transparent 0)!important;
  -webkit-mask:radial-gradient(closest-side,transparent calc(100% - 4px),#000 calc(100% - 3.4px));mask:radial-gradient(closest-side,transparent calc(100% - 4px),#000 calc(100% - 3.4px))}
${SC} .dl-mini i{display:none!important}
${SC} .dl-it.on .dl-mini{background:conic-gradient(from -135deg,var(--dk-acc) 0 calc(var(--a,-135deg) + 135deg),rgba(var(--dk-ink),.13) 0 270deg,transparent 0)!important}
${SC} .dl-disc canvas{display:none!important}
${SC} .dl-disc .dl-knob{border-radius:50%!important;box-shadow:none!important;border:0!important;background:conic-gradient(from -135deg,rgba(var(--dk-ink),.9) 0 calc(var(--a,-135deg) + 135deg),rgba(var(--dk-ink),.13) 0 270deg,transparent 0)!important;
  -webkit-mask:radial-gradient(closest-side,transparent calc(100% - 7px),#000 calc(100% - 6.4px));mask:radial-gradient(closest-side,transparent calc(100% - 7px),#000 calc(100% - 6.4px));transform:none!important}
${SC} .dl-disc .dl-knob i{display:none!important}
/* mixer: a console — flat strips with hairline separators, a thin colour tick on top, slim faders with flat caps, monochrome meters
   that turn yellow when hot, square M / S */
${SC} .mixer .mx{gap:0!important}
${SC} .mixer .ms{border-radius:0!important;background:transparent!important;box-shadow:inset -1px 0 0 var(--dk-line)!important;padding:9px 4px 8px!important;gap:7px!important}
${SC} .mixer .ms::before{content:"";position:absolute;left:4px;right:5px;top:0;height:2px;background:var(--tc);opacity:.75}
${SC} .mixer .ms.sel{background:rgba(var(--dk-ink),.06)!important}
${SC} .mixer .ms:is(.bus,.master){background:rgba(var(--dk-ink),.025)!important}
${SC} .mixer .ms.master::before{background:var(--dk-acc);opacity:1}
${SC} .mixer .ms .nm{gap:3px}
${SC} .mixer .ms .nm i{width:auto!important;height:auto!important;border-radius:0!important;background:none!important;box-shadow:none!important;color:rgba(var(--dk-ink),.42)!important;font:500 8.5px var(--f-mono)!important}
${SC} .mixer .ms .nm i.hit{color:var(--dk-acc)!important}
${SC} .mixer .ms .nm span{font-size:9.5px;color:rgb(var(--dk-ink))}
${SC} .mixer .ms .pn::before{border-radius:0;background:rgba(var(--dk-ink),.16)}
${SC} .mixer .ms .pn b{width:2px!important;height:10px!important;margin-left:-1px!important;border-radius:0!important;background:rgb(var(--dk-ink))!important;box-shadow:none!important}
${SC} .mixer .ms .tr{width:2px!important;border-radius:0!important;background:rgba(var(--dk-ink),.13)!important;box-shadow:none!important}
${SC} .mixer .ms .tr .fl{border-radius:0!important;background:rgba(var(--dk-ink),.5)!important}
${SC} .mixer .ms .tr .cap0{width:22px!important;height:10px!important;margin:0 0 -5px -11px!important;border-radius:0!important;background:var(--dk-solid)!important;box-shadow:inset 0 0 0 1px rgba(var(--dk-ink),.65)!important}
${SC} .mixer .ms .tr .cap0::after{left:4px!important;right:4px!important;top:4.5px!important;background:rgb(var(--dk-ink))!important}
${SC} .mixer .ms .mt i{--mc:rgba(var(--dk-ink),.8)}
${SC} .mixer .ms .mt i.hot{--mc:var(--dk-acc)}
${SC} .mixer .ms .db{font:400 10px var(--f-mono)!important;color:rgba(var(--dk-ink),.82);background:rgba(var(--dk-ink),.05);padding:2px 0;margin:0 2px}
${SC} .mixer .ms .bt button{width:18px!important;height:16px!important;border-radius:0!important;background:transparent!important;box-shadow:inset 0 0 0 1px var(--dk-line)!important;color:rgba(var(--dk-ink),.6)!important;font-size:8px!important}
${SC} .mixer .ms .bt .m.on{background:rgba(var(--dk-ink),.85)!important;color:#111211!important;box-shadow:none!important}
${SC} .mixer .ms .bt .s.on{background:var(--dk-acc)!important;color:#111211!important;box-shadow:none!important}
${SC} .mixer .ms.bus .bp{border-radius:0!important;height:3px!important}
${SC} .mixer .ms-sep{color:rgba(var(--dk-ink),.35)}
/* the desk: dB ticks beside every fader (0, -5, -12, -24, -∞ like the scale by the first one), names that fit, groups set apart */
${SC} .mixer .ms:not(.master):not(:has(.scale)) .fd{background:${[0,1,2,3,4].map(k=>`linear-gradient(rgba(var(--dk-ink),.22),rgba(var(--dk-ink),.22)) calc(50% - 9px) calc(7px + (100% - 14px) * ${k/4}) / 5px 1px no-repeat`).join(',')}}
${SC} .mixer .ms .nm span{font-size:9px;letter-spacing:-.01em}
${SC} .mixer .ms.bus .pn.bp{margin-block:6.5px!important}
${SC} .mixer .ms-sep{box-shadow:inset 1px 0 0 var(--dk-line)}
${SC} .mixer .ms.master{background:var(--dk-solid)!important;box-shadow:inset 1px 0 0 var(--dk-line)!important}
${SC} .mixer .mx-wrap.ovf .ms.master{box-shadow:inset 1px 0 0 var(--dk-line),-6px 0 0 var(--dk-solid),-16px 0 14px -6px rgba(0,0,0,.5)!important}
${SC} .mixer .ms-sep span{font:400 8px var(--f-mono)!important;letter-spacing:.14em;text-transform:uppercase}
/* effects (echo, space, tape, crush): small tiles, yellow when on */
${SC} .m2-fx .ptiles{gap:4px!important}
${SC} .ptile{min-height:0!important;padding:8px 10px 9px!important;background:rgba(var(--dk-ink),.035)!important;box-shadow:inset 0 0 0 1px var(--dk-line)!important;color:rgb(var(--dk-ink))}
${SC} .ptile.sel{background:rgba(var(--dk-ink),.09)!important;box-shadow:inset 0 0 0 1px rgba(var(--dk-ink),.45)!important}
${SC} .ptile .ptl-h svg{width:12px!important;height:12px!important}
${SC} .ptile .nm{font:400 10px/1.25 var(--f-mono)!important;letter-spacing:.02em}
${SC} .ptile .pedit{width:20px!important;height:20px!important;box-shadow:inset 0 0 0 1px var(--dk-line)!important;background:transparent!important}
${SC} .ptile .pedit svg{width:9px!important;height:9px!important}
${SC} .ptile .pfoot{margin-top:6px!important;align-items:flex-end}
${SC} .ptile .pcap{font-size:8.5px!important}
${SC} .ptile .pnum{font-size:20px!important;font-weight:300!important}
${SC} .ptile .pact{height:18px!important;padding:0 7px!important;font:500 8.5px var(--f-mono)!important;letter-spacing:.06em;background:transparent!important;box-shadow:inset 0 0 0 1px var(--dk-line)!important;color:rgba(var(--dk-ink),.55)!important}
${SC} .ptile .pact *{color:inherit!important}
${SC} .ptile .pact svg{display:none!important}
${SC} .ptile:not(.off) .pact{background:var(--dk-acc)!important;color:#111211!important;box-shadow:none!important}
/* glitch: small pads, a BLONDA dot symbol each, no drawings or glows */
${SC} .gx-pads{gap:4px!important}
${SC} .gx-t{aspect-ratio:auto!important;min-height:0!important;height:62px!important;padding:8px 9px!important;border-radius:var(--dk-r2)!important;background:rgba(var(--dk-ink),.04)!important;box-shadow:inset 0 0 0 1px var(--dk-line)!important;overflow:hidden}
${SC} .gx-t.on,${SC} .gx-t.live{background:rgba(var(--dk-ink),.12)!important;box-shadow:inset 0 0 0 1px rgba(var(--dk-ink),.5)!important}
${SC} .gx-t>svg,${SC} .gx-t .gx-glow{display:none!important}
${SC} .gx-t::before{content:"";position:absolute;right:9px;bottom:9px;width:20px;height:20px;background:currentColor;opacity:.75;-webkit-mask-size:100% 100%;mask-size:100% 100%;display:block!important}
${SC} .gx-t.on::before,${SC} .gx-t.live::before{background:var(--dk-acc);opacity:1}
${SC} .gx-t .gx-big{font-size:17px!important;line-height:1!important}
${SC} .gx-t .gx-big small{font-size:9px!important}
${SC} .gx-t .gx-nm{font-size:9px!important;letter-spacing:.04em}
${SC} .gx-t .gx-no{transform:scale(.85);transform-origin:left center}
/* "may random use this pad": a small on/off switch marked rnd (it looked like a dice) */
${SC} .gx-pads .gx-key{top:8px!important;right:8px!important;width:auto!important;height:12px!important;opacity:1!important;display:flex!important;align-items:center;gap:4px;background:none!important;box-shadow:none!important;font:400 8px/1 var(--f-mono)!important;font-style:normal!important;letter-spacing:.06em;color:rgba(var(--dk-ink),.35)!important;cursor:pointer}
${SC} .gx-pads .gx-key svg{display:none!important}
${SC} .gx-pads .gx-key::before{content:"rnd"}
${SC} .gx-pads .gx-key::after{content:"";flex:none;width:18px;height:10px;box-sizing:border-box;border-radius:var(--dk-r2);box-shadow:inset 0 0 0 1px rgba(var(--dk-ink),.3);background:radial-gradient(circle 2.5px at 5px 50%,rgba(var(--dk-ink),.4) 95%,transparent 100%)}
${SC} .gx-pads .gx-key.on{color:rgba(var(--dk-ink),.8)!important}
${SC} .gx-pads .gx-key.on::after{box-shadow:none;background:radial-gradient(circle 2.5px at 13px 50%,var(--dk-p0,#111) 95%,transparent 100%),rgb(var(--dk-ink))}
${SC} .gx-pads .gx-key:hover{color:rgba(var(--dk-ink),.9)!important}
${SC} .gx-pads>.gx-t{height:62px!important;max-height:62px;box-sizing:border-box!important}
${SC} .gxr button{border-radius:var(--dk-r2)!important;font-size:10px!important;padding:3px 8px!important;height:auto!important}
${Object.entries(G).map(([k,g])=>`${SC} .gx-t${k}::before{-webkit-mask-image:${dot(g)};mask-image:${dot(g)}}`).join('\n')}
${anim(SC)}`;
  const st=document.createElement('style');st.id='sstS';st.textContent=`
/* one quiet panel behind the cards, like the tracker's (a wrapper around the card slot carries the glass, so the slot itself can be
   toned down without greying the glass) */
.daw .dw-slotw{flex:1;min-height:0;display:flex;flex-direction:column}
.daw .dw-slotw>.dw-slot{flex:1;min-height:0;overflow:auto;scrollbar-width:none}
body:not(.look-dots) .daw .dw-slotw{background:var(--dk-p1);box-shadow:inset 0 0 0 1px var(--dk-line);border-radius:var(--dk-r);overflow:hidden}
body:not(.look-studio):not(.look-dots) .daw .dw-slotw{-webkit-backdrop-filter:blur(30px) saturate(1.5);backdrop-filter:blur(30px) saturate(1.5)}
body:not(.look-dots) .daw .dw-slot>.card{background:transparent!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;box-shadow:none!important;border-radius:0!important;animation:none!important}
body:not(.look-dots) .daw .dw-slot>.card::before,body:not(.look-dots) .daw .dw-slot>.card::after{display:none!important}
/* fewer colours; the Starter keeps its own soft colours */
body:not(.look-dots) .daw .dw-slot{filter:saturate(.4)}
/* v205: only the Starter's drawing and its layer colours get their colour back – the card itself stays the same grey as the rest */
body:not(.look-dots) .daw .dw-slot>.card.stx :is(canvas,i){filter:saturate(2.5)}
${inner(SC)}
${inner(MP)}
/* the same in the studio look of the main page */
body.look-studio :is(#panes,#fullHost,.daw .dw-slot,.daw .dw-cl){--dk-solid:#1C1E20;--dk-ink:237,234,224;--dk-acc:#E9C54A;--dk-acc-rgb:233,197,74;--dk-line:#373738;--dk-r:0px;--dk-r2:0px}
body.look-studio #panes .pane,body.look-studio #fullHost>.card:not(.stx){filter:saturate(.4)}
body.look-studio #panes .pane>.card.stx :is(canvas,i){filter:saturate(2.5)}
`;document.head.appendChild(st);
  {const sl=document.querySelector('#daw .dw-slot');if(sl&&!sl.parentElement.classList.contains('dw-slotw')){const w=document.createElement('div');w.className='dw-slotw';sl.parentElement.insertBefore(w,sl);w.appendChild(sl)}}
  /* the copy is made once the other modules have added their styles, and again if a new style sheet appears later */
  setTimeout(build,0);setTimeout(build,1500);let n=document.styleSheets.length;setInterval(()=>{if(document.styleSheets.length!==n){n=document.styleSheets.length;build()}},2000);
  window.__sst={build}})();

