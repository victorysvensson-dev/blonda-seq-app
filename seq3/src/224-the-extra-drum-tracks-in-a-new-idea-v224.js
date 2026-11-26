/* ================= The extra drum tracks in a new idea (v224) =================
   A new idea / a new groove used to write only the six first drums; Toms, Rim, Shaker, Bell and the other extra tracks kept old
   patterns that had nothing to do with the new beat. Now each style has its own patterns for them, sparse and mostly soft (they
   season the beat, they don't fill it): on every new beat at most three of the active extra tracks get one (chosen by the style's
   odds), the other active ones are emptied. Locked tracks keep theirs; tracks that are not in use are left alone.
   Letters as in the styles: X = accent, x = normal, o = medium, g = ghost. ================= */
(()=>{
  /* [odds, patterns] per style and track */
  const XD={
    house:{shaker:[.6,['.gxg.gxg.gxg.gxg','gogogogogogogogo','..o...o...o...o.']],conga:[.45,['......o...o..o..','...o..o.....o.o.','o.....o.o.....o.']],
      clave:[.3,['..o..o....o..o..','o..o..o...o..o..']],rim:[.3,['..............g.','...g......g.....']],bell:[.15,['..o.......o.....','....o.......o..o']],
      tom:[.2,['..............oo','.......o.....o..']],snap:[.25,['....o.......o...']],tick:[.25,['.g.g.g.g.g.g.g.g']],snare2:[.15,['............o...']]},
    techno:{tick:[.5,['g.g.g.g.g.g.g.g.','.g.g.g.g.g.g.g.g','gggggggggggggggg']],rim:[.45,['..o..o.o..o..o..','.o..o..o.o..o...','......o.......o.']],
      shaker:[.35,['gggogggogggogggo']],clave:[.3,['o..o..o..o..o..o']],tom:[.35,['..o.....o.o.....','.......o.......o']],bell:[.15,['..o...o...o...o.']],
      conga:[.15,['...o.....o......']],snap:[.1,['....o.......o...']],kick2:[.15,['..............o.']],snare2:[.1,['............g...']]},
    hiphop:{rim:[.5,['...g......g..g..','.......g.......g']],snap:[.45,['....X.......X...']],shaker:[.4,['g.o.g.o.g.o.g.o.','..o...o...o...o.']],
      tom:[.2,['.............oo.']],tick:[.2,['g.g.g.g.g.g.g.g.']],kick2:[.2,['X.........X.....']],snare2:[.2,['....o.......o...']],
      conga:[.1,['.......o......o.']],clave:[.1,['..o.....o.......']],bell:[.1,['..o.......o.....']]},
    electro:{clave:[.4,['o..o..o...o..o..','..o..o....o..o..']],rim:[.35,['...o..o....o..o.','......o.......o.']],tom:[.35,['......o.o.....o.','..........o.o...']],
      tick:[.35,['gggggggggggggggg','g.g.g.g.g.g.g.g.']],bell:[.3,['..o..o....o..o..','..o.......o.....']],shaker:[.2,['.g.g.g.g.g.g.g.g']],
      snap:[.2,['....o.......o...']],kick2:[.25,['X.....X...X.....']],snare2:[.2,['............o..o']],conga:[.1,['......o.....o...']]},
    trap:{snap:[.55,['........X.......']],kick2:[.3,['X.........X.....','X......X..X.....']],tick:[.35,['gggggggggggggggg','g.g.g.g.g.g.g.g.']],
      rim:[.3,['...g.......g..g.']],shaker:[.25,['..o...o...o...o.']],tom:[.2,['............ooo.']],snare2:[.25,['........o.......']],
      bell:[.15,['......o.......o.']],clave:[.1,['...o.......o....']],conga:[.05,['..........o.o...']]},
    disco:{shaker:[.6,['gogogogogogogogo','.o.o.o.o.o.o.o.o']],conga:[.55,['..o..o.o..o..oo.','o..o..o...o..o..']],bell:[.45,['..o...o...o...o.','o.o.o.o.o.o.o.o.']],
      clave:[.25,['o..o..o...o..o..']],tom:[.25,['..............oo']],rim:[.2,['...g.......g....']],snap:[.3,['....o.......o...']],
      tick:[.15,['.g.g.g.g.g.g.g.g']],snare2:[.1,['............o...']]},
    brk:{rim:[.45,['..g..g.g..g..g..']],shaker:[.45,['gogogogogogogogo']],tom:[.35,['......o.....o.o.','.............ooo']],tick:[.3,['g.g.g.g.g.g.g.g.']],
      conga:[.3,['...o..o.....o...']],snare2:[.3,['.......g.g......']],snap:[.25,['....o.......o...']],clave:[.2,['..o..o....o.....']],
      bell:[.15,['..o.......o.....']],kick2:[.1,['X.........x.....']]}};
  const EXTRA=TRACKS.map((t,i)=>i).filter(i=>TRACKS[i].x&&!TRACKS[i].mel);
  window.extraDrums=(pat,sty)=>{const T=XD[sty]||XD.house,act=EXTRA.filter(i=>(!window.trkOn||trkOn(i))&&!(S.lock&&S.lock[TRACKS[i].id]));if(!act.length)return [];
    /* who joins: each by its odds, in a shuffled order, at most three */
    const ord=act.slice().sort(()=>Math.random()-.5),on=[];ord.forEach(i=>{const e=T[TRACKS[i].id];if(e&&on.length<3&&Math.random()<e[0])on.push(i)});
    act.forEach(i=>{const row=pat[i];if(!row)return;cellsClear(row);if(on.includes(i))put(row,pickA(T[TRACKS[i].id][1]))});
    window.__xdLast=on.map(i=>TRACKS[i].id);return window.__xdLast};
  const _g=genDrumsS;genDrumsS=function(pat,sty){const r=_g.apply(this,arguments);try{extraDrums(pat,sty)}catch(e){console.error('extraDrums',e)}return r};
})();

