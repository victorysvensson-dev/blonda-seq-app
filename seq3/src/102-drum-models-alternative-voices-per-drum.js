/* ---------------- drum models (alternative voices per drum) ---------------- */
function osc(type,f,t,stop){const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);o.start(t);o.stop(stop);return o}
function shp(a){const w=ctx.createWaveShaper();w.curve=distCurve(a);w.oversample='2x';return w}
function bq(type,f,q){const b=ctx.createBiquadFilter();b.type=type;b.frequency.value=f;if(q!=null)b.Q.value=q;return b}
function chain(...n){for(let i=0;i<n.length-1;i++)n[i].connect(n[i+1]);return n[n.length-1]}
function hatChoke(g,open,t){if(open)ohatGain=g;else if(ohatGain){try{ohatGain.gain.cancelAndHoldAtTime(t);ohatGain.gain.setTargetAtTime(.0001,t,.008)}catch(e){globalThis.__el&&globalThis.__el(e)}ohatGain=null}}
const TR=p=>Math.pow(2,p.tune/12);
const DKV={
 kick:{
  '808'(t,v,p,out){const tr=TR(p),d=.45+p.decay*1.5,o=osc('sine',125*tr,t,t+d+.1),g=ctx.createGain();o.frequency.exponentialRampToValueAtTime(52*tr,t+.07);o.frequency.exponentialRampToValueAtTime(44*tr,t+d);
    env(g,t,.003,v*1.05,d);chain(o,shp(.08+p.tone*.25),g,out);pump(t)},
  '909'(t,v,p,out){const tr=TR(p),d=.16+p.decay*.55,o=osc('triangle',260*tr,t,t+d+.1),g=ctx.createGain();o.frequency.exponentialRampToValueAtTime(58*tr,t+.035);o.frequency.exponentialRampToValueAtTime(48*tr,t+d);
    env(g,t,.001,v,d);chain(o,shp(.3),bq('lowpass',2400+p.tone*5000),g,out);
    const n=noiseSrc(t,.03),ng=ctx.createGain();env(ng,t,.001,v*(.25+p.tone*.4),.018);chain(n,bq('bandpass',4200,.8),ng,out);pump(t)},
  thump(t,v,p,out){const tr=TR(p),d=.1+p.decay*.32,o=osc('sine',150*tr,t,t+d+.1),g=ctx.createGain();o.frequency.exponentialRampToValueAtTime(62*tr,t+.022);
    env(g,t,.001,v*1.1,d);chain(o,bq('lowpass',700+p.tone*1200),g,out);
    const s=osc('sine',48*tr,t,t+d+.15),sg=ctx.createGain();env(sg,t,.004,v*.5,d*1.4);chain(s,sg,out);pump(t)},
  dist(t,v,p,out){const tr=TR(p),d=.3+p.decay*1.1,o=osc('sine',140*tr,t,t+d+.1),g=ctx.createGain();o.frequency.exponentialRampToValueAtTime(50*tr,t+.05);o.frequency.exponentialRampToValueAtTime(41*tr,t+d);
    env(g,t,.001,v*.55,d);chain(o,shp(.55+p.tone*.4),bq('lowpass',1800+p.tone*3000,.9),g,out);pump(t)}},
 snare:{
  '808'(t,v,p,out){const tr=TR(p),d=.1+p.decay*.35;[[180,.5],[330,.35]].forEach(([f,a])=>{const o=osc('triangle',f*tr,t,t+.25),g=ctx.createGain();env(g,t,.001,v*a,.09+p.decay*.08);chain(o,g,out)});
    const n=noiseSrc(t,d),g=ctx.createGain();env(g,t,.001,v*.6,d);chain(n,bq('highpass',1600+p.tone*2500),bq('lowpass',9000),g,out)},
  '909'(t,v,p,out){const tr=TR(p),d=.14+p.decay*.4,o=osc('triangle',210*tr,t,t+.15),og=ctx.createGain();o.frequency.exponentialRampToValueAtTime(160*tr,t+.04);env(og,t,.001,v*.6,.07);chain(o,og,out);
    const n=noiseSrc(t,d),g=ctx.createGain();env(g,t,.001,v*.85,d);chain(n,bq('highpass',600+p.tone*1200),bq('lowpass',7000+p.tone*5000),g,out)},
  rim(t,v,p,out){const tr=TR(p),d=.025+p.decay*.05,o=osc('square',1650*tr,t,t+.1),g=ctx.createGain();env(g,t,.0005,v*1.1,d);chain(o,bq('bandpass',1650*tr,6),g,out);
    const o2=osc('triangle',480*tr,t,t+.08),g2=ctx.createGain();env(g2,t,.0005,v*.9,.02+p.tone*.03);chain(o2,g2,out)},
  lofi(t,v,p,out){const tr=TR(p),d=.12+p.decay*.35,n=noiseSrc(t,d),g=ctx.createGain();env(g,t,.002,v*.7,d);chain(n,bq('bandpass',(1100+p.tone*1500)*tr,1.1),shp(.6),bq('lowpass',4500),g,out);
    const o=osc('sine',190*tr,t,t+.2),og=ctx.createGain();env(og,t,.002,v*.5,.08);chain(o,shp(.4),og,out)}},
 clap:{
  '808'(t,v,p,out){const d=.25+p.decay*.8,n=noiseSrc(t,d+.06),g=ctx.createGain();g.gain.setValueAtTime(.0001,t);[0,.01,.02,.031].forEach(o=>{g.gain.setValueAtTime(v*.85,t+o);g.gain.exponentialRampToValueAtTime(v*.12,t+o+.008)});
    g.gain.setValueAtTime(v*.55,t+.04);g.gain.exponentialRampToValueAtTime(.0001,t+.04+d);chain(n,bq('bandpass',(1000+p.tone*900)*TR(p),1.2),bq('highpass',600),g,out)},
  snap(t,v,p,out){const d=.04+p.decay*.12,n=noiseSrc(t,d),g=ctx.createGain();env(g,t,.0008,v*.9,d);chain(n,bq('bandpass',(2400+p.tone*2400)*TR(p),3.5),g,out);
    const o=osc('sine',1800*TR(p),t,t+.05),og=ctx.createGain();env(og,t,.0005,v*.25,.012);chain(o,og,out)},
  stack(t,v,p,out){const d=.12+p.decay*.45,n=noiseSrc(t,d+.08),g=ctx.createGain();g.gain.setValueAtTime(.0001,t);[0,.007,.015,.024,.034,.045].forEach((o,k)=>{g.gain.setValueAtTime(v*(.95-k*.06),t+o);g.gain.exponentialRampToValueAtTime(v*.1,t+o+.006)});
    g.gain.setValueAtTime(v*.75,t+.052);g.gain.exponentialRampToValueAtTime(.0001,t+.052+d);chain(n,bq('bandpass',(800+p.tone*1600)*TR(p),.9),g,out)}},
 hat:{
  '909'(t,v,p,out,open){const d=open?.15+p.decay*.7:.03+p.decay*.08,n=noiseSrc(t,d),g=ctx.createGain();env(g,t,.0008,v*.55,d);
    chain(n,bq('bandpass',10500*TR(p),1.1),bq('highpass',7000+p.tone*3000),g,out);hatChoke(g,open,t)},
  shaker(t,v,p,out,open){const d=open?.12+p.decay*.4:.05+p.decay*.08,n=noiseSrc(t,d+.02),g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v*.95,t+.014);g.gain.exponentialRampToValueAtTime(.0001,t+.014+d);
    chain(n,bq('bandpass',(5200+p.tone*3000)*TR(p),2.2),g,out);hatChoke(g,open,t)},
  tick(t,v,p,out,open){const d=open?.08+p.decay*.3:.008+p.decay*.03,o=osc('sine',8800*TR(p),t,t+d+.05),g=ctx.createGain();env(g,t,.0004,v*.32,d);chain(o,g,out);
    const n=noiseSrc(t,d),ng=ctx.createGain();env(ng,t,.0004,v*.3,d);chain(n,bq('highpass',9000+p.tone*3000),ng,out);hatChoke(g,open,t)}},
 perc:{
  conga(t,v,p,out){const tr=TR(p),d=.16+p.decay*.35,o=osc('sine',390*tr,t,t+d+.05),g=ctx.createGain();o.frequency.exponentialRampToValueAtTime(320*tr,t+.03);env(g,t,.001,v*.85,d);chain(o,g,out);
    const n=noiseSrc(t,.02),ng=ctx.createGain();env(ng,t,.001,v*(.15+p.tone*.4),.015);chain(n,bq('bandpass',2600,2),ng,out)},
  cowbell(t,v,p,out){const tr=TR(p),d=.18+p.decay*.5,g=ctx.createGain(),f=bq('bandpass',(820+p.tone*500)*tr,1.3);[545,815].forEach(fr=>{osc('square',fr*tr,t,t+d+.1).connect(f)});
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v*.5,t+.001);g.gain.exponentialRampToValueAtTime(v*.18,t+.04);g.gain.exponentialRampToValueAtTime(.0001,t+d);chain(f,g,out)},
  clave(t,v,p,out){const d=.03+p.decay*.08,o=osc('sine',2450*TR(p),t,t+d+.05),g=ctx.createGain();env(g,t,.0004,v*1.15,d);chain(o,bq('bandpass',2450*TR(p),4+p.tone*6),g,out)},
  tom(t,v,p,out){const tr=TR(p),d=.22+p.decay*.6,o=osc('sine',170*tr,t,t+d+.05),g=ctx.createGain();o.frequency.exponentialRampToValueAtTime(95*tr,t+d);env(g,t,.002,v*.95,d);chain(o,shp(.08+p.tone*.3),g,out);
    const n=noiseSrc(t,.03),ng=ctx.createGain();env(ng,t,.001,v*.18*p.tone,.02);chain(n,bq('bandpass',1200,1),ng,out)}}};
