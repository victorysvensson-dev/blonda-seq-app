/* ================= the Starter's notes on its channel: ghost notes in the pattern row, the Steg card and the piano roll ================= */
/* which Starter layer plays on a channel id, and its notes in 4-bar bar `bar` (0–3): [{s, l, ns}] */
/* v215: the Starter's notes are real notes on the tracks now – no dashed copies */
function stxOnCh(id){return [];const P=stx();if(!P.on)return [];return STX_LAY.filter(([k])=>P.lay[k]&&stxTrkOf(k,P.ls[k].snd)===id).map(([k,l,c])=>({k,l,c}))}
function stxBarNotes(k,bar){const P=stx(),pl=stxPlanCached(),sh=12*(P.ls[k].oct||0),out=[];if(pl.arp&&pl.arp[k]){pl.arp[k].all.forEach(a=>{if(a.t>=bar*16&&a.t<bar*16+16)out.push({s:+(a.t-bar*16).toFixed(4),l:a.d,ns:[a.n+sh]})});return out}for(let s=0;s<16;s++){const ev=pl.steps[bar*16+s],e=ev&&ev[k];if(e)out.push({s,l:e.l,ns:(e.ns||[e.n]).map(n=>n+sh)})}return out}
function stxBarNow(){const P=stx();if(playing&&STX.vis.length&&ctx){const t=ctx.currentTime;let g=-1;for(const v of STX.vis)if(v.t<=t)g=v.g;if(g>=0)return ((g%64)+64)%64>>4}return 0}
let sxgKey='';
function stxGhostCells(){const bar=stxBarNow(),marks=new Map();TRACKS.forEach((t,i)=>{if(!t.mel)return;const L=stxOnCh(t.id);if(!L.length)return;const set=new Set();L.forEach(({k})=>stxBarNotes(k,bar).forEach(n=>set.add(Math.floor(n.s))));marks.set(i,set)});
  const key=bar+'|'+[...marks].map(([i,s])=>i+':'+[...s].join(',')).join(';')+'|'+S.sel;if(key===sxgKey)return;sxgKey=key;
  if(typeof cellEls!=='undefined')cellEls.forEach((row,i)=>row&&row.forEach((c,s)=>c.classList.toggle('sxg',!!(marks.get(i)&&marks.get(i).has(s)))));
  if(typeof bigEls!=='undefined'){const m=marks.get(S.sel);bigEls.forEach((b,s)=>b.classList.toggle('sxg',!!(m&&m.has(s))))}}
setInterval(()=>{try{stxGhostCells()}catch(e){globalThis.__el&&globalThis.__el(e)}},120);
/* in the piano roll: the Starter's notes on this channel (the bar that plays, or bar 1), dashed, under your own */
function stxRollGhost(c,rX,rY,sw,h,ti){const t=TRACKS[ti];if(!t)return;const L=stxOnCh(t.id);if(!L.length)return;const bar=stxBarNow();
  L.forEach(({k,l,c:col})=>{stxBarNotes(k,bar).forEach(n=>n.ns.forEach(nn=>{const y=rY(nn);if(y>h||y<-rRowH)return;const x=rX(n.s)+1,w=Math.max(3,n.l*sw-2);
    c.fillStyle='rgba(111,208,197,.16)';c.fillRect(x,y+2,w,rRowH-4);c.setLineDash([3,3]);c.strokeStyle=col;c.lineWidth=1.2;c.strokeRect(x+.5,y+2.5,w-1,rRowH-5);c.setLineDash([])}))});
  c.font='500 9px "BLONDA Mono",ui-monospace,monospace';c.fillStyle='rgba(111,208,197,.85)';c.textBaseline='top';c.fillText('starter '+L.map(x=>x.l).join(' + ')+' · takt '+(bar+1)+' (streckat)',rX(0)+6,4);c.textBaseline='middle'}
/* "lägg i mönstren": the layer's four bars become notes in patterns A–D of its channel — then they are yours in the piano roll */
function stxBake(k){const P=stx(),id=stxTrkOf(k,P.ls[k].snd);if(!id){toast('Välj ett ljud från appen (↗ eller spår) först');return}pushHist();
  const empty=pi=>TRACKS.every((t,i)=>!S.pats[pi][i].some(c=>c.v)&&!((S.roll[pi]||{})[t.id]||[]).length),src=S.pat;
  for(let b=0;b<4;b++){if(b!==src&&empty(b)){S.pats[b]=JSON.parse(JSON.stringify(S.pats[src]));S.roll[b]=JSON.parse(JSON.stringify(S.roll[src]))}
    const notes=[];stxBarNotes(k,b).forEach(n=>n.ns.forEach(nn=>notes.push({s:n.s,l:Math.max(.25,Math.min(16-n.s,n.l)),n:nn,v:k==='ack'?.85:k==='sub'?1:.8})));
    S.roll[b][id]=notes;const ti=TRACKS.findIndex(t=>t.id===id);if(typeof syncCells==='function')syncCells(b,ti)}
  if(!S.chord)S.chord={};if(k==='ack'||k==='luft')S.chord[id]=0;P.fol[id]='av';P.lay[k]=0;S.chain=[0,1,2,3,-1,-1,-1,-1];S.song=1;
  save();renderAll();if(typeof renderChain==='function')renderChain();if(window.stxPaint)stxPaint(true);sxgKey='';
  toast(STX_LAY.find(x=>x[0]===k)[1]+' ligger nu i mönster A–D på '+id+' · ändra i piano roll · ångra med ⌘Z')}

