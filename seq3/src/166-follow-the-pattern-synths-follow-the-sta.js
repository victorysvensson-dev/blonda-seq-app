/* ---------- follow: the pattern synths follow the Starter's chords (only what the sequencer plays) ---------- */
function stxChordAt(g){const pl=stxPlanCached(),L=((g%64)+64)%64,ci=pl.two?((L>>4)*2+((L&15)<8?0:1)):(L>>4);return pl.ch[ci]||pl.ch[0]}
function stxChordNow(){return stxChordAt(gstep)}
function stxSnap(x,set){for(let d=0;d<7;d++){if(set.has(((x+d)%12+12)%12))return x+d;if(set.has(((x-d)%12+12)%12))return x-d}return x}
function stxFollow(P,id,n,g){const m=P.fol[id]||'av';if(m==='av'||n==null)return n;const c=g==null?stxChordNow():stxChordAt(g);if(!c)return n;const ref=P.mode==='moll'?9:0;
  const w=v=>{v=((v%12)+12)%12;return v>6?v-12:v};
  if(m==='skala'){const sc=new Set((P.mode==='moll'?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11]).map(v=>(v+P.root)%12));return stxSnap(n+w(P.root-ref),sc)}
  const x=n+w(c.r-ref);if(m==='transp')return x;
  if(m==='rot'){let y=x-(((x%12)+12)%12)+c.r;if(y-x>6)y-=12;if(x-y>6)y+=12;return y}
  return stxSnap(x,new Set(c.iv.map(v=>(c.r+v)%12)))}
STX.rawTrig=trigger;
trigger=function(i,t,vel,note,ls){try{const tr=TRACKS[i];if(SCHED&&tr&&tr.mel&&note!=null){const P=stx();if(P.on&&P.fol.on&&P.src!=='off'){const n0=note;note=stxFollow(P,tr.id,note);
      if(typeof GL!=='undefined'&&GL&&GL.list){GL={...GL,n0:note,list:GL.list.map(q=>({at:q.at,n:stxFollow(P,tr.id,q.n)}))}}}}}catch(e){globalThis.__el&&globalThis.__el(e)}
  return STX.rawTrig.call(this,i,t,vel,note,ls)};

