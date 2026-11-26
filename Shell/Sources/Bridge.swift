import Foundation

/// The JavaScript the shell puts into the page before the page's own code runs. It doesn't change the page – it gives
/// it the browser features WebKit lacks, backed by the app:
/// - window.BLONDA_NATIVE: tells the page it runs in the app (the page then skips Claude's cloud sign-in for the library)
/// - navigator.requestMIDIAccess: the Web MIDI API, talking to CoreMIDI (MIDIBridge)
/// - window.claude.use('downloads'): the same file-saving call the page uses on claude.ai, here a native save dialog
/// - the play state, so the screen stays on while playing
/// - window.__blonda.link: Ableton Link (LinkBridge)
/// - page errors go to the app's log
enum Bridge {
    static func script(platform: String, selfTest: Bool) -> String {
        core.replacingOccurrences(of: "%PLATFORM%", with: platform) + (selfTest ? test : "")
    }

    private static let core = #"""
(()=>{if(window.__blonda)return;
const post=m=>{try{webkit.messageHandlers.blonda.postMessage(m)}catch(e){}};
const N=window.__blonda={native:true,platform:'%PLATFORM%',errs:[]};window.BLONDA_NATIVE=N;
addEventListener('error',e=>{const m=String(e.message||e.error||'error')+' @'+(e.lineno||0);if(N.errs.length<20)N.errs.push(m);post({t:'log',m})});
addEventListener('unhandledrejection',e=>{const m='rejection: '+String(e.reason&&e.reason.message||e.reason);if(N.errs.length<20)N.errs.push(m);post({t:'log',m})});

/* ---- no zooming the app: two fingers belong to pads and faders (a pad held + a fader moved read as a pinch) ---- */
{const fix=()=>{const m=document.querySelector('meta[name=viewport]');if(!m)return false;if(!/user-scalable=no/.test(m.content))m.content=m.content+',maximum-scale=1,user-scalable=no';return true};
 if(!fix()){const mo=new MutationObserver(()=>{if(fix())mo.disconnect()});mo.observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('DOMContentLoaded',()=>{fix();mo.disconnect()})}
 for(const k of ['gesturestart','gesturechange','gestureend'])document.addEventListener(k,e=>e.preventDefault(),{passive:false});
 const st=document.createElement('style');st.textContent='html{touch-action:manipulation}';(document.head||document.documentElement).appendChild(st)}

/* ---- Web MIDI on CoreMIDI ---- */
const ins=new Map(),outs=new Map();let access=null;const waiting=[];
class Port{constructor(o,type){this.id=o.id;this.name=o.name;this.manufacturer=o.man||'';this.version='';this.type=type;this.state='connected';this.connection='open';this.onstatechange=null}
  open(){return Promise.resolve(this)}close(){return Promise.resolve(this)}}
class Input extends Port{constructor(o){super(o,'input');this.onmidimessage=null;this._l=new Set()}
  addEventListener(t,f){if(t==='midimessage'&&f)this._l.add(f)}removeEventListener(t,f){if(t==='midimessage')this._l.delete(f)}
  _fire(b,ts){const ev={type:'midimessage',data:new Uint8Array(b),timeStamp:ts==null?performance.now():ts,target:this,currentTarget:this};
    if(this.onmidimessage)try{this.onmidimessage(ev)}catch(e){console.error(e)}this._l.forEach(f=>{try{f(ev)}catch(e){console.error(e)}})}}
class Output extends Port{constructor(o){super(o,'output')}
  send(data,ts){const d=Array.from(data,x=>x&255);if(!d.length)return;const dl=ts==null?0:Math.max(0,ts-performance.now());post({t:'midi-out',id:this.id,d,dl})}
  clear(){}}
function mkAccess(){return{inputs:ins,outputs:outs,sysexEnabled:false,onstatechange:null,_l:new Set(),
  addEventListener(t,f){if(t==='statechange'&&f)this._l.add(f)},removeEventListener(t,f){if(t==='statechange')this._l.delete(f)}}}
N.midiPorts=list=>{const sync=(map,arr,C)=>{const seen=new Set();for(const o of arr){seen.add(o.id);const p=map.get(o.id);if(p){p.name=o.name;p.state='connected'}else map.set(o.id,new C(o))}
    for(const k of [...map.keys()])if(!seen.has(k)){map.get(k).state='disconnected';map.delete(k)}};
  sync(ins,list.ins,Input);sync(outs,list.outs,Output);
  if(!access)access=mkAccess();else{const ev={type:'statechange',port:null,target:access};if(access.onstatechange)try{access.onstatechange(ev)}catch(e){console.error(e)}access._l.forEach(f=>{try{f(ev)}catch(e){}})}
  waiting.splice(0).forEach(r=>r(access))};
/* each message carries CoreMIDI's arrival time (host clock, ms); the page's clock differs by a fixed amount, found as the
   smallest gap seen (the fastest a message got here). So MIDI clock keeps its real timing even though messages come in batches. */
let hostOff=null;N.midiTime=ms=>{if(ms==null)return performance.now();const o=performance.now()-ms;if(hostOff===null||o<hostOff||o-hostOff>1000)hostOff=o;return ms+hostOff};
N.midiBatch=arr=>{for(const [id,b,ms] of arr){const p=ins.get(id);if(p)p._fire(b,N.midiTime(ms))}};
/* ---- Ableton Link (LinkBridge): the app sends the session's timeline (tempo, the beat at a host time in ms); the page
   turns host ms into its own clock the same way as for MIDI (smallest gap seen, slowly let go so it can follow drift) ---- */
{const subs=new Set();let off=null,st=null;
 N.linkState=s=>{const o=performance.now()-s.host;if(off===null||o<off||o-off>1000)off=o;else off+=Math.min(o-off,.005);
   st=Object.assign({},s,{at:s.host+off});subs.forEach(f=>{try{f(st)}catch(e){}})};
 N.link={get state(){return st},sub(f){subs.add(f);if(st)f(st);return()=>subs.delete(f)},
   /* page time (performance.now ms) <-> host ms, and the beat on the timeline at a page time */
   toHost:p=>p-(off||0),toPage:h=>h+(off||0),
   beatAt:p=>st?st.beat+(p-st.at)*st.bpm/60000:0,pageAtBeat:b=>st?st.at+(b-st.beat)*60000/st.bpm:0,
   settings(){post({t:'link',op:'settings'})},query(){post({t:'link',op:'query'})},
   tempo(bpm){post({t:'link',op:'tempo',bpm:+bpm})},
   play(page,beat){post({t:'link',op:'play',host:page-(off||0),beat:+beat})},stop(){post({t:'link',op:'stop'})}};
 setTimeout(()=>post({t:'link',op:'query'}),0)}
Object.defineProperty(navigator,'requestMIDIAccess',{configurable:true,value:function(){return new Promise(res=>{if(access){res(access);return}waiting.push(res);post({t:'midi-open'})})}});
/* the page asks whether MIDI is already allowed before connecting by itself – in the app it always is */
try{const P=navigator.permissions;if(P&&P.query){const q=P.query.bind(P);P.query=d=>d&&d.name==='midi'?Promise.resolve({name:'midi',state:'granted',onchange:null}):q(d)}
  else Object.defineProperty(navigator,'permissions',{configurable:true,value:{query:d=>d&&d.name==='midi'?Promise.resolve({name:'midi',state:'granted',onchange:null}):Promise.reject(new TypeError('unsupported'))}})}catch(e){}

/* ---- saving files: the page's own call (as on claude.ai), a native save dialog here ---- */
N.saves={};let sid=0;
N.saved=(id,ok,code)=>{const s=N.saves[id];if(!s)return;delete N.saves[id];ok?s.res():s.rej({code:code||'declined',message:code||'declined'})};
const DL={save({filename,data}={}){return new Promise((res,rej)=>{try{
  const blob=data instanceof Blob?data:typeof data==='string'?new Blob([data],{type:'application/json'}):new Blob([data]);
  const fr=new FileReader();fr.onerror=()=>rej({code:'failed',message:String(fr.error)});
  fr.onload=()=>{const id=++sid;N.saves[id]={res,rej};post({t:'save',id,name:String(filename||'export'),mime:blob.type||'application/octet-stream',b64:String(fr.result).split(',')[1]||''})};
  fr.readAsDataURL(blob)}catch(e){rej({code:'failed',message:String(e)})}})}};
if(!window.claude)Object.defineProperty(window,'claude',{configurable:true,value:Object.freeze({use:n=>Promise.resolve(n==='downloads'?DL:null)})});

/* ---- importing sounds: the app's own picker (several files at once, whole folders too) ---- */
N.picks={};let pid=0;
const audioInput=el=>el&&el.type==='file'&&/audio|\.wav|\.aif|\.mp3|json/i.test(el.accept||'');
const nativeClick=HTMLInputElement.prototype.click;
HTMLInputElement.prototype.click=function(){if(!audioInput(this))return nativeClick.call(this);const id=++pid;N.picks[id]=this;post({t:'pick-audio',id,multi:true,json:/json/i.test(this.accept||''),audio:/audio|\.wav|\.aif|\.mp3/i.test(this.accept||'')})};
N.picked=async(id,files)=>{const inp=N.picks[id];delete N.picks[id];if(!inp||!files||!files.length){post({t:'pick-done',id});return}
  try{const list=[];for(const f of files){try{const b=await (await fetch(f.u)).blob();list.push(new File([b],f.name,{type:f.type||b.type||(/\.json$/i.test(f.name)?'application/json':'audio/wav')}))}catch(e){}}
    if(list.length){const dt=new DataTransfer();list.forEach(f=>dt.items.add(f));inp.files=dt.files;inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}))}}
  finally{post({t:'pick-done',id})}};

