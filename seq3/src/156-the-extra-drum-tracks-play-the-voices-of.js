/* ---- the extra drum tracks play the voices of their kind (a Tom is the perc tom, a Rim the snare rim …) ---- */
TRACKS.forEach(t=>{if(!t.kind)return;const k=t.kind,hat=k==='hat';
  /* a shaker or tick is its own sound: it must not choke the open hat the way the closed hat does */
  const wrap=f=>f&&function(tt,v,p,out){if(!hat)return f.call(this,tt,v,p,out,false);const og=ohatGain;ohatGain=null;try{return f.call(this,tt,v,p,out,false)}finally{ohatGain=og}};
  if(DKV[k]){DKV[t.id]={};for(const m in DKV[k])DKV[t.id][m]=wrap(DKV[k][m])}
  VOICE[t.id]=wrap(VOICE[k]);DKM[t.id]=DKM[k]});

/* the extra synth tracks play single notes on their engine (chords come from the notes you write) */
TRACKS.forEach(t=>{if(!t.mel||VOICE[t.id])return;const id=t.id;VOIC[id]=[0];VOICE[id]=function(tt,v,p,out,_,note,len){melVoice(id,tt,v,p,out,note,len)}});

/* empty step row for a track (the note a fresh synth row starts on) */
const trkRow0=i=>{const id=TRACKS[i].id;return Array.from({length:16},()=>({v:0,n:id==='bass'?45:id==='lead'?69:57}))};
/* makes the project complete for all 24 tracks (older projects, a fresh start) */
function trkFix(){const c=trkCfg();
  if(Array.isArray(S.pats))S.pats.forEach(pt=>{if(!Array.isArray(pt))return;while(pt.length<TRACKS.length)pt.push(trkRow0(pt.length));for(let i=0;i<pt.length;i++)if(!Array.isArray(pt[i]))pt[i]=trkRow0(i)});
  if(Array.isArray(S.roll))S.roll.forEach((o,pi)=>{if(!o||typeof o!=='object')o=S.roll[pi]={};TRACKS.forEach(t=>{if(t.mel&&!Array.isArray(o[t.id]))o[t.id]=[]})});
  if(!Array.isArray(S.mute))S.mute=[];while(S.mute.length<TRACKS.length)S.mute.push(0);
  if(!S.params)S.params={};if(!S.synth)S.synth={};if(!S.inst)S.inst={};if(!S.dk)S.dk={};
  TRACKS.forEach(t=>{if(!S.params[t.id])S.params[t.id]=JSON.parse(JSON.stringify(DEF_P[t.id]));
    if(t.mel){if(!S.synth[t.id]&&DEFS.synth[t.id])S.synth[t.id]=JSON.parse(JSON.stringify(DEFS.synth[t.id]));if(!S.inst[t.id])S.inst[t.id]=DEF_INST[t.id]||'analog'}
    /* an extra drum track starts on its own model once; after that it is the user's choice (also "blonda") */
    if(t.dm&&!c.di[t.id]){if(S.dk[t.id]===undefined)S.dk[t.id]=t.dm;c.di[t.id]=1}});
  if(!trkOn(S.sel))S.sel=0;if(S.solo>=0&&!trkOn(S.solo))S.solo=-1}
window.trkFix=trkFix;try{trkFix()}catch(e){if(window.__errShow)__errShow('spår (trkFix): '+(e&&e.message||e))}

/* a track taken out of use is emptied and gets its starting sound back, so it comes back clean */
function trkClear(i){const t=TRACKS[i],id=t.id;S.pats.forEach(pt=>{pt[i]=trkRow0(i)});if(t.mel&&S.roll)S.roll.forEach(o=>{o[id]=[]});
  S.params[id]=JSON.parse(JSON.stringify(DEF_P[id]));if(t.mel){S.inst[id]=DEF_INST[id]||'analog';if(DEFS.synth[id])S.synth[id]=JSON.parse(JSON.stringify(DEFS.synth[id]))}
  else{if(t.dm)S.dk[id]=t.dm;else delete S.dk[id]}
  S.mute[i]=0;if(S.solos)S.solos[i]=0;for(const k of ['len','lock','tfx','ck','eu','chord'])if(S[k]&&typeof S[k]==='object')delete S[k][id];
  if(S.ck&&!t.mel)delete S.ck[id]}
function trkAdd(mel){const c=trkCfg(),k=mel?'ns':'nd',L=mel?TRK_S:TRK_D;if(c[k]>=TRK_MAX[k]){toast(mel?'högst 8 syntspår':'högst 16 trumspår');return}
  pushHist();const i=L[c[k]];trkClear(i);c[k]++;if(typeof initAudio==='function'&&ctx)applyTrack(i);trkLayout();
  try{refreshSound()}catch(e){globalThis.__el&&globalThis.__el(e)}select(i);save();toast('+ '+TRACKS[i].name.toLowerCase()+' · '+(mel?c.ns+' syntspår':c.nd+' trumspår'))}
function trkDel(mel){const c=trkCfg(),k=mel?'ns':'nd',L=mel?TRK_S:TRK_D;if(c[k]<=TRK_MIN[k]){toast(mel?'minst 4 syntspår':'minst 6 trumspår');return}
  pushHist();const i=L[c[k]-1],nm=TRACKS[i].name.toLowerCase();c[k]--;trkClear(i);if(S.sel===i)S.sel=L[c[k]-1];if(S.solo===i)S.solo=-1;
  if(ctx)applyAll();trkLayout();try{refreshSound()}catch(e){globalThis.__el&&globalThis.__el(e)}renderAll();save();toast('− '+nm+' · '+(mel?c.ns+' syntspår':c.nd+' trumspår'))}
window.trkAdd=trkAdd;window.trkDel=trkDel;

