/* ---------------- sequencer ---------------- */
let gstep=0,curG=0;let playing=false,recording=false,step=0,nextT=0,timer=0,startT=0,bar=0,queued=-1;const visQ=[];
const actT=TRACKS.map(()=>Array(16).fill(null));
let rep=0,repStart=0,fill=false,tapeStop=false,tapeRate=1,gTune=0,chainIdx=-1,songStart=true;
const stepDur=()=>60/S.bpm/4;
let SCHED=0;
function schedule(){SCHED=1;try{while(nextT<ctx.currentTime+(window.__LA||.12)){
    if(step===0){const _ar=!!(window.arrBar&&arrBar(nextT));if(!_ar||!ARR||ARR.lp)loopsBar(nextT,bar);
      if(_ar){}else if(S.song&&S.chain.some(v=>v>=0)){chainIdx=songStart?firstSlot():nextSlot(chainIdx);songStart=false;S.pat=S.chain[chainIdx];queued=-1;window.patAtHeard?patAtHeard(nextT,1):(renderAll(),renderChain())}
      else if(queued>=0){S.pat=queued;queued=-1;window.patAtHeard?patAtHeard(nextT):renderAll()}}
    const ps=rep?(repStart+((step-repStart+16)%16)%rep)%16:step;
    const sd=stepDur()/tapeRate,t=nextT+((ps%2)?S.master.swing*sd*.66:0),pat=S.pats[S.pat];if(typeof gxAuto==='function')gxAuto(ps,sd);
    for(let i=0;i<TRACKS.length;i++){const _cp=window.CLIPP?CLIPP[i]:S.pat;if(_cp<0||(window.trkOn&&!trkOn(i))||(window.stxFormMute&&stxFormMute(i,gstep)))continue;const pat=S.pats[_cp],tr=TRACKS[i],L=trkLen(i),q=(L<16&&!rep)?gstep%L:ps;
      if(tr.mel){const RR=S.roll[_cp][tr.id],byId=new Map(),tg=new Set();RR.forEach(m=>{if(m.id)byId.set(m.id,m)});RR.forEach(m=>{const b=m.g&&byId.get(m.g);if(b&&b.s>m.s)tg.add(b)});
        const cl=pat[i][q],pass=Math.random()<(cl.p??1),rr=cl.r||1;
        for(const nt of RR){if(!pass||Math.floor(nt.s+1e-6)!==q||tg.has(nt))continue;const tt=Math.max(ctx.currentTime,t+(nt.s-q+(cl.o||0))*sd),chain=[];let cur=nt,end=nt.s+nt.l,guard=0;
          while(cur.g&&guard++<16){const nx=byId.get(cur.g);if(!nx||nx.s<=cur.s)break;chain.push({at:nx.s-nt.s,n:nx.n});end=nx.s+nx.l;cur=nx}
          if(rr>1&&!chain.length){for(let k=0;k<rr;k++)trigger(i,tt+k*sd/rr,nt.v*(k?.82:1),nt.n,nt.l/rr)}else{GL=chain.length?{list:chain,sd:sd,n0:nt.n,gt:glideTime(tr.id)}:null;trigger(i,tt,nt.v,nt.n,end-nt.s);GL=null}actT[i][q]={t:tt,v:nt.v>=.95?2:1}}continue}
      const st=pat[i][q];if(st.v&&Math.random()<(st.p??1)){const vel=st.vel??(st.v===2?1:.72),rr=st.r||1;const tn=Math.max(ctx.currentTime,t+(st.o||0)*sd);for(let k=0;k<rr;k++){CHOPK=st.c!=null?st.c:q;SFX=st;trigger(i,tn+k*sd/rr,vel*(k?.8:1),st.n);SFX=null;CHOPK=null}actT[i][q]={t:tn,v:st.v}}}
    if(fill){trigger(1,t,.28+.67*(step/15),0);if(step%2)trigger(5,t,.5,0);if(step%4===2)trigger(2,t,.6,0)}
    if(window.MIDIX)MIDIX.step(nextT,sd);visQ.push({t:nextT,step:ps,bar,g:gstep});beatPump(nextT,step);nextT+=sd;step=(step+1)%16;gstep++;if(step===0)bar++}}finally{SCHED=0}}
function play(){initAudio();ctx.resume();if(playing){stop();return}
  const _xs=window.__extStart;window.__extStart=null;playing=true;step=_xs?_xs.g%16:0;gstep=_xs?_xs.g:0;bar=_xs?Math.floor(_xs.g/16):0;songStart=true;tapeRate=1;nextT=_xs?Math.max(_xs.t,ctx.currentTime+.003):ctx.currentTime+.06;startT=_xs?_xs.t-_xs.g*stepDur():nextT;visQ.length=0;if(window.MIDIX)MIDIX.start(startT);timer=setInterval(schedule,25);schedule();
  document.body.classList.add('playing');setPlayIcon();wake(true)}
function stop(){if(window.__stopGate&&playing)__stopGate();if(window.MIDIX&&playing)MIDIX.stop();killLive();if(window.__rpt)__rpt.release();loopsKill();playing=false;rep=0;fill=false;tapeStop=false;document.querySelectorAll('.hold.on').forEach(b=>b.classList.remove('on'));renderChain();clearInterval(timer);document.body.classList.remove('playing');setPlayIcon();curStep=-1;paintPlayhead(-1);
  if(queued>=0){S.pat=queued;queued=-1;renderAll()}wake(false)}
function setPlayIcon(){$('#playIco').innerHTML=playing?'<path d="M6 4h4.5v16H6zM13.5 4H18v16h-4.5z"/>':'<path d="M7 4.5v15l13-7.5z"/>';$('#playBtn').setAttribute('aria-label',playing?'Stoppa':'Spela')}
let wl=null;async function wake(on){try{if(on&&navigator.wakeLock&&!wl)wl=await navigator.wakeLock.request('screen');else if(!on&&wl){await wl.release();wl=null}}catch(e){wl=null}}

