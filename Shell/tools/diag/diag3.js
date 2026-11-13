(()=>{const post=m=>{try{webkit.messageHandlers.blonda.postMessage(m)}catch(e){}},L=m=>post({t:'diag',m:String(m)});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
/* main-thread lag: a 20 ms ticker, how late it runs */
let lagMax=0,lagSum=0,lagN=0,exp=0;const tick=()=>{const n=performance.now();if(exp){const l=Math.max(0,n-exp);lagMax=Math.max(lagMax,l);lagSum+=l;lagN++}exp=n+20};setInterval(tick,20);
const lagReset=()=>{const r={avg:lagN?lagSum/lagN:0,max:lagMax};lagMax=0;lagSum=0;lagN=0;return r};
const A=()=>{try{return __seq.Aref().out.context}catch(e){return null}};
const state=()=>{const c=A();return 'playing='+document.body.classList.contains('playing')+' ctx='+(c?c.state:'?')+' t='+(c?c.currentTime.toFixed(2):'?')};
/* resize: what happens to the sound and the page in the 4 s after */
let rz=0;addEventListener('resize',()=>{const id=++rz,t0=performance.now();lagReset();L('RESIZE '+innerWidth+'x'+innerHeight+' '+state());
  let k=0;const iv=setInterval(()=>{k++;const lg=lagReset();L('  +'+(performance.now()-t0).toFixed(0)+'ms '+state()+' lagAvg '+lg.avg.toFixed(1)+' lagMax '+lg.max.toFixed(0));if(k>=8||id!==rz)clearInterval(iv)},500)});
addEventListener('visibilitychange',()=>L('visibility '+document.visibilityState+' '+state()));
addEventListener('load',async()=>{L('diag3: page loaded '+innerWidth+'x'+innerHeight+' dpr '+devicePixelRatio);
  for(let i=0;i<600;i++){const st=document.getElementById('start');if(st&&st.hidden)break;await sleep(500)}
  await sleep(1500);
  for(let i=1;i<=8;i++){try{__seq.play()}catch(e){}await sleep(800);lagReset();post({t:'mark',p:'begin',name:'play '+i});await sleep(4000);post({t:'mark',p:'end'});const lg=lagReset();
    L('play '+i+': '+state()+' lagAvg '+lg.avg.toFixed(1)+'ms lagMax '+lg.max.toFixed(0)+'ms nodes '+document.getElementsByTagName('*').length);
    try{__seq.stop()}catch(e){}await sleep(1200)}
  post({t:'mark',p:'begin',name:'stopped after 8'});await sleep(4000);post({t:'mark',p:'end'});L('cycles done – now resize the window; '+state())});
})();
