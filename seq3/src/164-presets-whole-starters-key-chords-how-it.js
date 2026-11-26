/* ---------- presets: whole starters — key, chords, how it plays, the sounds, the knobs and the fx. Modelled on the loops Victory
   picked (Komorebi "Reconnecting" packs). pat = written per layer, one string a bar: x = hit, - = held, . = rest, > (sub) = the next
   chord's root ahead of time; klo = top-line notes {step: semitones from the key's root, C4–B4}; without pat the rhythm (rh) is used ---------- */
const L_=(snd,o)=>Object.assign({snd,oct:0,lv:.75,len:.5,ton:.5},o||{});
const STX_PRE=[
  {nm:'mulet',bpm:120,root:6,mode:'dur',vc:'vid',subLo:25,ch:[[0,'add9'],[0,'add9'],[7,'sus2'],[7,'sus2'],[2,'add9'],[2,'add9'],[4,'m7'],[11,'maj7']],
    pat:{ack:['x-----..........','x-----..........','x-----..........','x-------x-----..'],sub:['x-----..........','x-----........>-','x-----........>-','x-------x-----..'],
      klo:{8:-5,12:2,28:2,33:6,44:4,46:6,60:-1},kl:{33:3}},
    lay:{ack:1,klo:1,sub:1,luft:0},ls:{ack:L_('mallet',{lv:1,len:.32}),klo:L_('glas',{lv:1,len:.42}),sub:L_('kort',{lv:.48,len:.34}),luft:L_('moln',{lv:.4})},
    k:{tail:0,ton:.76,len:.3,drv:0,tejp:.12,eko:.22,rum:.07,br:.35,pump:0,vol:.72},fx:{},g:{sving:0,lat:.08,human:.08}},
  {nm:'mulet natt',bpm:120,root:9,mode:'moll',vc:'vid',subLo:25,ch:[[0,'m9'],[0,'m9'],[8,'maj7'],[8,'maj7'],[3,'add9'],[3,'add9'],[10,'sus2'],[7,'m7']],
    pat:{ack:['x-------........','x-------........','x-------........','x-------x-------'],sub:['x-------........','x-------......>-','x-------......>-','x-------x-------'],
      klo:{8:7,12:3,26:2,28:-2,33:3,36:7,44:5,46:3,58:2,60:-2}},
    lay:{ack:1,klo:1,sub:1,luft:0},ls:{ack:L_('mallet',{lv:.62,len:.36}),klo:L_('mallet',{lv:.66,len:.32}),sub:L_('kort',{lv:.5,len:.38}),luft:L_('moln',{lv:.4})},
    k:{tail:0,ton:.4,len:.34,drv:0,tejp:.2,eko:.2,rum:.1,br:.25,pump:0,vol:.72},fx:{6:1},g:{sving:0,lat:.08,human:.08}},
  {nm:'håll om mig',bpm:100,root:3,mode:'moll',ch:[[0,'m9'],[10,'add9'],[8,'maj7'],[8,'maj9']],rh:['xxxxxxxxxxxxx.xx','xxxxxxxxxxxxxxxx','xxxxxxxxxx.xxxxx','xxxxxxxxxxxxxxxx'],
    lay:{ack:1,klo:0,sub:1,luft:1},ls:{ack:L_('mjuk',{lv:.62,ton:.55,len:.6,oct:-1}),klo:L_('sinus',{oct:-1}),sub:L_('808',{lv:.5}),luft:L_('mjuk',{lv:.5,ton:.45})},
    k:{tail:0.8,ton:.42,len:.6,drv:.25,tejp:.6,eko:.05,rum:.1,br:.12,pump:.3,vol:.72},fx:{4:1,8:1}},
  {nm:'sällskap',bpm:120,root:8,mode:'moll',ch:[[0,'m9'],[10,'add9'],[8,'maj9'],[7,'7sus4']],rh:['..x.xxx.x...xxxx','x.xxxxxxx.xxxxxx','..x.xxx.x...x.xx','x.x.x..x....xxx.'],
    lay:{ack:1,klo:1,sub:1,luft:0},ls:{ack:L_('stack',{lv:.72,ton:.55,oct:-1}),klo:L_('stack',{lv:.72,ton:.6}),sub:L_('sinus',{lv:.65}),luft:L_('mjuk')},mel:{dens:.85,reg:1},
    k:{tail:0.5,ton:.55,len:.4,drv:.3,tejp:.4,eko:.18,rum:.12,br:.7,pump:.35,vol:.72},fx:{1:1,3:1,6:1}},
  {nm:'sakta',bpm:114,root:11,mode:'moll',ch:[[0,'m9'],[3,'maj9'],[5,'m9'],[8,'maj7']],rh:['.xxxx..x..x.xx..','.xxxx..x....xxxx','xx.xx..x.x..x...','.xxxx..x....xx.x'],
    lay:{ack:1,klo:1,sub:1,luft:0},ls:{ack:L_('stack',{lv:.75,ton:.42,oct:-1}),klo:L_('glas',{lv:.65}),sub:L_('sinus',{lv:.25}),luft:L_('mjuk')},mel:{dens:.45,reg:1},
    k:{tail:0.7,ton:.3,len:.5,drv:.2,tejp:.65,eko:.2,rum:.15,br:.9,pump:.3,vol:.72},fx:{4:1,8:1,9:1}},
  {nm:'moln',bpm:140,root:2,mode:'dur',ch:[[2,'m9'],[10,'maj9'],[0,'maj9'],[9,'m9']],rh:['xxxxx...........','xxxxx.xxxxxxxxxx','xxxxx...........','xxxxx.xxx..xxxxx'],
    lay:{ack:1,klo:0,sub:0,luft:1},ls:{ack:L_('moln',{lv:1,oct:1,arp:{on:1,rate:'1/16',mode:'upp-ner',oct:2,gate:.5,fill:0}}),klo:L_('klocka'),sub:L_('sinus'),luft:L_('moln',{lv:.75,oct:1})},
    k:{tail:0.6,ton:.97,len:.45,drv:0,tejp:.25,eko:.32,rum:.3,br:.95,pump:.15,vol:.72},fx:{3:1,6:1,9:1}},
  {nm:'spring',bpm:100,root:10,mode:'moll',ch:[[0,'m9'],[0,'m9'],[10,'7'],[8,'maj9']],rh:['..xxxxxx.xx.x.x.','x.x.xxxxx.x.x.x.','x..xx.x..xx.x.x.','x..xxxx.xxx.xxx.'],
    lay:{ack:1,klo:1,sub:1,luft:0},ls:{ack:L_('plock',{lv:.6,oct:-1}),klo:L_('röst',{lv:.8}),sub:L_('808',{lv:.75}),luft:L_('mjuk')},mel:{dens:.7,reg:1},
    k:{tail:0.4,ton:.36,len:.35,drv:.15,tejp:.45,eko:.15,rum:.12,br:.6,pump:.3,vol:.72},fx:{1:1,6:1}},
  {nm:'lämna',bpm:138,root:5,mode:'moll',subLo:28,ch:[[3,'maj7'],[8,'maj7'],[0,'m9'],[7,'sus2']],
    pat:{ack:['x-----..........','......x-----....','x-----........x-','..x---..x---....'],sub:['x-----..........','......x-----....','x-----........x-','..x---..x---....'],klo:{4:7,22:3,40:10,46:7,58:5}},
    lay:{ack:1,klo:1,sub:1,luft:0},ls:{ack:L_('keys',{lv:.7,ton:.35,oct:1}),klo:L_('glas',{lv:.62}),sub:L_('808',{lv:.8,len:.7}),luft:L_('mjuk')},
    k:{tail:0.15,ton:.62,len:.5,drv:.3,tejp:.45,eko:.2,rum:.12,br:.5,pump:.2,vol:.72},fx:{3:1,6:1}},
  {nm:'burk',bpm:140,root:7,mode:'moll',ch:[[0,'m9'],[8,'add9'],[8,'6'],[7,'m7']],rh:['.xxxxxxxxxx.xxxx','xxxxx.x.x.xxxxxx','xxxxx.x.x.xxxxxx','xxxxxxxxx.x.xxxx'],
    lay:{ack:1,klo:0,sub:1,luft:0},ls:{ack:L_('stack',{lv:.75,ton:.25,oct:-1}),klo:L_('glas'),sub:L_('moog',{lv:.45}),luft:L_('mjuk')},
    k:{tail:0.6,ton:.4,len:.55,drv:.35,tejp:.55,eko:.1,rum:.1,br:1,pump:.4,vol:.72},fx:{2:1,4:1,8:1}},
  {nm:'efterlyst',bpm:90,root:11,mode:'moll',ch:[[8,'maj9'],[10,'add9'],[0,'m9'],[0,'m9'],[8,'maj9'],[10,'6'],[7,'7sus4'],[0,'m9']],rh:['.xxx.....xx.xxxx','x.......xxxxxxxx','.xx.x..x.x..xxx.','........xxxxxxxx'],
    lay:{ack:1,klo:1,sub:1,luft:0},ls:{ack:L_('juno',{lv:.78,len:.7,oct:-1}),klo:L_('keys',{lv:.55}),sub:L_('sinus',{lv:.3}),luft:L_('mjuk')},mel:{dens:.35,reg:1},
    k:{tail:0.75,ton:.22,len:.7,drv:.15,tejp:.55,eko:.12,rum:.2,br:.75,pump:.25,vol:.72},fx:{6:1,8:1,9:1}},
  {nm:'inte nog',bpm:114,root:0,mode:'moll',ch:[[8,'maj7'],[0,'madd9'],[8,'maj7'],[2,'7sus4']],rh:['.xx.x.xx.....xx.','xxxxxxx.x...xxx.','xxxxx.xx....xxxx','x...............'],
    lay:{ack:1,klo:1,sub:0,luft:0},ls:{ack:L_('mallet',{lv:.8,len:.38,oct:0}),klo:L_('plock',{lv:.66}),sub:L_('kort',{lv:.82,len:.42}),luft:L_('mjuk')},mel:{dens:.6,reg:1},
    k:{tail:0.2,ton:.4,len:.35,drv:.05,tejp:.3,eko:.2,rum:.1,br:.55,pump:.2,vol:.72},fx:{1:1,6:1}},
  /* UK grime: the bass is the Grime engine on the bass channel (wobble, octave jumps ^, slides), short dry stabs over it */
  {nm:'grime',bpm:134,root:2,mode:'moll',subLo:38,ch:[[0,'m9'],[8,'maj7'],[5,'m7'],[7,'7sus4']],eng:{grime:0},
    pat:{ack:['x.....x.........','..........x.....','x.....x.........','....x.....x.....'],sub:['....x---^-x---x-','...xx---^---x-^-','x-x-x---^---x---','x-....x-^-x.....']},
    lay:{ack:1,klo:0,sub:1,luft:0},ls:{ack:L_('stack',{lv:.6,len:.18,ton:.45}),klo:L_('glas'),sub:L_('e:grime',{lv:.85}),luft:L_('mjuk')},
    k:{tail:0,ton:.45,len:.25,drv:.35,tejp:.2,eko:.08,rum:.05,br:.4,pump:0,vol:.72},fx:{1:1,4:1,5:1},smp:[{on:1,amt:.3},{on:0}]},
  {nm:'grime dyk',bpm:140,root:4,mode:'moll',subLo:40,ch:[[0,'m7'],[0,'m7'],[8,'maj7'],[10,'add9']],eng:{grime:2},
    pat:{ack:['..x.......x.....','..x.......x...x.','..x.......x.....','..x...x...x.....'],sub:['x-x-x-x-....x-x-','x-x-x-x-....^-x-','x-x-x-x-....x-x-','x-^-x-^-x-x-x-x-']},
    lay:{ack:1,klo:0,sub:1,luft:0},ls:{ack:L_('mallet',{lv:.7,len:.2}),klo:L_('glas'),sub:L_('e:grime',{lv:.85}),luft:L_('mjuk')},
    k:{tail:0,ton:.62,len:.2,drv:.25,tejp:.15,eko:.06,rum:.04,br:.3,pump:0,vol:.72},fx:{1:1,2:1,5:1}},
  /* Hotel Room (128, A minor): Am9 – Cmaj7 – B7sus4 – Em7 under a warm keys bed, a voice chopped in between */
  {nm:'hotellrum',bpm:128,root:9,mode:'moll',ch:[[0,'m9'],[3,'maj7'],[2,'7sus4'],[7,'m7']],rh:['.xxx.xxxx..xxxxx','xxxxxxxxxxxx.xxx','xxx..xxxxxxxxxxx','xx.xxxxxxxxxxxxx'],
    lay:{ack:1,klo:1,sub:1,luft:1},ls:{ack:L_('juno',{lv:.72,len:.75,ton:.35,oct:-1}),klo:L_('glas',{lv:.5}),sub:L_('sinus',{lv:.6}),luft:L_('mjuk',{lv:.45,ton:.3})},mel:{dens:.3,reg:1},
    k:{tail:0.7,ton:.4,len:.75,drv:.15,tejp:.45,eko:.12,rum:.15,br:.6,pump:.3,vol:.72},fx:{3:1,6:1,8:1},smp:[{on:1,amt:.45},{on:0}]},
  /* Jupiter (94): wide maj9 chords struck off the beat (step 10), held and left to ring; bright keys, mono-ish */
  {nm:'jupiter',bpm:94,root:1,mode:'dur',ch:[[0,'maj9'],[5,'m9'],[2,'m9'],[8,'maj9']],
    pat:{ack:['..........x-----','......x---x-----','..........x-----','.......x--x-x---'],sub:['..........x-----','..........x-----','..........x-----','.......x--x-x---'],klo:{22:9,54:11}},
    lay:{ack:1,klo:1,sub:1,luft:1},ls:{ack:L_('juno',{lv:.8,len:.7,ton:.6}),klo:L_('keys',{lv:.6,ton:.6}),sub:L_('sinus',{lv:.6}),luft:L_('mjuk',{lv:.4,ton:.5})},
    k:{tail:.7,ton:.62,len:.65,drv:.1,tejp:.35,eko:.12,rum:.18,br:.35,pump:.1,vol:.72},fx:{3:1,9:1}},
  /* Tomorrow (110): a constant, very wide bed of keys with a voice-like layer — no gaps, everything flows */
  {nm:'imorgon',bpm:110,root:1,mode:'moll',ch:[[1,'sus2'],[3,'add9'],[3,'add9'],[0,'m7']],rh:['xxxxxxxxxxxxxxxx','xxxxxxxxxxxxxxxx','xxxxxxxxxxxxx.xx','xxxxxxxxxxxxxxxx'],
    lay:{ack:1,klo:0,sub:1,luft:1},ls:{ack:L_('keys',{lv:.75,len:.7,ton:.45,oct:-1}),klo:L_('glas'),sub:L_('sinus',{lv:.6}),luft:L_('kör',{lv:.55,ton:.4})},
    k:{tail:.85,ton:.4,len:.7,drv:.1,tejp:.45,eko:.08,rum:.2,br:1,pump:.15,vol:.72},fx:{8:1}},
  /* Introspection (140): a dark stack that keeps going, one accent a bar (step 12), the bass in the middle */
  {nm:'introspektion',bpm:140,root:5,mode:'moll',ch:[[0,'m7'],[10,'maj9'],[8,''],[9,'maj9']],rh:['.xx.xxxxxxxxxxxx','xx.xxxxxxxxxxxxx','xxxxxxxxxxxxxxxx','xxxxxxxxxxxxxxxx'],
    lay:{ack:1,klo:0,sub:1,luft:1},ls:{ack:L_('stack',{lv:.75,ton:.35,len:.65,oct:-1}),klo:L_('glas'),sub:L_('sinus',{lv:.65}),luft:L_('mjuk',{lv:.45,ton:.3})},
    k:{tail:.8,ton:.32,len:.65,drv:.25,tejp:.5,eko:.06,rum:.12,br:.25,pump:.35,vol:.72},fx:{8:1}},
  /* NY (95): a lead line on top, short and rhythmic, over soft Em chords */
  {nm:'ny',bpm:95,root:4,mode:'moll',ch:[[0,'m9'],[5,'m9'],[0,'m'],[8,'maj9'],[8,'maj7'],[7,'m9'],[8,'maj7'],[0,'m9']],rh:['x...x...x.x.x.x.','x..xx...x.x.x...','x.x.x...x.x.x.x.','x.......x.x.x.x.'],
    lay:{ack:1,klo:1,sub:1,luft:1},ls:{ack:L_('mjuk',{lv:.55,len:.6,ton:.45}),klo:L_('plock',{lv:1,ton:.55,len:.45}),sub:L_('sinus',{lv:.55}),luft:L_('mjuk',{lv:.45,ton:.4})},mel:{dens:.75,reg:1},
    k:{tail:.45,ton:.55,len:.45,drv:.15,tejp:.4,eko:.2,rum:.15,br:.6,pump:.25,vol:.72},fx:{1:1,6:1}},
  /* Different (102): sus and maj9 colours, chords pushed on the "and", deep sub, dark */
  {nm:'annorlunda',bpm:102,root:11,mode:'moll',ch:[[2,'sus4'],[0,'m9'],[5,'sus2'],[1,'maj9']],rh:['.xxx...x...x.xx.','.xxx...xxx.....x','xxxxx..x.....xx.','.xxxx...x......x'],
    lay:{ack:1,klo:1,sub:1,luft:0},ls:{ack:L_('juno',{lv:.75,len:.55,ton:.35}),klo:L_('mallet',{lv:.6}),sub:L_('808',{lv:.7})},mel:{dens:.3,reg:1},
    k:{tail:.5,ton:.36,len:.5,drv:.2,tejp:.5,eko:.12,rum:.12,br:.5,pump:.25,vol:.72},fx:{3:1,4:1}},
  /* ---- the big-synth presets (v181): the layers play through the app's synths (Bris, Moog, SH-101, Grime, Acid, Super Pad);
     ep = the engine presets they load. ---- */
  /* Berghain (130, A minor): Bris stabs on the off-beats, a 303 line rolling underneath, a Super Pad bed */
  {nm:'berghain',bpm:130,root:9,mode:'moll',ch:[[0,'m7'],[0,'m7'],[8,'maj7'],[10,'7sus4']],ep:{bris:'Stab 90'},
    pat:{ack:['..x-..x-..x-..x-','..x-..x-..x-..x-','..x-..x-..x-..x-','..x-..x-..x-.xx-'],sub:['x.x^x.xxx.^.x.x^','x.x^x.xxx.^.xx.^','x.x^x.xxx.^.x.x^','x^x.x^xxx.^.^x^x'],
      luft:['x---------------','x---------------','x---------------','x---------------']},
    lay:{ack:1,klo:0,sub:1,luft:1},ls:{ack:L_('e:bris',{lv:.66,len:.3}),klo:L_('glas'),sub:L_('e:acid',{lv:.72}),luft:L_('e:super',{lv:.75,oct:1,len:.95})},
    k:{tail:.3,ton:.5,len:.35,drv:.22,tejp:.15,eko:.18,rum:.12,br:.6,pump:.45,vol:.72},fx:{5:1,7:1}},
  /* Miami (118, F major): disco octaves on the Moog, a clavinet groove on Bris, strings of Super Pad, a glassy hook */
  {nm:'miami',bpm:118,root:5,mode:'dur',ch:[[0,'maj7'],[9,'m7'],[2,'m7'],[7,'7']],ep:{bris:'Clav-ish',mini:'Funk bas'},
    pat:{ack:['.x.x..x..x.x..x.','.x.x..x..x.x..x.','.x.x..x..x.x..x.','.x.x..x..x.x.xx.'],sub:['x.^.x.^.x.^.x.^.','x.^.x.^.x.^.x.^.','x.^.x.^.x.^.x.^.','x.^.x.^.x.^.x^x^'],
      luft:['x-------x-------','x-------x-------','x-------x-------','x-------x-------'],klo:{2:7,4:9,6:12,10:9,12:7,34:7,36:9,38:12,42:14,44:12,46:9},kl:{12:4,46:6}},
    lay:{ack:1,klo:1,sub:1,luft:1},ls:{ack:L_('e:bris',{lv:.62,len:.25}),klo:L_('glas',{lv:.95}),sub:L_('e:mini',{lv:.72,oct:1}),luft:L_('e:super',{lv:.75,oct:1,len:.95})},
    k:{tail:.35,ton:.6,len:.4,drv:.12,tejp:.2,eko:.15,rum:.14,br:.7,pump:.35,vol:.72},fx:{2:1,8:1}},
  /* Neon (100, E minor): a Model D bass in eighths, wide Super Pad chords, an SH-101 lead singing over it — synthwave */
  {nm:'neon',bpm:100,root:4,mode:'moll',ch:[[0,'m'],[8,'maj7'],[3,''],[10,'']],ep:{mini:'Model D bas',sh101:'Lead 101'},
    pat:{ack:['x-------x-------','x-------x-------','x-------x-------','x-------x---x---'],sub:['x.x.x.x.x.x.x.x.','x.x.x.x.x.x.x.x.','x.x.x.x.x.x.x.x.','x.x.x.x.x.x.^.^.'],
      klo:{0:7,4:10,6:12,8:10,12:7,16:8,20:7,22:3,24:5,28:3,32:7,36:10,38:12,40:14,44:12,48:10,52:7,54:5,56:3,60:2},kl:{12:4,28:4,44:4,60:4}},
    lay:{ack:1,klo:1,sub:1,luft:0},ls:{ack:L_('e:super',{lv:.75,len:.8}),klo:L_('e:sh101',{lv:.72,oct:-1}),sub:L_('e:mini',{lv:.72,oct:1}),luft:L_('mjuk')},
    k:{tail:.6,ton:.55,len:.7,drv:.1,tejp:.25,eko:.32,rum:.3,br:.75,pump:.2,vol:.72},fx:{3:1,9:1}},
  /* Tvåsteg (132, F# minor): UK garage — chopped Bris e-piano, a reese bass from Grime, a vocal-ish top */
  {nm:'tvåsteg',bpm:132,root:6,mode:'moll',ch:[[0,'m9'],[3,'maj9'],[8,'maj7'],[7,'m7']],ep:{bris:'Epiano bris',grime:'reese'},
    pat:{ack:['x..x..x...x..x..','x..x..x...x..x..','x..x..x...x..x..','x..x..x...x.xx..'],sub:['x-----..x.x-----','x-----....x---x-','x-----..x.x-----','x-----..x-x-^---'],
      klo:{2:7,5:10,8:12,11:10,14:7,22:3,26:5,29:7,34:7,37:10,40:12,43:14,46:12,54:10,58:7,61:5},kl:{14:4,46:4}},
    lay:{ack:1,klo:1,sub:1,luft:0},ls:{ack:L_('e:bris',{lv:.66,len:.35}),klo:L_('röst',{lv:.95}),sub:L_('e:grime',{lv:.72}),luft:L_('mjuk')},mel:{dens:.45,reg:1},
    k:{tail:.3,ton:.5,len:.4,drv:.15,tejp:.2,eko:.14,rum:.1,br:.55,pump:.3,vol:.72},fx:{1:1,5:1}},
  /* Solnedgång (122, G minor): afro house — Bris keys, a funky Moog bass, marimba-ish top, Super Pad */
  {nm:'solnedgång',bpm:122,root:7,mode:'moll',ch:[[0,'m7'],[5,'m7'],[0,'m7'],[3,'maj7']],ep:{bris:'Poly keys',mini:'Funk bas'},
    pat:{ack:['..x...x...x...x.','..x...x..x....x.','..x...x...x...x.','..x...x..x..x.x.'],sub:['x..x..x...x..x..','x..x..x...x.x...','x..x..x...x..x..','x..x..x.x.x.^.x.'],
      luft:['x---------------','x---------------','x---------------','x---------------'],klo:{0:12,3:10,6:7,10:5,12:7,16:10,19:12,22:15,26:12,28:10,32:12,35:10,38:7,42:5,44:3,48:5,51:7,54:10,58:7,60:5},kl:{12:3,28:3,44:3,60:4}},
    lay:{ack:1,klo:1,sub:1,luft:1},ls:{ack:L_('e:bris',{lv:.62,len:.3}),klo:L_('mallet',{lv:.9}),sub:L_('e:mini',{lv:.72,oct:1}),luft:L_('e:super',{lv:.75,oct:1,len:.95})},
    k:{tail:.45,ton:.5,len:.45,drv:.1,tejp:.25,eko:.2,rum:.15,br:.65,pump:.35,vol:.72},fx:{6:1,8:1}},
  /* Regn (82, D major): lofi — a dusty Bris e-piano, soft sub, an FM bell now and then, lots of tape */
  {nm:'regn',bpm:82,root:2,mode:'dur',ch:[[0,'maj9'],[9,'m9'],[4,'m9'],[7,'7']],ep:{bris:'Epiano bris'},
    rh:['x-----..x-----..','x-----..x---x-..','x-----..x-----..','x-----..x.x.x...'],
    lay:{ack:1,klo:1,sub:1,luft:0},ls:{ack:L_('e:bris',{lv:.7,len:.7,ton:.4}),klo:L_('e:fm',{lv:.45}),sub:L_('sinus',{lv:.6}),luft:L_('mjuk')},mel:{dens:.25,reg:1},
    k:{tail:.6,ton:.38,len:.65,drv:.15,tejp:.6,eko:.15,rum:.2,br:.5,pump:.15,vol:.72},fx:{3:1,4:1}},
  /* London (142, C# minor): drill — dark Bris keys, a sliding 808 from Grime (dyk), a cold bell melody */
  {nm:'london',bpm:142,root:1,mode:'moll',ch:[[0,'m'],[0,'m'],[8,''],[7,'']],ep:{bris:'Poly keys',grime:'dyk'},
    pat:{ack:['x-------........','x-------........','x-------........','x-------x-------'],sub:['x-----x---^-x---','x-----x-----x-^-','x-----x---^-x---','x---x-x---^-x-x-'],
      klo:{0:12,3:15,6:12,8:11,12:7,32:12,35:15,38:12,40:16,44:15},kl:{12:6,44:6}},
    lay:{ack:1,klo:1,sub:1,luft:0},ls:{ack:L_('e:bris',{lv:.62,len:.6,oct:-1}),klo:L_('klocka',{lv:.95}),sub:L_('e:grime',{lv:.75}),luft:L_('mjuk')},
    k:{tail:.4,ton:.42,len:.5,drv:.25,tejp:.2,eko:.18,rum:.12,br:.5,pump:0,vol:.72},fx:{1:1,4:1}},
  /* Flytande (174, B minor): liquid drum & bass — wide Super Pad chords, a rolling Bris sub, glassy top */
  {nm:'flytande',bpm:174,root:11,mode:'moll',ch:[[0,'m9'],[5,'m9'],[8,'maj9'],[10,'6add9']],ep:{bris:'Ladderbas'},
    pat:{ack:['x---------------','x---------------','x---------------','x-------x-------'],sub:['x.....x...x.....','x.....x...x...^.','x.....x...x.....','x.....x.x.x.^...'],
      klo:{0:14,6:12,10:10,12:7,16:10,22:12,26:14,28:15,32:14,38:12,42:10,44:7,48:5,54:7,58:10,60:12},kl:{12:4,28:4,44:4,60:4}},
    lay:{ack:1,klo:1,sub:1,luft:0},ls:{ack:L_('e:super',{lv:.75,len:.9}),klo:L_('glas',{lv:.95}),sub:L_('e:bris',{lv:.75}),luft:L_('mjuk')},mel:{dens:.35,reg:2},
    k:{tail:.7,ton:.55,len:.8,drv:.08,tejp:.2,eko:.22,rum:.28,br:.85,pump:.25,vol:.72},fx:{3:1,8:1}},
  /* Pianohus (124, C major): piano house — the Bris house chord stabbed, a Model D bass on the off-beat, Super Pad */
  {nm:'pianohus',bpm:124,root:0,mode:'dur',ch:[[9,'m7'],[5,'maj7'],[0,'add9'],[7,'7sus4']],ep:{bris:'House-ackord',mini:'Model D bas'},
    pat:{ack:['..x..x....x..x..','..x..x....x..x..','..x..x....x..x..','..x..x..x.x..xx.'],sub:['..x...x...x...x.','..x...x...x...x.','..x...x...x...x.','..x...x...x.^.x.'],
      luft:['x-------x-------','x-------x-------','x-------x-------','x-------x-------']},
    lay:{ack:1,klo:0,sub:1,luft:1},ls:{ack:L_('e:bris',{lv:.66,len:.3}),klo:L_('glas'),sub:L_('e:mini',{lv:.72,oct:1}),luft:L_('e:super',{lv:.75,oct:1,len:.95})},
    k:{tail:.4,ton:.6,len:.4,drv:.1,tejp:.15,eko:.15,rum:.15,br:.7,pump:.45,vol:.72},fx:{2:1,8:1}},
  /* Syra (126, E minor): acid house — the 303 is the top line (on the lead channel), an 808 underneath, stabs, a pad */
  {nm:'syra',bpm:126,root:4,mode:'moll',ch:[[0,'m7'],[0,'m7'],[10,''],[3,'']],
    pat:{ack:['x.......x.......','x...............','x.......x.......','x.......x...x...'],sub:['x.......x.......','x.......x.......','x.......x.......','x.......x...x...'],
      luft:['x---------------','x---------------','x---------------','x---------------'],
      klo:{0:0,2:12,3:0,6:10,8:0,10:12,11:7,14:3,16:0,18:12,19:0,22:10,24:0,26:15,27:12,30:7,32:0,34:12,35:0,38:10,40:0,42:12,43:7,46:3,48:0,50:12,52:10,54:7,56:12,58:15,60:12,62:10},
      kl:{0:1,2:1,3:1,6:1,8:1,10:1,11:1,14:1,16:1,18:1,19:1,22:1,24:1,26:1,27:1,30:1,32:1,34:1,35:1,38:1,40:1,42:1,43:1,46:1,48:1,50:1,52:1,54:1,56:1,58:1,60:1,62:1}},
    lay:{ack:1,klo:1,sub:1,luft:1},ls:{ack:L_('stack',{lv:.7,len:.25}),klo:L_('e:acid',{lv:.72,oct:-1}),sub:L_('808',{lv:.8}),luft:L_('e:super',{lv:.75,oct:1,len:.95})},
    k:{tail:.3,ton:.5,len:.3,drv:.2,tejp:.15,eko:.2,rum:.1,br:.6,pump:.4,vol:.72},fx:{5:1,7:1}},
  /* Stjärnor (140, F# minor): halftime trap — soft chords, a Bris bell arpeggio on top, long 808s, Super Pad */
  {nm:'stjärnor',bpm:140,root:6,mode:'moll',ch:[[0,'m9'],[8,'maj7'],[3,'maj7'],[10,'7sus4']],ep:{bris:'Arp-klocka'},
    rh:['xxxxxxxxxxxxxxxx','xxxxxxxxxxxxxxxx','xxxxxxxxxxxxxxxx','xxxxxxxxxxxx.xxx'],arp:'upp',
    lay:{ack:1,klo:1,sub:1,luft:1},ls:{ack:L_('mjuk',{lv:.5,len:.8}),klo:L_('e:bris',{lv:.6}),sub:L_('808',{lv:.72}),luft:L_('e:super',{lv:.75,oct:1,len:.95})},mel:{dens:.9,reg:1},
    k:{tail:.5,ton:.5,len:.7,drv:.12,tejp:.25,eko:.25,rum:.2,br:.7,pump:0,vol:.72},fx:{1:1,3:1}},
  /* Fanfar (92, D# minor): boom bap with Bris brass stabs, a fat Moog bass and dusty keys on top */
  {nm:'fanfar',bpm:92,root:3,mode:'moll',ch:[[0,'m9'],[5,'m7'],[3,'maj7'],[7,'7']],ep:{bris:'Brass 6',mini:'Funk bas'},
    pat:{ack:['x-..........x-..','x-......x-......','x-..........x-..','x-......x-..x-x-'],sub:['x-----...x.x----','x-----....x-----','x-----...x.x----','x-----..x-x-^---'],
      klo:{4:15,6:14,8:12,10:10,20:12,22:10,24:7,36:15,38:14,40:12,42:15,52:17,54:15,56:14,58:12},kl:{10:4,24:6,42:4,58:5}},
    lay:{ack:1,klo:1,sub:1,luft:0},ls:{ack:L_('e:bris',{lv:.75,len:.25}),klo:L_('keys',{lv:.9}),sub:L_('e:mini',{lv:.72,oct:1}),luft:L_('mjuk')},mel:{dens:.3,reg:1},
    k:{tail:.3,ton:.45,len:.4,drv:.25,tejp:.4,eko:.1,rum:.12,br:.45,pump:.1,vol:.72},fx:{3:1,4:1}}];
