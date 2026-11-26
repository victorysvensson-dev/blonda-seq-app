/* ---------------- step inspector ---------------- */
let sins=null;
function openStepInsp(ti,s,el){const c=S.pats[S.pat][ti][s];if(!c.v){c.v=1;save();renderCells()}sins={ti,s,pat:S.pat};const box=$('#sins');box.hidden=false;$('#sinsScrim').hidden=false;
  renderInsp();const r=el.getBoundingClientRect(),bw=box.offsetWidth||272,bh=box.offsetHeight||320;let x=r.left+r.width/2-bw/2,y=r.bottom+10;if(y+bh>innerHeight-10)y=r.top-bh-10;
  box.style.left=clamp(x,10,innerWidth-bw-10)+'px';box.style.top=clamp(y,10,innerHeight-bh-10)+'px';box.classList.remove('pop');void box.offsetWidth;box.classList.add('pop')}
function closeInsp(){$('#sins').hidden=true;$('#sinsScrim').hidden=true;sins=null}
function inspCell(){return S.pats[sins.pat][sins.ti][sins.s]}
function renderInsp(){if(!sins)return;const {ti,s}=sins,tr=TRACKS[ti],c=inspCell(),v=stepVel(c,ti,s);
  $('#sinsT').textContent='steg '+(s+1);$('#sinsSub').textContent=tr.name.toLowerCase()+(tr.mel&&c.v?' · '+nname(c.n):'');$('#sins').style.setProperty('--tc',tr.hex);
  $('#sinsVelN').textContent=Math.round(v*100);$('#sinsVel i').style.width=(v*100)+'%';
  [...$('#sinsR').children].forEach(b=>b.classList.toggle('on',+b.dataset.v===(c.r||1)));[...$('#sinsP').children].forEach(b=>b.classList.toggle('on',Math.abs(+b.dataset.v-(c.p??1))<.01));
  $('#sinsAcc').classList.toggle('on',c.v===2);$('#sinsRoll').hidden=!tr.mel}
function inspPreview(){if(!sins||!prevOn())return;initAudio();ctx.resume();const {ti,s}=sins,c=inspCell(),v=stepVel(c,ti,s),rr=c.r||1,sd=stepDur();for(let k=0;k<rr;k++)trigger(ti,ctx.currentTime+.01+k*sd/rr,v*(k?.8:1),c.n,1/rr)}
function setInspVel(v){const {ti,s}=sins,tr=TRACKS[ti],c=inspCell();v=clamp(v,.05,1);
  if(tr.mel){notesAt(S.roll[S.pat][tr.id],s).forEach(n=>n.v=v);syncCells(S.pat,ti)}else{c.vel=v;c.v=v>=.95?2:1}renderCells();save();renderInsp()}
(()=>{const vb=$('#sinsVel');let on=false;const setX=e=>{const r=vb.getBoundingClientRect();setInspVel((e.clientX-r.left)/r.width)};
  vb.addEventListener('pointerdown',e=>{e.preventDefault();vb.setPointerCapture(e.pointerId);on=true;setX(e)});vb.addEventListener('pointermove',e=>{if(on)setX(e)});
  const up=()=>{if(on){on=false;inspPreview()}};vb.addEventListener('pointerup',up);vb.addEventListener('pointercancel',up)})();
[...$('#sinsR').children].forEach(b=>b.onclick=()=>{const c=inspCell(),v=+b.dataset.v;if(v>1)c.r=v;else delete c.r;renderCells();save();renderInsp();inspPreview()});
[...$('#sinsP').children].forEach(b=>b.onclick=()=>{const c=inspCell(),v=+b.dataset.v;if(v<1)c.p=v;else delete c.p;renderCells();save();renderInsp()});
$('#sinsAcc').onclick=()=>{const {ti,s}=sins,tr=TRACKS[ti],c=inspCell(),acc=c.v!==2;if(tr.mel){notesAt(S.roll[S.pat][tr.id],s).forEach(n=>n.v=acc?1:.72);syncCells(S.pat,ti)}else{c.v=acc?2:1;c.vel=acc?1:.72}renderCells();save();renderInsp();inspPreview()};
$('#sinsRoll').onclick=()=>{const ti=sins.ti;closeInsp();openRoll(ti)};
$('#sinsClr').onclick=()=>{const c=inspCell();clrStep(c);renderCells();save();closeInsp()};
$('#sinsX').onclick=closeInsp;$('#sinsScrim').onclick=closeInsp;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sins)closeInsp()});

