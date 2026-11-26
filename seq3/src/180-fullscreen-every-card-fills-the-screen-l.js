/* ================= fullscreen: every card fills the screen — laid out at its normal width, then scaled up to fit (up to 1.8×) ================= */
(()=>{const fh=document.getElementById('fullHost');if(!fh)return;let last=null;
  const fit=()=>{const c=fh.querySelector(':scope>.card');if(last&&last!==c){last.style.zoom='';last.style.width='';last.style.maxWidth=''}last=c;if(!c||c.classList.contains('stx'))return;if(innerWidth<=719&&c.dataset.card==='pads'){c.style.zoom='';c.style.width='';return}
    c.style.zoom='';const W=innerWidth-36,H=innerHeight-36,base=Math.min(W,c.classList.contains('mixer')?1400:1200);c.style.width=base+'px';c.style.maxWidth='none';
    const h0=c.scrollHeight||c.getBoundingClientRect().height,z=Math.max(1,Math.min(1.8,W/base,H/Math.max(1,h0)));if(z>1.02)c.style.zoom=String(+z.toFixed(3));
    setTimeout(()=>{dispatchEvent(new Event('resize'));try{renderAll()}catch(e){globalThis.__el&&globalThis.__el(e)}},30)};
  new MutationObserver(()=>setTimeout(fit,40)).observe(fh,{childList:true});let rt=0;addEventListener('resize',e=>{if(!e.isTrusted)return;clearTimeout(rt);rt=setTimeout(fit,120)})})();

