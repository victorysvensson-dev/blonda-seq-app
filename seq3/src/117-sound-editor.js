/* ---------------- sound editor ---------------- */
function dblTap(el){const n=performance.now(),d=n-(el._lt||0)<320;el._lt=d?0:n;return d}
let dedT=-1;const dedK=[];
function openEditor(i){const t=TRACKS[i];select(i);
  if(t.mel){closeEditor();if(synT!==i){synT=i;refreshInst()}if(typeof setFull==='function'&&!synCard.closest('.fullhost'))setFull(synCard);toast(t.name+' · synth');return}
  dedT=i;const box=$('#ded'),key=t.id==='ohat'?'hat':t.id;box.style.setProperty('--tc',t.hex);$('#dedDot').style.setProperty('--tc',t.hex);$('#dedDot').dataset.ti=i;$('#dedDot').textContent=trkNo(i);
  $('#dedName').textContent=t.name;$('#dedSub').textContent=t.sub.toLowerCase()+' · dubbeltryck på ett spår för att öppna';
  const mods=$('#dedMods');mods.innerHTML='';(DKM[key]||[]).forEach(([id,name,tag])=>{const b=document.createElement('button');b.className='dmod';b.innerHTML=`<b>${name}</b><small>${tag}</small>`;
    b.classList.toggle('on',(S.dk[t.id]||'')===id);b.onclick=()=>{pushHist();if(id)S.dk[t.id]=id;else delete S.dk[t.id];[...mods.children].forEach(x=>x.classList.toggle('on',x===b));save();audition(i)};mods.appendChild(b)});
  {const cur=(S.dk[t.id]||'').startsWith('smp:')&&SMP.get(S.dk[t.id].slice(4)),b=document.createElement('button');b.className='dmod smp'+(cur?' on':'');b.innerHTML=`<b>${cur?'':'+ '}sample</b><small></small>`;b.querySelector('small').textContent=cur?cur.name:'från biblioteket';b.onclick=()=>{closeEditor();openLib('hit',{type:'drum',i})};mods.appendChild(b)}
  const kb=$('#dedKnobs');kb.innerHTML='';dedK.length=0;
  [['level','nivå',0,1,v=>pct(v)],['tune','tune',-12,12,v=>(v>0?'+':'')+Math.round(v)],['decay','decay',0,1,v=>pct(v)],['tone','ton',0,1,v=>pct(v)],['pan','pan',-1,1,v=>Math.abs(v)<.03?'C':(v<0?'L':'R')+Math.round(Math.abs(v)*100)],['echo','echo',0,1,v=>pct(v)],['space','space',0,1,v=>pct(v)]]
   .forEach(([k,label,min,max,fmt])=>{dedK.push(knob(kb,{label,min,max,def:DEF_P[t.id][k],color:t.hex,fmt,ml:'p.'+t.id+'.'+k,mll:label.toLowerCase()+' · '+t.name.toLowerCase(),get:()=>S.params[t.id][k],set:v=>{S.params[t.id][k]=v;applyTrack(i);save();renderSnd();renderDial()}}))});
  dedK.forEach((k,n)=>k.style.setProperty('--kc',t.hex));
  $('#dedMute').classList.toggle('on',!!S.mute[i]);
  box.hidden=false;$('#dedScrim').hidden=false;box.classList.remove('pop');void box.offsetWidth;box.classList.add('pop')}
function closeEditor(){$('#ded').hidden=true;$('#dedScrim').hidden=true;dedT=-1}
$('#dedX').onclick=closeEditor;$('#dedScrim').onclick=closeEditor;
$('#dedPlay').onclick=()=>{if(dedT>=0)audition(dedT,1)};
$('#dedMute').onclick=()=>{const i=dedT;if(i<0)return;S.mute[i]=S.mute[i]?0:1;applyAll();renderSel();save();$('#dedMute').classList.toggle('on',!!S.mute[i]);toast(TRACKS[i].name+(S.mute[i]?' mutad':' på'))};
$('#dedReset').onclick=()=>{const i=dedT;if(i<0)return;pushHist();const id=TRACKS[i].id;S.params[id]=JSON.parse(JSON.stringify(DEF_P[id]));delete S.dk[id];if(TRACKS[i].dm)S.dk[id]=TRACKS[i].dm;applyTrack(i);save();renderSnd();renderDial();openEditor(i);audition(i)};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dedT>=0)closeEditor()});

