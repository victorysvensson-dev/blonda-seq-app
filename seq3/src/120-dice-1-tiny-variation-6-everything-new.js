/* ================= dice: 1 = tiny variation … 6 = everything new ================= */
const PIPS={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};let dieN=5;
function drawDie(n){const d=$('#dieFace');if(!d)return;if(!d.children.length)for(let k=0;k<9;k++)d.appendChild(document.createElement('i'));[...d.children].forEach((e,k)=>e.classList.toggle('p',PIPS[n].includes(k)))}
const rnd=Math.random,chance=p=>rnd()<p,pickA=a=>a[Math.floor(rnd()*a.length)];
const ROOTS=SCALE.filter(n=>n%12===9);
function scaleNear(n,k){let i=SCALE.indexOf(n);if(i<0)i=SCALE.findIndex(x=>x>=n);return SCALE[clamp(i+k,0,SCALE.length-1)]}
function cellsClear(row){row.forEach(c=>{c.v=0;delete c.r;delete c.p;delete c.vel;delete c.so;delete c.rv;delete c.pt;delete c.gl})}
/* --- musical dice: every throw picks a coherent style + a chord progression in A minor, and every part follows it --- */
const DG={g:.32,o:.58};
function put(row,str){if(!str)return;for(let s=0;s<16;s++){const ch=str[s];if(!ch||ch==='.')continue;row[s].v=ch==='X'?2:1;if(DG[ch])row[s].vel=DG[ch]}}
const CH_NAME={0:'Am',3:'C',5:'Dm',7:'Em',8:'F',10:'G'};
const PROGS=[[0,8],[0,5],[0,10],[0,3],[8,10],[0,0],[5,0],[8,7],[0,7],[3,10],[8,0],[5,10]];
const STY={
 house:{name:'house',sw:.08,
  K:['X...X...X...X...'],S:['','','............g...'],C:['....X.......X...','....X.......X..g'],
  H:['g.g.g.g.g.g.g.g.','gggggggggggggggg','.g.g.g.g.g.g.g.g'],O:['..x...x...x...x.'],P:['','......g.......g.','...g......g..g..','.......g...g....'],
  B:['..x...x...x...x.','..x..xx...x..xx.','..x.x.x...x.x.x.','x.x...x.x.x...x.'],KY:['...x-.....x-....','..x...x...x...x.','...x-..x-.....x.','x--.......x-....'],
  L:['x.x..x..','..x.x.x.','x..x..x.','.x.x..x.','x..x.x..'],pad:.8,bassOct:.2,kit:{kick:['909',''],snare:['','909'],hat:['909',''],perc:['conga','clave','']},
  eng:{bass:['analog','sub','mini','bris'],keys:['analog','fm','pluck','bris'],lead:['pluck','fm','bris','chip'],pad:['super','bris']}},
 techno:{name:'techno',sw:.03,
  K:['X...X...X...X...'],S:[''],C:['','....x.......x...'],
  H:['ggxgggxgggxgggxg','g.x.g.x.g.x.g.x.','gogggogggogggogg'],O:['..x...x...x...x.','..o...o...o...o.'],P:['g..g..g..g..g..g','..g..g....g..g..','','.g.....g.g......'],
  B:['.xxx.xxx.xxx.xxx','..x...x...x...x.','..xx..xx..xx..x.'],KY:['..x.............','..........x.....','...x.......x....','..x....x..x.....'],
  L:['x.......','x..x....','..x..x..'],pad:.35,bassOct:.1,prog:[[0,0],[0,5],[0,8],[0,10]],kit:{kick:['909','thump','dist'],snare:['909','rim'],hat:['909','tick'],perc:['','tom','clave']},
  eng:{bass:['acid','sh101','analog'],keys:['fm','pluck','chip'],lead:['sh101','fm','acid'],pad:['super','bris']}},
 hiphop:{name:'boom bap',sw:.32,
  K:['X......x..X.....','X.........X..x..','X..x......X.....','X......x.xX.....'],S:['....X.......X...','....X..g....X..g','....X.......X.g.'],C:['','','....x.......x...'],
  H:['X.o.x.o.X.o.x.o.','x.x.x.x.x.x.x.xg','X.x.x.x.X.x.x.x.'],O:['','','..............x.'],P:['','...g.......g....','.......g......g.'],
  B:'kick',KY:['x-----..x-----..','x--.....x--.....','x-------x-------'],
  L:['x...x.x.','..x...x.','x.x.....','...x.x..'],pad:.4,bassOct:.1,kit:{kick:['','808','thump'],snare:['lofi',''],hat:['','shaker'],perc:['','conga']},
  eng:{bass:['sub','mini','analog'],keys:['analog','fm','bris'],lead:['pluck','mini','fm'],pad:['super','bris']}},
 electro:{name:'electro',sw:.05,
  K:['X.....x...X.....','X..x..x...X..x..','X.....x.x.....x.'],S:['....X.......X...'],C:['','....x.......x...'],
  H:['xgxgxgxgxgxgxgxg','x.x.x.x.x.x.x.x.'],O:[''],P:['..g...g.g.....g.','...x......x.....',''],
  B:['x..x..x...x..x..','x..x..x.x..x..x.','x.....x...x.x...'],KY:['x..x..x.........','..x.......x..x..','........x..x..x.'],
  L:['x.x.x...','x..x..x.','..x.x.x.'],pad:.5,bassOct:.45,kit:{kick:['808','909'],snare:['808','909'],hat:['','tick'],perc:['cowbell','clave']},
  eng:{bass:['sh101','mini','fm'],keys:['fm','chip','analog'],lead:['sh101','chip','mini'],pad:['super','bris']}},
 trap:{name:'halftime',sw:.1,
  K:['X.........X.....','X......x..x.....','X..x......x..x..'],S:[''],C:['........X.......'],
  H:['x.x.x.x.x.x.x.x.','x.x.x.x.x.x.xxxx','x.xxx.x.x.x.x.x.'],O:['','..............x.'],P:['','......g.......g.'],
  B:'kick',KY:['x-------........','','x-------x-------'],
  L:['x...x...','x.x...x.','..x.....'],pad:.7,bassOct:0,bassLong:1,kit:{kick:['808'],snare:['808'],hat:['','tick'],perc:['','clave']},
  eng:{bass:['sub'],keys:['bris','fm','pluck'],lead:['pluck','bris','chip'],pad:['super','bris']}},
 disco:{name:'disco',sw:.1,
  K:['X...X...X...X...'],S:['....x.......x...'],C:['','....x.......x...'],
  H:['gogogogogogogogo','g.g.g.g.g.g.g.g.'],O:['..x...x...x...x.'],P:['','..g...g...g...g.','...g..g....g..g.'],
  B:'oct',KY:['..x...x...x...x.','..x-..x-..x-..x-','x.x...x.x.x...x.'],
  L:['x.x..x..','..x.x.x.','x..x.x.x'],pad:.6,bassOct:1,kit:{kick:['','909'],snare:['','909'],hat:['909',''],perc:['conga','cowbell']},
  eng:{bass:['analog','mini','sh101','fm'],keys:['analog','fm','pluck'],lead:['pluck','chip','fm'],pad:['super','bris']}},
 brk:{name:'breakbeat',sw:.14,
  K:['X.x.......x.....','X.........x..x..','X.x....x..x.....'],S:['....X..g.g..X..g','....X.......X.g.','....X..g....X...'],C:[''],
  H:['x.x.x.x.x.x.x.x.','xgxgxgxgxgxgxgxg'],O:['','......x.......x.'],P:['','...g......g.....'],
  B:['x.x.......x.....','x.........x..x..','x.....x...x.....'],KY:['x-------........','x--.....x--.....','..x.......x.....'],
  L:['x.x..x..','..x..x.x','x...x.x.'],pad:.6,bassOct:.15,kit:{kick:['','thump'],snare:['','lofi','909'],hat:['','909'],perc:['','tom']},
  eng:{bass:['sub','analog','mini'],keys:['analog','bris','fm'],lead:['pluck','bris','mini'],pad:['super','bris']}},
};
const STY_K=Object.keys(STY);
function dState(){if(!S.dice||!STY[S.dice.style])S.dice={style:pickA(STY_K),prog:pickA(PROGS)};return S.dice}
const TI=id=>TRACKS.findIndex(t=>t.id===id);
function degIdx(d){return SCALE.findIndex(n=>n%12===(9+d)%12)}
function chordPcs(d){const i=degIdx(d);return [SCALE[i],SCALE[i+2],SCALE[i+4]].map(n=>n%12)}
function nearestTone(n,d,lo=55,hi=84){const pcs=chordPcs(d);let best=n,bd=99;SCALE.forEach(m=>{if(m<lo||m>hi||!pcs.includes(m%12))return;const dd=Math.abs(m-n);if(dd<bd){bd=dd;best=m}});return best}
const chAt=(prog,s)=>prog[s<8?0:1];
function genDrumsS(pat,sty){const st=STY[sty];['kick','snare','clap','hat','ohat','perc'].forEach(id=>cellsClear(pat[TI(id)]));
  put(pat[TI('kick')],pickA(st.K));put(pat[TI('snare')],pickA(st.S));put(pat[TI('clap')],pickA(st.C));
  const O=pickA(st.O),H=pickA(st.H);put(pat[TI('hat')],H);put(pat[TI('ohat')],O);
  if(O)for(let s=0;s<16;s++)if(O[s]&&O[s]!=='.')clrStep(pat[TI('hat')][s]);
  put(pat[TI('perc')],pickA(st.P));
  if(sty==='trap'){const h=pat[TI('hat')];[13,14,15].forEach(s=>{if(h[s].v&&chance(.35))h[s].r=pickA([2,3])})}}
