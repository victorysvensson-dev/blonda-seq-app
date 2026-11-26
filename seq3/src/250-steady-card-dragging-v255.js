/* ================= steady card dragging (v255) =================
   A card being dragged follows the finger with a stiff spring (k 900, damping 50). The springs were stepped once per
   frame; when the frame rate drops (while playing, everything draws) a frame is up to 33 ms, and at that step the stiff
   spring is unstable – it overshoots more every frame, so the card shook and zoomed wildly. Now each frame is split into
   steps of at most 4 ms, where both springs are steady (checked: the step's growth factor stays well under 1). ================= */
(()=>{try{const one=stepSprings;stepSprings=function(dt){const n=Math.max(1,Math.ceil(dt/.004)),h=dt/n;for(let i=0;i<n;i++)one(h)}}catch(e){console.warn('dragfix',e)}})();

