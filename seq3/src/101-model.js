/* ---------------- model ---------------- */
(()=>{try{const K='blonda-seq3-glass',B='blonda-boot';let n=+(localStorage.getItem(B)||0);if(n>=2){const raw=localStorage.getItem(K),ok=localStorage.getItem(K+'-ok');if(raw&&raw!==ok){try{localStorage.setItem(K+'-krasch',raw)}catch(e){globalThis.__el&&globalThis.__el(e)}}if(ok)localStorage.setItem(K,ok);else localStorage.removeItem(K);window.__bootRescued=ok?'ok':'tom';n=0}localStorage.setItem(B,String(n+1));let bad=0;addEventListener('error',()=>bad++);addEventListener('load',()=>setTimeout(()=>{if(window.__bootRescued)try{toast(window.__bootRescued==='ok'?'Projektet gick inte att öppna två gånger i rad · den senaste versionen som fungerade är öppnad, den trasiga är sparad separat':'Projektet gick inte att öppna två gånger i rad · appen startade tomt, det trasiga projektet är sparat separat')}catch(e){globalThis.__el&&globalThis.__el(e)}if(bad)return;try{localStorage.removeItem(B);const raw=localStorage.getItem(K);if(raw)localStorage.setItem(K+'-ok',raw)}catch(e){globalThis.__el&&globalThis.__el(e)}},4000))}catch(e){globalThis.__el&&globalThis.__el(e)}})();
(()=>{const shown=[];const show=(msg,src,line,col)=>{try{if(shown.length>=3)return;const k=msg+line;if(shown.includes(k))return;shown.push(k);let bar=document.getElementById('errBar');if(!bar){bar=document.createElement('div');bar.id='errBar';bar.style.cssText='position:fixed;left:12px;bottom:12px;z-index:99999;max-width:min(560px,calc(100vw - 24px));background:#3A1414;color:#FFD9D0;font:500 11px/1.4 ui-monospace,monospace;padding:10px 34px 10px 12px;border-radius:10px;box-shadow:0 0 0 1px #FF6A50,0 8px 24px rgba(0,0,0,.5);white-space:pre-wrap';const x=document.createElement('button');x.textContent='×';x.style.cssText='position:absolute;right:6px;top:4px;background:none;border:0;color:inherit;font:16px ui-monospace,monospace;cursor:pointer';x.onclick=()=>bar.remove();bar.appendChild(x);(document.body||document.documentElement).appendChild(bar)}const d=document.createElement('div');d.textContent='BLONDA fel: '+msg+(line?' · rad '+line+':'+col:'');bar.appendChild(d)}catch(e){globalThis.__el&&globalThis.__el(e)}};
  window.addEventListener('error',e=>show(e.message,e.filename,e.lineno,e.colno));window.addEventListener('unhandledrejection',e=>{const r=e.reason;if(r&&r.name==='AbortError')return;});window.__errShow=show})();
