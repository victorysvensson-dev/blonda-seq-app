/* ================= header: ♪ (förlyssning) and rörelser next to the tempo; double-click the tempo to type it ================= */
(()=>{const bpm=document.querySelector('header .bpm');if(!bpm)return;
  const wrap=document.createElement('div');wrap.className='hx';
  wrap.innerHTML=`<button id="prevBtn" class="hx-b" title="Förlyssning · låter när du rör reglage och väljer spår"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 12.2V3.5l7-1.5v8.7"/><circle cx="4.3" cy="12.2" r="1.8"/><circle cx="11.3" cy="10.7" r="1.8"/></svg><i></i></button>
    <button id="motBtn" class="hx-b" title="Rörelser · inspelade rattrörelser"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1.5 11c2-6 4-6 6.5-2s4.5 4 6.5-2"/></svg><b>0</b></button>`;
  const hw=document.createElement('div');hw.className='hxw';bpm.parentNode.insertBefore(hw,bpm);hw.appendChild(wrap);hw.appendChild(bpm);
  const pb=wrap.querySelector('#prevBtn'),paintP=()=>{pb.classList.toggle('off',!prevOn());pb.setAttribute('aria-pressed',prevOn()?'true':'false')};paintP();
  pb.onclick=()=>{const on=!prevOn();try{localStorage.setItem('blonda.prev',on?'1':'0')}catch(e){globalThis.__el&&globalThis.__el(e)}paintP();toast(on?'Förlyssning på · det låter när du rör reglage':'Förlyssning av · tyst när du rör reglage')};
  let pop=null;const mb=wrap.querySelector('#motBtn');
  mb.onclick=e=>{e.stopPropagation();if(pop){pop.remove();pop=null;return}pop=document.createElement('div');pop.className='mo-pop';
    pop.innerHTML='<div class="mo-ph"><b>rörelser</b><small>● + ▶ och vrid på en ratt · × tar bort · ta tag i ratten för att ta över</small></div><div class="mo-list"></div>';
    document.body.appendChild(pop);const r=mb.getBoundingClientRect(),w=pop.offsetWidth;pop.style.top=(r.bottom+8)+'px';pop.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+'px';motList()};
  document.addEventListener('pointerdown',e=>{if(pop&&!pop.contains(e.target)&&e.target!==mb&&!mb.contains(e.target)){pop.remove();pop=null}});
  setTimeout(motList,600);
  /* type the tempo: double-click (or double-tap) the number */
  const num=document.getElementById('bpmNum');let lt=0;
  const edit=()=>{if(num.querySelector('input'))return;const inp=document.createElement('input');inp.type='number';inp.min=60;inp.max=180;inp.step=1;inp.value=Math.round(S.bpm);inp.className='bpm-in';
    num.appendChild(inp);inp.focus();inp.select();let fin=false;const done=ok=>{if(fin||!inp.isConnected)return;fin=true;const v=parseFloat(String(inp.value).replace(',','.'));inp.remove();if(ok&&isFinite(v)){setBpm(v);if(v<60||v>180)toast('Tempot går mellan 60 och 180 bpm')}else setBpm(S.bpm)};
    inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')done(true);if(e.key==='Escape')done(false)});inp.addEventListener('blur',()=>done(true));inp.addEventListener('pointerdown',e=>e.stopPropagation())};
  num.addEventListener('dblclick',e=>{e.preventDefault();edit()});
  num.addEventListener('pointerup',e=>{if(e.pointerType==='mouse')return;const n=performance.now();if(n-lt<320){lt=0;edit()}else lt=n});
  num.title='Dra upp/ner · dubbelklicka för att skriva in tempot'})();

