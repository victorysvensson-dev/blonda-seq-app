/* ---------- MIDI: notes in, clock in/out, start/stop, notes out ---------- */
(function midiMod(){const LS='blonda.midi.v1';let cfg={inId:'',outId:'',follow:0,clockOut:0,notesOut:0};try{Object.assign(cfg,JSON.parse(localStorage.getItem(LS)||'{}'))}catch(e){globalThis.__el&&globalThis.__el(e)}
  const saveCfg=()=>{try{localStorage.setItem(LS,JSON.stringify(cfg))}catch(e){globalThis.__el&&globalThis.__el(e)}};let acc=null,out=null,panelEl=null,ticks=[],extBpm=0,lastTick=0,extRun=false,tickN=0;const has=!!navigator.requestMIDIAccess;let denied=has&&!!(document.featurePolicy&&document.featurePolicy.allowsFeature&&!document.featurePolicy.allowsFeature('midi'));
  const perf=t=>performance.now()+(t-ctx.currentTime)*1000;
  const CH={bass:0,keys:1,lead:2,pad:3},DRUM={kick:36,snare:38,clap:39,hat:42,ohat:46,perc:37};
  async function connect(){if(acc||!has)return acc;try{acc=await navigator.requestMIDIAccess({sysex:false});acc.onstatechange=()=>{bind();if(panelEl)paint()};bind();return acc}catch(e){denied=true;toast('MIDI är blockerat här – se midi-panelen');if(panelEl)paint();return null}}
  function bind(){if(!acc)return;acc.inputs.forEach(inp=>{inp.onmidimessage=(cfg.inId&&inp.id!==cfg.inId)?null:onMsg});out=null;if(cfg.outId)acc.outputs.forEach(o=>{if(o.id===cfg.outId)out=o});status()}
  function onMsg(m){const d=m.data,st=d[0];if(st<0xF0&&window.__undoTouch)__undoTouch();
    if(st===0xF8||st===0xF2||st===0xFA||st===0xFB||st===0xFC){if(cfg.follow&&window.CLK){const _b=CLK.msg(st,d,m.timeStamp);if(_b)extBpm=_b}if(st===0xF8)liveDot();return}if(st===0xF8){if(!cfg.follow)return;const now=m.timeStamp||performance.now();if(lastTick&&now-lastTick<200){ticks.push(now-lastTick);if(ticks.length>48)ticks.shift();
        if(ticks.length>=24){const avg=ticks.reduce((a,b)=>a+b,0)/ticks.length,bpm=60000/(avg*24);extBpm=bpm;if(bpm>=60&&bpm<=180&&Math.abs(bpm-S.bpm)>.08){S.bpm=Math.round(bpm*100)/100;setDM($('#bpmNum'),String(Math.round(S.bpm)));applyMaster()}}}lastTick=now;
    if(extRun&&playing&&ctx){tickN++;if(tickN%24===0){const bd=60/S.bpm,ours=(ctx.currentTime-startT)/bd,ext=tickN/24,err=ours-ext;if(Math.abs(err)<.5&&Math.abs(err)>.004){const d=err*bd*.5;startT+=d;nextT+=d}}}liveDot();return}
    if(st===0xFA||st===0xFB){if(cfg.follow){if(!playing)play();extRun=true;tickN=0}return}if(st===0xFC){extRun=false;if(cfg.follow&&playing)play();return}
    if(window.KEYSX&&KEYSX.midi(st,d))return;const ty=st&0xF0;if(ty===0x90&&d[2]>0){window.__kb&&__kb.midiNote(d[1],.25+.75*d[2]/127,true);liveDot()}else if(ty===0x80||(ty===0x90&&d[2]===0)){window.__kb&&__kb.midiNote(d[1],0,false)}
    else if(ty===0xB0){liveDot();if(window.MLX&&MLX.cc(st&15,d[1],d[2]))return;if(d[1]===64)window.__kb&&__kb.sustain(d[2]>=64)}}
  let ld=0;function liveDot(){const b=$('#midiBtn');if(!b)return;b.classList.add('live');clearTimeout(ld);ld=setTimeout(()=>b.classList.remove('live'),400)}
  function status(){const b=$('#midiBtn');if(b)b.classList.toggle('sync',!!(acc&&(cfg.follow||cfg.clockOut)));const kbm=$('#kbMidi');if(kbm)kbm.classList.toggle('on',!!acc)}
  const X={get notesOut(){return !!(out&&cfg.notesOut)},
    start(t){if(out&&cfg.clockOut&&!cfg.follow){try{out.send([0xFA],perf(t))}catch(e){globalThis.__el&&globalThis.__el(e)}}},
    stop(){if(out&&cfg.clockOut&&!cfg.follow){try{out.send([0xFC]);}catch(e){globalThis.__el&&globalThis.__el(e)}}if(out&&cfg.notesOut){try{for(let c=0;c<16;c++)out.send([0xB0|c,123,0])}catch(e){globalThis.__el&&globalThis.__el(e)}}},
    step(t,sd){if(!(out&&cfg.clockOut)||cfg.follow)return;try{for(let k=0;k<6;k++)out.send([0xF8],perf(t+k*sd/6))}catch(e){globalThis.__el&&globalThis.__el(e)}},
    note(i,t,vel,note,len){const id=TRACKS[i].id;let ch,n;const _r=window.TEX&&TEX.route(id,TRACKS[i].mel,note);if(_r===false)return;if(_r){ch=_r.ch;n=_r.n}else if(TRACKS[i].mel){ch=CH[id];n=note}else{ch=9;n=DRUM[id]}if(n==null||ch==null)return;const v=clamp(Math.round(vel*127),1,127);
      try{out.send([0x90|ch,n,v],perf(t));out.send([0x80|ch,n,0],perf(t+Math.max(.03,len*.9)))}catch(e){globalThis.__el&&globalThis.__el(e)}},
    panel};
  X.connect=connect;X.repaint=()=>{if(panelEl)paint()};window.MIDIX=X;
  async function panel(){if(panelEl){close();return}if(has)await connect();panelEl=document.createElement('div');panelEl.className='mp';panelEl.setAttribute('role','dialog');panelEl.setAttribute('aria-label','MIDI');document.body.appendChild(panelEl);paint();
    setTimeout(()=>document.addEventListener('pointerdown',outside,true),0)}
  function outside(e){if(panelEl&&!panelEl.contains(e.target)&&!e.target.closest('#midiBtn,#kbMidi'))close()}
  function close(){if(!panelEl)return;panelEl.remove();panelEl=null;document.removeEventListener('pointerdown',outside,true)}
  function paint(){if(!panelEl)return;const ins=acc?[...acc.inputs.values()]:[],outs=acc?[...acc.outputs.values()]:[];
    const tg=(k,l,sub)=>`<button class="tg${cfg[k]?' on':''}" data-k="${k}"><span>${l}<small>${sub}</small></span><i></i></button>`;
    let h=`<h3>MIDI & synk<button id="mpX" aria-label="Stäng">×</button></h3>`;
    if(!has){h+=`<div class="st">Den här webbläsaren saknar Web MIDI.</div><div class="note"><b>MIDI fungerar i Chrome eller Edge på dator.</b> Safari på iPhone och iPad har inte Web MIDI – där kommer MIDI och Ableton Link i den riktiga iPhone-appen.</div>`}
    else if(denied){h+=`<div class="st">MIDI är blockerat på den här sidan.</div><div class="note"><b>Claudes förhandsvisning kör appen i en ram som inte får använda MIDI.</b> Öppna webbversionen på en egen adress i Chrome eller Edge – då fungerar ingång, utgång, klocka och noter. MIDI fungerar också i Mac- och iPad-appen.</div>`}
    else{h+=`<div class="st">${ins.length||outs.length?ins.length+' in · '+outs.length+' ut'+(cfg.follow&&extBpm?' · extern klocka <span class="bpmx">'+extBpm.toFixed(1)+'</span> bpm':''):'Inga MIDI-enheter hittades. Koppla in ett keyboard eller slå på IAC-bussen på Macen.'}</div>`;
      h+=`<label>ingång</label><select id="mpIn"><option value="">alla ingångar</option>${ins.map(d=>`<option value="${d.id}"${d.id===cfg.inId?' selected':''}>${esc(d.name)}</option>`).join('')}</select>`;
      h+=`<label>utgång</label><select id="mpOut"><option value="">ingen</option>${outs.map(d=>`<option value="${d.id}"${d.id===cfg.outId?' selected':''}>${esc(d.name)}</option>`).join('')}</select>`;
      h+=tg('follow','följ extern klocka','tempo, start och stopp från Ableton, OP-XY, EP-133 …');if(cfg.follow&&window.CLK)h+=CLK.panelHTML();
      h+=tg('clockOut','skicka klocka','SEQ.3 styr tempot · start/stopp skickas med');
      h+=tg('notesOut','skicka noter','bass k1 · keys k2 · lead k3 · pad k4 · trummor k10');
      h+=`<button class="tg mlt${window.MLX&&MLX.on?' on':''}" id="mpLearn"><span>midi learn<small>tryck på en ratt här · vrid på din controller</small></span><i></i></button>`;
      const MP=window.MLX?MLX.list():[];if(MP.length)h+=`<label>kopplingar · ${MP.length}</label><div class="mlist">${MP.map((m,ix)=>`<div><b>cc ${m.cc}</b><small>k${m.ch+1}</small><span>${esc(m.label)}</span><button data-x="${ix}" aria-label="Ta bort">×</button></div>`).join('')}<button class="mclr" id="mpClr">rensa alla</button></div>`;
      const inN=(ins.find(d=>d.id===cfg.inId)||{}).name,outN=(outs.find(d=>d.id===cfg.outId)||{}).name;
      if(cfg.follow&&cfg.clockOut)h+=`<div class="note warn">Följ och skicka klocka samtidigt: SEQ.3 följer och skickar ingen egen klocka.</div>`;
      if(inN&&outN&&inN===outN)h+=`<div class="note warn">Samma enhet in och ut kan ge eko. Välj olika bussar.</div>`;
      h+=`<div class="note"><b>Med Ableton Live (Mac):</b> slå på IAC-drivern i Ljud-MIDI-inställningar. I Live → Inställningar → Link, Tempo & MIDI: sätt <b>Sync</b> på IAC som utgång om SEQ.3 ska följa Live, eller som ingång om Live ska följa SEQ.3.</div>`}
    h+=`<div class="note"><b>Ableton Link</b> kräver nätverksåtkomst som en webbsida inte får. Det kommer i den riktiga iPhone-appen via Abletons LinkKit. Till dess fungerar MIDI-klockan ovan.</div>`;
    panelEl.innerHTML=h;$('#mpX').onclick=close;if(window.CLK&&CLK.bindPanel)CLK.bindPanel(panelEl);
    const si=$('#mpIn'),so=$('#mpOut');if(si)si.onchange=()=>{cfg.inId=si.value;saveCfg();bind()};if(so)so.onchange=()=>{cfg.outId=so.value;saveCfg();bind();paint()};
    const lb=$('#mpLearn');if(lb)lb.onclick=()=>{MLX.toggle();close()};
    panelEl.querySelectorAll('.mlist [data-x]').forEach(b=>b.onclick=()=>{MLX.remove(+b.dataset.x);paint()});const mc=$('#mpClr');if(mc)mc.onclick=()=>{MLX.clear();paint()};
    panelEl.querySelectorAll('.tg[data-k]').forEach(b=>b.onclick=()=>{const k=b.dataset.k;cfg[k]=cfg[k]?0:1;if(k==='follow'){ticks=[];extBpm=0}saveCfg();bind();paint();
      toast({follow:'Följer extern klocka',clockOut:'Skickar MIDI-klocka',notesOut:'Skickar noter'}[k]+(cfg[k]?' · på':' · av'))})}
  const esc=x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  $('#midiBtn').onclick=panel;
  if(has&&(cfg.follow||cfg.clockOut||cfg.notesOut||cfg.inId)){navigator.permissions&&navigator.permissions.query({name:'midi'}).then(p=>{if(p.state==='granted')connect()}).catch(()=>{})}
  setInterval(()=>{if(panelEl&&cfg.follow)paint()},1500);
})();