/* ---- sampling: the inputs iOS offers (USB instruments, the mic); the page records with getUserMedia ---- */
{const subs=new Set();let last=[];N.audioInputs=list=>{last=list||[];subs.forEach(f=>{try{f(last)}catch(e){}})};
 N.audioIn={open(){post({t:'audio-in',op:'open'})},select(uid){post({t:'audio-in',op:'select',uid})},close(){post({t:'audio-in',op:'close'})},
   onInputs(f){subs.add(f);if(last.length)f(last);return()=>subs.delete(f)},get inputs(){return last}};
 /* the app records itself (WebKit on the Mac cannot record): start(cb) resolves {ok,sr,err}; cb(L,R,sr) gets each block */
 let cb=null,wait=null;
 N.audioIn.rec={start(f){cb=f;return new Promise(res=>{wait=res;post({t:'audio-in',op:'rec',on:true});setTimeout(()=>{if(wait===res){wait=null;res({ok:false,err:'timeout'})}},20000)})},
   stop(){cb=null;post({t:'audio-in',op:'rec',on:false})}};
 N.recStarted=s=>{const w=wait;wait=null;if(w)w(s||{ok:false})};
 N.recDecode=b64=>{const s=atob(b64),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);
   const f=new Float32Array(u.buffer),n=f.length>>1,L=new Float32Array(n),R=new Float32Array(n);for(let i=0;i<n;i++){L[i]=f[2*i];R[i]=f[2*i+1]}return [L,R]};
 N.recData=(b64,sr)=>{if(!cb)return;const [L,R]=N.recDecode(b64);cb(L,R,sr)}}

