/* ---------- clone panels: Minimoog Model D and SH-101, shown only when the selected synth runs that engine ---------- */
const CL_PRE={
 mini:[['Model D bas',{o1r:2,o1w:2,o2r:2,o2w:2,o2f:.06,o3r:1,o3w:4,o3f:0,m1:.9,m2:.75,m3:.6,cut:.3,emph:.32,contour:.45,fA:0,fD:.38,fS:.25,aA:0,aD:.45,aS:.85,decSw:0,glideOn:0}],
  ['Prog lead',{o1r:3,o1w:2,o2r:3,o2w:3,o2f:.12,o3r:4,o3w:4,o3f:-.1,m1:.85,m2:.8,m3:.55,cut:.46,emph:.42,contour:.42,fA:.05,fD:.5,fS:.6,aA:.03,aD:.5,aS:.9,decSw:1,glideOn:1,glide:.32,oscMod:0}],
  ['Funk bas',{o1r:2,o1w:3,o2r:2,o2w:2,o2f:-.05,o3r:1,o3w:3,m1:.9,m2:.6,m3:.5,cut:.24,emph:.55,contour:.6,fA:0,fD:.3,fS:0,aA:0,aD:.38,aS:.6,decSw:0}],
  ['Sub bas',{o1r:1,o1w:0,o2r:2,o2w:0,o2f:0,o3r:1,o3w:0,m1:.9,m2:.5,m3:.5,m3on:0,cut:.28,emph:.1,contour:.15,aA:.01,aD:.5,aS:1,decSw:0}],
  ['Flöjt',{o1r:4,o1w:0,o2r:4,o2w:0,o2f:.02,m1:.8,m2:.4,m3:0,m3on:0,mn:.18,mnon:1,cut:.5,emph:.15,contour:.2,fA:.25,fD:.4,fS:.7,aA:.22,aD:.4,aS:.85,decSw:1,o3lfo:1,o3r:0,o3w:0,o3f:5,modAmt:.25,oscMod:1}],
  ['Mässing',{o1r:3,o1w:2,o2r:3,o2w:2,o2f:.1,o3r:2,o3w:3,m1:.8,m2:.8,m3:.5,cut:.32,emph:.2,contour:.55,fA:.32,fD:.45,fS:.5,aA:.12,aD:.4,aS:.85,decSw:1}],
  ['Svep',{o1r:2,o1w:2,o2r:2,o2w:4,o2f:.07,o3r:0,o3w:0,o3f:-2,o3lfo:1,m1:.85,m2:.7,m3:0,m3on:0,cut:.32,emph:.62,contour:.3,aS:.9,modAmt:.55,filtMod:1,modmix:0}],
  ['Kick',{o1r:1,o1w:0,o2r:1,o2w:0,m1:.9,m2:0,m2on:0,m3on:0,cut:.15,emph:.92,contour:.8,fA:0,fD:.25,fS:0,aA:0,aD:.38,aS:0,decSw:1,kt1:1,kt2:1}],
  ['Brus-hihat',{m1on:0,m2on:0,m3on:0,mn:.9,mnon:1,ncol:0,cut:.86,emph:.5,contour:.2,fD:.15,fS:0,aA:0,aD:.2,aS:0,decSw:1}],
  ['Overload',{o1r:2,o1w:2,o2r:2,o2w:3,o2f:.15,o3r:3,o3w:3,o3f:7,m1:1,m2:1,m3:.9,cut:.38,emph:.3,contour:.5,fD:.4,fS:.3,aD:.4,aS:.9,glideOn:1,glide:.15}]],
 sh101:[['101 bas',{range:0,saw:.75,pulse:.3,sub:.6,subMode:0,cut:.3,res:.42,env:.5,A:0,D:.3,S:.15,R:.15,portaMode:2,porta:.18}],
  ['Acid',{range:0,saw:.9,pulse:0,sub:.2,cut:.22,res:.75,env:.65,A:0,D:.28,S:0,R:.12,vcaMode:0,portaMode:2,porta:.25}],
  ['Sub-puls',{range:0,saw:0,pulse:.7,pw:.25,pwmSrc:1,sub:.75,subMode:2,cut:.26,res:.25,env:.35,A:0,D:.35,S:.4,R:.15}],
  ['Squelch',{range:1,saw:.8,pulse:.2,sub:.3,cut:.18,res:.85,env:.75,kybd:1,A:0,D:.22,S:0,R:.1}],
  ['Arp-bubbla',{range:2,saw:0,pulse:.8,pw:.5,pwmSrc:0,lfoR:.55,sub:0,cut:.36,res:.55,env:.55,A:0,D:.2,S:0,R:.15,portaMode:0}],
  ['PWM-sträng',{range:1,saw:.2,pulse:.85,pw:.6,pwmSrc:0,lfoR:.38,sub:.25,cut:.45,res:.12,env:.15,A:.35,D:.5,S:.8,R:.45,portaMode:0}],
  ['Lead 101',{range:2,saw:.85,pulse:.4,sub:.2,cut:.5,res:.32,env:.3,vcoMod:.18,lfoR:.62,A:.02,D:.45,S:.75,R:.25,portaMode:1,porta:.25}],
  ['Brus-perc',{saw:0,pulse:0,sub:0,noise:.9,cut:.6,res:.62,env:.4,A:0,D:.18,S:0,R:.12,kybd:1}],
  ['Zap',{range:3,saw:.8,pulse:.4,sub:0,cut:.7,res:.8,env:.9,A:0,D:.12,S:0,R:.1}],
  ['Random S&H',{range:1,saw:.6,pulse:.4,sub:.3,cut:.34,res:.7,env:.2,vcfMod:.55,lfoW:2,lfoR:.62,A:0,D:.4,S:.6,R:.2}]]};
