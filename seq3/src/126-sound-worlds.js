/* ---------------- sound worlds ---------------- */
const WORLDS=[
 {name:'Velvet Night',short:'Velvet',pal:0,p:{keys:{tone:.35,decay:.75,space:.5,echo:.3},bass:{tone:.22,decay:.55},hat:{tone:.5},snare:{space:.3}},m:{space:.5,drive:.1,swing:.14,pump:.35,echo:.35}},
 {name:'Acid Garden',short:'Acid',pal:2,p:{bass:{tone:.8,decay:.22,echo:.12},hat:{tone:.85,decay:.2},keys:{tone:.6,decay:.25,echo:.4},perc:{echo:.5}},m:{drive:.3,echo:.45,space:.3,swing:.08,pump:.3}},
 {name:'Chrome Club',short:'Chrome',pal:3,p:{kick:{decay:.62,tone:.55},hat:{decay:.15,tone:.75},keys:{tone:.75,decay:.15,space:.2},bass:{tone:.45,decay:.3}},m:{pump:.55,swing:.04,drive:.18,space:.35,echo:.3}},
 {name:'Gul Studio',short:'Gul',pal:5,p:{},m:{}},
 {name:'Mörk Studio',short:'Mörk',pal:4,p:{},m:{}},
 {name:'Sunset Tape',short:'Sunset',pal:1,p:{keys:{tone:.3,decay:.55,space:.45},bass:{tone:.3,decay:.45},snare:{tone:.35},hat:{tone:.4}},m:{drive:.38,swing:.2,space:.45,echo:.35,filter:-.12}},
];
function refreshSound(){setTimeout(()=>{renderPlugs();refreshInst()});setPal(WORLDS[S.world].pal);$('#palBtn').textContent=WORLDS[S.world].short;applyAll();buildTrackKnobs();masterKnobs.forEach(k=>k.refresh())}
function applyWorld(i){S.world=i;const w=WORLDS[i];setPal(w.pal);$('#palBtn').textContent=w.short;save();toast(w.name+' · bara färg och bakgrund')}

