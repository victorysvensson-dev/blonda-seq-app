/* ---------- v203: the rendering runs in a background thread (a Web Worker), so the music and the screen never wait for it ----------
   The render code above is pure maths (no audio context), so the worker gets the very same functions as text. The page only turns
   the finished samples into an AudioBuffer. Offline renders (export) still render right away on the spot. Without workers: as before. */
const INS_W={w:null,busy:0,max:3,wait:new Map(),ok:false};
function insWStart(){if(INS_W.w||INS_W.ok===null)return;try{
  const src=[insR,insTw,insModal,insNorm,insBiquad,insRender].map(f=>f.toString()).join('\n')+'\nconst insF='+insF.toString()+';\nconst INS='+JSON.stringify(INS)+';\nconst INS_POLY='+JSON.stringify(INS_POLY)+',INS_SUB='+JSON.stringify(INS_SUB)+';\n'+
    "onmessage=e=>{const m=e.data;let ch=null;try{ch=insRender(m.name,m.n,m.sr,m.seed)}catch(err){globalThis.__el&&globalThis.__el(err)}if(!ch){postMessage({k:m.k,ch:null});return}postMessage({k:m.k,ch},ch.map(x=>x.buffer))}";
  const url=URL.createObjectURL(new Blob([src],{type:'text/javascript'}));INS_W.w=new Worker(url);INS_W.ok=true;
  INS_W.w.onmessage=e=>{const {k,ch}=e.data,it=INS_W.wait.get(k);INS_W.wait.delete(k);INS_W.busy--;INS_QK.delete(k);
    if(it&&ch&&!INS_C.has(k)){try{const c=it[0],b=c.createBuffer(ch.length,ch[0].length,c.sampleRate);ch.forEach((d,i)=>b.copyToChannel?b.copyToChannel(d,i):b.getChannelData(i).set(d));INS_C.set(k,b);
      while(INS_C.size>360){INS_C.delete(INS_C.keys().next().value)}}catch(err){globalThis.__el&&globalThis.__el(err)}}insFeed()};
  INS_W.w.onerror=()=>{INS_W.ok=null;try{INS_W.w.terminate()}catch(e){globalThis.__el&&globalThis.__el(e)}INS_W.w=null;INS_W.wait.forEach(it=>INS_Q.unshift(it));INS_W.wait.clear();INS_W.busy=0;if(!INS_T)INS_T=setTimeout(insWork,0)}
 }catch(e){INS_W.ok=null;INS_W.w=null}}
function insFeed(){if(!INS_W.w)return false;while(INS_W.busy<INS_W.max&&INS_Q.length){const it=INS_Q.shift(),[c,name,n,seed,k]=it;if(INS_C.has(k)){INS_QK.delete(k);continue}
  INS_W.wait.set(k,it);INS_W.busy++;INS_W.w.postMessage({k,name,n,sr:c.sampleRate,seed})}return true}
{const want0=insWant;insWant=function(c,name,n,seed){if(!INS[name])return;insWStart();
   if(!INS_W.w)return want0(c,name,n,seed);const k=insKey(name,n,seed,c.sampleRate);if(INS_C.has(k)||INS_QK.has(k))return;INS_QK.add(k);INS_Q.push([c,name,n,seed,k]);insFeed()}}
window.__ins={insW:INS_W,insAtmos,INS,insMake,insBuf,insRender,insWant,INS_Q,INS_C};

/* the atmosphere fades out when the transport stops */
setInterval(()=>{try{if(typeof playing!=='undefined'&&!playing&&typeof STX!=='undefined'&&STX.E&&STX.E.atmG&&STX.E.atmK)STX.E.atmG.gain.setTargetAtTime(0,STX.E.c.currentTime,.3)}catch(e){globalThis.__el&&globalThis.__el(e)}},300);
/* sounds: the Starter's own (poly for ackord/topp/luft, sub for sub) — or one of the app's synth channels ("t:bass" …),
   played with that channel's engine and settings, so its sound is edited in the synth card */