function genBassS(pi,d){const st=STY[d.style],R=[],ti=TI('bass'),root=s=>33+chAt(d.prog,s);
  let rh=st.B;if(rh==='kick')rh=S.pats[pi][TI('kick')].map(c=>c.v?'x':'.').join('');else if(rh==='oct')rh='x.x.x.x.x.x.x.x.';else rh=pickA(rh);
  const on=[];for(let s=0;s<16;s++)if(rh[s]==='x')on.push(s);
  on.forEach((s,k)=>{const nx=k+1<on.length?on[k+1]:16;let n=root(s);
    if(st.B==='oct'){if(k%2)n+=12}else if(s%4!==0&&chance(st.bassOct))n+=12;else if(s%4!==0&&chance(.08))n=scaleNear(n,4);
    let l=st.bassLong||st.B==='kick'?Math.min(nx-s,sty2len(d.style)):Math.min(nx-s,s%4===0?2:1);if(s<8&&s+l>8)l=8-s;
    R.push({s,l:Math.max(1,l),n,v:s%4===0?1:.72})});
  S.roll[pi].bass=R;syncCells(pi,ti)}
const sty2len=k=>k==='trap'?8:k==='hiphop'?3:2;
const KEYS_ROOT={0:57,3:57,5:62,7:57,8:57,10:62};
function genKeysS(pi,d){const st=STY[d.style],ti=TI('keys'),R=[],p=pickA(st.KY);
  for(let s=0;s<16;s++)if(p[s]==='x'){let l=1;while(s+l<16&&p[s+l]==='-')l++;const c=chAt(d.prog,s);R.push({s,l,n:S.chord&&S.chord.keys===0?nearestTone(60,c,55,70):KEYS_ROOT[c],v:s===0||s===8?1:.72})}
  S.roll[pi].keys=R;syncCells(pi,ti)}
