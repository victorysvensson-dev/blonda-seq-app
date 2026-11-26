/* ---------------- instrument engines ---------------- */
const VOIC={bass:[0],keys:[0,3,7,10,14],lead:[0]};
const hz=m=>440*Math.pow(2,(m-69)/12);
function scaleChord(n){let i=SCALE.indexOf(n);if(i<0)i=SCALE.findIndex(x=>x>=n);if(i<0||i+6>=SCALE.length)return [0,7,10,15];return [0,SCALE[i+2]-n,SCALE[i+4]-n,SCALE[i+6]-n]}
const pc=v=>[String(Math.round(v*100)),'%'],msF=x=>x<1?[String(Math.round(x*1000)),'ms']:[x.toFixed(2),'s'];
const FM_R=[.5,1,1.5,2,3,3.5,7];
const ENG={
 msx:{name:'Sample+',tag:'your sampled instruments · multisample',dot:'#EDEBE3',ps:[{k:'att',l:'attack',f:v=>msF(.001+v*v*2)},{k:'dec',l:'decay',f:v=>msF(.02+v*v*4)},{k:'sus',l:'sustain',f:pc},{k:'rel',l:'release',f:v=>msF(.02+v*v*4)}],opts:[]},
 analog:{name:'Analog',tag:'subtractive · envelope',dot:'#F2788E'},
 enkel:{name:'Enkel',tag:'starterns ljud · enkel synt',ps:[],opts:[]},
 smp:{name:'Sampler',tag:'starterns röst och ljud',ps:[],opts:[]},
 acid:{name:'Acid',tag:'303-bas · resonansfilter',dot:'#C9F23A',ps:[
   {k:'cut',l:'cutoff',f:v=>{const h=acidHz(v);return h>=1000?[(h/1000).toFixed(h>=10000?0:1),'khz']:[String(Math.round(h)),'hz']}},{k:'res',l:'reso',f:pc},{k:'env',l:'env mod',f:pc},
   {k:'dec',l:'decay',f:v=>msF(.06+v*.9)},{k:'acc',l:'accent',f:pc},{k:'drive',l:'dist',f:pc},{k:'dtone',l:'dist ton',f:pc},{k:'st',l:'slide tid',f:v=>msF(.02+v*.28)}],
   opts:[{k:'wave',ch:[['sawtooth','saw'],['square','square']]},{k:'slide',ch:[[0,'slide via kablar'],[1,'auto-slide']]}]},
 sub:{name:'Sub 808',tag:'sub · punch · glid',dot:'#FF3B2F',ps:[
   {k:'decay',l:'decay',f:v=>msF(.1+v*2.5)},{k:'punch',l:'punch',f:v=>[String(Math.round(v*24)),'st']},{k:'drive',l:'drive',f:pc},
   {k:'tone',l:'ton',f:pc},{k:'glide',l:'glid',f:v=>msF(v*.25)},{k:'click',l:'klick',f:pc}]},
 fm:{name:'FM Glass',tag:'2-operator · klockor',dot:'#8CCBFF',ps:[
   {k:'ratio',l:'ratio',max:6,step:1,f:v=>[String(FM_R[Math.round(v)]),'×']},{k:'index',l:'index',f:v=>[(v*10).toFixed(1),'']},{k:'decay',l:'decay',f:v=>msF(.2+v*2.5)},
   {k:'bell',l:'bell',f:pc},{k:'rel',l:'release',f:v=>msF(.05+v*1.5)},{k:'bright',l:'ljus',f:pc}]},
 pluck:{name:'Pluck',tag:'sträng · karplus-strong',dot:'#1F8A5B',ps:[
   {k:'damp',l:'sustain',f:pc},{k:'bright',l:'ljus',f:pc},{k:'body',l:'anslag',f:pc},{k:'len',l:'längd',f:v=>msF(.4+v*2.6)},{k:'width',l:'bredd',f:pc},{k:'drive',l:'värme',f:pc}]},
 bris:{name:'Bris',tag:'6 röster · ladder · chorus',dot:'#3D7BFF',ps:[
   {k:'cut',l:'cutoff',f:v=>{const h=24*Math.pow(2,v*9.6);return h>=1000?[(h/1000).toFixed(1),'khz']:[String(Math.round(h)),'hz']}},{k:'res',l:'reso',f:pc},{k:'fenv',l:'env',f:pc},
   {k:'aA',l:'attack',f:v=>msF(brT(v,6))},{k:'aR',l:'release',f:v=>msF(brT(v,10))},{k:'det',l:'detune',f:pc},{k:'sub',l:'sub',f:pc},{k:'choMix',l:'chorus',f:pc},{k:'dly',l:'delay',f:pc}],
   opts:[{k:'wave',ch:[[0,'såg'],[1,'fyrkant']]},{k:'vmode',ch:[[0,'poly 6'],[1,'mono'],[2,'unison']]}]},
 sh101:{name:'SH-101',tag:'mono · 1 vco · sub · 24 dB',dot:'#2F6FE0',ps:[
   {k:'cut',l:'freq',f:v=>{const h=22*Math.pow(2,v*9.8);return h>=1000?[(h/1000).toFixed(1),'khz']:[String(Math.round(h)),'hz']}},{k:'res',l:'res',f:pc},{k:'env',l:'env',f:pc},
   {k:'D',l:'decay',f:v=>msF(shT(v,10))},{k:'S',l:'sustain',f:pc},{k:'saw',l:'saw',f:pc},{k:'pulse',l:'puls',f:pc},{k:'sub',l:'sub',f:pc},{k:'pw',l:'pw',f:pc},{k:'porta',l:'portamento',f:v=>msF(.004+v*v*1.6)}],
   opts:[{k:'range',ch:[[0,"16′"],[1,"8′"],[2,"4′"],[3,"2′"]]},{k:'subMode',ch:[[0,'sub −1'],[1,'sub −2'],[2,'sub puls']]}]},
 mini:{name:'Moog',tag:'model d · 3 osc · ladder',dot:'#E89B3C',ps:[
   {k:'cut',l:'cutoff',f:v=>{const h=30*Math.pow(2,v*9.6);return h>=1000?[(h/1000).toFixed(1),'khz']:[String(Math.round(h)),'hz']}},{k:'emph',l:'emphasis',f:pc},{k:'contour',l:'contour',f:pc},
   {k:'fD',l:'filter decay',f:v=>msF(shT(v,10))},{k:'aD',l:'decay',f:v=>msF(shT(v,10))},{k:'aS',l:'sustain',f:pc},{k:'m1',l:'osc 1',f:pc},{k:'m2',l:'osc 2',f:pc},{k:'m3',l:'osc 3',f:pc},{k:'glide',l:'glide',f:v=>msF(.004+v*v*2)}],
   opts:[{k:'glideOn',ch:[[0,'glide av'],[1,'glide på']]},{k:'decSw',ch:[[0,'decay av'],[1,'decay på']]}]},
 grime:{name:'Grime',tag:'mono · wob · dyk · glid',dot:'#B8F23A',ps:[
   {k:'cut',l:'cutoff',f:v=>{const h=35*Math.pow(2,v*9);return h>=1000?[(h/1000).toFixed(1),'khz']:[String(Math.round(h)),'hz']}},{k:'res',l:'reso',f:pc},{k:'wob',l:'wob',f:pc},
   {k:'rate',l:'wob-takt',max:5,step:1,f:v=>[['1/4','1/8','1/8T','1/16','1/16T','1/32'][Math.round(v)],'']},{k:'amp',l:'wob nivå',f:pc},{k:'env',l:'env',f:pc},{k:'dec',l:'decay',f:v=>msF(.02+v*.5)},
   {k:'dive',l:'dyk',f:v=>[String(Math.round(v*24)),'st']},{k:'dt',l:'dyktid',f:v=>msF(.03+v*v*1.4)},{k:'glide',l:'glid',f:v=>msF(.008+v*v*.55)},{k:'sub',l:'sub',f:pc},{k:'drive',l:'drive',f:pc},{k:'growl',l:'growl',f:pc}],
   opts:[{k:'pre',ch:[[0,'wob'],[1,'evolver'],[2,'stabs'],[3,'growl'],[4,'dyk'],[5,'reese']]},{k:'oct',ch:[[-1,'okt −1'],[0,'okt 0'],[1,'okt +1'],[2,'okt +2']]},{k:'wave',ch:[[0,'osc såg'],[1,'osc fyrkant'],[2,'osc fm']]},{k:'shape',ch:[[0,'wob sinus'],[1,'wob fyrkant'],[2,'wob såg'],[3,'wob slump']]}]},
 chip:{name:'Chip',tag:'8-bit · puls · arpeggio',dot:'#8BAC0F',ps:[
   {k:'dec',l:'decay',f:v=>msF(.05+v*1.4)},{k:'vib',l:'vibrato',f:pc},{k:'arp',l:'arp-fart',f:v=>[String(Math.round(10+v*40)),'hz']},{k:'crush',l:'bitar',f:v=>[String(Math.round(8-v*5)),'bit']}],
   opts:[{k:'duty',ch:[[0,'puls 12%'],[1,'puls 25%'],[2,'fyrkant'],[3,'triangel']]},{k:'arpm',ch:[[0,'arp: ackord'],[1,'dur'],[2,'moll'],[3,'oktav'],[4,'av']]},{k:'oct',ch:[[0,'okt 0'],[1,'okt +1'],[-1,'okt −1']]}]},
 super:{name:'Super Pad',tag:'7 sågtänder · luft',dot:'#B9A6FF',ps:[
   {k:'detune',l:'detune',f:v=>[String(Math.round(v*40)),'ct']},{k:'attack',l:'attack',f:v=>msF(.01+v*1.5)},{k:'release',l:'release',f:v=>msF(.1+v*3)},
   {k:'bright',l:'ljus',f:pc},{k:'width',l:'bredd',f:pc},{k:'air',l:'luft',f:pc}]},
};
function engOvf(){const e=document.getElementById('engs');if(e)e.classList.toggle('ovf',e.scrollWidth>e.clientWidth+2)}
addEventListener('resize',()=>{engOvf();requestAnimationFrame(()=>{try{renderLens()}catch(e){globalThis.__el&&globalThis.__el(e)}})});
try{stateHealEng()}catch(e){console.error('stateHealEng',e)}healNote();
const ENG_ORDER=['analog','bris','acid','sh101','mini','grime','sub','fm','pluck','chip','super','msx'];
let GL=null;
/* (v272) VGL: the glide from the track's last note (voice mode), on top of any glide drawn in the notes */
let VGL=null,VMONO=false;const VMS={};
function glideOsc(prm,f0,t){if(VGL&&f0>0){try{prm.setValueAtTime(f0*Math.pow(2,VGL.iv/12),t);prm.exponentialRampToValueAtTime(f0,t+VGL.time)}catch(e){globalThis.__el&&globalThis.__el(e)}}if(!GL)return;let last=f0;for(const g of GL.list){const tt=t+g.at*GL.sd,f=f0*Math.pow(2,(g.n-GL.n0)/12);
  prm.setValueAtTime(last,Math.max(t+.002,tt-GL.gt));prm.exponentialRampToValueAtTime(f,tt);last=f}}