/* ---- the screen stays on while playing ---- */
const watch=()=>{let last=null;const chk=()=>{const p=document.body.classList.contains('playing');if(p!==last){last=p;post({t:'playing',on:p})}};
  new MutationObserver(chk).observe(document.body,{attributes:true,attributeFilter:['class']});chk()};
if(document.body)watch();else document.addEventListener('DOMContentLoaded',watch);
})();
"""#

    /// Diagnostics (only when ~/Applications/SEQ3-diag exists on the Mac): measures how heavy the page is and logs
    /// every key press it gets. Written to ~/Applications/SEQ3-diag.log by the app.
    static let diag = #"""
(()=>{const post=m=>{try{webkit.messageHandlers.blonda.postMessage(m)}catch(e){}},L=m=>post({t:'diag',m:String(m)});
const RA=window.requestAnimationFrame.bind(window),cost=new Map();
window.requestAnimationFrame=function(cb){let src='?';try{src=((new Error().stack||'').split('\n').find(l=>/index\.html:\d/.test(l))||'?').replace(/^\s*at\s+/,'').replace(/(blonda:\/\/seq3|https?:\/\/[^ )]*)\/[^ )]*index\.html/,'').slice(0,48)}catch(e){}
  return RA(t=>{const a=performance.now();try{cb(t)}finally{const d=performance.now()-a,c=cost.get(src)||[0,0];c[0]+=d;c[1]++;cost.set(src,c)}})};
