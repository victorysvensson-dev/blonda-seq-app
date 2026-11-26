/* ================= Grime: a mono bass engine for UK grime / bass — wobble, dives, glides and growls that grow =================
   Modelled on UK bass loops ("angels wob", "evolver", "entah stabs"): mono, sub-heavy, the filter (and a little of the level)
   moves with a tempo-synced LFO, notes slide into each other and can dive in from above. Two saws (or a square, or FM),
   a sine sub, a drive before a 24 dB lowpass (two stages, resonance on the second), the LFO restarts on each note so the
   wobble always lands on the beat.
   v2 (SEQ.3 v134): a third detuned saw (unison), a free FM ratio, a wavefolder, a vowel/formant bank that can "talk" with its
   own LFO, and "växt": the growl (FM, folding, vowel, drive and cutoff) grows over the length of each note. All of it can also
   be moved by the modulation system (mod.js): cutoff, reso, wob, growl, formant, vowel, drive, fold, sub, level and pitch move
   smoothly inside the note, the rest changes from note to note. With the new params at 0 it sounds exactly as v1. */
const GR_RATE=[4,2,4/3,1,2/3,.5],GR_RATEN=['1/4','1/8','1/8T','1/16','1/16T','1/32'];
const GR_TR=[16,8,4,2,1],GR_TRN=['1 takt','1/2','1/4','1/8','1/16'];
const GR_RAT=[0,.5,1,1.5,2,3,4];
/* new params (0 = off = the v1 sound) */
const GR_NEW={uni:0,ratio:0,fold:0,form:0,vowel:.45,talk:0,trate:2,grow:0,grT:.45};
/* formants (u o a e i), F1/F2 in Hz */
const GR_F1=[300,430,760,520,300],GR_F2=[800,880,1220,1760,2260];
const grVow=v=>{const x=Math.max(0,Math.min(1,v))*4,i=Math.min(3,Math.floor(x)),u=x-i;return [GR_F1[i]+(GR_F1[i+1]-GR_F1[i])*u,GR_F2[i]+(GR_F2[i+1]-GR_F2[i])*u]};
const GR_PRE=[
  ['wob',{wave:0,cut:.15,res:.25,wob:.78,rate:1,shape:0,amp:.6,env:.12,dec:.3,dive:0,dt:.2,glide:.3,sub:.55,drive:.5,growl:.06}],
  ['evolver',{wave:0,cut:.26,res:.35,wob:.22,rate:0,shape:0,amp:0,env:.4,dec:.7,dive:0,dt:.3,glide:.72,sub:.6,drive:.45,growl:.18}],
  ['stabs',{wave:1,cut:.2,res:.35,wob:.75,rate:1,shape:1,amp:.6,env:.25,dec:.2,dive:.15,dt:.1,glide:.1,sub:.5,drive:.45,growl:.06}],
  ['growl',{wave:2,cut:.35,res:.3,wob:.5,rate:4,shape:2,amp:.2,env:.3,dec:.4,dive:0,dt:.2,glide:.2,sub:.5,drive:.7,growl:.6}],
  ['dyk',{wave:0,cut:.2,res:.2,wob:0,rate:1,shape:0,amp:0,env:.2,dec:.4,dive:.5,dt:.35,glide:.2,sub:.8,drive:.4,growl:0}],
  ['reese',{wave:0,cut:.3,res:.25,wob:.2,rate:0,shape:0,amp:0,env:.1,dec:.5,dive:0,dt:.2,glide:.25,sub:.45,drive:.5,growl:.05}],
  /* v2: the growl grows */
  ['växer',{wave:2,ratio:3,cut:.22,res:.3,wob:.35,rate:1,shape:0,amp:.2,env:.15,dec:.4,dive:0,dt:.2,glide:.25,sub:.6,drive:.6,growl:.12,fold:.15,form:.45,vowel:.2,talk:.2,trate:2,grow:.75,grT:.55},
    {l1:{rate:2,shape:0},rows:[{src:'l1',dst:'vowel',amt:.25},{src:'env',dst:'growl',amt:.25}],env:{a:.45,d:.6,s:.7,r:.3}}],
  ['prata',{wave:0,uni:.3,cut:.3,res:.35,wob:.15,rate:1,shape:0,amp:0,env:.1,dec:.4,dive:0,dt:.2,glide:.3,sub:.55,drive:.55,growl:.1,form:.75,vowel:.35,talk:.6,trate:3,grow:.2,grT:.4}],
  ['jaws',{wave:2,ratio:2,cut:.25,res:.4,wob:.6,rate:1,shape:2,amp:.3,env:.2,dec:.3,dive:.1,dt:.12,glide:.15,sub:.55,drive:.75,growl:.35,fold:.35,form:.3,vowel:.6,talk:.25,trate:3,grow:.35,grT:.3}],
  ['neuro',{wave:0,uni:.5,ratio:4,cut:.3,res:.45,wob:.3,rate:3,shape:3,amp:.2,env:.2,dec:.3,dive:0,dt:.2,glide:.1,sub:.5,drive:.8,growl:.3,fold:.5,form:.5,vowel:.5,talk:0,trate:3,grow:.3,grT:.25},
    {l1:{rate:7,shape:5},stp:{rate:7,glide:.15,v:[.2,.8,.4,1,.1,.6,.9,.3,.5,.2,1,.7,.3,.9,.4,.6]},rows:[{src:'stp',dst:'vowel',amt:.45},{src:'l1',dst:'cut',amt:.12},{src:'stp',dst:'fold',amt:.2}]}],
  ['yoyo',{wave:0,uni:.2,cut:.18,res:.3,wob:.7,rate:0,shape:0,amp:.3,env:.1,dec:.4,dive:0,dt:.2,glide:.35,sub:.6,drive:.5,growl:.08,form:.55,vowel:.3,talk:.55,trate:1,grow:0,grT:.4}],
  ['skrik',{wave:1,uni:.4,ratio:5,cut:.38,res:.5,wob:.25,rate:2,shape:1,amp:.2,env:.35,dec:.25,dive:.2,dt:.08,glide:.1,sub:.4,drive:.85,growl:.4,fold:.6,form:.4,vowel:.8,talk:.15,trate:3,grow:.5,grT:.2}],
  ['sub-andas',{wave:0,cut:.12,res:.15,wob:.3,rate:0,shape:0,amp:.15,env:.05,dec:.5,dive:0,dt:.2,glide:.35,sub:.85,drive:.3,growl:0,grow:.3,grT:.7},
    {l2:{rate:0,shape:0},rows:[{src:'l2',dst:'cut',amt:.1},{src:'l2',dst:'wob',amt:.2}]}]];
