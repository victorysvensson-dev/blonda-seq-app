/* ---- where the tracks are shown ---- */
window._TRKROW=[...gridEl.children];_TRKROW.forEach((r,i)=>{r.dataset.ti=i;r.classList.toggle('mrow',!!TRACKS[i].mel)});
padEls.forEach((p,i)=>{if(p)p.dataset.ti=i});tagsEl&&[...tagsEl.children].forEach((b,i)=>b.dataset.ti=i);
{const o=document.getElementById('orbTrk');if(o)[...o.children].forEach((b,i)=>b.dataset.ti=i)}

/* the synth module: a card of its own (in the page markup, after the drum pattern) with the synth tracks' rows */
const smCard=document.querySelector('.card[data-card="synths"]');
{const r=smCard.querySelector('.sm-rule');for(let s=0;s<16;s++){const sp=document.createElement('span');sp.textContent=s+1;r.appendChild(sp)}
  /* the drum pattern gets its own + / − */
  const da=document.createElement('div');da.className='actions trk-act';da.innerHTML='<button class="chip" data-add="0">+ trumma</button><button class="chip ic" data-del="0" title="Ta bort sista trumspåret" aria-label="Ta bort sista trumspåret">−</button><span class="trk-hint"></span>';
  gridEl.insertAdjacentElement('afterend',da)}
document.querySelectorAll('.trk-act [data-add]').forEach(b=>b.onclick=()=>trkAdd(b.dataset.add==='1'));
document.querySelectorAll('.trk-act [data-del]').forEach(b=>b.onclick=()=>trkDel(b.dataset.del==='1'));
const smGridEl=smCard.querySelector('#sgrid');
/* v234: the synth rows live in their own card since the synth module was split off, but only the drum pattern listened for
   taps – tapping a synth step did nothing. The synth card's grid gets the same step handling as the drum pattern. */
bindSteps(smGridEl,el=>+el.dataset.i,true);
/* the synth card's segment gets one button per synth track */
{const seg=document.getElementById('synSeg');if(seg){TRK_S.forEach(i=>{let b=seg.querySelector(`button[data-t="${i}"]`);if(!b){b=document.createElement('button');b.dataset.t=i;b.textContent=TRACKS[i].name.toLowerCase();
    b.onclick=()=>{synT=i;swapAnim();refreshInst();synPreview()};seg.appendChild(b)}b.dataset.ti=i})}}

/* mixer: drums, then synths, then whatever comes after the channels (buses, master) */
let trkMixBusy=false;
function trkMixOrder(){const mx=document.getElementById('mx');if(!mx||trkMixBusy)return;const strips=[...mx.querySelectorAll(':scope>.ms[data-ti]')];if(!strips.length)return;
  const want=TRK_D.concat(TRK_S).map(i=>strips.find(e=>+e.dataset.ti===i)).filter(Boolean);if(want.every((e,k)=>strips[k]===e))return;
  trkMixBusy=true;const first=[...mx.children].find(e=>!strips.includes(e))||null;want.forEach(e=>mx.insertBefore(e,first));trkMixBusy=false}
{const mx=document.getElementById('mx');if(mx)new MutationObserver(()=>trkMixOrder()).observe(mx,{childList:true})}
const trkCss=document.createElement('style');trkCss.id='trkCss';document.head.appendChild(trkCss);
let trkKeyL='';
function trkLayout(){const c=trkCfg(),k=c.nd+'|'+c.ns;
  /* rows: drums in the pattern, synths in the module, in track order */
  TRK_D.forEach(i=>gridEl.appendChild(_TRKROW[i]));TRK_S.forEach(i=>smGridEl.appendChild(_TRKROW[i]));
  /* pads: the drum tracks (a 4×4 for 13–16) */
  TRK_D.forEach(i=>padEls[i]&&padsEl.appendChild(padEls[i]));padsEl.dataset.n=c.nd;
  /* full screen is a classic 4×4 like an MPC: pad 1 bottom left, the drum tracks in use, then the six glitch pads; more drums = more rows */
  {const gx=[...padsEl.querySelectorAll(':scope>.gxp')];gx.forEach(p=>padsEl.appendChild(p));const vis=trkDrums().map(i=>padEls[i]).filter(Boolean).concat(gx),rows=Math.ceil(vis.length/4);
    padsEl.style.setProperty('--mrows',rows);vis.forEach((p,k)=>{p.style.setProperty('--mr',rows-(k>>2));p.style.setProperty('--mc',(k&3)+1);p.dataset.n=k+1})}
  trkMixOrder();
  /* the orbit's track chips: drums, then synths */
  {const o=document.getElementById('orbTrk');if(o){const by={};[...o.children].forEach(b=>{if(b.dataset.ti!=null)by[b.dataset.ti]=b});TRK_D.concat(TRK_S).forEach(i=>{if(by[i])o.appendChild(by[i])})}}
  if(k!==trkKeyL){trkKeyL=k;
    trkCss.textContent=TRACKS.map((t,i)=>trkOn(i)?'':`[data-ti="${i}"]`).filter(Boolean).join(',')+'{display:none!important}'+
      /* the pads card is for drums; synths are played on the keyboard */
      TRK_S.map(i=>`.pads [data-ti="${i}"]`).join(',')+'{display:none!important}'}
  smCard.querySelector('.sm-n').textContent=c.ns+' spår';
  document.querySelectorAll('.trk-act').forEach(a=>{const mel=!!a.querySelector('[data-add="1"]'),n=mel?c.ns:c.nd,mx=mel?TRK_MAX.ns:TRK_MAX.nd,mn=mel?TRK_MIN.ns:TRK_MIN.nd;
    a.querySelector('[data-add]').disabled=n>=mx;a.querySelector('[data-del]').disabled=n<=mn;a.querySelector('.trk-hint').textContent=n+' / '+mx})}
window.trkLayout=trkLayout;try{trkLayout()}catch(e){if(window.__errShow)__errShow('spår (layout): '+(e&&e.message||e)+' · '+((e&&e.stack)||'').split('\n')[1])}
/* follow the pattern letter in the module's caption */
{let lp=-1;setInterval(()=>{if(S.pat!==lp){lp=S.pat;const b=smCard.querySelector('.sm-pat');if(b)b.textContent='ABCD'[S.pat]||'A'}},200)}
/* undo / redo / load may change the number of tracks */
{let lk='';setInterval(()=>{const c=trkCfg(),k=c.nd+'|'+c.ns;if(k!==lk){lk=k;trkFix();trkLayout()}},250)}

{const css=document.createElement('style');css.textContent=`
.trk-act{margin-top:8px}
.trk-act .chip[disabled]{opacity:.35;pointer-events:none}
.trk-act .trk-hint{font:10px var(--f-mono);opacity:.5;letter-spacing:.04em;margin-left:4px;align-self:center}
.card.synmod{container-type:inline-size}
.fullhost .card[data-card="pads"] .pads{grid-template-rows:repeat(var(--mrows,4),auto)!important;max-width:min(100%,calc((100vh - 170px) * 5 / var(--mrows,4)))!important}
.pads[data-n="11"],.pads[data-n="12"]{grid-template-columns:repeat(6,minmax(0,1fr))}
.pads[data-n="13"],.pads[data-n="14"],.pads[data-n="15"],.pads[data-n="16"]{grid-template-columns:repeat(4,minmax(0,1fr))}`;
  document.head.appendChild(css)}
window.__tk={T:TRACKS,trig:(...a)=>trigger(...a),hit:i=>hitPad(i)};
