/* ---------- the piano: its chords can drive the Starter (live, or caught as a progression), and it gets a "starter" bank ---------- */
const STX_PN={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
window.addEventListener('blonda-kbchord',e=>{const d=e.detail||{};if(!d.notes||d.notes.length<2)return;const m=/^([A-G])([#b]?)/.exec(d.name||'');
  const pcs=[...new Set(d.notes.map(n=>((n%12)+12)%12))];const r=m?(STX_PN[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0)+12)%12:((Math.min(...d.notes)%12)+12)%12;
  const iv=[...new Set(pcs.map(p=>(p-r+12)%12))].sort((a,b)=>a-b);const ch={r,iv,name:(d.name||'').replace(/ \(\d\)$/,'')||STX_NN[r]};
  STX.live=ch;const h=STX.hist;if(!h.length||h[h.length-1].name!==ch.name){h.push(ch);if(h.length>8)h.shift()}if(window.stxPaint)stxPaint(stx().src==='piano')});
function stxKbBank(){const B=window.__kbBanks;if(!B)return;const P=stx(),seen=new Set(),syms=[];
  const add=(r,q)=>{const s=STX_NN[r]+(STX_KBQ[q]??q);if(!seen.has(s)&&syms.length<24){seen.add(s);syms.push(s)}};
  stxProg(P).forEach(e=>{if(Array.isArray(e))add((P.root+e[0])%12,e[1]);else add(e.r,stxNearQ(e.iv))});
  STX_POOL[P.mode].forEach(([d,q])=>add((P.root+d)%12,q));while(syms.length<24)syms.push(syms[syms.length%Math.max(1,seen.size)]);
  let b=B.find(x=>x[0]==='starter');if(!b){b=['starter',syms];B.push(b)}else b[1]=syms}

/* offline render for tests: same engine, an OfflineAudioContext, n bars at bpm */
async function stxRender(bars,bpm,over){const P0=JSON.parse(JSON.stringify(stx())),P=Object.assign(P0,over||{},{on:1});if(over&&over.ls){P.ls=JSON.parse(JSON.stringify(STX_LDEF));for(const l in over.ls)Object.assign(P.ls[l],over.ls[l])}
  const sr=48000,sd=60/bpm/4,n=bars*16,len=Math.ceil((n*sd+1.5)*sr);
  const oc=new OfflineAudioContext(2,len,sr),E=stxEngine(oc,oc.destination);try{E.useFx(await stxFxNode(oc))}catch(e){globalThis.__el&&globalThis.__el(e)}E.apply(P);const plan=stxPlan(P);
  for(let g=0;g<n;g++)E.tick(.05+g*sd,g,sd,plan);const buf=await oc.startRendering();return [buf.getChannelData(0),buf.getChannelData(1)]}
/* test hooks: run engine code against another (offline) context; bris and its presets */
window.__withCtx=async(c,fn)=>{const o=ctx,oA=A;ctx=c;A=Object.assign({},A);try{return await fn()}finally{ctx=o;A=oA}};
window.__brisVoice=(...a)=>brisVoice(...a);/* (v251) added to the Bris card's own (load, step …) instead of replacing it – replacing it meant a preset picked from the full synth, the keyboard or MIDI changed the sound but not the name on the card */
window.__bris=Object.assign(window.__bris||{},{pre:()=>typeof BR_PRE!=='undefined'?BR_PRE:null,def:()=>BR_DEF,E:()=>engE('bris')});
window.__stxLoad=id=>stxSmpLoad(id);window.__stx={render:stxRender,STX,stx,PRE:STX_PRE,load:stxLoadPre,planOf:stxPlan,follow:(id,n)=>stxFollow(stx(),id,n),plan:()=>stxPlanCached()};
/* test only: render with taps before the drive (inS), before the tape (mix) and at the output: peak / rms in dB each */
window.__stxTap=async(bars,bpm,over)=>{const P0=JSON.parse(JSON.stringify(stx())),P=Object.assign(P0,over||{},{on:1});const sr=48000,sd=60/bpm/4,n=bars*16,len=Math.ceil((n*sd+1)*sr);
  const oc=new OfflineAudioContext(6,len,sr),mg=oc.createChannelMerger(6);mg.connect(oc.destination);const out=oc.createGain(),E=stxEngine(oc,out);try{E.useFx(await stxFxNode(oc))}catch(e){globalThis.__el&&globalThis.__el(e)}E.apply(P);
  const sp=(node,ch)=>{const s=oc.createChannelSplitter(2);node.connect(s);s.connect(mg,0,ch);s.connect(mg,1,ch+1)};sp(E.inS,0);sp(E.mix,2);sp(out,4);
  const plan=stxPlan(P);for(let g=0;g<n;g++)E.tick(.05+g*sd,g,sd,plan);const b=await oc.startRendering();
  const st=(a,c)=>{const x=b.getChannelData(a),y=b.getChannelData(c);let pk=0,e=0;for(let i=0;i<x.length;i++){const m=Math.max(Math.abs(x[i]),Math.abs(y[i]));if(m>pk)pk=m;e+=x[i]*x[i]+y[i]*y[i]}return [20*Math.log10(pk+1e-9),10*Math.log10(e/(2*x.length)+1e-12)].map(v=>+v.toFixed(1))};
  return {inS:st(0,1),mix:st(2,3),out:st(4,5)}};

