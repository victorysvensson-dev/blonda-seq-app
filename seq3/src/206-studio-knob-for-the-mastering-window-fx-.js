/* ================= Studio knob for the mastering window (fx, multi): a black hardware cap with a white pointer line
   and a printed 0–10 scale around it, in the spirit of studio synths. A thin arc in the module's colour shows the value.
   Drag up/down (200 px = full range, Shift = fine), double-click = default, arrow keys step, scroll wheel steps.
   window.__dknob(parent,{label,min,max,def,get,set,fmt,light,bi,toN,fromN}) → element with .refresh().
   toN/fromN map value ↔ 0..1 (for log scales); without them min/max is linear. ================= */
(()=>{const A0=-135,A1=135,R=Math.PI/180;
  const pol=(r,a)=>[32+r*Math.sin(a*R),32-r*Math.cos(a*R)];
  const arc=(r,a,b)=>{if(Math.abs(b-a)<.01)return'';const[x0,y0]=pol(r,a),[x1,y1]=pol(r,b);return`M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${Math.abs(b-a)>180?1:0} ${b>a?1:0} ${x1.toFixed(2)} ${y1.toFixed(2)}`};
  let scale='';for(let i=0;i<=10;i++){const a=A0+i*27,[x0,y0]=pol(27.2,a),[x1,y1]=pol(i%5===0?31:29.6,a);scale+=`<line x1="${x0.toFixed(2)}" y1="${y0.toFixed(2)}" x2="${x1.toFixed(2)}" y2="${y1.toFixed(2)}"${i%5===0?' class="mj"':''}/>`}
  const SVG=`<svg viewBox="0 0 64 64" aria-hidden="true"><g class="dk-sc">${scale}</g><path class="dk-tr" d="${arc(24.6,A0,A1)}"/><path class="dk-ar"/>`+
    `<circle class="dk-sk" cx="32" cy="32" r="21.2"/><circle class="dk-cap" cx="32" cy="32" r="17.4"/><circle class="dk-hi" cx="32" cy="32" r="16.6"/>`+
    `<line class="dk-pt" x1="32" y1="25" x2="32" y2="15.4"/></svg>`;
  let uid=0;
  window.__dknob=function(parent,o){const min=o.min??0,max=o.max??1;
    const toN=o.toN||(v=>(v-min)/(max-min)),fromN=o.fromN||(u=>min+u*(max-min));
    const el=document.createElement('div');el.className='dk'+(o.light?' lt':'')+(o.cls?' '+o.cls:'');el.tabIndex=0;el.setAttribute('role','slider');
    el.innerHTML=`<span class="dk-l">${o.label}</span><div class="dk-f">${SVG}</div><span class="dk-v"></span>`;
    el.title=o.label+' · dra upp/ner · Shift = fint · dubbelklick = standard';
    const ar=el.querySelector('.dk-ar'),pt=el.querySelector('.dk-pt'),vt=el.querySelector('.dk-v'),f=el.querySelector('.dk-f');
    const cl=u=>Math.max(0,Math.min(1,u));let cur=-1,curTxt='';
    const paint=()=>{const v=o.get(),u=cl(toN(v));const t=o.fmt?o.fmt(v):String(Math.round(v*100)/100);if(t!==curTxt){curTxt=t;vt.textContent=t;el.setAttribute('aria-valuetext',t)}
      if(Math.abs(u-cur)<1e-4)return;cur=u;const a=A0+u*(A1-A0),a0=o.bi?0:A0;pt.setAttribute('transform',`rotate(${a.toFixed(2)} 32 32)`);ar.setAttribute('d',a>=a0?arc(24.6,a0,a):arc(24.6,a,a0))};
    const put=u=>{o.set(fromN(cl(u)));paint()};
    let dn=false,y0=0,u0=0,id=null,lastTap=0;
    f.addEventListener('pointerdown',e=>{if(e.button>0)return;e.preventDefault();e.stopPropagation();const n=performance.now();
      if(n-lastTap<280){lastTap=0;if(o.def!=null){o.set(o.def);cur=-1;paint()}return}lastTap=n;
      dn=true;id=e.pointerId;y0=e.clientY;u0=cl(toN(o.get()));el.classList.add('active');try{f.setPointerCapture(id)}catch(_){globalThis.__el&&globalThis.__el(_)}el.focus({preventScroll:true})});
    f.addEventListener('pointermove',e=>{if(!dn||e.pointerId!==id)return;const d=(y0-e.clientY)/200*(e.shiftKey?.25:1);put(u0+d)});
    const up=e=>{if(!dn||(e&&e.pointerId!==id))return;dn=false;el.classList.remove('active');if(o.end)o.end()};
    f.addEventListener('pointerup',up);f.addEventListener('pointercancel',up);f.addEventListener('lostpointercapture',up);
    el.addEventListener('keydown',e=>{const s=e.shiftKey?.002:.01,k=e.key;if(k==='ArrowUp'||k==='ArrowRight'){e.preventDefault();put(cl(toN(o.get()))+s);if(o.end)o.end()}else if(k==='ArrowDown'||k==='ArrowLeft'){e.preventDefault();put(cl(toN(o.get()))-s);if(o.end)o.end()}});
    f.addEventListener('wheel',e=>{if(!el.matches(':hover'))return;e.preventDefault();put(cl(toN(o.get()))+(e.deltaY<0?1:-1)*(e.shiftKey?.002:.01));clearTimeout(el._we);el._we=setTimeout(()=>{if(o.end)o.end()},250)},{passive:false});
    el.refresh=()=>{if(!dn)paint()};paint();parent.appendChild(el);return el};
  const st=document.createElement('style');st.textContent=`
.dk{--dk-sz:52px;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:58px;outline:none;user-select:none;-webkit-user-select:none;font-family:var(--f-mono)}
.dk-l{font:600 8.5px var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--dm-ink,#E8E6E0);white-space:nowrap;line-height:1}
.dk-f{width:var(--dk-sz);height:var(--dk-sz);cursor:ns-resize;touch-action:none}
.dk-f svg{width:100%;height:100%;display:block;overflow:visible}
.dk-sc line{stroke:var(--dm-ink,#E8E6E0);stroke-width:1;opacity:.55;stroke-linecap:round}.dk-sc line.mj{stroke-width:1.5;opacity:.9}
.dk-tr{fill:none;stroke:var(--dm-ink,#E8E6E0);stroke-width:1.6;opacity:.1}
.dk-ar{fill:none;stroke:var(--cc,#E8E6E0);stroke-width:1.6;stroke-linecap:round}
.dk-sk{fill:#050505;stroke:var(--dm-edge,#5A5A5D);stroke-width:1}
.dk-cap{fill:#1B1B1C;stroke:#000;stroke-width:1}
.dk-hi{fill:none;stroke:rgba(255,255,255,.07);stroke-width:1;stroke-dasharray:30 200;transform:rotate(-120deg);transform-origin:32px 32px}
.dk-pt{stroke:#F4F2EC;stroke-width:2.6;stroke-linecap:round}
.dk.lt .dk-cap{fill:#D9D7D0;stroke:#8E8C86}.dk.lt .dk-sk{fill:#141414}.dk.lt .dk-pt{stroke:#111}.dk.lt .dk-hi{stroke:rgba(255,255,255,.5)}
.dk-v{font:500 10px var(--f-mono);color:var(--dm-ink,#E8E6E0);opacity:.72;white-space:nowrap;line-height:1;min-height:10px;font-variant-numeric:tabular-nums}
.dk:focus-visible .dk-f,.dk.active .dk-f{filter:drop-shadow(0 0 4px rgba(255,255,255,.18))}
.dk.active .dk-v,.dk:hover .dk-v{opacity:1}
.dk.sm{--dk-sz:40px;min-width:48px}
.pq-ov.dots .dk{--dm-ink:#ECEAE3;--dm-edge:#ECEAE3;--cc:#ECEAE3}.pq-ov.dots .dk-sk{fill:#121215}.pq-ov.dots .dk-cap{fill:#0A0A0A;stroke:#ECEAE3}.pq-ov.dots .dk-hi{display:none}
.pq-ov.dots .dk-sc line{opacity:1}.pq-ov.dots .dk-tr{opacity:0}.pq-ov.dots .dk-v{opacity:1}
.pq-ov.dots .dk.lt .dk-cap{fill:#ECEAE3;stroke:#ECEAE3}.pq-ov.dots .dk.lt .dk-pt{stroke:#0A0A0A}`;document.head.appendChild(st)})();

