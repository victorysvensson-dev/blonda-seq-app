/* ---------------- instrument rack ---------------- */
const engRow=$('#engs');
ENG_ORDER.forEach(k=>{const b=document.createElement('button');b.className='eng';b.dataset.e=k;b.innerHTML=`<i style="--d:${ENG[k].dot}"></i>${ENG[k].name}`;
  b.onclick=()=>{const id=TRACKS[synT].id;if(S.inst[id]===k)return;pushHist();S.inst[id]=k;swapAnim();refreshInst();save();synPreview();toast(TRACKS[synT].name+' → '+ENG[k].name)};engRow.appendChild(b)});
function swapAnim(){if(RM)return;synIn.classList.remove('swap');void synIn.offsetWidth;synIn.classList.add('swap')}
synIn.addEventListener('animationend',e=>{if(e.animationName==='swapin')synIn.classList.remove('swap')});
let engCol={fg:'#fff',acc:'#fff'};
function refreshInst(){setTimeout(engOvf,30);const id=TRACKS[synT].id,e=S.inst[id]||'analog';synCard.dataset.eng=e;
  [...engRow.children].forEach(b=>{const on=b.dataset.e===e;b.classList.toggle('on',on);if(on)engRow.scrollTo({left:Math.max(0,b.offsetLeft-engRow.clientWidth/2+b.offsetWidth/2),behavior:RM?'auto':'smooth'})});
  $('#engAnalog').hidden=e!=='analog';$('#engGen').hidden=e==='analog';renderSynth();
  const cs=getComputedStyle(synCard);engCol={fg:cs.getPropertyValue('--e-fg').trim()||'#fff',acc:cs.getPropertyValue('--e-acc').trim()||'#fff'};
  if(e==='analog')return;
  const D=ENG[e],E=engE(e);$('#engName').textContent=D.name;$('#engTag').textContent=D.tag;
  const box=$('#engDials');box.innerHTML='';
  D.ps.forEach(q=>{const el=document.createElement('div'),mx=q.max||1;el.className='edial';el.title='Dra upp/ner';
    el.innerHTML=`<small>${q.l}</small><b><span></span><sup></sup></b><div class="bar"><i></i></div>`;box.appendChild(el);
    const upd=()=>{const [n,u]=q.f(E[q.k]);el.querySelector('span').textContent=n;el.querySelector('sup').textContent=u;el.querySelector('.bar i').style.width=(E[q.k]/mx*100)+'%'};upd();
    let y0=0,v0=0;
    el.addEventListener('pointerdown',ev=>{ev.preventDefault();el.setPointerCapture(ev.pointerId);y0=ev.clientY;v0=E[q.k];el.classList.add('act')});
    el.addEventListener('pointermove',ev=>{if(!el.hasPointerCapture(ev.pointerId))return;let v=clamp(v0+(y0-ev.clientY)/200*mx,0,mx);if(q.step)v=Math.round(v/q.step)*q.step;if(v!==E[q.k]){E[q.k]=v;upd();save()}});
    const up=()=>{if(el.classList.contains('act')){el.classList.remove('act');synPreview()}};el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
    mlReg(el,{key:'e.'+e+'.'+q.k,label:q.l.toLowerCase()+' · '+D.name.toLowerCase(),min:0,max:mx,step:q.step,paint:upd})});
  const ob=$('#engOpts');ob.innerHTML='';(D.opts||[]).forEach(o=>o.ch.forEach(([val,lab])=>{const b=document.createElement('button');b.className='eopt'+(E[o.k]===val?' on':'');b.textContent=lab;
    b.onclick=()=>{E[o.k]=val;refreshInst();save();synPreview()};ob.appendChild(b)}));ob.hidden=!(D.opts&&D.opts.length)}
