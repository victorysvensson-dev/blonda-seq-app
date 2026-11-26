/* ================= Orbit module ================= */
const orbC=$('#orbC'),orbEl=$('#orb');
function euclid(k,n,r){const a=[];for(let i=0;i<n;i++)a.push(k>0&&((i*k)%n)<k?1:0);if(!r)return a;const m=((r%n)+n)%n;return a.slice(n-m).concat(a.slice(0,n-m))}
function orbHits(i){const L=trkLen(i);return S.pats[S.pat][i].slice(0,L).filter(c=>c.v).length}
function orbState(i){if(!S.eu)S.eu={};const id=TRACKS[i].id;if(!S.eu[id])S.eu[id]={r:0};return S.eu[id]}
function orbApply(i,k){const L=trkLen(i),st=orbState(i),E=euclid(k,L,st.r),row=S.pats[S.pat][i];
  for(let s=0;s<16;s++){const c=row[s],want=s<L&&E[s];if(want&&!c.v){c.v=1;delete c.vel}else if(!want&&c.v)clrStep(c)}renderAll();save();orbRender()}
function orbRender(){const i=S.sel,L=trkLen(i),k=orbHits(i),st=orbState(i);$('#orbK').textContent=k;$('#orbR').textContent=st.r;$('#orbL').textContent=L;
  setDM($('#orbBig'),k+'/'+L,26);$('#orbSub').textContent=TRACKS[i].name.toLowerCase()+(S.lock[TRACKS[i].id]?' · låst':'');
  [...$('#orbTrk').children].forEach((b,j)=>{j=b.dataset.ti!=null?+b.dataset.ti:j;b.classList.toggle('on',j===i);b.classList.toggle('mute',isMuted(j));b.style.setProperty('--c',trkCol(j))})}
TRACKS.forEach((t,i)=>{const b=document.createElement('button');b.innerHTML='<i></i>'+t.name.toLowerCase();b.onclick=()=>{if(dblTap(b)){openEditor(i);return}select(i);audition(i);orbRender()};$('#orbTrk').appendChild(b)});
document.querySelectorAll('.orb-ctl').forEach(el=>{const key=el.dataset.k,bv=el.querySelector('b');
  const step=d=>{initAudio();const i=S.sel;if(S.lock[TRACKS[i].id]){toast(TRACKS[i].name+' är låst');return}pushHist();const L=trkLen(i);
    if(key==='k')orbApply(i,clamp(orbHits(i)+d,0,L));
    else if(key==='r'){const st=orbState(i);st.r=((st.r+d)%L+L)%L;const row=S.pats[S.pat][i],seg=row.slice(0,L).map(c=>({...c}));for(let s=0;s<L;s++)Object.assign(row[s],seg[((s-d)%L+L)%L]);for(let s=0;s<L;s++){if(!row[s].v){delete row[s].r;delete row[s].p;delete row[s].vel}}renderAll();save();orbRender()}
    else{S.len[TRACKS[i].id]=clamp(L+d,1,16);renderLens();save();orbRender()}};
  el.querySelectorAll('button').forEach(b=>b.onclick=()=>step(+b.dataset.d));
  let y0=0,acc=0,on=false;bv.addEventListener('pointerdown',e=>{e.preventDefault();on=true;y0=e.clientY;acc=0;bv.setPointerCapture(e.pointerId)});
  bv.addEventListener('pointermove',e=>{if(!on)return;const d=(y0-e.clientY)/14;while(d-acc>=1){acc++;step(1)}while(d-acc<=-1){acc--;step(-1)}});
  bv.addEventListener('pointerup',()=>on=false)});
