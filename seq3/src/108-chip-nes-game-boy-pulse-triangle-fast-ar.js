/* ---------- Chip: NES/Game Boy pulse & triangle, fast arpeggios, vibrato, bit reduction ---------- */
const chipWaves={};
function chipWave(d){if(chipWaves[d])return chipWaves[d];const N=64,re=new Float32Array(N),im=new Float32Array(N);
  for(let n=1;n<N;n++){re[n]=2/(n*Math.PI)*Math.sin(n*Math.PI*d)}chipWaves[d]=ctx.createPeriodicWave(re,im);return chipWaves[d]}
function chipVoice(t,v,p,out,note,len,vc){const E=engE('chip'),gate=Math.max(.05,len*(.55+p.decay*2.4)),dec=.05+E.dec*1.4,end=t+gate+.15,base=note+12*(E.oct||0)+p.tune;
  const ARP=[null,[0,4,7],[0,3,7],[0,12],[0]][E.arpm||0]||(vc&&vc.length>1?vc:[0]),o=ctx.createOscillator(),q=ctx.createWaveShaper(),g=ctx.createGain();
  if(E.duty===3)o.type='triangle';else o.setPeriodicWave(chipWave([.125,.25,.5][E.duty??1]));
  const rate=10+E.arp*40,stp=1/rate;let k=0;for(let tt=t;tt<t+gate+.1;tt+=stp,k++){const n=base+ARP[k%ARP.length];o.frequency.setValueAtTime(hz(n),tt);if(ARP.length===1)break}
  if(ARP.length===1)glideOsc(o.frequency,hz(base),t);
  if(E.vib>0){const l=ctx.createOscillator(),lg=ctx.createGain();l.frequency.value=5.5;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(E.vib*30,t+.18);l.connect(lg);lg.connect(o.detune);l.start(t);l.stop(end)}
  q.curve=crushCurve(Math.round(8-E.crush*5));
  const lvl=v*.42;g.gain.setValueAtTime(lvl,t);const steps=Math.max(8,Math.min(64,Math.ceil(gate/.03)));for(let i=1;i<=steps;i++)g.gain.setValueAtTime(lvl*Math.max(.25,Math.exp(-(gate*i/steps)/dec)),t+gate*i/steps);
  g.gain.setValueAtTime(lvl*.25,t+gate);g.gain.linearRampToValueAtTime(0,t+gate+.03);
  o.connect(q);q.connect(g);g.connect(out);o.start(t);o.stop(end)}

