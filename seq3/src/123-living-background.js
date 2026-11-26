/* ---------------- living background ---------------- */
const PALS=[
 {name:'Aurora',base:[11,11,18],c:['#6B4CFF','#F255A8','#2EC5FF','#B9A6FF']},
 {name:'Glöd',  base:[18,9,6], c:['#F27A2E','#FF4A33','#F2C318','#8A2BE2']},
 {name:'Lime',  base:[6,14,10],c:['#3FA56E','#C9F23A','#F2C318','#1E6BFF']},
 {name:'Is',    base:[6,10,18],c:['#2E7BFF','#9FE7FF','#B9A6FF','#E6F0FF']},
 {name:'Mörk',  base:[5,5,6],c:['#26262B','#1C1C20','#303036','#202024'],mono:1},
 {name:'Gul',   base:[242,195,24],c:['#FFD84A','#E0AE00','#FFE680','#D89A00'],light:1},
];
const hex2=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const bg=$('#bg'),bx=bg.getContext('2d');
const blobs=[0,1,2,3].map(i=>({ph:i*1.7,sp:.05+i*.017,col:[0,0,0],r:.5+i*.06}));
let energy=0,selCol=hex2(TRACKS[0].hex),bgLast=0;
function setPal(i){S.pal=i;const P=PALS[i];document.body.classList.toggle('bg-light',!!P.light);blobs.forEach((b,k)=>b.target=hex2(P.c[k]));document.body.style.background=`rgb(${P.base})`;save()}
function drawBg(now){
  const W=Math.max(2,Math.round(innerWidth/6)),H=Math.max(2,Math.round(innerHeight/6));
  if(bg.width!==W||bg.height!==H){bg.width=W;bg.height=H}
  const P=PALS[S.pal]||PALS[0],t=RM?0:now/1000;
  bx.globalCompositeOperation='source-over';bx.fillStyle=`rgb(${P.base})`;bx.fillRect(0,0,W,H);
  bx.globalCompositeOperation=P.light?'source-over':'lighter';
  blobs.forEach((b,k)=>{b.target=b.target||hex2(P.c[k]);for(let j=0;j<3;j++)b.col[j]+=((k===0&&!P.mono?mix(b.target,selCol,.45)[j]:b.target[j])-b.col[j])*.04;
    const x=W*(.5+.38*Math.sin(t*b.sp*6+b.ph)),y=H*(.45+.36*Math.cos(t*b.sp*4.3+b.ph*1.3)),R=Math.max(W,H)*(b.r+(k===0?energy*.18:energy*.06));
    const g=bx.createRadialGradient(x,y,0,x,y,R),[r,gg,bb]=b.col.map(Math.round);
    g.addColorStop(0,`rgba(${r},${gg},${bb},${.38+(k===0?energy*.2:0)})`);g.addColorStop(.5,`rgba(${r},${gg},${bb},.18)`);g.addColorStop(1,`rgba(${r},${gg},${bb},0)`);
    bx.fillStyle=g;bx.fillRect(0,0,W,H)});
  bx.globalCompositeOperation='source-over';if(!P.light){bx.fillStyle='rgba(0,0,0,.36)';bx.fillRect(0,0,W,H)}}
const mix=(a,b,f)=>a.map((v,i)=>v+(b[i]-v)*f);
(()=>{const c=document.createElement('canvas');c.width=c.height=140;const x=c.getContext('2d'),d=x.createImageData(140,140);for(let i=0;i<d.data.length;i+=4){const v=Math.random()*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}x.putImageData(d,0,0);
  $('#grain').style.backgroundImage=`url(${c.toDataURL()})`})();