function genPadS(pi,d){const st=STY[d.style],ti=TI('pad'),R=[];
  if(chance(st.pad)){const [a,b]=d.prog;if(a===b)R.push({s:0,l:16,n:45+a,v:.72});else{R.push({s:0,l:8,n:45+a,v:.72});R.push({s:8,l:8,n:45+b,v:.72})}}
  S.roll[pi].pad=R;syncCells(pi,ti)}
function genLeadS(pi,d,lv){const st=STY[d.style],ti=TI('lead'),R=[];let rh=pickA(st.L);
  const on=[];for(let s=0;s<8;s++)if(rh[s]==='x')on.push(s);
  const c1=d.prog[0],c2=d.prog[1];let n=nearestTone(pickA([64,67,69,72]),c1,62,76);const A=[];
  on.forEach((s,k)=>{if(k>0){n=scaleNear(n,pickA([-2,-1,-1,1,1,2]));if(s%4===0)n=nearestTone(n,c1,60,79)}n=clamp(n,60,79);A.push({s,n})});
  const mode=pickA(['repeat','sequence','answer']),shift=(()=>{let k=degIdx(c2)-degIdx(c1);while(k>3)k-=7;while(k<-3)k+=7;return k})();
  const B=A.map((x,k)=>{let m=mode==='sequence'?scaleNear(x.n,shift):mode==='answer'?scaleNear(A[A.length-1-k].n,0):x.n;return {s:x.s+8,n:clamp(m,60,79)}});
  if(B.length)B[B.length-1].n=nearestTone(B[B.length-1].n,c2,60,79);
  if(mode==='answer'&&B.length)B[0].n=nearestTone(B[0].n,c2,60,79);
  const all=A.concat(B);all.forEach((x,k)=>{const nx=k+1<all.length?all[k+1].s:16,end=x.s<8?8:16;let l=Math.max(1,Math.min(nx,end)-x.s);if(l>3)l=pickA([2,3]);R.push({s:x.s,l,n:x.n,v:k===0||x.s===8?1:.72})});
  S.roll[pi].lead=lv<=3&&chance(.3)?R.filter((x,k)=>k%2===0||x.s%4===0):R;syncCells(pi,ti)}
