/* ================= sample editor: trim the start/end, fades, reverse, gain – per track, never destroys the file ================= */
if(!S.se)S.se={};
/* an edit belongs to the sample it was made on: a new sound on the track starts from scratch */
function seCur(tid){const dm=S.dk[tid]||'';return dm.startsWith('smp:')?dm.slice(4):''}
function seGet(tid){const e=S.se[tid];if(e&&e.sid===undefined&&seCur(tid))e.sid=seCur(tid);if(e&&e.sid!==seCur(tid)){delete S.se[tid];return {st:0,en:1,fi:0,fo:0,rev:0,g:0}}return e||{st:0,en:1,fi:0,fo:0,rev:0,g:0}}
{const _ah=assignHit;assignHit=function(sm,i){const id=TRACKS[i].id;if(S.se[id]&&S.se[id].sid!==sm.id)delete S.se[id];return _ah.apply(this,arguments)}}
function revBuf(sm){if(sm.rbuf&&sm.rbuf._src===sm.buf)return sm.rbuf;const b=sm.buf,r=ctx.createBuffer(b.numberOfChannels,b.length,b.sampleRate);
  for(let c=0;c<b.numberOfChannels;c++){const s=b.getChannelData(c),d=r.getChannelData(c),n=s.length;for(let k=0;k<n;k++)d[k]=s[n-1-k]}r._src=b;sm.rbuf=r;return r}
/* onsets (for "next hit"): a short energy envelope, a hit = a clear jump above what came just before */
function seOnsets(sm){if(sm.ons&&sm.ons._b===sm.buf)return sm.ons;const b=sm.buf,sr=b.sampleRate,hop=Math.max(1,Math.round(sr*.002)),c0=b.getChannelData(0),c1=b.numberOfChannels>1?b.getChannelData(1):c0,N=Math.floor(b.length/hop),env=new Float32Array(N);let mx=0;
  for(let k=0;k<N;k++){let e=0;for(let j=k*hop,J=Math.min(b.length,j+hop*2);j<J;j++){const v=(c0[j]+c1[j])*.5;e+=v*v}env[k]=Math.sqrt(e/(hop*2));if(env[k]>mx)mx=env[k]}
  const out=[];let last=-1e9;for(let k=3;k<N;k++){let pre=0;for(let q=Math.max(0,k-10);q<k;q++)pre=Math.max(pre,env[q]);if(env[k]>mx*.06&&env[k]>pre*1.9+mx*.01&&k-last>15){out.push(k*hop/sr);last=k}}
  out._b=b;sm.ons=out;return out}
function seZero(sm,t){const b=sm.buf,sr=b.sampleRate,d=b.getChannelData(0),i0=Math.round(t*sr),w=Math.round(sr*.003);let best=i0,bd=1e9;
  for(let k=Math.max(1,i0-w);k<Math.min(d.length-1,i0+w);k++)if((d[k-1]<=0&&d[k]>0)||(d[k-1]>=0&&d[k]<0)){const dd=Math.abs(k-i0);if(dd<bd){bd=dd;best=k}}return best/sr}

/* chop: a sample cut into up to 16 slices; a step plays slice st.c (or its own step number), pads play any slice */
if(!S.chop)S.chop={};
let CHOPK=null;
/* (v267) the step being played, while it plays: its sample fx – so = start 0–15 (sixteenths of the sound), rv = reverse,
   pt = pitch in semitones (works on every drum, see trigger0), gl = glide: the pitch slides by gl semitones over the sound */
let SFX=null;
function chopOf(tid){const c=S.chop[tid];return c&&c.sid===seCur(tid)&&c.cuts&&c.cuts.length?c:null}
function chopAuto(sm,mode){const d=sm.buf.duration;let cuts;
  if(mode==='slag'){const o=seOnsets(sm).filter(t=>t>.01);cuts=[0];o.forEach(t=>{if(cuts.length<16)cuts.push(seZero(sm,Math.max(0,t-.002))/d)})}
  else{cuts=[];for(let k=0;k<mode;k++)cuts.push(k?seZero(sm,k/mode*d)/d:0)}
  return cuts}
function chopHit(i,k){initAudio();ctx.resume();CHOPK=k;trigger(i,ctx.currentTime+.005,.9,firstNote(i));CHOPK=null;
  if(recording&&playing){pushHist();const s=((Math.round((ctx.currentTime-startT)/stepDur())%16)+16)%16,cell=S.pats[S.pat][i][s];cell.v=Math.max(cell.v,1);cell.c=k;renderCells();save()}}
function chopToPattern(i){const t=TRACKS[i],C=chopOf(t.id),sm=C&&SMP.get(C.sid);if(!C||!sm||!sm.buf)return;pushHist();const row=S.pats[S.pat][i],n=C.cuts.length,bars=sm.kind==='loop'?(sm.bars||1):0;
  row.forEach(c=>{c.v=0;delete c.c;delete c.r;delete c.p;delete c.vel;delete c.o});
  C.cuts.forEach((f,k)=>{const s=bars?Math.round(f*bars*16):Math.round(k*16/n);if(s>=0&&s<16){row[s].v=1;row[s].c=k}});
  if(S.len)delete S.len[t.id];renderCells();if(typeof renderLens==='function')renderLens();save();toast(n+' delar utlagda i mönstret')}
