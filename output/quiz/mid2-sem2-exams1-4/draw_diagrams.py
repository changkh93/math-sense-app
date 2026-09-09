from pathlib import Path
import os
os.environ['MPLCONFIGDIR']='/tmp/mid2-mpl'
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np,math
B=Path(__file__).parent
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':14,'mathtext.fontset':'dejavusans'})
def setup(w=7,h=4):
 fig,ax=plt.subplots(figsize=(w,h));ax.set_aspect('equal');ax.axis('off');return fig,ax
def line(ax,*pts,style='-',color='#253747',lw=1.6):
 a=np.array(pts);ax.plot(a[:,0],a[:,1],style,c=color,lw=lw)
def label(ax,p,s,dx=0,dy=0):ax.text(p[0]+dx,p[1]+dy,s,ha='center',va='center')
def dot(ax,p,s,dx=0,dy=.23):ax.plot(*p,'o',ms=3,color='#253747');label(ax,p,f'${s}$',dx,dy)
def right(ax,p,u,v,z=.18):
 p=np.array(p);u=np.array(u,dtype=float);v=np.array(v,dtype=float);u=u/np.linalg.norm(u)*z;v=v/np.linalg.norm(v)*z;line(ax,p+u,p+u+v,p+v,lw=1)
def save(fig,r,n):
 d=B/f'authoring/round{r}/assets';fig.savefig(d/f'q{n:02}.png',dpi=180,bbox_inches='tight',pad_inches=.25,facecolor='white');fig.savefig(d/f'q{n:02}.svg',bbox_inches='tight',pad_inches=.25);plt.close(fig)
# R1Q2: two congruent right triangles, A is the right-angle vertex of ABC.
fig,ax=setup();A=np.array([0.,0.]);D=np.array([-2.,0.]);E=np.array([3.,0.]);bb=np.array([-2.,-3.]);C=np.array([3.,-2.]);line(ax,(-2.8,0),(3.9,0));line(ax,A,bb,C,A);line(ax,D,bb);line(ax,E,C);right(ax,D,[1,0],[0,-1]);right(ax,E,[-1,0],[0,-1]);right(ax,A,bb-A,C-A)
for p,s,dx,dy in [(A,'A',0,.25),(D,'D',0,.25),(E,'E',0,.25),(bb,'B',-.2,-.2),(C,'C',.2,-.2)]:dot(ax,p,s,dx,dy)
label(ax,(4,0),'$l$',0,.08);label(ax,(-1.2,-1.5),'$AB=AC$',-.4,.0);save(fig,1,2)
# R2Q7: similar prisms, a 30-60-90 base, original conflicting 4 cm replaced accurately.
fig,ax=setup(9,4.7)
for origin,scale,names in [(np.array([0.,0.]),.66,'ABCDEF'),(np.array([6.,0.]),1.,'GHIJKL')]:
 # schematic 3D projection; base angle labels carry exact geometry.
 pts=[origin+scale*np.array(t) for t in [(0,3.1),(-1.7,2.5),(1.4,2.5),(0,.6),(-1.7,0),(1.4,0)]]
 a,b,c,d,e,f=pts
 line(ax,a,b,c,a);line(ax,b,e,f,c);line(ax,a,d,style='--');line(ax,d,e,style='--');line(ax,d,f,style='--')
 for p,s in zip(pts,names):dot(ax,p,s,0,.22 if p is a else -.22)
 if names=='ABCDEF':
  label(ax,(b+c)/2,'$5\,cm$',0,.25);label(ax,(a+b)/2,r'$\frac{5\sqrt{3}}{2}\,cm$',-.75,.35)
 else:
  label(ax,(b+c)/2,'$9\,cm$',0,-.27);label(ax,(c+f)/2,'$7\,cm$',.5,0);label(ax,a,'$90^\circ$',0,-.4);label(ax,c,'$60^\circ$',-.55,.1)
ax.set_xlim(-2.8,8.4);ax.set_ylim(-.5,3.9);save(fig,2,7)
# R3Q7: exact geometry, no incompatible angle label.
fig,ax=setup(9,4.7);bb=np.array([0.,0.]);C=np.array([15.,0.]);A=np.array([12.,6.]);G=np.array([12.,0.]);M=np.array([7.5,0.]);v=A-M;H=M+np.dot(G-M,v)/np.dot(v,v)*v
line(ax,bb,A,C,bb);line(ax,A,G);line(ax,A,M);line(ax,G,H);right(ax,A,bb-A,C-A,.5);right(ax,G,A-G,bb-G,.45);right(ax,H,A-H,G-H,.35)
for p,s,dx,dy in [(A,'A',0,.4),(bb,'B',-.4,0),(C,'C',.4,0),(M,'M',0,-.5),(G,'G',0,-.5),(H,'H',-.6,.1)]:dot(ax,p,s,dx,dy)
label(ax,(6,-1.0),'$12\,cm$');label(ax,(13.5,-1.0),'$3\,cm$');ax.set_xlim(-1,16);ax.set_ylim(-1.5,7);save(fig,3,7)
# R3Q9: valid area=9, sides=6, perpendicular distances ratio 2:1.
fig,ax=setup(5,6);s=6*math.sin(math.pi/12);h=6*math.cos(math.pi/12);A=np.array([0.,h]);bb=np.array([-s,0]);C=np.array([s,0]);P=np.array([s/3,0.]);project=lambda p,a,b:a+np.dot(p-a,b-a)/np.dot(b-a,b-a)*(b-a);M=project(P,A,bb);N=project(P,A,C)
line(ax,A,bb,C,A);line(ax,P,M);line(ax,P,N);right(ax,M,A-M,P-M,.14);right(ax,N,A-N,P-N,.14)
for p,t,dx,dy in [(A,'A',0,.25),(bb,'B',-.2,-.1),(C,'C',.2,-.1),(P,'P',0,-.25),(M,'M',-.25,0),(N,'N',.25,0)]:dot(ax,p,t,dx,dy)
label(ax,(A+bb)/2,'$6$',-.2,.1);label(ax,(A+C)/2,'$6$',.2,.1);label(ax,(P+M)/2,'$2x$',-.15,.3);label(ax,(P+N)/2,'$x$',.2,.0);save(fig,3,9)
# R3Q20: valid AA-similarity replacement with original side lengths.
fig,ax=setup(6,4.5);bb=np.array([0.,0.]);C=np.array([6.,0.]);A=np.array([4/3,math.sqrt(128)/3]);F=(A+bb)/2;E=(bb+C)/2;line(ax,A,bb,C,A);line(ax,F,E,color='#227b82',lw=2)
for p,t,dx,dy in [(A,'A',0,.25),(bb,'B',-.2,-.1),(C,'C',.2,-.1),(F,'F',-.3,0),(E,'E',0,-.25)]:dot(ax,p,t,dx,dy)
label(ax,(A+bb)/2,r'$AB=4$',-.9,.15);label(ax,(A+C)/2,'$6$',.15,.3);label(ax,(bb+C)/2,'$6$',0,-.6);label(ax,(3.1,3.3),r'$FE\parallel AC$');label(ax,(-.7,.4),r'$AF=FB$');save(fig,3,20)
print('Redrew 5 figures')
