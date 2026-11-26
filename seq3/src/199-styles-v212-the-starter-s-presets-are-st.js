/* ---------- styles (v212): the Starter's presets are styles, not fixed presets. Choosing one makes a new idea in that
   style each time: its kind of chords, rhythm, top line, sounds, knobs and drums – in a new key, with new variations.
   "alla stilar" picks a style for every idea; "fri slump" is the old free dice. ---------- */
const PDR={'mulet':'house','mulet natt':'house','håll om mig':'hiphop','sällskap':'house','sakta':'house','moln':'trap','spring':'hiphop','lämna':'trap','burk':'trap',
  'efterlyst':'lofi','inte nog':'house','grime':'brk','grime dyk':'drill','hotellrum':'house','jupiter':'lofi','imorgon':'electro','introspektion':'trap','ny':'hiphop',
  'annorlunda':'hiphop','berghain':'techno','miami':'disco','neon':'synthwave','tvåsteg':'garage','solnedgång':'afro','regn':'lofi','london':'drill','flytande':'dnb',
  'pianohus':'house','syra':'techno','stjärnor':'trap','fanfar':'hiphop'};
/* the styles before 'berghain' are the original ones, built from Komorebi "Reconnecting" (Hanz x Sem0r) */
const styCoreN=()=>{const i=STX_PRE.findIndex(r=>r.nm==='berghain');return i>0?i:STX_PRE.length},styCore=R0=>!!R0&&STX_PRE.indexOf(R0)>=0&&STX_PRE.indexOf(R0)<styCoreN();
const SC7={dur:[0,2,4,5,7,9,11],moll:[0,2,3,5,7,8,10]};
const REAL={keys:['dx-piano','rhodes','flygel'],juno:['dx-piano','rhodes','korn'],stack:['dx-piano','rhodes','flygel','gitarr'],mjuk:['rhodes','dx-piano'],mallet:['dx-mallet','marimba','vibrafon','kalimba'],plock:['gitarr','kalimba','dx-mallet'],glas:['dx-klocka','kalimba','vibrafon'],klocka:['dx-klocka','vibrafon'],'röst':['dx-klocka','vibrafon'],sinus:['fingerbas','dx-bas'],kort:['fingerbas','dx-bas'],moog:['fingerbas','dx-bas'],moln:['korn'],'kör':['korn']};
const FAM=[['juno','keys','stack','mjuk'],['plock','mallet','glas','klocka'],['moln','kör','mjuk'],['sinus','kort','808','moog'],['röst','kör','moln'],['glas','klocka','sinus']];
const sRnd=Math.random,sRi=n=>Math.floor(sRnd()*n),sPk=a=>a[sRi(a.length)];
const sWp=(arr,w)=>{let t=0;arr.forEach(c=>t+=w(c));let x=sRnd()*t;for(const c of arr){x-=w(c);if(x<=0)return c}return arr[0]};
const DUO_PRE_K='blonda.duo.pre2';
DUO.pre=(()=>{try{const v=localStorage.getItem(DUO_PRE_K);if(!v||v==='all')return 'all';if(v==='fri')return 'fri';const i=STX_PRE.findIndex(r=>r.nm===v);return i>=0?i:'all'}catch(e){return 'all'}})();
function preSave(){try{localStorage.setItem(DUO_PRE_K,typeof DUO.pre==='number'?STX_PRE[DUO.pre].nm:DUO.pre)}catch(e){globalThis.__el&&globalThis.__el(e)}}
const preName=v=>v==='all'?'alla stilar':v==='fri'?'fri slump':(STX_PRE[v]?STX_PRE[v].nm:'alla stilar');
/* the style the current idea belongs to (null = free) */
function curSty(){if(typeof DUO.pre==='number')return DUO.pre;if(DUO.pre==='all'&&S.dice&&typeof S.dice.si==='number')return S.dice.si;return null}
/* chords: keep, swap one or two, or a new progression of the same shape, from chords with the style's colours */
function styChords(R0,mode){const ch=R0.ch.map(c=>[+c[0],c[1]]),Q=new Set(R0.ch.map(c=>c[1])),pool=(STX_POOL[mode]||STX_POOL.moll).map(c=>[+c[0],c[1]]);
  const key=c=>c[0]+'|'+c[1],w=c=>Q.has(c[1])?3:1,uniq=[...new Set(ch.map(key))],r=sRnd();
  /* (v277) one style chosen: its own chords come back less often, more ideas get new ones */const lk=typeof DUO.pre==='number';
  if(r<(lk?.1:.3)||uniq.length<2)return ch;
  if(r<(lk?.55:.72)){const n=uniq.length>3&&sRnd()<.5?2:1,used=new Set(uniq);for(let k=0;k<n;k++){const tgt=sPk(uniq.slice(1)),cand=pool.filter(c=>!used.has(key(c)));if(!cand.length)break;const nc=sWp(cand,w);used.add(key(nc));
      ch.forEach((c,j)=>{if(key(c)===tgt)ch[j]=nc.slice()})}return ch}
  const map={},used=new Set();uniq.forEach((u,k)=>{let nc;if(k===0){nc=sRnd()<.5?ch.find(c=>key(c)===u):sWp(pool.filter(c=>c[0]===0),w)}else{const cand=pool.filter(c=>c[0]!==0&&!used.has(key(c)));nc=cand.length?sWp(cand,w):sPk(pool)}used.add(key(nc));map[u]=nc});
  return ch.map(c=>map[key(c)].slice())}
