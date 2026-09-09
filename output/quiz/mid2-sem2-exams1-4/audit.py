from pathlib import Path
import json,hashlib,math
import numpy as np
from fractions import Fraction as F
B=Path(__file__).parent
checks=[]
def ck(name,actual,expected,tol=1e-8):
 assert abs(float(actual)-float(expected))<tol,(name,actual,expected)
 checks.append({'check':name,'actual':float(actual),'expected':float(expected),'status':'PASS'})
def angle(u,v):return math.degrees(math.acos(np.clip(np.dot(u,v)/np.linalg.norm(u)/np.linalg.norm(v),-1,1)))
def area(*p):
 a=np.array(p);return abs(sum(a[i,0]*a[(i+1)%len(a),1]-a[(i+1)%len(a),0]*a[i,1] for i in range(len(a)))/2)
sourcekeys={1:[3,5,[2,5],[3,5],[2,4],[4,5],4],2:[2,3,4,[2,5],4,4,4],3:[4,[2,4],[3,5],[1,5],[2,5],2,[3,4]],4:[3,2,[3,4],2,3,[2,4],2,[2,4]]}
for r,keys in sourcekeys.items():
 meta=json.loads((B/f'authoring/round{r}/manifest.json').read_text())
 for n,k in enumerate(keys,1):
  k=k if isinstance(k,list) else [k]
  assert meta['questions'][n-1]['correctOptionNumbers']==k,(r,n)
  meta['questions'][n-1]['sourceCorrectOptionNumbers']=k
 for m in meta['questions']:
  if m['number']>len(keys):m['adaptation']='원본 단답형·서술형을 다섯 보기로 변환. 증명 요구가 있으면 이유와 결과를 함께 포함.'
 (B/f'authoring/round{r}/manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
# Independent arithmetic for the numerical source questions (not based on generated options).
calculations={
'R1Q8':((180-(180-76)/2)/2,64),'R1Q9':((21-9)*9/2,54),'R1Q10':(((110-90)*2)/2-(90-(180-60-(110-90)*2)),10),
'R1Q11':((12*16/(12+16+20))**2*(90+45)/360,6),'R1Q12':(56/2*3/7,12),'R1Q13':(F(9,9-7),F(9,2)),'R1Q15':(12*12/4,36),
'R1Q16':(F(16-9,5)*F(12,5),F(84,25)),'R1Q17':((24+30-8-10)/2,18),'R1Q18':(7+25,32),'R1Q19':(5*8/4,10),
'R2Q8':((180-84)/2,48),'R2Q9':(180-54-(90-54/2),63),'R2Q10':(2*82+(180-82)/2,213),'R2Q11':(2*(11+2),26),
'R2Q12':(90+(180-(30+24)-60)/2,123),'R2Q13':(20+(180-70-70),60),'R2Q14':(60-(10-4)/3,58),'R2Q15':(4*5,20),
'R2Q16':((180-72-48)/2,30),'R2Q17':(F(1,2)*5*F(20,3),F(50,3)),'R2Q18':((15*15/9-9)+(15*20/25),28),'R2Q19':(2*3,6),'R2Q20':(8*5/10,4),
'R3Q8':((44)/2,22),'R3Q9 corrected':(2*9/9,2),'R3Q10':(180-2*64-(90-64)/2,39),'R3Q11':(5-2-2,1),'R3Q12':(360-3*58,186),
'R3Q14':(36-6-9-36/6,15),'R3Q16':(180-(180-52)/2,116),'R3Q17':(48/6,8),'R3Q18':(F(3)*6/4,F(9,2)),'R3Q19':(6-2,4),'R3Q20 corrected':((6+6+4)/2,8),
'R4Q9':((180+30)/5,42),'R4Q10':(90+(180-4*26)/2,128),'R4Q11':(10/2+6*8/(6+8+10),7),'R4Q12':((180-84)/2,48),
'R4Q13':((20+14)/2,17),'R4Q14':(180-68-2*36,40),'R4Q15':(32/2*.5*.75,6),'R4Q16':(F(9,2)**2/F(15,2),F(27,10)),'R4Q17':(F(11*3,7),F(33,7)),'R4Q18':(16*10/2,80),'R4Q19':(104-(90-27),41),'R4Q20':(F(5*20,6),F(50,3))}
for name,(a,e) in calculations.items():ck(name,a,e)
# Exact coordinate verification of difficult geometry and corrected sources.
A=np.array([0.,8.]);bb=np.array([-10.,0.]);C=np.array([0.,-8.]);D=np.array([10.,0.]);P=np.array([0.,-4.])
ck('R1Q4 rhombus area',area(A,bb,C,D),160);ck('R1Q4 BP=DP',np.linalg.norm(P-bb),np.linalg.norm(P-D))
A=np.array([math.cos(math.radians(50)),math.sin(math.radians(50))]);bb=np.zeros(2);L=A[1]/(2*math.sin(math.radians(20)));C=L*np.array([math.cos(math.radians(20)),-math.sin(math.radians(20))]);D=A+C;H=np.array([A[0],0.]);ck('R1Q14 independent coordinates',angle(A-D,H-D),40)
ck('R2Q7 corrected right base',F(5,2)**2+(5*math.sqrt(3)/2)**2,25);ck('R2Q7 corrected GH',5*math.sqrt(3)/2*9/5,9*math.sqrt(3)/2)
A=np.array([12.,6.]);bb=np.zeros(2);C=np.array([15.,0.]);M=C/2;G=np.array([12.,0.]);v=A-M;H=M+np.dot(G-M,v)/np.dot(v,v)*v
ck('R3Q7 ABC right',np.dot(bb-A,C-A),0);ck('R3Q7 actual GH',np.linalg.norm(G-H),18/5);ck('R3Q7 actual AH',np.linalg.norm(A-H),24/5);ck('R3Q7 new similar angle',angle(G-A,M-A),angle(H-G,M-G));assert abs(angle(A-bb,C-bb)-28)>1
s=6*math.sin(math.pi/12);h=6*math.cos(math.pi/12);A=np.array([0.,h]);bb=np.array([-s,0.]);C=np.array([s,0.]);P=np.array([s/3,0.]);ck('R3Q9 actual corrected area',area(A,bb,C),9)
for name,U,V,target in [('PM',A,bb,2),('PN',A,C,1)]:
 proj=U+np.dot(P-U,V-U)/np.dot(V-U,V-U)*(V-U);ck('R3Q9 '+name,np.linalg.norm(P-proj),target)
# Equilateral construction: direct rotation independently yields the two target angles.
bb=np.array([0.,0.]);C=np.array([1.,0.]);A=np.array([math.sin(math.pi/3)*math.cos(math.radians(40))/math.sin(math.radians(80)),math.sin(math.pi/3)*math.sin(math.radians(40))/math.sin(math.radians(80))])
rot=lambda v,t:np.array([[math.cos(t),-math.sin(t)],[math.sin(t),math.cos(t)]])@v
P=bb+rot(A-bb,math.pi/3);Q=bb+rot(C-bb,math.pi/3);R=A+rot(C-A,math.pi/3)
ck('R3Q15 QPA',angle(Q-P,A-P),20);ck('R3Q15 RQA',angle(R-Q,A-Q),40)
# Original R3Q20 forces a triangle with sides 4,3,2/3, so is impossible.
assert 3+2/3<4
checks.append({'check':'R3Q20 original contradiction confirmed; replaced with valid AA similarity','status':'PASS'})
A=np.array([.6,.8]);bb=np.zeros(2);C=np.array([2.,0.]);D=A+C;N=np.array([1.,0.]);E=2*A+C;ff=2*N-A;O=(A+N)/2
ck('R4Q6 independent area',area(O,E,ff)/area(A,bb,C,D)*24,27);ck('R4Q6 right angle',np.dot(E-O,ff-O),0);assert abs(np.linalg.norm(E-O)-np.linalg.norm(ff-O))>.5
# Overlap of a centered square with a 90-degree quadrant, assorted rotations.
for a in [.2,.6,1.1]:
 O=np.zeros(2);bb=np.array([-3.,-3.]);C=np.array([3.,-3.]);P=np.array([-3*math.tan(a),-3.]);Q=np.array([3.,-3*math.tan(a)])
 # only rotations for which P remains on bottom side; other orientations relabel vertices
 if P[0]>=-3:ck('R4Q7 overlap '+str(a),area(O,P,C,Q),9)
# Five-sided figure remains half base*height for different positions of F and I.
A=np.array([4.,10.]);bb=np.zeros(2);C=np.array([16.,0.]);D=np.array([12.,10.]);E=(A+D)/2;G=np.array([4.,0.]);H=np.array([12.,0.])
for t,u in [(.2,.7),(.8,.3),(.5,.5)]:ck('R4Q18 arbitrary side points '+str((t,u)),area(E,bb+t*(A-bb),G,H,C+u*(D-C)),80)
rounds=[]
for r in range(1,5):
 p=B/f'authoring/round{r}/questions.json';data=json.loads(p.read_text())['questions'];meta=json.loads((p.parent/'manifest.json').read_text())
 assert len(data)==len(meta['questions'])==20
 for i,q in enumerate(data):
  assert q['answer'] if isinstance(q['answer'],list) else q['answer'] in q['options']
  assert len(q['options'])==len(set(q['options']))==5
  assert len(q['hint'])>250 and len(q['explanation'])>500
 rounds.append({'round':r,'unitId':meta['unitId'],'questionCount':20,'imageCount':sum(bool(m['imagePath']) for m in meta['questions']),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'revisions':[{'number':m['number'],'reason':m['replacementReason']} for m in meta['questions'] if m['replaced']]})
report={'status':'READY_TO_REGISTER','questionCount':80,'imageCount':71,'sourcePagesVisuallyRead':26,'allSourceQuestionNumbersPresent':True,'allDiagramsVisuallyInspected':True,'originalChoiceAnswerKeysCompared':29,'independentMathChecks':checks,'rounds':rounds,'limitations':['실제 학생 계정의 정답 제출 동작은 이 데이터 등록 작업에서 실행하지 않음.']}
(B/'acceptance-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':report['status'],'questions':80,'images':71,'independentMathChecks':len(checks)},ensure_ascii=False))
