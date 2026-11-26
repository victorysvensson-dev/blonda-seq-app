/* ================= Starter instruments (v192): real-sounding instruments for the Starter's layers, rendered note by note
   (not oscillators played live): every note is computed once with a physical / modal model into a buffer and then played
   back like a sample. Rhodes (tine + tone bar, a little bark when hit hard), flygel (stretched string partials, a hammer that
   is softer or harder, three strings per note that beat slowly), gitarr (a plucked string – Karplus-Strong with pluck
   position, damping and a small body), marimba, vibrafon, kalimba, and fingerbas for the sub.
   Each layer has a timbre seed (L.tw): a new idea gets a new seed, so the same instrument is a little different every time
   (brighter/darker, harder/softer, longer/shorter, more or less bark …).
   Rendering happens on the main thread in small slices (never in the audio thread). A note that is not ready yet is played
   by the layer's old synth recipe this once. ================= */
const INS={
  rhodes:{nm:'rhodes',kind:'poly',rel:.16,pk:.24},
  flygel:{nm:'flygel',kind:'poly',rel:.12,pk:.34},
  gitarr:{nm:'gitarr',kind:'poly',rel:.07,pk:.5},
  marimba:{nm:'marimba',kind:'poly',rel:.05,pk:.36},
  vibrafon:{nm:'vibrafon',kind:'poly',rel:.25,pk:.22},
  kalimba:{nm:'kalimba',kind:'poly',rel:.06,pk:.29},
  fingerbas:{nm:'fingerbas',kind:'sub',rel:.06,pk:.74},
  /* v193: DX7-style FM (the Komorebi / Hanz x Sem0r packs lean on the DX7 and warm analog stacks), a granular pad, an FM bass */
  'dx-piano':{nm:'dx-piano',kind:'poly',rel:.18,pk:.29},
  'dx-klocka':{nm:'dx-klocka',kind:'poly',rel:.3,pk:.3},
  'dx-mallet':{nm:'dx-mallet',kind:'poly',rel:.06,pk:.36},
  korn:{nm:'korn',kind:'poly',rel:.9,pk:.34},
  'dx-bas':{nm:'dx-bas',kind:'sub',rel:.05,pk:.82}};
const INS_POLY=['rhodes','flygel','gitarr','marimba','vibrafon','kalimba','dx-piano','dx-klocka','dx-mallet','korn'],INS_SUB=['fingerbas','dx-bas'];
/* seeded numbers 0..1 for a timbre */
function insR(seed,i){let h=(Math.imul((seed|0)+1,2654435761)^Math.imul(i+7,40503))>>>0;h^=h>>>15;h=Math.imul(h,2246822519)>>>0;h^=h>>>13;return (h>>>0)/4294967296}
function insTw(name,seed){const r=i=>insR(seed,i);switch(name){
  case 'rhodes':return {bark:.5+r(1)*.9,tine:.15+r(2)*.5,bar:.18+r(3)*.3,dec:.75+r(4)*.6,bright:.7+r(5)*.6};
  case 'flygel':return {hard:.65+r(1)*.8,dec:.8+r(2)*.5,det:.3+r(3)*1.1,stretch:.7+r(4)*.7,body:.5+r(5)*.8};
  case 'gitarr':return {pos:.1+r(1)*.22,damp:.35+r(2)*.4,bright:.45+r(3)*.5,dec:.8+r(4)*.5,body:.4+r(5)*.8};
  case 'marimba':return {hard:.5+r(1)*.9,dec:.7+r(2)*.6,wood:.5+r(3)*.8};
  case 'vibrafon':return {hard:.5+r(1)*.8,dec:.8+r(2)*.5,shim:.2+r(3)*.5};
  case 'kalimba':return {hard:.5+r(1)*.8,dec:.7+r(2)*.6,buzz:r(3)*.6};
  case 'fingerbas':return {bright:.25+r(1)*.45,dec:.8+r(2)*.5,growl:r(3)*.35,thump:.3+r(4)*.6};
  case 'dx-piano':return {idx:1.2+r(1)*1.6,tine:.25+r(2)*.5,tr:[14,14,15,13][Math.floor(r(3)*4)],dec:.8+r(4)*.5,det:1+r(5)*4};
  case 'dx-klocka':return {ratio:[3.5,2.76,4.2,1.41][Math.floor(r(1)*4)],idx:1.5+r(2)*2.5,dec:.8+r(3)*.6,shim:.2+r(4)*.5};
  case 'dx-mallet':return {ratio:[3,4,5.04,2.4][Math.floor(r(1)*4)],idx:1.5+r(2)*2,dec:.7+r(3)*.6};
  case 'korn':return {src:['dx','rhodes','saw'][Math.floor(r(1)*3)],dens:14+r(2)*22,size:.07+r(3)*.12,shim:r(4)*.35,spread:8+r(5)*16,air:.3+r(6)*.6};
  case 'dx-bas':return {idx:1+r(1)*3,dec:.7+r(2)*.6,sub:.4+r(3)*.5,punch:.3+r(4)*.6};
  default:return {}}}
