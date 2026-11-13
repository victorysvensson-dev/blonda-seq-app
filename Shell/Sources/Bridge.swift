import Foundation

/// The JavaScript the shell puts into the page before the page's own code runs. It doesn't change the page – it gives
/// it the browser features WebKit lacks, backed by the app:
/// - window.BLONDA_NATIVE: tells the page it runs in the app (the page then skips Claude's cloud sign-in for the library)
/// - navigator.requestMIDIAccess: the Web MIDI API, talking to CoreMIDI (MIDIBridge)
/// - window.claude.use('downloads'): the same file-saving call the page uses on claude.ai, here a native save dialog
/// - the play state, so the screen stays on while playing
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
  _fire(b){const ev={type:'midimessage',data:new Uint8Array(b),timeStamp:performance.now(),target:this,currentTarget:this};
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
N.midiBatch=arr=>{for(const [id,b] of arr){const p=ins.get(id);if(p)p._fire(b)}};
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
  {const t0=performance.now();r.idb=await tmo(new Promise(res=>{try{const q=indexedDB.open('blonda-selftest',1);q.onsuccess=()=>{q.result.close();res(true)};q.onerror=()=>res(String(q.error))}catch(e){res(String(e))}}),15000).catch(e=>String(e));r.idbMs=Math.round(performance.now()-t0)}
  try{const AC=window.AudioContext||window.webkitAudioContext,c=new AC();r.audio={sr:c.sampleRate,state:c.state,worklet:!!c.audioWorklet};
    if(c.audioWorklet){const u=URL.createObjectURL(new Blob(["registerProcessor('t',class extends AudioWorkletProcessor{process(){return true}})"],{type:'application/javascript'}));
      await tmo(c.audioWorklet.addModule(u),3000);new AudioWorkletNode(c,'t');r.audio.workletOk=true}
    await c.close()}catch(e){r.audioErr=String(e)}
  try{const j=await (await fetch('blonda-pack/pack.json')).json(),it=(j.items||[])[0];r.packItems=(j.items||[]).length;
    if(it){const b=await (await fetch('blonda-pack/'+it.file)).arrayBuffer(),C=new OfflineAudioContext(1,1,48000);r.packDecoded=(await C.decodeAudioData(b)).duration>0}}catch(e){r.packErr=String(e)}
  r.noZoom=/user-scalable=no/.test((document.querySelector('meta[name=viewport]')||{}).content||'');
  r.midiApi=!!navigator.requestMIDIAccess;
  try{const t0=performance.now();const a=await tmo(navigator.requestMIDIAccess(),15000);r.midiMs=Math.round(performance.now()-t0);let ti=null,to=null;
    for(let k=0;k<100&&!(ti&&to);k++){ti=[...a.inputs.values()].find(p=>p.name==='BLONDA TEST');to=[...a.outputs.values()].find(p=>p.name==='BLONDA TEST');if(!(ti&&to))await new Promise(s=>setTimeout(s,100))}
    r.midiIns=[...a.inputs.values()].map(p=>p.name);r.midiOuts=[...a.outputs.values()].map(p=>p.name);
    if(ti)r.midiIn=await new Promise(res=>{ti.onmidimessage=e=>res(Array.from(e.data));post({t:'test-midi-send'});setTimeout(()=>res('timeout'),3000)});
    if(to){to.send([0x90,64,90]);to.send([0x80,64,0],performance.now()+200);r.midiOutSent=true}
  }catch(e){r.midiErr=String(e)}
  try{const dl=await window.claude.use('downloads');await tmo(dl.save({filename:'selftest.blonda.json',data:'{"blonda":"seq3"}'}),3000);r.save=true}catch(e){r.save=String(e&&e.message||e)}
  r.syncPill=(document.querySelector('#syncPill span')||{}).textContent||null;
  /* start the sound like a tap on the intro button, so the screenshot shows the app and the page's own audio is checked */
  try{const b=document.getElementById('startBtn');if(b)b.click();await new Promise(s=>setTimeout(s,2500));const st=document.getElementById('start');
    r.started=!!(st&&st.hidden);const A=window.__seq&&__seq.Aref&&__seq.Aref();const c=A&&A.out&&A.out.context;r.pageAudio=c?{state:c.state,sr:c.sampleRate,base:Math.round((c.baseLatency||0)*1000),out:Math.round((c.outputLatency||0)*1000)}:null}catch(e){r.startErr=String(e)}
  r.errors=N.errs;
 }catch(e){r.fatal=String(e)}
 post({t:'selftest',r})},3500));
"""#
}