/* where the factory voice (röst) and one-shot (ljud) come in, per preset: [on, how often] */
{const M={'mulet':[[1,.3],[1,.22]],'mulet natt':[[1,.35],[0]],'hotellrum':[[1,.5],[1,.2]],'lämna':[[0],[1,.4]],'inte nog':[[1,.3],[0]],'spring':[[1,.25],[0]],'moln':[[1,.3],[0]],
  'efterlyst':[[0],[1,.3]],'jupiter':[[1,.3],[0]],'imorgon':[[1,.35],[0]],'annorlunda':[[1,.25],[1,.2]],'ny':[[0],[1,.25]],'grime':[[1,.3],[0]],'grime dyk':[[0],[1,.35]],'sakta':[[1,.25],[0]]};
  STX_PRE.forEach(p=>{const m=M[p.nm];if(m)p.smp=m.map(([on,amt])=>amt!=null?{on,amt}:{on})})}
/* fine-tuned against the loops (tone, sub level, chord octave, width, tail — measured band by band) */
{const T={jupiter:{ton:.77,sub:.75},imorgon:{ton:.55,sub:.45,aoct:0},introspektion:{sub:.5,aoct:-2},ny:{sub:.7},
   sakta:{sub:.4},'sällskap':{ton:.4,sub:.5},burk:{ton:.25,sub:.6,aoct:-2,fo:.9},annorlunda:{ton:.21,sub:.85},efterlyst:{ton:.07,br:.25,tail:1,rh:['xxxxxxxxxxxxxxxx','xxxxxxxx.xxxxxxx','xxxxxxxxxxxxxxxx','xxxxxxxx.xxxxxxx']}};
  STX_PRE.forEach(p=>{const t=T[p.nm];if(!t)return;if(t.ton!=null)p.k.ton=t.ton;if(t.br!=null)p.k.br=t.br;if(t.tail!=null)p.k.tail=t.tail;if(t.sub!=null&&p.ls.sub)p.ls.sub.lv=t.sub;if(t.aoct!=null&&p.ls.ack)p.ls.ack.oct=t.aoct;if(t.rh)p.rh=t.rh;if(t.fo)p.fo=t.fo})}
