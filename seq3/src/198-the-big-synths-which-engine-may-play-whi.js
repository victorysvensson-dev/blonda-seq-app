/* ---------- the big synths: which engine may play which Starter layer, and the presets that suit that role ----------
   ack = chords (needs a poly engine), klo = the top line, sub = the bass, luft = the pad. Each layer plays through its synth
   channel (ack → keys, klo → lead, sub → bass, luft → pad); an engine is shared by every channel that uses it, so one engine
   plays at most one layer. */
const BIG={
  sub:{mini:['Model D bas','Funk bas','Overload'],sh101:['101 bas','Sub-puls'],bris:['Ladderbas','Sub moog','Plockbas','Unison bas'],grime:['wob','reese','dyk','growl'],acid:null},
  ack:{bris:['Poly keys','Epiano bris','Clav-ish','Brass 6','Stab 90','House-ackord'],super:null,fm:null},
  klo:{sh101:['Lead 101','Arp-bubbla','PWM-sträng'],mini:['Prog lead','Mässing','Svep'],bris:['Solo såg','Fyrkant lead','Visslan','Glaspluck','Arp-klocka'],chip:null,fm:null},
  luft:{super:null,bris:['Bris','Molnbank','Juno dröm','Varmt glas','Nattsjö','Strings 77']}};
const ROLE_TRK={ack:'keys',klo:'lead',sub:'bass',luft:'pad'};
/* how loud each engine sits as a Starter layer (measured against the Starter's own sounds), and its octave for the role */
const BIG_LV={mini:.75,sh101:.75,bris:.72,grime:.75,acid:.72,super:.75,fm:.6,pluck:.75,chip:.7};
/* octave per engine (or engine:preset) in a role: the Moog and SH-101 bass presets sit an octave under the Starter's sub,
   the SH-101 lead two over its top line */
const BIG_OCT={'mini:sub':1,'sh101:sub':1,'bris:sub:Sub moog':1,'bris:sub:Plockbas':1,'sh101:klo:Lead 101':-1,'super:luft':1};
const octOf=(e,l,pr)=>BIG_OCT[e+':'+l+':'+pr]??BIG_OCT[e+':'+l]??0;
function engLoad(e,name){try{if(!name)return;
  if(e==='bris'&&typeof BR_PRE!=='undefined'){const p=BR_PRE.find(x=>x[1]===name);if(!p)return;Object.assign(engE('bris'),JSON.parse(JSON.stringify(BR_DEF)),p[2])}
  else if(e==='mini'||e==='sh101'){const C=e==='mini'?window.__mini:window.__sh101,p=C&&C.pre&&C.pre.find(x=>x[0]===name);if(!p)return;Object.assign(engE(e),ENG_DEF_OF(e),p[1]);if(!S.clP)S.clP={};S.clP[e]={...(S.clP[e]||{}),n:p[0]}}
  else if(e==='grime'&&typeof GR_PRE!=='undefined'){const i=GR_PRE.findIndex(x=>x[0]===name);if(i<0)return;grimeLoadPre(i)}
  if(!S.rsPre)S.rsPre={};S.rsPre[e]=name}catch(err){globalThis.__el&&globalThis.__el(err)}}
/* pick sounds for the Starter's layers: the big synths with a preset now and then (p = how often), the Starter's own otherwise */
function bigSounds(P,sty,p){const R=Math.random,pk=a=>a[Math.floor(R()*a.length)],L=P.ls,st=STY[sty]||{},used=new Set(),got=[];
  const own={ack:{'dx-piano':5,rhodes:4,flygel:3,gitarr:2,vibrafon:1,juno:2,keys:1,stack:1,korn:1},klo:{'dx-klocka':3,'dx-mallet':2,marimba:2,kalimba:2,vibrafon:2,gitarr:1,rhodes:1,glas:1},sub:{fingerbas:3,'dx-bas':2,sinus:3,kort:2,'808':2,moog:2},luft:{korn:4,mjuk:2,moln:2,'kör':1}};
  const wp=o=>{let t=0;for(const k in o)t+=o[k];let x=R()*t;for(const k in o){x-=o[k];if(x<=0)return k}return Object.keys(o)[0]};
  const free=l=>{const id=ROLE_TRK[l],i=TRACKS.findIndex(t=>t.id===id);return i>=0&&!(S.lock&&S.lock[id])&&!S.mute[i]};
  /* the big ones are picked more often; the style's own favourites count double */
  const BW={bris:3,mini:3,sh101:2.5,grime:2,acid:2,super:2,fm:1,chip:.7};
  const wpick=(L,fav)=>{const o={};L.forEach(e=>{o[e]=(BW[e]||1)*(fav.includes(e)?2:1)});return L.length?wp(o):null};
  const order=['sub','ack','luft','klo'].sort(()=>R()-.5);
  order.forEach(l=>{L[l].snd=wp(own[l]);L[l].tw=Math.floor(R()*1e6);delete L[l].ch;L[l].oct=l==='sub'?0:L[l].oct;
    if(!P.lay[l]||!free(l)||R()>=p)return;
    const okE=Object.keys(BIG[l]).filter(e=>!used.has(e)),fav=((st.eng||{})[ROLE_TRK[l]]||[]).filter(e=>okE.includes(e));
    const e=wpick(okE,fav);if(!e)return;used.add(e);got.push([l,e])});
  /* never an idea without a big synth: if the dice gave none, the bass or the chords get one */
  if(!got.length){const l=['sub','ack'].find(l=>P.lay[l]&&free(l));if(l){const okE=Object.keys(BIG[l]),fav=((st.eng||{})[ROLE_TRK[l]]||[]).filter(e=>okE.includes(e));const e=wpick(okE,fav);used.add(e);got.push([l,e])}}
  got.forEach(([l,e])=>{const id=ROLE_TRK[l],pre=BIG[l][e];L[l].snd='e:'+e;L[l].ch=id;S.inst[id]=e;L[l].lv=BIG_LV[e]||.7;const pn=pre?pk(pre):null;L[l].oct=octOf(e,l,pn);if(pn)engLoad(e,pn)});
  engRefresh();return got.map(([l,e])=>e)}