const STX_POLY=['juno','keys','plock','orgel','mjuk','glas','klocka','kör','sinus','mallet','stack','röst','moln'],STX_SUBS=['sinus','808','moog','kort'],STX_TRK=['t:bass','t:keys','t:lead','t:pad'];
/* the app's synth engines: picking one puts that engine on the layer's channel (ackord → keys, topp → lead, sub → bass, luft → pad) */
const STX_ENG=['grime','mini','sh101','acid','analog','fm','pluck','super','chip','bris'],STX_LTRK={ack:'keys',klo:'lead',sub:'bass',luft:'pad'};
const STX_ENGN={grime:'grime',mini:'moog',sh101:'sh-101',acid:'acid',analog:'analog',fm:'fm',pluck:'pluck',super:'super',chip:'chip',bris:'bris'};
const STX_SND=STX_POLY,STX_ARP=['melodi','upp','ner','studs'];
const STX_LAY=[['ack','ackord','#F07AB0'],['klo','topp','#6FD0C5'],['sub','sub','#B9A6FF'],['luft','luft','#8A93A6']];
const STX_LDEF={ack:{snd:'juno',oct:0,lv:.75,len:.5,ton:.5},klo:{snd:'glas',oct:0,lv:.75,len:.5,ton:.5},sub:{snd:'sinus',oct:0,lv:.75,len:.5,ton:.5},luft:{snd:'mjuk',oct:0,lv:.75,len:.5,ton:.5}};
const STX_K=[['ton','ton',.34],['len','längd',.5],['drv','drive',.2],['tejp','tejp',.45],['eko','eko',.15],['rum','rum',.12],['br','bredd',.7],['pump','pump',.35],['tail','svans',.3],['atm','atmos',0],['vol','volym',.72]];
/* fx: written into the loop at fixed places (bar b, step s, len steps, sl = slice in steps), or held live.
   b −1 = at the last hit of bars 1 and 3 · b −2 = before every phrase that comes after a rest */
const STX_FX=[{id:1,nm:'stutter',b:1,s:12,len:4,sl:.5},{id:2,nm:'roll',b:3,s:8,len:4,sl:1},{id:3,nm:'rev',b:2,s:14,len:2},{id:4,nm:'tape stop',b:3,s:13,len:3},
  {id:8,nm:'dipp',b:1,s:4,len:4},{id:9,nm:'sug',b:-2},{id:5,nm:'gate',b:2,s:8,len:4,sl:.5},{id:6,nm:'eko-kast',b:-1},{id:7,nm:'filter',b:3,s:8,len:8}];
/* follow: how the pattern synths follow the Starter's chords. rot = the bass plays the chord's root · ackord = moved with the
   chord and snapped to its notes · skala = kept in the Starter's key · transp = moved with the chord · av */
const STX_FOL=['ackord','rot','skala','transp','av'];
/* arpeggiator for ackord and luft: rate in 16ths, direction, octaves, gate; fill 0 = only inside the phrases, 1 = the whole bar */
const STX_AR={'1/4':4,'1/8':2,'1/8T':4/3,'1/16':1,'1/16T':2/3,'1/32':.5},STX_ARL=Object.keys(STX_AR),STX_AM=['upp','ner','upp-ner','slump','spelat'];
const STX_ADEF={on:0,rate:'1/16',mode:'upp',oct:1,gate:.55,fill:0};
const STX_DEF=()=>({on:0,root:9,mode:'moll',prog:0,custom:null,rn:'puls',rh:null,arp:'melodi',seed:7,lay:{ack:1,klo:1,sub:1,luft:0},
  k:Object.fromEntries(STX_K.map(([k,,v])=>[k,v])),fx:{1:1,3:1,4:1,6:1,8:1,9:1},ls:JSON.parse(JSON.stringify(STX_LDEF)),
  src:'starter',fol:{on:1,bass:'rot',keys:'ackord',lead:'skala',pad:'ackord'},mel:{dens:.5,reg:1},g:{sving:0,lat:.25,human:.2},ed:{klo:{},ack:{},sub:{},luft:{}},
  pat:null,vc:'tät',subLo:33,pre:-1,form:'allt',smp:[{id:STX_FABSMP[0],on:0,mode:'klipp',amt:.4,lv:.6,oct:0,fx:.5},{id:STX_FABSMP[1],on:0,mode:'ett',amt:.35,lv:.55,oct:0,fx:.4}]});
