/* ================= What goes through glitch. S.gxEx = {trackId:1, '@stx':1, '@lp':1} keeps that sound out of it.
   The glitch sits on the whole mix, so a kept sound is also sent, through copies of its bus (same filters, compressor, level and
   pump, so it lines up sample for sample), to the glitch's second input: the glitch works on the mix minus that copy and adds the
   copy back clean. With no glitch playing the mix passes untouched. ================= */
var GXR={k:null};
const gxEx=()=>{if(!S.gxEx||typeof S.gxEx!=='object')S.gxEx={};return S.gxEx};
const GXR_IT=()=>[...(window.trkList?trkList():TRACKS.map((_,i)=>i)).map(i=>{const t=TRACKS[i];return {id:t.id,nm:(t.name||'').toLowerCase(),hex:t.hex}}),{id:'@stx',nm:'starter',hex:'#B9A6FF'},{id:'@lp',nm:'loopar',hex:'#6FD0C5'}];
/* make one gain follow another exactly: every automation call made on the source is made on the copy too (same times, same
   values); the copy also starts from the source's value and is re-checked whenever the source is at rest */
function gxMirror(src,dst){if(!src||!dst||src.__mir)return;src.__mir=dst;dst.value=src.value;
  ['setValueAtTime','setTargetAtTime','linearRampToValueAtTime','exponentialRampToValueAtTime','cancelScheduledValues','cancelAndHoldAtTime','setValueCurveAtTime'].forEach(m=>{
    if(typeof src[m]!=='function')return;const o=src[m].bind(src);src[m]=function(...a){try{dst[m](...a)}catch(e){globalThis.__el&&globalThis.__el(e)}return o(...a)}});
  const vd=Object.getOwnPropertyDescriptor(AudioParam.prototype,'value');
  if(vd&&vd.set)Object.defineProperty(src,'value',{configurable:true,get(){return vd.get.call(src)},set(v){vd.set.call(src,v);try{vd.set.call(dst,v)}catch(e){globalThis.__el&&globalThis.__el(e)}}});
  let last=null;setInterval(()=>{try{const v=vd.get.call(src);if(last!==null&&Math.abs(v-last)<1e-6){const w=vd.get.call(dst);if(Math.abs(v-w)>1e-4*Math.max(Math.abs(v),1e-3))dst.setTargetAtTime(v,dst.context.currentTime,.02)}last=v}catch(e){globalThis.__el&&globalThis.__el(e)}},500)}
function gxrEnsure(){if(GXR.k)return GXR.k;if(!ctx||!A||!A.ch||!A.ch.length||!A.buses||!A.duck)return null;
  const G=v=>{const n=ctx.createGain();n.gain.value=v;return n},nul=G(0),sum=G(1),duck=G(1),bus={};
  bus.dr=mkBus(sum,nul,nul);bus.lp=mkBus(sum,nul,nul);bus.sy=mkBus(duck,nul,nul);duck.connect(sum);
  /* v207: the glitch's second input must be the kept sound exactly as it is in the mix at that point. The mix reaches the glitch
     through the beat repeat's dry path and the master's input trim (about 0.14 since v195), so the copy goes through the same two
     gains, following them change for change. Before, the copy skipped them and came in about seven times too loud: with no glitch
     it cancelled out (mix − copy + copy), but during a glitch the kept sound came out much too loud, with a loud upside-down
     copy of it being glitched at the same time. */
  const rpg=G(1),pg=G(1);sum.connect(rpg);rpg.connect(pg);
  const K={sum,duck,bus,gate:{},rpg,pg};GXR.k=K;A.gxK=pg;
  gxMirror(A.rp&&A.rp.dry&&A.rp.dry.gain,rpg.gain);gxMirror(A.pre.gain,pg.gain);
  try{applyMaster()}catch(e){globalThis.__el&&globalThis.__el(e)}
  TRACKS.forEach((t,i)=>{const ch=A.ch[i];if(!ch)return;const g=G(0);(ch.pan||ch.g).connect(g);g.connect(bus[t.mel?'sy':'dr'].in);K.gate[t.id]=g});
  try{const lb=loopOut(),g=G(0);lb.connect(g);g.connect(bus.lp.in);K.gate['@lp']=g}catch(e){globalThis.__el&&globalThis.__el(e)}
  if(GX.node)try{pg.connect(GX.node,0,1)}catch(e){globalThis.__el&&globalThis.__el(e)}
  /* the copies follow the real buses: their settings and their pump */
  const swap=fn=>{const rb=A.buses,rd=A.duck;A.buses=bus;A.duck=duck;try{fn()}catch(e){globalThis.__el&&globalThis.__el(e)}finally{A.buses=rb;A.duck=rd}};
  {const _ab=applyBuses;applyBuses=function(){const r=_ab.apply(this,arguments);const bp=window.busPaint;window.busPaint=null;swap(()=>_ab());window.busPaint=bp;return r}}
  {const _ph=pumpHit;pumpHit=function(k,t){const r=_ph.apply(this,arguments);swap(()=>_ph(k,t));return r}}
  try{applyBuses()}catch(e){globalThis.__el&&globalThis.__el(e)}gxrApply();return K}
