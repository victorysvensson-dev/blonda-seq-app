/* ---------------- live: beat repeat (hold + drag through 1/2 … 1/64, triplets) ---------------- */
(function beatRepeat(){const box=$('#rpt'),ruler=$('#rptRuler'),lab=$('#rptRate');if(!box)return;
  const DIV=[['1/2',2],['1/4',1],['1/8',.5],['1/8T',1/3],['1/16',.25],['1/16T',1/6],['1/32',.125],['1/32T',1/12],['1/64',.0625]];/* length in beats */
  DIV.forEach(([n,b],i)=>{const c=document.createElement('div');c.className='rpt-c'+(n.endsWith('T')?' t':'');c.dataset.i=i;const dots=Math.min(8,Math.max(1,Math.round(Math.log2(2/b))+1));
    c.innerHTML=`<span>${n}</span><span class="d">${'<i></i>'.repeat(dots)}</span>`;ruler.appendChild(c)});
  let sel=4,on=false,L=0,T0=0,pid=null;const cells=[...ruler.children];
  const paint=()=>{cells.forEach((c,i)=>c.classList.toggle('cur',i===sel));lab.textContent=DIV[sel][0];box.classList.toggle('on',on);box.style.setProperty('--rr',(DIV[sel][1]*60/S.bpm).toFixed(3)+'s')};paint();
  const len=i=>DIV[i][1]*60/S.bpm;
  const nextGrid=()=>{const now=ctx.currentTime+.02;if(!playing)return now;const sd=stepDur();return startT+Math.ceil((now-startT)/sd)*sd};
  const ramp=(prm,v,t)=>{prm.cancelAndHoldAtTime(t);prm.setTargetAtTime(v,t,.0025)};
  function capture(i,T){const R=A.rp;L=len(i);ramp(R.fb.gain,0,T);R.dl.delayTime.setValueAtTime(L,T);ramp(R.inp.gain,1,T);ramp(R.inp.gain,0,T+L-.004);ramp(R.fb.gain,1,T+L-.004);
    ramp(R.dry.gain,1,T);ramp(R.dry.gain,0,T+L);ramp(R.wet.gain,1,T+L-.002);T0=T+L}
  function engage(i){initAudio();ctx.resume();sel=i;on=true;capture(i,nextGrid());paint()}
  function change(i){if(i===sel)return;const nl=len(i),R=A.rp,now=ctx.currentTime+.01;sel=i;paint();if(!on)return;
    if(nl<L-1e-4){const k=Math.max(0,Math.ceil((now-T0)/L)),Tb=T0+k*L,at=Tb+nl;R.dl.delayTime.setValueAtTime(nl,at);L=nl;T0=at}
    else{const R2=A.rp,T=nextGrid();ramp(R2.wet.gain,0,T);capture(i,T)}}
  function release(){if(!on)return;on=false;const R=A.rp,t=ctx.currentTime+.005;[R.inp.gain,R.fb.gain,R.wet.gain].forEach(p=>ramp(p,0,t));ramp(R.dry.gain,1,t);paint()}
  const cellAt=x=>{const r=ruler.getBoundingClientRect();return clamp(Math.floor((x-r.left)/r.width*DIV.length),0,DIV.length-1)};
  ruler.addEventListener('pointerdown',e=>{e.preventDefault();ruler.setPointerCapture(e.pointerId);pid=e.pointerId;engage(cellAt(e.clientX))});
  ruler.addEventListener('pointermove',e=>{if(e.pointerId!==pid)return;change(cellAt(e.clientX))});
  const up=e=>{if(e.pointerId!==pid)return;pid=null;release()};ruler.addEventListener('pointerup',up);ruler.addEventListener('pointercancel',up);ruler.addEventListener('lostpointercapture',up);
  window.__rpt={engage,change,release,state:()=>({on,sel,L,dry:A.rp?+A.rp.dry.gain.value.toFixed(2):null,wet:A.rp?+A.rp.wet.gain.value.toFixed(2):null,fb:A.rp?+A.rp.fb.gain.value.toFixed(2):null,dt:A.rp?+A.rp.dl.delayTime.value.toFixed(4):null})};
})();

