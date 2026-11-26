/* ---------- compact tracker (computer) ---------- */
const TRK={on:(()=>{try{return localStorage.getItem('blonda.duo.trk')!=='0'}catch(e){return true}})(),bar:0,fol:true,key:'',row:-1};
const trkBox=$d('.d-tr'),trkHead=$d('.d-tc');
const nName=n=>STX_NN[((n%12)+12)%12]+(Math.floor(n/12)-1);
const DAB=['BD','SD','CP','HH','OH','PC'];
trkHead.innerHTML='<span></span>'+DR.map((i,k)=>`<span style="--c:${DC[i]}" title="${TRACKS[i].name}"><i></i>${DAB[k]}</span>`).join('')+[['ack','ackord'],['sub','sub'],['klo','topp']].map(([l,n])=>`<span style="--c:${LC[l]}"><i></i>${n}</span>`).join('');
const trkVis=()=>TRK.on&&DUO.open&&getComputedStyle($d('.d-trk')).display!=='none';
function trkSet(on){TRK.on=on;try{localStorage.setItem('blonda.duo.trk',on?'1':'0')}catch(e){globalThis.__el&&globalThis.__el(e)}el.classList.toggle('trk',on);TRK.key='';draw();trkPaint(true)}
el.classList.toggle('trk',TRK.on);
$d('[data-trk]').onclick=()=>trkSet(!TRK.on);
$d('[data-fol]').onclick=()=>{TRK.fol=!TRK.fol;trkPaint(true)};
el.querySelectorAll('[data-bar]').forEach(b=>b.onclick=()=>{TRK.bar=+b.dataset.bar;TRK.fol=false;trkPaint(true)});
/* rows: what the Starter plays in each step of the current bar (the plan is 64 steps: 4 bars), the drums loop their pattern */
function trkPaint(force){if(!trkVis())return;const pat=S.pats[S.pat],P=stx(),g=hG(),gb=g>=0?((g%64)+64)%64:-1;
  if(TRK.fol&&gb>=0)TRK.bar=gb>>4;
  let pl=null;try{pl=stxPlanCached()}catch(e){globalThis.__el&&globalThis.__el(e)}
  const key=[TRK.bar,TRK.fol,JSON.stringify(pat.slice(0,6).map(r=>r.map(c=>c.v).join(''))),S.mute.slice(0,6).join(''),P.on,P.lay.ack,P.lay.sub,P.lay.klo,pl?pl.steps.length+':'+(pl.ch||[]).map(c=>c.name).join(','):'',P.root].join('|');
  if(force||key!==TRK.key){TRK.key=key;let h='';
    /* the Starter's held notes: a step inside a note shows a thin line */
    const held={ack:new Array(64).fill(0),sub:new Array(64).fill(0),klo:new Array(64).fill(0)};
    if(pl&&P.on)for(let q=0;q<64;q++){const ev=pl.steps[q];if(!ev)continue;['ack','sub','klo'].forEach(l=>{if(ev[l]&&P.lay[l])for(let k=1;k<(ev[l].l||1)&&q+k<64;k++)held[l][q+k]=1})}
    for(let r=0;r<16;r++){const q=TRK.bar*16+r;h+=`<div class="d-r" data-q="${q}"><b>${(q).toString(16).toUpperCase().padStart(2,'0')}</b>`;
      DR.forEach(i=>{const row=pat[i],c=row[q%row.length]||{v:0},mu=S.mute[i]?' k-mu':'';h+=`<span class="dc${c.v===2?' k-ac':c.v?' k-on':''}${mu}" data-i="${i}" data-s="${q%row.length}" style="--c:${DC[i]}">${c.v===2?'X':c.v?'x':'·'}</span>`});
      const ev=pl&&P.on?pl.steps[q]:null;
      const cellS=(l,txt)=>`<span class="sc ${txt?'k-st':held[l][q]?'k-hd':''}" data-l="${l}" data-q="${q}" style="--c:${LC[l]}">${txt||(held[l][q]?'│':'·')}</span>`;
      h+=cellS('ack',ev&&ev.ack&&P.lay.ack?((pl.ch[ev.ci]||{}).name||'♪'):'');
      h+=cellS('sub',ev&&ev.sub&&P.lay.sub?nName(ev.sub.n):'');
      h+=cellS('klo',ev&&ev.klo&&P.lay.klo?nName(ev.klo.n):'');
      h+='</div>'}
    trkBox.innerHTML=h;TRK.row=-1;
    el.querySelectorAll('[data-bar]').forEach(b=>b.classList.toggle('on',+b.dataset.bar===TRK.bar));$d('[data-fol]').classList.toggle('on',TRK.fol)}
  el.querySelectorAll('[data-bar]').forEach(b=>b.classList.toggle('pl',gb>=0&&(gb>>4)===+b.dataset.bar));
  const row=gb>=0&&(gb>>4)===TRK.bar?gb&15:-1;if(row!==TRK.row){const o=trkBox.children[TRK.row];if(o)o.classList.remove('pl');const n=trkBox.children[row];if(n)n.classList.add('pl');TRK.row=row}}
/* click a drum cell = on/off, shift- or right-click = accent */
trkBox.addEventListener('pointerdown',e=>{const c=e.target.closest('.dc');if(!c)return;e.preventDefault();const i=+c.dataset.i,st=+c.dataset.s,cell=S.pats[S.pat][i][st];if(!cell)return;
  push();const acc=e.shiftKey||e.button===2;cell.v=acc?(cell.v===2?1:2):(cell.v?0:1);if(cell.v&&cell.n==null)cell.n=57;initAudio();ctx.resume();commit();trkPaint(true)});
trkBox.addEventListener('contextmenu',e=>{if(e.target.closest('.dc,.sc'))e.preventDefault()});
