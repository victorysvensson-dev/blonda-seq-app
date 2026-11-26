/* ================= mixer ================= */
const mxEl=$('#mx'),MXS=[];let mxPk=[],mxBuf=null;
const toDb=v=>v<=.0005?'-∞':(20*Math.log10(v)).toFixed(1).replace('-0.0','0.0');
function mxDrag(el,get,set,axis,def){let on=false,y0=0,v0=0,lastT=0;
  el.addEventListener('pointerdown',e=>{e.preventDefault();initAudio();const n=performance.now();if(n-lastT<300){pushHist();set(def);lastT=0;return}lastT=n;pushHist();on=true;el.setPointerCapture(e.pointerId);
    if(axis==='y'){const r=el.getBoundingClientRect();set(clamp(1-(e.clientY-r.top-7)/(r.height-14),0,1))}else{const r=el.getBoundingClientRect();set(clamp((e.clientX-r.left-4)/(r.width-8),0,1))}y0=axis==='y'?e.clientY:e.clientX;v0=get()});
  el.addEventListener('pointermove',e=>{if(!on)return;const r=el.getBoundingClientRect();if(axis==='y'){const d=(y0-e.clientY)/(r.height-14);set(clamp(v0+d*(e.shiftKey?.25:1),0,1))}else{const d=(e.clientX-y0)/(r.width-8);set(clamp(v0+d,0,1))}});
  const up=()=>{if(on){on=false;save()}};el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)}
function buildMixer(){mxEl.innerHTML='';MXS.length=0;
  TRACKS.forEach((t,i)=>{const el=document.createElement('div');el.className='ms';el.dataset.ti=i;regTC(el,t);
    el.innerHTML=`<div class="nm"><i>${trkNo(i)}</i><span>${t.name.toLowerCase()}</span></div><div class="pn" title="Panorering"><b></b></div><div class="fd">${i===0?'<div class="scale"><span>0</span><span>-5</span><span>-12</span><span>-24</span><span>-∞</span></div>':''}<div class="tr"><div class="fl"></div><div class="cap0"></div></div><div class="mt"><i></i></div></div><div class="db"></div><div class="bt"><button class="m" aria-label="Mute ${t.name}">M</button><button class="s" aria-label="Solo ${t.name}">S</button></div>`;
    const id=t.id;el.querySelector('.nm').onclick=()=>{select(i);audition(i)};
    mlReg(el.querySelector('.fd'),{key:'p.'+id+'.level',label:'volym · '+t.name.toLowerCase(),min:0,max:1,curve:'sq'});mlReg(el.querySelector('.pn'),{key:'p.'+id+'.pan',label:'pan · '+t.name.toLowerCase(),min:-1,max:1});
    mxDrag(el.querySelector('.fd'),()=>Math.sqrt(S.params[id].level),v=>{S.params[id].level=+(v*v).toFixed(4);applyTrack(i);renderSnd();renderDial()},'y',Math.sqrt(DEF_P[id].level));
    mxDrag(el.querySelector('.pn'),()=>(S.params[id].pan+1)/2,v=>{let pv=v*2-1;if(Math.abs(pv)<.04)pv=0;S.params[id].pan=+pv.toFixed(3);applyTrack(i);renderSnd();renderDial()},'x',.5);
    el.querySelector('.m').onclick=()=>{S.mute[i]=S.mute[i]?0:1;applyAll();renderSel();save()};
    el.querySelector('.s').onclick=()=>{soloTog(i);applyAll();renderSel();save()};
    mxEl.appendChild(el);MXS.push({el,fl:el.querySelector('.tr'),mt:el.querySelector('.mt i'),db:el.querySelector('.db'),pn:el.querySelector('.pn'),dot:el.querySelector('.nm i'),m:el.querySelector('.m'),s:el.querySelector('.s'),k:''})});
  const m=document.createElement('div');m.className='ms master';
  m.innerHTML='<div class="nm"><i>M</i><span>master</span></div><div class="pn" style="visibility:hidden"><b></b></div><div class="fd"><div class="tr"><div class="fl"></div><div class="cap0"></div></div><div class="mt"><i></i></div><div class="mt"><i></i></div></div><div class="db"></div><div class="bt"><button class="m" disabled style="visibility:hidden">M</button></div>';
  mlReg(m.querySelector('.fd'),{key:'m.vol',label:'volym · master',min:0,max:1});
  mxDrag(m.querySelector('.fd'),()=>S.master.vol,v=>{S.master.vol=+v.toFixed(3);applyMaster();masterKnobs.forEach(k=>k.refresh())},'y',.75);
  mxEl.appendChild(m);MXS.master={el:m,fl:m.querySelector('.tr'),mts:m.querySelectorAll('.mt i'),db:m.querySelector('.db'),k:''};mxPk=TRACKS.map(()=>0).concat([0,0])}
