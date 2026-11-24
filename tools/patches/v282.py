"""v282 (iPad test): patches applied straight to Shell/Web/index.html (the module sources were lost with an old cloud
environment, so from v282 every change is kept here as a patch script). Run: python3 tools/patches/v282.py"""
import json,sys
P='Shell/Web/index.html';s=open(P).read()
def R(a,b,n=1):
    global s
    assert s.count(a)==n,(s.count(a),a[:90]);s=s.replace(a,b)
R('class="ver">v281<','class="ver">v282<');R('seq.3 · v281','seq.3 · v282')
# 1. left in Swedish
add={"rund · tight":"round · tight","lång boom":"long boom","punch · klick":"punch · click","kort · djup":"short · deep","smutsig":"dirty","klassisk":"classic","tonad":"tuned","frasig":"crisp","kantslag":"rimshot","krossad":"crushed","rumsklang":"roomy","fingerknäpp":"finger snap","bred":"wide","metall":"metal","808-metall":"808 metal","brus · ljus":"noise · bright","mjuk":"soft","varm":"warm","808-klocka":"808 bell","trä":"wood","låg tom":"low tom","rim-tom":"rim tom","djup":"deep",
"Panorering":"Pan","Projektnamn":"Project name","oscillatorer":"oscillators","procent":"percent","Inspelning":"Recording","Kunde inte läsa filerna":"Could not read the files","Projektet hade trasiga delar som lagades:":"The project had broken parts that were fixed:","trasiga delar som lagades":"broken parts that were fixed",
"i fraserna":"in the phrases","ljud i biblioteket":"sounds in the library","i biblioteket":"in the library","hämtade från molnet":"fetched from the cloud","logga in för sync":"sign in to sync","logga in för synk":"sign in to sync","sync ej tillgänglig":"sync not available","synk ej tillgänglig":"sync not available","låtkedja":"song chain","mönsterval":"pattern choice","släpp ljudfiler här":"drop sound files here","släpp ljudfiler":"drop sound files","sync misslyckades":"sync failed","synk misslyckades":"sync failed","misslyckades":"failed","topp borta":"top gone","borta":"gone","välj ljudet i Starter":"pick the sound in the Starter","ljudet i Starter":"the sound in the Starter","hel":"full","tuff":"tough","▶ provlyssna":"▶ preview","provlyssna":"preview","kvantisera":"quantize","loopa":"loop","PULS":"PULSE","PULS 12":"PULSE 12","PULS 25":"PULSE 25","FYRKANT":"SQUARE","TRIANGEL":"TRIANGLE","OKTAV":"OCTAVE","DUR":"MAJOR","MOLL":"MINOR"}
R("  /* phrases that are also ordinary words or names stay whole-string only */","  /* (v282) left in Swedish until now: drum descriptions, a few labels, toasts and sound names */\n  Object.assign(DICT,"+json.dumps(add,ensure_ascii=False)+");\n  /* phrases that are also ordinary words or names stay whole-string only */")
# 2. deck channel names ran into each other: staggered on two lines when narrow, each cut to the room it has
R("""TRACKS.forEach((t,i)=>{const nm=t.name.toLowerCase();c.fillText(nm.length>6?nm.slice(0,5)+'.':nm,cw*(i+.5),h-3)});c.textAlign='left'}}""",
  """/* (v282) the names ran into each other: on two lines when the columns are narrow, each cut to the room it has */const st=cw<34,room=(st?cw*2:cw)-6;if(cw<18)c.font='500 7.5px \"BLONDA Mono\",monospace';
    TRACKS.forEach((t,i)=>{let nm=t.name.toLowerCase();while(nm.length>1&&c.measureText(nm).width>room)nm=nm.slice(0,-1);const y=st&&i%2?h-12:h-3,N1=TRACKS.length-1;const hw=c.measureText(nm).width/2;c.textAlign='center';c.fillText(nm,i===0?Math.max(hw+1,cw*.5):i===N1?Math.min(w-hw-1,cw*(i+.5)):cw*(i+.5),y)});c.textAlign='left'}}""")
# 3. a card in full screen was taller than the screen by its own padding (max-height counted without it): the bottom row
#    of the pattern grid was cut off
R(".fullhost>.card{width:min(100%,1200px);max-height:100%;overflow:auto;",".fullhost>.card{box-sizing:border-box;width:min(100%,1200px);max-height:100%;overflow:auto;")
# 4. the dot-matrix read-outs were drawn without the translation ("AV" on the fx dial, …)
R("function setDM(el,t,h){if(!el)return;","function setDM(el,t,h){if(!el)return;/* (v282) translated like every other text */if(typeof t==='string'&&window.i18n)t=window.i18n(t);")
# 5. the voices card said "A MOLL"
R("const md=C.mode==='dur'?'dur':'moll';","const md=C.mode==='dur'?'major':'minor';")
# 6. text fields are skipped by the translation: the project name field kept its Swedish label
R('aria-label="Projektnamn"','aria-label="Project name"',2)
# 7. the deck's stat read-outs ran out of their column on a narrow screen ("38/40" cut at the right): they shrink to fit
R("#dkMtr{width:100%;height:150px;display:block}","#dkMtr{width:100%;height:150px;display:block}\n.dk-stats b{min-width:0;max-width:100%;overflow:hidden}.dk-stats b svg.dmx{max-width:100%;height:auto}")
open(P,'w').write(s);print('ok',len(s))
