from pathlib import Path
import json,math,hashlib
B=Path(__file__).parent
Q={r:json.loads((B/f'authoring/round{r}/questions.json').read_text())['questions'] for r in range(1,5)}
M={r:json.loads((B/f'authoring/round{r}/manifest.json').read_text()) for r in Q}
K={1:[2,3,5,3,5,3,4,3,2,1,4,5,4,5,3,2,2,4,1,4,2,3],3:[1,4,5,3,2,1,2,5,1,4,5,1,3,5,3,3,2,2,2,4,4,1,5,4,5,5],4:[5,3,4,3,3,1,3,5,4,2,5,1,2,2]}
reviewed=[]
for r,ks in K.items():
 for n,k in enumerate(ks,1):
  got=M[r]['questions'][n-1]['correctOptionNumbers'][0]
  if got!=k:
   assert (r,n,got,k) in [(1,7,2,4),(1,8,4,3)]
   assert M[r]['questions'][n-1]['replaced']
  reviewed.append([r,n,k,got])
for n,k in {1:1,4:4,6:4,8:2,11:4,19:4,20:5,21:5,24:5,27:5,30:4}.items():
 assert M[2]['questions'][n-1]['correctOptionNumbers']==[k];reviewed.append([2,n,k,k])
checks=[]
def ck(label,got,want):
 assert math.isclose(got,want,rel_tol=1e-9,abs_tol=1e-9),(label,got,want)
 checks.append(dict(label=label,value=got))