/* a fatter idea: more layers, a big synth or two, a bit of drive, pump on the four-to-the-floor styles, wider */
function fatten(P,sty){const R=Math.random,rng=(a,b)=>+(a+R()*(b-a)).toFixed(2),four=['house','techno','disco','garage','afro','synthwave'].includes(sty);
  P.lay.luft=P.lay.luft||(R()<.5?1:0);if(Object.values(P.lay).reduce((a,b)=>a+b,0)<3){P.lay.ack=1;P.lay.sub=1;if(R()<.6)P.lay.klo=1}
  const big=bigSounds(P,sty,.62);
  const k=P.k;k.drv=R()<.55?rng(.08,.3):k.drv;k.br=Math.max(k.br,rng(.45,.75));if(four)k.pump=Math.max(k.pump,rng(.25,.55));if(sty==='lofi'){k.tejp=Math.max(k.tejp,rng(.35,.6));k.drv=Math.max(k.drv,.12)}
  if(sty==='synthwave'){k.eko=Math.max(k.eko,rng(.2,.35));k.rum=Math.max(k.rum,rng(.2,.35))}
  return big}
/* more styles for the dice (the main dice gets them too) */
Object.assign(STY,{
  garage:{name:'uk garage',sw:.22,K:['X.........X.....','X......x..X.....','X.........x..x..'],S:['....X.......X...'],C:['','....x.......x...'],
    H:['..x...x...x...x.','g.x.g.x.g.x.g.x.','..x..gx...x..gx.'],O:['','..............x.'],P:['','...g......g.....','.......g.......g'],
    B:['x.......x.x.....','x..x......x.....','x.....x...x..x..'],KY:['x--...x--.......','..x-....x-......','x-.x-...x-......'],L:['x..x..x.','.x..x.x.','x.x...x.'],pad:.5,bassOct:.2,
    kit:{kick:['','thump'],snare:['rim','909'],hat:['shaker','tick'],perc:['','clave']},eng:{bass:['sub','mini','bris'],keys:['bris','fm','pluck'],lead:['pluck','bris','fm'],pad:['super','bris']}},
  afro:{name:'afro house',sw:.14,K:['X...X...X...X...'],S:[''],C:['','....x.......x...'],
    H:['..x...x...x...x.','g.x.g.xgg.x.g.xg'],O:[''],P:['..g..g..g.g..g..','g..g..g...g..g..','.g..g.g..g..g.g.'],
    B:['x..x..x...x..x..','x.....x.x.....x.'],KY:['..x...x...x...x.','x..x..x.........'],L:['x.x..x..','..x..x.x'],pad:.6,bassOct:.15,
    kit:{kick:['','909'],snare:['rim',''],hat:['shaker','909'],perc:['conga','tom','clave']},eng:{bass:['mini','analog','bris'],keys:['bris','pluck','fm'],lead:['pluck','fm','bris'],pad:['super','bris']}},
  lofi:{name:'lofi',sw:.38,K:['X......x..X.....','X.........X..x..','X..x.....xX.....'],S:['....X.......X...','....X......g.X..'],C:[''],
    H:['x.x.x.x.x.x.x.x.','x.xgx.x.x.xgx.x.'],O:[''],P:['','..........g.....'],
    B:'kick',KY:['x-------x-------','x-----..x-----..'],L:['x...x...','..x...x.'],pad:.7,bassOct:0,
    kit:{kick:['','thump'],snare:['lofi','rim'],hat:['shaker','tick'],perc:['','conga']},eng:{bass:['sub','mini'],keys:['fm','bris','pluck'],lead:['pluck','fm'],pad:['super','bris']}},
  synthwave:{name:'synthwave',sw:0,K:['X...X...X...X...','X.......X.x.....'],S:['....X.......X...'],C:['','....x.......x...'],
    H:['x.x.x.x.x.x.x.x.','xxxxxxxxxxxxxxxx'],O:['','..x...x...x...x.'],P:['','..............x.'],
    B:'oct',KY:['x-------x-------','x---x---x---x---'],L:['x.x.x.x.','x...x.x.'],pad:.8,bassOct:.3,
    kit:{kick:['909',''],snare:['909','808'],hat:['909'],perc:['tom','']},eng:{bass:['mini','sh101','bris'],keys:['bris','super'],lead:['mini','sh101','bris'],pad:['super','bris']}},
  drill:{name:'drill',sw:.06,K:['X.........x.....','X......x...x....','X.....x.....x...'],S:['........X.......'],C:[''],
    H:['x..x..x.x..x..x.','x.x.x..xx.x.x..x','x..x.x..x..x.x.x'],O:[''],P:['','......g......g..'],
    B:'kick',KY:['x-------........','x-------x-------'],L:['x...x...','..x...x.'],pad:.6,bassOct:0,bassLong:1,
    kit:{kick:['808'],snare:['808','rim'],hat:['tick',''],perc:['','clave']},eng:{bass:['sub','grime'],keys:['bris','fm'],lead:['pluck','bris','chip'],pad:['super','bris']}},
  dnb:{name:'drum & bass',sw:.04,K:['X.........X.....','X.........x..x..','X.x.......X.....'],S:['....X.......X...','....X..g....X..g'],C:[''],
    H:['x.x.x.x.x.x.x.x.','x.xgx.x.x.xgx.xg'],O:['','..............x.'],P:['','......g.......g.'],
    B:['x.......x.x.....','x...........x...','x.....x...x.....'],KY:['x-------........','x-------x-------'],L:['x.x.....','x...x.x.'],pad:.7,bassOct:0,
    kit:{kick:['','thump'],snare:['909',''],hat:['','909'],perc:['','tom']},eng:{bass:['sub','grime','mini'],keys:['bris','fm'],lead:['pluck','bris'],pad:['super','bris']}}});
