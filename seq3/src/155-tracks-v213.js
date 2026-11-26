/* ================= Tracks (v213) =================
   Up to 16 drum tracks and up to 8 synth tracks. A new project starts with 10 drums and 4 synths; "+ trumma" and "+ synt"
   add more, "−" takes away the last one. All 24 tracks always exist (the ones that are not in use are silent and hidden), so
   every index that existed before stays the same: drums 0–5 and 10–19, synths 6–9 and 20–23.
   The drum pattern shows the drum tracks; the synth tracks have a module of their own (card "synths").
   Any element that belongs to one track can carry data-ti="<index>": it is hidden while that track is not in use. ================= */
const TRK_D=TRACKS.map((t,i)=>i).filter(i=>!TRACKS[i].mel),TRK_S=TRACKS.map((t,i)=>i).filter(i=>TRACKS[i].mel);
const TRK_DEF={nd:10,ns:4},TRK_MIN={nd:6,ns:4},TRK_MAX={nd:TRK_D.length,ns:TRK_S.length};
function trkCfg(){let c=S.trk;if(!c||typeof c!=='object')c=S.trk={nd:TRK_DEF.nd,ns:TRK_DEF.ns,di:{}};
  for(const k of ['nd','ns']){const v=Math.round(+c[k]);c[k]=v>=TRK_MIN[k]&&v<=TRK_MAX[k]?v:TRK_DEF[k]}if(!c.di||typeof c.di!=='object')c.di={};return c}
function trkOn(i){const t=TRACKS[i];if(!t)return false;const c=trkCfg(),k=(t.mel?TRK_S:TRK_D).indexOf(i);return k>=0&&k<(t.mel?c.ns:c.nd)}
const trkDrums=()=>TRK_D.slice(0,trkCfg().nd),trkSyns=()=>TRK_S.slice(0,trkCfg().ns),trkN=()=>trkCfg().nd+trkCfg().ns;
/* the number keys 1–0 play the first ten drum tracks */
const trkKey=k=>{const d=trkDrums();return k<d.length?d[k]:-1};
window.trkList=()=>trkDrums().concat(trkSyns());window.trkOn=trkOn;window.trkN=trkN;window.trkKey=trkKey;window.trkDrums=trkDrums;window.trkSyns=trkSyns;