const distCache=new Map();
function distCurve(a){const k=Math.round(a*20);if(distCache.has(k))return distCache.get(k);const n=2048,c=new Float32Array(n),g=1+k/20*38,gn=g*.75;
  for(let i=0;i<n;i++){const x=i/(n-1)*2-1;c[i]=x>=0?Math.tanh(g*x)/Math.tanh(g):Math.tanh(gn*x)/Math.tanh(gn)}distCache.set(k,c);return c}
const acidLast={},subLast={},ksCache=new Map(),dcCache=new Map();
const dCurve=a=>{const k=Math.round(a*20);if(!dcCache.has(k))dcCache.set(k,driveCurve(k/20));return dcCache.get(k)};
let VOIC1=false;
/* (v272) mono/legato: one note at a time, the last one cut; glide from the last note (legato: only when the notes touch) */
function melVoice(id,t,v,p,out,note,len){const M=(S.vm||{})[id],m=M?M.m|0:0,gl=M?+M.gl||0:0,e=S.inst[id]||'analog';if(!m&&!(gl>0))return melVoice0(id,t,v,p,out,note,len);
  const L=VMS[id],touch=L&&t<L.end+.012&&t>=L.t,glide=L&&t>L.t&&(m===2?touch:t-L.t<4),time=gl>0?.006+gl*gl*1.4:m===2?.045:0;
  let o=out;if(m&&e!=='enkel'&&e!=='smp'&&out&&out.context){const c=out.context,g=c.createGain();g.connect(out);o=g;if(L&&L.g&&L.c===c){try{L.g.gain.cancelScheduledValues(t);L.g.gain.setValueAtTime(L.g.gain.value||1,t);L.g.gain.setTargetAtTime(0,t,.006)}catch(_){globalThis.__el&&globalThis.__el(_)}const og=L.g;if(c===ctx)setTimeout(()=>{try{og.disconnect()}catch(_){globalThis.__el&&globalThis.__el(_)}},Math.max(0,(t-c.currentTime)*1000)+3000)}}
  VMS[id]={t,end:t+(len||.2),n:note,g:o!==out?o:null,c:out&&out.context};VGL=glide&&time>0&&L.n!==note?{iv:L.n-note,time}:null;VMONO=!!m;
  try{melVoice0(id,t,v,p,o,note,len)}finally{VGL=null;VMONO=false}}
