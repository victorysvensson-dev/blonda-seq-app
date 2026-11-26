/* ================= drag the seams between the columns (per number of columns, saved on this device); double-click = even again ================= */
(()=>{const panes=document.getElementById('panes');if(!panes)return;const KEY=n=>'blonda.colw.'+n;
  const vis=()=>[...panes.querySelectorAll(':scope>.pane')].filter(p=>getComputedStyle(p).display!=='none');
  const get=n=>{try{const v=JSON.parse(localStorage.getItem(KEY(n))||'null');return Array.isArray(v)&&v.length===n?v:null}catch(e){return null}};
  const apply=()=>{const ps=vis(),n=ps.length;if(!panes.classList.contains('c3')){if(panes._c3){panes._c3=0;panes.querySelectorAll(':scope>.pane').forEach(p=>p.style.flex='');try{splitApply()}catch(e){globalThis.__el&&globalThis.__el(e)}}return}panes._c3=1;const w=get(n);panes.querySelectorAll(':scope>.pane').forEach(p=>p.style.flex='');if(!w||innerWidth<720)return;ps.forEach((p,i)=>p.style.flex=w[i]+' 1 0%')};
  window.colsWidths=apply;
  panes.addEventListener('pointerdown',e=>{const h=e.target.closest('.panes>.hinge');if(!h||innerWidth<720||!panes.classList.contains('c3'))return;e.preventDefault();const ps=vis(),n=ps.length;
    const a=h.previousElementSibling,b=h.nextElementSibling;if(!a||!b||!a.classList.contains('pane')||!b.classList.contains('pane'))return;
    const ws=ps.map(p=>p.getBoundingClientRect().width),tot=ws.reduce((x,y)=>x+y,0),ia=ps.indexOf(a),ib=ps.indexOf(b),x0=e.clientX,wa=ws[ia],wb=ws[ib],min=Math.max(260,tot*.14);
    /* (v263) on a touch screen the right seam carries the middle column's dotted scroll rail: drag up/down = scroll the middle
       column, sideways = make the columns wider or narrower (decided by the first few pixels) */
    const rail=h.classList.contains('h2')&&e.pointerType!=='mouse'?document.querySelector('.srail.m.can'):null,y0=e.clientY,st0=a.scrollTop;let mode=rail?0:1;h._g=null;
    h.classList.add('drag');try{h.setPointerCapture(e.pointerId)}catch(_){globalThis.__el&&globalThis.__el(_)}
    const mv=ev=>{if(mode===0){const ax=Math.abs(ev.clientX-x0),ay=Math.abs(ev.clientY-y0);if(ax<7&&ay<7)return;mode=ay>ax?2:1;if(mode===2){rail.classList.add('on');h.classList.remove('drag')}}
      if(mode===2){const H=Math.max(60,rail.getBoundingClientRect().height);a.scrollTop=st0+(ev.clientY-y0)*a.scrollHeight/H;return}
      const dx=ev.clientX-x0;let na=wa+dx,nb=wb-dx;if(na<min){nb-=min-na;na=min}if(nb<min){na-=min-nb;nb=min}const nw=ws.slice();nw[ia]=na;nw[ib]=nb;const g=nw.map(v=>+(v/tot*n).toFixed(4));
      ps.forEach((p,i)=>p.style.flex=g[i]+' 1 0%');h._g=g;dispatchEvent(new Event('resize'))};
    const up=()=>{h.classList.remove('drag');if(rail)rail.classList.remove('on');h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up);h.removeEventListener('pointercancel',up);if(h._g){try{localStorage.setItem(KEY(n),JSON.stringify(h._g))}catch(_){globalThis.__el&&globalThis.__el(_)}}try{renderAll()}catch(_){globalThis.__el&&globalThis.__el(_)}};
    h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up)});
  panes.addEventListener('dblclick',e=>{const h=e.target.closest('.panes>.hinge');if(!h||!panes.classList.contains('c3'))return;const n=vis().length;try{localStorage.removeItem(KEY(n))}catch(_){globalThis.__el&&globalThis.__el(_)}apply();dispatchEvent(new Event('resize'));toast('Kolumnerna lika breda igen')});
  setTimeout(apply,80);{let t=0;addEventListener('resize',()=>{clearTimeout(t);t=setTimeout(apply,200)})}})();
{const _ca=colsApply;colsApply=function(){_ca.apply(this,arguments);try{colsWidths()}catch(e){globalThis.__el&&globalThis.__el(e)}}}

