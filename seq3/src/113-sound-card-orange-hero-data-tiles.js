/* ---------------- sound card: orange hero + data tiles ---------------- */
const OR='#EE6A2C',INKC='#1D1D1B';
/* the Ljud card takes the colour of the selected track, eased so switching tracks glides */
let sndRGB=[238,106,44],sndKey='',SINK='255,255,255',TA=OR;const SHI=a=>`rgba(${SINK},${a})`;
function sndTint(){const card=document.querySelector('.card.sndcard');if(!card)return;let t=hex2(TRACKS[S.sel].hex);if((.299*t[0]+.587*t[1]+.114*t[2])/255>.88)t=[35,35,38];
  for(let k=0;k<3;k++)sndRGB[k]+=(t[k]-sndRGB[k])*(RM?1:.16);const c=sndRGB.map(v=>Math.round(v)),key=c.join(',');if(key+'|'+LOOK===sndKey)return;sndKey=key+'|'+LOOK;
  const lum=(.299*c[0]+.587*c[1]+.114*c[2])/255;SINK=lum>.6?'29,29,27':'255,255,255';const tl=hex2(TRACKS[S.sel].hex),tlum=(.299*tl[0]+.587*tl[1]+.114*tl[2])/255;TA=tlum>.88?'#76766F':lum>.8?INKC:`rgb(${key})`;if(LOOK){SINK='236,234,227';TA=tlum>.88?'#B9B8B1':`rgb(${key})`;if(LOOK===1){const H=[[-.574,1.43,.144],[.426,.43,.144],[.426,1.43,-.856]],q=c.map(v=>v/255),pre=H.map(r=>Math.round(255*Math.max(0,Math.min(1,1-(r[0]*q[0]+r[1]*q[1]+r[2]*q[2])))));TA=`rgb(${pre.join(',')})`}}
  card.style.setProperty('--sc',key);card.style.setProperty('--sink',SINK);card.style.setProperty('--sa',LOOK===1&&tlum<=.88?TA.slice(4,-1):LOOK?(tlum>.88?'185,184,177':key):tlum>.88?'118,118,111':lum>.8?'29,29,27':key)}
