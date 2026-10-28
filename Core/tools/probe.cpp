// probe <out.f32> <preset> <seconds> <tone> <bpm> [k=v ...] -- notes: n=<midi>@<t>:<len>:<vel>
#include "blonda/bris.hpp"
#include <cstdio>
#include <cstring>
#include <cstdlib>
#include <string>
#include <vector>
#include <memory>
using namespace blonda;
int main(int argc,char**argv){int c;const BrisPreset*P=brisPresets(c);auto e=std::make_unique<Bris>();e->prepare(48000);
 for(int i=0;i<c;++i)if(!std::strcmp(P[i].name,argv[2]))e->params=P[i].params;float sec=atof(argv[3]);e->trackTone=atof(argv[4]);e->bpm=atof(argv[5]);
 struct N{long f;int n;float v,len;};std::vector<N> notes;
 for(int i=6;i<argc;++i){std::string a=argv[i];auto q=a.find('=');std::string k=a.substr(0,q),v=a.substr(q+1);
  if(k=="n"){int n;float t,l,vv;sscanf(v.c_str(),"%d@%f:%f:%f",&n,&t,&l,&vv);notes.push_back({(long)(t*48000),n,vv,l});continue;}
  float x=atof(v.c_str());BrisParams&p=e->params;
#define F(n) if(k==#n)p.n=x;
  F(wave)F(pw)F(det)F(sub)F(noise)F(glide)F(drift)F(cut)F(res)F(fenv)F(kt)F(fvel)F(fA)F(fD)F(fS)F(fR)F(aA)F(aD)F(aS)F(aR)F(lfoW)F(lfoR)F(lfoSync)F(lfoDest)F(lfoAmt)F(cho)F(choMix)F(dly)F(dlyT)F(dlyFb)F(vmode)F(vol)
 }
 int Nn=(int)(sec*48000);std::vector<float>L(Nn),R(Nn);for(int i=0;i<Nn;i+=128){int fr=std::min(128,Nn-i);for(auto&n:notes)if(n.f>=i&&n.f<i+fr)e->noteOn(n.n,n.v,(int)(n.f-i),1,n.len);e->process(&L[i],&R[i],fr);}
 FILE*f=fopen(argv[1],"wb");for(int i=0;i<Nn;++i){fwrite(&L[i],4,1,f);fwrite(&R[i],4,1,f);}fclose(f);}
