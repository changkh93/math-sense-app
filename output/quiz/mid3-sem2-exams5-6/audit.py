from pathlib import Path
import json,hashlib,math,statistics,collections
B=Path(__file__).parent
key=[5,[1,2],4,3,1,4,3,5,5,4,3,2,3,1,1,4,4,2,4,2,1,2,4,5,2,3,5,4,4,3,4,1,5,1,3,5,4,3,4,4,1,5,3,3,2,5,2,[2,4]]
checks=[]
def check(n,actual,expected):
 assert math.isclose(actual,expected,rel_tol=1e-9,abs_tol=1e-9),(n,actual,expected)
 checks.append({'sourceNumber':n,'computed':actual,'expected':expected})
sin=lambda x:math.sin(math.radians(x));cos=lambda x:math.cos(math.radians(x));sqrt=math.sqrt
check(3,(sqrt(49-25)/7)/(5/sqrt(49-25)),24/35)
check(4,sin(30)/cos(45)+cos(60),(1+sqrt(2))/2)
check(5,180*9/36,45)
check(6,.5*(3+3/math.tan(math.radians(60)))*3,(9+3*sqrt(3))/2)
check(8,(12*sin(60))*sin(60)*sin(60),9*sqrt(3)/2)
check(9,sqrt(2)/sqrt(3),sqrt(6)/3)
check(11,100*sin(60)/sin(45),50*sqrt(6))
check(12,.5*9*12*sin(60)+.5*3*sqrt(3)*6*sin(150),63*sqrt(3)/2)
check(14,(20+20-8)/(2*sqrt(20)*sqrt(20)),4/5)
check(15,3/cos(30),2*sqrt(3))
check(17,(25+4)/4,29/4)
check(18,(11+9-8)/2,6)
check(20,4*2*math.pi*120/360,8*math.pi/3)
check(21,sqrt(6**2+3**2),3*sqrt(5))
check(22,.5*(2*sqrt(3))**2*sin(120),3*sqrt(3))
check(23,(4+7)*sqrt((4+7)**2-(7-4)**2)/2,22*sqrt(7))
check(24,(12/2)**2-(8/2)**2,20)
check(25,(8**2+4**2)/(2*4),10)
check(26,9*3,27)
check(27,sqrt(4**2+4**2)/2-2,2*sqrt(2)-2)
check(28,23*2*2,92)
check(29,(360/5+(360/5)*5/4)/2,81)
check(30,.5*6*(3*sin(60)),9*sqrt(3)/2)
check(31,(360-(180-76))/2,128)
check(32,((360-2*44-2*40)/4)/2,24)
check(33,(360+50)/2-110,95)
check(34,45+(180-(180-45-31)),121)
check(35,180-2*(180-2*(180-116)),76)
check(36,18*(sin(150)+sin(120)+sin(90)),27+9*sqrt(3))
check(37,90-27,63)
check(38,180-45-(180-70),25)
data=[5,5,6,8,9,9,10,11,14,15,16,16,16,17,17,18,19,23,28,28]
check(40,statistics.median(data)+statistics.mode(data),31.5)
solutions=[a for a in range(2,7) if statistics.median([a+4,9,7,5,7,10,9,3*a+1])==7 and statistics.multimode([a+4,9,7,5,7,10,9,3*a+1])==[7]]
assert solutions==[2]
xs=[x for x in range(-20,21) if statistics.mean([2,0,x,4,-2])==statistics.median([2,0,x,4,-2])]
assert xs==[-4,1,6];check(42,sum(xs),3)
check(45,sqrt(sum(v*v for v in [5,-2,2,-4,-1])/5),sqrt(10))
check(47,(15*20+10*10)/25,16)
points=[(3,2),(3,3),(4,3),(4,6),(5,4),(5,6),(6,7),(6,8),(7,5),(7,8),(8,9),(8,10),(9,5),(9,8),(10,9)]
passed=[p for p in points if min(p)>=8];failed=[p for p in points if min(p)<8]
assert len(passed)==4;check(48,statistics.mean(p[0] for p in passed),8.75);check(48,statistics.median(p[1] for p in failed),5);assert (9,5) in points
rounds=[];coverage=[]
for r in [5,6]:
 raw=(B/f'authoring/round{r}/questions.json').read_bytes();qs=json.loads(raw)['questions'];ms=json.loads((B/f'authoring/round{r}/manifest.json').read_text())['questions']
 assert len(qs)==len(ms)==24
 assert [m['sourceNumber'] for m in ms]==list(range(1 if r==5 else 2,49,2))
 assert dict(collections.Counter(m['topic'] for m in ms))=={'삼각비':7,'원의 성질':12,'통계':5}
 for q,m in zip(qs,ms):
  n=m['sourceNumber'];expected=key[n-1];expected=expected if isinstance(expected,list) else [expected]
  assert m['correctOptionNumbers']==expected
  answers=q['answer'] if isinstance(q['answer'],list) else [q['answer']]
  assert answers==[q['options'][i-1] for i in expected]
  coverage.append(n)
 rounds.append({'round':r,'questions':24,'images':sum(bool(m['imagePath']) for m in ms),'sha256':hashlib.sha256(raw).hexdigest(),'topicCounts':dict(collections.Counter(m['topic'] for m in ms))})
assert sorted(coverage)==list(range(1,49))
report={'status':'READY_TO_REGISTER','rounds':rounds,'sourceKeyMatched':48,'numericChecks':checks,'visualReview':'All 39 figure crops visually inspected; 9 crops adjusted and visually rechecked; original 46 retains all five graphical options.','editorialFixes':[{'sourceNumber':37,'reason':'본문 각 BCE를 그림 및 정답에 맞게 BEC로 수정'},{'sourceNumber':39,'reason':'보기3의 단일 최빈값 주장을 하나로만으로 명확화'}],'reviewedBy':'Codex','reviewedAt':'2026-09-10'}
(B/'acceptance-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':report['status'],'rounds':rounds,'sourceKeyMatched':48,'numericChecks':len(checks)},ensure_ascii=False))
