/* ================= sampler · loops · library ================= */
const SMP=new Map();let libTab='hit',libTarget=null;
/* BLONDA ljudpaket: färdiga ljud som ligger bredvid sidan (blonda-pack/pack.json + .flac), hämtas först när de används */
const PACK_DIR='blonda-pack/',PACK_GROUPS={hit:[['kick','kick'],['snare','snare'],['clap','clap'],['hat','hihat'],['open','öppen hat'],['perc','perc'],['rim','rim'],['snap','snap'],['fill','fills'],['vox','röst']],loop:[['loop','trumloopar'],['tune','melodi']]};
let libSrc='alla',libGroup='';
const packBars=(()=>{try{return JSON.parse(localStorage.getItem('blonda-pack-bars')||'{}')}catch(e){return {}}})();
function savePackBars(){try{localStorage.setItem('blonda-pack-bars',JSON.stringify(packBars))}catch(e){globalThis.__el&&globalThis.__el(e)}}
async function loadPack(){try{const r=await fetch(PACK_DIR+'pack.json');if(!r.ok)return;const j=await r.json();
  (j.items||[]).forEach((it,n)=>{if(SMP.has(it.id))return;const bars=packBars[it.id]||it.bars;
    SMP.set(it.id,{id:it.id,name:it.name,kind:it.kind,bars,bpm:bars===it.bars?it.bpm:240*bars/it.dur,dur:it.dur,pk:it.pk,norm:it.norm,mime:'audio/wav',asset:null,t:-1-n,buf:null,size:0,url:PACK_DIR+it.file,pack:true,group:it.group,fav:!!it.fav})});
  warmSamples();renderLoops();if(!$('#lib').hidden)renderLib()}catch(e){globalThis.__el&&globalThis.__el(e)}}const loopSrc=[[],[],[],[]],loopAt=[null,null,null,null];
