/* ---------------- springs ---------------- */
// critically-underdamped spring for transforms: {x,y,r,s} toward targets
const SP=new Map();
function spr(el){let s=SP.get(el);if(!s){s={x:0,y:0,r:0,s:1,vx:0,vy:0,vr:0,vs:0,tx:0,ty:0,tr:0,ts:1,drag:false,k:380,c:34};SP.set(el,s)}return s}
function stepSprings(dt){SP.forEach((s,el)=>{
  const k=s.drag?900:s.k,c=s.drag?50:s.c;
  for(const [p,v,t] of [['x','vx','tx'],['y','vy','ty'],['r','vr','tr'],['s','vs','ts']]){const a=-k*(s[p]-s[t])-c*s[v];s[v]+=a*dt;s[p]+=s[v]*dt}
  const rest=!s.drag&&Math.abs(s.x-s.tx)+Math.abs(s.y-s.ty)+Math.abs(s.r-s.tr)*.1+Math.abs(s.s-s.ts)*50<.05&&Math.abs(s.vx)+Math.abs(s.vy)+Math.abs(s.vs)*50<.05;
  if(rest&&s.tx===0&&s.ty===0&&s.tr===0&&s.ts===1){el.style.transform='';SP.delete(el);return}
  el.style.transform=`translate3d(${s.x.toFixed(2)}px,${s.y.toFixed(2)}px,0) rotate(${s.r.toFixed(3)}deg) scale(${s.s.toFixed(4)})`})}

