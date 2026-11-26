/* ================= The full synth ("riktig synth", SEQ.3 v134) =================
   Every engine can open as a big synth on its own screen: all its params as knobs in sections (Moog, SH-101 and Bris show
   their own front panels), the "efter" chain, and the modulation: two LFOs, a mod envelope, a 16-step sequencer, random and
   velocity. Drag a source onto any knob to link it (or tap the source and drag the knob to set how much); the ring on the
   knob shows the depth, the dot shows where it is right now. Presets: the engine's own, saved sounds and modulation sets. */
const pcF=v=>[String(Math.round(v*100)),'%'],msX=s=>s<1?[String(Math.round(s*1000)),'ms']:[s.toFixed(2),'s'];
/* labels and ranges for params that the small synth card doesn't show */
const RS_EXTRA={
  analog:[{k:'cut',l:'cutoff',f:v=>{const h=70*Math.pow(160,v);return h>=1000?[(h/1000).toFixed(1),'khz']:[String(Math.round(h)),'hz']}},{k:'res',l:'reso',f:pcF},{k:'env',l:'env',f:pcF},
    {k:'a',l:'attack',max:1,f:msX},{k:'d',l:'decay',max:2,f:msX},{k:'s',l:'sustain',f:pcF},{k:'r',l:'release',max:3,f:msX}],
  mini:[{k:'o2f',l:'osc 2 stämn.',max:1,f:pcF},{k:'mn',l:'brus',f:pcF},{k:'fA',l:'filter attack',f:pcF},{k:'fS',l:'filter sustain',f:pcF},{k:'aA',l:'attack',f:pcF},{k:'modAmt',l:'mod-hjul',f:pcF},{k:'modmix',l:'mod-mix',f:pcF},{k:'vol',l:'volym',f:pcF}],
  sh101:[{k:'A',l:'attack',f:pcF},{k:'R',l:'release',f:pcF},{k:'noise',l:'brus',f:pcF},{k:'lfoR',l:'lfo-fart',f:pcF},{k:'vcoMod',l:'vco-mod',f:pcF},{k:'vcfMod',l:'vcf-mod',f:pcF},{k:'kybd',l:'tangent-följ',f:pcF},{k:'vol',l:'volym',f:pcF}],
  bris:[{k:'pw',l:'pulsbredd',f:pcF},{k:'noise',l:'brus',f:pcF},{k:'drift',l:'drift',f:pcF},{k:'kt',l:'tangent-följ',f:pcF},{k:'fA',l:'filter attack',f:pcF},{k:'fD',l:'filter decay',f:pcF},{k:'fS',l:'filter sustain',f:pcF},{k:'fR',l:'filter release',f:pcF},
    {k:'aD',l:'decay',f:pcF},{k:'aS',l:'sustain',f:pcF},{k:'lfoR',l:'lfo-fart',f:pcF},{k:'lfoAmt',l:'lfo-mängd',f:pcF},{k:'dlyFb',l:'delay-återkoppl.',f:pcF},{k:'vol',l:'volym',f:pcF}]};
/* how each built-here engine is laid out ('@k' = a choice) */
const RS_SEC={
  analog:[['oscillator',['@wave']],['filter',['cut','res','env']],['envelope',['a','d','s','r']]],
  acid:[['oscillator',['@wave','@slide','st']],['filter',['cut','res','env','dec','acc']],['dist',['drive','dtone']]],
  sub:[['ton',['tone','click','punch']],['form',['decay','glide','drive']]],
  fm:[['operatorer',['ratio','index','bell']],['envelope',['decay','rel','bright']]],
  pluck:[['sträng',['damp','bright','body']],['kropp',['len','width','drive']]],
  chip:[['puls',['@duty','@oct','crush']],['rörelse',['@arpm','arp','vib','dec']]],
  super:[['oscillatorer',['detune','bright','air']],['form',['attack','release','width']]],
  msx:[['envelope',['att','dec','sus','rel']]],
  grime:[['oscillator',['@wave','@oct','uni','ratio','growl','sub']],['växt',['grow','grT','fold']],['filter',['cut','res','env','dec','drive']],['wob',['@shape','wob','rate','amp']],['formant',['form','vowel','talk','trate']],['tonhöjd',['dive','dt','glide']]]};