function chopBtn(sm,ch){const b=document.createElement('button');b.className='chopb';b.textContent='✂ chop';b.title='Hacka upp ljudet i delar och spela dem på pads';
  b.onclick=async e=>{e.stopPropagation();let i=-1;const L=$('#lib');if(typeof libTarget!=='undefined'&&libTarget&&libTarget.type==='drum')i=libTarget.i;
    if(i<0)i=TRACKS.findIndex(t=>t.id==='perc');if(i<0)i=5;initAudio();await ensureBuf(sm);if(!sm.buf){toast('Kunde inte läsa ljudet');return}
    const x=$('#libX');if(x)x.click();assignHit(sm,i);const id=TRACKS[i].id;S.chop[id]={sid:sm.id,cuts:chopAuto(sm,sm.kind==='loop'||sm.buf.duration>1.2?16:'slag')};
    Object.assign(S.params[id],{decay:1,tone:.5,tune:0});save();toast(sm.name+' hackad på '+TRACKS[i].name.toLowerCase());openSampleEditor(i)};ch.appendChild(b)}

/* the voice: same as before plus start/end, fades, reverse and gain */
smpVoice=function(id,t,v,p,out,tid){const sm=SMP.get(id);if(!sm||!sm.buf){ensureBuf(sm);return}
  const E=seGet(tid),D=sm.buf.duration,CC=chopOf(tid);let st,en,ck=CHOPK;CHOPK=null;
  if(CC){const n=CC.cuts.length;ck=(((ck|0)%n)+n)%n;st=CC.cuts[ck]*D;en=Math.max(st+.002,(ck+1<n?CC.cuts[ck+1]:1)*D);if(SE.open&&SE.tid===tid)SE.lastK={k:ck,t:ctx.currentTime}}
  else{st=clamp(E.st,0,1)*D;en=Math.max(st+.002,clamp(E.en,0,1)*D)}
  /* the step's start position skips into the sound the way it plays (forwards from the start, backwards from the end) */
  const fx=SFX,skip=fx&&fx.so?(en-st)*Math.min(15,fx.so)/16:0;
  const rv=!!E.rev!==!!(fx&&fx.rv),buf=rv?revBuf(sm):sm.buf,off=(rv?D-en:st)+skip;
  const rate=Math.pow(2,p.tune/12),len=(en-st-skip)/rate,src=ctx.createBufferSource(),g=ctx.createGain(),lp=ctx.createBiquadFilter(),hp=ctx.createBiquadFilter();
  src.buffer=buf;src.playbackRate.value=rate;lp.type='lowpass';hp.type='highpass';const tn=p.tone;
  lp.frequency.value=tn>=.5?20000:180*Math.pow(110,tn*2);hp.frequency.value=tn<=.5?18:18*Math.pow(45,(tn-.5)*2);
  const end=p.decay>=.97?len:Math.min(len,.025+Math.pow(p.decay,1.7)*2.6),lv=v*(sm.norm||1)*.95*Math.pow(10,(E.g||0)/20),fi=Math.min(end*.9,(E.fi||0)/1000/rate),fo=Math.min(end-fi,Math.max(CC?.003:0,(E.fo||0)/1000)/rate);
  if(fi>.0005){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(lv,t+fi)}else g.gain.setValueAtTime(lv,t);
  if(fo>.0005){g.gain.setValueAtTime(lv,t+end-fo);g.gain.linearRampToValueAtTime(0,t+end)}
  else{g.gain.setValueAtTime(lv,Math.max(t+fi,t+end*.55));g.gain.exponentialRampToValueAtTime(.0001,t+end)}
  if(fx&&fx.gl){src.playbackRate.setValueAtTime(rate,t);src.playbackRate.exponentialRampToValueAtTime(rate*Math.pow(2,clamp(fx.gl,-24,24)/12),t+Math.max(.03,end))}
  src.connect(lp);lp.connect(hp);hp.connect(g);g.connect(out);src.start(t,Math.max(0,off));src.stop(t+end+.02);
  if(tid==='hat'||tid==='ohat')hatChoke(g,tid==='ohat',t);if(tid==='kick')pump(t);
  if(SE.open&&SE.tid===tid)SE.play={t,rate,st,en,end,rev:rv}};

