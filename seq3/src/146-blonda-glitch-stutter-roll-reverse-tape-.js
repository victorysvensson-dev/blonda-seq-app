/* ---------------- BLONDA GLITCH: stutter, roll, reverse, tape stop, half speed, crush, gate on the master bus ----------------
   The same effect as the native app (Core/include/blonda/glitch.hpp), as an AudioWorklet between the beat repeat and the master. */
const GX_NAMES=['stutter','roll','rev','stop','halv','crush','gate'];
if(!S.glitch)S.glitch={amt:0,mask:127};
const GX={node:null,loading:false,err:null,held:0,hs:[],t0:{},sc:0,end:0,show:{fx:0,t0:0,t1:0}};
const GX_SRC=`class G extends AudioWorkletProcessor{
constructor(){super();this.N=1<<17;this.L=new Float32Array(this.N);this.R=new Float32Array(this.N);this.xf=Math.max(16,Math.floor(sampleRate*.003));this.ev=null;this.nx=null;this.held=0;this.md=[null,null,null,null,null,null,null,null];this.o=[0,0];this.o2=[0,0];this.CR={2:[2,15],3:[4,11],4:[12,7],6:[32,5],8:[128,3]};
this.port.onmessage=e=>{const m=e.data;if(m.t==='q'){if(m.fx>0&&m.fx<8&&m.len>0)this.nx=this.mk(m.fx,m.start,m.start+m.len,m.slice,m.p)}
else if(m.t==='h'){const now=currentFrame,src=m.src|0,mods=m.mods||[];
  if(src!==this.held){if(src>0&&src<6){this.ev=this.mk(src,now,1e15,m.slice,m.p);this.nx=null}else if(this.held&&this.ev)this.ev.end=Math.max(this.ev.start+1,now+this.xf);this.held=src}
  for(const k of [6,7]){const want=mods.indexOf(k)>=0,cur=this.md[k];
    if(want&&!(cur&&cur.end>1e14))this.md[k]={start:now,end:1e15,pos:0,hL:0,hR:0,slice:Math.max(32,Math.round(k===7&&m.gs?m.gs:m.slice)),p:k===6?m.cb:undefined};
    else if(!want&&cur&&cur.end>1e14)cur.end=now+this.xf}}}}
mk(fx,start,end,slice,p){slice=Math.max(32,Math.min(Math.round(slice),this.N/2));return{fx,start,end,slice,p,pos:0,cur:slice,reps:0,rpos:0,hL:0,hR:0}}
rd(p,o){const i=((p%this.N)+this.N)%this.N;o[0]=this.L[i];o[1]=this.R[i]}
rf(p,o){const f=Math.floor(p),r=p-f;this.rd(f,o);this.rd(f+1,this.o2);o[0]+=(this.o2[0]-o[0])*r;o[1]+=(this.o2[1]-o[1])*r}
process(ins,outs){const kp=ins[1]||[],kL0=kp[0],kR0=kp[1]||kp[0],inp=ins[0]||[],out=outs[0],oL=out[0],oR=out[1]||out[0],n=oL.length,iL=inp[0],iR=inp[1]||inp[0],b0=currentFrame,o=this.o;
for(let x=0;x<n;x++){const f=b0+x,wi=f&(this.N-1),kl=kL0?kL0[x]:0,kr=kR0?kR0[x]:0,inL=(iL?iL[x]:0)-kl,inR=(iR?iR[x]:0)-kr;this.L[wi]=inL;this.R[wi]=inR;oL[x]=inL;oR[x]=inR;
 if(this.nx&&f>=this.nx.start&&(!this.ev||f>=this.ev.end)){this.ev=this.nx;this.nx=null}
 const ev=this.ev;if(ev&&f>=ev.end)this.ev=null;
 if(ev&&f>=ev.start&&f<ev.end){
 const d=f-ev.start;let wL=inL,wR=inR;
 switch(ev.fx){
  case 1:this.rd(ev.start-ev.slice+d%ev.slice,o);wL=o[0];wR=o[1];break;
  case 2:this.rd(ev.start-ev.cur+ev.pos,o);wL=o[0];wR=o[1];if(++ev.pos>=ev.cur){ev.pos=0;if(++ev.reps>=2){ev.reps=0;ev.cur=Math.max(Math.floor(ev.slice/8),Math.floor(ev.cur/2))}}break;
  case 3:this.rf(ev.start-1-d*(ev.p||1),o);wL=o[0];wR=o[1];break;
  case 4:{const len=this.held?sampleRate*.9*(ev.p||1):Math.max(1,(ev.end-ev.start)*Math.min(1,ev.p||1)),u=Math.min(1,d/len);ev.rpos+=Math.max(0,1-u);this.rf(ev.start+ev.rpos-1,o);wL=o[0];wR=o[1];if(u>=1){wL=wR=0}break}
  case 5:{if(ev.h0===undefined)ev.h0=ev.start;const hr=ev.p||.5;let dd=f-ev.h0;if(dd*hr>this.N*.7){ev.h0=f;dd=0}this.rf(ev.h0+dd*hr,o);wL=o[0];wR=o[1];break}   /* everything at half speed, continuously */
  case 6:if(ev.pos--<=0){const c=this.CR[ev.p]||this.CR[4];ev.pos=c[1];ev.hL=Math.round(inL*c[0])/c[0];ev.hR=Math.round(inR*c[0])/c[0]}wL=ev.hL;wR=ev.hR;break;
  case 7:{const h=Math.max(16,Math.floor(ev.slice/2));if(Math.floor(d/h)%2){wL=wR=0}break}}
 const e=Math.min(Math.min(d,ev.end-f),this.xf)/this.xf;oL[x]=inL+(wL-inL)*e;if(oR!==oL)oR[x]=inR+(wR-inR)*e}
 for(let k=6;k<8;k++){const md=this.md[k];if(!md)continue;if(f>=md.end){this.md[k]=null;continue}if(f<md.start)continue;
  const dm=f-md.start,em=Math.min(Math.min(dm,md.end-f),this.xf)/this.xf,a=oL[x],b=oR[x];let wa,wb;
  if(k===6){if(md.pos--<=0){const c=this.CR[md.p]||this.CR[4];md.pos=c[1];md.hL=Math.round(a*c[0])/c[0];md.hR=Math.round(b*c[0])/c[0]}wa=md.hL;wb=md.hR}
  else{const h=Math.max(16,Math.floor(md.slice/2)),g=Math.floor(dm/h)%2;wa=g?0:a;wb=g?0:b}
  oL[x]=a+(wa-a)*em;if(oR!==oL)oR[x]=b+(wb-b)*em}oL[x]+=kl;if(oR!==oL)oR[x]+=kr}
return true}}
registerProcessor('blonda-glitch',G);`;
GX.src=GX_SRC;
async function gxInit(){if(GX.node||GX.loading||!ctx||!ctx.audioWorklet||!A||!A.pre)return;GX.loading=true;
  try{const url=URL.createObjectURL(new Blob([GX_SRC],{type:'application/javascript'}));await ctx.audioWorklet.addModule(url);
    const n=new AudioWorkletNode(ctx,'blonda-glitch',{numberOfInputs:2,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit'});
    A.pre.disconnect(A.shaper);A.pre.connect(n);n.connect(A.shaper);GX.node=n;if(A.gxK)try{A.gxK.connect(n,0,1)}catch(_){globalThis.__el&&globalThis.__el(_)};if(GX.hs.length)gxSend()}catch(e){GX.err=String(e&&e.message||e)}GX.loading=false}
{const _ia=initAudio;initAudio=function(){const fresh=!ctx;_ia.apply(this,arguments);if(fresh||!GX.node)gxInit()}}
const gxSlice=()=>Math.max(64,Math.round(60/S.bpm/4*ctx.sampleRate));
/* several pads can be held at once: the last held of stutter/roll/rev/stop/halv plays, crush and gate lie on top */
function gxSend(){const src=[...GX.hs].reverse().find(f=>f<=5)||0,mods=GX.hs.filter(f=>f>5);GX.held=GX.hs.length?GX.hs[GX.hs.length-1]:0;
  if(GX.node&&ctx){const sd=60/S.bpm/4,a=src?gxArgs(src,null,sd,1):{slice:gxSlice()},g7=gxArgs(7,null,sd,1),c6=gxArgs(6,null,sd,1);GX.node.port.postMessage({t:'h',src,mods,slice:a.slice,p:a.p,gs:g7.slice,cb:c6.p})}}
function gxPress(fx,on){initAudio();ctx.resume();gxInit();const i=GX.hs.indexOf(fx);
  if(on&&i<0){GX.hs.push(fx);GX.t0[fx]=ctx.currentTime;GX.show.t1=0}else if(!on&&i>=0)GX.hs.splice(i,1);else return;gxSend();gxPaintPads()}
function gxHold(fx){if(fx)gxPress(fx,true);else{GX.hs.length=0;if(ctx)gxSend();gxPaintPads()}}
/* auto ("slump"): on the 8ths, a random one of the chosen effects, 1–4 steps long, now and then */
function gxAuto(ps,sd){gxFill(ps,sd);const g=S.glitch;if(!GX.node||!g||!(g.amt>0)||!g.mask||ps%2||GX.hs.length)return;
  if(nextT<GX.end||Math.random()>=g.amt*.4)return;
  const pick=[];for(let b=0;b<7;b++)if(g.mask&(1<<b))pick.push(b+1);const fx=pick[Math.min(pick.length-1,Math.floor(Math.random()*pick.length))];
  const ls=[1,2,2,4][Math.min(3,Math.floor(Math.random()*4))],sl=[1,.5,.25][Math.min(2,Math.floor(Math.random()*3))],sr=ctx.sampleRate;
  GX.node.port.postMessage({t:'q',fx,start:Math.round(nextT*sr),len:Math.round(ls*sd*sr),slice:Math.round(sl*sd*sr)});
  GX.end=nextT+ls*sd;GX.show={fx,t0:nextT,t1:GX.end}}
/* written fills (the starter's stutter / tape stop / reverse): S.gfx[pattern] = [{s: step, fx, len: steps, sl: slice in steps}] */
function gxFill(ps,sd){const L=S.gfx&&S.gfx[S.pat];if(!L||!L.length||GX.hs.length)return;if(!GX.node){gxInit();return}const sr=ctx.sampleRate;
  L.forEach(e=>{if(e.s!==ps)return;const a=gxArgs(e.fx,e.v,sd,e.sl||.5);GX.node.port.postMessage({t:'q',fx:e.fx,start:Math.round(nextT*sr),len:Math.round(e.len*sd*sr),slice:a.slice,p:a.p});GX.end=nextT+e.len*sd;GX.show={fx:e.fx,t0:nextT,t1:GX.end}})}
function gxActive(){if(GX.hs.length)return GX.hs.slice();if(!ctx)return [];const t=ctx.currentTime;if(t>=GX.show.t0&&t<GX.show.t1){if(GX.t0[GX.show.fx]==null||GX.t0[GX.show.fx]<GX.show.t0)GX.t0[GX.show.fx]=GX.show.t0;return [GX.show.fx]}return []}

/* the card: pads, the "slump" dots and slider, and the moving ASCII screen */
const gxPads=$('#gxPads'),gxPadEls=[],gxDotEls=[];
/* glass modules: a big figure, the name, a corner key (may the random use it?) and a line drawing that comes alive when touched */
const GX_BIG=['×4','1/32','−1','0','½','8','50'],GX_UNIT=['','','','','','bit','%'];
/* a value per effect (S.glitch.par[fx] = its index; a written block can have its own, b.v). No value chosen = as before */
const GXP=[{l:['1/4','1/8','1/16','1/32','1/64'],t:['4','8','16','32','64'],sl:[4,2,1,.5,.25],d:2,nm:'bit som upprepas'},
  {l:['1/8','1/16','1/32'],t:['8','16','32'],sl:[2,1,.5],d:1,nm:'första biten'},
  {l:['−1','−½','−2'],t:['-1','-½','-2'],p:[1,.5,2],d:0,nm:'fart baklänges'},
  {l:['kort','mellan','lång'],t:['kor','mel','lån'],p:[.35,.65,1],d:2,nm:'hur fort det stannar'},
  {l:['½','¼','¾'],t:['½','¼','¾'],p:[.5,.25,.75],d:0,nm:'fart'},
  {l:['2','3','4','6','8'],u:'bit',t:['2','3','4','6','8'],p:[2,3,4,6,8],d:2,nm:'bitar'},
  {l:['1/8','1/16','1/32','1/64'],t:['8','16','32','64'],sl:[2,1,.5,.25],d:1,nm:'takt på grinden'}];
function gxParOf(fx,v){const P=GXP[fx-1];if(!P)return null;const i=v!=null?v:(S.glitch&&S.glitch.par?S.glitch.par[fx]:null);return i==null?null:Math.max(0,Math.min(P.l.length-1,i|0))}
function gxArgs(fx,v,sd,slDef){const P=GXP[fx-1],i=gxParOf(fx,v),sr=ctx?ctx.sampleRate:48000;let sl=slDef,p;if(P&&i!=null){if(P.sl)sl=P.sl[i];if(P.p)p=P.p[i]}return {slice:Math.round(sl*sd*sr),p}}
function gxIdxShown(fx,v,sl){const P=GXP[fx-1];if(!P)return 0;const i=gxParOf(fx,v);if(i!=null)return i;if(sl!=null&&P.sl){const j=P.sl.indexOf(sl);if(j>=0)return j}return P.d}
function gxBigHTML(fx){const P=GXP[fx-1],i=gxIdxShown(fx,null,null);return P.l[i]+'<small>'+(P.u||'')+'</small>'}
const GX_ART=(()=>{const E=(cx,cy,rx,ry,c='')=>`<ellipse class="${c}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`,C=(cx,cy,r,c='')=>`<circle class="${c}" cx="${cx}" cy="${cy}" r="${r}"/>`;let a=[];
  // stutter: a cone of rings, the rings repeat
  {let h='';for(let k=0;k<9;k++){const rx=42-k*4.6;h+=E(50,12+k*6.4,rx,rx*.22,'r'+k)}a.push(h+'<line x1="50" y1="6" x2="50" y2="70"/>'+C(50,72,3.4,'dot'))}
  // roll: rings that dive inwards
  {let h='';for(let k=0;k<6;k++)h+=C(50,40,34-k*6,'z z'+k);a.push(h+C(50,40,3.4,'dot'))}
  // rev: an orbit of ellipses turning backwards
  {let h='<g class="spin">';for(let k=0;k<6;k++)h+=`<ellipse cx="50" cy="40" rx="36" ry="12" transform="rotate(${k*30} 50 40)"/>`;a.push(h+'</g>'+C(86,40,3.4,'dot'))}
  // stop: waves that run out of breath
  {let h='<g class="waves">';for(let k=0;k<4;k++){let d='M6 '+(22+k*12);for(let x=6;x<=94;x+=4)d+=' L'+x+' '+(22+k*12+Math.sin(x*.18+k)*7).toFixed(1);h+=`<path d="${d}"/>`}a.push(h+'</g>'+C(94,40,3.4,'dot'))}
  // halv: the onion – lens shapes that stretch out
  {let h='<g class="onion">';for(let k=0;k<5;k++)h+=E(50,40,8+k*9,32-k*1.5);a.push(h+'</g>'+C(50,48,3.4,'dot'))}
  // crush: a staircase of blocks
  {let h='';for(let r=0;r<5;r++)for(let c=0;c<=r;c++)h+=`<rect class="q q${(r*3+c)%5}" x="${20+c*12}" y="${10+r*12}" width="10" height="10" rx="1.5"/>`;a.push(h+C(88,68,3.4,'dot'))}
  // gate: bars that open and shut
  {let h='';for(let k=0;k<9;k++)h+=`<line class="b b${k%2}" x1="${14+k*9}" y1="12" x2="${14+k*9}" y2="68"/>`;a.push(h+C(50,74,3.4,'dot'))}
  return a})();
GX_NAMES.forEach((nm,k)=>{const fx=k+1,b=document.createElement('button');b.className='gx-t gx-t'+fx+(k%3===1?' warm':'');b.setAttribute('aria-label',nm+' – håll inne');
  b.innerHTML=`<span class="gx-glow" aria-hidden="true"><i class="ga"></i><i class="gb"></i></span><span class="gx-big" title="Tryck för att byta ${GXP[k].nm} (shift = bakåt)">${gxBigHTML(fx)}</span><span class="gx-nm"><em class="gx-no">${fx}</em>${nm}</span><svg viewBox="0 0 100 80" aria-hidden="true">${GX_ART[k]}</svg>`;
  const dot=document.createElement('i');dot.className='gx-key';dot.title='Får slumpen använda '+nm+'?';dot.innerHTML='<svg viewBox="0 0 16 16"><rect class="dk" x="1.5" y="1.5" width="13" height="13" rx="3.5"/><circle cx="5.2" cy="5.2" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="10.8" cy="10.8" r="1.3"/></svg>';
  dot.addEventListener('pointerdown',e=>e.stopPropagation());dot.onclick=e=>{e.stopPropagation();S.glitch.mask^=1<<k;gxPaintPads();save();toast(nm+(S.glitch.mask&(1<<k)?' är med i slumpen':' är inte med i slumpen'))};b.appendChild(dot);
  b.addEventListener('pointerdown',e=>{if(e.target.closest('.gx-key'))return;e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(_){globalThis.__el&&globalThis.__el(_)}b.classList.remove('tap');void b.offsetWidth;b.classList.add('tap');gxPress(fx,true)});
  const rel=()=>gxPress(fx,false);b.addEventListener('pointerup',rel);b.addEventListener('pointercancel',rel);b.addEventListener('lostpointercapture',rel);
  {const big=b.querySelector('.gx-big');big.addEventListener('pointerdown',e=>{e.stopPropagation()});big.addEventListener('click',e=>{e.stopPropagation();e.preventDefault();const P=GXP[k];if(!S.glitch.par)S.glitch.par={};
      const cur=gxIdxShown(fx,null,null),n=(cur+(e.shiftKey?-1:1)+P.l.length)%P.l.length;S.glitch.par[fx]=n;big.innerHTML=gxBigHTML(fx);if(GX.hs.length)gxSend();save();toast(nm+' · '+P.l[n]+(P.u||''));try{if(window.__trk)__trk.render()}catch(_){globalThis.__el&&globalThis.__el(_)}})}
  gxPads.appendChild(b);gxPadEls.push(b);gxDotEls.push(dot)});
function gxPaintBig(){gxPadEls.forEach((b,k)=>{const big=b.querySelector('.gx-big');if(big)big.innerHTML=gxBigHTML(k+1)})}
/* the eighth module: slump – drag on it (up or right = more), double tap = off */
const gxSlump=(()=>{const b=document.createElement('div');b.className='gx-t gx-t8';b.setAttribute('role','slider');b.setAttribute('aria-label','Slump – hur ofta glitchar kommer av sig själva');
  let ticks='';for(let k=0;k<16;k++)ticks+=`<line class="tk" x1="${8+k*5.6}" y1="${62-k*2.6}" x2="${8+k*5.6}" y2="70"/>`;
  b.innerHTML=`<span class="gx-glow" aria-hidden="true"><i class="ga"></i><i class="gb"></i></span><span class="gx-big"><span class="sv">0</span><small>%</small></span><span class="gx-nm">slump</span><svg viewBox="0 0 100 80" aria-hidden="true">${ticks}<line class="hd" x1="8" y1="8" x2="8" y2="74"/><circle class="dot" cx="8" cy="76" r="3.4"/></svg>`;
  let on=false,x0=0,y0=0,v0=0,lt=0;
  b.addEventListener('pointerdown',e=>{e.preventDefault();initAudio();const n=performance.now();if(n-lt<300){S.glitch.amt=0;gxPaintPads();save();lt=0;return}lt=n;on=true;x0=e.clientX;y0=e.clientY;v0=S.glitch.amt||0;b.classList.add('drag');try{b.setPointerCapture(e.pointerId)}catch(_){globalThis.__el&&globalThis.__el(_)}});
  b.addEventListener('pointermove',e=>{if(!on)return;S.glitch.amt=Math.round(clamp(v0+((e.clientX-x0)-(e.clientY-y0))/220,0,1)*100)/100;gxPaintPads()});
  const up=()=>{if(on){on=false;b.classList.remove('drag');save()}};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);
  gxPads.appendChild(b);return b})();
function gxPaintPads(){gxPadEls.forEach((b,k)=>b.classList.toggle('on',GX.hs.includes(k+1)));document.querySelectorAll('.pad.gxp').forEach((p,k)=>p.classList.toggle('hit',GX.hs.includes(k+1)));gxDotEls.forEach((d,k)=>d.classList.toggle('on',!!(S.glitch.mask&(1<<k))));
  const a=S.glitch.amt||0;$('#gxRead').textContent=a>.005?'slump '+Math.round(a*100)+' %':'håll en eller flera';$('#gxN').textContent=Math.round(a*100)+' %';
  const sl=$('#gxSl');if(!sl._b){sl.innerHTML='<span class="tl-name">slump</span><span class="tl-e l"></span><span class="tl-e r"></span><span class="tl-tag"></span><span class="tl-h"></span>'+[0,25,50,75,100].map(v=>`<span class="tl-t" style="left:${4+v*.92}%"><b>${v}</b><i></i></span>`).join('')+[12,37,62,87].map(v=>`<span class="tl-d" style="left:${4+v*.92}%"></span>`).join('');sl._b=1}
  sl.style.setProperty('--a',a);if(gxSlump){gxSlump.querySelector('.sv').textContent=Math.round(a*100);gxSlump.style.setProperty('--a',a);gxSlump.classList.toggle('on',a>.005);
    const n=Math.round(a*16);gxSlump.querySelectorAll('.tk').forEach((t,k)=>t.classList.toggle('lit',k<n));const x=8+Math.max(0,n-1)*5.6;gxSlump.querySelector('.hd').setAttribute('x1',x);gxSlump.querySelector('.hd').setAttribute('x2',x);gxSlump.querySelector('.dot').setAttribute('cx',x)}sl.querySelector('.tl-tag').textContent=a>.005?Math.round(a*100)+' %':'av';
  sl.querySelectorAll('.tl-d').forEach((d,k)=>d.classList.toggle('on',a*100>[12,37,62,87][k]))}
(()=>{const sl=$('#gxSl');let on=false;const setX=e=>{const r=sl.getBoundingClientRect();S.glitch.amt=Math.round(clamp((e.clientX-r.left-r.width*.04)/(r.width*.92),0,1)*100)/100;gxPaintPads()};
  sl.addEventListener('pointerdown',e=>{e.preventDefault();sl.setPointerCapture(e.pointerId);on=true;initAudio();setX(e)});sl.addEventListener('pointermove',e=>{if(on)setX(e)});
  const up=()=>{if(on){on=false;save()}};sl.addEventListener('pointerup',up);sl.addEventListener('pointercancel',up)})();
gxPaintPads();
const GX_FONT={B:['#### ','#   #','#### ','#   #','#### '],L:['#    ','#    ','#    ','#    ','#####'],O:[' ### ','#   #','#   #','#   #',' ### '],
  N:['#   #','##  #','# # #','#  ##','#   #'],D:['#### ','#   #','#   #','#   #','#### '],A:[' ### ','#   #','#####','#   #','#   #']};
const GX_WORD=(()=>{const r=['','','','',''];for(const ch of 'BLONDA')for(let i=0;i<5;i++)r[i]+=GX_FONT[ch][i]+' ';return r})();
const GX_RAMP=' .:-=+*#%@';
function gxHash(a,b,c){let x=(Math.imul(a,374761393)+Math.imul(b,668265263)+Math.imul(c,2147483647))>>>0;x=Math.imul(x^(x>>>13),1274126177)>>>0;x=(x^(x>>>16))>>>0;return (x%10000)/10000}
/* the screen: the BLONDA word fills the box at any size; idle it floats on a wave in falling rain that follows the music,
   every effect bends it its own way and held effects stack */
function gxFrame(t,hs,en,amt,cols,rows,sc){const W=GX_WORD[0].length,s=Math.max(1,Math.min((rows-1)/6,cols/(W+6))),ww=W*s,gap=Math.round(10*s),M=ww+gap,top=(rows-5*s)/2;
  const has=f=>hs.indexOf(f)>=0,now=ctx?ctx.currentTime:t,age=f=>Math.max(0,now-(GX.t0[f]||now)),tick=Math.floor(t*24),out=[];
  const lv=has(2)?Math.min(4,Math.floor(age(2)*5)):0,drop=has(4)?age(4)*age(4)*rows*2.2:0,flash=has(1)&&tick%6<2;
  for(let r=0;r<rows;r++){let line='';for(let c=0;c<cols;c++){let x=c,y=r;
    if(has(6)){x-=x%3;y-=y%2}
    if(has(1))x=x%Math.max(4,Math.round(9*s))+Math.floor((tick/6|0)%4*2*s);
    if(has(2)){const pr=Math.max(Math.round(3*s),Math.round(18*s)>>lv);x=x%pr+Math.floor(t*6)%Math.max(1,Math.round(W*s))}
    if(has(3))x=cols-1-x;
    if(has(5)){x=Math.floor(x/2);y=top+(y-top)/2+1.2*s}
    y-=drop;
    const X=(((Math.floor(x+sc))%M)+M)%M,li=Math.floor(X/(6*s)),wav=hs.length?0:Math.round(Math.sin(li*1.1-t*3)*(.3+en*1.4)*s*1.2),yy=Math.floor((y-wav-top)/s),xx=Math.floor(X/s);
    let ch=' ',in_=yy>=0&&yy<5&&X<ww&&GX_WORD[yy][xx]==='#';
    if(in_)ch=en>.55?'@':'#';
    else{const sp=.6+gxHash(c,7,3)*1.6,ph=gxHash(c,1,9)*(rows+8),p=(t*sp*6+ph)%(rows+8),d=p-r;
      if(gxHash(c,3,5)<.18+.5*en+.3*amt&&d>=0&&d<3)ch=d<1?':':'.';
      else{const h=gxHash(c,r,tick/3|0);if(h<.008+.05*en+.04*amt)ch=GX_RAMP[1+Math.floor(h*97)%(GX_RAMP.length-1)]}}
    if(has(3)&&ch===' '&&gxHash(r,tick,1)<.25&&(c+tick*2)%9<3)ch='<';
    if(has(4)&&ch!==' '&&gxHash(c,r,2)<.3)ch=':';
    if(has(6))ch=in_?(gxHash(c,r,tick/2|0)<.7?'█':'▓'):(ch===' '?' ':'░');
    if(flash)ch=in_?' ':(ch===' '&&gxHash(c,r,tick)<.5?'░':ch);
    if(has(7)&&(((tick>>1)+Math.floor(r/Math.max(1,s*.6)))%2===0))ch=' ';
    line+=ch}out.push(line)}return out.join('\n')}
(()=>{const box=$('#gxBox'),scr=$('#gxScr'),tag=$('#gxTag');let last=0,en=0,buf=null,rw=0;
  const loop=now=>{requestAnimationFrame(loop);if(now-last<41)return;const dt=Math.min(.2,(now-(last||now))/1000);last=now;if(!box.offsetParent){const h=gxActive();gxPadEls.forEach((b,k)=>b.classList.toggle('live',h.indexOf(k+1)>=0));return}
    if(A&&A.an){if(!buf)buf=new Uint8Array(A.an.fftSize);A.an.getByteTimeDomainData(buf);let m=0;for(let i=0;i<buf.length;i+=8)m=Math.max(m,Math.abs(buf[i]-128));en=Math.max(m/128,en*.85)}
    if(!rw){const m=document.createElement('span');m.textContent='##########';m.style.cssText='position:absolute;visibility:hidden;white-space:pre;font-size:100px;font-family:'+getComputedStyle(scr).fontFamily;document.body.appendChild(m);rw=m.getBoundingClientRect().width/1000||.6;m.remove()}
    const W=box.clientWidth-8,H=box.clientHeight-6,fs=Math.max(7,Math.min(W/(64*rw),H/(7*1.12),34)),cols=Math.max(16,Math.floor(W/(fs*rw))),rows=Math.max(5,Math.floor(H/(fs*1.12)));
    if(scr._fs!==fs){scr._fs=fs;scr.style.fontSize=fs.toFixed(2)+'px';scr.style.lineHeight=(fs*1.12).toFixed(2)+'px'}
    const hs=gxActive(),has=f=>hs.indexOf(f)>=0;let sp=hs.length?6:2.2+en*4;if(has(5))sp=1.5;if(has(3))sp=-14;if(has(4))sp=Math.max(0,sp-((ctx?ctx.currentTime:0)-(GX.t0[4]||0))*8);
    GX.sc+=sp*dt*(scr._fs?1:1);
    scr.textContent=gxFrame(now/1000,hs,en,S.glitch.amt||0,cols,rows,GX.sc);box.classList.toggle('on',hs.length>0);gxPadEls.forEach((b,k)=>b.classList.toggle('live',hs.indexOf(k+1)>=0));tag.textContent=hs.length?hs.map(f=>GX_NAMES[f-1].toUpperCase()).join(' + '):'· · ·'};
  requestAnimationFrame(loop)})();

/* columns: drag the hinge sideways (saved in this browser; double-click = default) */
(()=>{const h=document.querySelector('.hinge'),L=document.querySelector('.pane.left'),R=document.querySelector('.pane.right'),P=$('#panes');if(!h||!L||!R)return;
  const apply=f=>{if(P.classList.contains('c3'))return;if(f>0){const w=P.getBoundingClientRect().width||innerWidth,min=Math.max(.2,400/w);f=w<720?0:clamp(f,min,1-min-26/w)}if(f>0){L.style.flex='0 0 '+(f*100).toFixed(2)+'%';R.style.flex='1 1 0'}else{L.style.flex='';R.style.flex=''}};
  addEventListener('resize',()=>apply(f));
  let f=0;try{f=+localStorage.getItem('seq3-split')||0}catch(e){globalThis.__el&&globalThis.__el(e)}apply(f);
  let on=false;h.addEventListener('pointerdown',e=>{if(innerWidth<720||P.classList.contains('c3'))return;e.preventDefault();e.stopPropagation();h.setPointerCapture(e.pointerId);on=true;h.classList.add('drag')});
  h.addEventListener('pointermove',e=>{if(!on)return;const r=P.getBoundingClientRect(),min=Math.max(.2,400/r.width);f=clamp((e.clientX-r.left-13)/r.width,min,1-min-26/r.width);apply(f)});
  const up=()=>{if(!on)return;on=false;h.classList.remove('drag');try{localStorage.setItem('seq3-split',f)}catch(e){globalThis.__el&&globalThis.__el(e)}};h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up);
  window.splitApply=()=>apply(f);h.addEventListener('dblclick',()=>{if(P.classList.contains('c3'))return;f=0;apply(0);try{localStorage.removeItem('seq3-split')}catch(e){globalThis.__el&&globalThis.__el(e)}});
  window.__split=v=>{f=v;apply(v)}})();