const uidS=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const idb=(()=>{let pr;return()=>pr||(pr=new Promise((res,rej)=>{try{const r=indexedDB.open('blonda-lib',1);r.onupgradeneeded=()=>r.result.createObjectStore('smp',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}}))})();
async function idbDo(mode,fn){try{const db=await idb();return await new Promise((res,rej)=>{const tx=db.transaction('smp',mode),st=tx.objectStore('smp'),r=fn(st);tx.oncomplete=()=>res(r&&r.result);tx.onerror=()=>rej(tx.error)})}catch(e){return null}}
const idbAll=()=>idbDo('readonly',st=>st.getAll()),idbPut=o=>idbDo('readwrite',st=>st.put(o)),idbDel=id=>idbDo('readwrite',st=>st.delete(id));
let decCtx=null;function decoder(){if(ctx)return ctx;if(!decCtx){const OC=window.OfflineAudioContext||window.webkitOfflineAudioContext;decCtx=new OC(2,1,48000)}return decCtx}
const decode=ab=>new Promise((res,rej)=>{const d=decoder();const p=d.decodeAudioData(ab.slice(0),res,rej);if(p&&p.then)p.then(res,rej)});
function peaksOf(buf,n=96){const ch=[...Array(buf.numberOfChannels).keys()].map(c=>buf.getChannelData(c)),L=buf.length,out=[];let mx=0;
  for(let b=0;b<n;b++){let m=0;const a=Math.floor(b*L/n),z=Math.floor((b+1)*L/n);for(let i=a;i<z;i+=4)for(const c of ch){const v=Math.abs(c[i]);if(v>m)m=v}out.push(m);if(m>mx)mx=m}
  return {pk:out.map(v=>+(v/(mx||1)).toFixed(3)),max:mx}}
function guessTempo(name,dur){const m=name.match(/(\d{2,3})\s*bpm/i)||name.match(/(?:^|[ _\-])(\d{2,3})(?:[ _\-.]|$)/);let bpm=m?+m[1]:0;
  if(bpm>=60&&bpm<=200){const bars=Math.max(1,Math.round(dur*bpm/240));return {bars,bpm:240*bars/dur}}
  let best=null;for(const bars of [1,2,4,8,16]){const b=240*bars/dur;const sc=Math.abs(Math.log2(b/120));if(b>=68&&b<=185&&(!best||sc<best.sc))best={bars,bpm:b,sc}}
  return best?{bars:best.bars,bpm:best.bpm}:{bars:1,bpm:240/dur}}
async function ensureBuf(sm){if(!sm)return null;if(sm.buf)return sm.buf;if(sm._p)return sm._p;
  sm._p=(async()=>{let rec=await idbDo('readonly',st=>st.get(sm.id));let data=rec&&rec.data;
    if(!data&&sm.asset){try{const r=await fetch('/_blob/'+sm.asset);const j=await r.json();data=b64ToAb(j.b64);if(rec){rec.data=data;idbPut(rec)}else idbPut(Object.assign(smpRec(sm),{data}))}catch(e){sm._p=null;return null}}
    if(!data&&sm.url){try{const r=await fetch(sm.url);if(r.ok)data=await r.arrayBuffer()}catch(e){globalThis.__el&&globalThis.__el(e)}}
    if(!data){sm._p=null;return null}try{sm.buf=await decode(data);return sm.buf}catch(e){sm._p=null;return null}})();return sm._p}
function smpRec(sm){const {id,name,kind,bars,bpm,dur,pk,norm,mime,asset,t}=sm;return {id,name,kind,bars,bpm,dur,pk,norm,mime,asset:asset||null,t}}
function b64ToAb(b){const bin=atob(b),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u.buffer}
const abToB64=ab=>new Promise(res=>{const fr=new FileReader();fr.onload=()=>res(String(fr.result).split(',')[1]);fr.readAsDataURL(new Blob([ab]))});
/* (v269) sounds from the standalone tools: BLONDA SYNTHS (presets, one or many engines) and BLONDA SAMPLER (a multisample for
   Sample+). Presets are kept for every project (not in the project), and show up in each engine's sound list as "synths". */
const SYN_K='blonda.synths.import.v1';
function synImp(){try{const o=JSON.parse(localStorage.getItem(SYN_K)||'{}');return o&&typeof o==='object'&&!Array.isArray(o)?o:{}}catch(e){return {}}}
window.__synImp=synImp;
async function blondaJson(f){let o;try{o=JSON.parse(await f.text())}catch(e){return null}if(!o||typeof o!=='object')return null;
  if(o.blonda==='presets'&&Array.isArray(o.presets)){const I=synImp();let n=0,r=0;
    o.presets.forEach(x=>{if(!x||!ENG[x.e]||x.e==='msx'||!x.n||!x.p||typeof x.p!=='object'||Array.isArray(x.p))return;const L=I[x.e]=Array.isArray(I[x.e])?I[x.e]:[];
      const u={n:String(x.n).slice(0,60),p:x.p,m:x.m&&typeof x.m==='object'?x.m:null,t:Date.now()},ex=L.find(v=>String(v.n).toLowerCase()===u.n.toLowerCase());if(ex){Object.assign(ex,u);r++}else{L.push(u);n++}});
    try{localStorage.setItem(SYN_K,JSON.stringify(I))}catch(e){toast('Storage is full – the sounds could not be saved');return 'err'}
    try{window.rsPaint&&rsPaint()}catch(e){globalThis.__el&&globalThis.__el(e)}try{window.KEYSX&&KEYSX._paint()}catch(e){globalThis.__el&&globalThis.__el(e)}
    toast(n||r?`BLONDA SYNTHS: ${n} new sound${n===1?'':'s'}${r?` · ${r} replaced`:''} · in the engines' sound lists`:'No sounds in that file');return 'ok'}
  if(o.blonda==='ms'&&o.ins&&typeof o.ins==='object'){const rec=window.TEX&&TEX.importRec?await TEX.importRec(o.ins):null;
    toast(rec?`${rec.name} · ${rec.regions.length} notes → Sample+`:'Could not read that instrument');return rec?'ok':'err'}
  return null}
async function importFiles(files){let n=0,bad=0,nj=0;for(const f of files){if(/\.json$/i.test(f.name)||/json/i.test(f.type)){const r=await blondaJson(f);if(r)nj++;else bad++;continue}
  if(!/audio|wav|aif|mp3|m4a|flac|ogg/i.test(f.type+f.name)){bad++;continue}
  try{const ab=await f.arrayBuffer(),buf=await decode(ab),dur=buf.duration,{pk,max}=peaksOf(buf),name=f.name.replace(/\.[^.]+$/,'');
    const kind=dur>1.6?'loop':'hit',tm=guessTempo(name,dur);
    const sm={id:uidS(),name,kind,bars:tm.bars,bpm:tm.bpm,dur,pk,norm:Math.min(4,.89/(max||1)),mime:f.type||'audio/wav',asset:null,t:Date.now(),buf,size:ab.byteLength};
    SMP.set(sm.id,sm);await idbPut(Object.assign(smpRec(sm),{data:ab}));n++;cloudPushSample(sm,ab)}catch(e){bad++}}
  renderLib();if(n||!nj)toast(n?`${n} ljud tillagda`+(bad?` · ${bad} kunde inte läsas`:''):'Kunde inte läsa filerna');if(n&&libTab==='preset'){}}
async function loadLocalLib(){const all=await idbAll();if(!all)return;all.forEach(r=>{if(!SMP.has(r.id)){const {data,...m}=r;SMP.set(r.id,Object.assign(m,{buf:null,size:data?data.byteLength:0}))}});warmSamples();renderLoops()}
function warmSamples(){const need=new Set();Object.values(S.dk||{}).forEach(v=>{if(v&&v.startsWith('smp:'))need.add(v.slice(4))});(S.loops||[]).forEach(L=>{if(L.sid)need.add(L.sid)});need.forEach(id=>ensureBuf(SMP.get(id)).then(()=>renderLoops()))}

/* sample voice on a drum track */
function smpVoice(id,t,v,p,out,tid){const sm=SMP.get(id);if(!sm||!sm.buf){ensureBuf(sm);return}
  const rate=Math.pow(2,p.tune/12),len=sm.buf.duration/rate,src=ctx.createBufferSource(),g=ctx.createGain(),lp=ctx.createBiquadFilter(),hp=ctx.createBiquadFilter();
  src.buffer=sm.buf;src.playbackRate.value=rate;lp.type='lowpass';hp.type='highpass';const tn=p.tone;
  lp.frequency.value=tn>=.5?20000:180*Math.pow(110,tn*2);hp.frequency.value=tn<=.5?18:18*Math.pow(45,(tn-.5)*2);
  const end=p.decay>=.97?len:Math.min(len,.025+Math.pow(p.decay,1.7)*2.6),lv=v*(sm.norm||1)*.95;
  g.gain.setValueAtTime(lv,t);g.gain.setValueAtTime(lv,t+end*.55);g.gain.exponentialRampToValueAtTime(.0001,t+end);
  src.connect(lp);lp.connect(hp);hp.connect(g);g.connect(out);src.start(t);src.stop(t+end+.02);
  if(tid==='hat'||tid==='ohat')hatChoke(g,tid==='ohat',t);if(tid==='kick')pump(t)}

/* tempo-synced loops: repitched so N bars always fill N bars at the current BPM */
let loopBus=null;
function loopOut(){if(!loopBus){loopBus=ctx.createGain();loopBus.connect(A.buses?A.buses.lp.in:A.dry)}return loopBus}
function loopsBar(t,bar){(S.loops||[]).forEach((L,k)=>{if(!L.sid||!L.on)return;const sm=SMP.get(L.sid);if(!sm||!sm.buf){ensureBuf(sm);return}
  const bars=L.bars||sm.bars||1;if(bar%bars!==0)return;const barD=240/S.bpm,dur=bars*barD,rate=S.bpm/sm.bpm;
  const src=ctx.createBufferSource(),g=ctx.createGain(),lv=L.vol*(sm.norm||1)*.8;{const lb=loopBuf(L,sm);src.buffer=lb?lb[0]:sm.buf;src.playbackRate.value=lb?lb[1]:rate}
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(lv,t+.004);g.gain.setValueAtTime(lv,t+dur-.008);g.gain.linearRampToValueAtTime(0,t+dur);
  src.connect(g);g.connect(loopOut());src.start(t);src.stop(t+dur+.01);loopSrc[k].push({src,g});if(loopSrc[k].length>3)loopSrc[k].shift();loopAt[k]={t,dur}})}
function loopsKill(){if(!ctx)return;const t=ctx.currentTime;loopSrc.forEach((arr,k)=>{arr.forEach(({src,g})=>{try{g.gain.cancelAndHoldAtTime(t);g.gain.setTargetAtTime(0,t,.01);src.stop(t+.06)}catch(e){globalThis.__el&&globalThis.__el(e)}});arr.length=0;loopAt[k]=null})}
function loopKillOne(k){if(!ctx)return;const t=ctx.currentTime;loopSrc[k].forEach(({src,g})=>{try{g.gain.cancelAndHoldAtTime(t);g.gain.setTargetAtTime(0,t,.01);src.stop(t+.06)}catch(e){globalThis.__el&&globalThis.__el(e)}});loopSrc[k].length=0;loopAt[k]=null}

/* loops card */
const lpsEl=$('#lps'),lpRows=[];
function drawWave(cv,pk,col,prog,beats){const r=cv.getBoundingClientRect();if(!r.width)return;const dpr=Math.min(2,devicePixelRatio||1);const W=Math.round(r.width*dpr),H=Math.round(r.height*dpr);if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}
  const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,r.width,r.height);if(!pk)return;const n=pk.length,bw=r.width/n,mid=r.height/2;
  if(beats>1){for(let k=1;k<beats;k++){const x=Math.round(k/beats*r.width)-.5,bar=k%4===0;c.fillStyle=bar?'rgba(255,255,255,.28)':'rgba(255,255,255,.09)';c.fillRect(x,bar?0:r.height*.3,1,bar?r.height:r.height*.4)}}
  for(let i=0;i<n;i++){const h=Math.max(1,pk[i]*(r.height*.42)),x=i*bw;c.fillStyle=prog!=null&&i/n<=prog?col:rgba(col,.35);c.fillRect(x+bw*.18,mid-h,Math.max(1,bw*.64),h*2)}
  if(prog!=null){c.fillStyle='#fff';c.fillRect(prog*r.width-.5,0,1.5,r.height)}}