GR_PRE.forEach(p=>{p[1]=Object.assign({},GR_NEW,p[1])});
/* the engine's dials and choices grow with the new params (shown in the synth card, all of them in the full synth) */
(()=>{const G=ENG.grime;if(!G||G._v2)return;G._v2=1;G.tag='mono · wob · växande growl · formant';
  Object.assign(DEFS.eng.grime,GR_NEW);
  const pc2=v=>[String(Math.round(v*100)),'%'];
  G.ps.push({k:'grow',l:'växt',f:pc2},{k:'form',l:'formant',f:pc2},{k:'vowel',l:'vokal',f:v=>[['u','o','a','e','i'][Math.round(v*4)],'']},{k:'talk',l:'prata',f:pc2});
  G.adv=[{k:'uni',l:'unison',f:pc2},{k:'ratio',l:'fm-ratio',max:6,step:1,f:v=>Math.round(v)?[String(GR_RAT[Math.round(v)]),'×']:['auto','']},{k:'fold',l:'fold',f:pc2},
    {k:'trate',l:'prat-takt',max:4,step:1,f:v=>[GR_TRN[Math.round(v)],'']},{k:'grT',l:'växttid',f:v=>{const s=.1+v*v*3;return s<1?[String(Math.round(s*1000)),'ms']:[s.toFixed(2),'s']}}];
  const pre=G.opts.find(o=>o.k==='pre');if(pre)pre.ch=GR_PRE.map((p,i)=>[i,p[0]])})();