function melVoice0(id,t,v,p,out,note,len){const e=S.inst[id]||'analog',vc=(VOIC1||VMONO||(S.chord&&S.chord[id]===0))?[0]:id==='pad'?scaleChord(note):VOIC[id];
  switch(e){case 'acid':acidVoice(id,t,v,p,out,note,len);break;case 'sub':subVoice(id,t,v,p,out,note,len);break;case 'fm':fmVoice(t,v,p,out,note,len,vc);break;
    case 'pluck':pluckVoice(t,v,p,out,note,len,vc);break;case 'sh101':sh101Voice(id,t,v,p,out,note,len);break;case 'mini':miniVoice(id,t,v,p,out,note,len);break;case 'chip':chipVoice(t,v,p,out,note,len,vc);break;case 'bris':brisVoice(id,t,v,p,out,note,len,vc);break;case 'grime':grimeVoice(id,t,v,p,out,note,len);break;case 'super':superVoice(t,v,p,out,note,len,vc);break;case 'enkel':if(window.enkelVoice)enkelVoice(id,t,v,p,out,note,len,vc);break;case 'smp':if(window.smpVoice2)smpVoice2(id,t,v,p,out,note,len);break;case 'msx':if(window.TEX&&TEX.play)TEX.play(id,t,v,p,out,note,len,vc);break;
    default:synthVoice(t,v,p,out,note,len,S.synth[id],vc,id==='bass')}}
