
/* ================= error log (v283): the app catches many errors on purpose (audio APIs throw in harmless cases), but
   until now they vanished. Every caught error, uncaught error, failed promise and console.error is kept here – the same
   error counted, not repeated, at most 200 kinds. Hold the version number (top left) to see it and copy it. ================= */
(function(){const L=new Map(),order=[];
  function add(kind,e){try{const msg=String((e&&e.message)||e);const st=e&&e.stack?String(e.stack).split('\n').find(l=>/:\d+:\d+/.test(l))||'':'';
      const at=(st.match(/:(\d+):(\d+)\)?\s*$/)||[]).slice(1).join(':');const k=kind+'|'+msg+'|'+at;const o=L.get(k);if(o){o.n++;o.t=Date.now();return}
      L.set(k,{kind,msg:msg.slice(0,300),at,n:1,t0:Date.now(),t:Date.now()});order.push(k);if(order.length>200)L.delete(order.shift())}catch(_){}}
  window.__el=e=>add('caught',e);
  addEventListener('error',ev=>add('error',ev.error||ev.message));
  addEventListener('unhandledrejection',ev=>add('promise',ev.reason));
  const ce=console.error;console.error=function(...a){add('console',a.map(x=>(x&&x.message)||String(x)).join(' '));return ce.apply(this,a)};
  window.__elog=()=>[...L.values()];
  window.__elText=()=>'SEQ.3 '+((document.querySelector('.ver')||{}).textContent||'')+' · '+navigator.userAgent+' · '+new Date().toISOString()+'\n'+
    [...L.values()].sort((a,b)=>b.t-a.t).map(o=>o.n+'× '+o.kind+' · '+o.msg+(o.at?' @'+o.at:'')).join('\n');
  window.__elClear=()=>{L.clear();order.length=0};
})();