/* subtle, musical variations */
function varyDrumsM(pat,n){const K=pat[TI('kick')],Sn=pat[TI('snare')],H=pat[TI('hat')],P=pat[TI('perc')],O=pat[TI('ohat')];
  const moves=[()=>{const s=pickA([3,7,11,15]);if(!Sn[s].v){Sn[s].v=1;Sn[s].vel=.3}},()=>{const s=pickA([6,7,13,14,15]);if(!K[s].v){K[s].v=1;K[s].vel=.6}else if(s%4){clrStep(K[s])}},
    ()=>{const hs=[...Array(16).keys()].filter(s=>H[s].v);if(hs.length){const s=pickA(hs);if(s>=12)H[s].r=2;else{clrStep(H[s]);const t=s%2?s-1:s+1;if(!O[t].v){H[t].v=1;H[t].vel=.4}}}},
    ()=>{const ps=[...Array(16).keys()].filter(s=>P[s].v);if(ps.length&&chance(.5))clrStep(P[pickA(ps)]);else{const s=pickA([3,6,9,11,14]);if(!P[s].v){P[s].v=1;P[s].vel=.45}}},
    ()=>{const s=pickA([14,15]);if(!O[s].v&&!H[s].v){O[s].v=1;O[s].vel=.5}}];
  for(let k=0;k<n;k++)pickA(moves)()}
function varyMelM(pi,n){const d=S.dice&&STY[S.dice.style]?S.dice:null,L=S.roll[pi].lead||[],B=S.roll[pi].bass||[];
  for(let k=0;k<n;k++){if(L.length&&chance(.7)){const x=pickA(L);x.n=scaleNear(x.n,pickA([-1,1,2,-2]));if(d&&x.s%4===0)x.n=nearestTone(x.n,chAt(d.prog,x.s),60,79)}
    else if(B.length){const x=pickA(B.filter(b=>b.s%4!==0).concat([]));if(x)x.n+=x.n<45?12:-12}}
  syncCells(pi,TI('lead'));syncCells(pi,TI('bass'))}
function feelM(pat,pi){const H=pat[TI('hat')],Sn=pat[TI('snare')];
  H.forEach((c,s)=>{if(c.v){c.v=s%4===0?2:1;c.vel=s%4===0?.95:s%2===0?.62:.38}});
  pickA([()=>{[13,14,15].forEach((s,k)=>{if(!Sn[s].v){Sn[s].v=1;Sn[s].vel=[.3,.45,.65][k]}})},()=>{if(H[15].v)H[15].r=3;else{H[15].v=1;H[15].r=2;H[15].vel=.5}},
    ()=>{const O=pat[TI('ohat')];if(!O[14].v){O[14].v=1;clrStep(H[14])}},()=>{const s=pickA([7,15]);if(!Sn[s].v){Sn[s].v=1;Sn[s].vel=.3}}])();
  (S.roll[pi].bass||[]).forEach(b=>b.v=b.s%4===0?1:.72);syncCells(pi,TI('bass'))}
function soundsFor(sty){const st=STY[sty];
  TRACKS.forEach(t=>{if(S.lock[t.id]||(t.x&&!t.mel))return;if(t.mel){S.inst[t.id]=pickA(st.eng[t.id]||st.eng[t.x?['keys','lead','bass','pad'][TRACKS.indexOf(t)%4]:'keys']);return}
    const cur=S.dk[t.id]||'';if(cur.startsWith('smp:')||cur.startsWith('dk:'))return;/* (v293) a DUNK sound stays */const key=t.id==='ohat'?'hat':t.id;
    const opts=st.kit[key]||(DKM[key]||[]).map(o=>o[0]);const o=pickA(opts);if(o)S.dk[t.id]=o;else delete S.dk[t.id]});
  if(!S.lock.ohat&&!(S.dk.ohat||'').startsWith('smp:')&&!(S.dk.ohat||'').startsWith('dk:')){if(S.dk.hat&&!S.dk.hat.startsWith('smp:'))S.dk.ohat=S.dk.hat;else delete S.dk.ohat}}
