/* ---------- BRIS module card: OLED, presets, full panel ---------- */
const BR_PRE=[
 ['Pad','Bris',{wave:0,det:.42,sub:.18,cut:.46,res:.14,fenv:.22,fA:.55,fD:.6,fS:.55,fR:.6,aA:.55,aD:.6,aS:.85,aR:.62,lfoDest:1,lfoAmt:.22,lfoR:.18,cho:2,choMix:.75,dly:.24,dlyT:1,dlyFb:.38,drift:.45}],
 ['Pad','Molnbank',{wave:0,det:.55,sub:.1,cut:.38,res:.2,fenv:.3,fA:.7,fD:.7,fS:.4,fR:.7,aA:.72,aD:.7,aS:.9,aR:.75,lfoW:0,lfoDest:1,lfoAmt:.3,lfoR:.08,cho:2,choMix:.85,dly:.3,dlyT:2,dlyFb:.45,drift:.5}],
 ['Pad','Juno dröm',{wave:1,pw:.35,det:.18,sub:.25,cut:.5,res:.25,fenv:.18,fA:.4,fD:.5,fS:.5,fR:.5,aA:.42,aD:.5,aS:.85,aR:.55,lfoW:0,lfoDest:0,lfoAmt:.12,lfoR:.35,cho:1,choMix:.9,dly:.12,drift:.3}],
 ['Pad','Varmt glas',{wave:0,det:.3,sub:.0,cut:.6,res:.35,fenv:.15,fA:.6,fS:.6,aA:.5,aS:.8,aR:.6,lfoDest:1,lfoAmt:.18,lfoR:.25,cho:2,choMix:.6,dly:.28,dlyT:5,dlyFb:.4}],
 ['Pad','Nattsjö',{wave:0,det:.35,sub:.35,noise:.08,cut:.3,res:.42,fenv:.35,fA:.8,fD:.8,fS:.3,fR:.8,aA:.8,aD:.8,aS:.85,aR:.85,lfoW:4,lfoDest:1,lfoAmt:.2,lfoR:.2,lfoSync:1,cho:1,choMix:.6,dly:.35,dlyT:2,dlyFb:.55}],
 ['Pad','Strings 77',{wave:0,det:.48,sub:0,cut:.55,res:.05,fenv:.08,aA:.45,aD:.4,aS:.9,aR:.5,lfoDest:0,lfoAmt:.1,lfoR:.42,cho:2,choMix:.9,dly:.1}],
 ['Keys','Poly keys',{wave:0,det:.15,sub:.2,cut:.42,res:.15,fenv:.42,fA:0,fD:.42,fS:.15,fR:.3,aA:.01,aD:.55,aS:.35,aR:.3,cho:1,choMix:.55,dly:.12}],
 ['Keys','Epiano bris',{wave:1,pw:.5,det:.08,sub:.12,cut:.32,res:.1,fenv:.45,fD:.38,fS:.05,fR:.25,aA:0,aD:.62,aS:.2,aR:.32,lfoDest:2,lfoAmt:.28,lfoR:.38,cho:1,choMix:.7,dly:.1}],
 ['Keys','Clav-ish',{wave:1,pw:.18,det:0,sub:0,cut:.48,res:.4,fenv:.5,fD:.2,fS:0,fR:.12,aA:0,aD:.32,aS:.1,aR:.12,cho:0,dly:0}],
 ['Keys','Orgel lite',{wave:1,pw:.5,det:.1,sub:.6,cut:.62,res:0,fenv:0,aA:.02,aD:.2,aS:1,aR:.12,lfoDest:0,lfoAmt:.1,lfoR:.55,cho:2,choMix:.8,dly:0}],
 ['Brass','Brass 6',{wave:0,det:.2,sub:.15,cut:.34,res:.12,fenv:.5,fA:.3,fD:.45,fS:.45,fR:.3,aA:.18,aD:.4,aS:.85,aR:.3,cho:1,choMix:.45,dly:.08}],
 ['Brass','Mjuk brass',{wave:0,det:.25,sub:.1,cut:.28,res:.08,fenv:.42,fA:.42,fD:.55,fS:.5,aA:.3,aS:.85,aR:.4,cho:2,choMix:.55,dly:.15,dlyT:1}],
 ['Bass','Ladderbas',{wave:0,det:.05,sub:.55,cut:.3,res:.35,fenv:.42,fD:.28,fS:.1,fR:.2,aA:0,aD:.4,aS:.6,aR:.14,cho:0,dly:0,vmode:1,glide:.15,drift:.2}],
 ['Bass','Sub moog',{wave:1,pw:.5,det:0,sub:.75,cut:.22,res:.2,fenv:.25,fD:.3,fS:.2,aA:0,aD:.4,aS:.8,aR:.12,cho:0,dly:0,vmode:1,glide:.12}],
 ['Bass','Acid-ish',{wave:0,det:0,sub:.1,cut:.22,res:.72,fenv:.6,fD:.25,fS:0,fR:.15,aA:0,aD:.3,aS:.5,aR:.1,cho:0,dly:.12,dlyT:4,vmode:1,glide:.2}],
 ['Bass','Plockbas',{wave:1,pw:.3,det:.06,sub:.5,cut:.25,res:.25,fenv:.5,fD:.22,fS:0,fR:.12,aA:0,aD:.32,aS:0,aR:.12,cho:0,dly:0,vmode:0}],
 ['Bass','Unison bas',{wave:0,det:.4,sub:.4,cut:.28,res:.3,fenv:.4,fD:.3,fS:.15,aA:0,aD:.35,aS:.7,aR:.14,cho:0,dly:0,vmode:2,glide:.08}],
 ['Lead','Solo såg',{wave:0,det:.22,sub:.2,cut:.5,res:.3,fenv:.35,fD:.4,fS:.4,aA:.02,aD:.4,aS:.85,aR:.25,lfoDest:0,lfoAmt:.18,lfoR:.55,cho:1,choMix:.35,dly:.25,dlyT:1,dlyFb:.35,vmode:1,glide:.18}],
 ['Lead','Fyrkant lead',{wave:1,pw:.3,det:.1,sub:.3,cut:.55,res:.22,fenv:.25,aA:.01,aS:.9,aR:.22,lfoDest:0,lfoAmt:.15,lfoR:.5,cho:0,dly:.28,dlyT:0,dlyFb:.3,vmode:1,glide:.22}],
 ['Lead','Unison skrik',{wave:0,det:.55,sub:.25,cut:.6,res:.4,fenv:.3,aA:.01,aS:.9,aR:.25,cho:1,choMix:.4,dly:.22,dlyT:1,vmode:2,glide:.1}],
 ['Lead','Visslan',{wave:1,pw:.5,det:0,sub:0,noise:.05,cut:.48,res:.62,fenv:.1,kt:1,aA:.12,aS:.9,aR:.35,lfoDest:0,lfoAmt:.2,lfoR:.6,cho:0,dly:.32,dlyT:5,dlyFb:.45,vmode:1,glide:.3}],
 ['Pluck','Glaspluck',{wave:1,pw:.4,det:.12,sub:0,cut:.36,res:.3,fenv:.62,fD:.22,fS:0,fR:.2,aA:0,aD:.38,aS:0,aR:.3,cho:2,choMix:.6,dly:.32,dlyT:1,dlyFb:.42}],
 ['Pluck','Arp-klocka',{wave:1,pw:.22,det:.05,sub:0,cut:.44,res:.45,fenv:.55,fD:.2,fS:0,fR:.25,aA:0,aD:.32,aS:0,aR:.38,cho:1,choMix:.5,dly:.38,dlyT:4,dlyFb:.5}],
 ['Pluck','Stab 90',{wave:0,det:.3,sub:.2,cut:.4,res:.38,fenv:.55,fD:.25,fS:.05,fR:.2,aA:0,aD:.3,aS:.1,aR:.2,cho:1,choMix:.4,dly:.2,dlyT:1}],
 ['Pluck','House-ackord',{wave:0,det:.2,sub:.15,cut:.35,res:.32,fenv:.45,fD:.28,fS:.08,fR:.22,aA:0,aD:.35,aS:.15,aR:.25,cho:2,choMix:.5,dly:.22,dlyT:1,dlyFb:.35}],
 ['FX','Vind',{wave:0,det:.6,sub:0,noise:.55,cut:.3,res:.55,fenv:.3,fA:.8,fD:.8,fS:.4,fR:.85,aA:.8,aS:.8,aR:.85,lfoW:0,lfoDest:1,lfoAmt:.45,lfoR:.1,cho:2,choMix:.7,dly:.4,dlyT:2,dlyFb:.6}],
 ['FX','Sample & hold',{wave:0,det:.1,sub:.2,cut:.4,res:.62,fenv:.15,aA:.01,aS:.85,aR:.3,lfoW:4,lfoDest:1,lfoAmt:.62,lfoR:.8,lfoSync:1,cho:1,choMix:.4,dly:.3,dlyT:4,dlyFb:.45}],
 ['FX','Drönare',{wave:0,det:.7,sub:.6,noise:.1,cut:.25,res:.5,fenv:.2,fA:.9,fS:.6,aA:.85,aS:1,aR:.9,lfoW:0,lfoDest:1,lfoAmt:.35,lfoR:.05,cho:2,choMix:.8,dly:.45,dlyT:5,dlyFb:.7,vmode:2}],
 ['FX','Ringping',{wave:1,pw:.12,det:0,sub:0,cut:.6,res:.5,fenv:.4,fD:.12,fS:0,aA:0,aD:.18,aS:0,aR:.18,cho:0,dly:.55,dlyT:3,dlyFb:.75}]];