function acidVoice(id,t,v,p,out,note,len){const E=S.eng.acid,fr=hz(note+p.tune),acc=v>=.95,last=acidLast[id],o=ctx.createOscillator();o.type=E.wave;
  if(E.slide&&last&&t>last.t&&t-last.t<len*1.6){o.frequency.setValueAtTime(last.f,t);o.frequency.exponentialRampToValueAtTime(fr,t+.02+E.st*.28)}else o.frequency.setValueAtTime(fr,t);acidLast[id]={t,f:fr};glideOsc(o.frequency,fr,t);
  /* 24 dB ladder-ish: two cascaded lowpass stages, resonance on the second, deeper + fully open range */
  const ny=ctx.sampleRate*.45,open=E.cut>.97,rs=Math.pow(E.res,1.15),
    base=Math.min(ny,acidHz(E.cut)*(.6+p.tone*.8)),
    peak=Math.min(ny,base*(1+E.env*(acc?1+E.acc:1)*14)),dec=(.06+E.dec*.9)*(acc?.7:1);
  const f1=ctx.createBiquadFilter(),f=ctx.createBiquadFilter();f1.type=f.type='lowpass';f1.Q.value=.55;
  const q=.7+rs*30;f.Q.setValueAtTime(acc?q*(1+E.acc*.35):q,t);
  const dc=ctx.createBiquadFilter();dc.type='highpass';dc.frequency.value=28;dc.Q.value=.6;
  [f1,f].forEach(n=>{n.frequency.setValueAtTime(peak,t);n.frequency.setTargetAtTime(base,t+.003,dec/3)});
  if(open){f1.frequency.cancelAndHoldAtTime(t);f1.frequency.setValueAtTime(ny,t)}
  liveReg({fs:open?[f]:[f1,f],cc:()=>1200*Math.log2(acidHz(E.cut)*(.6+p.tone*.8)),qs:[[f,()=>(.7+Math.pow(E.res,1.15)*30)*(acc?1+E.acc*.35:1)]],end:t+len*4+3});
  const sh=ctx.createWaveShaper();sh.curve=distCurve(E.drive);sh.oversample='4x';
  const dt=ctx.createBiquadFilter();dt.type='lowpass';dt.Q.value=.5;dt.frequency.value=Math.min(ny,2200*Math.pow(2,E.dtone*3.2)*(1+(1-E.drive)*1.5));
  const g=ctx.createGain(),gate=Math.max(.05,len*(.5+p.decay*2.2)),lvl=v*(acc?.75+E.acc*.35:.65)/(1+rs*1.5)/(1+E.drive*.9);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(lvl,t+.004);g.gain.setValueAtTime(lvl,t+gate);g.gain.exponentialRampToValueAtTime(.0001,t+gate+.06);
  o.connect(f1);f1.connect(f);f.connect(sh);sh.connect(dt);dt.connect(dc);dc.connect(g);g.connect(out);o.start(t);o.stop(t+gate+.12)}