let rolling=false;
function rollDice(){if(rolling)return;initAudio();const n=1+Math.floor(rnd()*6),d=$('#dieFace'),btn=$('#actDice');dieN=n;
  if(!d||RM){pushHist();drawDie(n);applyDice(n);return}
  rolling=true;btn.disabled=true;d.classList.remove('spin');void d.offsetWidth;d.classList.add('spin');
  /* faces tumble fast, then slow down and land — like a real throw */
  const steps=[40,45,50,60,70,85,105,130,160];let k=0,last=dieN;
  const tick=()=>{if(k<steps.length){let f;do{f=1+Math.floor(rnd()*6)}while(f===last);last=f;drawDie(f);setTimeout(tick,steps[k++])}
    else{drawDie(n);pushHist();applyDice(n);setTimeout(()=>{rolling=false;btn.disabled=false;d.classList.remove('spin')},120)}};tick()}
function applyDice(n){const pi=S.pat,pat=S.pats[pi];let msg='';const LK=TRACKS.map((t,ti)=>(S.lock[t.id]||t.mel)?{ti,row:JSON.parse(JSON.stringify(pat[ti])),roll:t.mel?JSON.parse(JSON.stringify(S.roll[pi][t.id])):null,dk:S.dk[t.id],inst:S.inst[t.id]}:null).filter(Boolean);
  let d=dState();const chName=()=>d.prog[0]===d.prog[1]?CH_NAME[d.prog[0]]:CH_NAME[d.prog[0]]+' – '+CH_NAME[d.prog[1]];
  const setSw=v=>{S.master.swing=v;if(typeof applyMaster==='function')applyMaster();try{masterKnobs.forEach(k=>k.refresh&&k.refresh())}catch(e){globalThis.__el&&globalThis.__el(e)}};
  const full=()=>{genDrumsS(pat,d.style);genBassS(pi,d);genKeysS(pi,d);genLeadS(pi,d,n);genPadS(pi,d)};
  if(n===1){varyDrumsM(pat,1+Math.floor(rnd()*2));varyMelM(pi,1);msg='liten variation'}
  else if(n===2){feelM(pat,pi);varyDrumsM(pat,1);msg='ny känsla · dynamik och fill'}
  else if(n===3){genDrumsS(pat,d.style);if(STY[d.style].B==='kick')genBassS(pi,d);msg='nytt trumgroove · '+STY[d.style].name}
  else if(n===4){genDrumsS(pat,d.style);genBassS(pi,d);genLeadS(pi,d,n);msg='nytt groove · '+STY[d.style].name}
  else{const old=d.style;let st;do{st=pickA(STY_K)}while(st===old&&chance(.8));const pr=(STY[st].prog||PROGS);S.dice=d={style:st,prog:pickA(pr)};full();setSw(STY[st].sw);
    if(n===5)msg='ny stil · '+STY[st].name;
    else{soundsFor(st);TRACKS.forEach(t=>{if(S.lock[t.id]||t.mel)return;S.len[t.id]=(t.id==='perc'&&chance(.35))?pickA([12,6]):16});refreshInst();msg='ny värld · '+STY[st].name+' · nya trumljud'}}
  LK.forEach(k=>{const t=TRACKS[k.ti];pat[k.ti].splice(0,16,...k.row);if(k.roll)S.roll[pi][t.id]=k.roll;if(k.dk)S.dk[t.id]=k.dk;else delete S.dk[t.id];if(k.inst)S.inst[t.id]=k.inst});{const nL=LK.filter(k=>S.lock[TRACKS[k.ti].id]).length;refreshInst();if(nL)msg+=' · '+nL+' låsta orörda'}
  const g=$('#grid');if(g&&!RM){g.classList.remove('diced');void g.offsetWidth;g.classList.add('diced');clearTimeout(g._dc);g._dc=setTimeout(()=>g.classList.remove('diced'),800)}
  renderAll();save();toast('Tärning '+n+' · '+msg)}
$('#actDice').onclick=rollDice;drawDie(dieN);

