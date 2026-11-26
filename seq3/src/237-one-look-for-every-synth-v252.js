/* ================= one look for every synth (v252) =================
   Bris (was blue metal), Moog (walnut and silkscreen), SH-101 (grey hardware) and the small synth card get the same dark
   BLONDA look as the rest of the app: flat dark panels with one hairline, square corners, lower-case mono captions,
   one knob (a ring that fills, a flat cap, a white pointer), one slider, one switch, one preset row (‹ name ›) and one
   kind of chip for tracks, categories and engines. The controls work exactly as before; only how they look changed.
   Colour is kept where it carries meaning: each engine's dot, and Bris's display. ================= */
(()=>{
  const C={bg:'#1C1E20',bg2:'#141517',bg3:'#0F1011',ln:'#2E3032',ln2:'#3A3C3F',ink:'#E8E6DC',mute:'rgba(232,230,220,.5)',dim:'rgba(232,230,220,.35)',acc:'#F2C318'};
  const K=`body :is(.card.bris,.card.clone)`;
  const css=document.createElement('style');css.id='synthskin';
  css.textContent=`