for(const ty of ['keydown','keyup'])addEventListener(ty,e=>{const tg=e.target,id=tg?(tg.tagName||'?')+(tg.id?'#'+tg.id:'')+(typeof tg.className==='string'&&tg.className?'.'+tg.className.split(' ')[0]:''):'?';
  const d=ty+' code='+e.code+' key='+JSON.stringify(e.key)+' target='+id;setTimeout(()=>L(d+' prevented='+e.defaultPrevented+' focus='+document.hasFocus()+' active='+(document.activeElement&&document.activeElement.tagName)),0)},true);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function measure(name,ms){post({t:'mark',p:'begin',name});cost.clear();let n=0,maxGap=0,last=performance.now(),run=true;
  const loop=()=>{const now=performance.now();maxGap=Math.max(maxGap,now-last);last=now;n++;if(run)RA(loop)};RA(loop);
  let lag=0,lagMax=0,ticks=0,exp=performance.now()+50;const iv=setInterval(()=>{const now=performance.now(),l=Math.max(0,now-exp);lag+=l;lagMax=Math.max(lagMax,l);ticks++;exp=now+50},50);
  await sleep(ms);run=false;clearInterval(iv);post({t:'mark',p:'end'});
  const top=[...cost.entries()].sort((a,b)=>b[1][0]-a[1][0]).slice(0,8).map(([k,v])=>k+' '+(v[0]/ms*100).toFixed(1)+'%/'+v[1]).join(' | ');
  L('['+name+'] fps '+(n/(ms/1000)).toFixed(1)+' maxGap '+maxGap.toFixed(0)+'ms lagAvg '+(lag/Math.max(1,ticks)).toFixed(1)+'ms lagMax '+lagMax.toFixed(0)+'ms || JS in rAF: '+top)}
const css=t=>{const s=document.createElement('style');s.textContent=t;document.head.appendChild(s);return s};
const X={blur:'*,*::before,*::after{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;filter:none!important}',
  bg:'#bg,#gbgC{display:none!important}',anim:'*,*::before,*::after{animation-play-state:paused!important;transition:none!important}',canvas:'canvas{visibility:hidden!important}'};
async function exp(name,c){const s=css(c);await sleep(800);await measure(name,5000);s.remove();await sleep(500)}
addEventListener('load',async()=>{L('page loaded '+innerWidth+'x'+innerHeight+' dpr '+devicePixelRatio+' body='+document.body.className+' ua='+navigator.userAgent);
  for(let i=0;i<600;i++){const st=document.getElementById('start');if(st&&st.hidden)break;await sleep(500)}
  L('intro closed, measuring (about 70 s) – body='+document.body.className);await sleep(1500);
  await measure('idle',6000);for(const k of Object.keys(X))await exp('idle, no '+k,X[k]);await exp('idle, all off',Object.values(X).join('\n'));
  try{__seq.play()}catch(e){L('play failed '+e)}await sleep(1500);await measure('playing',6000);await exp('playing, no blur',X.blur);await exp('playing, all off',Object.values(X).join('\n'));
  try{__seq.stop()}catch(e){}L('measuring done – key presses keep being logged')});
})();
"""#

    /// Self-test (launch argument -selftest): checks what the page needs from the app and reports it to the app,
    /// which writes it to selftest.json and the log. Used by CI on the iPad simulator and the Mac.
    private static let test = #"""