const SKEY={level:[0,1],tune:[-12,12],decay:[0,1],tone:[0,1],pan:[-1,1],echo:[0,1],space:[0,1]};
function sndSet(k,v){const id=TRACKS[S.sel].id,[a,b]=SKEY[k];S.params[id][k]=clamp(v,a,b);applyTrack(S.sel);save();renderSnd();renderDial()}
function buildTrackKnobs(){const box=$('#trackKnobs');
  if(!box.dataset.built){box.dataset.built='1';box.innerHTML=`<div class="snd-hero" data-k="decay" title="Dra åt sidan">
    <div class="lab"><span>decay</span><small>dra ← →</small></div>
    <div class="snd-hero-row"><div class="snd-big"><b id="sdDec"></b><em>ms</em></div><canvas id="sdChart"></canvas></div><p id="sdText"></p></div>
  <div class="snd-grid">
    <div class="snd-tile wide t-lvl" data-k="level" title="Dra åt sidan"><h4>nivå</h4><div class="lvl-row"><div class="lvl-v"><div class="snd-num" id="sdLvl"></div><span class="snd-word" id="sdLvlW"></span></div><canvas id="sdBurst"></canvas></div></div>
    <div class="snd-tile t-fx" data-k="fx" title="Dra åt sidan: övre stapel echo, nedre space"><h4>echo · space</h4><div class="snd-num" id="sdFx"></div><canvas id="sdBars"></canvas></div>
    <div class="snd-tile t-tune" data-k="tune" title="Dra upp/ner"><h4>tune</h4><div class="snd-num" id="sdTune"></div><canvas id="sdStep"></canvas></div>
    <div class="snd-tile wide t-pan" data-k="pan" title="Dra åt sidan"><h4>pan</h4><div class="pan-row"><div class="snd-num" id="sdPan"></div><canvas id="sdPanC"></canvas></div></div>
  </div>`;
    box.querySelectorAll('[data-k]').forEach(el=>{const k=el.dataset.k;let x0=0,y0=0,v0=0,key=k,lastTap=0;
      el.addEventListener('pointerdown',e=>{e.preventDefault();initAudio();el.setPointerCapture(e.pointerId);x0=e.clientX;y0=e.clientY;const id=TRACKS[S.sel].id,P=S.params[id];
        if(k==='fx'){const cv=el.querySelector('canvas').getBoundingClientRect();key=e.clientY>cv.top+cv.height/2?'space':'echo'}else key=k;
        const now=performance.now();if(now-lastTap<300){pushHist();if(k==='fx'){sndSet('echo',DEF_P[id].echo);sndSet('space',DEF_P[id].space)}else sndSet(key,DEF_P[id][key]);lastTap=0;return}lastTap=now;
        v0=P[key];el.classList.add('act')});
      el.addEventListener('pointermove',e=>{if(!el.hasPointerCapture(e.pointerId)||!el.classList.contains('act'))return;const dx=e.clientX-x0,dy=e.clientY-y0;
        if(key==='decay')sndSet(key,v0+dx/260);else if(key==='level')sndSet(key,v0+dx/260-dy/260);else if(key==='tone')sndSet(key,v0-dy/180);
        else if(key==='tune')sndSet(key,Math.round(v0-dy/14));else if(key==='pan')sndSet(key,v0+dx/150);else sndSet(key,v0+dx/220)});
      const up=()=>{if(el.classList.contains('act')){el.classList.remove('act');audition(S.sel)}};el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
      const kk=e=>{if(k!=='fx')return k;const cv=el.querySelector('canvas');if(!e||!cv)return 'echo';const r=cv.getBoundingClientRect();return e.clientY>r.top+r.height/2?'space':'echo'};
      mlReg(el,{key:e=>'p.'+TRACKS[S.sel].id+'.'+kk(e),label:e=>kk(e)+' · '+TRACKS[S.sel].name.toLowerCase(),range:e=>SKEY[kk(e)],int:k==='tune',paint:renderSnd})})}
  const kb=$('#trackKnobs2');if(kb&&!kb.dataset.built){kb.dataset.built='1';
    kb.innerHTML=`<div class="dl-top"><div class="dl-big" id="dlBig"></div><div class="dl-lab" id="dlLab"></div><div class="dl-desc" id="dlDesc"></div>
      <div class="dl-ruler" id="dlRuler" title="Dra åt sidan för finjustering"><canvas id="dlRulerC"></canvas><i></i></div><div class="dl-dots" id="dlDots"></div></div>
      <div class="dl-bot"><div class="dl-list" id="dlList"></div><div class="dl-disc" id="dlDisc" title="Dra upp/ner"><canvas id="dlRing"></canvas><div class="dl-knob" id="dlKnob"><i></i></div></div></div>`;
    DLP.forEach(([k,l])=>{const it=document.createElement('div');it.className='dl-it';it.dataset.k=k;it.title='Tryck för att välja · dra upp/ner';
      it.innerHTML=`<span class="dl-mini"><i></i></span><b></b><small>${l}</small>`;$('#dlList').appendChild(it);
      const d=document.createElement('button');d.dataset.k=k;d.setAttribute('aria-label',l);$('#dlDots').appendChild(d);d.onclick=()=>{dlK=k;renderDial()};dlDrag(it,'y',k);
      mlReg(it,{key:()=>'f.'+TRACKS[S.sel].id+'.'+k,label:()=>l+' · '+TRACKS[S.sel].name.toLowerCase(),min:FXR[k][0],max:FXR[k][1],paint:renderDial})});
    dlDrag($('#dlDisc'),'y',null);dlDrag($('#dlRuler'),'x',null);
    [$('#dlDisc'),$('#dlRuler')].forEach(el=>mlReg(el,{key:()=>'f.'+TRACKS[S.sel].id+'.'+dlK,label:()=>(DLP.find(x=>x[0]===dlK)||[0,dlK])[1]+' · '+TRACKS[S.sel].name.toLowerCase(),range:()=>FXR[dlK],paint:renderDial}))}
  if(kb)renderDial();
  renderSnd()}
