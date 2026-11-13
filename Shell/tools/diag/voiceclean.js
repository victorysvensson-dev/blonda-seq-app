/* Voice clean-up for WebKit. Every note builds a small chain of audio nodes (oscillators/sample sources → filters,
   shapers, gains, panners → a track's input). Chrome frees such a chain once its sources have ended; WebKit keeps every
   node that is still connected, so silent chains pile up and the audio thread walks through all of them, 375 times a
   second – the longer you play, the heavier the page gets. This disconnects a note's chain when all its sources have
   ended.
   Which nodes belong to a note: nodes made in the same task as its sources whose every input comes, step by step, from
   that same task. A node that something older feeds (a lazily made effect or bus behind a track) is never touched, and
   a node gets a 3 s grace period after the last source ended, in which a connection from any other task marks it as
   shared for good. */
(()=>{if(window.__vclean)return;const V=window.__vclean={tasks:0,cleaned:0,kept:0};
  let task=1,bump=false;const now=()=>{if(!bump){bump=true;queueMicrotask(()=>{task++;bump=false})}return task};
  const P=BaseAudioContext.prototype,T=new Map();                       // task -> {nodes:Set, live:0, srcs:0}
  const rec=n=>{const id=now();n.__vt=id;let e=T.get(id);if(!e){e={nodes:new Set(),live:0,srcs:0};T.set(id,e)}e.nodes.add(n);return n};
  for(const k of Object.getOwnPropertyNames(P))if(/^create(?!Buffer$|PeriodicWave$|MediaStreamDestination$)/.test(k)&&typeof P[k]==='function'){const f=P[k];
    P[k]=function(...a){const n=f.apply(this,a);return n instanceof AudioNode?rec(n):n}}
  /* constructors too (new GainNode(ctx) …) */
  const C=AudioNode.prototype,conn=C.connect;
  C.connect=function(dst,...a){if(dst instanceof AudioNode){(dst.__in||(dst.__in=new Set())).add(this);
      if(dst.__wouldClean||dst.__cleaned||this.__wouldClean||this.__cleaned){V.late=(V.late||0)+1;if(!V.lateEx)V.lateEx=(new Error().stack||'').split('\n').slice(1,4).join(' | ')}
      if(this.__vt!==dst.__vt)dst.__shared=true}else if(dst instanceof AudioParam){this.__toParam=true}
    return conn.call(this,dst,...a)};
  const S=AudioScheduledSourceNode.prototype,st=S.start;
  S.start=function(...a){const e=this.__vt&&T.get(this.__vt);if(e&&!this.__vs){this.__vs=1;e.live++;e.srcs++;
      this.addEventListener('ended',()=>{e.live--;if(e.live<=0)setTimeout(()=>{if(e.live<=0)clean(this.__vt,e)},3000)})}
    return st.apply(this,a)};
  /* a node is local to the note when it is not shared and all its inputs are local (sources of the note are local) */
  function clean(id,e){if(!T.has(id))return;T.delete(id);const local=new Map();
    /* local = made in this note's task, never fed by anything else, and carrying this note's sound: a source of the
       note itself, or a node whose every input is local (a node with no input at all is not local – it may be waiting
       for something to be connected later) */
    const isLocal=n=>{if(local.has(n))return local.get(n);local.set(n,false);let ok=n.__vt===id&&!n.__shared;
      if(ok&&!n.__vs){if(!n.__in||!n.__in.size)ok=false;else for(const i of n.__in)if(!isLocal(i)){ok=false;break}}
      local.set(n,ok);return ok};
    for(const n of e.nodes){if(isLocal(n)){if(V.dry){n.__wouldClean=1}else{try{n.disconnect()}catch(x){}n.__cleaned=1}V.cleaned++}else V.kept++}
    V.tasks++;e.nodes.clear()}
  /* tasks that never start a source (set-up of buses and effects) are dropped from the list, never cleaned */
  setInterval(()=>{const lim=task-200;for(const [id,e] of T)if(id<lim&&e.srcs===0)T.delete(id)},5000);
})();
