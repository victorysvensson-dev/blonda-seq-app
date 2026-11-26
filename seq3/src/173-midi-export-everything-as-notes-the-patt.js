/* ================= MIDI export: everything as notes — the patterns (as you hear them, following the Starter's chords)
   and the Starter's layers — one Standard MIDI File with a track per instrument, plus the Starter's four bars on its own.
   Channels as MIDI out: bass 1, keys 2, lead 3, pad 4, trummor 10 · Starter: ackord 5, topp 6, sub 7, luft 8. ================= */
const MID_DRUM={kick:36,snare:38,clap:39,hat:42,ohat:46,perc:37},MID_CH={bass:0,keys:1,lead:2,pad:3,ack:4,klo:5,sub:6,luft:7};
function midiSMF(tracks,bpm,name){const PPQ=96,enc=new TextEncoder(),vlq=n=>{n=Math.max(0,Math.round(n));const b=[n&127];while(n>>=7)b.unshift((n&127)|128);return b};
  const chunk=(id,bytes)=>[...enc.encode(id),(bytes.length>>>24)&255,(bytes.length>>>16)&255,(bytes.length>>>8)&255,bytes.length&255,...bytes];
  const meta=(type,data)=>[0xFF,type,...vlq(data.length),...data];
  const tr=(evs,pre)=>{evs.sort((a,b)=>a.t-b.t||a.o-b.o);let last=0;const out=[];pre.forEach(m=>out.push(0,...m));for(const e of evs){out.push(...vlq(e.t-last),...e.b);last=e.t}out.push(0,0xFF,0x2F,0);return out};
  const us=Math.round(60000000/bpm),t0=tr([],[meta(3,[...enc.encode(name)]),meta(0x51,[(us>>16)&255,(us>>8)&255,us&255]),meta(0x58,[4,2,24,8])]);
  const body=tracks.map(T=>{const evs=[];T.notes.forEach(n=>{const t=Math.round(n.t*PPQ/4),d=Math.max(1,Math.round(n.d*PPQ/4)),k=Math.max(0,Math.min(127,Math.round(n.n))),v=Math.max(1,Math.min(127,Math.round(n.v*127)));
      evs.push({t,o:1,b:[0x90|T.ch,k,v]},{t:t+d,o:0,b:[0x80|T.ch,k,0]})});return tr(evs,[meta(3,[...enc.encode(T.name)])])});
  const hdr=chunk('MThd',[0,1,0,tracks.length+1,0,PPQ]);return new Uint8Array([...hdr,...chunk('MTrk',t0),...body.flatMap(b=>chunk('MTrk',b))])}
/* the notes, step by step over `seq` (one pattern a bar). t and d are in 16ths. */
function midiCollect(seq,withStarter){const P=stx(),pl=stxPlanCached(),fol=P.on&&P.fol.on,tracks=[];const N=seq.length*16;
  TRACKS.forEach((tr,i)=>{const notes=[],L=trkLen(i);
    for(let g=0;g<N;g++){const pi=seq[g>>4],s=g&15,q=L<16?g%L:s,cl=S.pats[pi][i][q];
      if(tr.mel){const RR=(S.roll[pi]||{})[tr.id]||[];RR.forEach(nt=>{if(Math.floor(nt.s+1e-6)!==q)return;const rr=(cl&&cl.r)||1,len=nt.l/rr,n=fol?stxFollow(P,tr.id,nt.n,g):nt.n;
          for(let k=0;k<rr;k++)notes.push({t:g+(nt.s-q)+((cl&&cl.o)||0)+k*len,d:len*.98,n,v:(nt.v||.8)*(k?.82:1)})})}
      else if(cl&&cl.v){const rr=cl.r||1,v=cl.vel??(cl.v===2?1:.72);for(let k=0;k<rr;k++)notes.push({t:g+(cl.o||0)+k/rr,d:.9/rr,n:MID_DRUM[tr.id]||37,v:v*(k?.8:1)})}}
    if(notes.length)tracks.push({name:(typeof trkLabel==='function'?trkLabel(i,24):tr.name).replace(/^✂ /,'').toLowerCase(),ch:tr.mel?MID_CH[tr.id]:9,notes})});
  if(withStarter)tracks.push(...midiStarter(P,pl,N));
  return tracks}
function midiStarter(P,pl,N){const out=[];STX_LAY.forEach(([k,l])=>{if(!P.lay[k])return;const L=P.ls[k],sh=12*(L.oct||0),notes=[];
    if(pl.arp&&pl.arp[k]){for(let o=0;o<N;o+=64)pl.arp[k].all.forEach(a=>{if(o+a.t<N)notes.push({t:o+a.t,d:a.d*.98,n:a.n+sh,v:a.v*(k==='luft'?.7:1)})});if(notes.length)out.push({name:'starter '+l+' arp',ch:MID_CH[k],notes});return}
    for(let g=0;g<N;g++){const ev=pl.steps[g%64],e=ev&&ev[k];if(!e)continue;const ns=e.ns||[e.n],acc=(g&15)%4===0?1:(g&15)%2?.74:.87,v=k==='ack'&&e.re?acc*.8:k==='sub'?1:k==='luft'?.6:acc;
      ns.forEach(n=>notes.push({t:g,d:Math.max(.25,e.l-.05),n:n+sh,v}))}
    if(notes.length)out.push({name:'starter '+l,ch:MID_CH[k],notes})});return out}
async function midiExport(o){o=o||{};initAudio();const P=stx(),pname=((typeof curP==='function'&&curP()&&curP().name)||(document.getElementById('projName')||{}).textContent||'project').replace(/[\\/:*?"<>|]/g,'').trim()||'project';
  const chain=(S.chain||[]).filter(v=>v>=0),song=S.song&&chain.length,bars=typeof EXP!=='undefined'&&!EXP.song&&EXP.bars?EXP.bars:4;
  const seq=song?chain.slice():Array(Math.max(bars,P.on||o.starter?4:1)).fill(S.pat),withSt=P.on||!!o.starter,bpm=Math.round(S.bpm);
  const files=[];const all=midiCollect(seq,withSt);if(!all.length){toast('Inget att exportera än');return}
  files.push({name:pname+' – allt – '+(song?'låten':seq.length+' takter')+'.mid',data:midiSMF(all,bpm,pname)});
  if(withSt){const st=midiStarter(P,stxPlanCached(),64);if(st.length)files.push({name:pname+' – starter – '+STX_NN[P.root]+' '+P.mode+'.mid',data:midiSMF(st,bpm,pname+' starter')})}
  window.__lastMidi=files.map(f=>[f.name,f.data.length]);window.__lastMidiData=files;
  await saveBlob(zipStore(files),pname+' – midi – '+bpm+' bpm.zip')}
/* buttons: the export window, the dock drawer */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-a="mid"],.ex-mid');if(b){e.preventDefault();e.stopPropagation();midiExport({})}},true);