/* rhythm: the same bars in another order (all layers together), the chords nudged now and then */
function styRhythm(P){if(P.pat&&Array.isArray(P.pat.sub)&&Array.isArray(P.pat.ack)&&P.pat.sub.join()===P.pat.ack.join()&&sRnd()<.65){const G=['x-----..x-----..','x-----x-....x---','x-------..x-x---','x.....x...x.....','x---..x---..x-..'];const a=sPk(G),b2=sPk(G);P.pat.sub=[a,a,a,b2]}
  const perms=[[0,1,2,3],[0,1,2,3],[0,1,0,3],[2,1,2,3],[0,1,0,1],[1,1,2,3],[0,0,2,3]],pm=sPk(perms);
  if(P.pat){['ack','sub','luft'].forEach(l=>{const a=P.pat[l];if(Array.isArray(a)&&a.length===4)P.pat[l]=pm.map(i=>a[i])});
    const a=P.pat.ack;if(Array.isArray(a)&&sRnd()<.35)P.pat.ack=a.map(b=>/\.\.$/.test(b)&&!/^-/.test(b)?'..'+b.slice(0,14):b)}
  if(Array.isArray(P.rh)&&P.rh.length===4){P.rh=pm.map(i=>P.rh[i]).map(b=>{let s=b.split('');const n=sRi(3);for(let k=0;k<n;k++){const j=1+sRi(15);s[j]=s[j]==='x'?'.':'x'}return s.join('')})}
  /* (v276) a style's chords kept the style's own rhythm idea after idea (only the bar order moved): in a bit more than half
     of the ideas they now get another feel – held chords, off-beats, 3-3-2, late or syncopated stabs – A A A B over the bars */
  if(P.pat&&Array.isArray(P.pat.ack)&&P.pat.ack.length===4&&sRnd()<(typeof DUO.pre==='number'?.85:.55)){
    const CH=['x-------x-------','x---------------','..x-..x-..x-..x-','x-....x-....x-..','x--x--x---x--x--','...x..x...x..x..','x-----x-----x---','....x-------....','..x.......x.x...','x-------..x-x---','x---..x---..x-..','x.....x...x.....','x-..x-......x-..','......x-......x-'];
    const a=sPk(CH),b=sPk(CH);P.pat.ack=[a,a,a,sRnd()<.5?a:b]}}
/* the top line: the same feel, new notes in the scale (most steps kept, one or two moved, a note added now and then) */
function styKlo(P){const m=P.pat&&P.pat.klo;if(!m||typeof m!=='object'||Array.isArray(m))return;const sc=SC7[P.mode]||SC7.moll,kl=P.pat.kl||{};
  const toD=n=>{const o=Math.floor(n/12),pc=((n%12)+12)%12;let bi=0,bd=99;sc.forEach((v,i)=>{const d=Math.abs(v-pc);if(d<bd){bd=d;bi=i}});return o*7+bi},
    fromD=d=>Math.floor(d/7)*12+sc[((d%7)+7)%7];
  const out={},ol={},keys=Object.keys(m).map(Number).sort((a,b)=>a-b);
  /* (v277) one style chosen: the top line moves more, so idea after idea is not the same tune in a new key */const lk=typeof DUO.pre==='number';
  keys.forEach(pos=>{if(keys.length>4&&sRnd()<(lk?.25:.1))return;let d=toD(m[pos]);if(sRnd()<(lk?.8:.55))d+=sPk(lk?[-3,-2,-1,1,2,3]:[-2,-1,-1,1,1,2]);const n=Math.max(-7,Math.min(24,fromD(d)));out[pos]=n;if(kl[pos])ol[pos]=kl[pos]});
  const add=sRi(lk?5:3);for(let k=0;k<add;k++){const base=sPk(keys),pos=base+sPk([-2,2,4]);if(pos<0||pos>63||out[pos]!=null)continue;out[pos]=fromD(toD(m[base])+sPk([-1,1,2]))}
  /* call and answer: a top note that lands on a chord hit moves into the rest after it (most of the time) */
  const ah=new Set();const A=P.pat.ack;if(Array.isArray(A))A.forEach((bar,bi)=>{for(let j=0;j<16;j++)if(bar[j]==='x')ah.add(bi*16+j)});else if(Array.isArray(P.rh))P.rh.forEach((bar,bi)=>{for(let j=0;j<16;j++)if(bar[j]==='x')ah.add(bi*16+j)});
  if(ah.size&&ah.size<48)Object.keys(out).map(Number).forEach(pos=>{if(!ah.has(pos)||sRnd()>.6)return;for(const dd of [1,2,3]){const np=pos+dd;if(np<64&&!ah.has(np)&&out[np]==null){out[np]=out[pos];if(ol[pos]){ol[np]=ol[pos];delete ol[pos]}delete out[pos];break}}});
  if(Object.keys(out).length<2)return;P.pat.klo=out;P.pat.kl=ol}
/* sounds: the style's engines with another of their presets now and then, the Starter's own sounds within the same family */
function stySounds(P,R0,fresh){const L=P.ls;
  if(fresh){for(const l in L){const s=R0.ls&&R0.ls[l];if(s){L[l].snd=s.snd;L[l].oct=s.oct||0;L[l].lv=s.lv;L[l].len=s.len;L[l].ton=s.ton}}if(R0.ep)for(const e in R0.ep)engLoad(e,R0.ep[e])}
  const cnt={};['ack','klo','sub','luft'].forEach(l=>{const sn=L[l].snd;if(P.lay[l]&&sn&&sn.startsWith('e:'))cnt[sn]=(cnt[sn]||0)+1});
  ['ack','klo','sub','luft'].forEach(l=>{const sn=L[l].snd;if(!sn||!P.lay[l])return;
    if(sn.startsWith('e:')){const e=sn.slice(2),lst=BIG[l]&&BIG[l][e];if(!lst||cnt[sn]>1||sRnd()>=.55)return;const cur=(R0.ep||{})[e],pn=sPk(lst.filter(x=>x!==cur));if(!pn)return;engLoad(e,pn);
      if(BIG_OCT[e+':'+l+':'+pn]!=null||BIG_OCT[e+':'+l]!=null)L[l].oct=octOf(e,l,pn)}
    else if(REAL[sn]&&sRnd()<(styCore(R0)?(l==='sub'?.15:l==='luft'?.15:.25):(l==='sub'?.3:l==='luft'?.3:.45))){L[l].snd=sPk(REAL[sn]);if(l==='ack'&&(L[l].oct||0)<-0)L[l].oct=0}
    else if(sRnd()<(styCore(R0)?.15:(l==='sub'?.2:.3))){const g=FAM.filter(g=>g.includes(sn));if(g.length){const o=sPk(g).filter(x=>x!==sn&&(l!=='sub'||['sinus','kort','808','moog'].includes(x)));if(o.length)L[l].snd=sPk(o)}}});
  /* the chords and the top line never on the same instrument */
  if(P.lay.ack&&P.lay.klo&&L.klo.snd===L.ack.snd&&!String(L.klo.snd).startsWith('e:')){const o=['dx-klocka','dx-mallet','marimba','vibrafon','kalimba','gitarr'].filter(x=>x!==L.ack.snd);L.klo.snd=sPk(o)}
  for(const l in L)L[l].tw=sRi(1e6);
  engRefresh()}