['garage','afro','lofi','synthwave','drill','dnb'].forEach(k=>{if(!STY_K.includes(k))STY_K.push(k)});
const BPMR={house:[118,126],techno:[124,134],hiphop:[84,96],electro:[108,126],trap:[130,150],disco:[112,122],brk:[126,140],garage:[130,136],afro:[120,124],lofi:[76,88],synthwave:[96,108],drill:[138,146],dnb:[170,176]};
/* (v254) the key of new ideas: any (as before), or locked to one key, or to minor / major only */
let keyLock=(()=>{try{const k=JSON.parse(localStorage.getItem('blonda.duo.key')||'null');return k&&typeof k.r==='number'?k:{r:-1,m:'any'}}catch(e){return {r:-1,m:'any'}}})();
const KEYN=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const keyLbl=()=>keyLock.r<0?(keyLock.m==='any'?'any':keyLock.m==='moll'?'any m':'any maj'):KEYN[keyLock.r]+(keyLock.m==='moll'?'m':keyLock.m==='dur'?'':'');
/* set right after the key is chosen and before rhythm, top line and sounds are made, so all of them are made in the locked key */
function applyKey(P,R0){if(keyLock.r>=0)P.root=keyLock.r;if(keyLock.m==='any'||P.mode===keyLock.m)return;P.mode=keyLock.m;
  if(R0){P.custom={mode:P.mode,ch:styChords(R0,P.mode),nm:R0.nm};return}
  if(P.custom)P.custom={mode:P.mode,ch:stxRoll(P)};else P.prog=Math.floor(Math.random()*STX_BANK[P.mode].length)}
let bpmLock=(()=>{try{return localStorage.getItem('blonda.duo.bpmlock')==='1'}catch(e){return false}})();
const LK_ON='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>',LK_OFF='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5-.6"/></svg>';
function bpmNew(){if(bpmLock)return '';const st=(S.dice&&S.dice.style)||'house',r=BPMR[st]||[100,128];const v=Math.round(r[0]+Math.random()*(r[1]-r[0]));S.bpm=v;try{setBpm(v)}catch(e){globalThis.__el&&globalThis.__el(e)}return ' · '+v+' bpm'}
/* a new idea or new chords = new key/harmony: the old bass, keys, lead and pad in this pattern would clash when you go back,
   so empty them (locked tracks are kept; undo in idea mode brings them back, since the idea state includes the notes) */
function melClear(){const pi=S.pat;if(!S.roll[pi])S.roll[pi]={};MELT.forEach(ti=>{const id=TRACKS[ti].id;if(S.lock&&S.lock[id])return;S.roll[pi][id]=[];try{syncCells(pi,ti)}catch(e){cellsClear(S.pats[pi][ti])}})}