const ENG_DEF_OF=k=>JSON.parse(JSON.stringify(DEFS.eng[k]));
function cloneVis(){const e=S.inst[TRACKS[synT].id]||'analog';document.querySelectorAll('.card[data-clone]').forEach(c=>c.classList.toggle('cl-off',c.dataset.clone!==e))}
const CL_LED={};function cloneLed(k,t){CL_LED[k]=performance.now()+Math.max(0,(t-ctx.currentTime)*1000)}
function buildClone(card,eng,layout,opt){const E=()=>engE(eng),body=card.querySelector('.cl-body'),st=()=>{if(!S.clP)S.clP={};if(!S.clP[eng])S.clP[eng]=opt.first;return S.clP[eng]};
  body.innerHTML=`<div class="cl-head"><div class="cl-logo">${opt.logo}</div><div class="cl-read" id="${eng}Read">${opt.sub}</div>
    <div class="cl-nav"><button data-d="-1" aria-label="Föregående">‹</button><b class="cl-name"></b><button data-d="1" aria-label="Nästa">›</button></div>
    <div class="cl-play"><span class="cl-trk"></span><button class="cl-kb" aria-label="Klaviatur" title="Öppna klaviaturen"><svg viewBox="0 0 24 24"><rect x="2.5" y="4.5" width="19" height="15" rx="2.6" stroke-width="2"/><path d="M5.95 4.5h2.6v7.6h-2.6zM10.7 4.5h2.6v7.6h-2.6zM15.45 4.5h2.6v7.6h-2.6z" fill="currentColor" stroke="none"/><path d="M7.25 12v7M12 12v7M16.75 12v7" stroke-width="1.6"/></svg></button><i class="cl-led"></i></div></div>
    <div class="cl-panel"></div>`;
  const panel=body.querySelector('.cl-panel'),read=body.querySelector('.cl-read'),ctl={};let readT=0;
  const show=(l,v)=>{read.innerHTML=`<b>${l}</b> ${v}`;read.classList.add('hot');clearTimeout(readT);readT=setTimeout(()=>{read.classList.remove('hot');read.textContent=opt.sub},1600)};
  let pv=0;const preview=()=>{if(playing||!prevOn())return;const now=performance.now();if(now-pv<380)return;pv=now;const on=MEL.filter(j=>S.inst[TRACKS[j].id]===eng);if(!on.length)return;const i=on.includes(S.sel)?S.sel:on[0];initAudio();ctx.resume();trigger(i,ctx.currentTime+.01,.85,i===6?45:57,3)};
  let sv=0;const changed=(k,quiet)=>{paint(k);clearTimeout(sv);sv=setTimeout(save,300);const c=ctl[k];if(c)show(c.l,c.f(E()[k]));if(!quiet)preview()};
  const scaleSVG=(labels,sweep)=>{let h='<svg class="cl-sc" viewBox="-50 -50 100 100" aria-hidden="true">';const n=labels.length;labels.forEach((t,i)=>{const a=(-sweep/2+(n>1?i/(n-1):0)*sweep)*Math.PI/180,
      x1=Math.sin(a)*37,y1=-Math.cos(a)*37,x2=Math.sin(a)*41,y2=-Math.cos(a)*41,tx=Math.sin(a)*47,ty=-Math.cos(a)*47+2.4;h+=`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
      if(t!=='')h+=`<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}">${t}</text>`});return h+'</svg>'};
  function mkCtl(row,c){const el=document.createElement('div');el.dataset.k=c.k;ctl[c.k]=c;const T=c.t;
    if(T==='knob'||T==='rot'){const labels=T==='rot'?c.labels:['0','','2','','4','','6','','8','','10'],sweep=T==='rot'?(c.sweep||240):270;c.sweepA=sweep;
      el.className='cl-k'+(c.big?' big':'')+(T==='rot'?' rot':'');el.innerHTML=`<div class="cl-kw">${scaleSVG(labels,sweep)}<div class="cl-kf"><i></i></div></div><small>${c.l}</small>`;
      let y0=0,v0=0,lt=0;el.addEventListener('pointerdown',ev=>{ev.preventDefault();el.setPointerCapture(ev.pointerId);y0=ev.clientY;v0=E()[c.k];el.classList.add('act');const n=performance.now();if(n-lt<300&&T==='knob'){E()[c.k]=ENG_DEF_OF(eng)[c.k];changed(c.k)}lt=n;show(c.l,c.f(E()[c.k]))});
      el.addEventListener('pointermove',ev=>{if(!el.hasPointerCapture(ev.pointerId))return;const span=c.max-c.min;let v=v0+(y0-ev.clientY)/(T==='rot'?26:(ev.shiftKey?600:180))*(T==='rot'?1:span);
        if(T==='rot')v=Math.round(clamp(v,c.min,c.max));else v=clamp(v,c.min,c.max);if(v!==E()[c.k]){E()[c.k]=v;changed(c.k,T!=='rot')}});
      const up=()=>{if(el.classList.contains('act')){el.classList.remove('act');if(T==='knob')preview()}};el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)}
    else if(T==='rock'){el.className='cl-r '+(c.col||'blue');el.innerHTML=`<small>${c.l}</small><button aria-label="${c.l}"><i></i></button><em>${c.on||'på'}</em>`;el.querySelector('button').onclick=()=>{E()[c.k]=E()[c.k]?0:1;changed(c.k)}}
    else if(T==='slide'){el.className='cl-s';el.innerHTML=`<div class="cl-st"><span class="cl-ticks"></span><i class="cl-sc2"></i></div><small>${c.l}</small>`;
      const tr=el.querySelector('.cl-st');let y0=0,v0=0,lt=0;tr.addEventListener('pointerdown',ev=>{ev.preventDefault();tr.setPointerCapture(ev.pointerId);y0=ev.clientY;v0=E()[c.k];el.classList.add('act');const n=performance.now();if(n-lt<300){E()[c.k]=ENG_DEF_OF(eng)[c.k];changed(c.k)}lt=n;show(c.l,c.f(E()[c.k]))});
      tr.addEventListener('pointermove',ev=>{if(!tr.hasPointerCapture(ev.pointerId))return;const h=tr.clientHeight-16;E()[c.k]=clamp(v0+(y0-ev.clientY)/h*(c.max-c.min),c.min,c.max);changed(c.k,true)});
      const up=()=>{if(el.classList.contains('act')){el.classList.remove('act');preview()}};tr.addEventListener('pointerup',up);tr.addEventListener('pointercancel',up)}
    else if(T==='sw'){el.className='cl-w';el.innerHTML=`<div class="cl-wb"><div class="cl-wt">${c.labels.map((l,i)=>`<span data-i="${i}">${l}</span>`).join('')}</div><div class="cl-wl"><i></i></div></div><small>${c.l}</small>`;
      el.querySelectorAll('.cl-wt span').forEach(sp=>sp.onclick=()=>{E()[c.k]=+sp.dataset.i;changed(c.k)});el.querySelector('.cl-wl').onclick=()=>{E()[c.k]=(E()[c.k]+1)%c.labels.length;changed(c.k)}}
    mlReg(el,{key:'e.'+eng+'.'+c.k,label:c.l.toLowerCase()+' · '+({mini:'moog',sh101:'sh-101'}[eng]||eng),min:T==='rock'?0:T==='sw'?0:c.min,max:T==='rock'?1:T==='sw'?c.labels.length-1:c.max,int:T==='rot'||T==='rock'||T==='sw',paint:()=>paint(c.k)});
    row.appendChild(el)}
  function paint(k){const c=ctl[k],el=panel.querySelector(`[data-k="${k}"]`);if(!c||!el)return;const v=E()[k];
    if(c.t==='knob'){el.style.setProperty('--a',(-135+(v-c.min)/(c.max-c.min)*270)+'deg')}
    else if(c.t==='rot'){const n=c.max-c.min;el.style.setProperty('--a',(-c.sweepA/2+(n?(v-c.min)/n:0)*c.sweepA)+'deg')}
    else if(c.t==='rock')el.classList.toggle('on',!!v);
    else if(c.t==='slide')el.style.setProperty('--v',(v-c.min)/(c.max-c.min));
    else if(c.t==='sw'){el.style.setProperty('--p',v);el.style.setProperty('--n',c.labels.length);el.querySelectorAll('.cl-wt span').forEach(sp=>sp.classList.toggle('on',+sp.dataset.i===v))}}
  layout.forEach(sec=>{const s=document.createElement('section');s.className='cl-sec '+(sec.cls||'');s.innerHTML=`<h5>${sec.t}</h5>`;sec.rows.forEach(r=>{const row=document.createElement('div');row.className='cl-row';r.forEach(c=>mkCtl(row,c));s.appendChild(row)});
    if(sec.foot){const f=document.createElement('div');f.className='cl-foot';f.textContent=sec.foot;s.appendChild(f)}panel.appendChild(s)});
  const paintAll=()=>Object.keys(ctl).forEach(paint);
  /* presets */
  const pre=CL_PRE[eng],nameEl=body.querySelector('.cl-name');
  const load=p=>{Object.assign(E(),ENG_DEF_OF(eng),p[1]);st().n=p[0];nameEl.textContent=p[0];paintAll();save();show('preset',p[0]);preview()};
  body.querySelectorAll('.cl-nav button').forEach(b=>b.onclick=()=>{let ix=pre.findIndex(p=>p[0]===st().n);ix=(ix+(+b.dataset.d)+pre.length)%pre.length;load(pre[ix])});
  /* play-on tracks */
  const trk=body.querySelector('.cl-trk');MEL.forEach(j=>{const b=document.createElement('button');b.dataset.i=j;b.onclick=()=>{const id=TRACKS[j].id;pushHist();S.inst[id]=S.inst[id]===eng?DEF_INST[id]:eng;if(S.inst[id]===eng)select(j);refreshInst();save();paintTrk()};trk.appendChild(b)});
  const paintTrk=()=>[...trk.children].forEach(b=>{const j=+b.dataset.i;b.textContent=TRACKS[j].base.toLowerCase();b.classList.toggle('on',S.inst[TRACKS[j].id]===eng)});
  body.querySelector('.cl-kb').onclick=()=>{const on=MEL.filter(j=>S.inst[TRACKS[j].id]===eng);if(on.length)select(on.includes(S.sel)?S.sel:on[0]);if(window.__kb){__kb.open();__kb.layout()}};
  const led=body.querySelector('.cl-led');(function tick(){requestAnimationFrame(tick);if(!card.offsetParent)return;const d=performance.now()-(CL_LED[eng]||0);led.classList.toggle('on',d>=0&&d<160)})();
  setInterval(()=>{if(card.offsetParent)paintTrk()},700);paintTrk();paintAll();nameEl.textContent=st().n;
  return {paintAll,load,pre}}
(function(){
  const mm=document.querySelector('.card[data-clone="mini"]'),sh=document.querySelector('.card[data-clone="sh101"]');
  const p10=v=>(v*10).toFixed(1),st=v=>(v>0?'+':'')+v.toFixed(1)+' st',RNG=['LO','32′','16′','8′','4′','2′'];
  const WV12=['△','◿⁄','⩘','◸','▭','▯'],WV3=['△','◿⁄','◺','⩘','▭','▯'];
  if(mm)window.__mini=buildClone(mm,'mini',[
    {t:'controllers',cls:'c-ctrl',rows:[[{t:'knob',k:'glide',l:'glide',min:0,max:1,f:p10},{t:'knob',k:'modmix',l:'modulation mix',min:0,max:1,f:v=>v<.05?'osc 3':v>.95?'brus':p10(v)}],
      [{t:'knob',k:'modAmt',l:'mod-hjul',min:0,max:1,f:p10},{t:'rock',k:'glideOn',l:'glide',col:'white'}]]},
    {t:'oscillator bank',cls:'c-osc',rows:[
      [{t:'rot',k:'o1r',l:'range',min:0,max:5,labels:RNG,f:v=>RNG[v]},{t:'rot',k:'o1w',l:'oscillator 1',min:0,max:5,labels:WV12,f:v=>['triangel','haj','såg','fyrkant','bred puls','smal puls'][v]},{t:'rock',k:'oscMod',l:'osc mod',col:'orange'}],
      [{t:'rot',k:'o2r',l:'range',min:0,max:5,labels:RNG,f:v=>RNG[v]},{t:'knob',k:'o2f',l:'frequency',min:-7,max:7,f:st},{t:'rot',k:'o2w',l:'oscillator 2',min:0,max:5,labels:WV12,f:v=>['triangel','haj','såg','fyrkant','bred puls','smal puls'][v]}],
      [{t:'rot',k:'o3r',l:'range',min:0,max:5,labels:RNG,f:v=>RNG[v]},{t:'knob',k:'o3f',l:'frequency',min:-7,max:7,f:st},{t:'rot',k:'o3w',l:'oscillator 3',min:0,max:5,labels:WV3,f:v=>['triangel','haj','omv. såg','såg','fyrkant','bred puls'][v]}],
      [{t:'rock',k:'o3lfo',l:'osc 3 lfo',col:'white',on:'lfo'}]]},
    {t:'mixer',cls:'c-mix',rows:[[{t:'knob',k:'m1',l:'osc 1',min:0,max:1,f:p10},{t:'rock',k:'m1on',l:'',col:'blue'}],[{t:'knob',k:'m2',l:'osc 2',min:0,max:1,f:p10},{t:'rock',k:'m2on',l:'',col:'blue'}],
      [{t:'knob',k:'m3',l:'osc 3',min:0,max:1,f:p10},{t:'rock',k:'m3on',l:'',col:'blue'}],[{t:'knob',k:'mn',l:'noise',min:0,max:1,f:p10},{t:'rock',k:'mnon',l:'',col:'blue'},{t:'rock',k:'ncol',l:'',col:'white',on:'pink'}]]},
    {t:'modifiers',cls:'c-mod',rows:[[{t:'knob',k:'cut',l:'cutoff frequency',min:0,max:1,big:1,f:v=>{const h=30*Math.pow(2,v*9.6);return h>=1000?(h/1000).toFixed(1)+' kHz':Math.round(h)+' Hz'}},
        {t:'knob',k:'emph',l:'emphasis',min:0,max:1,f:p10},{t:'knob',k:'contour',l:'amount of contour',min:0,max:1,f:p10}],
      [{t:'rock',k:'filtMod',l:'filter mod',col:'orange'},{t:'rock',k:'kt1',l:'keyboard 1',col:'white'},{t:'rock',k:'kt2',l:'keyboard 2',col:'white'}],
      [{t:'knob',k:'fA',l:'attack',min:0,max:1,f:v=>msF(shT(v,6)).join(' ')},{t:'knob',k:'fD',l:'decay',min:0,max:1,f:v=>msF(shT(v,10)).join(' ')},{t:'knob',k:'fS',l:'sustain',min:0,max:1,f:p10}],
      [{t:'knob',k:'aA',l:'attack',min:0,max:1,f:v=>msF(shT(v,6)).join(' ')},{t:'knob',k:'aD',l:'decay',min:0,max:1,f:v=>msF(shT(v,10)).join(' ')},{t:'knob',k:'aS',l:'sustain',min:0,max:1,f:p10}],
      [{t:'rock',k:'decSw',l:'decay',col:'white'}]],foot:'filter contour · loudness contour'},
    {t:'output',cls:'c-out',rows:[[{t:'knob',k:'vol',l:'volume',min:0,max:1,f:p10}]]}],{logo:'minimoog<small>model d · blonda</small>',sub:'3 osc · ladder · mono',first:{n:'Model D bas'}});
  if(sh)window.__sh101=buildClone(sh,'sh101',[
    {t:'modulator',cls:'s-modu',rows:[[{t:'slide',k:'lfoR',l:'rate',min:0,max:1,f:v=>(.1*Math.pow(2,v*7.2)).toFixed(2)+' Hz'},{t:'sw',k:'lfoW',l:'wave',labels:['△','⊓','rand','noise'],f:v=>['triangel','fyrkant','random','brus'][v]}]]},
    {t:'vco',cls:'s-vco',rows:[[{t:'slide',k:'vcoMod',l:'mod',min:0,max:1,f:p10},{t:'sw',k:'range',l:'range',labels:['16′','8′','4′','2′'],f:v=>['16′','8′','4′','2′'][v]},{t:'slide',k:'pw',l:'pw',min:0,max:1,f:p10},{t:'sw',k:'pwmSrc',l:'pwm',labels:['lfo','man','env'],f:v=>['lfo','manuell','env'][v]}]]},
    {t:'source mixer',cls:'s-mix',rows:[[{t:'slide',k:'pulse',l:'⊓',min:0,max:1,f:p10},{t:'slide',k:'saw',l:'◿',min:0,max:1,f:p10},{t:'slide',k:'sub',l:'sub',min:0,max:1,f:p10},
      {t:'sw',k:'subMode',l:'sub',labels:['1 oct','2 oct','2 ⊓'],f:v=>['−1 okt fyrkant','−2 okt fyrkant','−2 okt puls'][v]},{t:'slide',k:'noise',l:'noise',min:0,max:1,f:p10}]]},
    {t:'vcf',cls:'s-vcf',rows:[[{t:'slide',k:'cut',l:'freq',min:0,max:1,f:v=>{const h=22*Math.pow(2,v*9.8);return h>=1000?(h/1000).toFixed(1)+' kHz':Math.round(h)+' Hz'}},{t:'slide',k:'res',l:'res',min:0,max:1,f:p10},
      {t:'slide',k:'env',l:'env',min:0,max:1,f:p10},{t:'slide',k:'vcfMod',l:'mod',min:0,max:1,f:p10},{t:'slide',k:'kybd',l:'kybd',min:0,max:1,f:p10}]]},
    {t:'vca',cls:'s-vca',rows:[[{t:'sw',k:'vcaMode',l:'mode',labels:['env','gate'],f:v=>['env','gate'][v]},{t:'slide',k:'vol',l:'level',min:0,max:1,f:p10}]]},
    {t:'env',cls:'s-env',rows:[[{t:'slide',k:'A',l:'a',min:0,max:1,f:v=>msF(shT(v,4)).join(' ')},{t:'slide',k:'D',l:'d',min:0,max:1,f:v=>msF(shT(v,10)).join(' ')},{t:'slide',k:'S',l:'s',min:0,max:1,f:p10},{t:'slide',k:'R',l:'r',min:0,max:1,f:v=>msF(shT(v,10)).join(' ')}]]},
    {t:'portamento',cls:'s-port',rows:[[{t:'slide',k:'porta',l:'time',min:0,max:1,f:v=>msF(.004+v*v*1.6).join(' ')},{t:'sw',k:'portaMode',l:'mode',labels:['off','on','auto'],f:v=>['av','på','auto'][v]}]]}],
    {logo:'SH-101<small>synthesizer · blonda</small>',sub:'monophonic · 1 vco · 24 dB',first:{n:'101 bas'}});
  cloneVis();setInterval(cloneVis,400);
})();