/* the knobs and levels: close to the style, a little different every time */
function styJitter(P){const j=(v,a)=>v==null?v:+Math.max(0,Math.min(1,v+(sRnd()*2-1)*a)).toFixed(2);for(const k in P.k)if(k!=='vol')P.k[k]=j(P.k[k],.06);
  for(const l in P.ls){const L=P.ls[l];L.lv=j(L.lv,.03);L.len=j(L.len,.06);L.ton=j(L.ton,.05)}}
function styGroove(si){const st=PDR[STX_PRE[si].nm]||'house',pat=S.pats[S.pat];S.dice={...(S.dice||{}),style:st,si};try{S.master.swing=STY[st].sw}catch(e){globalThis.__el&&globalThis.__el(e)}
  const keep=DR.filter(i=>S.lock&&S.lock[TRACKS[i].id]).map(i=>[i,JSON.parse(JSON.stringify(pat[i]))]);genDrumsS(pat,st);keep.forEach(([i,r])=>{pat[i]=r});return st}
/* every new idea gets a new drum kit that suits the style: the style's own drum models, or a sample from the library now and then */
function kitFor(genre){const st=STY[genre]||{},R=Math.random,pk=a=>a[Math.floor(R()*a.length)];let lib=[];try{lib=[...SMP.values()].filter(s=>s&&s.pack&&s.group&&s.group!=='loop'&&s.group!=='vox')}catch(e){globalThis.__el&&globalThis.__el(e)}
  TRACKS.forEach((t,i)=>{if(t.mel||t.x||(S.lock&&S.lock[t.id]))return;const key=t.id==='ohat'?'hat':t.id,P=S.params[t.id]||{},pool=lib.filter(s=>((typeof KIT_G!=='undefined'&&KIT_G[t.id])||[]).includes(s.group));
    if(pool.length&&R()<.4){const sm=pk(pool);S.dk[t.id]='smp:'+sm.id;Object.assign(P,{tone:.5,decay:1,tune:0});try{ensureBuf(sm).then(()=>{try{applyTrack(i)}catch(e){globalThis.__el&&globalThis.__el(e)}})}catch(e){globalThis.__el&&globalThis.__el(e)}}
    else{const opts=(st.kit&&st.kit[key])||((typeof DKM!=='undefined'&&DKM[key])||[]).map(o=>o[0]),o=pk(opts.length?opts:['']);if(o)S.dk[t.id]=o;else delete S.dk[t.id];
      const D=(typeof DEF_P!=='undefined'&&DEF_P[t.id])||{};P.tone=Math.max(0,Math.min(1,(D.tone??.5)+(R()-.5)*.25));P.decay=Math.max(.05,Math.min(1,(D.decay??.5)+(R()-.5)*.25));P.tune=0}
    try{applyTrack(i)}catch(e){globalThis.__el&&globalThis.__el(e)}});
  if(!(S.lock&&S.lock.ohat)&&!(S.dk.ohat||'').startsWith('smp:')&&!(S.dk.hat||'').startsWith('smp:')){if(S.dk.hat)S.dk.ohat=S.dk.hat;else delete S.dk.ohat}
  try{renderSnd();renderDial()}catch(e){globalThis.__el&&globalThis.__el(e)}}
/* the chord module (Stämmor) follows along: a new sound that suits the style, on the Starter's chords */
const proMix=g=>{try{if(window.__mix)__mix.mixFor(g)}catch(e){globalThis.__el&&globalThis.__el(e)}};
const stmIdea=g=>{try{return window.__stm&&__stm.idea?__stm.idea(g):''}catch(e){return ''}};
function smpIdea(P,own){const Q=P.smp;if(!Array.isArray(Q))return;const R=Math.random,rg=(a,b)=>+(a+R()*(b-a)).toFixed(2);
  Q.forEach((q,k)=>{if(!q)return;if(!q.id)q.id=STX_FABSMP[k];const mine=!!own[k];q.on=mine||R()<(k?.25:.4)?1:0;
    /* (v260) slot 2: the synth stop or wubbas, half each (a sample you picked yourself stays) */
    if(k===1&&!mine&&STX_SNDSMP.includes(q.id))q.id=STX_SNDSMP[Math.floor(R()*STX_SNDSMP.length)];
    if(!q.on)return;if(k===0){q.mode='klipp';q.amt=mine?Math.min(.5,Math.max(.34,q.amt||.4)):rg(.32,.5);q.lv=rg(.5,.6);q.fx=rg(.3,.55);q.oct=R()<.2?1:0}
    else{const wub=q.id==='b-stx-wubbas-c';q.mode=wub||R()<.75?'ett':'klipp';q.amt=rg(.28,.42);q.lv=rg(.45,.55);q.fx=rg(.25,.45);q.oct=wub?0:R()<.3?-1:0}});
  /* both at once: a little less of each, so they don't fight */
  if(Q[0]&&Q[1]&&Q[0].on&&Q[1].on){Q[0].amt=+(Q[0].amt*.85).toFixed(2);Q[1].amt=+(Q[1].amt*.8).toFixed(2)}
  Q.forEach(q=>{if(q&&q.on)try{if(q.id!=='kit:vox')delete STX.sb[q.id];stxSmpLoad(q.id)}catch(e){globalThis.__el&&globalThis.__el(e)}})}