/* load a preset into the Starter: keeps on/off, volume and how the patterns follow */
function stxLoadPre(P,i){const R=STX_PRE[i];if(!R)return P;const d=STX_DEF();
  P.pre=i;P.styNm='';P.src='starter';P.fo=R.fo||null;P.root=R.root;P.mode=R.mode;P.prog=0;P.custom={mode:R.mode,ch:R.ch.map(e=>e.slice()),nm:R.nm};P.pat=R.pat?JSON.parse(JSON.stringify(R.pat)):null;
  P.rn=R.rn||'puls';P.rh=R.rh?R.rh.slice():null;P.vc=R.vc||'tät';P.subLo=R.subLo||33;P.arp=R.arp||'melodi';P.seed=R.seed||7;P.form=R.form||'allt';P.lay={...d.lay,...R.lay};
  P.ls=JSON.parse(JSON.stringify(STX_LDEF));for(const l in P.ls){Object.assign(P.ls[l],R.ls&&R.ls[l]||{});const a=R.ls&&R.ls[l]&&R.ls[l].arp;if(l==='ack'||l==='luft')P.ls[l].arp={...STX_ADEF,...(a||{})};else delete P.ls[l].arp}
  const vol=P.k&&P.k.vol!=null?P.k.vol:d.k.vol;P.k={...d.k,...R.k,vol};P.fx={...(R.fx||{})};P.mel={...d.mel,...(R.mel||{})};P.g={...d.g,...(R.g||{})};P.ed={klo:{},ack:{},sub:{},luft:{}};
  if(typeof S!=='undefined'&&S.inst){for(const l in P.ls){const sn=P.ls[l].snd;if(sn&&sn.startsWith('e:')&&P.lay[l])S.inst[stxTrkOf(l,sn)]=sn.slice(2)}
    if(R.eng&&R.eng.grime!=null&&typeof GR_PRE!=='undefined'){const E=engE('grime');Object.assign(E,GR_PRE[R.eng.grime][1]);E.pre=E._pl=R.eng.grime}
    if(R.ep&&window.__engLoad){for(const e in R.ep)__engLoad(e,R.ep[e]);if(window.__engRefresh)__engRefresh()}}
  if(!Array.isArray(P.smp))P.smp=d.smp;P.smp=P.smp.map((q,i)=>{const r=(R.smp||[])[i]||{};return {...d.smp[i],...q,on:r.on?1:0,...(r.amt!=null?{amt:r.amt}:{})}});return P}
