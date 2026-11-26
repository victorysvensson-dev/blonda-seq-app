/* ================= layout: two or three columns (a setting per device — big screens get a third pane) ================= */
function colsSet(){try{return +(localStorage.getItem('blonda.cols')||2)}catch(e){return 2}}
const COLS={el:null,hinge:null,cur:2};
function colsEff(){return colsSet()===3&&innerWidth>=1100?3:2}
function colsApply(force){const panes=document.getElementById('panes'),right=document.querySelector('.pane.right');if(!panes||!right)return;
  if(!COLS.el){COLS.hinge=document.createElement('div');COLS.hinge.className='hinge h2';COLS.hinge.setAttribute('aria-hidden','true');
    COLS.el=document.createElement('section');COLS.el.className='pane extra';COLS.el.dataset.pane='extra';right.after(COLS.hinge);COLS.hinge.after(COLS.el);
    /* cards saved in the third pane come back there */
    const ids=S.layout&&S.layout.extra;if(Array.isArray(ids))ids.forEach(id=>{const c=document.querySelector('.card[data-card="'+id+'"]');if(c&&!c.closest('.fullhost'))COLS.el.appendChild(c)})}
  const n=colsEff();if(n===COLS.cur&&!force){panes.classList.toggle('c3',n===3);return}COLS.cur=n;panes.classList.toggle('c3',n===3);
  const cards=p=>[...p.querySelectorAll(':scope>.card')];
  if(n===3){if(!cards(COLS.el).length){/* first time: the lower half of the right pane moves over */const rc=cards(right),k=Math.ceil(rc.length/2);rc.slice(k).forEach(c=>COLS.el.appendChild(c))}}
  else cards(COLS.el).forEach(c=>right.appendChild(c));
  try{saveLayout()}catch(e){globalThis.__el&&globalThis.__el(e)}try{renderAll()}catch(e){globalThis.__el&&globalThis.__el(e)}dispatchEvent(new Event('resize'))}
setTimeout(()=>colsApply(true),50);
{let rt=0;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>colsApply(false),150)})}
/* the settings button in the header: columns (and a home for more settings later) */
(()=>{const hx=document.querySelector('header .hx');if(!hx)return;const b=document.createElement('button');b.className='hx-b';b.id='setBtn';b.title='Inställningar';
  b.innerHTML='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1.5" y="2.5" width="3.6" height="11" rx=".8"/><rect x="6.2" y="2.5" width="3.6" height="11" rx=".8"/><rect x="10.9" y="2.5" width="3.6" height="11" rx=".8"/></svg>';
  hx.prepend(b);let pop=null;
  const paint=()=>{if(!pop)return;pop.querySelectorAll('[data-cols]').forEach(x=>x.classList.toggle('on',+x.dataset.cols===colsSet()));pop.querySelector('.set-n').textContent=colsSet()===3&&innerWidth<1100?'fönstret är för smalt för tre just nu – två visas':''};
  b.onclick=e=>{e.stopPropagation();if(pop){pop.remove();pop=null;return}pop=document.createElement('div');pop.className='mo-pop set-pop';
    pop.innerHTML='<div class="mo-ph"><b>inställningar</b><small>sparas på den här datorn</small></div><div class="set-row"><span>kolumner</span><button data-cols="2">2</button><button data-cols="3">3</button></div><small class="set-n"></small><small class="set-h">dra korten mellan kolumnerna med ⠿</small>';
    document.body.appendChild(pop);const r=b.getBoundingClientRect(),w=pop.offsetWidth;pop.style.top=(r.bottom+8)+'px';pop.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+'px';
    pop.querySelectorAll('[data-cols]').forEach(x=>x.onclick=()=>{try{localStorage.setItem('blonda.cols',x.dataset.cols)}catch(e){globalThis.__el&&globalThis.__el(e)}colsApply(true);paint();toast(x.dataset.cols==='3'?'Tre kolumner':'Två kolumner')});paint()};
  document.addEventListener('pointerdown',e=>{if(pop&&!pop.contains(e.target)&&e.target!==b&&!b.contains(e.target)){pop.remove();pop=null}})})();