/* calmer ideas (v212): one gentle fx at most, no sample slots (voice chops) unless you turn them on, a top line that leaves room */
function calm(P,R0){const core=styCore(R0),own=R0?(R0.smp||[]).map(q=>!!(q&&q.on)):[];delete P._kmx;delete P._ksrc;for(const l in P.ls||{})if(P.ls[l]){delete P.ls[l]._mx;delete P.ls[l]._src}/* stacks (v212): now and then a second instrument doubles the top line, or puts a shimmer over the chords */
  if(P.ls&&P.lay){const R=Math.random,pk=x=>x[Math.floor(R()*x.length)];if(P.ls.klo)delete P.ls.klo.st;if(P.ls.ack)delete P.ls.ack.st;
    if(P.lay.klo&&P.ls.klo&&R()<(core?.25:.5)){const o=['korn','dx-klocka','vibrafon','kalimba','marimba','dx-mallet','rhodes'].filter(x=>x!==P.ls.klo.snd);P.ls.klo.st={snd:pk(o),oct:pk([0,1,1,-1]),lv:+(.3+R()*.2).toFixed(2),pan:pk([-.3,.3]),tw:Math.floor(R()*1e6)}}
    if(P.lay.ack&&P.ls.ack&&R()<(core?.15:.3)){const o=['korn','vibrafon','dx-klocka'].filter(x=>x!==P.ls.ack.snd);P.ls.ack.st={snd:pk(o),oct:1,lv:+(.22+R()*.15).toFixed(2),pan:0,tw:Math.floor(R()*1e6)}}}
if(P.k){if(Math.random()<(core?.45:.3)){P.k.atm=+(.2+Math.random()*.25).toFixed(2);P.atmK=Math.random()<.8?'vinyl':'rum'}else P.k.atm=0}
  const fw={allt:2,levande:3,'fråga-svar':2,gles:2,andning:1};if(!(R0&&Math.random()<(core?.6:.4))){let tt=0;for(const k in fw)tt+=fw[k];let x=Math.random()*tt;for(const k in fw){x-=fw[k];if(x<=0){P.form=k;break}}}
  if(P.lay&&!P.lay.luft&&P.ls&&P.ls.luft&&Math.random()<.4){P.lay.luft=1;if(!String(P.ls.luft.snd).startsWith('e:'))P.ls.luft.snd=sPk(['mjuk','moln']);P.ls.luft.lv=.42;P.ls.luft.oct=0}
  const fx0=Object.keys(P.fx||{}).map(Number).filter(id=>P.fx[id]),keep=fx0.filter(id=>[6,7,8,9].includes(id)),spice=fx0.filter(id=>[1,3,4].includes(id));P.fx={};if(keep.length)P.fx[keep[0]]=1;
  /* a style keeps one of its own moves (stutter, reverse, tape stop) now and then – that is part of the sound */
  if(R0&&spice.length&&Math.random()<(core?.35:.25))P.fx[sPk(spice)]=1;
  /* voice and sound (v212): the style's own sample slots stay on; otherwise a voice chop in about 4 of 10 ideas, a sound in about 1 of 4 */
  smpIdea(P,own);if(P.mel&&P.mel.dens>.7)P.mel.dens=.7;if(P.ls&&P.ls.ack&&P.ls.ack.arp&&P.ls.ack.arp.on&&P.lay.klo&&Math.random()<.5)P.ls.ack.arp.on=0}
function styleIdea(si){const R0=STX_PRE[si];styGroove(si);melClear();const P=stx();stxLoadPre(P,si);P.on=1;P.pre=-1;P.styNm=R0.nm;
  P.root=((R0.root+sRi(11)-5)%12+12)%12;P.seed=sRi(1e6);P.custom={mode:P.mode,ch:styChords(R0,P.mode),nm:R0.nm};P.prog=0;applyKey(P,R0);
  styRhythm(P);styKlo(P);if(P.mel&&P.mel.dens!=null)P.mel.dens=+Math.max(.15,Math.min(.9,P.mel.dens+(sRnd()*2-1)*.12)).toFixed(2);
  stySounds(P,R0,false);styJitter(P);calm(P,R0);kitFor(PDR[R0.nm]||'house');stmIdea(PDR[R0.nm]||'house');proMix(PDR[R0.nm]||'house');
  let b='';if(!bpmLock){const v=R0.bpm+sRi(7)-3;S.bpm=v;try{setBpm(v)}catch(e){globalThis.__el&&globalThis.__el(e)}b=' · '+v+' bpm'}
  return 'Ny idé · stil '+R0.nm+' · '+STX_NN[P.root]+(P.mode==='moll'?'m':'')+b}
/* clearer free ideas: little drive and tape, short echoes and rooms, the top line over the chords, the pad back when everything plays */
function clarity(P){const k=P.k;k.drv=Math.min(k.drv,.3);k.tejp=Math.min(k.tejp,.5);k.eko=Math.min(k.eko,.3);k.rum=Math.min(k.rum,.3);const L=P.ls;
  if(P.lay.klo&&P.lay.ack&&(L.klo.oct||0)<(L.ack.oct||0))L.klo.oct=L.ack.oct||0;if(['ack','klo','sub','luft'].every(l=>P.lay[l]))L.luft.lv=+(L.luft.lv*.85).toFixed(2)}