function acidHz(v){return 22*Math.pow(2,v*9.6)}
function subVoice(id,t,v,p,out,note,len){const E=S.eng.sub,fr=hz(note-12+p.tune),last=subLast[id],o=ctx.createOscillator();o.type='sine';
  const gl=E.glide>0&&last&&t>last.t&&t-last.t<len*3;
  if(last&&last.g&&t>last.t){last.g.gain.cancelAndHoldAtTime(t);last.g.gain.setTargetAtTime(.0001,t,.012)}
  o.frequency.setValueAtTime(gl?last.f:fr*Math.pow(2,E.punch*2),t);o.frequency.exponentialRampToValueAtTime(fr,t+(gl?.02+E.glide*.25:.03+E.punch*.06));glideOsc(o.frequency,fr,t);
  const sh=ctx.createWaveShaper();sh.curve=dCurve(E.drive);const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=150+E.tone*E.tone*6000;
  const g=ctx.createGain(),dec=.1+E.decay*2.5,lvl=v*.32;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(lvl,t+.003);g.gain.setTargetAtTime(.0001,t+.02,dec/3);
  o.connect(sh);sh.connect(lp);lp.connect(g);g.connect(out);o.start(t);o.stop(t+dec*1.7+.1);subLast[id]={t,f:fr,g};
  if(E.click>0){const n=noiseSrc(t,.02),nf=ctx.createBiquadFilter(),ng=ctx.createGain();nf.type='highpass';nf.frequency.value=1800;env(ng,t,.001,v*E.click*.3,.012);n.connect(nf);nf.connect(ng);ng.connect(out)}}
function fmVoice(t,v,p,out,note,len,vc){const E=S.eng.fm,r=FM_R[Math.round(E.ratio)]||2,dec=.2+E.decay*2.5,rel=.05+E.rel*1.5,te=t+Math.max(.05,len*(.6+p.decay*4));
  const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=(1200+E.bright*12000)*(.6+p.tone*.8);lp.Q.value=.3;lp.connect(out);
  vc.forEach((iv,k)=>{const fr=hz(note+iv+p.tune),c=ctx.createOscillator(),m=ctx.createOscillator(),mg=ctx.createGain(),g=ctx.createGain(),I=E.index*10*fr*(.6+v*.4),end=te+rel+.25;
    c.frequency.value=fr;m.frequency.value=fr*r;glideOsc(c.frequency,fr,t);glideOsc(m.frequency,fr*r,t);mg.gain.setValueAtTime(I,t);mg.gain.setTargetAtTime(I*.12,t,dec/2.5);m.connect(mg);mg.connect(c.frequency);
    if(E.bell>0){const b=ctx.createOscillator(),bg=ctx.createGain();b.frequency.value=fr*14;bg.gain.setValueAtTime(fr*E.bell*6,t);bg.gain.setTargetAtTime(0,t,.04);b.connect(bg);bg.connect(c.frequency);b.start(t);b.stop(t+.4)}
    const lvl=v*.4/Math.sqrt(vc.length)*(k?.8:1);
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(lvl,t+.003);g.gain.setTargetAtTime(lvl*.25,t+.01,dec/3);g.gain.setTargetAtTime(.0001,te,rel/4);
    c.connect(g);g.connect(lp);c.start(t);m.start(t);c.stop(end);m.stop(end)})}