function buildLoops(){lpsEl.innerHTML='';lpRows.length=0;for(let k=0;k<4;k++){const row=document.createElement('div');row.className='lp';
  row.innerHTML='<button class="on" aria-label="Loop på/av"><i></i></button><div class="w"><canvas></canvas><span></span></div><div class="lpk"><button class="lk" title="Ton: låst = loopen behåller sin tonhöjd i alla tempon"></button><button class="tm" aria-label="Transponera ner">−</button><b class="tv"></b><button class="tp" aria-label="Transponera upp">+</button></div><div class="vol" aria-label="Loopvolym"><i></i><b></b></div><button class="x" aria-label="Töm"><svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3 3 9"/></svg></button>';
  const L=()=>S.loops[k];row.querySelector('.on').onclick=()=>{initAudio();L().on=L().on?0:1;if(!L().on)loopKillOne(k);renderLoops();save()};
  row.querySelector('.w').onclick=()=>openLib('loop',{type:'loop',k});
  row.querySelector('.x').onclick=()=>{L().sid=null;loopKillOne(k);renderLoops();save()};
  const vol=row.querySelector('.vol');let on=false;const setV=e=>{const r=vol.getBoundingClientRect();L().vol=clamp((e.clientX-r.left)/r.width,0,1);renderLoops();if(loopSrc[k].length&&ctx){const s=SMP.get(L().sid);loopSrc[k].forEach(({g})=>{try{g.gain.cancelAndHoldAtTime(ctx.currentTime);g.gain.setTargetAtTime(L().vol*((s&&s.norm)||1)*.8,ctx.currentTime,.02)}catch(e){globalThis.__el&&globalThis.__el(e)}})}};
  vol.addEventListener('pointerdown',e=>{e.preventDefault();vol.setPointerCapture(e.pointerId);on=true;setV(e)});vol.addEventListener('pointermove',e=>{if(on)setV(e)});vol.addEventListener('pointerup',()=>{on=false;save()});
  lpsEl.appendChild(row);lpRows.push(row)}renderLoops()}
