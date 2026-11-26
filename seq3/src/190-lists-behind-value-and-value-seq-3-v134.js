/* ================= Lists behind − value + and ‹ value › (SEQ.3 v134) =================
   Tap the value between two step buttons and a list opens with every choice, so you can jump straight to one instead of
   stepping. Known lists come from the app (Starter, Bris, Moog, SH-101, keyboard banks, the full synth, the DAW); for other
   −/+ values the list is read by stepping through once and going back. Choosing presses the same buttons the right number
   of times, so everything that normally happens on a step still happens. */
(()=>{
  const css=document.createElement('style');css.textContent=`
.pk-hot{cursor:pointer!important;text-decoration:underline dotted rgba(255,255,255,.35);text-underline-offset:4px}
.pk-pop{position:fixed;z-index:120;min-width:180px;max-width:min(340px,92vw);max-height:min(60vh,520px);display:flex;flex-direction:column;background:#1B1C1F;color:#EDEBE3;border-radius:12px;
  box-shadow:0 18px 50px -12px rgba(0,0,0,.7),inset 0 0 0 1px rgba(255,255,255,.09);font:500 11px var(--f-mono,ui-monospace,monospace);overflow:hidden;animation:pkIn .14s ease-out}
@keyframes pkIn{from{opacity:0;transform:translateY(-4px)}}
.pk-pop input{margin:8px 8px 4px;height:30px;border-radius:8px;border:0;background:rgba(255,255,255,.07);color:inherit;font:inherit;padding:0 10px;outline:none}
.pk-pop input:focus{box-shadow:inset 0 0 0 1px rgba(255,255,255,.3)}
.pk-l{overflow:auto;padding:4px;scrollbar-width:thin}
.pk-l button{display:flex;width:100%;align-items:center;gap:8px;text-align:left;padding:7px 10px;border-radius:7px;border:0;background:none;color:inherit;font:inherit;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pk-l button:hover,.pk-l button.kb{background:rgba(255,255,255,.08)}.pk-l button.on{background:#EDEBE3;color:#141516}.pk-l button.on::after{content:"●";margin-left:auto;font-size:8px}
.pk-g{padding:8px 10px 3px;font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(237,235,227,.4)}
.pk-ask{padding:10px;display:flex;flex-direction:column;gap:8px}.pk-ask small{color:rgba(237,235,227,.55)}.pk-ask input{margin:0}
.pk-ask div{display:flex;gap:6px;justify-content:flex-end}.pk-ask button{height:28px;padding:0 12px;border-radius:7px;border:0;font:inherit;cursor:pointer;background:rgba(255,255,255,.08);color:inherit}.pk-ask button.ok{background:#EDEBE3;color:#141516}
`;document.head.appendChild(css);
  let pop=null;const closePop=()=>{if(pop){pop.remove();pop=null}};
  addEventListener('pointerdown',ev=>{if(pop&&!pop.contains(ev.target))closePop()},true);
  addEventListener('keydown',ev=>{if(pop&&ev.key==='Escape'){ev.stopPropagation();ev.preventDefault();closePop()}},true);
  const place=(p,a)=>{const r=a.getBoundingClientRect(),w=p.offsetWidth,h=p.offsetHeight;let x=r.left+r.width/2-w/2,y=r.bottom+6;if(y+h>innerHeight-8)y=Math.max(8,r.top-h-6);p.style.left=Math.max(8,Math.min(innerWidth-w-8,x))+'px';p.style.top=y+'px'};
  /* the list itself */
  function show(anchor,labels,cur,onPick,groups){closePop();pop=document.createElement('div');pop.className='pk-pop';const many=labels.length>12;
    pop.innerHTML=(many?'<input placeholder="sök…" aria-label="Sök">':'')+'<div class="pk-l"></div>';document.body.appendChild(pop);const L=pop.querySelector('.pk-l');
    const draw=q=>{let h='',lg=null;labels.forEach((l,i)=>{if(q&&!String(l).toLowerCase().includes(q))return;if(groups&&groups[i]!==lg){lg=groups[i];h+=`<div class="pk-g">${lg}</div>`}
      h+=`<button data-i="${i}" class="${i===cur?'on':''}">${String(l).replace(/</g,'&lt;')}</button>`});L.innerHTML=h||'<div class="pk-g">inget hittades</div>'};draw('');
    L.onclick=ev=>{const b=ev.target.closest('[data-i]');if(!b)return;const i=+b.dataset.i;closePop();onPick(i)};
    const inp=pop.querySelector('input');if(inp){inp.oninput=()=>draw(inp.value.trim().toLowerCase());inp.onkeydown=ev=>{if(ev.key==='Enter'){const b=L.querySelector('[data-i]');if(b)b.click()}};setTimeout(()=>inp.focus(),20)}
    place(pop,anchor);const on=L.querySelector('.on');if(on)on.scrollIntoView({block:'center'})}
  function ask(anchor,title,def,cb){closePop();pop=document.createElement('div');pop.className='pk-pop';pop.innerHTML=`<div class="pk-ask"><small>${title}</small><input value="${String(def).replace(/"/g,'&quot;')}"><div><button data-x>avbryt</button><button class="ok" data-ok>spara</button></div></div>`;
    document.body.appendChild(pop);place(pop,anchor);const inp=pop.querySelector('input');setTimeout(()=>{inp.focus();inp.select()},20);
    const ok=()=>{const v=inp.value.trim();closePop();cb(v)};pop.querySelector('[data-ok]').onclick=ok;pop.querySelector('[data-x]').onclick=closePop;inp.onkeydown=ev=>{if(ev.key==='Enter')ok()}}
  window.pickShow=show;window.pickAsk=ask;
  /* containers that carry their own list: data-plist (JSON) + data-pcur, choosing fires a "pick" event with the index */
  window.pickOpen=(box,anchor)=>{let L=[];try{L=JSON.parse(box.dataset.plist)}catch(e){globalThis.__el&&globalThis.__el(e)}show(anchor||box,L,+box.dataset.pcur,i=>box.dispatchEvent(new CustomEvent('pick',{detail:i})))};

  const PREV=['−','-','‹','◀','–'],NEXT=['+','›','▶'];
  const isPrev=b=>b&&b.tagName==='BUTTON'&&PREV.includes(b.textContent.trim()),isNext=b=>b&&b.tagName==='BUTTON'&&NEXT.includes(b.textContent.trim());
  /* the value element of a stepper, or null */
  const valueOf=t=>{const el=t&&t.closest&&t.closest('b,span,em');if(!el||el.closest('.pk-pop'))return null;let v=el;for(let k=0;k<2&&v;k++){if(isPrev(v.previousElementSibling)&&isNext(v.nextElementSibling))return v;v=v.parentElement;if(v&&(v.tagName==='BUTTON'||v.classList.contains('sx-ctl')))break}return null};
  /* a path back to the stepper after the app re-draws it */
  const pathOf=el=>{const bx=el.parentElement;
    /* Starter controls: find them again by what they are, not where they sit (rows come and go) */
    if(bx&&bx.classList.contains('sx-ctl')){const lr=bx.closest('[data-lay]'),c=bx.closest('[data-card]');const sel=(c?'[data-card="'+c.dataset.card+'"] ':'')+(lr?'[data-lay="'+lr.dataset.lay+'"] ':'')+'.sx-ctl'+(bx.dataset.k?'[data-k="'+bx.dataset.k+'"]':'[data-a="'+bx.dataset.a+'"]')+'>b';return ['@'+sel]}
    const p=[];let n=el;while(n&&n!==document.body){if(n.id){p.unshift('#'+CSS.escape(n.id));break}const par=n.parentElement;if(!par)break;p.unshift(':scope>'+n.tagName.toLowerCase()+':nth-child('+([...par.children].indexOf(n)+1)+')');n=par}return p};
  const find=p=>{if(p.length===1&&p[0][0]==='@'){const L=[...document.querySelectorAll(p[0].slice(1))];return L.find(x=>x.offsetParent)||L[0]||null}let n=document;for(const s of p){if(s[0]==='#'){n=document.querySelector(s)}else n=n&&n.querySelector(s.replace(/^:scope>/,n===document?'':':scope>'));if(!n)return null}return n};
  const txt=v=>v?v.textContent.replace(/\s+/g,' ').trim():'';
  /* press next/prev until the value reads the wanted label */
  function goTo(path,want,dir,max){for(let k=0;k<max;k++){const v=find(path);if(!v)return;if(txt(v)===want)return;const b=dir>0?v.nextElementSibling:v.previousElementSibling;if(!b)return;b.click()}}
  /* read a list by stepping one way and back */
  function readList(path){const v0=find(path);if(!v0)return null;const start=txt(v0),up=[],down=[];let n=0,last=start;
    for(;n<48;n++){const v=find(path);if(!v)break;v.nextElementSibling.click();const t=txt(find(path));if(t===last||t===start)break;up.push(t);last=t}
    const cyc=txt(find(path))===start&&up.length>0;
    if(!cyc){for(let k=0;k<up.length;k++){const v=find(path);if(!v)break;v.previousElementSibling.click()}last=start;
      for(let m=0;m<48;m++){const v=find(path);if(!v)break;v.previousElementSibling.click();const t=txt(find(path));if(t===last||t===start)break;down.push(t);last=t}
      for(let k=0;k<down.length;k++){const v=find(path);if(!v)break;v.nextElementSibling.click()}}
    if(txt(find(path))!==start)goTo(path,start,1,60);return {labels:[...down.reverse(),start,...up],cyc}}
  /* lists the app knows */
  function known(v){const box=v.parentElement,card=v.closest('[data-card],[data-clone]');
    if(box.classList.contains('sx-ctl')){const P=typeof stx==='function'?stx():null;if(!P)return null;const k=box.dataset.k||box.dataset.a;
      if(k==='root'||k==='sr')return {labels:STX_NN,cyc:1};if(k==='mode')return {labels:['moll','dur'],cyc:1};
      if(k==='prog')return {labels:STX_BANK[P.mode].map(p=>p[0]),cyc:1};if(k==='rn')return {labels:Object.keys(STX_RH),cyc:1};if(k==='ch')return {labels:['bass','keys','lead','pad'],cyc:1};
      if(k==='arp')return {labels:STX_ARP,cyc:1};if(k==='form')return {labels:STX_FORMN,cyc:1};if(k==='vc')return {labels:['tät','vid'],cyc:1};if(k==='reg')return {labels:['låg','mellan','hög'],cyc:0};
      if(k==='oct')return {labels:['-2','-1','0','+1','+2'],cyc:0};if(k==='ar')return {labels:STX_ARL,cyc:1};if(k==='am')return {labels:STX_AM,cyc:1};if(k==='ao')return {labels:['1','2','3'],cyc:0};
      if(k&&k.startsWith('fol:'))return {labels:STX_FOL,cyc:1};
      /* sounds: some choices move a track to another engine, so the text can't be followed – count steps instead */
      if(k==='snd'&&typeof STX_POLY!=='undefined'){const lr=box.closest('[data-lay]'),lay=lr?lr.dataset.lay:'ack',top=!!box.dataset.k,L=(lay==='sub'?STX_SUBS:STX_POLY).concat(STX_ENG.map(e=>'e:'+e),STX_TRK),s=P.ls[lay].snd,
        cur=top?L.indexOf(s):L.indexOf(s.startsWith('e:')?'e:'+(S.inst[stxTrkOf(lay,s)]||s.slice(2)):s);return {labels:L.map(x=>stxSndName(x)),raw:L,cur,count:L.length}}
      return null}
    if(v.id==='brName'){const L=typeof BR_PRE!=='undefined'?BR_PRE:[];return {labels:L.map(p=>p[1]),groups:L.map(p=>p[0]),direct:i=>{const p=L[i];if(window.__bris&&__bris.load)__bris.load(p);else{Object.assign(engE('bris'),BR_DEF,p[2]);try{brisApplyAll()}catch(e){globalThis.__el&&globalThis.__el(e)}v.textContent=p[1];save()}}}}
    if(v.classList.contains('cl-name')){const c=v.closest('[data-clone]'),o=c&&window['__'+c.dataset.clone];if(o&&o.pre)return {labels:o.pre.map(p=>p[0]),direct:i=>o.load(o.pre[i])}}
    if(v.classList.contains('dw-nm')&&typeof ARR_NM!=='undefined')return {labels:ARR_NM,cyc:1};
    if(v.classList.contains('dw-bars'))return {labels:['1','2','4','8','12','16','24','32'],cyc:0};
    if(box.closest&&box.closest('.kc-bank')&&typeof BANKS!=='undefined')return {labels:BANKS.map((b,i)=>(i+1)+b[0]),cyc:1};
    return null}
  function openFor(v){const box=v.parentElement;if(box.dataset&&box.dataset.plist){window.pickOpen(box,v);return}
    const path=pathOf(v);let K=known(v);const cur0=txt(v);
    if(!K){if(!isPrev(v.previousElementSibling)||!['−','-','–'].includes(v.previousElementSibling.textContent.trim()))return;K=readList(path);if(!K||K.labels.length<2)return}
    const labels=K.labels.map(String),cur=K.count?K.cur:labels.indexOf(cur0);const v2=find(path)||v;
    show(v2,K.labels,cur,i=>{if(K.direct){K.direct(i);return}
      if(K.count){const n=K.count,c=Math.max(0,K.cur);let fw=((i-c)%n+n)%n;if(!fw&&K.cur<0)fw=n;const bw=K.cur<0?n+1:((c-i)%n+n)%n;
        /* go the way that passes fewest engine choices (each one would switch a track's engine on the way), then the shorter */
        const cross=(d,k)=>{let x=0;for(let m=1;m<k;m++){const r=K.raw&&K.raw[(((c+d*m)%n)+n)%n];if(r&&r.startsWith('e:'))x++}return x};
        const cf=cross(1,fw),cb=cross(-1,bw),dir=cf<cb||(cf===cb&&fw<=bw)?1:-1,k=dir>0?fw:bw;
        for(let m=0;m<k;m++){const x=find(path);if(!x)break;(dir>0?x.nextElementSibling:x.previousElementSibling).click()}return}const want=labels[i],c=labels.indexOf(txt(find(path)));const dir=K.cyc||c<0||i>=c?1:-1;goTo(path,want,dir,labels.length+3)},K.groups)}
  /* tap on a value */
  document.addEventListener('click',ev=>{const v=valueOf(ev.target);if(!v)return;if(ev.target.closest('button')&&ev.target.closest('button')!==v)return;ev.preventDefault();ev.stopPropagation();openFor(v)},true);
  document.addEventListener('mouseover',ev=>{const v=valueOf(ev.target);document.querySelectorAll('.pk-hot').forEach(x=>{if(x!==v)x.classList.remove('pk-hot')});if(v)v.classList.add('pk-hot')});
  window.__pick={valueOf,openFor,readList,pathOf,find};
})();