const DLP=[['drive','drive'],['filt','filter'],['reso','reso'],['crush','crush'],['comp','komp'],['pump','pump']];
const FXR={drive:[0,1],filt:[-1,1],reso:[0,1],crush:[0,1],comp:[0,1],pump:[0,1.5]};
const dlGet=k=>tfxOf(TRACKS[S.sel].id)[k];
function dlSet(k,v){const [a,b]=FXR[k];let x=clamp(v,a,b);if(k==='filt'&&Math.abs(x)<.03)x=0;tfxOf(TRACKS[S.sel].id)[k]=+x.toFixed(4);applyTfx(S.sel);save();renderDial()}
let dlK='drive';
const dlFmt=(k,v)=>k==='filt'?(Math.abs(v)<.02?'AV':(v<0?'LP':'HP')+Math.round(Math.abs(v)*100)):v<.005?'AV':String(Math.round(v*100));
const dlNorm=(k,v)=>{const [a,b]=FXR[k];return (v-a)/(b-a)};
function dlDrag(el,ax,fixed){let x0=0,y0=0,v0=0,key='drive',lastTap=0,moved=false;
  el.addEventListener('pointerdown',e=>{e.preventDefault();initAudio();el.setPointerCapture(e.pointerId);key=fixed||dlK;if(fixed&&dlK!==fixed){dlK=fixed;renderDial()}
    const now=performance.now();if(now-lastTap<300){pushHist();dlSet(key,0);lastTap=0;audition(S.sel);return}lastTap=now;pushHist();
    x0=e.clientX;y0=e.clientY;v0=dlGet(key);moved=false;el.classList.add('act')});
  el.addEventListener('pointermove',e=>{if(!el.classList.contains('act'))return;const [a,b]=FXR[key];
    if(ax==='x'){const unit=key==='filt'?.02:.01,d=-(e.clientX-x0)/7*unit;if(Math.abs(e.clientX-x0)>2)moved=true;dlSet(key,v0+d)}
    else{const dy=y0-e.clientY;if(Math.abs(dy)>2)moved=true;dlSet(key,v0+dy/170*(b-a))}});
  const up=()=>{if(el.classList.contains('act')){el.classList.remove('act');if(moved)audition(S.sel)}};el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)}
const FXD={drive:'mättnad och värme',filt:'vänster lowpass · höger highpass',reso:'resonans i filtret',crush:'bitreducering',comp:'jämnar ut och trycker ihop',pump:'duckar mot kicken'};
function renderDial(){if(!$('#dlBig'))return;const P=tfxOf(TRACKS[S.sel].id),tc=hex2(TRACKS[S.sel].hex),acc=(.299*tc[0]+.587*tc[1]+.114*tc[2])/255>.88?'#F2C318':TRACKS[S.sel].hex;
  const card=document.querySelector('.card[data-card="knobs"]');if(card)card.style.setProperty('--fxc',acc);const nAct=DLP.filter(([k])=>Math.abs(P[k])>.005).length;
  if($('#dlDesc'))$('#dlDesc').textContent=FXD[dlK];
  setDM($('#dlBig'),dlFmt(dlK,P[dlK]),52);$('#dlBig').classList.toggle('over',dlK==='pump'&&P.pump>1.0049);$('#dlLab').textContent=DLP.find(x=>x[0]===dlK)[1];$('#knobTitle2').textContent=TRACKS[S.sel].name.toLowerCase()+(nAct?' · '+nAct+' aktiv'+(nAct>1?'a':''):'');
  document.querySelectorAll('#dlList .dl-it').forEach(it=>{const k=it.dataset.k,v=P[k];it.classList.toggle('on',k===dlK);it.classList.toggle('live',Math.abs(v)>.005);it.querySelector('b').textContent=dlFmt(k,v);it.classList.toggle('over',k==='pump'&&v>1.0049);it.style.setProperty('--a',(-135+dlNorm(k,v)*270)+'deg')});
  document.querySelectorAll('#dlDots button').forEach(d=>d.classList.toggle('on',d.dataset.k===dlK));
  $('#dlKnob').style.setProperty('--a',(-135+dlNorm(dlK,P[dlK])*270)+'deg')}