const BR_CATS=['Alla','Pad','Keys','Brass','Bass','Lead','Pluck','FX','Mina'];
(function brisCard(){const card=document.querySelector('.card.bris');if(!card)return;const LSU='blonda.bris.user';
  let user=[];try{user=JSON.parse(localStorage.getItem(LSU)||'[]')}catch(e){globalThis.__el&&globalThis.__el(e)}
  const E=()=>engE('bris'),all=()=>BR_PRE.concat(user.map(u=>['Mina',u[0],u[1]]));let cat='Alla',flash=null,flashT=0;
  const st=()=>{if(!S.brisP)S.brisP={i:0,name:'Bris'};return S.brisP};
  const PRM={wave:['våg',0,1,v=>v?'fyrkant':'såg',1],pw:['pw',0,1,v=>Math.round(8+v*84)+'%'],det:['detune',0,1,v=>Math.round(v*100)+'%'],sub:['sub',0,1,v=>Math.round(v*100)+'%'],noise:['brus',0,1,v=>Math.round(v*100)+'%'],
    glide:['glid',0,1,v=>Math.round((.005+v*v*1.2)*1000)+' ms'],drift:['drift',0,1,v=>Math.round(v*100)+'%'],cut:['cutoff',0,1,v=>{const h=24*Math.pow(2,v*9.6);return h>=1000?(h/1000).toFixed(1)+' kHz':Math.round(h)+' Hz'}],
    res:['reso',0,1,v=>Math.round(v*100)+'%'],fenv:['env',0,1,v=>Math.round(v*100)+'%'],kt:['key',0,1,v=>Math.round(v*100)+'%'],fvel:['velo',0,1,v=>Math.round(v*100)+'%'],
    fA:['A',0,1,v=>msS(brT(v,6))],fD:['D',0,1,v=>msS(brT(v,8))],fS:['S',0,1,v=>Math.round(v*100)+'%'],fR:['R',0,1,v=>msS(brT(v,10))],
    aA:['A',0,1,v=>msS(brT(v,6))],aD:['D',0,1,v=>msS(brT(v,8))],aS:['S',0,1,v=>Math.round(v*100)+'%'],aR:['R',0,1,v=>msS(brT(v,10))],
    lfoW:['form',0,4,v=>['triangel','ramp upp','ramp ner','fyrkant','s&h'][v],1],lfoR:['rate',0,1,v=>E().lfoSync?['1/1','1/2','1/4','1/8','1/16','1/16T'][Math.min(5,Math.round(v*5))]:(.08*Math.pow(2,v*7.5)).toFixed(2)+' Hz'],
    lfoAmt:['mängd',0,1,v=>Math.round(v*100)+'%'],lfoDest:['mål',0,2,v=>['tonhöjd','filter','volym'][v],1],lfoSync:['sync',0,1,v=>v?'takt':'fri',1],
    cho:['chorus',0,2,v=>['av','I','II'][v],1],choMix:['mix',0,1,v=>Math.round(v*100)+'%'],dly:['delay',0,1,v=>Math.round(v*100)+'%'],dlyT:['tid',0,5,v=>BR_DLY[v][1],1],dlyFb:['feedback',0,1,v=>Math.round(v*100)+'%'],
    vmode:['röster',0,2,v=>['poly 6','mono','unison'][v],1],vol:['volym',0,1,v=>Math.round(v*100)+'%']};
  function msS(s){return s<1?Math.round(s*1000)+' ms':s.toFixed(2)+' s'}
  const SECS=[['osc',['wave','pw','det','sub','noise','glide']],['filter',['cut','res','fenv','kt','fvel']],['filter-env',['fA','fD','fS','fR']],['amp-env',['aA','aD','aS','aR']],
    ['lfo',['lfoW','lfoDest','lfoSync','lfoR','lfoAmt']],['effekt',['cho','dlyT','choMix','dly','dlyFb']]];
  const body=card.querySelector('.br-body');
  /* header: OLED + preset browser + play-on */
  body.innerHTML=`<div class="br-top"><canvas class="br-oled" id="brOled"></canvas>
    <div class="br-pre"><div class="br-cats" id="brCats"></div><div class="br-nav"><button id="brPrev" aria-label="Föregående preset">‹</button><b id="brName">Bris</b><button id="brNext" aria-label="Nästa preset">›</button></div>
      <div class="br-voice" id="brVoice"></div>
</div></div>
    <div class="br-play"><span>spela på</span><span class="br-trk" id="brTrk"></span><button class="br-kb" id="brKb" title="Öppna klaviaturen" aria-label="Klaviatur"><svg viewBox="0 0 24 24"><rect x="2.5" y="4.5" width="19" height="15" rx="2.6" stroke-width="2"/><path d="M5.95 4.5h2.6v7.6h-2.6zM10.7 4.5h2.6v7.6h-2.6zM15.45 4.5h2.6v7.6h-2.6z" fill="currentColor" stroke="none"/><path d="M7.25 12v7M12 12v7M16.75 12v7" stroke-width="1.6"/></svg></button><button class="br-save" id="brSave" title="Spara som eget preset">spara</button></div>
    <div class="br-grid" id="brGrid"></div>`;
  const grid=$('#brGrid'),KN={};
  const build=(row,keys)=>keys.forEach(k=>{const [l,mn,mx,f,sw]=PRM[k];const el=document.createElement('div');el.className=sw?'br-sw':'bkn'+(k==='cut'?' big':'');el.dataset.k=k;
      el.innerHTML=sw?`<i class="led"></i><small>${l}</small><b></b>`:`<div class="bk-w"><div class="bk-sc"></div><div class="bk-f"><i></i><i></i></div><div class="bk-c"></div></div><small>${l}</small>`;row.appendChild(el);KN[k]=el;
      if(sw){el.onclick=()=>{const e=E();e[k]=e[k]>=mx?mn:e[k]+1;changed(k)}}
      else{let y0=0,v0=0,lt=0;el.addEventListener('pointerdown',ev=>{ev.preventDefault();el.setPointerCapture(ev.pointerId);y0=ev.clientY;v0=E()[k];el.classList.add('act');const n=performance.now();if(n-lt<300){E()[k]=BR_DEF[k];changed(k)}lt=n;showVal(k)});
        el.addEventListener('pointermove',ev=>{if(!el.hasPointerCapture(ev.pointerId))return;E()[k]=clamp(v0+(y0-ev.clientY)/(ev.shiftKey?600:180)*(mx-mn),mn,mx);changed(k,true)});
        const up=()=>{el.classList.remove('act')};el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)}
      mlReg(el,{key:'e.bris.'+k,label:l.toLowerCase()+' · bris',min:mn,max:mx,int:!!sw,paint:()=>{paintK(k);if(k==='wave')KN.pw.classList.toggle('dim',E().wave!==1)}})});
  SECS.forEach(([title,keys])=>{const sec=document.createElement('div');sec.className='br-sec s-'+title;sec.innerHTML=`<h5><span>${title}</span></h5><div class="br-row"></div>`;build(sec.querySelector('.br-row'),keys);grid.appendChild(sec)});
  build($('#brVoice'),['vmode','drift','vol']);
  function paintK(k){const el=KN[k];if(!el)return;const [,mn,mx,f,sw]=PRM[k],v=E()[k];if(sw){el.querySelector('b').textContent=f(v);el.classList.toggle('on',v>0)}else el.style.setProperty('--v',(v-mn)/(mx-mn))}
  function paintAll(){Object.keys(PRM).forEach(paintK);KN.pw.classList.toggle('dim',E().wave!==1)}
  let sv=0;function changed(k,quiet){paintK(k);if(k==='wave')KN.pw.classList.toggle('dim',E().wave!==1);if(k==='lfoSync')paintK('lfoR');showVal(k);brisApplyAll();st().name=st().name.replace(/ \*$/,'')+' *';$('#brName').textContent=st().name;
    clearTimeout(sv);sv=setTimeout(save,300);if(!quiet&&!playing)previewNote()}
  function showVal(k){const [l,,,f]=PRM[k];flash={l,v:f(E()[k]),k};flashT=performance.now()}
  let pv=0;function previewNote(){if(!prevOn())return;const now=performance.now();if(now-pv<350)return;pv=now;const i=brisTrack();if(i<0)return;initAudio();ctx.resume();trigger(i,ctx.currentTime+.01,.8,i===6?45:57,4)}
  /* presets */
  function list(){const L=all();return cat==='Alla'?L:L.filter(p=>p[0]===cat)}
  function load(p){const e=E();Object.assign(e,BR_DEF,p[2]);st().name=p[1];st().i=all().indexOf(p);$('#brName').textContent=p[1];paintAll();brisApplyAll();save();flash={l:p[0].toLowerCase(),v:p[1],k:'pre'};flashT=performance.now();if(!playing)previewNote()}
  function step(d){const L=list();if(!L.length)return;let ix=L.findIndex(p=>p[1]===st().name.replace(/ \*$/,''));ix=ix<0?0:(ix+d+L.length)%L.length;load(L[ix])}
  $('#brPrev').onclick=()=>step(-1);$('#brNext').onclick=()=>step(1);
  const cats=$('#brCats');BR_CATS.forEach(c=>{const b=document.createElement('button');b.textContent=c.toLowerCase();b.onclick=()=>{cat=c;[...cats.children].forEach(x=>x.classList.toggle('on',x===b));if(list().length)load(list()[0]);else toast('Inga egna presets än · tryck spara')};if(c==='Alla')b.classList.add('on');cats.appendChild(b)});
  $('#brSave').onclick=()=>{const name='Mitt ljud '+(user.length+1);const p={};Object.keys(BR_DEF).forEach(k=>p[k]=E()[k]);user.push([name,p]);try{localStorage.setItem(LSU,JSON.stringify(user))}catch(e){globalThis.__el&&globalThis.__el(e)}st().name=name;$('#brName').textContent=name;toast('Sparat · '+name)};
  /* which tracks play Bris */
  const trk=$('#brTrk');MEL.forEach(j=>{const b=document.createElement('button');b.dataset.i=j;b.onclick=()=>{const id=TRACKS[j].id;pushHist();S.inst[id]=S.inst[id]==='bris'?DEF_INST[id]:'bris';if(S.inst[id]==='bris'){select(j)}refreshInst();save();paintTrk();toast(TRACKS[j].base+' → '+(S.inst[id]==='bris'?'Bris':ENG[S.inst[id]].name))};trk.appendChild(b)});
  function paintTrk(){[...trk.children].forEach(b=>{const j=+b.dataset.i;b.textContent=TRACKS[j].base.toLowerCase();b.classList.toggle('on',S.inst[TRACKS[j].id]==='bris')})}
  function brisTrack(){const on=MEL.filter(j=>S.inst[TRACKS[j].id]==='bris');if(!on.length)return -1;return on.includes(S.sel)?S.sel:on[0]}
  $('#brKb').onclick=()=>{let i=brisTrack();if(i<0){const j=MEL[1];S.inst[TRACKS[j].id]='bris';refreshInst();save();paintTrk();i=j}select(i);if(window.__kb){__kb.open();__kb.layout()}};
  /* OLED: preset name, 6 voice LEDs, live value, filter + envelope shapes */
  const vled=[0,0,0,0,0,0];let vix=0;window.brisLed=(id,t,n)=>{for(let k=0;k<n;k++){vled[vix%6]=performance.now()+Math.max(0,(t-ctx.currentTime)*1000);vix++}};
  const oled=$('#brOled');
  function drawOled(){requestAnimationFrame(drawOled);if(!oled.offsetParent||card.classList.contains('min'))return;const f=fit(oled);if(!f)return;const {c,w,h}=f,e=E(),now=performance.now();
    c.fillStyle='#05070B';c.fillRect(0,0,w,h);const ink='#DCE9FF',dim='rgba(220,233,255,.28)',acc='#5BA7FF';
    c.fillStyle=ink;c.font='400 13px "BLONDA Pixel",monospace';c.textBaseline='top';const nm=st().name.toUpperCase();c.fillText(nm.length>20?nm.slice(0,19)+'…':nm,10,9);
    c.fillStyle=dim;c.font='400 9px "BLONDA Mono",monospace';c.fillText(['POLY 6','MONO','UNISON'][e.vmode]+' · '+(e.wave?'PULS':'SÅG')+(e.cho?' · CHORUS '+['','I','II'][e.cho]:''),10,26);
    for(let k=0;k<6;k++){const on=now-vled[k]<0?0:Math.max(0,1-(now-vled[k])/(220+brT(e.aR,10)*400));c.fillStyle=on>.05?`rgba(91,167,255,${.25+.75*on})`:'rgba(220,233,255,.14)';c.beginPath();c.arc(w-12-(5-k)*11,15,3.2,0,6.283);c.fill()}
    const top=44,H=h-top-10;
    if(flash&&now-flashT<1400){c.fillStyle=dim;c.font='400 10px "BLONDA Mono",monospace';c.fillText(flash.l.toUpperCase(),10,top+2);c.fillStyle=ink;c.font='400 28px "BLONDA Pixel",monospace';c.fillText(flash.v,10,top+16)}
    /* filter response */
    const fx0=w*.42,fw=w*.3,fc=e.cut,Q=.6+Math.pow(e.res,1.3)*17;c.beginPath();for(let x=0;x<=fw;x+=2){const fq=20*Math.pow(1000,x/fw),fcz=24*Math.pow(2,fc*9.6),r=fq/fcz,
      H1=1/Math.sqrt((1-r*r)**2+(r/.55)**2),H2=1/Math.sqrt((1-r*r)**2+(r/Q)**2),db=Math.max(-36,Math.min(18,20*Math.log10(H1*H2))),y=top+H*(.35+(-db)/54*.6);x?c.lineTo(fx0+x,y):c.moveTo(fx0+x,y)}
    c.strokeStyle=acc;c.lineWidth=1.5;c.stroke();
    /* amp env */
    const ex0=w*.76,ew=w*.22,tA=brT(e.aA,6),tD=brT(e.aD,8),tR=brT(e.aR,10),tot=tA+tD+.6+tR,X=s=>ex0+s/tot*ew,Y=a=>top+H-a*H*.85;
    c.beginPath();c.moveTo(X(0),Y(0));c.lineTo(X(tA),Y(1));c.lineTo(X(tA+tD),Y(e.aS));c.lineTo(X(tA+tD+.6),Y(e.aS));c.lineTo(X(tot),Y(0));c.strokeStyle=ink;c.lineWidth=1.3;c.stroke();
    if(!(flash&&now-flashT<1400)){c.fillStyle=dim;c.font='400 9px "BLONDA Mono",monospace';c.fillText('FILTER',fx0,top+H-2);c.fillText('AMP',ex0,top+H-2);
      c.fillStyle=ink;c.font='400 22px "BLONDA Pixel",monospace';c.fillText(PRM.cut[3](e.cut),10,top+16)}}
  requestAnimationFrame(drawOled);
  setInterval(paintTrk,600);paintTrk();paintAll();$('#brName').textContent=st().name;
  window.__bris={load,step,presets:()=>all(),paintAll};
})();


