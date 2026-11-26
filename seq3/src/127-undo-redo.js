/* ---------------- undo / redo ---------------- */
const HIST=[],REDO=[];
const snap=()=>JSON.stringify({len:S.len,lock:S.lock,tfx:S.tfx,dk:S.dk,pats:S.pats,roll:S.roll,inst:S.inst,params:S.params,master:S.master,world:S.world,clips:S.clips});
function pushHist(){HIST.push(snap());if(HIST.length>50)HIST.shift();REDO.length=0}
function restore(js){const o=JSON.parse(js);S.pats=o.pats;if(o.dk)S.dk=o.dk;if(o.tfx)S.tfx=o.tfx;if(o.len)S.len=o.len;if(o.lock)S.lock=o.lock;if(o.roll)S.roll=o.roll;if(o.inst)S.inst=o.inst;if(typeof rSel!=='undefined')rSel.clear();S.params=o.params;S.master=o.master;S.world=o.world;if(o.clips)S.clips=o.clips;refreshSound();renderAll();save()}
function undo(){if(!HIST.length){toast('Inget att ångra');return}REDO.push(snap());restore(HIST.pop());toast('Ångrat')}
function redo(){if(!REDO.length){toast('Inget att göra om');return}HIST.push(snap());restore(REDO.pop());toast('Gjort om')}
$('#actUndo').onclick=()=>undo();$('#actRedo').onclick=()=>redo();