const TRACKS=[
 {id:'kick', name:'Kick', sub:'Trumma', hex:'#ECE8DF'},
 {id:'snare',name:'Snare',sub:'Virvel', hex:'#7F9CF2'},
 {id:'clap', name:'Clap', sub:'Klapp',  hex:'#72CF9E'},
 {id:'hat',  name:'Hat',  sub:'Stängd', hex:'#B4B2AA'},
 {id:'ohat', name:'Open', sub:'Öppen',  hex:'#EED27A'},
 {id:'perc', name:'Perc', sub:'Rim·tom',hex:'#F4A27A'},
 {id:'bass', name:'Bass', sub:'Analog', hex:'#FF3B2F', mel:true},
 {id:'keys', name:'Keys', sub:'Ackord', hex:'#8E7CFF', mel:true},
 {id:'lead', name:'Lead', sub:'Melodi', hex:'#00C2C7', mel:true},
 {id:'pad',  name:'Pad',  sub:'Yta',    hex:'#F7A6C8', mel:true},
 {id:'tom',  name:'Toms', sub:'Golvtom',hex:'#C9895A', kind:'perc', dm:'tom', x:1},
 {id:'rim',  name:'Rim',  sub:'Kantslag',hex:'#7F9BFF', kind:'snare', dm:'rim', x:1},
 {id:'shaker',name:'Shaker',sub:'Skak', hex:'#9ED6AE', kind:'hat', dm:'shaker', x:1},
 {id:'bell', name:'Bell', sub:'Klocka', hex:'#FFB547', kind:'perc', dm:'cowbell', x:1},
 {id:'conga',name:'Conga',sub:'Varm',   hex:'#D9703F', kind:'perc', dm:'conga', x:1},
 {id:'clave',name:'Clave',sub:'Trä',    hex:'#C2AB82', kind:'perc', dm:'clave', x:1},
 {id:'snap', name:'Snap', sub:'Knäpp',  hex:'#4FD1A0', kind:'clap', dm:'snap', x:1},
 {id:'tick', name:'Tick', sub:'Minimal',hex:'#DEDED8', kind:'hat', dm:'tick', x:1},
 {id:'kick2',name:'Kick 2',sub:'Lång boom',hex:'#E4E4DE', kind:'kick', dm:'808', x:1},
 {id:'snare2',name:'Snare 2',sub:'Frasig',hex:'#2F55C9', kind:'snare', dm:'909', x:1},
 {id:'syn5', name:'Bris', sub:'Analog', hex:'#6FA8FF', mel:true, x:1},
 {id:'syn6', name:'FM',   sub:'Klocka', hex:'#B9A6FF', mel:true, x:1},
 {id:'syn7', name:'101',  sub:'Mono',   hex:'#FF8A5B', mel:true, x:1},
 {id:'syn8', name:'Acid', sub:'303',    hex:'#C6E85A', mel:true, x:1},
];
/* melodic channels are named after what is actually loaded on them */
const ROLE={grime:'Grime',analog:'Synth',acid:'Acid',sub:'808',fm:'FM',pluck:'Pluck',super:'Pad',sh101:'101',mini:'Moog',chip:'Chip',bris:'Bris',smp:'Sampler',msx:'Sample+'},DEF_INST={bass:'analog',keys:'analog',lead:'pluck',pad:'super',syn5:'bris',syn6:'fm',syn7:'sh101',syn8:'acid'};
let _mnKey='',_mn={};
function melNames(){let inst;try{inst=S.inst}catch(e){return null}if(!inst)return null;const k=JSON.stringify(inst);if(k===_mnKey)return _mn;_mnKey=k;_mn={};const used={};
  TRACKS.forEach(t=>{if(!t.mel)used[t.base.toLowerCase()]=1});
  TRACKS.forEach(t=>{if(!t.mel)return;const e=inst[t.id]||DEF_INST[t.id];let n=(e===DEF_INST[t.id])?t.base:(ROLE[e]||t.base);
    const tk=n.toLowerCase(),clash=TRACKS.some(o=>o.mel&&o!==t&&(inst[o.id]||DEF_INST[o.id])===DEF_INST[o.id]&&o.base.toLowerCase()===tk);
    if(used[tk]||clash){let c=2;while(used[tk+' '+c])c++;n=n+' '+c}used[n.toLowerCase()]=1;_mn[t.id]=n});return _mn}
TRACKS.forEach(t=>{t.base=t.name;t.baseSub=t.sub;if(!t.mel)return;
  t.baseHex=t.hex;Object.defineProperty(t,'hex',{get(){try{const e=S.inst[t.id];return (typeof ENG!=='undefined'&&ENG[e]&&ENG[e].dot)||t.baseHex}catch(x){return t.baseHex}},set(v){t.baseHex=v},configurable:true});
  Object.defineProperty(t,'name',{get(){const m=melNames();return (m&&m[t.id])||t.base},set(v){t.base=v},configurable:true});
  Object.defineProperty(t,'sub',{get(){try{const e=S.inst[t.id];return (typeof ENG!=='undefined'&&ENG[e])?ENG[e].name:t.baseSub}catch(x){return t.baseSub}},set(v){t.baseSub=v},configurable:true})});