function pickStyle(){if(typeof DUO.pre==='number')return DUO.pre;if(DUO.pre==='fri')return null;const last=S.dice&&S.dice.si,cn=styCoreN();let i;
  /* "alla stilar": mostly the Komorebi / Hanz x Sem0r styles the Starter was built on, now and then one of the genre styles */
  do{i=sRnd()<.72?sRi(cn):cn+sRi(STX_PRE.length-cn)}while(i===last&&STX_PRE.length>1);return i}
const act={idea:()=>{const si=pickStyle();if(si!=null)return styleIdea(si);const n=grooveNew();if(S.dice)delete S.dice.si;melClear();const P=stx();stxDiceAll(P);applyKey(P,null);P.on=1;P.styNm='';const big=fatten(P,S.dice.style);clarity(P);calm(P);kitFor(S.dice.style);stmIdea(S.dice.style);proMix(S.dice.style);const b=bpmNew();return 'Ny idé · '+n+' · '+STX_NN[P.root]+' '+P.mode+b+(big.length?' · '+big.map(e=>STX_ENGN[e]||e).join(' + '):'')},
  /* (v254) new chords = a whole new Starter (style, key, chords, rhythm, top line, sounds) – the drums stay as they are */
  ch:()=>{const si=pickStyle();
    if(si!=null){const R0=STX_PRE[si];melClear();const P=stx();stxLoadPre(P,si);P.on=1;P.pre=-1;P.styNm=R0.nm;
      P.root=((R0.root+sRi(11)-5)%12+12)%12;P.seed=sRi(1e6);P.custom={mode:P.mode,ch:styChords(R0,P.mode),nm:R0.nm};P.prog=0;applyKey(P,R0);
      styRhythm(P);styKlo(P);if(P.mel&&P.mel.dens!=null)P.mel.dens=+Math.max(.15,Math.min(.9,P.mel.dens+(sRnd()*2-1)*.12)).toFixed(2);
      stySounds(P,R0,false);styJitter(P);calm(P,R0);stmIdea(PDR[R0.nm]||'house');if(S.dice)S.dice.si=si;
      return 'Nya ackord · stil '+R0.nm+' · '+STX_NN[P.root]+(P.mode==='moll'?'m':'')+' · drums kept'}
    melClear();const P=stx(),st=(S.dice&&S.dice.style)||'house';stxDiceAll(P);applyKey(P,null);P.on=1;P.styNm='';fatten(P,st);clarity(P);calm(P);stmIdea(st);
    return 'Nya ackord · '+STX_NN[P.root]+' '+P.mode+' · drums kept'},
  gr:()=>'Nytt groove · '+grooveNew(),
  snd:()=>{const si=curSty();if(si!=null){kitFor(PDR[STX_PRE[si].nm]||'house');stySounds(stx(),STX_PRE[si],true);styJitter(stx());stmIdea(PDR[STX_PRE[si].nm]||'house');proMix(PDR[STX_PRE[si].nm]||'house');return 'Nya ljud · stil '+STX_PRE[si].nm}
    soundsNew();stmIdea((S.dice&&S.dice.style)||'house');proMix((S.dice&&S.dice.style)||'house');const P=stx(),e=[...new Set(Object.values(P.ls).filter(L=>L.snd&&L.snd.startsWith('e:')).map(L=>STX_ENGN[L.snd.slice(2)]||L.snd.slice(2)))];return 'Nya ljud'+(e.length?' · '+e.join(' + '):'')}};
/* (v277) an idea says what kept it from changing things: locked synth tracks (the lock on the track row – the Starter never
   writes there, so those chords, rhythms and glides stay), and the song in Studio playing its own saved parts */
['idea','ch'].forEach(k=>{const f=act[k];if(typeof f!=='function')return;act[k]=function(){const m=f.apply(this,arguments);let w=[];
  try{const lk=TRACKS.filter(t=>t.mel&&S.lock&&S.lock[t.id]).map(t=>t.name.toLowerCase());if(lk.length)w.push('locked, not changed: '+lk.join(', '))}catch(e){globalThis.__el&&globalThis.__el(e)}
  try{if(typeof ARR!=='undefined'&&ARR.active)w.push('song mode is on – it plays the song, turn it off to hear the idea')}catch(e){globalThis.__el&&globalThis.__el(e)}
  return w.length?(m||'')+' · '+w.join(' · '):m}});
el.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{if(b._lp){b._lp=0;return}initAudio();ctx.resume();push();const m=act[b.dataset.a]();if(b.dataset.a==='idea'||b.dataset.a==='gr')drumsAll();commit();toast(m);
  /* v212: a new idea starts from the top (the other buttons – new sounds, chords, groove … – keep playing where they are) */
  if(b.dataset.a==='idea')fromTop();else if(!playing)play()});
/* hold "ny idé" = choose the style it makes (or all of them) */
DUO.sty=(()=>{try{const v=localStorage.getItem('blonda.duo.sty');return v&&STY[v]?v:null}catch(e){return null}})();
{const b=$d('[data-a="idea"]');let t=0;b.addEventListener('pointerdown',()=>{b._lp=0;clearTimeout(t);t=setTimeout(()=>{b._lp=1;preList(b)},520)});
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>clearTimeout(t)));b.addEventListener('contextmenu',e=>e.preventDefault())}
el.querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>{const u=b.dataset.u==='u',from=u?DUO.hist:DUO.redo,to=u?DUO.redo:DUO.hist;if(!from.length){toast(u?'Inget att ångra':'Inget att göra om');return}to.push(snapI());loadI(from.pop());toast(u?'Ångrat':'Gjort om')});
$d('.d-play').onclick=()=>{initAudio();ctx.resume();play();paint()};
$d('.d-x').onclick=()=>close();
$d('.d-key2').onclick=()=>{const L=['any key (as before)','any minor key','any major key'],V=[{r:-1,m:'any'},{r:-1,m:'moll'},{r:-1,m:'dur'}],G=['any','any','any'];
  for(const m of ['moll','dur'])KEYN.forEach((n,r)=>{L.push(n+(m==='moll'?' minor':' major'));V.push({r,m});G.push(m==='moll'?'minor':'major')});
  const cur=V.findIndex(v=>v.r===keyLock.r&&v.m===keyLock.m);
  const go=k=>{keyLock=V[k];try{localStorage.setItem('blonda.duo.key',JSON.stringify(keyLock))}catch(e){globalThis.__el&&globalThis.__el(e)}paint();toast(keyLock.r<0&&keyLock.m==='any'?'Key: new ideas pick freely':'Key: new ideas in '+L[k])};
  if(window.pickShow)pickShow($d('.d-key2'),L,cur,go,G);else go((cur+1)%V.length)};
