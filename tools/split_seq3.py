"""One-time: split Shell/Web/index.html into seq3/src/ at the section headers. tools/build_seq3.py puts it back together;
the result must be byte-identical. Not needed again after the split."""
import re,os,sys,json
SRC='Shell/Web/index.html';OUT='seq3/src'
s=open(SRC,encoding='utf-8').read()
cuts={0}
# block boundaries
for m in re.finditer(r'<(script|style)([^>]*)>',s):
    cuts.add(m.end());e=s.find('</'+m.group(1)+'>',m.end());cuts.add(e)
# section headers inside code and css (a comment starting a line with ---- or ====)
for m in re.finditer(r'\n(/\* ?[-=]{4,}[^\n]{0,120})',s):cuts.add(m.start()+1)
# big embedded data (fonts) into their own pieces
for m in re.finditer(r'[A-Za-z0-9+/=]{20000,}',s):cuts.add(m.start());cuts.add(m.end())
cuts=sorted(c for c in cuts if 0<=c<=len(s));cuts.append(len(s));cuts=sorted(set(cuts))
os.makedirs(OUT,exist_ok=True)
def kind(pos):
    # what block are we in
    last=None
    for m in re.finditer(r'<(script|style)[^>]*>|</(script|style)>',s[:pos]):last=m
    if last and last.group(1):return 'js' if last.group(1)=='script' else 'css'
    return 'html'
blocks=[(m.end(),s.find('</'+m.group(1)+'>',m.end()),'js' if m.group(1)=='script' else 'css') for m in re.finditer(r'<(script|style)([^>]*)>',s)]
def kindAt(p):
    for a,b,k in blocks:
        if a<=p<b:return k
    return 'html'
man=[];n=0
for a,b in zip(cuts,cuts[1:]):
    if a==b:continue
    piece=s[a:b];k=kindAt(a)
    if re.fullmatch(r'[A-Za-z0-9+/=]+',piece) and len(piece)>=20000:k='b64'
    m=re.match(r'/\* ?[-=]{4,}\s*([^\n*]{0,60})',piece)
    slug=re.sub(r'[^a-z0-9]+','-',(m.group(1) if m else ('data' if k=='b64' else k)).lower()).strip('-')[:40] or k
    n+=1;name=f'{n:03d}-{slug}.{ "txt" if k=="b64" else k}'
    open(os.path.join(OUT,name),'w',encoding='utf-8',newline='').write(piece);man.append(name)
open('seq3/manifest.txt','w').write('\n'.join(man)+'\n')
print(len(man),'pieces')