function renderLoops(){if(!lpRows.length)return;let n=0;lpRows.forEach((row,k)=>{const L=S.loops[k],sm=L.sid&&SMP.get(L.sid);row.classList.toggle('empty',!sm);row.classList.toggle('act',!!(sm&&L.on));
  const sp=row.querySelector('.w span');if(sm){n++;const bars=L.bars||sm.bars;sp.innerHTML='';sp.textContent=sm.name;const sm2=document.createElement('small');sm2.textContent='  '+bars+' takt'+(bars>1?'er':'')+' · '+Math.round(sm.bpm)+'→'+S.bpm;sp.appendChild(sm2)}
  else sp.textContent='loop '+(k+1)+' · välj';
  row.querySelector('.vol i').style.width=L.vol*100+'%';row.querySelector('.vol b').style.left=L.vol*100+'%';drawWave(row.querySelector('canvas'),sm?sm.pk:null,'#6BE28C',null)});
  $('#loopRead').textContent=n?n+' aktiv'+(n>1?'a':'')+' · '+S.bpm+' bpm':'följer tempot';$('#loopInfo').textContent=SMP.size?SMP.size+' ljud i biblioteket':'dra in ljudfiler i biblioteket'}
function loopFrame(){if(!lpRows.length||!ctx)return;const ct=ctx.currentTime;lpRows.forEach((row,k)=>{const a=loopAt[k],L=S.loops[k],sm=L.sid&&SMP.get(L.sid);if(!sm)return;
  const prog=a&&playing&&ct>=a.t&&ct<=a.t+a.dur?(ct-a.t)/a.dur*Math.min(1,((L.bars||sm.bars)*240/sm.bpm)/sm.dur>=1?1:1):null;
  if(prog!=null||row._p!=null){drawWave(row.querySelector('canvas'),sm.pk,'#6BE28C',prog);row._p=prog}})}
$('#loopLib').onclick=()=>openLib('loop',null);
buildLoops();

/* presets */
const PRK=KEY+'-presets';let PRESETS=[];try{PRESETS=JSON.parse(localStorage.getItem(PRK)||'[]')}catch(e){globalThis.__el&&globalThis.__el(e)}
function savePresetsLocal(){try{localStorage.setItem(PRK,JSON.stringify(PRESETS))}catch(e){globalThis.__el&&globalThis.__el(e)}}
function makePreset(i){const t=TRACKS[i],id=t.id;if(t.mel){const e=S.inst[id]||'analog';return {id:uidS(),name:t.name+' · '+ENG[e].name,kind:'mel',from:id,inst:e,eng:JSON.parse(JSON.stringify(S.eng[e]||{})),params:JSON.parse(JSON.stringify(S.params[id])),synth:JSON.parse(JSON.stringify((S.synth||{})[id]||null)),t:Date.now()}}
  const dm=S.dk[id]||'',sm=dm.startsWith('smp:')&&SMP.get(dm.slice(4)),mn=sm?sm.name:(((DKM[id==='ohat'?'hat':id]||[]).find(x=>x[0]===dm)||[0,'blonda'])[1]);
  return {id:uidS(),name:t.name+' · '+mn,kind:'drum',from:id,dk:dm,params:JSON.parse(JSON.stringify(S.params[id])),t:Date.now()}}