function chMeter(i){if(!ctx||!A.ch||!A.ch[i])return null;if(!A.met)A.met=[];if(!A.met[i]){const an=ctx.createAnalyser();an.fftSize=256;A.ch[i].g.connect(an);A.met[i]=an}return A.met[i]}
function peakOf(an){if(!mxBuf)mxBuf=new Float32Array(256);an.getFloatTimeDomainData(mxBuf);let p=0;for(let k=0;k<mxBuf.length;k+=2){const v=Math.abs(mxBuf[k]);if(v>p)p=v}return p}
const lvOf=p=>p<=0?0:clamp((20*Math.log10(p)+48)/48,0,1);
function mixerFrame(){const card=mxEl.closest('.card');if(!card||!card.offsetParent||card.classList.contains('min')||!MXS.length)return;const ct=ctx?ctx.currentTime:0;
  TRACKS.forEach((t,i)=>{if(window.trkOn&&!trkOn(i))return;const X=MXS[i],p=S.params[t.id],mu=isMuted(i),k=[p.level,p.pan,S.mute[i],soloOn(i),mu,S.sel].join('|');
    if(k!==X.k){X.k=k;X.fl.style.setProperty('--fv',Math.sqrt(p.level).toFixed(4));X.pn.style.setProperty('--pv',((p.pan+1)/2).toFixed(3));X.db.textContent=toDb(p.level);
      X.m.classList.toggle('on',!!S.mute[i]);X.s.classList.toggle('on',soloOn(i));X.el.classList.toggle('muted',mu);X.el.classList.toggle('sel',i===S.sel)}
    let pk=0;const an=chMeter(i);if(an)pk=peakOf(an);mxPk[i]=Math.max(pk,mxPk[i]*.9);const lv=lvOf(mxPk[i]);X.mt.style.setProperty('--lv',lv.toFixed(3));X.mt.classList.toggle('hot',mxPk[i]>.89);
    const h=hitT.get(i);X.dot.classList.toggle('hit',!!(h&&ct>=h.t&&ct-h.t<.1))});
  const M=MXS.master,k=String(S.master.vol);if(k!==M.k){M.k=k;M.fl.style.setProperty('--fv',S.master.vol);M.db.textContent=toDb(S.master.vol)}
  if(ctx&&A.anL&&A.anR){[A.anL,A.anR].forEach((an,j)=>{const b=new Float32Array(an.fftSize);an.getFloatTimeDomainData(b);let p=0;for(let q=0;q<b.length;q+=2)p=Math.max(p,Math.abs(b[q]));
    mxPk[10+j]=Math.max(p,mxPk[10+j]*.9);M.mts[j].style.setProperty('--lv',lvOf(mxPk[10+j]).toFixed(3));M.mts[j].classList.toggle('hot',mxPk[10+j]>.89)})}
  const act=TRACKS.filter((_,i)=>!isMuted(i)&&(!window.trkOn||trkOn(i))).length;$('#mixRead').textContent=(window.trkN?act+' / '+trkN():act+' av 10')+' kanaler'+(anySolo()?' · solo '+TRACKS.filter((_,i)=>soloOn(i)).map(t=>t.name.toLowerCase()).join(', '):'')}
buildMixer();

