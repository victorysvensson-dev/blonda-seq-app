/* ================= Starter v3: a synth module of its own =================
   Modelled on songstarter loops (Amin "mysterious", Cmaj "flower", Dmin "output", Gmin "synth stack clock"). Measured on
   them: notes die away fast (−12 dB after 90–170 ms), 40–60 % of every bar is near silence (bursts of 16ths, then a hard
   rest), dark (centroid 350–650 Hz) with a sub under it. So: one shared rhythm of bursts drives every layer, each layer
   chokes itself (a new hit cuts the last one in 6 ms), every note is gated at the end of its step, and the room is short.
   Own voices (ackord · klocka · sub · luft), own chain (drive → filter → fx → eko / rum → pump → volym) into the synth bus,
   and its own fx (stutter, roll, rev, tape stop, gate, eko-kast, filter): held for live, or written into the loop.
   Plays with the transport, a 4-bar loop on the global step; it uses no tracks or patterns. State: S.stx (in the project). */
const STX_SRC=`
class X extends AudioWorkletProcessor{
  constructor(){super();this.N=Math.ceil(sampleRate*6);this.bL=new Float32Array(this.N);this.bR=new Float32Array(this.N);
    this.ev=[];this.cur=null;this.live=null;this.xf=Math.round(sampleRate*.003);this.gs=1;this.ef=0;this.es=0;this.on=-1e12;this.rf=Math.exp(-1/(sampleRate*.04));this.rs=Math.exp(-1/(sampleRate*.35));
    this.port.onmessage=e=>{const m=e.data;
      if(m.t==='q'){this.ev.push(m);this.ev.sort((a,b)=>a.start-b.start)}
      else if(m.t==='h'){if(m.on){const f=currentFrame;this.live={fx:m.fx,start:f,len:1e12,sl:Math.max(64,m.sl|0),pos:0}}
        else if(this.live){const k=currentFrame-this.live.start;this.live.len=k+this.xf}}
      else if(m.t==='clr'){this.ev.length=0;this.cur=null;this.live=null}}}
  rd(b,p){const N=this.N,i=Math.floor(p),fr=p-i,a=b[((i%N)+N)%N],c=b[(((i+1)%N)+N)%N];return a+(c-a)*fr}
  process(I,O){const o=O[0],oL=o[0],oR=o[1]||o[0],n=oL.length,inp=I[0]||[],iL=inp[0],iR=inp[1]||iL,N=this.N;
    for(let x=0;x<n;x++){const f=currentFrame+x,a=iL?iL[x]:0,b=iR?iR[x]:0,w=f%N;this.bL[w]=a;this.bR[w]=b;
      {const v=Math.max(Math.abs(a),Math.abs(b));this.ef=v>this.ef?v:this.ef*this.rf;this.es=v>this.es?this.es+(v-this.es)*.002:this.es*this.rs;if(this.ef>.004&&this.ef>this.es*1.9&&f-this.on>sampleRate*.06)this.on=f}
      let e=this.live;if(e&&f-e.start>=e.len){this.live=e=null}
      if(!e){if(this.cur&&f-this.cur.start>=this.cur.len)this.cur=null;
        while(!this.cur&&this.ev.length&&this.ev[0].start<=f){const q=this.ev.shift();if(f-q.start<q.len){q.pos=0;this.cur=q}}e=this.cur}
      if(e&&e.src==null)e.src=(f-this.on<sampleRate*1.5&&this.on<=e.start)?this.on-64:e.start;
      if(!e){oL[x]=a;if(oR!==oL)oR[x]=b;continue}
      const k=f-e.start,em=Math.max(0,Math.min(1,Math.min(k,e.len-k)/this.xf));let wa=a,wb=b;
      if(e.fx===1||e.fx===2){let sl=e.sl;if(e.fx===2)sl=Math.max(48,Math.round(e.sl*Math.pow(.5,Math.floor(3*k/Math.min(e.len,sampleRate*8)))));
        const j=k%sl,fd=Math.min(1,Math.min(j,sl-j)/32),p=e.src+j;wa=this.bL[p%N]*fd*1.12;wb=this.bR[p%N]*fd*1.12}
      else if(e.fx===3){const p=Math.min(e.start-1,e.src+e.len)-k;wa=this.bL[((p%N)+N)%N];wb=this.bR[((p%N)+N)%N]}
      else if(e.fx===4){const L=Math.min(e.len,sampleRate*2),r=Math.max(0,1-k/L);e.pos+=r*r;const p=e.src+e.pos;wa=this.rd(this.bL,p)*Math.min(1,r*4);wb=this.rd(this.bR,p)*Math.min(1,r*4)}
      else if(e.fx===5){const h=Math.max(32,e.sl>>1),tg=Math.floor(k/h)%2?0:1;this.gs+=(tg-this.gs)*.12;wa=a*this.gs;wb=b*this.gs}
      oL[x]=a+(wa-a)*em;if(oR!==oL)oR[x]=b+(wb-b)*em}
    return true}}
registerProcessor('blonda-stx',X);`;

const STX_RH={puls:['xxxxxx....xxxxx.','xxxx.x...xxxxxxx','xxxxxx....xxxxx.','xxxxx.......xxxx'],
  stack:['.xxxx.......xxxx','......xxx....xxx','.xxxx.......xxxx','......xxx..xxxxx'],
  output:['xxxxx.xxx..xx.x.','xxxxx.x.x...xxx.','xxxxx.xxx..xx.x.','xx.xx.x.x.x...x.'],
  flower:['xxxxx.x...x.xxxx','xxxx.xx...xxxxxx','xxxxx.x...x.xxx.','xxxxxxx...x.xx..'],
  rak:['x.x.x.x.x.x.x.x.','x.x.x.x.x.x.x.x.','x.x.x.x.x.x.x.x.','x.x.x.xxx.x.xxxx']};