function ksBuf(fr,E){const key=Math.round(fr*4)+'|'+[E.damp,E.bright,E.body,E.len].map(x=>x.toFixed(2)).join('|');if(ksCache.has(key))return ksCache.get(key);
  const sr=ctx.sampleRate,N=Math.max(2,Math.round(sr/fr)),L=Math.floor(sr*(.4+E.len*2.6)),b=ctx.createBuffer(1,L,sr),d=b.getChannelData(0),ring=new Float32Array(N);
  let y=0;const a=.12+E.bright*.85;for(let i=0;i<N;i++){y+=((Math.random()*2-1)-y)*a;ring[i]=y}
  const pk=Math.max(1,Math.floor(N*(.08+E.body*.42))),tmp=ring.slice();for(let i=0;i<N;i++)ring[i]=tmp[i]-tmp[(i+pk)%N]*.6;
  const fb=.985+E.damp*.0145;let idx=0,m=0;for(let i=0;i<L;i++){const nx=idx+1===N?0:idx+1,s0=ring[idx];d[i]=s0;ring[idx]=(s0+ring[nx])*.5*fb;idx=nx;const q=s0<0?-s0:s0;if(q>m)m=q}
  const fN=Math.min(L,Math.floor(sr*.04));for(let i=0;i<fN;i++)d[L-1-i]*=i/fN;if(m>0)for(let i=0;i<L;i++)d[i]/=m;
  if(ksCache.size>160)ksCache.delete(ksCache.keys().next().value);ksCache.set(key,b);return b}
function pluckVoice(t,v,p,out,note,len,vc){const E=S.eng.pluck,sh=ctx.createWaveShaper(),lp=ctx.createBiquadFilter();sh.curve=dCurve(E.drive*.6);lp.type='lowpass';lp.frequency.value=2000+p.tone*12000;sh.connect(lp);lp.connect(out);
  vc.forEach((iv,k)=>{const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=ksBuf(hz(note+iv+p.tune),E);glideOsc(src.playbackRate,1,t);g.gain.value=v*.42/Math.sqrt(vc.length);src.connect(g);
    if(ctx.createStereoPanner){const pn=ctx.createStereoPanner();pn.pan.value=vc.length>1?((k/(vc.length-1))*2-1)*E.width*.7:(Math.random()*2-1)*E.width*.25;g.connect(pn);pn.connect(sh)}else g.connect(sh);
    src.start(t+k*.012*E.width)})}
function superVoice(t,v,p,out,note,len,vc){const E=S.eng.super,att=.01+E.attack*1.5,rel=(.1+E.release*3)*(.45+p.decay*.7),te=t+Math.max(att+.05,len*(.92+p.decay*.12)),end=te+rel+.3;
  const lp=ctx.createBiquadFilter(),hs=ctx.createBiquadFilter(),g=ctx.createGain(),lvl=v*.62/Math.sqrt(vc.length);
  lp.type='lowpass';lp.Q.value=.6;lp.frequency.value=(400+E.bright*7000)*(.6+p.tone*.8);hs.type='highshelf';hs.frequency.value=6000;hs.gain.value=E.air*12;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(lvl,t+att);g.gain.setTargetAtTime(lvl*.8,t+att,.3);g.gain.setTargetAtTime(.0001,te,rel/4);
  lp.connect(hs);hs.connect(g);g.connect(out);const LV={g,os:[]};RINGV.add(LV);setTimeout(()=>RINGV.delete(LV),Math.max(0,(end-ctx.currentTime)*1000+200));
  /* the unison saws on the same position share one level and one pan across the chord: same sound, a third of the nodes */const ogs={};
  vc.forEach(iv=>{const fr=hz(note+iv+p.tune);[-1,-.66,-.33,0,.33,.66,1].forEach(dd=>{const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=fr;glideOsc(o.frequency,fr,t);
    o.detune.value=dd*E.detune*40+(Math.random()-.5)*3;let og=ogs[dd];if(!og){og=ogs[dd]=ctx.createGain();og.gain.value=dd===0?.22:.14;
    if(ctx.createStereoPanner){const pn=ctx.createStereoPanner();pn.pan.value=dd*E.width;og.connect(pn);pn.connect(lp)}else og.connect(lp)}o.connect(og);o.start(t);o.stop(end);LV.os.push(o)})})}
/* voices that ring: stop() fades them out */
const RINGV=new Set();
function killLive(){if(!ctx)return;const n=ctx.currentTime;RINGV.forEach(v=>{try{v.g.gain.cancelAndHoldAtTime(n);v.g.gain.setValueAtTime(v.g.gain.value,n);v.g.gain.setTargetAtTime(.0001,n,.05);v.os.forEach(o=>{try{o.stop(n+.4)}catch(e){globalThis.__el&&globalThis.__el(e)}})}catch(e){globalThis.__el&&globalThis.__el(e)}});RINGV.clear()}