const grimeLast={},grFold=new Map();
const grFoldCurve=a=>{const k=Math.round(a*20);if(grFold.has(k))return grFold.get(k);const n=1024,c=new Float32Array(n),g=1+k/20*5;for(let i=0;i<n;i++){const x=i/(n-1)*2-1;c[i]=Math.sin(x*g*Math.PI/2)}grFold.set(k,c);return c};
function grimeVoice(id,t,v,p,out,note,len){const E=engE('grime'),c=ctx,fr=hz(note+12*(E.oct??1)+(p&&p.tune||0)),sd=stepDur(),L=Math.max(.05,len),end=t+L+.35;
  for(const k in GR_NEW)if(E[k]==null)E[k]=GR_NEW[k];
  /* the modulation system hands smooth curves for the params that live inside the note (null = not modulated) */
  const MC=typeof modCurveFor==='function'?(k,sc)=>modCurveFor('grime',k,t,end-t,sc):()=>null,mod=(prm,k,sc)=>{const cv=MC(k,sc);if(cv)modPush(prm,cv,t,end-t,end)};
  const last=grimeLast[id];let from=0;if(last&&t>=last.t-1e-4){if(last.end>t-.003&&E.glide>.01)from=last.f;try{last.g.gain.cancelAndHoldAtTime(t);last.g.gain.setTargetAtTime(0,t,.006)}catch(e){globalThis.__el&&globalThis.__el(e)}}
  const G=(x=1)=>{const n=c.createGain();n.gain.value=x;return n},vol=(E.vol??.8);
  const uni=E.uni||0,o1=c.createOscillator(),o2=c.createOscillator(),o3=uni>.01?c.createOscillator():null,sb=c.createOscillator(),fm=c.createOscillator(),fmg=G(0),
    g1=G(E.wave===2?.62:.48*(1-uni*.25)),g2=G(E.wave===2?0:.34*(1-uni*.2)),g3=o3?G(.3*uni):null,gs=G(E.sub*.95);
  o1.type=E.wave===1?'square':E.wave===2?'sine':'sawtooth';o2.type='sawtooth';o2.detune.value=9+E.growl*6+uni*14;sb.type='sine';fm.type='sine';
  if(o3){o3.type=E.wave===1?'square':'sawtooth';o3.detune.value=-(11+uni*24)}
  const glT=.008+E.glide*E.glide*.55,dvT=.03+E.dt*E.dt*1.4,up=Math.pow(2,E.dive*2);
  const pitch=(prm,m)=>{const f=fr*m;if(E.dive>.01){prm.setValueAtTime(f*up,t);prm.exponentialRampToValueAtTime(f,t+dvT)}else if(from){prm.setValueAtTime(from*m,t);prm.exponentialRampToValueAtTime(f,t+glT)}else prm.setValueAtTime(f,t);glideOsc(prm,f,t)};
  const rat=GR_RAT[Math.round(E.ratio||0)]||(E.wave===2?2:1);
  pitch(o1.frequency,1);pitch(o2.frequency,1);if(o3)pitch(o3.frequency,1);const sm=fr*.5>=40?.5:1;pitch(sb.frequency,sm);pitch(fm.frequency,rat);
  [o1,o2,o3,fm].forEach(o=>{if(o)mod(o.detune,'pitch',2400)});mod(sb.detune,'pitch',2400);
  /* the growl grows: a curve from 0 to 1 over "växttid" that pushes FM, fold, vowel, drive and cutoff */
  const grTau=.1+E.grT*E.grT*3,gw=E.grow||0,gN=Math.max(2,Math.ceil((end-t)*100)),grC=gw>.01?Float32Array.from({length:gN},(_,i)=>gw*(1-Math.exp(-(i/100)/(grTau/2.2)))):null;
  const fmBase=fr*E.growl*(E.wave===2?5:2.2);fmg.gain.value=fmBase;if(grC)modPush(fmg.gain,grC.map(x=>x*fr*(E.wave===2?4:2.4)),t,end-t,end);mod(fmg.gain,'growl',fr*(E.wave===2?5:2.2));
  fm.connect(fmg);fmg.connect(o1.frequency);fmg.connect(o2.frequency);if(o3)fmg.connect(o3.frequency);
  const pre=G(1+E.drive*3),ws=c.createWaveShaper();ws.curve=dCurve(E.drive);ws.oversample='2x';const post=G(1/(1+E.drive*1.6));
  if(grC)modPush(pre.gain,grC.map(x=>x*1.6),t,end-t,end);mod(pre.gain,'drive',3);
  o1.connect(g1);o2.connect(g2);if(o3){o3.connect(g3);g3.connect(pre)}g1.connect(pre);g2.connect(pre);pre.connect(ws);ws.connect(post);
  /* wavefolder after the drive: dry/wet, both can move */
  let src=post;const fo=E.fold||0,needFold=fo>.01||MC('fold',1)||grC;
  if(needFold){const fw=c.createWaveShaper();fw.curve=grFoldCurve(Math.max(.15,fo));fw.oversample='2x';const fd=G(1-fo*.75),fwet=G(fo*.9),fmix=G(1);
    post.connect(fd);post.connect(fw);fw.connect(fwet);fd.connect(fmix);fwet.connect(fmix);if(grC)modPush(fwet.gain,grC.map(x=>x*.45),t,end-t,end);mod(fwet.gain,'fold',.9);src=fmix}
  const f1=c.createBiquadFilter(),f2=c.createBiquadFilter();f1.type=f2.type='lowpass';f1.Q.value=.7;f2.Q.value=.5+E.res*15;src.connect(f1);f1.connect(f2);
  const base=35*Math.pow(2,E.cut*9)*Math.pow(Math.max(.5,fr/110),.5),ctr=Math.min(16000,base*Math.pow(2,E.wob*2.2)),pk=Math.min(17000,ctr*Math.pow(2,E.env*5)),tau=.02+E.dec*.5;
  [f1,f2].forEach(f=>{f.frequency.setValueAtTime(pk,t);f.frequency.setTargetAtTime(ctr,t+.003,tau)});
  {const cc=MC('cut',9*1200);const gc=grC?grC.map(x=>x*1500):null;const sum=cc&&gc?cc.map((x,i)=>x+(gc[i]||0)):cc||gc;if(sum){modPush(f1.detune,sum,t,end-t,end);modPush(f2.detune,sum,t,end-t,end)}}
  mod(f2.Q,'res',15);
  /* the LFO, restarted on the note so the wobble is on the grid */
  const hzL=1/(sd*(GR_RATE[Math.round(E.rate)]??2));let lfo;
  if(E.shape===3){lfo=c.createConstantSource();for(let tt=t,k=0;tt<end;tt+=1/hzL,k++)lfo.offset.setValueAtTime(((Math.sin(k*12.9898+note)*43758.5453)%1+1)%1*2-1,tt)}
  else{lfo=c.createOscillator();lfo.type=E.shape===1?'square':E.shape===2?'sawtooth':'sine';lfo.frequency.value=hzL}
  /* exponential: the LFO moves the cutoff in cents (± up to two octaves), so the wobble is as deep low as high */
  const lfg=G(E.wob*2600);lfo.connect(lfg);lfg.connect(f1.detune);lfg.connect(f2.detune);mod(lfg.gain,'wob',2600);
  const vca=G(1-E.amp*.45),lag=G(E.amp*.45);lfo.connect(lag);lag.connect(vca.gain);
  /* the vowel bank: two band-passes on the driven signal, mixed in beside the lowpass; "prata" moves the vowel with its own LFO */
  const fmx=E.form||0,fmc=MC('form',1);
  if(fmx>.01||fmc){const dur=end-t,N=Math.max(2,Math.ceil(dur*100)),vc=MC('vowel',1),tp=sd*(GR_TR[Math.round(E.trate)]??4),tk=E.talk||0,F1=new Float32Array(N),F2=new Float32Array(N);
    for(let i=0;i<N;i++){const tt=i/100,vv=E.vowel+tk*.5*Math.sin(2*Math.PI*tt/tp)+(grC?grC[Math.min(i,grC.length-1)]*.5:0)+(vc?vc[Math.min(i,vc.length-1)]:0),[a,b]=grVow(vv);F1[i]=a;F2[i]=b}
    const b1=c.createBiquadFilter(),b2=c.createBiquadFilter(),bg2=G(.75),fg=G(fmx*2.1),dry=G(1-fmx*.6);b1.type=b2.type='bandpass';b1.Q.value=5+E.res*6;b2.Q.value=7+E.res*8;
    b1.frequency.setValueAtTime(F1[0],t);b2.frequency.setValueAtTime(F2[0],t);try{b1.frequency.setValueCurveAtTime(F1,t,dur);b2.frequency.setValueCurveAtTime(F2,t,dur)}catch(e){globalThis.__el&&globalThis.__el(e)}
    src.connect(b1);src.connect(b2);b1.connect(fg);b2.connect(bg2);bg2.connect(fg);fg.connect(vca);f2.connect(dry);dry.connect(vca);
    if(fmc){modPush(fg.gain,fmc.map(x=>x*2.1),t,dur,end);modPush(dry.gain,fmc.map(x=>-x*.6),t,dur,end)}}
  else f2.connect(vca);
  mod(vca.gain,'amp',.8);mod(gs.gain,'sub',.95);
  const g=G(0),pk2=.42*v*vol;vca.connect(g);sb.connect(gs);gs.connect(g);const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=28;hp.Q.value=.6;g.connect(hp);hp.connect(out);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(pk2,t+.004);g.gain.setValueAtTime(pk2,t+L);g.gain.setTargetAtTime(0,t+L,.025);
  [o1,o2,o3,sb,fm,lfo].forEach(o=>{if(o){o.start(t);o.stop(end)}});grimeLast[id]={t,f:fr,g,end:t+L}}