const SE={open:false,i:-1,tid:'',sm:null,v0:0,v1:1,drag:null,play:null,raf:0};
(()=>{const box=document.createElement('div');box.className='sed';box.id='sed';box.hidden=true;box.setAttribute('role','dialog');box.setAttribute('aria-label','Sampeleditor');
  box.innerHTML=`<div class="sed-in">
  <div class="sed-h"><span class="dot" id="sedDot"></span><div class="sed-t"><h3 id="sedName">sampel</h3><small id="sedSub"></small></div>
    <button class="sed-x" id="sedX" aria-label="Stäng"><svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8"/></svg></button></div>
  <div class="sed-wave" id="sedWave"><canvas id="sedC"></canvas><div class="sed-hint">dra i <b>start</b> och <b>slut</b> · trianglarna högst upp är <b>fade</b> · nyp eller scrolla för att zooma · tryck i vågen för att lyssna därifrån</div></div>
  <div class="sed-ov" id="sedOv"><canvas id="sedO"></canvas></div>
  <div class="sed-read" id="sedRead"></div>
  <div class="sed-k" id="sedK"></div>
  <div class="sed-bar">
    <button class="sed-b big" id="sedPlay"><svg viewBox="0 0 16 16"><path d="M4.5 3v10l8.5-5z"/></svg><span>spela</span></button>
    <button class="sed-b" id="sedPrev" title="Starten till förra slaget">← slag</button>
    <button class="sed-b" id="sedNext" title="Starten till nästa slag – tar bort flam och förslag">slag →</button>
    <button class="sed-b" id="sedZin">zoom +</button><button class="sed-b" id="sedZout">zoom −</button><button class="sed-b" id="sedZfit">hela</button>
    <button class="sed-b tog" id="sedSnap" title="Klistra start och slut mot nollgenomgångar (inga klick)">noll</button>
    <button class="sed-b tog" id="sedRev">baklänges</button>
    <button class="sed-b tog chop" id="sedChop" title="Hacka upp ljudet i delar">✂ chop</button>
  </div>
  <div class="sed-cbar" id="sedCBar" hidden><span class="sed-cl">dela upp</span>
    <button class="sed-b" data-ch="slag" title="En del per slag">efter slag</button><button class="sed-b" data-ch="4">4</button><button class="sed-b" data-ch="8">8</button><button class="sed-b" data-ch="16">16</button>
    <button class="sed-b" id="sedCPat" title="Lägg ut delarna i ordning i mönstret">→ mönster</button>
    <span class="sed-ct" id="sedCt"></span></div>
  <div class="sed-pads" id="sedPads" hidden></div>
  <div class="sed-bar sed-ckb" id="sedCk"><span class="sed-cl">choke</span>
    <button class="sed-b tog" data-ck="">av</button><button class="sed-b tog" data-ck="on" title="Spåren med choke på stryper varandra">på</button>
    <span class="sed-ckh" id="sedCkH"></span></div>
  <div class="sed-bar sed-sl">
    <label>gain <input type="range" id="sedGain" min="-12" max="12" step="0.5"><em id="sedGainV"></em></label>
    <button class="sed-b tog" id="sedMute">mute</button><button class="sed-b" id="sedReset">återställ klipp</button><button class="sed-b ok" id="sedOk">klar</button>
  </div></div>`;
  document.body.appendChild(box);
  const C=$('#sedC'),O=$('#sedO'),W=$('#sedWave');let snap=true;try{snap=localStorage.getItem('seq3-sesnap')!=='0'}catch(e){globalThis.__el&&globalThis.__el(e)}
  const E=()=>{let e=S.se[SE.tid];if(e&&e.sid===undefined)e.sid=SE.sm.id;if(e&&e.sid!==SE.sm.id)e=null;if(!e)e=S.se[SE.tid]={st:0,en:1,fi:0,fo:0,rev:0,g:0,sid:SE.sm.id};return e};
  const D=()=>SE.sm&&SE.sm.buf?SE.sm.buf.duration:1;
  const ms=x=>x<1?Math.round(x*1000)+' ms':x.toFixed(2)+' s';
  const x2t=(x,w)=>SE.v0+(x/w)*(SE.v1-SE.v0),t2x=(t,w)=>(t-SE.v0)/(SE.v1-SE.v0)*w;
  function size(cv){const r=cv.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);if(cv.width!==Math.round(r.width*dpr)||cv.height!==Math.round(r.height*dpr)){cv.width=Math.round(r.width*dpr);cv.height=Math.round(r.height*dpr)}return [cv.width,cv.height,dpr]}
  function col(){const dots=document.body.classList.contains('look-dots');return dots?{bg:'#17181A',w:'#E8E6DC',dim:'rgba(232,230,220,.35)',out:'rgba(23,24,26,.75)',acc:'#E8E6DC',fade:'#E8E6DC'}:{bg:'#0E0F11',w:'rgba(240,240,236,.92)',dim:'rgba(240,240,236,.28)',out:'rgba(14,15,17,.72)',acc:'#E2F53C',fade:'#FF9A3C'}}
  function wave(ctx2,w,h,t0,t1,c,mid){const b=SE.sm.buf,sr=b.sampleRate,d0=b.getChannelData(0),d1=b.numberOfChannels>1?b.getChannelData(1):d0,i0=Math.floor(t0*sr),i1=Math.ceil(t1*sr),spp=(i1-i0)/w;
    ctx2.fillStyle=c;ctx2.beginPath();
    if(spp<2){ctx2.strokeStyle=c;ctx2.lineWidth=1.5*(w/ctx2.canvas.width<1?1:1);ctx2.beginPath();for(let x=0;x<w;x++){const k=Math.min(b.length-1,Math.max(0,Math.round(i0+x*spp)));const v=(d0[k]+d1[k])*.5;const y=mid-v*mid*.92;x?ctx2.lineTo(x,y):ctx2.moveTo(x,y)}ctx2.stroke();return}
    for(let x=0;x<w;x++){let a=Math.max(0,Math.floor(i0+x*spp)),z=Math.min(b.length,Math.floor(i0+(x+1)*spp)),mn=0,mx=0;const st=Math.max(1,Math.floor((z-a)/400));for(let k=a;k<z;k+=st){const v=(d0[k]+d1[k])*.5;if(v<mn)mn=v;if(v>mx)mx=v}
      ctx2.rect(x,mid-mx*mid*.92,1,Math.max(1,(mx-mn)*mid*.92))}ctx2.fill()}
  function draw(){if(!SE.open||!SE.sm||!SE.sm.buf)return;const [w,h,dpr]=size(C),g=C.getContext('2d'),e=E(),d=D(),c=col();g.clearRect(0,0,w,h);
    const mid=h/2,st=e.st*d,en=e.en*d,xs=t2x(st,w),xe=t2x(en,w);
    // grid
    g.fillStyle=c.dim;const span=SE.v1-SE.v0,step=[.001,.002,.005,.01,.02,.05,.1,.2,.5,1,2,5].find(s=>span/s<Math.max(3,w/(74*dpr)))||5;g.font=(10*dpr)+'px "BLONDA Mono",monospace';g.textBaseline='top';
    for(let t=Math.ceil(SE.v0/step)*step;t<SE.v1;t+=step){const x=t2x(t,w);g.fillRect(x,h-8*dpr,1,8*dpr);g.fillText(ms(t),x+3*dpr,h-20*dpr)}
    g.fillRect(0,mid,w,1);
    wave(g,w,h,SE.v0,SE.v1,c.w,mid);
    const CC=chopOf(SE.tid);
    if(CC){const n=CC.cuts.length,ed=k=>(k+1<n?CC.cuts[k+1]:1)*d,lk=SE.lastK&&ctx&&ctx.currentTime-SE.lastK.t<.25?SE.lastK.k:-1;
      if(CC.cuts[0]>0){g.fillStyle=c.out;g.fillRect(0,0,Math.max(0,t2x(CC.cuts[0]*d,w)),h)}
      for(let k=0;k<n;k++){const a=t2x(CC.cuts[k]*d,w),z=t2x(ed(k),w);if(z<0||a>w)continue;
        if(k%2||k===lk){g.fillStyle=k===lk?c.acc:c.w;g.globalAlpha=k===lk?.22:.06;g.fillRect(a,0,z-a,h);g.globalAlpha=1}
        g.fillStyle=c.acc;g.fillRect(a-1*dpr,0,2*dpr,h);const lb=String(k+1),tw=g.measureText(lb).width+10*dpr;g.fillRect(a,0,tw,18*dpr);g.fillStyle=c.bg;g.fillText(lb,a+5*dpr,4*dpr)}}
    else{
    // outside the kept part
    g.fillStyle=c.out;if(xs>0)g.fillRect(0,0,Math.max(0,xs),h);if(xe<w)g.fillRect(Math.max(0,xe),0,w-Math.max(0,xe),h);
    // fades
    const fi=Math.min((e.fi||0)/1000,en-st),fo=Math.min((e.fo||0)/1000,en-st-fi),xfi=t2x(st+fi,w),xfo=t2x(en-fo,w);
    g.strokeStyle=c.fade;g.lineWidth=1.5*dpr;g.beginPath();g.moveTo(xs,h-2);g.lineTo(xfi,2*dpr);g.lineTo(xfo,2*dpr);g.lineTo(xe,h-2);g.stroke();
    g.fillStyle=c.fade;[xfi,xfo].forEach(x=>{g.beginPath();g.moveTo(x-9*dpr,0);g.lineTo(x+9*dpr,0);g.lineTo(x,14*dpr);g.closePath();g.fill()});
    // start / end
    g.fillStyle=c.acc;[[xs,'start'],[xe,'slut']].forEach(([x,l],k)=>{g.fillRect(x-1*dpr,0,2*dpr,h);const tw=g.measureText(l).width+12*dpr,bx=k?x-tw:x;g.fillRect(bx,h-44*dpr,tw,18*dpr);g.fillStyle=c.bg;g.fillText(l,bx+6*dpr,h-40*dpr);g.fillStyle=c.acc});
    }
    // onsets
    if(SE.sm.ons){g.fillStyle=c.dim;SE.sm.ons.forEach(t=>{const x=t2x(t,w);if(x>0&&x<w)g.fillRect(x-2*dpr,mid-2*dpr,4*dpr,4*dpr)})}
    // playhead
    const P=SE.play;if(P&&ctx){const el=(ctx.currentTime-P.t)*P.rate;if(el>=0&&el<=P.end*P.rate+.02){const pt=P.rev?P.en-el:P.st+el,x=t2x(pt,w);g.fillStyle=c.w;g.fillRect(x,0,1.5*dpr,h)}}
    // overview
    {const [ow,oh]=size(O),o=O.getContext('2d');o.clearRect(0,0,ow,oh);wave(o,ow,oh,0,d,c.dim,oh/2);const a=SE.v0/d*ow,z=SE.v1/d*ow;o.fillStyle=c.w;o.globalAlpha=.14;o.fillRect(a,0,z-a,oh);o.globalAlpha=1;o.fillStyle=c.acc;o.fillRect(e.st*ow,0,2,oh);o.fillRect(e.en*ow-2,0,2,oh)}
    if(CC){const n=CC.cuts.length;$('#sedRead').innerHTML=`<span><b>${n}</b> del${n>1?'ar':''}</span><span>tryck i en del = lyssna · dra i en siffra = flytta snittet · dubbeltryck = nytt snitt / ta bort</span>`;$('#sedCt').textContent=n+' / 16';chopPadsPaint(CC)}
    else $('#sedRead').innerHTML=`<span>start <b>${ms(st)}</b></span><span>slut <b>${ms(en)}</b></span><span>längd <b>${ms(en-st)}</b></span><span>fade in <b>${Math.round(e.fi||0)} ms</b></span><span>fade ut <b>${Math.round(e.fo||0)} ms</b></span>`;
    $('#sedGainV').textContent=(e.g>0?'+':'')+(+e.g||0).toFixed(1)+' dB';$('#sedRev').classList.toggle('on',!!e.rev);$('#sedChop').classList.toggle('on',!!CC);{const hn=W.querySelector('.sed-hint'),ht=CC?'tryck i en del för att lyssna · dra i en siffra för att flytta snittet · dubbeltryck för nytt snitt eller ta bort':'dra i <b>start</b> och <b>slut</b> · trianglarna högst upp är <b>fade</b> · nyp eller scrolla för att zooma · tryck i vågen för att lyssna därifrån';if(hn._t!==ht){hn._t=ht;hn.innerHTML=ht;W.classList.remove('used')}}$('#sedCBar').hidden=!CC;$('#sedPads').hidden=!CC;$('#sedSnap').classList.toggle('on',snap)}
  const loop=()=>{if(!SE.open)return;draw();{const k=SE.tid+(S.ck?JSON.stringify(S.ck):'');if(k!==SE.ckK){SE.ckK=k;SE.ckPaint&&SE.ckPaint()}}SE.raf=requestAnimationFrame(loop)};
  function zoomAt(f,tc){const d=D(),span=clamp((SE.v1-SE.v0)*f,Math.min(d,.004),d);let a=tc-(tc-SE.v0)*span/(SE.v1-SE.v0);a=clamp(a,0,d-span);SE.v0=a;SE.v1=a+span}
  function set(k,v){const e=E(),d=D();if(k==='st'){let t=clamp(v,0,e.en*d-.002);if(snap)t=seZero(SE.sm,t);e.st=t/d}else if(k==='en'){let t=clamp(v,e.st*d+.002,d);if(snap)t=seZero(SE.sm,t);e.en=t/d}
    else if(k==='fi')e.fi=Math.round(clamp(v*1000,0,(e.en-e.st)*d*1000*.9));else if(k==='fo')e.fo=Math.round(clamp(v*1000,0,(e.en-e.st)*d*1000*.9))}
  const pts=new Map();let pinch=null,tap=null,ctap=null;
  function chopDown(x,w){const C=chopOf(SE.tid),d=D(),t=x2t(x,w),now=performance.now();let j=-1,bd=18;C.cuts.forEach((f,k)=>{const dd=Math.abs(t2x(f*d,w)-x);if(dd<bd){bd=dd;j=k}});
    if(ctap&&now-ctap.t<320&&Math.abs(x-ctap.x)<24){ctap=null;pushHist();
      if(j>=0){if(C.cuts.length>1){C.cuts.splice(j,1);toast('snitt borttaget')}}
      else if(C.cuts.length<16){let tt=snap?seZero(SE.sm,t):t;C.cuts.push(clamp(tt/d,0,.999));C.cuts.sort((a,b)=>a-b);toast('nytt snitt')}else toast('Max 16 delar');
      save();SE.cd=null;return}
    ctap={t:now,x};pushHist();SE.cd={k:j,x0:x,moved:false,v0:SE.v0,v1:SE.v1,t}}
  function chopMove(x,w){const G=SE.cd,C=chopOf(SE.tid),d=D();if(!C)return;if(Math.abs(x-G.x0)>4)G.moved=true;if(!G.moved)return;
    if(G.k>=0){const lo=G.k>0?C.cuts[G.k-1]*d+.004:0,hi=G.k+1<C.cuts.length?C.cuts[G.k+1]*d-.004:d-.004;let t=clamp(x2t(x,w),lo,hi);if(snap)t=clamp(seZero(SE.sm,t),lo,hi);C.cuts[G.k]=t/d}
    else{const dt=(G.x0-x)/w*(G.v1-G.v0),span=G.v1-G.v0,a=clamp(G.v0+dt,0,d-span);SE.v0=a;SE.v1=a+span}}
  function chopUp(){const G=SE.cd,C=chopOf(SE.tid);SE.cd=null;if(!C)return;if(G.moved){save();if(G.k>=0)chopHit(SE.i,G.k);return}
    const f=G.t/D();let k=-1;C.cuts.forEach((c,q)=>{if(c<=f)k=q});if(G.k>=0)k=G.k;if(k>=0)chopHit(SE.i,k)}
  function chopPadsPaint(C){const P=$('#sedPads'),n=C.cuts.length;if(!P.children.length){for(let r=3;r>=0;r--)for(let c=0;c<4;c++){const k=r*4+c,b=document.createElement('button');b.className='sed-pad';b.dataset.k=k;b.innerHTML=`<b>${k+1}</b>`;
        b.addEventListener('pointerdown',ev=>{ev.preventDefault();const C2=chopOf(SE.tid);if(!C2||k>=C2.cuts.length)return;b.classList.add('hit');chopHit(SE.i,k)});const off=()=>b.classList.remove('hit');b.addEventListener('pointerup',off);b.addEventListener('pointerleave',off);b.addEventListener('pointercancel',off);P.appendChild(b)}}
    const lk=SE.lastK&&ctx&&ctx.currentTime-SE.lastK.t<.12?SE.lastK.k:-1;[...P.children].forEach(b=>{const k=+b.dataset.k;b.classList.toggle('off',k>=n);b.classList.toggle('lit',k===lk)})}
  W.addEventListener('pointerdown',ev=>{if(!SE.sm||!SE.sm.buf)return;ev.preventDefault();W.setPointerCapture(ev.pointerId);W.classList.add('used');const r=C.getBoundingClientRect(),x=ev.clientX-r.left,y=ev.clientY-r.top,w=r.width,e=E(),d=D();pts.set(ev.pointerId,{x:ev.clientX});
    if(pts.size===2){const [a,b]=[...pts.values()];pinch={d0:Math.abs(a.x-b.x)||1,v0:SE.v0,v1:SE.v1,c:x2t(((a.x+b.x)/2)-r.left,w)};SE.drag=null;return}
    if(chopOf(SE.tid)){chopDown(x,w);return}
    const xs=t2x(e.st*d,w),xe=t2x(e.en*d,w),xfi=t2x(e.st*d+(e.fi||0)/1000,w),xfo=t2x(e.en*d-(e.fo||0)/1000,w),near=(a)=>Math.abs(x-a);
    let k=null;if(y<34&&near(xfi)<20)k='fi';else if(y<34&&near(xfo)<20)k='fo';else if(near(xs)<18)k='st';else if(near(xe)<18)k='en';
    pushHist();SE.drag={k,x0:x,v0:SE.v0,v1:SE.v1,moved:false};tap={x,t:performance.now()}});
  W.addEventListener('pointermove',ev=>{if(!pts.has(ev.pointerId))return;pts.get(ev.pointerId).x=ev.clientX;const r=C.getBoundingClientRect(),w=r.width,x=ev.clientX-r.left,e=E(),d=D();
    if(pinch&&pts.size>=2){const [a,b]=[...pts.values()],f=pinch.d0/Math.max(1,Math.abs(a.x-b.x));SE.v0=pinch.v0;SE.v1=pinch.v1;zoomAt(f,pinch.c);return}
    if(SE.cd){chopMove(x,w);return}
    const G=SE.drag;if(!G)return;if(Math.abs(x-G.x0)>4)G.moved=true;if(!G.moved)return;const t=x2t(x,w);
    if(G.k==='st'||G.k==='en')set(G.k,t);else if(G.k==='fi')set('fi',t-e.st*d);else if(G.k==='fo')set('fo',e.en*d-t);
    else{const dt=(G.x0-x)/w*(G.v1-G.v0),span=G.v1-G.v0,a=clamp(G.v0+dt,0,d-span);SE.v0=a;SE.v1=a+span}});
  const up=ev=>{pts.delete(ev.pointerId);if(pts.size<2)pinch=null;if(SE.cd){chopUp();return}const G=SE.drag;SE.drag=null;if(!G)return;
    if(!G.moved&&!G.k&&tap){const r=C.getBoundingClientRect();sePlayFrom(x2t(tap.x,r.width))}else save()};
  W.addEventListener('pointerup',up);W.addEventListener('pointercancel',up);
  W.addEventListener('wheel',ev=>{ev.preventDefault();const r=C.getBoundingClientRect();if(ev.ctrlKey||Math.abs(ev.deltaY)>Math.abs(ev.deltaX))zoomAt(Math.exp(ev.deltaY*.0022),x2t(ev.clientX-r.left,r.width));else{const span=SE.v1-SE.v0,a=clamp(SE.v0+ev.deltaX/r.width*span,0,D()-span);SE.v0=a;SE.v1=a+span}},{passive:false});
  // overview: drag to move the view
  {let on=false;const mv=ev=>{const r=O.getBoundingClientRect(),d=D(),span=SE.v1-SE.v0,c=clamp((ev.clientX-r.left)/r.width,0,1)*d,a=clamp(c-span/2,0,d-span);SE.v0=a;SE.v1=a+span};
    O.addEventListener('pointerdown',ev=>{ev.preventDefault();O.setPointerCapture(ev.pointerId);on=true;mv(ev)});O.addEventListener('pointermove',ev=>{if(on)mv(ev)});O.addEventListener('pointerup',()=>on=false);O.addEventListener('pointercancel',()=>on=false)}
  function sePlayFrom(t){initAudio();ctx.resume();const sm=SE.sm;if(!sm||!sm.buf)return;const src=ctx.createBufferSource(),g=ctx.createGain(),t0=ctx.currentTime+.01;src.buffer=sm.buf;g.gain.value=(sm.norm||1)*.8;src.connect(g);g.connect(A.dry);src.start(t0,t,Math.min(2,D()-t));SE.play={t:t0,rate:1,st:t,en:D(),end:Math.min(2,D()-t),rev:0}}
  $('#sedPlay').onclick=()=>{initAudio();ctx.resume();trigger(SE.i,ctx.currentTime+.01,.9,firstNote(SE.i))};
  const hop=dir=>{const e=E(),d=D(),ons=seOnsets(SE.sm),cur=e.st*d;pushHist();
    const t=dir>0?ons.find(o=>o>cur+.012):[...ons].reverse().find(o=>o<cur-.012);if(t==null){toast(dir>0?'Inget fler slag hittades':'Inget slag före');return}
    const stt=Math.max(0,t-.0015);e.st=(snap?seZero(SE.sm,stt):stt)/d;if(e.en<=e.st)e.en=1;const span=SE.v1-SE.v0;if(e.st*d<SE.v0||e.st*d>SE.v1){SE.v0=clamp(e.st*d-span*.15,0,d-span);SE.v1=SE.v0+span}
    save();$('#sedPlay').onclick()};
  $('#sedNext').onclick=()=>hop(1);$('#sedPrev').onclick=()=>hop(-1);
  $('#sedZin').onclick=()=>{const e=E(),d=D();zoomAt(.5,e.st*d)};$('#sedZout').onclick=()=>{const e=E(),d=D();zoomAt(2,e.st*d)};$('#sedZfit').onclick=()=>{SE.v0=0;SE.v1=D()};
  $('#sedSnap').onclick=()=>{snap=!snap;try{localStorage.setItem('seq3-sesnap',snap?'1':'0')}catch(e){globalThis.__el&&globalThis.__el(e)}};
  $('#sedRev').onclick=()=>{pushHist();const e=E();e.rev=e.rev?0:1;save();$('#sedPlay').onclick()};
  $('#sedGain').oninput=ev=>{const e=E();e.g=+ev.target.value;save()};$('#sedGain').onchange=()=>$('#sedPlay').onclick();
  $('#sedReset').onclick=()=>{pushHist();delete S.se[SE.tid];save();$('#sedGain').value=0;SE.v0=0;SE.v1=D()};
  const close=()=>{SE.open=false;cancelAnimationFrame(SE.raf);box.hidden=true;SE.play=null};
  /* the sound itself, same controls as the sound card: level, tune, decay, tone, pan, echo, space */
  function seKnobs(i){const t=TRACKS[i],kb=$('#sedK');kb.innerHTML='';
    [['level','nivå',0,1,v=>pct(v)],['tune','tune',-12,12,v=>(v>0?'+':'')+Math.round(v)],['decay','decay',0,1,v=>pct(v)],['tone','ton',0,1,v=>pct(v)],['pan','pan',-1,1,v=>Math.abs(v)<.03?'C':(v<0?'L':'R')+Math.round(Math.abs(v)*100)],['echo','echo',0,1,v=>pct(v)],['space','space',0,1,v=>pct(v)]]
     .forEach(([k,label,min,max,fmt])=>{const kn=knob(kb,{label,min,max,def:DEF_P[t.id][k],color:t.hex,fmt,ml:'p.'+t.id+'.'+k,mll:label+' · '+t.name.toLowerCase(),get:()=>S.params[t.id][k],set:v=>{S.params[t.id][k]=v;applyTrack(i);save();renderSnd();renderDial()}});kn.style.setProperty('--kc',t.hex);
       kn.addEventListener('pointerup',()=>{if(k==='tune'||k==='decay'||k==='tone')$('#sedPlay').onclick()})})}
  $('#sedChop').onclick=()=>{pushHist();if(chopOf(SE.tid)){delete S.chop[SE.tid];toast('chop av')}
    else{const sm=SE.sm;S.chop[SE.tid]={sid:sm.id,cuts:chopAuto(sm,sm.kind==='loop'||sm.buf.duration>1.2?16:'slag')};SE.v0=0;SE.v1=D();toast('chop på · '+S.chop[SE.tid].cuts.length+' delar')}save()};
  $('#sedCBar').querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>{const C=chopOf(SE.tid);if(!C)return;pushHist();const m=b.dataset.ch;C.cuts=chopAuto(SE.sm,m==='slag'?'slag':+m);save();toast(C.cuts.length+' delar')});
  $('#sedCPat').onclick=()=>chopToPattern(SE.i);
  $('#sedMute').onclick=()=>{const i=SE.i;S.mute[i]=S.mute[i]?0:1;applyAll();renderSel();save();$('#sedMute').classList.toggle('on',!!S.mute[i])};
  /* choke: a new hit cuts what is still ringing – on the same track (själv) or on every track in the same group */
  const ckPaint=()=>{const m=S.ck&&S.ck[SE.tid]?'on':'';document.querySelectorAll('#sedCk [data-ck]').forEach(b=>b.classList.toggle('on',b.dataset.ck===m));
    $('#sedCkH').textContent=window.ckHint?ckHint(SE.tid):''};
  SE.ckPaint=ckPaint;
  document.querySelectorAll('#sedCk [data-ck]').forEach(b=>b.onclick=()=>{window.ckSet?ckSet(SE.tid,b.dataset.ck):0;ckPaint()});
  $('#sedX').onclick=close;$('#sedOk').onclick=close;box.addEventListener('click',ev=>{if(ev.target===box)close()});
  addEventListener('keydown',ev=>{if(SE.open&&ev.key==='Escape')close();if(SE.open&&ev.key===' '&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){ev.preventDefault();$('#sedPlay').onclick()}});
  window.openSampleEditor=async i=>{const t=TRACKS[i],dm=S.dk[t.id]||'';if(!dm.startsWith('smp:')){toast('Välj ett sampel för '+t.name+' först');return}
    const sm=SMP.get(dm.slice(4));if(!sm){toast('Hittar inte sampelet');return}initAudio();await ensureBuf(sm);if(!sm.buf){toast('Kunde inte läsa sampelet');return}
    SE.i=i;SE.tid=t.id;SE.sm=sm;SE.v0=0;SE.v1=sm.buf.duration;seOnsets(sm);const e=seGet(t.id);
    // open zoomed on the start, where flams live
    if(sm.buf.duration>.6&&!chopOf(t.id)){SE.v0=0;SE.v1=Math.min(sm.buf.duration,Math.max(.35,e.st*sm.buf.duration+.3))}
    $('#sedDot').style.setProperty('--tc',t.hex);$('#sedDot').textContent=i+1;$('#sedName').textContent=sm.name;$('#sedSub').textContent=t.name.toLowerCase()+' · '+ms(sm.buf.duration)+' · '+sm.buf.numberOfChannels+' kanal'+(sm.buf.numberOfChannels>1?'er':'');
    $('#sedGain').value=e.g||0;seKnobs(i);$('#sedMute').classList.toggle('on',!!S.mute[i]);SE.ckPaint&&SE.ckPaint();box.hidden=false;box.classList.remove('pop');void box.offsetWidth;box.classList.add('pop');SE.open=true;closeEditor&&closeEditor();loop()};
})();
/* the drum editor gets an "editor" button when the track plays a sample */
{const _oe=openEditor;openEditor=function(i){_oe.apply(this,arguments);const t=TRACKS[i];if(t.mel)return;$('#dedMods').querySelectorAll('.dmod:not(.smp)').forEach(m=>m.addEventListener('click',()=>{delete S.se[t.id]},true));const cur=(S.dk[t.id]||'').startsWith('smp:');if(!cur)return;
  const mods=$('#dedMods'),b=document.createElement('button');b.className='dmod sedit';b.innerHTML='<b>✂ editor</b><small>klipp start, slut, fade</small>';b.onclick=()=>openSampleEditor(i);mods.appendChild(b)}}
