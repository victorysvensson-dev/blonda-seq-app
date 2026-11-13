(()=>{const post=m=>{try{webkit.messageHandlers.blonda.postMessage(m)}catch(e){}},L=m=>post({t:'diag',m:String(m)});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const src=()=>{const l=((new Error().stack||'').split('\n').slice(2).find(l=>/index\.html:\d/.test(l))||'?');return l.replace(/^\s*at\s+/,'').replace(/(blonda:\/\/seq3|https?:\/\/[^ )]*)\/[^ )]*index\.html/,'').slice(0,40)};
/* time every timer and frame callback by where it was made */
const T=new Map();const add=(k,d)=>{const c=T.get(k)||[0,0];c[0]+=d;c[1]++;T.set(k,c)};
const wrap=(kind,f)=>{if(typeof f!=='function')return f;const k=kind+' '+src();return function(...a){const t=performance.now();try{return f.apply(this,a)}finally{add(k,performance.now()-t)}}};
const sT=window.setTimeout,sI=window.setInterval;window.setTimeout=function(f,ms,...a){return sT.call(window,wrap('timeout',f),ms,...a)};window.setInterval=function(f,ms,...a){return sI.call(window,wrap('interval',f),ms,...a)};
const R0=window.requestAnimationFrame.bind(window);let layoutT=0,layoutN=0,layoutMax=0;
/* after each frame's scripts: how long the engine needs to bring styles and layout up to date */
window.requestAnimationFrame=function(f){return R0(t=>{const a=performance.now();try{f(t)}finally{add('frame '+'(all)',performance.now()-a);const b=performance.now();document.documentElement.getBoundingClientRect();const d=performance.now()-b;layoutT+=d;layoutN++;layoutMax=Math.max(layoutMax,d)}})};
/* what changes in the page */
const M=new Map();const tag=n=>{if(!n||!n.tagName)return '#text';let s=n.tagName.toLowerCase();if(n.id)s+='#'+n.id;else if(typeof n.className==='string'&&n.className)s+='.'+n.className.trim().split(/\s+/)[0];const p=n.closest&&n.closest('.card,[id]');if(p&&p!==n)s=(p.id?'#'+p.id:'.'+(p.className.split(' ')[1]||p.className.split(' ')[0]))+' > '+s;return s};
let mo=null;const watch=on=>{if(mo){mo.disconnect();mo=null}if(!on)return;mo=new MutationObserver(ms=>{for(const m of ms){const k=m.type+(m.attributeName?'['+m.attributeName+']':'')+' '+tag(m.target);M.set(k,(M.get(k)||0)+1)}});mo.observe(document.body,{subtree:true,attributes:true,childList:true,characterData:true})};
for(const ty of ['keydown'])addEventListener(ty,e=>{const tg=e.target;setTimeout(()=>L(ty+' code='+e.code+' target='+(tg&&tg.tagName)+' prevented='+e.defaultPrevented),0)},true);
async function phase(name,ms){T.clear();M.clear();layoutT=0;layoutN=0;layoutMax=0;watch(true);post({t:'mark',p:'begin',name});await sleep(ms);post({t:'mark',p:'end'});watch(false);
  const s=ms/1000,top=[...T.entries()].sort((a,b)=>b[1][0]-a[1][0]).slice(0,10).map(([k,v])=>'  '+(v[0]/ms*100).toFixed(1)+'% '+v[1]+'x '+k).join('\n');
  const mut=[...M.entries()].sort((a,b)=>b[1]-a[1]).slice(0,25).map(([k,v])=>'  '+(v/s).toFixed(0)+'/s '+k).join('\n');
  L('==== '+name+': style+layout after frames '+(layoutT/ms*100).toFixed(1)+'% of the time ('+layoutN+' frames, max '+layoutMax.toFixed(1)+' ms), DOM nodes '+document.getElementsByTagName('*').length+'\n script time:\n'+top+'\n changes per second:\n'+mut)}
addEventListener('load',async()=>{L('diag2: page loaded '+innerWidth+'x'+innerHeight+' dpr '+devicePixelRatio);
  for(let i=0;i<600;i++){const st=document.getElementById('start');if(st&&st.hidden)break;await sleep(500)}
  await sleep(1500);await phase('idle',5000);try{__seq.play()}catch(e){}await sleep(1500);await phase('playing',6000);try{__seq.stop()}catch(e){}L('diag2 done')});
})();