/* dots look: canvases draw without glow (a glow becomes a black smudge in yellow/black) */
(()=>{const P=CanvasRenderingContext2D.prototype,d=Object.getOwnPropertyDescriptor(P,'shadowBlur');if(!d||!d.set)return;
  Object.defineProperty(P,'shadowBlur',{configurable:true,get(){return d.get.call(this)},set(v){d.set.call(this,document.body.classList.contains('look-dots')?0:v)}})})();

/* the length handles follow their step when a column changes width */
(()=>{if(typeof ResizeObserver!=='function'||!gridEl)return;let q=0;new ResizeObserver(()=>{cancelAnimationFrame(q);q=requestAnimationFrame(()=>{try{renderLens()}catch(e){globalThis.__el&&globalThis.__el(e)}})}).observe(gridEl)})();
/* dots look: canvases draw every colour as ink (a coloured dot would turn grey or vanish in yellow/black) */
(()=>{const P=CanvasRenderingContext2D.prototype,memo=new Map(),inv=new WeakMap();
  const isInv=cv=>{let v=inv.get(cv);if(v===undefined){v=!!(cv.closest&&cv.closest('.card.lite:not(.dotm):not(.sndcard),.snd-grid'));inv.set(cv,v)}return v};
  const map=(c,dark)=>{if(typeof c!=='string')return c;const k=c+(dark?1:0);let r=memo.get(k);if(r!==undefined)return r;r=c;let m,R,G,B,A=1;
    if((m=/^#([0-9a-f]{6})$/i.exec(c))){const n=parseInt(m[1],16);R=n>>16;G=n>>8&255;B=n&255}
    else if((m=/^#([0-9a-f]{3})$/i.exec(c))){R=parseInt(m[1][0]+m[1][0],16);G=parseInt(m[1][1]+m[1][1],16);B=parseInt(m[1][2]+m[1][2],16)}
    else if((m=/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+%?))?\s*\)$/i.exec(c))){R=+m[1];G=+m[2];B=+m[3];if(m[4]!=null)A=m[4].endsWith('%')?parseFloat(m[4])/100:+m[4]}
    if(R!=null&&Math.max(R,G,B)-Math.min(R,G,B)>40)r=dark?`rgba(29,29,27,${A})`:`rgba(232,230,220,${A})`;
    if(memo.size>500)memo.clear();memo.set(k,r);return r};
  for(const prop of ['fillStyle','strokeStyle']){const d=Object.getOwnPropertyDescriptor(P,prop);if(!d||!d.set)continue;
    Object.defineProperty(P,prop,{configurable:true,get(){return d.get.call(this)},set(v){d.set.call(this,document.body.classList.contains('look-dots')?map(v,isInv(this.canvas)):v)}})}})();
/* pads in full screen: a classic 4×4 like an MPC – pad 1 (kick) bottom left, 1–10 the sounds, 11–16 glitch (hold) */
(()=>{const nm=['stutter','roll','rev','stop','halv','crush'];
  nm.forEach((n,k)=>{const fx=k+1,p=document.createElement('button');p.className='pad gxp';p.innerHTML=`<i>glitch</i><b>${n}</b>`;
    const off=()=>gxPress(fx,false);
    p.addEventListener('pointerdown',e=>{e.preventDefault();try{p.setPointerCapture(e.pointerId)}catch(_){globalThis.__el&&globalThis.__el(_)}gxPress(fx,true)});
    p.addEventListener('pointerup',off);p.addEventListener('pointercancel',off);p.addEventListener('lostpointercapture',off);
    padsEl.appendChild(p)});
  [...padsEl.children].forEach((p,k)=>{p.style.setProperty('--mr',4-(k>>2));p.style.setProperty('--mc',(k&3)+1);p.dataset.n=k+1})})();
/* mixer in full screen: a classic desk – per channel sends (echo, space), tone and pan as knobs above a long fader */
(()=>{const KS=[['echo','echo',0,1,'%'],['space','space',0,1,'%'],['tone','ton',0,1,'%'],['pan','pan',-1,1,'pan']];
  const fmt=(v,u)=>u==='pan'?(Math.abs(v)<.04?'C':(v<0?'L':'R')+Math.round(Math.abs(v)*100)):Math.round(v*100);
  const all=[];
  const knob=(i,[key,lab,lo,hi,u])=>{const id=TRACKS[i].id,w=document.createElement('div');w.className='mk'+(key==='pan'?' pan':'');w.title=lab+' · dra upp/ner · dubbeltryck = standard';
    w.innerHTML=`<span class="mk-k"><i></i></span><em>${lab}</em><b></b>`;const get=()=>S.params[id][key],nv=()=>(get()-lo)/(hi-lo);
    const paint=()=>{const v=nv();w.style.setProperty('--v',v.toFixed(3));w.querySelector('b').textContent=fmt(get(),u)};
    let on=false,y0=0,v0=0,lt=0;
    w.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();initAudio();const n=performance.now();pushHist();
      if(n-lt<300){S.params[id][key]=DEF_P[id][key];applyTrack(i);paint();renderSnd();save();lt=0;return}lt=n;on=true;y0=e.clientY;v0=nv();try{w.setPointerCapture(e.pointerId)}catch(_){globalThis.__el&&globalThis.__el(_)}});
    w.addEventListener('pointermove',e=>{if(!on)return;let v=clamp(v0+(y0-e.clientY)/(e.shiftKey?600:160),0,1),x=lo+v*(hi-lo);if(key==='pan'&&Math.abs(x)<.04)x=0;S.params[id][key]=+x.toFixed(3);applyTrack(i);paint();renderSnd()});
    const up=()=>{if(on){on=false;save()}};w.addEventListener('pointerup',up);w.addEventListener('pointercancel',up);
    all.push(paint);paint();return w};
  MXS.forEach((X,i)=>{const box=document.createElement('div');box.className='mks';KS.forEach(k=>box.appendChild(knob(i,k)));X.el.insertBefore(box,X.el.querySelector('.pn'));
    const sc=document.createElement('div');sc.className='mscale';sc.innerHTML='<span>+0</span><span>-5</span><span>-12</span><span>-24</span><span>-∞</span>';X.el.querySelector('.fd').appendChild(sc);
    const lab=document.createElement('div');lab.className='mlab';lab.textContent=TRACKS[i].name.toLowerCase();X.el.appendChild(lab)});
  {const lab=document.createElement('div');lab.className='mlab';lab.textContent='master';MXS.master.el.appendChild(lab);const box=document.createElement('div');box.className='mks';MXS.master.el.insertBefore(box,MXS.master.el.querySelector('.pn'))}
  const card=mxEl.closest('.card');setInterval(()=>{if(card&&card.parentElement&&card.parentElement.id==='fullHost')all.forEach(f=>f())},300)})();