function orbGeo(){const r=orbC.getBoundingClientRect(),W=r.width,c=W/2,R0=c*.34,R1=c*.95,OL=window.trkList?trkList():TRACKS.map((_,i)=>i),gap=(R1-R0)/Math.max(1,OL.length-1);return {r,W,c,R0,R1,gap,OL,ringR:i=>R1-Math.max(0,OL.indexOf(i))*gap}}
orbEl.addEventListener('pointerdown',e=>{initAudio();const g=orbGeo(),x=e.clientX-g.r.left-g.c,y=e.clientY-g.r.top-g.c,d=Math.hypot(x,y);
  let best=-1,bd=1e9;g.OL.forEach(i=>{const dd=Math.abs(d-g.ringR(i));if(dd<bd){bd=dd;best=i}});if(best<0||bd>g.gap*.7)return;
  const L=trkLen(best),ang=(Math.atan2(y,x)+Math.PI/2+Math.PI*2)%(Math.PI*2),s=Math.round(ang/(Math.PI*2)*L)%L,ax=Math.cos(s/L*Math.PI*2-Math.PI/2)*g.ringR(best),ay=Math.sin(s/L*Math.PI*2-Math.PI/2)*g.ringR(best);
  if(best!==S.sel)select(best);
  if(Math.hypot(x-ax,y-ay)<Math.max(9,g.gap*.55)){pushHist();const c=S.pats[S.pat][best][s];if(c.v)clrStep(c);else{c.v=1;audition(best)}renderAll();save()}else audition(best);orbRender()});
function drawOrbit(now){if(!orbC.offsetParent||orbC.closest('.card').classList.contains('min'))return;const f=fit(orbC);if(!f)return;const {c,w}=f,g=orbGeo(),cx=w/2,ct=ctx?ctx.currentTime:0;
  c.clearRect(0,0,w,w);const pat=S.pats[S.pat];
  if(playing&&curStep>=0){const pp=(playPos()??curStep)/16,a=pp*Math.PI*2-Math.PI/2;const gr=c.createLinearGradient(cx,cx,cx+Math.cos(a)*g.R1,cx+Math.sin(a)*g.R1);
    gr.addColorStop(0,'rgba(233,197,74,0)');gr.addColorStop(1,'rgba(233,197,74,.55)');c.strokeStyle=gr;c.lineWidth=1.5;c.beginPath();c.moveTo(cx+Math.cos(a)*g.R0*.7,cx+Math.sin(a)*g.R0*.7);c.lineTo(cx+Math.cos(a)*(g.R1+6),cx+Math.sin(a)*(g.R1+6));c.stroke()}
  g.OL.forEach(i=>{const R=g.ringR(i),L=trkLen(i),col=trkCol(i),sel=i===S.sel,pos=playing?trkPos(i,curStep,curG):-1,h=hitT.get(i),flare=h&&ctx&&ct>=h.t?Math.max(0,1-(ct-h.t)/.25):0,dot=Math.min(g.gap*.36,5.5);
    c.beginPath();c.arc(cx,cx,R,0,Math.PI*2);c.strokeStyle=sel?'rgba(233,197,74,.35)':'rgba(232,230,220,.06)';c.lineWidth=1;c.stroke();
    for(let s=0;s<L;s++){const a=s/L*Math.PI*2-Math.PI/2,x=cx+Math.cos(a)*R,y=cx+Math.sin(a)*R,on=!!pat[i][s].v,cur=s===pos;
      c.beginPath();c.arc(x,y,on?dot*(cur?1.35:1):Math.max(1.2,dot*.4),0,Math.PI*2);
      if(on){c.fillStyle=cur?'#fff':col;c.shadowColor=col;c.shadowBlur=cur?14:(sel?6:3)+flare*10;c.globalAlpha=cur?1:(sel?1:.82)}else{c.fillStyle=cur?'rgba(232,230,220,.6)':'rgba(232,230,220,.16)';c.shadowBlur=0;c.globalAlpha=1}
      c.fill();c.shadowBlur=0;c.globalAlpha=1}});}
const _sel0=select;select=function(i){_sel0(i);orbRender()};
window.__orbReady=1;orbRender();