function applyPreset(pr,i){const t=TRACKS[i],id=t.id;pushHist();
  if(pr.kind==='mel'){if(!t.mel){toast('Synth-preset passar bara bass/keys/lead/pad');return}S.inst[id]=pr.inst;if(pr.eng)S.eng[pr.inst]=Object.assign({},S.eng[pr.inst],pr.eng);S.params[id]=Object.assign({},S.params[id],pr.params);if(pr.synth&&S.synth)S.synth[id]=pr.synth;refreshSound()}
  else{if(t.mel){toast('Trum-preset passar bara trumspår');return}if(pr.dk)S.dk[id]=pr.dk;else delete S.dk[id];S.params[id]=Object.assign({},S.params[id],pr.params);applyTrack(i);warmSamples()}
  save();renderSnd();renderDial();buildTrackKnobs();audition(i);toast(pr.name+' → '+t.name)}

/* library overlay */
const lib=$('#lib');
function openLib(tab,target){libTab=tab||libTab;libTarget=target||null;if(target&&target.type==='drum'){const g={kick:'kick',snare:'snare',clap:'clap',hat:'hat',ohat:'open',perc:'perc'}[TRACKS[target.i].kind||TRACKS[target.i].id];if(g){libGroup=g;if(libSrc==='egna')libSrc='alla'}}lib.hidden=false;requestAnimationFrame(()=>lib.classList.add('show'));renderLib()}
function closeLib(){lib.classList.remove('show');setTimeout(()=>{lib.hidden=true},280);libTarget=null}
$('#libBtn').onclick=()=>openLib(null,null);$('#libX').onclick=closeLib;
$('#libImp').onclick=()=>$('#libFile').click();$('#libFile').onchange=e=>{const f=[...e.target.files];e.target.value='';if(f.length)importFiles(f)};
[...$('#libTabs').children].forEach(b=>b.onclick=()=>{libTab=b.dataset.t;renderLib()});
['dragenter','dragover'].forEach(ev=>document.addEventListener(ev,e=>{if(e.dataTransfer&&[...e.dataTransfer.types].includes('Files')){e.preventDefault();if(lib.hidden)openLib(null,null);lib.classList.add('drop')}}));
document.addEventListener('dragleave',e=>{if(!e.relatedTarget)lib.classList.remove('drop')});
document.addEventListener('drop',e=>{if(!e.dataTransfer||!e.dataTransfer.files.length)return;e.preventDefault();lib.classList.remove('drop');importFiles([...e.dataTransfer.files])});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!lib.hidden)closeLib()});
let prevSrc=null;
async function previewSmp(sm,el){initAudio();ctx.resume();if(prevSrc&&prevSrc._sid===sm.id&&!prevSrc._done){try{prevSrc.stop()}catch(e){globalThis.__el&&globalThis.__el(e)}prevSrc=null;return}   /* tap a playing sound again to stop it */
  const b=await ensureBuf(sm);if(!b){toast('Ljudet är inte nedladdat än');return}if(prevSrc)try{prevSrc.stop()}catch(e){globalThis.__el&&globalThis.__el(e)}
  const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=b;const rate=sm.kind==='loop'&&playing?S.bpm/sm.bpm:1;src.playbackRate.value=rate;g.gain.value=(sm.norm||1)*.8;src.connect(g);g.connect(A.dry);
  /* a loop previewed while the song plays starts on the next beat, so you hear (and see) it in time */
  let t0=ctx.currentTime+.02;if(sm.kind==='loop'&&playing){const nb=nextT+((4-step%4)%4)*stepDur()/tapeRate;if(nb>t0)t0=nb}
  src.start(t0);src._sid=sm.id;src.onended=()=>{src._done=true};prevSrc=src;const len=Math.min(16,b.duration/rate);
  if(sm.kind==='loop')setTimeout(()=>{try{if(prevSrc===src)src.stop()}catch(e){globalThis.__el&&globalThis.__el(e)}},(t0-ctx.currentTime+len)*1000);
  if(!el)return;const cv=el.querySelector('canvas'),mt=el.querySelector('.mt'),mt0=mt.textContent,col=sm.kind==='loop'?'#6BE28C':'#F2C318',beats=sm.kind==='loop'?sm.bars*4:0;el.classList.add('playing');
  const tick=()=>{const t=ctx.currentTime-t0,f=t*rate/b.duration;if(prevSrc!==src||t>len){drawWave(cv,sm.pk,col,null,beats);mt.textContent=mt0;el.classList.remove('playing');return}
    if(t>=0){drawWave(cv,sm.pk,col,Math.min(1,f),beats);if(sm.kind==='loop'){const bt=f*beats,bar=Math.floor(bt/4)+1,beat=Math.floor(bt%4)+1;mt.textContent='▶ '+bar+'.'+beat+' / '+sm.bars+' takt · '+Math.round(sm.bpm*rate)+' bpm'}else mt.textContent='▶ '+Math.round(t*1000)+' / '+Math.round(b.duration*1000)+' ms'}
    requestAnimationFrame(tick)};requestAnimationFrame(tick)}
