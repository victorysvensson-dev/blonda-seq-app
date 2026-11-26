/* ================= FX rack: effects you choose from a library, in the master before the mastering EQ. Only the ones you add show
   (as tiles next to echo · space · tape · crush); up to eight, in any order. Modulation, reverbs, delays, stompboxes and filters,
   made for sound quality: the modulation, reverb, delay and filter effects run in their own AudioWorklet (interpolated delay
   lines, smoothed parameters, crossfaded bypass), the stompboxes are native 4× oversampled waveshapers with tone filters.
   ⤢ / the "fx" tab in the mastering window has every knob. Saved with the project (S.master.rack). ================= */
(()=>{const fxBox=document.querySelector('.card.master .m2-fx'),grid=fxBox&&fxBox.querySelector('.ptiles');if(!fxBox||!grid)return;
  const SYNC_LFO=['off','1/4','1/8','1/8t','1/16'],SYNC_DLY=['off','1/16','1/8t','1/8','1/8d','1/4t','1/4','1/4d','1/2'];
  const P=(k,l,min,max,def,o)=>Object.assign({k,l,min,max,def},o||{});
  const CAT={mod:{n:'modulation',c:'#72CF9E'},verb:{n:'reverb',c:'#B9A6FF'},dly:{n:'delay',c:'#7FB7E8'},drv:{n:'stompbox',c:'#F4A27A'},flt:{n:'filter',c:'#EED27A'}};
  const MIX=(d)=>P('mix','mix',0,1,d,{u:'%'});
  const DEFS={
    chorus:{n:'Chorus',cat:'mod',ps:[P('rate','rate',.05,5,.6,{log:1,u:'Hz'}),P('depth','depth',0,1,.4,{u:'%'}),P('delay','delay',5,30,12,{u:'ms'}),P('voices','voices',1,4,3,{int:1}),P('width','width',0,1,.8,{u:'%'}),MIX(.5)]},
    flanger:{n:'Flanger',cat:'mod',ps:[P('rate','rate',.02,4,.25,{log:1,u:'Hz'}),P('depth','depth',0,1,.7,{u:'%'}),P('manual','manual',.1,5,1,{log:1,u:'ms'}),P('feedback','feedback',-.95,.95,.55,{u:'%'}),P('stereo','stereo',0,180,90,{u:'°',int:1}),MIX(.5)]},
    phaser:{n:'Phaser',cat:'mod',ps:[P('rate','rate',.03,5,.35,{log:1,u:'Hz'}),P('depth','depth',0,1,.7,{u:'%'}),P('center','center',100,4000,700,{log:1,u:'Hz'}),P('feedback','feedback',0,.9,.45,{u:'%'}),P('stages','stages',4,12,6,{int:1,step:2}),P('stereo','stereo',0,180,90,{u:'°',int:1}),MIX(.5)]},
    tremolo:{n:'Tremolo',cat:'mod',ps:[P('rate','rate',.1,20,5,{log:1,u:'Hz'}),P('sync','sync',0,4,0,{opts:SYNC_LFO}),P('depth','depth',0,1,.6,{u:'%'}),P('shape','shape',0,1,.2,{u:'%'}),P('stereo','stereo',0,1,0,{u:'%'})]},
    autopan:{n:'Auto pan',cat:'mod',type:'tremolo',ps:[P('rate','rate',.05,10,.5,{log:1,u:'Hz'}),P('sync','sync',0,4,0,{opts:SYNC_LFO}),P('depth','depth',0,1,.8,{u:'%'}),P('shape','shape',0,1,0,{u:'%'}),P('stereo','stereo',0,1,1,{u:'%'})]},
    vibrato:{n:'Vibrato',cat:'mod',ps:[P('rate','rate',.1,12,5,{log:1,u:'Hz'}),P('depth','depth',0,1,.3,{u:'%'}),P('stereo','stereo',0,1,0,{u:'%'}),MIX(1)]},
    rotary:{n:'Rotary',cat:'mod',ps:[P('speed','speed',0,1,0,{opts:['slow','fast']}),P('drive','drive',0,1,.2,{u:'%'}),P('width','width',0,1,.8,{u:'%'}),MIX(1)]},
    plate:{n:'Plate',cat:'verb',ps:[P('decay','decay',0,1,.55,{u:'%'}),P('predelay','predelay',0,200,10,{u:'ms',int:1}),P('size','size',.5,1.5,1,{u:'×'}),P('damp','damp',0,1,.3,{u:'%'}),P('tone','tone',0,1,.7,{u:'%'}),P('mod','mod',0,1,.4,{u:'%'}),P('lowcut','low cut',20,600,120,{log:1,u:'Hz'}),MIX(.25)]},
    hall:{n:'Hall',cat:'verb',ps:[P('decay','decay',.3,12,3.2,{log:1,u:'s'}),P('predelay','predelay',0,200,25,{u:'ms',int:1}),P('size','size',.5,2,1.2,{u:'×'}),P('damp','damp',0,1,.45,{u:'%'}),P('mod','mod',0,1,.4,{u:'%'}),P('lowcut','low cut',20,600,100,{log:1,u:'Hz'}),MIX(.25)]},
    room:{n:'Room',cat:'verb',ps:[P('decay','decay',.1,3,.8,{log:1,u:'s'}),P('predelay','predelay',0,100,4,{u:'ms',int:1}),P('size','size',.5,2,1,{u:'×'}),P('damp','damp',0,1,.35,{u:'%'}),P('early','early',0,1,.6,{u:'%'}),P('mod','mod',0,1,.2,{u:'%'}),P('lowcut','low cut',20,600,120,{log:1,u:'Hz'}),MIX(.25)]},
    spring:{n:'Spring',cat:'verb',ps:[P('decay','decay',0,1,.6,{u:'%'}),P('tone','tone',1000,8000,3500,{log:1,u:'Hz'}),P('tension','tension',15,80,33,{u:'ms',int:1}),P('drip','drip',0,1,.5,{u:'%'}),MIX(.3)]},
    shimmer:{n:'Shimmer',cat:'verb',ps:[P('decay','decay',1,20,6,{log:1,u:'s'}),P('shimmer','shimmer',0,1,.5,{u:'%'}),P('predelay','predelay',0,200,20,{u:'ms',int:1}),P('size','size',.5,2,1.3,{u:'×'}),P('damp','damp',0,1,.4,{u:'%'}),P('mod','mod',0,1,.5,{u:'%'}),P('lowcut','low cut',20,800,200,{log:1,u:'Hz'}),MIX(.3)]},
    pingpong:{n:'Ping pong',cat:'dly',ps:[P('sync','time',0,8,4,{opts:SYNC_DLY}),P('time','ms',.02,2,.3,{log:1,u:'s',hideIf:p=>p.sync>0}),P('feedback','feedback',0,.95,.45,{u:'%'}),P('tone','tone',500,16000,5000,{log:1,u:'Hz'}),P('width','width',0,1,1,{u:'%'}),MIX(.3)]},
    tapeecho:{n:'Tape echo',cat:'dly',ps:[P('sync','time',0,8,6,{opts:SYNC_DLY}),P('time','ms',.03,2.4,.35,{log:1,u:'s',hideIf:p=>p.sync>0}),P('feedback','feedback',0,1.1,.45,{u:'%'}),P('wow','wow',0,1,.3,{u:'%'}),P('tone','tone',500,12000,3500,{log:1,u:'Hz'}),P('drive','drive',0,1,.3,{u:'%'}),MIX(.3)]},
    overdrive:{n:'Overdrive',cat:'drv',nat:1,ps:[P('drive','drive',0,1,.5,{u:'%'}),P('tone','tone',0,1,.5,{u:'%'}),P('level','level',0,1,.5,{u:'%'}),MIX(1)]},
    distortion:{n:'Distortion',cat:'drv',nat:1,ps:[P('drive','drive',0,1,.5,{u:'%'}),P('tone','tone',0,1,.5,{u:'%'}),P('level','level',0,1,.5,{u:'%'}),MIX(1)]},
    fuzz:{n:'Fuzz',cat:'drv',nat:1,ps:[P('drive','drive',0,1,.6,{u:'%'}),P('tone','tone',0,1,.45,{u:'%'}),P('level','level',0,1,.5,{u:'%'}),MIX(1)]},
    autowah:{n:'Auto wah',cat:'flt',ps:[P('sens','sens',0,1,.5,{u:'%'}),P('freq','freq',100,1500,300,{log:1,u:'Hz'}),P('range','range',1,6,4,{u:'oct'}),P('reso','reso',.7,12,4,{log:1}),P('mode','mode',0,1,1,{opts:['lp','bp']}),P('decay','decay',.03,.6,.15,{log:1,u:'s'}),MIX(1)]},
    autofilter:{n:'Auto filter',cat:'flt',ps:[P('rate','rate',.05,10,1,{log:1,u:'Hz'}),P('sync','sync',0,4,0,{opts:SYNC_LFO}),P('freq','freq',60,8000,800,{log:1,u:'Hz'}),P('depth','depth',0,1,.6,{u:'%'}),P('reso','reso',.5,10,2,{log:1}),P('type','type',0,2,0,{opts:['lp','bp','hp']}),P('stereo','stereo',0,1,0,{u:'%'}),MIX(1)]},
    ringmod:{n:'Ring mod',cat:'flt',ps:[P('freq','freq',20,3000,220,{log:1,u:'Hz'}),P('drift','drift',0,1,.2,{u:'%'}),MIX(.5)]}};
  const ORDER=['chorus','flanger','phaser','tremolo','autopan','vibrato','rotary','plate','hall','room','spring','shimmer','pingpong','tapeecho','overdrive','distortion','fuzz','autowah','autofilter','ringmod'];
  const MAX=8;
  const R=()=>{if(!Array.isArray(S.master.rack))S.master.rack=[];return S.master.rack};
  const defP=t=>{const o={};DEFS[t].ps.forEach(q=>o[q.k]=q.def);return o};
  const uid=()=>Math.random().toString(36).slice(2,9);
  const disc=t=>DEFS[t].ps.filter(q=>q.opts||q.int).map(q=>q.k);
  /* ---------- sound ---------- */
  let ready=false,loading=false;const NODES=new Map();
  const loadW=()=>{if(ready||loading||!ctx||!ctx.audioWorklet)return;loading=true;ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([BFX_SRC],{type:'application/javascript'}))).then(()=>{ready=true;rebuild()}).catch(e=>{loading=false;console.warn('fx',e)})};
  const curve=(kind)=>{const N=4096,c=new Float32Array(N);for(let i=0;i<N;i++){const x=i/(N-1)*2-1;let y;
      if(kind==='overdrive')y=x>=0?Math.tanh(x*1.2)/Math.tanh(1.2):Math.tanh(x*1.05)/Math.tanh(1.05)*.92;
      else if(kind==='distortion')y=Math.max(-1,Math.min(1,1.15*Math.tanh(2.2*x)/Math.tanh(2.2)));
      else{const b=x+.18;y=b>=0?1-Math.exp(-b*3.2):-(1-Math.exp(b*5.5))*.75;y-=.4}
      c[i]=y}return c};
  function natNode(e){const c=ctx,G=v=>{const g=c.createGain();g.gain.value=v;return g},t=e.t;
    const n={in:G(1),out:G(1),dry:G(0),wet:G(1),pre:c.createBiquadFilter(),mid:c.createBiquadFilter(),drv:G(1),sh:c.createWaveShaper(),dc:c.createBiquadFilter(),tone:c.createBiquadFilter(),lvl:G(1),nat:1};
    n.pre.type='highpass';n.pre.frequency.value=t==='overdrive'?720:t==='distortion'?260:90;n.pre.Q.value=.6;
    n.mid.type='peaking';n.mid.frequency.value=t==='overdrive'?900:t==='distortion'?1200:600;n.mid.gain.value=t==='overdrive'?4:t==='distortion'?2:-3;n.mid.Q.value=.8;
    n.sh.curve=curve(t);n.sh.oversample='4x';n.dc.type='highpass';n.dc.frequency.value=18;n.tone.type='lowpass';n.tone.Q.value=.6;
    /* overdrive keeps the lows: a clean low band goes round the clipping, like the classic green pedal */
    n.bl=c.createBiquadFilter();n.bl.type='lowpass';n.bl.frequency.value=t==='overdrive'?720:t==='distortion'?260:90;n.blg=G(t==='fuzz'?0:.9);
    n.in.connect(n.dry);n.dry.connect(n.out);n.in.connect(n.pre);n.pre.connect(n.mid);n.mid.connect(n.drv);n.drv.connect(n.sh);n.sh.connect(n.dc);n.dc.connect(n.tone);n.tone.connect(n.lvl);n.in.connect(n.bl);n.bl.connect(n.blg);n.blg.connect(n.lvl);n.lvl.connect(n.wet);n.wet.connect(n.out);
    return n}
  function natSet(n,e){const t=e.t,p=e.p,tm=ctx.currentTime,tg=(a,v)=>{a.cancelAndHoldAtTime(tm);a.setTargetAtTime(v,tm,.02)};
    const g=t==='overdrive'?Math.pow(10,(p.drive*36)/20):t==='distortion'?Math.pow(10,(6+p.drive*44)/20):Math.pow(10,(14+p.drive*40)/20);
    const mk=1/Math.min(Math.max(1,g*.25),5);tg(n.drv.gain,g);tg(n.lvl.gain,p.level*2.4*mk*(t==='fuzz'?1.4:t==='distortion'?1.7:1));tg(n.blg.gain,(t==='fuzz'?0:.9)*mk*g*.12);
    tg(n.tone.frequency,(t==='fuzz'?400:700)*Math.pow(t==='fuzz'?20:13,p.tone));
    const on=!!e.on,m=p.mix;tg(n.dry.gain,on?1-m:1);tg(n.wet.gain,on?m:0)}
  function nodeFor(e,tg){let n=NODES.get(e.id);if(n&&n.t===e.t){n.tg=tg;return n}if(n)kill(n);const d=DEFS[e.t];
    if(d.nat){n=natNode(e)}else{if(!ready)return null;const w=new AudioWorkletNode(ctx,'blonda-fx',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit',channelInterpretation:'speakers',processorOptions:{type:d.type||e.t,p:Object.assign({},e.p),byp:e.on?0:1,bpm:S.bpm,disc:disc(e.t)}});n={in:w,out:w,w}}
    n.t=e.t;n.tg=tg;NODES.set(e.id,n);return n}
  function kill(n){try{n.in.disconnect()}catch(e){globalThis.__el&&globalThis.__el(e)}try{n.out.disconnect()}catch(e){globalThis.__el&&globalThis.__el(e)}if(n.w)try{n.w.port.postMessage({kill:1})}catch(e){globalThis.__el&&globalThis.__el(e)}}
  /* every rack: the master's (S.master.rack, before the mastering EQ) and one per mixer channel (tfx[id].rack, inside the channel
     strip between its make-up gain and its pump / fader, like inserts on a desk). A rack that was never used leaves the wiring
     exactly as it was. */
  const TG=()=>['m',...TRACKS.map(t=>'c:'+t.id)];
  const arrOf=tg=>{if(tg==='m')return R();const F=tfxOf(tg.slice(2));if(!Array.isArray(F.rack))F.rack=[];return F.rack};
  const ioOf=tg=>{if(!ctx||!A.mst)return null;if(tg==='m')return A.mst.fxIn?[A.mst.fxIn,A.mst.fxOut]:null;const i=TRACKS.findIndex(t=>'c:'+t.id===tg),c=A.ch&&A.ch[i];return c&&c.mk&&c.pg?[c.mk,c.pg]:null};
  const sk=tg=>arrOf(tg).map(e=>e.id+e.t).join(','),lastS={};
  function rebuild(tg){if(tg==null){TG().forEach(rebuild);return}const io=ioOf(tg);if(!io)return;loadW();const rack=arrOf(tg),[I,O]=io;
    const ids=new Set(rack.map(e=>e.id));for(const [id,n] of NODES)if(n.tg===tg&&!ids.has(id)){kill(n);NODES.delete(id)}
    if(!rack.length&&!lastS[tg]){lastS[tg]='';return}
    try{I.disconnect()}catch(e){globalThis.__el&&globalThis.__el(e)}NODES.forEach(n=>{if(n.tg===tg)try{n.out.disconnect()}catch(e){globalThis.__el&&globalThis.__el(e)}});
    let prev=I;rack.forEach(e=>{const n=nodeFor(e,tg);if(!n)return;prev.connect(n.in);prev=n.out;sendP(e)});prev.connect(O);lastS[tg]=sk(tg)}
  function sendP(e){const n=NODES.get(e.id);if(!n)return;if(n.nat){natSet(n,e);return}n.w.port.postMessage({p:e.p,byp:e.on?0:1,bpm:S.bpm})}
  let lastBpm=0;
  {const _m=applyMastering;applyMastering=function(){const r=_m.apply(this,arguments);try{if(ctx&&A.mst&&A.mst.fxIn){if(!NODES.size&&TG().some(t=>arrOf(t).length))rebuild();if(S.bpm!==lastBpm){lastBpm=S.bpm;NODES.forEach(n=>{if(n.w)n.w.port.postMessage({bpm:S.bpm})})}}}catch(e){globalThis.__el&&globalThis.__el(e)}return r}}
  const changed=(e,struct,tg)=>{tg=tg||'m';if(struct||sk(tg)!==lastS[tg])rebuild(tg);else if(e)sendP(e);save();paint()};
  /* ---------- value formatting / mapping ---------- */
  const fmt=(q,v)=>{if(q.opts)return {n:q.opts[Math.round(v)]||'–',u:''};if(q.u==='%')return {n:String(Math.round(v*100)),u:'%'};
    if(q.u==='s'&&v<1)return {n:String(Math.round(v*1000)),u:'ms'};if(q.u==='Hz'&&v>=1000)return {n:(v/1000).toFixed(v>=10000?1:2).replace(/\.?0+$/,''),u:'kHz'};
    if(q.int)return {n:String(Math.round(v)),u:q.u||''};return {n:v<10?v.toFixed(2).replace(/0$/,''):v<100?v.toFixed(1):String(Math.round(v)),u:q.u||''}};
  const toN=(q,v)=>q.log?Math.log(v/q.min)/Math.log(q.max/q.min):(v-q.min)/(q.max-q.min);
  const fromN=(q,u)=>{u=Math.max(0,Math.min(1,u));let v=q.log?q.min*Math.pow(q.max/q.min,u):q.min+u*(q.max-q.min);if(q.opts||q.int){v=Math.round(v);if(q.step)v=q.min+Math.round((v-q.min)/q.step)*q.step}return v};
  const visPs=e=>DEFS[e.t].ps.filter(q=>!(q.hideIf&&q.hideIf(e.p)));
  /* ---------- tiles next to the classic four ---------- */
  const ICON={mod:'<path d="M2 9c2-5 4-5 6 0s4 5 6 0"/>',verb:'<path d="M3 14a6 6 0 0 1 12 0M5.6 14a3.4 3.4 0 0 1 6.8 0"/>',dly:'<circle cx="5" cy="9" r="3"/><circle cx="10.5" cy="9" r="2"/><circle cx="14.5" cy="9" r="1.2"/>',drv:'<path d="M2 12h3l2-6 3 8 2-5h4"/>',flt:'<path d="M2 6h7c3 0 4 2 5 6l2 2"/>'};
  const sel={};let tiles=new Map();
  const addTile=document.createElement('div');addTile.className='ptile rk-add';addTile.innerHTML='<div class="rk-plus">+</div><div class="nm">effekt</div>';addTile.title='Lägg till en effekt';
  addTile.onclick=()=>openWin(true);
  function paintTiles(){const rack=R();
    for(const [id,t] of tiles)if(!rack.find(e=>e.id===id)){t.remove();tiles.delete(id)}
    rack.forEach(e=>{let t=tiles.get(e.id);const d=DEFS[e.t];if(!t){t=document.createElement('div');t.className='ptile rk';tiles.set(e.id,t);
        t.innerHTML=`<div class="ptl-h"><svg class="ic" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.4">${ICON[d.cat]}</svg><div class="nm">${d.n}<br>${CAT[d.cat].n[0].toUpperCase()+CAT[d.cat].n.slice(1)}</div></div>
          <button class="pedit" aria-label="Byt parameter"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M9.5 2.5l2 2L5 11H3V9z"/></svg></button>
          <div class="pfoot"><div><div class="pcap"></div><div class="pnum" title="Dra upp/ner"><span></span><sup></sup></div></div><button class="pact"><svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 5.2l2 2 4-4.4"/></svg><span>active</span></button></div>`;
        t.style.setProperty('--pc',CAT[d.cat].c);
        t.querySelector('.pedit').onclick=ev=>{ev.stopPropagation();const ps=visPs(e);sel[e.id]=((sel[e.id]||0)+1)%ps.length;paintTiles()};
        t.querySelector('.pact').onclick=ev=>{ev.stopPropagation();initAudio();e.on=e.on?0:1;changed(e);toast(d.n+(e.on?' aktiv':' bypass'))};
        t.querySelector('.ptl-h').ondblclick=()=>openWin(false,e.id);t.querySelector('.ptl-h').title='Dubbelklick: alla rattar';
        const num=t.querySelector('.pnum');let y0=0,u0=0,dn=false;
        num.addEventListener('pointerdown',ev=>{ev.preventDefault();ev.stopPropagation();const ps=visPs(e),q=ps[(sel[e.id]||0)%ps.length];dn=true;y0=ev.clientY;u0=toN(q,e.p[q.k]);try{num.setPointerCapture(ev.pointerId)}catch(_){globalThis.__el&&globalThis.__el(_)}});
        num.addEventListener('pointermove',ev=>{if(!dn)return;const ps=visPs(e),q=ps[(sel[e.id]||0)%ps.length];e.p[q.k]=fromN(q,u0+(y0-ev.clientY)*(ev.shiftKey?.25:1)/(q.opts?40:200));sendP(e);paintTiles()});
        const up=()=>{if(dn){dn=false;save();paintWin()}};num.addEventListener('pointerup',up);num.addEventListener('pointercancel',up)}
      const ps=visPs(e),i=(sel[e.id]||0)%ps.length,q=ps[i],f=fmt(q,e.p[q.k]);t.classList.toggle('off',!e.on);t.querySelector('.pact span').textContent=e.on?'active':'bypass';
      t.querySelector('.pnum span').textContent=f.n;t.querySelector('.pnum sup').textContent=f.u;t.querySelector('.pcap').textContent=q.l+' · '+(i+1)+'/'+ps.length});
    addTile.hidden=rack.length>=MAX;
    /* only move tiles when the order really changed: moving an element while it is being dragged drops the drag */
    const want=[...rack.map(e=>tiles.get(e.id)),addTile],have=[...grid.children].filter(x=>x.classList.contains('rk')||x===addTile);
    if(want.length!==have.length||want.some((x,i)=>x!==have[i]))want.forEach(x=>grid.appendChild(x))}
  /* ---------- the fx tab in the mastering window ---------- */
  let pane=null,lib=null,chainEl=null,tgEl=null,libOpen=false,curT='m';
  const tgName=tg=>tg==='m'?'master':(TRACKS.find(t=>'c:'+t.id===tg)||{name:'?'}).name.toLowerCase();
  if(window.__pqOv){pane=__pqOv.addTab('fx','fx',()=>paintWin(true));
    pane.innerHTML='<div class="rk-tg"></div><div class="rk-chain"></div><div class="rk-lib" hidden></div>';chainEl=pane.querySelector('.rk-chain');lib=pane.querySelector('.rk-lib');tgEl=pane.querySelector('.rk-tg');
    tgEl.addEventListener('click',ev=>{const b=ev.target.closest('button[data-tg]');if(!b)return;curT=b.dataset.tg;libOpen=!arrOf(curT).length;paintWin(true)});
    lib.innerHTML=Object.keys(CAT).map(c=>`<div class="rk-cat" style="--cc:${CAT[c].c}"><b>${CAT[c].n}</b>${ORDER.filter(t=>DEFS[t].cat===c).map(t=>`<button data-t="${t}">${DEFS[t].n}</button>`).join('')}</div>`).join('');
    lib.addEventListener('click',ev=>{const b=ev.target.closest('button[data-t]');if(!b)return;const A2=arrOf(curT);if(A2.length>=MAX){toast('Max '+MAX+' effekter');return}initAudio();const t=b.dataset.t,e={id:uid(),t,on:1,p:defP(t)};A2.push(e);libOpen=false;changed(e,true,curT);paintWin(true);toast(DEFS[t].n+' · '+tgName(curT))})}
  function openWin(withLib,focus,tg){if(!window.__pqOv)return;curT=tg||'m';libOpen=!!withLib||!arrOf(curT).length;__pqOv.open('fx');paintWin(true);if(focus){const c=chainEl.querySelector(`[data-id="${focus}"]`);if(c)c.scrollIntoView({inline:'center',block:'nearest'})}}
  function paintWin(full){if(!pane||pane.hidden)return;const rack=arrOf(curT),tg=curT;
    if(full)tgEl.innerHTML=['m',...(window.trkList?trkList():TRACKS.map((_,i)=>i)).map(i=>'c:'+TRACKS[i].id)].map(t=>{const n=arrOf(t).length;return `<button data-tg="${t}" class="${t===curT?'on':''}${n?' has':''}">${tgName(t)}${n?`<sup>${n}</sup>`:''}</button>`}).join('');
    if(full){chainEl.innerHTML='';rack.forEach((e,i)=>{const d=DEFS[e.t],card=document.createElement('div');card.className='rk-card';card.dataset.id=e.id;card.style.setProperty('--cc',CAT[d.cat].c);
        card.innerHTML=`<div class="rk-ch"><span class="rk-n"><b>${d.n}</b></span><small class="rk-cg">${CAT[d.cat].n}</small><button class="rk-b" data-a="l" title="Flytta vänster">◀</button><button class="rk-b" data-a="r" title="Flytta höger">▶</button><button class="rk-b" data-a="x" title="Ta bort">✕</button></div><button class="rk-on"></button><div class="rk-k knobs"></div>`;
        const kb=card.querySelector('.rk-k');
        d.ps.forEach(q=>{if(q.hideIf&&q.hideIf(e.p))return;const k=__dknob(kb,{light:q.k==='mix',label:q.l,min:0,max:1,def:toN(q,q.def),fmt:u=>{const f=fmt(q,fromN(q,u));return f.n+(f.u&&f.u!=='%'?' '+f.u:f.u)},get:()=>toN(q,e.p[q.k]),set:u=>{const v=fromN(q,u);if(v===e.p[q.k])return;e.p[q.k]=v;sendP(e);paintTiles();clearTimeout(card._t);const later=()=>{if(pane.querySelector('.dk.active')){card._t=setTimeout(later,200);return}save();if(q.k==='sync')paintWin(true)};card._t=setTimeout(later,300)}});k.classList.add('rk-kn')});
        card.querySelector('.rk-on').onclick=()=>{e.on=e.on?0:1;changed(e,false,tg);paintWin()};
        card.querySelectorAll('.rk-b').forEach(b=>b.onclick=()=>{const a=b.dataset.a,r=arrOf(tg),j=r.indexOf(e);if(a==='x'){r.splice(j,1);changed(null,true,tg);paintWin(true);return}const k2=a==='l'?j-1:j+1;if(k2<0||k2>=r.length)return;[r[j],r[k2]]=[r[k2],r[j]];changed(null,true,tg);paintWin(true)});
        chainEl.appendChild(card)});
      const add=document.createElement('button');add.className='rk-addc';add.innerHTML='<b>+</b><span>lägg till effekt</span>';add.hidden=rack.length>=MAX;add.onclick=()=>{libOpen=!libOpen;paintWin()};chainEl.appendChild(add);
      if(!rack.length){const em=document.createElement('div');em.className='rk-empty';em.textContent=(tg==='m'?'Master':tgName(tg))+' · inga effekter än · välj en nedan';chainEl.prepend(em)}}
    chainEl.querySelectorAll('.rk-card').forEach(card=>{const e=rack.find(x=>x.id===card.dataset.id);if(!e)return;card.classList.toggle('off',!e.on);const b=card.querySelector('.rk-on');b.textContent=e.on?'on':'bypass';b.classList.toggle('on',!!e.on)});
    lib.hidden=!libOpen}
  function paint(){paintTiles();paintWin();paintStrips()}
  /* the mixer: an fx button on every channel strip (how many inserts it has; lit when it has any) */
  function addStripBtns(){if(typeof MXS==='undefined')return;TRACKS.forEach((t,i)=>{const X=MXS[i];if(!X||!X.el||X.el.querySelector('.fxb'))return;const b=document.createElement('button');b.className='fxb';b.title='Insert-effekter på '+t.name.toLowerCase();
      b.onclick=ev=>{ev.stopPropagation();openWin(false,null,'c:'+t.id)};const lab=X.el.querySelector('.mlab');X.el.insertBefore(b,lab||null)});
    /* the other strips (Starter, buses, master) get an empty space of the same height, so every fader lines up */
    setTimeout(()=>mxEl.querySelectorAll('.ms').forEach(el=>{if(el.querySelector('.fxb'))return;const sp=document.createElement('span');sp.className='fxb fxb-sp';sp.setAttribute('aria-hidden','true');el.insertBefore(sp,el.querySelector('.mlab')||null)}),0);paintStrips()}
  function paintStrips(){if(typeof MXS==='undefined')return;TRACKS.forEach((t,i)=>{const b=MXS[i]&&MXS[i].el&&MXS[i].el.querySelector('.fxb');if(!b)return;const r=arrOf('c:'+t.id),n=r.length,txt=n?'fx '+n:'fx';if(b.textContent!==txt)b.textContent=txt;b.classList.toggle('has',n>0);b.classList.toggle('act',r.some(e=>e.on))})}
  {const _b=buildMixer;buildMixer=function(){_b.apply(this,arguments);addStripBtns()}}addStripBtns();
  /* keep in step: project loads, undo, and the audio starting */
  /* keep in step with project loads and undo. The window's cards are only rebuilt when effects are added, removed or moved;
     a value that changed (a knob being turned) only repaints, so the knob in your hand is never replaced mid-drag */
  const lastK={},lastW={};setInterval(()=>{let any=false,struct=false;TG().forEach(tg=>{const k=JSON.stringify(arrOf(tg));if(k===lastK[tg])return;lastK[tg]=k;any=true;
      const s2=sk(tg);if(s2!==lastW[tg]){lastW[tg]=s2;struct=true}
      if(ctx&&A.mst){if(s2!==(lastS[tg]||''))rebuild(tg);else arrOf(tg).forEach(sendP)}});
    if(any){paintTiles();paintStrips();if(struct)paintWin(true);else{paintWin();if(pane&&!pane.hidden&&!pane.querySelector('.dk.active'))pane.querySelectorAll('.rk-card .dk').forEach(k=>k.refresh&&k.refresh())}}
    if(ctx&&A.mst&&!NODES.size&&TG().some(t=>arrOf(t).length))rebuild();if(ctx&&!ready)loadW()},400);
  paintTiles();
  const st=document.createElement('style');st.textContent=`
.ptile.rk .ptl-h{cursor:default}
.card.master.mx2 .m2-fx .ptiles{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))!important}
.card.master.mx2 .m2-fx .ptiles>.ptile{justify-self:stretch;width:auto;min-width:0;box-sizing:border-box}
.card.master.mx2 .m2-fx .ptiles>.ptile:not(.rk-add)>:is(.ptl-h,.pfoot){align-self:stretch}
.ptile.rk-add{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;opacity:.7;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14)!important;background:transparent!important;min-height:0!important}
.ptile.rk-add:hover{opacity:1}.ptile.rk-add[hidden]{display:none}
.rk-plus{font:300 26px/1 var(--f-linje,inherit)}.ptile.rk-add .nm{font:400 10px var(--f-mono)!important}
.rk-tg{display:flex;flex-wrap:wrap;gap:4px}
.rk-tg button{font:500 10px var(--f-mono);letter-spacing:.04em;padding:4px 10px;border:0;border-radius:var(--dk-r2,4px);background:transparent;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);color:inherit;opacity:.55;cursor:pointer}
.rk-tg button.has{opacity:.85}.rk-tg button.on{opacity:1;background:#ECEAE3;color:#111211;box-shadow:none}.rk-tg sup{font-size:8px;margin-left:3px}
.mixer .ms .fxb{font:500 8.5px var(--f-mono)!important;letter-spacing:.04em;height:16px;margin:2px 4px 0;padding:0!important;border:0;border-radius:var(--dk-r2,3px);background:transparent;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);color:inherit;opacity:.5;cursor:pointer}
.mixer .ms .fxb.fxb-sp{display:block;visibility:hidden;pointer-events:none}
.mixer .ms .fxb:hover{opacity:.9}.mixer .ms .fxb.has{opacity:.85}.mixer .ms .fxb.act{background:#ECEAE3;color:#111211;box-shadow:none;opacity:1}
body.look-studio .mixer .ms .fxb,.daw .mixer .ms .fxb{border-radius:0;box-shadow:inset 0 0 0 1px var(--dk-line,rgba(255,255,255,.14))}
.pq-ov.dots .rk-tg button.on{background:#ECEAE3}
.rk-chain{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;min-height:210px;align-items:stretch;scrollbar-width:thin}
.rk-card{flex:0 0 auto;min-width:240px;max-width:360px;display:flex;flex-direction:column;gap:8px;padding:10px 12px 12px;border-radius:var(--dk-r2,10px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),inset 0 2px 0 var(--cc)}
.pq-ov.studio .rk-card{border-radius:2px;box-shadow:inset 0 0 0 1px #373738,inset 0 2px 0 var(--cc)}
.rk-card.off .rk-k{opacity:.4}
.rk-ch{display:flex;align-items:center;gap:4px}.rk-n{flex:1;display:flex;flex-direction:column}.rk-n b{font:600 12px var(--f-mono)}.rk-n small{font:9px var(--f-mono);color:var(--cc)}
.rk-b{font:10px var(--f-mono);width:22px;height:22px;border:0;border-radius:var(--dk-r2,4px);background:transparent;color:inherit;opacity:.55;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}.rk-b:hover{opacity:1}
.rk-on{align-self:flex-start;font:500 9px var(--f-mono);letter-spacing:.06em;padding:3px 9px;border:0;border-radius:var(--dk-r2,4px);background:transparent;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18);color:inherit;cursor:pointer;opacity:.7}
.rk-on.on{background:var(--cc);color:#111211;box-shadow:none;opacity:1}
.rk-k{display:grid!important;grid-template-columns:repeat(4,minmax(52px,1fr));gap:10px 6px}
.rk-addc{flex:0 0 120px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:0;border-radius:var(--dk-r2,10px);background:transparent;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);color:inherit;cursor:pointer;opacity:.7;font:10px var(--f-mono)}
.rk-addc b{font:300 28px/1 var(--f-linje,inherit)}.rk-addc:hover{opacity:1}.rk-addc[hidden]{display:none}
.rk-empty{align-self:center;font:11px var(--f-mono);opacity:.5;padding:0 12px}
.rk-lib{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.rk-lib[hidden]{display:none}
.rk-cat{display:flex;flex-direction:column;gap:4px}.rk-cat b{font:600 10px var(--f-mono);letter-spacing:.08em;color:var(--cc);padding:2px 0 4px}
.rk-cat button{font:11px var(--f-mono);text-align:left;padding:7px 10px;border:0;border-radius:var(--dk-r2,6px);background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);color:inherit;cursor:pointer}
.rk-cat button:hover{box-shadow:inset 0 0 0 1px var(--cc)}
@media (max-width:700px){.rk-lib{grid-template-columns:repeat(2,minmax(0,1fr))}}
.pq-ov.dots .rk-n small,.pq-ov.dots .rk-cat b{color:#ECEAE3}.pq-ov.dots .rk-k .knob{--kc:#ECEAE3!important}.pq-ov.dots .rk-cat button{box-shadow:inset 0 0 0 1px #ECEAE3}.pq-ov.dots .rk-on.on{background:#ECEAE3}`;document.head.appendChild(st);
  window.__rack={DEFS,R,arrOf,NODES:()=>NODES,rebuild,ready:()=>ready,paint,openWin}})();