const rgba=(hex,a)=>{const h=hex.replace('#','');if(h.length<6)return `rgba(255,255,255,${a})`;return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`};
function drawEng(now){const id=TRACKS[synT].id,e=S.inst[id];if(e==='analog')return;const f=fit($('#engCv'));if(!f)return;const {c,w,h}=f,fg=engCol.fg,ac=engCol.acc;
  const hh=hitT.get(synT),el=hh&&ctx?ctx.currentTime-hh.t:99,p=S.params[id],E=S.eng[e],T=now/1000;
  if(e==='msx'){if(window.TEX&&TEX.draw)TEX.draw(c,w,h,el,fg,ac,id);return}
  if(e==='grime'){grimeDraw(c,w,h,el,E||engE('grime'),fg,ac,T);return}
  if(e==='acid'){const g=[];for(let x=8;x<w;x+=16)for(let y=8;y<h;y+=16)g.push(x,y);dots(c,g,.9,0);c.fillStyle=rgba(ac,.18);c.beginPath();for(let i=0;i<g.length;i+=2){c.moveTo(g[i]+.9,g[i+1]);c.arc(g[i],g[i+1],.9,0,6.2832)}c.fill();
    const acc=hh&&hh.v>=.95,base=Math.min(20000,acidHz(E.cut)*(.6+p.tone*.8)),peak=Math.min(20000,base*(1+E.env*(acc?1+E.acc:1)*14)),dec=(.06+E.dec*.9)*(acc?.7:1);
    const fc=el>=0&&el<4?base+(peak-base)*Math.exp(-el/(dec/3)):base,Q=.7+Math.pow(E.res,1.15)*30,X=fq=>Math.log(fq/20)/Math.log(1000)*w,Y=db=>h*.12+(24-db)/64*h*.8;
    c.beginPath();for(let x=0;x<=w;x+=2){const fq=20*Math.pow(1000,x/w),r=fq/fc,H=1/Math.sqrt((1-r*r)*(1-r*r)+(r/Q)*(r/Q))/Math.sqrt((1-r*r)*(1-r*r)+(r/.55)*(r/.55)),db=Math.max(-40,Math.min(24,20*Math.log10(H)));x?c.lineTo(x,Y(db)):c.moveTo(x,Y(db))}
    const path=new Path2D();path.addPath(new Path2D());c.save();c.lineTo(w,h);c.lineTo(0,h);c.closePath();const gr=c.createLinearGradient(0,0,0,h);gr.addColorStop(0,rgba(ac,.38));gr.addColorStop(1,rgba(ac,0));c.fillStyle=gr;c.fill();c.restore();
    c.beginPath();for(let x=0;x<=w;x+=2){const fq=20*Math.pow(1000,x/w),r=fq/fc,H=1/Math.sqrt((1-r*r)*(1-r*r)+(r/Q)*(r/Q))/Math.sqrt((1-r*r)*(1-r*r)+(r/.55)*(r/.55)),db=Math.max(-40,Math.min(24,20*Math.log10(H)));x?c.lineTo(x,Y(db)):c.moveTo(x,Y(db))}
    c.shadowColor=ac;c.shadowBlur=14;c.strokeStyle=ac;c.lineWidth=2.2;c.stroke();c.shadowBlur=0;
    const xc=X(fc);c.setLineDash([2,5]);c.strokeStyle=rgba(ac,.6);c.lineWidth=1;c.beginPath();c.moveTo(xc,0);c.lineTo(xc,h);c.stroke();c.setLineDash([]);
    c.font='500 10px "BLONDA Mono",ui-monospace,monospace';c.fillStyle=rgba(ac,.9);const lab=Math.round(fc)+' hz'+(acc&&el<.3?' · accent':'');c.fillText(lab,clamp(xc+8,4,w-c.measureText(lab).width-4),14);return}
  if(e==='sub'){const dec=.1+E.decay*2.5,a=el>=0?Math.exp(-el/(dec/3)):0,x0=w/2,y0=h/2,R=Math.min(w,h)*.47;
    for(let k=7;k>=1;k--){const r=R*k/7*(1+a*.07*(k%2?1:-.6));c.strokeStyle=rgba(fg,.1+.45*a*(k/7)+(k===7?.15:0));c.lineWidth=k===7?2:1;c.beginPath();c.arc(x0,y0,r,0,6.2832);c.stroke()}
    const gr=c.createRadialGradient(x0,y0,0,x0,y0,R*.6);gr.addColorStop(0,'rgba(0,0,0,.35)');gr.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=gr;c.beginPath();c.arc(x0,y0,R*.6,0,6.2832);c.fill();
    const cap=R*.22*(1+a*.22);const g2=c.createRadialGradient(x0-cap*.3,y0-cap*.3,0,x0,y0,cap);g2.addColorStop(0,rgba(fg,.95));g2.addColorStop(1,rgba(ac,.55));c.fillStyle=g2;c.beginPath();c.arc(x0,y0,cap,0,6.2832);c.fill();
    const fr=hz(firstNote(synT)-12+p.tune);c.font='200 30px "BLONDA Sans",system-ui';c.fillStyle=rgba(fg,.9);c.fillText(Math.round(fr)+'',8,h-12);c.font='500 9px "BLONDA Mono",monospace';c.fillText('hz · grundton',8,h-48+6);return}
  if(e==='fm'){const r=FM_R[Math.round(E.ratio)]||2,I=E.index,a=el>=0?Math.exp(-el/((.2+E.decay*2.5)/3)):0,x0=w/2,y0=h/2,R=Math.min(w,h)*.36*(1+a*.07),ph=T*.6,turns=(r%1)?4:2,N=520,pts=[];
    for(let i=0;i<N;i++){const th=i/N*Math.PI*turns,rad=R*(1-I*.3);pts.push(x0+Math.cos(th)*rad+Math.cos(-(r+1)*th+ph)*R*(.12+I*.5),y0+Math.sin(th)*rad+Math.sin(-(r+1)*th+ph)*R*(.12+I*.5))}
    c.fillStyle=rgba(fg,.08);c.beginPath();c.arc(x0,y0,R*(1-I*.3),0,6.2832);c.fill();
    c.fillStyle=rgba(fg,.35+a*.55);c.beginPath();for(let i=0;i<pts.length;i+=2){c.moveTo(pts[i]+1.2,pts[i+1]);c.arc(pts[i],pts[i+1],1.2+a*.6,0,6.2832)}c.fill();
    const mx=x0+Math.cos(ph)*R*(1-I*.3),my=y0+Math.sin(ph)*R*(1-I*.3);c.fillStyle=fg;c.beginPath();c.arc(mx,my,4,0,6.2832);c.fill();
    c.font='500 9px "BLONDA Mono",monospace';c.fillStyle=rgba(fg,.6);c.fillText('modulator '+r+'×',8,h-8);return}
  if(e==='pluck'){const L=.4+E.len*2.6,a=el>=0?Math.exp(-el/(L/3)):0;for(let k=1;k<9;k++){const x=w*(1-Math.pow(2,-k/3))*1.05;c.strokeStyle=rgba(fg,.1);c.lineWidth=1;c.beginPath();c.moveTo(x,10);c.lineTo(x,h-10);c.stroke()}
    for(let s2=0;s2<6;s2++){const y=h*(.17+s2*.133),act=s2===2;c.beginPath();for(let x=0;x<=w;x+=3){const u=x/w,amp=act?a*h*.16:a*h*.015;
      const yy=y+Math.sin(Math.PI*u)*amp*Math.sin(T*55)+Math.sin(2*Math.PI*u)*amp*.35*Math.sin(T*89+1)+Math.sin(3*Math.PI*u)*amp*.15*Math.sin(T*131);x?c.lineTo(x,yy):c.moveTo(x,yy)}
      c.strokeStyle=act?rgba(fg,.95):rgba(fg,.28);c.lineWidth=act?1.8:1+(5-s2)*.15;c.stroke()}
    const px=w*(.08+E.body*.42),py=h*(.17+2*.133);c.fillStyle=ac;c.beginPath();c.arc(px,py,5+a*3,0,6.2832);c.fill();
    c.font='500 9px "BLONDA Mono",monospace';c.fillStyle=rgba(fg,.55);c.fillText('anslag',px+10,py-10);return}
  if(e==='sh101'||e==='mini'){const a=el>=0?Math.exp(-el/(.08+((e==='sh101'?E.D:E.aD)||.4)*.6)):0,N=Math.floor(w/3),mid=h*.52,amp=h*.3*(.25+.75*a),ph=T*2;
    const wv=x=>{const u=(x/w*4+ph)%1;if(e==='sh101'){const pw=.5+.4*(E.pw||0)*Math.sin(T*(.6+(E.lfoR||0)*4)*6.28),saw=1-2*u,pul=u<pw?1:-1,sb=((x/w*2+ph/2)%1)<.5?1:-1;return (saw*E.saw+pul*E.pulse+sb*E.sub*.8)/(E.saw+E.pulse+E.sub*.8+.01)}
      const s1=1-2*u,s2=1-2*((x/w*4*(1+(E.o2f||0)*.01)+ph)%1),u3=(x/w*4*Math.pow(2,(E.o3r??3)-3)+ph)%1,s3=1-2*u3,m1=E.m1on?E.m1:0,m2=E.m2on?E.m2:0,m3=E.m3on?E.m3:0;return (s1*m1+s2*m2+s3*m3)/(m1+m2+m3+.01)};
    c.strokeStyle=rgba(fg,.12);c.lineWidth=1;for(let y=mid-amp;y<=mid+amp+1;y+=amp/2){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}
    const pts=[];for(let i=0;i<=N;i++){const x=i/N*w;pts.push(x,mid-wv(x)*amp)}c.fillStyle=rgba(fg,.85);c.beginPath();for(let i=0;i<pts.length;i+=2){c.moveTo(pts[i]+1.6,pts[i+1]);c.arc(pts[i],pts[i+1],1.6,0,6.2832)}c.fill();
    c.fillStyle=ac;c.font='500 9px "BLONDA Mono",monospace';c.fillText(e==='sh101'?'saw · puls · sub':'osc 1 · osc 2 · osc 3',8,h-8);return}
  if(e==='chip'){const px=Math.max(6,Math.floor(w/48)),cols=Math.floor(w/px),rows=Math.floor(h/px),a=el>=0?Math.max(0,1-el/(.05+E.dec*1.4)):0,duty=[.125,.25,.5,.5][E.duty??1];
    for(let x=0;x<cols;x++){const u=(x/cols*6+T*.8)%1,val=E.duty===3?1-4*Math.abs(u-.5):(u<duty?1:-1),qv=Math.round(val*3)/3,yy=Math.round(rows/2-qv*rows*.3*(.3+.7*a));
      for(let y=0;y<rows;y++){const on=y===yy;c.fillStyle=on?rgba(fg,.95):rgba(fg,.07);c.fillRect(x*px+1,y*px+1,px-2,px-2)}}
    c.fillStyle=fg;c.font='400 11px "BLONDA Pixel",monospace';c.fillText(['PULS 12','PULS 25','FYRKANT','TRIANGEL'][E.duty??1]+' · '+['ACKORD','DUR','MOLL','OKTAV','AV'][E.arpm||0],8,h-8);return}
  if(e==='bris'){const now=performance.now(),N=Math.floor(w/5),mid=h*.5;c.fillStyle=rgba(fg,.08);for(let y=10;y<h;y+=12)for(let x=6;x<w;x+=12){c.beginPath();c.arc(x,y,.9,0,6.283);c.fill()}
    const a=el>=0?Math.max(.18,Math.exp(-el/(.1+brT(E.aR,10)*.6))):.18;for(let k=0;k<3;k++){c.beginPath();for(let i=0;i<=N;i++){const x=i/N*w,u=(x/w*3+T*(.25+k*.03)+k*.13)%1,saw=E.wave?(u<.08+E.pw*.84?1:-1):1-2*u;
      const y=mid-saw*h*.22*a*(1-k*.18)+Math.sin(T*1.3+k*2+x*.01)*h*.02*E.choMix*E.cho;i?c.lineTo(x,y):c.moveTo(x,y)}c.strokeStyle=k?rgba(ac,.35):rgba(fg,.9);c.lineWidth=k?1.2:1.8;c.stroke()}
    c.fillStyle=ac;c.font='500 9px "BLONDA Mono",monospace';c.fillText(['poly 6','mono','unison'][E.vmode]+' · '+(S.brisP?S.brisP.name:'Bris'),8,h-8);return}
  if(e==='super'){const att=.01+E.attack*1.5,rel=.1+E.release*3,gate=stepDur()*(1+p.decay*10);let a=.2;
    if(el>=0&&el<att)a=.2+.8*el/att;else if(el>=att&&el<gate)a=1;else if(el>=gate&&el<gate+rel*1.5)a=.2+.8*Math.exp(-(el-gate)/(rel/3));
    for(let k=0;k<7;k++){const d=(k-3)/3,off=d*E.detune*h*.3*(.4+E.width);c.beginPath();for(let x=0;x<=w;x+=4){const u=x/w;
      const y=h/2+off+Math.sin(u*Math.PI*2*(1.1+k*.07)+T*(.9+d*.35))*h*.14*a+Math.sin(u*Math.PI*5+T*1.7+k)*h*.025*a;x?c.lineTo(x,y):c.moveTo(x,y)}
      c.strokeStyle=k===3?rgba(fg,.95):rgba(k<3?fg:ac,.28+.1*(3-Math.abs(k-3)));c.lineWidth=k===3?2:1.4;c.shadowColor=rgba(ac,.7);c.shadowBlur=k===3?12:6;c.stroke()}
    c.shadowBlur=0;return}}
refreshInst();