/* form (v136): the Starter doesn't have to start with everything. 16 bars, each says which layers play in it:
   s = sub · k = topp · a = ackord · l = luft · v = röst/ljud. The layer's own on/off still decides; the form only holds it back.
   It starts over from bar 1 every time play starts, so "bygg" builds up from nothing; after 16 bars it goes round again. */
const STX_FORM={allt:Array(16).fill('skalv'),
  bygg:['s','s','sk','sk','ska','ska','skav','skav','skalv','skalv','skalv','skalv','skalv','skalv','kv','skalv'],
  'bas först':['sv','sv','sv','sv','skv','skv','skv','skv','skav','skav','skalv','skalv','skalv','skalv','kav','skalv'],
  'topp först':['k','k','ka','ka','kas','kas','kasv','kasv','skalv','skalv','skalv','skalv','skalv','skalv','k','skalv'],
  'ackord först':['a','a','a','a','as','as','asv','asv','skalv','skalv','skalv','skalv','skalv','skalv','al','skalv'],
  drop:['al','al','akl','akl','akl','aklv','k','k','skalv','skalv','skalv','skalv','skalv','skalv','skalv','skv'],
  andning:['skalv','skalv','skalv','skalv','skalv','skalv','skalv','kv','skalv','skalv','skalv','skalv','skalv','skalv','skalv','a'],
  'fråga-svar':['sa','skv','sa','skv','sa','skv','sa','skalv','sa','skv','sa','skv','sa','skv','sal','skalv'],
  levande:['skalv','skav','skalv','sklv','skalv','skav','skal','skalv','sav','skalv','sklv','skalv','skav','skalv','kv','skalv'],
  gles:['sa','sal','sak','sakl','sa','sal','skl','sakl','sa','sav','sak','sakl','sal','sa','kl','sakl']};