const RS_CLONE={mini:'mini',sh101:'sh101',bris:'bris'};
const RS_WAVE=[['sawtooth','såg'],['square','fyrkant'],['triangle','triangel'],['sine','sine']];
const RS={open:false,arm:null,drag:null,id:'bass',e:'analog'};
/* the param list of an engine: [{k,l,max,step,f}] */
function rsParams(e){const D=ENG[e]||{},seen=new Set(),out=[];(D.ps||[]).concat(D.adv||[],RS_EXTRA[e]||[]).forEach(q=>{if(!seen.has(q.k)){seen.add(q.k);out.push(q)}});return out}
const rsQ=(e,k)=>k.startsWith('x.')?MOD_X.find(q=>q.k===k):k==='pitch'?{k:'pitch',l:'tonhöjd',f:v=>[String(Math.round(v*24)),'st']}:rsParams(e).find(q=>q.k===k);
const rsLabel=(e,k)=>{const q=rsQ(e,k);return q?(k.startsWith('x.')?'efter '+q.l:q.l):k};
/* the targets the matrix offers for an engine */
function rsTargets(e){const L=rsParams(e).filter(q=>{const o=rsObj(e);return o&&typeof o[q.k]==='number'}).map(q=>q.k);if(e==='grime')L.push('pitch');return L.concat(MOD_X.map(q=>q.k))}
/* (v275) Simple: attack, decay, sustain, release and tone are the track's own; the rest is shared by every Simple track */
const ENK_PT=['a','d','s','r','ton'];
function enkObj(id){const E=engE('enkel'),T=()=>{if(!S.enkT)S.enkT={};return S.enkT[id]||(S.enkT[id]={})},has=k=>S.enkT&&S.enkT[id]&&S.enkT[id][k]!=null;
  return new Proxy(E,{get:(o,k)=>ENK_PT.includes(k)&&has(k)?S.enkT[id][k]:o[k],
    set:(o,k,v)=>{if(ENK_PT.includes(k)){T()[k]=v;try{SIMPLE.trk(id)}catch(_){globalThis.__el&&globalThis.__el(_)}}else o[k]=v;return true},
    getOwnPropertyDescriptor:(o,k)=>{const dd=Reflect.getOwnPropertyDescriptor(o,k);if(dd&&ENK_PT.includes(k)&&has(k))dd.value=S.enkT[id][k];return dd}})}
function rsObj(e){return e==='analog'?S.synth[RS.id]:e==='enkel'?enkObj(RS.id):engE(e)}
const rsGet=(e,k)=>k.startsWith('x.')?modOf(e).x[k.slice(2)]:(rsObj(e)||{})[k];
function rsSet(e,k,v){if(k.startsWith('x.'))modOf(e).x[k.slice(2)]=v;else{const o=rsObj(e);if(o)o[k]=v}clearTimeout(rsSet._t);rsSet._t=setTimeout(()=>{save();try{refreshInst()}catch(_){globalThis.__el&&globalThis.__el(_)}},250)}
const rsDef=(e,k)=>k.startsWith('x.')?MOD_XDEF[k.slice(2)]:e==='analog'?(DEFS.synth[RS.id]||DEFS.synth.bass)[k]:(DEFS.eng[e]||{})[k];

