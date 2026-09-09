from pathlib import Path
import os
os.environ['MPLCONFIGDIR']='/tmp/mid1-mpl'
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Arc,Rectangle
import numpy as np
B=Path(__file__).parent/'authoring'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':15})
def save(fig,r,n):
 p=B/f'round{r}/assets/q{n:02}'
 fig.savefig(str(p)+'.png',dpi=180,bbox_inches='tight',facecolor='white');fig.savefig(str(p)+'.svg',bbox_inches='tight');plt.close(fig)
def label(ax,name,p,dx=0,dy=0):ax.text(p[0]+dx,p[1]+dy,name,ha='center',va='center',fontsize=17)
fig,ax=plt.subplots(figsize=(5.5,5.5));t=1/np.sqrt(3)
points={'A':(0,1),'B':(0,0),'C':(1,0),'D':(1,1),'E':(t,0),'F':(1,t)}
p=(t/(1+t*t),t*t/(1+t*t));points['P']=p
ax.plot([0,0,1,1,0],[1,0,0,1,1],color='black',lw=1.8)
ax.plot([0,t],[1,0],color='black',lw=1.6);ax.plot([0,1],[0,t],color='black',lw=1.6)
for name,pt in points.items():
 dx,dy={'A':(-.04,.04),'B':(-.04,-.04),'C':(.04,-.04),'D':(.04,.04),'E':(0,-.055),'F':(.05,0),'P':(.01,.065)}[name];label(ax,name,pt,dx,dy)
ax.add_patch(Arc((0,1),.34,.34,theta1=270,theta2=300,color='black',lw=1));ax.text(.045,.75,r'$30^\circ$',fontsize=15)
for v in [-.018,.018]:
 ax.plot([t/2+v,t/2+v],[-.016,.016],color='black')
 ax.plot([.984,1.016],[t/2+v,t/2+v],color='black')
ax.add_patch(Rectangle((0,0),.045,.045,fill=False,color='black'));ax.set_aspect('equal');ax.set_xlim(-.12,1.14);ax.set_ylim(-.12,1.14);ax.axis('off');save(fig,2,25)

fig,axs=plt.subplots(2,3,figsize=(13,8.6));spec=[(-4/3,(3,-4)),(3/4,(4,3)),(-3/4,(4,-3)),(-1/4,(4,-1)),(-3,(1,-3))]
for i,(s,(px,py)) in enumerate(spec):
 ax=axs.flat[i];x=np.linspace(-6,6,120);ax.plot(x,s*x,'k',lw=1.6);ax.set_xlim(-6,6);ax.set_ylim(-6,6);ax.set_aspect('equal');ax.set_xticks(range(-6,7,2));ax.set_yticks(range(-6,7,2));ax.grid(alpha=.2);ax.axhline(0,color='black',lw=.8);ax.axvline(0,color='black',lw=.8)
 for a,b in [(px,py),(-px,-py)]:
  ax.plot(a,b,'ko',ms=4);ax.annotate(f'({a}, {b})',(a,b),xytext=(4,8 if b<0 else -16),textcoords='offset points',fontsize=16)
 ax.set_title(str(i+1),fontsize=20,fontweight='bold');ax.tick_params(labelsize=12);ax.text(5.1,.35,'x',fontsize=11);ax.text(.3,5.2,'y',fontsize=11)
axs.flat[5].axis('off');fig.tight_layout(pad=2);save(fig,3,21)

fig,ax=plt.subplots(figsize=(6.6,5.4));x=np.linspace(.6,7,500)
ax.plot(x,12/x,'k',lw=1.7);ax.plot(x,4/x,'k',lw=1.7)
ax.fill([0,3,3,0],[0,0,4,4],color='#e6e6e6');ax.plot([0,3,3,0],[4,4,0,0],'k',lw=1.2);ax.plot([0,3],[4/3,4/3],'k',lw=1.2)
ax.annotate('',(7.2,0),(-.35,0),arrowprops=dict(arrowstyle='->',color='black'));ax.annotate('',(0,6.2),(0,-.45),arrowprops=dict(arrowstyle='->',color='black'))
for name,pt,dx,dy in [('A',(0,4),-.22,.08),('C',(3,4),.17,.18),('D',(0,4/3),-.22,.13),('E',(3,4/3),.18,.15),('B',(3,0),.05,-.28),('O',(0,0),-.22,-.28)]:label(ax,name,pt,dx,dy)
ax.text(3.05,-.64,'3',fontsize=14);ax.text(6.15,2.2,r'$y=\frac{12}{x}$',fontsize=17);ax.text(5.7,.9,r'$y=\frac{a}{x}$',fontsize=17);ax.text(7,.2,'x');ax.text(.15,6,'y');ax.set_xlim(-.6,7.5);ax.set_ylim(-.75,6.4);ax.axis('off');save(fig,4,23)
# Repair double-degree typo and clipped formula in source round3 question23.
fig,ax=plt.subplots(figsize=(6.5,5.4))
for deg in [0,25,105]:
 v=np.array([np.cos(np.deg2rad(deg)),np.sin(np.deg2rad(deg))]);ax.plot([-1.65*v[0],1.65*v[0]],[-1.65*v[1],1.65*v[1]],'k',lw=1.5)
for name,deg in [('C',0),('B',25),('A',105),('F',180),('E',205),('D',285)]:
 pt=1.35*np.array([np.cos(np.deg2rad(deg)),np.sin(np.deg2rad(deg))]);ax.plot(*pt,'ko',ms=3);label(ax,name,pt,.03,-.22 if name=='C' else (.14 if deg<180 else -.14))
ax.text(.02,.12,'O',fontsize=16)
for t1,t2,rad in [(0,25,.65),(105,180,.65),(205,285,.9)]:ax.add_patch(Arc((0,0),rad,rad,theta1=t1,theta2=t2,color='black'))
ax.text(.72,.1,r'$(2x-15)^\circ$',fontsize=16);ax.text(-1.2,.42,r'$(x+55)^\circ$',fontsize=16);ax.text(-.46,-.86,r'$4x^\circ$',fontsize=16)
ax.set_aspect('equal');ax.set_xlim(-1.9,2);ax.set_ylim(-1.7,1.7);ax.axis('off');save(fig,3,23)
