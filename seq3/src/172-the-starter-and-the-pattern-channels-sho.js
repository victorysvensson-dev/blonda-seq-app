/* ================= the Starter and the pattern channels: show where they share a sound ================= */
function stxUsage(){const P=stx(),use={},EN=window.BLONDA_LANG==='en'?{ackord:'chord',topp:'top',luft:'air',röst:'voice',ljud:'sound'}:{},nm=l=>EN[l]||l;if(P.on)STX_LAY.forEach(([k,l])=>{if(!P.lay[k])return;const t=stxTrkOf(k,P.ls[k].snd);if(t)(use[t]=use[t]||[]).push(nm(l))});
  /* v214: the voice and the sound play on synth tracks 5 and 6 */if(P.on&&Array.isArray(P.smp))P.smp.forEach((q,k)=>{if(q&&q.on){const t=k?'syn6':'syn5';(use[t]=use[t]||[]).push(nm(k?'ljud':'röst'))}});
  if(typeof gridEl!=='undefined'&&gridEl)TRACKS.forEach((t,i)=>{const row=trkRowEl(i),rl=row&&row.querySelector('.rl');if(!rl)return;if(use[t.id]){rl.dataset.sx='+ starter '+use[t.id].join(' + ');rl.title='Startern spelar också på den här kanalen ('+use[t.id].join(', ')+') · samma ljud'}else{delete rl.dataset.sx;rl.removeAttribute('title')}});
  const sn=document.getElementById('synName');if(sn&&typeof synT==='number'){let tag=sn.parentNode.querySelector('.sx-use');if(!tag){tag=document.createElement('em');tag.className='sx-use';sn.after(tag)}const u=use[TRACKS[synT].id];tag.textContent=u?'+ starter '+u.join(' + '):'';tag.hidden=!u}}
{const _ri=refreshInst;refreshInst=function(){_ri.apply(this,arguments);try{stxUsage();if(window.stxPaint)stxPaint(false,true)}catch(e){globalThis.__el&&globalThis.__el(e)}}}
{const _ra=renderAll;renderAll=function(){_ra.apply(this,arguments);try{stxUsage()}catch(e){globalThis.__el&&globalThis.__el(e)}}}

