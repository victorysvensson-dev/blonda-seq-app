/* ================= export: the mix, bus stems and track stems as 24-bit WAV, packed in one zip =================
   Recorded in real time from the start of the pattern (or the song): every tap is a small AudioWorklet that copies
   exactly the same frames, so the stems line up sample for sample. Tracks are taken after their own fader and pan
   (before the buses and the master), buses after their pump, the mix after the limiter; echo + space as their own stem. */
const REC_SRC=`class R extends AudioWorkletProcessor{constructor(){super();this.s=-1;this.e=-1;this.L=[];this.R=[];this.n=0;this.port.onmessage=e=>{const d=e.data;if(d.arm){this.s=d.s;this.e=d.e;this.L=[];this.R=[];this.n=0}if(d.stop){this.flush(true);this.s=-1}}}
 flush(done){if(this.L.length){const n=this.L.reduce((a,b)=>a+b.length,0),l=new Float32Array(n),r=new Float32Array(n);let o=0;for(let i=0;i<this.L.length;i++){l.set(this.L[i],o);r.set(this.R[i],o);o+=this.L[i].length}
   this.port.postMessage({l,r},[l.buffer,r.buffer]);this.L=[];this.R=[];this.n=0}if(done)this.port.postMessage({done:1})}
 process(ins){const i=ins[0];if(this.s<0)return true;const n=128,f0=currentFrame;if(f0+n<=this.s)return true;
   const a=Math.max(0,this.s-f0),b=Math.min(n,this.e-f0);if(b>a){const l=i&&i[0]?i[0].slice(a,b):new Float32Array(b-a),r=i&&i[1]?i[1].slice(a,b):(i&&i[0]?i[0].slice(a,b):new Float32Array(b-a));this.L.push(l);this.R.push(r);this.n+=b-a;if(this.n>24000)this.flush(false)}
   if(f0+n>=this.e){this.flush(true);this.s=-1}return true}}
registerProcessor('blonda-rec',R);`;
let recReady=null;
function recInit(){if(!recReady)recReady=ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([REC_SRC],{type:'application/javascript'})));return recReady}
function wav24(l,r,sr){const n=l.length,b=new ArrayBuffer(44+n*6),v=new DataView(b);const w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
  w(0,'RIFF');v.setUint32(4,36+n*6,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,sr,true);v.setUint32(28,sr*6,true);v.setUint16(32,6,true);v.setUint16(34,24,true);w(36,'data');v.setUint32(40,n*6,true);
  let o=44;for(let i=0;i<n;i++)for(const c of [l,r]){let x=Math.max(-1,Math.min(1,c[i]))*8388607;x=Math.round(x);v.setUint8(o,x&255);v.setUint8(o+1,(x>>8)&255);v.setUint8(o+2,(x>>16)&255);o+=3}
  return new Uint8Array(b)}
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(u){let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=CRC[(c^u[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
function zipStore(files){/* files: [{name, data: Uint8Array}] → Blob (stored, no compression; WAV does not shrink much anyway) */
  const enc=new TextEncoder(),parts=[],cen=[];let off=0;const d=new Date(),dt=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1)),dd=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate());
  for(const f of files){const nm=enc.encode(f.name),crc=crc32(f.data),h=new DataView(new ArrayBuffer(30));
    h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,0,true);h.setUint16(10,dt,true);h.setUint16(12,dd,true);h.setUint32(14,crc,true);h.setUint32(18,f.data.length,true);h.setUint32(22,f.data.length,true);h.setUint16(26,nm.length,true);h.setUint16(28,0,true);
    parts.push(h.buffer,nm,f.data);
    const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(10,0,true);c.setUint16(12,dt,true);c.setUint16(14,dd,true);c.setUint32(16,crc,true);c.setUint32(20,f.data.length,true);c.setUint32(24,f.data.length,true);c.setUint16(28,nm.length,true);c.setUint32(42,off,true);
    cen.push(c.buffer,nm);off+=30+nm.length+f.data.length}
  const csz=cen.reduce((a,p)=>a+(p.byteLength||p.length),0),e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,csz,true);e.setUint32(16,off,true);
  return new Blob([...parts,...cen,e.buffer],{type:'application/zip'})}
