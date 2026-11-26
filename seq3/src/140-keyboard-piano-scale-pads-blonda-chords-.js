/* ---------- keyboard: piano / scale pads / BLONDA CHORDS, computer keys ---------- */
(function keyboard(){const kb=$('#kb'),keysEl=$('#kbKeys'),kc=$('#kc'),btn=$('#kbBtn'),DEF_OCT={bass:2,keys:3,lead:4,pad:3};
  const CHD={on:0,mode:'noter',bank:0,strum:0,inv:0,oct:0,sev:0,dir:'upp',arp:'av',fol:'av'};
  const K=()=>{if(!S.kb||typeof S.kb!=='object')S.kb={};const k=S.kb;if(!k.oct)k.oct={};if(k.scale==null)k.scale=0;k.ch=Object.assign({},CHD,k.ch||{});if(!Array.isArray(k.own)||k.own.length!==24)k.own=Array(24).fill(null);return k};
  let kt=MEL[0],hold=false,open=false;
  const kTrack=()=>{if(TRACKS[S.sel].mel)kt=S.sel;else if(!TRACKS[kt]||!TRACKS[kt].mel)kt=typeof synT==='number'&&TRACKS[synT].mel?synT:MEL[0];return kt};
  const oct=()=>{const id=TRACKS[kTrack()].id,o=K().oct[id];return o==null?DEF_OCT[id]??3:o};
  const nm=n=>NN[n%12]+(Math.floor(n/12)-1),SPC=[9,11,0,2,4,5,7],inScale=n=>SPC.includes(((n%12)+12)%12),isRoot=n=>((n%12)+12)%12===9;
  const MONO=['acid','sub','sh101','mini','grime'],isMono=()=>MONO.includes(S.inst[TRACKS[kTrack()].id]||'analog');
  /* ---------------- chord theory ---------------- */
  const Q={'':[0,4,7],m:[0,3,7],dim:[0,3,6],aug:[0,4,8],sus2:[0,2,7],sus4:[0,5,7],sus:[0,5,7],'6':[0,4,7,9],m6:[0,3,7,9],'69':[0,4,7,9,14],'7':[0,4,7,10],maj7:[0,4,7,11],m7:[0,3,7,10],
    m7b5:[0,3,6,10],dim7:[0,3,6,9],mmaj7:[0,3,7,11],add9:[0,4,7,14],madd9:[0,3,7,14],'9':[0,4,7,10,14],maj9:[0,4,7,11,14],m9:[0,3,7,10,14],'11':[0,7,10,14,17],m11:[0,3,7,10,14,17],
    '13':[0,4,10,14,21],'maj7#11':[0,4,7,11,18],'maj9#11':[0,4,11,14,18],'7#9':[0,4,7,10,15],'7b9':[0,4,7,10,13],'7sus4':[0,5,7,10],'9sus4':[0,5,7,10,14]};
  const PCN={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  function parse(sym){const m=/^([A-G])([#b]?)(.*?)(?:\/([A-G])([#b]?))?$/.exec(sym);if(!m)return null;const r=(PCN[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0)+12)%12;
    const iv=Q[m[3]]||Q[''];const bass=m[4]?(PCN[m[4]]+(m[5]==='#'?1:m[5]==='b'?-1:0)+12)%12:null;return {r,iv:iv.slice(),bass,name:sym}}
  const NAMES={'0,4,7':'','0,3,7':'m','0,3,6':'°','0,4,8':'+','0,2,7':'sus2','0,5,7':'sus4','0,4,7,10':'7','0,4,7,11':'maj7','0,3,7,10':'m7','0,3,6,10':'ø','0,3,6,9':'°7','0,4,7,9':'6','0,3,7,9':'m6',
    '0,2,4,7':'add9','0,2,3,7':'madd9','0,2,4,7,10':'9','0,2,4,7,11':'maj9','0,2,3,7,10':'m9','0,5,7,10':'7sus4','0,2,3,5,7,10':'m11','0,3,7,11':'mMaj7','0,4,10':'7','0,3,10':'m7','0,4,11':'maj7',
    '0,2,4,10':'9','0,2,3,10':'m9','0,2,4,11':'maj9','0,2,4,7,9':'6/9','0,4,6,7,11':'maj7#11','0,1,4,7,10':'7b9','0,3,4,7,10':'7#9','0,2,5,7':'sus2/4','0,2,3,6,10':'m9b5','0,2,6,10':'9b5','0,4,7,10,9':'13'};
  const PN=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
  function nameOf(notes){if(!notes.length)return '–';const ns=[...notes].sort((a,b)=>a-b),bass=((ns[0]%12)+12)%12,pcs=[...new Set(ns.map(n=>((n%12)+12)%12))];if(pcs.length===1)return PN[pcs[0]];
    if(pcs.length===2){const d=(pcs[1]-pcs[0]+12)%12;return PN[bass]+(d===7||d===5?'5':'')+(d!==7&&d!==5?' ('+pcs.length+')':'')}
    const order=[bass,...pcs.filter(p=>p!==bass)];for(const r of order){const k=pcs.map(p=>(p-r+12)%12).sort((a,b)=>a-b).join(',');if(k in NAMES)return PN[r]+NAMES[k]+(r!==bass?'/'+PN[bass]:'')}
    return PN[bass]+' ('+pcs.length+')'}
  const BANKS=window.__kbBanks=[
    ['first print',['Am9','Fmaj7','Cadd9','G6','Dm9','Em7','Am7','Fmaj9','C/E','Gsus4','Dm7','E7sus4','Am','Fadd9','Cmaj7','G','Dm','Esus4','Am11','F69','Cmaj9','G/B','Dm11','E7']],
    ['nattklubb',['Am7','Dm7','Em7','Fmaj7','Am9','Dm9','Em9','Fmaj9','Am11','Dm11','Gsus2','Cmaj7','Am','Dm','Em','F','G','C','Gm7','Bbmaj7','Am7/G','Fmaj7#11','Esus4','E7']],
    ['neo soul',['Am11','Dm9','G13','Cmaj9','Fmaj7#11','E7#9','Bm7b5','E7b9','Am9','D9','Dm7','G9','Cmaj7','Fmaj9','Em9','A7b9','Dm11','G7sus4','Ebmaj7','Abmaj7','Fm9','Bb13','Em7','A13']],
    ['drömpop',['Fmaj7','Cadd9','Am7','Gsus2','Dm9','Em7','Fmaj9#11','Cmaj7','Am9','G6','Dsus2','Esus4','Fadd9','C/G','Amadd9','Gadd9','Dm7','Emadd9','Bbmaj7','Fmaj7/A','C6','Gmaj7','Dm6','Esus2']],
    ['mörker',['Am','F','Dm','E','Ammaj7','Dm6','E7b9','Bdim','Fm','Gm','Bb','C','Am7','Fmaj7','Dm9','E7#9','Cm','Ab','Eb','Bbm','Am/C','F/A','Bdim7','Esus4']],
    ['lofi',['Dm9','G13','Cmaj9','Am9','Fmaj9','E7#9','Em7','A7b9','Dm7','G9','Cmaj7','Am7','Bbmaj7','A7sus4','Dm11','Gm9','C9','Fmaj7','Em9','Ebmaj9','Am11','D9','Gm7','C7b9']]];
  /* diatonic chord on a root key (A minor), borrowed major for keys outside the scale */
  function diatonic(root){const pc=((root%12)+12)%12,d=SPC.indexOf(pc),sev=K().ch.sev;if(d<0)return {notes:sev?[root,root+4,root+7,root+10]:[root,root+4,root+7]};
    const out=[root];for(let k=1;k<(sev?4:3);k++){const dd=d+2*k,pc2=SPC[dd%7];let n=root+((pc2-pc+12)%12);if(dd>=7&&n<=out[out.length-1])n+=12;while(n<=out[out.length-1])n+=12;out.push(n)}return {notes:out}}
  function fromSym(sym,base){const c=parse(sym);if(!c)return {notes:[base],name:sym};let r=c.r+12*Math.floor(base/12);if(r>base+5)r-=12;if(r<base-6)r+=12;
    let iv=c.iv;if(K().ch.sev&&!iv.some(x=>x%12===10||x%12===11||x%12===9)){const minor=iv.includes(3)&&!iv.includes(4);iv=iv.concat(minor||iv.includes(5)?10:(iv.includes(6)?9:11))}
    const notes=iv.map(x=>r+x);if(c.bass!=null){let b=c.bass+12*Math.floor((r-12)/12);while(b>=notes[0])b-=12;while(b<notes[0]-12)b+=12;notes.unshift(b)}return {notes,name:sym}}
  function voice(ch){const C=K().ch;let ns=[...ch.notes].sort((a,b)=>a-b);for(let k=0;k<C.inv;k++){const lo=ns.shift();ns.push(lo+12);ns.sort((a,b)=>a-b)}
    ns=ns.map(n=>n+12*C.oct);while(ns[0]<24)ns=ns.map(n=>n+12);while(ns[ns.length-1]>96)ns=ns.map(n=>n-12);return ns.filter(n=>n>=24&&n<=96)}
  /* ---------------- sound ---------------- */
  const vc=new Map();/* note -> {ng,t,i,c} with ref count c */
  function voiceStart(n,v,t,len){const i=kTrack(),tr=TRACKS[i],ng=ctx.createGain();ng.connect(A.ch[i].inp||A.ch[i].g);VOIC1=K().ch.on||single;
    try{VOICE[tr.id](t,v,S.params[tr.id],ng,null,n,len)}catch(e){console.warn(e)}finally{VOIC1=false}if(!isMuted(i))hitT.set(i,{t,v});return {ng,t,i}}
  let single=false;
  function on(n,v,dt){initAudio();ctx.resume();if(n<24||n>96)return;const ex=vc.get(n);if(ex){ex.c++;return}const t=ctx.currentTime+.004+(dt||0);
    const o=voiceStart(n,v,t,(S.inst[TRACKS[kTrack()].id]==='msx')?60:60/S.bpm/4*24);o.c=1;vc.set(n,o);mark(n,true);recOn(o.i,n,v,t)}
  function relTime(i){if(window.KEYSX){const r=KEYSX.rel(i);if(r!=null)return r}const e=S.inst[TRACKS[i].id]||'analog';if(e==='bris')return Math.min(3,brT(engE('bris').aR,10));return e==='super'?.35:e==='pluck'||e==='chip'?.05:.12}
  function off(n,force){const o=vc.get(n);if(!o)return;if(!force&&--o.c>0)return;vc.delete(n);mark(n,false);const now=ctx.currentTime,rel=relTime(o.i),at=Math.max(now,o.t);
    o.ng.gain.cancelAndHoldAtTime(at);o.ng.gain.setValueAtTime(o.ng.gain.value||1,at);o.ng.gain.setTargetAtTime(0,at,rel/3);setTimeout(()=>{try{o.ng.disconnect()}catch(x){globalThis.__el&&globalThis.__el(x)}},(rel*4+.4+(at-now))*1000);recOff(n)}
  function blip(n,v,t,lenS){const o=voiceStart(n,v,t,lenS);const end=t+lenS,rel=relTime(o.i);o.ng.gain.setValueAtTime(1,end);o.ng.gain.setTargetAtTime(0,end,rel/3);
    setTimeout(()=>{try{o.ng.disconnect()}catch(x){globalThis.__el&&globalThis.__el(x)}},(end-ctx.currentTime+rel*4+.4)*1000);if(recording&&playing)recNote(o.i,n,v,t,1);
    const d=keyEls.get(n);if(d){setTimeout(()=>d.classList.add('dn'),Math.max(0,(t-ctx.currentTime)*1000));setTimeout(()=>d.classList.remove('dn'),Math.max(0,(end-ctx.currentTime)*1000))}}
  /* ---------------- recording ---------------- */
  const recs=new Map();
  function recNote(i,n,v,t,l){const sd=stepDur(),L=trkLen(i),pos=(t-startT)/sd,s=((Math.round(pos)%L)+L)%L,R=S.roll[S.pat][TRACKS[i].id];
    for(let k=R.length-1;k>=0;k--)if(Math.floor(R[k].s+1e-6)===s&&R[k].n===n)R.splice(k,1);const note={s,l,n,v:v>=.95?1:Math.max(.3,v)};R.push(note);syncCells(S.pat,i);renderCells();save();return note}
  let recHist=0;
  function recOn(i,n,v,t){if(!(recording&&playing))return;if(performance.now()-recHist>300)pushHist();recHist=performance.now();recs.set(n,{note:recNote(i,n,v,t,1),t,i})}
  function recOff(n){const r=recs.get(n);if(!r)return;recs.delete(n);const l=Math.max(1,Math.min(16,Math.round((ctx.currentTime-r.t)/stepDur())));if(l!==r.note.l){r.note.l=l;syncCells(S.pat,r.i);renderCells();save()}}
  /* ---------------- chord state, strum, arp ---------------- */
  let cur=null;const held=new Map();/* id -> {notes:[...], chord:bool} */const latched=new Set();
  function nowShow(notes,name,scale){try{window.dispatchEvent(new CustomEvent('blonda-kbchord',{detail:{notes:notes.slice(),name:name||nameOf(notes)}}))}catch(e){globalThis.__el&&globalThis.__el(e)}cur={notes,name:name||nameOf(notes),pcs:new Set(notes.map(n=>((n%12)+12)%12)),scale:scale||null};paintNow();if(K().ch.mode==='split'&&scale)keyEls.forEach((d,n)=>d.classList.toggle('isc',scale.has(((n%12)+12)%12)))}
  function order(ns){const d=K().ch.dir;ns=[...ns].sort((a,b)=>a-b);if(d==='ner')return ns.reverse();if(d==='slump')return ns.sort(()=>Math.random()-.5);return ns}
  function playChord(id,ch,v){let ns=voice(ch);if(isMono()&&K().ch.arp==='av')ns=[ns[0]];nowShow(ns,ch.name,ch.scale);
    if(K().ch.arp!=='av'){held.set(id,{notes:ns,chord:true});arpKick();return}
    const st=K().ch.strum/1000,ord=order(ns);held.set(id,{notes:ord,chord:true});ord.forEach((n,k)=>on(n,v*(k?.92:1),k*st))}
  const ARPD={'1/8':2,'1/16':1,'1/32':.5,'1/16T':2/3};let arpT=0,arpNext=0,arpIx=0,arpUp=true;
  function arpNotes(){const all=[];held.forEach(h=>{if(h.chord)all.push(...h.notes)});latched.forEach(id=>{});const u=[...new Set(all)].sort((a,b)=>a-b);return u}
  function arpKick(){if(arpT)return;initAudio();const sd=stepDur()*(ARPD[K().ch.arp]||1),now=ctx.currentTime+.01;
    arpNext=playing?startT+Math.ceil((now-startT)/sd)*sd:now;arpIx=0;arpUp=true;arpT=setInterval(arpTick,20);arpTick()}
  function arpTick(){const ns=arpNotes();if(!ns.length||K().ch.arp==='av'){clearInterval(arpT);arpT=0;return}const sd=stepDur()*(ARPD[K().ch.arp]||1),d=K().ch.dir;
    while(arpNext<ctx.currentTime+.1){let n;if(d==='ner')n=ns[ns.length-1-(arpIx%ns.length)];else if(d==='slump')n=ns[Math.floor(Math.random()*ns.length)];
      else if(d==='upp-ner'){const L=ns.length,per=Math.max(1,2*L-2),k=arpIx%per;n=ns[k<L?k:per-k]}else n=ns[arpIx%ns.length];
      blip(n,.82,arpNext,sd*.82);arpIx++;arpNext+=sd}}
  function snap(n){const f=K().ch.fol,split=K().ch.mode==='split';if(f==='av'&&!split)return n;const pc=x=>((x%12)+12)%12;
    const ok=f==='ackord'&&cur?(x=>cur.pcs.has(pc(x))):(split&&cur&&cur.scale)?(x=>cur.scale.has(pc(x))):inScale;for(let d=0;d<12;d++){if(ok(n-d))return n-d;if(ok(n+d))return n+d}return n}
  /* ---------------- press / release (any source: pointer, keys, MIDI) ---------------- */
  function chordFor(el){const kind=el.dataset.k,n=+el.dataset.n;if(kind==='c')return Object.assign(diatonic(n),{name:null});
    if(kind==='m'||kind==='M'){const mi=kind==='m',sev=K().ch.sev,pc=((n%12)+12)%12,iv=mi?[0,3,7]:[0,4,7];if(sev)iv.push(mi?10:11);
      return {notes:iv.map(x=>n+x),name:PN[pc]+(mi?'m':'')+(sev?(mi?'7':'maj7'):''),scale:new Set((mi?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11]).map(x=>(pc+x)%12))}}
    if(kind==='p'){const C=K().ch,slot=+el.dataset.s;if(C.mode==='egen'){const o=K().own[slot];return o&&o.length?{notes:o.slice(),name:nameOf(o)}:null}return fromSym(BANKS[C.bank][1][slot],48)}return null}
  function press(id,el,v){if(!el)return;if(learn){learnTap(el);return}const kind=el.dataset.k;if(editOwn&&kind==='p'&&K().ch.mode==='egen'){editOwn=false;startLearn(+el.dataset.s);return}
    if(hold&&![...held.keys()].some(k=>k!==id&&!latched.has(k))){latched.forEach(k=>dropHeld(k));latched.clear()}
    if(kind==='n'){let n=+el.dataset.n;if(K().ch.on&&K().ch.mode==='split')n=snap(n);single=true;on(n,v);single=false;held.set(id,{notes:[n],chord:false});if(!K().ch.on)nowShowQuiet(n);}
    else{const ch=chordFor(el);if(!ch){if(K().ch.mode==='egen'&&kind==='p')startLearn(+el.dataset.s);return}playChord(id,ch,v)}
    el.classList.add('dn');pressedEl.set(id,el);if(hold)latched.add(id)}
  function nowShowQuiet(n){if(K().ch.on)return}
  const pressedEl=new Map();
  function dropHeld(id){const h=held.get(id);if(!h)return;held.delete(id);if(!(K().ch.arp!=='av'&&h.chord))h.notes.forEach(n=>off(n));const el=pressedEl.get(id);if(el)el.classList.remove('dn');pressedEl.delete(id)}
  function release(id){if(!held.has(id))return;if(latched.has(id))return;dropHeld(id)}
  function allOff(){[...held.keys()].forEach(dropHeld);latched.clear();[...vc.keys()].forEach(n=>off(n,true));if(arpT){clearInterval(arpT);arpT=0}}
  /* ---------------- learn (egen) ---------------- */
  let learn=null,editOwn=false;
  function startLearn(slot){allOff();learn={slot,notes:new Set(K().own[slot]||[])};layout();paintCtl()}
  function learnTap(el){if(el.dataset.k==='p')return;const n=+el.dataset.n;if(learn.notes.has(n))learn.notes.delete(n);else{learn.notes.add(n);single=true;blip(n,.8,ctx.currentTime+.005,.35);single=false}paintLearn()}
  function learnMidi(n){if(!learn)return false;learn.notes.add(n);paintLearn();return true}
  function paintLearn(){keyEls.forEach((d,n)=>d.classList.toggle('ct',!!learn&&learn.notes.has(n)));const l=$('#kcLearnTxt');if(l)l.textContent=learn.notes.size?nameOf([...learn.notes])+' · '+[...learn.notes].sort((a,b)=>a-b).map(x=>nm(x).toLowerCase()).join(' '):'tryck toner'}
  /* ---------------- drawing ---------------- */
  let keyEls=new Map();
  function pcDots(notes,root){const set=new Set(notes.map(n=>((n%12)+12)%12));let h='<span class="pc">';for(let p=0;p<12;p++)h+=`<i class="${set.has(p)?(p===root?'on rt':'on'):''}"></i>`;return h+'</span>'}
  function layout(){if(!open)return;const i=kTrack(),col=trkCol(i),w=keysEl.clientWidth,k=K(),C=k.ch,sc=!!k.scale,chOn=!!C.on&&!learn;kb.classList.toggle('sc',sc&&!(chOn&&(C.mode==='palett'||C.mode==='egen')));kb.style.setProperty('--kc',col);kb.classList.toggle('own-edit',!!editOwn&&chOn&&C.mode==='egen');
    keysEl.innerHTML='';keyEls=new Map();keysEl.style.height='';const base=12*(oct()+1);
    const mk=(cls,x,wd,html,ds)=>{const d=document.createElement('div');d.className=cls;d.style.left=x+'px';d.style.width=wd+'px';Object.assign(d.dataset,ds);d.innerHTML=html;keysEl.appendChild(d);return d};
    if(chOn&&(C.mode==='palett'||C.mode==='egen')){const cols=w<520?6:12,rows=Math.ceil(24/cols),gap=5,pw=(w-gap*(cols-1))/cols;if(w<520)keysEl.style.height=(rows*46+gap*(rows-1))+'px';const H=keysEl.clientHeight||150,ph=(H-gap*(rows-1))/rows;
      for(let s2=0;s2<24;s2++){const x=(s2%cols)*(pw+gap),y=Math.floor(s2/cols)*(ph+gap);let d;
        if(C.mode==='egen'){const o=k.own[s2];d=o&&o.length?mk('cp',x,pw,`<small>${s2+1}</small><b>${nameOf(o)}</b>${pcDots(o,((Math.min(...o)%12)+12)%12)}`,{k:'p',s:s2}):mk('cp empty',x,pw,'+',{k:'p',s:s2})}
        else{const sym=BANKS[C.bank][1][s2],c=parse(sym);d=mk('cp',x,pw,`<small>${s2+1}</small><b>${sym}</b>${pcDots(c.iv.map(v=>c.r+v),c.r)}`,{k:'p',s:s2})}
        d.style.top=y+'px';d.style.height=ph+'px'}
      return finish()}
    if(chOn&&C.mode==='split'){const inline=w>=900,WH=[0,2,4,5,7,9,11],gapZ=10;
      const octave=(x0,ow,top,h,kind,root)=>{const kw=ow/7;let wx=0;const cap=document.createElement('div');cap.className='kz-cap';cap.textContent=kind==='m'?'moll':'dur';cap.style.left=x0+'px';cap.style.top=top+'px';keysEl.appendChild(cap);top+=15;h-=15;
        for(let pc=0;pc<12;pc++){const n=root+pc,white=WH.includes(pc),lab=`<span class="cl">${PN[pc]}${kind==='m'?'m':''}</span>`;let d;
          if(white){d=mk('kk cz '+(kind==='m'?'mi':'ma'),x0+wx+1,kw-2,lab,{k:kind,n});wx+=kw}else{d=mk('kk bk cz '+(kind==='m'?'mi':'ma'),x0+wx-kw*.31,kw*.62,lab,{k:kind,n})}
          d.style.top=top+'px';d.style.bottom='auto';d.style.height=(white?h:h*.6)+'px'}};
      const melody=(x0,mw,top,h,start)=>{const whites=Math.max(5,Math.floor(mw/(w<520?36:44))),kw=mw/whites;let n=start,x=0,wc=0;
        while(wc<whites){const pc=n%12,white=WH.includes(pc);let d;const lab=pc===0?`<span>${nm(n)}</span>`:'';
          if(white){d=mk('kk'+(isRoot(n)?' rt':''),x0+x+1,kw-2,lab,{k:'n',n});x+=kw;wc++}else d=mk('kk bk',x0+x-kw*.31,kw*.62,'',{k:'n',n});
          d.style.top=top+'px';d.style.bottom='auto';d.style.height=(white?h:h*.6)+'px';keyEls.set(n,d);n++}};
      if(inline){const H=keysEl.clientHeight||184,ow=Math.min(320,(w-2*gapZ)/4.2);octave(0,ow,0,H,'m',base);octave(ow+gapZ,ow,0,H,'M',base);melody(2*ow+2*gapZ,w-2*ow-2*gapZ,0,H,base+12)}
      else{const H=w<520?236:264;keysEl.style.height=H+'px';const ch=Math.round(H*.42),half=(w-gapZ)/2;octave(0,half,0,ch,'m',base);octave(half+gapZ,half,0,ch,'M',base);melody(0,w,ch+8,H-ch-8,base+12)}
      return finish()}
    const zone=(idx,total)=>!chOn?'n':C.mode==='noter'?'c':'n';
    if(sc){const EXT=[];for(let n=24;n<=96;n++)if(inScale(n))EXT.push(n);const cnt=Math.max(7,Math.min(22,Math.floor(w/52))),gap=5,kw=(w-gap*(cnt-1))/cnt;
      let start=EXT.findIndex(x=>x>=base);start=Math.max(0,Math.min(start,EXT.length-cnt));const list=EXT.slice(start,start+cnt);
      list.forEach((n,j)=>{const z=zone(j,list.length),lab=z==='c'?nameOf(diatonic(n).notes):(isRoot(n)?nm(n):NN[n%12]);
        const d=mk('kk'+(isRoot(n)?' rt':'')+(z==='c'?' cz':''),j*(kw+gap),kw,`<span class="dm">${'<i></i>'.repeat(9)}</span><span>${lab}</span>`,{k:z,n});keyEls.set(n,d)})}
    else{const whites=Math.max(7,Math.min(36,Math.floor(w/(w<520?40:46)))),kw=w/whites,WH=[0,2,4,5,7,9,11];let n=base,x=0,wc=0;const all=[];
      while(wc<whites){const pc=n%12;if(WH.includes(pc)){all.push({n,x,white:true});x+=kw;wc++}else all.push({n,x,white:false});n++}
      const total=all.length;all.forEach((o,j)=>{const z=zone(j,total),lab=z==='c'?`<span class="cl">${nameOf(diatonic(o.n).notes)}</span>`:(o.n%12===0?`<span>${nm(o.n)}</span>`:'');
        const cls='kk'+(o.white?'':' bk')+(isRoot(o.n)?' rt':'')+(z==='c'?' cz':'');
        const d=o.white?mk(cls,o.x+1,kw-2,(isRoot(o.n)?'<i class="sd"></i>':'')+lab,{k:z,n:o.n}):mk(cls,o.x-kw*.31,kw*.62,(isRoot(o.n)?'<i class="sd"></i>':'')+lab,{k:z,n:o.n});keyEls.set(o.n,d)})}
    return finish();
    function finish(){document.documentElement.style.setProperty('--kbb',Math.max(0,innerHeight-kb.getBoundingClientRect().top)+'px');vc.forEach((_,n)=>mark(n,true));if(learn)paintLearn();$('#kbOct').textContent='C'+oct();
      [...$('#kbTrk').children].forEach(b=>{const j=+b.dataset.i;b.classList.toggle('on',j===i);b.style.setProperty('--c',trkCol(j));b.lastChild.textContent=TRACKS[j].name.toLowerCase()});
      $('#kbScale').classList.toggle('on',sc);$('#kbHold').classList.toggle('on',hold);$('#kbChord').classList.toggle('on',!!C.on);kc.hidden=!C.on}}
  function mark(n,v){const d=keyEls.get(n);if(!d)return;if(K().ch.on){if(d.dataset.k!=='p')d.classList.toggle('ct',v)}else if(d.dataset.k==='n')d.classList.toggle('dn',v)}
  /* ---------------- chord panel ---------------- */
  const DIAL_ORDER=[0,7,2,9,4,11,6,1,8,3,10,5];
  const PARAMS=[['strum','strum',[0,10,20,35,60,90,120],v=>v+' ms'],['inv','omvänd',[0,1,2,3],v=>String(v)],['oct','oktav',[-2,-1,0,1,2],v=>(v>0?'+':'')+v],['sev','7:a',[0,1],v=>v?'på':'av'],
    ['dir','riktning',['upp','ner','upp-ner','slump'],v=>v],['arp','arp',['av','1/8','1/16','1/32','1/16T'],v=>v],['fol','melodi följer',['av','ackord','skala'],v=>v]];
  function paintCtl(){const C=K().ch;if(!C.on||C.mode!=='egen')editOwn=false;if(!C.on){kc.hidden=true;return}kc.hidden=false;
    let dial='<div class="kc-dial" id="kcDial"><span>c</span>';DIAL_ORDER.forEach((pc,j)=>{const a=j/12*6.2832-1.5708;dial+=`<i data-pc="${pc}" style="left:${50+Math.cos(a)*40}%;top:${50+Math.sin(a)*40}%"></i>`});dial+='</div>';
    let h=`<div class="kc-now"><div><small>spelas nu</small><b id="kcName">–</b><em id="kcNotes">välj ett ackord</em></div>${dial}</div><div class="kc-ctl">`;
    if(learn){h+=`<div class="kc-learn"><span>lär ${learn.slot+1} · <span id="kcLearnTxt"></span></span><button class="go" id="kcSave">spara</button><button id="kcClr">töm</button><button id="kcCancel">avbryt</button></div>`}
    else{h+='<div class="kc-seg" id="kcMode">'+['noter','palett','split','egen'].map(m=>`<button data-m="${m}" class="${C.mode===m?'on':''}">${m}</button>`).join('')+'</div>';
      if(C.mode==='palett')h+=`<div class="kc-bank"><button id="kcPrev" aria-label="Föregående bank">‹</button><b><i>${C.bank+1}</i>${BANKS[C.bank][0]}</b><button id="kcNext" aria-label="Nästa bank">›</button></div>`;
      if(C.mode==='egen')h+=`<div class="kc-bank"><b><i>✎</i>${editOwn?'tap a chord to edit it':'tryck + för att lära'}</b><button class="kc-ed${editOwn?' on':''}" id="kcEdit" title="Edit a saved chord">${editOwn?'done':'edit'}</button></div>`;
      PARAMS.forEach(([k,l,vals,f])=>{h+=`<div class="kc-p${(k==='arp'&&C.arp!=='av')||(k==='fol'&&C.fol!=='av')||(k==='sev'&&C.sev)?' hot':''}" data-p="${k}" title="Tryck eller dra i sidled"><small>${l}</small><b>${f(C[k])}</b></div>`})}
    kc.innerHTML=h+'</div>';paintNow();{const eb=document.getElementById('kcEdit');if(eb)eb.onclick=()=>{editOwn=!editOwn;layout();paintCtl()}}
    if(learn){paintLearn();$('#kcSave').onclick=()=>{const ns=[...learn.notes].sort((a,b)=>a-b);K().own[learn.slot]=ns.length?ns:null;learn=null;save();layout();paintCtl();if(ns.length)toast('Sparat · '+nameOf(ns))};
      $('#kcClr').onclick=()=>{learn.notes.clear();paintLearn()};$('#kcCancel').onclick=()=>{learn=null;layout();paintCtl()};return}
    kc.querySelectorAll('#kcMode button').forEach(b=>b.onclick=()=>{allOff();C.mode=b.dataset.m;S.kb.ch=C;save();layout();paintCtl()});
    const pv=$('#kcPrev'),nx=$('#kcNext');if(pv){pv.onclick=()=>{allOff();C.bank=(C.bank+BANKS.length-1)%BANKS.length;S.kb.ch=C;save();layout();paintCtl()};nx.onclick=()=>{allOff();C.bank=(C.bank+1)%BANKS.length;S.kb.ch=C;save();layout();paintCtl()}}
    kc.querySelectorAll('.kc-p').forEach(el=>{const k=el.dataset.p,[,,vals]=PARAMS.find(p=>p[0]===k);let x0=null,i0=0,mv=false;
      const setI=ix=>{ix=clamp(ix,0,vals.length-1);if(vals[ix]===C[k])return;C[k]=vals[ix];S.kb.ch=C;save();if(k==='arp'){if(C.arp==='av'){if(arpT){clearInterval(arpT);arpT=0}}}if(k==='sev'||k==='oct'||k==='inv')layout();
        const f=PARAMS.find(p=>p[0]===k)[3];el.querySelector('b').textContent=f(C[k]);el.classList.toggle('hot',(k==='arp'&&C.arp!=='av')||(k==='fol'&&C.fol!=='av')||(k==='sev'&&!!C.sev))};
      el.addEventListener('pointerdown',e=>{x0=e.clientX;i0=vals.indexOf(C[k]);mv=false;el.setPointerCapture(e.pointerId)});
      el.addEventListener('pointermove',e=>{if(x0==null)return;const d=Math.round((e.clientX-x0)/22);if(d){mv=true;setI(i0+d)}});
      el.addEventListener('pointerup',()=>{if(x0!=null&&!mv)setI((vals.indexOf(C[k])+1)%vals.length);x0=null});el.addEventListener('pointercancel',()=>{x0=null})})}
  function paintNow(){const nb=$('#kcName');if(!nb)return;if(!cur){nb.textContent='–';return}nb.textContent=cur.name;$('#kcNotes').textContent=[...cur.notes].sort((a,b)=>a-b).map(n=>nm(n).toLowerCase()).join(' ');
    const root=cur.notes.length?((Math.min(...cur.notes)%12)+12)%12:-1;const pr=parse(cur.name);const rr=pr?pr.r:root;kc.querySelectorAll('#kcDial i').forEach(i=>{const pc=+i.dataset.pc;i.classList.toggle('on',cur.pcs.has(pc));i.classList.toggle('rt',pc===rr)})}
  MEL.forEach(j=>{const b=document.createElement('button');b.dataset.i=j;b.innerHTML='<i></i><span></span>';b.onclick=()=>{allOff();kt=j;if(S.sel!==j)select(j);layout()};$('#kbTrk').appendChild(b)});
  /* ---------------- pointer ---------------- */
  const keyAt=(x,y)=>{const el=document.elementFromPoint(x,y),k=el&&el.closest('.kk,.cp');return k&&keysEl.contains(k)?k:null};
  const velOf=(k,y)=>{const r=k.getBoundingClientRect();return clamp(.4+.6*(y-r.top)/r.height,.3,1)};
  const pEl=new Map();let lpT=0;
  keysEl.addEventListener('pointerdown',e=>{const k=keyAt(e.clientX,e.clientY);if(!k)return;e.preventDefault();keysEl.setPointerCapture(e.pointerId);pEl.set(e.pointerId,k);press('p'+e.pointerId,k,velOf(k,e.clientY));
    clearTimeout(lpT)});
  keysEl.addEventListener('pointermove',e=>{const id='p'+e.pointerId;if(!pEl.has(e.pointerId)||learn)return;const k=keyAt(e.clientX,e.clientY);if(!k||k===pEl.get(e.pointerId))return;clearTimeout(lpT);
    if(latched.has(id))return;release(id);pEl.set(e.pointerId,k);press(id,k,velOf(k,e.clientY))});
  const pUp=e=>{clearTimeout(lpT);if(!pEl.has(e.pointerId))return;pEl.delete(e.pointerId);release('p'+e.pointerId)};keysEl.addEventListener('pointerup',pUp);keysEl.addEventListener('pointercancel',pUp);keysEl.addEventListener('lostpointercapture',pUp);
  keysEl.addEventListener('contextmenu',e=>e.preventDefault());
  /* ---------------- controls ---------------- */
  function setOpen(v){open=v;kb.hidden=!v;btn.classList.toggle('on',v);document.body.classList.toggle('kb-open',v);if(v){requestAnimationFrame(()=>{layout();paintCtl()})}else{allOff();learn=null;editOwn=false}}
  btn.onclick=()=>{setOpen(!open);if(open)toast('Klaviatur · '+TRACKS[kTrack()].name+(matchMedia('(pointer:fine)').matches?' · tangenterna A–L spelar':''))};$('#kbX').onclick=()=>setOpen(false);
  const shift=d=>{const id=TRACKS[kTrack()].id,o=clamp(oct()+d,1,6);K().oct[id]=o;allOff();layout();save()};$('#kbDn').onclick=()=>shift(-1);$('#kbUp').onclick=()=>shift(1);
  $('#kbScale').onclick=()=>{K().scale=K().scale?0:1;allOff();layout();save()};
  $('#kbChord').onclick=()=>{const C=K().ch;C.on=C.on?0:1;S.kb.ch=C;allOff();learn=null;save();layout();paintCtl();if(C.on)toast('Ackordläge · '+C.mode+' · en tangent ger ett ackord')};
  $('#kbHold').onclick=()=>{hold=!hold;if(!hold){latched.forEach(k=>{if(![...pEl.values()].length||true)dropHeld(k)});latched.clear()}layout()};
  new ResizeObserver(()=>layout()).observe(keysEl);
  let lastSig='';setInterval(()=>{if(!open)return;const sig=kTrack()+'|'+trkCol(kt)+'|'+TRACKS[kt].name;if(sig!==lastSig){lastSig=sig;layout()}},250);
  /* ---------------- computer keyboard ---------------- */
  const MAP='awsedftgyhujkolp;\'';
  const elForIx=ix=>{const C=K().ch;if(C.on&&(C.mode==='palett'||C.mode==='egen'))return keysEl.querySelector(`.cp[data-s="${ix}"]`);if(C.on&&C.mode==='split')return keyEls.get(12*(oct()+2)+ix);if(K().scale)return [...keyEls.values()][ix];return keyEls.get(12*(oct()+1)+ix)};
  document.addEventListener('keydown',e=>{if(!open||e.metaKey||e.ctrlKey||e.altKey)return;const tg=e.target;if(tg&&(tg.tagName==='INPUT'||tg.tagName==='TEXTAREA'||tg.tagName==='SELECT'||tg.isContentEditable))return;
    const c=e.key.toLowerCase();if(c==='z'||c==='x'){shift(c==='z'?-1:1);e.preventDefault();return}const ix=MAP.indexOf(c);if(ix<0)return;e.preventDefault();if(e.repeat)return;const el=elForIx(ix);if(el)press('k'+c,el,.82)});
  document.addEventListener('keyup',e=>{const c=e.key.toLowerCase();if(MAP.includes(c))release('k'+c)});
  document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='k'&&!e.metaKey&&!e.ctrlKey&&!open){const tg=e.target;if(tg&&(tg.tagName==='INPUT'||tg.tagName==='TEXTAREA'||tg.tagName==='SELECT'))return;btn.click()}},true);
  addEventListener('blur',()=>{if(!hold)allOff()});
  /* ---------------- MIDI notes in (from the MIDI module) ---------------- */
  function midiNote(n,v,isOn){const id='m'+n;if(!isOn){release(id);return}if(learnMidi(n))return;const C=K().ch;
    if(C.on&&(C.mode==='palett'||C.mode==='egen')){const slot=n-48;if(slot>=0&&slot<24){let el=open&&keysEl.querySelector(`.cp[data-s="${slot}"]`);if(!el){el=document.createElement('div');el.dataset.k='p';el.dataset.s=slot}press(id,el,v)}return}
    if(C.on&&C.mode==='noter'){const el=document.createElement('div');el.dataset.k='c';el.dataset.n=n;press(id,el,v);return}
    if(C.on&&C.mode==='split'&&n<60){const el=document.createElement('div');el.dataset.k=n<48?'m':'M';el.dataset.n=n<48?n:n-12;press(id,el,v);return}
    const el=document.createElement('div');el.dataset.k='n';el.dataset.n=n;press(id,el,v)}
  function sustain(onv){if(onv!==hold)$('#kbHold').click()}
  window.__kb={touching:()=>pEl.size>0,open:()=>setOpen(true),close:()=>setOpen(false),press,release,voices:vc,layout,isOpen:()=>open,midiNote,sustain,BANKS,nameOf,diatonic,fromSym,voice,cur:()=>cur,allOff};
  $('#kbMidi').onclick=()=>window.MIDIX&&MIDIX.panel();
})();
