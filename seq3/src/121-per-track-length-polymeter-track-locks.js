/* ---------- per-track length (polymeter) + track locks ---------- */
function trkLen(i){const v=S.len&&S.len[TRACKS[i].id];return v>=1&&v<=16?v:16}
function renderLens(){if(!gridEl)return;TRACKS.forEach((t,i)=>{const row=trkRowEl(i);if(!row)return;const L=trkLen(i),cs=cellEls[i];
  cs.forEach((c,k)=>c.classList.toggle('out',k>=L));const h=row.querySelector('.lenh');const last=cs[L-1];
  if(h&&last&&last.offsetWidth){const nx=cs[L],cr=(h.offsetParent||row).getBoundingClientRect(),lr=last.getBoundingClientRect();h.style.left=((nx?(lr.right+nx.getBoundingClientRect().left)/2:lr.right+3)-cr.left)+'px';h.dataset.n=L<16?L:'';h.classList.toggle('short',L<16)}
  row.classList.toggle('locked',!!S.lock[t.id])})}
function lenDrag(h,cells,i){let on=false,lastT=0;
  h.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();const n=performance.now();if(n-lastT<300){pushHist();S.len[TRACKS[i].id]=16;renderLens();save();lastT=0;return}lastT=n;pushHist();on=true;h.setPointerCapture(e.pointerId);h.classList.add('drag')});
  h.addEventListener('pointermove',e=>{if(!on)return;const cs=cellEls[i];let best=16,bd=1e9;for(let k=1;k<=16;k++){const r=cs[k-1].getBoundingClientRect(),d=Math.abs(e.clientX-r.right);if(d<bd){bd=d;best=k}}
    if(trkLen(i)!==best){S.len[TRACKS[i].id]=best;renderLens()}});
  const up=()=>{if(on){on=false;h.classList.remove('drag');save();const L=trkLen(i);toast(TRACKS[i].name+' · '+L+' steg'+(L<16?' · polymeter':''))}};h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up)}
addEventListener('resize',()=>requestAnimationFrame(renderLens));
if(window.ResizeObserver)new ResizeObserver(()=>renderLens()).observe(gridEl);

/* 4-dot level meter in front of each track name, in the track's colour */
const m4Lv=TRACKS.map(()=>0);
let engKey='';function trkCol(i){const t=TRACKS[i];if(!t.mel)return t.hex;const e=S.inst[t.id]||'analog';return (ENG[e]&&ENG[e].dot)||t.hex}
function engTint(){const k=TRACKS.map(t=>t.mel?(S.inst[t.id]||'analog'):'').join()+'|'+S.sel;if(k===engKey)return;engKey=k;recolorMel();bigEl.style.setProperty('--ec',trkCol(S.sel));
  TRACKS.forEach((t,i)=>{if(!t.mel)return;const row=trkRowEl(i);if(!row)return;const e=S.inst[t.id]||'analog',col=(ENG[e]&&ENG[e].dot)||t.hex,rl=row.querySelector('.rl');rl.style.setProperty('--tc',col);row.querySelector('.cells').style.setProperty('--tc',col);rl.dataset.eng=ENG[e]?ENG[e].name.toLowerCase():'';rl.title=t.name+' · '+(ENG[e]?ENG[e].name:'')})}
function m4Frame(){engTint();relabel();if(!gridEl||!gridEl.offsetParent)return;const ct=ctx?ctx.currentTime:0;
  TRACKS.forEach((t,i)=>{const h=hitT.get(i);let v=0;if(h&&ct>=h.t){v=(h.v||.8)*Math.exp(-(ct-h.t)/.22)*(isMuted(i)?0:1)}
    m4Lv[i]=Math.max(v,m4Lv[i]*.88);const n=Math.round(m4Lv[i]*4.2),row=trkRowEl(i);if(!row)return;
    if(row._m4!==n){row._m4=n;const ds=row.querySelectorAll('.m4 i');ds.forEach((d,k)=>d.classList.toggle('on',k<n))}})}

