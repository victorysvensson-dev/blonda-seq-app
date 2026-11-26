/* ---------------- v223: a saved project can never stop the app from starting ----------------
   stateHeal() checks everything a saved project holds (patterns, notes, tracks, sounds, mixer) and repairs what is missing or
   broken: an unknown engine goes back to the track's default, a missing row comes from the demo, a broken number gets its
   default. What was repaired is listed in window.__healed and shown in a short message, so nothing is fixed silently.
   stateHealEng() checks the synth engines and runs once the engine list exists. */
function stateHeal(){const fixed=[],fin=v=>typeof v==='number'&&isFinite(v),obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v),cp=v=>JSON.parse(JSON.stringify(v));
  let D=null;const dm=()=>D||(D=demo());
  if(!Array.isArray(S.pats)||S.pats.length!==4){if(S.pats!=null)fixed.push('mönster');S.pats=dm()}
  for(let pi=0;pi<4;pi++){let pt=S.pats[pi];if(!Array.isArray(pt)){S.pats[pi]=pt=dm()[pi];fixed.push('mönster '+'ABCD'[pi])}
    for(let ti=0;ti<TRACKS.length;ti++){let row=pt[ti];if(!Array.isArray(row)){if(row!==undefined)fixed.push(TRACKS[ti].id+' '+'ABCD'[pi]);pt[ti]=row=cp(dm()[pi][ti]||dm()[0][ti])}
      const n0=(dm()[pi][ti]&&dm()[pi][ti][0]&&dm()[pi][ti][0].n)||60;let bad=0;
      while(row.length<16){row.push({v:0,n:n0});bad=1}
      for(let st=0;st<row.length;st++){const c=row[st];if(!obj(c)){row[st]={v:0,n:n0};bad=1;continue}
        if(!fin(c.v)){c.v=c.v?1:0;bad=1}if(!fin(c.n)){c.n=n0;bad=1}
        for(const k of ['r','p','vel','o','c'])if(c[k]!=null&&!fin(c[k])){delete c[k];bad=1}}
      if(bad)fixed.push('steg '+TRACKS[ti].id)}}
  if(!Array.isArray(S.roll)||S.roll.length!==4){if(S.roll!=null)fixed.push('toner');S.roll=[{},{},{},{}]}
  for(let pi=0;pi<4;pi++){if(!obj(S.roll[pi])){S.roll[pi]={};fixed.push('toner '+'ABCD'[pi])}const o=S.roll[pi];
    TRACKS.forEach((t,ti)=>{if(!t.mel)return;let R=o[t.id];
      if(!Array.isArray(R)){o[t.id]=S.pats[pi][ti].map((c,st)=>c.v?{s:st,l:1,n:c.n,v:c.v===2?1:.72}:null).filter(Boolean);if(R!==undefined)fixed.push('toner '+t.id);return}
      const ok=R.filter(m=>obj(m)&&fin(m.s)&&fin(m.n)&&m.s>=0&&m.s<64);if(ok.length!==R.length)fixed.push('toner '+t.id);
      ok.forEach(m=>{if(!fin(m.l)||m.l<=0)m.l=1;if(!fin(m.v))m.v=.72;m.n=Math.max(0,Math.min(127,Math.round(m.n)))});o[t.id]=ok})}
  if(!obj(S.params)){if(S.params!=null)fixed.push('ljud');S.params={}}
  TRACKS.forEach(t=>{const d=DEF_P[t.id];if(!d)return;let p=S.params[t.id];if(!obj(p)){if(p!=null)fixed.push('ljud '+t.id);S.params[t.id]=cp(d);return}
    for(const k in d)if(typeof d[k]==='number'&&!fin(p[k])){if(p[k]!=null)fixed.push('ljud '+t.id);p[k]=d[k]}});
  /* values that must be text (a drum's sound or sample, the simple synth's sound) and lengths that must be whole steps */
  if(obj(S.dk))for(const k in S.dk)if(typeof S.dk[k]!=='string'){delete S.dk[k];fixed.push('trumljud '+k)}
  if(obj(S.enk))for(const k in S.enk)if(typeof S.enk[k]!=='string')delete S.enk[k];
  if(obj(S.len))for(const k in S.len){const v=S.len[k];if(!fin(v)||v<1||v>64){delete S.len[k];fixed.push('längd '+k)}else S.len[k]=Math.round(v)}
  if(obj(S.chord))for(const k in S.chord)if(!fin(S.chord[k]))delete S.chord[k];
  if(obj(S.tfx))for(const k in S.tfx){const F=S.tfx[k];if(!obj(F)){delete S.tfx[k];continue}for(const f of ['drive','filt','reso','crush','comp','pump'])if(!fin(F[f]))F[f]=0;for(const f in F)if(!fin(F[f]))F[f]=0}
  if(S.glideT!=null&&!fin(S.glideT))S.glideT=.07;
  if(S.mixV!=null&&!fin(S.mixV))S.mixV=2;
  const M0={filter:0,echo:.38,space:.4,drive:.12,pump:.4,swing:.12,vol:.75};
  if(!obj(S.master)){if(S.master!=null)fixed.push('master');S.master=cp(M0)}for(const k in M0)if(!fin(S.master[k])){if(S.master[k]!=null)fixed.push('master '+k);S.master[k]=M0[k]}
  if(!fin(S.bpm)){S.bpm=120;fixed.push('tempo')}S.bpm=Math.max(60,Math.min(180,Math.round(S.bpm)));
  if(!fin(S.pat)||S.pat<0||S.pat>3){S.pat=0;fixed.push('mönsterval')}S.pat=Math.round(S.pat);
  if(!fin(S.sel)||S.sel<0||S.sel>=TRACKS.length){S.sel=0}S.sel=Math.round(S.sel);
  if(!Array.isArray(S.mute)){if(S.mute!=null)fixed.push('mute');S.mute=[]}for(let i=0;i<TRACKS.length;i++)if(!fin(S.mute[i]))S.mute[i]=S.mute[i]?1:0;
  if(S.chain!=null&&!Array.isArray(S.chain)){S.chain=[0,0,0,0,0,0,0,0];fixed.push('låtkedja')}
  if(Array.isArray(S.chain))S.chain=S.chain.map(v=>fin(v)?Math.max(-1,Math.min(3,Math.round(v))):-1);
  for(const k of ['lock','ck','nrep','len','dk','tfx','chord','stxw','smpk','enk','glitch','se','gfx','mot','motL','gxEx','bus','chop','clP','cmin','eu','rsPre','userPre'])if(S[k]!=null&&!obj(S[k])){S[k]={};fixed.push(k)}
  for(const k of ['arr','clips','mods','stx','trk','dice'])if(S[k]!=null&&!obj(S[k])){S[k]=null;fixed.push(k)}
  for(const k of ['duoMem','stxSnap'])if(S[k]!=null&&!Array.isArray(S[k]))S[k]=null;
  /* everything the app starts with keeps its kind: a number stays a number, a list a list, a group a group */
  if(typeof S_DEF!=='undefined')for(const k in S_DEF){const dv=S_DEF[k],v=S[k];
    if(Array.isArray(dv)){if(!Array.isArray(v)){if(v!=null)fixed.push(k);S[k]=cp(dv)}}
    else if(obj(dv)){if(!obj(v)){if(v!=null)fixed.push(k);S[k]=cp(dv)}}
    else if(typeof dv==='number'){if(!fin(v)){if(v!=null)fixed.push(k);S[k]=dv}}
    else if(typeof dv==='string'){if(typeof v!=='string'){if(v!=null)fixed.push(k);S[k]=dv}}
    else if(typeof dv==='boolean'&&typeof v!=='boolean')S[k]=!!v}
  /* the colour worlds (6 of them; the list is made further down, so the count is written here) */
  if(!fin(S.world)||S.world<0||S.world>5)S.world=0;S.world=Math.round(S.world);
  if(!obj(S.fx)){if(S.fx!=null)fixed.push('fx');S.fx={}}const FX0={echo:{on:1,fb:.38,time:.75},space:{on:1,size:2.6},tape:{on:1,color:.75},crush:{on:0,bits:6,mix:.4}};
  for(const k in FX0){if(!obj(S.fx[k]))S.fx[k]=cp(FX0[k]);for(const f in FX0[k])if(!fin(S.fx[k][f]))S.fx[k][f]=FX0[k][f]}
  S.fx.space.size=Math.max(.2,Math.min(8,S.fx.space.size));S.fx.echo.time=Math.max(.01,Math.min(4,S.fx.echo.time));S.fx.echo.fb=Math.max(0,Math.min(.95,S.fx.echo.fb));S.fx.crush.bits=Math.max(1,Math.min(16,Math.round(S.fx.crush.bits)));
  /* the Starter's memory of what it wrote */
  if(obj(S.stxw))for(const k of ['h','m','ph'])if(S.stxw[k]!=null&&!obj(S.stxw[k]))S.stxw[k]={};
  for(const k of ['synth','inst','eng'])if(!obj(S[k])){if(S[k]!=null)fixed.push(k);S[k]=cp(DEFS[k])}
  if(!Array.isArray(S.loops)||S.loops.length!==4){S.loops=[0,1,2,3].map(()=>({sid:null,on:1,vol:.8,bars:0}))}
  S.loops.forEach((l,i)=>{if(!obj(l)){S.loops[i]={sid:null,on:1,vol:.8,bars:0};return}if(l.sid!=null&&typeof l.sid!=='string')l.sid=null;if(!fin(l.vol))l.vol=.8;if(!fin(l.bars))l.bars=0;if(l.on==null)l.on=1});
  /* the synths' own settings: a number stays a number, a text stays a text */
  const same=(o,d,lab)=>{for(const f in d){const dv=d[f],v=o[f];if(typeof dv==='number'&&!fin(v)){if(v!=null)fixed.push(lab);o[f]=dv}else if(typeof dv==='string'&&typeof v!=='string'){if(v!=null)fixed.push(lab);o[f]=dv}else if(obj(dv)){if(!obj(v))o[f]=cp(dv);else same(v,dv,lab)}}};
  for(const k of ['synth','eng'])for(const sub in DEFS[k]){if(!obj(S[k][sub])){if(S[k][sub]!=null)fixed.push(k+' '+sub);S[k][sub]=cp(DEFS[k][sub]);continue}same(S[k][sub],DEFS[k][sub],k+' '+sub)}
  if(fixed.length)window.__healed=(window.__healed||[]).concat(fixed);return fixed}
