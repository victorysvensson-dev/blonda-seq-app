/* ================= DAW mode: one big screen to build the song — the arrangement as a timeline of sections (each plays a
   pattern A–D for a number of bars, with its own mutes, Starter on/off and loops on/off), and the pattern editor, the mixer,
   the Starter and the sound cards docked under it. State: S.arr (in the project). While the arrangement plays, the old
   8-slot song mode is not used. ================= */
var ARR={active:false,idx:-1,bar:0,fresh:true,startBar:0,stx:1,lp:1,open:false,q:[],vis:{bar:0,idx:-1}};
const ARR_NM=['intro','vers','lyft','drop','andning','vers 2','drop 2','break','outro','bro'];
const ARR_COL=['#E9C54A','#6FD0C5','#F07AB0','#B9A6FF'];
function arr(){if(!S.arr||typeof S.arr!=='object'||!Array.isArray(S.arr.secs))S.arr={on:0,loop:1,sel:0,secs:[{nm:'intro',p:0,bars:4,m:[],stx:1,lp:1},{nm:'vers',p:1,bars:8,m:[],stx:1,lp:1},{nm:'drop',p:2,bars:8,m:[],stx:1,lp:1},{nm:'outro',p:3,bars:4,m:[],stx:0,lp:1}]};
  const R=S.arr;R.secs.forEach(s=>{if(!Array.isArray(s.m))s.m=[];if(s.stx==null)s.stx=1;if(s.lp==null)s.lp=1;s.bars=Math.max(1,Math.min(32,s.bars|0||4))});if(R.sel==null||R.sel>=R.secs.length)R.sel=0;return R}
const arrTotal=()=>arr().secs.reduce((a,s)=>a+s.bars,0);
const arrStart=i=>arr().secs.slice(0,i).reduce((a,s)=>a+s.bars,0);
function arrAt(bar){const R=arr();let b=bar;for(let i=0;i<R.secs.length;i++){if(b<R.secs[i].bars)return {i,sb:b};b-=R.secs[i].bars}return {i:R.secs.length-1,sb:0}}
function arrMuted(i){if(!ARR||!ARR.active||ARR.idx<0)return false;const s=arr().secs[ARR.idx];return !!(s&&s.m.includes(TRACKS[i].id))}
/* called by the sequencer at the start of every bar (before anything plays in it) */
window.arrBar=t=>{const R=arr();if(!R.on||!R.secs.length){if(ARR.active){ARR.active=false;ARR.idx=-1;try{applyAll()}catch(e){globalThis.__el&&globalThis.__el(e)}}return false}
  const tot=arrTotal();if(ARR.fresh){ARR.bar=Math.max(0,Math.min(tot-1,ARR.startBar||0));ARR.fresh=false}else ARR.bar++;
  if(ARR.bar>=tot){if(R.loop)ARR.bar=0;else{ARR.bar=tot-1;setTimeout(()=>{if(playing)stop()},0);return true}}
  const at=arrAt(ARR.bar),sec=R.secs[at.i],chg=at.i!==ARR.idx||!ARR.active;ARR.active=true;ARR.idx=at.i;ARR.stx=sec.stx?1:0;ARR.lp=sec.lp?1:0;
  queued=-1;if(S.pat!==sec.p)S.pat=sec.p;ARR.q.push({t,bar:ARR.bar,idx:at.i});if(ARR.q.length>8)ARR.q.shift();
  /* the section's mutes land exactly on the bar */
  if(chg&&A&&A.ch)TRACKS.forEach((tr,i)=>{try{A.ch[i].g.gain.setTargetAtTime(isMuted(i)?0:S.params[tr.id].level,t,.008)}catch(e){globalThis.__el&&globalThis.__el(e)}});
  if(chg)setTimeout(()=>{try{renderAll()}catch(e){globalThis.__el&&globalThis.__el(e)}dawPaint()},Math.max(0,(t-ctx.currentTime)*1000));return true};
{const _p=play;play=function(){ARR.fresh=true;ARR.q.length=0;ARR.vis={bar:ARR.startBar||0,idx:-1};return _p.apply(this,arguments)}}
{const _s=stop;stop=function(){const r=_s.apply(this,arguments);if(ARR.active){ARR.active=false;ARR.idx=-1;try{applyAll();renderAll()}catch(e){globalThis.__el&&globalThis.__el(e)}}dawPaint();return r}}