/* its picture in the synth card: the wobble as a row of dots that rise and fall with the LFO (and grow with "växt") */
function grimeDraw(c,w,h,el,E,fg,ac,T){const N=Math.floor(w/9),mid=h*.55,a=el>=0?Math.exp(-el/1.2):0,k=GR_RATE[Math.round(E.rate)]??2,cyc=8/k,gw=E.grow||0;
  for(let i=0;i<N;i++){const u=i/N,ph=(u*cyc+T*.5)%1,s=E.shape===1?(ph<.5?1:-1):E.shape===2?1-2*ph:E.shape===3?Math.sin(Math.floor(u*cyc)*12.9)*.9:Math.sin(ph*6.2832),
    gr=1+gw*u*1.4,y=mid-s*h*.3*E.wob*gr-(1-u)*h*.12*E.env+(E.form?Math.sin(u*40+T*3)*h*.04*E.form*(E.talk+.2):0);
    c.fillStyle=rgba(i/N<.04+a*.9?ac:fg,.35+.6*Math.max(0,s*E.wob+.3));c.beginPath();c.arc(8+i*9,y,2.4+gw*u*1.2,0,6.2832);c.fill()}
  c.font='500 9px "BLONDA Mono",monospace';c.fillStyle=rgba(fg,.6);c.fillText('wob '+GR_RATEN[Math.round(E.rate)]+' · '+['sinus','fyrkant','såg','slump'][E.shape|0]+(gw>.01?' · växer '+Math.round(gw*100)+'%':'')+(E.form>.01?' · '+['u','o','a','e','i'][Math.round(E.vowel*4)]:''),8,h-8)}