function gxrApply(){const K=gxrEnsure();if(!K)return;const E=gxEx(),t=ctx.currentTime;
  if(!K.gate['@stx']&&typeof STX!=='undefined'&&STX.E&&STX.E.vol){const g=ctx.createGain();g.gain.value=0;STX.E.vol.connect(g);g.connect(K.bus.sy.in);K.gate['@stx']=g}
  Object.keys(K.gate).forEach(id=>K.gate[id].gain.setTargetAtTime(E[id]?1:0,t,.008))}
{const _ia=initAudio;initAudio=function(){const r=_ia.apply(this,arguments);try{gxrEnsure()}catch(e){globalThis.__el&&globalThis.__el(e)}return r}}
/* the Starter makes its sound engine late: hook it up when it appears */
setInterval(()=>{try{if(GXR.k&&!GXR.k.gate['@stx']&&typeof STX!=='undefined'&&STX.E)gxrApply()}catch(e){globalThis.__el&&globalThis.__el(e)}},800);

/* the row of switches in the glitch card */
(()=>{const card=document.querySelector('.card[data-card="glitch"]');if(!card)return;
  const css=document.createElement('style');css.textContent=`
.gxr{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin-top:10px}
.gxr>span{font:500 9px var(--f-mono);letter-spacing:.1em;text-transform:lowercase;opacity:.55;margin-right:4px;width:100%}
.gxr button{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 8px;border-radius:12px;border:0;cursor:pointer;font:500 10px var(--f-mono);letter-spacing:.02em;
  background:color-mix(in srgb,var(--h) 22%,transparent);color:inherit;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--h) 55%,transparent);transition:opacity .15s,background .15s}
.gxr button i{width:6px;height:6px;border-radius:50%;background:var(--h)}
.gxr button.ex{background:none;opacity:.42;box-shadow:inset 0 0 0 1px rgba(127,127,127,.35);text-decoration:line-through}
.gxr button.ex i{background:none;box-shadow:inset 0 0 0 1px var(--h)}
`;document.head.appendChild(css);
  const row=document.createElement('div');row.className='gxr';
  const paint=()=>{const E=gxEx();row.innerHTML='<span>går igenom glitch · tryck för att hålla utanför</span>'+GXR_IT().map(o=>`<button data-id="${o.id}" class="${E[o.id]?'ex':''}" style="--h:${o.hex}" title="${o.nm}: ${E[o.id]?'utanför glitch – tryck för att släppa in':'går igenom glitch – tryck för att hålla utanför'}"><i></i>${o.nm}</button>`).join('')};
  row.addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(!b)return;e.stopPropagation();const E=gxEx(),id=b.dataset.id;if(E[id])delete E[id];else E[id]=1;
    try{initAudio();gxrApply()}catch(_){globalThis.__el&&globalThis.__el(_)}save();paint();const o=GXR_IT().find(x=>x.id===id);toast((o?o.nm:id)+(E[id]?' går inte igenom glitch':' går igenom glitch'))});
  const auto=card.querySelector('.gx-auto');if(auto)auto.after(row);else card.appendChild(row);paint();window.gxrPaint=paint;
  {const _ra=renderAll;renderAll=function(){const r=_ra.apply(this,arguments);try{paint();if(GXR.k)gxrApply()}catch(e){globalThis.__el&&globalThis.__el(e)}return r}}})();
window.__gxr={GXR,gxEx,gxrApply};