const stxIsOwn=P=>!!(P.custom&&P.custom.mode===P.mode);
const stxProgName=P=>P.src==='piano'?'pianot':stxIsOwn(P)?(P.custom.nm||'egen'):STX_BANK[P.mode][Math.min(P.prog,STX_BANK[P.mode].length-1)][0];
const stxProg=P=>stxIsOwn(P)?P.custom.ch:STX_BANK[P.mode][Math.min(P.prog,STX_BANK[P.mode].length-1)][1];
const stxCh=(P,e)=>Array.isArray(e)?(()=>{const r=(P.root+e[0])%12;return {r,q:e[1],iv:STX_Q[e[1]]||STX_Q[''],name:STX_NN[r]+(STX_QN[e[1]]??e[1])}})():{r:e.r,iv:e.iv,name:e.name};
function stxChords(P){if(P.src==='piano'&&STX.live)return [0,1,2,3].map(()=>({r:STX.live.r,iv:STX.live.iv,name:STX.live.name}));return stxProg(P).map(e=>stxCh(P,e))}
/* the nearest named quality for a set of intervals (used when a piano chord gets edited) */
function stxNearQ(iv){const pc=new Set(iv.map(v=>v%12));let best='',bs=-9;for(const q in STX_Q){const qp=new Set(STX_Q[q].map(v=>v%12));let sc=0;qp.forEach(v=>sc+=pc.has(v)?1:-1);pc.forEach(v=>{if(!qp.has(v))sc-=.5});if(sc>bs){bs=sc;best=q}}return best}
function stxRoll(P){const p=STX_POOL[P.mode],out=[P.mode==='moll'?[0,'m9']:[0,'add9']],n=Math.random()<.5?4:8;
  while(out.length<n){const c=p[Math.floor(Math.random()*p.length)],l=out[out.length-1];if(c[0]===l[0]&&out.length%2)continue;out.push(c)}
  if(n===8&&Math.random()<.5)out[7]=P.mode==='moll'?[7,'7sus4']:[7,'sus4'];return out}
