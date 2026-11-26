/* ---------- the card: Orbit-style — the loop as rings, controls on the side, knobs, fx pads; "avancerat" opens the editor ---------- */
(()=>{const card=document.querySelector('.card[data-card="starter"]'),box=document.getElementById('stBox');if(!card||!box)return;
  card.classList.remove('st2');card.classList.add('stx');
  const SNDS=lay=>(lay==='sub'?STX_SUBS.concat(INS_SUB):STX_POLY.concat(INS_POLY)).concat(STX_ENG.map(e=>'e:'+e),STX_TRK);
  const NOTE=n=>STX_NN[((n%12)+12)%12]+(Math.floor(n/12)-1);
  let nTab=(()=>{try{return localStorage.getItem('blonda.stx.nt')||'klo'}catch(e){return 'klo'}})(),nInfo='';
  box.innerHTML=`<div class="sx-wrap"><div class="sx-orb"><canvas></canvas><div class="sx-mid"><b class="sx-big"></b><small class="sx-sub"></small></div></div>
    <div class="sx-side"><div class="sx-pre"><button data-pd="-1" aria-label="Förra förvalet">‹</button><button class="sx-pn" data-pl title="Alla förval"><small>förval</small><b></b></button><button data-pd="1" aria-label="Nästa förval">›</button></div>
      <button class="sx-tempo" data-pt title="Sätt låtens tempo till förvalets">tempo <b></b></button>
      <div class="sx-plist" hidden>${STX_PRE.map((r,i)=>`<button data-pi="${i}"><b>${r.nm}</b><small>${STX_NN[r.root]} ${r.mode} · ${r.bpm}</small></button>`).join('')}</div>${[['root','ton'],['mode','skala'],['prog','ackord'],['rn','rytm'],['snd','ljud'],['vc','läge'],['arp','topp'],['form','form']].map(([k,l])=>`<div class="sx-ctl" data-k="${k}"><span>${l}</span><button data-d="-1" aria-label="${l} bakåt">−</button><b></b><button data-d="1" aria-label="${l} framåt">+</button></div>`).join('')}
      <div class="sx-dice"><button data-x="ch">nya ackord</button><button data-x="all">slumpa allt</button></div><div class="sx-snap"><button data-h="u" title="Ångra (Starter)" aria-label="Ångra">↶</button><button data-h="r" title="Gör om (Starter)" aria-label="Gör om">↷</button>${[0,1,2,3].map(i=>`<button data-sn="${i}" title="Minne ${i+1}: tryck = spara / hämta · håll = spara över"><b>${i+1}</b><small></small></button>`).join('')}</div></div></div>
    <div class="sx-lay">${STX_LAY.map(([k,l,c])=>`<button data-l="${k}" style="--c:${c}"><i></i>${l}</button>`).join('')}<span class="sx-sp"></span><button class="sx-on" data-on>av</button><button class="sx-play" data-play>▶ spela</button></div>
    <div class="sx-fol"><button data-fol title="Synth-spåren i mönstren följer Starterns ackord">mönstren följer</button><button data-src title="Var ackorden kommer ifrån">ackord från <b></b></button><span class="sx-sp"></span><button data-mid title="Exportera MIDI: topp, ackord, sub, luft och mönstren">⤓ midi</button><button data-adv>avancerat</button></div>
    <div class="sx-smp">${[0,1].map(k=>`<div class="sx-sr" data-s="${k}"><button class="sx-son" data-so title="På/av – bågen i ringarna visar var den kommer"><i style="--c:${k?'#FF8A3D':'#F3EEDD'}"></i>${k?'ljud':'röst'}</button><button class="sx-sn" data-sp title="Välj ljud från biblioteket – eller släpp en fil här"><b>välj ljud…</b><small></small></button><button class="sx-sm" data-sm title="Klipp = bitar av rösten mellan ackorden · ett = hela ljudet på ackordet">klipp</button><button class="sx-so" data-oc="-1" aria-label="Oktav ner">−</button><span class="sx-oct">0</span><button class="sx-so" data-oc="1" aria-label="Oktav upp">+</button><div class="sx-k" data-sk="amt"><span class="r"></span><b></b><em>ofta</em></div><div class="sx-k" data-sk="lv"><span class="r"></span><b></b><em>nivå</em></div><div class="sx-k" data-sk="fx"><span class="r"></span><b></b><em>fx</em></div><div class="sx-pick" hidden></div></div>`).join('')}</div>
    <div class="sx-knobs">${STX_K.map(([k,l])=>`<div class="sx-k" data-k="${k}"><span class="r"></span><b></b><em>${l}</em></div>`).join('')}</div>
    <div class="sx-adv" hidden></div>
    <div class="sx-sec"><span>fx</span><small>håll för att spela · pricken = med i loopen</small></div>
    <div class="sx-fx">${STX_FX.map(f=>`<button data-f="${f.id}"><span>${f.nm}</span><small>${f.b===-1?'takt 1 + 3':f.b===-2?'före fraser':'takt '+(f.b+1)}</small><i class="sx-in" title="Med i loopen"></i></button>`).join('')}</div>
`;
  /* two column boxes: invisible in the card (display:contents), real columns in fullscreen */
  {const c1=document.createElement('div'),c2=document.createElement('div');c1.className='sx-c1';c2.className='sx-c2';const adv0=box.querySelector('.sx-adv');
    box.insertBefore(c1,box.firstChild);['.sx-wrap','.sx-lay','.sx-fol'].forEach(q=>{const e=box.querySelector(':scope>'+q);if(e)c1.appendChild(e)});
    c1.after(c2);['.sx-smp','.sx-knobs','.sx-sec','.sx-fx'].forEach(q=>{const e=box.querySelector(':scope>'+q);if(e)c2.appendChild(e)});if(adv0)c2.after(adv0)}
  box.querySelector('.sx-orb').title='Tryck på en prick i ringarna för att ändra rytmen';
  const cv=box.querySelector('canvas'),orb=box.querySelector('.sx-orb'),big=box.querySelector('.sx-big'),sub=box.querySelector('.sx-sub'),adv=box.querySelector('.sx-adv');
  let advOpen=(()=>{try{return localStorage.getItem('blonda.stx.adv')==='1'}catch(e){return false}})(),selSlot=0;
  const commit=(re)=>{save();if(STX.E)STX.E.apply(stx());paint(re)};
  const cyc=(L,v,d)=>{const i=L.indexOf(v);return L[((i<0?0:i)+d+L.length)%L.length]};
  const LISTS={root:()=>STX_NN,mode:()=>['moll','dur'],prog:P=>STX_BANK[P.mode].map(p=>p[0]),rn:()=>Object.keys(STX_RH),snd:()=>SNDS('ack'),arp:()=>STX_ARP,vc:()=>['tät','vid'],form:()=>STX_FORMN};
  const sndShow=(lay,s)=>s&&s.startsWith('e:')?stxSndName('e:'+(S.inst[stxTrkOf(lay,s)]||s.slice(2))):stxSndName(s);
  const val=(P,k)=>k==='root'?STX_NN[P.root]:k==='prog'?stxProgName(P):k==='rn'?(P.pat?'förvalets':P.rh?'egen':P.rn):k==='snd'?sndShow('ack',P.ls.ack.snd):k==='form'?(P.form||'allt'):P[k];
  /* moving the key moves chords that were taken from the piano too */
  const setRoot=(P,r)=>{const d=r-P.root;if(stxIsOwn(P))P.custom.ch=P.custom.ch.map(e=>Array.isArray(e)?e:{...e,r:(e.r+d+12)%12,name:STX_NN[(e.r+d+12)%12]+e.name.replace(/^[A-G][#b]?/,'')});P.root=(r+12)%12};
  box.querySelectorAll('.sx-ctl').forEach(el=>{const k=el.dataset.k;el.querySelectorAll('button').forEach(bt=>bt.onclick=()=>{const P=stx(),L=LISTS[k](P),d=+bt.dataset.d;
    if(k==='root')setRoot(P,P.root+d);
    else if(k==='prog'){if(P.src==='piano')P.src='starter';const i=stxIsOwn(P)?(d>0?-1:0):P.prog;P.prog=(i+d+L.length)%L.length;P.custom=null}
    else if(k==='rn'){const i=P.rh||P.pat?(d>0?-1:0):L.indexOf(P.rn);P.rn=L[(i+d+L.length)%L.length];P.rh=null;P.pat=null;P.pre=-1}
    else if(k==='snd'){P.ls.ack.snd=cyc(L,P.ls.ack.snd,d)}
    else{P[k]=cyc(L,P[k],d);if(k==='mode'){P.prog=0;P.custom=null}}
    commit(true)})});
  box.querySelectorAll('.sx-dice button').forEach(bt=>bt.onclick=()=>{const P=stx();if(P.src==='piano')P.src='starter';P.custom={mode:P.mode,ch:stxRoll(P)};
    P.pre=-1;if(bt.dataset.x==='all')stxDiceAll(P);else P.seed=Math.floor(Math.random()*1e6);
    commit(true);toast('Starter · '+STX_NN[P.root]+' '+P.mode+' · '+stxChords(P).map(c=>c.name).join(' – ')+(P.form&&P.form!=='allt'?' · form: '+P.form:''))});
  box.querySelectorAll('.sx-lay [data-l]').forEach(bt=>bt.onclick=()=>{const P=stx(),k=bt.dataset.l;P.lay[k]=P.lay[k]?0:1;if(!P.lay[k]&&STX.E)STX.E.choke(k,ctx.currentTime);commit()});
  box.querySelector('[data-on]').onclick=()=>{initAudio();const P=stx();P.on=P.on?0:1;if(!P.on&&STX.E)STX.E.kill();else stxEnsure();commit();toast(P.on?'Startern spelar med':'Startern är av')};
  box.querySelector('[data-play]').onclick=()=>{initAudio();ctx.resume();const P=stx();if(!P.on){P.on=1;stxEnsure();commit()}if(playing)stop();else play();paint()};
  box.querySelector('[data-fol]').onclick=()=>{const P=stx();P.fol.on=P.fol.on?0:1;commit();toast(P.fol.on?'Mönstrens synthar följer Starterns ackord':'Mönstren spelar som de är skrivna')};
  box.querySelector('[data-src]').onclick=()=>{const P=stx();P.src=P.src==='piano'?'starter':'piano';commit(true);toast(P.src==='piano'?(STX.live?'Startern följer pianot · '+STX.live.name:'Startern följer pianot · spela ett ackord med ackordläget på'):'Startern spelar sina egna ackord')};
  box.querySelector('[data-mid]').onclick=()=>midiExport({starter:true});
  box.querySelector('[data-adv]').onclick=()=>{advOpen=!advOpen;try{localStorage.setItem('blonda.stx.adv',advOpen?'1':'0')}catch(e){globalThis.__el&&globalThis.__el(e)}paint()};
  /* sample slots: a voice to chop (röst) and a one-shot (ljud) from the library — pick from the list, or drop a file on the row */
  const smpRows=[...box.querySelectorAll('.sx-sr')];
  const smpList=()=>typeof SMP==='undefined'?[]:[...SMP.values()].filter(x=>x.kind==='loop'||x.kind==='hit').sort((a,b)=>(STX_FABSMP.includes(b.id)||STX_SNDSMP.includes(b.id)?2:0)-(STX_FABSMP.includes(a.id)||STX_SNDSMP.includes(a.id)?2:0)||(b.pack?0:1)-(a.pack?0:1)||(b.t||0)-(a.t||0));
  const setSmp=(k,id)=>{const Q=stx().smp[k];Q.id=id;Q.on=id?1:0;if(id!=='kit:vox')delete STX.sb[id];stxSmpLoad(id);commit(true);const sm=id==='kit:vox'?{name:'röster · inbyggda'}:SMP.get(id);if(sm)toast((k?'Ljud':'Röst')+' · '+sm.name)};
  smpRows.forEach(row=>{const k=+row.dataset.s,pick=row.querySelector('.sx-pick');
    row.querySelector('[data-so]').onclick=()=>{const Q=stx().smp[k];if(!Q.id){row.querySelector('[data-sp]').click();return}Q.on=Q.on?0:1;commit(true)};
    row.querySelector('[data-sm]').onclick=()=>{const Q=stx().smp[k];Q.mode=Q.mode==='ett'?'klipp':'ett';if(Q.id)delete STX.sb[Q.id];stxSmpLoad(Q.id);commit(true)};
    row.querySelectorAll('[data-oc]').forEach(b=>b.onclick=()=>{const Q=stx().smp[k];Q.oct=Math.max(-2,Math.min(2,(Q.oct|0)+(+b.dataset.oc)));commit()});
    row.querySelector('[data-sp]').onclick=()=>{if(!pick.hidden){pick.hidden=true;return}const L=smpList(),cur=stx().smp[k].id;
      pick.innerHTML=`<button data-add>+ lägg till en fil…</button><button data-id="kit:vox" class="${cur==='kit:vox'?'cur':''}">röster · inbyggda<small>${Object.keys(STX_VOXN).length} bitar · följer ackorden</small></button>`+L.slice(0,80).map(x=>`<button data-id="${x.id}" class="${x.id===cur?'cur':''}">${x.name.replace(/[<>&]/g,'')}<small>${x.kind==='hit'?'one-shot':'loop'}${x.pack?' · paket':''}</small></button>`).join('')+(cur?`<button data-none>ta bort</button>`:'');pick.hidden=false;
      pick.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{pick.hidden=true;setSmp(k,b.dataset.id)});
      const nb=pick.querySelector('[data-none]');if(nb)nb.onclick=()=>{pick.hidden=true;const Q=stx().smp[k];Q.id=null;Q.on=0;commit(true)};
      pick.querySelector('[data-add]').onclick=()=>{const inp=document.createElement('input');inp.type='file';inp.accept='audio/*';inp.onchange=()=>addFiles(k,inp.files);inp.click();pick.hidden=true}};
    const addFiles=async(k,files)=>{if(!files||!files.length||typeof importFiles!=='function')return;const t0=Date.now()-1;await importFiles(files);const nw=smpList().filter(x=>(x.t||0)>=t0).sort((a,b)=>b.t-a.t)[0];if(nw)setSmp(k,nw.id)};
    row.addEventListener('dragover',e=>{e.preventDefault();row.classList.add('drop')});row.addEventListener('dragleave',()=>row.classList.remove('drop'));
    row.addEventListener('drop',e=>{e.preventDefault();row.classList.remove('drop');addFiles(k,e.dataTransfer&&e.dataTransfer.files)});
    row.querySelectorAll('[data-sk]').forEach(w=>{const a=w.dataset.sk;knob(w,()=>stx().smp[k][a]??.5,v=>{stx().smp[k][a]=v;if(a!=='lv')STX.pk=''},a==='lv'?.6:a==='fx'?.5:.35,null,'x.smp.'+k+'.'+a,(k?'ljud':'röst')+' '+({lv:'nivå',fx:'fx',amt:'ofta'}[a]))})});
  /* presets: ‹ › steps through them, the name opens the list, tempo sets the song's tempo to the preset's */
  const plist=box.querySelector('.sx-plist');
  const loadPre=i=>{const P=stx();const n=STX_PRE.length;i=((i%n)+n)%n;stxLoadPre(P,i);if(STX.E){STX.E.kill();STX.E.apply(P)}commit(true);try{refreshSound()}catch(e){globalThis.__el&&globalThis.__el(e)}plist.hidden=true;
    toast('Starter · '+STX_PRE[i].nm+' · '+stxChords(P).map(c=>c.name).filter((c,j,a)=>a.indexOf(c)===j).join(' – '))};
  box.querySelectorAll('[data-pd]').forEach(bt=>bt.onclick=()=>{const P=stx();loadPre(P.pre>=0?P.pre+(+bt.dataset.pd):(+bt.dataset.pd>0?0:STX_PRE.length-1))});
  box.querySelector('[data-pl]').onclick=()=>{plist.hidden=!plist.hidden;paint()};
  plist.querySelectorAll('[data-pi]').forEach(bt=>bt.onclick=()=>loadPre(+bt.dataset.pi));
  box.querySelector('[data-pt]').onclick=()=>{const P=stx(),R=STX_PRE[P.pre];if(!R)return;setBpm(R.bpm);toast('Tempo '+R.bpm+' bpm');paint()};
  /* knobs: drag up / right = more, double tap = back to the start value. get/set make them work for any value */
  function knob(w,get,set,d0,fmt,key,label){let on=false,x0=0,y0=0,v0=0,lt=0;const pk=()=>{const v=get();w.style.setProperty('--v',v);w.querySelector('b').textContent=fmt?fmt(v):Math.round(v*100)};
    if(key&&typeof mlReg==='function')mlReg(w,{key,label:(label||key)+' · starter',min:0,max:1,paint:pk});
    w.addEventListener('pointerdown',e=>{e.preventDefault();const n=performance.now();if(n-lt<300){set(d0);pk();commit();lt=0;return}lt=n;on=true;x0=e.clientX;y0=e.clientY;v0=get();w.classList.add('drag');try{w.setPointerCapture(e.pointerId)}catch(_){globalThis.__el&&globalThis.__el(_)}});
    w.addEventListener('pointermove',e=>{if(!on)return;set(Math.round(clamp(v0+((e.clientX-x0)-(e.clientY-y0))/180,0,1)*100)/100);if(STX.E)STX.E.apply(stx());pk()});
    const up=()=>{if(on){on=false;w.classList.remove('drag');save();STX.pk=''}};w.addEventListener('pointerup',up);w.addEventListener('pointercancel',up);w._pk=pk;pk()}
  box.querySelectorAll('.sx-knobs .sx-k').forEach(w=>{const k=w.dataset.k,q=STX_K.find(q=>q[0]===k);knob(w,()=>stx().k[k],v=>{stx().k[k]=v},q[2],null,'x.k.'+k,q[1])});
  /* fx pads: hold = live, the dot = written into the loop */
  box.querySelectorAll('.sx-fx button').forEach(bt=>{const id=+bt.dataset.f,dot=bt.querySelector('.sx-in');let held=false;
    dot.addEventListener('pointerdown',e=>e.stopPropagation());dot.onclick=e=>{e.stopPropagation();const P=stx();P.fx[id]=P.fx[id]?0:1;commit();toast(STX_FX.find(f=>f.id===id).nm+(P.fx[id]?' är med i loopen':' är inte med i loopen'))};
    bt.addEventListener('pointerdown',e=>{if(e.target.closest('.sx-in'))return;e.preventDefault();initAudio();ctx.resume();const E=stxEnsure();if(!E)return;E.P=stx();held=true;bt.classList.add('hold');try{bt.setPointerCapture(e.pointerId)}catch(_){globalThis.__el&&globalThis.__el(_)}E.live(id,true,stepDur())});
    const rel=()=>{if(!held)return;held=false;bt.classList.remove('hold');if(STX.E)STX.E.live(id,false,stepDur())};bt.addEventListener('pointerup',rel);bt.addEventListener('pointercancel',rel);bt.addEventListener('lostpointercapture',rel)});
  const toggleStep=(i)=>{const b=i>>4,s=i&15,P=stx(),R=stxRh(P).slice();R[b]=R[b].slice(0,s)+(R[b][s]==='x'?'.':'x')+R[b].slice(s+1);P.rh=R;P.pat=null;P.pre=-1;commit(true)};
  orb.addEventListener('pointerdown',e=>{const r=cv.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,d=Math.hypot(x,y)/(r.width/2);
    if(d<.42||d>.9)return;let a=Math.atan2(y,x)+Math.PI/2;if(a<0)a+=Math.PI*2;toggleStep(Math.round(a/(Math.PI*2)*64)%64)});

  /* ---------- advanced: chords, rhythm, layers, groove + melody, follow ---------- */
  const ctl=(k,l,v)=>`<div class="sx-ctl" data-a="${k}"><span>${l}</span><button data-d="-1" aria-label="${l} bakåt">−</button><b>${v}</b><button data-d="1" aria-label="${l} framåt">+</button></div>`;
  const kn=(k,l)=>`<div class="sx-k" data-a="${k}"><span class="r"></span><b></b><em>${l}</em></div>`;
  function buildAdv(){const P=stx(),pl=stxPlanCached(),ch=pl.ch,own=stxIsOwn(P)&&P.src!=='piano',prog=stxProg(P),R=stxRh(P);if(selSlot>=ch.length)selSlot=0;
    const cur=P.src==='piano'?null:prog[selSlot],cq=cur?(Array.isArray(cur)?cur[1]:stxNearQ(cur.iv)):'';
    let h=`<div class="sx-sec"><span>ackord</span><small>${P.src==='piano'?'följer pianot live · spela ackord på pianot (ackordläge)':'tryck på en plats och välj grundton och sort'}</small></div>
      <div class="sx-slots" style="--n:${ch.length}">${ch.map((c,i)=>`<button data-slot="${i}" class="${i===selSlot&&P.src!=='piano'?'on':''}"><b>${c.name}</b><small>${ch.length>4?'takt '+((i>>1)+1)+(i%2?' · b':' · a'):'takt '+(i+1)}</small></button>`).join('')}</div>`;
    if(P.src!=='piano'){const r=Array.isArray(cur)?(P.root+cur[0])%12:cur.r;
      h+=`<div class="sx-row">${ctl('sr','grundton',STX_NN[r])}<div class="sx-chips">${Object.keys(STX_Q).map(q=>`<button data-q="${q}" class="${q===cq?'on':''}">${STX_NN[r]}${STX_QN[q]}</button>`).join('')}</div></div>`}
    h+=`<div class="sx-row sx-btns"><button data-x="two">${ch.length>4?'två per takt':'ett per takt'}</button><button data-x="cap" ${STX.hist.length?'':'disabled'}>hämta från pianot${STX.hist.length?' · '+Math.min(STX.hist.length,ch.length>4?8:4):''}</button><button data-x="src">${P.src==='piano'?'pianot styr live':'egna ackord'}</button><button data-x="kb">öppna pianot</button></div>
      <div class="sx-sec"><span>toner</span><small>${nTab==='klo'?'tryck = lägg till eller flytta en ton · tryck på en ton = ta bort (då spelar bara ackordet där)':nTab==='sub'?'tryck = välj basens ton för det ackordet':'tryck = lägg till eller ta bort en ton i ackordet (gäller hela ackordet)'}</small></div>
      <div class="sx-ntabs">${STX_LAY.map(([k,l,c])=>`<button data-nt="${k}" style="--c:${c}" class="${k===nTab?'on':''}"><i></i>${l}</button>`).join('')}<span class="sx-sp"></span><span class="sx-ninfo">${nInfo}</span><span class="sx-zm"><button data-z="-1" aria-label="Zooma ut">−</button><b>${Math.round(RZ.x*100)}%</b><button data-z="1" aria-label="Zooma in">+</button></span><button data-x="nrst" class="sx-nr">återställ ${STX_LAY.find(x=>x[0]===nTab)[1]}</button></div>
      <div class="sx-roll"><canvas></canvas><div class="sx-rbar"><i></i></div></div>
      <div class="sx-sec"><span>rytm</span><small>alla lager följer rytmen · ackord på fraser, topp, sub och luft håller</small></div>
      <div class="sx-grid">${R.map((r,b)=>`<div class="sx-gr"><span>${b+1}</span>${[...r].map((x,s)=>`<i data-g="${b*16+s}" class="${x==='x'?'on':''}${s%4===0?' q':''}"></i>`).join('')}</div>`).join('')}</div>
      <div class="sx-row sx-btns"><button data-x="rr">slumpa rytm</button><button data-x="c1">takt 1 → alla</button><button data-x="fill">fyll</button><button data-x="clr">töm</button><button data-x="dbl">tätare</button></div>
      <div class="sx-sec"><span>lager</span><small>varje lager skriver sina toner i sitt syntspår, mönster A–D · ljudet väljer du här eller i synth-kortet · lås spåret så rör Starter det inte</small></div>
      <div class="sx-strips">${STX_LAY.map(([k,l,col])=>{const L=P.ls[k],tk=stxTrkOf(k,L.snd);return `<div class="sx-strip" data-lay="${k}" style="--c:${col}"><div class="sx-sh"><i></i><b>${l}</b>${tk?`<button data-ed="${tk}">ändra ljud ›</button>`:''}</div>
        ${ctl('snd','ljud',sndShow(k,L.snd))}${ctl('oct','oktav',(L.oct>0?'+':'')+L.oct)}${tk?`<small class="sx-via">${S.lock&&S.lock[tk]?'syntspår '+tk+' är låst · Starter skriver inte där':'skrivs i syntspår '+tk+' · mönster A–D'}</small>`:''}<div class="sx-sk">${kn('lv','nivå')}${kn('len','längd')}${kn('ton','ton')}</div>${L.arp?`<div class="sx-arp${L.arp.on?' on':''}"><div class="sx-arh"><button data-arp="on" class="${L.arp.on?'on':''}">arp ${L.arp.on?'på':'av'}</button>${L.arp.on?`<button data-arp="fill" title="Bara i fraserna, eller hela takten">${L.arp.fill?'hela takten':'i fraserna'}</button>`:''}</div>${L.arp.on?ctl('ar','takt',L.arp.rate)+ctl('am','väg',L.arp.mode)+ctl('ao','oktaver',L.arp.oct)+`<div class="sx-sk one">${kn('ag','gate')}</div>`:''}</div>`:''}</div>`}).join('')}</div>
      <div class="sx-sec"><span>groove och melodi</span><small>sving på 16-delarna · lat = toppen ligger bakom · lös = små skillnader i tid och styrka</small></div>
      <div class="sx-row"><div class="sx-sk wide">${kn('sving','sving')}${kn('lat','lat')}${kn('human','lös')}${kn('dens','täthet')}</div>${ctl('reg','läge',['låg','mellan','hög'][P.mel.reg])}<div class="sx-btns"><button data-x="mel">ny melodi</button></div></div>
      <div class="sx-sec"><span>följ</span><small>hur synth-spåren i mönstren följer ackorden · rot = grundton · ackord = ackordets toner · skala = Starterns tonart</small></div>
      <div class="sx-row sx-folr">${['bass','keys','lead','pad'].map(id=>ctl('fol:'+id,id,P.fol[id])).join('')}</div>`;
    adv.innerHTML=h;
    /* wire */
    adv.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{selSlot=+b.dataset.slot;if(P.src==='piano'){P.src='starter';P.custom={mode:P.mode,ch:pl.ch.map(c=>({r:c.r,iv:c.iv,name:c.name}))}}buildAdv()});
    const mkOwn=()=>{if(!stxIsOwn(P))P.custom={mode:P.mode,ch:stxProg(P).map(e=>Array.isArray(e)?e.slice():{...e})}};
    const setSlot=(r,q)=>{mkOwn();P.custom.ch[selSlot]=[((r-P.root)%12+12)%12,q];commit(true)};
    adv.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{const c=stxCh(P,stxProg(P)[selSlot]);setSlot(c.r,b.dataset.q)});
    adv.querySelectorAll('.sx-ctl[data-a]').forEach(el=>{const a=el.dataset.a;el.querySelectorAll('button').forEach(bt=>bt.onclick=()=>{const d=+bt.dataset.d;
      if(a==='sr'){const e=stxProg(P)[selSlot],c=stxCh(P,e);setSlot((c.r+d+12)%12,Array.isArray(e)?e[1]:stxNearQ(c.iv));return}
      if(a==='reg'){P.mel.reg=Math.max(0,Math.min(2,P.mel.reg+d));commit(true);return}
      if(a.startsWith('fol:')){const id=a.slice(4);P.fol[id]=cyc(STX_FOL,P.fol[id],d);commit();return}
      const lay=el.closest('[data-lay]')&&el.closest('[data-lay]').dataset.lay;if(!lay)return;const L=P.ls[lay];
      if(a==='snd'){const curE=L.snd.startsWith('e:')?'e:'+(S.inst[stxTrkOf(lay,L.snd)]||L.snd.slice(2)):L.snd;L.snd=cyc(SNDS(lay),curE,d);if(L.snd.startsWith('e:')){S.inst[stxTrkOf(lay,L.snd)]=L.snd.slice(2);try{refreshSound()}catch(e){globalThis.__el&&globalThis.__el(e)}}if(STX.E)STX.E.choke(lay,ctx?ctx.currentTime:0)}
      else if(a==='ch'){const eng=S.inst[stxTrkOf(lay,L.snd)]||L.snd.slice(2);L.ch=cyc(['bass','keys','lead','pad'],stxTrkOf(lay,L.snd),d);S.inst[L.ch]=eng;L.snd='e:'+eng;try{refreshSound()}catch(e){globalThis.__el&&globalThis.__el(e)}}else if(a==='oct')L.oct=Math.max(-2,Math.min(2,L.oct+d));
      else if(a==='ar')L.arp.rate=cyc(STX_ARL,L.arp.rate,d);else if(a==='am')L.arp.mode=cyc(STX_AM,L.arp.mode,d);else if(a==='ao')L.arp.oct=Math.max(1,Math.min(3,L.arp.oct+d));commit(true)})});
    adv.querySelectorAll('[data-arp]').forEach(b=>b.onclick=()=>{const lay=b.closest('[data-lay]').dataset.lay,A=P.ls[lay].arp;if(b.dataset.arp==='on'){A.on=A.on?0:1;if(A.on&&!P.lay[lay])P.lay[lay]=1;toast(A.on?STX_LAY.find(x=>x[0]===lay)[1]+' spelar som arpeggio · '+A.rate+' '+A.mode:'Arpeggio av')}else A.fill=A.fill?0:1;if(STX.E)STX.E.choke(lay,ctx?ctx.currentTime:0);commit(true)});
    adv.querySelectorAll('[data-bake]').forEach(b=>b.onclick=()=>stxBake(b.dataset.bake));
    adv.querySelectorAll('[data-bakeall]').forEach(b=>b.onclick=()=>{if(window.stxBakeAll)stxBakeAll()});
    adv.querySelectorAll('[data-ed]').forEach(b=>b.onclick=()=>{const i=TRACKS.findIndex(t=>t.id===b.dataset.ed);if(i<0)return;select(i);const sc=document.querySelector('.card[data-card="synth"]');
      if(sc&&!sc.offsetParent){const v=['seq','pads','grid','mix','live'].find(v=>sc.classList.contains('in-'+v));const tb=v&&document.querySelector('#tabs button[data-v="'+v+'"]');if(tb)tb.click()}
      setTimeout(()=>{const s2=document.querySelector('.card[data-card="synth"]');if(s2&&s2.offsetParent)s2.scrollIntoView({behavior:'smooth',block:'center'})},120);toast('Ljudet för '+TRACKS[i].name.toLowerCase()+' · ändra det i synth-kortet')});
    adv.querySelectorAll('.sx-strip').forEach(st=>{const lay=st.dataset.lay,ln=STX_LAY.find(x=>x[0]===lay)[1];st.querySelectorAll('.sx-k').forEach(w=>{const a=w.dataset.a;if(a==='ag'){knob(w,()=>stx().ls[lay].arp.gate,v=>{stx().ls[lay].arp.gate=Math.max(.1,v);STX.pk=''},.55,null,'x.ls.'+lay+'.arp.gate',ln+' arp gate');return}knob(w,()=>stx().ls[lay][a],v=>{stx().ls[lay][a]=v},a==='lv'?.75:.5,null,'x.ls.'+lay+'.'+a,ln+' '+({lv:'nivå',len:'längd',ton:'ton'}[a]))})});
    const gk={sving:['g','sving',0],lat:['g','lat',.25],human:['g','human',.2],dens:['mel','dens',.5]};
    adv.querySelectorAll('.sx-row .sx-k[data-a]').forEach(w=>{const g=gk[w.dataset.a];if(!g||w.closest('.sx-strip'))return;knob(w,()=>stx()[g[0]][g[1]],v=>{stx()[g[0]][g[1]]=v;if(g[1]==='dens')STX.pk=''},g[2],null,'x.'+g[0]+'.'+g[1],{sving:'sving',lat:'lat',human:'lös',dens:'täthet'}[g[1]])});
    adv.querySelectorAll('.sx-grid i').forEach(c=>c.onclick=()=>toggleStep(+c.dataset.g));
    adv.querySelectorAll('[data-nt]').forEach(b=>b.onclick=()=>{nTab=b.dataset.nt;nInfo='';try{localStorage.setItem('blonda.stx.nt',nTab)}catch(e){globalThis.__el&&globalThis.__el(e)}buildAdv()});
    const rc=adv.querySelector('.sx-roll canvas');if(rc){
      const zl=adv.querySelector('.sx-zm b'),zoom=(f,ax)=>{RZ.follow=true;const G=rollGeo(rc),mid=RZ.s0+G.steps*(ax==null?.5:ax);RZ.x=Math.max(1,Math.min(8,RZ.x*f));RZ.y=Math.max(1,Math.min(3,RZ.y*Math.sqrt(f)));const st=64/RZ.x;RZ.s0=Math.max(0,Math.min(64-st,mid-st*(ax==null?.5:ax)));
        const cn=G.lo+G.vis/2,vis=Math.max(10,Math.round((G.hi0-G.lo0+1)/RZ.y));RZ.lo[nTab]=Math.round(cn-vis/2);if(zl)zl.textContent=Math.round(RZ.x*100)+'%';drawRoll(-1)};
      adv.querySelectorAll('.sx-zm [data-z]').forEach(b=>b.onclick=()=>zoom(+b.dataset.z>0?1.5:1/1.5));
      rc.addEventListener('wheel',e=>{const G=rollGeo(rc);if(e.ctrlKey||e.metaKey){e.preventDefault();zoom(e.deltaY<0?1.15:1/1.15,(e.clientX-G.r.left-G.K)/(G.r.width-G.K));return}
        if(RZ.x<=1&&RZ.y<=1)return;e.preventDefault();RZ.follow=false;if(Math.abs(e.deltaX)>Math.abs(e.deltaY)||e.shiftKey)RZ.s0+=(e.shiftKey?e.deltaY:e.deltaX)/G.cw;else RZ.lo[nTab]-=Math.sign(e.deltaY)*Math.max(1,Math.round(Math.abs(e.deltaY)/40));drawRoll(-1)},{passive:false});
      const tp=new Map();let pin=null;
      rc.addEventListener('pointerdown',e=>{e.preventDefault();tp.set(e.pointerId,{x:e.clientX,y:e.clientY});try{rc.setPointerCapture(e.pointerId)}catch(_){globalThis.__el&&globalThis.__el(_)}
        if(tp.size===2){const a=[...tp.values()];pin={d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2,z:RZ.x,s0:RZ.s0,lo:RZ.lo[nTab]};return}
        pin=null;e._t=1;rc._down={x:e.clientX,y:e.clientY,s0:RZ.s0,lo:RZ.lo[nTab],moved:false,e}});
      rc.addEventListener('pointermove',e=>{if(!tp.has(e.pointerId))return;tp.set(e.pointerId,{x:e.clientX,y:e.clientY});const G=rollGeo(rc);
        if(pin&&tp.size===2){const a=[...tp.values()],dd=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),cx=(a[0].x+a[1].x)/2,cy=(a[0].y+a[1].y)/2;RZ.x=Math.max(1,Math.min(8,pin.z*dd/pin.d));const st=64/RZ.x;
          RZ.s0=Math.max(0,Math.min(64-st,pin.s0-(cx-pin.x)/G.cw));RZ.lo[nTab]=Math.round(pin.lo+(cy-pin.y)/G.rh);if(zl)zl.textContent=Math.round(RZ.x*100)+'%';drawRoll(-1);return}
        const D=rc._down;if(D&&e.pointerType!=='mouse'&&(RZ.x>1||RZ.y>1)&&Math.hypot(e.clientX-D.x,e.clientY-D.y)>8){D.moved=true;RZ.follow=false;RZ.s0=D.s0-(e.clientX-D.x)/G.cw;RZ.lo[nTab]=Math.round(D.lo+(e.clientY-D.y)/G.rh);drawRoll(-1)}});
      const up=e=>{tp.delete(e.pointerId);const D=rc._down;if(D&&!pin&&!D.moved&&tp.size===0)rollTap(D.e,rc);if(tp.size===0){rc._down=null;pin=null}};rc.addEventListener('pointerup',up);rc.addEventListener('pointercancel',e=>{tp.delete(e.pointerId);rc._down=null;pin=null});
      const bar=adv.querySelector('.sx-rbar');if(bar)bar.onpointerdown=e=>{e.preventDefault();const r=bar.getBoundingClientRect(),mv=ev=>{const st=64/RZ.x;RZ.s0=Math.max(0,Math.min(64-st,((ev.clientX-r.left)/r.width)*64-st/2));drawRoll(-1)};mv(e);
        RZ.follow=false;const u=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',u)};addEventListener('pointermove',mv);addEventListener('pointerup',u)};
      requestAnimationFrame(()=>drawRoll(-1))}
    adv.querySelectorAll('.sx-btns [data-x]').forEach(b=>b.onclick=()=>{const x=b.dataset.x,R2=stxRh(P).slice();if(['rr','c1','fill','clr','dbl'].includes(x)){P.pat=null;P.pre=-1}
      if(x==='two'){mkOwn();const c=P.custom.ch;P.custom.ch=c.length>4?c.filter((_,i)=>i%2===0):c.flatMap(e=>[e,Array.isArray(e)?e.slice():{...e}]);selSlot=0}
      else if(x==='cap'){const n=stxChords(P).length>4?8:4,h=STX.hist.slice(-n);while(h.length<n)h.push(...h.slice(0,n-h.length));P.src='starter';P.custom={mode:P.mode,ch:h.map(c=>({...c}))};toast('Ackorden från pianot · '+h.map(c=>c.name).join(' – '))}
      else if(x==='src'){P.src=P.src==='piano'?'starter':'piano'}
      else if(x==='kb'){const kb=document.getElementById('kbBtn');if(kb)kb.click();return}
      else if(x==='rr')P.rh=stxRollRh();
      else if(x==='c1')P.rh=[R2[0],R2[0],R2[0],R2[0]];
      else if(x==='fill')P.rh=R2.map(()=>'x'.repeat(16));
      else if(x==='clr')P.rh=R2.map(()=>'.'.repeat(16));
      else if(x==='dbl')P.rh=R2.map(r=>[...r].map((c,i)=>c==='x'||(i>0&&r[i-1]==='x'&&Math.random()<.6)?'x':'.').join(''));
      else if(x==='mel'){P.seed=Math.floor(Math.random()*1e6);
        /* a written pattern: new top-line notes on the chord's tones, where something sounds */
        if(P.pat){const pl=stxPlan({...P,pat:{...P.pat,klo:{}}}),ref=60+P.root,k={},R3=stxRh(P);let last=-9;for(let g=0;g<64;g++){if(R3[g>>4][g&15]!=='x'||g-last<2||Math.random()>.16)continue;const ev=pl.steps[g],v=pl.V[ev?ev.ci:0];
          const cand=v.map(n=>{let m=n;while(m<ref-6)m+=12;while(m>ref+9)m-=12;return m});k[g]=cand[Math.floor(Math.random()*cand.length)]-ref;last=g}P.pat.klo=k;P.pat.kl={}}}
      else if(x==='nrst'){P.ed[nTab]={};nInfo=''}
      commit(true)})}
  /* ---------- the notes view: a small piano roll over the four bars for one layer ---------- */
  const RANGE={ack:[45,86],klo:[55,96],sub:[24,52],luft:[33,74]};
  /* zoom: x = how far in on time (1–8), y = rows (1–3); s0 = first step shown, lo = lowest note shown per layer */
  const RZ={x:1,y:1,s0:0,lo:{},follow:true};
  const evNotes=(ev,k)=>{const e=ev&&ev[k];if(!e)return null;return {ns:e.ns||[e.n],l:e.l,own:e.own,re:e.re}};
  function rollGeo(cv){const r=cv.getBoundingClientRect(),[lo0,hi0]=RANGE[nTab],K=30,tot=hi0-lo0+1,vis=Math.max(10,Math.round(tot/RZ.y)),steps=64/RZ.x;
    if(RZ.lo[nTab]==null)RZ.lo[nTab]=lo0+Math.round((tot-vis)/2);const lo=Math.max(lo0,Math.min(hi0-vis+1,RZ.lo[nTab]));RZ.lo[nTab]=lo;RZ.s0=Math.max(0,Math.min(64-steps,RZ.s0));
    const cw=(r.width-K)/steps;return {r,lo,hi:lo+vis-1,K,L0:K-RZ.s0*cw,cw,rh:r.height/vis,steps,vis,lo0,hi0}}
  function drawRoll(cur){const cv=adv.querySelector('.sx-roll canvas');if(!cv||!cv.offsetParent)return;const G=rollGeo(cv),d=devicePixelRatio||1;if(!G.r.width)return;
    const W=G.r.width,H=G.r.height;if(cv.width!==Math.round(W*d)||cv.height!==Math.round(H*d)){cv.width=Math.round(W*d);cv.height=Math.round(H*d)}
    const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,W,H);const pl=stxPlanCached(),P=stx(),col=STX_LAY.find(x=>x[0]===nTab)[2],R=stxRh(P),mono=getComputedStyle(document.body).getPropertyValue('--f-mono');
    for(let n=G.lo;n<=G.hi;n++){const y=H-(n-G.lo+1)*G.rh,bk=[1,3,6,8,10].includes(((n%12)+12)%12);c.fillStyle=bk?'rgba(0,0,0,.25)':'rgba(255,255,255,.02)';c.fillRect(G.L0,y,W-G.L0,G.rh);
      if(n%12===0){c.fillStyle='rgba(232,230,220,.1)';c.fillRect(G.L0,y+G.rh-1,W-G.L0,1);c.fillStyle='rgba(232,230,220,.5)';c.font='9px '+mono;c.textBaseline='middle';c.fillText(NOTE(n),2,y+G.rh/2)}}
    for(let g=0;g<64;g++)if((R[g>>4]||'')[g&15]!=='x'){c.fillStyle='rgba(0,0,0,.28)';c.fillRect(G.L0+g*G.cw,0,G.cw,H)}
    for(let s=0;s<=64;s++){c.fillStyle=s%16===0?'rgba(232,230,220,.32)':s%4===0?'rgba(232,230,220,.1)':'rgba(232,230,220,.03)';c.fillRect(G.L0+s*G.cw,0,1,H)}
    const per=64/pl.ch.length;c.font='500 9px '+mono;c.textBaseline='top';pl.ch.forEach((ch,i)=>{c.fillStyle='rgba(232,230,220,.55)';c.fillText(ch.name,G.L0+i*per*G.cw+4,3)});
    if(pl.arp&&pl.arp[nTab]){pl.arp[nTab].all.forEach(a=>{const n=a.n+12*(P.ls[nTab].oct||0);if(n<G.lo||n>G.hi)return;const x=G.L0+a.t*G.cw+1,y=H-(n-G.lo+1)*G.rh+1;c.fillStyle=col;c.globalAlpha=.55+.45*a.v;c.fillRect(x,y,Math.max(2,a.d*G.cw-1),Math.max(2,G.rh-2));c.globalAlpha=1})}
    else for(let g=0;g<64;g++){const e=evNotes(pl.steps[g],nTab);if(!e)continue;e.ns.forEach(n=>{if(n<G.lo||n>G.hi)return;const x=G.L0+g*G.cw+1,y=H-(n-G.lo+1)*G.rh+1,w=Math.max(2,e.l*G.cw-2),h=Math.max(2,G.rh-2);
      c.fillStyle=col;c.globalAlpha=e.re?.6:1;c.fillRect(x,y,w,h);c.globalAlpha=1;if(e.own){c.strokeStyle='#E9C54A';c.lineWidth=1.5;c.strokeRect(x+.5,y+.5,w-1,h-1)}})}
    if(cur>=0){c.fillStyle='rgba(233,197,74,.9)';c.fillRect(G.L0+(cur+.5)*G.cw,0,1.5,H);if(RZ.x>1&&RZ.follow&&(cur<RZ.s0||cur>=RZ.s0+G.steps)){RZ.s0=Math.floor(cur/G.steps)*G.steps}}
    c.fillStyle='#17181A';c.fillRect(0,0,G.K,H);for(let n=G.lo;n<=G.hi;n++){const y=H-(n-G.lo+1)*G.rh,bk=[1,3,6,8,10].includes(((n%12)+12)%12);c.fillStyle=bk?'rgba(232,230,220,.06)':'rgba(232,230,220,.13)';c.fillRect(0,y+.5,G.K-3,Math.max(1,G.rh-1));
      if(n%12===0||G.rh>=13){c.fillStyle=n%12===0?'rgba(232,230,220,.75)':'rgba(232,230,220,.4)';c.font=(n%12===0?'500 ':'')+'9px '+mono;c.textBaseline='middle';c.fillText(NOTE(n),2,y+G.rh/2)}}
    const bar=cv.parentNode.querySelector('.sx-rbar');if(bar){bar.hidden=RZ.x<=1;const i=bar.firstChild;i.style.left=(RZ.s0/64*100)+'%';i.style.width=(G.steps/64*100)+'%'}}
  function rollTap(e,cv){const G=rollGeo(cv),x=e.clientX-G.r.left,y=e.clientY-G.r.top;if(x<G.K)return;const g=Math.max(0,Math.min(63,Math.floor((x-G.L0)/G.cw))),n=G.lo+Math.floor((G.r.height-y)/G.rh);
    const P=stx(),pl=stxPlanCached(),ev=pl.steps[g],ci=pl.two?(g>>4)*2+((g&15)<8?0:1):(g>>4),ch=pl.ch[ci];let msg='';
    if(nTab==='klo'){const k=ev&&ev.klo;if(k&&k.n===n){P.ed.klo[g]=0;msg='topp borta i takt '+((g>>4)+1)+' · steg '+((g&15)+1)}else{P.ed.klo[g]=n;msg='topp '+NOTE(n)+' · takt '+((g>>4)+1)+' · steg '+((g&15)+1);preview('klo',[n])}}
    else if(nTab==='sub'){P.ed.sub[ci]={nm:ch.name,n};msg='sub '+NOTE(n)+' under '+ch.name;preview('sub',[n])}
    else{const cur=(()=>{for(let q=0;q<64;q++){const e2=pl.steps[q];if(e2&&e2.ci===ci&&e2[nTab])return (e2[nTab].ns||[]).slice()}return nTab==='luft'?pl.V[ci].map(v=>v-12):pl.V[ci].slice()})();
      const i=cur.indexOf(n);if(i>=0){if(cur.length>1)cur.splice(i,1)}else cur.push(n);cur.sort((a,b)=>a-b);P.ed[nTab][ci]={nm:ch.name,ns:cur};msg=ch.name+' · '+cur.map(NOTE).join(' ');preview(nTab,cur)}
    nInfo=msg;STX.pk='';commit(true)}
  function preview(lay,ns){if(!prevOn())return;try{initAudio();ctx.resume();const E=stxEnsure();if(!E||playing)return;E.P=stx();const t=ctx.currentTime+.02,d=.35;
    if(lay==='klo')E.klo(t,ns[0],.9,d,0,false);else if(lay==='sub')E.sub(t,ns[0],d);else if(lay==='luft')E.luft(t,ns,d);else E.stab(t,ns,.9,d)}catch(e){globalThis.__el&&globalThis.__el(e)}}
  const paintK=()=>{box.querySelectorAll('.sx-knobs .sx-k').forEach(w=>w._pk&&w._pk())};
  let dirty=true;
  function paint(re,keep){const P=stx();
    smpRows.forEach(row=>{const k=+row.dataset.s,Q=P.smp[k],sm=Q.id==='kit:vox'?{name:'röster · inbyggda'}:Q.id&&typeof SMP!=='undefined'?SMP.get(Q.id):null;row.classList.toggle('on',!!(Q.on&&sm));
      row.querySelector('.sx-sn b').textContent=sm?sm.name:(Q.id?'laddar…':'välj ljud…');const D=Q.id&&STX.sb[Q.id];row.querySelector('.sx-sn small').textContent=sm?(D&&D.sl?(Q.mode==='ett'?'one-shot':D.sl.length+' bitar'):'laddar…'):'eller släpp en fil här';
      row.querySelector('[data-sm]').textContent=Q.mode==='ett'?'ett':'klipp';row.querySelectorAll('.sx-k').forEach(w=>w._pk&&w._pk());if(Q.id&&(!sm||!(STX.sb[Q.id]&&STX.sb[Q.id].sl&&STX.sb[Q.id].sl.length))&&!smpRows._t)smpRows._t=setTimeout(()=>{smpRows._t=0;paint()},700);row.querySelector('.sx-oct').textContent=(Q.oct>0?'+':'')+(Q.oct|0);if(Q.id)stxSmpLoad(Q.id)});{const R=STX_PRE[P.pre];box.querySelector('.sx-pn b').textContent=R?R.nm:'eget';const tb=box.querySelector('[data-pt]');tb.hidden=!R;if(R){tb.querySelector('b').textContent=R.bpm;tb.classList.toggle('on',Math.round(S.bpm)===R.bpm)}
    plist.querySelectorAll('[data-pi]').forEach(b=>b.classList.toggle('cur',+b.dataset.pi===P.pre));box.querySelector('[data-pl]').classList.toggle('open',!plist.hidden)}box.querySelectorAll('.sx-side .sx-ctl').forEach(el=>el.querySelector('b').textContent=val(P,el.dataset.k));
    box.querySelectorAll('.sx-lay [data-l]').forEach(bt=>bt.classList.toggle('on',!!P.lay[bt.dataset.l]));
    const on=box.querySelector('[data-on]');on.classList.toggle('on',!!P.on);on.textContent=P.on?'på':'av';
    box.querySelector('[data-play]').textContent=playing?'■ stoppa':'▶ spela';
    box.querySelector('[data-fol]').classList.toggle('on',!!P.fol.on);box.querySelector('[data-src] b').textContent=P.src==='piano'?'pianot':'startern';box.querySelector('[data-src]').classList.toggle('on',P.src==='piano');
    box.querySelector('[data-adv]').classList.toggle('on',advOpen);adv.hidden=!advOpen;if(advOpen&&!keep)buildAdv();
    box.querySelectorAll('.sx-fx button').forEach(bt=>bt.classList.toggle('in',!!P.fx[bt.dataset.f]));paintK();
    const rd=document.getElementById('stRead');if(rd)rd.textContent=STX_NN[P.root]+' '+P.mode+' · '+stxProgName(P);
    try{stxKbBank()}catch(e){globalThis.__el&&globalThis.__el(e)}
    try{stxUsage()}catch(e){globalThis.__el&&globalThis.__el(e)}
    card.classList.toggle('off',!P.on);dirty=true;if(re)draw()}
  const fit=()=>{const r=cv.getBoundingClientRect(),d=devicePixelRatio||1;if(!r.width)return null;const W=Math.round(r.width*d);if(cv.width!==W){cv.width=W;cv.height=W}const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);return {c,w:r.width}};
  const curG=()=>{if(!playing||!ctx||!STX.vis.length)return -1;const t=ctx.currentTime;let g=-1;for(const v of STX.vis)if(v.t<=t)g=v.g;return g};
  let lastG=-2,lastSlot=-1;
  function draw(){if(!cv.offsetParent||card.classList.contains('min'))return;const g=curG();if(!dirty&&g===lastG)return;lastG=g;dirty=false;const f=fit();if(!f)return;
    const {c,w}=f,cx=w/2,P=stx(),pl=stxPlanCached(),cur=g>=0?((g%64)+64)%64:-1,ang=i=>i/64*Math.PI*2-Math.PI/2,R0=w/2;
    c.clearRect(0,0,w,w);const ink='232,230,220',Y='#E9C54A';
    const nC=pl.ch.length,per=64/nC;c.font='500 '+Math.max(9,Math.round(w/44))+'px '+getComputedStyle(document.body).getPropertyValue('--f-mono');c.textAlign='center';c.textBaseline='middle';
    for(let k=0;k<nC;k++){const a0=ang(k*per)+.03,a1=ang((k+1)*per)-.03,isCur=cur>=0&&Math.floor(cur/per)===k;c.beginPath();c.arc(cx,cx,R0*.9,a0,a1);c.strokeStyle=isCur?Y:`rgba(${ink},.28)`;c.lineWidth=isCur?2:1;c.stroke();
      const am=(a0+a1)/2,rr=R0*.965;c.fillStyle=isCur?Y:`rgba(${ink},.6)`;if(P.src!=='piano'||k===0)c.fillText(pl.ch[k].name,cx+Math.cos(am)*rr,cx+Math.sin(am)*rr)}
    if(cur>=0){const a=ang(cur+.5),gr=c.createLinearGradient(cx,cx,cx+Math.cos(a)*R0*.86,cx+Math.sin(a)*R0*.86);gr.addColorStop(0,'rgba(233,197,74,0)');gr.addColorStop(1,'rgba(233,197,74,.55)');
      c.strokeStyle=gr;c.lineWidth=1.5;c.beginPath();c.moveTo(cx+Math.cos(a)*R0*.3,cx+Math.sin(a)*R0*.3);c.lineTo(cx+Math.cos(a)*R0*.86,cx+Math.sin(a)*R0*.86);c.stroke()}
    const rings=[['ack',.8],['klo',.71],['sub',.62],['luft',.53]],dot=Math.max(1.6,Math.min(4.2,R0*.8*Math.PI*2/64*.3));
    rings.forEach(([k,rf],ri)=>{const col=STX_LAY[ri][2],on=!!P.lay[k],R=R0*rf;
      c.beginPath();c.arc(cx,cx,R,0,Math.PI*2);c.strokeStyle=`rgba(${ink},.05)`;c.lineWidth=1;c.stroke();
      if(pl.arp&&pl.arp[k]){pl.arp[k].all.forEach(n=>{const a=ang(n.t),hot=cur>=0&&Math.floor(n.t)===cur;c.beginPath();c.arc(cx+Math.cos(a)*R,cx+Math.sin(a)*R,dot*(hot?.9:.55)*(.7+.3*n.v),0,Math.PI*2);c.fillStyle=hot?'#fff':col;c.globalAlpha=on?1:.2;c.fill();c.globalAlpha=1});return}
      for(let i=0;i<64;i++){const ev=pl.steps[i],e=ev&&ev[k],a=ang(i),x=cx+Math.cos(a)*R,y=cx+Math.sin(a)*R,isC=i===cur;
        if(e&&(k==='sub'||k==='luft')){/* v217: thin, solid, square-ended – as sharp as the orbit */const live=cur>=i&&cur<i+e.l;c.beginPath();c.arc(cx,cx,R,ang(i)+.02,ang(i+e.l)-.02);c.strokeStyle=live&&on?'#fff':col;c.globalAlpha=on?1:.18;c.lineWidth=Math.max(1.5,k==='sub'?dot*.85:dot*.55);c.lineCap='butt';c.stroke();c.globalAlpha=1}
        else if(e){c.beginPath();c.arc(x,y,dot*(isC?1.4:1)*(k==='ack'&&e.re?.75:1),0,Math.PI*2);c.fillStyle=isC?'#fff':col;c.globalAlpha=on?1:.2;if(isC&&on){c.shadowColor=col;c.shadowBlur=6}c.fill();c.shadowBlur=0;c.globalAlpha=1}
        else if(k!=='sub'&&k!=='luft'){c.beginPath();c.arc(x,y,Math.max(1,dot*.32),0,Math.PI*2);c.fillStyle=isC?`rgba(${ink},.7)`:`rgba(${ink},.14)`;c.fill()}}});
    if(pl.sx)[0,1].forEach(k=>{const Q=P.smp&&P.smp[k];if(!Q||!Q.on)return;const col=k?'#FF8A3D':'#F3EEDD',Rs=R0*(.855+k*.022);
      pl.sx[k].forEach((e,i)=>{if(!e)return;const live=cur>=i&&cur<i+e.l;c.beginPath();c.arc(cx,cx,Rs,ang(i)+.02,ang(i+e.l)-.02);c.strokeStyle=live?'#fff':col;c.globalAlpha=1;c.lineWidth=Math.max(1.5,dot*.6);c.lineCap='butt';c.stroke()})});
    const Rf=R0*.44;c.beginPath();c.arc(cx,cx,Rf,0,Math.PI*2);c.strokeStyle=`rgba(${ink},.05)`;c.stroke();
    STX_FX.forEach(fx=>{if(!P.fx[fx.id])return;const segs=fx.b===-2?pl.sw.map((w,i)=>w?[i,w.l]:null).filter(Boolean):fx.b<0?[0,2].map(b=>{const r=stxRh(P)[b]||'',l=r.lastIndexOf('x');return l<0?null:[b*16+l,1]}).filter(Boolean):[[fx.b*16+fx.s,fx.len]];
      segs.forEach(([i0,l])=>{const live=cur>=i0&&cur<i0+l;c.beginPath();c.arc(cx,cx,Rf,ang(i0)+.01,ang(i0+l)-.01);c.strokeStyle=Y;c.globalAlpha=live?1:.75;c.lineWidth=live?3:2;c.stroke();c.globalAlpha=1})});
    for(let b=0;b<4;b++){const a=ang(b*16);c.beginPath();c.moveTo(cx+Math.cos(a)*R0*.47,cx+Math.sin(a)*R0*.47);c.lineTo(cx+Math.cos(a)*R0*.85,cx+Math.sin(a)*R0*.85);c.strokeStyle=`rgba(${ink},.1)`;c.lineWidth=1;c.stroke()}
    const ci=cur>=0?Math.floor(cur/per):0,sn=stxSndName(P.ls.ack.snd);big.textContent=pl.ch[ci]?pl.ch[ci].name:'';sub.textContent=cur>=0?'takt '+((cur>>4)+1)+' / 4 · '+sn:STX_NN[P.root]+' '+P.mode+' · '+sn;
    /* the advanced view: light the playing step and slot */
    if(advOpen)drawRoll(cur);
    if(advOpen){adv.querySelectorAll('.sx-grid i.now').forEach(e=>e.classList.remove('now'));if(cur>=0){const e=adv.querySelector('.sx-grid i[data-g="'+cur+'"]');if(e)e.classList.add('now')}
      const sl=cur>=0?Math.floor(cur/per):-1;if(sl!==lastSlot){lastSlot=sl;adv.querySelectorAll('[data-slot]').forEach((b,i)=>b.classList.toggle('sxnow',i===sl))}}}
  const loop=()=>{try{draw()}catch(e){globalThis.__el&&globalThis.__el(e)}if(playing||dirty)requestAnimationFrame(loop);else setTimeout(()=>requestAnimationFrame(loop),250)};
  new ResizeObserver(()=>{dirty=true;draw()}).observe(orb);
  /* fullscreen: everything scales up with the screen (1× at ~1700 px wide, up to 1.7×) and the editor gets the full height */
  const fitFull=()=>{const full=!!card.closest('.fullhost');const z=full?Math.max(1,Math.min(1.6,innerWidth/1900)):1;box.style.zoom=z===1?'':String(z);
    const eff=innerWidth/z;box.classList.toggle('fw3',full&&eff>=1750);box.classList.toggle('fw2',full&&eff>=1000&&eff<1750);
    box.style.setProperty('--advh',full?((innerHeight-110)/z)+'px':'');dirty=true};
  addEventListener('resize',fitFull);
  {const fh=document.getElementById('fullHost');if(fh)new MutationObserver(()=>{fitFull();setTimeout(()=>{dirty=true;try{draw();if(advOpen)drawRoll(-1)}catch(e){globalThis.__el&&globalThis.__el(e)}},80)}).observe(fh,{childList:true,attributes:true,attributeFilter:['hidden','class']})}
  /* ---------- the Starter's own undo / redo, and four snapshots (v137) ----------
     every change to the Starter (dice, presets, knobs, chords, layers …) is remembered; quick changes in a row (a knob
     being turned) count as one step. Snapshots: tap an empty one = save, tap a full one = back to it, hold = save over. */
  {const st=document.createElement('style');st.textContent=`.sx-snap{display:grid;grid-template-columns:repeat(2,30px) repeat(4,minmax(0,1fr));gap:4px;margin-top:4px}
.sx-snap button{height:30px;border-radius:7px;border:0;background:rgba(255,255,255,.05);color:inherit;font:500 11px var(--f-mono,monospace);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1;padding:0 2px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}
.sx-snap button:disabled{opacity:.3;cursor:default}.sx-snap button small{font-size:7.5px;opacity:.55;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.sx-snap button.full{background:rgba(233,197,74,.14);box-shadow:inset 0 0 0 1px rgba(233,197,74,.5)}.sx-snap button.cur{background:#E9C54A;color:#17181A}.sx-snap button.cur small{opacity:.8}
.sx-snap button:not(:disabled):hover{filter:brightness(1.3)}`;document.head.appendChild(st)}
  const H={u:[],r:[],last:null,lt:0,skip:false},snapKey=()=>{const P=stx(),o=Object.assign({},P);delete o.on;return JSON.stringify(o)};
  const restore=json=>{const P=JSON.parse(json),on=stx().on;S.stx=Object.assign(P,{on});H.skip=true;H.last=snapKey();STX.pk='';if(STX.E){STX.E.choke('ack',ctx?ctx.currentTime:0);STX.E.apply(stx())}save();paint(true);paintSnap()};
  setInterval(()=>{if(!S.stx)return;const k=snapKey();if(H.last==null){H.last=k;return}if(k===H.last)return;if(H.skip){H.skip=false;H.last=k;return}
    const now=performance.now();if(now-H.lt>900){H.u.push(H.last);if(H.u.length>60)H.u.shift()}H.lt=now;H.r.length=0;H.last=k;paintSnap()},300);
  const snaps=()=>{if(!Array.isArray(S.stxSnap))S.stxSnap=[null,null,null,null];return S.stxSnap};let curSnap=-1;
  function paintSnap(){const sb=box.querySelector('.sx-snap');if(!sb)return;sb.querySelector('[data-h="u"]').disabled=!H.u.length;sb.querySelector('[data-h="r"]').disabled=!H.r.length;
    const k=H.last;sb.querySelectorAll('[data-sn]').forEach(b=>{const i=+b.dataset.sn,s=snaps()[i];b.classList.toggle('full',!!s);b.classList.toggle('cur',!!s&&s.k===k);b.querySelector('small').textContent=s?s.l:'tom'})}
  box.querySelector('[data-h="u"]').onclick=()=>{if(!H.u.length)return;H.r.push(H.last||snapKey());restore(H.u.pop());toast('Starter · ångrat')};
  box.querySelector('[data-h="r"]').onclick=()=>{if(!H.r.length)return;H.u.push(H.last||snapKey());restore(H.r.pop());toast('Starter · gjort om')};
  const label=()=>{const P=stx();return STX_NN[P.root]+(P.mode==='moll'?'m':'')+' · '+(P.ls.ack.snd||'')};
  const saveSnap=i=>{const k=snapKey();snaps()[i]={k,l:label()};save();paintSnap();toast('Starter · sparat i minne '+(i+1))};
  box.querySelectorAll('[data-sn]').forEach(b=>{const i=+b.dataset.sn;let t=0,held=false;
    b.addEventListener('pointerdown',()=>{held=false;clearTimeout(t);t=setTimeout(()=>{held=true;saveSnap(i)},600)});
    const up=()=>clearTimeout(t);b.addEventListener('pointerup',up);b.addEventListener('pointerleave',up);b.addEventListener('pointercancel',up);
    b.onclick=()=>{if(held)return;const s=snaps()[i];if(!s){saveSnap(i);return}if(s.k===H.last)return;H.u.push(H.last||snapKey());H.r.length=0;restore(s.k);toast('Starter · minne '+(i+1)+' · '+s.l)}});
  paintSnap();setInterval(paintSnap,1200);
  window.stxPaint=paint;paint(true);loop();
  {const _ra=renderAll;renderAll=function(){_ra.apply(this,arguments);paint(false,true)}}
  {const _pl=play;play=function(){_pl.apply(this,arguments);paint(false,true)}}{const _st=stop;stop=function(){_st.apply(this,arguments);dirty=true;paint(false,true)}}
})();

