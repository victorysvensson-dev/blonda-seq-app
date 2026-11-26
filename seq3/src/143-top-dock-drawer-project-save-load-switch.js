/* ---------- top dock drawer: project, save/load, switch song, song mode, tap tempo ---------- */
(function dockMod(){const dock=$('#dock'),slot=$('#dockSlot'),h=$('#dockH'),inn=$('#dockIn');let o=0,open=false;
  const measure=()=>{const was=dock.style.width;dock.classList.add('meas');const pats=dock.querySelector('.pats');const w=Math.ceil(pats.getBoundingClientRect().width)+28,hh=Math.ceil(pats.getBoundingClientRect().height)+12+20;
    if(innerWidth>=720)slot.style.setProperty('--dw0',w+'px');slot.style.setProperty('--dh0',hh+'px');dock.style.setProperty('--dw0',innerWidth>=720?w+'px':'100%');dock.classList.remove('meas');
    requestAnimationFrame(()=>document.documentElement.style.setProperty('--dockB',Math.round(slot.getBoundingClientRect().bottom)+'px'))};
  addEventListener('resize',measure);setTimeout(measure,50);setTimeout(measure,600);document.fonts&&document.fonts.ready.then(measure);
  const set=v=>{o=clamp(v,0,1);dock.style.setProperty('--o',o)};
  const I={save:'<path d="M3 2.5h8l2.5 2.5v8.5h-10.5z"/><path d="M5 2.5v4h6v-4M5 13.5v-4h6v4"/>',plus:'<path d="M8 3v10M3 8h10"/>',dup:'<rect x="5" y="5" width="8.5" height="8.5" rx="2"/><path d="M3 10.5V3.5A1 1 0 0 1 4 2.5h6.5"/>',
    exp:'<path d="M8 2v9M4.5 7.5 8 11l3.5-3.5M3 10v3.5h10V10"/>',imp:'<path d="M8 11V2M4.5 5.5 8 2l3.5 3.5M3 10v3.5h10V10"/>',all:'<rect x="2.5" y="3" width="11" height="10" rx="2"/><path d="M2.5 6.5h11"/>'};
  const ic=k=>`<svg viewBox="0 0 16 16">${I[k]}</svg>`;
  function build(){const p=curP();if(!p)return;inn.innerHTML=`<div class="dk-name"><input id="dkName" maxlength="40" aria-label="Project name" spellcheck="false"><small id="dkMeta"></small></div>
    <div class="dk-row"><button class="go" data-a="save">${ic('save')}spara</button><button data-a="new">${ic('plus')}ny</button><button data-a="dup">${ic('dup')}duplicera</button>
      <button data-a="exp">${ic('exp')}exportera</button><button data-a="imp">${ic('imp')}importera</button><button data-a="wav">${ic('exp')}exportera ljud</button><button data-a="mid">${ic('exp')}exportera midi</button><button data-a="all">${ic('all')}alla projekt</button></div>
    <div class="dk-lab">byt låt</div><div class="dk-songs" id="dkSongs"></div>
    <div class="dk-lab">spela</div><div class="dk-row"><button data-a="song" id="dkSong">låtläge</button><button data-a="tap" class="dk-tap">tap tempo <b id="dkTap">${Math.round(S.bpm)}</b></button><button data-a="bpm-" aria-label="Sänk tempo">−</button><button data-a="bpm+" aria-label="Höj tempo">+</button></div>`;
    const nm=$('#dkName');nm.value=p.name;nm.oninput=()=>{p.name=nm.value.trim()||'Utan namn';libWrite();$('#projName').textContent=p.name.toLowerCase();songs()};nm.onkeydown=e=>{if(e.key==='Enter')nm.blur()};
    $('#dkMeta').textContent='sparat '+fmtD(p.t);songs();paintSong();
    inn.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>act(b.dataset.a))}
  function songs(){const box=$('#dkSongs');if(!box)return;box.innerHTML='';LIB.slice().sort((a,b)=>b.t-a.t).forEach(p=>{const b=document.createElement('button');b.className='dk-song'+(p.id===CUR?' cur':'');
      b.innerHTML=`<b></b><small>${fmtD(p.t)} · ${p.data.bpm?Math.round(p.data.bpm):'—'} bpm</small><canvas></canvas>`;b.querySelector('b').textContent=p.name;thumb(b.querySelector('canvas'),p.data);
      b.onclick=()=>{if(p.id===CUR){toast('Redan öppet');return}libSync();loadProject(p);toast('Öppnade '+p.name);build()};box.appendChild(b)})}
  function paintSong(){const b=$('#dkSong');if(b)b.classList.toggle('on',!!S.song)}
  let taps=[];
  function act(a){if(a==='save'){libSync();$('#dkMeta').textContent='sparat '+fmtD(curP().t);songs();toast('Sparat · '+curP().name)}
    else if(a==='new'){libSync();const p={id:pjId(),name:'Project '+(LIB.length+1),t:Date.now(),c:Date.now(),data:freshData()};LIB.push(p);loadProject(p);build();toast('Nytt tomt projekt')}
    else if(a==='dup'){libSync();const src=curP(),p={id:pjId(),name:dupName(src.name),t:Date.now(),c:Date.now(),data:JSON.parse(JSON.stringify(src.data))};LIB.push(p);libWrite();loadProject(p);build();toast('Duplicerat · '+p.name)}
    else if(a==='exp'){libSync();pjBuild();pjF=pjFocus=Math.max(0,pjOrder.findIndex(p=>p.id===CUR));$('#pjExp').onclick()}
    else if(a==='imp'){const f=$('#pjFile'),prev=f.onchange;f.onchange=async e=>{f.onchange=prev;await prev(e);build()};f.click()}
    else if(a==='all'){toggle(false);openProj()}
    else if(a==='song'){const sb=$('#songBtn');if(sb)sb.click();setTimeout(paintSong,50)}
    else if(a==='bpm-'||a==='bpm+'){setBpm(Math.round(S.bpm)+(a==='bpm+'?1:-1));$('#dkTap').textContent=Math.round(S.bpm)}
    else if(a==='tap'){const n=performance.now();taps=taps.filter(t=>n-t<2200);taps.push(n);if(taps.length>=3){const d=(taps[taps.length-1]-taps[0])/(taps.length-1);setBpm(60000/d)}$('#dkTap').textContent=Math.round(S.bpm)}}
  function toggle(v){open=v;dock.classList.toggle('open',v);setTimeout(()=>document.documentElement.style.setProperty('--dockB',Math.round((open?dock:slot).getBoundingClientRect().bottom)+'px'),v?560:0);h.setAttribute('aria-expanded',v);$('#dockD').setAttribute('aria-hidden',!v);if(v){libSync();build()}set(v?1:0)}
  /* drag the handle down (or tap it) */
  let y0=null,o0=0,moved=0;
  h.addEventListener('pointerdown',e=>{e.preventDefault();h.setPointerCapture(e.pointerId);y0=e.clientY;o0=o;moved=0;dock.classList.add('drag','open');if(!open)build()});
  h.addEventListener('pointermove',e=>{if(y0==null)return;const dy=e.clientY-y0;moved=Math.max(moved,Math.abs(dy));set(o0+dy/Math.min(520,innerHeight*.7))});
  const up=()=>{if(y0==null)return;y0=null;dock.classList.remove('drag');dock.classList.toggle('open',open);if(moved<5)toggle(!open);else toggle(o>.35)};h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up);
  document.addEventListener('pointerdown',e=>{if(open&&!dock.contains(e.target)&&!e.target.closest('.proj'))toggle(false)},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&open)toggle(false)});
  window.__dock={toggle,isOpen:()=>open};
})();