/* a new rhythm: bursts of 3–7 sixteenths with rests between, like the loops */
function stxRollRh(){const bar=()=>{let r='',s=Math.random()<.6?0:1+Math.floor(Math.random()*2);r='.'.repeat(s);while(r.length<16){const b=3+Math.floor(Math.random()*5),g=2+Math.floor(Math.random()*4);r+='x'.repeat(b)+'.'.repeat(g)}return r.slice(0,16)};
  const a=bar(),b=bar();return [a,b,a,bar()]}
/* v136: rhythms in more shapes than the bursts – long holds, 3-3-2 stabs, off-beats, busy – and bar orders AABA / ABAB / AAAB */
function stxRollRh2(){const ri=n=>Math.floor(Math.random()*n),pick=a=>a[ri(a.length)];
  const style=pick(['skur','skur','gles','synk','synk','studs','tät','halv']);
  const bar=()=>{let r='';
    if(style==='gles'){const a=pick([8,10,12,6,14]);r='x'.repeat(a)+'.'.repeat(16-a);if(Math.random()<.4)r=r.slice(0,12)+'.xxx'}
    else if(style==='synk'){r=pick(['xx.xx.x.xx.xx.x.','x..x..x.x..x..x.','xxx.xxx.xx.xxx..','x..x..xxx..x..xx','xx.x.xx.xx.x.xx.'])}
    else if(style==='studs'){r=pick(['.x.x.x.x.x.x.x.x','..xx..xx..xx..xx','.xx..xx..xx.x.xx','x.xx.x.xx.xx.x.x'])}
    else if(style==='tät'){r='xxxxxxxxxxxxxxxx'.split('').map((c,i)=>i&&Math.random()<.18?'.':'x').join('')}
    else if(style==='halv'){r=pick(['xxxxxxxx........','........xxxxxxxx','xxxx....xxxx....','xxxxxx..xxxxxx..'])}
    else{let q=Math.random()<.6?0:1+ri(2);r='.'.repeat(q);while(r.length<16){const b=3+ri(5),g=2+ri(4);r+='x'.repeat(b)+'.'.repeat(g)}r=r.slice(0,16)}
    return r};
  const a=bar(),b=bar(),c=bar(),ord=pick(['AABA','ABAB','AAAB','ABAC','AAAA']);return ord.split('').map(k=>k==='A'?a:k==='B'?b:c)}