async function saveBlob(blob,fn){const dl=window.claude&&window.claude.use?await window.claude.use('downloads').catch(()=>null):null;
  if(dl){try{await dl.save({filename:fn,data:blob});toast('Sparade '+fn);return true}catch(e){toast(e&&e.code==='declined'?'Export avbruten':e&&e.code==='too_large'?'Filen blev för stor – välj färre stems eller kortare':'Export stöds inte här');return false}}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fn;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),8000);toast('Sparade '+fn);return true}
const EXP={mix:1,bus:1,trk:0,fx:1,bars:4,song:0,tail:1};try{Object.assign(EXP,JSON.parse(localStorage.getItem('blonda.exp.v1')||'{}'))}catch(e){globalThis.__el&&globalThis.__el(e)}
let expEl=null,expRun=null;
/* every compressor in the web audio chain delays by 6 ms (and the tape shaper a little): line the stems up again.
   Tracks and the echo/space stem lose the tracks' own compressor delay; a bus or the mix is matched to the sum of its
   tracks (envelope cross-correlation, then refined sample by sample), so the downbeat sits on sample 0 in every file. */
function lagOf(ref,x,sr){const N=Math.min(ref.length,x.length,Math.round(sr*1.6)),D=8,M=Math.floor(N/D),maxL=Math.round(sr*.06/D);
  const e=a=>{const o=new Float32Array(M);for(let i=0;i<M;i++){let q=0;for(let j=0;j<D;j++)q+=Math.abs(a[i*D+j]);o[i]=q}return o},er=e(ref),ex=e(x);let best=0,bv=-1;
  for(let L=0;L<=maxL;L++){let c=0;for(let i=0;i+L<M;i++)c+=er[i]*ex[i+L];if(c>bv){bv=c;best=L}}
  let fb=best*D,fv=-1e30;for(let L=Math.max(0,best*D-D);L<=best*D+D;L++){let c=0;for(let i=0;i+L<N;i+=2)c+=ref[i]*x[i+L];if(c>fv){fv=c;fb=L}}return fb}