/* step inspector: on a chopped track, pick which slice the step plays */
(()=>{const act=document.querySelector('#sins .sins-act');if(!act)return;const box=document.createElement('div');box.className='sins-chop';box.id='sinsC';box.hidden=true;
  box.innerHTML='<div class="sins-row"><span>chop · vilken del</span><b id="sinsCN"></b></div><div class="sins-cg" id="sinsCG"></div>';act.parentNode.insertBefore(box,act);
  const _ri=renderInsp;renderInsp=function(){_ri.apply(this,arguments);if(!sins)return;const tr=TRACKS[sins.ti],C=chopOf(tr.id);box.hidden=!C;if(!C)return;
    const c=inspCell(),n=C.cuts.length,cur=c.c!=null?c.c:sins.s%n,G=$('#sinsCG');G.innerHTML='';$('#sinsCN').textContent=c.c!=null?'del '+(c.c+1):'auto · '+(sins.s%n+1);
    const mk=(lab,v)=>{const b=document.createElement('button');b.textContent=lab;b.classList.toggle('on',v===null?c.c==null:c.c===v);b.onclick=()=>{pushHist();if(v===null)delete c.c;else c.c=v;save();renderInsp();chopHit(sins.ti,v===null?sins.s%n:v)};G.appendChild(b)};
    mk('auto',null);for(let k=0;k<n;k++)mk(String(k+1),k)}})();