/* "slumpa allt" (v136): a new Starter with real spread – key, scale, chords, rhythm, every layer's sound, octave, length and
   tone, which layers play, arps, the top line, groove, the knobs (kept clean: little drive and tape), fx, samples and a form
   that brings the layers in one by one now and then. Volume and the samples' own sounds are kept. */
function stxDiceAll(P){const R=Math.random,ri=n=>Math.floor(R()*n),pick=a=>a[ri(a.length)],wp=o=>{let t=0;for(const k in o)t+=o[k];let x=R()*t;for(const k in o){x-=o[k];if(x<=0)return k}return Object.keys(o)[0]},rng=(a,b)=>+(a+R()*(b-a)).toFixed(2);
  P.src='starter';P.pre=-1;P.styNm='';P.pat=null;P.root=ri(12);P.mode=R()<.65?'moll':'dur';P.seed=ri(1e6);
  if(R()<.3){P.custom=null;P.prog=ri(STX_BANK[P.mode].length)}else P.custom={mode:P.mode,ch:stxRoll(P)};
  /* rhythm: a named one, a new one, or a written pattern borrowed from a preset (moved to this key) */
  const rk=wp({namn:3,ny:5,lånad:2});
  if(rk==='lånad'){const L=STX_PRE.filter(x=>x.pat);if(L.length){P.pat=JSON.parse(JSON.stringify(pick(L).pat));P.rh=null}}
  if(!P.pat){if(rk==='ny'){P.rh=stxRollRh2()}else{P.rh=null;P.rn=pick(Object.keys(STX_RH))}}
  P.vc=R()<.5?'vid':'tät';P.subLo=pick([28,30,31,33,35,36]);
  /* sounds */
  const L=P.ls;L.ack.snd=wp({'dx-piano':5,rhodes:4,flygel:3,gitarr:2,juno:2,keys:1,plock:1,mjuk:1,stack:1,vibrafon:1,moln:1,korn:1});
  L.klo.snd=wp({'dx-klocka':3,'dx-mallet':2,marimba:2,kalimba:2,vibrafon:2,gitarr:1,rhodes:1,glas:1,sinus:1});L.sub.snd=wp({sinus:3,kort:2,'808':2,moog:2,fingerbas:3,'dx-bas':2});L.luft.snd=wp({korn:4,mjuk:2,moln:2,'kör':1});L.luft.snd=wp({mjuk:3,moln:3,'kör':2,juno:1});
  for(const l in L){L[l].tw=ri(1e6);L[l].len=rng(.3,.72);L[l].ton=rng(.42,.72);L[l].lv=l==='klo'?rng(.62,.82):rng(.66,.82)}
  L.ack.oct=+wp({'-1':1,'0':6,'1':1});L.klo.oct=+wp({'0':3,'1':1});L.luft.oct=+wp({'0':3,'-1':1});L.sub.oct=0;
  /* which layers; never fewer than two */
  P.lay={ack:R()<.85?1:0,klo:R()<.8?1:0,sub:R()<.85?1:0,luft:R()<.3?1:0};if(Object.values(P.lay).reduce((a,b)=>a+b,0)<2){P.lay.ack=1;P.lay.sub=1}
  /* arps: the chords as an arpeggio now and then, the air too, rarely */
  L.ack.arp={...STX_ADEF,on:R()<.25?1:0,rate:wp({'1/16':3,'1/8':2,'1/8T':1}),mode:pick(STX_AM.slice(0,4)),oct:R()<.3?2:1,gate:rng(.35,.75),fill:R()<.3?1:0};
  L.luft.arp={...STX_ADEF,on:P.lay.luft&&R()<.2?1:0,rate:wp({'1/8':2,'1/4':1,'1/16':1}),mode:pick(STX_AM.slice(0,4)),oct:1,gate:rng(.4,.8),fill:1};
  P.arp=wp({melodi:5,upp:1,ner:1,studs:1});P.mel={dens:rng(.2,.85),reg:ri(3)};
  P.g={sving:R()<.4?rng(.1,.45):0,lat:rng(.1,.4),human:rng(.08,.3)};
  /* knobs, clean by default */
  const vol=P.k.vol;P.k={ton:rng(.34,.62),len:rng(.3,.7),drv:R()<.6?0:rng(.04,.18),tejp:rng(.12,.4),eko:rng(.04,.32),rum:rng(.05,.3),br:rng(.25,.65),pump:rng(.05,.5),tail:rng(.1,.5),vol};
  /* fx: at most one, and a gentle one (echo throw, dip, swell, filter) – stutter, roll, reverse, tape stop and gate are for you to add */
  P.fx={};if(R()<.4)P.fx[pick([6,8,9,7])]=1;
  (P.smp||[]).forEach((q,k)=>{if(!q)return;q.on=q.id&&R()<(k?.22:.35)?1:0;q.amt=rng(.25,.45)});
  /* the form is left as it is (all layers from the start unless you chose otherwise in "form") */
  P.ed={klo:{},ack:{},sub:{},luft:{}};return P}