/* refresh every static label when a melodic channel changes engine */
let _lblKey='';function relabel(){const m=melNames();if(!m)return;const k=JSON.stringify(m);if(k===_lblKey)return;_lblKey=k;
  TRACKS.forEach((t,i)=>{if(!t.mel)return;const nm=t.name,lo=nm.toLowerCase();
    const row=trkRowEl(i);if(row){const e=row.querySelector('.rl .nm');if(e)e.textContent=nm}
    const tg=tagsEl.children[i];if(tg)tg.innerHTML=`<span class="d">${trkNo(i)}</span>${nm}<small>${t.sub}</small>`,tagDots[i]=tg.querySelector('.d');
    const pd=padEls[i];if(pd){pd.querySelector('b').textContent=nm;pd.querySelector('i').textContent=t.sub}
    const ob=$('#orbTrk')&&($('#orbTrk').querySelector('[data-ti="'+i+'"]')||$('#orbTrk').children[i]);if(ob)ob.innerHTML='<i></i>'+lo;
    if(MXS[i]){const e=MXS[i].el.querySelector('.nm span');if(e)e.textContent=lo}
    document.querySelectorAll(`#synSeg button[data-t="${i}"],.rtk[data-t="${i}"]`).forEach(b=>{if(b.classList.contains('rtk'))b.innerHTML='<i></i>'+lo;else b.textContent=lo})});
  renderSel();if(typeof orbRender==='function'&&window.__orbReady)orbRender();if(typeof renderDial==='function')renderDial();if(typeof renderSnd==='function')renderSnd()}
/* mini views shown in a minimised card's header */
const MINI={};let miniPk=0,miniBuf=null;
function ledRow(box,onClick){const leds=TRACKS.map((t,i)=>{const l=document.createElement('i');l.className='led';l.dataset.ti=i;regTC(l,t,'--c');l.title=t.name;
  l.onclick=e=>{e.stopPropagation();onClick(i)};box.appendChild(l);return l});return leds}
function sqRow(box){return Array.from({length:16},()=>{const q=document.createElement('i');q.className='sq';box.appendChild(q);return q})}
function segRow(box,n=14){return Array.from({length:n},(_,k)=>{const q=document.createElement('i');q.className='seg'+(k>=n-2?' clip':k>=n-5?' hot':'');box.appendChild(q);return q})}
function buildMini(c){const cap=capOf(c);if(!cap||c._mini)return;const box=document.createElement('span');box.className='mini';cap.querySelector('.t').after(box);c._mini=box;const id=c.dataset.card,m={box};
  if(id==='pads'){m.leds=ledRow(box,i=>hitPad(i))}
  else if(id==='tracks'){m.leds=ledRow(box,i=>select(i))}
  else if(id==='grid'||id==='steps'){m.sq=sqRow(box)}
  else if(id==='scope'||id==='master'){m.seg=segRow(box,id==='master'?10:16);if(id==='master'){m.t=document.createElement('span');m.t.className='txt';box.appendChild(m.t)}}
  else if(id==='sound'||id==='knobs'){m.led=document.createElement('i');m.led.className='led';box.appendChild(m.led);m.t=document.createElement('span');m.t.className='txt';box.appendChild(m.t);
    m.bars=(id==='knobs'?['drive','filt','comp']:['level','tone','decay']).map(k=>{const b=document.createElement('span');b.className='bar';b.innerHTML='<i></i>';box.appendChild(b);return [k,b.firstChild]})}
  else if(id==='synth'){m.led=document.createElement('i');m.led.className='led';box.appendChild(m.led);m.t=document.createElement('span');m.t.className='txt';box.appendChild(m.t);m.sq=sqRow(box).slice(0,16)}
  else if(id==='song'){m.sq=Array.from({length:8},()=>{const q=document.createElement('i');q.className='sq';box.appendChild(q);return q})}
  else if(id==='perform'){m.t=document.createElement('span');m.t.className='txt';box.appendChild(m.t);m.bars=['f','fx'].map(()=>{const b=document.createElement('span');b.className='bar';b.innerHTML='<i></i>';box.appendChild(b);return b.firstChild})}
  else if(id==='loops'){m.ll=[0,1,2,3].map(()=>{const l=document.createElement('i');l.className='led';l.style.setProperty('--c','#6BE28C');box.appendChild(l);return l})}
  else if(id==='plugins'){m.pl=['echo','space','tape','crush'].map(k=>{const w=document.createElement('span');w.className='pl';w.innerHTML='<i class="led"></i>'+k;box.appendChild(w);const l=w.firstChild;l.style.setProperty('--c','#6BE28C');
    w.onclick=e=>{e.stopPropagation();initAudio();S.fx[k].on=S.fx[k].on?0:1;applyMaster();renderPlugs();save()};return [k,l]})}
  MINI[id]=m}