$d('.d-lk').onclick=()=>{bpmLock=!bpmLock;try{localStorage.setItem('blonda.duo.bpmlock',bpmLock?'1':'0')}catch(e){globalThis.__el&&globalThis.__el(e)}paint();toast(bpmLock?'Tempot är låst · ny idé behåller '+S.bpm+' bpm':'Tempot är öppet · ny idé väljer tempo efter stilen')};
/* iPhone: a long press on these must not zoom, select or open a menu (they use pointer events, not click) */
el.addEventListener('touchstart',e=>{if(e.target.closest('.d-chip,.d-mem button,.d-fx'))e.preventDefault()},{passive:false});
el.addEventListener('contextmenu',e=>{if(e.target.closest('.d-chip,.d-mem button,.d-fx'))e.preventDefault()});
el.querySelectorAll('.d-fx').forEach(b=>{const f=b.dataset.fx;let on=false;
  const go=e=>{e.preventDefault();initAudio();ctx.resume();if(!playing){play();paint()}on=true;b.classList.add('on');try{b.setPointerCapture(e.pointerId)}catch(_){globalThis.__el&&globalThis.__el(_)}
    if(f==='half'){window.__half=1;tapeRate=.5}else{try{if(window.__rpt)__rpt.engage(4)}catch(_){globalThis.__el&&globalThis.__el(_)}}};
  const end=()=>{if(!on)return;on=false;b.classList.remove('on');if(f==='half'){window.__half=0;tapeRate=1}else{try{if(window.__rpt)__rpt.release()}catch(_){globalThis.__el&&globalThis.__el(_)}}};
  b.addEventListener('pointerdown',go);b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end);b.addEventListener('lostpointercapture',end)});
const preTempo=()=>{const P=stx(),R=STX_PRE[P.pre];if(R&&R.bpm&&!bpmLock)try{setBpm(R.bpm)}catch(e){globalThis.__el&&globalThis.__el(e)}};
/* the style row: ‹ › and the name choose the style – and make a new idea in it right away */
const PRE_L=()=>['all',...STX_PRE.map((r,i)=>i),'fri'];
function fromTop(){if(playing)stop();play()}
/* v222: a new idea (or a new groove) puts the same beat in A–D, so the drums loop one bar under the Starter's four */
function drumsAll(){try{if(window.drumsToAll)drumsToAll()}catch(e){globalThis.__el&&globalThis.__el(e)}}
function preGo(v){DUO.pre=v;preSave();initAudio();ctx.resume();push();const m=act.idea();drumsAll();commit();toast(m);fromTop();paint()}
function preList(anchor){const L=PRE_L();if(typeof pickShow==='function')pickShow(anchor,L.map(preName),Math.max(0,L.indexOf(DUO.pre)),i=>preGo(L[i]))}
el.querySelectorAll('[data-pp]').forEach(b=>b.onclick=()=>{const L=PRE_L(),n=L.length,i=Math.max(0,L.indexOf(DUO.pre));preGo(L[((i+(+b.dataset.pp))%n+n)%n])});
$d('[data-pl]').onclick=()=>preList($d('[data-pl]'));
el.querySelectorAll('[data-bpm]').forEach(b=>{let t=0,iv=0;const go=()=>setBpm(S.bpm+(+b.dataset.bpm));b.addEventListener('pointerdown',()=>{go();t=setTimeout(()=>{iv=setInterval(go,70)},380)});const up=()=>{clearTimeout(t);clearInterval(iv);paint()};b.addEventListener('pointerup',up);b.addEventListener('pointerleave',up)});
/* memories: tap empty = save, tap full = load, hold = save over */
if(!Array.isArray(S.duoMem))S.duoMem=[null,null,null,null];let memCur=-1;
el.querySelectorAll('[data-m]').forEach(b=>{const i=+b.dataset.m;let t=0,held=false;
  b.addEventListener('pointerdown',()=>{held=false;b.classList.add('d-hold');t=setTimeout(()=>{held=true;b.classList.remove('d-hold');S.duoMem[i]={k:snapI(),l:label()};memCur=i;save();paint();toast('Sparat i '+(i+1))},600)});
  const up=()=>{clearTimeout(t);b.classList.remove('d-hold')};b.addEventListener('pointerleave',up);b.addEventListener('pointercancel',up);
  b.addEventListener('pointerup',()=>{up();if(held)return;const m=S.duoMem[i];if(!m){S.duoMem[i]={k:snapI(),l:label()};memCur=i;save();paint();toast('Sparat i '+(i+1));return}push();loadI(m.k);memCur=i;paint();toast('Minne '+(i+1))})});