function assignHit(sm,i){const id=TRACKS[i].id;pushHist();S.dk[id]='smp:'+sm.id;Object.assign(S.params[id],{tone:.5,decay:1,tune:0});ensureBuf(sm).then(()=>{applyTrack(i);audition(i)});save();renderSnd();renderDial();toast(sm.name+' → '+TRACKS[i].name);if(libTarget){closeLib()}if(dedT===i)openEditor(i)}
function assignLoop(sm,k){initAudio();if(prevSrc){try{prevSrc.stop()}catch(e){globalThis.__el&&globalThis.__el(e)}prevSrc=null}S.loops[k].sid=sm.id;S.loops[k].on=1;S.loops[k].bars=0;loopKillOne(k);ensureBuf(sm).then(renderLoops);renderLoops();save();toast(sm.name+' → loop '+(k+1)+(playing?' · startar nästa varv':' · tryck play'));if(libTarget)closeLib()}
function renderLib(){[...$('#libTabs').children].forEach(b=>b.classList.toggle('cur',b.dataset.t===libTab));
  const grid=$('#libGrid'),act=$('#libAct');grid.innerHTML='';act.innerHTML='';
  const tg=libTarget;$('#libTarget').textContent=tg?(tg.type==='loop'?'välj en loop till plats '+(tg.k+1):'välj ett ljud till '+TRACKS[tg.i].name.toLowerCase()):'';
  const items=[...SMP.values()].filter(x=>libTab==='fav'?favHas(x.id):x.kind===libTab&&(libSrc==='alla'||(libSrc==='blonda')===!!x.pack)&&(!libGroup||x.group===libGroup)).sort((a,b)=>(!!a.pack-!!b.pack)||(a.pack?(!!b.fav-!!a.fav):0)||(b.t-a.t)).sort((a,b)=>favHas(b.id)-favHas(a.id));$('#libCount').textContent=SMP.size+' ljud · '+PRESETS.length+' presets';
  if(libTab==='preset'){const i=S.sel,t=TRACKS[i];const b=document.createElement('button');b.textContent='+ spara '+t.name.toLowerCase()+' som preset';
    b.onclick=()=>{const pr=makePreset(i);PRESETS.unshift(pr);savePresetsLocal();cloudPushPreset(pr);renderLib();toast('Preset sparad: '+pr.name)};act.appendChild(b);
    if(!PRESETS.length){grid.innerHTML='<div class="lib-empty"><b>Inga presets än</b>Välj ett spår, ställ in ljudet och tryck “spara som preset”.<br>Presets synkas mellan dina enheter när du är inloggad.</div>';return}
    [...PRESETS].sort((a,b)=>favHas('pr:'+b.id)-favHas('pr:'+a.id)).forEach(pr=>{const el=document.createElement('div');el.className='st';const ft=TRACKS.find(x=>x.id===pr.from)||TRACKS[0];
      el.innerHTML='<div class="nm"></div><div class="mt"><span class="cl"></span><span></span></div><div class="ch"></div>';el.querySelector('.nm').textContent=pr.name;favStar(el,'pr:'+pr.id);
      el.querySelector('.cl').style.background=ft.hex;el.querySelector('.mt span:last-child').textContent=(pr.kind==='mel'?'synth':'trumma')+' · '+new Date(pr.t).toLocaleDateString('sv-SE',{day:'numeric',month:'short'})+(pr.cloud?' · ☁':'');
      const ch=el.querySelector('.ch');TRACKS.forEach((t,i)=>{if(!!t.mel!==(pr.kind==='mel'))return;const bt=document.createElement('button');bt.dataset.ti=i;bt.style.setProperty('--c',t.hex);bt.innerHTML='<i></i>'+t.name.toLowerCase();bt.classList.toggle('on',i===S.sel);bt.onclick=()=>applyPreset(pr,i);ch.appendChild(bt)});
      const del=document.createElement('button');del.className='del';del.textContent='radera';del.onclick=()=>{if(!del.classList.contains('warn')){del.classList.add('warn');del.textContent='säker?';setTimeout(()=>{del.classList.remove('warn');del.textContent='radera'},2200);return}
        PRESETS=PRESETS.filter(x=>x!==pr);savePresetsLocal();cloudDel('pr_'+pr.id);renderLib()};ch.appendChild(del);grid.appendChild(el)});return}
  if(libTab!=='preset'&&libTab!=='fav'){const f=document.createElement('div');f.className='lib-flt';
    const chip=(lbl,on,fn)=>{const b=document.createElement('button');b.textContent=lbl;b.classList.toggle('on',on);b.onclick=fn;f.appendChild(b)};
    [['alla','alla'],['blonda','blonda'],['egna','egna']].forEach(([k,l])=>chip(l,libSrc===k,()=>{libSrc=k;if(k==='egna')libGroup='';renderLib()}));
    if(libSrc!=='egna'){f.appendChild(document.createElement('i'));const gs=PACK_GROUPS[libTab]||[];
      if(!gs.some(g=>g[0]===libGroup))libGroup='';chip('allt',!libGroup,()=>{libGroup='';renderLib()});gs.forEach(([k,l])=>chip(l,libGroup===k,()=>{libGroup=k;renderLib()}))}
    act.appendChild(f)}
  if(!items.length&&libTab==='fav'){grid.innerHTML='<div class="lib-empty"><b>Inga favoriter än</b>Tryck på ☆ på ett ljud eller en loop så samlas de här. Presets får också ☆ och hamnar först i sin flik.</div>';return}
  if(!items.length){grid.innerHTML=`<div class="lib-empty"><b>${libTab==='loop'?'Inga loopar än':'Inga one-shots än'}</b>Dra in ljudfiler hit, eller tryck “lägg till ljud”.<br>${libTab==='loop'?'Loopar sträcks automatiskt till ditt tempo.':'Korta ljud (under 1,6 s) hamnar här och kan läggas på trumspåren.'}</div>`;return}
  items.forEach(sm=>{const el=document.createElement('div');el.className='st';const isT=tg&&((tg.type==='loop'&&S.loops[tg.k].sid===sm.id)||(tg.type==='drum'&&S.dk[TRACKS[tg.i].id]==='smp:'+sm.id));el.classList.toggle('hl',!!isT);
    el.innerHTML='<div class="wv"><canvas></canvas><span class="pl">▶</span></div><div class="nm"></div><div class="mt"></div><div class="ch"></div>'+(sm.pack?'<span class="pk">BLONDA</span>':sm.asset?'<span class="cloud" title="synkad">☁</span>':'');
    favStar(el,sm.id);el.querySelector('.nm').textContent=sm.name;el.querySelector('.mt').textContent=sm.kind==='loop'?sm.bars+' takt'+(sm.bars>1?'er':'')+' · '+Math.round(sm.bpm)+' bpm · '+sm.dur.toFixed(1)+' s':(sm.dur<1?Math.round(sm.dur*1000)+' ms':sm.dur.toFixed(2)+' s');
    el.querySelector('.wv').onclick=()=>previewSmp(sm,el);const ch=el.querySelector('.ch');chopBtn(sm,ch);
    if(sm.kind==='loop'){[1,2,4,8].forEach(n=>{const b=document.createElement('button');b.className='bars'+(sm.bars===n?' on':'');b.textContent=n+'t';b.title=n+' takter';b.onclick=()=>{sm.bars=n;sm.bpm=240*n/sm.dur;if(sm.pack){packBars[sm.id]=n;savePackBars()}idbDo('readwrite',st=>{const r=st.get(sm.id);r.onsuccess=()=>{if(r.result){r.result.bars=n;r.result.bpm=sm.bpm;st.put(r.result)}}});cloudMeta(sm);renderLib();renderLoops()};ch.appendChild(b)});
      if(tg&&tg.type==='loop'){const b=document.createElement('button');b.className='go';b.textContent='→ loop '+(tg.k+1);b.onclick=()=>assignLoop(sm,tg.k);ch.appendChild(b)}
      else [0,1,2,3].forEach(k=>{const b=document.createElement('button');b.textContent='L'+(k+1);b.classList.toggle('on',S.loops[k].sid===sm.id);b.onclick=()=>assignLoop(sm,k);ch.appendChild(b)})}
    else{if(tg&&tg.type==='drum'){const b=document.createElement('button');b.className='go';b.textContent='→ '+TRACKS[tg.i].name.toLowerCase();b.onclick=()=>assignHit(sm,tg.i);ch.appendChild(b)}
      else TRACKS.forEach((t,i)=>{if(t.mel)return;const b=document.createElement('button');b.style.setProperty('--c',t.hex);b.dataset.ti=i;b.innerHTML='<i></i>'+trkNo(i);b.title=t.name;b.classList.toggle('on',S.dk[t.id]==='smp:'+sm.id);b.onclick=()=>assignHit(sm,i);ch.appendChild(b)})}
    if(sm.pack){grid.appendChild(el);requestAnimationFrame(()=>drawWave(el.querySelector('canvas'),sm.pk,sm.kind==='loop'?'#6BE28C':'#F2C318',null,sm.kind==='loop'?sm.bars*4:0));return}
    const del=document.createElement('button');del.className='del';del.textContent='×';del.title='Radera';del.onclick=()=>{if(!del.classList.contains('warn')){del.classList.add('warn');del.textContent='radera?';setTimeout(()=>{del.classList.remove('warn');del.textContent='×'},2200);return}
      SMP.delete(sm.id);idbDel(sm.id);cloudDel('smp_'+sm.id,sm.asset);S.loops.forEach((L,k)=>{if(L.sid===sm.id){L.sid=null;loopKillOne(k)}});for(const k in S.dk)if(S.dk[k]==='smp:'+sm.id)delete S.dk[k];save();renderLib();renderLoops()};ch.appendChild(del);
    grid.appendChild(el);requestAnimationFrame(()=>drawWave(el.querySelector('canvas'),sm.pk,sm.kind==='loop'?'#6BE28C':'#F2C318',null,sm.kind==='loop'?sm.bars*4:0))})}