function miniFrame(){const mins=document.querySelectorAll('.card.min');if(!mins.length)return;const ct=ctx?ctx.currentTime:0;
  if(ctx&&A.an){if(!miniBuf)miniBuf=new Float32Array(A.an.fftSize);A.an.getFloatTimeDomainData(miniBuf);let pk=0;for(let i=0;i<miniBuf.length;i+=2)pk=Math.max(pk,Math.abs(miniBuf[i]));miniPk=Math.max(pk,miniPk*.9)}else miniPk*=.9;
  const db=miniPk>0?20*Math.log10(miniPk):-90,lvl=clamp((db+42)/42,0,1),pat=S.pats[S.pat],ph=playing?curStep:-1;
  mins.forEach(c=>{buildMini(c);const m=MINI[c.dataset.card];if(!m)return;
    if(m.leds)m.leds.forEach((l,i)=>{const h=hitT.get(i);l.classList.toggle('on',!!(h&&ct>=h.t&&ct-h.t<.11));l.classList.toggle('sel',i===S.sel)});
    if(m.sq&&(c.dataset.card==='grid'||c.dataset.card==='steps'))m.sq.forEach((q,s)=>{let n=0;const rows=c.dataset.card==='steps'?[pat[S.sel]]:pat;rows.forEach(r=>{if(r[s].v)n++});
      q.style.setProperty('--d',Math.min(1,n/(rows.length>1?4:1)));q.classList.toggle('ph',s===ph)});
    if(m.seg){const n=m.seg.length;m.seg.forEach((q,k)=>q.classList.toggle('on',lvl*n>k+.5));if(m.t)m.t.textContent='vol '+Math.round(S.master.vol*100)}
    if(c.dataset.card==='sound'||c.dataset.card==='knobs'){const t=TRACKS[S.sel],p=S.params[t.id],h=hitT.get(S.sel);m.led.style.setProperty('--c',t.hex);m.led.classList.toggle('on',!!(h&&ct>=h.t&&ct-h.t<.11));
      if(m.t.textContent!==t.name.toLowerCase())m.t.textContent=t.name.toLowerCase();const src=c.dataset.card==='knobs'?tfxOf(t.id):p;m.bars.forEach(([k,i])=>{i.style.width=clamp(Math.abs(src[k]??.5),0,1)*100+'%'})}
    if(c.dataset.card==='synth'){const t=TRACKS[synT],e=S.inst[t.id]||'analog',h=hitT.get(synT);m.led.style.setProperty('--c',ENG[e].dot||t.hex);m.led.classList.toggle('on',!!(h&&ct>=h.t&&ct-h.t<.11));
      const tx=ENG[e].name.toLowerCase();if(m.t.textContent!==tx)m.t.textContent=tx;m.sq.forEach((q,s)=>{q.style.setProperty('--d',pat[synT][s].v?1:0);q.classList.toggle('ph',s===ph)})}
    if(c.dataset.card==='song')m.sq.forEach((q,k)=>{q.style.setProperty('--d',S.chain[k]>=0?.6:0);q.classList.toggle('ph',!!S.song&&playing&&k===chainIdx)});
    if(c.dataset.card==='perform'){const tx=xyVals.f===0&&xyVals.fx===0?'redo':'live';if(m.t.textContent!==tx)m.t.textContent=tx;m.bars[0].style.width=Math.abs(xyVals.f)*100+'%';m.bars[1].style.width=xyVals.fx*100+'%'}
    if(m.ll)m.ll.forEach((l,k)=>{const a=loopAt[k];l.classList.toggle('on',!!(a&&playing&&S.loops[k].on&&ct>=a.t&&((ct-a.t)%(240/S.bpm))<.12));l.style.opacity=S.loops[k].sid?'':'.08'});
    if(m.pl)m.pl.forEach(([k,l])=>l.classList.toggle('on',!!S.fx[k].on))})}