/* voicing: around C4–C5, each chord close to the last, the 9th on top */
/* wide voicing: the root around D3–C#4, the colour tones (3rd, 9th, 7th …) up around G4–F#5 — wide and open, like the loops */
function stxVoiceWide(ch){return ch.map(c=>{const iv=c.iv||STX_Q[c.q]||STX_Q[''],pcs=[...new Set(iv.map(v=>v%12))],pref=[4,3,2,11,10,5,9,6,7],up=[];
  pref.forEach(p=>{if(up.length<2&&pcs.includes(p))up.push(p)});const r=50+(((c.r-50)%12)+12)%12;return [r,...up.map(p=>67+((((c.r+p)-67)%12)+12)%12)].sort((a,b)=>a-b)})}
function stxVoice(ch){let prev=null;return ch.map(c=>{const iv=c.iv||STX_Q[c.q]||STX_Q[''];let best=null,bs=1e9;
  for(let base=45;base<=57;base++){if(base%12!==c.r)continue;for(let inv=0;inv<Math.min(3,iv.length);inv++){const ns=iv.map((v,i)=>base+v+(i<inv?12:0)).sort((a,b)=>a-b);
    if(ns[0]<50||ns[ns.length-1]>79)continue;const ctr=ns.reduce((a,b)=>a+b,0)/ns.length,sc=prev?Math.abs(ctr-prev):Math.abs(ctr-63);if(sc<bs){bs=sc;best=ns}}}
  best=best||iv.map(v=>57+((c.r+v)%12));prev=best.reduce((a,b)=>a+b,0)/best.length;return best})}

/* the plan: 64 steps, what each layer plays. Every layer follows the bursts of the rhythm: the chord is struck at the start of a
   burst and re-struck on its 8ths, the top line plays a melody (stepwise, gliding inside the burst) or an arpeggio, sub and
   luft hold through the burst. Before a burst that comes after a rest: a reversed swell ("sug"). */
