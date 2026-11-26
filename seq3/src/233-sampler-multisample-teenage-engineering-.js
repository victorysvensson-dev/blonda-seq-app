/* ================= Sampler: multisample + teenage engineering (v243) =================
   A card of its own (Sampler). It
   1. recognises teenage engineering gear on MIDI and USB audio (OP-XY, OP-1 field, OP-Z, TP-7, TX-6, EP-133 …) by name
      and shows what each can do;
   2. sends SEQ.3's tracks to the right MIDI channels: a table per track (channel and, for drums, the note), with a
      ready setup per device (OP-XY: drums on track 1, the synths on tracks 2–8 …);
   3. autosamples: plays a note on the instrument over MIDI, records it from the chosen input (USB audio from OP-XY /
      OP-1 field, or any input), trims and levels every note and builds a multisample instrument;
   4. plays the instrument on any synth track in SEQ.3 (sequencer, piano, MIDI in), and
   5. saves it for teenage engineering: an OP-XY multisampler preset (.preset folder with patch.json, zipped) or an
      OP-1 field patch (synth sampler with one sample, or a drum kit with 24 notes).
   Recording needs the app (iPad / Mac) or Chrome on a computer. ================= */
(()=>{
  const card=document.querySelector('.card[data-card="sampler"]');if(!card)return;
  const body=card.querySelector('.tx');
  const LS='blonda.tex.v1';
  const cfg=Object.assign({route:null,dev:'',outId:'',ch:1,inId:'',from:36,to:84,step:3,hold:2,tail:1.5,vel:100,loop:1,name:''},(()=>{try{return JSON.parse(localStorage.getItem(LS)||'{}')}catch(e){return {}}})());
  const saveCfg=()=>{try{localStorage.setItem(LS,JSON.stringify(cfg))}catch(e){globalThis.__el&&globalThis.__el(e)}};
  const esc=x=>String(x==null?'':x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const NN=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'],nname=n=>NN[((n%12)+12)%12]+(Math.floor(n/12)-1);
  const NATIVE=!!window.BLONDA_NATIVE;

  /* ---------------- 1. the devices ---------------- */
  /* drums: SEQ.3's drum tracks → note. GM: what most drum machines and DAWs expect. OP-XY: its drum keyboard (lowest F
     kick, G snare, C# hat … as in the OP-XY guide), starting at F3 = 53. */
  const DR_GM={kick:36,snare:38,clap:39,hat:42,ohat:46,perc:37,tom:45,rim:37,shaker:70,bell:56,conga:63,clave:75,snap:39,tick:76,kick2:35,snare2:40};
  const DR_XY={kick:53,snare:55,clap:57,hat:61,ohat:63,perc:59,tom:60,rim:58,shaker:62,bell:64,conga:65,clave:66,snap:67,tick:68,kick2:54,snare2:56};
  /* each profile: how to recognise it, what it is, and the default routing (track → channel 1–16, 0 = off) */
  const PROF=[
    {id:'opxy',name:'OP-XY',re:/op-?xy/i,kind:'synth · sampler · sequencer',audio:'USB audio: stereo or 8 channels out',
      ms:'multisampler presets (24 zones)',routeName:'drums → track 1 · synths → tracks 2–8',
      route:{drums:1,bass:2,keys:3,lead:4,pad:5,syn5:6,syn6:7,syn7:8,syn8:0},drum:DR_XY},
    {id:'op1f',name:'OP-1 field',re:/op-?1\s*f(ield)?/i,kind:'synth · sampler · tape',audio:'USB audio: stereo in and out',
      ms:'synth sampler and drum kits (.aif)',routeName:'one channel: the synth you play (1)',
      route:{drums:1,bass:1,keys:1,lead:1,pad:1,syn5:0,syn6:0,syn7:0,syn8:0},drum:DR_GM},
    {id:'opz',name:'OP-Z',re:/op-?z\b/i,kind:'sequencer · synth',audio:'USB audio out',ms:'drum and synth sample packs (later)',
      routeName:'kick 1 · snare 2 · perc 3 · bass 5 · lead 6 · arp 7 · chord 8',
      route:{drums:'opz',bass:5,keys:8,lead:6,pad:8,syn5:7,syn6:0,syn7:0,syn8:0},drum:{kick:60,snare:60,clap:60,hat:62,ohat:64,perc:65,tom:67,rim:69,shaker:71,bell:72,conga:74,clave:76,snap:77,tick:79,kick2:62,snare2:62}},
    {id:'tp7',name:'TP-7',re:/tp-?7/i,kind:'field recorder',audio:'USB audio interface',ms:'—',routeName:'—',route:null},
    {id:'tx6',name:'TX-6',re:/tx-?6/i,kind:'field mixer',audio:'USB audio: up to 12 in / 12 out',ms:'—',routeName:'—',route:null},
    {id:'ep133',name:'EP-133 K.O. II',re:/ep-?133|k\.?o\.?\s*ii/i,kind:'sampler · drum machine',audio:'—',ms:'sample transfer (later)',
      routeName:'drums → group A (1) · bass → group C (3)',route:{drums:1,bass:3,keys:4,lead:4,pad:4,syn5:0,syn6:0,syn7:0,syn8:0},drum:DR_GM},
    {id:'ep1320',name:'EP-1320',re:/ep-?1320/i,kind:'sampler · drum machine',audio:'—',ms:'—',routeName:'drums → group A (1)',
      route:{drums:1,bass:3,keys:4,lead:4,pad:4,syn5:0,syn6:0,syn7:0,syn8:0},drum:DR_GM},
    {id:'op1',name:'OP-1',re:/\bop-?1\b(?!\s*f)/i,kind:'synth · sampler',audio:'—',ms:'synth sampler and drum kits (.aif)',routeName:'one channel (1)',
      route:{drums:1,bass:1,keys:1,lead:1,pad:1,syn5:0,syn6:0,syn7:0,syn8:0},drum:DR_GM},
    {id:'ortho',name:'Ortho Remote',re:/ortho/i,kind:'remote · knob',audio:'—',ms:'—',routeName:'—',route:null},
    {id:'cm15',name:'CM-15',re:/cm-?15/i,kind:'microphone',audio:'USB audio in',ms:'—',routeName:'—',route:null}];
  const profOf=name=>PROF.find(p=>p.re.test(name||''))||null;

  let acc=null,inputs=[],nativeIns=[];
  async function midi(){if(acc)return acc;if(!navigator.requestMIDIAccess)return null;try{acc=await navigator.requestMIDIAccess({sysex:false});acc.onstatechange=()=>{scan();paint()};return acc}catch(e){return null}}
  async function audioList(){let l=[];
    if(NATIVE&&BLONDA_NATIVE.audioIn&&nativeIns.length)l=nativeIns.map(p=>({id:'n:'+p.uid,uid:p.uid,name:p.name,usb:!!p.usb,ch:p.channels||0}));
    else if(navigator.mediaDevices&&navigator.mediaDevices.enumerateDevices){try{l=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audioinput').map((d,k)=>({id:'d:'+d.deviceId,dev:d.deviceId,name:d.label||('input '+(k+1)),usb:/usb|op-|tp-|tx-|cm-/i.test(d.label||'')}))}catch(e){globalThis.__el&&globalThis.__el(e)}}
    inputs=l;return l}
  let devs=[];
  function scan(){const m=new Map();const add=(name,k,v)=>{const p=profOf(name);if(!p)return;const d=m.get(p.id)||{p,midiIn:null,midiOut:null,audio:null};d[k]=v;m.set(p.id,d)};
    if(acc){acc.inputs.forEach(x=>add(x.name,'midiIn',x));acc.outputs.forEach(x=>add(x.name,'midiOut',x))}
    inputs.forEach(x=>add(x.name,'audio',x));devs=[...m.values()];return devs}

  /* ---------------- 2. MIDI channels: SEQ.3's tracks → channel / note ---------------- */
  /* the routing used when "send notes" is on in the MIDI panel. Without a routing of its own SEQ.3 sends as before. */
  const TRK=()=>TRACKS.map(t=>({id:t.id,name:t.name,mel:!!t.mel}));
  function setProfile(p){if(!p||!p.route){cfg.route=null;cfg.dev='';saveCfg();return}const R={};
    TRK().forEach(t=>{if(t.mel){R[t.id]={ch:p.route[t.id]!=null?p.route[t.id]:0}}
      else if(p.route.drums==='opz'){const z={kick:1,snare:2}[t.id]||3;R[t.id]={ch:z,n:(p.drum&&p.drum[t.id])||60}}
      else R[t.id]={ch:p.route.drums||10,n:(p.drum&&p.drum[t.id])||DR_GM[t.id]||36}});
    cfg.route=R;cfg.dev=p.id;saveCfg()}
  /* called by the MIDI module for each note it sends: {ch (0–15), n} or false (this track sends nothing) or null (as before) */
  function route(id,mel,note){const R=cfg.route&&cfg.route[id];if(!R)return null;if(!R.ch)return false;return {ch:R.ch-1,n:mel?note:(R.n!=null?R.n:DR_GM[id]||36)}}

  /* ---------------- 3. recording ---------------- */
  const REC_SRC=`registerProcessor('tx-rec',class extends AudioWorkletProcessor{constructor(){super();this.on=true;this.port.onmessage=e=>{if(e.data==='stop')this.on=false}}
    process(i){const a=i[0];if(a&&a.length){const L=a[0],R=a[1]||a[0];this.port.postMessage([L.slice(0),R.slice(0)])}return this.on}})`;
  let rec=null;/* {ac,stream,node,chunks:[[L,R]],frames,peak} */
  async function recStart(inp){await recStop();
    if(NATIVE&&BLONDA_NATIVE.audioIn&&inp&&inp.uid){BLONDA_NATIVE.audioIn.select(inp.uid);await new Promise(r=>setTimeout(r,250))}
    /* the app records itself (WebKit on the Mac cannot record; on iPad this skips WebKit's processing) */
    const NR=NATIVE&&BLONDA_NATIVE.audioIn&&BLONDA_NATIVE.audioIn.rec;
    if(NR){const R={nat:NR,chunks:[],frames:0,peak:0,lvl:0,sr:48000};const take=mkTake(R);
      const st=await NR.start((L,Rr,sr)=>{if(sr)R.sr=sr;take(L,Rr)});if(!st||!st.ok){NR.stop();throw new Error(st&&st.err==='denied'?'the microphone is not allowed':'no input'+(st&&st.err&&st.err!=='no input'?' ('+st.err+')':''))}
      if(st.sr)R.sr=st.sr;rec=R;return R}
    const c={echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:{ideal:2},sampleRate:{ideal:48000}};if(inp&&inp.dev)c.deviceId={exact:inp.dev};
    const stream=await navigator.mediaDevices.getUserMedia({audio:c});
    const AC=window.AudioContext||window.webkitAudioContext,ac=new AC({sampleRate:48000});
    const src=ac.createMediaStreamSource(stream),sink=ac.createGain();sink.gain.value=0;sink.connect(ac.destination);
    /* src and sink are kept on R: a stream source nobody holds on to can be collected and then records silence */
    const R={ac,stream,src,sink,chunks:[],frames:0,peak:0,lvl:0,node:null,sr:ac.sampleRate};
    const take=mkTake(R);
    try{const u=URL.createObjectURL(new Blob([REC_SRC],{type:'application/javascript'}));await ac.audioWorklet.addModule(u);
      const n=new AudioWorkletNode(ac,'tx-rec',{numberOfInputs:1,numberOfOutputs:1,channelCount:2,channelCountMode:'explicit'});n.port.onmessage=e=>take(e.data[0],e.data[1]);src.connect(n);n.connect(sink);R.node=n}
    catch(e){const n=ac.createScriptProcessor(2048,2,2);n.onaudioprocess=ev=>{const b=ev.inputBuffer;take(b.getChannelData(0).slice(0),(b.numberOfChannels>1?b.getChannelData(1):b.getChannelData(0)).slice(0))};src.connect(n);n.connect(sink);R.node=n}
    if(ac.state!=='running')try{await ac.resume()}catch(e){globalThis.__el&&globalThis.__el(e)}
    rec=R;return R}
  function mkTake(R){return (L,Rr)=>{R.chunks.push([L,Rr]);R.frames+=L.length;let m=0;for(let k=0;k<L.length;k+=4){const v=Math.max(Math.abs(L[k]),Math.abs(Rr[k]));if(v>m)m=v}R.lvl=Math.max(m,R.lvl*.9);if(m>R.peak)R.peak=m}}
  async function recStop(){if(!rec)return;const R=rec;rec=null;if(R.nat){R.nat.stop();return}try{R.node.port&&R.node.port.postMessage('stop')}catch(e){globalThis.__el&&globalThis.__el(e)}try{R.stream.getTracks().forEach(t=>t.stop())}catch(e){globalThis.__el&&globalThis.__el(e)}try{await R.ac.close()}catch(e){globalThis.__el&&globalThis.__el(e)}}
  function dropBefore(R,frame){/* keep memory small: chunks wholly before frame are dropped (frames stay counted) */let pos=R.base||0;while(R.chunks.length&&pos+R.chunks[0][0].length<frame){pos+=R.chunks[0][0].length;R.chunks.shift()}R.base=pos}
  function grabB(R,from,to){const base=R.base||0;const n=Math.max(0,to-from),L=new Float32Array(n),Rr=new Float32Array(n);let pos=base,w=0;
    for(const [a,b] of R.chunks){const e=pos+a.length;if(e>from&&pos<to){const s=Math.max(from,pos)-pos,z=Math.min(to,e)-pos;L.set(a.subarray(s,z),w);Rr.set(b.subarray(s,z),w);w+=z-s}pos=e;if(pos>=to)break}return [L,Rr]}

  /* ---------------- 4. the autosampler ---------------- */
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const notesFor=()=>{const a=Math.min(cfg.from,cfg.to),b=Math.max(cfg.from,cfg.to),st=Math.max(1,cfg.step|0),out=[];for(let n=a;n<=b;n+=st)out.push(n);if(out[out.length-1]!==b&&b-out[out.length-1]>=Math.ceil(st/2))out.push(b);return out};
  let job=null;/* {notes, i, state:'rec'|'done'|'stop'|'err', got:[{n,ok}], msg} */
  async function autosample(){if(job&&job.state==='rec'){job.state='stop';return}
    const out=acc&&[...acc.outputs.values()].find(o=>o.id===cfg.outId),inp=inputs.find(x=>x.id===cfg.inId)||inputs[0];
    if(!out){toast('Pick the instrument (MIDI out) first');return}if(!inp&&!NATIVE){toast('Pick the input the sound comes in on');return}
    const notes=notesFor(),ch=Math.max(1,Math.min(16,cfg.ch|0))-1,vel=Math.max(1,Math.min(127,cfg.vel|0));
    job={notes,i:0,state:'rec',got:notes.map(n=>({n,ok:null})),msg:'listening to the input …'};paint();
    let R;try{R=await recStart(inp)}catch(e){job.state='err';job.msg='Could not record: '+(e&&e.message||e)+(NATIVE?' – allow the microphone for SEQ.3 in Settings':'');paint();return}
    const sr=R.sr,F=s=>Math.round(s*sr),takes=[];
    try{
      await sleep(450);/* the noise floor: what comes in before the first note */
      const nf=grabB(R,Math.max(0,R.frames-F(.3)),R.frames);let noise=0;for(let k=0;k<nf[0].length;k++)noise=Math.max(noise,Math.abs(nf[0][k]),Math.abs(nf[1][k]));
      const thr=Math.max(noise*3,Math.pow(10,-56/20));
      for(let k=0;k<notes.length;k++){if(job.state!=='rec')break;job.i=k;job.msg='recording '+nname(notes[k])+' ('+(k+1)+' of '+notes.length+')';paint();
        const n=notes[k];try{out.send([0xB0|ch,123,0])}catch(e){globalThis.__el&&globalThis.__el(e)}await sleep(60);
        const s0=R.frames;try{out.send([0x90|ch,n,vel])}catch(e){globalThis.__el&&globalThis.__el(e)}
        await sleep(cfg.hold*1000);try{out.send([0x80|ch,n,0])}catch(e){globalThis.__el&&globalThis.__el(e)}
        /* the tail: until it has been quiet for 150 ms, at most the tail time */
        const tEnd=performance.now()+cfg.tail*1000;let quiet=0;
        while(performance.now()<tEnd&&job.state==='rec'){await sleep(40);quiet=R.lvl<thr*1.2?quiet+40:0;if(quiet>=150)break}
        const [L,Rr]=grabB(R,s0,R.frames);dropBefore(R,R.frames-F(.5));
        const t=trim(L,Rr,thr,sr,cfg.hold);job.got[k].ok=!!t;if(t)takes.push(Object.assign(t,{root:n}));paint()}
      try{out.send([0xB0|ch,123,0])}catch(e){globalThis.__el&&globalThis.__el(e)}
    }finally{await recStop();if(NATIVE&&BLONDA_NATIVE.audioIn)BLONDA_NATIVE.audioIn.close()}
    if(job.state==='stop'&&!job.got.some(g=>g.ok)){job=null;paint();return}
    const okN=job.got.filter(g=>g.ok).length;
    if(!okN){job.state='err';job.msg='No sound came in. Check the input, the MIDI channel ('+(ch+1)+') and that the instrument plays a sound on that channel.';paint();return}
    job.msg='building the instrument …';paint();
    try{await build(takes,sr)}catch(e){job.state='err';job.msg='Could not build the instrument: '+(e&&e.message||e);paint();return}
    job=null;paint();
  }
  /* one recorded note: start at the attack, end when it has died away, short fades; null when nothing came in */
  function trim(L,R,thr,sr,hold){const N=L.length;let a=-1,pk=0;for(let k=0;k<N;k++){const v=Math.max(Math.abs(L[k]),Math.abs(R[k]));if(v>pk)pk=v;if(a<0&&v>thr)a=k}
    if(a<0||pk<thr*2)return null;a=Math.max(0,a-Math.round(sr*.0015));
    const end0=Math.min(N,a+Math.round(sr*(hold+30)));let z=end0;const tail=Math.max(thr*.5,pk*Math.pow(10,-66/20)),win=Math.round(sr*.02);
    for(let k=end0-1;k>a;k-=win){let m=0;for(let j=Math.max(a,k-win);j<k;j++)m=Math.max(m,Math.abs(L[j]),Math.abs(R[j]));if(m>tail){z=Math.min(N,k+win);break}}
    const l=L.slice(a,z),r=R.slice(a,z),fi=Math.min(l.length,Math.round(sr*.001)),fo=Math.min(l.length,Math.round(sr*.012));
    for(let k=0;k<fi;k++){const g=k/fi;l[k]*=g;r[k]*=g}for(let k=0;k<fo;k++){const g=k/fo,j=l.length-1-k;l[j]*=g;r[j]*=g}
    let same=true;for(let k=0;k<l.length;k+=7)if(Math.abs(l[k]-r[k])>1e-3){same=false;break}
    return {L:l,R:same?null:r,peak:pk,holdEnd:Math.min(l.length,Math.round(sr*hold)-(Math.round(sr*.0015)))}}
  /* a clean loop in the held part, so long notes keep sounding: the loop's end is cross-faded into the audio before its
     start (baked into the sample), so it loops without a click in SEQ.3 and on the OP-XY alike */
  /* (v273) the automatic loop listens to the note (the same finder as BLONDA SAMPLER): the steady part after the attack and
     before the release, the real period of the note (also when it is detuned), the seam where the sound really repeats,
     the longest loop that is still clean, never across a click. Cross-fade as long as the seam needs. */
/* BLONDA loop finder: listens to the note and picks the loop where the sound really repeats.
   1. finds the steady part (after the attack, before it dies away or is released) from the level curve
   2. measures the real period of the note (autocorrelation – works when the note is detuned or the root is wrong)
   3. tries many loop ends and lengths (whole periods, short to long) and scores each seam: how alike the sound is just
      before the loop end and just before the loop start (what plays across the seam), how equal the level is, and how
      steady the level is inside the loop; longer loops win ties (they sound less static)
   4. fine-tunes the best ones sample by sample and ends both points on rising zero crossings
   Returns {s,e,q,per,why} – q is the seam match 0..1 – or null when the note has no steady part long enough. */
function findLoop(L,R,sr,a0,b0,root,opt){
  opt=opt||{};const N=L.length;a0=Math.max(1,a0|0);b0=Math.min(N-1,b0|0);if(b0-a0<sr*.15)return null;
  /* mono mix */
  const x=new Float32Array(b0-a0);for(let k=0;k<x.length;k++)x[k]=R?(L[a0+k]+R[a0+k])*.5:L[a0+k];
  const n=x.length;
  /* 1. level curve (10 ms) and the steady part */
  const hop=Math.max(1,Math.round(sr*.01)),env=[];for(let k=0;k+hop<=n;k+=hop){let s=0;for(let j=k;j<k+hop;j++)s+=x[j]*x[j];env.push(Math.sqrt(s/hop))}
  if(env.length<10)return null;let pk=0,pi=0;env.forEach((v,i)=>{if(v>pk){pk=v;pi=i}});if(pk<1e-5)return null;
  const db=v=>20*Math.log10(Math.max(v,1e-9)/pk);
  /* start: after the peak, once the level stops falling fast (attack/decay over) */
  /* (the attack is over when the level first comes within 3 dB of its peak – not at the peak itself, which can lie
     anywhere in a sound with tremolo or a swell) */
  let a3=0;while(a3<env.length-1&&db(env[a3])<-3)a3++;
  let sA=a3;for(let i=a3;i<env.length-3;i++){const d=db(env[i])-db(env[i+3]);sA=i;if(d<1.2)break}
  /* and the tone must have settled too (a filter or brightness that still moves after the attack): brightness per 10 ms
     must stay within 12 % of what it is later on */
  {const br=env.map((v,i)=>{let s=0;const k0=i*hop;for(let j=k0+1;j<k0+hop;j++){const d=x[j]-x[j-1];s+=d*d}return Math.sqrt(s/hop)/(v+1e-9)});
    let eB=env.length-1;for(let i=sA;i<env.length;i++)if(db(env[i])<-30){eB=i;break}
    const late=br.slice(Math.round(sA+(eB-sA)*.5),eB).sort((a,b)=>a-b),ref=late[Math.floor(late.length/2)];
    if(ref>0)for(let i=sA;i<eB-5;i++){let ok=true;for(let j=i;j<i+5;j++)if(Math.abs(br[j]/ref-1)>.12){ok=false;break}if(ok){sA=i;break}}}
  sA=Math.min(sA+5,env.length-1);/* +50 ms */
  /* end: before the level falls under −30 dB of the peak (or the region ends) */
  let sB=env.length-1;for(let i=sA;i<env.length;i++)if(db(env[i])<-30){sB=i-1;break}
  /* and before the release: the end of the part that stays near its usual level (within 4 dB of the median) */
  {const ds=env.slice(sA,sB+1).map(db).sort((a,b)=>a-b),med=ds[Math.floor(ds.length/2)];while(sB>sA+20&&db(env[sB])<med-4)sB--}
  sB=Math.max(sA,sB-2);
  let A=sA*hop,B=sB*hop;if(B-A<sr*.12){A=Math.round(n*.25);B=Math.round(n*.9);if(B-A<sr*.12)return null}
  /* 2. the real period: autocorrelation on a window in the middle of the steady part */
  const f0=440*Math.pow(2,((root||60)-69)/12);
  const per=(()=>{const W=Math.min(Math.round(sr*.08),Math.floor((B-A)/2)),c0=Math.round((A+B)/2-W/2),mn=Math.max(8,Math.floor(sr/2500)),mx=Math.min(Math.floor(sr/25),W-1);
    let e0=0;for(let j=0;j<W;j++)e0+=x[c0+j]*x[c0+j];if(e0<=0)return null;const r=new Float32Array(mx+2);
    for(let lag=mn;lag<=mx+1;lag++){let s=0,e1=0;for(let j=0;j<W;j++){const v=x[c0+j+lag]||0;s+=x[c0+j]*v;e1+=v*v}r[lag]=s/Math.sqrt(e0*e1||1)}
    /* the first strong peak (avoids octave errors), refined by parabola; near the expected period when it is as strong */
    let best=0,bl=0;for(let lag=mn+1;lag<=mx;lag++)if(r[lag]>r[lag-1]&&r[lag]>=r[lag+1]&&r[lag]>best)best=r[lag];
    if(best<.5)return null;const exp=sr/f0;let pick=0,pv=-1;
    for(let lag=mn+1;lag<=mx;lag++)if(r[lag]>r[lag-1]&&r[lag]>=r[lag+1]&&r[lag]>=best*.92){const sc=r[lag]-.04*Math.abs(Math.log2(lag/exp));if(!pick||lag<pick*0.6||sc>pv+.02&&lag<pick*1.6){if(!pick||sc>pv){pick=lag;pv=sc}}if(!bl)bl=lag}
    const k=pick||bl,y0=r[k-1],y1=r[k],y2=r[k+1],d=(y0-2*y1+y2)?.5*(y0-y2)/(y0-2*y1+y2):0;return k+Math.max(-.5,Math.min(.5,d))})();
  const P=per||sr/f0;/* unpitched: the expected period only spaces the candidates */
  /* seam score: x before e vs x before s (and a bit after): what plays into the seam must look like what came before */
  const W=Math.max(64,Math.min(Math.round(sr*.012),Math.round(P*2.2)));
  const corrOn=y=>(s,e)=>{let ab=0,aa=0,bb=0;for(let j=-W;j<W;j++){const p=y[e+j],q=y[s+j];if(p===undefined||q===undefined)return -1;ab+=p*q;aa+=p*p;bb+=q*q}return ab/Math.sqrt(aa*bb||1e-12)};
  const corr=corrOn(x);
  /* the coarse scan looks at a smoothed copy (under ~1.5 kHz): sharp waves (saws) otherwise only match at single samples,
     which a coarse grid steps over */
  const xs=new Float32Array(n);{const a=Math.exp(-2*Math.PI*1500/sr);let y1=0,y2=0;for(let k=0;k<n;k++){y1=(1-a)*x[k]+a*y1;y2=(1-a)*y1+a*y2;xs[k]=y2}
    let z1=0,z2=0;for(let k=n-1;k>=0;k--){z1=(1-a)*xs[k]+a*z1;z2=(1-a)*z1+a*z2;xs[k]=z2}}
  const corrS=corrOn(xs);
  /* clicks and other bumps inside the steady part: a loop must not contain one (it would repeat forever) */
  const bump=new Uint8Array(env.length);{/* periodic notes: how much each 10 ms differs from the same 10 ms one period earlier (a click breaks the repetition);
       unpitched: how much high-frequency content it has */
    const Pi=Math.floor(P),Pf=P-Pi,hf=env.map((v,i)=>{let s=0;const k0=i*hop;if(per){if(k0-Pi-1<1)return 0;for(let j=k0;j<k0+hop;j++){const d=xs[j]-(xs[j-Pi]*(1-Pf)+xs[j-Pi-1]*Pf);s+=d*d}}else for(let j=k0+1;j<k0+hop;j++){const d=x[j]-x[j-1];s+=d*d}return Math.sqrt(s/hop)/(v+1e-9)});
    const sorted=hf.slice(sA,sB+1).sort((a,b)=>a-b),med=sorted[Math.floor(sorted.length/2)]||0;
    for(let i=1;i<env.length-1;i++){const lj=Math.abs(20*Math.log10((env[i]+1e-9)/(env[i-1]+1e-9)));if(hf[i]>med*2.5+.05||lj>4)bump[i]=1}}
  const bumpIn=(s,e)=>{for(let i=Math.floor(s/hop);i<=Math.floor(e/hop)&&i<env.length;i++)if(i>=sA&&i<=sB&&bump[i])return true;return false};

  const rmsAt=k=>{let s=0;for(let j=-W;j<W;j++){const v=x[k+j]||0;s+=v*v}return Math.sqrt(s/(2*W))};
  const lvlIn=(s,e)=>{const i0=Math.floor(s/hop),i1=Math.floor(e/hop);let lo=1e9,hi=0;for(let i=i0;i<=i1&&i<env.length;i++){lo=Math.min(lo,env[i]);hi=Math.max(hi,env[i])}return 20*Math.log10((hi+1e-9)/(lo+1e-9))};
  const up=k=>{for(let d=0;d<Math.ceil(P);d++){for(const j of [k+d,k-d])if(j>0&&j<n&&x[j-1]<=0&&x[j]>0)return j}return k};
  const minL=Math.max(P*2,sr*(opt.minLen||.08)),maxL=Math.min((B-A)*.85,sr*(opt.maxLen||1.6));if(maxL<minL)return null;
  const score=(s,e)=>{const c=corr(s,e);if(c<=-1)return -9;const dl=Math.abs(20*Math.log10((rmsAt(e)+1e-9)/(rmsAt(s)+1e-9))),inl=lvlIn(s,e),len=(e-s)/sr;
    return c-.035*dl-.012*Math.max(0,inl-3)+.03*Math.min(1,len/.6)};
  /* 3. search: for each loop end, every loop length that is a whole number of periods (so the wave lines up), short to
     long; the peaks of that scan are fine-tuned sample by sample */
  const err=c=>10*Math.log10(Math.max(1e-7,2*(1-c)));/* seam mismatch in dB (−40 = practically seamless) */
  let pool=[];const nE=12,stp=per?P/8:Math.max(16,W/4),peaks=[];
  for(let i=0;i<nE;i++){const e=up(Math.round(B-W-(B-A)*.5*i/nE));if(e-W<A||e+W>n)continue;const sc=[];
    for(let Lp=Math.ceil(minL/stp)*stp;Lp<=maxL;Lp+=stp){const s=Math.round(e-Lp);if(s-W<A)break;sc.push([corrS(s,e)-.04*Math.abs(20*Math.log10((rmsAt(e)+1e-9)/(rmsAt(s)+1e-9))),s,e])}
    sc.forEach((v,k)=>{if((k===0||v[0]>=sc[k-1][0])&&(k===sc.length-1||v[0]>=sc[k+1][0]))peaks.push(v)})}
  /* the best peaks in each length band (short to long, over all ends), fine-tuned sample by sample, then put on rising zero crossings */
  const band=v=>Math.floor(8*Math.log((v[2]-v[1])/minL)/Math.log(maxL/minL+1e-9)),top=[];
  for(let b=0;b<=8;b++)top.push(...peaks.filter(v=>band(v)===b).sort((p,q)=>q[0]-p[0]).slice(0,12));
  for(const [,s0,e] of top){const span=Math.ceil(stp*.75);let bs=s0,bc=corr(s0,e);for(let d=-span;d<=span;d++){const s=s0+d;if(s-W<A)continue;const c=corr(s,e);if(c>bc){bc=c;bs=s}}
    const zs=up(bs);if(Math.abs(zs-bs)<=Math.max(2,P*.08)){const c=corr(zs,e);if(c>bc-.002){bs=zs;bc=c}}
    if(pool.some(o=>o.e===e&&Math.abs(o.s-bs)<2))continue;
    pool.push({s:bs,e,c:bc,er:err(bc),dl:Math.abs(20*Math.log10((rmsAt(e)+1e-9)/(rmsAt(bs)+1e-9))),inl:lvlIn(bs,e),len:(e-bs)/sr})}
  if(!pool.length)return null;
  /* the choice: the longest loop whose seam is clean enough (a long loop keeps the life of the sound – vibrato, chorus,
     beating – a short one freezes it). Clean enough = within 3 dB of the best seam found, or better than −26 dB (which a
     short cross-fade hides), with the level equal on both sides (under 0.6 dB) */
  pool.forEach(c=>c.bump=bumpIn(c.s,c.e));{const clean=pool.filter(c=>!c.bump);if(clean.length)pool=clean}
  const bestEr=Math.min(...pool.map(c=>c.er)),lim=Math.max(bestEr+3,Math.min(-26,bestEr+12));
  let ok=pool.filter(c=>c.er<=lim&&c.dl<.6&&c.inl<6);if(!ok.length){const sc=c=>c.er+8*c.dl;const m=Math.min(...pool.map(sc));ok=pool.filter(c=>sc(c)<=m+3)}
  ok.sort((p,q)=>q.len-p.len||p.er-q.er);const best=[0,ok[0].s,ok[0].e];
  /* other good loops (different lengths), for "next loop" */
  const alts=[];for(const c of ok.concat(pool.filter(c=>!ok.includes(c)).sort((p,q)=>p.er-q.er))){if(alts.some(a=>Math.abs(a.len-c.len)/a.len<.06))continue;
    const q=Math.max(0,Math.min(1,c.c));alts.push({s:a0+c.s,e:a0+c.e,q,len:c.len,xf:q>.99?15:q>.95?40:q>.8?90:160});if(alts.length>=6)break}
  const [,s,e]=best,q=Math.max(0,Math.min(1,corr(s,e)));
  /* the cross-fade it needs: short when the seam already matches, long when it does not (noise, chorus) */
  const xf=Math.round(q>.99?15:q>.95?40:q>.8?90:160);
  return {s:a0+s,e:a0+e,q,xf,per:per||0,len:(e-s)/sr,steady:[a0+A,a0+B],why:per?'periodic':'unpitched',alts}}
  function addLoop(t,sr){const n=t.L.length,hold=Math.min(n,t.holdEnd);if(hold<sr*.3)return;
    const r=findLoop(t.L,t.R,sr,0,hold,t.root);if(!r)return;const s=r.s,e=r.e,len=e-s,xf=Math.min(Math.round(len/2),Math.round(sr*r.xf/1000),s);
    for(const ch of [t.L,t.R]){if(!ch)continue;for(let k=0;k<xf;k++){const g=k/xf,j=e-xf+k;ch[j]=ch[j]*(1-g)+ch[s-xf+k]*g}}
    t.loopS=s;t.loopE=e}

  /* ---------------- 5. instruments: stored, decoded, played ---------------- */
  const DB=(()=>{let p=null;return()=>p||(p=new Promise((res,rej)=>{try{const r=indexedDB.open('blonda-ms',1);r.onupgradeneeded=()=>r.result.createObjectStore('ins',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}}))})();
  const dbDo=async(mode,fn)=>{try{const db=await DB();return await new Promise((res,rej)=>{const tx=db.transaction('ins',mode),r=fn(tx.objectStore('ins'));tx.oncomplete=()=>res(r&&r.result);tx.onerror=()=>rej(tx.error)})}catch(e){return null}};
  const INS=new Map();/* id -> {meta, regions:[{root,lo,hi,buf,loopS,loopE}]} */
  const f2i=a=>{const o=new Int16Array(a.length);for(let k=0;k<a.length;k++){const v=Math.max(-1,Math.min(1,a[k]));o[k]=v<0?v*32768:v*32767}return o.buffer};
  const i2f=b=>{const a=new Int16Array(b),o=new Float32Array(a.length);for(let k=0;k<a.length;k++)o[k]=a[k]/32768;return o};
  function zones(rs){rs.sort((a,b)=>a.root-b.root);rs.forEach((r,k)=>{r.lo=k?Math.floor((rs[k-1].root+r.root)/2)+1:0;r.hi=k<rs.length-1?Math.floor((r.root+rs[k+1].root)/2):127});return rs}
  /* the takes of one autosample run → a stored instrument; the card shows it under instruments */
  async function build(takes,sr){const P=profOf(((acc&&[...acc.outputs.values()].find(o=>o.id===cfg.outId))||{}).name);
    const rec=await store(cfg.name||((P?P.name+' ':'')+'multisample'),P?P.name:'',sr,takes,!!cfg.loop);
    tab=cfg.tab='ins';cfg.insSel=rec.id;saveCfg();toast(rec.name+' · '+rec.regions.length+' notes – a new sound in Sample+');return rec}
  async function store(name,dev,sr,takes,loop){/* level all notes together (their balance stays), loops, store */
    let pk=0;takes.forEach(t=>pk=Math.max(pk,t.peak));const g=pk>0?Math.pow(10,-1/20)/pk:1;
    takes.forEach(t=>{for(const c of [t.L,t.R])if(c)for(let k=0;k<c.length;k++)c[k]*=g;if(loop)addLoop(t,sr)});
    const regs=zones(takes.map(t=>({root:t.root,sr,ch:t.R?2:1,L:f2i(t.L),R:t.R?f2i(t.R):null,len:t.L.length,loopS:t.loopS||0,loopE:t.loopE||0})));
    const id='ms'+Date.now().toString(36),rec={id,name:name||('multisample '+new Date().toLocaleDateString()),dev:dev||'',t:Date.now(),sr,att:.002,rel:.25,loop:!!loop,regions:regs};
    await dbDo('readwrite',st=>st.put(rec));await load(rec);return rec}
  async function load(rec){const AC=window.OfflineAudioContext||window.webkitOfflineAudioContext,mk=(len,ch,sr)=>new AC(ch,Math.max(1,len),sr).createBuffer(ch,Math.max(1,len),sr);
    const regions=rec.regions.map(r=>{const b=mk(r.len,r.ch,r.sr);b.getChannelData(0).set(i2f(r.L));if(r.ch>1)b.getChannelData(1).set(i2f(r.R));return {root:r.root,lo:r.lo,hi:r.hi,buf:b,loopS:r.loopS,loopE:r.loopE,sr:r.sr}});
    INS.set(rec.id,{meta:rec,regions});return INS.get(rec.id)}
  async function loadAll(){const all=await dbDo('readonly',st=>st.getAll())||[];for(const r of all)if(!INS.has(r.id))try{await load(r)}catch(e){globalThis.__el&&globalThis.__el(e)}
    if(S.ms)for(const k in S.ms){if(!INS.has(S.ms[k]))delete S.ms[k];else if(S.inst[k]!=='msx')S.inst[k]='msx'}try{refreshInst()}catch(e){globalThis.__el&&globalThis.__el(e)}paint();setTimeout(()=>{packIns()},2500)}
  /* (v273) instruments from BLONDA SAMPLER (its "SEQ.3" export, a .json): one button here and in Sample+ */
  function pickImport(){const inp=document.createElement('input');inp.type='file';inp.accept='.json,application/json';inp.multiple=true;
    inp.onchange=async()=>{let n=0,bad=0,last=null;for(const f of inp.files||[]){let o=null;try{o=JSON.parse(await f.text())}catch(e){globalThis.__el&&globalThis.__el(e)}
        const rec=o&&o.blonda==='ms'&&o.ins?await importRec(o.ins):null;if(rec){n++;last=rec}else bad++}
      if(last){cfg.insSel=last.id;saveCfg();paint();try{window.rsPaint&&rsPaint()}catch(e){globalThis.__el&&globalThis.__el(e)}}
      toast(n?(n===1?last.name+' · '+last.regions.length+' notes':n+' instruments')+' → Sample+'+(bad?' · '+bad+' file'+(bad>1?'s':'')+' not from BLONDA SAMPLER':''):'That is not a BLONDA SAMPLER file (export it with "SEQ.3")')};
    inp.click()}
  /* (v273) instruments that come with SEQ.3 (blonda-pack/pack.json "ins"): added once, so a deleted one stays deleted */
  let packDone=false;async function packIns(){if(packDone)return;packDone=true;let got={};try{got=JSON.parse(localStorage.getItem('blonda.tex.pack')||'{}')}catch(e){globalThis.__el&&globalThis.__el(e)}
    let j=null;try{j=await (await fetch('blonda-pack/pack.json')).json()}catch(e){return}
    for(const it of (j&&j.ins)||[]){if(!it||!it.id||!it.file||got[it.id])continue;if([...INS.values()].some(I=>I.meta.bid===it.id)){got[it.id]=1;continue}
      try{const o=await (await fetch('blonda-pack/'+it.file)).json(),ins=o.ins||o,rec=await importRec(Object.assign({},ins,{id:it.id,dev:it.dev||'blonda'}));if(rec)got[it.id]=1}catch(e){globalThis.__el&&globalThis.__el(e)}}
    try{localStorage.setItem('blonda.tex.pack',JSON.stringify(got))}catch(e){globalThis.__el&&globalThis.__el(e)}paint()}
  /* (v275) auto loop for a stored instrument: BLONDA SAMPLER's loop finder on every note (where the sound really repeats,
     the longest clean loop, cross-faded into the audio), then stored and played with the loop */
  async function autoLoopIns(id){const I=INS.get(id);if(!I)return null;const rec=I.meta;let n=0;
    for(const r of rec.regions){const L=i2f(r.L),R=r.R?i2f(r.R):null,t={L,R,root:r.root,holdEnd:Math.max(0,r.len-Math.round(r.sr*.05))};addLoop(t,r.sr);
      if(t.loopE>t.loopS+64){r.L=f2i(t.L);if(R)r.R=f2i(t.R);r.loopS=t.loopS;r.loopE=t.loopE;n++}}
    if(n)rec.loop=true;try{await dbDo('readwrite',st=>st.put(rec))}catch(e){globalThis.__el&&globalThis.__el(e)}await load(rec);paint();try{window.rsPaint&&rsPaint()}catch(e){globalThis.__el&&globalThis.__el(e)}return {n,of:rec.regions.length}}
  async function remove(id){await dbDo('readwrite',st=>st.delete(id));INS.delete(id);if(S.ms)for(const k in S.ms)if(S.ms[k]===id)use(k,null);if(cfg.insSel===id)cfg.insSel='';try{save()}catch(e){globalThis.__el&&globalThis.__el(e)}paint()}
  /* (v269) an instrument from BLONDA SAMPLER: 16-bit PCM in base64, zones and loops as edited there. The same instrument
     imported again (same id from the Sampler) replaces the old one and keeps its place in the list. */
  async function importRec(o){try{if(!o||!Array.isArray(o.regions)||!o.regions.length)return null;
    const ab=s=>{const b=atob(String(s||'')),u=new Uint8Array(b.length);for(let k=0;k<b.length;k++)u[k]=b.charCodeAt(k);return u.buffer};
    const regions=o.regions.map(r=>{const L=ab(r.L),R=r.R?ab(r.R):null,len=Math.floor(L.byteLength/2);return {root:Math.round(+r.root||60),lo:Math.max(0,Math.min(127,Math.round(+r.lo||0))),hi:Math.max(0,Math.min(127,Math.round(r.hi==null?127:+r.hi))),
      sr:+r.sr||+o.sr||48000,ch:R?2:1,L,R,len,loopS:Math.max(0,Math.min(len,Math.round(+r.loopS||0))),loopE:Math.max(0,Math.min(len,Math.round(+r.loopE||0)))}}).filter(r=>r.len>0).sort((a,b)=>a.root-b.root);
    if(!regions.length)return null;const old=o.id?[...INS.values()].find(I=>I.meta.bid===o.id):null;
    const env=o.env&&typeof o.env==='object'?{att:+o.env.att||0,dec:o.env.dec==null?MSX_DEF.dec:+o.env.dec,sus:o.env.sus==null?1:+o.env.sus,rel:o.env.rel==null?MSX_DEF.rel:+o.env.rel}:null;
    const rec={id:old?old.meta.id:'ms'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),bid:o.id||null,name:String(o.name||'multisample').slice(0,60),dev:String(o.dev||'BLONDA SAMPLER').slice(0,40),
      t:old?old.meta.t:Date.now(),sr:+o.sr||regions[0].sr,att:.002,rel:env?ENVT.rel(env.rel):.25,loop:!!o.loop,regions,env,mods:old?old.meta.mods||null:null};
    await dbDo('readwrite',st=>st.put(rec));await load(rec);if(S.ms)for(const k in S.ms)if(S.ms[k]===rec.id&&env&&S.inst[k]==='msx')Object.assign(engE('msx'),env);
    tab=cfg.tab='ins';cfg.insSel=rec.id;saveCfg();try{refreshInst()}catch(e){globalThis.__el&&globalThis.__el(e)}paint();return rec}catch(e){console.warn(e);return null}}
  async function rename(id,name){const I=INS.get(id);if(!I)return;I.meta.name=name;await dbDo('readwrite',st=>st.put(I.meta));paint()}
  /* the voice: same call as the synth engines (sequencer, piano and MIDI in all play through it) */
  /* Sample+ envelope: knob 0..1 → seconds (the same curves the engine's knobs show) */
  const ENVT={att:v=>.001+v*v*2,dec:v=>.02+v*v*4,rel:v=>.02+v*v*4};
  const MSX_DEF={att:.03,dec:.5,sus:1,rel:.25};
  const envOf=E=>({att:ENVT.att(E.att??MSX_DEF.att),dec:ENVT.dec(E.dec??MSX_DEF.dec),sus:E.sus??1,rel:ENVT.rel(E.rel??MSX_DEF.rel)});
  function voice(I,t,v,p,out,n,len,env){const R=I.regions.find(r=>n>=r.lo&&n<=r.hi)||I.regions[0];if(!R)return;
    const src=ctx.createBufferSource(),g=ctx.createGain(),tune=(p&&p.tune)||0;src.buffer=R.buf;src.playbackRate.value=Math.pow(2,(n-R.root+tune)/12);
    const loop=I.meta.loop&&R.loopE>R.loopS+64;if(loop){src.loop=true;src.loopStart=R.loopS/R.sr;src.loopEnd=R.loopE/R.sr}
    const ev=env||envOf(I.meta.env||MSX_DEF),lv=Math.max(.05,v)*1.1,att=ev.att,rel=ev.rel,L=Math.max(.02,len||.25),end=t+L;
    /* envelope: attack, decay to the sustain level, release after the note */
    const sus=Math.max(0,Math.min(1,ev.sus)),dec=Math.max(.005,ev.dec);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(lv,t+att);
    if(sus<1&&end>t+att){g.gain.setTargetAtTime(lv*sus,t+att,dec/3);g.gain.cancelAndHoldAtTime?g.gain.cancelAndHoldAtTime(end):g.gain.setValueAtTime(lv*sus,end)}else g.gain.setValueAtTime(lv,end);
    g.gain.setTargetAtTime(0,end,rel/4);
    src.connect(g);g.connect(out);src.start(t);const stopAt=loop?end+rel*2:Math.min(end+rel*2,t+R.buf.duration/src.playbackRate.value+.02);src.stop(stopAt)}
  /* Sample+: an engine among the others (melVoice → TEX.play). Each synth track on Sample+ plays the instrument picked for
     it (S.ms[track]); the instrument is the engine's "preset". The envelope knobs belong to the engine, and each instrument
     remembers the envelope it was last played with. */
  const list=()=>[...INS.values()].sort((a,b)=>(a.meta.t||0)-(b.meta.t||0));/* oldest first: program numbers stay put */
  function play(id,t,v,p,out,n,len,vc){const I=INS.get(S.ms&&S.ms[id]);if(!I||n==null)return;const env=envOf(engE('msx'));
    const offs=Array.isArray(vc)&&vc.length?vc:[0];for(const o of offs)try{voice(I,t,v/(offs.length>1?Math.sqrt(offs.length):1),p,out,n+o,len,env)}catch(e){console.warn(e)}}
  /* each Sample+ sound keeps its envelope and its modulation (LFOs, mod envelope, steps, links) */
  function keepEnv(id){const I=INS.get(id);if(!I)return;const E=engE('msx');I.meta.env={att:E.att,dec:E.dec,sus:E.sus,rel:E.rel};
    try{const M=S.mods&&S.mods.msx;I.meta.mods=M?JSON.parse(JSON.stringify(M)):null}catch(e){globalThis.__el&&globalThis.__el(e)}saveMeta(id)}
  function use(trk,id){if(!trk)return;S.ms=S.ms||{};const prev=S.ms[trk];if(prev&&prev!==id)keepEnv(prev);
    if(id){S.ms[trk]=id;S.inst[trk]='msx';const I=INS.get(id);if(I&&I.meta.env)Object.assign(engE('msx'),I.meta.env);
      if(I&&prev!==id){if(!S.mods||typeof S.mods!=='object')S.mods={};S.mods.msx=I.meta.mods?JSON.parse(JSON.stringify(I.meta.mods)):null;try{modOf('msx')}catch(e){globalThis.__el&&globalThis.__el(e)}}}
    else{delete S.ms[trk];if(S.inst[trk]==='msx')S.inst[trk]=(typeof DEF_INST!=='undefined'&&DEF_INST[trk])||'analog'}
    try{save()}catch(e){globalThis.__el&&globalThis.__el(e)}try{refreshInst()}catch(e){globalThis.__el&&globalThis.__el(e)}try{window.rsPaint&&rsPaint()}catch(e){globalThis.__el&&globalThis.__el(e)}paint()}
  /* the synth card: the instrument picker under the knobs, and a drawing of the sample */
  {const _ri=refreshInst;refreshInst=function(){const r=_ri.apply(this,arguments);try{cardPick()}catch(e){console.warn(e)}return r}}
  function cardPick(){const id=TRACKS[synT].id;if((S.inst[id]||'analog')!=='msx')return;const ob=document.getElementById('engOpts');if(!ob)return;
    const I=INS.get(S.ms&&S.ms[id]),L=list();ob.hidden=false;ob.innerHTML='';const b=document.createElement('button');b.className='eopt on tx-cp';
    b.textContent=I?'sound · '+I.meta.name+' ▾':(L.length?'pick a sound ▾':'no sounds yet · open the Sampler card');
    b.onclick=()=>{if(!L.length){const c=document.querySelector('.card[data-card="sampler"]');if(c)c.scrollIntoView({behavior:'smooth',block:'center'});return}
      if(window.pickShow)pickShow(b,L.map(x=>x.meta.name),L.findIndex(x=>x.meta.id===(S.ms&&S.ms[id])),k=>{use(id,L[k].meta.id);try{synPreview()}catch(e){globalThis.__el&&globalThis.__el(e)}},L.map(x=>x.meta.dev||'sampled'))};ob.appendChild(b)}
  const peaks=new Map();
  function draw(c,w,h,el,fg,ac,id){const I=INS.get(S.ms&&S.ms[id]);c.fillStyle=fg;c.globalAlpha=.5;c.font='10px '+getComputedStyle(document.body).getPropertyValue('--f-mono');
    if(!I){c.fillText(INS.size?'pick a sound below':'sample an instrument in the Sampler card',10,h/2);c.globalAlpha=1;return}
    const R=I.regions[Math.floor(I.regions.length/2)],key=I.meta.id+':'+R.root,N=Math.max(24,Math.floor(w/4));let pk=peaks.get(key);
    if(!pk||pk.length!==N){const d=R.buf.getChannelData(0),step=d.length/N;pk=new Float32Array(N);for(let k=0;k<N;k++){let m=0;const a=Math.floor(k*step),z=Math.min(d.length,Math.floor((k+1)*step));for(let j=a;j<z;j+=4)m=Math.max(m,Math.abs(d[j]));pk[k]=m}peaks.set(key,pk)}
    const mid=h/2,ph=el>=0&&el<R.buf.duration?el/R.buf.duration:-1;c.globalAlpha=1;
    for(let k=0;k<N;k++){const x=k*(w/N)+2,a=pk[k]*(h*.42),on=ph>=0&&k/N<=ph;c.fillStyle=on?ac:fg;c.globalAlpha=on?.95:.35;for(let y=-a;y<=a;y+=4){c.beginPath();c.arc(x,mid+y,1.1,0,6.2832);c.fill()}}
    if(I.meta.loop&&R.loopE>R.loopS){c.globalAlpha=.6;c.fillStyle=ac;const x1=R.loopS/R.buf.length*w,x2=R.loopE/R.buf.length*w;c.fillRect(x1,h-6,Math.max(2,x2-x1),2)}
    c.globalAlpha=1}
  function assign(trk,id){use(trk,id);toast(id?'Sample+ on '+trk:trk+' plays its own synth again')}

  /* ---------------- 6. saving for teenage engineering ---------------- */
  async function resample(I,sr){const AC=window.OfflineAudioContext||window.webkitOfflineAudioContext;
    return Promise.all(I.regions.map(async r=>{const ch=r.buf.numberOfChannels,len=Math.ceil(r.buf.duration*sr),oc=new AC(ch,len,sr),s=oc.createBufferSource();s.buffer=r.buf;s.connect(oc.destination);s.start();
      const b=await oc.startRendering();const k=sr/r.sr;return {r,buf:b,loopS:Math.round(r.loopS*k),loopE:Math.round(r.loopE*k)}}))}
  function wav16(buf){const ch=buf.numberOfChannels,n=buf.length,sr=buf.sampleRate,d=new DataView(new ArrayBuffer(44+n*ch*2));const W=(o,s)=>{for(let k=0;k<s.length;k++)d.setUint8(o+k,s.charCodeAt(k))};
    W(0,'RIFF');d.setUint32(4,36+n*ch*2,true);W(8,'WAVE');W(12,'fmt ');d.setUint32(16,16,true);d.setUint16(20,1,true);d.setUint16(22,ch,true);d.setUint32(24,sr,true);d.setUint32(28,sr*ch*2,true);d.setUint16(32,ch*2,true);d.setUint16(34,16,true);
    W(36,'data');d.setUint32(40,n*ch*2,true);const cs=[...Array(ch).keys()].map(c=>buf.getChannelData(c));let o=44;for(let k=0;k<n;k++)for(let c=0;c<ch;c++){const v=Math.max(-1,Math.min(1,cs[c][k]));d.setInt16(o,v<0?v*32768:v*32767,true);o+=2}return new Uint8Array(d.buffer)}
  /* a plain zip (stored, no compression) */
  const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return b=>{let c=0xFFFFFFFF;for(let k=0;k<b.length;k++)c=t[(c^b[k])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0}})();
  function zip(files){const enc=new TextEncoder(),parts=[],cen=[];let off=0;
    for(const f of files){const name=enc.encode(f.name),data=f.data instanceof Uint8Array?f.data:enc.encode(f.data),crc=CRC(data);
      const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,0,true);h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,name.length,true);
      parts.push(new Uint8Array(h.buffer),name,data);
      const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,off,true);
      cen.push(new Uint8Array(c.buffer),name);off+=30+name.length+data.length}
    const cs=cen.reduce((a,b)=>a+b.length,0),e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cs,true);e.setUint32(16,off,true);
    return new Blob([...parts,...cen,new Uint8Array(e.buffer)],{type:'application/zip'})}
  const safe=s=>String(s||'multisample').replace(/[^A-Za-z0-9 _-]+/g,'').replace(/\s+/g,' ').trim().slice(0,20)||'multisample';
  async function download(name,blob){try{const dl=await window.claude.use('downloads');if(dl){await dl.save({filename:name,data:blob});toast('Saved '+name);return}}catch(e){if(e&&e.code==='declined')return}
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000)}
  /* OP-XY: <name>.preset/patch.json + one wav per zone, 44.1 kHz 16 bit (at most 24 zones) */
  async function exportXY(id){const I=INS.get(id);if(!I)return;const nm=safe(I.meta.name);let rs=await resample(I,44100);
    if(rs.length>24){rs=thin(rs,24);toast('OP-XY plays at most 24 zones – saved 24 of '+I.regions.length)}
    const files=[],regions=[];zones(rs.map(x=>Object.assign(x,{root:x.r.root})));
    rs.forEach(x=>{const fn=nm+' '+nname(x.root).replace('#','s')+'.wav',fc=x.buf.length,lp=I.meta.loop&&x.loopE>x.loopS;
      files.push({name:nm+'.preset/'+fn,data:wav16(x.buf)});
      regions.push({framecount:fc,gain:0,hikey:x.hi,lokey:x.lo,'loop.crossfade':0,'loop.enabled':!!lp,'loop.end':lp?x.loopE:fc,'loop.onrelease':false,'loop.start':lp?x.loopS:0,
        'pitch.keycenter':x.root,reverse:false,sample:fn,'sample.end':fc,'sample.start':0,tune:0})});
    const patch={engine:{bendrange:8191,highpass:0,modulation:{aftertouch:{amount:30719,target:4096},modwheel:{amount:32767,target:10240},pitchbend:{amount:16383,target:0},velocity:{amount:16383,target:0}},
        params:[16384,16384,16384,16384,16384,16384,16384,16384],playmode:'poly','portamento.amount':0,'portamento.type':32767,transpose:0,'tuning.root':0,'tuning.scale':0,'velocity.sensitivity':10240,volume:18000,width:0},
      envelope:{amp:{attack:0,decay:0,release:Math.round(32767*Math.sqrt(Math.min(1,(I.meta.rel||.25)/10))),sustain:32767},filter:{attack:0,decay:16895,release:19968,sustain:16896}},
      fx:{active:false,params:[19661,0,7391,24063,0,32767,0,0],type:'svf'},lfo:{active:false,params:[19024,32255,4048,17408,0,0,0,0],type:'element'},
      octave:0,platform:'OP-XY',regions,type:'multisampler',version:4};
    files.unshift({name:nm+'.preset/patch.json',data:JSON.stringify(patch,null,2)});
    await download(nm+'.preset.zip',zip(files))}
  const thin=(rs,max)=>{const out=[];for(let k=0;k<max;k++)out.push(rs[Math.round(k*(rs.length-1)/(max-1))]);return [...new Set(out)]};
  /* OP-1 field: AIFF 44.1 kHz 16 bit with the OP-1's settings as JSON in an 'APPL' chunk ('op-1') */
  function aiff(chs,sr,json){const ch=chs.length,n=chs[0].length,js=JSON.stringify(json)+'\n',jl=js.length%2?js.length+1:js.length,appl=Math.max(4+jl,0x1004);
    const size=12+(8+18)+(8+appl)+(8+8+n*ch*2),d=new DataView(new ArrayBuffer(size));let o=0;const W=s=>{for(let k=0;k<s.length;k++)d.setUint8(o++,s.charCodeAt(k))};
    W('FORM');d.setUint32(o,size-8);o+=4;W('AIFF');W('COMM');d.setUint32(o,18);o+=4;d.setUint16(o,ch);o+=2;d.setUint32(o,n);o+=4;d.setUint16(o,16);o+=2;
    /* 44100 as an 80-bit extended float */[0x40,0x0E,0xAC,0x44,0,0,0,0,0,0].forEach(b=>d.setUint8(o++,b));
    W('APPL');d.setUint32(o,appl);o+=4;W('op-1');const st=o;W(js);while(o<st+appl-4)d.setUint8(o++,0x20);
    W('SSND');d.setUint32(o,8+n*ch*2);o+=4;d.setUint32(o,0);o+=4;d.setUint32(o,0);o+=4;
    for(let k=0;k<n;k++)for(let c=0;c<ch;c++){const v=Math.max(-1,Math.min(1,chs[c][k]));d.setInt16(o,v<0?v*32768:v*32767);o+=2}return new Blob([d.buffer],{type:'audio/aiff'})}
  /* synth sampler: the zone closest to middle C, as one sample (at most 20 s) */
  async function exportOP1(id){const I=INS.get(id);if(!I)return;const rs=await resample(I,44100);const x=rs.reduce((a,b)=>Math.abs(b.r.root-60)<Math.abs(a.r.root-60)?b:a);
    const ch=x.buf.numberOfChannels,n=Math.min(x.buf.length,44100*20),chs=[...Array(ch).keys()].map(c=>x.buf.getChannelData(c).slice(0,n));
    const json={adsr:[64,10746,32767,Math.round(32767*Math.min(1,(I.meta.rel||.25)/4)),4000,64,4000,18021],base_freq:+(440*Math.pow(2,(x.r.root-69)/12)).toFixed(3),fade:0,fx_active:false,fx_params:[8000,8000,8000,8000,8000,8000,8000,8000],fx_type:'delay',
      knobs:[0,0,0,8600,12000,0,0,8192],lfo_active:false,lfo_params:[16000,0,0,16000,0,0,0,0],lfo_type:'tremolo',mtime:Math.floor(Date.now()/1000),name:safe(I.meta.name),octave:0,original_folder:'BLONDA',stereo:ch===2,synth_version:3,type:'sampler'};
    await download(safe(I.meta.name)+' (OP-1 synth).aif',aiff(chs,44100,json))}
  /* drum kit: 24 notes in a row (from the lowest zone up), each played from its zone at its own pitch – a chromatic kit */
  async function exportOP1Drum(id){const I=INS.get(id);if(!I)return;const sr=44100,stereo=I.regions.some(r=>r.buf.numberOfChannels>1),ch=stereo?2:1,maxS=stereo?20:12,per=Math.floor(sr*maxS/24)-64;
    const n0=I.regions[0].root,AC=window.OfflineAudioContext||window.webkitOfflineAudioContext,parts=[];
    for(let k=0;k<24;k++){const n=n0+k,R=I.regions.find(r=>n>=r.lo&&n<=r.hi)||I.regions[0],rate=Math.pow(2,(n-R.root)/12),len=Math.min(per,Math.ceil(R.buf.duration/rate*sr));
      const oc=new AC(ch,len,sr),s=oc.createBufferSource(),g=oc.createGain();s.buffer=R.buf;s.playbackRate.value=rate;s.connect(g);g.connect(oc.destination);const fo=Math.min(.03,len/sr/4);g.gain.setValueAtTime(1,len/sr-fo);g.gain.linearRampToValueAtTime(0,len/sr);s.start();parts.push(await oc.startRendering())}
    const total=parts.reduce((a,b)=>a+b.length,0),chs=[...Array(ch).keys()].map(()=>new Float32Array(total)),scale=2147483646/(sr*maxS),st=[],en=[];let o=0;
    parts.forEach(b=>{for(let c=0;c<ch;c++)chs[c].set(b.getChannelData(Math.min(c,b.numberOfChannels-1)),o);st.push(Math.floor(o*scale));o+=b.length;en.push(Math.floor((o-1)*scale))});
    const json={attack:Array(24).fill(0),drum_version:2,dyna_env:[0,8192,0,8192,0,0,0,0],end:en,fx_active:false,fx_params:[8000,8000,8000,8000,8000,8000,8000,8000],fx_type:'delay',lfo_active:false,lfo_params:[16000,16000,16000,16000,0,0,0,0],lfo_type:'tremolo',
      mtime:Math.floor(Date.now()/1000),name:safe(I.meta.name),octave:0,original_folder:'BLONDA',pan:Array(24).fill(16384),pan_ab:Array(24).fill(false),pitch:Array(24).fill(0),playmode:Array(24).fill(12288),reverse:Array(24).fill(8192),start:st,stereo,type:'drum',volume:Array(24).fill(8192)};
    await download(safe(I.meta.name)+' (OP-1 drum).aif',aiff(chs,sr,json))}

  /* ---------------- 7. the card ---------------- */
  let tab=cfg.tab||'sample',busy=false;
  const opt=(v,l,cur)=>`<option value="${esc(v)}"${String(v)===String(cur)?' selected':''}>${esc(l)}</option>`;
  const noteSel=(k,cur)=>`<select data-c="${k}">${Array.from({length:73},(_,i)=>i+24).map(n=>opt(n,nname(n),cur)).join('')}</select>`;
  function paint(){if(!body)return;const outs=acc?[...acc.outputs.values()]:[],P=profOf((outs.find(o=>o.id===cfg.outId)||{}).name);
    const read=card.querySelector('#txRead');if(read)read.textContent=devs.length?devs.map(d=>d.p.name).join(' · '):'multisample';
    let h=`<div class="tx-tabs">${[['sample','autosample'],['ins','instruments · '+INS.size],['midi','midi channels'],['dev','devices · '+devs.length]].map(([k,l])=>`<button data-tab="${k}" class="${tab===k?'on':''}">${l}</button>`).join('')}</div>`;
    if(!navigator.requestMIDIAccess||!(canRec()))h+=`<p class="tx-note">Sampling needs MIDI and recording: use the SEQ.3 app on iPad or Mac, or Chrome on a computer.</p>`;
    if(tab==='dev'){
      h+=devs.length?devs.map(d=>`<div class="tx-dev"><b>${esc(d.p.name)}</b><small>${esc(d.p.kind)}</small>
        <div class="tx-dl"><span class="${d.midiOut||d.midiIn?'ok':''}">midi ${d.midiIn&&d.midiOut?'in + out':d.midiOut?'out':d.midiIn?'in':'—'}</span><span class="${d.audio?'ok':''}">audio ${d.audio?'in':'—'}</span></div>
        <div class="tx-dd">${esc(d.p.audio)}<br>${esc(d.p.ms)}</div>
        ${d.p.route?`<button data-use="${d.p.id}" class="${cfg.dev===d.p.id?'on':''}">${cfg.dev===d.p.id?'channels set for '+esc(d.p.name):'set midi channels for '+esc(d.p.name)}</button>`:''}
        ${d.midiOut?`<button data-src="${esc(d.midiOut.id)}">sample ${esc(d.p.name)}</button>`:''}</div>`).join('')
        :`<p class="tx-note">No teenage engineering gear found. Connect OP-XY, OP-1 field, OP-Z, TP-7, TX-6 or EP-133 with USB (or Bluetooth MIDI) – it shows up here by itself.</p>`;
      h+=`<p class="tx-note">Known: ${PROF.map(p=>p.name).join(' · ')}</p>`}
    else if(tab==='midi'){const R=cfg.route,P2=PROF.find(p=>p.id===cfg.dev);
      h+=`<div class="tx-row"><label>setup</label><select data-c="prof">${opt('','SEQ.3 standard (bass 1 · keys 2 · lead 3 · pad 4 · drums 10)',cfg.dev)}${PROF.filter(p=>p.route).map(p=>opt(p.id,p.name+' – '+p.routeName,cfg.dev)).join('')}</select></div>`;
      if(R){h+=`<div class="tx-grid">${TRK().map(t=>{const r=R[t.id]||{ch:0};return `<span>${esc(t.name.toLowerCase())}</span><select data-ch="${t.id}">${opt(0,'off',r.ch)}${Array.from({length:16},(_,i)=>opt(i+1,'ch '+(i+1),r.ch)).join('')}</select>${t.mel?'<i>notes as played</i>':`<select data-nt="${t.id}">${Array.from({length:61},(_,i)=>i+24).map(n=>opt(n,n+' · '+nname(n),r.n)).join('')}</select>`}`}).join('')}</div>
        <p class="tx-note">Used when <b>send notes</b> is on in the MIDI panel${P2?' · '+esc(P2.name)+': '+esc(P2.routeName):''}. On the device, set each track to listen on its channel.</p>`}
      else h+=`<p class="tx-note">Pick a setup to send each track on a channel of its own.</p>`;
      h+=`<button class="tx-mp" data-a="midipanel">open the MIDI panel</button>`}
    else if(tab==='ins'){/* one instrument at a time (a list of 100 would fill the screen): pick it, then play, use or export it */
      const L=list().slice().reverse(),I=INS.get(cfg.insSel)||L[0];
      h+=`<div class="tx-row"><label>import</label><button data-a="imp" title="An instrument exported from BLONDA SAMPLER with SEQ.3 (.json)">from BLONDA SAMPLER</button></div>`;
      if(!I)h+=`<p class="tx-note">No instruments yet. Autosample one – it becomes a sound of the <b>Sample+</b> synth, which you pick like any other synth on a synth track or the keyboard.</p>`;
      else{const m=I.meta,on=Object.keys(S.ms||{}).filter(k=>S.ms[k]===m.id&&S.inst[k]==='msx');
        h+=`<div class="tx-row"><label>sound</label><select data-sel>${L.map(x=>opt(x.meta.id,x.meta.name+(x.meta.dev?' · '+x.meta.dev:''),m.id)).join('')}</select></div>
        <div class="tx-ins"><div class="tx-ih"><input value="${esc(m.name)}" data-rn="${m.id}" aria-label="Name"><small>${I.regions.length} notes · ${nname(I.regions[0].root)}–${nname(I.regions[I.regions.length-1].root)}${m.loop?' · loop':''}${m.dev?' · '+esc(m.dev):''}${on.length?' · on '+on.map(k=>esc(k)).join(', '):''}</small></div>
        <div class="tx-ia"><button data-pv="${m.id}">play</button><button data-al="${m.id}" title="Find a loop in every note, the same way as BLONDA SAMPLER: where the sound really repeats, with a cross-fade">auto loop</button><label>Sample+ on</label><select data-as="${m.id}">${opt('','—',on[0]||'')}${TRACKS.filter(t=>t.mel).map(t=>opt(t.id,t.name.toLowerCase(),on[0]||'')).join('')}</select></div>
        <div class="tx-ia"><label>save for</label><button data-xy="${m.id}">OP-XY</button><button data-o1="${m.id}">OP-1</button><button data-od="${m.id}">OP-1 drum</button><button data-del="${m.id}" class="x" aria-label="Delete">×</button></div></div>
        <p class="tx-note">${L.length} sound${L.length===1?'':'s'} in <b>Sample+</b> – the synth list on a synth track, or the keyboard's sound picker.</p>`}}
    else{
      const n=notesFor().length,ins=inputs;
      h+=`<div class="tx-row"><label>instrument</label><select data-c="outId">${opt('','pick MIDI out …',cfg.outId)}${outs.map(o=>opt(o.id,o.name+(profOf(o.name)?' · teenage engineering':''),cfg.outId)).join('')}</select>
        <select data-c="ch" class="sm">${Array.from({length:16},(_,i)=>opt(i+1,'ch '+(i+1),cfg.ch)).join('')}</select></div>
        <div class="tx-row"><label>input</label><select data-c="inId">${ins.length?ins.map(x=>opt(x.id,x.name+(x.usb?' · usb':''),cfg.inId)).join(''):opt('',NATIVE?'tap “find inputs”':'allow recording to list inputs','')}</select><button data-a="inputs" class="sm">find inputs</button></div>
        <div class="tx-meter"><i style="width:${rec?Math.min(100,Math.round(Math.sqrt(rec.lvl)*100)):0}%"></i></div>
        <div class="tx-row"><label>notes</label>${noteSel('from',cfg.from)}<span class="tx-to">to</span>${noteSel('to',cfg.to)}
          <select data-c="step" class="sm">${[[12,'every octave'],[6,'every 6'],[4,'every 4'],[3,'every 3'],[2,'every 2'],[1,'every note']].map(([v,l])=>opt(v,l,cfg.step)).join('')}</select></div>
        <div class="tx-row"><label>hold</label><select data-c="hold" class="sm">${[.5,1,2,3,4,6,8].map(v=>opt(v,v+' s',cfg.hold)).join('')}</select>
          <label>tail</label><select data-c="tail" class="sm">${[.5,1,1.5,2,3,5].map(v=>opt(v,v+' s',cfg.tail)).join('')}</select>
          <label>vel</label><select data-c="vel" class="sm">${[40,64,80,100,110,127].map(v=>opt(v,v,cfg.vel)).join('')}</select>
          <button data-c="loop" class="tg${cfg.loop?' on':''}">loop</button></div>
        <div class="tx-row"><label>name</label><input data-c="name" value="${esc(cfg.name)}" placeholder="${esc((P?P.name+' ':'')+'multisample')}"></div>`;
      if(job){h+=`<div class="tx-prog">${job.got.map((g,k)=>`<i class="${g.ok===true?'ok':g.ok===false?'no':k===job.i&&job.state==='rec'?'now':''}" title="${nname(g.n)}"></i>`).join('')}</div><p class="tx-note ${job.state==='err'?'warn':''}">${esc(job.msg)}</p>`}
      h+=`<div class="tx-go"><span>${n} notes${n>24?' · OP-XY keeps 24':''} · about ${Math.round(n*(cfg.hold+Math.min(cfg.tail,1)+.2))} s</span><button data-a="go" class="go${job&&job.state==='rec'?' stop':''}">${job&&job.state==='rec'?'stop':'autosample'}</button></div>`}
    body.innerHTML=h}
  body.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;
    if(b.dataset.tab){tab=cfg.tab=b.dataset.tab;saveCfg();if(tab==='dev'||tab==='sample')refresh();paint();return}
    if(b.dataset.a==='go'){await midi();autosample();return}
    if(b.dataset.a==='imp'){pickImport();return}
    if(b.dataset.a==='inputs'){await openInputs();paint();return}
    if(b.dataset.a==='midipanel'){window.MIDIX&&MIDIX.panel();return}
    if(b.dataset.c==='loop'){cfg.loop=cfg.loop?0:1;saveCfg();paint();return}
    if(b.dataset.use){setProfile(PROF.find(p=>p.id===b.dataset.use));tab='midi';paint();toast('MIDI channels set');return}
    if(b.dataset.src){cfg.outId=b.dataset.src;const d=devs.find(x=>x.midiOut&&x.midiOut.id===b.dataset.src);if(d&&d.audio)cfg.inId=d.audio.id;saveCfg();tab='sample';paint();return}
    if(b.dataset.pv){preview(b.dataset.pv);return}
    if(b.dataset.xy){b.disabled=true;try{await exportXY(b.dataset.xy)}finally{b.disabled=false}return}
    if(b.dataset.o1){b.disabled=true;try{await exportOP1(b.dataset.o1)}finally{b.disabled=false}return}
    if(b.dataset.od){b.disabled=true;try{await exportOP1Drum(b.dataset.od)}finally{b.disabled=false}return}
    if(b.dataset.al){const k=await autoLoopIns(b.dataset.al);if(k)toast(k.n+' of '+k.of+' notes got a loop'+(k.n<k.of?' · short notes keep none':''));return}
    if(b.dataset.del){if(b.classList.contains('sure'))remove(b.dataset.del);else{b.classList.add('sure');b.textContent='delete?';setTimeout(()=>{b.classList.remove('sure');b.textContent='×'},2500)}return}});
  body.addEventListener('change',e=>{const el=e.target;
    if(el.dataset.c==='prof'){setProfile(PROF.find(p=>p.id===el.value));paint();return}
    if(el.dataset.c){const k=el.dataset.c;cfg[k]=['outId','inId','name'].includes(k)?el.value:+el.value;saveCfg();paint();return}
    if(el.dataset.ch){cfg.route[el.dataset.ch].ch=+el.value;saveCfg();return}
    if(el.dataset.nt){cfg.route[el.dataset.nt].n=+el.value;saveCfg();return}
    if(el.dataset.sel!=null){cfg.insSel=el.value;saveCfg();paint();return}
    if(el.dataset.as){const id=el.dataset.as,trk=el.value;if(S.ms)for(const k in S.ms)if(S.ms[k]===id&&k!==trk)use(k,null);if(trk)assign(trk,id);return}
    if(el.dataset.rn){rename(el.dataset.rn,el.value.trim()||'multisample');return}});
  body.addEventListener('input',e=>{if(e.target.dataset.c==='name'){cfg.name=e.target.value;saveCfg()}});
  function preview(id){const I=INS.get(id);if(!I)return;try{initAudio();ctx.resume()}catch(e){globalThis.__el&&globalThis.__el(e)}const t=ctx.currentTime+.05,r0=I.regions[0].root,ns=[0,4,7,12].map(x=>r0+12+x);
    ns.forEach((n,k)=>voice(I,t+k*.18,.8,null,A.dry||ctx.destination,n,.5))}
  function canRec(){return !!((NATIVE&&BLONDA_NATIVE.audioIn&&BLONDA_NATIVE.audioIn.rec)||(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia))}
  async function openInputs(){if(NATIVE&&BLONDA_NATIVE.audioIn){BLONDA_NATIVE.audioIn.open();await sleep(400)}
    else if(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia){try{const s=await navigator.mediaDevices.getUserMedia({audio:true});s.getTracks().forEach(t=>t.stop())}catch(e){toast('Recording is not allowed here')}}
    await audioList();scan();if(!cfg.inId||!inputs.some(x=>x.id===cfg.inId)){const u=inputs.find(x=>profOf(x.name))||inputs.find(x=>x.usb)||inputs[0];if(u)cfg.inId=u.id;saveCfg()}}
  if(NATIVE&&BLONDA_NATIVE.audioIn)BLONDA_NATIVE.audioIn.onInputs(l=>{nativeIns=l;audioList().then(()=>{scan();paint()})});
  async function refresh(){await midi();await audioList();scan();paint()}
  /* the level meter while recording */
  setInterval(()=>{if(!rec)return;const m=body.querySelector('.tx-meter i');if(m)m.style.width=Math.min(100,Math.round(Math.sqrt(rec.lvl)*100))+'%'},80);

  async function saveMeta(id){const I=INS.get(id);if(I)try{await dbDo('readwrite',st=>st.put(I.meta))}catch(e){globalThis.__el&&globalThis.__el(e)}}
  window.TEX={importRec,pickImport,autoLoopIns,saveMeta,assign,use,play,draw,list,keepEnv,repaint:()=>paint(),_rec:()=>rec&&{frames:rec.frames,lvl:rec.lvl,peak:rec.peak,state:rec.nat?"app":rec.ac.state,sr:rec.sr,chunks:rec.chunks.length},tracks:()=>TRK(),route,profiles:PROF,profOf,scan:()=>devs,store,instruments:INS,exportXY,exportOP1,exportOP1Drum,_zip:zip,_aiff:aiff,_wav:wav16,refresh};
  const css=document.createElement('style');css.textContent=`
.card.sampler .tx{display:flex;flex-direction:column;gap:10px;font-family:var(--f-mono);font-size:11px;color:var(--fg)}
.tx-tabs{display:flex;gap:4px;flex-wrap:wrap}
.tx-tabs button{height:28px;padding:0 11px;border-radius:99px;background:rgba(232,230,220,.06);color:var(--mute);font:500 11px var(--f-mono);letter-spacing:.04em}
.tx-tabs button.on{background:var(--fg);color:#111211}
.tx-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.tx-row label{min-width:62px;color:var(--mute);font-size:10px;letter-spacing:.08em}
.tx-row label+select,.tx-row label+input{flex:1}
.tx select,.tx input{height:30px;min-width:0;padding:0 8px;border-radius:8px;border:0;background:rgba(232,230,220,.07);color:var(--fg);font:500 11px var(--f-mono);box-shadow:inset 0 0 0 1px rgba(232,230,220,.1)}
.tx select.sm,.tx-row select[data-c=from]{flex:0 0 auto}
.tx button{height:30px;padding:0 12px;border-radius:8px;background:rgba(232,230,220,.08);color:var(--fg);font:500 11px var(--f-mono);letter-spacing:.03em}
.tx button.sm{flex:0 0 auto}
.tx button.tg.on,.tx button.on{background:var(--fg);color:#111211}
.tx button.go{background:#F2C318;color:#111211;padding:0 18px}
.tx button.go.stop{background:#E5484D;color:#fff}
.tx button.x{width:30px;padding:0}
.tx button.sure{background:#E5484D;color:#fff;width:auto;padding:0 10px}
.tx button:disabled{opacity:.45}
.tx-to{color:var(--mute)}
.tx-meter{height:4px;border-radius:2px;background:rgba(232,230,220,.08);overflow:hidden}
.tx-meter i{display:block;height:100%;background:#6BE28C;transition:width .08s linear}
.tx-prog{display:flex;flex-wrap:wrap;gap:3px}
.tx-prog i{width:12px;height:12px;border-radius:3px;background:rgba(232,230,220,.1)}
.tx-prog i.now{background:#F2C318}.tx-prog i.ok{background:#6BE28C}.tx-prog i.no{background:#E5484D}
.tx-go{display:flex;align-items:center;justify-content:space-between;gap:8px}
.tx-go span{color:var(--mute);font-size:10px}
.tx-note{margin:0;color:var(--mute);font-size:10px;line-height:1.5}
.tx-note.warn{color:#F0A35E}
.tx-dev{display:grid;gap:6px;padding:10px;border-radius:10px;background:rgba(232,230,220,.05);box-shadow:inset 0 0 0 1px rgba(232,230,220,.08)}
.tx-dev b{font:600 13px var(--f-display);letter-spacing:.02em}.tx-dev small{color:var(--mute)}
.tx-dl{display:flex;gap:6px}.tx-dl span{padding:3px 8px;border-radius:99px;background:rgba(232,230,220,.06);color:var(--mute);font-size:10px}.tx-dl span.ok{background:rgba(107,226,140,.16);color:#6BE28C}
.tx-dd{color:var(--mute);font-size:10px;line-height:1.5}
.tx-dev button{justify-self:start}
.tx-grid{display:grid;grid-template-columns:auto 1fr 1fr;gap:5px 8px;align-items:center}
.tx-grid span{color:var(--mute)}.tx-grid i{font-style:normal;color:var(--mute);font-size:10px}
.tx-mp{align-self:start}
.tx-ins{display:grid;gap:8px;padding:10px;border-radius:10px;background:rgba(232,230,220,.05);box-shadow:inset 0 0 0 1px rgba(232,230,220,.08)}
.tx-ih{display:grid;gap:4px}.tx-ih input{font:600 13px var(--f-display)}.tx-ih small{color:var(--mute);font-size:10px}
.tx-ia{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.tx-ia label{color:var(--mute);font-size:10px}`;document.head.appendChild(css);
  /* start */
  loadAll();
  if(navigator.requestMIDIAccess&&(NATIVE||cfg.outId))midi().then(()=>{scan();paint()});
  paint();
})();

