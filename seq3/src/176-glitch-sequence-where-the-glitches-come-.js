/* ================= glitch sequence: where the glitches come — one row per effect, 16 steps for the pattern on screen =================
   Blocks are the written fills (S.gfx[pattern] = [{s, fx, len, sl}]) that gxFill plays. Drag in a row = a block, tap a block = gone.
   One glitch plays at a time, so a new block clears what it overlaps in the other rows. With ● on, holding a pad while the loop
   plays writes a block. The random ones ("slump") and the held ones light up where they happen. */
const GXS_SL=[.5,1,1,1,1,1,.5],GXS_COL=['#E2F53C','#FF9A52','#7FD3E8','#B9A6FF','#6BE28C','#F07AB0','#F2C318'];
(()=>{const card=document.querySelector('.card[data-card="glitch"]');if(!card)return;const box=document.createElement('div');box.className='gxs';
  box.innerHTML=`<div class="gxs-h"><b>sekvens</b><span class="gxs-p"></span><small>dra i en rad = block · tryck på ett block = bort · ● + håll en pad = spela in</small><button class="gxs-clr">töm</button></div>
    <div class="gxs-g">${GX_NAMES.map((n,k)=>`<div class="gxs-r" data-fx="${k+1}" style="--c:${GXS_COL[k]}"><span><em class="gx-no">${k+1}</em>${n}</span><div class="gxs-l">${Array.from({length:16},(_,i)=>`<i style="grid-column:${i+1}"${i%4===0?' class="q"':''}></i>`).join('')}</div></div>`).join('')}<div class="gxs-ph"></div></div>`;
  card.appendChild(box);
  /* the card shows glitch pattern A–D: its own pick (GXC.p), otherwise the pattern that plays */
  if(!window.GXC)window.GXC={p:null};const GP=()=>{const v=window.GXC.p;return v!=null&&v>=0&&v<4?v:S.pat};
  const L=()=>{if(!S.gfx||typeof S.gfx!=='object')S.gfx={};const q=GP();if(!Array.isArray(S.gfx[q]))S.gfx[q]=[];return S.gfx[q]};
  const put=(fx,s,len)=>{const A=L(),e=s+len;for(let i=A.length-1;i>=0;i--){const b=A[i];if(b.s<e&&b.s+b.len>s)A.splice(i,1)}A.push({s,fx,len,sl:GXS_SL[fx-1]});A.sort((a,b)=>a.s-b.s)};
  function paint(){const A=L();{const q=GP(),pe=box.querySelector('.gxs-p');pe.innerHTML=[0,1,2,3].map(k=>`<button data-gp="${k}" class="${k===q?'on':''}${S.gfx&&Array.isArray(S.gfx[k])&&S.gfx[k].length?' has':''}">${'ABCD'[k]}</button>`).join('')}
    box.querySelectorAll('.gxs-r').forEach(r=>{const fx=+r.dataset.fx,l=r.querySelector('.gxs-l');l.querySelectorAll('.gxs-b').forEach(b=>b.remove());
      A.filter(b=>b.fx===fx).forEach(b=>{const d=document.createElement('b');d.className='gxs-b';d.style.gridColumn=(b.s+1)+' / span '+Math.min(b.len,16-b.s);d.dataset.s=b.s;l.appendChild(d)})})}
  /* drag to draw, tap a block to remove */
  box.querySelectorAll('.gxs-l').forEach(l=>{const fx=+l.parentNode.dataset.fx;let st=null;
    const at=e=>{const r=l.getBoundingClientRect();return Math.max(0,Math.min(15,Math.floor((e.clientX-r.left)/r.width*16)))};
    l.addEventListener('pointerdown',e=>{e.preventDefault();const s=at(e),hit=L().find(b=>b.fx===fx&&s>=b.s&&s<b.s+b.len);try{l.setPointerCapture(e.pointerId)}catch(_){globalThis.__el&&globalThis.__el(_)}
      if(hit){st={rm:hit};return}pushHist();st={s0:s};put(fx,s,1);paint();save()});
    l.addEventListener('pointermove',e=>{if(!st||st.rm)return;const s=at(e),a=Math.min(st.s0,s),b=Math.max(st.s0,s);const A=L();const i=A.findIndex(x=>x.fx===fx&&x.s<=st.s0&&x.s+x.len>st.s0);if(i>=0)A.splice(i,1);put(fx,a,b-a+1);st.s0=a===st.s0?st.s0:st.s0;paint()});
    const up=()=>{if(st&&st.rm){pushHist();const A=L(),i=A.indexOf(st.rm);if(i>=0)A.splice(i,1);paint();save();toast(GX_NAMES[fx-1]+' borttagen')}else if(st)save();st=null};
    l.addEventListener('pointerup',up);l.addEventListener('pointercancel',up)});
  box.querySelector('.gxs-clr').onclick=()=>{pushHist();S.gfx[GP()]=[];paint();save();toast('Glitch '+'ABCD'[GP()]+' är tom')};
  box.querySelector('.gxs-p').addEventListener('click',e=>{const b=e.target.closest('[data-gp]');if(!b)return;e.stopPropagation();window.GXC.p=+b.dataset.gp;paint();try{if(window.__trk)__trk.render()}catch(_){globalThis.__el&&globalThis.__el(_)}});
  /* ● + hold a pad: record a block */
  const recd={};{const _gp=gxPress;gxPress=function(fx,on){_gp.apply(this,arguments);if(!(recording&&playing))return;const pp=playPos();if(pp==null)return;
    if(on)recd[fx]=pp;else if(recd[fx]!=null){const s=Math.floor(recd[fx])%16;let e=Math.ceil(pp)%16;let len=((e-s)%16+16)%16||1;delete recd[fx];pushHist();put(fx,s,Math.min(len,16-s));paint();save()}}}
  /* live: playhead, the block that plays, the random/held ones */
  const ph=box.querySelector('.gxs-ph');let lastK='';
  (function loop(){requestAnimationFrame(loop);if(!box.offsetParent)return;const pp=playing?playPos():null,act=typeof gxActive==='function'?gxActive():[];
    if(box._lp!==S.pat){box._lp=S.pat;if(!(typeof ARR!=='undefined'&&ARR.open))window.GXC.p=null}
    {const dk=GP()+'|'+JSON.stringify(L())+'|'+[0,1,2,3].map(k=>S.gfx&&S.gfx[k]&&S.gfx[k].length?1:0).join('');if(box._dk!==dk){box._dk=dk;paint();lastK=''}}
    const k=(pp==null?-1:Math.floor(pp))+'|'+act.join(',')+'|'+box._dk;if(k===lastK)return;lastK=k;
    if(pp==null)ph.style.opacity=0;else{ph.style.opacity=1;ph.style.setProperty('--x',(Math.floor(pp)%16))}
    box.querySelectorAll('.gxs-r').forEach(r=>{const fx=+r.dataset.fx;r.classList.toggle('live',act.includes(fx));
      r.querySelectorAll('.gxs-b').forEach(b=>{const s=+b.dataset.s,bl=L().find(x=>x.fx===fx&&x.s===s);b.classList.toggle('on',!!(bl&&pp!=null&&pp>=bl.s&&pp<bl.s+bl.len))})});
  })();
  {const _ra=renderAll;renderAll=function(){_ra.apply(this,arguments);try{paint()}catch(e){globalThis.__el&&globalThis.__el(e)}}}
  paint()})();

