/* ---------------- plugins ---------------- */
let irT=0;function queueIR(){clearTimeout(irT);irT=setTimeout(()=>{if(ctx){const b=makeIR(ctx,S.fx.space.size,2.8);if(!(window.__irSwap&&__irSwap(b)))A.cv.buffer=b}},250)}
const PLUGS=[
 {id:'echo',name:'Echo',sub:'Delay',c:'#3D6CF5',ic:'<circle cx="5" cy="9" r="3.2"/><circle cx="10.6" cy="9" r="2.2"/><circle cx="14.7" cy="9" r="1.3"/>',
  ps:[{l:'mix',min:0,max:1,u:'%',g:()=>S.master.echo,s:v=>{S.master.echo=v}},{l:'feedback',min:0,max:.85,u:'%',g:()=>S.fx.echo.fb,s:v=>{S.fx.echo.fb=v}},
      {l:'tid',opts:[.5,.75,1,1.5],names:['1/8','3/16','1/4','3/8'],g:()=>S.fx.echo.time,s:v=>{S.fx.echo.time=v}}]},
 {id:'space',name:'Space',sub:'Reverb',c:'#8E7CFF',ic:'<path d="M3 14a6 6 0 0 1 12 0M5.6 14a3.4 3.4 0 0 1 6.8 0"/><circle cx="9" cy="14" r="1"/>',
  ps:[{l:'mix',min:0,max:1,u:'%',g:()=>S.master.space,s:v=>{S.master.space=v}},{l:'storlek',min:.6,max:6,u:'s',dec:1,g:()=>S.fx.space.size,s:v=>{S.fx.space.size=v;queueIR()}}]},
 {id:'tape',name:'Tape',sub:'Saturation',c:'#FF6A1A',ic:'<circle cx="5.5" cy="8.5" r="3"/><circle cx="12.5" cy="8.5" r="3"/><path d="M5.5 11.5h7"/>',
  ps:[{l:'drive',min:0,max:1,u:'%',g:()=>S.master.drive,s:v=>{S.master.drive=v}},{l:'ton',min:0,max:1,u:'%',g:()=>S.fx.tape.color,s:v=>{S.fx.tape.color=v}}]},
 {id:'crush',name:'Crush',sub:'Bitcrusher',c:'#27B26B',ic:'<path d="M3 15h3v-3h3V9h3V6h3"/>',
  ps:[{l:'bits',min:2,max:12,u:'bit',int:1,g:()=>S.fx.crush.bits,s:v=>{S.fx.crush.bits=v}},{l:'mix',min:0,max:1,u:'%',g:()=>S.fx.crush.mix,s:v=>{S.fx.crush.mix=v}}]},
];
const pIdx={};let pSel='echo';
function fmtP(q,v){if(q.opts)return {n:q.names[q.opts.indexOf(v)]||'–',u:''};if(q.u==='%')return {n:String(Math.round(v*100)),u:'%'};return {n:q.int?String(Math.round(v)):v.toFixed(q.dec||1),u:q.u}}
function selPlug(id){pSel=id;PLUGS.forEach(p=>p.el.classList.toggle('sel',p.id===id))}
function renderPlug(pl){if(!pl.el)return;const q=pl.ps[pIdx[pl.id]],f=fmtP(q,q.g()),t=pl.el,on=!!S.fx[pl.id].on;
  t.classList.toggle('off',!on);t.querySelector('.pact span').textContent=on?'active':'bypass';
  t.querySelector('.pnum span').textContent=f.n;t.querySelector('.pnum sup').textContent=f.u;
  t.querySelector('.pcap').textContent=q.l+' · '+(pIdx[pl.id]+1)+'/'+pl.ps.length}
function renderPlugs(){PLUGS.forEach(renderPlug)}
PLUGS.forEach(pl=>{pIdx[pl.id]=0;const t=document.createElement('div');t.className='ptile';t.style.setProperty('--pc',pl.c);
  t.innerHTML=`<div class="ptl-h"><svg class="ic" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.4">${pl.ic}</svg><div class="nm">${pl.name}<br>${pl.sub}</div></div>
  <button class="pedit" aria-label="Byt parameter för ${pl.name}"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M9.5 2.5l2 2L5 11H3V9z"/></svg></button>
  <div class="pfoot"><div><div class="pcap"></div><div class="pnum" title="Dra upp/ner"><span></span><sup></sup></div></div>
  <button class="pact"><svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 5.2l2 2 4-4.4"/></svg><span>active</span></button></div>`;
  $('#ptiles').appendChild(t);pl.el=t;
  t.addEventListener('pointerdown',()=>selPlug(pl.id));
  t.querySelector('.pedit').onclick=()=>{pIdx[pl.id]=(pIdx[pl.id]+1)%pl.ps.length;renderPlug(pl)};
  t.querySelector('.pact').onclick=()=>{initAudio();S.fx[pl.id].on=S.fx[pl.id].on?0:1;applyMaster();renderPlug(pl);save();toast(pl.name+(S.fx[pl.id].on?' aktiv':' bypass'))};
  const num=t.querySelector('.pnum');let y0=0,v0=0;
  num.addEventListener('pointerdown',e=>{e.preventDefault();num.setPointerCapture(e.pointerId);const q=pl.ps[pIdx[pl.id]];y0=e.clientY;v0=q.opts?q.opts.indexOf(q.g()):q.g()});
  num.addEventListener('pointermove',e=>{if(!num.hasPointerCapture(e.pointerId))return;const q=pl.ps[pIdx[pl.id]],dy=y0-e.clientY;
    if(q.opts)q.s(q.opts[clamp(Math.round(v0+dy/30),0,q.opts.length-1)]);else{let v=clamp(v0+dy/160*(q.max-q.min),q.min,q.max);if(q.int)v=Math.round(v);q.s(v)}
    applyMaster();renderPlug(pl);masterKnobs.forEach(k=>k.refresh());save()})});
selPlug('echo');renderPlugs();