function stateHealEng(){const fixed=[],obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  TRACKS.forEach(t=>{if(!t.mel)return;const e=S.inst[t.id];if(typeof e!=='string'||!ENG[e]||!ENG[e].name){S.inst[t.id]=DEFS.inst[t.id]||'analog';if(e!==undefined)fixed.push('motor '+t.id+' ('+e+')')}});
  for(const e in DEFS.eng){if(!obj(S.eng[e])){S.eng[e]={}}S.eng[e]=Object.assign({},DEFS.eng[e],S.eng[e])}
  for(const id in DEFS.synth)if(!obj(S.synth[id]))S.synth[id]=JSON.parse(JSON.stringify(DEFS.synth[id]));
  if(fixed.length)window.__healed=(window.__healed||[]).concat(fixed);return fixed}
function healNote(){const h=window.__healed;if(!h||!h.length||window.__healNoted)return;window.__healNoted=1;const u=[...new Set(h)];
  setTimeout(()=>{try{toast('Projektet hade trasiga delar som lagades: '+u.slice(0,4).join(', ')+(u.length>4?' m.fl.':''))}catch(e){globalThis.__el&&globalThis.__el(e)}},1800)}
try{stateHeal()}catch(e){console.error('stateHeal',e)}

(()=>{const D=demo();S.pats.forEach((pt,pi)=>{while(pt.length<TRACKS.length)pt.push(D[pi][pt.length])});
  if(!Array.isArray(S.roll)||S.roll.length!==4)S.roll=S.pats.map(pt=>{const o={};TRACKS.forEach((t,ti)=>{if(t.mel)o[t.id]=pt[ti].map((c,st)=>c.v?{s:st,l:1,n:c.n,v:c.v===2?1:.72}:null).filter(Boolean)});return o});
  S.roll.forEach((o,pi)=>TRACKS.forEach((t,ti)=>{if(t.mel&&!Array.isArray(o[t.id]))o[t.id]=S.pats[pi][ti].map((c,st)=>c.v?{s:st,l:1,n:c.n,v:c.v===2?1:.72}:null).filter(Boolean)}));
  if(!S.chord)S.chord={keys:1,pad:1};if(!S.dk)S.dk={};if(!S.tfx)S.tfx={};if(!S.len)S.len={};if(!S.lock)S.lock={};if(!Array.isArray(S.loops)||S.loops.length!==4)S.loops=[0,1,2,3].map(()=>({sid:null,on:1,vol:.8,bars:0}));if(!S.glideT)S.glideT=.07;
  while(S.mute.length<TRACKS.length)S.mute.push(0);TRACKS.forEach(t=>{if(!S.params[t.id])S.params[t.id]=JSON.parse(JSON.stringify(DEF_P[t.id]))});
  for(const k of ['synth','inst','eng']){if(!S[k]||typeof S[k]!=='object')S[k]={};for(const sub in DEFS[k]){const dv=DEFS[k][sub];
    if(!(sub in S[k]))S[k][sub]=JSON.parse(JSON.stringify(dv));else if(dv&&typeof dv==='object')for(const f in dv)if(!(f in S[k][sub]))S[k][sub][f]=dv[f]}}})();
