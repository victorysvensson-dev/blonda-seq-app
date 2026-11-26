"""Build SEQ.3: seq3/src/* in the order of seq3/manifest.txt -> Shell/Web/index.html (or the path given).
   python3 tools/build_seq3.py [out.html] [--check]   --check: only compare with the existing file."""
import sys,os
names=[l.strip() for l in open('seq3/manifest.txt') if l.strip()]
out=''.join(open(os.path.join('seq3/src',n),encoding='utf-8',newline='').read() for n in names)
dst=[a for a in sys.argv[1:] if not a.startswith('--')];dst=dst[0] if dst else 'Shell/Web/index.html'
if '--check' in sys.argv:
    cur=open(dst,encoding='utf-8',newline='').read();print('identical' if cur==out else 'DIFFERENT');sys.exit(0 if cur==out else 1)
open(dst,'w',encoding='utf-8',newline='').write(out);print('built',dst,len(out))