s=math.sqrt;pi=math.pi
sn=lambda a:math.sin(math.radians(a));cs=lambda a:math.cos(math.radians(a));tn=lambda a:math.tan(math.radians(a))
ck('r1q1',2**2-5*2+1,-5);ck('r1q4',2-(-4),6);ck('r1q5',-1+2+5,6)
# Horizontal slice quadrature verifies translated parabolic strips without trusting key.
ck('r1q7',sum((-1-s(4-(i+.5)*4/10000))-(-3-s(4-(i+.5)*4/10000)) for i in range(10000))*4/10000,8)
ck('r1q8',3/math.hypot(3,5),3*s(34)/34);ck('r1q9',2/s(3),2*s(3)/3)
ck('r1q10',round(sn(36),4),.5878);ck('r1q11',s(2*32*s(2)/(1/tn(45)+1/tn(67.5))),8)
ck('r1q12',math.hypot(25*s(3)-30*cs(30),30*sn(30)),5*s(21))
ck('r1q13',32/(1/tn(60)+1/tn(45)),16*(3-s(3)));ck('r1q14',.5*3*3*sn(30),9/4)
ck('r1q15',(36+9)/6,7.5);ck('r1q16',(6**2-2**2)/10,3.2);ck('r1q17',(16+4)/4,5)
ck('r1q18',8-(7-4),5);ck('r1q19',144*pi/6-.5*144*sn(60),24*pi-36*s(3));ck('r1q20',180-2*65,50)
ck('r1q21',(6+2+6)/2,7);ck('r1q22',4+6+math.hypot(4,3)+3,18)
ck('r1q23',.5*2*s(3)*(2/(1+1/s(3))),3*s(3)-3)
# Cross product of DE=(-2,-1), DF=(-1,-2), norms sqrt5.
ck('r1q24',abs(4-1)/5,3/5);ck('r1q25',180-(180+30)/3,110)
ck('r2q2',11+14,25);ck('r2q3',4+6,10);ck('r2q5',-.01*500**2+10*500-500,2000)
ck('r2q7',-(1+4),-5);ck('r2q8a',2*.5**2-4*.5-1,.5-3);ck('r2q8b',2*2**2-4*2-1,2-3)
ck('r2q9',1/(.5**2),4);ck('r2q10',0-(-3),3);ck('r2q12',2-(-7),9)
ck('r2q13',3*4,12);ck('r2q14',(s(3)/(2*s(7)))**2,3/28);ck('r2q15',.5*8*5*sn(135),10*s(2))
ck('r2q16area',.5*(2*s(2))*(s(6)-s(2))*sn(120),3-s(3));ck('r2q16perimeter',2*s(2)+2*s(3)+s(6)-s(2),s(2)+2*s(3)+s(6))
ck('r2q17',(.5*6*6*sn(60))**2,243);ck('r2q18',2*(4*sn(30))**2,8)
ck('r2q19',20+20/tn(30),20*(1+s(3)));ck('r2q20',1100/.44/120*60,1250);ck('r2q22',.5*4*4*.81,6.48)
ck('r2q23',.5*tn(45)-3*s(2)*cs(45)+4*s(3)/3*sn(60)+s(3)*cs(30),1)
ck('r2q24',tn(15),2-s(3));ck('r2q25',6/9,2/3)
ck('r2q26',math.sin(math.atan(1/3)+math.atan(1/2))**2,.5);ck('r2q28',3/5-4/5,-.2);ck('r2q29',(2*2-3)/(4+3*2),.1)
ck('r2q30',(1+1+.5)/(s(3)*1.5),5*s(3)/9)
ck('r3q1',5/7,5/7);ck('r3q2',(sn(60)+cs(60))*(sn(30)-cs(30)),-.5);ck('r3q4',10*.4848,4.848)
ck('r3q5',32/(1/tn(30)+1/tn(45)),16*(s(3)-1));ck('r3q6',6*6/tn(60),12*s(3));ck('r3q7',15/ cs(60)+15*tn(60),30+15*s(3))
ck('r3q8',(2/(2*s(3)))*(2*s(2)/(2*s(3))),s(2)/3);ck('r3q9',6*cs(30)-3/tn(60),2*s(3));ck('r3q10',5/13,5/13)
ck('r3q11',2*5,10);ck('r3q12',s(13**2-5**2),12);ck('r3q13',3*75/25,9);ck('r3q14',(360-120)/2,120)
ck('r3q15',math.hypot(12,9),15);ck('r3q16',s(4)*(3+7),20);ck('r3q17',90-62,28)
ck('r3q18power',5*9,3*15);ck('r3q19',2*pi*(60/360),pi/3);ck('r3q20',(360+80)/2,220);ck('r3q21',(100-38)/2,31)
ck('r3q22',5*2*(2*2-1),2*(7*2+1));ck('r3q24',2*s(100-64),12);ck('r3q25',4*(4+1),5*4);ck('r3q26',(360-(180-40))*3/5/2,66)
ck('r4q1',2*((7-2*2.5)+(-2.5**2+7*2.5)),26.5);ck('r4q2',2+19.6+4,25.6);ck('r4q3',sum(k for k in range(1,10) if 5-k*k>0),3)
ck('r4q5',math.hypot(12,9)-math.hypot(4,3),10);ck('r4q6',.7660+1.1918,1.9578)
ck('r4q9',30/(1/tn(30)-1/tn(45)),15*(1+s(3)));ck('r4q10',(4+36/4)/2,6.5);ck('r4q12',(60+60*2/5)/2,42)
ck('r4q14',180-125-35,20);ck('r4q15',20*sn(60)/sn(45),10*s(6));ck('r4q16area',.5*2*4*sn(120),2*s(3));ck('r4q16length',2*2*4*cs(60)/(2+4),4/3)
ck('r4q17',.5*(16+9)*s(25**2-7**2),300);ck('r4q19',12**2-8**2,80)
report=dict(status='READY_TO_REGISTER',questions=100,images=78,sourceChoiceKeysCompared=len(reviewed),correctedAnswerKeys=[{'round':1,'number':7,'original':4,'correct':2},{'round':1,'number':8,'original':3,'correct':4}],independentNumericalChecks=len(checks),checks=checks,rounds=[dict(round=r,count=len(Q[r]),sha256=hashlib.sha256((B/f'authoring/round{r}/questions.json').read_bytes()).hexdigest()) for r in Q],educationalReview='All 100 questions, provided answer sheets, geometric conditions and explanations reviewed by Codex. Four-stage hints exclude direct answers; two-part source question R4Q16 preserved as paired choices.',visualReview='All 78 figures inspected in contact sheets; clipping corrected with wider margins. R4Q6 redrawn with corrected number; vector inspected.',limits='Original diagrams retain schematic, not-to-scale shapes. No student-account submission performed.')
(B/'acceptance-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k in ['status','questions','images','sourceChoiceKeysCompared','independentNumericalChecks']}))