/* a track that plays a sample is named after it (pattern rows, pads, mixer); ✂ = chopped */
function trkLabel(i,mx){mx=mx||12;const t=TRACKS[i],dm=S.dk[t.id]||'';if(!dm.startsWith('smp:'))return t.name;const sm=SMP.get(dm.slice(4));if(!sm)return t.name;
  let n=String(sm.name||'').replace(/\.(wav|wave|aif|aiff|mp3|m4a|flac|ogg|caf)$/i,'').replace(/[_]+/g,' ').trim()||t.name;if(n.length>mx)n=n.slice(0,mx-1)+'…';return (chopOf(t.id)?'✂ ':'')+n}
function paintNames(){TRACKS.forEach((t,i)=>{const lab=trkLabel(i),gl=trkLabel(i,99).replace(/^✂ /,'').slice(0,6).trim(),own=lab===t.name,tip=own?t.name:t.name+' · '+lab;
  const row=gridEl&&trkRowEl(i),nm=row&&row.querySelector('.rl .nm');if(nm&&nm.textContent!==gl){nm.textContent=gl;nm.classList.toggle('smpn',!own);row.querySelector('.rl').title=tip}
  const p=padEls[i],b=p&&p.querySelector('b');if(b&&b.textContent!==lab.toLowerCase()&&b.textContent!==lab){b.textContent=own?t.name:lab;p.title=tip}
  const X=MXS[i];if(X){const sp=X.el.querySelector('.nm span'),ml=X.el.querySelector('.mlab'),low=own?t.name.toLowerCase():lab;if(sp&&sp.textContent!==low){sp.textContent=low;X.el.title=tip}if(ml&&ml.textContent!==low)ml.textContent=low}})}
{const _rc=renderCells;renderCells=function(){const r=_rc.apply(this,arguments);try{paintNames()}catch(e){globalThis.__el&&globalThis.__el(e)}return r}}
{const _ah=assignHit;assignHit=function(){const r=_ah.apply(this,arguments);setTimeout(paintNames,30);return r}}
setInterval(()=>{try{paintNames()}catch(e){globalThis.__el&&globalThis.__el(e)}},1500);

