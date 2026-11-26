/* ---------------- song chain ---------------- */
const chainEl=$('#chain'),slotEls=[];
for(let k=0;k<8;k++){const b=document.createElement('button');b.className='slot';b.setAttribute('aria-label','Låtplats '+(k+1));
  b.onclick=()=>{const v=S.chain[k];S.chain[k]=v>=3?-1:v+1;renderChain();save()};chainEl.appendChild(b);slotEls[k]=b}
function firstSlot(){return S.chain.findIndex(v=>v>=0)}
function nextSlot(i){for(let k=1;k<=8;k++){const j=((i<0?-1:i)+k+8)%8;if(S.chain[j]>=0)return j}return firstSlot()}
function renderChain(){slotEls.forEach((b,k)=>{const v=S.chain[k];b.dataset.p=v;b.classList.toggle('empty',v<0);b.classList.toggle('cur',!!S.song&&playing&&k===chainIdx);
    b.innerHTML=`<i>${k+1}</i><span></span>`;setDM(b.querySelector('span'),v<0?'+':'ABCD'[v],20)});
  $('#songBtn').classList.toggle('on',!!S.song);$('#songRead').textContent=S.song?(playing&&chainIdx>=0?'del '+(chainIdx+1)+' av '+S.chain.filter(v=>v>=0).length:'på'):'av'}
$('#songBtn').onclick=()=>{S.song=S.song?0:1;songStart=true;renderChain();save();toast(S.song?'Låtläge på · kedjan startar vid nästa takt':'Låtläge av')};

