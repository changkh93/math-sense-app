"""New exact geometry diagram; not a retouch of the flawed source image."""
from pathlib import Path
import os,json,math
os.environ.setdefault('MPLCONFIGDIR','/tmp/metasense-exam1-matplotlib')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Arc, Wedge

OUT=Path(__file__).parent
plt.rcParams.update({'mathtext.fontset':'stix','font.family':'DejaVu Serif','svg.fonttype':'path'})
fig,ax=plt.subplots(figsize=(7.2,4.8),dpi=220)
fig.subplots_adjust(0,0,1,1)
ax.set(xlim=(-3.6,3.6),ylim=(-2.4,2.4),aspect='equal'); ax.axis('off')
angles={'A':140,'B':40,'C':220,'D':320}
points={label:(3*math.cos(math.radians(a)),3*math.sin(math.radians(a))) for label,a in angles.items()}
for start,end in [(40,140),(220,320)]:
    ax.add_patch(Wedge((0,0),.72,start,end,facecolor='#e7f1f5',edgecolor='none',zorder=1))
    ax.add_patch(Arc((0,0),1.44,1.44,theta1=start,theta2=end,color='#527b8d',linewidth=1.5,zorder=3))
for a,b in [('A','D'),('B','C')]:
    ax.plot([points[a][0],points[b][0]],[points[a][1],points[b][1]],color='#253441',lw=1.8,zorder=2)
for label,(x,y) in points.items():
    ax.text(x+(0.16 if x>0 else -0.16),y+(0.13 if y>0 else -0.13),f'${label}$',fontsize=20,ha='center',va='center')
ax.plot(0,0,'o',color='#253441',markersize=4,zorder=4)
ax.text(.50,0,'$O$',fontsize=18,ha='left',va='center')
ax.text(0,1.32,r'$(3x+10)^\circ$',fontsize=25,ha='center',va='center',color='#172b3c')
ax.text(0,-1.32,r'$(5x-50)^\circ$',fontsize=25,ha='center',va='center',color='#172b3c')
for ext in ['svg','png']:
    fig.savefig(OUT/'assets'/f'q22-new.{ext}',dpi=220,facecolor='white')
plt.close(fig)
spec={'kind':'new-authored-geometry','authorizedBy':'User 2026-09-09: 새로 그려서 맞꼭지각 방정식 문제',
      'lines':[['A','D'],['B','C']],'intersection':[0,0],'points':points,
      'angleExpressions':{'AOB':'(3x+10)^\\circ','COD':'(5x-50)^\\circ'},
      'angleDegrees':{'AOB':100,'COD':100},'answerX':30,
      'files':['assets/q22-new.svg','assets/q22-new.png']}
(OUT/'q22-diagram-spec.json').write_text(json.dumps(spec,ensure_ascii=False,indent=2)+'\n')
print('Created new Q22 SVG and PNG: opposite angles 100 degrees; no answer shown on image.')
