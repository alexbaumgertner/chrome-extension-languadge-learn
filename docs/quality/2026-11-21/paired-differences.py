import re,random,json,sys,statistics as st
txt=open(sys.argv[1]).read()
secs=re.split(r'\n## (\d+)\. ',txt)[1:]
D={} # label -> {idx:{crit:val}}, level per idx
lvl={}
for i in range(0,len(secs),2):
    idx=int(secs[i]); body=secs[i+1]
    m=re.match(r'[^\n]*· ([A-C0-9+\-]+)',body); lvl[idx]=m.group(1)
    for lab,sc in re.findall(r'\*\*([\w\-]+)\*\* \(shown as \w\)\n(?:.*\n)*?\nmeaning (\d) · grammar (\d) · level (\d) · glosses (\d)',body) if False else []: pass
    for mm in re.finditer(r'\*\*([\w\-]+)\*\* \(shown as \w\).*?meaning (\d) · grammar (\d) · level (\d) · glosses (\d)',body,re.S):
        lab=mm.group(1); D.setdefault(lab,{})[idx]=dict(zip(['meaning','grammar','level','glosses'],map(int,mm.groups()[1:])))
crit=['meaning','grammar','level','glosses']
random.seed(1)
def ci(diffs):
    n=len(diffs);bs=sorted(sum(random.choice(diffs) for _ in range(n))/n for _ in range(5000))
    return sum(diffs)/n,bs[125],bs[4875]
def base(i,c): return (D['38-v2-a'][i][c]+D['38-v2-b'][i][c])/2
out=[]
def rep(name,idxs,cand):
    row=[]
    for c in crit:
        d=[D[cand][i][c]-base(i,c) for i in idxs]
        m,lo,hi=ci(d); row.append(f"{m:+.2f} [{lo:+.2f}, {hi:+.2f}]")
    return row
allidx=sorted(lvl)
print("n",len(allidx), {l:sum(1 for i in allidx if lvl[i]==l) for l in set(lvl.values())})
# baseline spread a vs b
for c in crit:
    d=[D['38-v2-a'][i][c]-D['38-v2-b'][i][c] for i in allidx]; m,lo,hi=ci(d); print('spread a-b',c,f"{m:+.2f} [{lo:+.2f},{hi:+.2f}]")
for cand in ['lite31-v2-minimal','lite31-v2-low','lite35-v2-minimal']:
    print('##',cand,'ALL',dict(zip(crit,rep('all',allidx,cand))))
    for l in sorted(set(lvl.values())):
        ix=[i for i in allidx if lvl[i]==l]; print('  ',l,len(ix),dict(zip(crit,rep(l,ix,cand))))
# grammar<=3 counts
for lab in D: print(lab,'grammar<=3:',sum(1 for i in allidx if D[lab][i]['grammar']<=3),'meaning<=3:',sum(1 for i in allidx if D[lab][i]['meaning']<=3))