/* the sound list (opts row "ljud"): picking one fills the dials (and its modulation, if it has any) */
function grimeLoadPre(i){const P=GR_PRE[i];if(!P)return;const E=engE('grime');Object.assign(E,GR_NEW,P[1]);E.pre=E._pl=i;if(typeof modSetFromPreset==='function')modSetFromPreset('grime',P[2]||null)}
{const _ri=refreshInst;refreshInst=function(){try{const id=TRACKS[synT].id;if(S.inst[id]==='grime'){const E=engE('grime');if(E.oct==null)E.oct=1;for(const k in GR_NEW)if(E[k]==null)E[k]=GR_NEW[k];if(E.pre!=null&&E.pre!==E._pl&&GR_PRE[E.pre])grimeLoadPre(E.pre)}}catch(e){globalThis.__el&&globalThis.__el(e)}return _ri.apply(this,arguments)}}
window.__grime={voice:(...a)=>grimeVoice(...a),E:()=>engE('grime'),PRE:GR_PRE,load:grimeLoadPre};
/* offline render for tests: params, modulation rows, notes [[t,midi,len,vel]] → the mono buffer (same voice, an OfflineAudioContext) */
window.__grimeRender=async(P,M,notes,dur,sr)=>{sr=sr||48000;const oc=new OfflineAudioContext(2,Math.ceil(dur*sr),sr),real=ctx,E=engE('grime'),keep=JSON.stringify(E),keepM=S.mods?JSON.stringify(S.mods):null;
  Object.assign(E,GR_NEW,P);if(!S.mods)S.mods={};S.mods.grime=M||null;modOf('grime');const t0=MOD_T0;MOD_T0=0;for(const k in grimeLast)delete grimeLast[k];
  ctx=oc;try{notes.forEach(([t,n,l,v])=>{const Mo=S.mods.grime;MODN=Mo.rows.length?{e:'grime',M:Mo,n:{t0:t,len:l,vel:v,rnd:.3}}:null;grimeVoice('bass',t,v,{tune:0},oc.destination,n,l);MODN=null})}finally{ctx=real;MOD_T0=t0;Object.assign(E,JSON.parse(keep));if(keepM)S.mods=JSON.parse(keepM);else S.mods=null;for(const k in grimeLast)delete grimeLast[k]}
  const b=await oc.startRendering();return Array.from(b.getChannelData(0))};