function drawDial(){const rc=$('#dlRulerC');if(!rc||!rc.clientWidth)return;const v=dlGet(dlK);
  let f=fit(rc);if(f){const {c,w,h}=f,cx=w/2,unit=dlK==='filt'?.02:.01,px=7,maj=dlK==='filt'?5:10,[a,b]=FXR[dlK];
    const n0=Math.ceil((v-(cx/px)*unit)/unit-1e-6),n1=Math.floor((v+(cx/px)*unit)/unit+1e-6);
    for(let n=n0;n<=n1;n++){const tv=n*unit;if(tv<a-1e-9||tv>b+1e-9)continue;const x=cx+(tv-v)/unit*px,big=Math.round(n)%maj===0,fade=Math.max(.12,1-Math.abs(x-cx)/cx);
      c.fillStyle=tv>1.0001?`rgba(255,59,47,${((big?.9:.55)*fade).toFixed(3)})`:`rgba(255,255,255,${((big?.6:.3)*fade).toFixed(3)})`;const hh=big?h*.66:h*.42;c.fillRect(Math.round(x),(h-hh)/2,1.3,hh)}}
  f=fit($('#dlRing'));if(f){const {c,w,h}=f,cx=w/2,cy=h/2,R=Math.min(w,h)/2-2,N=44,lit=dlNorm(dlK,v),bi=dlK==='filt',lo=bi?Math.min(.5,lit):0,hi=bi?Math.max(.5,lit):lit;
    for(let i=0;i<N;i++){const t=i/(N-1),an=(135+t*270)*Math.PI/180,on=t>=lo-1e-6&&t<=hi+1e-6&&(lit>0||bi),len=i%4===0?9:6;
      const over=dlK==='pump'&&t*FXR[dlK][1]>1.0001;c.strokeStyle=on?(over?'#FF3B2F':'rgba(255,255,255,.92)'):(over?'rgba(255,59,47,.3)':'rgba(255,255,255,.17)');c.lineWidth=1.5;c.lineCap='round';c.beginPath();c.moveTo(cx+Math.cos(an)*(R-len),cy+Math.sin(an)*(R-len));c.lineTo(cx+Math.cos(an)*R,cy+Math.sin(an)*R);c.stroke()}}}
function renderSnd(){const id=TRACKS[S.sel].id,P=S.params[id],set=(i,h)=>{const e=document.getElementById(i);if(e&&e.innerHTML!==h)e.innerHTML=h};if(!document.getElementById('sdDec'))return;
  set('sdDec',String(Math.round(60+P.decay*940)));
  set('sdText',P.decay<.25?'Kort och tight. Ger luft mellan slagen och håller groovet stramt.':P.decay<.6?'Balanserad svans. Sitter i groovet utan att ta över.':'Lång svans. Fyller ut rummet och svävar in i nästa slag.');
  set('sdLvl',String(Math.round(P.level*100)));set('sdLvlW',P.level<.3?'svag':P.level<.7?'medel':'stark');
  set('sdTone',Math.round(P.tone*100)+'<em>%</em>');set('sdToneW',P.tone<.33?'mörk':P.tone<.66?'rund':'ljus');
  set('sdFx',Math.round(P.echo*100)+'<em>/</em>'+Math.round(P.space*100)+'<em>%</em>');
  set('sdTune',(P.tune>=.5?'+':'')+Math.round(P.tune)+'<em>st</em>');
  set('sdPan',Math.abs(P.pan)<.02?'C':(P.pan<0?'L':'R')+Math.round(Math.abs(P.pan)*100))}