addEventListener('load',()=>setTimeout(async()=>{const N=window.__blonda,post=m=>{try{webkit.messageHandlers.blonda.postMessage(m)}catch(e){}},r={};
 const tmo=(p,ms)=>Promise.race([p,new Promise((_,j)=>setTimeout(()=>j(new Error('timeout')),ms))]);
 try{
  r.secure=window.isSecureContext;r.origin=location.origin;r.title=document.title;
  r.ver=(document.querySelector('.ver')||{}).textContent||null;r.lang=document.documentElement.lang;
  r.body=document.body.className;r.width=innerWidth;r.height=innerHeight;
  try{const k='blonda-selftest';r.lsPrev=localStorage.getItem(k);localStorage.setItem(k,String(Date.now()));r.ls=localStorage.getItem(k)!=null}catch(e){r.ls=String(e)}
  r.project=!!localStorage.getItem('blonda-seq3-glass');
  post({t:'step',s:'begin'});
  {const t0=performance.now();r.idb=await tmo(new Promise(res=>{try{const q=indexedDB.open('blonda-selftest',1);q.onsuccess=()=>{q.result.close();res(true)};q.onerror=()=>res(String(q.error))}catch(e){res(String(e))}}),15000).catch(e=>String(e));r.idbMs=Math.round(performance.now()-t0)}
  try{const AC=window.AudioContext||window.webkitAudioContext,c=new AC();r.audio={sr:c.sampleRate,state:c.state,worklet:!!c.audioWorklet};
    if(c.audioWorklet){const u=URL.createObjectURL(new Blob(["registerProcessor('t',class extends AudioWorkletProcessor{process(){return true}})"],{type:'application/javascript'}));
      await tmo(c.audioWorklet.addModule(u),3000);new AudioWorkletNode(c,'t');r.audio.workletOk=true}
    await c.close()}catch(e){r.audioErr=String(e)}
  try{const j=await (await fetch('blonda-pack/pack.json')).json(),it=(j.items||[])[0];r.packItems=(j.items||[]).length;
    if(it){const b=await (await fetch('blonda-pack/'+it.file)).arrayBuffer(),C=new OfflineAudioContext(1,1,48000);r.packDecoded=(await C.decodeAudioData(b)).duration>0}}catch(e){r.packErr=String(e)}
  try{const j=await (await fetch('blonda-pack/pack.json')).json(),its=(j.items||[]).slice(0,2);const inp=document.createElement('input');inp.type='file';inp.accept='audio/*';inp.multiple=true;
    const got=new Promise(res=>{inp.onchange=()=>res([...inp.files].map(f=>f.name+':'+f.size));setTimeout(()=>res('timeout'),5000)});
    const pidT=999999;N.picks[pidT]=inp;await N.picked(pidT,its.map(it=>({u:'blonda-pack/'+it.file,name:it.file.split('/').pop(),type:'audio/wav'})));r.importPipe=await got}catch(e){r.importPipe=String(e)}
  post({t:'step',s:'rec'});
  r.audioInApi=!!(N.audioIn&&N.audioIn.rec&&N.recData);
  /* one recorded block (L = 1, R = -0.5) decodes to the right samples */
  try{const d=N.recDecode('AACAPwAAAL8=');r.recBlock=[d[0][0],d[1][0]]}catch(e){r.recBlock=String(e)}
  r.noZoom=/user-scalable=no/.test((document.querySelector('meta[name=viewport]')||{}).content||'');
  post({t:'step',s:'midi'});
  r.midiApi=!!navigator.requestMIDIAccess;
  try{const t0=performance.now();const a=await tmo(navigator.requestMIDIAccess(),15000);r.midiMs=Math.round(performance.now()-t0);let ti=null,to=null;
    for(let k=0;k<100&&!(ti&&to);k++){ti=[...a.inputs.values()].find(p=>p.name==='BLONDA TEST');to=[...a.outputs.values()].find(p=>p.name==='BLONDA TEST');if(!(ti&&to))await new Promise(s=>setTimeout(s,100))}
    r.midiIns=[...a.inputs.values()].map(p=>p.name);r.midiOuts=[...a.outputs.values()].map(p=>p.name);
    if(ti)r.midiIn=await new Promise(res=>{ti.onmidimessage=e=>res(Array.from(e.data));post({t:'test-midi-send'});setTimeout(()=>res('timeout'),3000)});
    if(to){to.send([0x90,64,90]);to.send([0x80,64,0],performance.now()+200);r.midiOutSent=true}
  }catch(e){r.midiErr=String(e)}
  post({t:'step',s:'save'});
  try{const dl=await window.claude.use('downloads');await tmo(dl.save({filename:'selftest.blonda.json',data:'{"blonda":"seq3"}'}),3000);r.save=true}catch(e){r.save=String(e&&e.message||e)}
  post({t:'step',s:'start'});
  r.syncPill=(document.querySelector('#syncPill span')||{}).textContent||null;
  /* start the sound like a tap on the intro button, so the screenshot shows the app and the page's own audio is checked */
  try{const b=document.getElementById('startBtn');if(b)b.click();await new Promise(s=>setTimeout(s,2500));const st=document.getElementById('start');
    r.started=!!(st&&st.hidden);const A=window.__seq&&__seq.Aref&&__seq.Aref();const c=A&&A.out&&A.out.context;r.pageAudio=c?{state:c.state,sr:c.sampleRate,base:Math.round((c.baseLatency||0)*1000),out:Math.round((c.outputLatency||0)*1000)}:null}catch(e){r.startErr=String(e)}
  post({t:'step',s:'recLive'});
  /* last (as in use: the app is started and playing before sampling): the recorder for real for a second (simulators: the microphone is granted by CI; the Mac runner would ask) */
  if(N.platform!=='mac')try{let fr=0,sr=0;const st=await N.audioIn.rec.start((L,R,s)=>{fr+=L.length;sr=s});await new Promise(s=>setTimeout(s,1200));N.audioIn.rec.stop();N.audioIn.close();await new Promise(s=>setTimeout(s,800));/* like the sampler: back to the playing session */
    r.recLive={ok:!!st.ok,err:st.err||'',sr:st.sr||sr,frames:fr}}catch(e){r.recLive=String(e)}
  try{const A=window.__seq&&__seq.Aref&&__seq.Aref(),c=A&&A.out&&A.out.context;r.pageAudioAfterRec=c?c.state:null}catch(e){}
  post({t:'step',s:'report'});
  r.errors=N.errs;
 }catch(e){r.fatal=String(e)}
 post({t:'selftest',r})},3500));
"""#
}