/* minimise + fullscreen per card */
const IC_MIN='<svg viewBox="0 0 12 12"><path d="M3 4.5 6 7.5l3-3"/></svg>',IC_FULL='<svg viewBox="0 0 12 12"><path d="M7 2h3v3M5 10H2V7M10 2 6.8 5.2M2 10l3.2-3.2"/></svg>',IC_SHRINK='<svg viewBox="0 0 12 12"><path d="M10 5H7V2M2 7h3v3M7 5l3.2-3.2M5 7l-3.2 3.2"/></svg>';
if(!S.cmin)S.cmin={};
function capOf(c){return c.querySelector('.cap')}
function markMin(c){const cap=capOf(c);if(!cap||c._mk)return;c._mk=1;let n=cap;while(n&&n!==c){[...n.parentElement.children].forEach(k=>{if(k!==n&&!k.classList.contains('phband'))k.classList.add('mnx')});n=n.parentElement}}
function setMin(c,on,anim=true){const id=c.dataset.card;if(on)S.cmin[id]=1;else delete S.cmin[id];markMin(c);
  if(!anim||!c.offsetParent){c.classList.toggle('min',on);return}
  const from=c.getBoundingClientRect().height;c.classList.toggle('min',on);const to=c.getBoundingClientRect().height;
  c.classList.add('anim');c.style.height=from+'px';void c.offsetHeight;c.style.height=to+'px';
  clearTimeout(c._mt);c._mt=setTimeout(()=>{c.style.height='';c.classList.remove('anim');dispatchEvent(new Event('resize'))},440);save()}
const fullHost=$('#fullHost');let fullCard=null,fullPh=null;
function setFull(c){if(fullCard){const fc=fullCard;fullPh.replaceWith(fc);fc.querySelector('.cfull').innerHTML=IC_FULL;fullCard=null;fullHost.classList.remove('show');setTimeout(()=>{if(!fullCard)fullHost.hidden=true},280);
    if(S.cmin[fc.dataset.card])setMin(fc,true,false);if(c===fc){setTimeout(()=>dispatchEvent(new Event('resize')),30);return}}
  if(!c)return;if(c.classList.contains('min'))c.classList.remove('min')
  fullPh=document.createComment('full');c.replaceWith(fullPh);fullHost.appendChild(c);fullHost.hidden=false;requestAnimationFrame(()=>fullHost.classList.add('show'));fullCard=c;
  c.querySelector('.cfull').innerHTML=IC_SHRINK;setTimeout(()=>dispatchEvent(new Event('resize')),30)}
fullHost.addEventListener('click',e=>{if(e.target===fullHost)setFull(fullCard)});
document.addEventListener('keydown',e=>{e._pop=!!sins||dedT>=0||$('#roll').classList.contains('open')},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&fullCard&&!e._pop)setFull(fullCard)});
cards().forEach(c=>{const cap=capOf(c);if(!cap)return;const g=cap.querySelector('.grab');const box=document.createElement('span');box.className='cbtns';
  box.innerHTML=`<button class="cbtn cmin" aria-label="Minimera">${IC_MIN}</button><button class="cbtn cfull" aria-label="Helskärm">${IC_FULL}</button>`;
  if(g)g.before(box);else cap.appendChild(box);if(g&&g.parentElement!==cap)box.style.marginLeft='0';
  box.querySelector('.cmin').onclick=e=>{e.stopPropagation();setMin(c,!c.classList.contains('min'))};
  box.querySelector('.cfull').onclick=e=>{e.stopPropagation();setFull(c)};
  cap.querySelector('.t').addEventListener('click',()=>{if(c.classList.contains('min'))setMin(c,false)});
  cap.addEventListener('dblclick',e=>{if(e.target.closest('button'))return;setFull(c)})});
requestAnimationFrame(()=>cards().forEach(c=>{if(S.cmin[c.dataset.card])setMin(c,true,false)}));

/* specular highlight follows the finger */
document.addEventListener('pointermove',e=>{const c=e.target.closest&&e.target.closest('.card');if(!c)return;const r=c.getBoundingClientRect();
  c.style.setProperty('--mx',(e.clientX-r.left)+'px');c.style.setProperty('--my',(e.clientY-r.top)+'px')},{passive:true});
document.addEventListener('pointerdown',e=>{const c=e.target.closest&&e.target.closest('.card');if(!c)return;const r=c.getBoundingClientRect();
  c.style.setProperty('--mx',(e.clientX-r.left)+'px');c.style.setProperty('--my',(e.clientY-r.top)+'px')},{passive:true});