function sndLbl(P){const e=[...new Set(['sub','ack','luft','klo'].filter(l=>P.lay[l]&&P.ls[l].snd&&P.ls[l].snd.startsWith('e:')).map(l=>STX_ENGN[S.inst[ROLE_TRK[l]]]||P.ls[l].snd.slice(2)))];return e.length?e.join(' + '):stxSndName(P.ls.ack.snd)}
function styLbl(){let P=null;try{P=stx()}catch(e){globalThis.__el&&globalThis.__el(e)}return (P&&P.styNm)||((S.dice&&STY[S.dice.style]&&STY[S.dice.style].name)||'')}
function label(){const P=stx();return STX_NN[P.root]+(P.mode==='moll'?'m':'')+' · '+styLbl()}
/* paint the chips, buttons and the circle */
function paint(){if(!DUO.open)return;const P=stx();
  [...drC.children].forEach((b,k)=>{const i=DR[k],mu=!!S.mute[i],empty=!S.pats[S.pat][i].some(c=>c.v);b.classList.toggle('mut',mu);b.classList.toggle('tom',!mu&&empty);b.title=mu?'Tyst · tryck = på':empty?'Tom · tryck = nytt mönster':'Tryck = tysta · håll = nytt mönster'});
  [...stC.children].forEach((b,k)=>{const l=DLAY[k][0];const on=l[0]==='s'&&l.length===2?!!(P.smp[+l[1]]&&P.smp[+l[1]].on):!!P.lay[l];b.classList.toggle('off',!on||!P.on)});
  $d('[data-pl]').textContent=preName(DUO.pre);
  {const y=$d('.d-sty');if(y)y.textContent=typeof DUO.pre==='number'?'i stilen '+preName(DUO.pre):DUO.pre==='fri'?'helt fri slump':'en ny stil varje gång'}
  $d('.t').textContent=S.bpm;{const kb=$d('.d-key2');kb.querySelector('b').textContent=keyLbl();kb.classList.toggle('d-on',!(keyLock.r<0&&keyLock.m==='any'))}{const lk=$d('.d-lk');lk.classList.toggle('d-on',bpmLock);lk.innerHTML=bpmLock?LK_ON:LK_OFF;lk.title=bpmLock?'Tempot är låst – tryck för att öppna':'Tempot är öppet – ny idé väljer tempo · tryck för att låsa'}$d('.d-play').innerHTML=playing?PAUSE:PLAY;
  el.querySelectorAll('[data-m]').forEach((b,i)=>{const m=S.duoMem[i];b.classList.toggle('full',!!m);b.classList.toggle('cur',i===memCur&&!!m);b.querySelector('small').textContent=m?m.l:'tom'});draw();try{trkPaint()}catch(e){globalThis.__el&&globalThis.__el(e)}}
/* v212: the ring's box size is kept by a ResizeObserver instead of being measured every frame (that forced a layout 60 times a second) */
const RB={w:0,h:0,ro:null};function ringBox(box){if(!RB.ro&&window.ResizeObserver){RB.ro=new ResizeObserver(es=>{for(const e of es){const r=e.contentRect;RB.w=Math.round(r.width);RB.h=Math.round(r.height)}fitC._k=null;if(DUO.open&&RB.w)requestAnimationFrame(()=>{try{draw()}catch(e){globalThis.__el&&globalThis.__el(e)}})});RB.ro.observe(box)}
  if(!RB.ro||!RB.w){RB.w=box.clientWidth;RB.h=box.clientHeight}return RB}
function fitC(){const box=$d('.d-ring'),rb=ringBox(box),w=rb.w,h=rb.h,sz=Math.max(120,Math.min(w,h)),d=devicePixelRatio||1;cv.style.width=cv.style.height=sz+'px';if(cv.width!==Math.round(sz*d)){cv.width=cv.height=Math.round(sz*d)}
  const k=sz+'|'+w+'|'+h;if(fitC._k!==k){fitC._k=k;const R=sz/2*RING,cx0=w/2,cy0=h/2,gap=R*.985+9,Bw=Math.round(Math.min(sz/2-6,R*1.02)),Bh=Math.round(Math.min(sz/2-4,R*.95));
    const L0=Math.max(0,cx0-sz/2),R0=Math.min(w,cx0+sz/2),B0=Math.min(h,cy0+sz/2);
    [['l',L0,B0-Bh],['r',R0-Bw,B0-Bh]].forEach(([c,x,y])=>{const b=$d('.d-fx.'+c);b.style.left=x+'px';b.style.top=y+'px';b.style.width=Bw+'px';b.style.height=Bh+'px';const mx=cx0-x,my=cy0-y;b.style.setProperty('--m',`radial-gradient(circle at ${mx}px ${my}px,transparent ${gap}px,#000 ${gap+1}px)`)})}
  return {sz,d}}
