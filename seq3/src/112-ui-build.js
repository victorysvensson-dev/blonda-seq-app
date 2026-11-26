/* ---------------- UI build ---------------- */
function trkNo(i){const t=TRACKS[i];if(!t)return String(i+1);let n=0;for(let k=0;k<=i;k++)if(!!TRACKS[k].mel===!!t.mel)n++;return t.mel?'s'+n:String(n)}
function trkRowEl(i){return window._TRKROW?_TRKROW[i]:gridEl.children[i]}
const tagsEl=$('#tags'),gridEl=$('#grid'),bigEl=$('#bigsteps'),padsEl=$('#pads'),rule=$('#rule'),bar16=$('#bar16');
const TCREG=new Set();function regTC(el,t,pr='--tc'){el.style.setProperty(pr,t.hex);if(t.mel)TCREG.add([el,t,pr])}
function recolorMel(){TCREG.forEach(r=>{if(!r[0].isConnected){TCREG.delete(r);return}r[0].style.setProperty(r[2],r[1].hex)})}
const setTC=(el,t)=>regTC(el,t);
const tagDots=[];
TRACKS.forEach((t,i)=>{const b=document.createElement('button');b.className='tag';setTC(b,t);
  b.innerHTML=`<span class="d">${trkNo(i)}</span>${t.name}<small>${t.sub}</small>`;tagDots[i]=b.querySelector('.d');
  b.onclick=()=>{if(dblTap(b)){openEditor(i);return}select(i);audition(i)};tagsEl.appendChild(b)});
for(let s=0;s<16;s++){const sp=document.createElement('span');sp.textContent=s+1;rule.appendChild(sp);bar16.appendChild(document.createElement('i'))}
const cellEls=[];
TRACKS.forEach((t,i)=>{const row=document.createElement('div');row.className='row';
  const rl=document.createElement('button');rl.className='rl';setTC(rl,t);rl.innerHTML='<span class="m4" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="nm"></span>';rl.querySelector('.nm').textContent=t.name;rl.onclick=()=>{if(dblTap(rl)){openEditor(i);return}select(i);audition(i)};
  const cells=document.createElement('div');cells.className='cells';setTC(cells,t);cellEls[i]=[];
  for(let s=0;s<16;s++){const c=document.createElement('div');c.className='cell'+(t.mel?' mel':'');c.dataset.i=i;c.dataset.s=s;c.style.setProperty('--sx',s+i*.6);cells.appendChild(c);cellEls[i][s]=c}
  const lk=document.createElement('span');lk.className='lock';lk.title='Lås spåret (tärningen rör det inte)';lk.innerHTML='<svg viewBox="0 0 12 12"><rect x="2.5" y="5.5" width="7" height="5" rx="1"/><path d="M4 5.5V4a2 2 0 0 1 4 0v1.5"/></svg>';
  lk.addEventListener('pointerdown',e=>e.stopPropagation());lk.onclick=e=>{e.stopPropagation();rl._lt=0;S.lock[t.id]=S.lock[t.id]?0:1;renderLens();save();toast(t.name+(S.lock[t.id]?' låst · tärningen rör det inte':' upplåst'))};rl.appendChild(lk);
  const h=document.createElement('i');h.className='lenh';h.title='Dra för att ändra spårets längd · dubbeltryck = 16';cells.appendChild(h);lenDrag(h,cells,i);
  row.append(rl,cells);gridEl.appendChild(row)});
const bigEls=[];for(let s=0;s<16;s++){const b=document.createElement('div');b.className='bs';b.dataset.s=s;b.innerHTML=`<i>${s+1}</i><span></span>`;bigEl.appendChild(b);bigEls[s]=b}
const padEls=[];TRACKS.forEach((t,i)=>{const p=document.createElement('button');p.className='pad';setTC(p,t);if(t.dark)p.dataset.dark='1';
  p.innerHTML=`<i>${t.sub}</i><b>${t.name}</b>`;
  p.addEventListener('pointerdown',e=>{e.preventDefault();hitPad(i)});
  padEls[i]=p;padsEl.appendChild(p)});
const grip='<svg viewBox="0 0 14 14" fill="currentColor"><circle cx="4" cy="3" r="1.3"/><circle cx="10" cy="3" r="1.3"/><circle cx="4" cy="7" r="1.3"/><circle cx="10" cy="7" r="1.3"/><circle cx="4" cy="11" r="1.3"/><circle cx="10" cy="11" r="1.3"/></svg>';
document.querySelectorAll('.grab').forEach(g=>g.innerHTML=grip);

/* knobs with spring-smoothed rotation and a value bubble */
const KN=new Set();
/* MIDI learn: any control can register itself; the learn module (further down) reads el._mls */
function mlReg(el,spec){if(!el)return;el._mls=spec;el.classList.add('mlk')}
function knob(parent,o){
  const k=document.createElement('div');k.className='knob';k.tabIndex=0;k.setAttribute('role','slider');k.setAttribute('aria-label',o.label);
  k.innerHTML=`<div class="face"><div class="mark"></div></div><span class="bubble"></span><span class="kl">${o.label}</span><span class="kv"></span>`;
  k.style.setProperty('--kc',TEK[parent.querySelectorAll('.knob').length%4]);parent.appendChild(k);
  const kv=k.querySelector('.kv'),bub=k.querySelector('.bubble'),dmk=!!parent.closest('.deckish');let val=o.get();
  const norm=v=>(v-o.min)/(o.max-o.min);
  k._d=norm(val);k._vel=0;k._t=k._d;k.style.setProperty('--v',k._d);
  const draw=()=>{k._t=norm(val);KN.add(k);const txt=o.fmt(val);if(dmk)setDM(kv,String(txt),14);else kv.textContent=txt;bub.textContent=txt;k.setAttribute('aria-valuenow',val.toFixed(2))};
  const setv=v=>{val=clamp(v,o.min,o.max);o.set(val);draw()};
  let y0=0,v0=0,lastTap=0;
  k.addEventListener('pointerdown',e=>{e.preventDefault();k.setPointerCapture(e.pointerId);y0=e.clientY;v0=val;k.classList.add('active');
    const now=performance.now();if(now-lastTap<300){setv(o.def);lastTap=0;return}lastTap=now});
  k.addEventListener('pointermove',e=>{if(k.hasPointerCapture(e.pointerId))setv(v0+(y0-e.clientY)/170*(o.max-o.min))});
  const up=()=>k.classList.remove('active');k.addEventListener('pointerup',up);k.addEventListener('pointercancel',up);
  k.addEventListener('keydown',e=>{const st=(o.max-o.min)/40;if(e.key==='ArrowUp'||e.key==='ArrowRight'){setv(val+st);e.preventDefault()}if(e.key==='ArrowDown'||e.key==='ArrowLeft'){setv(val-st);e.preventDefault()}});
  k.refresh=()=>{val=o.get();draw()};draw();if(o.ml)mlReg(k,{key:o.ml,label:o.mll||o.label.toLowerCase(),min:o.min,max:o.max,paint:k.refresh});return k}
function stepKnobs(){KN.forEach(k=>{if(RM){k._d=k._t}else{k._vel+=(k._t-k._d)*.32;k._vel*=.5;k._d+=k._vel}k.style.setProperty('--v',k._d.toFixed(4));
  if(Math.abs(k._t-k._d)<.0005&&Math.abs(k._vel)<.0005){k._d=k._t;k.style.setProperty('--v',k._d);KN.delete(k)}})}
const pct=v=>String(Math.round(v*100));