function drawSnd(now){sndTint();const ch=$('#sdChart');if(!ch||!ch.clientWidth)return;const id=TRACKS[S.sel].id,P=S.params[id],row=S.pats[S.pat][S.sel];
  // hero: this track's bar, each hit decaying with the decay setting
  let f=fit(ch);if(f){const {c,w,h}=f,tau=.15+P.decay*2.2,N=180,pts=[];let mx=0;
    for(let i=0;i<=N;i++){const x=i/N*16;let a=0;for(let k=0;k<16;k++){const v=row[k].v?(row[k].v===2?1:.72):0;if(!v)continue;for(const s0 of [k,k-16]){const d=x-s0;if(d>=0)a+=v*Math.exp(-d/tau)}}
      a+=Math.sin(i*1.7)*.015;pts.push(a);mx=Math.max(mx,a)}
    mx=Math.max(mx,.5);const Y=a=>h-6-(a/mx)*(h-22),X=i=>i/N*w;
    c.strokeStyle=SHI(.95);c.lineWidth=1.2;c.lineJoin='round';c.beginPath();pts.forEach((a,i)=>i?c.lineTo(X(i),Y(a)):c.moveTo(X(i),Y(a)));c.stroke();
    const peaks=[];for(let k=0;k<16;k++)if(row[k].v){const i=Math.round(k/16*N);peaks.push([i,pts[i],k])}
    peaks.sort((a,b)=>b[1]-a[1]).slice(0,4).forEach(([i,a,k])=>{c.fillStyle=SHI(1);const lx=Math.min(X(i)+3,w-34);c.font='300 10px "BLONDA Sans",system-ui';c.fillText(String(k+1),lx,Y(a)-4);const tw=c.measureText(String(k+1)).width;c.font='300 7px "BLONDA Sans",system-ui';c.globalAlpha=.75;c.fillText('steg',lx+tw+2,Y(a)-4);c.globalAlpha=1});
    if(playing&&curStep>=0){const pp=playPos()||curStep,i=Math.round(pp/16*N)%(N+1),x=X(i),y=Y(pts[i]);c.fillStyle=SHI(.25);c.fillRect(x,0,1,h);
      c.fillStyle=SHI(1);c.beginPath();c.arc(x,y,3.5,0,6.2832);c.fill();c.fillStyle=SHI(.3);c.beginPath();c.arc(x,y,8,0,6.2832);c.fill()}}
  // level: radial burst
  f=$('#sdBurst')&&fit($('#sdBurst'));if(f){const {c,w,h}=f,N=Math.max(18,Math.floor(w/9)),bw=w/N,hh=hitT.get(S.sel),pulse=hh&&ctx?Math.max(0,1-(ctx.currentTime-hh.t)/.3):0,lv=P.level;
    for(let i=0;i<N;i++){const u=(i+.5)/N,bh=6+(h-16)*Math.pow(u,1.25),x=i*bw+bw*.18,on=u<=lv,y=h-12-bh;
      c.globalAlpha=on?(.55+.45*u)+(pulse*(u<=lv?.35:0)):1;c.fillStyle=on?TA:'rgba(29,29,27,.08)';
      const r=Math.min(3,bw*.32);c.beginPath();c.roundRect?c.roundRect(x,y,bw*.64,bh,r):c.rect(x,y,bw*.64,bh);c.fill()}
    c.globalAlpha=1;const xl=lv*w;c.fillStyle=INKC;c.fillRect(Math.min(w-1.5,xl),2,1.5,h-12);
    c.font='500 8px "BLONDA Mono",monospace';c.fillStyle='rgba(29,29,27,.45)';c.textBaseline='alphabetic';[['0',0],['50',.5],['100',1]].forEach(([t,u])=>{c.textAlign=u===0?'left':u===1?'right':'center';c.fillText(t,u*w,h-1)});c.textAlign='left'}
  // echo / space: stacked bars
  f=fit($('#sdBars'));if(f){const {c,w,h}=f,bh=(h-6)/2,rows=[['echo',P.echo,TA],['space',P.space,INKC]];
    rows.forEach(([l,v,col],j)=>{const y=j*(bh+6);c.fillStyle='rgba(29,29,27,.08)';c.fillRect(0,y,w,bh);c.fillStyle=col;c.fillRect(0,y,Math.max(2,w*v),bh);
      for(let x=w*v+6;x<w;x+=6){c.fillStyle='rgba(29,29,27,.12)';c.fillRect(x,y+bh/2,2,1)}
      c.fillStyle=v>.25?'rgba(255,255,255,.9)':'rgba(29,29,27,.6)';c.font='300 10px "BLONDA Sans",system-ui';c.fillText(l,v>.25?6:w*v+8,y+bh/2+3.5)})}
  // tune: step line of this track's pitches
  f=fit($('#sdStep'));if(f){const {c,w,h}=f,mel=TRACKS[S.sel].mel;let ps=[],last=null;
    for(let k=0;k<16;k++){const cl=row[k];if(mel&&cl.v)last=cl.n;ps.push((mel?(last??firstNote(S.sel)):60)+P.tune)}
    const lo=Math.min(...ps)-3,hi=Math.max(...ps)+3,Y=v=>h-4-(v-lo)/(hi-lo)*(h-10),sw=w/16;
    c.setLineDash([2,4]);c.strokeStyle='rgba(29,29,27,.2)';c.beginPath();c.moveTo(0,Y((mel?ps[0]-P.tune:60)));c.lineTo(w,Y((mel?ps[0]-P.tune:60)));c.stroke();c.setLineDash([]);
    c.strokeStyle=INKC;c.lineWidth=1.4;c.beginPath();ps.forEach((v,k)=>{const x=k*sw,y=Y(v);if(!k)c.moveTo(x,y);else c.lineTo(x,y);c.lineTo(x+sw,y)});c.stroke();
    c.fillStyle=TA;c.beginPath();c.arc(w-3,Y(ps[15]),3.6,0,6.2832);c.fill()}
  // pan: horizontal scale
  f=fit($('#sdPanC'));if(f){const {c,w,h}=f,cy=h/2,X=v=>8+(v+1)/2*(w-16),xv=X(P.pan);
    for(let i=0;i<=40;i++){const x=8+i/40*(w-16),big=i%10===0;c.fillStyle='rgba(29,29,27,'+(big?.55:.22)+')';c.fillRect(x,cy-(big?8:4),1,big?16:8)}
    c.font='300 9px "BLONDA Sans",system-ui';c.fillStyle='rgba(29,29,27,.5)';c.fillText('L',8,h-1);c.fillText('R',w-14,h-1);
    c.fillStyle=INKC;c.fillRect(Math.min(X(0),xv),cy-.75,Math.abs(xv-X(0)),1.5);c.fillStyle=TA;c.beginPath();c.arc(xv,cy,5.5,0,6.2832);c.fill()}}
const mBox=$('#masterKnobs');
const masterKnobs=[['Filter',-1,1,0,'var(--yellow)','filter',v=>Math.abs(v)<.03?'Av':(v<0?'LP ':'HP ')+Math.round(Math.abs(v)*100),1],
 ['Echo',0,1,.38,'var(--green)','echo',pct,1],['Space',0,1,.4,'var(--pink)','space',pct,1],['Tape',0,1,.12,'var(--orange)','drive',pct,1],
 ['Swing',0,.6,.12,'var(--lilac)','swing',v=>Math.round(50+v*41.6)+'%',0],['Pump',0,1.5,.4,'var(--sage)','pump',pct,0],['Volym',0,1,.75,'var(--red)','vol',pct,1]]
 .map(([label,min,max,def,color,key,fmt,ap])=>knob(mBox,{label,min,max,def,color,fmt,ml:'m.'+key,mll:label.toLowerCase()+' · master',get:()=>S.master[key],set:v=>{S.master[key]=key==='filter'&&Math.abs(v)<.03?0:v;if(ap)applyMaster();save();renderPlugs()}}));