const STX_FORMN=Object.keys(STX_FORM);
const stxFormOn=(P,gs,l)=>{const F=STX_FORM[P.form];if(!F)return true;const m=F[((Math.floor(gs/16)%16)+16)%16]||'';return m.includes({sub:'s',klo:'k',ack:'a',luft:'l',v:'v'}[l])};
/* the factory samples (in the sound pack): Victory's voice and one-shot. Your own sounds go in the same two slots */
var STX_FABSMP=['kit:vox','b-stx-stop-low-e'];
/* (v260) the sounds slot 2 picks from in a new idea: the synth stop (E) and wubbas, a wobble bass (C) */
var STX_SNDSMP=['b-stx-stop-low-e','b-stx-wubbas-c'];
/* the library gets a bass tab for it */
try{if(!PACK_GROUPS.hit.some(g=>g[0]==='bass'))PACK_GROUPS.hit.splice(PACK_GROUPS.hit.findIndex(g=>g[0]==='fill'),0,['bass','bass'])}catch(e){globalThis.__el&&globalThis.__el(e)}
/* the voice kit: chops cut offline at the notes (zero-crossing cuts, short fades), each with its measured pitch (MIDI, cents) */
var STX_VOXN={"b-stx-vox-hotel-1":65.73,"b-stx-vox-hotel-2":64.18,"b-stx-vox-hotel-3":65.63,"b-stx-vox-hotel-4":66.98,"b-stx-vox-hotel-5":65.88,"b-stx-vox-hotel-6":64.08,"b-stx-vox-hotel-8":64.08,"b-stx-vox-hotel-10":58.88,"b-stx-vox-hotel-11":59.08,"b-stx-vox-hotel-12":59.88,"b-stx-vox-hotel-13":58.98,"b-stx-vox-hotel-14":59.98,"b-stx-vox-hotel-15":61.98,"b-stx-vox-hotel-17":58.98,"b-stx-vox-hotel-18":58.28,"b-stx-vox-aa-1":56.98,"b-stx-vox-hi-1":79.18,"b-stx-vox-hi-2":80.18,"b-stx-vox-hi-3":80.78,"b-stx-vox-grace-2":73.48,"b-stx-vox-grace-3":73.83,"b-stx-vox-woo-hel":79.98,"b-stx-vox-aa-hel":56.98,"b-stx-vox-grace-hel":73.38};
function stx(){if(!S.stx||typeof S.stx!=='object')S.stx=STX_DEF();const d=STX_DEF(),P=S.stx;for(const k in d)if(P[k]==null)P[k]=d[k];
  for(const k of ['k','fol','mel','g'])for(const q in d[k])if(P[k][q]==null)P[k][q]=d[k][q];
  for(const l in STX_LDEF){if(!P.ls[l])P.ls[l]={...STX_LDEF[l]};for(const q in STX_LDEF[l])if(P.ls[l][q]==null)P.ls[l][q]=STX_LDEF[l][q]}
  for(const l of ['ack','luft']){if(!P.ls[l].arp||typeof P.ls[l].arp!=='object')P.ls[l].arp={...STX_ADEF};for(const q in STX_ADEF)if(P.ls[l].arp[q]==null)P.ls[l].arp[q]=STX_ADEF[q]}
  if(P.snd){P.ls.ack.snd=P.snd==='glas'?'keys':P.snd==='mörk'?'juno':P.snd;delete P.snd}
  if(!STX_ARP.includes(P.arp))P.arp='melodi';for(const q of ['klo','ack','sub','luft'])if(!P.ed[q])P.ed[q]={};
  if(P._fv!==1){P.form='allt';P._fv=1}/* v137: a form only when you choose one */
  if(!Array.isArray(P.smp)||P.smp.length<2)P.smp=d.smp;P.smp.forEach((x,i)=>{for(const q in d.smp[i])if(x[q]===undefined)x[q]=d.smp[i][q];if(!x.id||x.id==='b-stx-vox-hotelroom')x.id=STX_FABSMP[i]});return P}
const stxRh=P=>P.pat?stxPatR(P):P.rh&&P.rh.length===4?P.rh:STX_RH[P.rn]||STX_RH.puls;
/* a written pattern (from a preset): where something sounds, as a rhythm (x = sounding) — for the rings, the room/echo gates and the fx */
function stxPatR(P){const T=P.pat,R=['','','',''],kl=T.klo||{},kn=Object.keys(kl).map(Number).sort((a,b)=>a-b);
  for(let g=0;g<64;g++){const b=g>>4,s=g&15,on=['ack','sub','luft'].some(k=>{const c=((T[k]||[])[b]||'')[s];return c==='x'||c==='-'||c==='>'||c==='^'})||kn.some(k=>g>=k&&g<k+((T.kl||{})[k]||2));R[b]+=on?'x':'.'}return R}
const stxSndName=s=>s&&s.startsWith('t:')?'spår '+s.slice(2):s&&s.startsWith('e:')?(STX_ENGN[s.slice(2)]||s.slice(2))+' ↗':s;
/* an engine layer plays on a channel: its own choice (L.ch) or the default for the layer */
/* v214: every layer belongs to a synth track – its own sounds (the simple synth) play on that track's mixer strip too */
const stxTrkOf=(lay,s)=>{if(s&&s.startsWith('t:'))return s.slice(2);return STX_LTRK[lay]||null};
/* a layer played by one of the big synths (the track's own engine) rather than by the Starter's own voices */
const stxViaTrk=s=>!!(s&&(s.startsWith('e:')||s.startsWith('t:')));

