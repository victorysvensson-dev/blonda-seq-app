/* ---------- touch: scroll rails + touch-intent gate ---------- */
(function touchUX(){const CO=matchMedia('(pointer:coarse)'),FOLD=matchMedia('(max-width:719px)');
  const setC=()=>document.documentElement.classList.toggle('coarse',CO.matches);setC();CO.addEventListener&&CO.addEventListener('change',setC);
  const _spc=Element.prototype.setPointerCapture;Element.prototype.setPointerCapture=function(id){try{return _spc.call(this,id)}catch(e){globalThis.__el&&globalThis.__el(e)}};
  /* rails: a dotted strip in each side margin; drag it like a scrollbar */
  const panes=$('#panes'),pl=document.querySelector('.pane.left'),pr=document.querySelector('.pane.right'),fh=$('#fullHost');
  const tgt=side=>{const fc=fh&&!fh.hidden&&fh.querySelector('.card');if(fc)return fc;if(FOLD.matches)return side==='m'?null:panes;const c3=panes&&panes.classList.contains('c3');if(side==='m')return c3?pr:null;if(side==='r'&&c3){const x=document.querySelector('.pane.extra');if(x)return x}return side==='l'?pl:pr};
  const rails=['l','r','m'].map(side=>{const r=document.createElement('div');r.className='srail '+side;r.innerHTML='<i class="tr"></i><i class="th"></i>';r.setAttribute('aria-hidden','true');document.body.appendChild(r);
    const o={side,r,th:r.querySelector('.th'),el:null,drag:null,live:0};
    r.addEventListener('pointerdown',e=>{const el=tgt(side);if(!el)return;e.preventDefault();e.stopPropagation();r.setPointerCapture(e.pointerId);o.el=el;
      const tb=o.th.getBoundingClientRect(),inThumb=e.clientY>=tb.top-10&&e.clientY<=tb.bottom+10;o.drag={grab:inThumb?e.clientY-tb.top:tb.height/2};r.classList.add('on');move(e)});
    const move=e=>{if(!o.drag)return;const el=o.el,rb=r.getBoundingClientRect(),th=o.th.offsetHeight,span=Math.max(1,rb.height-th),f=clamp((e.clientY-rb.top-o.drag.grab)/span,0,1);
      el.scrollTop=f*(el.scrollHeight-el.clientHeight);place(o)};
    r.addEventListener('pointermove',move);const up=()=>{o.drag=null;r.classList.remove('on')};r.addEventListener('pointerup',up);r.addEventListener('pointercancel',up);return o});
  function place(o){const el=tgt(o.side);o.el=el;if(!el){o.r.classList.remove('can');return}const b=el.getBoundingClientRect(),sh=el.scrollHeight,ch=el.clientHeight;let can=sh>ch+4&&b.height>120;
    if(o.side==='m'){const h2=document.querySelector('#panes>.hinge.h2'),hb=h2&&h2.getBoundingClientRect();if(!hb||!hb.width)can=false;else o.r.style.left=Math.round(hb.left+hb.width/2-11)+'px'}o.r.classList.toggle('can',can);if(!can)return;const top=Math.max(b.top,0)+8,bot=Math.min(b.bottom,innerHeight)-8,h=bot-top;o.r.style.top=top+'px';o.r.style.height=h+'px';
    const thH=Math.max(28,Math.round(h*ch/sh/7)*7),y=(h-thH)*(el.scrollTop/Math.max(1,sh-ch));o.th.style.height=thH+'px';o.th.style.transform=`translateY(${Math.round(y)}px)`}
  let liveT=0;const all=()=>rails.forEach(place);
  const onScroll=e=>{all();rails.forEach(o=>{if(o.el===e.target)o.r.classList.add('live')});clearTimeout(liveT);liveT=setTimeout(()=>rails.forEach(o=>o.r.classList.remove('live')),900)};
  [panes,pl,pr].forEach(el=>el&&el.addEventListener('scroll',onScroll,{passive:true}));setTimeout(()=>{const x=document.querySelector('.pane.extra');x&&x.addEventListener('scroll',onScroll,{passive:true})},400);fh&&fh.addEventListener('scroll',onScroll,{passive:true,capture:true});
  addEventListener('resize',all);setInterval(()=>{if(CO.matches)all()},300);all();
  /* intent gate: on touch, a swipe that starts on a control scrolls the page; a short hold (or a sideways drag on sideways controls) grabs the control */
  const GV='.knob,.bkn,.cl-k,.cl-st,.edial,.snd-tile:not(.wide),.dl-disc,.dl-it,.syn-big,.syn-sm,.pnum,.ms .fd,.orb-ctl b,.xy,.syn-cv',GH='.cells,.bigsteps,.snd-hero,.snd-tile.wide,.dl-ruler,.sins-vel,.lp .vol,.ms .pn,.orb',GA=GV+','+GH,HOLD=160,SLOP=7;
  /* one gate per finger, so two hands can work at once (keyboard + knob, two knobs …) */
  const GS=new Map();
  const performing=()=>{if(window.__kb&&__kb.touching&&__kb.touching())return true;for(const g of GS.values())if(g.st===1)return true;return false};
  const rep=ev=>{const e=new PointerEvent('pointerdown',{bubbles:true,cancelable:true,composed:true,pointerId:ev.pointerId,pointerType:'touch',isPrimary:ev.isPrimary,clientX:ev.clientX,clientY:ev.clientY,screenX:ev.screenX,screenY:ev.screenY,button:0,buttons:1,pressure:.5,width:ev.width,height:ev.height});e.__tg=1;ev.target.dispatchEvent(e)};
  const arm=(g,held)=>{g.st=1;clearTimeout(g.tm);if(held&&!RM){g.el.classList.remove('tg-arm');void g.el.offsetWidth;g.el.classList.add('tg-arm')}rep(g.ev)};
  addEventListener('pointerdown',e=>{if(e.__tg||e.pointerType!=='touch'||!CO.matches)return;const el=e.target.closest&&e.target.closest(GA);if(!el||el.closest('.roll'))return;
    /* while another finger is already playing or turning something, grab instantly — nobody scrolls mid-performance */
    if(performing()){GS.set(e.pointerId,{id:e.pointerId,ev:e,el,st:1});return}
    e.stopImmediatePropagation();const cur=getComputedStyle(el).cursor,g={id:e.pointerId,ev:e,el,v:cur==='ew-resize'?false:cur==='ns-resize'?true:el.matches(GV),x:e.clientX,y:e.clientY,st:0};
    g.tm=setTimeout(()=>{if(GS.get(g.id)===g&&g.st===0)arm(g,true)},HOLD);GS.set(g.id,g)},true);
  addEventListener('pointermove',e=>{const g=GS.get(e.pointerId);if(!g||e.__tg)return;if(g.st===1)return;if(g.st===2){e.stopImmediatePropagation();return}
    const dx=e.clientX-g.x,dy=e.clientY-g.y,ax=Math.abs(dx),ay=Math.abs(dy);
    if(!g.v&&ax>SLOP&&ax>ay*1.2){arm(g,false);return}
    if(ay>SLOP||ax>SLOP*2){clearTimeout(g.tm);g.st=2}e.stopImmediatePropagation()},true);
  addEventListener('pointerup',e=>{const g=GS.get(e.pointerId);if(!g)return;clearTimeout(g.tm);GS.delete(e.pointerId);if(g.st===0){rep(g.ev);return}if(g.st===2)e.stopImmediatePropagation()},true);
  addEventListener('pointercancel',e=>{const g=GS.get(e.pointerId);if(!g)return;clearTimeout(g.tm);GS.delete(e.pointerId);if(g.st!==1)e.stopImmediatePropagation()},true);
  document.addEventListener('touchmove',e=>{if(e.cancelable&&performing())e.preventDefault()},{passive:false});
})();
