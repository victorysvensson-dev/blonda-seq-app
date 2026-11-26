/* ================= library favourites: ☆ on every sound and preset, and a ★ tab ================= */
const FAVK='blonda.favs';let FAVS=(()=>{try{return new Set(JSON.parse(localStorage.getItem(FAVK)||'[]'))}catch(e){return new Set()}})();
function favHas(id){return FAVS.has(String(id))}
function favStar(el,id){const b=document.createElement('button');b.className='fav'+(favHas(id)?' on':'');b.title=favHas(id)?'Ta bort från favoriter':'Lägg till i favoriter';b.textContent=favHas(id)?'★':'☆';
  b.onclick=e=>{e.stopPropagation();id=String(id);if(FAVS.has(id))FAVS.delete(id);else FAVS.add(id);try{localStorage.setItem(FAVK,JSON.stringify([...FAVS]))}catch(e){globalThis.__el&&globalThis.__el(e)}renderLib()};el.appendChild(b)}