/* chords: [semitones from the key, quality] (or a chord taken from the piano: {r, iv, name}); 4 = one a bar, 8 = two a bar */
const STX_NN=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const STX_Q={'':[0,4,7],m:[0,3,7],add9:[0,4,7,14],madd9:[0,3,7,14],maj7:[0,4,7,11],m7:[0,3,7,10],m9:[0,3,7,10,14],maj9:[0,4,7,11,14],'7sus4':[0,5,7,10],sus2:[0,2,7],sus4:[0,5,7],'6':[0,4,7,9],'7':[0,4,7,10],'6add9':[0,4,7,9,14],
  m11:[0,3,7,10,14,17],'9':[0,4,7,10,14],m6:[0,3,7,9],'maj7#11':[0,4,7,11,18],dim:[0,3,6],m7b5:[0,3,6,10]};
const STX_QN={'':'',m:'m',add9:'add9',madd9:'m(add9)',maj7:'maj7',m7:'m7',m9:'m9',maj9:'maj9','7sus4':'7sus4',sus2:'sus2',sus4:'sus4','6':'6','7':'7','6add9':'6/9',m11:'m11','9':'9',m6:'m6','maj7#11':'maj7#11',dim:'dim',m7b5:'m7b5'};
const STX_KBQ={'6add9':'69'};   /* the piano's names where they differ */
const STX_BANK={moll:[['mysterious',[[0,'m9'],[5,'maj9'],[3,'maj7'],[10,'add9']]],
    ['output',[[0,'madd9'],[0,'m7'],[5,'maj7'],[7,'7sus4'],[5,'sus2'],[5,'add9'],[0,'m9'],[10,'sus2']]],
    ['stack',[[5,'sus2'],[10,'6'],[3,'maj7'],[0,'madd9']]],['natt',[[0,'m7'],[8,'maj7'],[3,'add9'],[10,'7sus4']]],['dorisk',[[0,'m9'],[5,'7'],[0,'m9'],[5,'add9']]],
    ['soul',[[0,'m11'],[5,'9'],[10,'maj7'],[3,'maj9']]],['regn',[[0,'m9'],[8,'maj7#11'],[10,'6'],[7,'m7']]]],
  dur:[['flower',[[9,'m9'],[5,'add9'],[0,'add9'],[0,'6'],[9,'madd9'],[5,'maj7'],[0,'add9'],[7,'sus4']]],
    ['ljus',[[0,'maj7'],[4,'m7'],[9,'m9'],[5,'maj9']]],['lyft',[[5,'add9'],[7,'sus4'],[4,'m7'],[9,'madd9']]],['hymn',[[0,'add9'],[7,'6'],[9,'m7'],[5,'maj7']]],
    ['sommar',[[5,'maj9'],[4,'m7'],[2,'m9'],[0,'6add9']]]]};
const STX_POOL={moll:[[0,'m9'],[0,'madd9'],[0,'m7'],[0,'m11'],[3,'maj7'],[3,'add9'],[5,'maj7'],[5,'7'],[5,'m9'],[5,'9'],[7,'7sus4'],[7,'m7'],[8,'maj7'],[8,'maj9'],[8,'maj7#11'],[10,'add9'],[10,'sus2'],[10,'6']],
  dur:[[0,'add9'],[0,'maj7'],[0,'6add9'],[2,'m7'],[2,'m9'],[4,'m7'],[5,'maj7'],[5,'add9'],[5,'maj9'],[7,'sus4'],[7,'7sus4'],[7,'6'],[9,'m9'],[9,'madd9'],[9,'m7']]};
