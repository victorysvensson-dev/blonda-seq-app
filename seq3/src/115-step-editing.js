/* ---------------- step editing ---------------- */
function bindSteps(container,getTrack,isGrid){
  let mode=null,paintVal=0,startY=0,startN=0,st=null,lp=0,moved=false,ti=0,touched=new Set();
  container.addEventListener('contextmenu',e=>{const el=e.target.closest('.cell,.bs');if(!el)return;e.preventDefault();pushHist();openStepInsp(getTrack(el),+el.dataset.s,el)});
  container.addEventListener('pointerdown',e=>{if(e.button===2)return;const el=e.target.closest('.cell,.bs');if(!el)return;e.preventDefault();initAudio();pushHist();
    ti=getTrack(el);const s=+el.dataset.s;st=S.pats[S.pat][ti][s];const prev={...st},cellEl=el;moved=false;startY=e.clientY;container.setPointerCapture(e.pointerId);touched=new Set([ti+':'+s]);
    if(st.v&&isGrid){mode='pend';NG={x0:e.clientX,s0:s,s:s,o0:st.o||0,el:cellEl,pitch:cellEl.getBoundingClientRect().width+parseFloat(getComputedStyle(cellEl.parentElement).columnGap)||3};startN=Math.max(0,SCALE.indexOf(st.n))}
    else if(TRACKS[ti].mel&&st.v){mode='note';startN=Math.max(0,SCALE.indexOf(st.n))}
    else{mode='paint';paintVal=st.v?0:1;if(paintVal){st.v=1;delete st.vel;delete st.o}else clrStep(st);if(paintVal)preview(ti,st);renderCells();save()}
    clearTimeout(lp);lp=setTimeout(()=>{if(!moved&&st){Object.assign(st,prev);if(!st.v)st.v=1;renderCells();save();openStepInsp(ti,s,cellEl)}mode=null},430)});
  container.addEventListener('pointermove',e=>{if(!mode)return;
    if(mode==='pend'){const dx=e.clientX-NG.x0,dy=startY-e.clientY;
      if(Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*1.2){mode='nudge';moved=true;clearTimeout(lp);NG.el.classList.add('nudging')}
      else if(Math.abs(dy)>6&&TRACKS[ti].mel&&e.altKey){mode='note';moved=true;clearTimeout(lp)}
      else if(Math.abs(dy)>6){mode='vol';moved=true;clearTimeout(lp);NG.v0=stepVel(st,ti,NG.s);NG.y0=e.clientY;NG.el.classList.add('voling')}
      else return}
    /* drag up / down on a step = its volume (option-drag on a melodic step still changes the note) */
    if(mode==='vol'){const v=Math.round(clamp(NG.v0+(NG.y0-e.clientY)/110,.05,1)*100)/100;
      if(TRACKS[ti].mel){notesAt(S.roll[S.pat][TRACKS[ti].id],NG.s).forEach(n=>n.v=v);syncCells(S.pat,ti)}else{st.vel=v;st.v=v>=.95?2:1}
      renderCells();NG.el.classList.add('voling');if(window.__volTip)__volTip(NG.el,v);save();return}
    if(mode==='nudge'){const want=NG.o0+(e.clientX-NG.x0)/NG.pitch,k=((NG.s-NG.s0)%16+16)%16,kk=k>8?k-16:k;
      const s2=nudgeStep(ti,NG.s,want-kk);if(s2!==NG.s){NG.el.classList.remove('nudging');NG.s=s2;NG.el=cellEls[ti][s2];NG.el.classList.add('nudging');st=S.pats[S.pat][ti][s2]}
      renderCells();save();return}
    if(mode==='note'){const dy=startY-e.clientY;if(Math.abs(dy)>6){moved=true;clearTimeout(lp)}
      if(moved){const ni=clamp(startN+Math.round(dy/14),0,SCALE.length-1);if(SCALE[ni]!==st.n){st.n=SCALE[ni];preview(ti,st);renderCells();save()}}return}
    const el=document.elementFromPoint(e.clientX,e.clientY);const c=el&&el.closest('.cell,.bs');if(!c||!container.contains(c))return;
    const t2=getTrack(c),s2=+c.dataset.s,key=t2+':'+s2;if(touched.has(key)||(isGrid&&t2!==ti))return;
    touched.add(key);moved=true;clearTimeout(lp);const c2=S.pats[S.pat][t2][s2];if(paintVal){if(!c2.v){c2.v=1;delete c2.vel;delete c2.o}}else clrStep(c2);renderCells();save()});
  const end=()=>{clearTimeout(lp);if((mode==='note'||mode==='pend')&&!moved&&st){clrStep(st);renderCells();save()}
    if(mode==='nudge'){if(NG&&NG.el)NG.el.classList.remove('nudging');if(st)preview(ti,st)}
    if(mode==='vol'){if(NG&&NG.el)NG.el.classList.remove('voling');if(window.__volTip)__volTip(null);if(st)preview(ti,st)}mode=null};
  container.addEventListener('pointerup',end);container.addEventListener('pointercancel',end)}
bindSteps(gridEl,el=>+el.dataset.i,true);bindSteps(bigEl,()=>S.sel,false);
const firstNote=i=>(S.pats[S.pat][i].find(x=>x.v)||{n:({bass:45,lead:69})[TRACKS[i].id]||57}).n;
function preview(i,st){if(!prevOn())return;ctx.resume();trigger(i,ctx.currentTime+.01,.8,st.n)}
function audition(i,force){if(!force&&!prevOn())return;initAudio();ctx.resume();trigger(i,ctx.currentTime+.01,.85,firstNote(i))}
function hitPad(i){initAudio();ctx.resume();const n=firstNote(i);trigger(i,ctx.currentTime+.005,.9,n);
  const p=padEls[i];p.classList.add('hit');setTimeout(()=>p.classList.remove('hit'),90);if(S.sel!==i){S.sel=i;buildTrackKnobs();renderAll()}
  if(recording&&playing){pushHist();const s=((Math.round((ctx.currentTime-startT)/stepDur())%16)+16)%16,cell=S.pats[S.pat][i][s];cell.v=Math.max(cell.v,1);if(TRACKS[i].mel)cell.n=n;renderCells();save()}}