if((S.mixV||0)<2){S.params=JSON.parse(JSON.stringify(DEF_P));S.master={filter:0,echo:.38,space:.4,drive:.12,pump:.4,swing:.12,vol:.75};S.world=0;S.mixV=2}
try{stateHeal()}catch(e){console.error('stateHeal',e)}
function notesAt(R,st){return R.filter(n=>Math.floor(n.s+1e-6)===st)}
function clrStep(c){c.v=0;delete c.r;delete c.p;delete c.vel;delete c.o;delete c.c;delete c.so;delete c.rv;delete c.pt;delete c.gl;return c}
function tidyRow(row){row.forEach(c=>{if(!c.v&&(c.r||c.p!=null||c.vel!=null||c.o!=null||c.so||c.rv||c.pt||c.gl))clrStep(c)})}
function syncCells(pi,ti){const id=TRACKS[ti].id,R=S.roll[pi][id],row=S.pats[pi][ti];for(let st=0;st<16;st++){const ns=notesAt(R,st);if(!ns.length){clrStep(row[st]);continue}
  row[st].v=ns.some(n=>n.v>=.95)?2:1;row[st].n=Math.min(...ns.map(n=>n.n))}}
function reconcile(pi,ti){const id=TRACKS[ti].id,R=S.roll[pi][id],row=S.pats[pi][ti];
  for(let st=0;st<16;st++){const c=row[st],ns=notesAt(R,st);
    if(!c.v&&ns.length)ns.forEach(n=>R.splice(R.indexOf(n),1));
    else if(c.v&&!ns.length)R.push({s:st,l:1,n:c.n,v:c.v===2?1:.72});
    else if(c.v){const acc=ns.some(n=>n.v>=.95);if(c.v===2&&!acc)ns.forEach(n=>n.v=1);if(c.v===1&&acc)ns.forEach(n=>{if(n.v>=.95)n.v=.72});
      const lo=Math.min(...ns.map(n=>n.n));if(c.n!==lo){const d=c.n-lo;ns.forEach(n=>n.n=clamp(n.n+d,24,96))}}}
  const ids=new Set(R.filter(m=>m.id).map(m=>m.id));R.forEach(m=>{if(m.g&&!ids.has(m.g))delete m.g})}
function reconcileAll(){if(!S.roll)return;for(let pi=0;pi<4;pi++)TRACKS.forEach((t,ti)=>{if(t.mel)reconcile(pi,ti)})}
let saveT=0;function save(){reconcileAll();clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){globalThis.__el&&globalThis.__el(e)}if(typeof libSync==='function')libSync()},300)}

