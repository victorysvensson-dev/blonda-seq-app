/* ================= v236: no glimpse of an older-looking SEQ.3 while the page starts =================
   The page is first drawn in its plain form (the glass look, the intro in Swedish) and only then gets your saved look and
   English – for a moment it looked like an old version, most visibly in the app. The page now stays hidden on the dark
   background until everything is set (this is the last part to run), then shows in its right look. ================= */
requestAnimationFrame(()=>requestAnimationFrame(()=>{const s=document.getElementById('bootcov');if(s)s.remove()}));