let lastK='';const RING=.9;
function draw(){if(!DUO.open)return;const {sz,d}=fitC(),c=cx;c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,sz,sz);const R=sz/2*RING,o=sz/2,pat=S.pats[S.pat],P=stx(),g=hG(),st=g>=0?((g%16)+16)%16:-1;
  const A=s=>-Math.PI/2+s/16*Math.PI*2;
  /* drums: six rings, outside in */
  const r0=R*.97,r1=R*.69,dr=(r0-r1)/6;
  DR.forEach((ti,k)=>{const r=r0-dr*(k+.5),col=TRACKS[ti].hex||DC[k],mu=!!S.mute[ti],L=(()=>{try{return trkLen(ti)}catch(e){return 16}})();
    c.strokeStyle='rgba(255,255,255,.05)';c.lineWidth=1;c.beginPath();c.arc(o,o,r,0,Math.PI*2);c.stroke();
    for(let s=0;s<16;s++){const cell=pat[ti][s],a=A(s),x=o+Math.cos(a)*r,y=o+Math.sin(a)*r,on=!!cell.v,hot=st>=0&&((L<16?(g%L):st)===s);
      c.beginPath();c.arc(x,y,on?(cell.v===2?dr*.42:dr*.34):dr*.12,0,Math.PI*2);c.fillStyle=on?col:'rgba(255,255,255,.18)';c.globalAlpha=mu?.22:(on?(hot?1:.85):1);c.fill();
      if(on&&hot&&!mu){c.globalAlpha=.35;c.beginPath();c.arc(x,y,dr*.62,0,Math.PI*2);c.fill()}c.globalAlpha=1}});
  /* the playhead */
  if(st>=0){const a=A(st);c.strokeStyle='rgba(255,138,61,.55)';c.lineWidth=2;c.beginPath();c.moveTo(o+Math.cos(a)*(r1+2),o+Math.sin(a)*(r1+2));c.lineTo(o+Math.cos(a)*(r0+2),o+Math.sin(a)*(r0+2));c.stroke()}
  /* the Starter: four rings (ackord, topp, sub, luft) over its four bars */
  let pl=null;try{pl=stxPlanCached()}catch(e){globalThis.__el&&globalThis.__el(e)}
  const s0=R*.56,s1=R*.34,sdr=(s0-s1)/6,B=s=>-Math.PI/2+s/64*Math.PI*2;
  ['ack','klo','sub','luft'].forEach((l,k)=>{const r=s0-sdr*(k+.5),on=P.on&&P.lay[l];c.strokeStyle='rgba(255,255,255,.05)';c.lineWidth=sdr*.55;c.beginPath();c.arc(o,o,r,0,Math.PI*2);c.stroke();
    if(!pl)return;c.strokeStyle=LC[l];c.globalAlpha=on?.9:.18;c.lineCap='round';
    pl.steps.forEach((e,s)=>{const x=e&&e[l];if(!x)return;const a0=B(s)+.012,a1=B(s+Math.max(.6,Math.min(x.l,64-s)))-.012;if(a1<=a0)return;c.beginPath();c.arc(o,o,r,a0,a1);c.stroke()});
    if(pl.arp&&pl.arp[l]&&pl.arp[l].by)pl.arp[l].by.forEach((Aa,s)=>{(Aa||[]).forEach(()=>{c.beginPath();c.arc(o,o,r,B(s)+.01,B(s+.6));c.stroke()})});c.globalAlpha=1;c.lineCap='butt'});
  /* v212: the voice and the sound get their own two rings inside the Starter's (same colours as their chips): each piece of the voice or
     hit of the sound is an arc as long as it plays */
  [0,1].forEach(k=>{const l='s'+k,r=s0-sdr*(4+k+.5),q=P.smp&&P.smp[k],on=P.on&&q&&q.on&&P.lay[l]!==0;c.strokeStyle='rgba(255,255,255,.05)';c.lineWidth=sdr*.55;c.beginPath();c.arc(o,o,r,0,Math.PI*2);c.stroke();
    const by=pl&&pl.sx&&pl.sx[k];if(!on||!by)return;c.strokeStyle=LC[l];c.globalAlpha=.9;c.lineCap='round';
    by.forEach((x,s)=>{if(!x)return;const a0=B(s)+.012,a1=B(s+Math.max(.6,Math.min(x.l||2,64-s)))-.012;if(a1<=a0)return;c.beginPath();c.arc(o,o,r,a0,a1);c.stroke()});c.globalAlpha=1;c.lineCap='butt'});
  {const gr=(r1+s0)/2;c.strokeStyle='rgba(255,138,61,.14)';c.lineWidth=1;c.setLineDash([2,5]);c.beginPath();c.arc(o,o,gr,0,Math.PI*2);c.stroke();c.setLineDash([])}
  if(g>=0){const a=B(((g%64)+64)%64),gr=(r1+s0)/2,px=o+Math.cos(a)*gr,py=o+Math.sin(a)*gr,pr=Math.max(4,R*.03);c.fillStyle='rgba(255,138,61,.25)';c.beginPath();c.arc(px,py,pr*2.2,0,Math.PI*2);c.fill();c.fillStyle='#FF8A3D';c.beginPath();c.arc(px,py,pr,0,Math.PI*2);c.fill();c.strokeStyle='#fff';c.lineWidth=Math.max(1.5,pr*.45);c.beginPath();c.arc(px,py,pr+c.lineWidth*.6,0,Math.PI*2);c.stroke()}
  /* the middle: the chord now, the key and the sound */
  const ch=(()=>{try{if(!pl)return null;const L=g>=0?((g%64)+64)%64:0,e=pl.steps[L];return pl.ch[(e&&e.ci)||0]}catch(e){return null}})();
  c.fillStyle='rgba(0,0,0,.25)';c.beginPath();c.arc(o,o,s1-6,0,Math.PI*2);c.fill();
  c.textAlign='center';c.fillStyle='#ECE8DC';c.font='400 '+Math.round(R*.17)+'px "BLONDA Dot","BLONDA Mono",monospace';c.fillText(ch?ch.name:'–',o,o+R*.03);
  /* the key line shrinks to stay inside the inner circle (long synth names) */
  {const t=(P.on?'':'av · ')+STX_NN[P.root]+' '+P.mode+' · '+sndLbl(P),y=R*.14,mw=2*Math.sqrt(Math.max(1,(s1-16)*(s1-16)-y*y));let fs=Math.max(9,Math.round(R*.055));c.font='500 '+fs+'px "BLONDA Mono",monospace';
   while(fs>8&&c.measureText(t).width>mw){fs--;c.font='500 '+fs+'px "BLONDA Mono",monospace'}c.fillStyle='rgba(236,232,220,.55)';c.fillText(t,o,o+y)}
  c.font='500 '+Math.max(9,Math.round(R*.055))+'px "BLONDA Mono",monospace';c.fillStyle='rgba(236,232,220,.35)';c.fillText(styLbl(),o,o+R*.22);
  const bars=g>=0?(((g%64)+64)%64)>>4:-1;for(let b=0;b<4;b++){c.beginPath();c.arc(o-R*.09+b*R*.06,o-R*.15,R*.014,0,Math.PI*2);c.fillStyle=b===bars?'#FF8A3D':'rgba(236,232,220,.25)';c.fill()}
  c.textAlign='start'}
cv.addEventListener('click',e=>{const q=cv.getBoundingClientRect(),x=e.clientX-q.left-q.width/2,y=e.clientY-q.top-q.height/2;if(Math.hypot(x,y)<q.width*.2){initAudio();ctx.resume();play();paint()}});
