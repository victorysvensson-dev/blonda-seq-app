/* ---------------- draggable glass cards ---------------- */
const panes=$('#panes');
const cards=()=>[...document.querySelectorAll('.card[data-card]')];
function rects(){const m=new Map();cards().forEach(c=>{if(c.offsetParent)m.set(c,c.getBoundingClientRect())});return m}
function flip(before,dragEl,dragOff){cards().forEach(c=>{const a=before.get(c);if(!a||!c.offsetParent)return;const b=c.getBoundingClientRect();
  let dx=a.left-b.left,dy=a.top-b.top;if(c===dragEl){dx+=dragOff.x;dy+=dragOff.y}if(Math.abs(dx)+Math.abs(dy)<.5&&c!==dragEl)return;
  const s=spr(c);s.x=dx;s.y=dy;if(c!==dragEl){s.vx=0;s.vy=0}s.tx=0;s.ty=0})}
function swap(a,b){const ma=document.createComment('');a.replaceWith(ma);b.replaceWith(a);ma.replaceWith(b)}
function saveLayout(){if(typeof fullCard!=='undefined'&&fullCard)return;S.layout={};document.querySelectorAll('.pane').forEach(p=>S.layout[p.dataset.pane]=[...p.querySelectorAll(':scope>.card')].map(c=>c.dataset.card));save()}
function loadLayout(){if(S.layoutV!==2){S.layout=null;S.layoutV=2;return}if(!S.layout)return;const saved=Object.values(S.layout).flat();const byId={};cards().forEach(c=>byId[c.dataset.card]=c);
  for(const [pn,ids] of Object.entries(S.layout)){const p=document.querySelector(`.pane[data-pane="${pn}"]`);if(p&&Array.isArray(ids))ids.forEach(id=>{if(byId[id])p.appendChild(byId[id])})}
  const NEWAFTER={synths:'grid',mixer:'master',loops:'grid',glitch:'perform',starter:'loops'};cards().forEach(c=>{const id=c.dataset.card;if(saved.includes(id))return;const ref=byId[NEWAFTER[id]];if(ref)ref.after(c)})}
const dropLine=$('#dropLine');
function dropAt(x,y,self){const el=document.elementFromPoint(x,y);if(!el)return null;
  const c=el.closest('.card[data-card]');if(c&&c!==self&&c.closest('.pane')){const r=c.getBoundingClientRect(),after=y>r.top+r.height/2;return {ref:c,after,r}}
  const pn=el.closest('.pane');if(pn){const vis=[...pn.querySelectorAll(':scope>.card')].filter(k=>k!==self&&k.offsetParent);const last=vis[vis.length-1];
    if(!last)return {pane:pn,r:pn.getBoundingClientRect(),empty:true};const r=last.getBoundingClientRect();if(y>r.bottom-4)return {ref:last,after:true,r}}
  return null}
function showDrop(d){if(!d){dropLine.classList.remove('on');return}const r=d.r,y=d.empty?r.top+8:(d.after?r.bottom+5:r.top-6);
  dropLine.style.left=r.left+'px';dropLine.style.width=r.width+'px';dropLine.style.top=(y-1.5)+'px';dropLine.classList.add('on')}
document.querySelectorAll('.grab').forEach(g=>{
  let card=null,sx=0,sy=0,lx=0,lt=0,drop=null;
  g.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();card=g.closest('.card');if(card.closest('.fullhost')){card=null;return}g.setPointerCapture(e.pointerId);sx=e.clientX;sy=e.clientY;lx=e.clientX;lt=performance.now();
    const s=spr(card);s.drag=true;s.ts=1.02;card.classList.add('dragging')});
  g.addEventListener('pointermove',e=>{if(!card||!g.hasPointerCapture(e.pointerId))return;const s=spr(card),now=performance.now();
    s.tx=e.clientX-sx;s.ty=e.clientY-sy;const vx=(e.clientX-lx)/Math.max(8,now-lt);lx=e.clientX;lt=now;s.tr=clamp(vx*3,-2.5,2.5);
    card.style.pointerEvents='none';drop=dropAt(e.clientX,e.clientY,card);card.style.pointerEvents='';
    if(drop&&drop.ref){const sib=drop.after?drop.ref.nextElementSibling:drop.ref.previousElementSibling;if(sib===card)drop=null}showDrop(drop)});
  const end=e=>{if(!card)return;const s=spr(card);s.drag=false;s.ts=1;s.tr=0;card.classList.remove('dragging');showDrop(null);
    if(drop){const before=rects(),off={x:s.x,y:s.y};if(drop.empty)drop.pane.appendChild(card);else drop.ref[drop.after?'after':'before'](card);
      s.x=0;s.y=0;flip(before,card,off);saveLayout();toast('Kort flyttat');setTimeout(()=>dispatchEvent(new Event('resize')),60)}
    else{s.tx=0;s.ty=0}
    drop=null;card=null};
  g.addEventListener('pointerup',end);g.addEventListener('pointercancel',end)});