/* cloud sync (optional): Claude sign-in → private per-user library, files in the artifact's asset store */
const CL={db:null,assets:null,uid:null,col:null,on:false};
function syncPill(state,txt){const p=$('#syncPill');p.className='sync'+(state?' '+state:'');p.querySelector('span').textContent=txt}
async function cloudInit(){if(!(window.claude&&window.claude.use)||window.BLONDA_NATIVE)return;try{
  const [db,user]=await Promise.all([window.claude.use('db'),window.claude.use('user')]);if(!db||!user){syncPill('','lokalt · logga in för synk');return}
  const uid=await user.id();if(!uid){syncPill('','lokalt · logga in för synk');return}
  CL.db=db;CL.uid=uid;CL.col=db.collection('data/users/'+uid);CL.assets=await window.claude.use('assets');CL.on=true;syncPill('busy','synkar…');
  const snap=await CL.col.get();let got=0;
  snap.docs.forEach(d=>{const o=d.data();if(!o)return;
    if(o.type==='smp'&&!SMP.has(o.id)){SMP.set(o.id,{id:o.id,name:o.name,kind:o.kind,bars:o.bars,bpm:o.bpm,dur:o.dur,pk:o.pk,norm:o.norm,mime:o.mime,asset:o.asset,t:o.t,buf:null});idbPut({id:o.id,name:o.name,kind:o.kind,bars:o.bars,bpm:o.bpm,dur:o.dur,pk:o.pk,norm:o.norm,mime:o.mime,asset:o.asset,t:o.t,data:null});got++}
    else if(o.type==='smp'){const sm=SMP.get(o.id);if(!sm.asset&&o.asset)sm.asset=o.asset}
    if(o.type==='preset'&&!PRESETS.some(x=>x.id===o.data.id)){PRESETS.push(Object.assign(o.data,{cloud:1}));got++}});
  PRESETS.sort((a,b)=>b.t-a.t);savePresetsLocal();
  for(const sm of SMP.values())if(!sm.asset&&!sm.pack){const rec=await idbDo('readonly',st=>st.get(sm.id));if(rec&&rec.data)await cloudPushSample(sm,rec.data,true)}
  for(const pr of PRESETS)if(!pr.cloud)await cloudPushPreset(pr,true);
  syncPill('on','synkat'+(CL.assets?'':' · presets'));warmSamples();renderLoops();if(!lib.hidden)renderLib();if(got)toast(got+' ljud/presets hämtade från molnet')
  }catch(e){syncPill('','lokalt · synk ej tillgänglig')}}
