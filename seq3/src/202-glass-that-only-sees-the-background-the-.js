/* ================= Glass that only sees the background. The glass cards blur what lies behind them. In Chrome on the Mac that
   blur could also pick up the yellow transport bar below the cards: on every other frame the bottom of every glass card lit up
   yellow (seen frame by frame in a screen recording, 60 times a second when stopped). The card area (#panes) is now its own
   group with its own copy of the background inside it, so the glass can only ever see the background and the cards, never the
   yellow bar. The picture is the same; only where the glass gets its picture from has changed. ================= */
(()=>{const panes=document.getElementById('panes'),bg=document.getElementById('bg');if(!panes||!bg)return;
  const st=document.createElement('style');
  st.textContent=`#panes.gbg{position:relative;z-index:4;opacity:.999}
#gbgC{position:absolute;z-index:0;pointer-events:none;display:none}
#panes.gbg>#gbgC{display:block}
#panes.gbg>.pane{position:relative;z-index:1}`;
  document.head.appendChild(st);
  const cv=document.createElement('canvas');cv.id='gbgC';cv.setAttribute('aria-hidden','true');panes.insertBefore(cv,panes.firstChild);const cx=cv.getContext('2d');
  /* only where the card area itself does not scroll (computer screens); on a phone the cards scroll as one page */
  const on=()=>{const s=getComputedStyle(panes);return s.overflowY!=='auto'&&s.overflowY!=='scroll'&&getComputedStyle(bg).display!=='none'};
  let act=false;
  let R={x:0,y:0,w:1,h:1};
  /* the copy covers exactly the card area and shows the part of the background that lies behind it */
  function place(){const a=on();if(a!==act){act=a;panes.classList.toggle('gbg',a)}if(!a)return;
    const r=panes.getBoundingClientRect(),pad=0,x=Math.max(0,r.left-pad),y=Math.max(0,r.top-pad),x2=Math.min(innerWidth,r.right+pad),y2=Math.min(innerHeight,r.bottom+pad);
    R={x,y,w:Math.max(1,x2-x),h:Math.max(1,y2-y)};
    Object.assign(cv.style,{left:(x-r.left)+'px',top:(y-r.top)+'px',width:R.w+'px',height:R.h+'px'})}
  function copy(){if(!act)return;const sx=bg.width/innerWidth,sy=bg.height/innerHeight,w=Math.max(1,Math.round(R.w*sx)),h=Math.max(1,Math.round(R.h*sy));
    if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}cx.drawImage(bg,R.x*sx,R.y*sy,R.w*sx,R.h*sy,0,0,w,h)}
  const _d=drawBg;drawBg=function(now){_d(now);try{copy()}catch(e){globalThis.__el&&globalThis.__el(e)}};
  addEventListener('resize',()=>{place();copy()});new MutationObserver(()=>{place();copy()}).observe(document.body,{attributes:true,attributeFilter:['class']});
  setInterval(place,1000);place();copy();
  window.__gbg={place,copy,act:()=>act}})();