(()=>{
  /* --- styles --- */
  const css=document.createElement('style');css.textContent=`
.rs-open{height:26px;padding:0 10px;border-radius:999px;font:500 10px var(--f-mono);letter-spacing:.06em;background:rgba(255,255,255,.08);color:inherit;border:0;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.rs-open:hover{background:rgba(255,255,255,.16)}.rs-open svg{width:12px;height:12px}
.rs{position:fixed;inset:0;z-index:58;background:radial-gradient(120% 80% at 50% -10%,#1d1f23 0,#101113 60%);color:#E8E6DC;display:flex;flex-direction:column;gap:10px;padding:12px 16px 14px;font-family:var(--f-mono);opacity:0;transition:opacity .22s;--ac:#B8F23A}
.rs[hidden]{display:none}.rs.show{opacity:1}
.rs button{font:inherit;color:inherit;border:0;background:none;cursor:pointer}
.rs-top{display:flex;align-items:center;gap:10px;flex:none;min-height:46px;flex-wrap:wrap}
.rs-logo{font:500 12px var(--f-mono);letter-spacing:.22em;color:rgba(232,230,220,.6)}
.rs-name{font:300 34px/1 var(--f-linje);letter-spacing:-.01em;color:#F4F2EA}.rs-tag{font-size:10px;color:rgba(232,230,220,.45);max-width:220px}
.rs-eng-sel{display:flex;gap:3px;padding:3px;border-radius:999px;background:rgba(255,255,255,.05);overflow:auto;scrollbar-width:none;max-width:44vw}.rs-eng-sel::-webkit-scrollbar{display:none}
.rs-eng-sel button{padding:6px 10px;border-radius:999px;font-size:10px;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;color:rgba(232,230,220,.65)}
.rs-eng-sel button i{width:7px;height:7px;border-radius:50%;background:var(--d)}.rs-eng-sel button.on{background:#EDEBE3;color:#141516}
.rs-trk{display:flex;gap:3px}.rs-trk button{padding:6px 10px;border-radius:8px;font-size:10px;box-shadow:inset 0 0 0 1px rgba(232,230,220,.14);color:rgba(232,230,220,.6)}.rs-trk button.on{background:rgba(232,230,220,.14);color:#fff}
.rs-sp{flex:1}
.rs-pb{height:34px;padding:0 12px;border-radius:9px;box-shadow:inset 0 0 0 1px rgba(232,230,220,.16);font-size:10px!important;display:inline-flex;align-items:center;gap:8px}
.rs-pb small{color:rgba(232,230,220,.45);font-size:8.5px;letter-spacing:.1em}.rs-pb b{font:400 14px var(--f-linje);color:var(--ac)}
.rs-pb:hover{background:rgba(255,255,255,.05)}
.rs-x{height:34px;padding:0 14px;border-radius:9px;box-shadow:inset 0 0 0 1px rgba(232,230,220,.2);font-size:11px!important}
.rs-main{flex:0 1 auto;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:12px}
.rs-eng{min-height:0;overflow:auto;scrollbar-width:thin;display:flex;flex-wrap:wrap;align-content:flex-start;gap:10px}
.rs-eng>.card{margin:0!important;width:100%!important;max-width:none!important;flex:1 1 100%}
.rs-sec{background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.02));border-radius:14px;padding:10px 14px 12px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);flex:1 1 auto;min-width:200px}
.rs-sec h5{margin:0 0 6px;font:500 9px var(--f-mono);letter-spacing:.18em;text-transform:uppercase;color:rgba(232,230,220,.5);display:flex;align-items:center;gap:8px}
.rs-sec h5::before{content:"";width:14px;height:2px;border-radius:1px;background:var(--ac);opacity:.8}
.rs-row{display:flex;flex-wrap:wrap;gap:6px 4px;align-items:flex-start}
.rk{position:relative;width:78px;display:flex;flex-direction:column;align-items:center;gap:1px;cursor:ns-resize;touch-action:none;user-select:none;-webkit-user-select:none;border-radius:10px;padding:4px 0 2px}
.rk svg{width:62px;height:62px;overflow:visible}.rk .tr{stroke:rgba(232,230,220,.12);stroke-width:4;fill:none;stroke-linecap:round}
.rk .vl{stroke:#EDEBE3;stroke-width:4;fill:none;stroke-linecap:round}.rk .md{fill:none;stroke-width:3;stroke-linecap:round;opacity:.9}
.rk .cap{fill:#232428;stroke:rgba(255,255,255,.08)}.rk .ptr{stroke:#EDEBE3;stroke-width:2.2;stroke-linecap:round}
.rk .live{fill:#fff}
.rk b{font:400 13px/1.1 var(--f-linje);color:#F4F2EA;white-space:nowrap}.rk b sup{font:500 8px var(--f-mono);color:rgba(232,230,220,.5);margin-left:2px}
.rk small{font-size:9px;letter-spacing:.06em;color:rgba(232,230,220,.55);text-align:center;line-height:1.15}
.rk:hover{background:rgba(255,255,255,.03)}.rk.drop{background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1.5px var(--dc,#fff)}
.rs.arming .rk{cursor:crosshair}.rs.arming .rk::after{content:"";position:absolute;inset:0;border-radius:10px;box-shadow:inset 0 0 0 1px var(--armc);opacity:.45;pointer-events:none}
.rk .badge{position:absolute;top:3px;right:6px;display:flex;gap:2px}.rk .badge i{width:5px;height:5px;border-radius:50%}
.rs-ch{display:flex;flex-direction:column;gap:4px;min-width:96px}
.rs-ch small{font-size:9px;letter-spacing:.06em;color:rgba(232,230,220,.5)}
.rs-ch .opts{display:flex;flex-wrap:wrap;gap:3px}.rs-ch .opts button{padding:5px 8px;border-radius:7px;font-size:10px;background:rgba(255,255,255,.05);color:rgba(232,230,220,.7)}.rs-ch .opts button.on{background:#EDEBE3;color:#141516}
.rs-side{min-height:0;overflow:auto;scrollbar-width:thin;display:flex;flex-direction:column;gap:10px}
.rs-mat{background:rgba(255,255,255,.03);border-radius:14px;padding:10px 12px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);display:flex;flex-direction:column;gap:6px}
.rs-mat h5{margin:0;font:500 9px var(--f-mono);letter-spacing:.18em;text-transform:uppercase;color:rgba(232,230,220,.5);display:flex;justify-content:space-between;align-items:center}
.rs-mr{display:grid;grid-template-columns:auto 1fr auto;gap:6px;align-items:center;padding:6px 6px;border-radius:9px;background:rgba(255,255,255,.035)}
.rs-mr .src{display:inline-flex;align-items:center;gap:5px;font-size:10px;padding:3px 7px;border-radius:6px;background:color-mix(in srgb,var(--c) 18%,transparent);color:var(--c)}
.rs-mr .dst{font-size:10px;text-align:left;color:#EDEBE3;padding:3px 4px;border-radius:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rs-mr .dst:hover,.rs-mr .src:hover{filter:brightness(1.3)}
.rs-mr .del{width:22px;height:22px;border-radius:6px;color:rgba(232,230,220,.45)}.rs-mr .del:hover{background:rgba(255,255,255,.08);color:#fff}
.rs-amt{grid-column:1/-1;position:relative;height:16px;border-radius:5px;background:rgba(255,255,255,.06);cursor:ew-resize;touch-action:none}
.rs-amt::before{content:"";position:absolute;left:50%;top:2px;bottom:2px;width:1px;background:rgba(255,255,255,.25)}
.rs-amt i{position:absolute;top:3px;bottom:3px;border-radius:3px;background:var(--c)}.rs-amt em{position:absolute;right:6px;top:0;font:normal 9px/16px var(--f-mono);color:rgba(232,230,220,.75)}
.rs-help{font-size:9.5px;line-height:1.5;color:rgba(232,230,220,.45)}
.rs-add{height:26px;padding:0 10px;white-space:nowrap;border-radius:8px;box-shadow:inset 0 0 0 1px rgba(232,230,220,.16);font-size:10px!important}
.rs-mod{flex:1 1 220px;max-height:400px;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;min-height:210px}
.rs-src{position:relative;background:linear-gradient(180deg,color-mix(in srgb,var(--c) 7%,rgba(255,255,255,.03)),rgba(255,255,255,.02));border-radius:14px;padding:9px 11px 10px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);display:flex;flex-direction:column;gap:6px;min-width:0}
.rs-src.armed{box-shadow:inset 0 0 0 1.5px var(--c),0 0 24px -8px var(--c)}
.rs-sh{display:flex;align-items:center;gap:8px}
.rs-grab{width:26px;height:26px;border-radius:50%;background:radial-gradient(circle,var(--c) 0 5px,color-mix(in srgb,var(--c) 25%,transparent) 6px);cursor:grab;touch-action:none;flex:none;box-shadow:0 0 0 1px color-mix(in srgb,var(--c) 50%,transparent)}
.rs-grab:active{cursor:grabbing}
/* (v271) the hint is a handle too, and shows the coloured dot it means */
.rs-hint{margin-left:auto;display:inline-flex;align-items:center;gap:6px;padding:3px 9px 3px 5px;border-radius:999px;font:500 9px var(--f-mono);letter-spacing:.04em;color:rgba(232,230,220,.7);cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 40%,transparent)}
.rs-hint{white-space:nowrap;flex:none}
.rs-trk{flex-wrap:wrap}.rs-trk button{display:inline-flex;align-items:center;gap:6px}.rs-trk button i{width:6px;height:6px;border-radius:50%;background:var(--d);flex:none}
/* (v272) the front panel's track row says what it is: the tracks this engine plays on */
.cl-trk::before{content:'plays on';display:flex;align-items:center;padding:0 8px;font:500 9px var(--f-mono);letter-spacing:.06em;color:rgba(232,230,220,.45);white-space:nowrap;flex:none}
/* (v272) the modulation sits at the bottom while you scroll: small (just the handles) or open */
.rs-dock{position:sticky;bottom:-22px;z-index:6;margin:auto -18px -22px;padding:10px 18px 22px;background:#17181A;box-shadow:0 -1px 0 #2E3032;flex:none}
.rs-dock .rs-mod{margin:0}
.rs-dk{display:flex;align-items:center;gap:5px;margin:0 0 6px auto;height:22px;padding:0 10px;font:500 9px var(--f-mono);letter-spacing:.06em;color:rgba(232,230,220,.6);box-shadow:inset 0 0 0 1px #2E3032;background:#17181A}
.rs-dk svg{width:10px;height:10px;transition:transform .15s}.rs-dk.up svg{transform:rotate(180deg)}
.rs-dock.rs-sm .rs-src>:not(.rs-sh){display:none}.rs-dock.rs-sm .rs-src{padding:7px 10px}
.rs-dock.rs-sm .rs-mod{display:flex!important;gap:8px;overflow-x:auto;scrollbar-width:none}.rs-dock.rs-sm .rs-mod::-webkit-scrollbar{display:none}.rs-dock.rs-sm .rs-src{flex:1 0 auto;min-width:0}
.rs-vm .rs-row{align-items:center}
/* (v281) the column scroll dots stay under the yellow menu (deck): they sat above it */
body:has(#deck.open) .srail,body:has(#deckScrim.on) .srail{visibility:hidden!important;pointer-events:none!important}
/* (v279) master meter: top, comp and ceiling always on three rows in a fixed place – the values changing width (and the big
   loudness number going from "--" to "-43.1") made them jump between one and two rows when you played and stopped */
.m2-lufs{display:inline-block;min-width:124px!important;text-align:right}
.m2-rd{display:grid!important;grid-template-columns:max-content;gap:5px!important;flex-wrap:nowrap!important}.m2-rd span{white-space:nowrap}
.m2-rd b{display:inline-block;min-width:4.2ch;text-align:right;font-variant-numeric:tabular-nums}.rs-msx h5{display:flex;align-items:center}.rs-msx-al{margin-left:auto;margin-right:6px;height:22px;padding:0 10px;font:500 9px var(--f-mono);letter-spacing:.06em;color:rgba(232,230,220,.7);box-shadow:inset 0 0 0 1px #2E3032}.rs-msx-al+.rs-msx-imp{margin-left:0!important}.rs-msx-imp{margin-left:auto;height:22px;padding:0 10px;font:500 9px var(--f-mono);letter-spacing:.06em;color:rgba(232,230,220,.7);box-shadow:inset 0 0 0 1px #2E3032}.rs-ek .opts{flex-wrap:wrap}.rs-ek .rs-ch{margin-bottom:6px}.rs-sh b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rs-hint:active{cursor:grabbing}.rs-hint i{width:8px;height:8px;border-radius:50%;background:var(--c);flex:none}
.rs-hint:hover,.rs-grab:hover{filter:brightness(1.25)}
.rs-sh b{font:500 10px var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--c)}.rs-sh small{margin-left:auto;font-size:9px;color:rgba(232,230,220,.45)}
.rs-src canvas{width:100%;flex:1 1 64px;min-height:56px;max-height:170px;border-radius:8px;background:rgba(0,0,0,.22);display:block}
.rs-shp{display:flex;flex-wrap:wrap;gap:2px}.rs-shp button{flex:1 1 0;min-width:22px;height:22px;border-radius:6px;font-size:11px!important;background:rgba(255,255,255,.04);color:rgba(232,230,220,.6)}.rs-shp button.on{background:var(--c);color:#141516}
.rs-ctl{display:flex;align-items:center;gap:4px;font-size:10px}.rs-ctl>span{color:rgba(232,230,220,.5);font-size:9px;min-width:30px}
.rs-ctl button.st{width:22px;height:22px;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(232,230,220,.15);display:grid;place-items:center;line-height:1;font-family:system-ui,sans-serif!important;font-size:13px!important;padding:0}.rs-ctl b{min-width:58px;text-align:center;font:400 12px var(--f-linje);cursor:pointer}
.rs-ctl .tg{margin-left:auto;padding:3px 8px;border-radius:6px;font-size:9.5px!important;box-shadow:inset 0 0 0 1px rgba(232,230,220,.15)}.rs-ctl .tg.on{background:color-mix(in srgb,var(--c) 30%,transparent)}
.rs-mini{display:flex;gap:2px;justify-content:space-between}.rs-mini .rk{width:52px}.rs-mini .rk svg{width:38px;height:38px}.rs-mini .rk b{font-size:11px}
.rs-steps{display:grid;grid-template-columns:repeat(16,1fr);gap:2px;flex:1 1 64px;min-height:56px;max-height:170px;align-items:end;touch-action:none;cursor:ns-resize;background:rgba(0,0,0,.22);border-radius:8px;padding:4px}
.rs-steps i{background:color-mix(in srgb,var(--c) 70%,transparent);border-radius:2px 2px 1px 1px;min-height:2px}.rs-steps i.now{background:#fff}
.rs-note{font-size:9.5px;line-height:1.5;color:rgba(232,230,220,.5)}
.rs-ghost{position:fixed;z-index:80;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;pointer-events:none;box-shadow:0 0 18px currentColor}
.rs-top{flex-wrap:nowrap}@media (max-width:1600px){.rs-eng-sel{max-width:30vw}.rs-tag{display:none}.rs-name{font-size:28px}}
@media (max-width:1100px){.rs-top{flex-wrap:wrap}.rs-mod{grid-template-columns:repeat(3,minmax(0,1fr))}.rs-main{grid-template-columns:1fr}.rs{overflow:auto}.rs-main{flex:none}}