function songBars(){return (S.chain||[]).filter(v=>v>=0).length}
function expPlan(){const L=[];if(EXP.mix)L.push({k:'mix',name:'mix',node:()=>A.out});
  if(EXP.bus&&A.buses)BUSES.forEach(b=>L.push({k:'bus-'+b.k,name:'buss – '+b.name,node:()=>A.buses[b.k].pg}));
  if(EXP.trk||EXP.mix||EXP.bus)TRACKS.forEach((t,i)=>(!window.trkOn||trkOn(i))&&L.push({k:'trk-'+t.id,hide:!EXP.trk,name:trkNo(i).padStart(2,'0')+' '+(typeof trkLabel==='function'?trkLabel(i,99).replace(/^✂ /,''):t.name).replace(/[\\/:*?"<>|]/g,'').trim(),node:()=>A.ch[i].pan||A.ch[i].g}));
  if(EXP.fx&&(EXP.bus||EXP.trk))L.push({k:'fx',name:'eko + rymd',node:null});
  return L}
const expFiles=()=>expPlan().filter(p=>!p.hide).length;
function expSecs(){const bars=EXP.song&&songBars()?songBars():EXP.bars;return bars*240/S.bpm+(EXP.tail?2:0)}
function openExport(){if(expEl){expEl.remove();expEl=null;if(window.__exScrim)__exScrim.remove();return}
  /* (v288) opened from the menu: the menu closes, so it doesn't lie over the export window */
  try{if(window.__dock&&__dock.isOpen())__dock.toggle(false)}catch(e){globalThis.__el&&globalThis.__el(e)}
  /* the export window, BLONDA yellow: live output as dots (waveform + spectrum), what and how long, the numbers, go */
  const scrim=document.createElement('div');scrim.className='ex-scrim';document.body.appendChild(scrim);window.__exScrim=scrim;
  expEl=document.createElement('div');expEl.className='exp ey';
  const chip=(k,l,on)=>`<button class="ex-c${on?' on':''}" data-k="${k}">${l}</button>`;
  const close=()=>{if(expRun)return;expEl.remove();expEl=null;scrim.remove()};scrim.onclick=close;
  const paint=()=>{const sb=songBars(),plan=expPlan().filter(p=>!p.hide),secs=expSecs(),sr=ctx?ctx.sampleRate:48000,mb=plan.length*secs*sr*6/1048576;
    expEl.innerHTML=`<div class="ey-top"><small>BLONDA / EXPORT</small><button class="ex-x" aria-label="Stäng">STÄNG ×</button></div>
      <h2 class="ey-t">${expRun?'Spelar in.':'Ljud ut.'}</h2>
      <div class="ey-viz"><div><div class="ey-vh"><span>UTGÅNG / VÅGFORM</span><span class="ey-st">${playing?'● SPELAR':'○ STILLA'}</span></div><canvas class="ey-wave"></canvas></div>
        <div><div class="ey-vh"><span>SPEKTRUM</span><span>40 HZ – 16 KHZ</span></div><canvas class="ey-spec"></canvas></div></div>
      <div class="ey-opt"><span>VAD</span><div class="ex-row">${chip('mix','mix (master)',EXP.mix)}${chip('bus','stems · bussar',EXP.bus)}${chip('trk','stems · spår 1–10',EXP.trk)}${chip('stx','stems · starter',EXP.stx)}${chip('fx','eko + rymd',EXP.fx)}</div></div>
      <div class="ey-opt"><span>LÄNGD</span><div class="ex-row">${[1,2,4,8,16].map(b=>chip('b'+b,b+(b===1?' takt':' takter'),!EXP.song&&EXP.bars===b)).join('')}${sb?chip('song','låten · '+sb+' takter',EXP.song):''}${chip('tail','+ svans 2 s',EXP.tail)}</div></div>
      <div class="ey-nums"><div><small>TOPP / dBFS</small><b class="ey-pk">–</b></div><div><small>RMS / dBFS</small><b class="ey-rms">–</b></div><div><small>BPM</small><b>${Math.round(S.bpm)}</b></div>
        <div><small>${expRun?'KLART':'FILER / SEK'}</small><b class="ey-pr">${expRun?'0 %':plan.length+' / '+secs.toFixed(1)}</b></div>
        <div class="ex-go"><button class="ex-mid" title="Alla noter som MIDI: mönstren och Starterns lager">MIDI ⤓</button><button class="ex-run"${plan.length?'':' disabled'}>${expRun?'AVBRYT ■':'SPELA IN OCH EXPORTERA ●'}</button></div></div>
      <div class="ex-bar"><i></i></div>
      <div class="ey-foot">WAV 24-BIT · ${sr} HZ · ${plan.length} FILE${plan.length===1?'':'S'} · ABOUT ${mb<1?mb.toFixed(1):Math.round(mb)} MB IN ONE ZIP · TRACKS AFTER FADER AND PAN · STARTER LAYER BY LAYER · BUSES AFTER THE PUMP · MIX AFTER THE LIMITER · ALL START ON THE SAME SAMPLE</div>`;
    expEl.querySelector('.ex-x').onclick=close;
    expEl.querySelectorAll('.ex-c').forEach(b=>b.onclick=()=>{if(expRun)return;const k=b.dataset.k;
      if(k[0]==='b'&&k!=='bus'){EXP.bars=+k.slice(1);EXP.song=0}else if(k==='song')EXP.song=EXP.song?0:1;else EXP[k]=EXP[k]?0:1;
      try{localStorage.setItem('blonda.exp.v1',JSON.stringify(EXP))}catch(e){globalThis.__el&&globalThis.__el(e)}paint()});
    expEl.querySelector('.ex-run').onclick=()=>{if(expRun){expRun.cancel=true;return}runExport(paint)}};
  document.body.appendChild(expEl);paint();expEl._paint=paint;exViz()}
/* the live dots: the master output's waveform and spectrum, drawn while the window is open */
let exAn=null;
function exViz(){initAudio();if(!exAn&&ctx&&A&&A.out){exAn=ctx.createAnalyser();exAn.fftSize=4096;exAn.smoothingTimeConstant=.72;try{A.out.connect(exAn)}catch(e){globalThis.__el&&globalThis.__el(e)}}
  const td=new Float32Array(4096),fd=new Float32Array(2048),INK='#17181A';let pk=0,rmsA=0,lastPlay=null;
  const fit=cv=>{const r=cv.getBoundingClientRect(),d=devicePixelRatio||1;if(!r.width)return null;const W=Math.round(r.width*d),H=Math.round(r.height*d);if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,r.width,r.height);return {c,w:r.width,h:r.height}};
  const dot=(c,x,y,r,a)=>{c.globalAlpha=a;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill()};
  (function loop(){if(!expEl)return;requestAnimationFrame(loop);if(!exAn)return;exAn.getFloatTimeDomainData(td);exAn.getFloatFrequencyData(fd);
    let p=0,s=0;for(let i=0;i<td.length;i++){const v=Math.abs(td[i]);if(v>p)p=v;s+=td[i]*td[i]}const rms=Math.sqrt(s/td.length);pk=Math.max(p,pk*.94);rmsA+=(rms-rmsA)*.15;
    const db=v=>v>1e-5?(20*Math.log10(v)).toFixed(1):'–';const e1=expEl.querySelector('.ey-pk'),e2=expEl.querySelector('.ey-rms');if(e1)e1.textContent=db(pk);if(e2)e2.textContent=db(rmsA);
    if(lastPlay!==playing){lastPlay=playing;const st=expEl.querySelector('.ey-st');if(st)st.textContent=playing?'● SPELAR':'○ STILLA'}
    const wv=expEl.querySelector('.ey-wave'),sp=expEl.querySelector('.ey-spec');
    /* waveform: a grid of faint dots, the signal as columns of dark dots around the middle */
    {const f=wv&&fit(wv);if(f){const {c,w,h}=f,g=6,cols=Math.floor(w/g),rows=Math.floor(h/g),mid=Math.floor(rows/2);c.fillStyle=INK;
      for(let x=0;x<cols;x++){let mx=0;const a=Math.floor(x/cols*td.length),b=Math.floor((x+1)/cols*td.length);for(let i=a;i<b;i++){const v=Math.abs(td[i]);if(v>mx)mx=v}
        const n=Math.min(mid,Math.round(Math.pow(mx,.75)*mid*1.6));for(let y=0;y<rows;y++){const on=Math.abs(y-mid)<=n;dot(c,x*g+g/2,y*g+g/2,on?1.45:.75,on?1:.14)}}c.globalAlpha=1}}
    /* spectrum: 40 Hz – 16 kHz on a log scale, columns of dots from the bottom */
    {const f=sp&&fit(sp);if(f){const {c,w,h}=f,g=6,cols=Math.floor(w/g),rows=Math.floor(h/g),ny=ctx.sampleRate/2;c.fillStyle=INK;
      for(let x=0;x<cols;x++){const f0=40*Math.pow(400,x/cols),f1=40*Math.pow(400,(x+1)/cols),a=Math.max(1,Math.floor(f0/ny*fd.length)),b=Math.max(a+1,Math.ceil(f1/ny*fd.length));let m=-140;for(let i=a;i<b&&i<fd.length;i++)if(fd[i]>m)m=fd[i];
        const u=Math.max(0,Math.min(1,(m+96)/84)),n=Math.round(u*rows);for(let y=0;y<rows;y++){const on=rows-1-y<n;dot(c,x*g+g/2,y*g+g/2,on?1.45:.75,on?1:.14)}}c.globalAlpha=1}}
    if(expRun){const b=expEl.querySelector('.ex-bar i'),pr=expEl.querySelector('.ey-pr');if(b&&pr)pr.textContent=Math.round(parseFloat(b.style.width)||0)+' %'}})()}
async function runExport(paint){initAudio();await ctx.resume();await recInit();
  const plan=expPlan(),sr=ctx.sampleRate,secs=expSecs(),job={cancel:false};expRun=job;paint();
  const bar=()=>expEl&&expEl.querySelector('.ex-bar i');
  if(playing)stop();await new Promise(r=>setTimeout(r,250));
  const sink=ctx.createGain();sink.gain.value=0;sink.connect(ctx.destination);const nodes=[],fxSum=ctx.createGain();
  const recs=plan.map(p=>{const n=new AudioWorkletNode(ctx,'blonda-rec',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit'});
    const src=p.k==='fx'?fxSum:p.node();src.connect(n);n.connect(sink);nodes.push([src,n]);const st={l:[],r:[],done:false};
    n.port.onmessage=e=>{if(e.data.done)st.done=true;else{st.l.push(e.data.l);st.r.push(e.data.r)}};return {p,n,st}});
  if(plan.some(p=>p.k==='fx')){A.dRet.connect(fxSum);A.rRet.connect(fxSum)}
  const songWas=S.song;if(EXP.song&&songBars())S.song=true;
  play();const s0=Math.round(startT*sr),e0=s0+Math.round(secs*sr)+4096;   /* extra room: the alignment trims up to ~0.09 s off the front */recs.forEach(r=>r.n.port.postMessage({arm:1,s:s0,e:e0}));
  const musicEnd=startT+secs-(EXP.tail?2:0);let stopped=false;
  await new Promise(res=>{const tick=()=>{const t=ctx.currentTime,u=Math.max(0,Math.min(1,(t-startT)/secs));const b=bar();if(b)b.style.width=(u*100).toFixed(1)+'%';
    if(!stopped&&t>=musicEnd-.05&&EXP.tail){stopped=true;if(playing)stop()}   /* the tail: stop the sequencer, let echo and space ring out */
    if(job.cancel||recs.every(r=>r.st.done))return res();requestAnimationFrame(tick)};tick()});
  if(playing)stop();S.song=songWas;
  recs.forEach(r=>{try{r.n.port.postMessage({stop:1})}catch(e){globalThis.__el&&globalThis.__el(e)}});await new Promise(r=>setTimeout(r,120));
  nodes.forEach(([s,n])=>{try{s.disconnect(n)}catch(e){globalThis.__el&&globalThis.__el(e)}try{n.disconnect()}catch(e){globalThis.__el&&globalThis.__el(e)}});try{A.dRet.disconnect(fxSum);A.rRet.disconnect(fxSum)}catch(e){globalThis.__el&&globalThis.__el(e)}sink.disconnect();
  if(job.cancel){expRun=null;toast('Export avbruten');if(expEl)paint();return}
  if(expEl){const b=expEl.querySelector('.ex-run');if(b)b.textContent='packar …'}
  const pname=((typeof curP==='function'&&curP()&&curP().name)||(document.getElementById('projName')||{}).textContent||'project').replace(/[\\/:*?"<>|]/g,'').trim()||'project';
  const join=r=>{const n=r.st.l.reduce((a,b)=>a+b.length,0),l=new Float32Array(n),rr=new Float32Array(n);let o=0;r.st.l.forEach((c,i)=>{l.set(c,o);rr.set(r.st.r[i],o);o+=c.length});return [l,rr]};
  const data=recs.map(join),len=Math.round(secs*sr),L0=Math.round(.006*sr),mono=([l,r])=>{const m=new Float32Array(l.length);for(let i=0;i<l.length;i++)m[i]=l[i]+r[i];return m};
  const trkIdx=recs.map((r,i)=>r.p.k.startsWith('trk-')?i:-1).filter(i=>i>=0),sumOf=ids=>{const n=Math.min(...ids.map(i=>data[i][0].length)),m=new Float32Array(n);ids.forEach(i=>{const [l,r]=data[i];for(let j=0;j<n;j++)m[j]+=l[j]+r[j]});return m};
  const files=[],shifts={};for(let ri=0;ri<recs.length;ri++){const r=recs[ri];let sh=L0;
    if(r.p.k==='mix'||r.p.k.startsWith('bus-')){const ids=r.p.k==='mix'?trkIdx:trkIdx.filter(i=>{const t=recs[i].p.k.slice(4),ti=TRACKS.findIndex(x=>x.id===t);return r.p.k==='bus-dr'?ti<6:r.p.k==='bus-sy'?ti>=6:false});
      if(ids.length){const ref=sumOf(ids);sh=L0+lagOf(ref,mono(data[ri]),sr)}else sh=L0+Math.round(.006*sr)}
    shifts[r.p.k]=sh;if(r.p.hide)continue;
    const [l0,r0]=data[ri],l=new Float32Array(len),rr=new Float32Array(len);l.set(l0.subarray(sh,Math.min(l0.length,sh+len)));rr.set(r0.subarray(sh,Math.min(r0.length,sh+len)));
    const folder=r.p.k==='mix'?'':(r.p.k.startsWith('bus')?'stems bussar/':(r.p.k==='fx'?'stems/':r.p.k.startsWith('stx-')?'stems starter/':'stems spår/'));files.push({name:folder+pname+' – '+r.p.name+'.wav',data:wav24(l,rr,sr)})}
  const zip=zipStore(files),fn=pname+' – '+(EXP.song&&songBars()?'låt':EXP.bars+' takter')+' – '+Math.round(S.bpm)+' bpm.zip';
  expRun=null;window.__lastExport={files:files.map(f=>[f.name,f.data.length]),size:zip.size,shifts};
  await saveBlob(zip,fn);if(expEl)paint()}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-a="wav"],.m2-exp');if(b){e.preventDefault();e.stopPropagation();openExport()}},true);
/* a button in the master's top panel too */
(()=>{const top=document.querySelector('.m2-top .m2-rd');if(top){const b=document.createElement('button');b.className='m2-exp';b.textContent='⤓ exportera ljud';top.appendChild(b)}})();