async function cloudPushSample(sm,ab,quiet){if(!CL.on||!CL.assets||sm.asset)return;if(ab.byteLength>14.5e6){if(!quiet)toast(sm.name+' är för stor för synk (max ~14 MB)');return}
  try{syncPill('busy','laddar upp…');const b64=await abToB64(ab),blob=new Blob([JSON.stringify({blonda:'smp',mime:sm.mime,b64})],{type:'application/json'});
    const up=await CL.assets.upload(blob,{type:'application/json'});sm.asset=up.id;
    await CL.col.doc('smp_'+sm.id).set({type:'smp',id:sm.id,name:sm.name,kind:sm.kind,bars:sm.bars,bpm:sm.bpm,dur:sm.dur,pk:sm.pk,norm:sm.norm,mime:sm.mime,asset:up.id,t:sm.t});
    idbDo('readwrite',st=>{const r=st.get(sm.id);r.onsuccess=()=>{if(r.result){r.result.asset=up.id;st.put(r.result)}}});syncPill('on','synkat');if(!lib.hidden)renderLib()}
  catch(e){syncPill('','synk misslyckades · '+((e&&e.code)||'fel'))}}
async function cloudMeta(sm){if(!CL.on||!sm.asset)return;try{await CL.col.doc('smp_'+sm.id).update({bars:sm.bars,bpm:sm.bpm})}catch(e){globalThis.__el&&globalThis.__el(e)}}
async function cloudPushPreset(pr,quiet){if(!CL.on)return;try{await CL.col.doc('pr_'+pr.id).set({type:'preset',data:JSON.parse(JSON.stringify(pr))});pr.cloud=1;savePresetsLocal();if(!quiet&&!lib.hidden)renderLib()}catch(e){globalThis.__el&&globalThis.__el(e)}}
async function cloudDel(docId,asset){if(!CL.on)return;try{await CL.col.doc(docId).delete();if(asset&&CL.assets)await CL.assets.delete(asset)}catch(e){globalThis.__el&&globalThis.__el(e)}}
loadLocalLib().then(loadPack).then(()=>setTimeout(cloudInit,400));