const DKM={kick:[['','blonda','rund · tight'],['808','808','lång boom'],['909','909','punch · klick'],['thump','thump','kort · djup'],['dist','dist','smutsig']],
 snare:[['','blonda','klassisk'],['808','808','tonad'],['909','909','frasig'],['rim','rim','kantslag'],['lofi','lo-fi','krossad']],
 clap:[['','blonda','tight'],['808','808','rumsklang'],['snap','snap','fingerknäpp'],['stack','stack','bred']],
 hat:[['','metall','808-metall'],['909','909','brus · ljus'],['shaker','shaker','mjuk'],['tick','tick','minimal']],
 perc:[['','blonda','rim-tom'],['conga','conga','varm'],['cowbell','cowbell','808-klocka'],['clave','clave','trä'],['tom','toms','låg tom']]};
const DEF_P={
 kick:{level:.8,tune:0,decay:.45,tone:.35,pan:0,echo:0,space:.03},
 snare:{level:.48,tune:0,decay:.4,tone:.55,pan:0,echo:.06,space:.2},
 clap:{level:.4,tune:0,decay:.45,tone:.5,pan:.05,echo:.1,space:.28},
 hat:{level:.28,tune:0,decay:.3,tone:.6,pan:.18,echo:0,space:.05},
 ohat:{level:.22,tune:0,decay:.45,tone:.55,pan:-.18,echo:.05,space:.1},
 perc:{level:.34,tune:0,decay:.35,tone:.4,pan:-.3,echo:.35,space:.15},
 bass:{level:.5,tune:0,decay:.4,tone:.32,pan:0,echo:0,space:0},
 keys:{level:.34,tune:0,decay:.5,tone:.45,pan:0,echo:.28,space:.35},
 lead:{level:.36,tune:0,decay:.4,tone:.55,pan:.14,echo:.32,space:.28},
 pad:{level:.3,tune:0,decay:.8,tone:.45,pan:-.08,echo:.1,space:.5},
 tom:{level:.42,tune:0,decay:.45,tone:.35,pan:.22,echo:.04,space:.16},
 rim:{level:.36,tune:0,decay:.35,tone:.5,pan:-.12,echo:.08,space:.14},
 shaker:{level:.24,tune:0,decay:.35,tone:.5,pan:.28,echo:0,space:.08},
 bell:{level:.26,tune:0,decay:.35,tone:.45,pan:-.24,echo:.18,space:.14},
 conga:{level:.36,tune:0,decay:.4,tone:.4,pan:.34,echo:.06,space:.14},
 clave:{level:.3,tune:0,decay:.35,tone:.5,pan:-.34,echo:.12,space:.12},
 snap:{level:.34,tune:0,decay:.4,tone:.5,pan:.1,echo:.1,space:.24},
 tick:{level:.22,tune:0,decay:.3,tone:.6,pan:-.2,echo:0,space:.05},
 kick2:{level:.7,tune:0,decay:.45,tone:.35,pan:0,echo:0,space:.03},
 snare2:{level:.44,tune:0,decay:.4,tone:.55,pan:0,echo:.06,space:.2},
 syn5:{level:.32,tune:0,decay:.5,tone:.45,pan:-.1,echo:.24,space:.32},
 syn6:{level:.32,tune:0,decay:.4,tone:.55,pan:.12,echo:.28,space:.28},
 syn7:{level:.4,tune:0,decay:.4,tone:.4,pan:0,echo:.06,space:.1},
 syn8:{level:.4,tune:0,decay:.4,tone:.4,pan:0,echo:.1,space:.08},
};
const SCALE=[];(()=>{const st=[0,2,3,5,7,8,10];for(let o=1;o<7;o++)for(const s of st){const m=9+12*o+s;if(m>=33&&m<=81)SCALE.push(m)}})();
const NN=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const nname=m=>NN[m%12]+(Math.floor(m/12)-1);
function emptyPat(){return TRACKS.map(t=>Array.from({length:16},()=>({v:0,n:t.id==='bass'?45:t.id==='lead'?69:57})))}
function fromStr(pat,ti,str,notes){[...str].forEach((ch,i)=>{pat[ti][i].v=ch==='x'?1:ch==='X'?2:0;if(notes&&notes[i])pat[ti][i].n=notes[i]})}
function demo(){
  const A=emptyPat(),B=emptyPat(),C=emptyPat(),D=emptyPat();
  fromStr(A,0,'X...x...X...x.x.');fromStr(A,1,'....X.......X...');fromStr(A,2,'....x.......x..x');
  fromStr(A,3,'x.xXx.x.x.xXx.x.');fromStr(A,4,'..x...x...x...x.');fromStr(A,5,'...x.....x......');
  fromStr(A,6,'..x...x..x....x.',[45,0,45,0,0,0,48,0,0,45,0,0,0,0,43,0]);fromStr(A,7,'...X......x.....',[0,0,0,57,0,0,0,0,0,0,60,0,0,0,0,0]);
  fromStr(B,0,'X...x...X...x..x');fromStr(B,1,'....X.......X.x.');fromStr(B,2,'....x..x....x..x');
  fromStr(B,3,'xxXxxxXxxxXxxxXx');fromStr(B,4,'..x...x...x...X.');fromStr(B,5,'.x.x...x.x...x..');
  fromStr(B,6,'x.x..xx..x.x..x.',[45,0,57,0,0,45,48,0,0,50,0,48,0,0,43,0]);fromStr(B,7,'...X..x...X...x.',[0,0,0,57,0,0,55,0,0,0,60,0,0,0,53,0]);
  fromStr(C,3,'x.x.x.x.x.x.x.x.');fromStr(C,2,'............x...');fromStr(C,7,'X.......X.......',[57,0,0,0,0,0,0,0,53,0,0,0,0,0,0,0]);
  fromStr(C,6,'x...............',[45]);fromStr(C,5,'......x.......x.');
  fromStr(A,8,'......x...x.x...',[0,0,0,0,0,0,69,0,0,0,72,0,67,0,0,0]);fromStr(A,9,'x...............',[57]);
  fromStr(B,8,'x..x..x...x.x.x.',[69,0,0,72,0,0,76,0,0,0,74,0,72,0,69,0]);fromStr(B,9,'x.......x.......',[57,0,0,0,0,0,0,0,53]);
  fromStr(C,8,'..........x.....',[0,0,0,0,0,0,0,0,0,0,76]);fromStr(C,9,'X.......X.......',[57,0,0,0,0,0,0,0,53]);
  fromStr(D,9,'x...............',[52]);
  fromStr(D,0,'X..x..X...X..x..');fromStr(D,6,'.x..x..x.x..x..x',[0,45,0,0,57,0,0,45,0,52,0,0,48,0,0,47]);
  return [A,B,C,D];
}
const DEFS={
 synth:{bass:{wave:'sawtooth',a:.004,d:.22,s:.35,r:.12,cut:.42,res:.35,env:.55},keys:{wave:'sawtooth',a:.012,d:.7,s:.25,r:.35,cut:.5,res:.12,env:.35},
        lead:{wave:'square',a:.005,d:.3,s:.5,r:.2,cut:.55,res:.25,env:.4},pad:{wave:'sawtooth',a:.6,d:1,s:.7,r:1.2,cut:.45,res:.1,env:.2},
        syn5:{wave:'sawtooth',a:.012,d:.7,s:.25,r:.35,cut:.5,res:.12,env:.35},syn6:{wave:'square',a:.005,d:.3,s:.5,r:.2,cut:.55,res:.25,env:.4},syn7:{wave:'sawtooth',a:.004,d:.22,s:.35,r:.12,cut:.42,res:.35,env:.55},syn8:{wave:'sawtooth',a:.004,d:.22,s:.35,r:.12,cut:.42,res:.35,env:.55}},
 inst:{bass:'analog',keys:'analog',lead:'pluck',pad:'super',syn5:'bris',syn6:'fm',syn7:'sh101',syn8:'acid'},
 eng:{msx:{att:.03,dec:.5,sus:1,rel:.25},acid:{cut:.32,res:.72,env:.6,dec:.3,acc:.6,drive:.35,dtone:.5,st:.2,wave:'sawtooth',slide:0},fm:{ratio:3,index:.42,decay:.4,bell:.3,rel:.25,bright:.6},
      sub:{decay:.5,punch:.45,drive:.3,tone:.5,glide:.2,click:.4},pluck:{damp:.55,bright:.6,body:.35,len:.45,width:.5,drive:.2},
      super:{detune:.45,attack:.3,release:.5,bright:.5,width:.75,air:.4},
      sh101:{lfoR:.45,lfoW:0,vcoMod:0,range:1,pw:.35,pwmSrc:0,pulse:.55,saw:.7,sub:.45,subMode:0,noise:0,cut:.35,res:.45,env:.5,vcfMod:0,kybd:.5,vcaMode:0,A:.02,D:.35,S:.3,R:.18,porta:.2,portaMode:2,vol:.8},
      mini:{o1r:3,o1w:2,o2r:3,o2w:2,o2f:.08,o3r:2,o3w:3,o3f:-.05,o3lfo:0,m1:.85,m1on:1,m2:.7,m2on:1,m3:.5,m3on:1,mn:.3,mnon:0,ncol:0,cut:.4,emph:.35,contour:.5,fA:.02,fD:.42,fS:.45,aA:.01,aD:.45,aS:.85,decSw:1,kt1:1,kt2:0,glide:.15,glideOn:0,modmix:0,oscMod:0,filtMod:0,modAmt:.3,vol:.8},
      grime:{pre:0,oct:1,wave:0,cut:.15,res:.25,wob:.78,rate:1,shape:0,amp:.6,env:.12,dec:.3,dive:0,dt:.2,glide:.3,sub:.55,drive:.5,growl:.06,vol:.8},
      chip:{duty:1,dec:.4,vib:.25,arp:.55,crush:.5,oct:0,arpm:0},
      bris:{wave:0,pw:.5,det:.42,sub:.18,noise:0,glide:0,drift:.45,cut:.46,res:.14,fenv:.22,kt:.5,fvel:.3,fA:.55,fD:.6,fS:.55,fR:.6,aA:.55,aD:.6,aS:.85,aR:.62,lfoW:0,lfoR:.18,lfoSync:0,lfoDest:1,lfoAmt:.22,cho:2,choMix:.75,dly:.24,dlyT:1,dlyFb:.38,vmode:0,vol:.8},
      enkel:{drv:.2,br:.7,tejp:.45,ton:.34,len:.5,tail:.3,vol:.72},smp:{}}};
let S={bpm:118,pat:0,sel:0,mute:[0,0,0,0,0,0,0,0,0,0],solo:-1,pal:0,world:0,song:0,chain:[0,0,1,1,0,0,2,3],layout:null,
  params:JSON.parse(JSON.stringify(DEF_P)),
  master:{filter:0,echo:.38,space:.4,drive:.12,pump:.4,swing:.12,vol:.75},mixV:2,
  fx:{echo:{on:1,fb:.38,time:.75},space:{on:1,size:2.6},tape:{on:1,color:.75},crush:{on:0,bits:6,mix:.4}},
  synth:JSON.parse(JSON.stringify(DEFS.synth)),inst:JSON.parse(JSON.stringify(DEFS.inst)),eng:JSON.parse(JSON.stringify(DEFS.eng)),
  pats:demo()};
const KEY='blonda-seq3-glass';const S_DEF=JSON.parse(JSON.stringify(S));
try{const raw=localStorage.getItem(KEY);if(raw){const o=JSON.parse(raw);if(o&&o.pats&&o.pats.length===4)S=Object.assign(S,o)}}catch(e){globalThis.__el&&globalThis.__el(e)}

