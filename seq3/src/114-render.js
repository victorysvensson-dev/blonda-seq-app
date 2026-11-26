/* ---------------- render ---------------- */
function renderCells(){const pat=S.pats[S.pat];pat.forEach(tidyRow);requestAnimationFrame(()=>renderLens());
  for(let i=0;i<TRACKS.length;i++)for(let s=0;s<16;s++){const st=pat[i][s],c=cellEls[i][s];c.classList.toggle('on',!!st.v);c.classList.toggle('acc',st.v===2);c.textContent=(TRACKS[i].mel&&st.v)?NN[st.n%12]:'';stepDeco(c,st,i,s)}
  const t=TRACKS[S.sel];for(let s=0;s<16;s++){const st=pat[S.sel][s],b=bigEls[s];setTC(b,t);b.classList.toggle('on',!!st.v);b.classList.toggle('acc',st.v===2);b.classList.toggle('mel',!!t.mel);b.querySelector('span').textContent=(t.mel&&st.v)?nname(st.n):'';stepDeco(b,st,S.sel,s)}}
function stepVel(st,ti,s){if(TRACKS[ti].mel){const ns=notesAt(S.roll[S.pat][TRACKS[ti].id],s);return ns.length?Math.max(...ns.map(n=>n.v)):.72}return st.vel??(st.v===2?1:.72)}
function stepDeco(el,st,ti,s){el.style.setProperty('--vel',stepVel(st,ti,s).toFixed(2));{const sh=st.v?Math.round(((st.o||0)+(s%2?S.master.swing*.66:0))*4):0;el.classList.toggle('late',sh>0);el.classList.toggle('early',sh<0)}if(st.r>1){el.dataset.r=st.r;el.style.setProperty('--rr',st.r)}else delete el.dataset.r;
  if(st.p!=null&&st.p<1){el.dataset.p=st.p;el.style.setProperty('--pp',(.35+st.p*.65).toFixed(2))}else delete el.dataset.p}
function renderSel(){[...tagsEl.children].forEach((b,i)=>{b.classList.toggle('sel',i===S.sel);b.classList.toggle('mute',isMuted(i))});
  (window._TRKROW||[...gridEl.children]).forEach((r,i)=>{r.classList.toggle('sel',i===S.sel);r.querySelector('.rl').classList.toggle('mute',isMuted(i))});
  const t=TRACKS[S.sel];$('#selName').textContent=trkNo(S.sel).padStart(2,'0')+' '+t.name;$('#knobTitle').textContent=t.name+' · '+t.sub;
  $('#melHint').textContent=t.mel?'· dra = ton':'';$('#actMute').classList.toggle('on',!!S.mute[S.sel]);$('#actSolo').classList.toggle('on',soloOn(S.sel))}
let lastPat=-1;function renderPats(){const seg=document.querySelector('.patseg');if(seg)seg.style.setProperty('--pi',S.pat);
  if(lastPat>=0&&lastPat!==S.pat&&!RM){const g=$('#grid');if(g){g.classList.remove('swap');void g.offsetWidth;g.classList.add('swap');clearTimeout(g._sw);g._sw=setTimeout(()=>g.classList.remove('swap'),800)}}lastPat=S.pat;document.querySelectorAll('.pat').forEach(b=>{const p=+b.dataset.p;b.classList.toggle('cur',p===S.pat);b.classList.toggle('queued',p===queued)});$('#patName').textContent='ABCD'[S.pat]}
function renderAll(){if(sins&&sins.pat!==S.pat)closeInsp();renderCells();if(typeof orbRender==='function'&&window.__orbReady)orbRender();renderSel();renderPats();setDM($('#bpmNum'),String(S.bpm))}
function select(i){S.sel=i;buildTrackKnobs();renderAll();save();if(TRACKS[i].mel&&synT!==i){synT=i;refreshInst()}}

