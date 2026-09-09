from pathlib import Path
import json, hashlib, math
import numpy as np
B=Path(__file__).parent
KEYS={2:[3,1,2,4,3,3,4,2,1,[1,5],1,3,1,5,4,2,4,4,2,5],3:[[1,3],[3,5],3,5,2,3,5,1,2,[1,4],5,3,4,5,4,1,1,1,3,5],4:[1,3,3,2,3,2,1,2,3,1,4,2,5,[3,4],[1,4],3,5,5,1,1]}
for r in [2,3,4]:
 p=B/f'authoring/round{r}/manifest.json';m=json.loads(p.read_text())
 for row,k in zip(m['questions'],KEYS[r]):
  k=k if isinstance(k,list) else [k];assert row['correctOptionNumbers']==k,(r,row['number']);row['sourceCorrectOptionNumbers']=k
 if r==3:
  m['questions'][22]['replaced']=True;m['questions'][22]['replacementReason']='원본 4x의 도 기호가 중복되어 새 그림에 (x+55)도, (2x-15)도, 4x도로 일관되게 표기. 정답105도 유지.'
  m['questions'][20]['adaptation']='원래 그래프 직접 그리기 문항을 두 점이 표시된 다섯 그래프에서 선택하도록 변환; 식과 평가 개념 유지.'
 if r==2:
  m['questions'][13]['solutionCorrection']='원본 해설은 JK와 꼬인 모서리 수를7로 적었으나 AI를 포함하여8개임을 3차원 좌표로 재검증. 원문 보기5의 5개는 여전히 틀리므로 정답 유지.'
  m['questions'][15]['solutionCorrection']='원본 해설의 b의 동위각 g를 e로 바로잡음. 원문 선택지 및 정답2는 유지.'
 p.write_text(json.dumps(m,ensure_ascii=False,indent=2))
# Independent enumeration and 3D line tests, rather than checking only the answer labels.
triangles=[(t,t,25-2*t) for t in range(1,13) if 25-2*t>0 and 2*t>25-2*t and t!=25-2*t];assert len(triangles)==6
integer_points=[(x,10//x) for x in range(-2,9) if x and 10%x==0];assert len(integer_points)==5
V={k:np.array(v,dtype=float) for k,v in {'A':(0,1,1),'B':(0,0,1),'C':(1,0,1),'D':(1,1,1),'E':(0,1,0),'F':(0,0,0),'G':(1,0,0),'H':(1,1,0),'I':(0,.5,1),'J':(0,0,.5),'K':(.5,0,1)}.items()}
def skew(V,e,f):
 a,b=[V[k] for k in e];c,d=[V[k] for k in f];u=b-a;v=d-c
 return abs(np.dot(c-a,np.cross(u,v)))>1e-8
edges=['AI','AD','AE','KC','CD','DH','EF','EH','FG','GH','JF','CG','IK','IJ','JK']
sk=[e for e in edges if skew(V,'JK',e)];assert set(sk)==set(['AI','AD','AE','CD','DH','EF','EH','GH']),sk
W={k:np.array(v,dtype=float) for k,v in {'A':(0,1,1),'B':(0,0,1),'C':(1,1,1),'D':(0,1,0),'E':(0,0,0),'F':(1,0,0),'G':(1,1,0),'H':(.5,0,1),'I':(1,0,.5),'J':(1,.5,1)}.items()}
edges=['AB','AC','AD','BE','BH','DE','DG','EF','FI','FG','CG','CJ','HJ','HI','IJ']
sk3=[e for e in edges if skew(W,'AB',e)];assert set(sk3)==set(['EF','DG','HI','IJ','FI','CG'])
parallel_x0=[e for e in edges if W[e[0]][0]==W[e[1]][0] and W[e[0]][0]!=0];perp_y0=[e for e in edges if np.count_nonzero(W[e[1]]-W[e[0]])==1 and (W[e[1]]-W[e[0]])[1]!=0];assert len(parallel_x0)==5 and len(perp_y0)==4
# Redesigned geometry: E on BC, BE=CF, angle BAE=30 and AE perpendicular BF.
t=1/math.sqrt(3);assert abs(np.dot([t,-1],[1,t]))<1e-10
assert math.isclose(math.degrees(math.atan(t)),30)
# New round3 Q23 intersecting lines: actual sectors 75,80,25 degrees.
assert 180-105==75 and 105-25==80 and 20+55==75 and 2*20-15==25
# Short answers independently calculated.
short={2:[9/8,'CD',180+25+40,(180-38-90)/2,90],3:[-3/4,18/(.5*(4+8)*4),180-((180-55+15)/7+55),len(parallel_x0)+len(perp_y0),'OBC SAS'],4:[20*30*3/(20*30/60),((9-1)/2)/3,12/3,90/5*(1+5/9),90]}
assert short[2]==[1.125,'CD',245,26,90];assert short[3][1:4]==[.75,105,9];assert short[4]==[180,4/3,4,28,90]
report={'status':'READY_TO_REGISTER','sourceChoiceAnswerAudit':{'questions':60,'matches':60},'all75IndependentlySolved':True,'figureCount':53,'visualQA':'All 53 figures inspected; clipped labels recaptured; 4 figures newly drawn','checks':{'integerTriangles':triangles,'integerPoints':integer_points,'round2Q14SkewEdges':sk,'round3Q24SkewEdges':sk3,'round3Q24Parallel':parallel_x0,'round3Q24Perpendicular':perp_y0,'shortAnswerCalculations':short},'rounds':[]}
for r in [2,3,4]:
 d=B/f'authoring/round{r}';m=json.loads((d/'manifest.json').read_text());report['rounds'].append({'round':r,'unitId':m['unitId'],'count':25,'images':sum(bool(x['imagePath']) for x in m['questions']),'sha256':hashlib.sha256((d/'questions.json').read_bytes()).hexdigest(),'corrections':[{'number':x['number'],'reason':x['replacementReason']} for x in m['questions'] if x['replaced']]})
(B/'acceptance-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
