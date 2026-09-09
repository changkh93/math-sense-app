from pathlib import Path
from itertools import combinations
import json,re,math
from PIL import Image

OUT=Path(__file__).parent
qs=json.loads((OUT/'questions.json').read_text())['questions']
meta=json.loads((OUT/'review-metadata.json').read_text())
# Independently transcribed from the supplied answer pages (original items 1-20).
key=[[4],[2],[2],[2,4],[3],[2,4],[4],[3],[3],[4],[3],[4],[2],[2,3],[4],[2],[5],[1],[5],[4]]
assert len(qs)==len(meta['questions'])==25
stages=['[관찰 단계]','[개념 연결]','[과정 추론]','[결론 유도]']
headings=['## 문제 풀이','**문제 내용:**','핵심 개념 체크','풀이 전략','단계별 상세 풀이','주의점 및 팁']
for n,(q,r) in enumerate(zip(qs,meta['questions']),1):
    assert set(q)=={'question','options','answer','hint','explanation'},n
    assert len(q['options'])==len(set(q['options']))==5,n
    answers=q['answer'] if isinstance(q['answer'],list) else [q['answer']]
    assert all(a in q['options'] for a in answers),n
    actual=[i+1 for i,o in enumerate(q['options']) if o in answers]
    assert actual==r['correctOptionNumbers'],n
    if n<=20: assert actual==key[n-1],(n,actual,key[n-1])
    assert all(q['hint'].count(s)==1 for s in stages),n
    assert [q['hint'].index(s) for s in stages]==sorted(q['hint'].index(s) for s in stages),n
    assert all(s in q['explanation'] for s in headings),n
    assert q['question'] in q['explanation'],n
    assert all(o in q['explanation'] for o in q['options']),n
    assert not re.search(r'정답[은:]',q['hint']),n
    for field,value in q.items():
        for text in value if isinstance(value,list) else [value]:
            assert text.count('$')%2==0,(n,field)
            assert not re.search(r'\d',re.sub(r'\$[^$]*\$','',text)),(n,field,'number outside math')
            assert not re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f]',text),(n,field,'JSON escaping')
            assert '[cite:' not in text
    assert (OUT/r['sourceImage']).is_file(),n
    if r['imagePath']:
        im=Image.open(OUT/r['imagePath']); assert min(im.size)>100,n
assert [i+1 for i,q in enumerate(qs) if isinstance(q['answer'],list)]==[4,6,14]
assert sum(bool(r['imagePath']) for r in meta['questions'])==16
assert all(r['optionsAdded']==(r['number']>=21) for r in meta['questions'])

# Numerical spot checks computed independently from original givens.
calc={3:90-15-40,7:sum(a+b>c for a,b,c in combinations([3,4,5,6,7],3)),
      11:180-44-(24+20),12:15*(15-3)//2,13:180*(10-2),
      19:2*(12*6+6*18+12*18)//6,20:9**2*11//3+2*9**3//3,
      21:3**2*8+2*3**3//3,23:180-(360-110-100)/2,
      24:(180-360/10)/(360/10),25:7**2+4*7*8/2}
assert calc=={3:35,7:9,11:92,12:90,13:1440,19:132,20:783,21:90,23:105,24:4,25:161}
for n,answer in {21:r'$90\pi\,\mathrm{cm}^3$',22:r'$30$',23:r'$105^\circ$',24:r'$4:1$',25:r'$161\,\mathrm{cm}^2$'}.items():
    assert qs[n-1]['answer']==answer,n
assert 3*30+10==5*30-50==100
assert meta['questions'][21]['publishStatus']==('registered' if meta['dbWritten'] else 'awaiting-user-review')
assert meta['questions'][21]['sourceReplaced']
assert meta['questions'][21]['imagePath']=='assets/q22-new.png'
assert [v for v in [10,20,30,40,50] if 3*v+10==5*v-50]==[30]
spec=json.loads((OUT/'q22-diagram-spec.json').read_text())
for a,b in [('A','D'),('B','C')]:
    assert all(abs(x+y)<1e-10 for x,y in zip(spec['points'][a],spec['points'][b]))
for a,b in [('A','B'),('C','D')]:
    u=spec['points'][a];v=spec['points'][b]
    angle=math.degrees(math.acos(sum(x*y for x,y in zip(u,v))/(math.hypot(*u)*math.hypot(*v))))
    assert abs(angle-100)<1e-10
assert '직사각형' not in qs[15]['question']
assert '교과 범위 밖' not in qs[17]['explanation'] and '원환' not in qs[17]['explanation']
assert not any(word in qs[21]['explanation'] for word in ['190','70^','보류','모순'])
assert meta['dbWritten']==meta['storageUploaded']

# Check Q5 space relationships using a cuboid with a generic pyramid roof (no center condition is given).
P={'A':(.4,.35,2),'B':(0,1,1),'C':(0,0,1),'D':(1,0,1),'E':(1,1,1),'F':(0,1,0),'G':(0,0,0),'H':(1,0,0),'I':(1,1,0)}
edges=['AB','AC','AD','AE','BC','CD','DE','BE','BF','CG','DH','EI','FG','GH','HI','FI']
def sub(a,b):return tuple(x-y for x,y in zip(a,b))
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def relation(a,b):
    u=sub(P[a[1]],P[a[0]]);v=sub(P[b[1]],P[b[0]]);c=cross(u,v)
    if dot(c,c)<1e-10:return 'parallel'
    return 'skew' if abs(dot(sub(P[b[0]],P[a[0]]),c))>1e-10 else 'intersect'
counts={}
for edge,kind,expected in [('BC','parallel',3),('CD','skew',6),('DE','intersect',6),('DH','skew',7)]:
    names=[e for e in edges if e!=edge and relation(edge,e)==kind]
    assert len(names)==expected,(edge,names)
    counts[edge+'_'+kind]=names
report={'status':'PASS_REVISED_DRAFT','questionCount':25,'fiveOptionsEach':True,'sourceKeyMatched':24,
    'sourceKeyIsNotProofOfCorrectness':True,'multipleAnswerQuestions':[4,6,14],'figureCount':16,
    'numericRechecks':calc,'spaceGeometryQ5':counts,'mathOutsideDelimiters':0,
    'newQ22':{'answerX':30,'equalAngles':100,'drawnAnglesVerified':True,'uniqueCorrectOption':3},
    'userRequestedRevisionsApplied':[16,18,22], 'awaitingSetConfirmation':not meta['dbWritten'],
    'registered':meta['dbWritten'],'validationRunWrites':0}
if meta['dbWritten']:
    report['registration']=json.loads((OUT/'registration-result.json').read_text())
    report['status']='PASS_REGISTERED_AND_VERIFIED'
(OUT/'validation-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