function stxPlan(P){const ch=stxChords(P),two=ch.length>4,V=P.vc==='vid'?stxVoiceWide(ch):stxVoice(ch),R=stxRh(P),out=new Array(64).fill(null),sw=new Array(64).fill(null),ED=P.ed||{},edOf=(k,ci)=>{const e=(ED[k]||{})[ci];return e&&e.nm===ch[ci].name?e:null};
  ch.forEach((c,ci)=>{const e=edOf('ack',ci);if(e&&e.ns.length)V[ci]=e.ns.slice().sort((a,b)=>a-b)});
  const rnd=i=>{let h=(Math.imul(i+1,2654435761)+Math.imul((P.seed|0)+1,97531))>>>0;h^=h>>>15;h=Math.imul(h,2246822519)>>>0;h^=h>>>13;return (h>>>0)/4294967296};
  const ctr=[66,74,81][P.mel.reg]??74,dn=P.mel.dens;
  const pool=v=>{const o=new Set();v.forEach(n=>{for(const k of [-12,0,12,24]){const m=n+k;if(m>=ctr-12&&m<=ctr+12)o.add(m)}});return [...o].sort((a,b)=>a-b)};
  const isX=g=>(R[(g>>4)&3]||'')[g&15]==='x';let mi=null;
  if(P.pat){const T=P.pat,ciOf=g=>two?(g>>4)*2+((g&15)<8?0:1):(g>>4),str=(k,g)=>((T[k]||[])[g>>4]||'')[g&15]||'.',lo=P.subLo??33,sn=r=>lo+(((r-lo)%12)+12)%12;
    const run=(k,g)=>{let e=g+1;while(e<64&&str(k,e)==='-')e++;return e-g},ref=60+P.root,kl=T.klo||{},kn=Object.keys(kl).map(Number).filter(g=>g>=0&&g<64).sort((a,b)=>a-b);
    for(let g=0;g<64;g++){if(!isX(g))continue;const ci=ciOf(g),ev={ci};out[g]=ev;
      if(str('ack',g)==='x'){ev.ack={ns:V[ci],l:run('ack',g),re:false}}
      const u=str('sub',g);if(u==='x'||u==='>'||u==='^'){const cj=u==='>'?(ciOf(((g|15)+1)%64)):ci,es=edOf('sub',cj);ev.sub={n:(es?es.n:sn(ch[cj].r))+(u==='^'?12:0),l:run('sub',g)}}
      const lf=T.luft?str('luft',g):str('ack',g);if(lf==='x'){const el=edOf('luft',ci);ev.luft={ns:el&&el.ns.length?el.ns.slice():V[ci].map(n=>n-12),l:T.luft?run('luft',g):run('ack',g)}}
      const ki=kn.indexOf(g);if(ki>=0){const nx=ki+1<kn.length?kn[ki+1]:64;ev.klo={n:ref+kl[g],l:Math.max(1,Math.min(nx-g,(T.kl||{})[g]||2)),gl:false}}}}
  else for(let b=0;b<4;b++){const r=R[b]||'',at=s=>two?b*2+(s<8?0:1):b;let s=0,ai=0;
    while(s<16){if(r[s]!=='x'){s++;continue}let e=s;while(e<16&&r[e]==='x')e++;
      {const G=b*16+s;let rest=0;while(rest<16&&!isX((G-1-rest+64)%64))rest++;if(rest>=3)sw[(G-2+64)%64]={ns:V[at(s)],l:2}}
      const ons=[];for(let q=s;q<e;q++)if(q===s||((q-s)%2===0?rnd(b*16+q)<.5+dn*.5:rnd(b*16+q+101)<dn*.55))ons.push(q);
      const hits=[];for(let q=s;q<e;q++)if(q===s||(two&&q===8)||((q-s)%2===0?rnd(b*16+q+33)<.9:rnd(b*16+q+55)<.22))hits.push(q);
      for(let q=s;q<e;q++){const ci=at(q),v=V[ci],nw=q===s||(two&&q===8),ev={ci};
        let nx=q+1;while(nx<e&&!(two&&nx===8))nx++;const seg=nx-q;
        const hi=hits.indexOf(q);if(hi>=0){let nh=hi+1<hits.length?hits[hi+1]:e;if(two&&q<8&&nh>8)nh=8;ev.ack={ns:v,l:nh-q,re:!nw}}
        if(nw){const es=edOf('sub',ci),el=edOf('luft',ci);ev.sub={n:es?es.n:(P.subLo??33)+(((ch[ci].r-(P.subLo??33))%12)+12)%12,l:seg};ev.luft={ns:el&&el.ns.length?el.ns.slice():v.map(n=>n-12),l:seg}}
        if(P.arp==='melodi'){const oi=ons.indexOf(q);if(oi>=0){const pl=pool(v);let idx;
            if(mi==null)idx=pl.reduce((bi,n,i)=>Math.abs(n-ctr)<Math.abs(pl[bi]-ctr)?i:bi,0);
            else{const near=pl.reduce((bi,n,i)=>Math.abs(n-mi)<Math.abs(pl[bi]-mi)?i:bi,0),d=[0,1,-1,1,-1,2,-2,1][Math.floor(rnd(b*16+q+7)*8)];idx=Math.max(0,Math.min(pl.length-1,near+d))}
            const n=pl[idx],nq=oi+1<ons.length?ons[oi+1]:e;ev.klo={n,l:nq-q,gl:q!==s&&mi!=null};mi=n}}
        else if(!nw){const up=[...v].sort((a,b)=>a-b),L=up.length;let k;
          if(P.arp==='ner')k=L-1-(ai%L);else if(P.arp==='studs'){const p=Math.max(1,2*L-2),m=ai%p;k=m<L?m:p-m}else k=ai%L;
          let n=up[k]+12;while(n>86)n-=12;ev.klo={n,l:1};ai++}
        out[b*16+q]=ev}
      s=e}}
  /* your own top-line notes: a number = that note here, 0 = nothing here (the chords play alone) */
  const KE=ED.klo||{};let edited=false;for(const k in KE){const g=+k;if(!(g>=0&&g<64))continue;edited=true;const v=KE[k];
    if(v===0){if(out[g])delete out[g].klo}else{if(!out[g])out[g]={ci:two?(g>>4)*2+((g&15)<8?0:1):(g>>4)};out[g].klo={n:v,l:1,gl:false,own:1}}}
  if(edited){const on=[];for(let g=0;g<64;g++)if(out[g]&&out[g].klo)on.push(g);
    on.forEach((g,i)=>{const nx=i+1<on.length?on[i+1]:64;let e=g+1;while(e<64&&isX(e)&&!(out[e]&&out[e].klo))e++;out[g].klo.l=Math.max(1,Math.min(nx,isX(g)?e:g+2)-g);
      if(out[g].klo.own&&i>0&&on[i-1]+out[on[i-1]].klo.l>=g&&isX(g)&&isX(g-1))out[g].klo.gl=true})}
  /* the arpeggios: every note with its time in 16ths (t), length (d), velocity, filed by the step it starts in */
  const arp={};for(const lay of ['ack','luft']){const A=P.ls&&P.ls[lay]&&P.ls[lay].arp;if(!A||!A.on)continue;const r=STX_AR[A.rate]||1,n=Math.round(64/r),by=Array.from({length:64},()=>[]),all=[];
    const ciOf=g=>two?(g>>4)*2+((g&15)<8?0:1):(g>>4);
    for(let k=0;k<n;k++){const t=k*r,g=Math.min(63,Math.floor(t+1e-6));let ns=null;
      if(A.fill){ns=lay==='luft'?V[ciOf(g)].map(x=>x-12):V[ciOf(g)]}
      else for(let q=g;q>=Math.max(0,g-16);q--){const e=out[q]&&out[q][lay];if(e){if(q+e.l>g)ns=e.ns;break}}
      if(!ns||!ns.length)continue;const up=[...ns].sort((a,b)=>a-b),pool=[],src=A.mode==='spelat'?ns:up;for(let o=0;o<Math.max(1,A.oct|0);o++)pool.push(...src.map(x=>x+12*o));const L=pool.length;let i;
      if(A.mode==='ner')i=L-1-(k%L);else if(A.mode==='upp-ner'){const per=Math.max(1,2*L-2),m=k%per;i=m<L?m:per-m}else if(A.mode==='slump')i=Math.floor(rnd(k*13+lay.length)*L);else i=k%L;
      const nt={t,d:Math.max(.12,r*A.gate),n:pool[i],v:Math.abs(t%4)<1e-6?1:Math.abs(t%2)<1e-6?.86:.74};by[g].push(nt);all.push(nt)}
    arp[lay]={by,all,rate:r}}
  /* the sample slots: "klipp" = chops of a voice on the off-beats and in the gaps, "ett" = a one-shot on the chord, now and then */
  /* the sample slots fill the gaps: where the Starter is quiet for 2+ steps, now and then a piece of the voice (klipp) or the
     one-shot (ett), pitched to the chord there and no longer than the gap — a small in-between. No gaps (dense loops):
     the end of a bar, short. */
  const sx=[0,1].map(k=>{const Q=(P.smp||[])[k],by=new Array(64).fill(null);if(!Q||!Q.on)return by;const ciOf=g=>two?(g>>4)*2+((g&15)<8?0:1):(g>>4),r=q=>rnd(q*7919+k*104729+5);
    const gaps=[];for(let g=0;g<64;){if(isX(g)){g++;continue}let e=g;while(e<64&&!isX(e))e++;if(e-g>=2)gaps.push([g,e-g]);g=e}
    const cap=Q.mode==='ett'?8:4,amt=Math.min(1,Q.amt*1.25);
    if(gaps.length){let cnt=0;const most=Q.mode==='ett'?3:4;gaps.forEach(([g0,l],j)=>{if(cnt>=most||r(g0+17*j)>=amt)return;cnt++;const off=l>=4&&r(g0+3)<.4?1:0,g=g0+off,ll=Math.min(cap,l-off);if(ll<1)return;
        const fx=Q.fx??.5;by[g]={ci:ciOf(g),l:ll,r:r(g+70),rev:Q.mode!=='ett'&&r(g+90)<.06+fx*.2,stu:Q.mode!=='ett'&&ll>=3&&r(g+110)<.08+fx*.3,thr:r(g+130),rv:r(g+150)}})
      /* at least once a loop: the longest gap (the voice the first, the one-shot the second longest) */
      if(!by.some(Boolean)){const gs=gaps.slice().sort((x,y)=>y[1]-x[1]),G=gs[Math.min(gs.length-1,k)];const ll=Math.min(cap,G[1]);by[G[0]]={ci:ciOf(G[0]),l:ll,r:r(G[0]+70),rev:false,stu:false}}}
    else for(let b=0;b<4;b++){if(r(b*31)>=amt*.6)continue;const g=b*16+(Q.mode==='ett'?12:14);by[g]={ci:ciOf(g),l:Q.mode==='ett'?4:2,r:r(g+70),rev:false,stu:false}}
    /* a slot that is on is always heard at least once a loop (the voice at the end of the last bar, the sound at the end of the second) */
    if(!gaps.length&&!by.some(Boolean)){const g=k?28:62;by[g]={ci:ciOf(g),l:2,r:r(g+70),rev:false,stu:false}}
    return by});
  /* voice and one-shot never on top of each other: the voice wins */
  for(let g=0;g<64;g++){const e=sx[1][g];if(!e)continue;for(let q=Math.max(0,g-4);q<Math.min(64,g+e.l);q++){const v=sx[0][q];if(v&&q+v.l>g){sx[1][g]=null;break}}}
  if(P.smp&&P.smp[1]&&P.smp[1].on&&!sx[1].some(Boolean)){const busy=new Array(64).fill(0);sx[0].forEach((v,q)=>{if(v)for(let i=q;i<Math.min(64,q+v.l);i++)busy[i]=1});
    let best=null;for(let g=0;g<64;){if(isX(g)||busy[g]){g++;continue}let e=g;while(e<64&&!isX(e)&&!busy[e])e++;if(e-g>=2&&(!best||e-g>best[1]))best=[g,e-g];g=e}
    if(best)sx[1][best[0]]={ci:two?(best[0]>>4)*2+((best[0]&15)<8?0:1):(best[0]>>4),l:Math.min(8,best[1]),r:.5,rev:false,stu:false}}
  return {ch,two,steps:out,sw,V,arp,sx}}

